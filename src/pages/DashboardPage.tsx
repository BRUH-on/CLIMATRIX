// ─── DASHBOARD PAGE ────────────────────────────────────────────────────────────
import React from 'react';
import type { User } from '../types';
import GlassCard from '../components/ui/GlassCard';
import StatCard from '../components/ui/StatCard';
import SectionLabel from '../components/ui/SectionLabel';
import Badge from '../components/ui/Badge';
import ProgressBar from '../components/ui/ProgressBar';
import EmissionAreaChart from '../components/charts/EmissionAreaChart';
import SectorComparison from '../components/charts/SectorComparison';
import AQIGauge from '../components/charts/AQIGauge';
import { MONTHLY_TRENDS, ALERTS, AQI_DATA, SECTOR_AVERAGES } from '../data/mockData';

interface DashboardPageProps {
  user: User;
  lang: string;
}

/* ── System Health Items ────────────────────────────────────────────────────── */
const SYSTEM_HEALTH = [
  { label: 'MONITORING', value: 95, color: 'var(--green)' },
  { label: 'AI_ANALYSIS', value: 87, color: 'var(--teal)' },
  { label: 'SATELLITE', value: 92, color: 'var(--gold)' },
  { label: 'COMPLIANCE', value: 78, color: 'var(--amber)' },
];

/* ── Platform Capabilities ──────────────────────────────────────────────────── */
const CAPABILITIES = [
  { icon: '📡', title: 'Real-Time Monitoring', desc: 'Continuous IoT sensor data ingestion' },
  { icon: '🤖', title: 'AI Analysis', desc: 'ML-powered anomaly detection' },
  { icon: '🛰️', title: 'Satellite Verification', desc: 'Cross-verify with satellite imagery' },
  { icon: '🔔', title: 'Smart Alerts', desc: 'Intelligent escalation engine' },
  { icon: '📊', title: 'Auto Reports', desc: 'Automated compliance reporting' },
  { icon: '🌍', title: 'Public Portal', desc: 'Civilian transparency interface' },
  { icon: '✅', title: 'Compliance Engine', desc: 'Real-time regulatory scoring' },
  { icon: '⚡', title: 'Alert Escalation', desc: 'Multi-level breach response' },
];

const DashboardPage: React.FC<DashboardPageProps> = ({ user }) => {
  const recentAlerts = ALERTS.slice(0, 4);
  const topAQI = AQI_DATA.slice(0, 4);
  const isGov = user.role === 'government';

  const alertBorderColor = (type: string) => {
    switch (type) {
      case 'CRITICAL': return 'var(--red)';
      case 'WARNING': return 'var(--amber)';
      case 'INFO': return 'var(--teal)';
      default: return 'var(--green)';
    }
  };

  return (
    <div>
      {/* ── Stat Cards ────────────────────────────────────────────────── */}
      <SectionLabel>// SYSTEM OVERVIEW</SectionLabel>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16, marginBottom: 28 }}>
        <StatCard label="CO₂ EMISSIONS" value="250" unit="t/mo" icon="🏭" color="var(--amber)" trend="+4.2%" delay={0} />
        <StatCard label="NOx LEVELS" value="45" unit="kg" icon="💨" color="var(--teal)" trend="-2.1%" delay={1} />
        <StatCard label="SOx OUTPUT" value="12" unit="kg" icon="⚗️" color="var(--gold)" trend="+1.8%" delay={2} />
        <StatCard label="AQI INDEX" value="85" unit="" icon="🌫️" color="var(--amber)" trend="+3%" delay={3} />
      </div>

      {/* ── System Health + Alerts ─────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 28 }}>
        {/* System Health */}
        <GlassCard hoverable delay={0}>
          <SectionLabel>// SYSTEM HEALTH</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginTop: 12 }}>
            {SYSTEM_HEALTH.map(s => (
              <div key={s.label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text2)', letterSpacing: 1 }}>
                    {s.label}
                  </span>
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: s.color }}>
                    {s.value}%
                  </span>
                </div>
                <ProgressBar value={s.value} color={s.color} animated />
              </div>
            ))}
          </div>
        </GlassCard>

        {/* Active Alerts */}
        <GlassCard hoverable delay={1}>
          <SectionLabel>// ACTIVE ALERTS</SectionLabel>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 12 }}>
            {recentAlerts.map(a => (
              <div key={a.id} style={{
                padding: '10px 14px', borderRadius: 4,
                borderLeft: `3px solid ${alertBorderColor(a.type)}`,
                background: 'rgba(255,255,255,0.02)',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <Badge status={a.type} />
                  <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text3)' }}>{a.time}</span>
                </div>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text2)', margin: 0 }}>
                  {a.message}
                </p>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* ── Monthly Trends ─────────────────────────────────────────────── */}
      <SectionLabel>// MONTHLY EMISSION TRENDS</SectionLabel>
      <GlassCard delay={2} style={{ marginBottom: 28 }}>
        <EmissionAreaChart data={MONTHLY_TRENDS} height={300} />
      </GlassCard>

      {/* ── Government-only: AQI + Sector ──────────────────────────────── */}
      {isGov && (
        <>
          <SectionLabel>// AIR QUALITY INDEX — TOP CITIES</SectionLabel>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 28 }}>
            {topAQI.map(a => (
              <GlassCard key={a.city} hoverable>
                <AQIGauge value={a.aqi} city={a.city} />
              </GlassCard>
            ))}
          </div>

          <SectionLabel>// SECTOR COMPARISON</SectionLabel>
          <GlassCard delay={3} style={{ marginBottom: 28 }}>
            <SectorComparison data={SECTOR_AVERAGES} />
          </GlassCard>
        </>
      )}

      {/* ── Platform Capabilities ──────────────────────────────────────── */}
      <SectionLabel>// PLATFORM CAPABILITIES</SectionLabel>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 16, marginBottom: 28 }}>
        {CAPABILITIES.map((c, i) => (
          <GlassCard key={c.title} hoverable delay={i % 5}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <span style={{ fontSize: 28 }}>{c.icon}</span>
              <div>
                <h4 style={{
                  fontFamily: 'var(--font-head)', fontSize: 14, color: 'var(--gold)',
                  margin: 0, letterSpacing: 1,
                }}>
                  {c.title}
                </h4>
                <p style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text3)', margin: '4px 0 0' }}>
                  {c.desc}
                </p>
              </div>
            </div>
          </GlassCard>
        ))}
      </div>
    </div>
  );
};

export default DashboardPage;
