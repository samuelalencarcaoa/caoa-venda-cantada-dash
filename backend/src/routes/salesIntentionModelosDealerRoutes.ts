import { Router } from 'express';
import { SalesIntentionModelosDealerController } from '../controllers/SalesIntentionModelosDealerController';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
const controller = new SalesIntentionModelosDealerController();

router.get('/', asyncHandler(controller.list.bind(controller)));
router.get('/by-placa', asyncHandler(controller.findByPlaca.bind(controller)));

export default router;
