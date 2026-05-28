// ─── LOGIN PAGE ────────────────────────────────────────────────────────────────
import React, { useState, useEffect } from 'react';
import type { User, Role } from '../types';
import ParticleCanvas from '../components/ui/ParticleCanvas';
import GlassCard from '../components/ui/GlassCard';
import NierButton from '../components/ui/NierButton';
import NierInput from '../components/ui/NierInput';
import NierDivider from '../components/ui/NierDivider';
import SectionLabel from '../components/ui/SectionLabel';

/* ── Typewriter Hook ────────────────────────────────────────────────────────── */
function useTypewriter(text: string, speed = 120) {
  const [display, setDisplay] = useState('');
  const [done, setDone] = useState(false);
  useEffect(() => {
    setDisplay('');
    setDone(false);
    let i = 0;
    const iv = setInterval(() => {
      i++;
      setDisplay(text.slice(0, i));
      if (i >= text.length) { clearInterval(iv); setDone(true); }
    }, speed);
    return () => clearInterval(iv);
  }, [text, speed]);
  return { display, done };
}

/* ── Hex Ring SVG ───────────────────────────────────────────────────────────── */
const HexRing: React.FC = () => (
  <svg width="100" height="100" viewBox="0 0 120 120" style={{ animation: 'spin3d 12s linear infinite' }}>
    <polygon points="60,5 110,30 110,90 60,115 10,90 10,30"
      fill="none" stroke="var(--gold)" strokeWidth="1.5" opacity="0.7" />
    <polygon points="60,20 95,40 95,80 60,100 25,80 25,40"
      fill="none" stroke="var(--gold)" strokeWidth="1" opacity="0.5" />
    <circle cx="60" cy="60" r="8" fill="var(--gold)" opacity="0.6" />
  </svg>
);

/* ── Corner Brackets ────────────────────────────────────────────────────────── */
const corners: React.CSSProperties[] = [
  { top: 20, left: 20, borderTop: '2px solid var(--gold)', borderLeft: '2px solid var(--gold)' },
  { top: 20, right: 20, borderTop: '2px solid var(--gold)', borderRight: '2px solid var(--gold)' },
  { bottom: 20, left: 20, borderBottom: '2px solid var(--gold)', borderLeft: '2px solid var(--gold)' },
  { bottom: 20, right: 20, borderBottom: '2px solid var(--gold)', borderRight: '2px solid var(--gold)' },
];

interface LoginPageProps {
  onLogin: (user: User) => void;
  lang: string;
  setLang: (lang: string) => void;
}

const LoginPage: React.FC<LoginPageProps> = ({ onLogin, lang, setLang }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<Role | ''>('');
  const [error, setError] = useState('');
  const { display, done } = useTypewriter('CLIMACORE');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    if (!email.trim()) { setError('OPERATOR ID REQUIRED'); return; }
    if (!password.trim()) { setError('AUTHORIZATION CODE REQUIRED'); return; }
    if (!role) { setError('CLEARANCE LEVEL REQUIRED'); return; }

    const name = email.split('@')[0].replace(/[._]/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
    const user: User = {
      id: `USR-${Date.now().toString(36).toUpperCase()}`,
      name,
      email,
      role: role as Role,
    };
    onLogin(user);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'var(--bg)', overflow: 'hidden' }}>
      {/* Particle background */}
      <ParticleCanvas />

      {/* SVG grid background */}
      <svg style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', opacity: 0.06, pointerEvents: 'none' }}>
        <defs>
          <pattern id="grid" width="60" height="60" patternUnits="userSpaceOnUse">
            <path d="M 60 0 L 0 0 0 60" fill="none" stroke="var(--gold)" strokeWidth="0.5" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#grid)" />
      </svg>

      {/* Floating orbs */}
      <div style={{
        position: 'absolute', top: '15%', left: '10%', width: 200, height: 200, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(212,168,71,0.15) 0%, transparent 70%)',
        animation: 'float 8s ease-in-out infinite', pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', bottom: '20%', right: '12%', width: 160, height: 160, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(78,205,196,0.12) 0%, transparent 70%)',
        animation: 'float 10s ease-in-out infinite', animationDelay: '-3s', pointerEvents: 'none',
      }} />
      <div style={{
        position: 'absolute', top: '60%', left: '25%', width: 120, height: 120, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(212,168,71,0.08) 0%, transparent 70%)',
        animation: 'float 12s ease-in-out infinite', animationDelay: '-5s', pointerEvents: 'none',
      }} />

      {/* Corner brackets */}
      {corners.map((s, i) => (
        <div key={i} style={{ position: 'absolute', width: 40, height: 40, ...s, pointerEvents: 'none' }} />
      ))}

      {/* Language toggle */}
      <div style={{ position: 'absolute', top: 24, right: 24, display: 'flex', gap: 8, zIndex: 10 }}>
        {['en', 'hi'].map(l => (
          <button key={l} className="n-btn" onClick={() => setLang(l)}
            style={{
              padding: '4px 14px', fontSize: 12, letterSpacing: 2,
              background: lang === l ? 'var(--gold)' : 'transparent',
              color: lang === l ? 'var(--bg)' : 'var(--gold)',
              border: '1px solid var(--gold)',
            }}>
            {l.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Center content */}
      <div style={{
        position: 'relative', zIndex: 5, display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: 20,
      }}>
        {/* Logo */}
        <div className="fade-up" style={{ marginBottom: 24 }}>
          <HexRing />
        </div>

        {/* Typewriter title */}
        <h1 className="fade-up-1" style={{
          fontFamily: 'var(--font-head)', fontSize: 48, fontWeight: 700,
          color: 'var(--gold)', letterSpacing: 12, margin: 0,
        }}>
          {display}
          {!done && <span className="typing-cursor" style={{ color: 'var(--gold)' }}>|</span>}
        </h1>

        {/* Subtitle */}
        <p className="fade-up-2" style={{
          fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text3)',
          letterSpacing: 4, marginTop: 8, marginBottom: 28, textTransform: 'uppercase',
        }}>
          ENVIRONMENTAL INTELLIGENCE SYSTEM
        </p>

        <div className="fade-up-2" style={{ width: '100%', maxWidth: 440 }}>
          <NierDivider />
        </div>

        {/* Login card */}
        <div className="fade-up-3" style={{ width: '100%', maxWidth: 440, marginTop: 28 }}>
          <GlassCard variant="gold" className="bracket">
            <form onSubmit={handleSubmit}>
              <SectionLabel>// OPERATOR ID</SectionLabel>
              <NierInput
                value={email}
                onChange={setEmail}
                type="email"
                placeholder="operator@climacore.sys"
              />

              <div style={{ marginTop: 16 }}>
                <SectionLabel>// AUTHORIZATION CODE</SectionLabel>
                <NierInput
                  value={password}
                  onChange={setPassword}
                  type="password"
                  placeholder="••••••••"
                />
              </div>

              <div style={{ marginTop: 16 }}>
                <SectionLabel>// CLEARANCE LEVEL</SectionLabel>
                <select
                  className="n-input"
                  value={role}
                  onChange={e => setRole(e.target.value as Role)}
                  style={{ width: '100%', padding: '10px 14px', cursor: 'pointer' }}
                >
                  <option value="">SELECT ROLE...</option>
                  <option value="industry">FACTORY CONTROLLER</option>
                  <option value="government">AUTHORITY ADMIN</option>
                  <option value="citizen">PUBLIC OBSERVER</option>
                </select>
              </div>

              {error && (
                <p style={{ color: 'var(--red)', fontFamily: 'var(--font-mono)', fontSize: 12, marginTop: 12 }}>
                  ⚠ {error}
                </p>
              )}

              <div style={{ marginTop: 24 }}>
                <NierButton variant="primary" fullWidth>
                  INITIALIZE
                </NierButton>
              </div>
            </form>
          </GlassCard>
        </div>

        {/* System info */}
        <div className="fade-up-4" style={{
          display: 'flex', gap: 24, marginTop: 28, fontFamily: 'var(--font-mono)',
          fontSize: 10, color: 'var(--text3)', letterSpacing: 2,
        }}>
          <span>VER 2.9.4</span>
          <span style={{ color: 'var(--border)' }}>|</span>
          <span>SECURE_CONNECTION</span>
          <span style={{ color: 'var(--border)' }}>|</span>
          <span>YoRHa_NET</span>
        </div>
      </div>

      {/* Footer bar */}
      <div style={{
        position: 'absolute', bottom: 0, left: 0, right: 0,
        display: 'flex', justifyContent: 'center', gap: 32,
        padding: '12px 0', borderTop: '1px solid var(--border)',
        fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text3)',
        letterSpacing: 2, background: 'rgba(10,12,15,0.8)',
      }}>
        <span>SYSTEM_READY</span>
        <span style={{ color: 'var(--green)' }}>● ONLINE</span>
        <span>GLORY_TO_MANKIND</span>
      </div>

      {/* spin3d keyframes */}
      <style>{`
        @keyframes spin3d {
          0% { transform: rotateY(0deg) rotateZ(0deg); }
          100% { transform: rotateY(360deg) rotateZ(360deg); }
        }
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-20px); }
        }
      `}</style>
    </div>
  );
};

export default LoginPage;
