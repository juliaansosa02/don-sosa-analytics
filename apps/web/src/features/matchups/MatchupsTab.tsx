import { Card, Badge, InfoHint, TrendIndicator } from '../../components/ui';
import type { Dataset } from '../../types';
import { useMemo, useState } from 'react';
import { formatChampionName, getChampionIconUrl, getRoleLabel } from '../../lib/lol';
import { formatDecimal, formatInteger, formatPercent, formatSignedNumber } from '../../lib/format';
import type { Locale } from '../../lib/i18n';
import { translateRole } from '../../lib/i18n';
function average(values: number[]) {
  return values.length ? values.reduce((total, value) => total + value, 0) / values.length : 0;
}

function getMatchupSurface(winRate: number) {
  if (winRate >= 55) {
    return {
      background: 'linear-gradient(180deg, rgba(11,28,21,0.98), rgba(7,14,12,0.99))',
      border: 'rgba(102, 214, 155, 0.22)',
      glow: 'rgba(102, 214, 155, 0.08)'
    };
  }

  if (winRate < 45) {
    return {
      background: 'linear-gradient(180deg, rgba(31,16,18,0.98), rgba(15,9,10,0.99))',
      border: 'rgba(239, 120, 120, 0.22)',
      glow: 'rgba(239, 120, 120, 0.08)'
    };
  }

  return {
    background: 'linear-gradient(180deg, rgba(10,14,22,0.98), rgba(7,11,18,0.99))',
    border: 'rgba(255,255,255,0.06)',
    glow: 'rgba(149, 166, 197, 0.06)'
  };
}

function matchupDiffLabel(value: number, unit: string, locale: Locale) {
  if (value > 0) return locale === 'en' ? `${formatSignedNumber(value, unit === 'lvl' ? 1 : 0)} ahead` : `${formatSignedNumber(value, unit === 'lvl' ? 1 : 0)} a favor`;
  if (value < 0) return locale === 'en' ? `${formatSignedNumber(value, unit === 'lvl' ? 1 : 0)} behind` : `${formatSignedNumber(value, unit === 'lvl' ? 1 : 0)} en contra`;
  return locale === 'en' ? (unit === 'lvl' ? '0.0 even' : '0 even') : (unit === 'lvl' ? '0,0 parejo' : '0 parejo');
}

function aggregateMatchups(dataset: Dataset) {
  const grouped = new Map<string, {
    opponent: string;
    roles: Map<string, number>;
    games: number;
    wins: number;
    performance: number;
    avgCsAt15: number;
    avgDeathsPre14: number;
    avgGoldDiffAt15: number;
    avgLevelDiffAt15: number;
  }>();

  for (const match of dataset.matches) {
    const opponent = match.opponentChampionName ?? 'Unknown';
    const key = opponent;
    const current = grouped.get(key) ?? {
      opponent,
      roles: new Map<string, number>(),
      games: 0,
      wins: 0,
      performance: 0,
      avgCsAt15: 0,
      avgDeathsPre14: 0,
      avgGoldDiffAt15: 0,
      avgLevelDiffAt15: 0
    };

    current.games += 1;
    current.wins += match.win ? 1 : 0;
    current.performance += match.score.total;
    current.avgCsAt15 += match.timeline.csAt15;
    current.avgDeathsPre14 += match.timeline.deathsPre14;
    current.avgGoldDiffAt15 += match.timeline.goldDiffAt15 ?? 0;
    current.avgLevelDiffAt15 += match.timeline.levelDiffAt15 ?? 0;
    const role = match.opponentRole ?? 'Unknown';
    current.roles.set(role, (current.roles.get(role) ?? 0) + 1);
    grouped.set(key, current);
  }

  return Array.from(grouped.values())
    .map((entry) => ({
      ...entry,
      role: Array.from(entry.roles.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'Unknown',
      winRate: Number(((entry.wins / Math.max(entry.games, 1)) * 100).toFixed(1)),
      performance: Number((entry.performance / entry.games).toFixed(1)),
      avgCsAt15: Number((entry.avgCsAt15 / entry.games).toFixed(1)),
      avgDeathsPre14: Number((entry.avgDeathsPre14 / entry.games).toFixed(1)),
      avgGoldDiffAt15: Number((entry.avgGoldDiffAt15 / entry.games).toFixed(0)),
      avgLevelDiffAt15: Number((entry.avgLevelDiffAt15 / entry.games).toFixed(1))
    }))
    .sort((a, b) => b.games - a.games || b.winRate - a.winRate);
}

function buildMatchupNarrative(matchup: ReturnType<typeof aggregateMatchups>[number], baseline: { winRate: number; avgDeathsPre14: number }, locale: Locale) {
  if (matchup.winRate < baseline.winRate - 8 && matchup.avgDeathsPre14 > baseline.avgDeathsPre14 + 0.4) {
    return locale === 'en'
      ? 'This matchup is punishing your early stability first. Review the first bad trade, route or recall before reviewing the last fight.'
      : 'Este cruce te está castigando primero en estabilidad temprana. Revisá el primer trade, ruta o recall malo antes de mirar la última pelea.';
  }

  if (matchup.avgGoldDiffAt15 <= -220) {
    return locale === 'en'
      ? 'By minute 15 you are usually already behind here, so the matchup prep should start from lane state and first reset, not from late-game theory.'
      : 'Al minuto 15 normalmente ya llegás por detrás acá, así que la preparación del cruce debería arrancar desde lane state y primer reset, no desde teoría de late.';
  }

  if (matchup.winRate >= baseline.winRate + 6 && matchup.avgGoldDiffAt15 >= 0) {
    return locale === 'en'
      ? 'This is already a playable or favorable cross. It works best as a mirror matchup to compare your dirtier losses against.'
      : 'Este ya es un cruce jugable o favorable. Sirve muy bien como matchup espejo para comparar contra derrotas más sucias.';
  }

  return locale === 'en'
    ? 'This matchup is still mixed. The useful question is whether it breaks through lane, reset timing or map connection once the lane ends.'
    : 'Este matchup sigue mixto. La pregunta útil es si se rompe por línea, timing de reset o conexión al mapa una vez termina la lane.';
}

export function MatchupsTab({ dataset, locale = 'es' }: { dataset: Dataset; locale?: Locale }) {
  const championOptions = useMemo(() => ['ALL', ...Array.from(new Set(dataset.matches.map((match) => match.championName))).sort()], [dataset.matches]);
  const [championFilter, setChampionFilter] = useState('ALL');
  const [sortKey, setSortKey] = useState<'games' | 'winRate' | 'avgGoldDiffAt15' | 'avgLevelDiffAt15' | 'performance'>('games');

  const filteredDataset = useMemo(() => {
    if (championFilter === 'ALL') return dataset;
    return {
      ...dataset,
      matches: dataset.matches.filter((match) => match.championName === championFilter)
    };
  }, [championFilter, dataset]);
  const filteredBaseline = useMemo(() => {
    const matches = filteredDataset.matches;
    if (!matches.length) {
      return {
        winRate: dataset.summary.winRate,
        avgDeathsPre14: dataset.summary.avgDeathsPre14
      };
    }

    return {
      winRate: Number((((matches.filter((match) => match.win).length / Math.max(matches.length, 1)) * 100)).toFixed(1)),
      avgDeathsPre14: Number(average(matches.map((match) => match.timeline.deathsPre14)).toFixed(1))
    };
  }, [filteredDataset.matches, dataset.summary.winRate, dataset.summary.avgDeathsPre14]);

  const matchups = useMemo(() => {
    const entries = aggregateMatchups(filteredDataset);
    return entries.sort((a, b) => (b[sortKey] as number) - (a[sortKey] as number));
  }, [filteredDataset, sortKey]);

  return (
    <Card title="Matchups" subtitle={locale === 'en' ? 'Direct-opponent view with a clearer, more comparative presentation' : 'Lectura por rival directo con una presentación más clara y comparativa'}>
      <div style={{ display: 'grid', gap: 14 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ color: '#8a95a8', fontSize: 13 }}>
            {championFilter === 'ALL'
              ? (locale === 'en' ? 'You are looking at all of your picks mixed together.' : 'Estás viendo todos tus picks mezclados.')
              : (locale === 'en' ? `You are looking only at matchups when you play ${formatChampionName(championFilter)}.` : `Estás viendo solo matchups cuando jugás ${formatChampionName(championFilter)}.`)}
          </div>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <select value={championFilter} onChange={(event) => setChampionFilter(event.target.value)} style={filterSelectStyle}>
              {championOptions.map((champion) => (
                <option key={champion} value={champion}>
                  {champion === 'ALL' ? (locale === 'en' ? 'All your champions' : 'Todos tus campeones') : formatChampionName(champion)}
                </option>
              ))}
            </select>
            <select value={sortKey} onChange={(event) => setSortKey(event.target.value as typeof sortKey)} style={filterSelectStyle}>
              <option value="games">{locale === 'en' ? 'Most games' : 'Más partidas'}</option>
              <option value="winRate">{locale === 'en' ? 'Highest win rate' : 'Mayor win rate'}</option>
              <option value="performance">{locale === 'en' ? 'Highest performance' : 'Mayor performance'}</option>
              <option value="avgGoldDiffAt15">{locale === 'en' ? 'Highest gold diff' : 'Mayor diff. de oro'}</option>
              <option value="avgLevelDiffAt15">{locale === 'en' ? 'Highest level diff' : 'Mayor diff. de nivel'}</option>
            </select>
          </div>
        </div>
        {matchups.length ? matchups.map((matchup) => {
          const iconUrl = getChampionIconUrl(matchup.opponent, dataset.ddragonVersion);
          const surface = getMatchupSurface(matchup.winRate);
          const narrative = buildMatchupNarrative(matchup, filteredBaseline, locale);

          return (
            <div
              key={`${matchup.opponent}-${matchup.role}`}
              style={{
                ...matchupCardStyle,
                background: surface.background,
                border: `1px solid ${surface.border}`,
                boxShadow: `0 16px 34px rgba(0,0,0,0.14), 0 0 18px ${surface.glow}`
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', alignItems: 'start' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  {iconUrl ? <img src={iconUrl} alt={formatChampionName(matchup.opponent)} width={52} height={52} style={iconStyle} /> : null}
                  <div style={{ display: 'grid', gap: 6 }}>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>{formatChampionName(matchup.opponent)}</div>
                    <div style={{ color: '#7d8696', fontSize: 13 }}>{locale === 'en' ? translateRole(matchup.role, 'en') : getRoleLabel(matchup.role)}</div>
                  </div>
                </div>

                <Badge tone={matchup.winRate >= 55 ? 'low' : matchup.winRate < 45 ? 'high' : 'medium'}>
                  {matchup.winRate >= 55 ? (locale === 'en' ? 'FAVORABLE' : 'FAVORABLE') : matchup.winRate < 45 ? (locale === 'en' ? 'TOUGH' : 'COMPLICADO') : (locale === 'en' ? 'EVEN' : 'PAREJO')}
                </Badge>
              </div>

              <div style={{ color: '#d7e1f0', lineHeight: 1.7, fontSize: 14 }}>{narrative}</div>

              <div className="seven-col-grid" style={metricGridStyle}>
                <MetricBlock label={locale === 'en' ? 'Games' : 'Partidas'} value={formatInteger(matchup.games)} info={locale === 'en' ? 'How many times you faced this champion inside the current sample.' : 'Cantidad de veces que enfrentaste a este campeón en la muestra actual.'} />
                <MetricBlock label="Win rate" value={formatPercent(matchup.winRate)} info={locale === 'en' ? 'Your win rate against this opponent.' : 'Tu porcentaje de victorias contra este rival.'} trend={{ direction: matchup.winRate > filteredBaseline.winRate ? 'up' : matchup.winRate < filteredBaseline.winRate ? 'down' : 'steady', tone: matchup.winRate > filteredBaseline.winRate ? 'positive' : matchup.winRate < filteredBaseline.winRate ? 'negative' : 'neutral' }} />
                <MetricBlock label="Performance" value={formatDecimal(matchup.performance)} info={locale === 'en' ? 'Average internal execution score against this matchup.' : 'Promedio del índice interno de ejecución contra este matchup.'} />
                <MetricBlock label={locale === 'en' ? 'CS at 15' : 'CS a los 15'} value={formatDecimal(matchup.avgCsAt15)} info={locale === 'en' ? 'Your average economy at minute 15 against this opponent.' : 'Tu economía media a los 15 contra este rival.'} />
                <MetricBlock label={locale === 'en' ? 'Gold vs opponent' : 'Oro vs rival'} value={matchupDiffLabel(matchup.avgGoldDiffAt15, 'gold', locale)} info={locale === 'en' ? "If the value ends in 'ahead', you reach minute 15 with an average gold lead. If it ends in 'behind', you are behind your direct lane or role opponent." : "Si el valor termina 'a favor', llegás con ventaja media de oro al 15. Si termina 'en contra', llegás por detrás frente al rival directo."} trend={{ direction: matchup.avgGoldDiffAt15 > 0 ? 'up' : matchup.avgGoldDiffAt15 < 0 ? 'down' : 'steady', tone: matchup.avgGoldDiffAt15 > 0 ? 'positive' : matchup.avgGoldDiffAt15 < 0 ? 'negative' : 'neutral' }} />
                <MetricBlock label={locale === 'en' ? 'Level vs opponent' : 'Nivel vs rival'} value={matchupDiffLabel(matchup.avgLevelDiffAt15, 'lvl', locale)} info={locale === 'en' ? "If the value ends in 'ahead', your average level at 15 is above the opponent. If it ends in 'behind', you are trailing in experience." : "Si el valor termina 'a favor', tu nivel medio al 15 está por encima del rival. Si termina 'en contra', llegás con desventaja de experiencia."} trend={{ direction: matchup.avgLevelDiffAt15 > 0 ? 'up' : matchup.avgLevelDiffAt15 < 0 ? 'down' : 'steady', tone: matchup.avgLevelDiffAt15 > 0 ? 'positive' : matchup.avgLevelDiffAt15 < 0 ? 'negative' : 'neutral' }} />
                <MetricBlock label={locale === 'en' ? 'Deaths pre 14' : 'Muertes pre 14'} value={formatDecimal(matchup.avgDeathsPre14)} info={locale === 'en' ? 'How often these matchups punish you early, on average.' : 'Cuántas veces te castigan temprano, en promedio, estos cruces.'} trend={{ direction: matchup.avgDeathsPre14 < filteredBaseline.avgDeathsPre14 ? 'down' : matchup.avgDeathsPre14 > filteredBaseline.avgDeathsPre14 ? 'up' : 'steady', tone: matchup.avgDeathsPre14 < filteredBaseline.avgDeathsPre14 ? 'positive' : matchup.avgDeathsPre14 > filteredBaseline.avgDeathsPre14 ? 'negative' : 'neutral' }} />
              </div>
            </div>
          );
        }) : (
          <div style={emptyStateStyle}>
            {locale === 'en'
              ? 'There are no direct-opponent samples inside this filter yet.'
              : 'Todavía no hay muestra de rivales directos dentro de este filtro.'}
          </div>
        )}
      </div>
    </Card>
  );
}

function MetricBlock({
  label,
  value,
  info,
  trend
}: {
  label: string;
  value: string;
  info: string;
  trend?: {
    direction: 'up' | 'down' | 'steady';
    tone: 'positive' | 'negative' | 'neutral';
  };
}) {
  return (
    <div style={metricBlockStyle}>
      <div style={{ ...metricLabelStyle, display: 'flex', alignItems: 'center' }}>
        {label}
        <InfoHint text={info} />
      </div>
      <div style={metricValueStyle}>{value}</div>
      {trend ? <TrendIndicator direction={trend.direction} tone={trend.tone} /> : null}
    </div>
  );
}

const matchupCardStyle = {
  display: 'grid',
  gap: 16,
  padding: 18,
  borderRadius: 16,
  background: '#060a10',
  border: '1px solid rgba(255,255,255,0.06)'
} as const;

const metricGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
  gap: 12
} as const;

const metricBlockStyle = {
  padding: '12px 10px',
  borderRadius: 12,
  background: '#090e16',
  border: '1px solid rgba(255,255,255,0.04)'
} as const;

const metricLabelStyle = {
  color: '#758091',
  fontSize: 12,
  marginBottom: 8
} as const;

const metricValueStyle = {
  color: '#f4f7fb',
  fontSize: 20,
  fontWeight: 700
} as const;

const iconStyle = {
  borderRadius: 14,
  border: '1px solid rgba(255,255,255,0.08)'
} as const;

const filterSelectStyle = {
  minWidth: 220,
  padding: '11px 12px',
  borderRadius: 12,
  border: '1px solid rgba(255,255,255,0.08)',
  background: '#070b12',
  color: '#edf2ff'
} as const;

const emptyStateStyle = {
  padding: '16px 18px',
  borderRadius: 14,
  background: '#090e16',
  border: '1px solid rgba(255,255,255,0.05)',
  color: '#c7d4ea',
  lineHeight: 1.65
} as const;
