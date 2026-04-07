import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { getRankEmblemDataUrl, getRankPalette } from '../../lib/lol';
export function RankBadge({ rank, compact = false, locale = 'es' }) {
    const palette = getRankPalette(rank.highest.tier);
    const anchorQueue = rank.soloQueue.tier !== 'UNRANKED' ? rank.soloQueue : rank.highest;
    const lpProgress = Math.max(0, Math.min(anchorQueue.leaguePoints, 100));
    const showFlex = rank.flexQueue.tier !== 'UNRANKED';
    const soloText = rank.soloQueue.tier === 'UNRANKED' ? (locale === 'en' ? 'Unranked' : 'Sin rango') : rank.soloQueue.label;
    const title = `${locale === 'en' ? 'Solo/Duo' : 'Solo/Duo'}: ${soloText}${rank.soloQueue.tier !== 'UNRANKED' ? ` · ${rank.soloQueue.leaguePoints} LP` : ''} · ${rank.soloQueue.winRate}% WR${showFlex ? `\nFlex: ${rank.flexQueue.label} · ${rank.flexQueue.leaguePoints} LP · ${rank.flexQueue.winRate}% WR` : ''}`;
    const flexSummary = showFlex ? `${rank.flexQueue.label} · ${rank.flexQueue.leaguePoints} LP` : null;
    if (compact) {
        return (_jsxs("div", { title: title, style: {
                display: 'grid',
                gap: 8,
                minWidth: 0,
                padding: '16px 18px 16px',
                borderRadius: 22,
                background: 'linear-gradient(180deg, rgba(8, 14, 22, 0.94), rgba(10, 17, 28, 0.9))',
                border: `1px solid ${palette.primary}30`,
                boxShadow: `0 22px 44px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.03), 0 0 28px ${palette.primary}1a`
            }, children: [_jsxs("div", { style: { display: 'grid', gridTemplateColumns: '144px minmax(0, 1fr)', alignItems: 'center', gap: 14 }, children: [_jsx("div", { style: { display: 'flex', alignItems: 'center', justifyContent: 'center' }, children: _jsx(RankEmblem, { tier: anchorQueue.tier, label: anchorQueue.label, size: 142 }) }), _jsxs("div", { style: { display: 'grid', gap: 6, minWidth: 0 }, children: [_jsx("div", { style: { color: '#8d97aa', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em' }, children: locale === 'en' ? 'Competitive rank' : 'Rango competitivo' }), _jsxs("div", { style: { display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }, children: [_jsx("span", { style: { fontSize: 22, fontWeight: 900, color: '#edf2ff', letterSpacing: '-0.03em' }, children: soloText }), rank.soloQueue.tier !== 'UNRANKED' ? _jsx("span", { style: { color: palette.glow, fontSize: 15, fontWeight: 900 }, children: `${rank.soloQueue.leaguePoints} LP` }) : null] }), _jsxs("div", { style: { display: 'flex', gap: 6, flexWrap: 'wrap' }, children: [_jsx("span", { style: rankQueueSummaryStyle, children: `${rank.soloQueue.winRate}% WR` }), flexSummary ? _jsx("span", { style: rankQueueSummaryStyle, children: `Flex · ${flexSummary}` }) : null] })] })] }), _jsx("div", { style: { height: 5, borderRadius: 999, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }, children: _jsx("div", { style: { width: `${lpProgress}%`, height: '100%', borderRadius: 999, background: `linear-gradient(90deg, ${palette.primary}, ${palette.glow})` } }) })] }));
    }
    return (_jsxs("div", { title: title, style: {
            display: 'grid',
            gap: compact ? 8 : 10,
            minWidth: 0,
            padding: compact ? '12px 14px' : '16px 18px',
            borderRadius: 18,
            background: compact ? 'linear-gradient(180deg, rgba(8,14,22,0.94), rgba(10,17,28,0.9))' : 'linear-gradient(180deg, rgba(10,14,22,0.96), rgba(19,24,37,0.92))',
            border: `1px solid ${palette.primary}33`,
            boxShadow: `0 18px 36px rgba(0,0,0,0.18), inset 0 1px 0 rgba(255,255,255,0.03), 0 0 20px ${palette.primary}16`
        }, children: [_jsxs("div", { style: { display: 'grid', gridTemplateColumns: '126px minmax(0, 1fr)', alignItems: 'center', gap: 12 }, children: [_jsx(RankEmblem, { tier: anchorQueue.tier, label: anchorQueue.label, size: 126 }), _jsxs("div", { style: { display: 'grid', gap: 6, minWidth: 0 }, children: [_jsx("div", { style: { color: '#8d97aa', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em' }, children: locale === 'en' ? 'Competitive rank' : 'Rango competitivo' }), _jsxs("div", { style: { display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }, children: [_jsx("span", { style: { fontSize: 22, fontWeight: 900, color: '#edf2ff', letterSpacing: '-0.03em' }, children: soloText }), rank.soloQueue.tier !== 'UNRANKED' ? _jsx("span", { style: { color: palette.glow, fontSize: 14, fontWeight: 900 }, children: `${rank.soloQueue.leaguePoints} LP` }) : null] }), _jsxs("div", { style: { display: 'grid', gap: 7 }, children: [_jsx("span", { style: rankQueueSummaryStyle, children: `${rank.soloQueue.winRate}% WR · Solo/Duo` }), flexSummary ? _jsx("span", { style: rankQueueSummaryStyle, children: `Flex · ${flexSummary}` }) : null] })] })] }), _jsx("div", { style: { height: 5, borderRadius: 999, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }, children: _jsx("div", { style: { width: `${lpProgress}%`, height: '100%', borderRadius: 999, background: `linear-gradient(90deg, ${palette.primary}, ${palette.glow})` } }) })] }));
}
export function RankEmblem({ tier, label, size }) {
    const emblem = getRankEmblemDataUrl(tier);
    const palette = getRankPalette(tier);
    const usesOfficialEmblem = Boolean(tier && tier !== 'UNRANKED');
    const tuning = rankEmblemCropTuning[tier ?? 'UNRANKED'] ?? rankEmblemCropTuning.DEFAULT;
    const assetWidth = Math.round(size * (usesOfficialEmblem ? tuning.assetScale : 1.76));
    const haloSize = Math.round(size * (usesOfficialEmblem ? tuning.haloScale : 0.7));
    return (_jsxs("div", { "aria-hidden": "true", style: {
            width: size,
            height: size,
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
            flexShrink: 0,
            overflow: 'hidden',
            borderRadius: '50%',
            boxShadow: usesOfficialEmblem ? `0 18px 34px ${palette.primary}16` : 'none'
        }, children: [usesOfficialEmblem ? (_jsx("div", { style: {
                    position: 'absolute',
                    inset: '50% auto auto 50%',
                    width: haloSize,
                    height: haloSize,
                    borderRadius: '50%',
                    transform: 'translate(-50%, -50%)',
                    background: `radial-gradient(circle at 50% 52%, ${palette.glow}1e 0%, ${palette.primary}18 26%, rgba(11,17,26,0.34) 54%, rgba(11,17,26,0) 76%)`,
                    boxShadow: `inset 0 0 28px rgba(255,255,255,0.03), 0 0 36px ${palette.primary}18`
                } })) : null, _jsx("img", { src: emblem, alt: label, width: assetWidth, height: assetWidth, style: {
                    position: 'absolute',
                    left: '50%',
                    top: '50%',
                    display: 'block',
                    width: assetWidth,
                    height: assetWidth,
                    objectFit: 'contain',
                    maxWidth: 'none',
                    transform: usesOfficialEmblem
                        ? `translate(-50%, -50%) translateY(${tuning.offsetY}px)`
                        : 'translate(-50%, -50%)',
                    filter: usesOfficialEmblem ? `drop-shadow(0 10px 24px ${palette.primary}20)` : `drop-shadow(0 14px 24px ${palette.primary}18)`
                } })] }));
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
const rankQueueSummaryStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 4,
    padding: '5px 8px',
    borderRadius: 999,
    background: 'rgba(255,255,255,0.04)',
    border: '1px solid rgba(255,255,255,0.05)',
    color: '#aeb8ca',
    fontSize: 12,
    lineHeight: 1.35,
    minWidth: 0
};
const rankEmblemCropTuning = {
    DEFAULT: { assetScale: 4.3, offsetY: 8, haloScale: 0.76 },
    IRON: { assetScale: 4.75, offsetY: 10, haloScale: 0.74 },
    BRONZE: { assetScale: 4.7, offsetY: 10, haloScale: 0.74 },
    SILVER: { assetScale: 4.65, offsetY: 10, haloScale: 0.74 },
    GOLD: { assetScale: 4.85, offsetY: 10, haloScale: 0.74 },
    PLATINUM: { assetScale: 4.45, offsetY: 10, haloScale: 0.75 },
    EMERALD: { assetScale: 4.35, offsetY: 10, haloScale: 0.75 },
    DIAMOND: { assetScale: 4.2, offsetY: 10, haloScale: 0.75 },
    MASTER: { assetScale: 4.1, offsetY: 8, haloScale: 0.75 },
    GRANDMASTER: { assetScale: 3.95, offsetY: 8, haloScale: 0.75 },
    CHALLENGER: { assetScale: 3.9, offsetY: 8, haloScale: 0.75 },
    UNRANKED: { assetScale: 1, offsetY: 0, haloScale: 0.7 }
};
