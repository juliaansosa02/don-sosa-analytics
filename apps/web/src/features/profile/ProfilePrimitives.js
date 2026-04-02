import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { getRankEmblemDataUrl, getRankPalette } from '../../lib/lol';
export function RankBadge({ rank, compact = false, locale = 'es' }) {
    const palette = getRankPalette(rank.highest.tier);
    const lpProgress = Math.max(0, Math.min(rank.highest.leaguePoints, 100));
    const showFlex = rank.flexQueue.tier !== 'UNRANKED';
    const title = `${locale === 'en' ? 'Solo/Duo' : 'Solo/Duo'}: ${rank.soloQueue.label} · ${rank.soloQueue.leaguePoints} LP · ${rank.soloQueue.winRate}% WR${showFlex ? `\nFlex: ${rank.flexQueue.label} · ${rank.flexQueue.leaguePoints} LP · ${rank.flexQueue.winRate}% WR` : ''}`;
    return (_jsxs("div", { title: title, style: {
            display: 'grid',
            gap: compact ? 8 : 10,
            minWidth: 0,
            padding: compact ? '12px 14px' : '16px 18px',
            borderRadius: 16,
            background: compact ? 'rgba(9, 14, 22, 0.86)' : 'linear-gradient(180deg, rgba(10,14,22,0.96), rgba(19,24,37,0.92))',
            border: `1px solid ${palette.primary}33`
        }, children: [_jsxs("div", { style: { display: 'grid', gridTemplateColumns: `${compact ? 94 : 104}px minmax(0, 1fr)`, alignItems: 'center', gap: compact ? 4 : 10 }, children: [_jsx(RankEmblem, { tier: rank.highest.tier, label: rank.highest.label, size: compact ? 94 : 104 }), _jsxs("div", { style: { display: 'grid', gap: 3, minWidth: 0 }, children: [_jsx("div", { style: { color: '#8d97aa', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em' }, children: rank.highest.queueLabel ?? (locale === 'en' ? 'Ranked' : 'Ranked') }), _jsxs("div", { style: { display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }, children: [_jsx("span", { style: { fontSize: compact ? 17 : 20, fontWeight: 800, color: '#edf2ff', letterSpacing: '-0.02em' }, children: rank.highest.label }), _jsx("span", { style: { color: palette.glow, fontSize: 13, fontWeight: 800 }, children: `${rank.highest.leaguePoints} LP` })] }), _jsxs("div", { style: { display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }, children: [_jsxs("span", { style: rankQueuePillStyle, children: [_jsx("strong", { children: locale === 'en' ? 'Solo' : 'Solo' }), " ", rank.soloQueue.label, " \u00B7 ", rank.soloQueue.leaguePoints, " LP"] }), showFlex ? (_jsxs("span", { style: rankQueuePillStyle, children: [_jsx("strong", { children: "Flex" }), " ", rank.flexQueue.label, " \u00B7 ", rank.flexQueue.leaguePoints, " LP"] })) : null] })] })] }), _jsxs("div", { style: { display: 'grid', gap: 5 }, children: [_jsx("div", { style: { height: 5, borderRadius: 999, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }, children: _jsx("div", { style: { width: `${lpProgress}%`, height: '100%', borderRadius: 999, background: `linear-gradient(90deg, ${palette.primary}, ${palette.glow})` } }) }), !compact ? (_jsx("div", { style: { color: '#7e889b', fontSize: 11 }, children: locale === 'en' ? 'Hover to view Solo/Duo and Flex' : 'Hover para ver Solo/Duo y Flex' })) : null] })] }));
}
export function RankEmblem({ tier, label, size }) {
    const emblem = getRankEmblemDataUrl(tier);
    const palette = getRankPalette(tier);
    const assetSize = Math.round(size * 3);
    return (_jsx("div", { "aria-hidden": "true", style: {
            width: size,
            height: size,
            overflow: 'hidden',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            filter: `drop-shadow(0 16px 32px ${palette.primary}24)`
        }, children: _jsx("img", { src: emblem, alt: label, width: assetSize, height: assetSize, style: {
                display: 'block',
                width: assetSize,
                height: assetSize,
                objectFit: 'contain',
                marginTop: Math.round(size * 0.04)
            } }) }));
}
export function TrendSparkline({ matches, locale = 'es' }) {
    const sorted = [...matches].sort((a, b) => a.gameCreation - b.gameCreation).slice(-12);
    const values = sorted.map((match) => match.score.total);
    const min = Math.min(...values, 0);
    const max = Math.max(...values, 100);
    const points = values.map((value, index) => {
        const x = values.length === 1 ? 0 : (index / Math.max(values.length - 1, 1)) * 100;
        const y = 100 - (((value - min) / Math.max(max - min, 1)) * 100);
        return `${x},${y}`;
    }).join(' ');
    return (_jsxs("div", { style: sparklineCardStyle, children: [_jsx("div", { style: { color: '#7d889c', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em' }, children: locale === 'en' ? 'Latest matches' : 'Últimas partidas' }), _jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', alignItems: 'end', gap: 12 }, children: [_jsxs("div", { style: { display: 'grid', gap: 4 }, children: [_jsx("div", { style: { fontSize: 18, fontWeight: 800 }, children: locale === 'en' ? 'Recent performance' : 'Performance reciente' }), _jsx("div", { style: { color: '#8895aa', fontSize: 12 }, children: locale === 'en' ? 'Sparkline from the last 12 valid matches' : 'Sparkline de las últimas 12 partidas válidas' })] }), _jsx("div", { style: { color: '#dff7eb', fontSize: 12, fontWeight: 700 }, children: values.length ? (locale === 'en' ? `${Math.round(values.at(-1) ?? 0)} latest score` : `${Math.round(values.at(-1) ?? 0)} último score`) : (locale === 'en' ? 'No data' : 'Sin datos') })] }), _jsxs("svg", { viewBox: "0 0 100 100", preserveAspectRatio: "none", style: { width: '100%', height: 84, display: 'block' }, children: [_jsx("defs", { children: _jsxs("linearGradient", { id: "spark-fill", x1: "0", y1: "0", x2: "0", y2: "1", children: [_jsx("stop", { offset: "0%", stopColor: "rgba(216,253,241,0.34)" }), _jsx("stop", { offset: "100%", stopColor: "rgba(216,253,241,0)" })] }) }), _jsx("polyline", { fill: "none", stroke: "rgba(216,253,241,0.95)", strokeWidth: "3", points: points })] })] }));
}
const sparklineCardStyle = {
    gridColumn: '1 / -1',
    display: 'grid',
    gap: 10,
    padding: '14px 15px',
    borderRadius: 16,
    background: '#060a10',
    border: '1px solid rgba(255,255,255,0.06)'
};
const rankQueuePillStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '5px 8px',
    borderRadius: 999,
    background: 'rgba(255,255,255,0.04)',
    color: '#aeb8ca',
    fontSize: 11,
    lineHeight: 1.2,
    border: '1px solid rgba(255,255,255,0.05)'
};
