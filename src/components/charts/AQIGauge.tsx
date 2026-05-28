// ─── AQIGAUGE ─── SVG Circular AQI Gauge ──────────────────────────────────────
import React, { useEffect, useState } from 'react';

interface AQIGaugeProps {
  value: number;
  city: string;
  size?: number;
}

const getAQIColor = (aqi: number): string => {
  if (aqi <= 50) return '#56d48c';
  if (aqi <= 100) return '#f0a500';
  if (aqi <= 200) return '#e07c3e';
  if (aqi <= 300) return '#e05c5c';
  return '#8b0000';
};

const getAQILabel = (aqi: number): string => {
  if (aqi <= 50) return 'GOOD';
  if (aqi <= 100) return 'MODERATE';
  if (aqi <= 200) return 'UNHEALTHY';
  if (aqi <= 300) return 'VERY UNHEALTHY';
  return 'HAZARDOUS';
};

const AQIGauge: React.FC<AQIGaugeProps> = ({ value, city, size = 160 }) => {
  const [animatedValue, setAnimatedValue] = useState(0);

  useEffect(() => {
    let raf: number;
    const startTime = performance.now();
    const duration = 1200;
    const startVal = animatedValue;
    const endVal = Math.min(value, 500);

    const animate = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Ease out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setAnimatedValue(startVal + (endVal - startVal) * eased);
      if (progress < 1) {
        raf = requestAnimationFrame(animate);
      }
    };

    raf = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const color = getAQIColor(value);
  const label = getAQILabel(value);

  const cx = size / 2;
  const cy = size / 2;
  const r = (size - 20) / 2;
  const circumference = 2 * Math.PI * r;
  // Gauge covers 270 degrees (3/4 circle)
  const arcLength = circumference * 0.75;
  const fillFraction = Math.min(animatedValue / 500, 1);
  const fillLength = arcLength * fillFraction;
  const dashOffset = arcLength - fillLength;

  // Rotate to start from bottom-left (135deg)
  const rotation = 135;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 8,
      }}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* Background track */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="rgba(138, 133, 119, 0.15)"
          strokeWidth={6}
          strokeDasharray={`${arcLength} ${circumference - arcLength}`}
          strokeLinecap="round"
          transform={`rotate(${rotation} ${cx} ${cy})`}
        />

        {/* Color bands — subtle background indicators */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={6}
          strokeDasharray={`${fillLength} ${circumference - fillLength}`}
          strokeDashoffset={0}
          strokeLinecap="round"
          transform={`rotate(${rotation} ${cx} ${cy})`}
          style={{ transition: 'stroke 0.5s ease' }}
        />

        {/* Center value */}
        <text
          x={cx}
          y={cy - 6}
          textAnchor="middle"
          dominantBaseline="central"
          fill={color}
          fontFamily="'Rajdhani', sans-serif"
          fontWeight="700"
          fontSize={size * 0.22}
        >
          {Math.round(animatedValue)}
        </text>

        {/* Label */}
        <text
          x={cx}
          y={cy + size * 0.14}
          textAnchor="middle"
          dominantBaseline="central"
          fill="#8a8577"
          fontFamily="'Share Tech Mono', monospace"
          fontSize={size * 0.065}
          letterSpacing="1.5"
        >
          {label}
        </text>
      </svg>

      {/* City name */}
      <div
        style={{
          fontFamily: "'Share Tech Mono', monospace",
          fontSize: 11,
          color: '#c8c0b0',
          letterSpacing: 2,
          textTransform: 'uppercase',
        }}
      >
        {city}
      </div>
    </div>
  );
};

export default AQIGauge;
