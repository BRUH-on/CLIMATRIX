// ─── NIERBUTTON ─── Styled Action Button ─────────────────────────────────────
import React, { type CSSProperties, type ReactNode } from 'react';

interface NierButtonProps {
  children: ReactNode;
  onClick?: () => void;
  className?: string;
  style?: CSSProperties;
  variant?: 'primary' | 'secondary' | 'danger';
  fullWidth?: boolean;
  disabled?: boolean;
  loading?: boolean;
  type?: 'button' | 'submit' | 'reset';
}

const variantStyles: Record<string, CSSProperties> = {
  primary: {
    borderColor: '#d4a847',
    color: '#d4a847',
  },
  secondary: {
    borderColor: '#4ecdc4',
    color: '#4ecdc4',
  },
  danger: {
    borderColor: '#e05c5c',
    color: '#e05c5c',
  },
};

const Spinner: React.FC = () => (
  <span
    style={{
      display: 'inline-block',
      width: 14,
      height: 14,
      border: '2px solid currentColor',
      borderTopColor: 'transparent',
      borderRadius: '50%',
      animation: 'spin 0.6s linear infinite',
      marginRight: 8,
      verticalAlign: 'middle',
    }}
  />
);

const NierButton: React.FC<NierButtonProps> = ({
  children,
  onClick,
  className = '',
  style,
  variant = 'primary',
  fullWidth = false,
  disabled = false,
  loading = false,
  type = 'button',
}) => {
  const vStyle = variantStyles[variant] || variantStyles.primary;

  return (
    <>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      <button
        type={type}
        className={`n-btn ${className}`.trim()}
        onClick={onClick}
        disabled={disabled || loading}
        style={{
          ...vStyle,
          width: fullWidth ? '100%' : undefined,
          opacity: disabled ? 0.45 : 1,
          cursor: disabled || loading ? 'not-allowed' : 'pointer',
          ...style,
        }}
      >
        {loading && <Spinner />}
        {children}
      </button>
    </>
  );
};

export default NierButton;
