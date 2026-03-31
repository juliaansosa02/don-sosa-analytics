import { Card, Badge } from '../../components/ui';
import type { Dataset } from '../../types';
import { getChampionIconUrl, getRuneIconUrl } from '../../lib/lol';
import { formatDecimal, formatInteger, formatPercent } from '../../lib/format';
import type { Locale } from '../../lib/i18n';

function aggregateRunes(dataset: Dataset) {
  const grouped = new Map<string, {
    name: string;
    icon?: string;
    games: number;
    wins: number;
    damage: number;
    healing: number;
    shielding: number;
    performance: number;
    champions: Map<string, { games: number; wins: number }>;
  }>();

  for (const match of dataset.matches) {
    const keystone = match.primaryRunes[0]?.name ?? 'Unknown keystone';
    const current = grouped.get(keystone) ?? {
      name: keystone,
      icon: match.primaryRunes[0]?.icon,
      games: 0,
      wins: 0,
      damage: 0,
      healing: 0,
      shielding: 0,
      performance: 0,
      champions: new Map()
    };

    current.games += 1;
    current.wins += match.win ? 1 : 0;
    current.damage += match.runeStats.totalDamageFromRunes;
    current.healing += match.runeStats.totalHealingFromRunes;
    current.shielding += match.runeStats.totalShieldingFromRunes;
    current.performance += match.score.total;

    const championUsage = current.champions.get(match.championName) ?? { games: 0, wins: 0 };
    championUsage.games += 1;
    championUsage.wins += match.win ? 1 : 0;
    current.champions.set(match.championName, championUsage);

    grouped.set(keystone, current);
  }

  return Array.from(grouped.values())
    .map((entry) => ({
      ...entry,
      winRate: Number(((entry.wins / Math.max(entry.games, 1)) * 100).toFixed(1)),
      avgDamage: Number((entry.damage / entry.games).toFixed(0)),
      avgHealing: Number((entry.healing / entry.games).toFixed(0)),
      avgShielding: Number((entry.shielding / entry.games).toFixed(0)),
      avgPerformance: Number((entry.performance / entry.games).toFixed(1)),
      champions: Array.from(entry.champions.entries())
        .map(([championName, usage]) => ({
          championName,
          games: usage.games,
          winRate: Number(((usage.wins / Math.max(usage.games, 1)) * 100).toFixed(1))
        }))
        .sort((a, b) => b.games - a.games || b.winRate - a.winRate)
        .slice(0, 3)
    }))
    .sort((a, b) => b.games - a.games || b.winRate - a.winRate);
}

export function RunesTab({ dataset, locale = 'es' }: { dataset: Dataset; locale?: Locale }) {
  const runes = aggregateRunes(dataset);

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <Card title={locale === 'en' ? 'Runes' : 'Runas'} subtitle={locale === 'en' ? 'Each keystone is read together with the champions you are actually using it on' : 'Cada keystone se lee junto a los campeones con los que realmente la estás usando'}>
        <div style={{ display: 'grid', gap: 14 }}>
          {runes.map((rune) => {
            const iconUrl = getRuneIconUrl(rune.icon);

            return (
              <div key={rune.name} style={runeCardStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'start', flexWrap: 'wrap' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                    {iconUrl ? <img src={iconUrl} alt={rune.name} width={46} height={46} style={runeIconStyle} /> : null}
                    <div>
                      <div style={{ fontSize: 18, fontWeight: 700 }}>{rune.name}</div>
                      <div style={{ color: '#788291', fontSize: 13 }}>{locale === 'en' ? `${rune.games} analyzed matches` : `${rune.games} partidas analizadas`}</div>
                    </div>
                  </div>

                  <Badge tone={rune.winRate >= 55 ? 'low' : rune.winRate < 45 ? 'high' : 'medium'}>
                    {rune.winRate >= 55 ? (locale === 'en' ? 'Performing well' : 'Rindiendo bien') : rune.winRate < 45 ? (locale === 'en' ? 'Needs review' : 'Por revisar') : (locale === 'en' ? 'Even sample' : 'Muestra pareja')}
                  </Badge>
                </div>

                <div style={runeMetricsGridStyle}>
                  <MetricBlock label="Win rate" value={formatPercent(rune.winRate)} />
                  <MetricBlock label={locale === 'en' ? 'Average performance' : 'Performance media'} value={formatDecimal(rune.avgPerformance)} />
                  <MetricBlock label={locale === 'en' ? 'Average damage' : 'Daño medio'} value={formatInteger(rune.avgDamage)} />
                  <MetricBlock label={locale === 'en' ? 'Average healing' : 'Curación media'} value={formatInteger(rune.avgHealing)} />
                  <MetricBlock label={locale === 'en' ? 'Average shielding' : 'Escudo medio'} value={formatInteger(rune.avgShielding)} />
                </div>

                <div style={{ display: 'grid', gap: 10 }}>
                  <div style={sectionLabelStyle}>{locale === 'en' ? 'Champions you use it on the most' : 'Campeones con los que más la usás'}</div>
                  <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                    {rune.champions.map((champion) => {
                      const championIcon = getChampionIconUrl(champion.championName, dataset.ddragonVersion);

                      return (
                        <div key={champion.championName} style={championPillStyle}>
                          {championIcon ? <img src={championIcon} alt={champion.championName} width={28} height={28} style={championIconStyle} /> : null}
                          <div>
                            <div style={{ fontSize: 13, fontWeight: 700 }}>{champion.championName}</div>
                            <div style={{ color: '#7a8494', fontSize: 12 }}>
                              {locale === 'en' ? `${champion.games} matches · ${formatPercent(champion.winRate)}` : `${champion.games} partidas · ${formatPercent(champion.winRate)}`}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </Card>
      <p style={{ margin: 0, color: '#798395', fontSize: 13 }}>
        {locale === 'en'
          ? '"Average performance" is the average of your total match score when using that rune. It helps compare execution between setups; it is not an official Riot metric.'
          : '“Performance media” es el promedio del score total de tus partidas con esa runa. Sirve para comparar ejecución entre configuraciones, no es una métrica oficial de Riot.'}
      </p>
    </div>
  );
}

function MetricBlock({ label, value }: { label: string; value: string }) {
  return (
    <div style={metricBlockStyle}>
      <div style={metricLabelStyle}>{label}</div>
      <div style={metricValueStyle}>{value}</div>
    </div>
  );
}

const runeCardStyle = {
  display: 'grid',
  gap: 16,
  padding: 18,
  borderRadius: 16,
  background: '#060a10',
  border: '1px solid rgba(255,255,255,0.06)'
} as const;

const runeMetricsGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
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

const sectionLabelStyle = {
  color: '#7b8595',
  fontSize: 12,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.08em'
} as const;

const championPillStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: 10,
  padding: '10px 12px',
  borderRadius: 12,
  background: '#090e16',
  border: '1px solid rgba(255,255,255,0.05)'
} as const;

const runeIconStyle = {
  borderRadius: 12,
  border: '1px solid rgba(255,255,255,0.08)',
  background: '#0f141d'
} as const;

const championIconStyle = {
  borderRadius: 8,
  border: '1px solid rgba(255,255,255,0.08)'
} as const;
