// ─── GLASSCARD ─── NieR: Automata Aesthetic Glass Container ───────────────────
import React, { useRef, useState, type CSSProperties, type ReactNode } from 'react';

interface GlassCardProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
  variant?: 'default' | 'gold' | 'liquid';
  hoverable?: boolean;
  delay?: number;
}

const variantClass: Record<string, string> = {
  default: 'glass',
  gold: 'glass-gold',
  liquid: 'liquid-glass',
};

const GlassCard: React.FC<GlassCardProps> = ({
  children,
  className = '',
  style,
  variant = 'default',
  hoverable = false,
  delay,
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState<string>('perspective(1000px) rotateX(0deg) rotateY(0deg)');

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!hoverable || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((y - centerY) / centerY) * -8;
    const rotateY = ((x - centerX) / centerX) * 8;
    setTransform(`perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg)`);
  };

  const handleMouseLeave = () => {
    if (!hoverable) return;
    setTransform('perspective(1000px) rotateX(0deg) rotateY(0deg)');
  };

  const fadeClass = delay != null ? `fade-up fade-up-${delay}` : '';
  const baseClass = variantClass[variant] || 'glass';

  return (
    <div
      ref={ref}
      className={`${baseClass} bracket ${fadeClass} ${className}`.trim()}
      style={{
        ...style,
        transform: hoverable ? transform : undefined,
        transition: hoverable ? 'transform 0.3s ease-out' : undefined,
        willChange: hoverable ? 'transform' : undefined,
      }}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
    >
      {children}
    </div>
  );
};

export default GlassCard;
