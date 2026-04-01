import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Card, Badge, KPI, InfoHint } from '../../components/ui';
import { formatDecimal } from '../../lib/format';
const priorityColors = {
    high: 'rgba(255, 107, 107, 0.12)',
    medium: 'rgba(118, 144, 180, 0.14)',
    low: 'rgba(98, 214, 166, 0.12)'
};
function formatDelta(value, suffix = '') {
    const rounded = Number(value.toFixed(1));
    return `${rounded >= 0 ? '+' : ''}${rounded}${suffix}`;
}
function buildReviewCue(dataset, match, locale) {
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
function buildPatternCard(dataset) {
    const championAnchor = dataset.summary.championPool[0];
    const stableMatches = dataset.matches.filter((match) => match.timeline.deathsPre14 <= dataset.summary.avgDeathsPre14 && match.timeline.csAt15 >= dataset.summary.avgCsAt15);
    const stableWinRate = stableMatches.length ? (stableMatches.filter((match) => match.win).length / stableMatches.length) * 100 : null;
    return {
        championAnchor,
        stableMatches,
        stableWinRate
    };
}
function buildReviewQueue(dataset) {
    return [...dataset.matches]
        .sort((a, b) => b.gameCreation - a.gameCreation)
        .filter((match) => !match.win || match.timeline.deathsPre14 >= 2 || match.timeline.objectiveFightDeaths > 0)
        .slice(0, 3);
}
function buildPositiveLanes(dataset, locale) {
    const positives = dataset.summary.insights.filter((insight) => insight.category === 'positive').slice(0, 2);
    if (positives.length)
        return positives;
    const topChampion = dataset.summary.championPool[0];
    if (!topChampion)
        return [];
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
function buildContinuityRead(aiCoach, locale) {
    const { continuity, context } = aiCoach;
    const visibleMatches = context.player?.visibleMatches ?? 0;
    if (continuity.mode === 'reused') {
        return {
            tone: 'default',
            title: locale === 'en' ? 'Cached coaching block' : 'Bloque de coaching reutilizado',
            body: locale === 'en'
                ? 'No new visible matches entered this filter since the previous coaching block, so the system reused the latest saved read instead of spending more tokens.'
                : 'No entraron partidas visibles nuevas en este filtro desde el bloque anterior, así que el sistema reutilizó la última lectura guardada en vez de gastar más tokens.'
        };
    }
    if (continuity.mode === 'updated') {
        return {
            tone: 'low',
            title: locale === 'en'
                ? `Updated with ${continuity.newVisibleMatches} new ${continuity.newVisibleMatches === 1 ? 'match' : 'matches'}`
                : `Actualizado con ${continuity.newVisibleMatches} ${continuity.newVisibleMatches === 1 ? 'partida nueva' : 'partidas nuevas'}`,
            body: locale === 'en'
                ? 'The current coaching block keeps continuity with the previous one and only reinterprets the new visible sample that entered your filter.'
                : 'El bloque actual mantiene continuidad con el anterior y solo reinterpreta la muestra visible nueva que entró en tu filtro.'
        };
    }
    return {
        tone: 'medium',
        title: locale === 'en'
            ? `First coaching block from ${visibleMatches} visible ${visibleMatches === 1 ? 'match' : 'matches'}`
            : `Primer bloque de coaching sobre ${visibleMatches} ${visibleMatches === 1 ? 'partida visible' : 'partidas visibles'}`,
        body: locale === 'en'
            ? 'This is the first saved coaching read for these exact filters, so the system is building the baseline it will compare against later.'
            : 'Esta es la primera lectura guardada para estos filtros exactos, así que el sistema está construyendo la línea base contra la que va a comparar después.'
    };
}
function buildProcessingRead(aiCoach, locale) {
    const { processing } = aiCoach;
    if (processing.tier === 'premium') {
        return {
            tone: 'low',
            title: locale === 'en' ? 'Premium AI pass' : 'Pasada premium de IA'
        };
    }
    if (processing.tier === 'economy') {
        return {
            tone: 'medium',
            title: locale === 'en' ? 'Economy AI pass' : 'Pasada económica de IA'
        };
    }
    if (processing.tier === 'cached') {
        return {
            tone: 'default',
            title: locale === 'en' ? 'No extra AI spend' : 'Sin gasto extra de IA'
        };
    }
    return {
        tone: 'default',
        title: locale === 'en' ? 'Structured fallback' : 'Fallback estructurado'
    };
}
export function CoachingHome({ dataset, locale = 'es', aiCoach, generatingAICoach = false, aiCoachError, onGenerateAICoach, onSendFeedback }) {
    const { summary } = dataset;
    const topProblems = summary.coaching.topProblems;
    const activePlan = summary.coaching.activePlan;
    const trend = summary.coaching.trend;
    const championAnchor = summary.championPool[0];
    const reviewQueue = buildReviewQueue(dataset);
    const positiveLanes = buildPositiveLanes(dataset, locale);
    const patternCard = buildPatternCard(dataset);
    const matchupAlert = summary.insights.find((insight) => insight.focusMetric === 'matchup_review');
    const continuityRead = aiCoach ? buildContinuityRead(aiCoach, locale) : null;
    const processingRead = aiCoach ? buildProcessingRead(aiCoach, locale) : null;
    return (_jsxs("div", { style: { display: 'grid', gap: 18 }, children: [_jsxs("section", { className: "two-col-grid", style: { display: 'grid', gridTemplateColumns: '1.15fr .85fr', gap: 16 }, children: [_jsx(Card, { title: summary.coaching.headline, subtitle: summary.coaching.subheadline, children: _jsxs("div", { className: "four-col-grid", style: { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12 }, children: [_jsx(KPI, { label: locale === 'en' ? 'Win rate' : 'WR', value: `${summary.winRate}%`, hint: locale === 'en' ? `${summary.wins}-${summary.losses} across ${summary.matches} matches` : `${summary.wins}-${summary.losses} en ${summary.matches} partidas`, info: locale === 'en' ? 'Win rate within the filtered sample you are viewing. If you change role, queue or time window, this number updates.' : 'Porcentaje de victorias dentro de la muestra filtrada que estás viendo. Si cambiás de rol, cola o ventana, esta cifra se recalcula.' }), _jsx(KPI, { label: locale === 'en' ? 'Performance' : 'Rendimiento', value: formatDecimal(summary.avgPerformanceScore), hint: locale === 'en' ? `Consistency ${formatDecimal(summary.consistencyIndex)}` : `Consistencia ${formatDecimal(summary.consistencyIndex)}`, info: locale === 'en' ? 'Internal index that summarizes economy, fighting, macro and stability. It is not an official Riot metric: it helps compare your overall execution quality across matches.' : 'Índice interno que resume economía, peleas, macro y estabilidad. No es una métrica oficial de Riot: sirve para comparar la calidad general de tu ejecución entre partidas.' }), _jsx(KPI, { label: locale === 'en' ? 'CS at 15' : 'CS a los 15', value: formatDecimal(summary.avgCsAt15), hint: locale === 'en' ? 'Current economy baseline' : 'Base actual de economía', info: locale === 'en' ? 'We use minute 15 because it better captures resets, early rotations and your real economy state before mid game.' : 'Elegimos el minuto 15 porque captura mejor tus resets, primeras rotaciones y el estado real de tu economía antes del mid game.' }), _jsx(KPI, { label: locale === 'en' ? 'Anchor pick' : 'Pick ancla', value: championAnchor?.championName ?? 'N/A', hint: championAnchor ? `${championAnchor.winRate}% WR` : (locale === 'en' ? 'Not enough sample' : 'Sin muestra suficiente'), info: locale === 'en' ? 'The champion that carries the most weight inside the current filter. If your sample leans heavily on one pick, coaching needs to respect that.' : 'El campeón que más pesa dentro del filtro actual. Si tu muestra se apoya mucho en un pick, la lectura de coaching tiene que respetar eso.' })] }) }), _jsx(Card, { title: locale === 'en' ? 'Current block radar' : 'Radar del bloque actual', subtitle: locale === 'en' ? 'Three quick reads to know where to look first' : 'Tres lecturas rápidas para saber dónde mirar primero', children: _jsxs("div", { style: { display: 'grid', gap: 12 }, children: [_jsx(SpotlightMetric, { label: locale === 'en' ? 'Stable pattern' : 'Patrón estable', info: locale === 'en' ? 'Look for the version of your play that is already working, so you do not build the entire plan from scratch.' : 'Busca la versión de vos mismo que ya está funcionando, para no construir todo el plan desde cero.', value: patternCard.stableWinRate !== null ? `${formatDecimal(patternCard.stableWinRate)}% WR` : (locale === 'en' ? 'No clear signal' : 'Sin señal clara'), caption: patternCard.stableMatches.length
                                        ? (locale === 'en' ? `${patternCard.stableMatches.length} matches with better-than-average economy and discipline` : `${patternCard.stableMatches.length} partidas con economía y disciplina mejores que tu media`)
                                        : (locale === 'en' ? 'There are not enough clean games inside the current filter yet' : 'Todavía no hay suficientes partidas limpias en el filtro actual') }), _jsx(SpotlightMetric, { label: locale === 'en' ? 'Matchup to watch' : 'Matchup a vigilar', info: locale === 'en' ? 'If a matchup keeps repeating with bad outcomes, it stops being random and becomes preparation material.' : 'Si un matchup se repite con malos resultados, deja de ser un accidente y pasa a ser material de preparación.', value: matchupAlert ? (locale === 'en' ? 'Yes' : 'Sí') : (locale === 'en' ? 'No alert' : 'Sin alerta'), caption: matchupAlert ? matchupAlert.problem : (locale === 'en' ? 'No recurring cross appears strong enough inside this sample' : 'No aparece un cruce recurrente lo bastante fuerte dentro de esta muestra') }), _jsx(SpotlightMetric, { label: locale === 'en' ? 'Today plan' : 'Plan de hoy', info: locale === 'en' ? 'The true priority of the current block. This is what you should sustain in your next games.' : 'La prioridad real del bloque actual. Esto es lo que más conviene sostener en tus próximas partidas.', value: activePlan ? activePlan.objective : (locale === 'en' ? 'Keep building sample' : 'Seguir acumulando muestra'), caption: activePlan ? activePlan.successLabel : (locale === 'en' ? 'Filter by the role you want to work on if you want a sharper read' : 'Filtrá por el rol que quieras trabajar si querés una lectura más fina') })] }) })] }), _jsxs("section", { className: "three-col-grid", style: { display: 'grid', gridTemplateColumns: '1.1fr .9fr 1fr', gap: 16 }, children: [_jsx(Card, { title: locale === 'en' ? 'Current coaching read' : 'Lectura principal de coaching', subtitle: locale === 'en'
                            ? 'This is the main diagnosis for the current filter, built from your data, curated coach knowledge and live patch context.'
                            : 'Este es el diagnóstico principal del filtro actual, armado con tus datos, conocimiento curado de coaches y contexto del parche live.', children: _jsxs("div", { style: { display: 'grid', gap: 12 }, children: [_jsx("div", { style: { color: '#a5b2c6', lineHeight: 1.6 }, children: locale === 'en'
                                        ? 'The rest of this page should be read through this lens first. Supporting signals and review tasks exist to make this diagnosis usable.'
                                        : 'El resto de esta página conviene leerlo primero a través de esta lente. Las señales y tareas de review están para volver usable este diagnóstico.' }), _jsxs("div", { style: { display: 'flex', gap: 8, flexWrap: 'wrap' }, children: [_jsx("button", { type: "button", style: aiButtonStyle, onClick: onGenerateAICoach, disabled: !onGenerateAICoach || generatingAICoach, children: generatingAICoach ? (locale === 'en' ? 'Refreshing coaching...' : 'Actualizando coaching...') : (locale === 'en' ? 'Refresh coaching' : 'Actualizar coaching') }), aiCoach ? _jsx(Badge, { tone: aiCoach.provider === 'openai' ? 'low' : 'medium', children: aiCoach.provider === 'openai' ? 'OPENAI' : (locale === 'en' ? 'STRUCTURED FALLBACK' : 'FALLBACK ESTRUCTURADO') }) : null, aiCoach ? _jsx(Badge, { tone: "default", children: `${Math.round(aiCoach.coach.confidence * 100)}% ${locale === 'en' ? 'confidence' : 'confianza'}` }) : null, processingRead ? _jsx(Badge, { tone: processingRead.tone, children: processingRead.title }) : null, aiCoach?.continuity.mode === 'reused' ? _jsx(Badge, { tone: "default", children: locale === 'en' ? 'NO NEW MATCHES' : 'SIN PARTIDAS NUEVAS' }) : null, aiCoach?.continuity.mode === 'updated' ? _jsx(Badge, { tone: "low", children: locale === 'en' ? `+${aiCoach.continuity.newVisibleMatches} NEW` : `+${aiCoach.continuity.newVisibleMatches} NUEVAS` }) : null] }), aiCoachError ? _jsx("div", { style: { color: '#ffb3b3', lineHeight: 1.6 }, children: aiCoachError }) : null, aiCoach ? (_jsxs("div", { style: { display: 'grid', gap: 12 }, children: [_jsxs("div", { style: signalCardStyle, children: [_jsx("div", { style: { color: '#edf2ff', fontSize: 18, fontWeight: 800 }, children: aiCoach.coach.mainLeak }), _jsx("div", { style: { color: '#9aa5b7', lineHeight: 1.7 }, children: aiCoach.coach.summary })] }), continuityRead ? (_jsx(InfoCard, { title: locale === 'en' ? 'Coaching continuity' : 'Continuidad del coaching', info: locale === 'en'
                                                ? 'Shows whether this block was generated for the first time, updated with new matches or simply reused because nothing changed.'
                                                : 'Muestra si este bloque se generó por primera vez, se actualizó con partidas nuevas o simplemente se reutilizó porque no cambió nada.', children: _jsxs("div", { style: { display: 'grid', gap: 10 }, children: [_jsxs("div", { style: { display: 'flex', gap: 8, flexWrap: 'wrap' }, children: [_jsx(Badge, { tone: continuityRead.tone, children: continuityRead.title }), aiCoach.continuity.previousVisibleMatches > 0 ? (_jsx(Badge, { tone: "default", children: locale === 'en'
                                                                    ? `${aiCoach.continuity.previousVisibleMatches} matches in previous block`
                                                                    : `${aiCoach.continuity.previousVisibleMatches} partidas en el bloque anterior` })) : null] }), _jsx("div", { style: { color: '#d7e1f0' }, children: continuityRead.body })] }) })) : null, aiCoach ? (_jsx(InfoCard, { title: locale === 'en' ? 'AI budget and quality' : 'Presupuesto y calidad de IA', info: locale === 'en'
                                                ? 'The system uses stronger AI only when it adds value, cheaper AI for smaller updates, and structured fallback when it is smarter to save spend.'
                                                : 'El sistema usa IA más fuerte solo cuando agrega valor, IA más barata para updates chicos y fallback estructurado cuando conviene ahorrar gasto.', children: _jsxs("div", { style: { display: 'grid', gap: 10 }, children: [_jsxs("div", { style: { display: 'flex', gap: 8, flexWrap: 'wrap' }, children: [processingRead ? _jsx(Badge, { tone: processingRead.tone, children: processingRead.title }) : null, aiCoach.processing.selectedModel ? _jsx(Badge, { tone: "default", children: aiCoach.processing.selectedModel }) : null] }), _jsx("div", { style: { color: '#d7e1f0' }, children: aiCoach.processing.reason }), _jsxs("div", { style: { display: 'grid', gap: 8 }, children: [_jsx("div", { style: signalActionStyle, children: locale === 'en'
                                                                    ? `This month: $${aiCoach.processing.budget.estimatedCostUsd.toFixed(2)} used out of $${aiCoach.processing.budget.budgetUsd.toFixed(2)} budget for this profile.`
                                                                    : `Este mes: US$${aiCoach.processing.budget.estimatedCostUsd.toFixed(2)} usados de un presupuesto de US$${aiCoach.processing.budget.budgetUsd.toFixed(2)} para este perfil.` }), _jsx("div", { style: signalActionStyle, children: locale === 'en'
                                                                    ? `${aiCoach.processing.budget.openaiRuns} AI runs, ${aiCoach.processing.budget.premiumRuns} premium runs, $${aiCoach.processing.budget.remainingBudgetUsd.toFixed(2)} remaining.`
                                                                    : `${aiCoach.processing.budget.openaiRuns} corridas de IA, ${aiCoach.processing.budget.premiumRuns} premium, US$${aiCoach.processing.budget.remainingBudgetUsd.toFixed(2)} restantes.` })] })] }) })) : null, _jsx(InfoCard, { title: locale === 'en' ? 'Patch context' : 'Contexto de parche', info: locale === 'en'
                                                ? 'Official Riot patch context used to adjust the coaching emphasis when your pool or matchup changed recently.'
                                                : 'Contexto oficial de parche de Riot usado para ajustar el énfasis del coaching cuando tu pool o matchup cambió recientemente.', children: _jsxs("div", { style: { display: 'grid', gap: 10 }, children: [_jsxs("div", { style: { display: 'flex', gap: 8, flexWrap: 'wrap' }, children: [_jsx(Badge, { tone: "default", children: `Patch ${aiCoach.context.patchContext.currentPatch}` }), _jsx(Badge, { tone: "medium", children: locale === 'en' ? 'Official Riot source' : 'Fuente oficial Riot' })] }), _jsx("div", { style: { color: '#d7e1f0' }, children: aiCoach.context.patchContext.note }), aiCoach.context.patchContext.summary.length ? (_jsx("div", { style: { display: 'grid', gap: 8 }, children: aiCoach.context.patchContext.summary.slice(0, 2).map((item) => (_jsx("div", { children: item }, item))) })) : null, aiCoach.context.patchContext.relevantChampionUpdates.length ? (_jsx("div", { style: { display: 'grid', gap: 8 }, children: aiCoach.context.patchContext.relevantChampionUpdates.slice(0, 2).map((update) => (_jsxs("div", { style: signalActionStyle, children: [_jsx("strong", { children: update.championName }), `: ${update.summary}`] }, `${update.championName}-${update.summary}`))) })) : null, aiCoach.context.patchContext.relevantSystemUpdates.length ? (_jsx("div", { style: { display: 'grid', gap: 8 }, children: aiCoach.context.patchContext.relevantSystemUpdates.slice(0, 1).map((update) => (_jsxs("div", { style: signalActionStyle, children: [_jsx("strong", { children: update.category }), `: ${update.summary}`] }, `${update.category}-${update.summary}`))) })) : null, _jsx("a", { href: aiCoach.context.patchContext.sourceUrl, target: "_blank", rel: "noreferrer", style: { color: '#8dd8ff', textDecoration: 'none', fontWeight: 700 }, children: locale === 'en' ? 'Open official patch notes' : 'Abrir patch notes oficiales' })] }) }), _jsx(InfoCard, { title: locale === 'en' ? 'Why it happens' : 'Por qué pasa', info: locale === 'en' ? 'Model explanation grounded in your current coaching block and retrieved coach knowledge.' : 'Explicación del modelo apoyada en tu bloque actual y en conocimiento curado recuperado.', children: aiCoach.coach.whyItHappens }), _jsx(InfoCard, { title: locale === 'en' ? 'What to review' : 'Qué revisar', info: locale === 'en' ? 'The exact clips or moments worth checking before you queue again.' : 'Los clips o momentos exactos que conviene revisar antes de volver a jugar.', children: _jsx("div", { style: { display: 'grid', gap: 8 }, children: aiCoach.coach.whatToReview.map((item) => (_jsx("div", { children: item }, item))) }) }), _jsx(InfoCard, { title: locale === 'en' ? 'Next 3 games' : 'Próximas 3 partidas', info: locale === 'en' ? 'Habits to hold immediately in your next block.' : 'Hábitos para sostener inmediatamente en tu siguiente bloque.', children: _jsx("div", { style: { display: 'grid', gap: 8 }, children: aiCoach.coach.whatToDoNext3Games.map((item) => (_jsx("div", { children: item }, item))) }) }), aiCoach.coach.championSpecificNote ? (_jsx(InfoCard, { title: locale === 'en' ? 'Champion note' : 'Nota de campeón', info: locale === 'en' ? 'Specific read tied to your current anchor pick.' : 'Lectura específica atada a tu pick ancla actual.', children: aiCoach.coach.championSpecificNote })) : null, aiCoach.coach.matchupSpecificNote ? (_jsx(InfoCard, { title: locale === 'en' ? 'Matchup note' : 'Nota de matchup', info: locale === 'en' ? 'Specific preparation clue for the matchup pattern the system found.' : 'Pista específica de preparación para el patrón de matchup que encontró el sistema.', children: aiCoach.coach.matchupSpecificNote })) : null, _jsx("div", { style: { display: 'flex', gap: 8, flexWrap: 'wrap' }, children: onSendFeedback ? (_jsxs(_Fragment, { children: [_jsx("button", { type: "button", style: feedbackButtonStyle, onClick: () => onSendFeedback('useful'), children: locale === 'en' ? 'Useful' : 'Útil' }), _jsx("button", { type: "button", style: feedbackButtonStyle, onClick: () => onSendFeedback('mixed'), children: locale === 'en' ? 'Mixed' : 'Mixto' }), _jsx("button", { type: "button", style: feedbackButtonStyle, onClick: () => onSendFeedback('generic'), children: locale === 'en' ? 'Generic' : 'Genérico' }), _jsx("button", { type: "button", style: feedbackButtonStyle, onClick: () => onSendFeedback('incorrect'), children: locale === 'en' ? 'Incorrect' : 'Incorrecto' })] })) : null })] })) : (_jsxs("div", { style: signalCardStyle, children: [_jsx("div", { style: { color: '#edf2ff', fontSize: 18, fontWeight: 800 }, children: generatingAICoach
                                                ? (locale === 'en' ? 'Building your current coaching read...' : 'Armando tu lectura principal de coaching...')
                                                : (locale === 'en' ? 'Waiting for the current coaching read...' : 'Esperando la lectura principal de coaching...') }), _jsx("div", { style: { color: '#9aa5b7', lineHeight: 1.7 }, children: locale === 'en'
                                                ? 'As soon as the coach block is ready, this area becomes the main diagnosis for the entire page.'
                                                : 'Apenas esté listo el bloque de coaching, esta zona pasa a ser el diagnóstico principal de toda la página.' })] }))] }) }), _jsx(Card, { title: locale === 'en' ? 'What is already giving you level' : 'Qué ya te está dando nivel', subtitle: locale === 'en' ? 'Not everything is about fixing issues: you also need to repeat what is already working' : 'No todo es corregir: también hay que repetir lo que sí funciona', children: _jsx("div", { style: { display: 'grid', gap: 10 }, children: positiveLanes.map((insight) => (_jsxs("div", { style: signalCardStyle, children: [_jsxs("div", { style: { display: 'grid', gap: 5 }, children: [_jsx("div", { style: { color: '#edf2ff', fontSize: 18, fontWeight: 800 }, children: insight.problem }), _jsx("div", { style: { color: '#9aa5b7', lineHeight: 1.6 }, children: insight.title })] }), _jsx("div", { style: { display: 'grid', gap: 8 }, children: insight.actions.map((action) => (_jsx("div", { style: signalActionStyle, children: action }, action))) })] }, insight.id))) }) }), _jsx(Card, { title: locale === 'en' ? 'Review queue' : 'Sesión de review', subtitle: locale === 'en' ? 'Three games worth reviewing before you queue again' : 'Tres partidas para mirar antes de volver a queuear', children: _jsx("div", { style: { display: 'grid', gap: 10 }, children: reviewQueue.length ? reviewQueue.map((match) => (_jsxs("div", { style: reviewMatchStyle, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }, children: [_jsxs("div", { style: { display: 'grid', gap: 4 }, children: [_jsx("div", { style: { color: '#edf2ff', fontWeight: 800 }, children: match.championName }), _jsx("div", { style: { color: '#8190a4', fontSize: 12 }, children: new Date(match.gameCreation).toLocaleDateString(locale === 'en' ? 'en-US' : 'es-AR') })] }), _jsx(Badge, { tone: match.win ? 'low' : 'high', children: match.win ? 'Win' : 'Loss' })] }), _jsxs("div", { style: { display: 'flex', gap: 8, flexWrap: 'wrap' }, children: [_jsx(Badge, { children: `${formatDecimal(match.timeline.csAt15)} CS@15` }), _jsx(Badge, { children: locale === 'en' ? `${formatDecimal(match.timeline.deathsPre14)} deaths pre14` : `${formatDecimal(match.timeline.deathsPre14)} muertes pre14` }), match.opponentChampionName ? _jsx(Badge, { children: `vs ${match.opponentChampionName}` }) : null] }), _jsx("div", { style: { color: '#9aa5b7', lineHeight: 1.6 }, children: buildReviewCue(dataset, match, locale) })] }, match.matchId))) : (_jsx("div", { style: { color: '#c7d4ea' }, children: locale === 'en' ? 'There is no clear review queue yet. Add more matches or open a larger recent window.' : 'No hay una cola de review clara todavía. Sumá más partidas o abrí una ventana reciente más grande.' })) }) }), _jsx(Card, { title: locale === 'en' ? 'Anchor pick map' : 'Mapa del pick ancla', subtitle: locale === 'en' ? 'How to read the champion that currently carries the most weight in your sample' : 'Cómo leer el campeón que hoy más pesa en tu muestra', children: _jsx("div", { style: { display: 'grid', gap: 12 }, children: championAnchor ? (_jsxs(_Fragment, { children: [_jsx(InfoCard, { title: locale === 'en' ? 'Main pick' : 'Pick principal', info: locale === 'en' ? 'The champion that most shapes the current coaching read.' : 'El campeón que más condiciona la lectura actual de coaching.', children: _jsxs("div", { style: { display: 'grid', gap: 6 }, children: [_jsx("div", { style: { fontSize: 22, fontWeight: 800 }, children: championAnchor.championName }), _jsx("div", { style: { color: '#9aa5b7' }, children: locale === 'en' ? `${championAnchor.games} matches · ${championAnchor.winRate}% WR · ${formatDecimal(championAnchor.avgCsAt15)} CS@15` : `${championAnchor.games} partidas · ${championAnchor.winRate}% WR · ${formatDecimal(championAnchor.avgCsAt15)} CS@15` })] }) }), _jsx(InfoCard, { title: locale === 'en' ? 'What to watch' : 'Qué mirar', info: locale === 'en' ? 'The goal is to separate whether your main pick is already organizing the game well or hiding a problem.' : 'La idea es separar si tu pick principal ya te ordena bien la partida o si está ocultando un problema.', children: matchupAlert
                                            ? (locale === 'en' ? `Your next improvement with ${championAnchor.championName} probably does not come from playing it more, but from understanding the matchup that punishes you the most.` : `Tu siguiente mejora con ${championAnchor.championName} probablemente no pasa por jugarlo más, sino por entender mejor el cruce que hoy más te castiga.`)
                                            : (locale === 'en' ? `Use it as your baseline to review recalls, first rotations and when your early game actually enters mid game cleanly.` : `Usalo como línea base para revisar recalls, primeras rotaciones y cuándo tu early realmente entra limpio al mid game.`) })] })) : (_jsx("div", { style: { color: '#c7d4ea' }, children: locale === 'en' ? 'There is not enough sample yet to read a clear anchor pick inside the current filter.' : 'Todavía no hay suficiente muestra para leer un pick ancla claro dentro del filtro actual.' })) }) })] }), _jsxs("section", { style: { display: 'grid', gap: 14 }, children: [_jsxs("div", { children: [_jsx("h2", { style: { margin: 0, fontSize: 24 }, children: locale === 'en' ? 'Coaching priorities' : 'Prioridades de coaching' }), _jsx("p", { style: { margin: '6px 0 0', color: '#8994a8' }, children: locale === 'en' ? 'What is costing you the most right now, with evidence, impact and concrete actions.' : 'Lo que más te está costando hoy, con evidencia, impacto y acciones concretas.' })] }), _jsx("div", { style: { display: 'grid', gap: 16 }, children: topProblems.map((problem, index) => (_jsxs("div", { style: { ...problemCardStyle, borderColor: borderForPriority(problem.priority) }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'start', flexWrap: 'wrap' }, children: [_jsxs("div", { style: { display: 'grid', gap: 8 }, children: [_jsx("div", { style: { color: '#7f8999', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em' }, children: locale === 'en' ? `Block ${index + 1}` : `Bloque ${index + 1}` }), _jsx("div", { style: { fontSize: 24, fontWeight: 800, letterSpacing: '-0.03em' }, children: problem.problem }), _jsx("div", { style: { color: '#97a2b3', maxWidth: 780 }, children: problem.title })] }), _jsxs("div", { style: { display: 'flex', gap: 8, flexWrap: 'wrap' }, children: [_jsx(Badge, { tone: problem.priority, children: problem.priority.toUpperCase() }), _jsx(Badge, { children: problem.category.toUpperCase() }), typeof problem.winRateDelta === 'number' ? _jsx(Badge, { tone: problem.winRateDelta >= 0 ? 'low' : 'high', children: `${formatDelta(problem.winRateDelta, ' pts WR')}` }) : null] })] }), _jsxs("div", { className: "three-col-grid", style: { display: 'grid', gridTemplateColumns: '1.15fr 1fr 1fr', gap: 12 }, children: [_jsx(InfoCard, { title: locale === 'en' ? 'Impact' : 'Impacto', info: locale === 'en' ? 'How hard this pattern hits your results and your ability to convert games.' : 'Qué tan fuerte pega este patrón en tus resultados y en tu capacidad de convertir partidas.', children: problem.impact }), _jsx(InfoCard, { title: locale === 'en' ? 'Cause' : 'Causa', info: locale === 'en' ? 'The system interpretation of the most likely root cause behind the issue.' : 'La interpretación del sistema sobre el origen más probable del problema.', children: problem.cause }), _jsx(InfoCard, { title: locale === 'en' ? 'Evidence' : 'Evidencia', info: locale === 'en' ? 'Concrete signals detected in your recent sample.' : 'Señales concretas detectadas en tu muestra reciente.', children: _jsx("div", { style: { display: 'grid', gap: 8 }, children: problem.evidence.map((item) => (_jsx("div", { children: item }, item))) }) })] }), _jsxs("div", { style: { display: 'grid', gap: 10 }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', color: '#93a0b4', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em' }, children: [locale === 'en' ? 'What to do today' : 'Qué hacer hoy', _jsx(InfoHint, { text: locale === 'en' ? 'Concrete actions for the next games. This should translate decisions into practical habits, not generic advice.' : 'Acciones concretas para las próximas partidas. Acá queremos bajar decisiones a hábitos prácticos, no consejos genéricos.' })] }), _jsx("div", { style: { display: 'grid', gap: 10 }, children: problem.actions.map((action) => (_jsx("div", { style: { ...actionStyle, background: priorityColors[problem.priority] ?? priorityColors.low }, children: action }, action))) })] })] }, problem.id))) })] }), _jsxs("section", { className: "two-col-grid", style: { display: 'grid', gridTemplateColumns: 'minmax(320px, 1fr) minmax(320px, 1fr)', gap: 16 }, children: [_jsx(Card, { title: locale === 'en' ? 'Active plan' : 'Plan activo', subtitle: locale === 'en' ? 'Which habit we are trying to stabilize in the recent sample' : 'Qué hábito estamos intentando fijar en la muestra reciente', children: activePlan ? (_jsxs("div", { style: { display: 'grid', gap: 14 }, children: [_jsx(InfoCard, { title: locale === 'en' ? 'Objective' : 'Objetivo', info: locale === 'en' ? 'The behavior or benchmark we want to sustain over the next games.' : 'La conducta o benchmark que queremos sostener en las próximas partidas.', children: activePlan.objective }), _jsx(InfoCard, { title: locale === 'en' ? 'Focus' : 'Foco', info: locale === 'en' ? 'The root issue this improvement cycle is trying to address.' : 'El problema raíz al que responde este ciclo de mejora.', children: activePlan.focus }), _jsxs("div", { style: { display: 'grid', gap: 8 }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', color: '#c7d4ea', fontSize: 13 }, children: [_jsx("span", { children: locale === 'en' ? 'Progress' : 'Progreso' }), _jsx("span", { children: activePlan.successLabel })] }), _jsx("div", { style: { height: 12, borderRadius: 999, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }, children: _jsx("div", { style: { width: `${activePlan.progressPercent}%`, height: '100%', background: '#67d6a4' } }) })] })] })) : (_jsx("p", { style: { margin: 0, color: '#c7d4ea' }, children: locale === 'en' ? 'There are not enough signals yet to define a clear cycle. Add more matches or filter down to the role you want to work on.' : 'Todavía no hay suficientes señales para fijar un ciclo claro. Sumá más partidas o filtrá por el rol que querés trabajar.' })) }), _jsx(Card, { title: locale === 'en' ? 'Recent evolution' : 'Evolución reciente', subtitle: locale === 'en' ? 'How your level changed between the baseline block and the newest stretch' : 'Cómo cambió tu nivel entre la base y el tramo más nuevo', children: _jsxs("div", { style: { display: 'grid', gap: 12 }, children: [_jsxs("div", { className: "two-col-grid", style: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }, children: [_jsx(KPI, { label: locale === 'en' ? 'Performance' : 'Rendimiento', value: `${trend.baselineScore} -> ${trend.recentScore}`, hint: formatDelta(trend.scoreDelta), info: locale === 'en' ? 'Compares your average score between the baseline block and the newest stretch of the sample. It helps reveal whether your overall execution is climbing or dropping.' : 'Compara tu score medio entre el bloque inicial y el tramo más reciente de la muestra. Sirve para ver si tu ejecución general está subiendo o cayendo.' }), _jsx(KPI, { label: locale === 'en' ? 'Win rate' : 'WR', value: `${trend.baselineWinRate}% -> ${trend.recentWinRate}%`, hint: formatDelta(trend.winRateDelta, ' pts'), info: locale === 'en' ? 'Compares the oldest block in the sample against your most recent games to detect whether your level is rising, falling or stabilizing.' : 'Compara el bloque más viejo de la muestra contra tus partidas más recientes para detectar si tu nivel sube, cae o se estabiliza.' })] }), _jsx(InfoCard, { title: locale === 'en' ? 'Read' : 'Lectura', info: locale === 'en' ? 'Short interpretation of the recent trend.' : 'Interpretación resumida de la tendencia reciente.', children: trend.scoreDelta >= 0
                                        ? (locale === 'en' ? 'Your recent performance is improving. The next priority is to hold that quality without falling back into the same early-game errors.' : 'Tu rendimiento reciente viene mejorando. La prioridad ahora es sostener la calidad sin volver a los errores del early.')
                                        : (locale === 'en' ? 'Your recent block dropped. Before adding complexity, the main problem needs to be stabilized first.' : 'Tu tramo reciente cayó. Antes de sumar complejidad, conviene estabilizar el problema principal.') })] }) })] })] }));
}
function SpotlightMetric({ label, value, caption, info }) {
    return (_jsxs("div", { style: headlineMetricStyle, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', color: '#8b96aa', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em' }, children: [label, _jsx(InfoHint, { text: info })] }), _jsx("div", { style: { fontSize: 20, fontWeight: 800, lineHeight: 1.2 }, children: value }), _jsx("div", { style: { color: '#8f9aad', fontSize: 13, lineHeight: 1.6 }, children: caption })] }));
}
function InfoCard({ title, info, children }) {
    return (_jsxs("div", { style: infoCardStyle, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', color: '#93a0b4', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 10 }, children: [title, _jsx(InfoHint, { text: info })] }), _jsx("div", { style: { color: '#edf2ff', lineHeight: 1.6 }, children: children })] }));
}
function borderForPriority(priority) {
    if (priority === 'high')
        return 'rgba(255,107,107,0.22)';
    if (priority === 'low')
        return 'rgba(103,214,164,0.2)';
    return 'rgba(113,131,168,0.24)';
}
const problemCardStyle = {
    display: 'grid',
    gap: 16,
    padding: 20,
    borderRadius: 18,
    background: 'linear-gradient(180deg, rgba(24,18,41,0.9), rgba(8,11,18,0.98))',
    border: '1px solid rgba(255,255,255,0.06)'
};
const aiButtonStyle = {
    border: 0,
    padding: '12px 14px',
    borderRadius: 12,
    background: '#d8fdf1',
    color: '#05111e',
    fontWeight: 800,
    cursor: 'pointer'
};
const feedbackButtonStyle = {
    border: '1px solid rgba(255,255,255,0.08)',
    padding: '9px 11px',
    borderRadius: 10,
    background: '#0a0f18',
    color: '#dfe8f6',
    fontWeight: 700,
    cursor: 'pointer'
};
const infoCardStyle = {
    padding: 14,
    borderRadius: 14,
    background: '#090e16',
    border: '1px solid rgba(255,255,255,0.05)'
};
const actionStyle = {
    padding: '13px 14px',
    borderRadius: 14,
    border: '1px solid rgba(255,255,255,0.05)',
    color: '#edf2ff'
};
const headlineMetricStyle = {
    padding: '14px 16px',
    borderRadius: 14,
    background: '#090e16',
    border: '1px solid rgba(255,255,255,0.05)',
    display: 'grid',
    gap: 8
};
const signalCardStyle = {
    display: 'grid',
    gap: 12,
    padding: '14px 15px',
    borderRadius: 16,
    background: '#090e16',
    border: '1px solid rgba(255,255,255,0.05)'
};
const signalActionStyle = {
    padding: '10px 11px',
    borderRadius: 12,
    background: 'rgba(103,214,164,0.08)',
    border: '1px solid rgba(103,214,164,0.12)',
    color: '#dff7eb',
    lineHeight: 1.6
};
const reviewMatchStyle = {
    display: 'grid',
    gap: 10,
    padding: '14px 15px',
    borderRadius: 16,
    background: '#090e16',
    border: '1px solid rgba(255,255,255,0.05)'
};
