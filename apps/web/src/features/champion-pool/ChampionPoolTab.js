import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Card, Badge, InfoHint } from '../../components/ui';
import { useMemo, useState } from 'react';
import { getChampionIconUrl } from '../../lib/lol';
import { formatDecimal, formatInteger, formatPercent } from '../../lib/format';
const classificationLabel = {
    CORE_PICK: 'PICK PRINCIPAL',
    COMFORT_TRAP: 'COMFORT TRAP',
    POCKET_PICK: 'POCKET PICK',
    UNSTABLE: 'INESTABLE'
};
export function ChampionPoolTab({ dataset }) {
    const [sortKey, setSortKey] = useState('games');
    const sortedPool = useMemo(() => {
        const items = [...dataset.summary.championPool];
        return items.sort((a, b) => {
            const direction = sortKey === 'avgDeathsPre14' ? 1 : -1;
            return (a[sortKey] - b[sortKey]) * direction;
        });
    }, [dataset.summary.championPool, sortKey]);
    return (_jsx("div", { style: { display: 'grid', gap: 16 }, children: _jsxs(Card, { title: "Champion pool", subtitle: "Qu\u00E9 campeones te dan una base confiable y cu\u00E1les necesitan m\u00E1s criterio de uso", children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }, children: [_jsx("div", { style: { color: '#8894a7', fontSize: 13 }, children: "Orden\u00E1 para leer tu pool seg\u00FAn rendimiento, volumen o econom\u00EDa temprana." }), _jsxs("select", { value: sortKey, onChange: (event) => setSortKey(event.target.value), style: sortSelectStyle, children: [_jsx("option", { value: "games", children: "M\u00E1s partidas" }), _jsx("option", { value: "winRate", children: "Mayor win rate" }), _jsx("option", { value: "avgScore", children: "Mayor performance" }), _jsx("option", { value: "avgCsAt15", children: "Mayor CS a los 15" }), _jsx("option", { value: "avgGoldAt15", children: "Mayor oro a los 15" }), _jsx("option", { value: "avgDeathsPre14", children: "Menos muertes pre 14" })] })] }), _jsxs("div", { style: headerRowStyle, children: [_jsx(HeaderLabel, { label: "Campe\u00F3n", info: "Campeones ordenados por volumen dentro de la muestra actual." }), _jsx(HeaderLabel, { label: "Partidas", info: "Cantidad de partidas jugadas con ese campe\u00F3n en la muestra filtrada." }), _jsx(HeaderLabel, { label: "Win rate", info: "Porcentaje de victorias con ese campe\u00F3n." }), _jsx(HeaderLabel, { label: "Performance", info: "Promedio del \u00EDndice interno de ejecuci\u00F3n con ese campe\u00F3n." }), _jsx(HeaderLabel, { label: "CS a los 15 min", info: "Econom\u00EDa media temprana con ese campe\u00F3n." }), _jsx(HeaderLabel, { label: "Oro a los 15 min", info: "Valor econ\u00F3mico medio conseguido antes del mid game." }), _jsx(HeaderLabel, { label: "Muertes pre 14", info: "Cantidad media de muertes tempranas con ese campe\u00F3n." })] }), _jsx("div", { style: { display: 'grid', gap: 12 }, children: sortedPool.map((champion) => {
                        const iconUrl = getChampionIconUrl(champion.championName, dataset.ddragonVersion);
                        return (_jsxs("div", { style: cardStyle, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 14 }, children: [iconUrl ? _jsx("img", { src: iconUrl, alt: champion.championName, width: 52, height: 52, style: iconStyle }) : null, _jsxs("div", { style: { display: 'grid', gap: 6 }, children: [_jsx("div", { style: { fontSize: 18, fontWeight: 700 }, children: champion.championName }), _jsx("div", { style: { display: 'flex', gap: 8, flexWrap: 'wrap' }, children: _jsx(Badge, { tone: badgeTone(champion.classification), children: classificationLabel[champion.classification] ?? champion.classification }) })] })] }), _jsxs("div", { className: "six-col-grid", style: metricGridStyle, children: [_jsx(MetricBlock, { label: "Partidas", value: formatInteger(champion.games), info: "Volumen de uso del campe\u00F3n en esta muestra." }), _jsx(MetricBlock, { label: "Win rate", value: formatPercent(champion.winRate), info: "Resultado competitivo del campe\u00F3n dentro de tu muestra actual." }), _jsx(MetricBlock, { label: "Performance", value: formatDecimal(champion.avgScore), info: "C\u00F3mo se ve tu ejecuci\u00F3n general cuando jug\u00E1s este campe\u00F3n." }), _jsx(MetricBlock, { label: "CS a los 15 min", value: formatDecimal(champion.avgCsAt15), info: "Farmeo temprano medio con este campe\u00F3n." }), _jsx(MetricBlock, { label: "Oro a los 15 min", value: formatInteger(champion.avgGoldAt15), info: "Cu\u00E1nto valor econ\u00F3mico gener\u00E1s temprano con este campe\u00F3n." }), _jsx(MetricBlock, { label: "Muertes pre 14", value: formatDecimal(champion.avgDeathsPre14), info: "Qu\u00E9 tan limpio o castigado suele ser tu early con este campe\u00F3n." })] })] }, champion.championName));
                    }) })] }) }));
}
function HeaderLabel({ label, info }) {
    return (_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 4 }, children: [_jsx("span", { children: label }), _jsx(InfoHint, { text: info })] }));
}
function MetricBlock({ label, value, info }) {
    return (_jsxs("div", { style: metricBlockStyle, children: [_jsxs("div", { style: { ...metricLabelStyle, display: 'flex', alignItems: 'center' }, children: [label, _jsx(InfoHint, { text: info })] }), _jsx("div", { style: metricValueStyle, children: value })] }));
}
function badgeTone(classification) {
    if (classification === 'CORE_PICK' || classification === 'POCKET_PICK')
        return 'low';
    if (classification === 'COMFORT_TRAP')
        return 'high';
    return 'default';
}
const headerRowStyle = {
    display: 'grid',
    gridTemplateColumns: '1.4fr repeat(6, minmax(0, 1fr))',
    gap: 12,
    color: '#6f7886',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    marginBottom: 12,
    paddingInline: 4
};
const cardStyle = {
    display: 'grid',
    gap: 16,
    padding: 18,
    borderRadius: 16,
    background: '#060a10',
    border: '1px solid rgba(255,255,255,0.06)'
};
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
const iconStyle = {
    borderRadius: 14,
    border: '1px solid rgba(255,255,255,0.08)'
};
const sortSelectStyle = {
    minWidth: 220,
    padding: '11px 12px',
    borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.08)',
    background: '#070b12',
    color: '#edf2ff'
};
