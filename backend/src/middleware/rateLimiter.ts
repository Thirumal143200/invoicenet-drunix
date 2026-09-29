import { Request, Response, NextFunction } from 'express';

interface RateLimitRecord {
  count: number;
  resetTime: number;
}

export interface RateLimitOptions {
  windowMs: number;
  maxRequests: number;
  message?: string;
}

/**
 * In-memory sliding-window rate limiter middleware
 */
export function createRateLimiter(options: RateLimitOptions) {
  const { windowMs, maxRequests, message = 'Too many requests. Please try again later.' } = options;
  const store = new Map<string, RateLimitRecord>();

  // Periodically clean up expired entries every 2 minutes
  const cleanupInterval = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of store.entries()) {
      if (now > record.resetTime) {
        store.delete(key);
      }
    }
  }, 120000);

  // Unref interval to allow clean node shutdown if needed
  if (cleanupInterval.unref) {
    cleanupInterval.unref();
  }

  return (req: Request, res: Response, next: NextFunction) => {
    // Generate key based on client IP or user role/id
    const clientKey =
      (req.headers['x-forwarded-for'] as string) ||
      req.ip ||
      (req.headers['x-user-id'] as string) ||
      'anonymous-client';

    const now = Date.now();
    const record = store.get(clientKey);

    if (!record || now > record.resetTime) {
      store.set(clientKey, {
        count: 1,
        resetTime: now + windowMs,
      });

      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', maxRequests - 1);
      res.setHeader('X-RateLimit-Reset', Math.ceil((now + windowMs) / 1000));
      return next();
    }

    if (record.count >= maxRequests) {
      const retryAfterSeconds = Math.ceil((record.resetTime - now) / 1000);
      res.setHeader('Retry-After', retryAfterSeconds);
      res.setHeader('X-RateLimit-Limit', maxRequests);
      res.setHeader('X-RateLimit-Remaining', 0);
      res.setHeader('X-RateLimit-Reset', Math.ceil(record.resetTime / 1000));

      return res.status(429).json({
        success: false,
        error: message,
        retryAfterSeconds,
      });
    }

    record.count += 1;
    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', Math.max(0, maxRequests - record.count));
    res.setHeader('X-RateLimit-Reset', Math.ceil(record.resetTime / 1000));
    next();
  };
}
