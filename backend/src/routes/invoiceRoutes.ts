import { Router } from 'express';
import { InvoiceController } from '../controllers/invoiceController';

const router = Router();

router.get('/', InvoiceController.getAll);
router.get('/:id', InvoiceController.getById);
router.post('/', InvoiceController.create);
router.put('/:id/accept', InvoiceController.accept);
router.put('/:id/reject', InvoiceController.reject);
router.put('/:id/request-financing', InvoiceController.requestFinancing);
router.put('/:id/finance', InvoiceController.finance);
router.put('/:id/settle', InvoiceController.settle);

export default router;
