import { Router } from 'express';
import { healthRouter } from './health.routes';

/**
 * Root API router — mounted by the app at `/api/v1`.
 * Phase 3+ routers (auth, industries, emissions, notices) plug in here.
 */
export const apiRouter = Router();

apiRouter.use('/health', healthRouter);
