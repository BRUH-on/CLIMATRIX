// ─── EMISSIONBARCHART ─── Grouped Bar Chart ──────────────────────────────────
import React from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface BarDataPoint {
  date: string;
  co2: number;
  nox: number;
  sox?: number;
}

interface EmissionBarChartProps {
  data: BarDataPoint[];
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

const EmissionBarChart: React.FC<EmissionBarChartProps> = ({ data, height = 300 }) => {
  const hasSox = data.some((d) => d.sox != null);

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(138, 133, 119, 0.12)" />
        <XAxis
          dataKey="date"
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
        <Bar
          dataKey="co2"
          name="CO₂"
          fill="#f0a500"
          radius={[4, 4, 0, 0]}
          maxBarSize={32}
        />
        <Bar
          dataKey="nox"
          name="NOx"
          fill="#4ecdc4"
          radius={[4, 4, 0, 0]}
          maxBarSize={32}
        />
        {hasSox && (
          <Bar
            dataKey="sox"
            name="SOx"
            fill="#d4a847"
            radius={[4, 4, 0, 0]}
            maxBarSize={32}
          />
        )}
      </BarChart>
    </ResponsiveContainer>
  );
};

export default EmissionBarChart;
