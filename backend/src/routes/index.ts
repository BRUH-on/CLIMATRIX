import { Router } from 'express';
import { healthRouter } from './health.routes';
import { authRouter } from './auth.routes';
import { aqiRouter } from './aqi.routes';
import { reportRouter } from './report.routes';
import { noticeRouter } from './notice.routes';
import { anomalyRouter } from './anomaly.routes';
import publicHeatmapRouter from './publicHeatmap';
import { industryRouter } from './industry.routes';
import { emissionRouter } from './emission.routes';
import { insightsRouter } from './insights.routes';

/**
 * Root API router — mounted by the app at `/api/v1`.
 * Future routers (industries, emissions, compliance) plug in here.
 */
export const apiRouter = Router();

apiRouter.use('/health', healthRouter);
apiRouter.use('/auth', authRouter);
apiRouter.use('/aqi', aqiRouter);
apiRouter.use('/reports', reportRouter);
apiRouter.use('/notices', noticeRouter);
apiRouter.use('/anomaly', anomalyRouter);
apiRouter.use('/public', publicHeatmapRouter);
apiRouter.use('/industries', industryRouter);
apiRouter.use('/emissions', emissionRouter);
apiRouter.use('/insights', insightsRouter);
