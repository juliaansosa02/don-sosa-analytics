import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Card, Badge } from '../../components/ui';
import { getChampionIconUrl, getRuneIconUrl } from '../../lib/lol';
import { formatDecimal, formatInteger, formatPercent } from '../../lib/format';
function aggregateRunes(dataset) {
    const grouped = new Map();
    for (const match of dataset.matches) {
        const keystone = match.primaryRunes[0]?.name ?? 'Unknown keystone';
        const current = grouped.get(keystone) ?? {
            name: keystone,
            icon: match.primaryRunes[0]?.icon,
            games: 0,
            wins: 0,
            damage: 0,
            healing: 0,
            shielding: 0,
            performance: 0,
            champions: new Map()
        };
        current.games += 1;
        current.wins += match.win ? 1 : 0;
        current.damage += match.runeStats.totalDamageFromRunes;
        current.healing += match.runeStats.totalHealingFromRunes;
        current.shielding += match.runeStats.totalShieldingFromRunes;
        current.performance += match.score.total;
        const championUsage = current.champions.get(match.championName) ?? { games: 0, wins: 0 };
        championUsage.games += 1;
        championUsage.wins += match.win ? 1 : 0;
        current.champions.set(match.championName, championUsage);
        grouped.set(keystone, current);
    }
    return Array.from(grouped.values())
        .map((entry) => ({
        ...entry,
        winRate: Number(((entry.wins / Math.max(entry.games, 1)) * 100).toFixed(1)),
        avgDamage: Number((entry.damage / entry.games).toFixed(0)),
        avgHealing: Number((entry.healing / entry.games).toFixed(0)),
        avgShielding: Number((entry.shielding / entry.games).toFixed(0)),
        avgPerformance: Number((entry.performance / entry.games).toFixed(1)),
        champions: Array.from(entry.champions.entries())
            .map(([championName, usage]) => ({
            championName,
            games: usage.games,
            winRate: Number(((usage.wins / Math.max(usage.games, 1)) * 100).toFixed(1))
        }))
            .sort((a, b) => b.games - a.games || b.winRate - a.winRate)
            .slice(0, 3)
    }))
        .sort((a, b) => b.games - a.games || b.winRate - a.winRate);
}
export function RunesTab({ dataset }) {
    const runes = aggregateRunes(dataset);
    return (_jsxs("div", { style: { display: 'grid', gap: 16 }, children: [_jsx(Card, { title: "Runas", subtitle: "Cada keystone se lee junto a los campeones con los que realmente la est\u00E1s usando", children: _jsx("div", { style: { display: 'grid', gap: 14 }, children: runes.map((rune) => {
                        const iconUrl = getRuneIconUrl(rune.icon);
                        return (_jsxs("div", { style: runeCardStyle, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'start', flexWrap: 'wrap' }, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', gap: 14 }, children: [iconUrl ? _jsx("img", { src: iconUrl, alt: rune.name, width: 46, height: 46, style: runeIconStyle }) : null, _jsxs("div", { children: [_jsx("div", { style: { fontSize: 18, fontWeight: 700 }, children: rune.name }), _jsxs("div", { style: { color: '#788291', fontSize: 13 }, children: [rune.games, " partidas analizadas"] })] })] }), _jsx(Badge, { tone: rune.winRate >= 55 ? 'low' : rune.winRate < 45 ? 'high' : 'medium', children: rune.winRate >= 55 ? 'Rindiendo bien' : rune.winRate < 45 ? 'Por revisar' : 'Muestra pareja' })] }), _jsxs("div", { style: runeMetricsGridStyle, children: [_jsx(MetricBlock, { label: "Win rate", value: formatPercent(rune.winRate) }), _jsx(MetricBlock, { label: "Performance media", value: formatDecimal(rune.avgPerformance) }), _jsx(MetricBlock, { label: "Da\u00F1o medio", value: formatInteger(rune.avgDamage) }), _jsx(MetricBlock, { label: "Curaci\u00F3n media", value: formatInteger(rune.avgHealing) }), _jsx(MetricBlock, { label: "Escudo medio", value: formatInteger(rune.avgShielding) })] }), _jsxs("div", { style: { display: 'grid', gap: 10 }, children: [_jsx("div", { style: sectionLabelStyle, children: "Campeones con los que m\u00E1s la us\u00E1s" }), _jsx("div", { style: { display: 'flex', gap: 10, flexWrap: 'wrap' }, children: rune.champions.map((champion) => {
                                                const championIcon = getChampionIconUrl(champion.championName, dataset.ddragonVersion);
                                                return (_jsxs("div", { style: championPillStyle, children: [championIcon ? _jsx("img", { src: championIcon, alt: champion.championName, width: 28, height: 28, style: championIconStyle }) : null, _jsxs("div", { children: [_jsx("div", { style: { fontSize: 13, fontWeight: 700 }, children: champion.championName }), _jsxs("div", { style: { color: '#7a8494', fontSize: 12 }, children: [champion.games, " partidas \u00B7 ", formatPercent(champion.winRate)] })] })] }, champion.championName));
                                            }) })] })] }, rune.name));
                    }) }) }), _jsx("p", { style: { margin: 0, color: '#798395', fontSize: 13 }, children: "\u201CPerformance media\u201D es el promedio del score total de tus partidas con esa runa. Sirve para comparar ejecuci\u00F3n entre configuraciones, no es una m\u00E9trica oficial de Riot." })] }));
}
function MetricBlock({ label, value }) {
    return (_jsxs("div", { style: metricBlockStyle, children: [_jsx("div", { style: metricLabelStyle, children: label }), _jsx("div", { style: metricValueStyle, children: value })] }));
}
const runeCardStyle = {
    display: 'grid',
    gap: 16,
    padding: 18,
    borderRadius: 16,
    background: '#060a10',
    border: '1px solid rgba(255,255,255,0.06)'
};
const runeMetricsGridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
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
const sectionLabelStyle = {
    color: '#7b8595',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: '0.08em'
};
const championPillStyle = {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '10px 12px',
    borderRadius: 12,
    background: '#090e16',
    border: '1px solid rgba(255,255,255,0.05)'
};
const runeIconStyle = {
    borderRadius: 12,
    border: '1px solid rgba(255,255,255,0.08)',
    background: '#0f141d'
};
const championIconStyle = {
    borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.08)'
};
