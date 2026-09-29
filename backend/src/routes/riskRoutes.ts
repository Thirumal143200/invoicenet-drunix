import { Router } from 'express';
import { RiskController } from '../controllers/riskController';

const router = Router();

router.post('/analyze/:invoiceId', RiskController.analyzeInvoice);
router.get('/assessment/:invoiceId', RiskController.getAssessment);
router.get('/assessments', RiskController.getAllAssessments);
router.get('/config', RiskController.getConfig);

export default router;
