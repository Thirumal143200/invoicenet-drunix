import { Router } from 'express';
import { CashFlowController } from '../controllers/cashFlowController';
import { optionalAuth } from '../middleware/authMiddleware';

const router = Router();

router.use(optionalAuth);

router.get('/forecast', CashFlowController.getForecast);
router.get('/payment-forecast', CashFlowController.getPaymentForecast);
router.get('/scenarios', CashFlowController.getScenarios);

export default router;
