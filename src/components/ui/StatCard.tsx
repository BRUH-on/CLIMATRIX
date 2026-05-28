// ─── STATCARD ─── Key Metric Display Card ────────────────────────────────────
import React, { type ReactNode } from 'react';
import GlassCard from './GlassCard';

interface StatCardProps {
  label: string;
  value: string | number;
  unit?: string;
  icon?: ReactNode;
  color?: string;
  trend?: number;
  delay?: number;
}

const StatCard: React.FC<StatCardProps> = ({
  label,
  value,
  unit,
  icon,
  color,
  trend,
  delay,
}) => {
  const trendColor = trend != null ? (trend > 0 ? '#e05c5c' : '#56d48c') : undefined;
  const trendArrow = trend != null ? (trend > 0 ? '▲' : '▼') : '';

  return (
    <GlassCard delay={delay} hoverable style={{ position: 'relative', padding: '20px 24px' }}>
      {/* Icon top-right */}
      {icon && (
        <div
          style={{
            position: 'absolute',
            top: 14,
            right: 16,
            fontSize: 22,
            opacity: 0.5,
            color: color || '#d4a847',
          }}
        >
          {icon}
        </div>
      )}

      {/* Label */}
      <div className="sec-label">{label}</div>

      {/* Value */}
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginTop: 6 }}>
        <span className="metric-val" style={{ color: color || '#d4a847' }}>
          {value}
        </span>
        {unit && <span className="metric-unit">{unit}</span>}
      </div>

      {/* Trend */}
      {trend != null && (
        <div
          style={{
            marginTop: 8,
            fontSize: 12,
            fontFamily: "'Share Tech Mono', monospace",
            color: trendColor,
            display: 'flex',
            alignItems: 'center',
            gap: 4,
          }}
        >
          <span>{trendArrow}</span>
          <span>{Math.abs(trend).toFixed(1)}%</span>
        </div>
      )}
    </GlassCard>
  );
};

export default StatCard;
