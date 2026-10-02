import { Router } from 'express';
import { InvoiceController } from '../controllers/invoiceController';
import { optionalAuth } from '../middleware/authMiddleware';

const router = Router();

router.get('/', optionalAuth, InvoiceController.getAll);
router.get('/:id', optionalAuth, InvoiceController.getById);
router.post('/', optionalAuth, InvoiceController.create);
router.put('/:id/accept', optionalAuth, InvoiceController.accept);
router.put('/:id/reject', optionalAuth, InvoiceController.reject);
router.put('/:id/request-financing', optionalAuth, InvoiceController.requestFinancing);
router.put('/:id/finance', optionalAuth, InvoiceController.finance);
router.put('/:id/settle', optionalAuth, InvoiceController.settle);

export default router;
