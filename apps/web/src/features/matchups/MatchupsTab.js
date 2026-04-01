import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Card, Badge, InfoHint } from '../../components/ui';
import { useMemo, useState } from 'react';
import { formatChampionName, getChampionIconUrl, getRoleLabel } from '../../lib/lol';
import { formatDecimal, formatInteger, formatPercent, formatSignedNumber } from '../../lib/format';
import { translateRole } from '../../lib/i18n';
function matchupDiffLabel(value, unit, locale) {
    if (value > 0)
        return locale === 'en' ? `${formatSignedNumber(value, unit === 'lvl' ? 1 : 0)} ahead` : `${formatSignedNumber(value, unit === 'lvl' ? 1 : 0)} a favor`;
    if (value < 0)
        return locale === 'en' ? `${formatSignedNumber(value, unit === 'lvl' ? 1 : 0)} behind` : `${formatSignedNumber(value, unit === 'lvl' ? 1 : 0)} en contra`;
    return locale === 'en' ? (unit === 'lvl' ? '0.0 even' : '0 even') : (unit === 'lvl' ? '0,0 parejo' : '0 parejo');
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
export function MatchupsTab({ dataset, locale = 'es' }) {
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
    return (_jsx(Card, { title: "Matchups", subtitle: locale === 'en' ? 'Direct-opponent view with a clearer, more comparative presentation' : 'Lectura por rival directo con una presentación más clara y comparativa', children: _jsxs("div", { style: { display: 'grid', gap: 14 }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }, children: [_jsx("div", { style: { color: '#8a95a8', fontSize: 13 }, children: championFilter === 'ALL'
                                ? (locale === 'en' ? 'You are looking at all of your picks mixed together.' : 'Estás viendo todos tus picks mezclados.')
                                : (locale === 'en' ? `You are looking only at matchups when you play ${formatChampionName(championFilter)}.` : `Estás viendo solo matchups cuando jugás ${formatChampionName(championFilter)}.`) }), _jsxs("div", { style: { display: 'flex', gap: 10, flexWrap: 'wrap' }, children: [_jsx("select", { value: championFilter, onChange: (event) => setChampionFilter(event.target.value), style: filterSelectStyle, children: championOptions.map((champion) => (_jsx("option", { value: champion, children: champion === 'ALL' ? (locale === 'en' ? 'All your champions' : 'Todos tus campeones') : formatChampionName(champion) }, champion))) }), _jsxs("select", { value: sortKey, onChange: (event) => setSortKey(event.target.value), style: filterSelectStyle, children: [_jsx("option", { value: "games", children: locale === 'en' ? 'Most games' : 'Más partidas' }), _jsx("option", { value: "winRate", children: locale === 'en' ? 'Highest win rate' : 'Mayor win rate' }), _jsx("option", { value: "performance", children: locale === 'en' ? 'Highest performance' : 'Mayor performance' }), _jsx("option", { value: "avgGoldDiffAt15", children: locale === 'en' ? 'Highest gold diff' : 'Mayor diff. de oro' }), _jsx("option", { value: "avgLevelDiffAt15", children: locale === 'en' ? 'Highest level diff' : 'Mayor diff. de nivel' })] })] })] }), matchups.map((matchup) => {
                    const iconUrl = getChampionIconUrl(matchup.opponent, dataset.ddragonVersion);
                    return (_jsxs("div", { style: matchupCardStyle, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', alignItems: 'start' }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 14 }, children: [iconUrl ? _jsx("img", { src: iconUrl, alt: formatChampionName(matchup.opponent), width: 52, height: 52, style: iconStyle }) : null, _jsxs("div", { style: { display: 'grid', gap: 6 }, children: [_jsx("div", { style: { fontSize: 18, fontWeight: 700 }, children: formatChampionName(matchup.opponent) }), _jsx("div", { style: { color: '#7d8696', fontSize: 13 }, children: locale === 'en' ? translateRole(matchup.role, 'en') : getRoleLabel(matchup.role) })] })] }), _jsx(Badge, { tone: matchup.winRate >= 55 ? 'low' : matchup.winRate < 45 ? 'high' : 'medium', children: matchup.winRate >= 55 ? (locale === 'en' ? 'FAVORABLE' : 'FAVORABLE') : matchup.winRate < 45 ? (locale === 'en' ? 'TOUGH' : 'COMPLICADO') : (locale === 'en' ? 'EVEN' : 'PAREJO') })] }), _jsxs("div", { className: "seven-col-grid", style: metricGridStyle, children: [_jsx(MetricBlock, { label: locale === 'en' ? 'Games' : 'Partidas', value: formatInteger(matchup.games), info: locale === 'en' ? 'How many times you faced this champion inside the current sample.' : 'Cantidad de veces que enfrentaste a este campeón en la muestra actual.' }), _jsx(MetricBlock, { label: "Win rate", value: formatPercent(matchup.winRate), info: locale === 'en' ? 'Your win rate against this opponent.' : 'Tu porcentaje de victorias contra este rival.' }), _jsx(MetricBlock, { label: "Performance", value: formatDecimal(matchup.performance), info: locale === 'en' ? 'Average internal execution score against this matchup.' : 'Promedio del índice interno de ejecución contra este matchup.' }), _jsx(MetricBlock, { label: locale === 'en' ? 'CS at 15' : 'CS a los 15', value: formatDecimal(matchup.avgCsAt15), info: locale === 'en' ? 'Your average economy at minute 15 against this opponent.' : 'Tu economía media a los 15 contra este rival.' }), _jsx(MetricBlock, { label: locale === 'en' ? 'Gold vs opponent' : 'Oro vs rival', value: matchupDiffLabel(matchup.avgGoldDiffAt15, 'gold', locale), info: locale === 'en' ? "If the value ends in 'ahead', you reach minute 15 with an average gold lead. If it ends in 'behind', you are behind your direct lane or role opponent." : "Si el valor termina 'a favor', llegás con ventaja media de oro al 15. Si termina 'en contra', llegás por detrás frente al rival directo." }), _jsx(MetricBlock, { label: locale === 'en' ? 'Level vs opponent' : 'Nivel vs rival', value: matchupDiffLabel(matchup.avgLevelDiffAt15, 'lvl', locale), info: locale === 'en' ? "If the value ends in 'ahead', your average level at 15 is above the opponent. If it ends in 'behind', you are trailing in experience." : "Si el valor termina 'a favor', tu nivel medio al 15 está por encima del rival. Si termina 'en contra', llegás con desventaja de experiencia." }), _jsx(MetricBlock, { label: locale === 'en' ? 'Deaths pre 14' : 'Muertes pre 14', value: formatDecimal(matchup.avgDeathsPre14), info: locale === 'en' ? 'How often these matchups punish you early, on average.' : 'Cuántas veces te castigan temprano, en promedio, estos cruces.' })] })] }, `${matchup.opponent}-${matchup.role}`));
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
