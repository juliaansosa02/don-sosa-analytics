import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Card, Badge, InfoHint } from '../../components/ui';
import { formatChampionName, getChampionIconUrl } from '../../lib/lol';
import { formatDecimal, formatSignedNumber } from '../../lib/format';
export function MatchesTab({ dataset, locale = 'es' }) {
    return (_jsx("div", { style: { display: 'grid', gap: 14 }, children: dataset.matches.map((match) => {
            const iconUrl = getChampionIconUrl(match.championName, dataset.ddragonVersion);
            return (_jsx(Card, { title: formatChampionName(match.championName), subtitle: `${new Date(match.gameCreation).toLocaleDateString(locale === 'en' ? 'en-US' : 'es-AR')} · ${match.opponentChampionName ? `vs ${formatChampionName(match.opponentChampionName)}` : (locale === 'en' ? 'Opponent not detected' : 'Rival no detectado')}`, children: _jsxs("div", { className: "two-col-grid", style: { display: 'grid', gridTemplateColumns: '1.15fr .95fr', gap: 16 }, children: [_jsxs("div", { style: { display: 'grid', gap: 14 }, children: [_jsxs("div", { style: { display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }, children: [iconUrl ? _jsx("img", { src: iconUrl, alt: formatChampionName(match.championName), width: 58, height: 58, style: iconStyle }) : null, _jsx(Badge, { tone: match.win ? 'low' : 'high', children: match.win ? (locale === 'en' ? 'WIN' : 'VICTORIA') : (locale === 'en' ? 'LOSS' : 'DERROTA') }), _jsx(Badge, { children: `${match.kills}/${match.deaths}/${match.assists}` }), _jsx(Badge, { children: `${formatDecimal(match.killParticipation)}% KP` })] }), _jsxs("div", { className: "six-col-grid", style: metricGridStyle, children: [_jsx(MetricBlock, { label: "Performance", value: formatDecimal(match.score.total), info: locale === 'en' ? 'Internal execution score for this match.' : 'Índice interno de ejecución para esta partida.' }), _jsx(MetricBlock, { label: locale === 'en' ? 'CS at 15' : 'CS a los 15', value: formatDecimal(match.timeline.csAt15), info: locale === 'en' ? 'Economy accumulated at minute 15 in this match.' : 'Economía acumulada a los 15 minutos en esta partida.' }), _jsx(MetricBlock, { label: locale === 'en' ? 'Gold at 15' : 'Oro a los 15', value: Math.round(match.timeline.goldAt15).toLocaleString(locale === 'en' ? 'en-US' : 'es-AR'), info: locale === 'en' ? 'Total gold accumulated at minute 15.' : 'Oro total acumulado a los 15 minutos.' }), _jsx(MetricBlock, { label: locale === 'en' ? 'Deaths pre 14' : 'Muertes pre 14', value: formatDecimal(match.timeline.deathsPre14), info: locale === 'en' ? 'Deaths suffered before minute 14.' : 'Cantidad de muertes sufridas antes del minuto 14.' }), _jsx(MetricBlock, { label: locale === 'en' ? 'Gold diff' : 'Dif. de oro', value: formatSignedNumber(match.timeline.goldDiffAt15, 0), info: locale === 'en' ? 'Gold advantage or disadvantage at minute 15 against the detected direct opponent.' : 'Ventaja o desventaja de oro a los 15 frente al rival directo detectado.' }), _jsx(MetricBlock, { label: locale === 'en' ? 'Level diff' : 'Dif. de nivel', value: formatSignedNumber(match.timeline.levelDiffAt15, 0), info: locale === 'en' ? 'Level advantage or disadvantage at minute 15 against the detected direct opponent.' : 'Ventaja o desventaja de nivel a los 15 frente al rival directo detectado.' })] })] }), _jsxs("div", { style: reviewPanelStyle, children: [_jsx("div", { style: reviewLabelStyle, children: locale === 'en' ? 'Quick read' : 'Lectura rápida' }), _jsx("div", { style: { color: '#e7eef8', lineHeight: 1.7 }, children: match.timeline.deathsPre14 >= 3
                                        ? (locale === 'en' ? 'This game was heavily punished in the early and early-mid transition. It is worth reviewing if you want to lower your error floor.' : 'Partida muy castigada por early y mid temprano. Vale la pena revisarla si querés bajar el piso de error.')
                                        : match.score.total >= 80
                                            ? (locale === 'en' ? 'Strong game to use as a pattern reference: good execution and solid conversion margin.' : 'Partida fuerte para usar como referencia de patrón: buena ejecución y margen de conversión.')
                                            : (locale === 'en' ? 'Middle-ground game. Useful for reviewing where control was lost or gained before minute 15.' : 'Partida intermedia. Útil para mirar dónde se perdió o ganó el control antes del minuto 15.') })] })] }) }, match.matchId));
        }) }));
}
function MetricBlock({ label, value, info }) {
    return (_jsxs("div", { style: metricBlockStyle, children: [_jsxs("div", { style: { ...metricLabelStyle, display: 'flex', alignItems: 'center' }, children: [label, _jsx(InfoHint, { text: info })] }), _jsx("div", { style: metricValueStyle, children: value })] }));
}
const metricGridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(6, minmax(0, 1fr))',
    gap: 12
};
const metricBlockStyle = {
    padding: '12px 10px',
    borderRadius: 12,
    background: '#090e16',
    border: '1px solid rgba(255,255,255,0.04)'
};
const metricLabelStyle = {
    color: '#758091',
    fontSize: 12,
    marginBottom: 8
};
const metricValueStyle = {
    color: '#f4f7fb',
    fontSize: 20,
    fontWeight: 700
};
const reviewPanelStyle = {
    padding: 16,
    borderRadius: 14,
    background: 'linear-gradient(180deg, rgba(44,31,76,0.7), rgba(11,14,23,0.95))',
    border: '1px solid rgba(255,255,255,0.05)'
};
const reviewLabelStyle = {
    color: '#9a8cff',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginBottom: 10
};
const iconStyle = {
    borderRadius: 14,
    border: '1px solid rgba(255,255,255,0.08)'
};
