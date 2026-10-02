import { Router } from 'express';
import { requireAuth } from '../middleware/requireAuth';
import {
	getIndustryComplianceAssessments,
	getIndustryAnomalies,
	validateIndustry,
} from '../controllers/insights.controller';
import { retrieve } from '../controllers/retrieval.controller';
import { assistant } from '../controllers/assistant.controller';

export const insightsRouter = Router();
insightsRouter.use(requireAuth);
insightsRouter.get('/validation', validateIndustry);
insightsRouter.get('/anomalies', getIndustryAnomalies);
insightsRouter.get('/compliance', getIndustryComplianceAssessments);
insightsRouter.post('/retrieval', retrieve);
insightsRouter.post('/assistant', assistant);