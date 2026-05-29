import { api } from './api';

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

export interface HistoryRow {
  recordedAt: string;
  parameter: string;
  value: number;
  unit: string;
  stationName: string;
}

export interface HistoryResponse {
  city: string;
  hours: number;
  count: number;
  readings: HistoryRow[];
}

export async function fetchLatestAQI(): Promise<AQISnapshot> {
  return api<AQISnapshot>('/aqi/latest');
}

export async function fetchAQIHistory(
  city: string,
  hours = 24,
): Promise<HistoryResponse> {
  return api<HistoryResponse>(
    `/aqi/history?city=${encodeURIComponent(city)}&hours=${hours}`,
  );
}

export async function refreshAQI(): Promise<{
  ok: boolean;
  stored: number;
  skipped: number;
  failed: boolean;
}> {
  return api('/aqi/refresh', { method: 'POST' });
}

// -----------------------------------------------------------------------------
// EPA-style AQI level for a PM2.5 reading (µg/m³). Used for color-coding only.
// Reference: https://www.airnow.gov/aqi/aqi-basics/
// -----------------------------------------------------------------------------
export interface AQILevel {
  label: string;
  color: string;
  bg: string;
}

export function pm25Level(value: number | undefined): AQILevel {
  if (value === undefined) return { label: 'NO DATA', color: '#6b6357', bg: 'rgba(26,20,16,0.05)' };
  if (value <= 12) return { label: 'GOOD', color: '#1e8449', bg: 'rgba(30,132,73,0.10)' };
  if (value <= 35.4) return { label: 'MODERATE', color: '#b8860b', bg: 'rgba(184,134,11,0.10)' };
  if (value <= 55.4) return { label: 'UNHEALTHY (SG)', color: '#d35400', bg: 'rgba(211,84,0,0.12)' };
  if (value <= 150.4) return { label: 'UNHEALTHY', color: '#c0392b', bg: 'rgba(192,57,43,0.12)' };
  if (value <= 250.4) return { label: 'VERY UNHEALTHY', color: '#7d3c98', bg: 'rgba(125,60,152,0.14)' };
  return { label: 'HAZARDOUS', color: '#641e16', bg: 'rgba(100,30,22,0.18)' };
}
