import { Router } from 'express';
import { PaymentController } from '../controllers/paymentController';
import { optionalAuth } from '../middleware/authMiddleware';

const router = Router();

router.use(optionalAuth);

router.post('/', PaymentController.recordPayment);
router.get('/', PaymentController.listPayments);

export default router;
