import { Router } from 'express';
import { FinancingController } from '../controllers/financingController';
import { optionalAuth, requireRole } from '../middleware/authMiddleware';

const router = Router();

router.use(optionalAuth);

router.post('/request', FinancingController.requestFinancing);
router.get('/requests', FinancingController.listRequests);
router.post('/requests/:id/approve', requireRole('FINANCIER', 'ADMIN'), FinancingController.approve);
router.post('/requests/:id/reject', requireRole('FINANCIER', 'ADMIN'), FinancingController.reject);

export default router;
