import type { PropsWithChildren, ReactNode } from 'react';

export function Shell({ sidebar, children }: PropsWithChildren<{ sidebar?: ReactNode }>) {
  return (
    <div className="app-shell" style={{ display: 'grid', gridTemplateColumns: sidebar ? 'minmax(280px, 320px) minmax(0, 1fr)' : '1fr', minHeight: '100vh', background: 'radial-gradient(circle at top left, rgba(56, 44, 116, 0.16), transparent 28%), #04070c' }}>
      {sidebar ? <aside className="app-sidebar" style={{ borderRight: '1px solid rgba(255,255,255,0.07)', padding: 24, background: '#05080e' }}>{sidebar}</aside> : null}
      <main style={{ padding: 28 }}>{children}</main>
    </div>
  );
}

export function Card({ title, subtitle, children }: PropsWithChildren<{ title: string; subtitle?: string }>) {
  return (
    <section style={{ background: 'linear-gradient(180deg, rgba(8,12,20,0.98), rgba(5,8,14,0.98))', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: 20, boxShadow: '0 18px 50px rgba(0,0,0,0.18)' }}>
      <div style={{ marginBottom: 18, display: 'grid', gap: 8 }}>
        <h3 style={{ margin: 0, fontSize: 18, letterSpacing: '-0.02em' }}>{title}</h3>
        {subtitle ? <p style={{ margin: 0, color: '#7f8898', lineHeight: 1.6 }}>{subtitle}</p> : null}
      </div>
      {children}
    </section>
  );
}

export function KPI({ label, value, hint, info }: { label: string; value: string; hint?: string; info?: string }) {
  return (
    <div style={{ padding: 15, borderRadius: 16, background: '#070b12', border: '1px solid rgba(255,255,255,0.06)', display: 'grid', gap: 6 }}>
      <div style={{ color: '#7f8898', fontSize: 12, display: 'flex', alignItems: 'center', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
        {info ? <InfoHint text={info} /> : null}
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.04em' }}>{value}</div>
      {hint ? <div style={{ color: '#7f8898', fontSize: 12, lineHeight: 1.5 }}>{hint}</div> : null}
    </div>
  );
}

export function Badge({ children, tone = 'default' }: PropsWithChildren<{ tone?: 'default' | 'high' | 'medium' | 'low' }>) {
  const tones = {
    default: { background: 'rgba(111,191,255,.12)', color: '#9ccfff' },
    high: { background: 'rgba(255,107,107,.16)', color: '#ffb3b3' },
    medium: { background: 'rgba(255,196,82,.16)', color: '#ffd989' },
    low: { background: 'rgba(126,245,199,.14)', color: '#9ff0cf' }
  } as const;

  return <span style={{ display: 'inline-flex', alignItems: 'center', padding: '7px 11px', borderRadius: 999, background: tones[tone].background, color: tones[tone].color, fontSize: 12, fontWeight: 700, letterSpacing: '0.02em', border: '1px solid rgba(255,255,255,0.05)' }}>{children}</span>;
}

export function InfoHint({ text }: { text: string }) {
  return (
    <span className="info-hint" style={hintWrapperStyle} title={text}>
      <span style={hintIconStyle}>?</span>
      <span className="info-hint-tooltip" style={hintTooltipStyle}>{text}</span>
    </span>
  );
}

const hintWrapperStyle = {
  position: 'relative',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 16,
  height: 16,
  marginLeft: 6
} as const;

const hintIconStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: 14,
  height: 14,
  borderRadius: 999,
  border: '1px solid rgba(255,255,255,0.14)',
  background: 'rgba(255,255,255,0.03)',
  color: '#8e98ab',
  fontSize: 9,
  fontWeight: 700,
  lineHeight: 1,
  cursor: 'help'
} as const;

const hintTooltipStyle = {
  position: 'absolute',
  bottom: 'calc(100% + 10px)',
  left: '50%',
  transform: 'translateX(-50%)',
  minWidth: 220,
  maxWidth: 280,
  padding: '9px 11px',
  borderRadius: 12,
  background: 'rgba(8, 12, 20, 0.98)',
  border: '1px solid rgba(255,255,255,0.08)',
  color: '#dce6f5',
  fontSize: 12,
  lineHeight: 1.5,
  boxShadow: '0 18px 40px rgba(0,0,0,0.35)',
  opacity: 0,
  pointerEvents: 'none',
  zIndex: 20,
  transition: 'opacity 120ms ease, transform 120ms ease'
} as const;
