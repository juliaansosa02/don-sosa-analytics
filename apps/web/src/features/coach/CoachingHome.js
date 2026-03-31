import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
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
export function CoachingHome({ dataset }) {
    const { summary } = dataset;
    const topProblems = summary.coaching.topProblems;
    const activePlan = summary.coaching.activePlan;
    const trend = summary.coaching.trend;
    const championAnchor = summary.championPool[0];
    return (_jsxs("div", { style: { display: 'grid', gap: 18 }, children: [_jsxs("section", { className: "two-col-grid", style: { display: 'grid', gridTemplateColumns: '1.15fr .85fr', gap: 16 }, children: [_jsx(Card, { title: summary.coaching.headline, subtitle: summary.coaching.subheadline, children: _jsxs("div", { className: "four-col-grid", style: { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12 }, children: [_jsx(KPI, { label: "Win rate", value: `${summary.winRate}%`, hint: `${summary.wins}-${summary.losses} en ${summary.matches} partidas`, info: "Porcentaje de victorias dentro de la muestra filtrada que est\u00E1s viendo. Si cambi\u00E1s de rol, esta cifra se recalcula." }), _jsx(KPI, { label: "Performance", value: formatDecimal(summary.avgPerformanceScore), hint: `Índice de consistencia ${formatDecimal(summary.consistencyIndex)}`, info: "\u00CDndice interno que resume econom\u00EDa, peleas, macro y estabilidad. No es una m\u00E9trica oficial de Riot: sirve para comparar la calidad general de tu ejecuci\u00F3n entre partidas." }), _jsx(KPI, { label: "CS a los 15", value: formatDecimal(summary.avgCsAt15), hint: "Tu m\u00E9trica principal de farmeo", info: "Elegimos el minuto 15 porque captura mejor tu econom\u00EDa real despu\u00E9s de las primeras decisiones, resets y rotaciones." }), _jsx(KPI, { label: "Pick ancla", value: championAnchor?.championName ?? 'N/A', hint: championAnchor ? `${championAnchor.winRate}% WR` : 'Sin muestra suficiente', info: "El campe\u00F3n m\u00E1s jugado dentro del filtro actual. Sirve como referencia para detectar si tu muestra tiene un patr\u00F3n claro por pick." })] }) }), _jsx(Card, { title: "Lectura r\u00E1pida", subtitle: "La capa premium del coaching est\u00E1 en separar lo urgente de lo accesorio", children: _jsxs("div", { style: { display: 'grid', gap: 12 }, children: [_jsx(MetricHeadline, { label: "Performance", info: "Resume tu score total de partida. Combina lane, econom\u00EDa, fighting, macro y consistencia en una lectura \u00FAnica.", value: formatDecimal(summary.avgPerformanceScore) }), _jsx(MetricHeadline, { label: "CS a los 15", info: "Preferimos el minuto 15 porque captura mejor tu patr\u00F3n de farmeo y tus decisiones tras la fase inicial.", value: formatDecimal(summary.avgCsAt15) }), _jsx(MetricHeadline, { label: "Oro a los 15", info: "Es una se\u00F1al r\u00E1pida de cu\u00E1nto valor real est\u00E1s generando antes de entrar al mid game.", value: Math.round(summary.avgGoldAt15).toLocaleString('es-AR') })] }) })] }), _jsxs("section", { style: { display: 'grid', gap: 14 }, children: [_jsxs("div", { children: [_jsx("h2", { style: { margin: 0, fontSize: 24 }, children: "Prioridades de Coaching" }), _jsx("p", { style: { margin: '6px 0 0', color: '#8994a8' }, children: "Lo que m\u00E1s te est\u00E1 costando hoy, con evidencia, impacto y acciones concretas." })] }), _jsx("div", { style: { display: 'grid', gap: 16 }, children: topProblems.map((problem, index) => (_jsxs("div", { style: { ...problemCardStyle, borderColor: borderForPriority(problem.priority) }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'start', flexWrap: 'wrap' }, children: [_jsxs("div", { style: { display: 'grid', gap: 8 }, children: [_jsxs("div", { style: { color: '#7f8999', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em' }, children: ["Prioridad ", index + 1] }), _jsx("div", { style: { fontSize: 24, fontWeight: 800, letterSpacing: '-0.03em' }, children: problem.problem }), _jsx("div", { style: { color: '#97a2b3', maxWidth: 780 }, children: problem.title })] }), _jsxs("div", { style: { display: 'flex', gap: 8, flexWrap: 'wrap' }, children: [_jsx(Badge, { tone: problem.priority, children: problem.priority.toUpperCase() }), _jsx(Badge, { children: problem.category.toUpperCase() }), typeof problem.winRateDelta === 'number' ? _jsx(Badge, { tone: problem.winRateDelta >= 0 ? 'low' : 'high', children: `${formatDelta(problem.winRateDelta, ' pts WR')}` }) : null] })] }), _jsxs("div", { className: "three-col-grid", style: { display: 'grid', gridTemplateColumns: '1.15fr 1fr 1fr', gap: 12 }, children: [_jsx(InfoCard, { title: "Impacto", info: "Qu\u00E9 tan fuerte pega este patr\u00F3n en tus resultados y en tu capacidad de convertir partidas.", children: problem.impact }), _jsx(InfoCard, { title: "Causa", info: "La interpretaci\u00F3n del sistema sobre el origen m\u00E1s probable del problema.", children: problem.cause }), _jsx(InfoCard, { title: "Evidencia", info: "Se\u00F1ales concretas detectadas en tu muestra reciente.", children: _jsx("div", { style: { display: 'grid', gap: 8 }, children: problem.evidence.map((item) => (_jsx("div", { children: item }, item))) }) })] }), _jsxs("div", { style: { display: 'grid', gap: 10 }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', color: '#93a0b4', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em' }, children: ["Qu\u00E9 hacer hoy", _jsx(InfoHint, { text: "Acciones concretas para las pr\u00F3ximas partidas. Ac\u00E1 queremos bajar decisiones a h\u00E1bitos pr\u00E1cticos, no consejos gen\u00E9ricos." })] }), _jsx("div", { style: { display: 'grid', gap: 10 }, children: problem.actions.map((action) => (_jsx("div", { style: { ...actionStyle, background: priorityColors[problem.priority] ?? priorityColors.low }, children: action }, action))) })] })] }, problem.id))) })] }), _jsxs("section", { className: "two-col-grid", style: { display: 'grid', gridTemplateColumns: 'minmax(320px, 1fr) minmax(320px, 1fr)', gap: 16 }, children: [_jsx(Card, { title: "Plan activo", subtitle: "Qu\u00E9 h\u00E1bito estamos intentando fijar en la muestra reciente", children: activePlan ? (_jsxs("div", { style: { display: 'grid', gap: 14 }, children: [_jsx(InfoCard, { title: "Objetivo", info: "La conducta o benchmark que queremos sostener en las pr\u00F3ximas partidas.", children: activePlan.objective }), _jsx(InfoCard, { title: "Foco", info: "El problema ra\u00EDz al que responde este ciclo de mejora.", children: activePlan.focus }), _jsxs("div", { style: { display: 'grid', gap: 8 }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', color: '#c7d4ea', fontSize: 13 }, children: [_jsx("span", { children: "Progreso" }), _jsx("span", { children: activePlan.successLabel })] }), _jsx("div", { style: { height: 12, borderRadius: 999, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }, children: _jsx("div", { style: { width: `${activePlan.progressPercent}%`, height: '100%', background: '#67d6a4' } }) })] })] })) : (_jsx("p", { style: { margin: 0, color: '#c7d4ea' }, children: "Todav\u00EDa no hay suficientes se\u00F1ales para fijar un ciclo claro. Sum\u00E1 m\u00E1s partidas o filtr\u00E1 por el rol que quer\u00E9s trabajar." })) }), _jsx(Card, { title: "Evoluci\u00F3n reciente", subtitle: "C\u00F3mo cambi\u00F3 tu nivel entre la base y el tramo m\u00E1s nuevo", children: _jsxs("div", { style: { display: 'grid', gap: 12 }, children: [_jsxs("div", { className: "two-col-grid", style: { display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }, children: [_jsx(KPI, { label: "Performance", value: `${trend.baselineScore} -> ${trend.recentScore}`, hint: formatDelta(trend.scoreDelta), info: "Compara tu score medio entre el bloque inicial y el tramo m\u00E1s reciente de la muestra. Sirve para ver si tu ejecuci\u00F3n general est\u00E1 subiendo o cayendo." }), _jsx(KPI, { label: "Win rate", value: `${trend.baselineWinRate}% -> ${trend.recentWinRate}%`, hint: formatDelta(trend.winRateDelta, ' pts'), info: "Compara el bloque m\u00E1s viejo de la muestra contra tus partidas m\u00E1s recientes para detectar si tu nivel sube, cae o se estabiliza." })] }), _jsx(InfoCard, { title: "Lectura", info: "Interpretaci\u00F3n resumida de la tendencia reciente.", children: trend.scoreDelta >= 0
                                        ? 'Tu rendimiento reciente viene mejorando. La prioridad ahora es sostener la calidad sin volver a los errores del early.'
                                        : 'Tu tramo reciente cayó. Antes de sumar complejidad, conviene estabilizar el problema principal.' })] }) })] })] }));
}
function MetricHeadline({ label, value, info }) {
    return (_jsxs("div", { style: headlineMetricStyle, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', color: '#8b96aa', fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.08em' }, children: [label, _jsx(InfoHint, { text: info })] }), _jsx("div", { style: { fontSize: 28, fontWeight: 800 }, children: value })] }));
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
