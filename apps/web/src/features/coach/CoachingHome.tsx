import type { PropsWithChildren } from 'react';
import { Card, Badge, KPI, InfoHint } from '../../components/ui';
import type { Dataset } from '../../types';
import { formatDecimal } from '../../lib/format';

const priorityColors: Record<string, string> = {
  high: 'rgba(255, 107, 107, 0.12)',
  medium: 'rgba(118, 144, 180, 0.14)',
  low: 'rgba(98, 214, 166, 0.12)'
};

function formatDelta(value: number, suffix = '') {
  const rounded = Number(value.toFixed(1));
  return `${rounded >= 0 ? '+' : ''}${rounded}${suffix}`;
}

export function CoachingHome({ dataset }: { dataset: Dataset }) {
  const { summary } = dataset;
  const topProblems = summary.coaching.topProblems;
  const activePlan = summary.coaching.activePlan;
  const trend = summary.coaching.trend;
  const championAnchor = summary.championPool[0];

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <section className="two-col-grid" style={{ display: 'grid', gridTemplateColumns: '1.15fr .85fr', gap: 16 }}>
        <Card title={summary.coaching.headline} subtitle={summary.coaching.subheadline}>
          <div className="four-col-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12 }}>
            <KPI
              label="Win rate"
              value={`${summary.winRate}%`}
              hint={`${summary.wins}-${summary.losses} en ${summary.matches} partidas`}
              info="Porcentaje de victorias dentro de la muestra filtrada que estás viendo. Si cambiás de rol, esta cifra se recalcula."
            />
            <KPI
              label="Performance"
              value={formatDecimal(summary.avgPerformanceScore)}
              hint={`Índice de consistencia ${formatDecimal(summary.consistencyIndex)}`}
              info="Índice interno que resume economía, peleas, macro y estabilidad. No es una métrica oficial de Riot: sirve para comparar la calidad general de tu ejecución entre partidas."
            />
            <KPI
              label="CS a los 15"
              value={formatDecimal(summary.avgCsAt15)}
              hint="Tu métrica principal de farmeo"
              info="Elegimos el minuto 15 porque captura mejor tu economía real después de las primeras decisiones, resets y rotaciones."
            />
            <KPI
              label="Pick ancla"
              value={championAnchor?.championName ?? 'N/A'}
              hint={championAnchor ? `${championAnchor.winRate}% WR` : 'Sin muestra suficiente'}
              info="El campeón más jugado dentro del filtro actual. Sirve como referencia para detectar si tu muestra tiene un patrón claro por pick."
            />
          </div>
        </Card>

        <Card title="Lectura rápida" subtitle="La capa premium del coaching está en separar lo urgente de lo accesorio">
          <div style={{ display: 'grid', gap: 12 }}>
            <MetricHeadline
              label="Performance"
              info="Resume tu score total de partida. Combina lane, economía, fighting, macro y consistencia en una lectura única."
              value={formatDecimal(summary.avgPerformanceScore)}
            />
            <MetricHeadline
              label="CS a los 15"
              info="Preferimos el minuto 15 porque captura mejor tu patrón de farmeo y tus decisiones tras la fase inicial."
              value={formatDecimal(summary.avgCsAt15)}
            />
            <MetricHeadline
              label="Oro a los 15"
              info="Es una señal rápida de cuánto valor real estás generando antes de entrar al mid game."
              value={Math.round(summary.avgGoldAt15).toLocaleString('es-AR')}
            />
          </div>
        </Card>
      </section>

      <section style={{ display: 'grid', gap: 14 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 24 }}>Prioridades de Coaching</h2>
          <p style={{ margin: '6px 0 0', color: '#8994a8' }}>Lo que más te está costando hoy, con evidencia, impacto y acciones concretas.</p>
        </div>

        <div style={{ display: 'grid', gap: 16 }}>
          {topProblems.map((problem, index) => (
            <div key={problem.id} style={{ ...problemCardStyle, borderColor: borderForPriority(problem.priority) }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'start', flexWrap: 'wrap' }}>
                <div style={{ display: 'grid', gap: 8 }}>
                  <div style={{ color: '#7f8999', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Prioridad {index + 1}</div>
                  <div style={{ fontSize: 24, fontWeight: 800, letterSpacing: '-0.03em' }}>{problem.problem}</div>
                  <div style={{ color: '#97a2b3', maxWidth: 780 }}>{problem.title}</div>
                </div>

                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <Badge tone={problem.priority}>{problem.priority.toUpperCase()}</Badge>
                  <Badge>{problem.category.toUpperCase()}</Badge>
                  {typeof problem.winRateDelta === 'number' ? <Badge tone={problem.winRateDelta >= 0 ? 'low' : 'high'}>{`${formatDelta(problem.winRateDelta, ' pts WR')}`}</Badge> : null}
                </div>
              </div>

              <div className="three-col-grid" style={{ display: 'grid', gridTemplateColumns: '1.15fr 1fr 1fr', gap: 12 }}>
                <InfoCard title="Impacto" info="Qué tan fuerte pega este patrón en tus resultados y en tu capacidad de convertir partidas.">
                  {problem.impact}
                </InfoCard>
                <InfoCard title="Causa" info="La interpretación del sistema sobre el origen más probable del problema.">
                  {problem.cause}
                </InfoCard>
                <InfoCard title="Evidencia" info="Señales concretas detectadas en tu muestra reciente.">
                  <div style={{ display: 'grid', gap: 8 }}>
                    {problem.evidence.map((item) => (
                      <div key={item}>{item}</div>
                    ))}
                  </div>
                </InfoCard>
              </div>

              <div style={{ display: 'grid', gap: 10 }}>
                <div style={{ display: 'flex', alignItems: 'center', color: '#93a0b4', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Qué hacer hoy
                  <InfoHint text="Acciones concretas para las próximas partidas. Acá queremos bajar decisiones a hábitos prácticos, no consejos genéricos." />
                </div>
                <div style={{ display: 'grid', gap: 10 }}>
                  {problem.actions.map((action) => (
                    <div key={action} style={{ ...actionStyle, background: priorityColors[problem.priority] ?? priorityColors.low }}>
                      {action}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className="two-col-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1fr) minmax(320px, 1fr)', gap: 16 }}>
        <Card title="Plan activo" subtitle="Qué hábito estamos intentando fijar en la muestra reciente">
          {activePlan ? (
            <div style={{ display: 'grid', gap: 14 }}>
              <InfoCard title="Objetivo" info="La conducta o benchmark que queremos sostener en las próximas partidas.">
                {activePlan.objective}
              </InfoCard>
              <InfoCard title="Foco" info="El problema raíz al que responde este ciclo de mejora.">
                {activePlan.focus}
              </InfoCard>
              <div style={{ display: 'grid', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#c7d4ea', fontSize: 13 }}>
                  <span>Progreso</span>
                  <span>{activePlan.successLabel}</span>
                </div>
                <div style={{ height: 12, borderRadius: 999, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                  <div style={{ width: `${activePlan.progressPercent}%`, height: '100%', background: '#67d6a4' }} />
                </div>
              </div>
            </div>
          ) : (
            <p style={{ margin: 0, color: '#c7d4ea' }}>Todavía no hay suficientes señales para fijar un ciclo claro. Sumá más partidas o filtrá por el rol que querés trabajar.</p>
          )}
        </Card>

        <Card title="Evolución reciente" subtitle="Cómo cambió tu nivel entre la base y el tramo más nuevo">
          <div style={{ display: 'grid', gap: 12 }}>
            <div className="two-col-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
              <KPI
                label="Performance"
                value={`${trend.baselineScore} -> ${trend.recentScore}`}
                hint={formatDelta(trend.scoreDelta)}
                info="Compara tu score medio entre el bloque inicial y el tramo más reciente de la muestra. Sirve para ver si tu ejecución general está subiendo o cayendo."
              />
              <KPI
                label="Win rate"
                value={`${trend.baselineWinRate}% -> ${trend.recentWinRate}%`}
                hint={formatDelta(trend.winRateDelta, ' pts')}
                info="Compara el bloque más viejo de la muestra contra tus partidas más recientes para detectar si tu nivel sube, cae o se estabiliza."
              />
            </div>
            <InfoCard title="Lectura" info="Interpretación resumida de la tendencia reciente.">
              {trend.scoreDelta >= 0
                ? 'Tu rendimiento reciente viene mejorando. La prioridad ahora es sostener la calidad sin volver a los errores del early.'
                : 'Tu tramo reciente cayó. Antes de sumar complejidad, conviene estabilizar el problema principal.'}
            </InfoCard>
          </div>
        </Card>
      </section>
    </div>
  );
}

function MetricHeadline({ label, value, info }: { label: string; value: string; info: string }) {
  return (
    <div style={headlineMetricStyle}>
      <div style={{ display: 'flex', alignItems: 'center', color: '#8b96aa', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        {label}
        <InfoHint text={info} />
      </div>
      <div style={{ fontSize: 28, fontWeight: 800 }}>{value}</div>
    </div>
  );
}

function InfoCard({ title, info, children }: PropsWithChildren<{ title: string; info: string }>) {
  return (
    <div style={infoCardStyle}>
      <div style={{ display: 'flex', alignItems: 'center', color: '#93a0b4', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
        {title}
        <InfoHint text={info} />
      </div>
      <div style={{ color: '#edf2ff', lineHeight: 1.6 }}>{children}</div>
    </div>
  );
}

function borderForPriority(priority: string) {
  if (priority === 'high') return 'rgba(255,107,107,0.22)';
  if (priority === 'low') return 'rgba(103,214,164,0.2)';
  return 'rgba(113,131,168,0.24)';
}

const problemCardStyle = {
  display: 'grid',
  gap: 16,
  padding: 20,
  borderRadius: 18,
  background: 'linear-gradient(180deg, rgba(24,18,41,0.9), rgba(8,11,18,0.98))',
  border: '1px solid rgba(255,255,255,0.06)'
} as const;

const infoCardStyle = {
  padding: 14,
  borderRadius: 14,
  background: '#090e16',
  border: '1px solid rgba(255,255,255,0.05)'
} as const;

const actionStyle = {
  padding: '13px 14px',
  borderRadius: 14,
  border: '1px solid rgba(255,255,255,0.05)',
  color: '#edf2ff'
} as const;

const headlineMetricStyle = {
  padding: '14px 16px',
  borderRadius: 14,
  background: '#090e16',
  border: '1px solid rgba(255,255,255,0.05)',
  display: 'grid',
  gap: 8
} as const;
