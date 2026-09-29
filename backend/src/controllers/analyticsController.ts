import { Request, Response } from 'express';
import { drunixGateway } from '../services/drunixGateway';

export class AnalyticsController {
  public static getMetrics(req: Request, res: Response) {
    const metrics = drunixGateway.getAnalytics();
    res.json({ success: true, data: metrics });
  }
}
