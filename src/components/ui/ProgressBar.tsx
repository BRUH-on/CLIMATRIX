// ─── PROGRESSBAR ─── Animated Fill Bar ────────────────────────────────────────
import React from 'react';

interface ProgressBarProps {
  value: number;
  color?: string;
  height?: number;
  animated?: boolean;
}

const ProgressBar: React.FC<ProgressBarProps> = ({
  value,
  color = '#d4a847',
  height = 6,
  animated = false,
}) => {
  const clampedValue = Math.min(100, Math.max(0, value));

  return (
    <>
      {animated && (
        <style>{`
          @keyframes prog-shimmer {
            0% { background-position: -200% 0; }
            100% { background-position: 200% 0; }
          }
        `}</style>
      )}
      <div className="prog-bar" style={{ height }}>
        <div
          className="prog-fill"
          style={{
            width: `${clampedValue}%`,
            background: animated
              ? `linear-gradient(90deg, ${color}88, ${color}, ${color}88)`
              : `linear-gradient(90deg, ${color}cc, ${color})`,
            backgroundSize: animated ? '200% 100%' : undefined,
            animation: animated ? 'prog-shimmer 2s linear infinite' : undefined,
            height: '100%',
            borderRadius: 'inherit',
            transition: 'width 0.6s ease-out',
          }}
        />
      </div>
    </>
  );
};

export default ProgressBar;
