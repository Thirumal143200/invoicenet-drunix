import { Router } from 'express';
import { CopilotController } from '../controllers/copilotController';
import { createRateLimiter } from '../middleware/rateLimiter';

const router = Router();

// Rate limiter: 45 requests per minute per client
const copilotLimiter = createRateLimiter({
  windowMs: 60 * 1000,
  maxRequests: 45,
  message: 'AI Copilot rate limit exceeded. Please wait a moment before sending more queries.',
});

router.use(copilotLimiter);

router.post('/chat', CopilotController.chat);
router.get('/suggestions', CopilotController.getSuggestions);
router.get('/history', CopilotController.getHistory);
router.delete('/history', CopilotController.clearHistory);
router.get('/proof/:invoiceId', CopilotController.getBlockchainProof);

export default router;
