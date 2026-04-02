import type { CSSProperties } from 'react';
import type { Dataset } from '../../types';
import type { Locale } from '../../lib/i18n';
import { getRankEmblemDataUrl, getRankPalette } from '../../lib/lol';

export function RankBadge({ rank, compact = false, locale = 'es' }: { rank: NonNullable<Dataset['rank']>; compact?: boolean; locale?: Locale }) {
  const palette = getRankPalette(rank.highest.tier);
  const lpProgress = Math.max(0, Math.min(rank.highest.leaguePoints, 100));
  const showFlex = rank.flexQueue.tier !== 'UNRANKED';
  const soloSummary = `${locale === 'en' ? 'Solo/Duo' : 'Solo/Duo'} · ${rank.soloQueue.leaguePoints} LP · ${rank.soloQueue.winRate}% WR`;
  const flexSummary = showFlex
    ? `${locale === 'en' ? 'Flex' : 'Flex'} · ${rank.flexQueue.label} · ${rank.flexQueue.leaguePoints} LP · ${rank.flexQueue.winRate}% WR`
    : null;
  const title = `${locale === 'en' ? 'Solo/Duo' : 'Solo/Duo'}: ${rank.soloQueue.label} · ${rank.soloQueue.leaguePoints} LP · ${rank.soloQueue.winRate}% WR${showFlex ? `\nFlex: ${rank.flexQueue.label} · ${rank.flexQueue.leaguePoints} LP · ${rank.flexQueue.winRate}% WR` : ''}`;

  if (compact) {
    return (
      <div title={title} style={{
        display: 'grid',
        gap: 10,
        minWidth: 0,
        padding: '12px 14px',
        borderRadius: 16,
        background: 'rgba(9, 14, 22, 0.86)',
        border: `1px solid ${palette.primary}33`
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: '80px minmax(0, 1fr)', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <RankEmblem tier={rank.highest.tier} label={rank.highest.label} size={80} />
          </div>
          <div style={{ display: 'grid', gap: 4, minWidth: 0 }}>
            <div style={{ color: '#8d97aa', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{locale === 'en' ? 'Current rank' : 'Rango actual'}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 17, fontWeight: 800, color: '#edf2ff', letterSpacing: '-0.02em' }}>{rank.highest.label}</span>
              <span style={{ color: palette.glow, fontSize: 13, fontWeight: 800 }}>{`${rank.highest.leaguePoints} LP`}</span>
            </div>
            <div style={{ display: 'grid', gap: 5 }}>
              <span style={rankQueuePillStyle}>{soloSummary}</span>
              {flexSummary ? <span style={rankQueuePillStyle}>{flexSummary}</span> : null}
            </div>
          </div>
        </div>
        <div style={{ height: 5, borderRadius: 999, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
          <div style={{ width: `${lpProgress}%`, height: '100%', borderRadius: 999, background: `linear-gradient(90deg, ${palette.primary}, ${palette.glow})` }} />
        </div>
      </div>
    );
  }

  return (
    <div title={title} style={{
      display: 'grid',
      gap: compact ? 8 : 10,
      minWidth: 0,
      padding: compact ? '12px 14px' : '16px 18px',
      borderRadius: 16,
      background: compact ? 'rgba(9, 14, 22, 0.86)' : 'linear-gradient(180deg, rgba(10,14,22,0.96), rgba(19,24,37,0.92))',
      border: `1px solid ${palette.primary}33`
    }}>
      <div style={{ display: 'grid', gridTemplateColumns: '104px minmax(0, 1fr)', alignItems: 'center', gap: 10 }}>
        <RankEmblem tier={rank.highest.tier} label={rank.highest.label} size={104} />
        <div style={{ display: 'grid', gap: 3, minWidth: 0 }}>
          <div style={{ color: '#8d97aa', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{locale === 'en' ? 'Current rank' : 'Rango actual'}</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 20, fontWeight: 800, color: '#edf2ff', letterSpacing: '-0.02em' }}>{rank.highest.label}</span>
            <span style={{ color: palette.glow, fontSize: 13, fontWeight: 800 }}>{`${rank.highest.leaguePoints} LP`}</span>
          </div>
          <div style={{ display: 'grid', gap: 5 }}>
            <span style={rankQueuePillStyle}>{soloSummary}</span>
            {flexSummary ? <span style={rankQueuePillStyle}>{flexSummary}</span> : null}
          </div>
        </div>
      </div>
      <div style={{ display: 'grid', gap: 5 }}>
        <div style={{ height: 5, borderRadius: 999, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
          <div style={{ width: `${lpProgress}%`, height: '100%', borderRadius: 999, background: `linear-gradient(90deg, ${palette.primary}, ${palette.glow})` }} />
        </div>
        <div style={{ color: '#7e889b', fontSize: 11 }}>
          {locale === 'en' ? 'Hover to view Solo/Duo and Flex' : 'Hover para ver Solo/Duo y Flex'}
        </div>
      </div>
    </div>
  );
}

export function RankEmblem({ tier, label, size }: { tier?: string; label: string; size: number }) {
  const emblem = getRankEmblemDataUrl(tier);
  const palette = getRankPalette(tier);
  const assetSize = Math.round(size * 5.2);

  return (
    <div
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        overflow: 'hidden',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        filter: `drop-shadow(0 16px 32px ${palette.primary}24)`
      }}
    >
      <img
        src={emblem}
        alt={label}
        width={assetSize}
        height={assetSize}
        style={{
          display: 'block',
          width: assetSize,
          height: assetSize,
          objectFit: 'contain',
          transform: `translateY(${Math.round(size * 0.3)}px)`
        }}
      />
    </div>
  );
}

export function TrendSparkline({ matches, locale = 'es' }: { matches: Dataset['matches']; locale?: Locale }) {
  const sorted = [...matches].sort((a, b) => a.gameCreation - b.gameCreation).slice(-12);
  const values = sorted.map((match) => match.score.total);
  const min = Math.min(...values, 0);
  const max = Math.max(...values, 100);
  const points = values.map((value, index) => {
    const x = values.length === 1 ? 0 : (index / Math.max(values.length - 1, 1)) * 100;
    const y = 100 - (((value - min) / Math.max(max - min, 1)) * 100);
    return `${x},${y}`;
  }).join(' ');

  return (
    <div style={sparklineCardStyle}>
      <div style={{ color: '#7d889c', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{locale === 'en' ? 'Latest matches' : 'Últimas partidas'}</div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'end', gap: 12 }}>
        <div style={{ display: 'grid', gap: 4 }}>
          <div style={{ fontSize: 18, fontWeight: 800 }}>{locale === 'en' ? 'Recent performance' : 'Performance reciente'}</div>
          <div style={{ color: '#8895aa', fontSize: 12 }}>{locale === 'en' ? 'Sparkline from the last 12 valid matches' : 'Sparkline de las últimas 12 partidas válidas'}</div>
        </div>
        <div style={{ color: '#dff7eb', fontSize: 12, fontWeight: 700 }}>{values.length ? (locale === 'en' ? `${Math.round(values.at(-1) ?? 0)} latest score` : `${Math.round(values.at(-1) ?? 0)} último score`) : (locale === 'en' ? 'No data' : 'Sin datos')}</div>
      </div>
      <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: '100%', height: 84, display: 'block' }}>
        <defs>
          <linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="rgba(216,253,241,0.34)" />
            <stop offset="100%" stopColor="rgba(216,253,241,0)" />
          </linearGradient>
        </defs>
        <polyline fill="none" stroke="rgba(216,253,241,0.95)" strokeWidth="3" points={points} />
      </svg>
    </div>
  );
}

const sparklineCardStyle: CSSProperties = {
  gridColumn: '1 / -1',
  display: 'grid',
  gap: 10,
  padding: '14px 15px',
  borderRadius: 16,
  background: '#060a10',
  border: '1px solid rgba(255,255,255,0.06)'
};

const rankQueuePillStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  padding: '5px 8px',
  borderRadius: 999,
  background: 'rgba(255,255,255,0.04)',
  color: '#aeb8ca',
  fontSize: 11,
  lineHeight: 1.2,
  border: '1px solid rgba(255,255,255,0.05)'
};
