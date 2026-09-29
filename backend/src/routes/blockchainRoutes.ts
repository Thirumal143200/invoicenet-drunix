import { Router } from 'express';
import { BlockchainController } from '../controllers/blockchainController';

const router = Router();

router.get('/status', BlockchainController.getStatus);
router.get('/blocks', BlockchainController.getBlocks);
router.get('/proof/:id', BlockchainController.getProof);

export default router;
