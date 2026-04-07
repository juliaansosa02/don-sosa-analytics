import type { CSSProperties } from 'react';
import type { Dataset } from '../../types';
import type { Locale } from '../../lib/i18n';
import { getRankEmblemDataUrl, getRankPalette } from '../../lib/lol';

export function RankBadge({ rank, compact = false, locale = 'es' }: { rank: NonNullable<Dataset['rank']>; compact?: boolean; locale?: Locale }) {
  const palette = getRankPalette(rank.highest.tier);
  const anchorQueue = rank.soloQueue.tier !== 'UNRANKED' ? rank.soloQueue : rank.highest;
  const lpProgress = Math.max(0, Math.min(anchorQueue.leaguePoints, 100));
  const showFlex = rank.flexQueue.tier !== 'UNRANKED';
  const soloText = rank.soloQueue.tier === 'UNRANKED' ? (locale === 'en' ? 'Unranked' : 'Sin rango') : rank.soloQueue.label;
  const title = `${locale === 'en' ? 'Solo/Duo' : 'Solo/Duo'}: ${soloText}${rank.soloQueue.tier !== 'UNRANKED' ? ` · ${rank.soloQueue.leaguePoints} LP` : ''} · ${rank.soloQueue.winRate}% WR${showFlex ? `\nFlex: ${rank.flexQueue.label} · ${rank.flexQueue.leaguePoints} LP · ${rank.flexQueue.winRate}% WR` : ''}`;
  const flexSummary = showFlex ? `${rank.flexQueue.label} · ${rank.flexQueue.leaguePoints} LP` : null;

  if (compact) {
    return (
      <div title={title} style={{
        display: 'grid',
        gap: 8,
        minWidth: 0,
        padding: '16px 18px 16px',
        borderRadius: 22,
        background: 'linear-gradient(180deg, rgba(8, 14, 22, 0.94), rgba(10, 17, 28, 0.9))',
        border: `1px solid ${palette.primary}30`,
        boxShadow: `0 22px 44px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.03), 0 0 28px ${palette.primary}1a`
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: '144px minmax(0, 1fr)', alignItems: 'center', gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <RankEmblem tier={anchorQueue.tier} label={anchorQueue.label} size={142} />
          </div>
          <div style={{ display: 'grid', gap: 6, minWidth: 0 }}>
            <div style={{ color: '#8d97aa', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{locale === 'en' ? 'Competitive rank' : 'Rango competitivo'}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 22, fontWeight: 900, color: '#edf2ff', letterSpacing: '-0.03em' }}>{soloText}</span>
              {rank.soloQueue.tier !== 'UNRANKED' ? <span style={{ color: palette.glow, fontSize: 15, fontWeight: 900 }}>{`${rank.soloQueue.leaguePoints} LP`}</span> : null}
            </div>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              <span style={rankQueueSummaryStyle}>{`${rank.soloQueue.winRate}% WR`}</span>
              {flexSummary ? <span style={rankQueueSummaryStyle}>{`Flex · ${flexSummary}`}</span> : null}
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
      borderRadius: 18,
      background: compact ? 'linear-gradient(180deg, rgba(8,14,22,0.94), rgba(10,17,28,0.9))' : 'linear-gradient(180deg, rgba(10,14,22,0.96), rgba(19,24,37,0.92))',
      border: `1px solid ${palette.primary}33`,
      boxShadow: `0 18px 36px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.03), 0 0 20px ${palette.primary}16`
    }}>
      <div style={{ display: 'grid', gridTemplateColumns: '126px minmax(0, 1fr)', alignItems: 'center', gap: 12 }}>
        <RankEmblem tier={anchorQueue.tier} label={anchorQueue.label} size={126} />
        <div style={{ display: 'grid', gap: 6, minWidth: 0 }}>
          <div style={{ color: '#8d97aa', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{locale === 'en' ? 'Competitive rank' : 'Rango competitivo'}</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 22, fontWeight: 900, color: '#edf2ff', letterSpacing: '-0.03em' }}>{soloText}</span>
            {rank.soloQueue.tier !== 'UNRANKED' ? <span style={{ color: palette.glow, fontSize: 14, fontWeight: 900 }}>{`${rank.soloQueue.leaguePoints} LP`}</span> : null}
          </div>
          <div style={{ display: 'grid', gap: 7 }}>
            <span style={rankQueueSummaryStyle}>{`${rank.soloQueue.winRate}% WR · Solo/Duo`}</span>
            {flexSummary ? <span style={rankQueueSummaryStyle}>{`Flex · ${flexSummary}`}</span> : null}
          </div>
        </div>
      </div>
      <div style={{ height: 5, borderRadius: 999, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
        <div style={{ width: `${lpProgress}%`, height: '100%', borderRadius: 999, background: `linear-gradient(90deg, ${palette.primary}, ${palette.glow})` }} />
      </div>
    </div>
  );
}

export function RankEmblem({ tier, label, size }: { tier?: string; label: string; size: number }) {
  const emblem = getRankEmblemDataUrl(tier);
  const palette = getRankPalette(tier);
  const usesOfficialEmblem = Boolean(tier && tier !== 'UNRANKED');
  const tuning = rankEmblemTuning[tier ?? 'UNRANKED'] ?? rankEmblemTuning.DEFAULT;
  const assetSize = Math.round(size * (usesOfficialEmblem ? tuning.assetScale : 1.76));

  return (
    <div
      aria-hidden="true"
      style={{
        width: size,
        height: size,
        display: 'inline-flex',
        alignItems: usesOfficialEmblem ? 'end' : 'center',
        justifyContent: 'center',
        position: 'relative',
        flexShrink: 0,
        overflow: 'visible',
        paddingBottom: usesOfficialEmblem ? Math.round(size * 0.01) : 0,
        background: usesOfficialEmblem
          ? `radial-gradient(circle at 50% 66%, ${palette.primary}26 0%, rgba(255,255,255,0.08) 24%, rgba(255,255,255,0.03) 44%, rgba(255,255,255,0) 80%)`
          : 'radial-gradient(circle at 50% 52%, rgba(255,255,255,0.08), rgba(255,255,255,0) 72%)',
        filter: `drop-shadow(0 22px 38px ${palette.primary}36)`
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
          maxWidth: 'none',
          transform: usesOfficialEmblem ? `translateY(${tuning.translateY}px)` : 'translateY(0px)'
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

const rankQueueSummaryStyle: CSSProperties = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 4,
  padding: '5px 8px',
  borderRadius: 999,
  background: 'rgba(255,255,255,0.04)',
  border: '1px solid rgba(255,255,255,0.05)',
  color: '#aeb8ca',
  fontSize: 12,
  lineHeight: 1.35,
  minWidth: 0
};

const rankEmblemTuning: Record<string, { assetScale: number; translateY: number }> = {
  DEFAULT: { assetScale: 1.4, translateY: 4 },
  IRON: { assetScale: 1.34, translateY: 3 },
  BRONZE: { assetScale: 1.36, translateY: 3 },
  SILVER: { assetScale: 1.36, translateY: 3 },
  GOLD: { assetScale: 1.38, translateY: 4 },
  PLATINUM: { assetScale: 1.48, translateY: 5 },
  EMERALD: { assetScale: 1.46, translateY: 5 },
  DIAMOND: { assetScale: 1.42, translateY: 4 },
  MASTER: { assetScale: 1.38, translateY: 3 },
  GRANDMASTER: { assetScale: 1.38, translateY: 2 },
  CHALLENGER: { assetScale: 1.38, translateY: 1 },
  UNRANKED: { assetScale: 1, translateY: 0 }
};
