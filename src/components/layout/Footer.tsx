// ─── FOOTER ─── System Status Bar ─────────────────────────────────────────────
import React from 'react';

const Footer: React.FC = () => {
  return (
    <footer
      style={{
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '8px 24px',
        fontFamily: "'Share Tech Mono', monospace",
        fontSize: 10,
        color: '#5a564e',
        letterSpacing: 2,
        borderTop: '1px solid rgba(212, 168, 71, 0.1)',
        background: 'rgba(10, 12, 15, 0.6)',
      }}
    >
      <span>SYSTEM_READY</span>
      <span style={{ color: '#56d48c' }}>● ONLINE</span>
      <span>GLORY_TO_MANKIND</span>
    </footer>
  );
};

export default Footer;
