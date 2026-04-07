import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from 'recharts';
import { Badge, Card, ChampionIdentity, KPI } from '../../components/ui';
import { formatChampionName } from '../../lib/lol';
import { buildMatchQuickRead, findAnchorChampion, findReferenceMatch, findReviewPriorityMatch, formatMatchDuration, getChampionAccent } from '../dashboard/dashboardSignals';
export function OverviewTab({ dataset, locale = 'es' }) {
    const trend = dataset.matches.slice().reverse().map((match, index) => ({
        game: index + 1,
        score: Math.round(match.score.total),
        result: match.win ? 1 : 0
    }));
    const scatter = dataset.matches.map((match) => ({
        x: match.timeline.csAt15,
        y: match.timeline.goldAt15,
        z: Math.round(match.score.total),
        champion: match.championName,
        result: match.win ? 'Win' : 'Loss'
    }));
    const anchorChampion = findAnchorChampion(dataset.matches);
    const accent = getChampionAccent(anchorChampion);
    const primaryInsight = dataset.summary.coaching.primaryInsight;
    const topPositive = dataset.summary.positiveSignals[0] ?? null;
    const referenceMatch = findReferenceMatch(dataset.matches);
    const reviewPriorityMatch = findReviewPriorityMatch(dataset.matches);
    const stableGames = dataset.matches.filter((match) => match.timeline.deathsPre14 <= 1 && (match.timeline.laneVolatilityScore ?? 0) <= 1.05).length;
    const volatileGames = dataset.matches.filter((match) => match.timeline.deathsPre14 >= 2 || (match.timeline.laneVolatilityScore ?? 0) >= 1.4).length;
    const conversionGames = dataset.matches.filter((match) => match.win && (match.timeline.goldDiffAt15 ?? 0) >= 150).length;
    return (_jsxs("div", { style: { display: 'grid', gap: 18 }, children: [_jsxs("section", { style: {
                    display: 'grid',
                    gap: 16,
                    padding: 22,
                    borderRadius: 24,
                    background: accent.panel,
                    border: `1px solid ${accent.border}`,
                    boxShadow: `0 22px 54px rgba(0,0,0,0.24), 0 0 34px ${accent.glow}`
                }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', alignItems: 'start' }, children: [_jsxs("div", { style: { display: 'grid', gap: 10, maxWidth: 760 }, children: [_jsx("div", { style: { color: accent.muted, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.09em', fontWeight: 800 }, children: locale === 'en' ? 'Player overview' : 'Overview del jugador' }), _jsx("div", { style: { color: accent.text, fontSize: 32, lineHeight: 1.04, fontWeight: 900, letterSpacing: '-0.04em' }, children: primaryInsight?.headline ?? (locale === 'en' ? 'Your current block already has a visible shape' : 'Tu bloque actual ya tiene una forma visible') }), _jsx("div", { style: { color: '#dce7f7', lineHeight: 1.7, fontSize: 15 }, children: primaryInsight?.summary ?? (locale === 'en'
                                            ? 'This overview turns your current sample into a live read: what is stable, what is expensive and which match deserves review first.'
                                            : 'Este overview convierte tu muestra actual en una lectura viva: qué está estable, qué está costando caro y qué partida merece review primero.') })] }), anchorChampion ? (_jsx(ChampionIdentity, { championName: anchorChampion, version: dataset.ddragonVersion, subtitle: locale === 'en' ? 'Anchor pick in the visible slice' : 'Pick ancla del recorte visible', meta: _jsxs(_Fragment, { children: [_jsx(Badge, { tone: "default", children: locale === 'en' ? `${dataset.summary.matches} visible matches` : `${dataset.summary.matches} partidas visibles` }), _jsx(Badge, { tone: "low", children: dataset.summary.primaryRole })] }), size: 62 })) : null] }), _jsxs("div", { style: { display: 'flex', gap: 8, flexWrap: 'wrap' }, children: [_jsx(Badge, { tone: "default", children: locale === 'en' ? `${dataset.summary.winRate}% WR` : `${dataset.summary.winRate}% WR` }), _jsx(Badge, { tone: "default", children: locale === 'en' ? `Performance ${dataset.summary.avgPerformanceScore}` : `Performance ${dataset.summary.avgPerformanceScore}` }), _jsx(Badge, { tone: "low", children: locale === 'en' ? `${stableGames} stable games` : `${stableGames} partidas estables` }), _jsx(Badge, { tone: "medium", children: locale === 'en' ? `${volatileGames} volatile games` : `${volatileGames} partidas volátiles` }), _jsx(Badge, { tone: "low", children: locale === 'en' ? `${conversionGames} clean conversions` : `${conversionGames} conversiones limpias` })] })] }), _jsxs("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 }, children: [_jsx(KPI, { label: "Win Rate", value: `${dataset.summary.winRate}%`, hint: `${dataset.summary.wins}-${dataset.summary.losses}` }), _jsx(KPI, { label: "Performance", value: `${dataset.summary.avgPerformanceScore}`, hint: locale === 'en' ? 'Sample average' : 'Promedio de muestra' }), _jsx(KPI, { label: locale === 'en' ? 'Consistency' : 'Consistencia', value: `${dataset.summary.consistencyIndex}`, hint: locale === 'en' ? 'How even your level stays' : 'Qué tan parejo se sostiene tu nivel' }), _jsx(KPI, { label: locale === 'en' ? 'CS at 15' : 'CS a los 15', value: `${dataset.summary.avgCsAt15}`, hint: locale === 'en' ? 'Early income floor' : 'Piso de economía temprana' }), _jsx(KPI, { label: "Gold@15", value: `${dataset.summary.avgGoldAt15}`, hint: locale === 'en' ? 'Early state' : 'Estado temprano' }), _jsx(KPI, { label: "KP", value: `${dataset.summary.avgKillParticipation}%`, hint: locale === 'en' ? 'Useful map connection' : 'Conexión útil al mapa' })] }), _jsxs("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }, children: [_jsx(Card, { title: locale === 'en' ? 'Main leak now' : 'Fuga principal ahora', subtitle: locale === 'en' ? 'The system read that deserves the highest review priority.' : 'La lectura del sistema que hoy merece la mayor prioridad de review.', children: _jsx(PulseBlock, { title: primaryInsight?.headline ?? (locale === 'en' ? 'No sharp primary leak yet' : 'Todavía no hay una fuga principal cerrada'), body: primaryInsight?.whyItMatters ?? (locale === 'en' ? 'The sample still needs more separation between stable signal and recent noise.' : 'La muestra todavía necesita más separación entre señal estable y ruido reciente.'), tone: "high" }) }), _jsx(Card, { title: locale === 'en' ? 'What is holding the block up' : 'Qué está sosteniendo el bloque', subtitle: locale === 'en' ? 'Useful because it shows what is already repeatable.' : 'Sirve porque muestra qué ya es repetible.', children: _jsx(PulseBlock, { title: topPositive?.problem ?? (locale === 'en' ? 'There is already a playable base' : 'Ya existe una base jugable'), body: topPositive?.impact ?? (locale === 'en' ? 'The point is not to start from zero, but to copy your better version more often.' : 'La idea no es empezar de cero, sino copiar más seguido tu versión mejor.'), tone: "low" }) }), _jsx(Card, { title: locale === 'en' ? 'Review next' : 'Qué abrir después', subtitle: locale === 'en' ? 'This comes directly from the current review agenda.' : 'Esto sale directo de la agenda actual de review.', children: _jsx("div", { style: { display: 'grid', gap: 10 }, children: (dataset.summary.reviewAgenda.slice(0, 3)).map((item) => (_jsxs("div", { style: agendaRowStyle, children: [_jsx("div", { style: { color: '#eef4ff', fontWeight: 700 }, children: item.title }), _jsx("div", { style: { color: '#8fa1b8', fontSize: 13, lineHeight: 1.55 }, children: item.question })] }, item.matchId))) }) })] }), _jsxs("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 18 }, children: [_jsx(Card, { title: locale === 'en' ? 'Performance trend' : 'Tendencia de performance', subtitle: locale === 'en' ? 'Shows whether the block is settling or oscillating.' : 'Muestra si el bloque se está asentando o si sigue oscilando.', children: _jsx("div", { style: { width: '100%', height: 280 }, children: _jsx(ResponsiveContainer, { children: _jsxs(LineChart, { data: trend, children: [_jsx(CartesianGrid, { stroke: "rgba(255,255,255,0.08)" }), _jsx(XAxis, { dataKey: "game", stroke: "#8fa8cc" }), _jsx(YAxis, { stroke: "#8fa8cc" }), _jsx(Tooltip, {}), _jsx(Line, { type: "monotone", dataKey: "score", stroke: "#7ed4ff", strokeWidth: 3, dot: { r: 3, fill: '#d8f7ff' } })] }) }) }) }), _jsx(Card, { title: locale === 'en' ? 'Early economy map' : 'Mapa de economía temprana', subtitle: locale === 'en' ? 'Useful to see which games stayed playable by minute 15.' : 'Sirve para ver qué partidas seguían jugables al minuto 15.', children: _jsx("div", { style: { width: '100%', height: 280 }, children: _jsx(ResponsiveContainer, { children: _jsxs(ScatterChart, { children: [_jsx(CartesianGrid, { stroke: "rgba(255,255,255,0.08)" }), _jsx(XAxis, { type: "number", dataKey: "x", name: "CS@15", stroke: "#8fa8cc" }), _jsx(YAxis, { type: "number", dataKey: "y", name: "Gold@15", stroke: "#8fa8cc" }), _jsx(Tooltip, { cursor: { strokeDasharray: '3 3' } }), _jsx(Scatter, { data: scatter, fill: "#76e3b5" })] }) }) }) })] }), _jsxs("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 16 }, children: [referenceMatch ? (_jsx(Card, { title: locale === 'en' ? 'Reference match' : 'Partida referencia', subtitle: locale === 'en' ? 'The cleanest mirror game in the visible sample.' : 'La partida espejo más limpia del recorte visible.', children: _jsx(SpotlightMatch, { match: referenceMatch, dataset: dataset, locale: locale }) })) : null, reviewPriorityMatch ? (_jsx(Card, { title: locale === 'en' ? 'Highest review priority' : 'Mayor prioridad de review', subtitle: locale === 'en' ? 'The loss that most clearly explains where the block is leaking.' : 'La derrota que más claramente explica por dónde está perdiendo valor el bloque.', children: _jsx(SpotlightMatch, { match: reviewPriorityMatch, dataset: dataset, locale: locale }) })) : null] })] }));
}
function PulseBlock({ title, body, tone }) {
    return (_jsxs("div", { style: {
            display: 'grid',
            gap: 10,
            padding: 16,
            borderRadius: 18,
            background: '#080d15',
            border: `1px solid ${tone === 'high' ? 'rgba(255,107,107,0.14)' : 'rgba(126,245,199,0.14)'}`
        }, children: [_jsx("div", { style: { color: '#eef4ff', fontSize: 19, lineHeight: 1.18, fontWeight: 850 }, children: title }), _jsx("div", { style: { color: '#92a0b4', lineHeight: 1.7 }, children: body })] }));
}
function SpotlightMatch({ match, dataset, locale }) {
    const quickRead = buildMatchQuickRead(match, dataset, locale);
    const matchupLabel = match.opponentChampionName
        ? `vs ${formatChampionName(match.opponentChampionName)}`
        : (locale === 'en' ? 'Opponent unknown' : 'Rival sin detectar');
    return (_jsxs("div", { style: { display: 'grid', gap: 14 }, children: [_jsx(ChampionIdentity, { championName: match.championName, version: dataset.ddragonVersion, subtitle: `${new Date(match.gameCreation).toLocaleDateString(locale === 'en' ? 'en-US' : 'es-AR')} · ${formatMatchDuration(match.gameDurationSeconds, locale)} · ${matchupLabel}`, meta: _jsxs(_Fragment, { children: [_jsx(Badge, { tone: match.win ? 'low' : 'high', children: match.win ? (locale === 'en' ? 'Win' : 'Victoria') : (locale === 'en' ? 'Loss' : 'Derrota') }), _jsx(Badge, { tone: quickRead.tone === 'reference' ? 'low' : quickRead.tone === 'warning' ? 'high' : 'default', children: quickRead.toneLabel })] }) }), _jsx("div", { style: { color: '#eef4ff', fontSize: 20, fontWeight: 850, lineHeight: 1.15 }, children: quickRead.title }), _jsx("div", { style: { color: '#93a2b7', lineHeight: 1.7 }, children: quickRead.body }), _jsxs("div", { style: spotlightMetaStripStyle, children: [_jsx(SpotlightPill, { label: "KDA", value: `${match.kills}/${match.deaths}/${match.assists}` }), _jsx(SpotlightPill, { label: locale === 'en' ? 'Matchup' : 'Matchup', value: matchupLabel, wide: true }), _jsx(SpotlightPill, { label: "Score", value: `${Math.round(match.score.total)}` })] }), _jsxs("div", { style: { display: 'flex', gap: 8, flexWrap: 'wrap' }, children: [_jsx(Badge, { children: `${match.kills}/${match.deaths}/${match.assists}` }), _jsx(Badge, { children: `${match.timeline.csAt15} CS15` }), _jsx(Badge, { children: `${match.timeline.goldDiffAt15 >= 0 ? '+' : ''}${Math.round(match.timeline.goldDiffAt15 ?? 0)} g15` }), _jsx(Badge, { children: `Score ${Math.round(match.score.total)}` })] })] }));
}
const agendaRowStyle = {
    display: 'grid',
    gap: 5,
    padding: '12px 13px',
    borderRadius: 14,
    background: '#080d15',
    border: '1px solid rgba(255,255,255,0.05)'
};
function SpotlightPill({ label, value, wide = false }) {
    return (_jsxs("div", { style: { ...spotlightPillStyle, ...(wide ? { minWidth: 160 } : {}) }, children: [_jsx("div", { style: spotlightPillLabelStyle, children: label }), _jsx("div", { style: spotlightPillValueStyle, children: value })] }));
}
const spotlightMetaStripStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
    gap: 10
};
const spotlightPillStyle = {
    display: 'grid',
    gap: 4,
    padding: '11px 12px',
    borderRadius: 16,
    background: 'linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.018))',
    border: '1px solid rgba(255,255,255,0.06)'
};
const spotlightPillLabelStyle = {
    color: '#7f91a9',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: '0.08em'
};
const spotlightPillValueStyle = {
    color: '#eef4ff',
    fontSize: 14,
    fontWeight: 800,
    lineHeight: 1.35
};
