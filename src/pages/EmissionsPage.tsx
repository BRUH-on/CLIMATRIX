// ─── EMISSIONS PAGE ────────────────────────────────────────────────────────────
import React, { useState } from 'react';
import type { User, EmissionRecord } from '../types';
import { EMISSION_FACTORS } from '../types';
import GlassCard from '../components/ui/GlassCard';
import NierButton from '../components/ui/NierButton';
import NierInput from '../components/ui/NierInput';
import SectionLabel from '../components/ui/SectionLabel';
import NierDivider from '../components/ui/NierDivider';
import Badge from '../components/ui/Badge';
import EmissionBarChart from '../components/charts/EmissionBarChart';
import { EMISSION_HISTORY, WASTE_DOCUMENTS } from '../data/mockData';

interface EmissionsPageProps {
  user: User;
  lang: string;
}

const EmissionsPage: React.FC<EmissionsPageProps> = ({ user }) => {
  const [fuel, setFuel] = useState('');
  const [electricity, setElectricity] = useState('');
  const [production, setProduction] = useState('');
  const [calculated, setCalculated] = useState<{ co2: number; nox: number; sox: number } | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const handleCalculate = () => {
    const f = parseFloat(fuel) || 0;
    const e = parseFloat(electricity) || 0;
    const co2 = f * EMISSION_FACTORS.coal.co2 + e * EMISSION_FACTORS.electricity.co2;
    const nox = f * EMISSION_FACTORS.coal.nox;
    const sox = f * EMISSION_FACTORS.coal.sox;
    setCalculated({ co2: Math.round(co2 * 100) / 100, nox: Math.round(nox * 100) / 100, sox: Math.round(sox * 100) / 100 });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleCalculate();
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 3000);
  };

  /* ── Bar chart data derived from emission history ─────────────── */
  const barData = EMISSION_HISTORY.slice(0, 8).map(r => ({
    date: r.date,
    co2: r.co2,
    nox: r.nox,
    sox: r.sox,
  }));

  /* ── Status color helpers ─────────────────────────────────────── */
  const statusColor = (s: string) => {
    if (s === 'COMPLIANT') return 'var(--green)';
    if (s === 'WARNING') return 'var(--amber)';
    return 'var(--red)';
  };

  return (
    <div>
      <SectionLabel>// EMISSION DATA MANAGEMENT</SectionLabel>

      {/* ── Top 2-column: Form + Chart ─────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 28 }}>
        {/* Left — Entry Form */}
        <GlassCard variant="gold" className="bracket" delay={0}>
          <SectionLabel>SUBMIT EMISSION DATA</SectionLabel>
          <form onSubmit={handleSubmit}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <NierInput label="Fuel Consumed" value={fuel} onChange={setFuel} type="number" placeholder="0" unit="tonnes" />
              <NierInput label="Electricity Used" value={electricity} onChange={setElectricity} type="number" placeholder="0" unit="MWh" />
              <NierInput label="Production Volume" value={production} onChange={setProduction} type="number" placeholder="0" unit="tonnes" />
            </div>

            <div style={{ marginTop: 20 }}>
              <NierButton variant="primary" fullWidth>SUBMIT</NierButton>
            </div>
          </form>

          {/* Calculated results */}
          {calculated && (
            <div style={{ marginTop: 20, padding: 14, background: 'rgba(212,168,71,0.06)', borderRadius: 4, border: '1px solid var(--border)' }}>
              <SectionLabel>// CALCULATED EMISSIONS</SectionLabel>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12, marginTop: 8 }}>
                {[
                  { label: 'CO₂', val: calculated.co2, unit: 'tonnes', color: 'var(--amber)' },
                  { label: 'NOx', val: calculated.nox, unit: 'kg', color: 'var(--teal)' },
                  { label: 'SOx', val: calculated.sox, unit: 'kg', color: 'var(--gold)' },
                ].map(m => (
                  <div key={m.label} style={{ textAlign: 'center' }}>
                    <span className="metric-val" style={{ color: m.color, fontSize: 22 }}>{m.val}</span>
                    <span className="metric-unit" style={{ display: 'block', fontSize: 10, color: 'var(--text3)' }}>{m.unit}</span>
                    <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text3)', letterSpacing: 1 }}>{m.label}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {submitted && (
            <p style={{ color: 'var(--green)', fontFamily: 'var(--font-mono)', fontSize: 12, marginTop: 12, textAlign: 'center' }}>
              ✓ EMISSION DATA SUBMITTED SUCCESSFULLY
            </p>
          )}
        </GlassCard>

        {/* Right — Bar Chart */}
        <GlassCard delay={1}>
          <SectionLabel>// RECENT EMISSION DATA</SectionLabel>
          <EmissionBarChart data={barData} height={340} />
        </GlassCard>
      </div>

      {/* ── Emission History Table ──────────────────────────────────── */}
      <SectionLabel>// EMISSION HISTORY REGISTER</SectionLabel>
      <GlassCard delay={2} style={{ marginBottom: 28 }}>
        <div style={{ overflowX: 'auto' }}>
          <table className="n-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th>DATE</th><th>FACILITY</th><th>CO₂ (t)</th><th>NOx (kg)</th><th>SOx (kg)</th><th>PM2.5 (µg)</th><th>STATUS</th>
              </tr>
            </thead>
            <tbody>
              {EMISSION_HISTORY.map((r: EmissionRecord) => (
                <tr key={r.id}>
                  <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{r.date}</td>
                  <td>{r.facilityName}</td>
                  <td style={{ color: 'var(--amber)' }}>{r.co2}</td>
                  <td style={{ color: 'var(--teal)' }}>{r.nox}</td>
                  <td style={{ color: 'var(--gold)' }}>{r.sox}</td>
                  <td>{r.pm25}</td>
                  <td><Badge status={r.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>

      {/* ── Waste Document Upload ──────────────────────────────────── */}
      <SectionLabel>// WASTE DOCUMENTATION</SectionLabel>
      <GlassCard delay={3}>
        {/* Drop zone */}
        <div style={{
          border: '2px dashed var(--gold-dim)', borderRadius: 8, padding: '32px 20px',
          textAlign: 'center', marginBottom: 20, cursor: 'pointer',
          transition: 'border-color 0.3s',
        }}
          onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--gold)'; }}
          onDragLeave={e => { e.currentTarget.style.borderColor = 'var(--gold-dim)'; }}
          onDrop={e => { e.preventDefault(); e.currentTarget.style.borderColor = 'var(--gold-dim)'; }}
        >
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text3)', margin: 0 }}>
            📂 DRAG & DROP FILES HERE
          </p>
          <p style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text3)', marginTop: 6 }}>
            Supported: PDF, XLSX, CSV — Max 25MB
          </p>
        </div>

        <NierDivider />

        {/* Document list */}
        <div style={{ marginTop: 16 }}>
          {WASTE_DOCUMENTS.map(d => (
            <div key={d.id} style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '10px 14px', borderBottom: '1px solid var(--border)',
            }}>
              <div>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 13, color: 'var(--text)' }}>📄 {d.fileName}</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text3)', marginLeft: 12 }}>{d.type} · {d.size}</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text3)' }}>{d.uploadDate}</span>
                <Badge status={d.status} />
              </div>
            </div>
          ))}
        </div>
      </GlassCard>
    </div>
  );
};

export default EmissionsPage;
