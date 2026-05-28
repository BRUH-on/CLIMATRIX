// ─── MODAL ─── Overlay Dialog ─────────────────────────────────────────────────
import React, { useEffect, useState, type ReactNode } from 'react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}

const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  const [visible, setVisible] = useState(false);
  const [opacity, setOpacity] = useState(0);

  useEffect(() => {
    if (isOpen) {
      setVisible(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setOpacity(1));
      });
    } else {
      setOpacity(0);
      const timer = setTimeout(() => setVisible(false), 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen]);

  if (!visible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'rgba(0, 0, 0, 0.65)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        opacity,
        transition: 'opacity 0.3s ease',
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="glass bracket"
        style={{
          minWidth: 360,
          maxWidth: '90vw',
          maxHeight: '85vh',
          overflowY: 'auto',
          padding: '28px 32px',
          position: 'relative',
          transform: opacity === 1 ? 'translateY(0)' : 'translateY(16px)',
          transition: 'transform 0.3s ease',
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute',
            top: 12,
            right: 16,
            background: 'none',
            border: 'none',
            color: '#8a8577',
            fontSize: 20,
            cursor: 'pointer',
            fontFamily: "'Share Tech Mono', monospace",
            lineHeight: 1,
          }}
          aria-label="Close"
        >
          ✕
        </button>

        {/* Title */}
        {title && (
          <div
            className="sec-label"
            style={{ marginBottom: 18, paddingRight: 28 }}
          >
            {title}
          </div>
        )}

        {/* Content */}
        {children}
      </div>
    </div>
  );
};

export default Modal;
