import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useMemo } from 'react';
import { Badge, Card, ChampionIdentity, InfoHint, TrendIndicator } from '../../components/ui';
import { formatDecimal, formatInteger } from '../../lib/format';
import { formatChampionName, getProfileIconUrl } from '../../lib/lol';
import { evidenceBadgeLabel, evidenceTone } from '../premium-analysis/evidence';
import { CoachPremiumWorkspace } from './CoachPremiumWorkspace';
import { buildChampionPrepBrief } from './prepBrief';
const t = (locale, es, en) => locale === 'en' ? en : es;
const avg = (values) => values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0;
function delta(value, suffix = '', digits = 1) {
    if (typeof value !== 'number' || !Number.isFinite(value))
        return '—';
    const rounded = Number(value.toFixed(digits));
    const formatted = digits === 0 ? formatInteger(Math.abs(rounded)) : formatDecimal(Math.abs(rounded), digits);
    return `${rounded >= 0 ? '+' : '-'}${formatted}${suffix}`;
}
function signal(deltaValue, positiveWhen = 'up', threshold = 0.25) {
    if (typeof deltaValue !== 'number' || !Number.isFinite(deltaValue) || Math.abs(deltaValue) < threshold) {
        return { direction: 'steady', tone: 'neutral' };
    }
    const direction = deltaValue > 0 ? 'up' : 'down';
    const improved = positiveWhen === 'up' ? deltaValue > 0 : deltaValue < 0;
    return { direction, tone: improved ? 'positive' : 'negative' };
}
function withSteadyLabel(trend, steadyLabel, movingLabel) {
    if (trend.direction === 'steady')
        return { ...trend, label: steadyLabel };
    return movingLabel ? { ...trend, label: movingLabel } : trend;
}
function comparisonDetail(locale, baselineLabel, recentLabel, baselineMatches, recentMatches) {
    return locale === 'en'
        ? `Before ${baselineLabel} (${baselineMatches}) · Now ${recentLabel} (${recentMatches})`
        : `Antes ${baselineLabel} (${baselineMatches}) · Ahora ${recentLabel} (${recentMatches})`;
}
function formatKda(kills, deaths, assists) {
    return `${kills}/${deaths}/${assists}`;
}
function buildProfileStrengthLabel(strength, locale = 'es') {
    if (strength === 'elite')
        return locale === 'en' ? 'Elite profile' : 'Perfil elite';
    if (strength === 'advanced')
        return locale === 'en' ? 'High-elo profile' : 'Perfil high elo';
    return locale === 'en' ? 'Improvement block' : 'Bloque de mejora';
}
function buildFallbackReviewAgenda(matches, locale) {
    const sorted = [...matches].sort((a, b) => b.gameCreation - a.gameCreation).slice(0, Math.min(7, matches.length));
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
function buildScopedChampionReference(dataset) {
    const roleScope = dataset.summary.primaryRole;
    const scopedMatches = roleScope && roleScope !== 'ALL'
        ? dataset.matches.filter((match) => match.role === roleScope)
        : dataset.matches;
    const grouped = new Map();
    for (const match of scopedMatches) {
        const list = grouped.get(match.championName) ?? [];
        list.push(match);
        grouped.set(match.championName, list);
    }
    const [championName, championMatches] = Array.from(grouped.entries())
        .sort((a, b) => b[1].length - a[1].length || b[1].filter((match) => match.win).length - a[1].filter((match) => match.win).length)[0]
        ?? [];
    if (!championName || !championMatches?.length)
        return dataset.summary.championPool[0] ?? null;
    return {
        championName,
        games: championMatches.length,
        winRate: avg(championMatches.map((match) => match.win ? 100 : 0)),
        avgScore: avg(championMatches.map((match) => match.score.total)),
        avgCsAt15: avg(championMatches.map((match) => match.timeline.csAt15)),
        avgGoldAt15: avg(championMatches.map((match) => match.timeline.goldAt15)),
        avgDeathsPre14: avg(championMatches.map((match) => match.timeline.deathsPre14)),
        classification: 'CORE_PICK'
    };
}
function infoTone(priority) {
    if (priority === 'high')
        return 'high';
    if (priority === 'low')
        return 'low';
    return 'medium';
}
function interpretationLabel(value, locale = 'es') {
    if (value === 'structural')
        return locale === 'en' ? 'Structural' : 'Estructural';
    if (value === 'situational')
        return locale === 'en' ? 'Situational' : 'Situacional';
    if (value === 'observational')
        return locale === 'en' ? 'Observational' : 'Observacional';
    return null;
}
function evidenceLabel(value, locale = 'es') {
    if (value === 'high')
        return locale === 'en' ? 'High evidence' : 'Evidencia alta';
    if (value === 'medium')
        return locale === 'en' ? 'Medium evidence' : 'Evidencia media';
    if (value === 'low')
        return locale === 'en' ? 'Low evidence' : 'Evidencia baja';
    return null;
}
function readStrengthLabel(value, interpretation, locale = 'es') {
    if (interpretation === 'observational' || value === 'low')
        return locale === 'en' ? 'Tentative read' : 'Lectura tentativa';
    if (value === 'high')
        return locale === 'en' ? 'Firm read' : 'Lectura firme';
    if (value === 'medium')
        return locale === 'en' ? 'Read in validation' : 'Lectura en validación';
    return null;
}
function readStrengthTone(value) {
    if (value === 'high')
        return 'low';
    if (value === 'medium')
        return 'default';
    return 'medium';
}
export function CoachingHome({ dataset, locale = 'es', aiCoach, generatingAICoach = false, aiCoachError, onGenerateAICoach, onSendFeedback, roleReferences = [], roleReferencesLoading = false, roleReferencesError = null, coachRosterPlayers = [], canManageCoachRoster = false }) {
    const { summary } = dataset;
    const matchesByDate = [...dataset.matches].sort((a, b) => a.gameCreation - b.gameCreation);
    const recentSeven = [...dataset.matches].sort((a, b) => b.gameCreation - a.gameCreation).slice(0, Math.min(7, dataset.matches.length));
    const recentSevenIds = new Set(recentSeven.map((match) => match.matchId));
    const suggestedRecentCount = Math.min(8, Math.max(3, Math.ceil(matchesByDate.length * 0.35)));
    const recentWindow = matchesByDate.slice(-Math.min(suggestedRecentCount, matchesByDate.length));
    const baselineWindow = matchesByDate.slice(0, Math.max(0, matchesByDate.length - recentWindow.length));
    const fallbackBaseline = baselineWindow.length ? baselineWindow : (matchesByDate.length > 1 ? matchesByDate.slice(0, matchesByDate.length - 1) : recentWindow);
    const fallbackRecent = recentWindow.length ? recentWindow : matchesByDate.slice(-1);
    const rawTrend = summary.coaching.trend ?? {};
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
    const problematicMatchup = summary.problematicMatchup && (summary.problematicMatchup.directGames >= 2 ||
        summary.problematicMatchup.recentGames >= 3)
        ? summary.problematicMatchup
        : null;
    const primaryInsight = summary.coaching.primaryInsight;
    const topProblems = summary.coaching.topProblems;
    const activePlan = summary.coaching.activePlan;
    const fallbackPositives = summary.insights.filter((insight) => insight.category === 'positive');
    const positives = (summary.positiveSignals?.length ? summary.positiveSignals : fallbackPositives).slice(0, 2);
    const scopedReviewAgendaSource = (summary.reviewAgenda?.length ? summary.reviewAgenda : buildFallbackReviewAgenda(dataset.matches, locale))
        .filter((item) => recentSevenIds.has(item.matchId));
    const reviewAgenda = (scopedReviewAgendaSource.length ? scopedReviewAgendaSource : buildFallbackReviewAgenda(recentSeven, locale))
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
    const secondaryProblem = topProblems[1] ?? null;
    const secondaryFocus = primaryInsight?.nextFocus ?? (secondaryProblem ? {
        headline: secondaryProblem.problem,
        summary: secondaryProblem.interpretation === 'observational'
            ? t(locale, 'Seguilo como segundo foco: todavía suma más confirmarlo que convertirlo en headline.', 'Keep tracking it as the second focus: it still adds more value as a monitored signal than as the headline.')
            : t(locale, 'Cuando la lectura central se estabilice, este es el siguiente ajuste con más retorno.', 'Once the central read settles, this is the next adjustment with the best upside.'),
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
    const prepBrief = useMemo(() => buildChampionPrepBrief({
        dataset,
        locale,
        anchorChampion: championReference,
        mainProblem,
        todayActions,
        aiCoach,
        problematicMatchup
    }), [dataset, locale, championReference, mainProblem, todayActions, aiCoach, problematicMatchup]);
    const steadyLabel = t(locale, 'estable', 'stable');
    const performanceTrend = signal(trend.scoreDelta, 'up', 0.25);
    const changeSummary = performanceTrend.tone === 'positive'
        ? t(locale, 'El tramo reciente ya está empujando el bloque hacia arriba frente a la base anterior.', 'The recent stretch is already pushing the block upward against the previous baseline.')
        : performanceTrend.tone === 'negative'
            ? t(locale, 'El tramo reciente cedió frente al bloque anterior y conviene estabilizarlo antes de abrir más variables.', 'The recent stretch slipped versus the previous block and should be stabilized before adding more variables.')
            : t(locale, 'No aparece un salto ni una caída clara: el bloque sigue pidiendo consistencia antes que conclusiones rápidas.', 'There is no clear jump or drop: the block is still asking for consistency before quick conclusions.');
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
    return (_jsxs("div", { style: { display: 'grid', gap: 16 }, children: [_jsx(CoachPremiumWorkspace, { dataset: dataset, locale: locale, rosterPlayers: coachRosterPlayers, roleReferences: roleReferences, canManageRoster: canManageCoachRoster }), _jsxs(Card, { title: t(locale, 'Lectura central del bloque', 'Central block read'), subtitle: t(locale, 'Una sola lectura para decidir qué corregir primero, por qué confiar en ella y qué dejar para después.', 'One read to decide what to correct first, why it deserves trust and what should wait.'), children: [_jsxs("div", { className: "coaching-hero-grid", style: { display: 'grid', gridTemplateColumns: 'minmax(0, 1.45fr) minmax(320px, 0.95fr)', gap: 16, alignItems: 'start' }, children: [_jsxs("div", { style: { display: 'grid', gap: 14 }, children: [_jsxs("div", { style: { display: 'flex', gap: 8, flexWrap: 'wrap' }, children: [mainPriority ? _jsx(Badge, { tone: infoTone(mainPriority), children: t(locale, `Prioridad ${mainPriority}`, `${mainPriority} priority`) }) : null, mainEvidenceStrength ? _jsx(Badge, { tone: readStrengthTone(mainEvidenceStrength), children: readStrengthLabel(mainEvidenceStrength, mainInterpretation, locale) }) : null, mainSampleSize ? _jsx(Badge, { tone: "default", children: t(locale, `${mainSampleSize} partidas del scope`, `${mainSampleSize} scoped games`) }) : null, aiCoach ? _jsx(Badge, { tone: "default", children: `${Math.round(aiCoach.coach.confidence * 100)}% ${t(locale, 'confianza', 'confidence')}` }) : null, aiCoach ? _jsx(Badge, { tone: aiCoach.context.player.profileStrength === 'elite' ? 'low' : aiCoach.context.player.profileStrength === 'advanced' ? 'default' : 'medium', children: buildProfileStrengthLabel(aiCoach.context.player.profileStrength, locale) }) : null, aiCoach?.continuity.mode === 'reused' ? _jsx(Badge, { tone: "default", children: t(locale, 'Bloque reutilizado', 'Reused block') }) : null, aiCoach?.continuity.mode === 'updated' ? _jsx(Badge, { tone: "low", children: t(locale, `+${aiCoach.continuity.newVisibleMatches} nuevas`, `+${aiCoach.continuity.newVisibleMatches} new`) }) : null] }), _jsx("div", { style: { color: '#eef4ff', fontSize: 32, fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1.05 }, children: mainTitle }), _jsx("div", { style: { color: '#a6b3c6', fontSize: 15, lineHeight: 1.75 }, children: mainSummary }), (mainImpact || mainCause) ? (_jsxs("div", { className: "two-col-grid", style: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 10 }, children: [mainImpact ? (_jsx(InfoBlock, { title: t(locale, 'Por qué pesa hoy', 'Why it matters now'), info: t(locale, 'El costo competitivo de seguir jugando con este patrón abierto.', 'The competitive cost of leaving this pattern open.'), children: mainImpact })) : null, mainCause ? (_jsx(InfoBlock, { title: t(locale, 'Qué lo está provocando', 'What is driving it'), info: t(locale, 'La explicación más probable detrás de la lectura central.', 'The most likely explanation behind the central read.'), children: mainCause })) : null] })) : null, mainEvidence.length ? (_jsxs("div", { style: panelStyle, children: [_jsx(SectionEyebrow, { title: t(locale, 'Lo que sostiene esta lectura', 'What supports this read') }), _jsx("div", { style: { display: 'grid', gap: 8 }, children: mainEvidence.map((entry) => _jsx("div", { style: compactListStyle, children: entry }, entry)) })] })) : null, mainCaution ? (_jsxs("div", { style: { ...panelStyle, borderColor: 'rgba(255,214,102,0.2)', background: 'linear-gradient(180deg, rgba(24,19,9,0.82), rgba(12,10,6,0.94))' }, children: [_jsx(SectionEyebrow, { title: t(locale, 'Límite de la lectura', 'Read boundary') }), _jsx("div", { style: { color: '#f5dfab', lineHeight: 1.65 }, children: mainCaution })] })) : null, aiCoachError ? _jsx("div", { style: errorStyle, children: aiCoachError }) : null, _jsxs("div", { style: { display: 'grid', gap: 8 }, children: [_jsx(SectionEyebrow, { title: t(locale, 'Qué corregir primero', 'What to correct first') }), todayActions.length ? todayActions.map((action, index) => (_jsxs("div", { style: stepStyle, children: [_jsx("div", { style: stepIndexStyle, children: index + 1 }), _jsx("div", { style: { color: '#e8eef9', lineHeight: 1.65 }, children: action })] }, action))) : _jsx("div", { style: emptyStyle, children: t(locale, 'Todavía no hay una acción clara. Sumá muestra o refrescá el coaching.', 'There is no clear action yet. Add sample or refresh coaching.') })] })] }), _jsxs("div", { style: { display: 'grid', gap: 12 }, children: [_jsxs("div", { style: panelStyle, children: [_jsx(SectionEyebrow, { title: t(locale, 'Bloque actual', 'Current block') }), activePlan ? (_jsxs("div", { style: { display: 'grid', gap: 10 }, children: [_jsx("div", { style: { color: '#eef4ff', fontSize: 22, fontWeight: 800, lineHeight: 1.2 }, children: activePlan.objective }), _jsx("div", { style: { color: '#a4afc1', lineHeight: 1.6 }, children: activePlan.focus }), _jsxs("div", { style: { display: 'grid', gap: 8 }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', color: '#d7dfec', fontSize: 13 }, children: [_jsx("span", { children: t(locale, 'Progreso', 'Progress') }), _jsx("span", { children: activePlan.successLabel })] }), _jsx("div", { style: trackStyle, children: _jsx("div", { style: { ...fillStyle, width: `${activePlan.progressPercent}%` } }) }), _jsx("div", { style: { color: '#8fa0b7', fontSize: 13 }, children: t(locale, `${activePlan.completedGames}/${activePlan.targetGames} partidas cuentan para este bloque.`, `${activePlan.completedGames}/${activePlan.targetGames} games count toward this block.`) })] })] })) : _jsx("div", { style: { color: '#d7dfec', lineHeight: 1.7 }, children: t(locale, 'Todavía no hay un ciclo suficientemente claro. Conviene sumar muestra limpia o cerrar más el scope.', 'There is not a clear enough cycle yet. Add cleaner sample or narrow the scope further.') }), _jsx("button", { type: "button", style: buttonStyle, onClick: onGenerateAICoach, disabled: !onGenerateAICoach || generatingAICoach, children: generatingAICoach ? t(locale, 'Actualizando coaching...', 'Refreshing coaching...') : t(locale, 'Actualizar coaching', 'Refresh coaching') })] }), secondaryFocus ? (_jsxs("div", { style: panelStyle, children: [_jsx(SectionEyebrow, { title: t(locale, 'Después de estabilizar esto', 'After this is stable') }), _jsxs("div", { style: { display: 'grid', gap: 10 }, children: [_jsxs("div", { style: { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }, children: [_jsx("div", { style: { color: '#eef4ff', fontSize: 18, fontWeight: 800, lineHeight: 1.25 }, children: secondaryFocus.headline }), secondaryFocus.evidenceStrength ? _jsx(Badge, { tone: readStrengthTone(secondaryFocus.evidenceStrength), children: readStrengthLabel(secondaryFocus.evidenceStrength, null, locale) }) : null] }), _jsx("div", { style: { color: '#9aa5b7', lineHeight: 1.6 }, children: secondaryFocus.summary }), secondaryFocus.action ? _jsx("div", { style: actionStyle, children: secondaryFocus.action }) : null] })] })) : null, _jsxs("div", { className: "coaching-meta-grid", style: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12, alignItems: 'start' }, children: [_jsx(MetaStat, { label: t(locale, 'Muestra', 'Sample'), value: `${summary.matches}`, caption: t(locale, 'partidas del scope', 'games in scope') }), _jsx(MetaStat, { label: t(locale, 'Tramo reciente', 'Recent block'), value: `${trend.recentMatches}`, caption: t(locale, 'partidas comparadas ahora', 'games compared now') }), _jsx(MetaStat, { label: t(locale, 'Patrón estable', 'Stable pattern'), value: stableWinRate !== null ? `${formatDecimal(stableWinRate)}% WR` : t(locale, 'Sin señal', 'No signal'), caption: stableMatches.length ? t(locale, `${stableMatches.length} partidas limpias`, `${stableMatches.length} clean games`) : t(locale, 'todavía sin bloque limpio', 'no clean block yet') }), _jsx(MetaStat, { label: t(locale, 'Cruce más duro', 'Hardest matchup'), value: problematicMatchup ? `vs ${formatChampionName(problematicMatchup.opponentChampionName)}` : t(locale, 'Sin alerta', 'No alert'), caption: problematicMatchup ? (problematicMatchup.directGames >= 2 ? t(locale, `${problematicMatchup.directGames} cruces directos`, `${problematicMatchup.directGames} direct games`) : t(locale, `${problematicMatchup.recentLosses} derrotas repetidas`, `${problematicMatchup.recentLosses} repeated losses`)) : t(locale, 'sin patrón repetido', 'no repeated pattern') })] }), onSendFeedback && aiCoach ? _jsxs("div", { style: { display: 'flex', gap: 8, flexWrap: 'wrap' }, children: [_jsx("button", { type: "button", style: feedbackStyle, onClick: () => onSendFeedback('useful'), children: t(locale, 'Útil', 'Useful') }), _jsx("button", { type: "button", style: feedbackStyle, onClick: () => onSendFeedback('mixed'), children: t(locale, 'Mixto', 'Mixed') }), _jsx("button", { type: "button", style: feedbackStyle, onClick: () => onSendFeedback('generic'), children: t(locale, 'Genérico', 'Generic') }), _jsx("button", { type: "button", style: feedbackStyle, onClick: () => onSendFeedback('incorrect'), children: t(locale, 'Incorrecto', 'Incorrect') })] }) : null] })] }), _jsxs("div", { style: { display: 'grid', gap: 10, marginTop: 18 }, children: [_jsx(SectionEyebrow, { title: t(locale, 'Señales rápidas', 'Quick signals') }), _jsx("div", { className: "coaching-signal-grid", style: { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12, alignItems: 'start' }, children: metricCards.map((metric) => _jsx(SignalTile, { ...metric }, metric.label)) })] })] }), prepBrief ? (_jsx(Card, { title: t(locale, 'Plan para tu próxima cola', 'Plan for your next queue'), subtitle: t(locale, 'La idea es cerrar la distancia entre diagnóstico y ejecución: qué pick usar como base, qué página respetar, qué build tomar y qué no abrir todavía.', 'The goal is to close the gap between diagnosis and execution: which pick to use as a base, which page to respect, which build to take and what should not be opened yet.'), children: _jsxs("div", { style: { display: 'grid', gap: 16 }, children: [_jsxs("div", { className: "coaching-hero-grid", style: { display: 'grid', gridTemplateColumns: 'minmax(0, 1.2fr) minmax(280px, 0.8fr)', gap: 16, alignItems: 'start' }, children: [_jsxs("div", { style: panelStyle, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'start', flexWrap: 'wrap' }, children: [_jsx(ChampionIdentity, { championName: prepBrief.championName, version: dataset.ddragonVersion, subtitle: t(locale, 'Este es el pick que hoy conviene usar como base operativa del bloque.', 'This is the pick worth using today as the operating base of the block.'), size: 62 }), _jsxs("div", { style: { display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'end' }, children: [_jsx(Badge, { tone: prepBrief.readiness === 'full' ? 'low' : 'medium', children: prepBrief.readiness === 'full'
                                                                ? t(locale, 'Prep completa', 'Full prep')
                                                                : t(locale, 'Prep parcial', 'Partial prep') }), prepBrief.matchupSummary ? _jsx(Badge, { tone: "default", children: t(locale, 'Con lectura de matchup', 'Matchup-aware') }) : null] })] }), _jsx("div", { style: { color: '#eef4ff', fontSize: 24, fontWeight: 800, lineHeight: 1.15 }, children: t(locale, 'Cómo tiene que sentirse esta versión', 'How this version should feel') }), _jsx("div", { style: { color: '#a4afc1', lineHeight: 1.7 }, children: prepBrief.operatingSummary }), prepBrief.focusNote ? _jsx("div", { style: actionStyle, children: prepBrief.focusNote }) : null, prepBrief.relatedPicks.length ? (_jsxs("div", { style: { display: 'grid', gap: 8 }, children: [_jsx(SectionEyebrow, { title: t(locale, 'Picks que también están vivos en tu bloque', 'Other live picks in your block') }), _jsx("div", { style: { display: 'flex', gap: 8, flexWrap: 'wrap' }, children: prepBrief.relatedPicks.map((entry) => (_jsx("span", { style: chipStyle, children: `${formatChampionName(entry.championName)} · ${entry.note}` }, entry.championName))) })] })) : null, prepBrief.matchupSummary ? (_jsxs("div", { style: { ...compactListStyle, background: 'rgba(255,255,255,0.035)' }, children: [_jsx("strong", { style: { color: '#eef4ff' }, children: t(locale, 'Matchup watchpoint:', 'Matchup watchpoint:') }), " ", prepBrief.matchupSummary] })) : null] }), _jsx("div", { style: { display: 'grid', gap: 12 }, children: _jsxs("div", { style: panelStyle, children: [_jsx(SectionEyebrow, { title: t(locale, 'Checklist corto', 'Short checklist') }), _jsx("div", { style: { display: 'grid', gap: 10 }, children: prepBrief.checklist.map((entry, index) => (_jsx(PrepChecklistStep, { index: index + 1, label: entry.label, source: entry.source, locale: locale }, `${entry.source}-${entry.label}`))) })] }) })] }), _jsxs("div", { className: "three-col-grid", style: { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12, alignItems: 'start' }, children: [_jsx(PrepSectionCard, { eyebrow: t(locale, 'Matchup / contexto', 'Matchup / context'), title: prepBrief.matchupSummary ? t(locale, 'Qué respetar cuando el contexto se pone duro', 'What to respect when the context gets harder') : t(locale, 'Contexto operativo', 'Operating context'), summary: prepBrief.matchupSummary ?? t(locale, 'Todavía no hay un matchup repetido lo bastante fuerte como para cambiar el plan base del pick.', 'There is no repeated matchup strong enough yet to change the base plan of the pick.'), children: prepBrief.matchupAdjustments.length ? (_jsx("div", { style: { display: 'grid', gap: 8 }, children: prepBrief.matchupAdjustments.map((entry) => _jsx("div", { style: actionStyle, children: entry }, entry)) })) : (_jsx("div", { style: emptyStyle, children: t(locale, 'La prioridad sigue siendo ejecutar mejor tu plan base antes de abrir respuestas más finas.', 'The priority is still to execute your base plan better before opening finer responses.') })) }), _jsx(PrepSectionCard, { eyebrow: `${t(locale, 'Runas', 'Runes')} · ${formatChampionName(prepBrief.runePlan?.championName ?? prepBrief.championName)}`, title: prepBrief.runePlan ? prepBrief.runePlan.defaultPage : t(locale, 'Sin página cerrada', 'No closed page yet'), summary: prepBrief.runePlan?.baselineSummary ?? t(locale, 'Todavía no hay una página con suficiente repetición dentro de este campeón.', 'There is still no page with enough repetition inside this champion.'), badge: prepBrief.runePlan?.evidenceTier ? (_jsx(Badge, { tone: evidenceTone(prepBrief.runePlan.evidenceTier), children: evidenceBadgeLabel(prepBrief.runePlan.evidenceTier, locale) })) : null, children: prepBrief.runePlan ? (_jsxs("div", { style: { display: 'grid', gap: 10 }, children: [_jsx("div", { style: { color: '#dce6f5', lineHeight: 1.65 }, children: prepBrief.runePlan.swapSummary }), _jsx("div", { style: { display: 'flex', gap: 8, flexWrap: 'wrap' }, children: prepBrief.runePlan.supportingChips.map((entry) => _jsx("span", { style: chipStyle, children: entry }, entry)) })] })) : (_jsx("div", { style: emptyStyle, children: t(locale, 'Este campeón todavía necesita más muestra repetida para cerrar una lectura útil de página default.', 'This champion still needs more repeated sample to close a useful default page read.') })) }), _jsx(PrepSectionCard, { eyebrow: `${t(locale, 'Build', 'Build')} · ${formatChampionName(prepBrief.buildPlan.championName ?? prepBrief.championName)}`, title: prepBrief.buildPlan.defaultPath ?? (prepBrief.buildPlan.status === 'needs-refresh' ? t(locale, 'Refresh pendiente', 'Refresh required') : t(locale, 'Familia todavía abierta', 'Family still open')), summary: prepBrief.buildPlan.baselineSummary, badge: prepBrief.buildPlan.evidenceTier ? (_jsx(Badge, { tone: evidenceTone(prepBrief.buildPlan.evidenceTier), children: evidenceBadgeLabel(prepBrief.buildPlan.evidenceTier, locale) })) : prepBrief.buildPlan.status === 'needs-refresh' ? _jsx(Badge, { tone: "medium", children: t(locale, 'Falta refresh', 'Refresh needed') }) : null, children: _jsxs("div", { style: { display: 'grid', gap: 10 }, children: [_jsx("div", { style: { color: '#dce6f5', lineHeight: 1.65 }, children: prepBrief.buildPlan.swapSummary }), prepBrief.buildPlan.supportingChips.length ? (_jsx("div", { style: { display: 'flex', gap: 8, flexWrap: 'wrap' }, children: prepBrief.buildPlan.supportingChips.map((entry) => _jsx("span", { style: chipStyle, children: entry }, entry)) })) : null] }) })] })] }) })) : null, _jsxs("section", { className: "coaching-overview-grid", style: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 16, alignItems: 'start' }, children: [_jsx(Card, { title: t(locale, 'Base que ya te sostiene hoy', 'What is already holding you up'), subtitle: t(locale, 'Fusionamos tu pick de referencia con lo que ya te da nivel para que la lectura sea más directa y menos redundante.', 'We merge your reference pick with what is already giving you level so the read feels stronger and less redundant.'), children: _jsxs("div", { style: { display: 'grid', gap: 12 }, children: [championReference ? (_jsxs("div", { style: panelStyle, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'start', flexWrap: 'wrap' }, children: [_jsx(ChampionIdentity, { championName: championReference.championName, version: dataset.ddragonVersion, subtitle: t(locale, `${championReference.games} partidas del scope · ${formatDecimal(championReference.winRate)}% WR`, `${championReference.games} scoped games · ${formatDecimal(championReference.winRate)}% WR`), meta: _jsxs(_Fragment, { children: [_jsx("span", { style: chipStyle, children: _jsx("span", { children: `CS@15 ${formatDecimal(championReference.avgCsAt15)}` }) }), _jsx("span", { style: chipStyle, children: _jsx("span", { children: `${t(locale, 'Muertes pre14', 'Deaths pre14')} ${formatDecimal(championReference.avgDeathsPre14)}` }) })] }), size: 62 }), _jsx(Badge, { tone: "low", children: t(locale, 'Pick más limpio', 'Cleanest pick') })] }), _jsx("div", { style: { color: '#9aa5b7', lineHeight: 1.65 }, children: problematicMatchup
                                                ? t(locale, `Tomalo como tu base de referencia: acá se ve mejor qué hábitos sostienen el bloque y cómo cambia el plan cuando aparece ${formatChampionName(problematicMatchup.opponentChampionName)}.`, `Use it as your reference base: this is where it is easiest to see which habits are holding the block and how the plan changes when ${formatChampionName(problematicMatchup.opponentChampionName)} shows up.`)
                                                : t(locale, 'Es la versión donde el plan se ve más ordenado hoy. Si querés copiar algo, copiá esta estructura y no solo el resultado final.', 'This is the version where the plan looks most organized right now. If you want to copy something, copy this structure, not only the final result.') }), _jsx("div", { className: "four-col-grid", style: { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 10 }, children: anchorSignals.map((entry) => _jsx(AnchorMetric, { ...entry }, entry.label)) })] })) : null, positives.length ? (_jsx("div", { className: "coaching-strength-grid", style: { display: 'grid', gridTemplateColumns: positives.length > 1 ? 'repeat(2, minmax(0, 1fr))' : '1fr', gap: 10 }, children: positives.map((insight) => (_jsxs("div", { style: strengthItemStyle, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'start', flexWrap: 'wrap' }, children: [_jsxs("div", { style: { display: 'grid', gap: 6 }, children: [_jsx("div", { style: { color: '#eef4ff', fontSize: 18, fontWeight: 800, lineHeight: 1.22 }, children: insight.problem }), _jsx("div", { style: { color: '#9aa5b7', lineHeight: 1.55 }, children: insight.title })] }), _jsx(Badge, { tone: "low", children: t(locale, 'Te sostiene', 'Holding') })] }), insight.evidence[0] ? _jsx("div", { style: compactListStyle, children: insight.evidence[0] }) : null, insight.actions.slice(0, 1).map((action) => _jsx("div", { style: actionStyle, children: action }, action))] }, insight.id))) })) : _jsx("div", { style: emptyStyle, children: t(locale, 'Todavía no aparece una fortaleza clara en este scope.', 'There is no clear strength in this scope yet.') })] }) }), _jsx(Card, { title: t(locale, 'Qué cambió de verdad', 'What actually changed'), subtitle: t(locale, 'No es otra lectura: es la evidencia comparativa de si el bloque realmente mejora, cae o sigue plano.', 'This is not another read: it is the comparative evidence for whether the block is really improving, slipping or staying flat.'), children: _jsxs("div", { style: { display: 'grid', gap: 10 }, children: [_jsx("div", { style: panelStyle, children: _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'start', flexWrap: 'wrap' }, children: [_jsxs("div", { style: { display: 'grid', gap: 6 }, children: [_jsx("div", { style: { color: '#eef4ff', fontSize: 20, fontWeight: 800, lineHeight: 1.2 }, children: changeSummary }), _jsx("div", { style: { color: '#9aa5b7', lineHeight: 1.6 }, children: t(locale, `Comparación usada: ${trend.baselineMatches} partidas previas contra ${trend.recentMatches} partidas recientes.`, `Comparison used: ${trend.baselineMatches} earlier games against ${trend.recentMatches} recent games.`) })] }), _jsxs("span", { style: chipStyle, children: [_jsx(TrendIndicator, { direction: performanceTrend.direction, tone: performanceTrend.tone }), _jsx("span", { children: performanceTrend.direction === 'steady' ? t(locale, 'parejo', 'steady') : performanceTrend.tone === 'positive' ? t(locale, 'mejora', 'improving') : t(locale, 'retroceso', 'slipping') })] })] }) }), _jsx(ProgressRow, { label: t(locale, 'Rendimiento', 'Performance'), baseline: formatDecimal(trend.baselineScore), recent: formatDecimal(trend.recentScore), trend: signal(trend.scoreDelta, 'up', 0.25), deltaLabel: delta(trend.scoreDelta), locale: locale }), _jsx(ProgressRow, { label: "WR", baseline: `${formatDecimal(trend.baselineWinRate)}%`, recent: `${formatDecimal(trend.recentWinRate)}%`, trend: signal(trend.winRateDelta, 'up', 1), deltaLabel: delta(trend.winRateDelta, ' pts'), locale: locale }), _jsx(ProgressRow, { label: "Gold@15", baseline: formatInteger(trend.baselineGoldAt15), recent: formatInteger(trend.recentGoldAt15), trend: signal(trend.goldAt15Delta, 'up', 120), deltaLabel: delta(trend.goldAt15Delta, '', 0), locale: locale }), _jsx(ProgressRow, { label: t(locale, 'Muertes pre14', 'Deaths pre14'), baseline: formatDecimal(trend.baselineDeathsPre14), recent: formatDecimal(trend.recentDeathsPre14), trend: signal(trend.deathsPre14Delta, 'down', 0.15), deltaLabel: delta(trend.deathsPre14Delta), locale: locale }), _jsx(ProgressRow, { label: t(locale, 'Consistencia', 'Consistency'), baseline: formatDecimal(trend.baselineConsistency), recent: formatDecimal(trend.recentConsistency), trend: signal(trend.consistencyDelta, 'up', 1.5), deltaLabel: delta(trend.consistencyDelta), locale: locale })] }) })] }), _jsx("section", { style: { display: 'grid', gap: 16 }, children: _jsx(Card, { title: t(locale, 'El cruce que hoy más te castiga', 'The matchup hurting you most right now'), subtitle: t(locale, 'Si se repite, deja de ser mala suerte y pasa a ser preparación concreta.', 'If it keeps repeating, it stops being bad luck and becomes concrete prep work.'), children: problematicMatchup ? (_jsxs("div", { style: { display: 'grid', gap: 14 }, children: [_jsxs("div", { className: "two-col-grid", style: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }, children: [_jsx(InfoBlock, { title: t(locale, 'Tu pick en este scope', 'Your pick in this scope'), info: t(locale, 'El campeón más jugado del scope reciente con el que vale la pena leer el cruce.', 'The most played champion in the recent scope worth using to read this matchup.'), children: _jsx(ChampionIdentity, { championName: problematicMatchup.championName, version: dataset.ddragonVersion, subtitle: problematicMatchup.directGames >= 2 ? t(locale, `${problematicMatchup.directGames} cruces directos · ${formatDecimal(problematicMatchup.directWinRate ?? 0)}% WR`, `${problematicMatchup.directGames} direct games · ${formatDecimal(problematicMatchup.directWinRate ?? 0)}% WR`) : t(locale, 'muestra directa corta', 'short direct sample'), size: 58 }) }), _jsx(InfoBlock, { title: t(locale, 'Rival que más te castiga', 'Opponent hurting you most'), info: t(locale, 'El rival que más daño real está haciendo dentro del scope actual.', 'The opponent doing the most real damage inside the current scope.'), children: _jsx(ChampionIdentity, { championName: problematicMatchup.opponentChampionName, version: dataset.ddragonVersion, subtitle: problematicMatchup.directGames >= 2 ? t(locale, `${problematicMatchup.directLosses} derrotas directas`, `${problematicMatchup.directLosses} direct losses`) : t(locale, `${problematicMatchup.recentLosses} derrotas repetidas del scope`, `${problematicMatchup.recentLosses} repeated scoped losses`), meta: _jsx(Badge, { tone: "high", children: `${formatDecimal(problematicMatchup.directWinRate ?? problematicMatchup.recentWinRate)}% WR` }), size: 58 }) })] }), _jsxs("div", { style: panelStyle, children: [_jsx("div", { style: { color: '#eef4ff', fontSize: 20, fontWeight: 800, lineHeight: 1.2 }, children: t(locale, `${formatChampionName(problematicMatchup.championName)} contra ${formatChampionName(problematicMatchup.opponentChampionName)}`, `${formatChampionName(problematicMatchup.championName)} into ${formatChampionName(problematicMatchup.opponentChampionName)}`) }), _jsx("div", { style: { color: '#9aa5b7', lineHeight: 1.7 }, children: problematicMatchup.summary })] }), _jsxs("div", { className: "four-col-grid", style: { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12 }, children: [_jsx(SignalTile, { label: t(locale, 'WR del cruce', 'Matchup WR'), value: `${formatDecimal(problematicMatchup.directWinRate ?? problematicMatchup.recentWinRate)}%`, detail: problematicMatchup.directWinRate !== null ? t(locale, 'muestra directa', 'direct sample') : t(locale, 'muestra del scope', 'scoped sample'), trend: { ...signal((problematicMatchup.directWinRate ?? problematicMatchup.recentWinRate) - summary.winRate, 'up', 3), label: t(locale, 'vs tu media', 'vs your average') } }), _jsx(SignalTile, { label: "Gold@15", value: delta(problematicMatchup.avgGoldDiffAt15, '', 0), detail: t(locale, 'oro vs rival', 'gold vs opponent'), trend: { ...signal(problematicMatchup.avgGoldDiffAt15, 'up', 75), label: t(locale, 'a favor / en contra', 'ahead / behind') } }), _jsx(SignalTile, { label: t(locale, 'Nivel@15', 'Level@15'), value: delta(problematicMatchup.avgLevelDiffAt15), detail: t(locale, 'nivel vs rival', 'level vs opponent'), trend: { ...signal(problematicMatchup.avgLevelDiffAt15, 'up', 0.2), label: t(locale, 'a favor / en contra', 'ahead / behind') } }), _jsx(SignalTile, { label: t(locale, 'Muertes pre14', 'Deaths pre14'), value: formatDecimal(problematicMatchup.avgDeathsPre14), detail: t(locale, 'comparado con tu media', 'compared to your average'), trend: { ...signal(problematicMatchup.avgDeathsPre14 - summary.avgDeathsPre14, 'down', 0.15), label: t(locale, 'menos es mejor', 'lower is better') } })] }), problematicMatchup.adjustments.slice(0, 3).map((adjustment) => _jsx("div", { style: actionStyle, children: adjustment }, adjustment))] })) : _jsx("div", { style: emptyStyle, children: t(locale, 'Todavía no aparece un cruce perdedor lo bastante repetido dentro de este bloque como para volverlo prioridad.', 'There is not a repeated losing matchup strong enough inside this block to make it a priority yet.') }) }) }), _jsx(Card, { title: t(locale, 'Sesión de revisión', 'Review session'), subtitle: t(locale, 'Abrí pocos replays, pero con una pregunta concreta. La idea es entender rápido qué mirar y para qué mirarlo.', 'Open only a few replays, but with a concrete question. The goal is to understand quickly what to watch and why.'), children: reviewAgenda.length ? (_jsx("div", { className: "coaching-review-grid", style: { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12, alignItems: 'start' }, children: reviewAgenda.map((item) => (_jsxs("div", { style: reviewCardStyle, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'start', flexWrap: 'wrap' }, children: [_jsx(ChampionIdentity, { championName: item.championName, version: dataset.ddragonVersion, subtitle: new Date(item.gameCreation).toLocaleDateString(locale === 'en' ? 'en-US' : 'es-AR'), size: 52 }), _jsxs("div", { style: { display: 'flex', gap: 8, flexWrap: 'wrap' }, children: [item.tags.slice(0, 2).map((tag) => _jsx(Badge, { children: tag }, tag)), _jsx(Badge, { tone: item.win ? 'low' : 'high', children: item.win ? t(locale, 'Victoria', 'Win') : t(locale, 'Derrota', 'Loss') })] })] }), _jsx("div", { style: { color: '#eef4ff', fontSize: 18, fontWeight: 800, lineHeight: 1.2 }, children: item.title }), _jsx("div", { style: { color: '#9aa5b7', lineHeight: 1.65 }, children: item.reason }), _jsxs("div", { className: "review-metric-grid", style: { display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 10 }, children: [_jsx(ReviewMetric, { label: "KDA", value: formatKda(item.kills, item.deaths, item.assists) }), _jsx(ReviewMetric, { label: "CS", value: formatInteger(item.cs) }), _jsx(ReviewMetric, { label: t(locale, 'Daño', 'Damage'), value: formatInteger(item.damageToChampions) }), _jsx(ReviewMetric, { label: "KP", value: `${formatDecimal(item.killParticipation)}%` }), _jsx(ReviewMetric, { label: t(locale, 'Rend.', 'Perf.'), value: formatDecimal(item.performanceScore) })] }), _jsxs("div", { style: questionStyle, children: [_jsx(SectionEyebrow, { title: t(locale, 'Pregunta de review', 'Review question') }), _jsx("div", { style: { color: '#eff7f2', lineHeight: 1.65 }, children: item.question })] }), _jsxs("div", { style: listStyle, children: [_jsx("strong", { style: { color: '#eef4ff' }, children: t(locale, 'Mirá esto:', 'Look at this:') }), " ", item.focus] })] }, item.matchId))) })) : _jsx("div", { style: emptyStyle, children: t(locale, 'Todavía no hay una sesión de review clara.', 'There is no clear review session yet.') }) }), _jsxs(Card, { title: t(locale, 'Referencias challenger del rol', 'Challenger role references'), subtitle: t(locale, 'Usalas para poner en contexto tu bloque: qué métricas ya están cerca, cuáles todavía marcan distancia y qué baseline competitivo vale la pena imitar.', 'Use them to contextualize your block: which metrics are already close, which still show distance and which competitive baseline is worth imitating.'), children: [roleReferencesError ? _jsx("div", { style: errorStyle, children: roleReferencesError }) : null, roleReferencesLoading ? _jsx("div", { style: emptyStyle, children: t(locale, 'Buscando referencias challenger del rol...', 'Loading challenger role references...') }) : null, !roleReferencesLoading && !roleReferences.length ? _jsx("div", { style: emptyStyle, children: t(locale, 'Todavía no hay referencias challenger listas para este rol.', 'There are no challenger references ready for this role yet.') }) : null, roleReferences.length ? (_jsx("div", { className: "three-col-grid", style: { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12, alignItems: 'start' }, children: roleReferences.map((reference) => (_jsx(ReferencePlayerCard, { reference: reference, dataset: dataset, locale: locale }, `${reference.slotId}-${reference.gameName}-${reference.tagLine}`))) })) : null] })] }));
}
function SignalTile({ label, value, detail, trend }) {
    return (_jsxs("div", { style: tileStyle, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'start' }, children: [_jsx("div", { style: { color: '#8b96aa', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em' }, children: label }), _jsx(TrendIndicator, { direction: trend.direction, tone: trend.tone, label: trend.label })] }), _jsx("div", { style: { color: '#eef4ff', fontSize: 24, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.08 }, children: value }), _jsx("div", { style: { color: '#8f9aad', fontSize: 13, lineHeight: 1.6 }, children: detail })] }));
}
function PrepSectionCard({ eyebrow, title, summary, badge, children }) {
    return (_jsxs("div", { style: prepSectionStyle, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'start', flexWrap: 'wrap' }, children: [_jsxs("div", { style: { display: 'grid', gap: 7 }, children: [_jsx(SectionEyebrow, { title: eyebrow }), _jsx("div", { style: { color: '#eef4ff', fontSize: 19, fontWeight: 800, lineHeight: 1.2 }, children: title }), _jsx("div", { style: { color: '#9aa5b7', lineHeight: 1.6 }, children: summary })] }), badge] }), children] }));
}
function PrepChecklistStep({ index, label, source, locale }) {
    const sourceLabel = {
        coach: t(locale, 'coach', 'coach'),
        runes: t(locale, 'runas', 'runes'),
        builds: t(locale, 'build', 'build'),
        matchup: t(locale, 'matchup', 'matchup')
    };
    return (_jsxs("div", { style: prepChecklistStyle, children: [_jsx("div", { style: stepIndexStyle, children: index }), _jsxs("div", { style: { display: 'grid', gap: 6 }, children: [_jsx("div", { style: { color: '#eef4ff', lineHeight: 1.65 }, children: label }), _jsx("div", { style: { color: '#7f8da2', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em' }, children: sourceLabel[source] })] })] }));
}
function MetaStat({ label, value, caption }) {
    return (_jsxs("div", { style: metaStyle, children: [_jsx("div", { style: { color: '#8c98ad', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em' }, children: label }), _jsx("div", { style: { color: '#eef4ff', fontSize: 20, fontWeight: 800, lineHeight: 1.15 }, children: value }), caption ? _jsx("div", { style: { color: '#8e9cb0', fontSize: 13, lineHeight: 1.55 }, children: caption }) : null] }));
}
function AnchorMetric({ label, value, detail, trend }) {
    return (_jsxs("div", { style: anchorMetricStyle, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', gap: 8, alignItems: 'start' }, children: [_jsx("div", { style: { color: '#8897ab', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em' }, children: label }), _jsx(TrendIndicator, { direction: trend.direction, tone: trend.tone })] }), _jsx("div", { style: { color: '#eef4ff', fontSize: 18, fontWeight: 800, lineHeight: 1.12 }, children: value }), _jsx("div", { style: { color: '#8594a8', fontSize: 12, lineHeight: 1.45 }, children: detail })] }));
}
function ReviewMetric({ label, value }) {
    return (_jsxs("div", { style: reviewMetricStyle, children: [_jsx("div", { style: { color: '#8c98ad', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em' }, children: label }), _jsx("div", { style: { color: '#eef4ff', fontSize: 18, fontWeight: 800, lineHeight: 1.1 }, children: value })] }));
}
function ProgressRow({ label, baseline, recent, trend, deltaLabel, locale }) {
    return (_jsxs("div", { style: progressRowStyle, children: [_jsxs("div", { style: { display: 'grid', gap: 4 }, children: [_jsx("div", { style: { color: '#eef4ff', fontWeight: 700 }, children: label }), _jsx("div", { style: { color: '#8f9aad', fontSize: 13 }, children: `${baseline} -> ${recent}` })] }), _jsx(TrendIndicator, { direction: trend.direction, tone: trend.tone, label: trend.direction === 'steady' ? t(locale, 'parejo', 'steady') : deltaLabel })] }));
}
function SectionEyebrow({ title }) {
    return _jsx("div", { style: { color: '#8d9ab0', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em' }, children: title });
}
function InfoBlock({ title, info, children }) {
    return (_jsxs("div", { style: infoStyle, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', color: '#93a0b4', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }, children: [title, _jsx(InfoHint, { text: info })] }), _jsx("div", { style: { color: '#edf2ff', lineHeight: 1.6 }, children: children })] }));
}
function ReferencePlayerCard({ reference, dataset, locale }) {
    const profileIconUrl = getProfileIconUrl(reference.profileIconId, reference.ddragonVersion ?? dataset.ddragonVersion);
    const performanceDiff = reference.avgPerformance - dataset.summary.avgPerformanceScore;
    const recentWrDiff = reference.recentWinRate - dataset.summary.coaching.trend.recentWinRate;
    return (_jsxs("div", { style: referenceCardStyle, children: [_jsx("div", { style: { display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'start' }, children: _jsx(Badge, { tone: reference.sourcePlatform === 'KR' ? 'low' : 'default', children: reference.slotLabel }) }), _jsxs("div", { style: { display: 'grid', gridTemplateColumns: profileIconUrl ? '54px minmax(0, 1fr)' : '1fr', gap: 12, alignItems: 'center' }, children: [profileIconUrl ? _jsx("img", { src: profileIconUrl, alt: reference.gameName, width: 54, height: 54, style: { width: 54, height: 54, borderRadius: 14, objectFit: 'cover', border: '1px solid rgba(255,255,255,0.08)' } }) : null, _jsxs("div", { style: { display: 'grid', gap: 4 }, children: [_jsxs("div", { style: { color: '#eef4ff', fontSize: 20, fontWeight: 800, lineHeight: 1.1 }, children: [reference.gameName, _jsxs("span", { style: { color: '#8f9aad' }, children: ["#", reference.tagLine] })] }), _jsx("div", { style: { color: '#9aa5b7', lineHeight: 1.5 }, children: `${reference.rankLabel} · ${reference.leaguePoints} LP` }), _jsx("div", { style: { display: 'flex', gap: 8, flexWrap: 'wrap' }, children: reference.topChampions.slice(0, 2).map((champion) => _jsx(Badge, { children: formatChampionName(champion) }, champion)) })] })] }), _jsxs("div", { className: "reference-metric-grid", style: { display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 10 }, children: [_jsx(MetaStat, { label: t(locale, 'WR reciente', 'Recent WR'), value: `${formatDecimal(reference.recentWinRate)}%`, caption: t(locale, `${reference.matches} partidas`, `${reference.matches} games`) }), _jsx(MetaStat, { label: t(locale, 'Rendimiento', 'Performance'), value: formatDecimal(reference.avgPerformance), caption: performanceDiff >= 0 ? t(locale, `${formatDecimal(performanceDiff)} sobre tu bloque`, `${formatDecimal(performanceDiff)} above your block`) : t(locale, `${formatDecimal(Math.abs(performanceDiff))} debajo de tu bloque`, `${formatDecimal(Math.abs(performanceDiff))} below your block`) }), _jsx(MetaStat, { label: "KDA", value: formatDecimal(reference.avgKda), caption: recentWrDiff >= 0 ? t(locale, `${formatDecimal(recentWrDiff)} pts WR sobre vos`, `${formatDecimal(recentWrDiff)} WR pts over you`) : t(locale, `${formatDecimal(Math.abs(recentWrDiff))} pts WR debajo`, `${formatDecimal(Math.abs(recentWrDiff))} WR pts below`) }), _jsx(MetaStat, { label: "KP", value: `${formatDecimal(reference.avgKillParticipation)}%` }), _jsx(MetaStat, { label: "CS@15", value: formatDecimal(reference.avgCsAt15) }), _jsx(MetaStat, { label: "Gold@15", value: formatInteger(reference.avgGoldAt15) })] }), _jsxs("div", { style: { display: 'flex', gap: 10, flexWrap: 'wrap' }, children: [_jsxs("span", { style: chipStyle, children: [_jsx(TrendIndicator, { direction: signal(performanceDiff, 'up', 0.3).direction, tone: signal(performanceDiff, 'up', 0.3).tone }), _jsx("span", { children: t(locale, 'rendimiento', 'performance') })] }), _jsxs("span", { style: chipStyle, children: [_jsx(TrendIndicator, { direction: signal(reference.avgDeathsPre14 - dataset.summary.avgDeathsPre14, 'down', 0.15).direction, tone: signal(reference.avgDeathsPre14 - dataset.summary.avgDeathsPre14, 'down', 0.15).tone }), _jsx("span", { children: t(locale, 'disciplina early', 'early discipline') })] }), _jsxs("span", { style: chipStyle, children: [_jsx(TrendIndicator, { direction: signal(reference.consistencyIndex - dataset.summary.consistencyIndex, 'up', 0.8).direction, tone: signal(reference.consistencyIndex - dataset.summary.consistencyIndex, 'up', 0.8).tone }), _jsx("span", { children: t(locale, 'consistencia', 'consistency') })] })] })] }));
}
const panelStyle = { display: 'grid', gap: 12, padding: '16px 16px', borderRadius: 18, background: 'linear-gradient(180deg, rgba(10, 15, 24, 0.98), rgba(7, 11, 17, 0.98))', border: '1px solid rgba(255,255,255,0.05)' };
const tileStyle = { display: 'grid', gap: 8, padding: '15px 16px', borderRadius: 16, minHeight: 112, alignContent: 'start', background: 'linear-gradient(180deg, rgba(11, 15, 24, 0.98), rgba(7, 10, 16, 0.98))', border: '1px solid rgba(255,255,255,0.05)' };
const metaStyle = { display: 'grid', gap: 8, padding: '14px 14px', borderRadius: 16, minHeight: 108, alignContent: 'start', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' };
const infoStyle = { padding: 15, borderRadius: 16, background: 'linear-gradient(180deg, rgba(11, 15, 24, 0.98), rgba(7, 10, 16, 0.98))', border: '1px solid rgba(255,255,255,0.05)' };
const stepStyle = { display: 'grid', gridTemplateColumns: '28px minmax(0, 1fr)', gap: 10, alignItems: 'start', padding: '11px 12px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' };
const stepIndexStyle = { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: 28, height: 28, borderRadius: 999, background: 'rgba(216,253,241,0.08)', border: '1px solid rgba(216,253,241,0.12)', color: '#d8fdf1', fontSize: 13, fontWeight: 800 };
const emptyStyle = { padding: '14px 15px', borderRadius: 16, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', color: '#c7d4ea', lineHeight: 1.65 };
const errorStyle = { padding: '12px 14px', borderRadius: 14, background: 'rgba(255,107,107,0.08)', border: '1px solid rgba(255,107,107,0.12)', color: '#ffb3b3', lineHeight: 1.6 };
const actionStyle = { padding: '10px 11px', borderRadius: 12, background: 'rgba(103,214,164,0.08)', border: '1px solid rgba(103,214,164,0.12)', color: '#dff7eb', lineHeight: 1.6 };
const listStyle = { padding: '11px 12px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', color: '#dfe7f4', lineHeight: 1.65 };
const questionStyle = { padding: '12px 13px', borderRadius: 14, background: 'rgba(103,214,164,0.08)', border: '1px solid rgba(103,214,164,0.14)', color: '#dff7eb' };
const trackStyle = { height: 12, borderRadius: 999, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' };
const fillStyle = { height: '100%', borderRadius: 999, background: 'linear-gradient(90deg, #7ef5c7, #c9f6e7)' };
const progressRowStyle = { display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'center', padding: '12px 14px', borderRadius: 14, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' };
const chipStyle = { display: 'inline-flex', alignItems: 'center', gap: 7, padding: '7px 10px', borderRadius: 999, background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.05)', color: '#dfe7f4', fontSize: 12, fontWeight: 700 };
const buttonStyle = { border: 0, padding: '12px 14px', borderRadius: 12, background: '#d8fdf1', color: '#05111e', fontWeight: 800, cursor: 'pointer' };
const feedbackStyle = { border: '1px solid rgba(255,255,255,0.08)', padding: '9px 11px', borderRadius: 10, background: '#0a0f18', color: '#dfe8f6', fontWeight: 700, cursor: 'pointer' };
const reviewMetricStyle = { display: 'grid', gap: 6, padding: '10px 11px', borderRadius: 12, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' };
const anchorMetricStyle = { display: 'grid', gap: 7, padding: '11px 12px', borderRadius: 14, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', alignContent: 'start' };
const strengthItemStyle = { display: 'grid', gap: 10, padding: '14px 14px', borderRadius: 16, background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)', alignContent: 'start' };
const compactListStyle = { padding: '10px 11px', borderRadius: 12, background: 'rgba(255,255,255,0.025)', border: '1px solid rgba(255,255,255,0.05)', color: '#dfe7f4', lineHeight: 1.55 };
const prepSectionStyle = { display: 'grid', gap: 14, padding: '16px 16px', borderRadius: 18, background: 'linear-gradient(180deg, rgba(10, 15, 24, 0.98), rgba(7, 11, 17, 0.98))', border: '1px solid rgba(255,255,255,0.05)', alignContent: 'start' };
const prepChecklistStyle = { display: 'grid', gridTemplateColumns: '28px minmax(0, 1fr)', gap: 10, alignItems: 'start', padding: '11px 12px', borderRadius: 14, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' };
const reviewCardStyle = { display: 'grid', gap: 12, padding: '16px 16px', borderRadius: 18, background: 'linear-gradient(180deg, rgba(10, 15, 24, 0.98), rgba(7, 11, 17, 0.98))', border: '1px solid rgba(255,255,255,0.05)', alignContent: 'start' };
const referenceCardStyle = { display: 'grid', gap: 12, padding: '16px 16px', borderRadius: 18, background: 'linear-gradient(180deg, rgba(10, 15, 24, 0.98), rgba(7, 11, 17, 0.98))', border: '1px solid rgba(255,255,255,0.05)' };
