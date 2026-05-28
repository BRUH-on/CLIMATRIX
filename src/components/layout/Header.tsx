// ─── HEADER ─── Sticky Navigation Bar ─────────────────────────────────────────
import React, { useState, useEffect } from 'react';
import type { User, Page } from '../../types';

interface HeaderProps {
  user: User;
  lang: string;
  setLang: (lang: string) => void;
  onLogout: () => void;
  page: Page;
  setPage: (page: Page) => void;
  notificationCount: number;
}

const rolePages: Record<string, Page[]> = {
  industry: ['dashboard', 'emissions', 'compliance', 'reports'],
  government: ['dashboard', 'emissions', 'compliance', 'reports', 'heatmap', 'alerts', 'settings'],
  citizen: ['dashboard', 'heatmap', 'civilian'],
};

const pageLabels: Record<Page, string> = {
  dashboard: 'DASHBOARD',
  emissions: 'EMISSIONS',
  compliance: 'COMPLIANCE',
  reports: 'REPORTS',
  heatmap: 'HEATMAP',
  alerts: 'ALERTS',
  civilian: 'CIVILIAN',
  settings: 'SETTINGS',
};

const Header: React.FC<HeaderProps> = ({
  user,
  lang,
  setLang,
  onLogout,
  page,
  setPage,
  notificationCount,
}) => {
  const [clock, setClock] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setClock(
        now.toLocaleTimeString('en-US', {
          hour12: false,
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        })
      );
    };
    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, []);

  const pages = rolePages[user.role] || rolePages.citizen;

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 24px',
        height: 56,
        background: 'rgba(10, 12, 15, 0.85)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        borderBottom: '1px solid rgba(212, 168, 71, 0.15)',
      }}
    >
      {/* ─── Left: Logo + Name ─── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* HexRing SVG Logo */}
        <svg width="30" height="30" viewBox="0 0 40 40" fill="none">
          <polygon
            points="20,2 36,11 36,29 20,38 4,29 4,11"
            stroke="#d4a847"
            strokeWidth="1.8"
            fill="none"
          />
          <circle cx="20" cy="20" r="5" stroke="#d4a847" strokeWidth="1.2" fill="none" />
        </svg>
        <div>
          <div
            style={{
              fontFamily: "'Rajdhani', sans-serif",
              fontWeight: 700,
              fontSize: 18,
              color: '#d4a847',
              letterSpacing: 3,
              lineHeight: 1,
            }}
          >
            CLIMACORE
          </div>
          <div
            style={{
              fontFamily: "'Share Tech Mono', monospace",
              fontSize: 9,
              color: '#8a8577',
              letterSpacing: 2,
              textTransform: 'uppercase',
            }}
          >
            {user.role}_INTERFACE
          </div>
        </div>
      </div>

      {/* ─── Center: Nav (desktop) ─── */}
      <nav
        style={{
          display: 'flex',
          gap: 4,
          alignItems: 'center',
        }}
        className="header-nav-desktop"
      >
        {pages.map((p) => (
          <button
            key={p}
            className={`nav-btn${page === p ? ' active' : ''}`}
            onClick={() => setPage(p)}
          >
            {pageLabels[p]}
          </button>
        ))}
      </nav>

      {/* ─── Right: Clock, User, Lang, Bell, Logout ─── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        {/* Clock */}
        <span
          style={{
            fontFamily: "'Share Tech Mono', monospace",
            fontSize: 12,
            color: '#8a8577',
            letterSpacing: 1,
          }}
        >
          {clock}
        </span>

        {/* User Name */}
        <span
          style={{
            fontFamily: "'Share Tech Mono', monospace",
            fontSize: 11,
            color: '#c8c0b0',
            letterSpacing: 1,
          }}
        >
          {user.name}
        </span>

        {/* Language Toggle */}
        <select
          value={lang}
          onChange={(e) => setLang(e.target.value)}
          style={{
            background: 'transparent',
            border: '1px solid rgba(212, 168, 71, 0.3)',
            color: '#c8c0b0',
            fontFamily: "'Share Tech Mono', monospace",
            fontSize: 10,
            padding: '2px 6px',
            cursor: 'pointer',
            outline: 'none',
          }}
        >
          <option value="en" style={{ background: '#0a0c0f' }}>EN</option>
          <option value="hi" style={{ background: '#0a0c0f' }}>HI</option>
        </select>

        {/* Notification Bell */}
        <div style={{ position: 'relative', cursor: 'pointer' }}>
          <span style={{ fontSize: 18, color: '#c8c0b0' }}>🔔</span>
          {notificationCount > 0 && (
            <span
              style={{
                position: 'absolute',
                top: -6,
                right: -8,
                background: '#e05c5c',
                color: '#fff',
                fontSize: 9,
                fontFamily: "'Share Tech Mono', monospace",
                borderRadius: '50%',
                width: 16,
                height: 16,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
              }}
            >
              {notificationCount > 9 ? '9+' : notificationCount}
            </span>
          )}
        </div>

        {/* Logout */}
        <button
          onClick={onLogout}
          style={{
            background: 'none',
            border: '1px solid rgba(224, 92, 92, 0.4)',
            color: '#e05c5c',
            fontFamily: "'Share Tech Mono', monospace",
            fontSize: 10,
            padding: '4px 10px',
            cursor: 'pointer',
            letterSpacing: 1,
          }}
        >
          LOGOUT
        </button>

        {/* Mobile Hamburger */}
        <button
          className="header-hamburger"
          onClick={() => setMenuOpen(!menuOpen)}
          style={{
            display: 'none',
            background: 'none',
            border: 'none',
            color: '#d4a847',
            fontSize: 22,
            cursor: 'pointer',
          }}
        >
          ☰
        </button>
      </div>

      {/* ─── Mobile Nav Overlay ─── */}
      {menuOpen && (
        <div
          style={{
            position: 'fixed',
            top: 56,
            left: 0,
            right: 0,
            background: 'rgba(10, 12, 15, 0.95)',
            backdropFilter: 'blur(12px)',
            padding: '16px 24px',
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            zIndex: 999,
            borderBottom: '1px solid rgba(212, 168, 71, 0.15)',
          }}
        >
          {pages.map((p) => (
            <button
              key={p}
              className={`nav-btn${page === p ? ' active' : ''}`}
              onClick={() => {
                setPage(p);
                setMenuOpen(false);
              }}
              style={{ width: '100%', textAlign: 'left' }}
            >
              {pageLabels[p]}
            </button>
          ))}
        </div>
      )}

      {/* Responsive CSS */}
      <style>{`
        @media (max-width: 768px) {
          .header-nav-desktop { display: none !important; }
          .header-hamburger { display: block !important; }
        }
      `}</style>
    </header>
  );
};

export default Header;
