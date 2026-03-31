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
function buildReviewCue(dataset, match) {
    if (match.timeline.deathsPre14 >= 3) {
        return 'Revisá la primera muerte que te saca del mapa. Ahí suele empezar a romperse la partida.';
    }
    if (match.timeline.csAt15 < dataset.summary.avgCsAt15 - 12) {
        return 'La economía temprana se quedó corta. Mirá el primer reset o desvío que te corta el ingreso.';
    }
    if (match.timeline.objectiveFightDeaths > 0) {
        return 'La review clave está en la ventana de objetivo: setup, reset y quién llega primero.';
    }
    return 'Usala como partida espejo para comparar tempo, resets y calidad de decisiones contra tu bloque actual.';
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
function buildPositiveLanes(dataset) {
    const positives = dataset.summary.insights.filter((insight) => insight.category === 'positive').slice(0, 2);
    if (positives.length)
        return positives;
    const topChampion = dataset.summary.championPool[0];
    if (!topChampion)
        return [];
    return [{
            id: 'fallback-positive',
            problem: `${topChampion.championName} sigue siendo tu referencia más clara`,
            title: `Concentrás ${topChampion.games} partidas y ${topChampion.winRate}% WR en tu pick más jugado.`,
            actions: [
                `Usá tus mejores partidas de ${topChampion.championName} como material de review cuando quieras fijar hábitos.`,
                'Compará tus partidas sólidas contra tus derrotas del mismo pick antes de abrir más variables.'
            ]
        }];
}
export function CoachingHome({ dataset }) {
    const { summary } = dataset;
    const topProblems = summary.coaching.topProblems;
    const activePlan = summary.coaching.activePlan;
    const trend = summary.coaching.trend;
    const championAnchor = summary.championPool[0];
    const reviewQueue = buildReviewQueue(dataset);
    const positiveLanes = buildPositiveLanes(dataset);
    const patternCard = buildPatternCard(dataset);
    const matchupAlert = summary.insights.find((insight) => insight.focusMetric === 'matchup_review');
    return (_jsxs("div", { style: { display: 'grid', gap: 18 }, children: [_jsxs("section", { className: "two-col-grid", style: { display: 'grid', gridTemplateColumns: '1.15fr .85fr', gap: 16 }, children: [_jsx(Card, { title: summary.coaching.headline, subtitle: summary.coaching.subheadline, children: _jsxs("div", { className: "four-col-grid", style: { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12 }, children: [_jsx(KPI, { label: "Win rate", value: `${summary.winRate}%`, hint: `${summary.wins}-${summary.losses} en ${summary.matches} partidas`, info: "Porcentaje de victorias dentro de la muestra filtrada que est\u00E1s viendo. Si cambi\u00E1s de rol, cola o ventana, esta cifra se recalcula." }), _jsx(KPI, { label: "Performance", value: formatDecimal(summary.avgPerformanceScore), hint: `Consistencia ${formatDecimal(summary.consistencyIndex)}`, info: "\u00CDndice interno que resume econom\u00EDa, peleas, macro y estabilidad. No es una m\u00E9trica oficial de Riot: sirve para comparar la calidad general de tu ejecuci\u00F3n entre partidas." }), _jsx(KPI, { label: "CS a los 15", value: formatDecimal(summary.avgCsAt15), hint: "Base actual de econom\u00EDa", info: "Elegimos el minuto 15 porque captura mejor tus resets, primeras rotaciones y el estado real de tu econom\u00EDa antes del mid game." }), _jsx(KPI, { label: "Pick ancla", value: championAnchor?.championName ?? 'N/A', hint: championAnchor ? `${championAnchor.winRate}% WR` : 'Sin muestra suficiente', info: "El campe\u00F3n que m\u00E1s pesa dentro del filtro actual. Si tu muestra se apoya mucho en un pick, la lectura de coaching tiene que respetar eso." })] }) }), _jsx(Card, { title: "Radar del bloque actual", subtitle: "Tres lecturas r\u00E1pidas para saber d\u00F3nde mirar primero", children: _jsxs("div", { style: { display: 'grid', gap: 12 }, children: [_jsx(SpotlightMetric, { label: "Patr\u00F3n estable", info: "Busca la versi\u00F3n de vos mismo que ya est\u00E1 funcionando, para no construir todo el plan desde cero.", value: patternCard.stableWinRate !== null ? `${formatDecimal(patternCard.stableWinRate)}% WR` : 'Sin señal clara', caption: patternCard.stableMatches.length
                                        ? `${patternCard.stableMatches.length} partidas con economía y disciplina mejores que tu media`
                                        : 'Todavía no hay suficientes partidas limpias en el filtro actual' }), _jsx(SpotlightMetric, { label: "Matchup a vigilar", info: "Si un matchup se repite con malos resultados, deja de ser un accidente y pasa a ser material de preparaci\u00F3n.", value: matchupAlert ? 'Sí' : 'Sin alerta', caption: matchupAlert ? matchupAlert.problem : 'No aparece un cruce recurrente lo bastante fuerte dentro de esta muestra' }), _jsx(SpotlightMetric, { label: "Plan de hoy", info: "La prioridad real del bloque actual. Esto es lo que m\u00E1s conviene sostener en tus pr\u00F3ximas partidas.", value: activePlan ? activePlan.objective : 'Seguir acumulando muestra', caption: activePlan ? activePlan.successLabel : 'Filtrá por el rol que quieras trabajar si querés una lectura más fina' })] }) })] }), _jsxs("section", { className: "three-col-grid", style: { display: 'grid', gridTemplateColumns: '1.1fr .9fr 1fr', gap: 16 }, children: [_jsx(Card, { title: "Qu\u00E9 ya te est\u00E1 dando nivel", subtitle: "No todo es corregir: tambi\u00E9n hay que repetir lo que s\u00ED funciona", children: _jsx("div", { style: { display: 'grid', gap: 10 }, children: positiveLanes.map((insight) => (_jsxs("div", { style: signalCardStyle, children: [_jsxs("div", { style: { display: 'grid', gap: 5 }, children: [_jsx("div", { style: { color: '#edf2ff', fontSize: 18, fontWeight: 800 }, children: insight.problem }), _jsx("div", { style: { color: '#9aa5b7', lineHeight: 1.6 }, children: insight.title })] }), _jsx("div", { style: { display: 'grid', gap: 8 }, children: insight.actions.map((action) => (_jsx("div", { style: signalActionStyle, children: action }, action))) })] }, insight.id))) }) }), _jsx(Card, { title: "Sesi\u00F3n de review", subtitle: "Tres partidas para mirar antes de volver a queuear", children: _jsx("div", { style: { display: 'grid', gap: 10 }, children: reviewQueue.length ? reviewQueue.map((match) => (_jsxs("div", { style: reviewMatchStyle, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap' }, children: [_jsxs("div", { style: { display: 'grid', gap: 4 }, children: [_jsx("div", { style: { color: '#edf2ff', fontWeight: 800 }, children: match.championName }), _jsx("div", { style: { color: '#8190a4', fontSize: 12 }, children: new Date(match.gameCreation).toLocaleDateString('es-AR') })] }), _jsx(Badge, { tone: match.win ? 'low' : 'high', children: match.win ? 'Win' : 'Loss' })] }), _jsxs("div", { style: { display: 'flex', gap: 8, flexWrap: 'wrap' }, children: [_jsx(Badge, { children: `${formatDecimal(match.timeline.csAt15)} CS@15` }), _jsx(Badge, { children: `${formatDecimal(match.timeline.deathsPre14)} muertes pre14` }), match.opponentChampionName ? _jsx(Badge, { children: `vs ${match.opponentChampionName}` }) : null] }), _jsx("div", { style: { color: '#9aa5b7', lineHeight: 1.6 }, children: buildReviewCue(dataset, match) })] }, match.matchId))) : (_jsx("div", { style: { color: '#c7d4ea' }, children: "No hay una cola de review clara todav\u00EDa. Sum\u00E1 m\u00E1s partidas o abr\u00ED una ventana reciente m\u00E1s grande." })) }) }), _jsx(Card, { title: "Mapa del pick ancla", subtitle: "C\u00F3mo leer el campe\u00F3n que hoy m\u00E1s pesa en tu muestra", children: _jsx("div", { style: { display: 'grid', gap: 12 }, children: championAnchor ? (_jsxs(_Fragment, { children: [_jsx(InfoCard, { title: "Pick principal", info: "El campe\u00F3n que m\u00E1s condiciona la lectura actual de coaching.", children: _jsxs("div", { style: { display: 'grid', gap: 6 }, children: [_jsx("div", { style: { fontSize: 22, fontWeight: 800 }, children: championAnchor.championName }), _jsxs("div", { style: { color: '#9aa5b7' }, children: [championAnchor.games, " partidas \u00B7 ", championAnchor.winRate, "% WR \u00B7 ", formatDecimal(championAnchor.avgCsAt15), " CS@15"] })] }) }), _jsx(InfoCard, { title: "Qu\u00E9 mirar", info: "La idea es separar si tu pick principal ya te ordena bien la partida o si est\u00E1 ocultando un problema.", children: matchupAlert
                                            ? `Tu siguiente mejora con ${championAnchor.championName} probablemente no pasa por jugarlo más, sino por entender mejor el cruce que hoy más te castiga.`
                                            : `Usalo como línea base para revisar recalls, primeras rotaciones y cuándo tu early realmente entra limpio al mid game.` })] })) : (_jsx("div", { style: { color: '#c7d4ea' }, children: "Todav\u00EDa no hay suficiente muestra para leer un pick ancla claro dentro del filtro actual." })) }) })] }), _jsxs("section", { style: { display: 'grid', gap: 14 }, children: [_jsxs("div", { children: [_jsx("h2", { style: { margin: 0, fontSize: 24 }, children: "Prioridades de coaching" }), _jsx("p", { style: { margin: '6px 0 0', color: '#8994a8' }, children: "Lo que m\u00E1s te est\u00E1 costando hoy, con evidencia, impacto y acciones concretas." })] }), _jsx("div", { style: { display: 'grid', gap: 16 }, children: topProblems.map((problem, index) => (_jsxs("div", { style: { ...problemCardStyle, borderColor: borderForPriority(problem.priority) }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'start', flexWrap: 'wrap' }, children: [_jsxs("div", { style: { display: 'grid', gap: 8 }, children: [_jsxs("div", { style: { color: '#7f8999', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em' }, children: ["Bloque ", index + 1] }), _jsx("div", { style: { fontSize: 24, fontWeight: 800, letterSpacing: '-0.03em' }, children: problem.problem }), _jsx("div", { style: { color: '#97a2b3', maxWidth: 780 }, children: problem.title })] }), _jsxs("div", { style: { display: 'flex', gap: 8, flexWrap: 'wrap' }, children: [_jsx(Badge, { tone: problem.priority, children: problem.priority.toUpperCase() }), _jsx(Badge, { children: problem.category.toUpperCase() }), typeof problem.winRateDelta === 'number' ? _jsx(Badge, { tone: problem.winRateDelta >= 0 ? 'low' : 'high', children: `${formatDelta(problem.winRateDelta, ' pts WR')}` }) : null] })] }), _jsxs("div", { className: "three-col-grid", style: { display: 'grid', gridTemplateColumns: '1.15fr 1fr 1fr', gap: 12 }, children: [_jsx(InfoCard, { title: "Impacto", info: "Qu\u00E9 tan fuerte pega este patr\u00F3n en tus resultados y en tu capacidad de convertir partidas.", children: problem.impact }), _jsx(InfoCard, { title: "Causa", info: "La interpretaci\u00F3n del sistema sobre el origen m\u00E1s probable del problema.", children: problem.cause }), _jsx(InfoCard, { title: "Evidencia", info: "Se\u00F1ales concretas detectadas en tu muestra reciente.", children: _jsx("div", { style: { display: 'grid', gap: 8 }, children: problem.evidence.map((item) => (_jsx("div", { children: item }, item))) }) })] }), _jsxs("div", { style: { display: 'grid', gap: 10 }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', color: '#93a0b4', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em' }, children: ["Qu\u00E9 hacer hoy", _jsx(InfoHint, { text: "Acciones concretas para las pr\u00F3ximas partidas. Ac\u00E1 queremos bajar decisiones a h\u00E1bitos pr\u00E1cticos, no consejos gen\u00E9ricos." })] }), _jsx("div", { style: { display: 'grid', gap: 10 }, children: problem.actions.map((action) => (_jsx("div", { style: { ...actionStyle, background: priorityColors[problem.priority] ?? priorityColors.low }, children: action }, action))) })] })] }, problem.id))) })] }), _jsxs("section", { className: "two-col-grid", style: { display: 'grid', gridTemplateColumns: 'minmax(320px, 1fr) minmax(320px, 1fr)', gap: 16 }, children: [_jsx(Card, { title: "Plan activo", subtitle: "Qu\u00E9 h\u00E1bito estamos intentando fijar en la muestra reciente", children: activePlan ? (_jsxs("div", { style: { display: 'grid', gap: 14 }, children: [_jsx(InfoCard, { title: "Objetivo", info: "La conducta o benchmark que queremos sostener en las pr\u00F3ximas partidas.", children: activePlan.objective }), _jsx(InfoCard, { title: "Foco", info: "El problema ra\u00EDz al que responde este ciclo de mejora.", children: activePlan.focus }), _jsxs("div", { style: { display: 'grid', gap: 8 }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', color: '#c7d4ea', fontSize: 13 }, children: [_jsx("span", { children: "Progreso" }), _jsx("span", { children: activePlan.successLabel })] }), _jsx("div", { style: { height: 12, borderRadius: 999, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }, children: _jsx("div", { style: { width: `${activePlan.progressPercent}%`, height: '100%', background: '#67d6a4' } }) })] })] })) : (_jsx("p", { style: { margin: 0, color: '#c7d4ea' }, children: "Todav\u00EDa no hay suficientes se\u00F1ales para fijar un ciclo claro. Sum\u00E1 m\u00E1s partidas o filtr\u00E1 por el rol que quer\u00E9s trabajar." })) }), _jsx(Card, { title: "Evoluci\u00F3n reciente", subtitle: "C\u00F3mo cambi\u00F3 tu nivel entre la base y el tramo m\u00E1s nuevo", children: _jsxs("div", { style: { display: 'grid', gap: 12 }, children: [_jsxs("div", { className: "two-col-grid", style: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }, children: [_jsx(KPI, { label: "Performance", value: `${trend.baselineScore} -> ${trend.recentScore}`, hint: formatDelta(trend.scoreDelta), info: "Compara tu score medio entre el bloque inicial y el tramo m\u00E1s reciente de la muestra. Sirve para ver si tu ejecuci\u00F3n general est\u00E1 subiendo o cayendo." }), _jsx(KPI, { label: "Win rate", value: `${trend.baselineWinRate}% -> ${trend.recentWinRate}%`, hint: formatDelta(trend.winRateDelta, ' pts'), info: "Compara el bloque m\u00E1s viejo de la muestra contra tus partidas m\u00E1s recientes para detectar si tu nivel sube, cae o se estabiliza." })] }), _jsx(InfoCard, { title: "Lectura", info: "Interpretaci\u00F3n resumida de la tendencia reciente.", children: trend.scoreDelta >= 0
                                        ? 'Tu rendimiento reciente viene mejorando. La prioridad ahora es sostener la calidad sin volver a los errores del early.'
                                        : 'Tu tramo reciente cayó. Antes de sumar complejidad, conviene estabilizar el problema principal.' })] }) })] })] }));
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
