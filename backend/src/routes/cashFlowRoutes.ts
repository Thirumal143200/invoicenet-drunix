import { Router } from 'express';
import { CashFlowController } from '../controllers/cashFlowController';

const router = Router();

router.get('/forecast', CashFlowController.getForecast);
router.get('/scenarios', CashFlowController.getScenarios);

export default router;
