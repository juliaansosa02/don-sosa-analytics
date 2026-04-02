import { Card, Badge, InfoHint } from '../../components/ui';
import type { Dataset } from '../../types';
import { formatChampionName, getChampionIconUrl } from '../../lib/lol';
import { formatDecimal, formatSignedNumber } from '../../lib/format';
import type { Locale } from '../../lib/i18n';

function buildQuickRead(match: Dataset['matches'][number], dataset: Dataset, locale: Locale) {
  const role = (match.role || dataset.summary.primaryRole || 'ALL').toUpperCase();
  const championName = formatChampionName(match.championName);
  const opponentName = match.opponentChampionName ? formatChampionName(match.opponentChampionName) : null;

  if (!match.win && match.timeline.objectiveFightDeaths > 0) {
    return locale === 'en'
      ? {
          title: 'Setup leak before the objective',
          body: `${championName}${opponentName ? ` into ${opponentName}` : ''} did not collapse only inside the fight. The real review point is the 45-60 seconds before the objective: reset, route and which lane actually had priority.`
        }
      : {
          title: 'La fuga está antes del objetivo',
          body: `${championName}${opponentName ? ` contra ${opponentName}` : ''} no se rompió solo dentro de la pelea. El review real está en los 45-60 segundos previos al objetivo: reset, ruta y qué línea tenía prioridad de verdad.`
        };
  }

  if (!match.win && match.timeline.deathsPre14 >= 2) {
    return locale === 'en'
      ? {
          title: 'Early stability broke the game first',
          body: `This is not just a bad final score. ${match.timeline.deathsPre14} deaths before minute 14 forced ${role === 'JUNGLE' ? 'your route and tempo' : 'your lane and map state'} into a much harder version of the game.`
        }
      : {
          title: 'El early se rompió primero',
          body: `No es solo un mal score final. Las ${formatDecimal(match.timeline.deathsPre14)} muertes antes del 14 empujaron ${role === 'JUNGLE' ? 'tu ruta y tu tempo' : 'tu línea y tu estado de mapa'} a una versión mucho más difícil de jugar.`
        };
  }

  if (!match.win && ((match.timeline.goldDiffAt15 ?? 0) <= -350 || (match.timeline.levelDiffAt15 ?? 0) <= -0.8)) {
    return locale === 'en'
      ? {
          title: 'You were already behind by minute 15',
          body: `${championName}${opponentName ? ` against ${opponentName}` : ''} reached minute 15 from a losing state. Review the first reset, detour or fight that made the economy floor impossible to hold.`
        }
      : {
          title: 'Ya llegabas atrás al minuto 15',
          body: `${championName}${opponentName ? ` contra ${opponentName}` : ''} llegó al 15 desde desventaja real. Revisá el primer reset, desvío o pelea que te hizo imposible sostener el piso económico.`
        };
  }

  if (match.win && match.score.total >= 82 && (match.timeline.goldDiffAt15 ?? 0) >= 150) {
    return locale === 'en'
      ? {
          title: 'Reference game for conversion',
          body: `Use this one as a mirror game. ${championName} converted the early edge into a playable mid game instead of giving the enemy a free reset window.`
        }
      : {
          title: 'Partida espejo para conversión',
          body: `Usala como partida espejo. ${championName} convirtió la ventaja temprana en un mid game jugable en vez de regalarle al rival una ventana de reinicio gratis.`
        };
  }

  if (match.win && match.killParticipation >= 60) {
    return locale === 'en'
      ? {
          title: 'Well connected to the map',
          body: `The good sign here is not only the win. ${championName} stayed connected to the plays that actually moved the map, which usually matters more than a clean KDA alone.`
        }
      : {
          title: 'Buena conexión con el mapa',
          body: `La señal buena acá no es solo la victoria. ${championName} estuvo conectado a las jugadas que realmente movieron el mapa, que suele pesar más que un KDA prolijo por sí solo.`
        };
  }

  return locale === 'en'
    ? {
        title: 'Useful middle-ground review',
        body: `This is a playable game to compare against your cleaner or worse ones. Focus on where ${championName}${opponentName ? ` into ${opponentName}` : ''} stopped gaining tempo or recovered it.`
      }
    : {
        title: 'Review útil de zona media',
        body: `Es una partida jugable para comparar con tus versiones más limpias o más flojas. Mirá dónde ${championName}${opponentName ? ` contra ${opponentName}` : ''} dejó de ganar tempo o dónde lo recuperó.`
      };
}

export function MatchesTab({ dataset, locale = 'es' }: { dataset: Dataset; locale?: Locale }) {
  return (
    <div style={{ display: 'grid', gap: 14 }}>
      {dataset.matches.map((match) => {
        const iconUrl = getChampionIconUrl(match.championName, dataset.ddragonVersion);
        const quickRead = buildQuickRead(match, dataset, locale);

        return (
          <Card
            key={match.matchId}
            title={formatChampionName(match.championName)}
            subtitle={`${new Date(match.gameCreation).toLocaleDateString(locale === 'en' ? 'en-US' : 'es-AR')} · ${match.opponentChampionName ? `vs ${formatChampionName(match.opponentChampionName)}` : (locale === 'en' ? 'Opponent not detected' : 'Rival no detectado')}`}
          >
            <div className="two-col-grid" style={{ display: 'grid', gridTemplateColumns: '1.15fr .95fr', gap: 16 }}>
              <div style={{ display: 'grid', gap: 14 }}>
                <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
                  {iconUrl ? <img src={iconUrl} alt={formatChampionName(match.championName)} width={58} height={58} style={iconStyle} /> : null}
                  <Badge tone={match.win ? 'low' : 'high'}>{match.win ? (locale === 'en' ? 'WIN' : 'VICTORIA') : (locale === 'en' ? 'LOSS' : 'DERROTA')}</Badge>
                  <Badge>{`${match.kills}/${match.deaths}/${match.assists}`}</Badge>
                  <Badge>{`${formatDecimal(match.killParticipation)}% KP`}</Badge>
                </div>

                <div className="six-col-grid" style={metricGridStyle}>
                  <MetricBlock label="Performance" value={formatDecimal(match.score.total)} info={locale === 'en' ? 'Internal execution score for this match.' : 'Índice interno de ejecución para esta partida.'} />
                  <MetricBlock label={locale === 'en' ? 'CS at 15' : 'CS a los 15'} value={formatDecimal(match.timeline.csAt15)} info={locale === 'en' ? 'Economy accumulated at minute 15 in this match.' : 'Economía acumulada a los 15 minutos en esta partida.'} />
                  <MetricBlock label={locale === 'en' ? 'Gold at 15' : 'Oro a los 15'} value={Math.round(match.timeline.goldAt15).toLocaleString(locale === 'en' ? 'en-US' : 'es-AR')} info={locale === 'en' ? 'Total gold accumulated at minute 15.' : 'Oro total acumulado a los 15 minutos.'} />
                  <MetricBlock label={locale === 'en' ? 'Damage' : 'Daño'} value={Math.round(match.damageToChampions).toLocaleString(locale === 'en' ? 'en-US' : 'es-AR')} info={locale === 'en' ? 'Champion damage dealt in this match.' : 'Daño a campeones en esta partida.'} />
                  <MetricBlock label={locale === 'en' ? 'Deaths pre 14' : 'Muertes pre 14'} value={formatDecimal(match.timeline.deathsPre14)} info={locale === 'en' ? 'Deaths suffered before minute 14.' : 'Cantidad de muertes sufridas antes del minuto 14.'} />
                  <MetricBlock label={locale === 'en' ? 'Gold diff' : 'Dif. de oro'} value={formatSignedNumber(match.timeline.goldDiffAt15, 0)} info={locale === 'en' ? 'Gold advantage or disadvantage at minute 15 against the detected direct opponent.' : 'Ventaja o desventaja de oro a los 15 frente al rival directo detectado.'} />
                  <MetricBlock label={locale === 'en' ? 'Level diff' : 'Dif. de nivel'} value={formatSignedNumber(match.timeline.levelDiffAt15, 0)} info={locale === 'en' ? 'Level advantage or disadvantage at minute 15 against the detected direct opponent.' : 'Ventaja o desventaja de nivel a los 15 frente al rival directo detectado.'} />
                </div>
              </div>

              <div style={reviewPanelStyle}>
                <div style={reviewLabelStyle}>{locale === 'en' ? 'Quick read' : 'Lectura rápida'}</div>
                <div style={{ color: '#eef4ff', fontSize: 18, fontWeight: 800, lineHeight: 1.2 }}>{quickRead.title}</div>
                <div style={{ color: '#d4deef', lineHeight: 1.7 }}>{quickRead.body}</div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}

function MetricBlock({ label, value, info }: { label: string; value: string; info: string }) {
  return (
    <div style={metricBlockStyle}>
      <div style={{ ...metricLabelStyle, display: 'flex', alignItems: 'center' }}>
        {label}
        <InfoHint text={info} />
      </div>
      <div style={metricValueStyle}>{value}</div>
    </div>
  );
}

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

const reviewPanelStyle = {
  padding: 16,
  borderRadius: 14,
  background: 'linear-gradient(180deg, rgba(44,31,76,0.7), rgba(11,14,23,0.95))',
  border: '1px solid rgba(255,255,255,0.05)'
} as const;

const reviewLabelStyle = {
  color: '#9a8cff',
  fontSize: 12,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.08em',
  marginBottom: 10
} as const;

const iconStyle = {
  borderRadius: 14,
  border: '1px solid rgba(255,255,255,0.08)'
} as const;
