import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Card, Badge, InfoHint } from '../../components/ui';
import { useMemo, useState } from 'react';
import { getChampionIconUrl, getRoleLabel } from '../../lib/lol';
import { formatDecimal, formatInteger, formatPercent, formatSignedNumber } from '../../lib/format';
function matchupDiffLabel(value, unit) {
    if (value > 0)
        return `${formatSignedNumber(value, unit === 'lvl' ? 1 : 0)} a favor`;
    if (value < 0)
        return `${formatSignedNumber(value, unit === 'lvl' ? 1 : 0)} en contra`;
    return unit === 'lvl' ? '0,0 parejo' : '0 parejo';
}
function aggregateMatchups(dataset) {
    const grouped = new Map();
    for (const match of dataset.matches) {
        const opponent = match.opponentChampionName ?? 'Unknown';
        const key = opponent;
        const current = grouped.get(key) ?? {
            opponent,
            roles: new Map(),
            games: 0,
            wins: 0,
            performance: 0,
            avgCsAt15: 0,
            avgDeathsPre14: 0,
            avgGoldDiffAt15: 0,
            avgLevelDiffAt15: 0
        };
        current.games += 1;
        current.wins += match.win ? 1 : 0;
        current.performance += match.score.total;
        current.avgCsAt15 += match.timeline.csAt15;
        current.avgDeathsPre14 += match.timeline.deathsPre14;
        current.avgGoldDiffAt15 += match.timeline.goldDiffAt15 ?? 0;
        current.avgLevelDiffAt15 += match.timeline.levelDiffAt15 ?? 0;
        const role = match.opponentRole ?? 'Unknown';
        current.roles.set(role, (current.roles.get(role) ?? 0) + 1);
        grouped.set(key, current);
    }
    return Array.from(grouped.values())
        .map((entry) => ({
        ...entry,
        role: Array.from(entry.roles.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'Unknown',
        winRate: Number(((entry.wins / Math.max(entry.games, 1)) * 100).toFixed(1)),
        performance: Number((entry.performance / entry.games).toFixed(1)),
        avgCsAt15: Number((entry.avgCsAt15 / entry.games).toFixed(1)),
        avgDeathsPre14: Number((entry.avgDeathsPre14 / entry.games).toFixed(1)),
        avgGoldDiffAt15: Number((entry.avgGoldDiffAt15 / entry.games).toFixed(0)),
        avgLevelDiffAt15: Number((entry.avgLevelDiffAt15 / entry.games).toFixed(1))
    }))
        .sort((a, b) => b.games - a.games || b.winRate - a.winRate);
}
export function MatchupsTab({ dataset }) {
    const championOptions = useMemo(() => ['ALL', ...Array.from(new Set(dataset.matches.map((match) => match.championName))).sort()], [dataset.matches]);
    const [championFilter, setChampionFilter] = useState('ALL');
    const [sortKey, setSortKey] = useState('games');
    const filteredDataset = useMemo(() => {
        if (championFilter === 'ALL')
            return dataset;
        return {
            ...dataset,
            matches: dataset.matches.filter((match) => match.championName === championFilter)
        };
    }, [championFilter, dataset]);
    const matchups = useMemo(() => {
        const entries = aggregateMatchups(filteredDataset);
        return entries.sort((a, b) => {
            const direction = sortKey === 'games' || sortKey === 'winRate' || sortKey === 'performance' || sortKey === 'avgGoldDiffAt15' || sortKey === 'avgLevelDiffAt15' ? -1 : -1;
            return (a[sortKey] - b[sortKey]) * direction;
        });
    }, [filteredDataset, sortKey]);
    return (_jsx(Card, { title: "Matchups", subtitle: "Lectura por rival directo con una presentaci\u00F3n m\u00E1s clara y comparativa", children: _jsxs("div", { style: { display: 'grid', gap: 14 }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }, children: [_jsx("div", { style: { color: '#8a95a8', fontSize: 13 }, children: championFilter === 'ALL'
                                ? 'Estás viendo todos tus picks mezclados.'
                                : `Estás viendo solo matchups cuando jugás ${championFilter}.` }), _jsxs("div", { style: { display: 'flex', gap: 10, flexWrap: 'wrap' }, children: [_jsx("select", { value: championFilter, onChange: (event) => setChampionFilter(event.target.value), style: filterSelectStyle, children: championOptions.map((champion) => (_jsx("option", { value: champion, children: champion === 'ALL' ? 'Todos tus campeones' : champion }, champion))) }), _jsxs("select", { value: sortKey, onChange: (event) => setSortKey(event.target.value), style: filterSelectStyle, children: [_jsx("option", { value: "games", children: "M\u00E1s partidas" }), _jsx("option", { value: "winRate", children: "Mayor win rate" }), _jsx("option", { value: "performance", children: "Mayor performance" }), _jsx("option", { value: "avgGoldDiffAt15", children: "Mayor diff. de oro" }), _jsx("option", { value: "avgLevelDiffAt15", children: "Mayor diff. de nivel" })] })] })] }), matchups.map((matchup) => {
                    const iconUrl = getChampionIconUrl(matchup.opponent, dataset.ddragonVersion);
                    return (_jsxs("div", { style: matchupCardStyle, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', alignItems: 'start' }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 14 }, children: [iconUrl ? _jsx("img", { src: iconUrl, alt: matchup.opponent, width: 52, height: 52, style: iconStyle }) : null, _jsxs("div", { style: { display: 'grid', gap: 6 }, children: [_jsx("div", { style: { fontSize: 18, fontWeight: 700 }, children: matchup.opponent }), _jsx("div", { style: { color: '#7d8696', fontSize: 13 }, children: getRoleLabel(matchup.role) })] })] }), _jsx(Badge, { tone: matchup.winRate >= 55 ? 'low' : matchup.winRate < 45 ? 'high' : 'medium', children: matchup.winRate >= 55 ? 'FAVORABLE' : matchup.winRate < 45 ? 'COMPLICADO' : 'PAREJO' })] }), _jsxs("div", { className: "seven-col-grid", style: metricGridStyle, children: [_jsx(MetricBlock, { label: "Partidas", value: formatInteger(matchup.games), info: "Cantidad de veces que enfrentaste a este campe\u00F3n en la muestra actual." }), _jsx(MetricBlock, { label: "Win rate", value: formatPercent(matchup.winRate), info: "Tu porcentaje de victorias contra este rival." }), _jsx(MetricBlock, { label: "Performance", value: formatDecimal(matchup.performance), info: "Promedio del \u00EDndice interno de ejecuci\u00F3n contra este matchup." }), _jsx(MetricBlock, { label: "CS a los 15", value: formatDecimal(matchup.avgCsAt15), info: "Tu econom\u00EDa media a los 15 contra este rival." }), _jsx(MetricBlock, { label: "Oro vs rival", value: matchupDiffLabel(matchup.avgGoldDiffAt15, 'gold'), info: "Si el valor termina 'a favor', lleg\u00E1s con ventaja media de oro al 15. Si termina 'en contra', lleg\u00E1s por detr\u00E1s frente al rival directo." }), _jsx(MetricBlock, { label: "Nivel vs rival", value: matchupDiffLabel(matchup.avgLevelDiffAt15, 'lvl'), info: "Si el valor termina 'a favor', tu nivel medio al 15 est\u00E1 por encima del rival. Si termina 'en contra', lleg\u00E1s con desventaja de experiencia." }), _jsx(MetricBlock, { label: "Muertes pre 14", value: formatDecimal(matchup.avgDeathsPre14), info: "Cu\u00E1ntas veces te castigan temprano, en promedio, estos cruces." })] })] }, `${matchup.opponent}-${matchup.role}`));
                })] }) }));
}
function MetricBlock({ label, value, info }) {
    return (_jsxs("div", { style: metricBlockStyle, children: [_jsxs("div", { style: { ...metricLabelStyle, display: 'flex', alignItems: 'center' }, children: [label, _jsx(InfoHint, { text: info })] }), _jsx("div", { style: metricValueStyle, children: value })] }));
}
const matchupCardStyle = {
    display: 'grid',
    gap: 16,
    padding: 18,
    borderRadius: 16,
    background: '#060a10',
    border: '1px solid rgba(255,255,255,0.06)'
};
const metricGridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(7, minmax(0, 1fr))',
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
const filterSelectStyle = {
    minWidth: 220,
    padding: '11px 12px',
    borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.08)',
    background: '#070b12',
    color: '#edf2ff'
};
