import cron, { type ScheduledTask } from 'node-cron';
import { logger } from '../utils/logger';
import { env } from '../config/env';
import { fetchAndStoreReadings } from '../services/openaqService';

let scheduled: ScheduledTask | null = null;
let initialFetchTimer: NodeJS.Timeout | null = null;

/**
 * Schedules the OpenAQ ingestion job using the cron expression in env.
 * Idempotent — safe to call once per process lifetime.
 *
 * Triggers an initial fetch ~5s after boot so the dashboard has something
 * to show immediately, then lets the cron take over.
 */
export function startOpenAQJob(): void {
  if (scheduled) return;

  if (!cron.validate(env.OPENAQ_CRON)) {
    logger.error(
      { schedule: env.OPENAQ_CRON },
      'Invalid OPENAQ_CRON expression — job not scheduled',
    );
    return;
  }

  initialFetchTimer = setTimeout(() => {
    fetchAndStoreReadings().catch((err) =>
      logger.error({ err }, 'OpenAQ initial fetch threw'),
    );
  }, 5_000);

  scheduled = cron.schedule(env.OPENAQ_CRON, () => {
    fetchAndStoreReadings().catch((err) =>
      logger.error({ err }, 'OpenAQ scheduled fetch threw'),
    );
  });

  logger.info(
    { schedule: env.OPENAQ_CRON, country: env.OPENAQ_COUNTRY },
    'OpenAQ cron job scheduled',
  );
}

export function stopOpenAQJob(): void {
  if (initialFetchTimer) {
    clearTimeout(initialFetchTimer);
    initialFetchTimer = null;
  }
  scheduled?.stop();
  scheduled = null;
}
