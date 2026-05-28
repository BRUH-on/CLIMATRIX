import { useEffect, useRef } from 'react';

/**
 * CapabilitiesModal — accessible, self-contained pop-up that lists the platform
 * capabilities. No external UI library required; styles match the existing
 * ClimaCore "sketch on paper" aesthetic (Oswald titles, Special Elite subtext,
 * paper/ink palette, dashed separator). Drop in anywhere.
 *
 * Behaviour:
 * - Open/close controlled via the `open` prop.
 * - ESC closes.
 * - Click on backdrop closes.
 * - Initial focus moves into the dialog; previous focus restored on close.
 * - aria-modal + role="dialog" for screen readers.
 */

export interface Capability {
  title: string;
  subtext: string;
}

const DEFAULT_CAPABILITIES: Capability[] = [
  { title: 'Real-Time Monitoring',    subtext: '30-sec sensor refresh \u00B7 240 stations' },
  { title: 'AI Anomaly Detection',    subtext: 'ML deviation alerts \u00B7 98.7% precision' },
  { title: 'Satellite Verification',  subtext: 'Independent cross-check every 6 hrs' },
  { title: 'CPCB/SPCB Compliance',    subtext: 'Real-time regulatory rule matching' },
  { title: 'Auto Report Generation',  subtext: 'Scheduled PDF + CSV dispatch system' },
  { title: 'Public Heatmap Portal',   subtext: 'Citizen-facing open emissions data' },
];

export interface CapabilitiesModalProps {
  open: boolean;
  onClose: () => void;
  /** Optional override; defaults to the six platform capabilities. */
  capabilities?: Capability[];
  title?: string;
}

export default function CapabilitiesModal({
  open,
  onClose,
  capabilities = DEFAULT_CAPABILITIES,
  title = 'CAPABILITIES',
}: CapabilitiesModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  // Lock body scroll, ESC-to-close, focus restoration.
  useEffect(() => {
    if (!open) return;

    previouslyFocused.current = document.activeElement as HTMLElement | null;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    // Focus the dialog so screen readers land somewhere meaningful.
    queueMicrotask(() => dialogRef.current?.focus());

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);

    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = prevOverflow;
      previouslyFocused.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <style>{STYLES}</style>
      <div
        className="cc-cap-backdrop"
        onMouseDown={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="cc-cap-title"
          tabIndex={-1}
          ref={dialogRef}
          className="cc-cap-panel"
        >
          {/* Header with dashed separator */}
          <header className="cc-cap-header">
            <h2 id="cc-cap-title" className="cc-cap-title">
              {title}
            </h2>
            <span className="cc-cap-sep" aria-hidden="true" />
            <button
              type="button"
              className="cc-cap-close"
              onClick={onClose}
              aria-label="Close capabilities dialog"
            >
              {'\u2715'}
            </button>
          </header>

          {/* Capabilities grid */}
          <div className="cc-cap-grid" role="list">
            {capabilities.map((cap) => (
              <article
                key={cap.title}
                role="listitem"
                tabIndex={0}
                className="cc-cap-card"
              >
                <h3 className="cc-cap-card-title">{cap.title}</h3>
                <p className="cc-cap-card-sub">{cap.subtext}</p>
              </article>
            ))}
          </div>
        </div>
      </div>
    </>
  );
}

// -----------------------------------------------------------------------------
// Scoped styles. All selectors are prefixed `cc-cap-` to avoid collisions.
// Self-contained so the component works independently of App.tsx's global CSS.
// -----------------------------------------------------------------------------
const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Special+Elite&family=Oswald:wght@400;500;700&family=Courier+Prime:wght@400;700&display=swap');

.cc-cap-backdrop {
  position: fixed; inset: 0; z-index: 9998;
  background: rgba(20, 16, 12, 0.55);
  backdrop-filter: blur(2px);
  display: flex; align-items: center; justify-content: center;
  padding: 24px;
  animation: cc-cap-fade 0.18s ease-out;
}
@keyframes cc-cap-fade { from { opacity: 0 } to { opacity: 1 } }
@keyframes cc-cap-pop  { from { opacity: 0; transform: translateY(8px) scale(0.98) } to { opacity: 1; transform: none } }

.cc-cap-panel {
  position: relative;
  width: min(820px, 100%);
  max-height: calc(100vh - 48px);
  overflow-y: auto;
  background: #f0ebe0;
  color: #1a1410;
  border: 2px solid #3d3020;
  border-radius: 2px;
  box-shadow: 4px 4px 0 rgba(26,20,16,0.25), 8px 8px 0 rgba(26,20,16,0.18);
  padding: 22px 24px 24px;
  font-family: 'Courier Prime', monospace;
  outline: none;
  animation: cc-cap-pop 0.2s ease-out;
}

.cc-cap-header {
  display: flex; align-items: center; gap: 14px;
  margin-bottom: 18px;
}
.cc-cap-title {
  font-family: 'Oswald', sans-serif;
  font-size: 18px;
  font-weight: 600;
  letter-spacing: 0.22em;
  margin: 0;
  color: #1a1410;
}
.cc-cap-sep {
  flex: 1; height: 2px;
  background: repeating-linear-gradient(
    90deg, #3d3020 0, #3d3020 4px, transparent 4px, transparent 9px
  );
}
.cc-cap-close {
  width: 30px; height: 30px;
  display: inline-flex; align-items: center; justify-content: center;
  border: 2px solid #3d3020;
  background: #e8e2d4;
  font-family: 'Courier Prime', monospace;
  font-size: 14px; font-weight: 700;
  cursor: pointer;
  box-shadow: 2px 2px 0 rgba(26,20,16,0.4);
  transition: transform 0.12s ease, box-shadow 0.12s ease, background 0.12s ease;
}
.cc-cap-close:hover {
  transform: translate(-1px, -1px);
  box-shadow: 3px 3px 0 rgba(26,20,16,0.4);
  background: #ddd6c4;
}
.cc-cap-close:active {
  transform: translate(2px, 2px);
  box-shadow: 1px 1px 0 rgba(26,20,16,0.4);
}

.cc-cap-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 10px;
}
@media (min-width: 720px) {
  .cc-cap-grid { grid-template-columns: 1fr 1fr; }
}

.cc-cap-card {
  padding: 14px 16px;
  border: 1px solid rgba(26,20,16,0.25);
  background: rgba(240,235,224,0.5);
  cursor: default;
  transition: transform 0.15s ease, border-color 0.15s ease,
              background 0.15s ease, box-shadow 0.15s ease;
  outline: none;
}
.cc-cap-card:hover,
.cc-cap-card:focus-visible {
  border-color: #3d3020;
  background: rgba(26,20,16,0.06);
  transform: translate(-1px, -1px);
  box-shadow: 2px 2px 0 rgba(26,20,16,0.25);
}
.cc-cap-card-title {
  font-family: 'Oswald', sans-serif;
  font-size: 13px;
  font-weight: 500;
  letter-spacing: 0.06em;
  color: #1a1410;
  margin: 0 0 6px;
}
.cc-cap-card-sub {
  font-family: 'Special Elite', cursive;
  font-size: 11px;
  line-height: 1.55;
  color: rgba(26,20,16,0.55);
  margin: 0;
}
`;
