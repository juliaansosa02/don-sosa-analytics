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
        padding: '14px 16px 14px',
        borderRadius: 18,
        background: 'rgba(9, 14, 22, 0.86)',
        border: `1px solid ${palette.primary}33`
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: '114px minmax(0, 1fr)', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <RankEmblem tier={anchorQueue.tier} label={anchorQueue.label} size={118} />
          </div>
          <div style={{ display: 'grid', gap: 6, minWidth: 0 }}>
            <div style={{ color: '#8d97aa', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{locale === 'en' ? 'Competitive rank' : 'Rango competitivo'}</div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
              <span style={{ fontSize: 19, fontWeight: 800, color: '#edf2ff', letterSpacing: '-0.02em' }}>{soloText}</span>
              {rank.soloQueue.tier !== 'UNRANKED' ? <span style={{ color: palette.glow, fontSize: 13, fontWeight: 800 }}>{`${rank.soloQueue.leaguePoints} LP`}</span> : null}
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
      borderRadius: 16,
      background: compact ? 'rgba(9, 14, 22, 0.86)' : 'linear-gradient(180deg, rgba(10,14,22,0.96), rgba(19,24,37,0.92))',
      border: `1px solid ${palette.primary}33`
    }}>
      <div style={{ display: 'grid', gridTemplateColumns: '112px minmax(0, 1fr)', alignItems: 'center', gap: 12 }}>
        <RankEmblem tier={anchorQueue.tier} label={anchorQueue.label} size={112} />
        <div style={{ display: 'grid', gap: 6, minWidth: 0 }}>
          <div style={{ color: '#8d97aa', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{locale === 'en' ? 'Competitive rank' : 'Rango competitivo'}</div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
            <span style={{ fontSize: 20, fontWeight: 800, color: '#edf2ff', letterSpacing: '-0.02em' }}>{soloText}</span>
            {rank.soloQueue.tier !== 'UNRANKED' ? <span style={{ color: palette.glow, fontSize: 13, fontWeight: 800 }}>{`${rank.soloQueue.leaguePoints} LP`}</span> : null}
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
  const emblemHeight = usesOfficialEmblem ? Math.round(size * 0.82) : size;
  const assetSize = Math.round(size * (usesOfficialEmblem ? 1.18 : 1.82));

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
        paddingBottom: usesOfficialEmblem ? Math.round(size * 0.02) : 0,
        background: usesOfficialEmblem
          ? `radial-gradient(circle at 50% 64%, ${palette.primary}22 0%, rgba(255,255,255,0.08) 22%, rgba(255,255,255,0.03) 42%, rgba(255,255,255,0) 78%)`
          : 'radial-gradient(circle at 50% 52%, rgba(255,255,255,0.08), rgba(255,255,255,0) 72%)',
        filter: `drop-shadow(0 18px 34px ${palette.primary}2e)`
      }}
    >
      {usesOfficialEmblem ? (
        <div
          aria-hidden="true"
          style={{
            width: '100%',
            height: '100%',
            backgroundImage: `url(${emblem})`,
            backgroundRepeat: 'no-repeat',
            backgroundPosition: tuning.position,
            backgroundSize: tuning.scale,
            transform: tuning.transform
          }}
        />
      ) : (
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
            maxWidth: 'none'
          }}
        />
      )}
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

const rankEmblemTuning: Record<string, { scale: string; position: string; transform: string }> = {
  DEFAULT: { scale: '176%', position: '50% 56%', transform: 'translateY(0px)' },
  IRON: { scale: '162%', position: '50% 56%', transform: 'translateY(0px)' },
  BRONZE: { scale: '166%', position: '50% 56%', transform: 'translateY(0px)' },
  SILVER: { scale: '166%', position: '50% 56%', transform: 'translateY(0px)' },
  GOLD: { scale: '170%', position: '50% 57%', transform: 'translateY(0px)' },
  PLATINUM: { scale: '182%', position: '50% 59%', transform: 'translateY(1px)' },
  EMERALD: { scale: '180%', position: '50% 58%', transform: 'translateY(0px)' },
  DIAMOND: { scale: '176%', position: '50% 57%', transform: 'translateY(0px)' },
  MASTER: { scale: '170%', position: '50% 56%', transform: 'translateY(0px)' },
  GRANDMASTER: { scale: '170%', position: '50% 55%', transform: 'translateY(-1px)' },
  CHALLENGER: { scale: '170%', position: '50% 54%', transform: 'translateY(-1px)' },
  UNRANKED: { scale: '100%', position: '50% 50%', transform: 'translateY(0px)' }
};
