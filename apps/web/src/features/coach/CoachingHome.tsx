import type { PropsWithChildren } from 'react';
import { Badge, Card, ChampionIdentity, InfoHint, TrendIndicator, type TrendDirection, type TrendTone } from '../../components/ui';
import type { AICoachResult, Dataset, RoleReferenceProfile } from '../../types';
import { formatDecimal, formatInteger } from '../../lib/format';
import type { Locale } from '../../lib/i18n';
import { formatChampionName, getProfileIconUrl } from '../../lib/lol';

type TrendSignal = { direction: TrendDirection; tone: TrendTone; label?: string };
type MatchEntry = Dataset['matches'][number];
type ReviewAgendaEntry = Dataset['summary']['reviewAgenda'][number];

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

function comparisonDetail(locale: Locale, baselineLabel: string, recentLabel: string, baselineMatches: number, recentMatches: number) {
  return locale === 'en'
    ? `Before ${baselineLabel} (${baselineMatches}) · Now ${recentLabel} (${recentMatches})`
    : `Antes ${baselineLabel} (${baselineMatches}) · Ahora ${recentLabel} (${recentMatches})`;
}

function formatKda(kills: number, deaths: number, assists: number) {
  return `${kills}/${deaths}/${assists}`;
}

function buildProfileStrengthLabel(strength?: AICoachResult['context']['player']['profileStrength'], locale: Locale = 'es') {
  if (strength === 'elite') return locale === 'en' ? 'Elite profile' : 'Perfil elite';
  if (strength === 'advanced') return locale === 'en' ? 'High-elo profile' : 'Perfil high elo';
  return locale === 'en' ? 'Improvement block' : 'Bloque de mejora';
}

function buildFallbackReviewAgenda(matches: MatchEntry[], locale: Locale): ReviewAgendaEntry[] {
  const sorted = [...matches].sort((a, b) => b.gameCreation - a.gameCreation);
  const stressed = sorted
    .filter((match) => !match.win || match.timeline.deathsPre14 >= 2 || match.timeline.objectiveFightDeaths > 0)
    .map((match) => {
      if (match.timeline.objectiveFightDeaths > 0) {
        return {
          matchId: match.matchId,
          championName: match.championName,
          opponentChampionName: match.opponentChampionName,
          gameCreation: match.gameCreation,
          win: match.win,
          kills: match.kills,
          deaths: match.deaths,
          assists: match.assists,
          cs: match.cs,
          damageToChampions: match.damageToChampions,
          killParticipation: match.killParticipation,
          performanceScore: match.score.total,
          title: t(locale, 'Revisá el minuto previo al objetivo', 'Review the minute before the objective'),
          reason: t(locale, 'La partida se rompe alrededor del setup y no solo durante la pelea.', 'The game breaks around the setup, not only during the fight.'),
          question: t(locale, '¿Qué te faltó hacer 45-60 segundos antes para no llegar apurado a la ventana?', 'What did you fail to do 45-60 seconds earlier so you would not arrive rushing the window?'),
          focus: t(locale, 'Reset, visión, orden de llegada y qué línea tenía prioridad real.', 'Reset, vision, arrival order and which lane had real priority.'),
          tags: [t(locale, 'Objetivo', 'Objective')]
        };
      }

      if (match.timeline.deathsPre14 >= 2) {
        return {
          matchId: match.matchId,
          championName: match.championName,
          opponentChampionName: match.opponentChampionName,
          gameCreation: match.gameCreation,
          win: match.win,
          kills: match.kills,
          deaths: match.deaths,
          assists: match.assists,
          cs: match.cs,
          damageToChampions: match.damageToChampions,
          killParticipation: match.killParticipation,
          performanceScore: match.score.total,
          title: t(locale, 'Encontrá la primera muerte evitable', 'Find the first avoidable death'),
          reason: t(locale, 'El early pierde jugabilidad demasiado pronto y te obliga a compensar desde atrás.', 'The early game loses playability too soon and forces you to compensate from behind.'),
          question: t(locale, '¿Qué información, recurso o cobertura faltaba antes de comprometerte?', 'What information, resource or coverage was missing before you committed?'),
          focus: t(locale, 'Primera muerte, estado del mapa y qué quedaba vivo para jugar después.', 'First death, map state and what remained playable afterward.'),
          tags: [t(locale, 'Early', 'Early')]
        };
      }

      return {
        matchId: match.matchId,
        championName: match.championName,
        opponentChampionName: match.opponentChampionName,
        gameCreation: match.gameCreation,
        win: match.win,
        kills: match.kills,
        deaths: match.deaths,
        assists: match.assists,
        cs: match.cs,
        damageToChampions: match.damageToChampions,
        killParticipation: match.killParticipation,
        performanceScore: match.score.total,
        title: t(locale, 'Aislá dónde se cortó tu economía', 'Isolate where your economy got cut'),
        reason: t(locale, 'La partida llega al 15 más débil de lo que tu rol necesita.', 'The game is reaching minute 15 weaker than your role needs.'),
        question: t(locale, '¿Qué reset, quiebre de ruta o pelea te sacó del piso económico normal del rol?', 'What reset, route break or fight pulled you off the role’s normal economy floor?'),
        focus: t(locale, 'CS@15, diff. de oro y el costo real de la jugada que aceptaste.', 'CS@15, gold diff and the real cost of the play you accepted.'),
        tags: [t(locale, 'Economía', 'Economy')]
      };
    })
    .slice(0, 2);

  const referenceGame = sorted.find((match) => match.win && match.timeline.deathsPre14 <= 1 && match.timeline.objectiveFightDeaths === 0);
  if (referenceGame && !stressed.some((item) => item.matchId === referenceGame.matchId)) {
    stressed.push({
      matchId: referenceGame.matchId,
      championName: referenceGame.championName,
      opponentChampionName: referenceGame.opponentChampionName,
      gameCreation: referenceGame.gameCreation,
      win: referenceGame.win,
      kills: referenceGame.kills,
      deaths: referenceGame.deaths,
      assists: referenceGame.assists,
      cs: referenceGame.cs,
      damageToChampions: referenceGame.damageToChampions,
      killParticipation: referenceGame.killParticipation,
      performanceScore: referenceGame.score.total,
      title: t(locale, 'Usala como partida espejo', 'Use it as a mirror game'),
      reason: t(locale, 'Acá aparece una versión más limpia del plan que querés repetir.', 'This one shows a cleaner version of the plan you want to repeat.'),
      question: t(locale, '¿Qué hiciste antes del 14 para llegar ordenado al primer objetivo?', 'What did you do before minute 14 to arrive organized to the first objective?'),
      focus: t(locale, 'Recall, primera rotación y qué pelea evitaste forzar.', 'Recall, first rotation and which fight you avoided forcing.'),
      tags: [t(locale, 'Referencia', 'Reference')]
    });
  }

  return stressed.slice(0, 3);
}

function buildScopedChampionReference(dataset: Dataset) {
  const roleScope = dataset.summary.primaryRole;
  const scopedMatches = roleScope && roleScope !== 'ALL'
    ? dataset.matches.filter((match) => match.role === roleScope)
    : dataset.matches;

  const grouped = new Map<string, MatchEntry[]>();
  for (const match of scopedMatches) {
    const list = grouped.get(match.championName) ?? [];
    list.push(match);
    grouped.set(match.championName, list);
  }

  const [championName, championMatches] = Array.from(grouped.entries())
    .sort((a, b) => b[1].length - a[1].length || b[1].filter((match) => match.win).length - a[1].filter((match) => match.win).length)[0]
    ?? [];

  if (!championName || !championMatches?.length) return dataset.summary.championPool[0] ?? null;

  return {
    championName,
    games: championMatches.length,
    winRate: avg(championMatches.map((match) => match.win ? 100 : 0)),
    avgScore: avg(championMatches.map((match) => match.score.total)),
    avgCsAt15: avg(championMatches.map((match) => match.timeline.csAt15)),
    avgGoldAt15: avg(championMatches.map((match) => match.timeline.goldAt15)),
    avgDeathsPre14: avg(championMatches.map((match) => match.timeline.deathsPre14)),
    classification: 'CORE_PICK' as const
  };
}

function infoTone(priority: string) {
  if (priority === 'high') return 'high' as const;
  if (priority === 'low') return 'low' as const;
  return 'medium' as const;
}

function interpretationLabel(value?: 'structural' | 'situational' | 'observational', locale: Locale = 'es') {
  if (value === 'structural') return locale === 'en' ? 'Structural' : 'Estructural';
  if (value === 'situational') return locale === 'en' ? 'Situational' : 'Situacional';
  if (value === 'observational') return locale === 'en' ? 'Observational' : 'Observacional';
  return null;
}

function evidenceLabel(value?: 'high' | 'medium' | 'low', locale: Locale = 'es') {
  if (value === 'high') return locale === 'en' ? 'High evidence' : 'Evidencia alta';
  if (value === 'medium') return locale === 'en' ? 'Medium evidence' : 'Evidencia media';
  if (value === 'low') return locale === 'en' ? 'Low evidence' : 'Evidencia baja';
  return null;
}

export function CoachingHome({
  dataset,
  locale = 'es',
  aiCoach,
  generatingAICoach = false,
  aiCoachError,
  onGenerateAICoach,
  onSendFeedback,
  roleReferences = [],
  roleReferencesLoading = false,
  roleReferencesError = null
}: {
  dataset: Dataset;
  locale?: Locale;
  aiCoach?: AICoachResult | null;
  generatingAICoach?: boolean;
  aiCoachError?: string | null;
  onGenerateAICoach?: () => void;
  onSendFeedback?: (verdict: 'useful' | 'mixed' | 'generic' | 'incorrect') => void;
  roleReferences?: RoleReferenceProfile[];
  roleReferencesLoading?: boolean;
  roleReferencesError?: string | null;
}) {
  const { summary } = dataset;
  const matchesByDate = [...dataset.matches].sort((a, b) => a.gameCreation - b.gameCreation);
  const suggestedRecentCount = Math.min(8, Math.max(3, Math.ceil(matchesByDate.length * 0.35)));
  const recentWindow = matchesByDate.slice(-Math.min(suggestedRecentCount, matchesByDate.length));
  const baselineWindow = matchesByDate.slice(0, Math.max(0, matchesByDate.length - recentWindow.length));
  const fallbackBaseline = baselineWindow.length ? baselineWindow : (matchesByDate.length > 1 ? matchesByDate.slice(0, matchesByDate.length - 1) : recentWindow);
  const fallbackRecent = recentWindow.length ? recentWindow : matchesByDate.slice(-1);
  const rawTrend = summary.coaching.trend ?? ({} as Dataset['summary']['coaching']['trend']);
  const trend = {
    baselineMatches: rawTrend.baselineMatches ?? fallbackBaseline.length,
    recentMatches: rawTrend.recentMatches ?? fallbackRecent.length,
    baselineScore: rawTrend.baselineScore ?? avg(fallbackBaseline.map((match) => match.score.total)),
    recentScore: rawTrend.recentScore ?? avg(fallbackRecent.map((match) => match.score.total)),
    scoreDelta: rawTrend.scoreDelta ?? (avg(fallbackRecent.map((match) => match.score.total)) - avg(fallbackBaseline.map((match) => match.score.total))),
    baselineWinRate: rawTrend.baselineWinRate ?? (fallbackBaseline.length ? (fallbackBaseline.filter((match) => match.win).length / fallbackBaseline.length) * 100 : 0),
    recentWinRate: rawTrend.recentWinRate ?? (fallbackRecent.length ? (fallbackRecent.filter((match) => match.win).length / fallbackRecent.length) * 100 : 0),
    winRateDelta: rawTrend.winRateDelta ?? (((fallbackRecent.length ? (fallbackRecent.filter((match) => match.win).length / fallbackRecent.length) * 100 : 0) - (fallbackBaseline.length ? (fallbackBaseline.filter((match) => match.win).length / fallbackBaseline.length) * 100 : 0))),
    baselineConsistency: rawTrend.baselineConsistency ?? (100 - avg(fallbackBaseline.map((match) => Math.abs(match.score.total - avg(fallbackBaseline.map((inner) => inner.score.total)))))),
    recentConsistency: rawTrend.recentConsistency ?? (100 - avg(fallbackRecent.map((match) => Math.abs(match.score.total - avg(fallbackRecent.map((inner) => inner.score.total)))))),
    consistencyDelta: rawTrend.consistencyDelta ?? ((100 - avg(fallbackRecent.map((match) => Math.abs(match.score.total - avg(fallbackRecent.map((inner) => inner.score.total)))))) - (100 - avg(fallbackBaseline.map((match) => Math.abs(match.score.total - avg(fallbackBaseline.map((inner) => inner.score.total))))))),
    baselineCsAt15: rawTrend.baselineCsAt15 ?? avg(fallbackBaseline.map((match) => match.timeline.csAt15)),
    recentCsAt15: rawTrend.recentCsAt15 ?? avg(fallbackRecent.map((match) => match.timeline.csAt15)),
    csAt15Delta: rawTrend.csAt15Delta ?? (avg(fallbackRecent.map((match) => match.timeline.csAt15)) - avg(fallbackBaseline.map((match) => match.timeline.csAt15))),
    baselineGoldAt15: rawTrend.baselineGoldAt15 ?? avg(fallbackBaseline.map((match) => match.timeline.goldAt15)),
    recentGoldAt15: rawTrend.recentGoldAt15 ?? avg(fallbackRecent.map((match) => match.timeline.goldAt15)),
    goldAt15Delta: rawTrend.goldAt15Delta ?? (avg(fallbackRecent.map((match) => match.timeline.goldAt15)) - avg(fallbackBaseline.map((match) => match.timeline.goldAt15))),
    baselineKillParticipation: rawTrend.baselineKillParticipation ?? avg(fallbackBaseline.map((match) => match.killParticipation)),
    recentKillParticipation: rawTrend.recentKillParticipation ?? avg(fallbackRecent.map((match) => match.killParticipation)),
    killParticipationDelta: rawTrend.killParticipationDelta ?? (avg(fallbackRecent.map((match) => match.killParticipation)) - avg(fallbackBaseline.map((match) => match.killParticipation))),
    baselineDeathsPre14: rawTrend.baselineDeathsPre14 ?? avg(fallbackBaseline.map((match) => match.timeline.deathsPre14)),
    recentDeathsPre14: rawTrend.recentDeathsPre14 ?? avg(fallbackRecent.map((match) => match.timeline.deathsPre14)),
    deathsPre14Delta: rawTrend.deathsPre14Delta ?? (avg(fallbackRecent.map((match) => match.timeline.deathsPre14)) - avg(fallbackBaseline.map((match) => match.timeline.deathsPre14)))
  };
  const championReference = buildScopedChampionReference(dataset);
  const problematicMatchup = summary.problematicMatchup;
  const topProblems = summary.coaching.topProblems;
  const activePlan = summary.coaching.activePlan;
  const fallbackPositives = summary.insights.filter((insight) => insight.category === 'positive');
  const positives = (summary.positiveSignals?.length ? summary.positiveSignals : fallbackPositives).slice(0, 2);
  const reviewAgenda = (summary.reviewAgenda?.length ? summary.reviewAgenda : buildFallbackReviewAgenda(dataset.matches, locale))
    .map((item) => {
      const match = dataset.matches.find((entry) => entry.matchId === item.matchId);
      return {
        ...item,
        kills: item.kills ?? match?.kills ?? 0,
        deaths: item.deaths ?? match?.deaths ?? 0,
        assists: item.assists ?? match?.assists ?? 0,
        cs: item.cs ?? match?.cs ?? 0,
        damageToChampions: item.damageToChampions ?? match?.damageToChampions ?? 0,
        killParticipation: item.killParticipation ?? match?.killParticipation ?? 0,
        performanceScore: item.performanceScore ?? match?.score.total ?? 0
      };
    })
    .slice(0, 3);
  const stableMatches = dataset.matches.filter((match) => match.timeline.deathsPre14 <= summary.avgDeathsPre14 && match.timeline.csAt15 >= summary.avgCsAt15);
  const stableWinRate = stableMatches.length ? (stableMatches.filter((match) => match.win).length / stableMatches.length) * 100 : null;
  const mainProblem = topProblems[0] ?? null;
  const mainTitle = aiCoach?.coach.mainLeak ?? mainProblem?.problem ?? summary.coaching.headline;
  const mainSummary = aiCoach?.coach.summary ?? mainProblem?.title ?? summary.coaching.subheadline;
  const mainCause = aiCoach?.coach.whyItHappens ?? mainProblem?.cause ?? null;
  const todayActions = (aiCoach?.coach.whatToDoNext3Games?.length ? aiCoach.coach.whatToDoNext3Games : mainProblem?.actions ?? []).slice(0, 3);
  const steadyLabel = t(locale, 'estable', 'stable');
  const visibleProblems = aiCoach ? topProblems.slice(0, 1) : topProblems.slice(0, 2);
  const performanceTrend = signal(trend.scoreDelta, 'up', 0.25);
  const changeSummary = performanceTrend.tone === 'positive'
    ? t(locale, 'El tramo reciente realmente está mejorando contra el bloque anterior.', 'The recent stretch is genuinely improving against the previous block.')
    : performanceTrend.tone === 'negative'
      ? t(locale, 'El tramo reciente cedió frente al bloque anterior y conviene frenarlo rápido.', 'The recent stretch slipped versus the previous block and should be stabilized quickly.')
      : t(locale, 'No hay un salto fuerte ni una caída fuerte: la diferencia con el bloque anterior es chica.', 'There is no major jump or drop: the difference against the previous block is small.');

  const metricCards = [
    {
      label: t(locale, 'WR reciente', 'Recent WR'),
      value: `${formatDecimal(trend.recentWinRate)}%`,
      detail: comparisonDetail(locale, `${formatDecimal(trend.baselineWinRate)}%`, `${formatDecimal(trend.recentWinRate)}%`, trend.baselineMatches, trend.recentMatches),
      trend: withSteadyLabel(signal(trend.winRateDelta, 'up', 1), steadyLabel, delta(trend.winRateDelta, ' pts'))
    },
    {
      label: t(locale, 'Rendimiento', 'Performance'),
      value: formatDecimal(trend.recentScore),
      detail: comparisonDetail(locale, formatDecimal(trend.baselineScore), formatDecimal(trend.recentScore), trend.baselineMatches, trend.recentMatches),
      trend: withSteadyLabel(signal(trend.scoreDelta, 'up', 0.25), steadyLabel, delta(trend.scoreDelta))
    },
    {
      label: 'CS@15',
      value: formatDecimal(trend.recentCsAt15),
      detail: comparisonDetail(locale, formatDecimal(trend.baselineCsAt15), formatDecimal(trend.recentCsAt15), trend.baselineMatches, trend.recentMatches),
      trend: withSteadyLabel(signal(trend.csAt15Delta, 'up', 1), steadyLabel, delta(trend.csAt15Delta))
    },
    {
      label: 'Gold@15',
      value: formatInteger(trend.recentGoldAt15),
      detail: comparisonDetail(locale, formatInteger(trend.baselineGoldAt15), formatInteger(trend.recentGoldAt15), trend.baselineMatches, trend.recentMatches),
      trend: withSteadyLabel(signal(trend.goldAt15Delta, 'up', 120), steadyLabel, delta(trend.goldAt15Delta, '', 0))
    },
    {
      label: t(locale, 'Consistencia', 'Consistency'),
      value: formatDecimal(trend.recentConsistency),
      detail: comparisonDetail(locale, formatDecimal(trend.baselineConsistency), formatDecimal(trend.recentConsistency), trend.baselineMatches, trend.recentMatches),
      trend: withSteadyLabel(signal(trend.consistencyDelta, 'up', 1.5), steadyLabel, delta(trend.consistencyDelta))
    },
    {
      label: t(locale, 'Muertes pre14', 'Deaths pre14'),
      value: formatDecimal(trend.recentDeathsPre14),
      detail: comparisonDetail(locale, formatDecimal(trend.baselineDeathsPre14), formatDecimal(trend.recentDeathsPre14), trend.baselineMatches, trend.recentMatches),
      trend: withSteadyLabel(signal(trend.deathsPre14Delta, 'down', 0.15), steadyLabel, delta(trend.deathsPre14Delta))
    },
    {
      label: 'KP',
      value: `${formatDecimal(trend.recentKillParticipation)}%`,
      detail: comparisonDetail(locale, `${formatDecimal(trend.baselineKillParticipation)}%`, `${formatDecimal(trend.recentKillParticipation)}%`, trend.baselineMatches, trend.recentMatches),
      trend: withSteadyLabel(signal(trend.killParticipationDelta, 'up', 2), steadyLabel, delta(trend.killParticipationDelta, ' pts'))
    }
  ];
  const anchorSignals = championReference ? [
    {
      label: 'WR',
      value: `${formatDecimal(championReference.winRate)}%`,
      detail: t(locale, `${championReference.games} partidas del pick`, `${championReference.games} games on the pick`),
      trend: withSteadyLabel(signal(championReference.winRate - summary.winRate, 'up', 3), steadyLabel, delta(championReference.winRate - summary.winRate, ' pts'))
    },
    {
      label: t(locale, 'Rendimiento', 'Performance'),
      value: formatDecimal(championReference.avgScore),
      detail: t(locale, 'cuando el plan sale limpio', 'when the plan looks clean'),
      trend: withSteadyLabel(signal(championReference.avgScore - summary.avgPerformanceScore, 'up', 0.3), steadyLabel, delta(championReference.avgScore - summary.avgPerformanceScore))
    },
    {
      label: 'CS@15',
      value: formatDecimal(championReference.avgCsAt15),
      detail: t(locale, 'piso económico del pick', 'economic floor of the pick'),
      trend: withSteadyLabel(signal(championReference.avgCsAt15 - summary.avgCsAt15, 'up', 1), steadyLabel, delta(championReference.avgCsAt15 - summary.avgCsAt15))
    },
    {
      label: t(locale, 'Muertes pre14', 'Deaths pre14'),
      value: formatDecimal(championReference.avgDeathsPre14),
      detail: t(locale, 'disciplina del early', 'early discipline'),
      trend: withSteadyLabel(signal(championReference.avgDeathsPre14 - summary.avgDeathsPre14, 'down', 0.15), steadyLabel, delta(championReference.avgDeathsPre14 - summary.avgDeathsPre14))
    }
  ] : [];

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <Card title={t(locale, 'Lectura principal', 'Core coaching read')} subtitle={t(locale, 'Una lectura más clara del bloque actual: qué cambió de verdad, qué se sostiene y qué conviene corregir hoy.', 'A clearer read of the current block: what truly changed, what is holding and what you should correct today.')}>
        <div className="coaching-hero-grid" style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.45fr) minmax(320px, 0.95fr)', gap: 16, alignItems: 'start' }}>
          <div style={{ display: 'grid', gap: 14 }}>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {mainProblem ? <Badge tone={infoTone(mainProblem.priority)}>{t(locale, `Prioridad ${mainProblem.priority}`, `${mainProblem.priority} priority`)}</Badge> : null}
              {aiCoach ? <Badge tone="default">{`${Math.round(aiCoach.coach.confidence * 100)}% ${t(locale, 'confianza', 'confidence')}`}</Badge> : null}
              {aiCoach ? <Badge tone={aiCoach.context.player.profileStrength === 'elite' ? 'low' : aiCoach.context.player.profileStrength === 'advanced' ? 'default' : 'medium'}>{buildProfileStrengthLabel(aiCoach.context.player.profileStrength, locale)}</Badge> : null}
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
              ) : <div style={{ color: '#d7dfec', lineHeight: 1.7 }}>{t(locale, 'Todavía no hay un ciclo suficientemente claro. Conviene sumar muestra limpia o cerrar más el scope.', 'There is not a clear enough cycle yet. Add cleaner sample or narrow the scope further.')}</div>}
              <button type="button" style={buttonStyle} onClick={onGenerateAICoach} disabled={!onGenerateAICoach || generatingAICoach}>{generatingAICoach ? t(locale, 'Actualizando coaching...', 'Refreshing coaching...') : t(locale, 'Actualizar coaching', 'Refresh coaching')}</button>
            </div>
            <div className="coaching-meta-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12, alignItems: 'start' }}>
              <MetaStat label={t(locale, 'Muestra', 'Sample')} value={`${summary.matches}`} caption={t(locale, 'partidas del scope', 'games in scope')} />
              <MetaStat label={t(locale, 'Tramo reciente', 'Recent block')} value={`${trend.recentMatches}`} caption={t(locale, 'partidas comparadas ahora', 'games compared now')} />
              <MetaStat label={t(locale, 'Patrón estable', 'Stable pattern')} value={stableWinRate !== null ? `${formatDecimal(stableWinRate)}% WR` : t(locale, 'Sin señal', 'No signal')} caption={stableMatches.length ? t(locale, `${stableMatches.length} partidas limpias`, `${stableMatches.length} clean games`) : t(locale, 'todavía sin bloque limpio', 'no clean block yet')} />
              <MetaStat label={t(locale, 'Cruce más duro', 'Hardest matchup')} value={problematicMatchup ? `vs ${formatChampionName(problematicMatchup.opponentChampionName)}` : t(locale, 'Sin alerta', 'No alert')} caption={problematicMatchup ? (problematicMatchup.directGames >= 2 ? t(locale, `${problematicMatchup.directGames} cruces directos`, `${problematicMatchup.directGames} direct games`) : t(locale, `${problematicMatchup.recentLosses} derrotas repetidas`, `${problematicMatchup.recentLosses} repeated losses`)) : t(locale, 'sin patrón repetido', 'no repeated pattern')} />
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
          <div className="coaching-signal-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12, alignItems: 'stretch' }}>
            {metricCards.map((metric) => <SignalTile key={metric.label} {...metric} />)}
          </div>
        </div>
      </Card>

      <section className="coaching-overview-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 16, alignItems: 'stretch' }}>
        <Card title={t(locale, 'Base que ya te sostiene hoy', 'What is already holding you up')} subtitle={t(locale, 'Fusionamos tu pick de referencia con lo que ya te da nivel para que la lectura sea más directa y menos redundante.', 'We merge your reference pick with what is already giving you level so the read feels stronger and less redundant.')}>
          <div style={{ display: 'grid', gap: 12 }}>
            {championReference ? (
              <div style={panelStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'start', flexWrap: 'wrap' }}>
                  <ChampionIdentity
                    championName={championReference.championName}
                    version={dataset.ddragonVersion}
                    subtitle={t(
                      locale,
                      `${championReference.games} partidas del scope · ${formatDecimal(championReference.winRate)}% WR`,
                      `${championReference.games} scoped games · ${formatDecimal(championReference.winRate)}% WR`
                    )}
                    meta={
                      <>
                        <span style={chipStyle}><span>{`CS@15 ${formatDecimal(championReference.avgCsAt15)}`}</span></span>
                        <span style={chipStyle}><span>{`${t(locale, 'Muertes pre14', 'Deaths pre14')} ${formatDecimal(championReference.avgDeathsPre14)}`}</span></span>
                      </>
                    }
                    size={62}
                  />
                  <Badge tone="low">{t(locale, 'Pick más limpio', 'Cleanest pick')}</Badge>
                </div>
                <div style={{ color: '#9aa5b7', lineHeight: 1.65 }}>
                  {problematicMatchup
                    ? t(locale, `Tomalo como tu base de referencia: acá se ve mejor qué hábitos sostienen el bloque y cómo cambia el plan cuando aparece ${formatChampionName(problematicMatchup.opponentChampionName)}.`, `Use it as your reference base: this is where it is easiest to see which habits are holding the block and how the plan changes when ${formatChampionName(problematicMatchup.opponentChampionName)} shows up.`)
                    : t(locale, 'Es la versión donde el plan se ve más ordenado hoy. Si querés copiar algo, copiá esta estructura y no solo el resultado final.', 'This is the version where the plan looks most organized right now. If you want to copy something, copy this structure, not only the final result.')}
                </div>
                <div className="four-col-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 10 }}>
                  {anchorSignals.map((entry) => <AnchorMetric key={entry.label} {...entry} />)}
                </div>
              </div>
            ) : null}
            {positives.length ? (
              <div className="coaching-strength-grid" style={{ display: 'grid', gridTemplateColumns: positives.length > 1 ? 'repeat(2, minmax(0, 1fr))' : '1fr', gap: 10 }}>
                {positives.map((insight) => (
                  <div key={insight.id} style={strengthItemStyle}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'start', flexWrap: 'wrap' }}>
                      <div style={{ display: 'grid', gap: 6 }}>
                        <div style={{ color: '#eef4ff', fontSize: 18, fontWeight: 800, lineHeight: 1.22 }}>{insight.problem}</div>
                        <div style={{ color: '#9aa5b7', lineHeight: 1.55 }}>{insight.title}</div>
                      </div>
                      <Badge tone="low">{t(locale, 'Te sostiene', 'Holding')}</Badge>
                    </div>
                    {insight.evidence[0] ? <div style={compactListStyle}>{insight.evidence[0]}</div> : null}
                    {insight.actions.slice(0, 1).map((action) => <div key={action} style={actionStyle}>{action}</div>)}
                  </div>
                ))}
              </div>
            ) : <div style={emptyStyle}>{t(locale, 'Todavía no aparece una fortaleza clara en este scope.', 'There is no clear strength in this scope yet.')}</div>}
          </div>
        </Card>

        <Card title={t(locale, 'Qué cambió de verdad', 'What actually changed')} subtitle={t(locale, 'Tramo reciente contra bloque anterior. Esa comparación muestra mejor si hoy hay mejora, deterioro o un patrón estable.', 'Recent stretch against the previous block. That comparison shows much more clearly whether you are improving, slipping or staying flat.')}>
          <div style={{ display: 'grid', gap: 10 }}>
            <div style={panelStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'start', flexWrap: 'wrap' }}>
                <div style={{ display: 'grid', gap: 6 }}>
                  <div style={{ color: '#eef4ff', fontSize: 20, fontWeight: 800, lineHeight: 1.2 }}>{changeSummary}</div>
                  <div style={{ color: '#9aa5b7', lineHeight: 1.6 }}>{t(locale, `Comparación usada: ${trend.baselineMatches} partidas previas contra ${trend.recentMatches} partidas recientes.`, `Comparison used: ${trend.baselineMatches} earlier games against ${trend.recentMatches} recent games.`)}</div>
                </div>
                <span style={chipStyle}><TrendIndicator direction={performanceTrend.direction} tone={performanceTrend.tone} /><span>{performanceTrend.direction === 'steady' ? t(locale, 'parejo', 'steady') : performanceTrend.tone === 'positive' ? t(locale, 'mejora', 'improving') : t(locale, 'retroceso', 'slipping')}</span></span>
              </div>
            </div>
            <ProgressRow label={t(locale, 'Rendimiento', 'Performance')} baseline={formatDecimal(trend.baselineScore)} recent={formatDecimal(trend.recentScore)} trend={signal(trend.scoreDelta, 'up', 0.25)} deltaLabel={delta(trend.scoreDelta)} locale={locale} />
            <ProgressRow label="WR" baseline={`${formatDecimal(trend.baselineWinRate)}%`} recent={`${formatDecimal(trend.recentWinRate)}%`} trend={signal(trend.winRateDelta, 'up', 1)} deltaLabel={delta(trend.winRateDelta, ' pts')} locale={locale} />
            <ProgressRow label="Gold@15" baseline={formatInteger(trend.baselineGoldAt15)} recent={formatInteger(trend.recentGoldAt15)} trend={signal(trend.goldAt15Delta, 'up', 120)} deltaLabel={delta(trend.goldAt15Delta, '', 0)} locale={locale} />
            <ProgressRow label={t(locale, 'Muertes pre14', 'Deaths pre14')} baseline={formatDecimal(trend.baselineDeathsPre14)} recent={formatDecimal(trend.recentDeathsPre14)} trend={signal(trend.deathsPre14Delta, 'down', 0.15)} deltaLabel={delta(trend.deathsPre14Delta)} locale={locale} />
            <ProgressRow label={t(locale, 'Consistencia', 'Consistency')} baseline={formatDecimal(trend.baselineConsistency)} recent={formatDecimal(trend.recentConsistency)} trend={signal(trend.consistencyDelta, 'up', 1.5)} deltaLabel={delta(trend.consistencyDelta)} locale={locale} />
          </div>
        </Card>

        <Card title={t(locale, 'Prioridades del bloque', 'Block priorities')} subtitle={t(locale, 'Qué te frena hoy y qué conviene hacer con eso, con menos relleno y mejor jerarquía.', 'What is holding you back today and what to do with it, with less filler and better hierarchy.')}>
          <div style={{ display: 'grid', gap: 12 }}>
            {visibleProblems.length ? visibleProblems.map((problem, index) => (
              <div key={problem.id} style={{ ...panelStyle, borderColor: problem.priority === 'high' ? 'rgba(255,107,107,0.18)' : problem.priority === 'low' ? 'rgba(103,214,164,0.16)' : 'rgba(255,255,255,0.05)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'start', flexWrap: 'wrap' }}>
                  <div style={{ display: 'grid', gap: 6 }}>
                    <div style={{ color: '#8e9cb0', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{t(locale, `Bloque ${index + 1}`, `Block ${index + 1}`)}</div>
                    <div style={{ color: '#eef4ff', fontSize: 21, fontWeight: 800, lineHeight: 1.15 }}>{problem.problem}</div>
                    <div style={{ color: '#9aa5b7', lineHeight: 1.6 }}>{problem.title}</div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    <Badge tone={infoTone(problem.priority)}>{t(locale, `Prioridad ${problem.priority}`, `${problem.priority} priority`)}</Badge>
                    <Badge>{problem.category}</Badge>
                    {problem.interpretation ? <Badge tone={problem.interpretation === 'structural' ? 'high' : problem.interpretation === 'situational' ? 'default' : 'medium'}>{interpretationLabel(problem.interpretation, locale)}</Badge> : null}
                    {problem.evidenceStrength ? <Badge tone={problem.evidenceStrength === 'high' ? 'low' : problem.evidenceStrength === 'medium' ? 'default' : 'medium'}>{evidenceLabel(problem.evidenceStrength, locale)}</Badge> : null}
                  </div>
                </div>
                <div className="two-col-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }}>
                  <InfoBlock title={t(locale, 'Impacto', 'Impact')} info={t(locale, 'Cómo pega este patrón en tus resultados.', 'How hard this pattern hits your results.')}>{problem.impact}</InfoBlock>
                  <InfoBlock title={t(locale, 'Causa', 'Cause')} info={t(locale, 'Qué está explicando mejor el patrón actual.', 'What best explains the current pattern.')}>{problem.cause}</InfoBlock>
                </div>
                {problem.evidence[0] ? (
                  <>
                    <SectionEyebrow title={t(locale, 'Se ve en', 'Shows up in')} />
                    <div style={listStyle}>{problem.evidence[0]}</div>
                  </>
                ) : null}
                {problem.sampleWarning ? (
                  <>
                    <SectionEyebrow title={t(locale, 'Cautela', 'Caution')} />
                    <div style={listStyle}>{problem.sampleWarning}</div>
                  </>
                ) : null}
                {problem.actions.length ? (
                  <>
                    <SectionEyebrow title={t(locale, 'Qué hacer hoy', 'What to do today')} />
                    {problem.actions.slice(0, 2).map((action) => <div key={action} style={actionStyle}>{action}</div>)}
                  </>
                ) : null}
              </div>
            )) : <div style={emptyStyle}>{t(locale, 'Todavía no hay prioridades claras para este bloque.', 'There are no clear priorities for this block yet.')}</div>}
          </div>
        </Card>
      </section>

      <section style={{ display: 'grid', gap: 16 }}>
        <Card title={t(locale, 'El cruce que hoy más te castiga', 'The matchup hurting you most right now')} subtitle={t(locale, 'Si se repite, deja de ser mala suerte y pasa a ser preparación concreta.', 'If it keeps repeating, it stops being bad luck and becomes concrete prep work.')}>
          {problematicMatchup ? (
            <div style={{ display: 'grid', gap: 14 }}>
              <div className="two-col-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
                <InfoBlock title={t(locale, 'Tu pick en este scope', 'Your pick in this scope')} info={t(locale, 'El campeón más jugado del scope reciente con el que vale la pena leer el cruce.', 'The most played champion in the recent scope worth using to read this matchup.')}>
                  <ChampionIdentity championName={problematicMatchup.championName} version={dataset.ddragonVersion} subtitle={problematicMatchup.directGames >= 2 ? t(locale, `${problematicMatchup.directGames} cruces directos · ${formatDecimal(problematicMatchup.directWinRate ?? 0)}% WR`, `${problematicMatchup.directGames} direct games · ${formatDecimal(problematicMatchup.directWinRate ?? 0)}% WR`) : t(locale, 'muestra directa corta', 'short direct sample')} size={58} />
                </InfoBlock>
                <InfoBlock title={t(locale, 'Rival que más te castiga', 'Opponent hurting you most')} info={t(locale, 'El rival que más daño real está haciendo dentro del scope actual.', 'The opponent doing the most real damage inside the current scope.')}>
                  <ChampionIdentity championName={problematicMatchup.opponentChampionName} version={dataset.ddragonVersion} subtitle={problematicMatchup.directGames >= 2 ? t(locale, `${problematicMatchup.directLosses} derrotas directas`, `${problematicMatchup.directLosses} direct losses`) : t(locale, `${problematicMatchup.recentLosses} derrotas repetidas del scope`, `${problematicMatchup.recentLosses} repeated scoped losses`)} meta={<Badge tone="high">{`${formatDecimal(problematicMatchup.directWinRate ?? problematicMatchup.recentWinRate)}% WR`}</Badge>} size={58} />
                </InfoBlock>
              </div>
              <div style={panelStyle}>
                <div style={{ color: '#eef4ff', fontSize: 20, fontWeight: 800, lineHeight: 1.2 }}>{t(locale, `${formatChampionName(problematicMatchup.championName)} contra ${formatChampionName(problematicMatchup.opponentChampionName)}`, `${formatChampionName(problematicMatchup.championName)} into ${formatChampionName(problematicMatchup.opponentChampionName)}`)}</div>
                <div style={{ color: '#9aa5b7', lineHeight: 1.7 }}>{problematicMatchup.summary}</div>
              </div>
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

      <Card title={t(locale, 'Sesión de revisión', 'Review session')} subtitle={t(locale, 'Abrí pocos replays, pero con una pregunta concreta. La idea es entender rápido qué mirar y para qué mirarlo.', 'Open only a few replays, but with a concrete question. The goal is to understand quickly what to watch and why.')}>
        {reviewAgenda.length ? (
          <div className="coaching-review-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12, alignItems: 'stretch' }}>
            {reviewAgenda.map((item) => (
              <div key={item.matchId} style={reviewCardStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'start', flexWrap: 'wrap' }}>
                  <ChampionIdentity championName={item.championName} version={dataset.ddragonVersion} subtitle={new Date(item.gameCreation).toLocaleDateString(locale === 'en' ? 'en-US' : 'es-AR')} size={52} />
                  <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                    {item.tags.slice(0, 2).map((tag) => <Badge key={tag}>{tag}</Badge>)}
                    <Badge tone={item.win ? 'low' : 'high'}>{item.win ? t(locale, 'Victoria', 'Win') : t(locale, 'Derrota', 'Loss')}</Badge>
                  </div>
                </div>
                <div style={{ color: '#eef4ff', fontSize: 18, fontWeight: 800, lineHeight: 1.2 }}>{item.title}</div>
                <div style={{ color: '#9aa5b7', lineHeight: 1.65 }}>{item.reason}</div>
                <div className="review-metric-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 10 }}>
                  <ReviewMetric label="KDA" value={formatKda(item.kills, item.deaths, item.assists)} />
                  <ReviewMetric label="CS" value={formatInteger(item.cs)} />
                  <ReviewMetric label={t(locale, 'Daño', 'Damage')} value={formatInteger(item.damageToChampions)} />
                  <ReviewMetric label="KP" value={`${formatDecimal(item.killParticipation)}%`} />
                  <ReviewMetric label={t(locale, 'Rend.', 'Perf.')} value={formatDecimal(item.performanceScore)} />
                </div>
                <div style={questionStyle}>
                  <SectionEyebrow title={t(locale, 'Pregunta de review', 'Review question')} />
                  <div style={{ color: '#eff7f2', lineHeight: 1.65 }}>{item.question}</div>
                </div>
                <div style={listStyle}>
                  <strong style={{ color: '#eef4ff' }}>{t(locale, 'Mirá esto:', 'Look at this:')}</strong> {item.focus}
                </div>
              </div>
            ))}
          </div>
        ) : <div style={emptyStyle}>{t(locale, 'Todavía no hay una sesión de review clara.', 'There is no clear review session yet.')}</div>}
      </Card>

      <Card title={t(locale, 'Referencias challenger del rol', 'Challenger role references')} subtitle={t(locale, 'Usalas para poner en contexto tu bloque: qué métricas ya están cerca, cuáles todavía marcan distancia y qué baseline competitivo vale la pena imitar.', 'Use them to contextualize your block: which metrics are already close, which still show distance and which competitive baseline is worth imitating.')}>
        {roleReferencesError ? <div style={errorStyle}>{roleReferencesError}</div> : null}
        {roleReferencesLoading ? <div style={emptyStyle}>{t(locale, 'Buscando referencias challenger del rol...', 'Loading challenger role references...')}</div> : null}
        {!roleReferencesLoading && !roleReferences.length ? <div style={emptyStyle}>{t(locale, 'Todavía no hay referencias challenger listas para este rol.', 'There are no challenger references ready for this role yet.')}</div> : null}
        {roleReferences.length ? (
          <div className="three-col-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12, alignItems: 'start' }}>
            {roleReferences.map((reference) => (
              <ReferencePlayerCard
                key={`${reference.slotId}-${reference.gameName}-${reference.tagLine}`}
                reference={reference}
                dataset={dataset}
                locale={locale}
              />
            ))}
          </div>
        ) : null}
      </Card>
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

function AnchorMetric({ label, value, detail, trend }: { label: string; value: string; detail: string; trend: TrendSignal }) {
  return (
    <div style={anchorMetricStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'start' }}>
        <div style={{ color: '#8897ab', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
        <TrendIndicator direction={trend.direction} tone={trend.tone} />
      </div>
      <div style={{ color: '#eef4ff', fontSize: 18, fontWeight: 800, lineHeight: 1.12 }}>{value}</div>
      <div style={{ color: '#8594a8', fontSize: 12, lineHeight: 1.45 }}>{detail}</div>
    </div>
  );
}

function ReviewMetric({ label, value }: { label: string; value: string }) {
  return (
    <div style={reviewMetricStyle}>
      <div style={{ color: '#8c98ad', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em' }}>{label}</div>
      <div style={{ color: '#eef4ff', fontSize: 18, fontWeight: 800, lineHeight: 1.1 }}>{value}</div>
    </div>
  );
}

function ProgressRow({ label, baseline, recent, trend, deltaLabel, locale }: { label: string; baseline: string; recent: string; trend: TrendSignal; deltaLabel: string; locale: Locale }) {
  return (
    <div style={progressRowStyle}>
      <div style={{ display: 'grid', gap: 4 }}>
        <div style={{ color: '#eef4ff', fontWeight: 700 }}>{label}</div>
        <div style={{ color: '#8f9aad', fontSize: 13 }}>{`${baseline} -> ${recent}`}</div>
      </div>
      <TrendIndicator direction={trend.direction} tone={trend.tone} label={trend.direction === 'steady' ? t(locale, 'parejo', 'steady') : deltaLabel} />
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

function ReferencePlayerCard({ reference, dataset, locale }: { reference: RoleReferenceProfile; dataset: Dataset; locale: Locale }) {
  const profileIconUrl = getProfileIconUrl(reference.profileIconId, reference.ddragonVersion ?? dataset.ddragonVersion);
  const performanceDiff = reference.avgPerformance - dataset.summary.avgPerformanceScore;
  const recentWrDiff = reference.recentWinRate - dataset.summary.coaching.trend.recentWinRate;

  return (
    <div style={referenceCardStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'start' }}>
        <Badge tone={reference.sourcePlatform === 'KR' ? 'low' : 'default'}>{reference.slotLabel}</Badge>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: profileIconUrl ? '54px minmax(0, 1fr)' : '1fr', gap: 12, alignItems: 'center' }}>
        {profileIconUrl ? <img src={profileIconUrl} alt={reference.gameName} width={54} height={54} style={{ width: 54, height: 54, borderRadius: 14, objectFit: 'cover', border: '1px solid rgba(255,255,255,0.08)' }} /> : null}
        <div style={{ display: 'grid', gap: 4 }}>
          <div style={{ color: '#eef4ff', fontSize: 20, fontWeight: 800, lineHeight: 1.1 }}>{reference.gameName}<span style={{ color: '#8f9aad' }}>#{reference.tagLine}</span></div>
          <div style={{ color: '#9aa5b7', lineHeight: 1.5 }}>{`${reference.rankLabel} · ${reference.leaguePoints} LP`}</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {reference.topChampions.slice(0, 2).map((champion) => <Badge key={champion}>{formatChampionName(champion)}</Badge>)}
          </div>
        </div>
      </div>
      <div className="reference-metric-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }}>
        <MetaStat label={t(locale, 'WR reciente', 'Recent WR')} value={`${formatDecimal(reference.recentWinRate)}%`} caption={t(locale, `${reference.matches} partidas`, `${reference.matches} games`)} />
        <MetaStat label={t(locale, 'Rendimiento', 'Performance')} value={formatDecimal(reference.avgPerformance)} caption={performanceDiff >= 0 ? t(locale, `${formatDecimal(performanceDiff)} sobre tu bloque`, `${formatDecimal(performanceDiff)} above your block`) : t(locale, `${formatDecimal(Math.abs(performanceDiff))} debajo de tu bloque`, `${formatDecimal(Math.abs(performanceDiff))} below your block`)} />
        <MetaStat label="KDA" value={formatDecimal(reference.avgKda)} caption={recentWrDiff >= 0 ? t(locale, `${formatDecimal(recentWrDiff)} pts WR sobre vos`, `${formatDecimal(recentWrDiff)} WR pts over you`) : t(locale, `${formatDecimal(Math.abs(recentWrDiff))} pts WR debajo`, `${formatDecimal(Math.abs(recentWrDiff))} WR pts below`) } />
        <MetaStat label="KP" value={`${formatDecimal(reference.avgKillParticipation)}%`} />
        <MetaStat label="CS@15" value={formatDecimal(reference.avgCsAt15)} />
        <MetaStat label="Gold@15" value={formatInteger(reference.avgGoldAt15)} />
      </div>
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
        <span style={chipStyle}><TrendIndicator direction={signal(performanceDiff, 'up', 0.3).direction} tone={signal(performanceDiff, 'up', 0.3).tone} /><span>{t(locale, 'rendimiento', 'performance')}</span></span>
        <span style={chipStyle}><TrendIndicator direction={signal(reference.avgDeathsPre14 - dataset.summary.avgDeathsPre14, 'down', 0.15).direction} tone={signal(reference.avgDeathsPre14 - dataset.summary.avgDeathsPre14, 'down', 0.15).tone} /><span>{t(locale, 'disciplina early', 'early discipline')}</span></span>
        <span style={chipStyle}><TrendIndicator direction={signal(reference.consistencyIndex - dataset.summary.consistencyIndex, 'up', 0.8).direction} tone={signal(reference.consistencyIndex - dataset.summary.consistencyIndex, 'up', 0.8).tone} /><span>{t(locale, 'consistencia', 'consistency')}</span></span>
      </div>
    </div>
  );
}

const panelStyle = { display: 'grid', gap: 12, padding: '16px 16px', borderRadius: 18, background: 'linear-gradient(180deg, rgba(10, 15, 24, 0.98), rgba(7, 11, 17, 0.98))', border: '1px solid rgba(255,255,255,0.05)' } as const;
const tileStyle = { display: 'grid', gap: 8, padding: '15px 16px', borderRadius: 16, minHeight: 128, alignContent: 'start', background: 'linear-gradient(180deg, rgba(11, 15, 24, 0.98), rgba(7, 10, 16, 0.98))', border: '1px solid rgba(255,255,255,0.05)' } as const;
const metaStyle = { display: 'grid', gap: 8, padding: '14px 14px', borderRadius: 16, minHeight: 108, alignContent: 'start', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' } as const;
const infoStyle = { padding: 15, borderRadius: 16, background: 'linear-gradient(180deg, rgba(11, 15, 24, 0.98), rgba(7, 10, 16, 0.98))', border: '1px solid rgba(255,255,255,0.05)' } as const;
const stepStyle = { display: 'grid', gridTemplateColumns: '28px minmax(0, 1fr)', gap: 10, alignItems: 'start', padding: '11px 12px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' } as const;
const stepIndexStyle = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 999, background: 'rgba(216,253,241,0.08)', border: '1px solid rgba(216,253,241,0.12)', color: '#d8fdf1', fontSize: 13, fontWeight: 800 } as const;
const emptyStyle = { padding: '14px 15px', borderRadius: 16, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', color: '#c7d4ea', lineHeight: 1.65 } as const;
const errorStyle = { padding: '12px 14px', borderRadius: 14, background: 'rgba(255,107,107,0.08)', border: '1px solid rgba(255,107,107,0.12)', color: '#ffb3b3', lineHeight: 1.6 } as const;
const actionStyle = { padding: '10px 11px', borderRadius: 12, background: 'rgba(103,214,164,0.08)', border: '1px solid rgba(103,214,164,0.12)', color: '#dff7eb', lineHeight: 1.6 } as const;
const listStyle = { padding: '11px 12px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', color: '#dfe7f4', lineHeight: 1.65 } as const;
const questionStyle = { padding: '12px 13px', borderRadius: 14, background: 'rgba(103,214,164,0.08)', border: '1px solid rgba(103,214,164,0.14)', color: '#dff7eb' } as const;
const trackStyle = { height: 12, borderRadius: 999, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' } as const;
const fillStyle = { height: '100%', borderRadius: 999, background: 'linear-gradient(90deg, #7ef5c7, #c9f6e7)' } as const;
const progressRowStyle = { display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', padding: '12px 14px', borderRadius: 14, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' } as const;
const chipStyle = { display: 'inline-flex', alignItems: 'center', gap: 7, padding: '7px 10px', borderRadius: 999, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.05)', color: '#dfe7f4', fontSize: 12, fontWeight: 700 } as const;
const buttonStyle = { border: 0, padding: '12px 14px', borderRadius: 12, background: '#d8fdf1', color: '#05111e', fontWeight: 800, cursor: 'pointer' } as const;
const feedbackStyle = { border: '1px solid rgba(255,255,255,0.08)', padding: '9px 11px', borderRadius: 10, background: '#0a0f18', color: '#dfe8f6', fontWeight: 700, cursor: 'pointer' } as const;
const reviewMetricStyle = { display: 'grid', gap: 6, padding: '10px 11px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' } as const;
const anchorMetricStyle = { display: 'grid', gap: 7, padding: '11px 12px', borderRadius: 14, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', alignContent: 'start' } as const;
const strengthItemStyle = { display: 'grid', gap: 10, padding: '14px 14px', borderRadius: 16, background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)', alignContent: 'start' } as const;
const compactListStyle = { padding: '10px 11px', borderRadius: 12, background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)', color: '#dfe7f4', lineHeight: 1.55 } as const;
const reviewCardStyle = { display: 'grid', gap: 12, padding: '16px 16px', borderRadius: 18, background: 'linear-gradient(180deg, rgba(10, 15, 24, 0.98), rgba(7, 11, 17, 0.98))', border: '1px solid rgba(255,255,255,0.05)', alignContent: 'start', height: '100%' } as const;
const referenceCardStyle = { display: 'grid', gap: 12, padding: '16px 16px', borderRadius: 18, background: 'linear-gradient(180deg, rgba(10, 15, 24, 0.98), rgba(7, 11, 17, 0.98))', border: '1px solid rgba(255,255,255,0.05)' } as const;
