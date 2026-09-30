import { Router } from 'express';
import { FraudController } from '../controllers/fraudController';

const router = Router();

router.get('/alerts', FraudController.getAlerts);
router.get('/alerts/:id', FraudController.getAlertById);
router.get('/metrics', FraudController.getMetrics);
router.post('/alerts/:id/notes', FraudController.addNote);
router.post('/alerts/:id/status', FraudController.updateStatus);
router.post('/scan', FraudController.scanLedger);
router.get('/config', FraudController.getConfig);
router.put('/config', FraudController.updateConfig);

export default router;
