// ─── SECTORCOMPARISON ─── Horizontal Bar Chart by Sector ─────────────────────
import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import type { SectorAverage } from '../../types';

interface SectorComparisonProps {
  data: SectorAverage[];
}

const getSeverityColor = (val: number): string => {
  if (val < 500) return '#56d48c';
  if (val < 1000) return '#f0a500';
  if (val < 2000) return '#e07c3e';
  return '#e05c5c';
};

const CustomTooltip: React.FC<{ active?: boolean; payload?: Array<{ value: number }>; label?: string }> = ({
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
      <div style={{ marginBottom: 4, color: '#d4a847', fontSize: 10 }}>{label}</div>
      <div>Avg CO₂: {payload[0].value.toLocaleString()} t</div>
    </div>
  );
};

const SectorComparison: React.FC<SectorComparisonProps> = ({ data }) => {
  return (
    <ResponsiveContainer width="100%" height={Math.max(200, data.length * 48)}>
      <BarChart data={data} layout="vertical" margin={{ top: 10, right: 30, left: 80, bottom: 10 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(138, 133, 119, 0.12)" horizontal={false} />
        <XAxis
          type="number"
          tick={{ fill: '#8a8577', fontSize: 10, fontFamily: "'Share Tech Mono', monospace" }}
          axisLine={{ stroke: 'rgba(138, 133, 119, 0.2)' }}
          tickLine={false}
        />
        <YAxis
          dataKey="sector"
          type="category"
          tick={{ fill: '#c8c0b0', fontSize: 11, fontFamily: "'Share Tech Mono', monospace" }}
          axisLine={false}
          tickLine={false}
          width={80}
        />
        <Tooltip content={<CustomTooltip />} />
        <Bar dataKey="avgCo2" name="Avg CO₂" radius={[0, 4, 4, 0]} maxBarSize={28}>
          {data.map((entry, idx) => (
            <Cell key={idx} fill={getSeverityColor(entry.avgCo2)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
};

export default SectorComparison;
