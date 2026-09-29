import { Router } from 'express';
import multer from 'multer';
import path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { DocumentController } from '../controllers/documentController';

const router = Router();

// Configure safe storage with randomized filename
const uploadsDir = path.join(__dirname, '../../uploads');
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = `${uuidv4()}${ext}`;
    cb(null, safeName);
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10 Megabytes limit
  },
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (allowedMimes.includes(file.mimetype.toLowerCase())) {
      cb(null, true);
    } else {
      cb(new Error('INVALID_FILE_TYPE: Only PDF, JPG, JPEG, and PNG invoice files are accepted.'));
    }
  },
});

router.post('/upload', upload.single('invoiceFile'), DocumentController.uploadDocument);
router.get('/file/:filename', DocumentController.getDocumentFile);
router.get('/purchase-orders', DocumentController.getPurchaseOrders);
router.post('/verify-correction', DocumentController.verifyCorrection);

export default router;
