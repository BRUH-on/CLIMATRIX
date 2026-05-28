// ─── NIERINPUT ─── Styled Form Input ──────────────────────────────────────────
import React from 'react';

interface NierInputProps {
  label?: string;
  value: string | number;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  type?: 'text' | 'number' | 'email' | 'password';
  placeholder?: string;
  unit?: string;
  className?: string;
  name?: string;
  min?: number;
  max?: number;
  step?: number;
  required?: boolean;
  disabled?: boolean;
}

const NierInput: React.FC<NierInputProps> = ({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  unit,
  className = '',
  name,
  min,
  max,
  step,
  required,
  disabled,
}) => {
  return (
    <div className={className} style={{ marginBottom: 12 }}>
      {label && <div className="sec-label">{label}</div>}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input
          className="n-input"
          type={type}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          name={name}
          min={min}
          max={max}
          step={step}
          required={required}
          disabled={disabled}
          style={{ flex: 1 }}
        />
        {unit && (
          <span
            style={{
              fontFamily: "'Share Tech Mono', monospace",
              fontSize: 12,
              color: '#8a8577',
              letterSpacing: 1,
              whiteSpace: 'nowrap',
            }}
          >
            {unit}
          </span>
        )}
      </div>
    </div>
  );
};

export default NierInput;
