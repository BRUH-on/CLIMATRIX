// ─── BADGE ─── Status Indicator Badge ─────────────────────────────────────────
import React from 'react';
import type { ComplianceStatus, AlertType } from '../../types';

interface BadgeProps {
  status: ComplianceStatus | AlertType | string;
  size?: 'sm' | 'md';
}

const statusClassMap: Record<string, string> = {
  COMPLIANT: 'badge-green',
  OK: 'badge-green',
  GENERATED: 'badge-green',
  APPROVED: 'badge-green',
  RESOLVED: 'badge-green',
  ACKNOWLEDGED: 'badge-green',
  WARNING: 'badge-amber',
  PROCESSING: 'badge-amber',
  PENDING: 'badge-amber',
  UNDER_REVIEW: 'badge-amber',
  SUBMITTED: 'badge-amber',
  CRITICAL: 'badge-red',
  FAILED: 'badge-red',
  VIOLATION: 'badge-red',
  REJECTED: 'badge-red',
  INFO: 'badge-teal',
};

const Badge: React.FC<BadgeProps> = ({ status, size = 'md' }) => {
  const badgeClass = statusClassMap[status] || 'badge-teal';
  const sizeStyle = size === 'sm' ? { fontSize: 9, padding: '2px 6px' } : {};

  return (
    <span className={`badge ${badgeClass}`} style={sizeStyle}>
      {status}
    </span>
  );
};

export default Badge;
