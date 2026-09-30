import { Router } from 'express';
import { RiskController } from '../controllers/riskController';

const router = Router();

// Primary & suggested endpoints
router.post('/assess/:invoiceId', RiskController.analyzeInvoice);
router.post('/analyze/:invoiceId', RiskController.analyzeInvoice);

router.get('/assessments/:invoiceId', RiskController.getAssessment);
router.get('/assessment/:invoiceId', RiskController.getAssessment);

router.get('/dashboard', RiskController.getDashboard);
router.post('/assess-document', RiskController.assessDocument);

router.get('/assessments', RiskController.getAllAssessments);
router.get('/config', RiskController.getConfig);

export default router;
