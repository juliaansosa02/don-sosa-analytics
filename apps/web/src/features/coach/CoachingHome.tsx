import type { PropsWithChildren } from 'react';
import { Card, Badge, KPI, InfoHint } from '../../components/ui';
import type { AICoachResult, Dataset } from '../../types';
import { formatDecimal } from '../../lib/format';
import type { Locale } from '../../lib/i18n';

const priorityColors: Record<string, string> = {
  high: 'rgba(255, 107, 107, 0.12)',
  medium: 'rgba(118, 144, 180, 0.14)',
  low: 'rgba(98, 214, 166, 0.12)'
};

function formatDelta(value: number, suffix = '') {
  const rounded = Number(value.toFixed(1));
  return `${rounded >= 0 ? '+' : ''}${rounded}${suffix}`;
}

function buildReviewCue(dataset: Dataset, match: Dataset['matches'][number], locale: Locale) {
  if (match.timeline.deathsPre14 >= 3) {
    return locale === 'en'
      ? 'Review the first death that removes you from the map. That is often where the game starts breaking.'
      : 'Revisá la primera muerte que te saca del mapa. Ahí suele empezar a romperse la partida.';
  }

  if (match.timeline.csAt15 < dataset.summary.avgCsAt15 - 12) {
    return locale === 'en'
      ? 'Your early economy fell short. Look at the first reset or detour that cuts your income.'
      : 'La economía temprana se quedó corta. Mirá el primer reset o desvío que te corta el ingreso.';
  }

  if (match.timeline.objectiveFightDeaths > 0) {
    return locale === 'en'
      ? 'The key review lives in the objective window: setup, reset timing and who arrives first.'
      : 'La review clave está en la ventana de objetivo: setup, reset y quién llega primero.';
  }

  return locale === 'en'
    ? 'Use it as a mirror game to compare tempo, reset timing and decision quality against your current block.'
    : 'Usala como partida espejo para comparar tempo, resets y calidad de decisiones contra tu bloque actual.';
}

function buildPatternCard(dataset: Dataset) {
  const championAnchor = dataset.summary.championPool[0];
  const stableMatches = dataset.matches.filter((match) => match.timeline.deathsPre14 <= dataset.summary.avgDeathsPre14 && match.timeline.csAt15 >= dataset.summary.avgCsAt15);
  const stableWinRate = stableMatches.length ? (stableMatches.filter((match) => match.win).length / stableMatches.length) * 100 : null;

  return {
    championAnchor,
    stableMatches,
    stableWinRate
  };
}

function buildReviewQueue(dataset: Dataset) {
  return [...dataset.matches]
    .sort((a, b) => b.gameCreation - a.gameCreation)
    .filter((match) => !match.win || match.timeline.deathsPre14 >= 2 || match.timeline.objectiveFightDeaths > 0)
    .slice(0, 3);
}

function buildPositiveLanes(dataset: Dataset, locale: Locale) {
  const positives = dataset.summary.insights.filter((insight) => insight.category === 'positive').slice(0, 2);
  if (positives.length) return positives;

  const topChampion = dataset.summary.championPool[0];
  if (!topChampion) return [];

  return [{
    id: 'fallback-positive',
    problem: locale === 'en' ? `${topChampion.championName} remains your clearest reference` : `${topChampion.championName} sigue siendo tu referencia más clara`,
    title: locale === 'en' ? `You are carrying ${topChampion.games} matches and ${topChampion.winRate}% WR on your most played pick.` : `Concentrás ${topChampion.games} partidas y ${topChampion.winRate}% WR en tu pick más jugado.`,
    actions: [
      locale === 'en' ? `Use your best ${topChampion.championName} games as review material whenever you want to lock in habits.` : `Usá tus mejores partidas de ${topChampion.championName} como material de review cuando quieras fijar hábitos.`,
      locale === 'en' ? 'Compare your solid games against your losses on the same pick before opening more variables.' : 'Compará tus partidas sólidas contra tus derrotas del mismo pick antes de abrir más variables.'
    ]
  }];
}

export function CoachingHome({
  dataset,
  locale = 'es',
  aiCoach,
  generatingAICoach = false,
  aiCoachError,
  onGenerateAICoach,
  onSendFeedback
}: {
  dataset: Dataset;
  locale?: Locale;
  aiCoach?: AICoachResult | null;
  generatingAICoach?: boolean;
  aiCoachError?: string | null;
  onGenerateAICoach?: () => void;
  onSendFeedback?: (verdict: 'useful' | 'mixed' | 'generic' | 'incorrect') => void;
}) {
  const { summary } = dataset;
  const topProblems = summary.coaching.topProblems;
  const activePlan = summary.coaching.activePlan;
  const trend = summary.coaching.trend;
  const championAnchor = summary.championPool[0];
  const reviewQueue = buildReviewQueue(dataset);
  const positiveLanes = buildPositiveLanes(dataset, locale);
  const patternCard = buildPatternCard(dataset);
  const matchupAlert = summary.insights.find((insight) => insight.focusMetric === 'matchup_review');

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <section className="two-col-grid" style={{ display: 'grid', gridTemplateColumns: '1.15fr .85fr', gap: 16 }}>
        <Card title={summary.coaching.headline} subtitle={summary.coaching.subheadline}>
          <div className="four-col-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12 }}>
            <KPI
              label="Win rate"
              value={`${summary.winRate}%`}
              hint={locale === 'en' ? `${summary.wins}-${summary.losses} across ${summary.matches} matches` : `${summary.wins}-${summary.losses} en ${summary.matches} partidas`}
              info={locale === 'en' ? 'Win rate within the filtered sample you are viewing. If you change role, queue or time window, this number updates.' : 'Porcentaje de victorias dentro de la muestra filtrada que estás viendo. Si cambiás de rol, cola o ventana, esta cifra se recalcula.'}
            />
            <KPI
              label="Performance"
              value={formatDecimal(summary.avgPerformanceScore)}
              hint={locale === 'en' ? `Consistency ${formatDecimal(summary.consistencyIndex)}` : `Consistencia ${formatDecimal(summary.consistencyIndex)}`}
              info={locale === 'en' ? 'Internal index that summarizes economy, fighting, macro and stability. It is not an official Riot metric: it helps compare your overall execution quality across matches.' : 'Índice interno que resume economía, peleas, macro y estabilidad. No es una métrica oficial de Riot: sirve para comparar la calidad general de tu ejecución entre partidas.'}
            />
            <KPI
              label={locale === 'en' ? 'CS at 15' : 'CS a los 15'}
              value={formatDecimal(summary.avgCsAt15)}
              hint={locale === 'en' ? 'Current economy baseline' : 'Base actual de economía'}
              info={locale === 'en' ? 'We use minute 15 because it better captures resets, early rotations and your real economy state before mid game.' : 'Elegimos el minuto 15 porque captura mejor tus resets, primeras rotaciones y el estado real de tu economía antes del mid game.'}
            />
            <KPI
              label={locale === 'en' ? 'Anchor pick' : 'Pick ancla'}
              value={championAnchor?.championName ?? 'N/A'}
              hint={championAnchor ? `${championAnchor.winRate}% WR` : (locale === 'en' ? 'Not enough sample' : 'Sin muestra suficiente')}
              info={locale === 'en' ? 'The champion that carries the most weight inside the current filter. If your sample leans heavily on one pick, coaching needs to respect that.' : 'El campeón que más pesa dentro del filtro actual. Si tu muestra se apoya mucho en un pick, la lectura de coaching tiene que respetar eso.'}
            />
          </div>
        </Card>

        <Card title={locale === 'en' ? 'Current block radar' : 'Radar del bloque actual'} subtitle={locale === 'en' ? 'Three quick reads to know where to look first' : 'Tres lecturas rápidas para saber dónde mirar primero'}>
          <div style={{ display: 'grid', gap: 12 }}>
            <SpotlightMetric
              label={locale === 'en' ? 'Stable pattern' : 'Patrón estable'}
              info={locale === 'en' ? 'Look for the version of your play that is already working, so you do not build the entire plan from scratch.' : 'Busca la versión de vos mismo que ya está funcionando, para no construir todo el plan desde cero.'}
              value={patternCard.stableWinRate !== null ? `${formatDecimal(patternCard.stableWinRate)}% WR` : (locale === 'en' ? 'No clear signal' : 'Sin señal clara')}
              caption={patternCard.stableMatches.length
                ? (locale === 'en' ? `${patternCard.stableMatches.length} matches with better-than-average economy and discipline` : `${patternCard.stableMatches.length} partidas con economía y disciplina mejores que tu media`)
                : (locale === 'en' ? 'There are not enough clean games inside the current filter yet' : 'Todavía no hay suficientes partidas limpias en el filtro actual')}
            />
            <SpotlightMetric
              label={locale === 'en' ? 'Matchup to watch' : 'Matchup a vigilar'}
              info={locale === 'en' ? 'If a matchup keeps repeating with bad outcomes, it stops being random and becomes preparation material.' : 'Si un matchup se repite con malos resultados, deja de ser un accidente y pasa a ser material de preparación.'}
              value={matchupAlert ? (locale === 'en' ? 'Yes' : 'Sí') : (locale === 'en' ? 'No alert' : 'Sin alerta')}
              caption={matchupAlert ? matchupAlert.problem : (locale === 'en' ? 'No recurring cross appears strong enough inside this sample' : 'No aparece un cruce recurrente lo bastante fuerte dentro de esta muestra')}
            />
            <SpotlightMetric
              label={locale === 'en' ? 'Today plan' : 'Plan de hoy'}
              info={locale === 'en' ? 'The true priority of the current block. This is what you should sustain in your next games.' : 'La prioridad real del bloque actual. Esto es lo que más conviene sostener en tus próximas partidas.'}
              value={activePlan ? activePlan.objective : (locale === 'en' ? 'Keep building sample' : 'Seguir acumulando muestra')}
              caption={activePlan ? activePlan.successLabel : (locale === 'en' ? 'Filter by the role you want to work on if you want a sharper read' : 'Filtrá por el rol que quieras trabajar si querés una lectura más fina')}
            />
          </div>
        </Card>
      </section>

      <section className="three-col-grid" style={{ display: 'grid', gridTemplateColumns: '1.1fr .9fr 1fr', gap: 16 }}>
        <Card title={locale === 'en' ? 'AI coach beta' : 'AI coach beta'} subtitle={locale === 'en' ? 'A deeper coaching layer built on your current stats plus curated coach knowledge' : 'Una capa más profunda de coaching armada sobre tus stats actuales y conocimiento curado de coaches'}>
          <div style={{ display: 'grid', gap: 12 }}>
            <div style={{ color: '#a5b2c6', lineHeight: 1.6 }}>
              {locale === 'en'
                ? 'Use this when you want a sharper explanation of why the current block is failing and what the next three games should look like.'
                : 'Usalo cuando quieras una explicación más profunda de por qué falla el bloque actual y cómo deberían verse tus próximas tres partidas.'}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button type="button" style={aiButtonStyle} onClick={onGenerateAICoach} disabled={!onGenerateAICoach || generatingAICoach}>
                {generatingAICoach ? (locale === 'en' ? 'Generating AI block...' : 'Generando bloque IA...') : (locale === 'en' ? 'Generate AI coaching' : 'Generar coaching IA')}
              </button>
              {aiCoach ? <Badge tone={aiCoach.provider === 'openai' ? 'low' : 'medium'}>{aiCoach.provider === 'openai' ? 'OPENAI' : (locale === 'en' ? 'DRAFT MODE' : 'MODO DRAFT')}</Badge> : null}
              {aiCoach ? <Badge tone="default">{`${Math.round(aiCoach.coach.confidence * 100)}% ${locale === 'en' ? 'confidence' : 'confianza'}`}</Badge> : null}
            </div>
            {aiCoachError ? <div style={{ color: '#ffb3b3', lineHeight: 1.6 }}>{aiCoachError}</div> : null}
            {aiCoach ? (
              <div style={{ display: 'grid', gap: 12 }}>
                <div style={signalCardStyle}>
                  <div style={{ color: '#edf2ff', fontSize: 18, fontWeight: 800 }}>{aiCoach.coach.mainLeak}</div>
                  <div style={{ color: '#9aa5b7', lineHeight: 1.7 }}>{aiCoach.coach.summary}</div>
                </div>
                <InfoCard title={locale === 'en' ? 'Why it happens' : 'Por qué pasa'} info={locale === 'en' ? 'Model explanation grounded in your current coaching block and retrieved coach knowledge.' : 'Explicación del modelo apoyada en tu bloque actual y en conocimiento curado recuperado.'}>
                  {aiCoach.coach.whyItHappens}
                </InfoCard>
                <InfoCard title={locale === 'en' ? 'What to review' : 'Qué revisar'} info={locale === 'en' ? 'The exact clips or moments worth checking before you queue again.' : 'Los clips o momentos exactos que conviene revisar antes de volver a jugar.'}>
                  <div style={{ display: 'grid', gap: 8 }}>
                    {aiCoach.coach.whatToReview.map((item) => (
                      <div key={item}>{item}</div>
                    ))}
                  </div>
                </InfoCard>
                <InfoCard title={locale === 'en' ? 'Next 3 games' : 'Próximas 3 partidas'} info={locale === 'en' ? 'Habits to hold immediately in your next block.' : 'Hábitos para sostener inmediatamente en tu siguiente bloque.'}>
                  <div style={{ display: 'grid', gap: 8 }}>
                    {aiCoach.coach.whatToDoNext3Games.map((item) => (
                      <div key={item}>{item}</div>
                    ))}
                  </div>
                </InfoCard>
                {aiCoach.coach.championSpecificNote ? (
                  <InfoCard title={locale === 'en' ? 'Champion note' : 'Nota de campeón'} info={locale === 'en' ? 'Specific read tied to your current anchor pick.' : 'Lectura específica atada a tu pick ancla actual.'}>
                    {aiCoach.coach.championSpecificNote}
                  </InfoCard>
                ) : null}
                {aiCoach.coach.matchupSpecificNote ? (
                  <InfoCard title={locale === 'en' ? 'Matchup note' : 'Nota de matchup'} info={locale === 'en' ? 'Specific preparation clue for the matchup pattern the system found.' : 'Pista específica de preparación para el patrón de matchup que encontró el sistema.'}>
                    {aiCoach.coach.matchupSpecificNote}
                  </InfoCard>
                ) : null}
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  {onSendFeedback ? (
                    <>
                      <button type="button" style={feedbackButtonStyle} onClick={() => onSendFeedback('useful')}>{locale === 'en' ? 'Useful' : 'Útil'}</button>
                      <button type="button" style={feedbackButtonStyle} onClick={() => onSendFeedback('mixed')}>{locale === 'en' ? 'Mixed' : 'Mixto'}</button>
                      <button type="button" style={feedbackButtonStyle} onClick={() => onSendFeedback('generic')}>{locale === 'en' ? 'Generic' : 'Genérico'}</button>
                      <button type="button" style={feedbackButtonStyle} onClick={() => onSendFeedback('incorrect')}>{locale === 'en' ? 'Incorrect' : 'Incorrecto'}</button>
                    </>
                  ) : null}
                </div>
              </div>
            ) : null}
          </div>
        </Card>

        <Card title={locale === 'en' ? 'What is already giving you level' : 'Qué ya te está dando nivel'} subtitle={locale === 'en' ? 'Not everything is about fixing issues: you also need to repeat what is already working' : 'No todo es corregir: también hay que repetir lo que sí funciona'}>
          <div style={{ display: 'grid', gap: 10 }}>
            {positiveLanes.map((insight) => (
              <div key={insight.id} style={signalCardStyle}>
                <div style={{ display: 'grid', gap: 5 }}>
                  <div style={{ color: '#edf2ff', fontSize: 18, fontWeight: 800 }}>{insight.problem}</div>
                  <div style={{ color: '#9aa5b7', lineHeight: 1.6 }}>{insight.title}</div>
                </div>
                <div style={{ display: 'grid', gap: 8 }}>
                  {insight.actions.map((action) => (
                    <div key={action} style={signalActionStyle}>{action}</div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card title={locale === 'en' ? 'Review queue' : 'Sesión de review'} subtitle={locale === 'en' ? 'Three games worth reviewing before you queue again' : 'Tres partidas para mirar antes de volver a queuear'}>
          <div style={{ display: 'grid', gap: 10 }}>
            {reviewQueue.length ? reviewQueue.map((match) => (
              <div key={match.matchId} style={reviewMatchStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }}>
                  <div style={{ display: 'grid', gap: 4 }}>
                    <div style={{ color: '#edf2ff', fontWeight: 800 }}>{match.championName}</div>
                    <div style={{ color: '#8190a4', fontSize: 12 }}>{new Date(match.gameCreation).toLocaleDateString(locale === 'en' ? 'en-US' : 'es-AR')}</div>
                  </div>
                  <Badge tone={match.win ? 'low' : 'high'}>{match.win ? 'Win' : 'Loss'}</Badge>
                </div>
                <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                  <Badge>{`${formatDecimal(match.timeline.csAt15)} CS@15`}</Badge>
                  <Badge>{locale === 'en' ? `${formatDecimal(match.timeline.deathsPre14)} deaths pre14` : `${formatDecimal(match.timeline.deathsPre14)} muertes pre14`}</Badge>
                  {match.opponentChampionName ? <Badge>{`vs ${match.opponentChampionName}`}</Badge> : null}
                </div>
                <div style={{ color: '#9aa5b7', lineHeight: 1.6 }}>
                  {buildReviewCue(dataset, match, locale)}
                </div>
              </div>
            )) : (
              <div style={{ color: '#c7d4ea' }}>{locale === 'en' ? 'There is no clear review queue yet. Add more matches or open a larger recent window.' : 'No hay una cola de review clara todavía. Sumá más partidas o abrí una ventana reciente más grande.'}</div>
            )}
          </div>
        </Card>

        <Card title={locale === 'en' ? 'Anchor pick map' : 'Mapa del pick ancla'} subtitle={locale === 'en' ? 'How to read the champion that currently carries the most weight in your sample' : 'Cómo leer el campeón que hoy más pesa en tu muestra'}>
          <div style={{ display: 'grid', gap: 12 }}>
            {championAnchor ? (
              <>
                <InfoCard title={locale === 'en' ? 'Main pick' : 'Pick principal'} info={locale === 'en' ? 'The champion that most shapes the current coaching read.' : 'El campeón que más condiciona la lectura actual de coaching.'}>
                  <div style={{ display: 'grid', gap: 6 }}>
                    <div style={{ fontSize: 22, fontWeight: 800 }}>{championAnchor.championName}</div>
                    <div style={{ color: '#9aa5b7' }}>{locale === 'en' ? `${championAnchor.games} matches · ${championAnchor.winRate}% WR · ${formatDecimal(championAnchor.avgCsAt15)} CS@15` : `${championAnchor.games} partidas · ${championAnchor.winRate}% WR · ${formatDecimal(championAnchor.avgCsAt15)} CS@15`}</div>
                  </div>
                </InfoCard>
                <InfoCard title={locale === 'en' ? 'What to watch' : 'Qué mirar'} info={locale === 'en' ? 'The goal is to separate whether your main pick is already organizing the game well or hiding a problem.' : 'La idea es separar si tu pick principal ya te ordena bien la partida o si está ocultando un problema.'}>
                  {matchupAlert
                    ? (locale === 'en' ? `Your next improvement with ${championAnchor.championName} probably does not come from playing it more, but from understanding the matchup that punishes you the most.` : `Tu siguiente mejora con ${championAnchor.championName} probablemente no pasa por jugarlo más, sino por entender mejor el cruce que hoy más te castiga.`)
                    : (locale === 'en' ? `Use it as your baseline to review recalls, first rotations and when your early game actually enters mid game cleanly.` : `Usalo como línea base para revisar recalls, primeras rotaciones y cuándo tu early realmente entra limpio al mid game.`)}
                </InfoCard>
              </>
            ) : (
              <div style={{ color: '#c7d4ea' }}>{locale === 'en' ? 'There is not enough sample yet to read a clear anchor pick inside the current filter.' : 'Todavía no hay suficiente muestra para leer un pick ancla claro dentro del filtro actual.'}</div>
            )}
          </div>
        </Card>
      </section>

      <section style={{ display: 'grid', gap: 14 }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 24 }}>{locale === 'en' ? 'Coaching priorities' : 'Prioridades de coaching'}</h2>
          <p style={{ margin: '6px 0 0', color: '#8994a8' }}>{locale === 'en' ? 'What is costing you the most right now, with evidence, impact and concrete actions.' : 'Lo que más te está costando hoy, con evidencia, impacto y acciones concretas.'}</p>
        </div>

        <div style={{ display: 'grid', gap: 16 }}>
          {topProblems.map((problem, index) => (
            <div key={problem.id} style={{ ...problemCardStyle, borderColor: borderForPriority(problem.priority) }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'start', flexWrap: 'wrap' }}>
                <div style={{ display: 'grid', gap: 8 }}>
                  <div style={{ color: '#7f8999', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{locale === 'en' ? `Block ${index + 1}` : `Bloque ${index + 1}`}</div>
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
                  <InfoCard title={locale === 'en' ? 'Impact' : 'Impacto'} info={locale === 'en' ? 'How hard this pattern hits your results and your ability to convert games.' : 'Qué tan fuerte pega este patrón en tus resultados y en tu capacidad de convertir partidas.'}>
                    {problem.impact}
                  </InfoCard>
                  <InfoCard title={locale === 'en' ? 'Cause' : 'Causa'} info={locale === 'en' ? 'The system interpretation of the most likely root cause behind the issue.' : 'La interpretación del sistema sobre el origen más probable del problema.'}>
                    {problem.cause}
                  </InfoCard>
                  <InfoCard title={locale === 'en' ? 'Evidence' : 'Evidencia'} info={locale === 'en' ? 'Concrete signals detected in your recent sample.' : 'Señales concretas detectadas en tu muestra reciente.'}>
                  <div style={{ display: 'grid', gap: 8 }}>
                    {problem.evidence.map((item) => (
                      <div key={item}>{item}</div>
                    ))}
                  </div>
                </InfoCard>
              </div>

                <div style={{ display: 'grid', gap: 10 }}>
                  <div style={{ display: 'flex', alignItems: 'center', color: '#93a0b4', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    {locale === 'en' ? 'What to do today' : 'Qué hacer hoy'}
                    <InfoHint text={locale === 'en' ? 'Concrete actions for the next games. This should translate decisions into practical habits, not generic advice.' : 'Acciones concretas para las próximas partidas. Acá queremos bajar decisiones a hábitos prácticos, no consejos genéricos.'} />
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
        <Card title={locale === 'en' ? 'Active plan' : 'Plan activo'} subtitle={locale === 'en' ? 'Which habit we are trying to stabilize in the recent sample' : 'Qué hábito estamos intentando fijar en la muestra reciente'}>
          {activePlan ? (
            <div style={{ display: 'grid', gap: 14 }}>
              <InfoCard title={locale === 'en' ? 'Objective' : 'Objetivo'} info={locale === 'en' ? 'The behavior or benchmark we want to sustain over the next games.' : 'La conducta o benchmark que queremos sostener en las próximas partidas.'}>
                {activePlan.objective}
              </InfoCard>
              <InfoCard title={locale === 'en' ? 'Focus' : 'Foco'} info={locale === 'en' ? 'The root issue this improvement cycle is trying to address.' : 'El problema raíz al que responde este ciclo de mejora.'}>
                {activePlan.focus}
              </InfoCard>
              <div style={{ display: 'grid', gap: 8 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#c7d4ea', fontSize: 13 }}>
                  <span>{locale === 'en' ? 'Progress' : 'Progreso'}</span>
                  <span>{activePlan.successLabel}</span>
                </div>
                <div style={{ height: 12, borderRadius: 999, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
                  <div style={{ width: `${activePlan.progressPercent}%`, height: '100%', background: '#67d6a4' }} />
                </div>
              </div>
            </div>
          ) : (
            <p style={{ margin: 0, color: '#c7d4ea' }}>{locale === 'en' ? 'There are not enough signals yet to define a clear cycle. Add more matches or filter down to the role you want to work on.' : 'Todavía no hay suficientes señales para fijar un ciclo claro. Sumá más partidas o filtrá por el rol que querés trabajar.'}</p>
          )}
        </Card>

        <Card title={locale === 'en' ? 'Recent evolution' : 'Evolución reciente'} subtitle={locale === 'en' ? 'How your level changed between the baseline block and the newest stretch' : 'Cómo cambió tu nivel entre la base y el tramo más nuevo'}>
          <div style={{ display: 'grid', gap: 12 }}>
            <div className="two-col-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
              <KPI
                label="Performance"
                value={`${trend.baselineScore} -> ${trend.recentScore}`}
                hint={formatDelta(trend.scoreDelta)}
                info={locale === 'en' ? 'Compares your average score between the baseline block and the newest stretch of the sample. It helps reveal whether your overall execution is climbing or dropping.' : 'Compara tu score medio entre el bloque inicial y el tramo más reciente de la muestra. Sirve para ver si tu ejecución general está subiendo o cayendo.'}
              />
              <KPI
                label="Win rate"
                value={`${trend.baselineWinRate}% -> ${trend.recentWinRate}%`}
                hint={formatDelta(trend.winRateDelta, ' pts')}
                info={locale === 'en' ? 'Compares the oldest block in the sample against your most recent games to detect whether your level is rising, falling or stabilizing.' : 'Compara el bloque más viejo de la muestra contra tus partidas más recientes para detectar si tu nivel sube, cae o se estabiliza.'}
              />
            </div>
            <InfoCard title={locale === 'en' ? 'Read' : 'Lectura'} info={locale === 'en' ? 'Short interpretation of the recent trend.' : 'Interpretación resumida de la tendencia reciente.'}>
              {trend.scoreDelta >= 0
                ? (locale === 'en' ? 'Your recent performance is improving. The next priority is to hold that quality without falling back into the same early-game errors.' : 'Tu rendimiento reciente viene mejorando. La prioridad ahora es sostener la calidad sin volver a los errores del early.')
                : (locale === 'en' ? 'Your recent block dropped. Before adding complexity, the main problem needs to be stabilized first.' : 'Tu tramo reciente cayó. Antes de sumar complejidad, conviene estabilizar el problema principal.')}
            </InfoCard>
          </div>
        </Card>
      </section>
    </div>
  );
}

function SpotlightMetric({ label, value, caption, info }: { label: string; value: string; caption: string; info: string }) {
  return (
    <div style={headlineMetricStyle}>
      <div style={{ display: 'flex', alignItems: 'center', color: '#8b96aa', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
        {label}
        <InfoHint text={info} />
      </div>
      <div style={{ fontSize: 20, fontWeight: 800, lineHeight: 1.2 }}>{value}</div>
      <div style={{ color: '#8f9aad', fontSize: 13, lineHeight: 1.6 }}>{caption}</div>
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

const aiButtonStyle = {
  border: 0,
  padding: '12px 14px',
  borderRadius: 12,
  background: '#d8fdf1',
  color: '#05111e',
  fontWeight: 800,
  cursor: 'pointer'
} as const;

const feedbackButtonStyle = {
  border: '1px solid rgba(255,255,255,0.08)',
  padding: '9px 11px',
  borderRadius: 10,
  background: '#0a0f18',
  color: '#dfe8f6',
  fontWeight: 700,
  cursor: 'pointer'
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

const signalCardStyle = {
  display: 'grid',
  gap: 12,
  padding: '14px 15px',
  borderRadius: 16,
  background: '#090e16',
  border: '1px solid rgba(255,255,255,0.05)'
} as const;

const signalActionStyle = {
  padding: '10px 11px',
  borderRadius: 12,
  background: 'rgba(103,214,164,0.08)',
  border: '1px solid rgba(103,214,164,0.12)',
  color: '#dff7eb',
  lineHeight: 1.6
} as const;

const reviewMatchStyle = {
  display: 'grid',
  gap: 10,
  padding: '14px 15px',
  borderRadius: 16,
  background: '#090e16',
  border: '1px solid rgba(255,255,255,0.05)'
} as const;
