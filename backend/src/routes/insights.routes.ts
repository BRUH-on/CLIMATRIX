import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth';
import { validateIndustry } from '../controllers/insights.controller';

export const insightsRouter = Router();
insightsRouter.use(requireAuth);
insightsRouter.get('/validation', validateIndustry);