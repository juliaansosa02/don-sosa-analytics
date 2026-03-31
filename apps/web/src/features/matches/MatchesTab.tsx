import { Card, Badge, InfoHint } from '../../components/ui';
import type { Dataset } from '../../types';
import { getChampionIconUrl } from '../../lib/lol';
import { formatDecimal, formatSignedNumber } from '../../lib/format';

export function MatchesTab({ dataset }: { dataset: Dataset }) {
  return (
    <div style={{ display: 'grid', gap: 14 }}>
      {dataset.matches.map((match) => {
        const iconUrl = getChampionIconUrl(match.championName, dataset.ddragonVersion);

        return (
          <Card
            key={match.matchId}
            title={match.championName}
            subtitle={`${new Date(match.gameCreation).toLocaleDateString()} · ${match.opponentChampionName ? `vs ${match.opponentChampionName}` : 'Rival no detectado'}`}
          >
            <div className="two-col-grid" style={{ display: 'grid', gridTemplateColumns: '1.15fr .95fr', gap: 16 }}>
              <div style={{ display: 'grid', gap: 14 }}>
                <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
                  {iconUrl ? <img src={iconUrl} alt={match.championName} width={58} height={58} style={iconStyle} /> : null}
                  <Badge tone={match.win ? 'low' : 'high'}>{match.win ? 'VICTORIA' : 'DERROTA'}</Badge>
                  <Badge>{`${match.kills}/${match.deaths}/${match.assists}`}</Badge>
                  <Badge>{`${formatDecimal(match.killParticipation)}% KP`}</Badge>
                </div>

                <div className="six-col-grid" style={metricGridStyle}>
                  <MetricBlock label="Performance" value={formatDecimal(match.score.total)} info="Índice interno de ejecución para esta partida." />
                  <MetricBlock label="CS a los 15" value={formatDecimal(match.timeline.csAt15)} info="Economía acumulada a los 15 minutos en esta partida." />
                  <MetricBlock label="Oro a los 15" value={Math.round(match.timeline.goldAt15).toLocaleString('es-AR')} info="Oro total acumulado a los 15 minutos." />
                  <MetricBlock label="Muertes pre 14" value={formatDecimal(match.timeline.deathsPre14)} info="Cantidad de muertes sufridas antes del minuto 14." />
                  <MetricBlock label="Dif. de oro" value={formatSignedNumber(match.timeline.goldDiffAt15, 0)} info="Ventaja o desventaja de oro a los 15 frente al rival directo detectado." />
                  <MetricBlock label="Dif. de nivel" value={formatSignedNumber(match.timeline.levelDiffAt15, 0)} info="Ventaja o desventaja de nivel a los 15 frente al rival directo detectado." />
                </div>
              </div>

              <div style={reviewPanelStyle}>
                <div style={reviewLabelStyle}>Lectura rápida</div>
                <div style={{ color: '#e7eef8', lineHeight: 1.7 }}>
                  {match.timeline.deathsPre14 >= 3
                    ? 'Partida muy castigada por early y mid temprano. Vale la pena revisarla si querés bajar el piso de error.'
                    : match.score.total >= 80
                      ? 'Partida fuerte para usar como referencia de patrón: buena ejecución y margen de conversión.'
                      : 'Partida intermedia. Útil para mirar dónde se perdió o ganó el control antes del minuto 15.'}
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
