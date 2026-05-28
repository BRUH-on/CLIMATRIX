// ─── NIERDIVIDER ─── Decorative Gradient Line ────────────────────────────────
import React from 'react';

interface NierDividerProps {
  className?: string;
}

const NierDivider: React.FC<NierDividerProps> = ({ className = '' }) => {
  return <div className={`nier-line ${className}`.trim()} />;
};

export default NierDivider;
