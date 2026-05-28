// ─── EMISSIONAREACHART ─── CO2 + NOx Area Chart ──────────────────────────────
import React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import type { MonthlyEmission } from '../../types';

interface EmissionAreaChartProps {
  data: MonthlyEmission[];
  height?: number;
}

const CustomTooltip: React.FC<{ active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }> = ({
  active,
  payload,
  label,
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div
      style={{
        background: 'rgba(10, 12, 15, 0.95)',
        border: '1px solid rgba(212, 168, 71, 0.25)',
        padding: '10px 14px',
        fontFamily: "'Share Tech Mono', monospace",
        fontSize: 11,
        color: '#e8e0d0',
      }}
    >
      <div style={{ marginBottom: 6, color: '#8a8577', fontSize: 10 }}>{label}</div>
      {payload.map((entry, i) => (
        <div key={i} style={{ color: entry.color, marginBottom: 2 }}>
          {entry.name}: {entry.value.toLocaleString()}
        </div>
      ))}
    </div>
  );
};

const EmissionAreaChart: React.FC<EmissionAreaChartProps> = ({ data, height = 300 }) => {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
        <defs>
          <linearGradient id="gradCo2" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#f0a500" stopOpacity={0.35} />
            <stop offset="95%" stopColor="#f0a500" stopOpacity={0.02} />
          </linearGradient>
          <linearGradient id="gradNox" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="#4ecdc4" stopOpacity={0.35} />
            <stop offset="95%" stopColor="#4ecdc4" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(138, 133, 119, 0.12)" />
        <XAxis
          dataKey="month"
          tick={{ fill: '#8a8577', fontSize: 10, fontFamily: "'Share Tech Mono', monospace" }}
          axisLine={{ stroke: 'rgba(138, 133, 119, 0.2)' }}
          tickLine={false}
        />
        <YAxis
          tick={{ fill: '#8a8577', fontSize: 10, fontFamily: "'Share Tech Mono', monospace" }}
          axisLine={{ stroke: 'rgba(138, 133, 119, 0.2)' }}
          tickLine={false}
        />
        <Tooltip content={<CustomTooltip />} />
        <Area
          type="monotone"
          dataKey="co2"
          name="CO₂"
          stroke="#f0a500"
          strokeWidth={2}
          fill="url(#gradCo2)"
        />
        <Area
          type="monotone"
          dataKey="nox"
          name="NOx"
          stroke="#4ecdc4"
          strokeWidth={2}
          fill="url(#gradNox)"
        />
      </AreaChart>
    </ResponsiveContainer>
  );
};

export default EmissionAreaChart;
