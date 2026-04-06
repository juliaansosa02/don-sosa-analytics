import { Fragment, jsx, jsxs } from "react/jsx-runtime";
import { useMemo } from "react";
import { Badge, Card, ChampionIdentity, InfoHint, TrendIndicator } from "../../components/ui";
import { formatDecimal, formatInteger } from "../../lib/format";
import { formatChampionName, getProfileIconUrl } from "../../lib/lol";
import { evidenceBadgeLabel, evidenceTone } from "../premium-analysis/evidence";
import { CoachPremiumWorkspace } from "./CoachPremiumWorkspace";
import { buildChampionPrepBrief } from "./prepBrief";
const t = (locale, es, en) => locale === "en" ? en : es;
const avg = (values) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
function delta(value, suffix = "", digits = 1) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "\u2014";
  const rounded = Number(value.toFixed(digits));
  const formatted = digits === 0 ? formatInteger(Math.abs(rounded)) : formatDecimal(Math.abs(rounded), digits);
  return `${rounded >= 0 ? "+" : "-"}${formatted}${suffix}`;
}
function signal(deltaValue, positiveWhen = "up", threshold = 0.25) {
  if (typeof deltaValue !== "number" || !Number.isFinite(deltaValue) || Math.abs(deltaValue) < threshold) {
    return { direction: "steady", tone: "neutral" };
  }
  const direction = deltaValue > 0 ? "up" : "down";
  const improved = positiveWhen === "up" ? deltaValue > 0 : deltaValue < 0;
  return { direction, tone: improved ? "positive" : "negative" };
}
function withSteadyLabel(trend, steadyLabel, movingLabel) {
  if (trend.direction === "steady") return { ...trend, label: steadyLabel };
  return movingLabel ? { ...trend, label: movingLabel } : trend;
}
function comparisonDetail(locale, baselineLabel, recentLabel, baselineMatches, recentMatches) {
  return locale === "en" ? `Before ${baselineLabel} (${baselineMatches}) \xB7 Now ${recentLabel} (${recentMatches})` : `Antes ${baselineLabel} (${baselineMatches}) \xB7 Ahora ${recentLabel} (${recentMatches})`;
}
function formatKda(kills, deaths, assists) {
  return `${kills}/${deaths}/${assists}`;
}
function buildProfileStrengthLabel(strength, locale = "es") {
  if (strength === "elite") return locale === "en" ? "Elite profile" : "Perfil elite";
  if (strength === "advanced") return locale === "en" ? "High-elo profile" : "Perfil high elo";
  return locale === "en" ? "Improvement block" : "Bloque de mejora";
}
function buildFallbackReviewAgenda(matches, locale) {
  const sorted = [...matches].sort((a, b) => b.gameCreation - a.gameCreation);
  const stressed = sorted.filter((match) => !match.win || match.timeline.deathsPre14 >= 2 || match.timeline.objectiveFightDeaths > 0).map((match) => {
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
        title: t(locale, "Revis\xE1 el minuto previo al objetivo", "Review the minute before the objective"),
        reason: t(locale, "La partida se rompe alrededor del setup y no solo durante la pelea.", "The game breaks around the setup, not only during the fight."),
        question: t(locale, "\xBFQu\xE9 te falt\xF3 hacer 45-60 segundos antes para no llegar apurado a la ventana?", "What did you fail to do 45-60 seconds earlier so you would not arrive rushing the window?"),
        focus: t(locale, "Reset, visi\xF3n, orden de llegada y qu\xE9 l\xEDnea ten\xEDa prioridad real.", "Reset, vision, arrival order and which lane had real priority."),
        tags: [t(locale, "Objetivo", "Objective")]
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
        title: t(locale, "Encontr\xE1 la primera muerte evitable", "Find the first avoidable death"),
        reason: t(locale, "El early pierde jugabilidad demasiado pronto y te obliga a compensar desde atr\xE1s.", "The early game loses playability too soon and forces you to compensate from behind."),
        question: t(locale, "\xBFQu\xE9 informaci\xF3n, recurso o cobertura faltaba antes de comprometerte?", "What information, resource or coverage was missing before you committed?"),
        focus: t(locale, "Primera muerte, estado del mapa y qu\xE9 quedaba vivo para jugar despu\xE9s.", "First death, map state and what remained playable afterward."),
        tags: [t(locale, "Early", "Early")]
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
      title: t(locale, "Aisl\xE1 d\xF3nde se cort\xF3 tu econom\xEDa", "Isolate where your economy got cut"),
      reason: t(locale, "La partida llega al 15 m\xE1s d\xE9bil de lo que tu rol necesita.", "The game is reaching minute 15 weaker than your role needs."),
      question: t(locale, "\xBFQu\xE9 reset, quiebre de ruta o pelea te sac\xF3 del piso econ\xF3mico normal del rol?", "What reset, route break or fight pulled you off the role\u2019s normal economy floor?"),
      focus: t(locale, "CS@15, diff. de oro y el costo real de la jugada que aceptaste.", "CS@15, gold diff and the real cost of the play you accepted."),
      tags: [t(locale, "Econom\xEDa", "Economy")]
    };
  }).slice(0, 2);
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
      title: t(locale, "Usala como partida espejo", "Use it as a mirror game"),
      reason: t(locale, "Ac\xE1 aparece una versi\xF3n m\xE1s limpia del plan que quer\xE9s repetir.", "This one shows a cleaner version of the plan you want to repeat."),
      question: t(locale, "\xBFQu\xE9 hiciste antes del 14 para llegar ordenado al primer objetivo?", "What did you do before minute 14 to arrive organized to the first objective?"),
      focus: t(locale, "Recall, primera rotaci\xF3n y qu\xE9 pelea evitaste forzar.", "Recall, first rotation and which fight you avoided forcing."),
      tags: [t(locale, "Referencia", "Reference")]
    });
  }
  return stressed.slice(0, 3);
}
function buildScopedChampionReference(dataset) {
  const roleScope = dataset.summary.primaryRole;
  const scopedMatches = roleScope && roleScope !== "ALL" ? dataset.matches.filter((match) => match.role === roleScope) : dataset.matches;
  const grouped = /* @__PURE__ */ new Map();
  for (const match of scopedMatches) {
    const list = grouped.get(match.championName) ?? [];
    list.push(match);
    grouped.set(match.championName, list);
  }
  const [championName, championMatches] = Array.from(grouped.entries()).sort((a, b) => b[1].length - a[1].length || b[1].filter((match) => match.win).length - a[1].filter((match) => match.win).length)[0] ?? [];
  if (!championName || !championMatches?.length) return dataset.summary.championPool[0] ?? null;
  return {
    championName,
    games: championMatches.length,
    winRate: avg(championMatches.map((match) => match.win ? 100 : 0)),
    avgScore: avg(championMatches.map((match) => match.score.total)),
    avgCsAt15: avg(championMatches.map((match) => match.timeline.csAt15)),
    avgGoldAt15: avg(championMatches.map((match) => match.timeline.goldAt15)),
    avgDeathsPre14: avg(championMatches.map((match) => match.timeline.deathsPre14)),
    classification: "CORE_PICK"
  };
}
function infoTone(priority) {
  if (priority === "high") return "high";
  if (priority === "low") return "low";
  return "medium";
}
function interpretationLabel(value, locale = "es") {
  if (value === "structural") return locale === "en" ? "Structural" : "Estructural";
  if (value === "situational") return locale === "en" ? "Situational" : "Situacional";
  if (value === "observational") return locale === "en" ? "Observational" : "Observacional";
  return null;
}
function evidenceLabel(value, locale = "es") {
  if (value === "high") return locale === "en" ? "High evidence" : "Evidencia alta";
  if (value === "medium") return locale === "en" ? "Medium evidence" : "Evidencia media";
  if (value === "low") return locale === "en" ? "Low evidence" : "Evidencia baja";
  return null;
}
function readStrengthLabel(value, interpretation, locale = "es") {
  if (interpretation === "observational" || value === "low") return locale === "en" ? "Tentative read" : "Lectura tentativa";
  if (value === "high") return locale === "en" ? "Firm read" : "Lectura firme";
  if (value === "medium") return locale === "en" ? "Read in validation" : "Lectura en validaci\xF3n";
  return null;
}
function readStrengthTone(value) {
  if (value === "high") return "low";
  if (value === "medium") return "default";
  return "medium";
}
function CoachingHome({
  dataset,
  locale = "es",
  aiCoach,
  generatingAICoach = false,
  aiCoachError,
  onGenerateAICoach,
  onSendFeedback,
  roleReferences = [],
  roleReferencesLoading = false,
  roleReferencesError = null,
  coachRosterPlayers = [],
  canManageCoachRoster = false
}) {
  const { summary } = dataset;
  const matchesByDate = [...dataset.matches].sort((a, b) => a.gameCreation - b.gameCreation);
  const suggestedRecentCount = Math.min(8, Math.max(3, Math.ceil(matchesByDate.length * 0.35)));
  const recentWindow = matchesByDate.slice(-Math.min(suggestedRecentCount, matchesByDate.length));
  const baselineWindow = matchesByDate.slice(0, Math.max(0, matchesByDate.length - recentWindow.length));
  const fallbackBaseline = baselineWindow.length ? baselineWindow : matchesByDate.length > 1 ? matchesByDate.slice(0, matchesByDate.length - 1) : recentWindow;
  const fallbackRecent = recentWindow.length ? recentWindow : matchesByDate.slice(-1);
  const rawTrend = summary.coaching.trend ?? {};
  const trend = {
    baselineMatches: rawTrend.baselineMatches ?? fallbackBaseline.length,
    recentMatches: rawTrend.recentMatches ?? fallbackRecent.length,
    baselineScore: rawTrend.baselineScore ?? avg(fallbackBaseline.map((match) => match.score.total)),
    recentScore: rawTrend.recentScore ?? avg(fallbackRecent.map((match) => match.score.total)),
    scoreDelta: rawTrend.scoreDelta ?? avg(fallbackRecent.map((match) => match.score.total)) - avg(fallbackBaseline.map((match) => match.score.total)),
    baselineWinRate: rawTrend.baselineWinRate ?? (fallbackBaseline.length ? fallbackBaseline.filter((match) => match.win).length / fallbackBaseline.length * 100 : 0),
    recentWinRate: rawTrend.recentWinRate ?? (fallbackRecent.length ? fallbackRecent.filter((match) => match.win).length / fallbackRecent.length * 100 : 0),
    winRateDelta: rawTrend.winRateDelta ?? (fallbackRecent.length ? fallbackRecent.filter((match) => match.win).length / fallbackRecent.length * 100 : 0) - (fallbackBaseline.length ? fallbackBaseline.filter((match) => match.win).length / fallbackBaseline.length * 100 : 0),
    baselineConsistency: rawTrend.baselineConsistency ?? 100 - avg(fallbackBaseline.map((match) => Math.abs(match.score.total - avg(fallbackBaseline.map((inner) => inner.score.total))))),
    recentConsistency: rawTrend.recentConsistency ?? 100 - avg(fallbackRecent.map((match) => Math.abs(match.score.total - avg(fallbackRecent.map((inner) => inner.score.total))))),
    consistencyDelta: rawTrend.consistencyDelta ?? 100 - avg(fallbackRecent.map((match) => Math.abs(match.score.total - avg(fallbackRecent.map((inner) => inner.score.total))))) - (100 - avg(fallbackBaseline.map((match) => Math.abs(match.score.total - avg(fallbackBaseline.map((inner) => inner.score.total)))))),
    baselineCsAt15: rawTrend.baselineCsAt15 ?? avg(fallbackBaseline.map((match) => match.timeline.csAt15)),
    recentCsAt15: rawTrend.recentCsAt15 ?? avg(fallbackRecent.map((match) => match.timeline.csAt15)),
    csAt15Delta: rawTrend.csAt15Delta ?? avg(fallbackRecent.map((match) => match.timeline.csAt15)) - avg(fallbackBaseline.map((match) => match.timeline.csAt15)),
    baselineGoldAt15: rawTrend.baselineGoldAt15 ?? avg(fallbackBaseline.map((match) => match.timeline.goldAt15)),
    recentGoldAt15: rawTrend.recentGoldAt15 ?? avg(fallbackRecent.map((match) => match.timeline.goldAt15)),
    goldAt15Delta: rawTrend.goldAt15Delta ?? avg(fallbackRecent.map((match) => match.timeline.goldAt15)) - avg(fallbackBaseline.map((match) => match.timeline.goldAt15)),
    baselineKillParticipation: rawTrend.baselineKillParticipation ?? avg(fallbackBaseline.map((match) => match.killParticipation)),
    recentKillParticipation: rawTrend.recentKillParticipation ?? avg(fallbackRecent.map((match) => match.killParticipation)),
    killParticipationDelta: rawTrend.killParticipationDelta ?? avg(fallbackRecent.map((match) => match.killParticipation)) - avg(fallbackBaseline.map((match) => match.killParticipation)),
    baselineDeathsPre14: rawTrend.baselineDeathsPre14 ?? avg(fallbackBaseline.map((match) => match.timeline.deathsPre14)),
    recentDeathsPre14: rawTrend.recentDeathsPre14 ?? avg(fallbackRecent.map((match) => match.timeline.deathsPre14)),
    deathsPre14Delta: rawTrend.deathsPre14Delta ?? avg(fallbackRecent.map((match) => match.timeline.deathsPre14)) - avg(fallbackBaseline.map((match) => match.timeline.deathsPre14))
  };
  const championReference = buildScopedChampionReference(dataset);
  const problematicMatchup = summary.problematicMatchup;
  const primaryInsight = summary.coaching.primaryInsight;
  const topProblems = summary.coaching.topProblems;
  const activePlan = summary.coaching.activePlan;
  const fallbackPositives = summary.insights.filter((insight) => insight.category === "positive");
  const positives = (summary.positiveSignals?.length ? summary.positiveSignals : fallbackPositives).slice(0, 2);
  const reviewAgenda = (summary.reviewAgenda?.length ? summary.reviewAgenda : buildFallbackReviewAgenda(dataset.matches, locale)).map((item) => {
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
  }).slice(0, 3);
  const stableMatches = dataset.matches.filter((match) => match.timeline.deathsPre14 <= summary.avgDeathsPre14 && match.timeline.csAt15 >= summary.avgCsAt15);
  const stableWinRate = stableMatches.length ? stableMatches.filter((match) => match.win).length / stableMatches.length * 100 : null;
  const mainProblem = topProblems[0] ?? null;
  const secondaryProblem = topProblems[1] ?? null;
  const secondaryFocus = primaryInsight?.nextFocus ?? (secondaryProblem ? {
    headline: secondaryProblem.problem,
    summary: secondaryProblem.interpretation === "observational" ? t(locale, "Seguilo como segundo foco: todav\xEDa suma m\xE1s confirmarlo que convertirlo en headline.", "Keep tracking it as the second focus: it still adds more value as a monitored signal than as the headline.") : t(locale, "Cuando la lectura central se estabilice, este es el siguiente ajuste con m\xE1s retorno.", "Once the central read settles, this is the next adjustment with the best upside."),
    action: secondaryProblem.actions[0] ?? null,
    evidenceStrength: secondaryProblem.evidenceStrength ?? null
  } : null);
  const mainTitle = aiCoach?.coach.mainLeak ?? primaryInsight?.headline ?? mainProblem?.problem ?? summary.coaching.headline;
  const mainSummary = aiCoach?.coach.summary ?? primaryInsight?.summary ?? mainProblem?.title ?? summary.coaching.subheadline;
  const mainImpact = primaryInsight?.whyItMatters ?? mainProblem?.impact ?? null;
  const mainCause = aiCoach?.coach.whyItHappens ?? primaryInsight?.whyItHappens ?? mainProblem?.cause ?? null;
  const mainEvidence = (primaryInsight?.evidence?.length ? primaryInsight.evidence : mainProblem?.evidence ?? []).slice(0, 2);
  const mainCaution = primaryInsight?.caution ?? mainProblem?.sampleWarning ?? null;
  const mainPriority = primaryInsight?.priority ?? mainProblem?.priority ?? null;
  const mainEvidenceStrength = primaryInsight?.evidenceStrength ?? mainProblem?.evidenceStrength ?? null;
  const mainInterpretation = primaryInsight?.interpretation ?? mainProblem?.interpretation ?? null;
  const mainSampleSize = mainProblem?.sampleSize ?? null;
  const todayActions = (aiCoach?.coach.whatToDoNext3Games?.length ? aiCoach.coach.whatToDoNext3Games : primaryInsight?.actions?.length ? primaryInsight.actions : mainProblem?.actions ?? []).slice(0, 3);
  const prepBrief = useMemo(
    () => buildChampionPrepBrief({
      dataset,
      locale,
      anchorChampion: championReference,
      mainProblem,
      todayActions,
      aiCoach,
      problematicMatchup
    }),
    [dataset, locale, championReference, mainProblem, todayActions, aiCoach, problematicMatchup]
  );
  const steadyLabel = t(locale, "estable", "stable");
  const performanceTrend = signal(trend.scoreDelta, "up", 0.25);
  const changeSummary = performanceTrend.tone === "positive" ? t(locale, "El tramo reciente ya est\xE1 empujando el bloque hacia arriba frente a la base anterior.", "The recent stretch is already pushing the block upward against the previous baseline.") : performanceTrend.tone === "negative" ? t(locale, "El tramo reciente cedi\xF3 frente al bloque anterior y conviene estabilizarlo antes de abrir m\xE1s variables.", "The recent stretch slipped versus the previous block and should be stabilized before adding more variables.") : t(locale, "No aparece un salto ni una ca\xEDda clara: el bloque sigue pidiendo consistencia antes que conclusiones r\xE1pidas.", "There is no clear jump or drop: the block is still asking for consistency before quick conclusions.");
  const metricCards = [
    {
      label: t(locale, "WR reciente", "Recent WR"),
      value: `${formatDecimal(trend.recentWinRate)}%`,
      detail: comparisonDetail(locale, `${formatDecimal(trend.baselineWinRate)}%`, `${formatDecimal(trend.recentWinRate)}%`, trend.baselineMatches, trend.recentMatches),
      trend: withSteadyLabel(signal(trend.winRateDelta, "up", 1), steadyLabel, delta(trend.winRateDelta, " pts"))
    },
    {
      label: t(locale, "Rendimiento", "Performance"),
      value: formatDecimal(trend.recentScore),
      detail: comparisonDetail(locale, formatDecimal(trend.baselineScore), formatDecimal(trend.recentScore), trend.baselineMatches, trend.recentMatches),
      trend: withSteadyLabel(signal(trend.scoreDelta, "up", 0.25), steadyLabel, delta(trend.scoreDelta))
    },
    {
      label: "CS@15",
      value: formatDecimal(trend.recentCsAt15),
      detail: comparisonDetail(locale, formatDecimal(trend.baselineCsAt15), formatDecimal(trend.recentCsAt15), trend.baselineMatches, trend.recentMatches),
      trend: withSteadyLabel(signal(trend.csAt15Delta, "up", 1), steadyLabel, delta(trend.csAt15Delta))
    },
    {
      label: "Gold@15",
      value: formatInteger(trend.recentGoldAt15),
      detail: comparisonDetail(locale, formatInteger(trend.baselineGoldAt15), formatInteger(trend.recentGoldAt15), trend.baselineMatches, trend.recentMatches),
      trend: withSteadyLabel(signal(trend.goldAt15Delta, "up", 120), steadyLabel, delta(trend.goldAt15Delta, "", 0))
    },
    {
      label: t(locale, "Consistencia", "Consistency"),
      value: formatDecimal(trend.recentConsistency),
      detail: comparisonDetail(locale, formatDecimal(trend.baselineConsistency), formatDecimal(trend.recentConsistency), trend.baselineMatches, trend.recentMatches),
      trend: withSteadyLabel(signal(trend.consistencyDelta, "up", 1.5), steadyLabel, delta(trend.consistencyDelta))
    },
    {
      label: t(locale, "Muertes pre14", "Deaths pre14"),
      value: formatDecimal(trend.recentDeathsPre14),
      detail: comparisonDetail(locale, formatDecimal(trend.baselineDeathsPre14), formatDecimal(trend.recentDeathsPre14), trend.baselineMatches, trend.recentMatches),
      trend: withSteadyLabel(signal(trend.deathsPre14Delta, "down", 0.15), steadyLabel, delta(trend.deathsPre14Delta))
    },
    {
      label: "KP",
      value: `${formatDecimal(trend.recentKillParticipation)}%`,
      detail: comparisonDetail(locale, `${formatDecimal(trend.baselineKillParticipation)}%`, `${formatDecimal(trend.recentKillParticipation)}%`, trend.baselineMatches, trend.recentMatches),
      trend: withSteadyLabel(signal(trend.killParticipationDelta, "up", 2), steadyLabel, delta(trend.killParticipationDelta, " pts"))
    }
  ];
  const anchorSignals = championReference ? [
    {
      label: "WR",
      value: `${formatDecimal(championReference.winRate)}%`,
      detail: t(locale, `${championReference.games} partidas del pick`, `${championReference.games} games on the pick`),
      trend: withSteadyLabel(signal(championReference.winRate - summary.winRate, "up", 3), steadyLabel, delta(championReference.winRate - summary.winRate, " pts"))
    },
    {
      label: t(locale, "Rendimiento", "Performance"),
      value: formatDecimal(championReference.avgScore),
      detail: t(locale, "cuando el plan sale limpio", "when the plan looks clean"),
      trend: withSteadyLabel(signal(championReference.avgScore - summary.avgPerformanceScore, "up", 0.3), steadyLabel, delta(championReference.avgScore - summary.avgPerformanceScore))
    },
    {
      label: "CS@15",
      value: formatDecimal(championReference.avgCsAt15),
      detail: t(locale, "piso econ\xF3mico del pick", "economic floor of the pick"),
      trend: withSteadyLabel(signal(championReference.avgCsAt15 - summary.avgCsAt15, "up", 1), steadyLabel, delta(championReference.avgCsAt15 - summary.avgCsAt15))
    },
    {
      label: t(locale, "Muertes pre14", "Deaths pre14"),
      value: formatDecimal(championReference.avgDeathsPre14),
      detail: t(locale, "disciplina del early", "early discipline"),
      trend: withSteadyLabel(signal(championReference.avgDeathsPre14 - summary.avgDeathsPre14, "down", 0.15), steadyLabel, delta(championReference.avgDeathsPre14 - summary.avgDeathsPre14))
    }
  ] : [];
  return /* @__PURE__ */ jsxs("div", { style: { display: "grid", gap: 16 }, children: [
    /* @__PURE__ */ jsx(
      CoachPremiumWorkspace,
      {
        dataset,
        locale,
        rosterPlayers: coachRosterPlayers,
        roleReferences,
        canManageRoster: canManageCoachRoster
      }
    ),
    /* @__PURE__ */ jsxs(Card, { title: t(locale, "Lectura central del bloque", "Central block read"), subtitle: t(locale, "Una sola lectura para decidir qu\xE9 corregir primero, por qu\xE9 confiar en ella y qu\xE9 dejar para despu\xE9s.", "One read to decide what to correct first, why it deserves trust and what should wait."), children: [
      /* @__PURE__ */ jsxs("div", { className: "coaching-hero-grid", style: { display: "grid", gridTemplateColumns: "minmax(0, 1.45fr) minmax(320px, 0.95fr)", gap: 16, alignItems: "start" }, children: [
        /* @__PURE__ */ jsxs("div", { style: { display: "grid", gap: 14 }, children: [
          /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 8, flexWrap: "wrap" }, children: [
            mainPriority ? /* @__PURE__ */ jsx(Badge, { tone: infoTone(mainPriority), children: t(locale, `Prioridad ${mainPriority}`, `${mainPriority} priority`) }) : null,
            mainEvidenceStrength ? /* @__PURE__ */ jsx(Badge, { tone: readStrengthTone(mainEvidenceStrength), children: readStrengthLabel(mainEvidenceStrength, mainInterpretation, locale) }) : null,
            mainSampleSize ? /* @__PURE__ */ jsx(Badge, { tone: "default", children: t(locale, `${mainSampleSize} partidas del scope`, `${mainSampleSize} scoped games`) }) : null,
            aiCoach ? /* @__PURE__ */ jsx(Badge, { tone: "default", children: `${Math.round(aiCoach.coach.confidence * 100)}% ${t(locale, "confianza", "confidence")}` }) : null,
            aiCoach ? /* @__PURE__ */ jsx(Badge, { tone: aiCoach.context.player.profileStrength === "elite" ? "low" : aiCoach.context.player.profileStrength === "advanced" ? "default" : "medium", children: buildProfileStrengthLabel(aiCoach.context.player.profileStrength, locale) }) : null,
            aiCoach?.continuity.mode === "reused" ? /* @__PURE__ */ jsx(Badge, { tone: "default", children: t(locale, "Bloque reutilizado", "Reused block") }) : null,
            aiCoach?.continuity.mode === "updated" ? /* @__PURE__ */ jsx(Badge, { tone: "low", children: t(locale, `+${aiCoach.continuity.newVisibleMatches} nuevas`, `+${aiCoach.continuity.newVisibleMatches} new`) }) : null
          ] }),
          /* @__PURE__ */ jsx("div", { style: { color: "#eef4ff", fontSize: 32, fontWeight: 800, letterSpacing: "-0.04em", lineHeight: 1.05 }, children: mainTitle }),
          /* @__PURE__ */ jsx("div", { style: { color: "#a6b3c6", fontSize: 15, lineHeight: 1.75 }, children: mainSummary }),
          mainImpact || mainCause ? /* @__PURE__ */ jsxs("div", { className: "two-col-grid", style: { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 10 }, children: [
            mainImpact ? /* @__PURE__ */ jsx(InfoBlock, { title: t(locale, "Por qu\xE9 pesa hoy", "Why it matters now"), info: t(locale, "El costo competitivo de seguir jugando con este patr\xF3n abierto.", "The competitive cost of leaving this pattern open."), children: mainImpact }) : null,
            mainCause ? /* @__PURE__ */ jsx(InfoBlock, { title: t(locale, "Qu\xE9 lo est\xE1 provocando", "What is driving it"), info: t(locale, "La explicaci\xF3n m\xE1s probable detr\xE1s de la lectura central.", "The most likely explanation behind the central read."), children: mainCause }) : null
          ] }) : null,
          mainEvidence.length ? /* @__PURE__ */ jsxs("div", { style: panelStyle, children: [
            /* @__PURE__ */ jsx(SectionEyebrow, { title: t(locale, "Lo que sostiene esta lectura", "What supports this read") }),
            /* @__PURE__ */ jsx("div", { style: { display: "grid", gap: 8 }, children: mainEvidence.map((entry) => /* @__PURE__ */ jsx("div", { style: compactListStyle, children: entry }, entry)) })
          ] }) : null,
          mainCaution ? /* @__PURE__ */ jsxs("div", { style: { ...panelStyle, borderColor: "rgba(255,214,102,0.2)", background: "linear-gradient(180deg, rgba(24,19,9,0.82), rgba(12,10,6,0.94))" }, children: [
            /* @__PURE__ */ jsx(SectionEyebrow, { title: t(locale, "L\xEDmite de la lectura", "Read boundary") }),
            /* @__PURE__ */ jsx("div", { style: { color: "#f5dfab", lineHeight: 1.65 }, children: mainCaution })
          ] }) : null,
          aiCoachError ? /* @__PURE__ */ jsx("div", { style: errorStyle, children: aiCoachError }) : null,
          /* @__PURE__ */ jsxs("div", { style: { display: "grid", gap: 8 }, children: [
            /* @__PURE__ */ jsx(SectionEyebrow, { title: t(locale, "Qu\xE9 corregir primero", "What to correct first") }),
            todayActions.length ? todayActions.map((action, index) => /* @__PURE__ */ jsxs("div", { style: stepStyle, children: [
              /* @__PURE__ */ jsx("div", { style: stepIndexStyle, children: index + 1 }),
              /* @__PURE__ */ jsx("div", { style: { color: "#e8eef9", lineHeight: 1.65 }, children: action })
            ] }, action)) : /* @__PURE__ */ jsx("div", { style: emptyStyle, children: t(locale, "Todav\xEDa no hay una acci\xF3n clara. Sum\xE1 muestra o refresc\xE1 el coaching.", "There is no clear action yet. Add sample or refresh coaching.") })
          ] })
        ] }),
        /* @__PURE__ */ jsxs("div", { style: { display: "grid", gap: 12 }, children: [
          /* @__PURE__ */ jsxs("div", { style: panelStyle, children: [
            /* @__PURE__ */ jsx(SectionEyebrow, { title: t(locale, "Bloque actual", "Current block") }),
            activePlan ? /* @__PURE__ */ jsxs("div", { style: { display: "grid", gap: 10 }, children: [
              /* @__PURE__ */ jsx("div", { style: { color: "#eef4ff", fontSize: 22, fontWeight: 800, lineHeight: 1.2 }, children: activePlan.objective }),
              /* @__PURE__ */ jsx("div", { style: { color: "#a4afc1", lineHeight: 1.6 }, children: activePlan.focus }),
              /* @__PURE__ */ jsxs("div", { style: { display: "grid", gap: 8 }, children: [
                /* @__PURE__ */ jsxs("div", { style: { display: "flex", justifyContent: "space-between", color: "#d7dfec", fontSize: 13 }, children: [
                  /* @__PURE__ */ jsx("span", { children: t(locale, "Progreso", "Progress") }),
                  /* @__PURE__ */ jsx("span", { children: activePlan.successLabel })
                ] }),
                /* @__PURE__ */ jsx("div", { style: trackStyle, children: /* @__PURE__ */ jsx("div", { style: { ...fillStyle, width: `${activePlan.progressPercent}%` } }) }),
                /* @__PURE__ */ jsx("div", { style: { color: "#8fa0b7", fontSize: 13 }, children: t(locale, `${activePlan.completedGames}/${activePlan.targetGames} partidas cuentan para este bloque.`, `${activePlan.completedGames}/${activePlan.targetGames} games count toward this block.`) })
              ] })
            ] }) : /* @__PURE__ */ jsx("div", { style: { color: "#d7dfec", lineHeight: 1.7 }, children: t(locale, "Todav\xEDa no hay un ciclo suficientemente claro. Conviene sumar muestra limpia o cerrar m\xE1s el scope.", "There is not a clear enough cycle yet. Add cleaner sample or narrow the scope further.") }),
            /* @__PURE__ */ jsx("button", { type: "button", style: buttonStyle, onClick: onGenerateAICoach, disabled: !onGenerateAICoach || generatingAICoach, children: generatingAICoach ? t(locale, "Actualizando coaching...", "Refreshing coaching...") : t(locale, "Actualizar coaching", "Refresh coaching") })
          ] }),
          secondaryFocus ? /* @__PURE__ */ jsxs("div", { style: panelStyle, children: [
            /* @__PURE__ */ jsx(SectionEyebrow, { title: t(locale, "Despu\xE9s de estabilizar esto", "After this is stable") }),
            /* @__PURE__ */ jsxs("div", { style: { display: "grid", gap: 10 }, children: [
              /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }, children: [
                /* @__PURE__ */ jsx("div", { style: { color: "#eef4ff", fontSize: 18, fontWeight: 800, lineHeight: 1.25 }, children: secondaryFocus.headline }),
                secondaryFocus.evidenceStrength ? /* @__PURE__ */ jsx(Badge, { tone: readStrengthTone(secondaryFocus.evidenceStrength), children: readStrengthLabel(secondaryFocus.evidenceStrength, null, locale) }) : null
              ] }),
              /* @__PURE__ */ jsx("div", { style: { color: "#9aa5b7", lineHeight: 1.6 }, children: secondaryFocus.summary }),
              secondaryFocus.action ? /* @__PURE__ */ jsx("div", { style: actionStyle, children: secondaryFocus.action }) : null
            ] })
          ] }) : null,
          /* @__PURE__ */ jsxs("div", { className: "coaching-meta-grid", style: { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12, alignItems: "start" }, children: [
            /* @__PURE__ */ jsx(MetaStat, { label: t(locale, "Muestra", "Sample"), value: `${summary.matches}`, caption: t(locale, "partidas del scope", "games in scope") }),
            /* @__PURE__ */ jsx(MetaStat, { label: t(locale, "Tramo reciente", "Recent block"), value: `${trend.recentMatches}`, caption: t(locale, "partidas comparadas ahora", "games compared now") }),
            /* @__PURE__ */ jsx(MetaStat, { label: t(locale, "Patr\xF3n estable", "Stable pattern"), value: stableWinRate !== null ? `${formatDecimal(stableWinRate)}% WR` : t(locale, "Sin se\xF1al", "No signal"), caption: stableMatches.length ? t(locale, `${stableMatches.length} partidas limpias`, `${stableMatches.length} clean games`) : t(locale, "todav\xEDa sin bloque limpio", "no clean block yet") }),
            /* @__PURE__ */ jsx(MetaStat, { label: t(locale, "Cruce m\xE1s duro", "Hardest matchup"), value: problematicMatchup ? `vs ${formatChampionName(problematicMatchup.opponentChampionName)}` : t(locale, "Sin alerta", "No alert"), caption: problematicMatchup ? problematicMatchup.directGames >= 2 ? t(locale, `${problematicMatchup.directGames} cruces directos`, `${problematicMatchup.directGames} direct games`) : t(locale, `${problematicMatchup.recentLosses} derrotas repetidas`, `${problematicMatchup.recentLosses} repeated losses`) : t(locale, "sin patr\xF3n repetido", "no repeated pattern") })
          ] }),
          onSendFeedback && aiCoach ? /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 8, flexWrap: "wrap" }, children: [
            /* @__PURE__ */ jsx("button", { type: "button", style: feedbackStyle, onClick: () => onSendFeedback("useful"), children: t(locale, "\xDAtil", "Useful") }),
            /* @__PURE__ */ jsx("button", { type: "button", style: feedbackStyle, onClick: () => onSendFeedback("mixed"), children: t(locale, "Mixto", "Mixed") }),
            /* @__PURE__ */ jsx("button", { type: "button", style: feedbackStyle, onClick: () => onSendFeedback("generic"), children: t(locale, "Gen\xE9rico", "Generic") }),
            /* @__PURE__ */ jsx("button", { type: "button", style: feedbackStyle, onClick: () => onSendFeedback("incorrect"), children: t(locale, "Incorrecto", "Incorrect") })
          ] }) : null
        ] })
      ] }),
      /* @__PURE__ */ jsxs("div", { style: { display: "grid", gap: 10, marginTop: 18 }, children: [
        /* @__PURE__ */ jsx(SectionEyebrow, { title: t(locale, "Se\xF1ales r\xE1pidas", "Quick signals") }),
        /* @__PURE__ */ jsx("div", { className: "coaching-signal-grid", style: { display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12, alignItems: "start" }, children: metricCards.map((metric) => /* @__PURE__ */ jsx(SignalTile, { ...metric }, metric.label)) })
      ] })
    ] }),
    prepBrief ? /* @__PURE__ */ jsx(
      Card,
      {
        title: t(locale, "Plan para tu pr\xF3xima cola", "Plan for your next queue"),
        subtitle: t(
          locale,
          "La idea es cerrar la distancia entre diagn\xF3stico y ejecuci\xF3n: qu\xE9 pick usar como base, qu\xE9 p\xE1gina respetar, qu\xE9 build tomar y qu\xE9 no abrir todav\xEDa.",
          "The goal is to close the gap between diagnosis and execution: which pick to use as a base, which page to respect, which build to take and what should not be opened yet."
        ),
        children: /* @__PURE__ */ jsxs("div", { style: { display: "grid", gap: 16 }, children: [
          /* @__PURE__ */ jsxs("div", { className: "coaching-hero-grid", style: { display: "grid", gridTemplateColumns: "minmax(0, 1.2fr) minmax(280px, 0.8fr)", gap: 16, alignItems: "start" }, children: [
            /* @__PURE__ */ jsxs("div", { style: panelStyle, children: [
              /* @__PURE__ */ jsxs("div", { style: { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start", flexWrap: "wrap" }, children: [
                /* @__PURE__ */ jsx(
                  ChampionIdentity,
                  {
                    championName: prepBrief.championName,
                    version: dataset.ddragonVersion,
                    subtitle: t(
                      locale,
                      "Este es el pick que hoy conviene usar como base operativa del bloque.",
                      "This is the pick worth using today as the operating base of the block."
                    ),
                    size: 62
                  }
                ),
                /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "end" }, children: [
                  /* @__PURE__ */ jsx(Badge, { tone: prepBrief.readiness === "full" ? "low" : "medium", children: prepBrief.readiness === "full" ? t(locale, "Prep completa", "Full prep") : t(locale, "Prep parcial", "Partial prep") }),
                  prepBrief.matchupSummary ? /* @__PURE__ */ jsx(Badge, { tone: "default", children: t(locale, "Con lectura de matchup", "Matchup-aware") }) : null
                ] })
              ] }),
              /* @__PURE__ */ jsx("div", { style: { color: "#eef4ff", fontSize: 24, fontWeight: 800, lineHeight: 1.15 }, children: t(locale, "C\xF3mo tiene que sentirse esta versi\xF3n", "How this version should feel") }),
              /* @__PURE__ */ jsx("div", { style: { color: "#a4afc1", lineHeight: 1.7 }, children: prepBrief.operatingSummary }),
              prepBrief.focusNote ? /* @__PURE__ */ jsx("div", { style: actionStyle, children: prepBrief.focusNote }) : null,
              prepBrief.matchupSummary ? /* @__PURE__ */ jsxs("div", { style: { ...compactListStyle, background: "rgba(255,255,255,0.035)" }, children: [
                /* @__PURE__ */ jsx("strong", { style: { color: "#eef4ff" }, children: t(locale, "Matchup watchpoint:", "Matchup watchpoint:") }),
                " ",
                prepBrief.matchupSummary
              ] }) : null
            ] }),
            /* @__PURE__ */ jsx("div", { style: { display: "grid", gap: 12 }, children: /* @__PURE__ */ jsxs("div", { style: panelStyle, children: [
              /* @__PURE__ */ jsx(SectionEyebrow, { title: t(locale, "Checklist corto", "Short checklist") }),
              /* @__PURE__ */ jsx("div", { style: { display: "grid", gap: 10 }, children: prepBrief.checklist.map((entry, index) => /* @__PURE__ */ jsx(PrepChecklistStep, { index: index + 1, label: entry.label, source: entry.source, locale }, `${entry.source}-${entry.label}`)) })
            ] }) })
          ] }),
          /* @__PURE__ */ jsxs("div", { className: "three-col-grid", style: { display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12, alignItems: "start" }, children: [
            /* @__PURE__ */ jsx(
              PrepSectionCard,
              {
                eyebrow: t(locale, "Matchup / contexto", "Matchup / context"),
                title: prepBrief.matchupSummary ? t(locale, "Qu\xE9 respetar cuando el contexto se pone duro", "What to respect when the context gets harder") : t(locale, "Contexto operativo", "Operating context"),
                summary: prepBrief.matchupSummary ?? t(locale, "Todav\xEDa no hay un matchup repetido lo bastante fuerte como para cambiar el plan base del pick.", "There is no repeated matchup strong enough yet to change the base plan of the pick."),
                children: prepBrief.matchupAdjustments.length ? /* @__PURE__ */ jsx("div", { style: { display: "grid", gap: 8 }, children: prepBrief.matchupAdjustments.map((entry) => /* @__PURE__ */ jsx("div", { style: actionStyle, children: entry }, entry)) }) : /* @__PURE__ */ jsx("div", { style: emptyStyle, children: t(locale, "La prioridad sigue siendo ejecutar mejor tu plan base antes de abrir respuestas m\xE1s finas.", "The priority is still to execute your base plan better before opening finer responses.") })
              }
            ),
            /* @__PURE__ */ jsx(
              PrepSectionCard,
              {
                eyebrow: t(locale, "Runas", "Runes"),
                title: prepBrief.runePlan ? prepBrief.runePlan.defaultPage : t(locale, "Sin p\xE1gina cerrada", "No closed page yet"),
                summary: prepBrief.runePlan?.baselineSummary ?? t(locale, "Todav\xEDa no hay una p\xE1gina con suficiente repetici\xF3n dentro de este campe\xF3n.", "There is still no page with enough repetition inside this champion."),
                badge: prepBrief.runePlan?.evidenceTier ? /* @__PURE__ */ jsx(Badge, { tone: evidenceTone(prepBrief.runePlan.evidenceTier), children: evidenceBadgeLabel(prepBrief.runePlan.evidenceTier, locale) }) : null,
                children: prepBrief.runePlan ? /* @__PURE__ */ jsxs("div", { style: { display: "grid", gap: 10 }, children: [
                  /* @__PURE__ */ jsx("div", { style: { color: "#dce6f5", lineHeight: 1.65 }, children: prepBrief.runePlan.swapSummary }),
                  /* @__PURE__ */ jsx("div", { style: { display: "flex", gap: 8, flexWrap: "wrap" }, children: prepBrief.runePlan.supportingChips.map((entry) => /* @__PURE__ */ jsx("span", { style: chipStyle, children: entry }, entry)) })
                ] }) : /* @__PURE__ */ jsx("div", { style: emptyStyle, children: t(locale, "Este campe\xF3n todav\xEDa necesita m\xE1s muestra repetida para cerrar una lectura \xFAtil de p\xE1gina default.", "This champion still needs more repeated sample to close a useful default page read.") })
              }
            ),
            /* @__PURE__ */ jsx(
              PrepSectionCard,
              {
                eyebrow: t(locale, "Build", "Build"),
                title: prepBrief.buildPlan.defaultPath ?? (prepBrief.buildPlan.status === "needs-refresh" ? t(locale, "Refresh pendiente", "Refresh required") : t(locale, "Familia todav\xEDa abierta", "Family still open")),
                summary: prepBrief.buildPlan.baselineSummary,
                badge: prepBrief.buildPlan.evidenceTier ? /* @__PURE__ */ jsx(Badge, { tone: evidenceTone(prepBrief.buildPlan.evidenceTier), children: evidenceBadgeLabel(prepBrief.buildPlan.evidenceTier, locale) }) : prepBrief.buildPlan.status === "needs-refresh" ? /* @__PURE__ */ jsx(Badge, { tone: "medium", children: t(locale, "Falta refresh", "Refresh needed") }) : null,
                children: /* @__PURE__ */ jsxs("div", { style: { display: "grid", gap: 10 }, children: [
                  /* @__PURE__ */ jsx("div", { style: { color: "#dce6f5", lineHeight: 1.65 }, children: prepBrief.buildPlan.swapSummary }),
                  prepBrief.buildPlan.supportingChips.length ? /* @__PURE__ */ jsx("div", { style: { display: "flex", gap: 8, flexWrap: "wrap" }, children: prepBrief.buildPlan.supportingChips.map((entry) => /* @__PURE__ */ jsx("span", { style: chipStyle, children: entry }, entry)) }) : null
                ] })
              }
            )
          ] })
        ] })
      }
    ) : null,
    /* @__PURE__ */ jsxs("section", { className: "coaching-overview-grid", style: { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 16, alignItems: "start" }, children: [
      /* @__PURE__ */ jsx(Card, { title: t(locale, "Base que ya te sostiene hoy", "What is already holding you up"), subtitle: t(locale, "Fusionamos tu pick de referencia con lo que ya te da nivel para que la lectura sea m\xE1s directa y menos redundante.", "We merge your reference pick with what is already giving you level so the read feels stronger and less redundant."), children: /* @__PURE__ */ jsxs("div", { style: { display: "grid", gap: 12 }, children: [
        championReference ? /* @__PURE__ */ jsxs("div", { style: panelStyle, children: [
          /* @__PURE__ */ jsxs("div", { style: { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start", flexWrap: "wrap" }, children: [
            /* @__PURE__ */ jsx(
              ChampionIdentity,
              {
                championName: championReference.championName,
                version: dataset.ddragonVersion,
                subtitle: t(
                  locale,
                  `${championReference.games} partidas del scope \xB7 ${formatDecimal(championReference.winRate)}% WR`,
                  `${championReference.games} scoped games \xB7 ${formatDecimal(championReference.winRate)}% WR`
                ),
                meta: /* @__PURE__ */ jsxs(Fragment, { children: [
                  /* @__PURE__ */ jsx("span", { style: chipStyle, children: /* @__PURE__ */ jsx("span", { children: `CS@15 ${formatDecimal(championReference.avgCsAt15)}` }) }),
                  /* @__PURE__ */ jsx("span", { style: chipStyle, children: /* @__PURE__ */ jsx("span", { children: `${t(locale, "Muertes pre14", "Deaths pre14")} ${formatDecimal(championReference.avgDeathsPre14)}` }) })
                ] }),
                size: 62
              }
            ),
            /* @__PURE__ */ jsx(Badge, { tone: "low", children: t(locale, "Pick m\xE1s limpio", "Cleanest pick") })
          ] }),
          /* @__PURE__ */ jsx("div", { style: { color: "#9aa5b7", lineHeight: 1.65 }, children: problematicMatchup ? t(locale, `Tomalo como tu base de referencia: ac\xE1 se ve mejor qu\xE9 h\xE1bitos sostienen el bloque y c\xF3mo cambia el plan cuando aparece ${formatChampionName(problematicMatchup.opponentChampionName)}.`, `Use it as your reference base: this is where it is easiest to see which habits are holding the block and how the plan changes when ${formatChampionName(problematicMatchup.opponentChampionName)} shows up.`) : t(locale, "Es la versi\xF3n donde el plan se ve m\xE1s ordenado hoy. Si quer\xE9s copiar algo, copi\xE1 esta estructura y no solo el resultado final.", "This is the version where the plan looks most organized right now. If you want to copy something, copy this structure, not only the final result.") }),
          /* @__PURE__ */ jsx("div", { className: "four-col-grid", style: { display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 10 }, children: anchorSignals.map((entry) => /* @__PURE__ */ jsx(AnchorMetric, { ...entry }, entry.label)) })
        ] }) : null,
        positives.length ? /* @__PURE__ */ jsx("div", { className: "coaching-strength-grid", style: { display: "grid", gridTemplateColumns: positives.length > 1 ? "repeat(2, minmax(0, 1fr))" : "1fr", gap: 10 }, children: positives.map((insight) => /* @__PURE__ */ jsxs("div", { style: strengthItemStyle, children: [
          /* @__PURE__ */ jsxs("div", { style: { display: "flex", justifyContent: "space-between", gap: 10, alignItems: "start", flexWrap: "wrap" }, children: [
            /* @__PURE__ */ jsxs("div", { style: { display: "grid", gap: 6 }, children: [
              /* @__PURE__ */ jsx("div", { style: { color: "#eef4ff", fontSize: 18, fontWeight: 800, lineHeight: 1.22 }, children: insight.problem }),
              /* @__PURE__ */ jsx("div", { style: { color: "#9aa5b7", lineHeight: 1.55 }, children: insight.title })
            ] }),
            /* @__PURE__ */ jsx(Badge, { tone: "low", children: t(locale, "Te sostiene", "Holding") })
          ] }),
          insight.evidence[0] ? /* @__PURE__ */ jsx("div", { style: compactListStyle, children: insight.evidence[0] }) : null,
          insight.actions.slice(0, 1).map((action) => /* @__PURE__ */ jsx("div", { style: actionStyle, children: action }, action))
        ] }, insight.id)) }) : /* @__PURE__ */ jsx("div", { style: emptyStyle, children: t(locale, "Todav\xEDa no aparece una fortaleza clara en este scope.", "There is no clear strength in this scope yet.") })
      ] }) }),
      /* @__PURE__ */ jsx(Card, { title: t(locale, "Qu\xE9 cambi\xF3 de verdad", "What actually changed"), subtitle: t(locale, "No es otra lectura: es la evidencia comparativa de si el bloque realmente mejora, cae o sigue plano.", "This is not another read: it is the comparative evidence for whether the block is really improving, slipping or staying flat."), children: /* @__PURE__ */ jsxs("div", { style: { display: "grid", gap: 10 }, children: [
        /* @__PURE__ */ jsx("div", { style: panelStyle, children: /* @__PURE__ */ jsxs("div", { style: { display: "flex", justifyContent: "space-between", gap: 12, alignItems: "start", flexWrap: "wrap" }, children: [
          /* @__PURE__ */ jsxs("div", { style: { display: "grid", gap: 6 }, children: [
            /* @__PURE__ */ jsx("div", { style: { color: "#eef4ff", fontSize: 20, fontWeight: 800, lineHeight: 1.2 }, children: changeSummary }),
            /* @__PURE__ */ jsx("div", { style: { color: "#9aa5b7", lineHeight: 1.6 }, children: t(locale, `Comparaci\xF3n usada: ${trend.baselineMatches} partidas previas contra ${trend.recentMatches} partidas recientes.`, `Comparison used: ${trend.baselineMatches} earlier games against ${trend.recentMatches} recent games.`) })
          ] }),
          /* @__PURE__ */ jsxs("span", { style: chipStyle, children: [
            /* @__PURE__ */ jsx(TrendIndicator, { direction: performanceTrend.direction, tone: performanceTrend.tone }),
            /* @__PURE__ */ jsx("span", { children: performanceTrend.direction === "steady" ? t(locale, "parejo", "steady") : performanceTrend.tone === "positive" ? t(locale, "mejora", "improving") : t(locale, "retroceso", "slipping") })
          ] })
        ] }) }),
        /* @__PURE__ */ jsx(ProgressRow, { label: t(locale, "Rendimiento", "Performance"), baseline: formatDecimal(trend.baselineScore), recent: formatDecimal(trend.recentScore), trend: signal(trend.scoreDelta, "up", 0.25), deltaLabel: delta(trend.scoreDelta), locale }),
        /* @__PURE__ */ jsx(ProgressRow, { label: "WR", baseline: `${formatDecimal(trend.baselineWinRate)}%`, recent: `${formatDecimal(trend.recentWinRate)}%`, trend: signal(trend.winRateDelta, "up", 1), deltaLabel: delta(trend.winRateDelta, " pts"), locale }),
        /* @__PURE__ */ jsx(ProgressRow, { label: "Gold@15", baseline: formatInteger(trend.baselineGoldAt15), recent: formatInteger(trend.recentGoldAt15), trend: signal(trend.goldAt15Delta, "up", 120), deltaLabel: delta(trend.goldAt15Delta, "", 0), locale }),
        /* @__PURE__ */ jsx(ProgressRow, { label: t(locale, "Muertes pre14", "Deaths pre14"), baseline: formatDecimal(trend.baselineDeathsPre14), recent: formatDecimal(trend.recentDeathsPre14), trend: signal(trend.deathsPre14Delta, "down", 0.15), deltaLabel: delta(trend.deathsPre14Delta), locale }),
        /* @__PURE__ */ jsx(ProgressRow, { label: t(locale, "Consistencia", "Consistency"), baseline: formatDecimal(trend.baselineConsistency), recent: formatDecimal(trend.recentConsistency), trend: signal(trend.consistencyDelta, "up", 1.5), deltaLabel: delta(trend.consistencyDelta), locale })
      ] }) })
    ] }),
    /* @__PURE__ */ jsx("section", { style: { display: "grid", gap: 16 }, children: /* @__PURE__ */ jsx(Card, { title: t(locale, "El cruce que hoy m\xE1s te castiga", "The matchup hurting you most right now"), subtitle: t(locale, "Si se repite, deja de ser mala suerte y pasa a ser preparaci\xF3n concreta.", "If it keeps repeating, it stops being bad luck and becomes concrete prep work."), children: problematicMatchup ? /* @__PURE__ */ jsxs("div", { style: { display: "grid", gap: 14 }, children: [
      /* @__PURE__ */ jsxs("div", { className: "two-col-grid", style: { display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: 12 }, children: [
        /* @__PURE__ */ jsx(InfoBlock, { title: t(locale, "Tu pick en este scope", "Your pick in this scope"), info: t(locale, "El campe\xF3n m\xE1s jugado del scope reciente con el que vale la pena leer el cruce.", "The most played champion in the recent scope worth using to read this matchup."), children: /* @__PURE__ */ jsx(ChampionIdentity, { championName: problematicMatchup.championName, version: dataset.ddragonVersion, subtitle: problematicMatchup.directGames >= 2 ? t(locale, `${problematicMatchup.directGames} cruces directos \xB7 ${formatDecimal(problematicMatchup.directWinRate ?? 0)}% WR`, `${problematicMatchup.directGames} direct games \xB7 ${formatDecimal(problematicMatchup.directWinRate ?? 0)}% WR`) : t(locale, "muestra directa corta", "short direct sample"), size: 58 }) }),
        /* @__PURE__ */ jsx(InfoBlock, { title: t(locale, "Rival que m\xE1s te castiga", "Opponent hurting you most"), info: t(locale, "El rival que m\xE1s da\xF1o real est\xE1 haciendo dentro del scope actual.", "The opponent doing the most real damage inside the current scope."), children: /* @__PURE__ */ jsx(ChampionIdentity, { championName: problematicMatchup.opponentChampionName, version: dataset.ddragonVersion, subtitle: problematicMatchup.directGames >= 2 ? t(locale, `${problematicMatchup.directLosses} derrotas directas`, `${problematicMatchup.directLosses} direct losses`) : t(locale, `${problematicMatchup.recentLosses} derrotas repetidas del scope`, `${problematicMatchup.recentLosses} repeated scoped losses`), meta: /* @__PURE__ */ jsx(Badge, { tone: "high", children: `${formatDecimal(problematicMatchup.directWinRate ?? problematicMatchup.recentWinRate)}% WR` }), size: 58 }) })
      ] }),
      /* @__PURE__ */ jsxs("div", { style: panelStyle, children: [
        /* @__PURE__ */ jsx("div", { style: { color: "#eef4ff", fontSize: 20, fontWeight: 800, lineHeight: 1.2 }, children: t(locale, `${formatChampionName(problematicMatchup.championName)} contra ${formatChampionName(problematicMatchup.opponentChampionName)}`, `${formatChampionName(problematicMatchup.championName)} into ${formatChampionName(problematicMatchup.opponentChampionName)}`) }),
        /* @__PURE__ */ jsx("div", { style: { color: "#9aa5b7", lineHeight: 1.7 }, children: problematicMatchup.summary })
      ] }),
      /* @__PURE__ */ jsxs("div", { className: "four-col-grid", style: { display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: 12 }, children: [
        /* @__PURE__ */ jsx(SignalTile, { label: t(locale, "WR del cruce", "Matchup WR"), value: `${formatDecimal(problematicMatchup.directWinRate ?? problematicMatchup.recentWinRate)}%`, detail: problematicMatchup.directWinRate !== null ? t(locale, "muestra directa", "direct sample") : t(locale, "muestra del scope", "scoped sample"), trend: { ...signal((problematicMatchup.directWinRate ?? problematicMatchup.recentWinRate) - summary.winRate, "up", 3), label: t(locale, "vs tu media", "vs your average") } }),
        /* @__PURE__ */ jsx(SignalTile, { label: "Gold@15", value: delta(problematicMatchup.avgGoldDiffAt15, "", 0), detail: t(locale, "oro vs rival", "gold vs opponent"), trend: { ...signal(problematicMatchup.avgGoldDiffAt15, "up", 75), label: t(locale, "a favor / en contra", "ahead / behind") } }),
        /* @__PURE__ */ jsx(SignalTile, { label: t(locale, "Nivel@15", "Level@15"), value: delta(problematicMatchup.avgLevelDiffAt15), detail: t(locale, "nivel vs rival", "level vs opponent"), trend: { ...signal(problematicMatchup.avgLevelDiffAt15, "up", 0.2), label: t(locale, "a favor / en contra", "ahead / behind") } }),
        /* @__PURE__ */ jsx(SignalTile, { label: t(locale, "Muertes pre14", "Deaths pre14"), value: formatDecimal(problematicMatchup.avgDeathsPre14), detail: t(locale, "comparado con tu media", "compared to your average"), trend: { ...signal(problematicMatchup.avgDeathsPre14 - summary.avgDeathsPre14, "down", 0.15), label: t(locale, "menos es mejor", "lower is better") } })
      ] }),
      problematicMatchup.adjustments.slice(0, 3).map((adjustment) => /* @__PURE__ */ jsx("div", { style: actionStyle, children: adjustment }, adjustment))
    ] }) : /* @__PURE__ */ jsx("div", { style: emptyStyle, children: t(locale, "Todav\xEDa no aparece un cruce perdedor lo bastante repetido dentro de este bloque como para volverlo prioridad.", "There is not a repeated losing matchup strong enough inside this block to make it a priority yet.") }) }) }),
    /* @__PURE__ */ jsx(Card, { title: t(locale, "Sesi\xF3n de revisi\xF3n", "Review session"), subtitle: t(locale, "Abr\xED pocos replays, pero con una pregunta concreta. La idea es entender r\xE1pido qu\xE9 mirar y para qu\xE9 mirarlo.", "Open only a few replays, but with a concrete question. The goal is to understand quickly what to watch and why."), children: reviewAgenda.length ? /* @__PURE__ */ jsx("div", { className: "coaching-review-grid", style: { display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12, alignItems: "start" }, children: reviewAgenda.map((item) => /* @__PURE__ */ jsxs("div", { style: reviewCardStyle, children: [
      /* @__PURE__ */ jsxs("div", { style: { display: "flex", justifyContent: "space-between", gap: 10, alignItems: "start", flexWrap: "wrap" }, children: [
        /* @__PURE__ */ jsx(ChampionIdentity, { championName: item.championName, version: dataset.ddragonVersion, subtitle: new Date(item.gameCreation).toLocaleDateString(locale === "en" ? "en-US" : "es-AR"), size: 52 }),
        /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 8, flexWrap: "wrap" }, children: [
          item.tags.slice(0, 2).map((tag) => /* @__PURE__ */ jsx(Badge, { children: tag }, tag)),
          /* @__PURE__ */ jsx(Badge, { tone: item.win ? "low" : "high", children: item.win ? t(locale, "Victoria", "Win") : t(locale, "Derrota", "Loss") })
        ] })
      ] }),
      /* @__PURE__ */ jsx("div", { style: { color: "#eef4ff", fontSize: 18, fontWeight: 800, lineHeight: 1.2 }, children: item.title }),
      /* @__PURE__ */ jsx("div", { style: { color: "#9aa5b7", lineHeight: 1.65 }, children: item.reason }),
      /* @__PURE__ */ jsxs("div", { className: "review-metric-grid", style: { display: "grid", gridTemplateColumns: "repeat(5, minmax(0, 1fr))", gap: 10 }, children: [
        /* @__PURE__ */ jsx(ReviewMetric, { label: "KDA", value: formatKda(item.kills, item.deaths, item.assists) }),
        /* @__PURE__ */ jsx(ReviewMetric, { label: "CS", value: formatInteger(item.cs) }),
        /* @__PURE__ */ jsx(ReviewMetric, { label: t(locale, "Da\xF1o", "Damage"), value: formatInteger(item.damageToChampions) }),
        /* @__PURE__ */ jsx(ReviewMetric, { label: "KP", value: `${formatDecimal(item.killParticipation)}%` }),
        /* @__PURE__ */ jsx(ReviewMetric, { label: t(locale, "Rend.", "Perf."), value: formatDecimal(item.performanceScore) })
      ] }),
      /* @__PURE__ */ jsxs("div", { style: questionStyle, children: [
        /* @__PURE__ */ jsx(SectionEyebrow, { title: t(locale, "Pregunta de review", "Review question") }),
        /* @__PURE__ */ jsx("div", { style: { color: "#eff7f2", lineHeight: 1.65 }, children: item.question })
      ] }),
      /* @__PURE__ */ jsxs("div", { style: listStyle, children: [
        /* @__PURE__ */ jsx("strong", { style: { color: "#eef4ff" }, children: t(locale, "Mir\xE1 esto:", "Look at this:") }),
        " ",
        item.focus
      ] })
    ] }, item.matchId)) }) : /* @__PURE__ */ jsx("div", { style: emptyStyle, children: t(locale, "Todav\xEDa no hay una sesi\xF3n de review clara.", "There is no clear review session yet.") }) }),
    /* @__PURE__ */ jsxs(Card, { title: t(locale, "Referencias challenger del rol", "Challenger role references"), subtitle: t(locale, "Usalas para poner en contexto tu bloque: qu\xE9 m\xE9tricas ya est\xE1n cerca, cu\xE1les todav\xEDa marcan distancia y qu\xE9 baseline competitivo vale la pena imitar.", "Use them to contextualize your block: which metrics are already close, which still show distance and which competitive baseline is worth imitating."), children: [
      roleReferencesError ? /* @__PURE__ */ jsx("div", { style: errorStyle, children: roleReferencesError }) : null,
      roleReferencesLoading ? /* @__PURE__ */ jsx("div", { style: emptyStyle, children: t(locale, "Buscando referencias challenger del rol...", "Loading challenger role references...") }) : null,
      !roleReferencesLoading && !roleReferences.length ? /* @__PURE__ */ jsx("div", { style: emptyStyle, children: t(locale, "Todav\xEDa no hay referencias challenger listas para este rol.", "There are no challenger references ready for this role yet.") }) : null,
      roleReferences.length ? /* @__PURE__ */ jsx("div", { className: "three-col-grid", style: { display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 12, alignItems: "start" }, children: roleReferences.map((reference) => /* @__PURE__ */ jsx(
        ReferencePlayerCard,
        {
          reference,
          dataset,
          locale
        },
        `${reference.slotId}-${reference.gameName}-${reference.tagLine}`
      )) }) : null
    ] })
  ] });
}
function SignalTile({ label, value, detail, trend }) {
  return /* @__PURE__ */ jsxs("div", { style: tileStyle, children: [
    /* @__PURE__ */ jsxs("div", { style: { display: "flex", justifyContent: "space-between", gap: 10, alignItems: "start" }, children: [
      /* @__PURE__ */ jsx("div", { style: { color: "#8b96aa", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em" }, children: label }),
      /* @__PURE__ */ jsx(TrendIndicator, { direction: trend.direction, tone: trend.tone, label: trend.label })
    ] }),
    /* @__PURE__ */ jsx("div", { style: { color: "#eef4ff", fontSize: 24, fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.08 }, children: value }),
    /* @__PURE__ */ jsx("div", { style: { color: "#8f9aad", fontSize: 13, lineHeight: 1.6 }, children: detail })
  ] });
}
function PrepSectionCard({
  eyebrow,
  title,
  summary,
  badge,
  children
}) {
  return /* @__PURE__ */ jsxs("div", { style: prepSectionStyle, children: [
    /* @__PURE__ */ jsxs("div", { style: { display: "flex", justifyContent: "space-between", gap: 10, alignItems: "start", flexWrap: "wrap" }, children: [
      /* @__PURE__ */ jsxs("div", { style: { display: "grid", gap: 7 }, children: [
        /* @__PURE__ */ jsx(SectionEyebrow, { title: eyebrow }),
        /* @__PURE__ */ jsx("div", { style: { color: "#eef4ff", fontSize: 19, fontWeight: 800, lineHeight: 1.2 }, children: title }),
        /* @__PURE__ */ jsx("div", { style: { color: "#9aa5b7", lineHeight: 1.6 }, children: summary })
      ] }),
      badge
    ] }),
    children
  ] });
}
function PrepChecklistStep({
  index,
  label,
  source,
  locale
}) {
  const sourceLabel = {
    coach: t(locale, "coach", "coach"),
    runes: t(locale, "runas", "runes"),
    builds: t(locale, "build", "build"),
    matchup: t(locale, "matchup", "matchup")
  };
  return /* @__PURE__ */ jsxs("div", { style: prepChecklistStyle, children: [
    /* @__PURE__ */ jsx("div", { style: stepIndexStyle, children: index }),
    /* @__PURE__ */ jsxs("div", { style: { display: "grid", gap: 6 }, children: [
      /* @__PURE__ */ jsx("div", { style: { color: "#eef4ff", lineHeight: 1.65 }, children: label }),
      /* @__PURE__ */ jsx("div", { style: { color: "#7f8da2", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em" }, children: sourceLabel[source] })
    ] })
  ] });
}
function MetaStat({ label, value, caption }) {
  return /* @__PURE__ */ jsxs("div", { style: metaStyle, children: [
    /* @__PURE__ */ jsx("div", { style: { color: "#8c98ad", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em" }, children: label }),
    /* @__PURE__ */ jsx("div", { style: { color: "#eef4ff", fontSize: 20, fontWeight: 800, lineHeight: 1.15 }, children: value }),
    caption ? /* @__PURE__ */ jsx("div", { style: { color: "#8e9cb0", fontSize: 13, lineHeight: 1.55 }, children: caption }) : null
  ] });
}
function AnchorMetric({ label, value, detail, trend }) {
  return /* @__PURE__ */ jsxs("div", { style: anchorMetricStyle, children: [
    /* @__PURE__ */ jsxs("div", { style: { display: "flex", justifyContent: "space-between", gap: 8, alignItems: "start" }, children: [
      /* @__PURE__ */ jsx("div", { style: { color: "#8897ab", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em" }, children: label }),
      /* @__PURE__ */ jsx(TrendIndicator, { direction: trend.direction, tone: trend.tone })
    ] }),
    /* @__PURE__ */ jsx("div", { style: { color: "#eef4ff", fontSize: 18, fontWeight: 800, lineHeight: 1.12 }, children: value }),
    /* @__PURE__ */ jsx("div", { style: { color: "#8594a8", fontSize: 12, lineHeight: 1.45 }, children: detail })
  ] });
}
function ReviewMetric({ label, value }) {
  return /* @__PURE__ */ jsxs("div", { style: reviewMetricStyle, children: [
    /* @__PURE__ */ jsx("div", { style: { color: "#8c98ad", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.08em" }, children: label }),
    /* @__PURE__ */ jsx("div", { style: { color: "#eef4ff", fontSize: 18, fontWeight: 800, lineHeight: 1.1 }, children: value })
  ] });
}
function ProgressRow({ label, baseline, recent, trend, deltaLabel, locale }) {
  return /* @__PURE__ */ jsxs("div", { style: progressRowStyle, children: [
    /* @__PURE__ */ jsxs("div", { style: { display: "grid", gap: 4 }, children: [
      /* @__PURE__ */ jsx("div", { style: { color: "#eef4ff", fontWeight: 700 }, children: label }),
      /* @__PURE__ */ jsx("div", { style: { color: "#8f9aad", fontSize: 13 }, children: `${baseline} -> ${recent}` })
    ] }),
    /* @__PURE__ */ jsx(TrendIndicator, { direction: trend.direction, tone: trend.tone, label: trend.direction === "steady" ? t(locale, "parejo", "steady") : deltaLabel })
  ] });
}
function SectionEyebrow({ title }) {
  return /* @__PURE__ */ jsx("div", { style: { color: "#8d9ab0", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em" }, children: title });
}
function InfoBlock({ title, info, children }) {
  return /* @__PURE__ */ jsxs("div", { style: infoStyle, children: [
    /* @__PURE__ */ jsxs("div", { style: { display: "flex", alignItems: "center", color: "#93a0b4", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.08em", marginBottom: 10 }, children: [
      title,
      /* @__PURE__ */ jsx(InfoHint, { text: info })
    ] }),
    /* @__PURE__ */ jsx("div", { style: { color: "#edf2ff", lineHeight: 1.6 }, children })
  ] });
}
function ReferencePlayerCard({ reference, dataset, locale }) {
  const profileIconUrl = getProfileIconUrl(reference.profileIconId, reference.ddragonVersion ?? dataset.ddragonVersion);
  const performanceDiff = reference.avgPerformance - dataset.summary.avgPerformanceScore;
  const recentWrDiff = reference.recentWinRate - dataset.summary.coaching.trend.recentWinRate;
  return /* @__PURE__ */ jsxs("div", { style: referenceCardStyle, children: [
    /* @__PURE__ */ jsx("div", { style: { display: "flex", justifyContent: "space-between", gap: 10, alignItems: "start" }, children: /* @__PURE__ */ jsx(Badge, { tone: reference.sourcePlatform === "KR" ? "low" : "default", children: reference.slotLabel }) }),
    /* @__PURE__ */ jsxs("div", { style: { display: "grid", gridTemplateColumns: profileIconUrl ? "54px minmax(0, 1fr)" : "1fr", gap: 12, alignItems: "center" }, children: [
      profileIconUrl ? /* @__PURE__ */ jsx("img", { src: profileIconUrl, alt: reference.gameName, width: 54, height: 54, style: { width: 54, height: 54, borderRadius: 14, objectFit: "cover", border: "1px solid rgba(255,255,255,0.08)" } }) : null,
      /* @__PURE__ */ jsxs("div", { style: { display: "grid", gap: 4 }, children: [
        /* @__PURE__ */ jsxs("div", { style: { color: "#eef4ff", fontSize: 20, fontWeight: 800, lineHeight: 1.1 }, children: [
          reference.gameName,
          /* @__PURE__ */ jsxs("span", { style: { color: "#8f9aad" }, children: [
            "#",
            reference.tagLine
          ] })
        ] }),
        /* @__PURE__ */ jsx("div", { style: { color: "#9aa5b7", lineHeight: 1.5 }, children: `${reference.rankLabel} \xB7 ${reference.leaguePoints} LP` }),
        /* @__PURE__ */ jsx("div", { style: { display: "flex", gap: 8, flexWrap: "wrap" }, children: reference.topChampions.slice(0, 2).map((champion) => /* @__PURE__ */ jsx(Badge, { children: formatChampionName(champion) }, champion)) })
      ] })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "reference-metric-grid", style: { display: "grid", gridTemplateColumns: "repeat(3, minmax(0, 1fr))", gap: 10 }, children: [
      /* @__PURE__ */ jsx(MetaStat, { label: t(locale, "WR reciente", "Recent WR"), value: `${formatDecimal(reference.recentWinRate)}%`, caption: t(locale, `${reference.matches} partidas`, `${reference.matches} games`) }),
      /* @__PURE__ */ jsx(MetaStat, { label: t(locale, "Rendimiento", "Performance"), value: formatDecimal(reference.avgPerformance), caption: performanceDiff >= 0 ? t(locale, `${formatDecimal(performanceDiff)} sobre tu bloque`, `${formatDecimal(performanceDiff)} above your block`) : t(locale, `${formatDecimal(Math.abs(performanceDiff))} debajo de tu bloque`, `${formatDecimal(Math.abs(performanceDiff))} below your block`) }),
      /* @__PURE__ */ jsx(MetaStat, { label: "KDA", value: formatDecimal(reference.avgKda), caption: recentWrDiff >= 0 ? t(locale, `${formatDecimal(recentWrDiff)} pts WR sobre vos`, `${formatDecimal(recentWrDiff)} WR pts over you`) : t(locale, `${formatDecimal(Math.abs(recentWrDiff))} pts WR debajo`, `${formatDecimal(Math.abs(recentWrDiff))} WR pts below`) }),
      /* @__PURE__ */ jsx(MetaStat, { label: "KP", value: `${formatDecimal(reference.avgKillParticipation)}%` }),
      /* @__PURE__ */ jsx(MetaStat, { label: "CS@15", value: formatDecimal(reference.avgCsAt15) }),
      /* @__PURE__ */ jsx(MetaStat, { label: "Gold@15", value: formatInteger(reference.avgGoldAt15) })
    ] }),
    /* @__PURE__ */ jsxs("div", { style: { display: "flex", gap: 10, flexWrap: "wrap" }, children: [
      /* @__PURE__ */ jsxs("span", { style: chipStyle, children: [
        /* @__PURE__ */ jsx(TrendIndicator, { direction: signal(performanceDiff, "up", 0.3).direction, tone: signal(performanceDiff, "up", 0.3).tone }),
        /* @__PURE__ */ jsx("span", { children: t(locale, "rendimiento", "performance") })
      ] }),
      /* @__PURE__ */ jsxs("span", { style: chipStyle, children: [
        /* @__PURE__ */ jsx(TrendIndicator, { direction: signal(reference.avgDeathsPre14 - dataset.summary.avgDeathsPre14, "down", 0.15).direction, tone: signal(reference.avgDeathsPre14 - dataset.summary.avgDeathsPre14, "down", 0.15).tone }),
        /* @__PURE__ */ jsx("span", { children: t(locale, "disciplina early", "early discipline") })
      ] }),
      /* @__PURE__ */ jsxs("span", { style: chipStyle, children: [
        /* @__PURE__ */ jsx(TrendIndicator, { direction: signal(reference.consistencyIndex - dataset.summary.consistencyIndex, "up", 0.8).direction, tone: signal(reference.consistencyIndex - dataset.summary.consistencyIndex, "up", 0.8).tone }),
        /* @__PURE__ */ jsx("span", { children: t(locale, "consistencia", "consistency") })
      ] })
    ] })
  ] });
}
const panelStyle = { display: "grid", gap: 12, padding: "16px 16px", borderRadius: 18, background: "linear-gradient(180deg, rgba(10, 15, 24, 0.98), rgba(7, 11, 17, 0.98))", border: "1px solid rgba(255,255,255,0.05)" };
const tileStyle = { display: "grid", gap: 8, padding: "15px 16px", borderRadius: 16, minHeight: 112, alignContent: "start", background: "linear-gradient(180deg, rgba(11, 15, 24, 0.98), rgba(7, 10, 16, 0.98))", border: "1px solid rgba(255,255,255,0.05)" };
const metaStyle = { display: "grid", gap: 8, padding: "14px 14px", borderRadius: 16, minHeight: 108, alignContent: "start", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" };
const infoStyle = { padding: 15, borderRadius: 16, background: "linear-gradient(180deg, rgba(11, 15, 24, 0.98), rgba(7, 10, 16, 0.98))", border: "1px solid rgba(255,255,255,0.05)" };
const stepStyle = { display: "grid", gridTemplateColumns: "28px minmax(0, 1fr)", gap: 10, alignItems: "start", padding: "11px 12px", borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" };
const stepIndexStyle = { display: "inline-flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, borderRadius: 999, background: "rgba(216,253,241,0.08)", border: "1px solid rgba(216,253,241,0.12)", color: "#d8fdf1", fontSize: 13, fontWeight: 800 };
const emptyStyle = { padding: "14px 15px", borderRadius: 16, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)", color: "#c7d4ea", lineHeight: 1.65 };
const errorStyle = { padding: "12px 14px", borderRadius: 14, background: "rgba(255,107,107,0.08)", border: "1px solid rgba(255,107,107,0.12)", color: "#ffb3b3", lineHeight: 1.6 };
const actionStyle = { padding: "10px 11px", borderRadius: 12, background: "rgba(103,214,164,0.08)", border: "1px solid rgba(103,214,164,0.12)", color: "#dff7eb", lineHeight: 1.6 };
const listStyle = { padding: "11px 12px", borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)", color: "#dfe7f4", lineHeight: 1.65 };
const questionStyle = { padding: "12px 13px", borderRadius: 14, background: "rgba(103,214,164,0.08)", border: "1px solid rgba(103,214,164,0.14)", color: "#dff7eb" };
const trackStyle = { height: 12, borderRadius: 999, background: "rgba(255,255,255,0.06)", overflow: "hidden" };
const fillStyle = { height: "100%", borderRadius: 999, background: "linear-gradient(90deg, #7ef5c7, #c9f6e7)" };
const progressRowStyle = { display: "flex", justifyContent: "space-between", gap: 10, alignItems: "center", padding: "12px 14px", borderRadius: 14, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" };
const chipStyle = { display: "inline-flex", alignItems: "center", gap: 7, padding: "7px 10px", borderRadius: 999, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.05)", color: "#dfe7f4", fontSize: 12, fontWeight: 700 };
const buttonStyle = { border: 0, padding: "12px 14px", borderRadius: 12, background: "#d8fdf1", color: "#05111e", fontWeight: 800, cursor: "pointer" };
const feedbackStyle = { border: "1px solid rgba(255,255,255,0.08)", padding: "9px 11px", borderRadius: 10, background: "#0a0f18", color: "#dfe8f6", fontWeight: 700, cursor: "pointer" };
const reviewMetricStyle = { display: "grid", gap: 6, padding: "10px 11px", borderRadius: 12, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" };
const anchorMetricStyle = { display: "grid", gap: 7, padding: "11px 12px", borderRadius: 14, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)", alignContent: "start" };
const strengthItemStyle = { display: "grid", gap: 10, padding: "14px 14px", borderRadius: 16, background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.05)", alignContent: "start" };
const compactListStyle = { padding: "10px 11px", borderRadius: 12, background: "rgba(255,255,255,0.025)", border: "1px solid rgba(255,255,255,0.05)", color: "#dfe7f4", lineHeight: 1.55 };
const prepSectionStyle = { display: "grid", gap: 14, padding: "16px 16px", borderRadius: 18, background: "linear-gradient(180deg, rgba(10, 15, 24, 0.98), rgba(7, 11, 17, 0.98))", border: "1px solid rgba(255,255,255,0.05)", alignContent: "start" };
const prepChecklistStyle = { display: "grid", gridTemplateColumns: "28px minmax(0, 1fr)", gap: 10, alignItems: "start", padding: "11px 12px", borderRadius: 14, background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" };
const reviewCardStyle = { display: "grid", gap: 12, padding: "16px 16px", borderRadius: 18, background: "linear-gradient(180deg, rgba(10, 15, 24, 0.98), rgba(7, 11, 17, 0.98))", border: "1px solid rgba(255,255,255,0.05)", alignContent: "start" };
const referenceCardStyle = { display: "grid", gap: 12, padding: "16px 16px", borderRadius: 18, background: "linear-gradient(180deg, rgba(10, 15, 24, 0.98), rgba(7, 11, 17, 0.98))", border: "1px solid rgba(255,255,255,0.05)" };
export {
  CoachingHome
};
