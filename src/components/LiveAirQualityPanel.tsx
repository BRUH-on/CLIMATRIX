import { useEffect, useRef, useState } from 'react';
import {
  fetchLatestAQI,
  pm25Level,
  type AQISnapshot,
  type CityAQI,
} from '../lib/aqi';
import { getSocket } from '../lib/realtime';

type Transport = 'connecting' | 'websocket' | 'polling' | 'offline';

const POLL_INTERVAL_MS = 30_000;

/**
 * Live air quality panel — pulls the latest OpenAQ snapshot from the backend,
 * subscribes to push updates over Socket.io. Falls back to 30-second polling
 * when the socket is disconnected. Designed to drop into the existing Dashboard.
 *
 * Does NOT depend on the global App.tsx CSS — uses inline styles + scoped
 * classes prefixed `cc-aqi-` to avoid collisions.
 */
export default function LiveAirQualityPanel() {
  const [snapshot, setSnapshot] = useState<AQISnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [transport, setTransport] = useState<Transport>('connecting');
  const pollRef = useRef<number | null>(null);

  // 1) Initial REST fetch so the UI has something on first paint.
  useEffect(() => {
    let cancelled = false;
    fetchLatestAQI()
      .then((s) => {
        if (cancelled) return;
        setSnapshot(s);
        setError(null);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Failed to load AQI');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // 2) Subscribe to Socket.io push events.
  useEffect(() => {
    const socket = getSocket();

    const onConnect = () => setTransport('websocket');
    const onDisconnect = () => setTransport('polling');
    const onError = () => setTransport('polling');
    const onSnapshot = (data: AQISnapshot) => {
      setSnapshot(data);
      setError(null);
      setLoading(false);
    };
    const onUpdate = (data: AQISnapshot) => {
      setSnapshot(data);
      setError(null);
    };

    if (socket.connected) onConnect();
    socket.on('connect', onConnect);
    socket.on('disconnect', onDisconnect);
    socket.on('connect_error', onError);
    socket.on('aqi:snapshot', onSnapshot);
    socket.on('aqi:update', onUpdate);

    return () => {
      socket.off('connect', onConnect);
      socket.off('disconnect', onDisconnect);
      socket.off('connect_error', onError);
      socket.off('aqi:snapshot', onSnapshot);
      socket.off('aqi:update', onUpdate);
    };
  }, []);

  // 3) Polling fallback when socket isn't carrying us.
  useEffect(() => {
    const clear = () => {
      if (pollRef.current) {
        window.clearInterval(pollRef.current);
        pollRef.current = null;
      }
    };

    if (transport === 'websocket' || transport === 'connecting') {
      clear();
      return clear;
    }

    pollRef.current = window.setInterval(() => {
      fetchLatestAQI()
        .then((s) => {
          setSnapshot(s);
          setError(null);
        })
        .catch(() => {
          /* keep last good snapshot */
        });
    }, POLL_INTERVAL_MS);
    return clear;
  }, [transport]);

  const cities = snapshot?.cities ?? [];

  return (
    <>
      <style>{STYLES}</style>
      <div className="cc-aqi-panel">
        <header className="cc-aqi-header">
          <div>
            <div className="cc-aqi-eyebrow">REAL-TIME AIR QUALITY · OpenAQ + Socket.io</div>
            <h2 className="cc-aqi-title">LIVE MONITORING</h2>
          </div>
          <div className="cc-aqi-meta">
            <TransportBadge transport={transport} />
            {snapshot?.fetchedAt && (
              <span className="cc-aqi-stamp">
                {cities.length} {cities.length === 1 ? 'CITY' : 'CITIES'} · UPDATED{' '}
                {formatRelative(snapshot.fetchedAt)}
              </span>
            )}
          </div>
        </header>

        {loading && (
          <div className="cc-aqi-empty">CONNECTING TO SENSOR NETWORK...</div>
        )}

        {!loading && error && (
          <div className="cc-aqi-error">
            ⚠ {error}
            <div className="cc-aqi-error-sub">
              Backend may be down, or no readings have been ingested yet.
              Check that the OpenAQ cron is running.
            </div>
          </div>
        )}

        {!loading && !error && cities.length === 0 && (
          <div className="cc-aqi-empty">
            — AWAITING FIRST INGESTION — CRON RUNS EVERY 10 MIN —
          </div>
        )}

        {cities.length > 0 && (
          <div className="cc-aqi-grid">
            {cities.slice(0, 12).map((c) => (
              <CityCard key={`${c.city}-${c.country}`} city={c} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

// -----------------------------------------------------------------------------
// Sub-components
// -----------------------------------------------------------------------------

function CityCard({ city }: { city: CityAQI }) {
  const pm25 = city.parameters.pm25?.value;
  const level = pm25Level(pm25);
  const stamp = city.parameters.pm25?.recordedAt
    ? formatRelative(city.parameters.pm25.recordedAt)
    : '—';
  return (
    <article
      className="cc-aqi-card"
      style={{ borderLeft: `4px solid ${level.color}`, background: level.bg }}
    >
      <div className="cc-aqi-card-top">
        <div>
          <div className="cc-aqi-city">{city.city.toUpperCase()}</div>
          <div className="cc-aqi-stations">{city.stationCount} STATION{city.stationCount === 1 ? '' : 'S'}</div>
        </div>
        <div className="cc-aqi-level" style={{ color: level.color, borderColor: level.color }}>
          {level.label}
        </div>
      </div>

      <div className="cc-aqi-pm25" style={{ color: level.color }}>
        {pm25 !== undefined ? pm25.toFixed(1) : '—'}
        <span className="cc-aqi-unit"> µg/m³ PM2.5</span>
      </div>

      <div className="cc-aqi-others">
        {(['no2', 'so2', 'co', 'o3'] as const).map((p) => {
          const m = city.parameters[p];
          if (!m) return null;
          return (
            <div key={p} className="cc-aqi-other">
              <span className="cc-aqi-other-key">{p.toUpperCase()}</span>
              <span className="cc-aqi-other-val">
                {m.value.toFixed(1)} <em>{m.unit}</em>
              </span>
            </div>
          );
        })}
      </div>

      <div className="cc-aqi-card-foot">UPDATED {stamp}</div>
    </article>
  );
}

function TransportBadge({ transport }: { transport: Transport }) {
  const map: Record<Transport, { label: string; color: string }> = {
    connecting: { label: 'CONNECTING', color: '#6b6357' },
    websocket: { label: 'LIVE · WS', color: '#1e8449' },
    polling: { label: 'LIVE · POLL', color: '#b8860b' },
    offline: { label: 'OFFLINE', color: '#c0392b' },
  };
  const cfg = map[transport];
  return (
    <span className="cc-aqi-transport" style={{ color: cfg.color, borderColor: cfg.color }}>
      <span className="cc-aqi-dot" style={{ background: cfg.color }} />
      {cfg.label}
    </span>
  );
}

// -----------------------------------------------------------------------------
// Helpers
// -----------------------------------------------------------------------------

function formatRelative(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const s = Math.max(0, Math.round(ms / 1000));
  if (s < 60) return `${s}s ago`;
  const m = Math.round(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.round(h / 24)}d ago`;
}

// -----------------------------------------------------------------------------
// Styles — scoped to cc-aqi-* prefix; matches the existing sketch aesthetic.
// -----------------------------------------------------------------------------
const STYLES = `
.cc-aqi-panel {
  background: rgba(240,235,224,0.85);
  border: 2px solid #3d3020;
  box-shadow: 3px 3px 0 rgba(26,20,16,0.25), 6px 6px 0 rgba(26,20,16,0.18);
  padding: 18px;
  font-family: 'Courier Prime', monospace;
  color: #1a1410;
  margin-bottom: 14px;
}
.cc-aqi-header {
  display: flex; align-items: flex-start; justify-content: space-between;
  gap: 14px; margin-bottom: 14px;
}
.cc-aqi-eyebrow {
  font-family: 'Special Elite', cursive;
  font-size: 9px; letter-spacing: 0.18em;
  color: rgba(26,20,16,0.5); margin-bottom: 4px;
}
.cc-aqi-title {
  font-family: 'Oswald', sans-serif;
  font-size: 18px; font-weight: 700; letter-spacing: 0.18em;
  color: #1a1410; margin: 0;
}
.cc-aqi-meta {
  display: flex; flex-direction: column; align-items: flex-end; gap: 6px;
}
.cc-aqi-stamp {
  font-family: 'Special Elite', cursive;
  font-size: 9px; letter-spacing: 0.12em;
  color: rgba(26,20,16,0.5);
}
.cc-aqi-transport {
  display: inline-flex; align-items: center; gap: 5px;
  font-family: 'Courier Prime', monospace;
  font-size: 10px; font-weight: 700; letter-spacing: 0.1em;
  border: 1.5px solid currentColor;
  padding: 2px 8px; border-radius: 1px;
}
.cc-aqi-dot {
  width: 7px; height: 7px; border-radius: 50%; display: inline-block;
  animation: cc-aqi-blink 1.2s step-end infinite;
}
@keyframes cc-aqi-blink { 0%,100% { opacity: 1 } 50% { opacity: 0.3 } }

.cc-aqi-empty, .cc-aqi-error {
  padding: 24px;
  text-align: center;
  font-family: 'Special Elite', cursive;
  font-size: 11px; letter-spacing: 0.18em;
  color: rgba(26,20,16,0.5);
  border: 1px dashed rgba(26,20,16,0.25);
}
.cc-aqi-error {
  color: #c0392b;
  border-color: #c0392b;
  background: rgba(192,57,43,0.06);
}
.cc-aqi-error-sub {
  font-size: 10px; letter-spacing: 0.1em;
  color: rgba(26,20,16,0.5);
  margin-top: 8px;
}

.cc-aqi-grid {
  display: grid; gap: 10px;
  grid-template-columns: 1fr;
}
@media (min-width: 640px)  { .cc-aqi-grid { grid-template-columns: repeat(2, 1fr); } }
@media (min-width: 1024px) { .cc-aqi-grid { grid-template-columns: repeat(3, 1fr); } }

.cc-aqi-card {
  padding: 12px 14px;
  border: 1px solid rgba(26,20,16,0.2);
  background: rgba(240,235,224,0.5);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}
.cc-aqi-card:hover {
  transform: translate(-1px, -1px);
  box-shadow: 2px 2px 0 rgba(26,20,16,0.2);
}
.cc-aqi-card-top {
  display: flex; align-items: flex-start; justify-content: space-between;
  gap: 10px; margin-bottom: 8px;
}
.cc-aqi-city {
  font-family: 'Oswald', sans-serif;
  font-size: 13px; font-weight: 600; letter-spacing: 0.06em;
  color: #1a1410;
}
.cc-aqi-stations {
  font-family: 'Special Elite', cursive;
  font-size: 9px; color: rgba(26,20,16,0.5);
  letter-spacing: 0.1em; margin-top: 2px;
}
.cc-aqi-level {
  font-family: 'Courier Prime', monospace;
  font-size: 9px; font-weight: 700; letter-spacing: 0.12em;
  border: 1.5px solid currentColor;
  padding: 2px 6px; white-space: nowrap;
}
.cc-aqi-pm25 {
  font-family: 'Oswald', sans-serif;
  font-size: 30px; font-weight: 700; line-height: 1;
  margin: 4px 0 8px;
}
.cc-aqi-unit {
  font-family: 'Special Elite', cursive;
  font-size: 10px; font-weight: 400;
  color: rgba(26,20,16,0.5); letter-spacing: 0.1em;
}
.cc-aqi-others {
  display: flex; flex-wrap: wrap; gap: 4px 12px;
  font-family: 'Courier Prime', monospace; font-size: 11px;
}
.cc-aqi-other-key {
  font-family: 'Special Elite', cursive;
  font-size: 9px; color: rgba(26,20,16,0.5);
  letter-spacing: 0.1em; margin-right: 4px;
}
.cc-aqi-other-val {
  font-weight: 700; color: #1a1410;
}
.cc-aqi-other-val em {
  font-style: normal; font-weight: 400;
  color: rgba(26,20,16,0.5); font-size: 9px;
  margin-left: 2px;
}
.cc-aqi-card-foot {
  margin-top: 8px;
  font-family: 'Special Elite', cursive;
  font-size: 9px; letter-spacing: 0.12em;
  color: rgba(26,20,16,0.5);
}
`;
