import { Card, Badge, InfoHint } from '../../components/ui';
import type { Dataset } from '../../types';
import { formatChampionName, getChampionIconUrl } from '../../lib/lol';
import { formatDecimal, formatSignedNumber } from '../../lib/format';
import type { Locale } from '../../lib/i18n';

export function MatchesTab({ dataset, locale = 'es' }: { dataset: Dataset; locale?: Locale }) {
  return (
    <div style={{ display: 'grid', gap: 14 }}>
      {dataset.matches.map((match) => {
        const iconUrl = getChampionIconUrl(match.championName, dataset.ddragonVersion);

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
                  <MetricBlock label={locale === 'en' ? 'Deaths pre 14' : 'Muertes pre 14'} value={formatDecimal(match.timeline.deathsPre14)} info={locale === 'en' ? 'Deaths suffered before minute 14.' : 'Cantidad de muertes sufridas antes del minuto 14.'} />
                  <MetricBlock label={locale === 'en' ? 'Gold diff' : 'Dif. de oro'} value={formatSignedNumber(match.timeline.goldDiffAt15, 0)} info={locale === 'en' ? 'Gold advantage or disadvantage at minute 15 against the detected direct opponent.' : 'Ventaja o desventaja de oro a los 15 frente al rival directo detectado.'} />
                  <MetricBlock label={locale === 'en' ? 'Level diff' : 'Dif. de nivel'} value={formatSignedNumber(match.timeline.levelDiffAt15, 0)} info={locale === 'en' ? 'Level advantage or disadvantage at minute 15 against the detected direct opponent.' : 'Ventaja o desventaja de nivel a los 15 frente al rival directo detectado.'} />
                </div>
              </div>

              <div style={reviewPanelStyle}>
                <div style={reviewLabelStyle}>{locale === 'en' ? 'Quick read' : 'Lectura rápida'}</div>
                <div style={{ color: '#e7eef8', lineHeight: 1.7 }}>
                  {match.timeline.deathsPre14 >= 3
                    ? (locale === 'en' ? 'This game was heavily punished in the early and early-mid transition. It is worth reviewing if you want to lower your error floor.' : 'Partida muy castigada por early y mid temprano. Vale la pena revisarla si querés bajar el piso de error.')
                    : match.score.total >= 80
                      ? (locale === 'en' ? 'Strong game to use as a pattern reference: good execution and solid conversion margin.' : 'Partida fuerte para usar como referencia de patrón: buena ejecución y margen de conversión.')
                      : (locale === 'en' ? 'Middle-ground game. Useful for reviewing where control was lost or gained before minute 15.' : 'Partida intermedia. Útil para mirar dónde se perdió o ganó el control antes del minuto 15.')}
                </div>
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
  gridTemplateColumns: 'repeat(6, minmax(0, 1fr))',
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
