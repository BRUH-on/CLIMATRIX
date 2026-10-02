import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth';
import { list } from '../controllers/emission.controller';

export const emissionRouter = Router();
emissionRouter.use(requireAuth);
emissionRouter.get('/', list);