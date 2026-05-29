import { Router } from 'express';
import {
  getLatest,
  getHistory,
  refreshNow,
} from '../controllers/aqi.controller';

export const aqiRouter = Router();

aqiRouter.get('/latest', getLatest);
aqiRouter.get('/history', getHistory);
aqiRouter.post('/refresh', refreshNow);
