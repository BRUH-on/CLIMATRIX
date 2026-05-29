/**
 * OpenAQ ingestion service.
 *
 * Fetches /v2/latest for the configured country, upserts each (station,
 * parameter, recordedAt) tuple into `air_quality_readings`, and triggers a
 * Socket.io broadcast of the latest snapshot when new rows land.
 *
 * Tier-1 design notes:
 * - We rely on OpenAQ v2 by default because it doesn't require an API key.
 *   The URL is env-configurable so users can point at v3 + supply a key
 *   without touching code.
 * - Failures (network, non-2xx, parse) log and return zero counts rather
 *   than throwing. The cron job stays alive for the next tick.
 */
import { logger } from '../utils/logger';
import { prisma } from '../prisma/client';
import { env } from '../config/env';
import { broadcastAqiUpdate } from '../realtime/io';

const SUPPORTED_PARAMETERS = new Set([
  'pm25',
  'pm10',
  'no2',
  'so2',
  'co',
  'o3',
]);

interface OpenAQMeasurement {
  parameter: string;
  value: number;
  unit: string;
  lastUpdated: string;
}

interface OpenAQLocation {
  location: string;
  city?: string | null;
  country?: string | null;
  coordinates?: { latitude?: number; longitude?: number } | null;
  measurements: OpenAQMeasurement[];
}

interface OpenAQResponse {
  results?: OpenAQLocation[];
}

export interface FetchResult {
  stored: number;
  skipped: number;
  failed: boolean;
}

export async function fetchAndStoreReadings(): Promise<FetchResult> {
  const url = `${env.OPENAQ_API_URL}/latest?country=${encodeURIComponent(
    env.OPENAQ_COUNTRY,
  )}&limit=${env.OPENAQ_FETCH_LIMIT}`;

  const headers: Record<string, string> = { Accept: 'application/json' };
  if (env.OPENAQ_API_KEY) headers['X-API-Key'] = env.OPENAQ_API_KEY;

  let res: Response;
  try {
    res = await fetch(url, { headers });
  } catch (err) {
    logger.warn(
      { err: err instanceof Error ? err.message : err, url },
      'OpenAQ fetch network error',
    );
    return { stored: 0, skipped: 0, failed: true };
  }

  if (!res.ok) {
    logger.warn(
      { status: res.status, statusText: res.statusText },
      'OpenAQ returned non-2xx',
    );
    return { stored: 0, skipped: 0, failed: true };
  }

  let data: OpenAQResponse;
  try {
    data = (await res.json()) as OpenAQResponse;
  } catch (err) {
    logger.warn({ err }, 'OpenAQ JSON parse failed');
    return { stored: 0, skipped: 0, failed: true };
  }

  let stored = 0;
  let skipped = 0;

  for (const loc of data.results ?? []) {
    const stationName = (loc.location ?? '').trim() || 'Unknown station';
    const city = (loc.city ?? loc.location ?? '').trim() || 'Unknown';
    const country = (loc.country ?? env.OPENAQ_COUNTRY).trim();
    const lat = loc.coordinates?.latitude ?? null;
    const lng = loc.coordinates?.longitude ?? null;

    for (const m of loc.measurements ?? []) {
      if (!SUPPORTED_PARAMETERS.has(m.parameter)) {
        skipped++;
        continue;
      }
      const recordedAt = new Date(m.lastUpdated);
      if (Number.isNaN(recordedAt.getTime())) {
        skipped++;
        continue;
      }
      if (typeof m.value !== 'number' || !Number.isFinite(m.value)) {
        skipped++;
        continue;
      }

      try {
        await prisma.airQualityReading.upsert({
          where: {
            stationName_parameter_recordedAt: {
              stationName,
              parameter: m.parameter,
              recordedAt,
            },
          },
          create: {
            stationName,
            city,
            country,
            latitude: lat,
            longitude: lng,
            parameter: m.parameter,
            value: m.value,
            unit: m.unit,
            recordedAt,
          },
          update: {
            // No-op: the unique tuple already represents this exact observation.
          },
        });
        stored++;
      } catch (err) {
        skipped++;
        logger.debug({ err, stationName, parameter: m.parameter }, 'upsert skip');
      }
    }
  }

  logger.info({ stored, skipped }, 'OpenAQ ingestion complete');

  if (stored > 0) {
    try {
      const snapshot = await getLatestPerCity();
      broadcastAqiUpdate(snapshot);
    } catch (err) {
      logger.warn({ err }, 'Failed to broadcast AQI snapshot');
    }
  }

  return { stored, skipped, failed: false };
}

// -----------------------------------------------------------------------------
// Read-side: aggregate latest reading per (city, parameter)
// -----------------------------------------------------------------------------

export interface CityAQI {
  city: string;
  country: string;
  latitude: number | null;
  longitude: number | null;
  stationCount: number;
  parameters: Record<
    string,
    { value: number; unit: string; recordedAt: string }
  >;
}

export interface AQISnapshot {
  fetchedAt: string;
  cityCount: number;
  cities: CityAQI[];
}

export async function getLatestPerCity(): Promise<AQISnapshot> {
  // Pull a recent slice of readings (most-recent first), then collapse by
  // (city, parameter) keeping the newest value. Postgres-side `DISTINCT ON`
  // would be cleaner; sticking with portable Prisma queries for now.
  const readings = await prisma.airQualityReading.findMany({
    orderBy: { recordedAt: 'desc' },
    take: 2000,
  });

  const cityMap = new Map<string, CityAQI>();
  const seenStations = new Map<string, Set<string>>();

  for (const r of readings) {
    let entry = cityMap.get(r.city);
    if (!entry) {
      entry = {
        city: r.city,
        country: r.country,
        latitude: r.latitude,
        longitude: r.longitude,
        stationCount: 0,
        parameters: {},
      };
      cityMap.set(r.city, entry);
      seenStations.set(r.city, new Set());
    }
    seenStations.get(r.city)!.add(r.stationName);

    if (!entry.parameters[r.parameter]) {
      entry.parameters[r.parameter] = {
        value: r.value,
        unit: r.unit,
        recordedAt: r.recordedAt.toISOString(),
      };
    }
  }

  for (const [city, entry] of cityMap) {
    entry.stationCount = seenStations.get(city)!.size;
  }

  // Sort: cities with PM2.5 first, then by name
  const cities = Array.from(cityMap.values()).sort((a, b) => {
    const aPm = a.parameters.pm25 ? 1 : 0;
    const bPm = b.parameters.pm25 ? 1 : 0;
    if (aPm !== bPm) return bPm - aPm;
    return a.city.localeCompare(b.city);
  });

  return {
    fetchedAt: new Date().toISOString(),
    cityCount: cities.length,
    cities,
  };
}

export interface HistoryRow {
  recordedAt: string;
  parameter: string;
  value: number;
  unit: string;
  stationName: string;
}

export async function getCityHistory(
  city: string,
  hours: number,
): Promise<HistoryRow[]> {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);
  const rows = await prisma.airQualityReading.findMany({
    where: { city, recordedAt: { gte: since } },
    orderBy: { recordedAt: 'asc' },
    take: 5000,
  });
  return rows.map((r) => ({
    recordedAt: r.recordedAt.toISOString(),
    parameter: r.parameter,
    value: r.value,
    unit: r.unit,
    stationName: r.stationName,
  }));
}
