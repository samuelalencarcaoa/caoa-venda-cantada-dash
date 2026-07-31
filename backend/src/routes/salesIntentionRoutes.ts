import { Router } from 'express';
import { SalesIntentionController } from '../controllers/SalesIntentionController';
import { asyncHandler } from '../utils/asyncHandler';

const router = Router();
const controller = new SalesIntentionController();

router.get('/', asyncHandler(controller.list.bind(controller)));
router.get('/search', asyncHandler(controller.search.bind(controller)));
router.get('/:id', asyncHandler(controller.getById.bind(controller)));
router.post('/', asyncHandler(controller.create.bind(controller)));
router.put('/:id', asyncHandler(controller.update.bind(controller)));
router.delete('/:id', asyncHandler(controller.delete.bind(controller)));

export default router;
