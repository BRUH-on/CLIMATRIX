import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth';
import * as industryController from '../controllers/industry.controller';
import { listForIndustry } from '../controllers/emission.controller';

export const industryRouter = Router();
industryRouter.use(requireAuth);
industryRouter.get('/', industryController.list);
industryRouter.get('/:industryId/emissions', listForIndustry);
industryRouter.get('/:industryId', industryController.get);