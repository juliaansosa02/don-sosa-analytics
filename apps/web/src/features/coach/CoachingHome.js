import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Badge, Card, ChampionIdentity, InfoHint, TrendIndicator } from '../../components/ui';
import { formatDecimal, formatInteger } from '../../lib/format';
import { formatChampionName } from '../../lib/lol';
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
        ? `${baselineMatches} earlier: ${baselineLabel} -> ${recentMatches} recent: ${recentLabel}`
        : `${baselineMatches} previas: ${baselineLabel} -> ${recentMatches} recientes: ${recentLabel}`;
}
function buildFallbackReviewAgenda(matches, locale) {
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
            title: t(locale, 'Aislá dónde se cortó tu economía', 'Isolate where your economy got cut'),
            reason: t(locale, 'La partida llega al 15 más débil de lo que tu rol necesita.', 'The game is reaching minute 15 weaker than your role needs.'),
            question: t(locale, '¿Qué reset, desvío o pelea te sacó del piso económico normal del rol?', 'What reset, detour or fight pulled you off the role’s normal economy floor?'),
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
            title: t(locale, 'Usala como partida espejo', 'Use it as a mirror game'),
            reason: t(locale, 'Acá aparece una versión más limpia del plan que querés repetir.', 'This one shows a cleaner version of the plan you want to repeat.'),
            question: t(locale, '¿Qué hiciste antes del 14 para llegar ordenado al primer objetivo?', 'What did you do before minute 14 to arrive organized to the first objective?'),
            focus: t(locale, 'Recall, primera rotación y qué pelea evitaste forzar.', 'Recall, first rotation and which fight you avoided forcing.'),
            tags: [t(locale, 'Referencia', 'Reference')]
        });
    }
    return stressed.slice(0, 3);
}
function infoTone(priority) {
    if (priority === 'high')
        return 'high';
    if (priority === 'low')
        return 'low';
    return 'medium';
}
export function CoachingHome({ dataset, locale = 'es', aiCoach, generatingAICoach = false, aiCoachError, onGenerateAICoach, onSendFeedback }) {
    const { summary } = dataset;
    const matchesByDate = [...dataset.matches].sort((a, b) => a.gameCreation - b.gameCreation);
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
    const championReference = summary.championPool[0];
    const problematicMatchup = summary.problematicMatchup;
    const topProblems = summary.coaching.topProblems;
    const activePlan = summary.coaching.activePlan;
    const fallbackPositives = summary.insights.filter((insight) => insight.category === 'positive');
    const positives = (summary.positiveSignals?.length ? summary.positiveSignals : fallbackPositives).slice(0, 2);
    const reviewAgenda = (summary.reviewAgenda?.length ? summary.reviewAgenda : buildFallbackReviewAgenda(dataset.matches, locale)).slice(0, 3);
    const stableMatches = dataset.matches.filter((match) => match.timeline.deathsPre14 <= summary.avgDeathsPre14 && match.timeline.csAt15 >= summary.avgCsAt15);
    const stableWinRate = stableMatches.length ? (stableMatches.filter((match) => match.win).length / stableMatches.length) * 100 : null;
    const mainProblem = topProblems[0] ?? null;
    const mainTitle = aiCoach?.coach.mainLeak ?? mainProblem?.problem ?? summary.coaching.headline;
    const mainSummary = aiCoach?.coach.summary ?? mainProblem?.title ?? summary.coaching.subheadline;
    const mainCause = aiCoach?.coach.whyItHappens ?? mainProblem?.cause ?? null;
    const todayActions = (aiCoach?.coach.whatToDoNext3Games?.length ? aiCoach.coach.whatToDoNext3Games : mainProblem?.actions ?? []).slice(0, 3);
    const steadyLabel = t(locale, 'sin cambio fuerte', 'no sharp change');
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
    return (_jsxs("div", { style: { display: 'grid', gap: 16 }, children: [_jsxs(Card, { title: t(locale, 'Lectura principal', 'Core coaching read'), subtitle: t(locale, 'Una lectura más clara del bloque actual: qué cambió de verdad, qué se sostiene y qué conviene corregir hoy.', 'A clearer read of the current block: what truly changed, what is holding and what you should correct today.'), children: [_jsxs("div", { className: "coaching-hero-grid", style: { display: 'grid', gridTemplateColumns: 'minmax(0, 1.45fr) minmax(320px, 0.95fr)', gap: 16 }, children: [_jsxs("div", { style: { display: 'grid', gap: 14 }, children: [_jsxs("div", { style: { display: 'flex', gap: 8, flexWrap: 'wrap' }, children: [mainProblem ? _jsx(Badge, { tone: infoTone(mainProblem.priority), children: t(locale, `Prioridad ${mainProblem.priority}`, `${mainProblem.priority} priority`) }) : null, aiCoach ? _jsx(Badge, { tone: "default", children: `${Math.round(aiCoach.coach.confidence * 100)}% ${t(locale, 'confianza', 'confidence')}` }) : null, aiCoach?.continuity.mode === 'reused' ? _jsx(Badge, { tone: "default", children: t(locale, 'Bloque reutilizado', 'Reused block') }) : null, aiCoach?.continuity.mode === 'updated' ? _jsx(Badge, { tone: "low", children: t(locale, `+${aiCoach.continuity.newVisibleMatches} nuevas`, `+${aiCoach.continuity.newVisibleMatches} new`) }) : null] }), _jsx("div", { style: { color: '#eef4ff', fontSize: 32, fontWeight: 800, letterSpacing: '-0.04em', lineHeight: 1.05 }, children: mainTitle }), _jsx("div", { style: { color: '#a6b3c6', fontSize: 15, lineHeight: 1.75 }, children: mainSummary }), mainCause ? _jsxs("div", { style: panelStyle, children: [_jsx(SectionEyebrow, { title: t(locale, 'Por qué aparece', 'Why it shows up') }), _jsx("div", { style: { color: '#dfe7f4', lineHeight: 1.7 }, children: mainCause })] }) : null, aiCoachError ? _jsx("div", { style: errorStyle, children: aiCoachError }) : null, _jsxs("div", { style: { display: 'grid', gap: 8 }, children: [_jsx(SectionEyebrow, { title: t(locale, 'Qué hago hoy', 'What to do today') }), todayActions.length ? todayActions.map((action, index) => (_jsxs("div", { style: stepStyle, children: [_jsx("div", { style: stepIndexStyle, children: index + 1 }), _jsx("div", { style: { color: '#e8eef9', lineHeight: 1.65 }, children: action })] }, action))) : _jsx("div", { style: emptyStyle, children: t(locale, 'Todavía no hay una acción clara. Sumá muestra o refrescá el coaching.', 'There is no clear action yet. Add sample or refresh coaching.') })] })] }), _jsxs("div", { style: { display: 'grid', gap: 12 }, children: [_jsxs("div", { style: panelStyle, children: [_jsx(SectionEyebrow, { title: t(locale, 'Bloque actual', 'Current block') }), activePlan ? (_jsxs("div", { style: { display: 'grid', gap: 10 }, children: [_jsx("div", { style: { color: '#eef4ff', fontSize: 22, fontWeight: 800, lineHeight: 1.2 }, children: activePlan.objective }), _jsx("div", { style: { color: '#a4afc1', lineHeight: 1.6 }, children: activePlan.focus }), _jsxs("div", { style: { display: 'grid', gap: 8 }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', color: '#d7dfec', fontSize: 13 }, children: [_jsx("span", { children: t(locale, 'Progreso', 'Progress') }), _jsx("span", { children: activePlan.successLabel })] }), _jsx("div", { style: trackStyle, children: _jsx("div", { style: { ...fillStyle, width: `${activePlan.progressPercent}%` } }) }), _jsx("div", { style: { color: '#8fa0b7', fontSize: 13 }, children: t(locale, `${activePlan.completedGames}/${activePlan.targetGames} partidas cuentan para este bloque.`, `${activePlan.completedGames}/${activePlan.targetGames} games count toward this block.`) })] })] })) : _jsx("div", { style: { color: '#d7dfec', lineHeight: 1.7 }, children: t(locale, 'Todavía no hay un ciclo suficientemente claro. Conviene sumar muestra limpia o cerrar más el scope.', 'There is not a clear enough cycle yet. Add cleaner sample or narrow the scope further.') }), _jsx("button", { type: "button", style: buttonStyle, onClick: onGenerateAICoach, disabled: !onGenerateAICoach || generatingAICoach, children: generatingAICoach ? t(locale, 'Actualizando coaching...', 'Refreshing coaching...') : t(locale, 'Actualizar coaching', 'Refresh coaching') })] }), _jsxs("div", { className: "coaching-meta-grid", style: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }, children: [_jsx(MetaStat, { label: t(locale, 'Muestra', 'Sample'), value: `${summary.matches}`, caption: t(locale, 'partidas del scope', 'games in scope') }), _jsx(MetaStat, { label: t(locale, 'Campeón de referencia', 'Reference champion'), value: championReference ? formatChampionName(championReference.championName) : t(locale, 'Sin señal', 'No signal'), caption: championReference ? t(locale, `${championReference.games} partidas · ${formatDecimal(championReference.winRate)}% WR`, `${championReference.games} games · ${formatDecimal(championReference.winRate)}% WR`) : t(locale, 'todavía falta muestra', 'needs more sample') }), _jsx(MetaStat, { label: t(locale, 'Patrón estable', 'Stable pattern'), value: stableWinRate !== null ? `${formatDecimal(stableWinRate)}% WR` : t(locale, 'Sin señal', 'No signal'), caption: stableMatches.length ? t(locale, `${stableMatches.length} partidas limpias`, `${stableMatches.length} clean games`) : t(locale, 'todavía sin bloque limpio', 'no clean block yet') }), _jsx(MetaStat, { label: t(locale, 'Cruce más duro', 'Hardest matchup'), value: problematicMatchup ? `vs ${formatChampionName(problematicMatchup.opponentChampionName)}` : t(locale, 'Sin alerta', 'No alert'), caption: problematicMatchup ? (problematicMatchup.directGames >= 2 ? t(locale, `${problematicMatchup.directGames} cruces directos`, `${problematicMatchup.directGames} direct games`) : t(locale, `${problematicMatchup.recentLosses} derrotas repetidas`, `${problematicMatchup.recentLosses} repeated losses`)) : t(locale, 'sin patrón repetido', 'no repeated pattern') })] }), onSendFeedback && aiCoach ? _jsxs("div", { style: { display: 'flex', gap: 8, flexWrap: 'wrap' }, children: [_jsx("button", { type: "button", style: feedbackStyle, onClick: () => onSendFeedback('useful'), children: t(locale, 'Útil', 'Useful') }), _jsx("button", { type: "button", style: feedbackStyle, onClick: () => onSendFeedback('mixed'), children: t(locale, 'Mixto', 'Mixed') }), _jsx("button", { type: "button", style: feedbackStyle, onClick: () => onSendFeedback('generic'), children: t(locale, 'Genérico', 'Generic') }), _jsx("button", { type: "button", style: feedbackStyle, onClick: () => onSendFeedback('incorrect'), children: t(locale, 'Incorrecto', 'Incorrect') })] }) : null] })] }), _jsxs("div", { style: { display: 'grid', gap: 10, marginTop: 18 }, children: [_jsx(SectionEyebrow, { title: t(locale, 'Señales rápidas', 'Quick signals') }), _jsx("div", { className: "coaching-signal-grid", style: { display: 'grid', gridTemplateColumns: 'repeat(7, minmax(0, 1fr))', gap: 12 }, children: metricCards.map((metric) => _jsx(SignalTile, { ...metric }, metric.label)) })] })] }), _jsxs("section", { className: "two-col-grid", style: { display: 'grid', gridTemplateColumns: 'minmax(320px, 1fr) minmax(320px, 1fr)', gap: 16 }, children: [_jsx(Card, { title: t(locale, 'Lo que ya te sostiene hoy', 'What is already holding you up'), subtitle: t(locale, 'No todo es leak. Esto ya está funcionando y conviene repetirlo con intención.', 'Not everything is a leak. This is already working and should be repeated on purpose.'), children: _jsx("div", { style: { display: 'grid', gap: 12 }, children: positives.length ? positives.map((insight) => (_jsxs("div", { style: panelStyle, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'start', flexWrap: 'wrap' }, children: [_jsxs("div", { style: { display: 'grid', gap: 6 }, children: [_jsx("div", { style: { color: '#eef4ff', fontSize: 20, fontWeight: 800, lineHeight: 1.2 }, children: insight.problem }), _jsx("div", { style: { color: '#9aa5b7', lineHeight: 1.6 }, children: insight.title })] }), _jsx(Badge, { tone: "low", children: t(locale, 'Real', 'Real') })] }), insight.evidence[0] ? _jsx("div", { style: listStyle, children: insight.evidence[0] }) : null, insight.actions.slice(0, 2).map((action) => _jsx("div", { style: actionStyle, children: action }, action))] }, insight.id))) : _jsx("div", { style: emptyStyle, children: t(locale, 'Todavía no aparece una fortaleza clara en este scope.', 'There is no clear strength in this scope yet.') }) }) }), _jsx(Card, { title: t(locale, 'Agenda de review', 'Review agenda'), subtitle: t(locale, 'No es una lista de partidas: es qué abrir, por qué abrirlo y qué pregunta contestar mirando el replay.', 'This is not just a match list: it is what to open, why to open it and which question to answer in the replay.'), children: _jsx("div", { style: { display: 'grid', gap: 10 }, children: reviewAgenda.length ? reviewAgenda.map((item) => (_jsxs("div", { style: panelStyle, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'start', flexWrap: 'wrap' }, children: [_jsx(ChampionIdentity, { championName: item.championName, version: dataset.ddragonVersion, subtitle: new Date(item.gameCreation).toLocaleDateString(locale === 'en' ? 'en-US' : 'es-AR'), size: 54 }), _jsxs("div", { style: { display: 'flex', gap: 8, flexWrap: 'wrap' }, children: [item.tags.slice(0, 2).map((tag) => _jsx(Badge, { children: tag }, tag)), _jsx(Badge, { tone: item.win ? 'low' : 'high', children: item.win ? t(locale, 'Victoria', 'Win') : t(locale, 'Derrota', 'Loss') })] })] }), _jsx("div", { style: { color: '#eef4ff', fontSize: 18, fontWeight: 800, lineHeight: 1.2 }, children: item.title }), _jsx("div", { style: { color: '#9aa5b7', lineHeight: 1.65 }, children: item.reason }), _jsxs("div", { style: questionStyle, children: [_jsx(SectionEyebrow, { title: t(locale, 'Pregunta de review', 'Review question') }), _jsx("div", { style: { color: '#eff7f2', lineHeight: 1.65 }, children: item.question })] }), _jsxs("div", { style: listStyle, children: [_jsx("strong", { style: { color: '#eef4ff' }, children: t(locale, 'Mirá esto:', 'Look at this:') }), " ", item.focus] })] }, item.matchId))) : _jsx("div", { style: emptyStyle, children: t(locale, 'Todavía no hay una agenda de review clara.', 'There is no clear review agenda yet.') }) }) })] }), _jsxs("section", { className: "two-col-grid", style: { display: 'grid', gridTemplateColumns: 'minmax(320px, 1fr) minmax(320px, 1fr)', gap: 16 }, children: [_jsx(Card, { title: t(locale, 'Campeón de referencia', 'Reference champion'), subtitle: t(locale, 'El pick que hoy mejor expresa tu versión más limpia dentro del scope.', 'The pick that currently expresses your cleanest version inside the scope.'), children: championReference ? (_jsxs("div", { style: { display: 'grid', gap: 14 }, children: [_jsx("div", { style: panelStyle, children: _jsx(ChampionIdentity, { championName: championReference.championName, version: dataset.ddragonVersion, subtitle: t(locale, `${championReference.games} partidas · ${formatDecimal(championReference.winRate)}% WR`, `${championReference.games} games · ${formatDecimal(championReference.winRate)}% WR`), meta: _jsxs("span", { style: chipStyle, children: [_jsx(TrendIndicator, { direction: signal(championReference.winRate - summary.winRate, 'up', 3).direction, tone: signal(championReference.winRate - summary.winRate, 'up', 3).tone }), _jsx("span", { children: signal(championReference.winRate - summary.winRate, 'up', 3).direction === 'steady' ? t(locale, 'parejo', 'steady') : signal(championReference.winRate - summary.winRate, 'up', 3).tone === 'positive' ? t(locale, 'por encima del bloque', 'above block') : t(locale, 'por debajo del bloque', 'below block') })] }), size: 60 }) }), _jsxs("div", { className: "coaching-meta-grid", style: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }, children: [_jsx(MetaStat, { label: "WR", value: `${formatDecimal(championReference.winRate)}%` }), _jsx(MetaStat, { label: "CS@15", value: formatDecimal(championReference.avgCsAt15) }), _jsx(MetaStat, { label: "Gold@15", value: formatInteger(championReference.avgGoldAt15) }), _jsx(MetaStat, { label: t(locale, 'Muertes pre14', 'Deaths pre14'), value: formatDecimal(championReference.avgDeathsPre14) })] }), _jsxs("div", { style: panelStyle, children: [_jsx(SectionEyebrow, { title: t(locale, 'Cómo usarlo', 'How to use it') }), _jsx("div", { style: { color: '#dfe7f4', lineHeight: 1.7 }, children: problematicMatchup
                                                ? t(locale, `Tomalo como tu pick de referencia para revisar cómo cambia tu plan cuando aparece ${formatChampionName(problematicMatchup.opponentChampionName)} y dónde se rompe primero el tempo.`, `Use it as your reference pick to review how your plan changes when ${formatChampionName(problematicMatchup.opponentChampionName)} shows up and where tempo breaks first.`)
                                                : t(locale, 'Tomalo como la versión de tu juego que hoy mejor ordena recalls, primeras rotaciones y entrada al mid game.', 'Use it as the version of your game that currently organizes recalls, first rotations and entry into mid game best.') })] })] })) : _jsx("div", { style: emptyStyle, children: t(locale, 'Todavía no hay suficiente muestra para leer un campeón de referencia claro.', 'There is not enough sample yet to read a clear reference champion.') }) }), _jsx(Card, { title: t(locale, 'El cruce que hoy más te castiga', 'The matchup hurting you most right now'), subtitle: t(locale, 'Si se repite, deja de ser mala suerte y pasa a ser preparación concreta.', 'If it keeps repeating, it stops being bad luck and becomes concrete prep work.'), children: problematicMatchup ? (_jsxs("div", { style: { display: 'grid', gap: 14 }, children: [_jsxs("div", { className: "two-col-grid", style: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }, children: [_jsx(InfoBlock, { title: t(locale, 'Tu pick en este scope', 'Your pick in this scope'), info: t(locale, 'El campeón más jugado del scope reciente con el que vale la pena leer el cruce.', 'The most played champion in the recent scope worth using to read this matchup.'), children: _jsx(ChampionIdentity, { championName: problematicMatchup.championName, version: dataset.ddragonVersion, subtitle: problematicMatchup.directGames >= 2 ? t(locale, `${problematicMatchup.directGames} cruces directos · ${formatDecimal(problematicMatchup.directWinRate ?? 0)}% WR`, `${problematicMatchup.directGames} direct games · ${formatDecimal(problematicMatchup.directWinRate ?? 0)}% WR`) : t(locale, 'muestra directa corta', 'short direct sample'), size: 58 }) }), _jsx(InfoBlock, { title: t(locale, 'Rival que más te castiga', 'Opponent hurting you most'), info: t(locale, 'El rival que más daño real está haciendo dentro del scope actual.', 'The opponent doing the most real damage inside the current scope.'), children: _jsx(ChampionIdentity, { championName: problematicMatchup.opponentChampionName, version: dataset.ddragonVersion, subtitle: problematicMatchup.directGames >= 2 ? t(locale, `${problematicMatchup.directLosses} derrotas directas`, `${problematicMatchup.directLosses} direct losses`) : t(locale, `${problematicMatchup.recentLosses} derrotas repetidas del scope`, `${problematicMatchup.recentLosses} repeated scoped losses`), meta: _jsx(Badge, { tone: "high", children: `${formatDecimal(problematicMatchup.directWinRate ?? problematicMatchup.recentWinRate)}% WR` }), size: 58 }) })] }), _jsxs("div", { style: panelStyle, children: [_jsx("div", { style: { color: '#eef4ff', fontSize: 20, fontWeight: 800, lineHeight: 1.2 }, children: t(locale, `${formatChampionName(problematicMatchup.championName)} contra ${formatChampionName(problematicMatchup.opponentChampionName)}`, `${formatChampionName(problematicMatchup.championName)} into ${formatChampionName(problematicMatchup.opponentChampionName)}`) }), _jsx("div", { style: { color: '#9aa5b7', lineHeight: 1.7 }, children: problematicMatchup.summary })] }), _jsxs("div", { className: "four-col-grid", style: { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12 }, children: [_jsx(SignalTile, { label: t(locale, 'WR del cruce', 'Matchup WR'), value: `${formatDecimal(problematicMatchup.directWinRate ?? problematicMatchup.recentWinRate)}%`, detail: problematicMatchup.directWinRate !== null ? t(locale, 'muestra directa', 'direct sample') : t(locale, 'muestra del scope', 'scoped sample'), trend: { ...signal((problematicMatchup.directWinRate ?? problematicMatchup.recentWinRate) - summary.winRate, 'up', 3), label: t(locale, 'vs tu media', 'vs your average') } }), _jsx(SignalTile, { label: "Gold@15", value: delta(problematicMatchup.avgGoldDiffAt15, '', 0), detail: t(locale, 'oro vs rival', 'gold vs opponent'), trend: { ...signal(problematicMatchup.avgGoldDiffAt15, 'up', 75), label: t(locale, 'a favor / en contra', 'ahead / behind') } }), _jsx(SignalTile, { label: t(locale, 'Nivel@15', 'Level@15'), value: delta(problematicMatchup.avgLevelDiffAt15), detail: t(locale, 'nivel vs rival', 'level vs opponent'), trend: { ...signal(problematicMatchup.avgLevelDiffAt15, 'up', 0.2), label: t(locale, 'a favor / en contra', 'ahead / behind') } }), _jsx(SignalTile, { label: t(locale, 'Muertes pre14', 'Deaths pre14'), value: formatDecimal(problematicMatchup.avgDeathsPre14), detail: t(locale, 'comparado con tu media', 'compared to your average'), trend: { ...signal(problematicMatchup.avgDeathsPre14 - summary.avgDeathsPre14, 'down', 0.15), label: t(locale, 'menos es mejor', 'lower is better') } })] }), problematicMatchup.adjustments.slice(0, 3).map((adjustment) => _jsx("div", { style: actionStyle, children: adjustment }, adjustment))] })) : _jsx("div", { style: emptyStyle, children: t(locale, 'Todavía no aparece un matchup perdedor suficientemente repetido dentro de este scope.', 'There is no repeated losing matchup strong enough inside this scope yet.') }) })] }), _jsxs("section", { className: "two-col-grid", style: { display: 'grid', gridTemplateColumns: 'minmax(320px, 1fr) minmax(320px, 1fr)', gap: 16 }, children: [_jsx(Card, { title: t(locale, 'Qué cambió de verdad', 'What actually changed'), subtitle: t(locale, 'Esta comparación es tramo reciente contra bloque anterior, no contra toda la muestra. Ahí se explica mejor si algo subió o bajó.', 'This comparison is recent stretch versus previous block, not versus the full sample. That makes it much clearer whether something actually rose or fell.'), children: _jsxs("div", { style: { display: 'grid', gap: 12 }, children: [_jsx("div", { style: panelStyle, children: _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'start', flexWrap: 'wrap' }, children: [_jsxs("div", { style: { display: 'grid', gap: 6 }, children: [_jsx("div", { style: { color: '#eef4ff', fontSize: 20, fontWeight: 800, lineHeight: 1.2 }, children: changeSummary }), _jsx("div", { style: { color: '#9aa5b7', lineHeight: 1.6 }, children: t(locale, `Comparación usada: ${trend.baselineMatches} partidas previas contra ${trend.recentMatches} partidas recientes.`, `Comparison used: ${trend.baselineMatches} earlier games against ${trend.recentMatches} recent games.`) })] }), _jsxs("span", { style: chipStyle, children: [_jsx(TrendIndicator, { direction: performanceTrend.direction, tone: performanceTrend.tone }), _jsx("span", { children: performanceTrend.direction === 'steady' ? t(locale, 'parejo', 'steady') : performanceTrend.tone === 'positive' ? t(locale, 'mejora', 'improving') : t(locale, 'retroceso', 'slipping') })] })] }) }), _jsx(ProgressRow, { label: t(locale, 'Rendimiento', 'Performance'), baseline: formatDecimal(trend.baselineScore), recent: formatDecimal(trend.recentScore), trend: signal(trend.scoreDelta, 'up', 0.25), deltaLabel: delta(trend.scoreDelta), locale: locale }), _jsx(ProgressRow, { label: "WR", baseline: `${formatDecimal(trend.baselineWinRate)}%`, recent: `${formatDecimal(trend.recentWinRate)}%`, trend: signal(trend.winRateDelta, 'up', 1), deltaLabel: delta(trend.winRateDelta, ' pts'), locale: locale }), _jsx(ProgressRow, { label: "Gold@15", baseline: formatInteger(trend.baselineGoldAt15), recent: formatInteger(trend.recentGoldAt15), trend: signal(trend.goldAt15Delta, 'up', 120), deltaLabel: delta(trend.goldAt15Delta, '', 0), locale: locale }), _jsx(ProgressRow, { label: t(locale, 'Muertes pre14', 'Deaths pre14'), baseline: formatDecimal(trend.baselineDeathsPre14), recent: formatDecimal(trend.recentDeathsPre14), trend: signal(trend.deathsPre14Delta, 'down', 0.15), deltaLabel: delta(trend.deathsPre14Delta), locale: locale }), _jsx(ProgressRow, { label: t(locale, 'Consistencia', 'Consistency'), baseline: formatDecimal(trend.baselineConsistency), recent: formatDecimal(trend.recentConsistency), trend: signal(trend.consistencyDelta, 'up', 1.5), deltaLabel: delta(trend.consistencyDelta), locale: locale })] }) }), _jsx(Card, { title: t(locale, 'Prioridades del bloque', 'Block priorities'), subtitle: t(locale, 'Menos relleno, más estructura: qué te frena hoy y qué conviene hacer con eso.', 'Less filler, more structure: what is holding you back today and what to do with it.'), children: _jsx("div", { style: { display: 'grid', gap: 12 }, children: topProblems.length ? topProblems.map((problem, index) => (_jsxs("div", { style: { ...panelStyle, borderColor: problem.priority === 'high' ? 'rgba(255,107,107,0.18)' : problem.priority === 'low' ? 'rgba(103,214,164,0.16)' : 'rgba(255,255,255,0.05)' }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'start', flexWrap: 'wrap' }, children: [_jsxs("div", { style: { display: 'grid', gap: 6 }, children: [_jsx("div", { style: { color: '#8e9cb0', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em' }, children: t(locale, `Bloque ${index + 1}`, `Block ${index + 1}`) }), _jsx("div", { style: { color: '#eef4ff', fontSize: 22, fontWeight: 800, lineHeight: 1.15 }, children: problem.problem }), _jsx("div", { style: { color: '#9aa5b7', lineHeight: 1.6 }, children: problem.title })] }), _jsxs("div", { style: { display: 'flex', gap: 8, flexWrap: 'wrap' }, children: [_jsx(Badge, { tone: infoTone(problem.priority), children: t(locale, `Prioridad ${problem.priority}`, `${problem.priority} priority`) }), _jsx(Badge, { children: problem.category })] })] }), _jsxs("div", { className: "two-col-grid", style: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }, children: [_jsx(InfoBlock, { title: t(locale, 'Impacto', 'Impact'), info: t(locale, 'Cómo pega este patrón en tus resultados.', 'How hard this pattern hits your results.'), children: problem.impact }), _jsx(InfoBlock, { title: t(locale, 'Causa', 'Cause'), info: t(locale, 'Qué está explicando mejor el patrón actual.', 'What best explains the current pattern.'), children: problem.cause })] }), _jsx(SectionEyebrow, { title: t(locale, 'Se ve en', 'Shows up in') }), problem.evidence.slice(0, 2).map((item) => _jsx("div", { style: listStyle, children: item }, item)), _jsx(SectionEyebrow, { title: t(locale, 'Qué hacer hoy', 'What to do today') }), problem.actions.slice(0, 2).map((action) => _jsx("div", { style: actionStyle, children: action }, action))] }, problem.id))) : _jsx("div", { style: emptyStyle, children: t(locale, 'Todavía no hay prioridades claras para este bloque.', 'There are no clear priorities for this block yet.') }) }) })] })] }));
}
function SignalTile({ label, value, detail, trend }) {
    return (_jsxs("div", { style: tileStyle, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', gap: 10, alignItems: 'start' }, children: [_jsx("div", { style: { color: '#8b96aa', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em' }, children: label }), _jsx(TrendIndicator, { direction: trend.direction, tone: trend.tone, label: trend.label })] }), _jsx("div", { style: { color: '#eef4ff', fontSize: 24, fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.08 }, children: value }), _jsx("div", { style: { color: '#8f9aad', fontSize: 13, lineHeight: 1.6 }, children: detail })] }));
}
function MetaStat({ label, value, caption }) {
    return (_jsxs("div", { style: metaStyle, children: [_jsx("div", { style: { color: '#8c98ad', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em' }, children: label }), _jsx("div", { style: { color: '#eef4ff', fontSize: 20, fontWeight: 800, lineHeight: 1.15 }, children: value }), caption ? _jsx("div", { style: { color: '#8e9cb0', fontSize: 13, lineHeight: 1.55 }, children: caption }) : null] }));
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
const panelStyle = { display: 'grid', gap: 12, padding: '16px 16px', borderRadius: 18, background: 'linear-gradient(180deg, rgba(10, 15, 24, 0.98), rgba(7, 11, 17, 0.98))', border: '1px solid rgba(255,255,255,0.05)' };
const tileStyle = { display: 'grid', gap: 8, padding: '15px 16px', borderRadius: 16, background: 'linear-gradient(180deg, rgba(11, 15, 24, 0.98), rgba(7, 10, 16, 0.98))', border: '1px solid rgba(255,255,255,0.05)' };
const metaStyle = { display: 'grid', gap: 8, padding: '14px 14px', borderRadius: 16, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' };
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
