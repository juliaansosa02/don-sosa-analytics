import type { PropsWithChildren } from 'react';
import { Badge, Card, ChampionAvatar, ChampionIdentity, InfoHint, TrendIndicator, type TrendDirection, type TrendTone } from '../../components/ui';
import type { AICoachResult, Dataset } from '../../types';
import { formatDecimal, formatInteger } from '../../lib/format';
import type { Locale } from '../../lib/i18n';
import { formatChampionName } from '../../lib/lol';

type TrendSignal = { direction: TrendDirection; tone: TrendTone; label?: string };
type MatchEntry = Dataset['matches'][number];

const t = (locale: Locale, es: string, en: string) => locale === 'en' ? en : es;
const avg = (values: number[]) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;

function delta(value: number | null | undefined, suffix = '', digits = 1) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return '—';
  const rounded = Number(value.toFixed(digits));
  const formatted = digits === 0 ? formatInteger(Math.abs(rounded)) : formatDecimal(Math.abs(rounded), digits);
  return `${rounded >= 0 ? '+' : '-'}${formatted}${suffix}`;
}

function signal(deltaValue: number | null | undefined, positiveWhen: 'up' | 'down' = 'up', threshold = 0.25): TrendSignal {
  if (typeof deltaValue !== 'number' || !Number.isFinite(deltaValue) || Math.abs(deltaValue) < threshold) {
    return { direction: 'steady', tone: 'neutral' };
  }

  const direction: TrendDirection = deltaValue > 0 ? 'up' : 'down';
  const improved = positiveWhen === 'up' ? deltaValue > 0 : deltaValue < 0;
  return { direction, tone: improved ? 'positive' : 'negative' };
}

function withSteadyLabel(trend: TrendSignal, steadyLabel: string, movingLabel?: string): TrendSignal {
  if (trend.direction === 'steady') return { ...trend, label: steadyLabel };
  return movingLabel ? { ...trend, label: movingLabel } : trend;
}

function reviewCue(dataset: Dataset, match: MatchEntry, locale: Locale) {
  if (match.timeline.deathsPre14 >= 3) return t(locale, 'Revisá la primera muerte que te saca del mapa. Ahí suele romperse la partida.', 'Review the first death that removes you from the map. That is often where the game starts breaking.');
  if (match.timeline.csAt15 < dataset.summary.avgCsAt15 - 12) return t(locale, 'La economía temprana se quedó corta. Mirá el primer reset o desvío que te corta el ingreso.', 'Your early economy fell short. Look at the first reset or detour that cuts your income.');
  if (match.timeline.objectiveFightDeaths > 0) return t(locale, 'La revisión clave está en la ventana de objetivo: setup, reset y quién llega primero.', 'The key review lives in the objective window: setup, reset timing and who arrives first.');
  return t(locale, 'Usala como partida espejo para comparar tempo y calidad de decisiones contra tu bloque actual.', 'Use it as a mirror game to compare tempo and decision quality against your current block.');
}

function reviewTag(dataset: Dataset, match: MatchEntry, locale: Locale) {
  if (match.timeline.deathsPre14 >= 3) return { label: t(locale, 'Early castigado', 'Early punished'), tone: 'high' as const };
  if (match.timeline.csAt15 < dataset.summary.avgCsAt15 - 12) return { label: t(locale, 'Economía rota', 'Economy cut'), tone: 'medium' as const };
  if (match.timeline.objectiveFightDeaths > 0) return { label: t(locale, 'Setup de objetivo', 'Objective setup'), tone: 'medium' as const };
  return { label: t(locale, 'Partida espejo', 'Mirror game'), tone: 'default' as const };
}

function infoTone(priority: string) {
  if (priority === 'high') return 'high' as const;
  if (priority === 'low') return 'low' as const;
  return 'medium' as const;
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
  const trend = summary.coaching.trend;
  const championAnchor = summary.championPool[0];
  const problematicMatchup = summary.problematicMatchup;
  const topProblems = summary.coaching.topProblems;
  const activePlan = summary.coaching.activePlan;
  const reviewQueue = [...dataset.matches].sort((a, b) => b.gameCreation - a.gameCreation).filter((match) => !match.win || match.timeline.deathsPre14 >= 2 || match.timeline.objectiveFightDeaths > 0).slice(0, 3);
  const positives = summary.insights.filter((insight) => insight.category === 'positive').slice(0, 2);
  const stableMatches = dataset.matches.filter((match) => match.timeline.deathsPre14 <= summary.avgDeathsPre14 && match.timeline.csAt15 >= summary.avgCsAt15);
  const stableWinRate = stableMatches.length ? (stableMatches.filter((match) => match.win).length / stableMatches.length) * 100 : null;
  const recent = [...dataset.matches].sort((a, b) => a.gameCreation - b.gameCreation).slice(-Math.min(8, dataset.matches.length || 1));
  const baseline = [...dataset.matches].sort((a, b) => a.gameCreation - b.gameCreation).slice(0, Math.max(1, dataset.matches.length - recent.length));
  const goldDelta = avg(recent.map((match) => match.timeline.goldAt15)) - avg(baseline.map((match) => match.timeline.goldAt15));
  const kpDelta = avg(recent.map((match) => match.killParticipation)) - avg(baseline.map((match) => match.killParticipation));
  const recentScoreAvg = avg(recent.map((match) => match.score.total));
  const baselineScoreAvg = avg(baseline.map((match) => match.score.total));
  const consistencyDelta =
    (100 - avg(recent.map((match) => Math.abs(match.score.total - recentScoreAvg)))) -
    (100 - avg(baseline.map((match) => Math.abs(match.score.total - baselineScoreAvg))));
  const mainProblem = topProblems[0] ?? null;
  const mainTitle = aiCoach?.coach.mainLeak ?? mainProblem?.problem ?? summary.coaching.headline;
  const mainSummary = aiCoach?.coach.summary ?? mainProblem?.title ?? summary.coaching.subheadline;
  const mainCause = aiCoach?.coach.whyItHappens ?? mainProblem?.cause ?? null;
  const todayActions = (aiCoach?.coach.whatToDoNext3Games?.length ? aiCoach.coach.whatToDoNext3Games : mainProblem?.actions ?? []).slice(0, 3);
  const steadyLabel = t(locale, 'estable', 'stable');

  const metricCards = [
    { label: t(locale, 'WR reciente', 'Recent win rate'), value: `${formatDecimal(summary.winRate)}%`, detail: `${formatDecimal(trend.baselineWinRate)}% -> ${formatDecimal(trend.recentWinRate)}%`, trend: withSteadyLabel(signal(trend.winRateDelta, 'up', 1), steadyLabel, delta(trend.winRateDelta, ' pts')) },
    { label: t(locale, 'Rendimiento', 'Performance'), value: formatDecimal(summary.avgPerformanceScore), detail: `${formatDecimal(trend.baselineScore)} -> ${formatDecimal(trend.recentScore)}`, trend: withSteadyLabel(signal(trend.scoreDelta, 'up', 0.25), steadyLabel, delta(trend.scoreDelta)) },
    { label: 'CS@15', value: formatDecimal(summary.avgCsAt15), detail: `${formatDecimal(trend.baselineCsAt15)} -> ${formatDecimal(trend.recentCsAt15)}`, trend: withSteadyLabel(signal(trend.csAt15Delta, 'up', 1), steadyLabel, delta(trend.csAt15Delta)) },
    { label: 'Gold@15', value: formatInteger(summary.avgGoldAt15), detail: `${formatInteger(avg(baseline.map((match) => match.timeline.goldAt15)))} -> ${formatInteger(avg(recent.map((match) => match.timeline.goldAt15)))}`, trend: withSteadyLabel(signal(goldDelta, 'up', 120), steadyLabel, delta(goldDelta, '', 0)) },
    { label: t(locale, 'Consistencia', 'Consistency'), value: formatDecimal(summary.consistencyIndex), detail: t(locale, 'variación reciente del bloque', 'recent block variation'), trend: withSteadyLabel(signal(consistencyDelta, 'up', 1.5), steadyLabel, delta(consistencyDelta)) },
    { label: t(locale, 'Muertes pre14', 'Deaths pre14'), value: formatDecimal(summary.avgDeathsPre14), detail: `${formatDecimal(trend.baselineDeathsPre14)} -> ${formatDecimal(trend.recentDeathsPre14)}`, trend: withSteadyLabel(signal(trend.deathsPre14Delta, 'down', 0.15), steadyLabel, delta(trend.deathsPre14Delta)) },
    { label: 'KP', value: `${formatDecimal(summary.avgKillParticipation)}%`, detail: `${formatDecimal(avg(baseline.map((match) => match.killParticipation)))}% -> ${formatDecimal(avg(recent.map((match) => match.killParticipation)))}%`, trend: withSteadyLabel(signal(kpDelta, 'up', 2), steadyLabel, delta(kpDelta, ' pts')) }
  ];

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <Card title={t(locale, 'Lectura principal', 'Core coaching read')} subtitle={t(locale, 'Una lectura más clara del bloque actual: qué sube, qué cede y qué conviene sostener hoy.', 'A clearer read of the current block: what is rising, what is slipping and what you should sustain today.')}>
        <div className="coaching-hero-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.45fr) minmax(320px, 0.95fr)', gap: 16 }}>
          <div style={{ display: 'grid', gap: 14 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {mainProblem ? <Badge tone={infoTone(mainProblem.priority)}>{t(locale, `Prioridad ${mainProblem.priority}`, `${mainProblem.priority} priority`)}</Badge> : null}
              {aiCoach ? <Badge tone="default">{`${Math.round(aiCoach.coach.confidence * 100)}% ${t(locale, 'confianza', 'confidence')}`}</Badge> : null}
              {aiCoach?.continuity.mode === 'reused' ? <Badge tone="default">{t(locale, 'Bloque reutilizado', 'Reused block')}</Badge> : null}
              {aiCoach?.continuity.mode === 'updated' ? <Badge tone="low">{t(locale, `+${aiCoach.continuity.newVisibleMatches} nuevas`, `+${aiCoach.continuity.newVisibleMatches} new`)}</Badge> : null}
            </div>
            <div style={{ color: '#eef4ff', fontSize: 32, fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1.05 }}>{mainTitle}</div>
            <div style={{ color: '#a6b3c6', fontSize: 15, lineHeight: 1.75 }}>{mainSummary}</div>
            {mainCause ? <div style={panelStyle}><SectionEyebrow title={t(locale, 'Por qué aparece', 'Why it shows up')} /><div style={{ color: '#dfe7f4', lineHeight: 1.7 }}>{mainCause}</div></div> : null}
            {aiCoachError ? <div style={errorStyle}>{aiCoachError}</div> : null}
            <div style={{ display: 'grid', gap: 8 }}>
              <SectionEyebrow title={t(locale, 'Qué hago hoy', 'What to do today')} />
              {todayActions.length ? todayActions.map((action, index) => (
                <div key={action} style={stepStyle}>
                  <div style={stepIndexStyle}>{index + 1}</div>
                  <div style={{ color: '#e8eef9', lineHeight: 1.65 }}>{action}</div>
                </div>
              )) : <div style={emptyStyle}>{t(locale, 'Todavía no hay una acción clara. Sumá muestra o refrescá el coaching.', 'There is no clear action yet. Add sample or refresh coaching.')}</div>}
            </div>
          </div>
          <div style={{ display: 'grid', gap: 12 }}>
            <div style={panelStyle}>
              <SectionEyebrow title={t(locale, 'Bloque actual', 'Current block')} />
              {activePlan ? (
                <div style={{ display: 'grid', gap: 10 }}>
                  <div style={{ color: '#eef4ff', fontSize: 22, fontWeight: 800, lineHeight: 1.2 }}>{activePlan.objective}</div>
                  <div style={{ color: '#a4afc1', lineHeight: 1.6 }}>{activePlan.focus}</div>
                  <div style={{ display: 'grid', gap: 8 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', color: '#d7dfec', fontSize: 13 }}><span>{t(locale, 'Progreso', 'Progress')}</span><span>{activePlan.successLabel}</span></div>
                    <div style={trackStyle}><div style={{ ...fillStyle, width: `${activePlan.progressPercent}%` }} /></div>
                    <div style={{ color: '#8fa0b7', fontSize: 13 }}>{t(locale, `${activePlan.completedGames}/${activePlan.targetGames} partidas cuentan para este bloque.`, `${activePlan.completedGames}/${activePlan.targetGames} games count toward this block.`)}</div>
                  </div>
                </div>
              ) : <div style={{ color: '#d7dfec', lineHeight: 1.7 }}>{t(locale, 'Todavía no hay un ciclo suficientemente claro. Conviene sumar muestra limpia o cerrar el scope.', 'There is not a clear enough cycle yet. Add cleaner sample or narrow the scope.')}</div>}
              <button type="button" style={buttonStyle} onClick={onGenerateAICoach} disabled={!onGenerateAICoach || generatingAICoach}>{generatingAICoach ? t(locale, 'Actualizando coaching...', 'Refreshing coaching...') : t(locale, 'Actualizar coaching', 'Refresh coaching')}</button>
            </div>

            <div className="coaching-meta-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
              <MetaStat label={t(locale, 'Muestra', 'Sample')} value={`${summary.matches}`} caption={t(locale, 'partidas guardadas', 'saved matches')} />
              <MetaStat label={t(locale, 'Pick ancla', 'Anchor pick')} value={championAnchor ? formatChampionName(championAnchor.championName) : t(locale, 'Sin señal', 'No signal')} caption={championAnchor ? `${formatDecimal(championAnchor.winRate)}% WR` : t(locale, 'falta muestra', 'needs sample')} />
              <MetaStat label={t(locale, 'Patrón estable', 'Stable pattern')} value={stableWinRate !== null ? `${formatDecimal(stableWinRate)}% WR` : t(locale, 'Sin señal', 'No signal')} caption={stableMatches.length ? t(locale, `${stableMatches.length} partidas limpias`, `${stableMatches.length} clean games`) : t(locale, 'todavía sin bloque limpio', 'no clean block yet')} />
              <MetaStat label="Matchup" value={problematicMatchup ? `vs ${formatChampionName(problematicMatchup.opponentChampionName)}` : t(locale, 'Sin alerta', 'No alert')} caption={problematicMatchup ? t(locale, `${problematicMatchup.recentLosses} derrotas recientes`, `${problematicMatchup.recentLosses} recent losses`) : t(locale, 'sin cruce repetido', 'no repeated losing cross')} />
            </div>

            {onSendFeedback && aiCoach ? <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              <button type="button" style={feedbackStyle} onClick={() => onSendFeedback('useful')}>{t(locale, 'Útil', 'Useful')}</button>
              <button type="button" style={feedbackStyle} onClick={() => onSendFeedback('mixed')}>{t(locale, 'Mixto', 'Mixed')}</button>
              <button type="button" style={feedbackStyle} onClick={() => onSendFeedback('generic')}>{t(locale, 'Genérico', 'Generic')}</button>
              <button type="button" style={feedbackStyle} onClick={() => onSendFeedback('incorrect')}>{t(locale, 'Incorrecto', 'Incorrect')}</button>
            </div> : null}
          </div>
        </div>

        <div style={{ display: 'grid', gap: 10, marginTop: 18 }}>
          <SectionEyebrow title={t(locale, 'Señales rápidas', 'Quick signals')} />
          <div className="coaching-signal-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 12 }}>
            {metricCards.map((metric) => <SignalTile key={metric.label} {...metric} />)}
          </div>
        </div>
      </Card>

      <section className="two-col-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1fr) minmax(320px, 1fr)', gap: 16 }}>
        <Card title={t(locale, 'Qué ya te está dando nivel', 'What is already giving you level')} subtitle={t(locale, 'No todo es corregir. Esto ya suma y conviene repetirlo sin meter ruido.', 'Not everything is about fixing issues. These are already adding level and should be repeated without extra noise.')}>
          <div style={{ display: 'grid', gap: 12 }}>
            {positives.length ? positives.map((insight) => (
              <div key={insight.id} style={panelStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'start', flexWrap: 'wrap' }}>
                  <div style={{ display: 'grid', gap: 6 }}>
                    <div style={{ color: '#eef4ff', fontSize: 20, fontWeight: 800, lineHeight: 1.2 }}>{insight.problem}</div>
                    <div style={{ color: '#9aa5b7', lineHeight: 1.6 }}>{insight.title}</div>
                  </div>
                  <Badge tone="low">{t(locale, 'Sostener', 'Keep')}</Badge>
                </div>
                {insight.actions.slice(0, 2).map((action) => <div key={action} style={actionStyle}>{action}</div>)}
              </div>
            )) : <div style={emptyStyle}>{t(locale, 'Todavía no aparece una fortaleza clara en este scope.', 'There is no clear strength in this scope yet.')}</div>}
          </div>
        </Card>

        <Card title={t(locale, 'Sesión de revisión', 'Review session')} subtitle={t(locale, 'Abrí una de estas antes de volver a jugar. La idea es mirar poco, pero con foco.', 'Open one of these before queueing again. The goal is to review less, but with focus.')}>
          <div style={{ display: 'grid', gap: 10 }}>
            {reviewQueue.length ? reviewQueue.map((match) => {
              const tag = reviewTag(dataset, match, locale);
              return (
                <div key={match.matchId} style={panelStyle}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'start', flexWrap: 'wrap' }}>
                    <ChampionIdentity championName={match.championName} version={dataset.ddragonVersion} subtitle={new Date(match.gameCreation).toLocaleDateString(locale === 'en' ? 'en-US' : 'es-AR')} size={52} />
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <Badge tone={tag.tone}>{tag.label}</Badge>
                      <Badge tone={match.win ? 'low' : 'high'}>{match.win ? t(locale, 'Victoria', 'Win') : t(locale, 'Derrota', 'Loss')}</Badge>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <Badge>{`${formatDecimal(match.timeline.csAt15)} CS@15`}</Badge>
                    <Badge>{t(locale, `${formatDecimal(match.timeline.deathsPre14)} muertes pre14`, `${formatDecimal(match.timeline.deathsPre14)} deaths pre14`)}</Badge>
                    {match.opponentChampionName ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}><ChampionAvatar championName={match.opponentChampionName} version={dataset.ddragonVersion} size={24} radius={8} /><Badge>{`vs ${formatChampionName(match.opponentChampionName)}`}</Badge></span> : null}
                  </div>
                  <div style={{ color: '#9aa5b7', lineHeight: 1.65 }}>{reviewCue(dataset, match, locale)}</div>
                </div>
              );
            }) : <div style={emptyStyle}>{t(locale, 'Todavía no hay una cola de revisión clara.', 'There is no clear review queue yet.')}</div>}
          </div>
        </Card>
      </section>
      <section className="two-col-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1fr) minmax(320px, 1fr)', gap: 16 }}>
        <Card title={t(locale, 'Pick ancla', 'Anchor pick')} subtitle={t(locale, 'Cómo leer el campeón que hoy más peso tiene en tu muestra.', 'How to read the champion carrying the most weight in your sample today.')}>
          {championAnchor ? (
            <div style={{ display: 'grid', gap: 14 }}>
              <div style={panelStyle}>
                <ChampionIdentity championName={championAnchor.championName} version={dataset.ddragonVersion} subtitle={t(locale, `${championAnchor.games} partidas · ${formatDecimal(championAnchor.winRate)}% WR`, `${championAnchor.games} matches · ${formatDecimal(championAnchor.winRate)}% WR`)} meta={<span style={chipStyle}><TrendIndicator direction={signal(championAnchor.winRate - summary.winRate, 'up', 3).direction} tone={signal(championAnchor.winRate - summary.winRate, 'up', 3).tone} /><span>{signal(championAnchor.winRate - summary.winRate, 'up', 3).direction === 'steady' ? t(locale, 'estable', 'stable') : signal(championAnchor.winRate - summary.winRate, 'up', 3).tone === 'positive' ? t(locale, 'mejora', 'improving') : t(locale, 'riesgo', 'slipping')}</span></span>} size={60} />
              </div>
              <div className="coaching-meta-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
                <MetaStat label="WR" value={`${formatDecimal(championAnchor.winRate)}%`} />
                <MetaStat label="CS@15" value={formatDecimal(championAnchor.avgCsAt15)} />
                <MetaStat label="Gold@15" value={formatInteger(championAnchor.avgGoldAt15)} />
                <MetaStat label={t(locale, 'Muertes pre14', 'Deaths pre14')} value={formatDecimal(championAnchor.avgDeathsPre14)} />
              </div>
              <div style={panelStyle}><SectionEyebrow title={t(locale, 'Señal del pick', 'Pick signal')} /><div style={{ color: '#dfe7f4', lineHeight: 1.7 }}>{problematicMatchup ? t(locale, `La mejora con ${formatChampionName(championAnchor.championName)} hoy pasa por estabilizar el cruce que más te rompe el plan.`, `The next step with ${formatChampionName(championAnchor.championName)} is to stabilize the matchup that is breaking your plan.`) : t(locale, 'Hoy este pick funciona como línea base para revisar recalls, primeras rotaciones y entrada al mid game.', 'Today this pick works as your baseline to review recalls, first rotations and entry into mid game.')}</div></div>
            </div>
          ) : <div style={emptyStyle}>{t(locale, 'Todavía no hay suficiente muestra para leer un pick ancla claro.', 'There is not enough sample yet to read a clear anchor pick.')}</div>}
        </Card>

        <Card title={t(locale, 'El cruce que hoy más te castiga', 'The matchup hurting you most right now')} subtitle={t(locale, 'Si se repite, deja de ser mala suerte y pasa a ser preparación concreta.', 'If it repeats, it stops being bad luck and becomes concrete preparation work.')}>
          {problematicMatchup ? (
            <div style={{ display: 'grid', gap: 14 }}>
              <div className="two-col-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
                <InfoBlock title={t(locale, 'Tu pick en este scope', 'Your pick in this scope')} info={t(locale, 'El campeón reciente más jugado dentro del scope activo.', 'Your most played recent champion inside the active scope.')}><ChampionIdentity championName={problematicMatchup.championName} version={dataset.ddragonVersion} subtitle={t(locale, `${problematicMatchup.recentGames} partidas recientes · ${formatDecimal(problematicMatchup.recentWinRate)}% WR`, `${problematicMatchup.recentGames} recent games · ${formatDecimal(problematicMatchup.recentWinRate)}% WR`)} size={58} /></InfoBlock>
                <InfoBlock title={t(locale, 'Rival que más te duele', 'Opponent hurting you most')} info={t(locale, 'El pick rival con peor resultado reciente en el mismo scope.', 'The opponent pick with the worst recent result in the same scope.')}><ChampionIdentity championName={problematicMatchup.opponentChampionName} version={dataset.ddragonVersion} subtitle={problematicMatchup.directGames ? t(locale, `${problematicMatchup.directGames} cruces directos`, `${problematicMatchup.directGames} direct games`) : t(locale, `${problematicMatchup.recentGames} partidas del scope`, `${problematicMatchup.recentGames} scoped games`)} meta={problematicMatchup.directWinRate !== null ? <Badge tone="high">{`${formatDecimal(problematicMatchup.directWinRate)}% WR`}</Badge> : null} size={58} /></InfoBlock>
              </div>
              <div style={panelStyle}><div style={{ color: '#eef4ff', fontSize: 20, fontWeight: 800, lineHeight: 1.2 }}>{t(locale, `${formatChampionName(problematicMatchup.championName)} contra ${formatChampionName(problematicMatchup.opponentChampionName)}`, `${formatChampionName(problematicMatchup.championName)} into ${formatChampionName(problematicMatchup.opponentChampionName)}`)}</div><div style={{ color: '#9aa5b7', lineHeight: 1.7 }}>{problematicMatchup.summary}</div></div>
              <div className="four-col-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12 }}>
                <SignalTile label={t(locale, 'WR del cruce', 'Matchup WR')} value={`${formatDecimal(problematicMatchup.directWinRate ?? problematicMatchup.recentWinRate)}%`} detail={problematicMatchup.directWinRate !== null ? t(locale, 'muestra directa', 'direct sample') : t(locale, 'muestra del scope', 'scoped sample')} trend={{ ...signal((problematicMatchup.directWinRate ?? problematicMatchup.recentWinRate) - summary.winRate, 'up', 3), label: t(locale, 'vs tu media', 'vs your average') }} />
                <SignalTile label="Gold@15" value={delta(problematicMatchup.avgGoldDiffAt15, '', 0)} detail={t(locale, 'oro vs rival', 'gold vs opponent')} trend={{ ...signal(problematicMatchup.avgGoldDiffAt15, 'up', 75), label: t(locale, 'a favor / en contra', 'ahead / behind') }} />
                <SignalTile label={t(locale, 'Nivel@15', 'Level@15')} value={delta(problematicMatchup.avgLevelDiffAt15)} detail={t(locale, 'nivel vs rival', 'level vs opponent')} trend={{ ...signal(problematicMatchup.avgLevelDiffAt15, 'up', 0.2), label: t(locale, 'a favor / en contra', 'ahead / behind') }} />
                <SignalTile label={t(locale, 'Muertes pre14', 'Deaths pre14')} value={formatDecimal(problematicMatchup.avgDeathsPre14)} detail={t(locale, 'comparado con tu media', 'compared to your average')} trend={{ ...signal(problematicMatchup.avgDeathsPre14 - summary.avgDeathsPre14, 'down', 0.15), label: t(locale, 'menos es mejor', 'lower is better') }} />
              </div>
              {problematicMatchup.adjustments.slice(0, 3).map((adjustment) => <div key={adjustment} style={actionStyle}>{adjustment}</div>)}
            </div>
          ) : <div style={emptyStyle}>{t(locale, 'Todavía no aparece un matchup perdedor suficientemente repetido dentro de este scope.', 'There is no repeated losing matchup strong enough inside this scope yet.')}</div>}
        </Card>
      </section>

      <section className="two-col-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(320px, 1fr) minmax(320px, 1fr)', gap: 16 }}>
        <Card title={t(locale, 'Señales de progreso', 'Progress signals')} subtitle={t(locale, 'Qué está mejorando, qué sigue estable y dónde todavía hay riesgo en el tramo reciente.', 'What is improving, what is staying stable and where the recent stretch still carries risk.')}>
          <div style={{ display: 'grid', gap: 12 }}>
            <div style={panelStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'start', flexWrap: 'wrap' }}>
                <div style={{ display: 'grid', gap: 6 }}>
                  <div style={{ color: '#eef4ff', fontSize: 20, fontWeight: 800, lineHeight: 1.2 }}>{signal(trend.scoreDelta, 'up', 0.25).tone === 'positive' ? t(locale, 'El bloque reciente viene mejorando', 'The recent block is improving') : signal(trend.scoreDelta, 'up', 0.25).tone === 'negative' ? t(locale, 'El bloque reciente viene cediendo', 'The recent block is slipping') : t(locale, 'El bloque reciente está parejo', 'The recent block is staying steady')}</div>
                  <div style={{ color: '#9aa5b7', lineHeight: 1.6 }}>{signal(trend.scoreDelta, 'up', 0.25).tone === 'positive' ? t(locale, 'La prioridad ahora es sostener la mejora sin volver a abrir el mismo error temprano.', 'The next priority is to hold the improvement without reopening the same early error.') : signal(trend.scoreDelta, 'up', 0.25).tone === 'negative' ? t(locale, 'Antes de sumar complejidad, conviene estabilizar otra vez el problema principal.', 'Before adding complexity, stabilize the main issue again.') : t(locale, 'No hay un salto fuerte ni una caída fuerte: el foco es consolidar consistencia.', 'There is no sharp jump or drop: the focus is to consolidate consistency.')}</div>
                </div>
                <span style={chipStyle}><TrendIndicator direction={signal(trend.scoreDelta, 'up', 0.25).direction} tone={signal(trend.scoreDelta, 'up', 0.25).tone} /><span>{signal(trend.scoreDelta, 'up', 0.25).direction === 'steady' ? t(locale, 'estable', 'stable') : signal(trend.scoreDelta, 'up', 0.25).tone === 'positive' ? t(locale, 'mejora', 'improving') : t(locale, 'riesgo', 'slipping')}</span></span>
              </div>
            </div>
            <ProgressRow label={t(locale, 'Rendimiento', 'Performance')} baseline={formatDecimal(trend.baselineScore)} recent={formatDecimal(trend.recentScore)} trend={signal(trend.scoreDelta, 'up', 0.25)} locale={locale} />
            <ProgressRow label="WR" baseline={`${formatDecimal(trend.baselineWinRate)}%`} recent={`${formatDecimal(trend.recentWinRate)}%`} trend={signal(trend.winRateDelta, 'up', 1)} locale={locale} />
            <ProgressRow label="CS@15" baseline={formatDecimal(trend.baselineCsAt15)} recent={formatDecimal(trend.recentCsAt15)} trend={signal(trend.csAt15Delta, 'up', 1)} locale={locale} />
            <ProgressRow label={t(locale, 'Muertes pre14', 'Deaths pre14')} baseline={formatDecimal(trend.baselineDeathsPre14)} recent={formatDecimal(trend.recentDeathsPre14)} trend={signal(trend.deathsPre14Delta, 'down', 0.15)} locale={locale} />
            <ProgressRow label={t(locale, 'Patrón estable', 'Stable pattern')} baseline={`${formatDecimal(summary.winRate)}% WR`} recent={stableWinRate !== null ? `${formatDecimal(stableWinRate)}% WR` : t(locale, 'sin señal', 'no signal')} trend={stableWinRate !== null ? signal(stableWinRate - summary.winRate, 'up', 3) : signal(null)} locale={locale} />
          </div>
        </Card>

        <Card title={t(locale, 'Prioridades del bloque', 'Block priorities')} subtitle={t(locale, 'Menos párrafo, más estructura: qué te frena hoy y qué conviene hacer con eso.', 'Less paragraph, more structure: what is holding you back today and what to do with it.')}>
          <div style={{ display: 'grid', gap: 12 }}>
            {topProblems.length ? topProblems.map((problem, index) => (
              <div key={problem.id} style={{ ...panelStyle, borderColor: problem.priority === 'high' ? 'rgba(255,107,107,0.18)' : problem.priority === 'low' ? 'rgba(103,214,164,0.16)' : 'rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'start', flexWrap: 'wrap' }}>
                  <div style={{ display: 'grid', gap: 6 }}>
                    <div style={{ color: '#8e9cb0', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{t(locale, `Bloque ${index + 1}`, `Block ${index + 1}`)}</div>
                    <div style={{ color: '#eef4ff', fontSize: 22, fontWeight: 800, lineHeight: 1.15 }}>{problem.problem}</div>
                    <div style={{ color: '#9aa5b7', lineHeight: 1.6 }}>{problem.title}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <Badge tone={infoTone(problem.priority)}>{t(locale, `Prioridad ${problem.priority}`, `${problem.priority} priority`)}</Badge>
                    <Badge>{problem.category}</Badge>
                  </div>
                </div>
                <div className="two-col-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
                  <InfoBlock title={t(locale, 'Impacto', 'Impact')} info={t(locale, 'Cómo pega este patrón en tus resultados.', 'How hard this pattern hits your results.')}>{problem.impact}</InfoBlock>
                  <InfoBlock title={t(locale, 'Causa', 'Cause')} info={t(locale, 'Qué está explicando mejor el patrón actual.', 'What best explains the current pattern.')}>{problem.cause}</InfoBlock>
                </div>
                <SectionEyebrow title={t(locale, 'Se ve en', 'Shows up in')} />
                {problem.evidence.slice(0, 2).map((item) => <div key={item} style={listStyle}>{item}</div>)}
                <SectionEyebrow title={t(locale, 'Qué hacer hoy', 'What to do today')} />
                {problem.actions.slice(0, 2).map((action) => <div key={action} style={actionStyle}>{action}</div>)}
              </div>
            )) : <div style={emptyStyle}>{t(locale, 'Todavía no hay prioridades claras para este bloque.', 'There are no clear priorities for this block yet.')}</div>}
          </div>
        </Card>
      </section>
    </div>
  );
}

function SignalTile({ label, value, detail, trend }: { label: string; value: string; detail: string; trend: TrendSignal }) {
  return (
    <div style={tileStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'start' }}>
        <div style={{ color: '#8b96aa', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
        <TrendIndicator direction={trend.direction} tone={trend.tone} label={trend.label} />
      </div>
      <div style={{ color: '#eef4ff', fontSize: 24, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.08 }}>{value}</div>
      <div style={{ color: '#8f9aad', fontSize: 13, lineHeight: 1.6 }}>{detail}</div>
    </div>
  );
}

function MetaStat({ label, value, caption }: { label: string; value: string; caption?: string }) {
  return (
    <div style={metaStyle}>
      <div style={{ color: '#8c98ad', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
      <div style={{ color: '#eef4ff', fontSize: 20, fontWeight: 800, lineHeight: 1.15 }}>{value}</div>
      {caption ? <div style={{ color: '#8e9cb0', fontSize: 13, lineHeight: 1.55 }}>{caption}</div> : null}
    </div>
  );
}

function ProgressRow({ label, baseline, recent, trend, locale }: { label: string; baseline: string; recent: string; trend: TrendSignal; locale: Locale }) {
  return (
    <div style={progressRowStyle}>
      <div style={{ display: 'grid', gap: 4 }}>
        <div style={{ color: '#eef4ff', fontWeight: 700 }}>{label}</div>
        <div style={{ color: '#8f9aad', fontSize: 13 }}>{`${baseline} -> ${recent}`}</div>
      </div>
      <TrendIndicator direction={trend.direction} tone={trend.tone} label={trend.direction === 'steady' ? t(locale, 'estable', 'stable') : undefined} />
    </div>
  );
}

function SectionEyebrow({ title }: { title: string }) {
  return <div style={{ color: '#8d9ab0', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{title}</div>;
}

function InfoBlock({ title, info, children }: PropsWithChildren<{ title: string; info: string }>) {
  return (
    <div style={infoStyle}>
      <div style={{ display: 'flex', alignItems: 'center', color: '#93a0b4', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }}>
        {title}
        <InfoHint text={info} />
      </div>
      <div style={{ color: '#edf2ff', lineHeight: 1.6 }}>{children}</div>
    </div>
  );
}

const panelStyle = { display: 'grid', gap: 12, padding: '16px 16px', borderRadius: 18, background: 'linear-gradient(180deg, rgba(10, 15, 24, 0.98), rgba(7, 11, 17, 0.98))', border: '1px solid rgba(255,255,255,0.05)' } as const;
const tileStyle = { display: 'grid', gap: 8, padding: '15px 16px', borderRadius: 16, background: 'linear-gradient(180deg, rgba(11, 15, 24, 0.98), rgba(7, 10, 16, 0.98))', border: '1px solid rgba(255,255,255,0.05)' } as const;
const metaStyle = { display: 'grid', gap: 8, padding: '14px 14px', borderRadius: 16, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' } as const;
const infoStyle = { padding: 15, borderRadius: 16, background: 'linear-gradient(180deg, rgba(11, 15, 24, 0.98), rgba(7, 10, 16, 0.98))', border: '1px solid rgba(255,255,255,0.05)' } as const;
const stepStyle = { display: 'grid', gridTemplateColumns: '28px minmax(0, 1fr)', gap: 10, alignItems: 'start', padding: '11px 12px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' } as const;
const stepIndexStyle = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 999, background: 'rgba(216,253,241,0.08)', border: '1px solid rgba(216,253,241,0.12)', color: '#d8fdf1', fontSize: 13, fontWeight: 800 } as const;
const emptyStyle = { padding: '14px 15px', borderRadius: 16, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', color: '#c7d4ea', lineHeight: 1.65 } as const;
const errorStyle = { padding: '12px 14px', borderRadius: 14, background: 'rgba(255,107,107,0.08)', border: '1px solid rgba(255,107,107,0.12)', color: '#ffb3b3', lineHeight: 1.6 } as const;
const actionStyle = { padding: '10px 11px', borderRadius: 12, background: 'rgba(103,214,164,0.08)', border: '1px solid rgba(103,214,164,0.12)', color: '#dff7eb', lineHeight: 1.6 } as const;
const listStyle = { padding: '11px 12px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', color: '#dfe7f4', lineHeight: 1.65 } as const;
const trackStyle = { height: 12, borderRadius: 999, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' } as const;
const fillStyle = { height: '100%', borderRadius: 999, background: 'linear-gradient(90deg, #7ef5c7, #c9f6e7)' } as const;
const progressRowStyle = { display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', padding: '12px 14px', borderRadius: 14, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' } as const;
const chipStyle = { display: 'inline-flex', alignItems: 'center', gap: 7, padding: '7px 10px', borderRadius: 999, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.05)', color: '#dfe7f4', fontSize: 12, fontWeight: 700 } as const;
const buttonStyle = { border: 0, padding: '12px 14px', borderRadius: 12, background: '#d8fdf1', color: '#05111e', fontWeight: 800, cursor: 'pointer' } as const;
const feedbackStyle = { border: '1px solid rgba(255,255,255,0.08)', padding: '9px 11px', borderRadius: 10, background: '#0a0f18', color: '#dfe8f6', fontWeight: 700, cursor: 'pointer' } as const;
