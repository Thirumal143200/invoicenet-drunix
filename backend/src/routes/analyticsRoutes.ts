import { Router } from 'express';
import { AnalyticsController } from '../controllers/analyticsController';

const router = Router();

router.get('/metrics', AnalyticsController.getMetrics);

export default router;
