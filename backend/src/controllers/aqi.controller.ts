import { z } from 'zod';
import { asyncHandler } from '../utils/asyncHandler';
import {
  getLatestPerCity,
  getCityHistory,
  fetchAndStoreReadings,
} from '../services/openaqService';

/** GET /api/v1/aqi/latest — current snapshot keyed by city */
export const getLatest = asyncHandler(async (_req, res) => {
  const data = await getLatestPerCity();
  res.json(data);
});

const historyQuery = z.object({
  city: z.string().min(1).max(80),
  hours: z.coerce.number().int().min(1).max(720).default(24),
});

/** GET /api/v1/aqi/history?city=Delhi&hours=24 */
export const getHistory = asyncHandler(async (req, res) => {
  const { city, hours } = historyQuery.parse(req.query);
  const readings = await getCityHistory(city, hours);
  res.json({ city, hours, count: readings.length, readings });
});

/** POST /api/v1/aqi/refresh — manually trigger an OpenAQ pull (dev/admin) */
export const refreshNow = asyncHandler(async (_req, res) => {
  const result = await fetchAndStoreReadings();
  res.json({ ok: !result.failed, ...result });
});
