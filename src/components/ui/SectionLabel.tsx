// ─── SECTIONLABEL ─── Section Header Label ───────────────────────────────────
import React, { type ReactNode } from 'react';

interface SectionLabelProps {
  children: ReactNode;
  className?: string;
}

const SectionLabel: React.FC<SectionLabelProps> = ({ children, className = '' }) => {
  return <div className={`sec-label ${className}`.trim()}>{children}</div>;
};

export default SectionLabel;
