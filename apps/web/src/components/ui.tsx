import type { CSSProperties, PropsWithChildren, ReactNode } from 'react';
import { formatChampionName, getChampionIconUrl } from '../lib/lol';

export type TrendDirection = 'up' | 'down' | 'steady';
export type TrendTone = 'positive' | 'negative' | 'neutral';

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

export function KPI({
  label,
  value,
  hint,
  info,
  trend
}: {
  label: string;
  value: string;
  hint?: string;
  info?: string;
  trend?: {
    direction: TrendDirection;
    tone: TrendTone;
    label?: string;
  };
}) {
  return (
    <div style={{ padding: 15, borderRadius: 16, background: '#070b12', border: '1px solid rgba(255,255,255,0.06)', display: 'grid', gap: 6 }}>
      <div style={{ color: '#7f8898', fontSize: 12, display: 'flex', alignItems: 'center', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
        {label}
        {info ? <InfoHint text={info} /> : null}
      </div>
      <div style={{ fontSize: 28, fontWeight: 800, letterSpacing: '-0.04em' }}>{value}</div>
      {hint || trend ? (
        <div style={{ color: '#7f8898', fontSize: 12, lineHeight: 1.5, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          {hint ? <span>{hint}</span> : null}
          {trend ? <TrendIndicator direction={trend.direction} tone={trend.tone} label={trend.label} /> : null}
        </div>
      ) : null}
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

  return <span style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '7px 11px', borderRadius: 999, background: tones[tone].background, color: tones[tone].color, fontSize: 12, fontWeight: 700, letterSpacing: '0.02em', lineHeight: 1.1, textAlign: 'center', border: '1px solid rgba(255,255,255,0.05)' }}>{children}</span>;
}

export function ChampionAvatar({
  championName,
  version,
  size = 44,
  radius = 14
}: {
  championName: string;
  version?: string;
  size?: number;
  radius?: number;
}) {
  const iconUrl = getChampionIconUrl(championName, version);
  const displayName = formatChampionName(championName);

  if (!iconUrl) {
    return (
      <div
        aria-hidden="true"
        style={{
          ...championAvatarShellStyle,
          width: size,
          height: size,
          borderRadius: radius
        }}
      >
        <span style={{ fontSize: Math.max(12, size * 0.28), fontWeight: 800, color: '#edf2ff' }}>
          {displayName.slice(0, 2).toUpperCase()}
        </span>
      </div>
    );
  }

  return (
    <div style={{ ...championAvatarShellStyle, width: size, height: size, borderRadius: radius }}>
      <img
        src={iconUrl}
        alt={displayName}
        width={size}
        height={size}
        style={{ display: 'block', width: size, height: size, borderRadius: radius, objectFit: 'cover' }}
      />
    </div>
  );
}

export function ChampionIdentity({
  championName,
  version,
  subtitle,
  meta,
  size = 46,
  align = 'start'
}: {
  championName: string;
  version?: string;
  subtitle?: string;
  meta?: ReactNode;
  size?: number;
  align?: CSSProperties['alignItems'];
}) {
  const displayName = formatChampionName(championName);

  return (
    <div style={{ display: 'grid', gridTemplateColumns: `${size}px minmax(0, 1fr)`, gap: 12, alignItems: align }}>
      <ChampionAvatar championName={championName} version={version} size={size} radius={Math.max(12, Math.round(size * 0.28))} />
      <div style={{ display: 'grid', gap: 3, minWidth: 0 }}>
        <div style={{ color: '#edf2ff', fontSize: size >= 52 ? 22 : 18, fontWeight: 800, lineHeight: 1.12 }}>
          {displayName}
        </div>
        {subtitle ? <div style={{ color: '#9aa5b7', lineHeight: 1.55 }}>{subtitle}</div> : null}
        {meta ? <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>{meta}</div> : null}
      </div>
    </div>
  );
}

export function InfoHint({ text }: { text: string }) {
  return (
    <span className="info-hint" style={hintWrapperStyle} title={text}>
      <span style={hintIconStyle}>?</span>
      <span className="info-hint-tooltip" style={hintTooltipStyle}>{text}</span>
    </span>
  );
}

export function TrendIndicator({
  direction,
  tone,
  label
}: {
  direction: TrendDirection;
  tone: TrendTone;
  label?: string;
}) {
  const color = tone === 'positive'
    ? '#7ef5c7'
    : tone === 'negative'
      ? '#ff8f8f'
      : '#8ea0bb';

  const markerStyle = direction === 'steady'
    ? {
        width: 8,
        height: 8,
        borderRadius: 2,
        background: color,
        transform: 'rotate(45deg)'
      }
    : direction === 'up'
      ? {
          width: 0,
          height: 0,
          borderLeft: '5px solid transparent',
          borderRight: '5px solid transparent',
          borderBottom: `8px solid ${color}`
        }
      : {
          width: 0,
          height: 0,
          borderLeft: '5px solid transparent',
          borderRight: '5px solid transparent',
          borderTop: `8px solid ${color}`
        };

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color, fontWeight: 700 }}>
      <span aria-hidden="true" style={markerStyle} />
      {label ? <span>{label}</span> : null}
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

const championAvatarShellStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  overflow: 'hidden',
  border: '1px solid rgba(255,255,255,0.08)',
  background: 'linear-gradient(180deg, rgba(17,22,33,0.96), rgba(7,11,18,0.98))',
  boxShadow: '0 14px 30px rgba(0,0,0,0.22)'
} as const;
