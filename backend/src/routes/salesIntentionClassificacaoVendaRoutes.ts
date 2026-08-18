import { Router } from 'express';
import { SalesIntentionClassificacaoVendaController } from '../controllers/SalesIntentionClassificacaoVendaController';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
const controller = new SalesIntentionClassificacaoVendaController();

router.get('/', asyncHandler(controller.list.bind(controller)));

export default router;
