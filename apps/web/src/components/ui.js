import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { formatChampionName, getChampionIconUrl } from '../lib/lol';
export function Shell({ sidebar, children }) {
    return (_jsxs("div", { className: "app-shell", style: { display: 'grid', gridTemplateColumns: sidebar ? 'minmax(280px, 320px) minmax(0, 1fr)' : '1fr', minHeight: '100vh', background: 'radial-gradient(circle at top left, rgba(56, 44, 116, 0.16), transparent 28%), #04070c' }, children: [sidebar ? _jsx("aside", { className: "app-sidebar", style: { borderRight: '1px solid rgba(255,255,255,0.07)', padding: 24, background: '#05080e' }, children: sidebar }) : null, _jsx("main", { style: { padding: 28 }, children: children })] }));
}
export function Card({ title, subtitle, children }) {
    return (_jsxs("section", { style: { display: 'grid', alignContent: 'start', gap: 18, height: '100%', background: 'linear-gradient(180deg, rgba(8,12,20,0.98), rgba(5,8,14,0.98))', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 22, padding: 22, boxShadow: '0 22px 56px rgba(0,0,0,0.2)' }, children: [_jsxs("div", { style: { display: 'grid', gap: 8 }, children: [_jsx("h3", { style: { margin: 0, fontSize: 18, letterSpacing: '-0.02em' }, children: title }), subtitle ? _jsx("p", { style: { margin: 0, color: '#7f8898', lineHeight: 1.6 }, children: subtitle }) : null] }), children] }));
}
export function KPI({ label, value, hint, info, trend }) {
    return (_jsxs("div", { style: { padding: 15, borderRadius: 16, background: '#070b12', border: '1px solid rgba(255,255,255,0.06)', display: 'grid', gap: 6 }, children: [_jsxs("div", { style: { color: '#7f8898', fontSize: 12, display: 'flex', alignItems: 'center', textTransform: 'uppercase', letterSpacing: '0.06em' }, children: [label, info ? _jsx(InfoHint, { text: info }) : null] }), _jsx("div", { style: { fontSize: 28, fontWeight: 800, letterSpacing: '-0.04em' }, children: value }), hint || trend ? (_jsxs("div", { style: { color: '#7f8898', fontSize: 12, lineHeight: 1.5, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }, children: [hint ? _jsx("span", { children: hint }) : null, trend ? _jsx(TrendIndicator, { direction: trend.direction, tone: trend.tone, label: trend.label }) : null] })) : null] }));
}
export function Badge({ children, tone = 'default' }) {
    const tones = {
        default: { background: 'rgba(111,191,255,.12)', color: '#9ccfff' },
        high: { background: 'rgba(255,107,107,.16)', color: '#ffb3b3' },
        medium: { background: 'rgba(255,196,82,.16)', color: '#ffd989' },
        low: { background: 'rgba(126,245,199,.14)', color: '#9ff0cf' }
    };
    return _jsx("span", { style: { display: 'inline-flex', alignItems: 'center', justifyContent: 'center', padding: '7px 11px', borderRadius: 999, background: tones[tone].background, color: tones[tone].color, fontSize: 12, fontWeight: 700, letterSpacing: '0.02em', lineHeight: 1.1, textAlign: 'center', border: '1px solid rgba(255,255,255,0.05)' }, children: children });
}
export function ChampionAvatar({ championName, version, size = 44, radius = 14 }) {
    const iconUrl = getChampionIconUrl(championName, version);
    const displayName = formatChampionName(championName);
    if (!iconUrl) {
        return (_jsx("div", { "aria-hidden": "true", style: {
                ...championAvatarShellStyle,
                width: size,
                height: size,
                borderRadius: radius
            }, children: _jsx("span", { style: { fontSize: Math.max(12, size * 0.28), fontWeight: 800, color: '#edf2ff' }, children: displayName.slice(0, 2).toUpperCase() }) }));
    }
    return (_jsx("div", { style: { ...championAvatarShellStyle, width: size, height: size, borderRadius: radius }, children: _jsx("img", { src: iconUrl, alt: displayName, width: size, height: size, style: { display: 'block', width: size, height: size, borderRadius: radius, objectFit: 'cover' } }) }));
}
export function ChampionIdentity({ championName, version, subtitle, meta, size = 46, align = 'start' }) {
    const displayName = formatChampionName(championName);
    return (_jsxs("div", { style: { display: 'grid', gridTemplateColumns: `${size}px minmax(0, 1fr)`, gap: 12, alignItems: align }, children: [_jsx(ChampionAvatar, { championName: championName, version: version, size: size, radius: Math.max(12, Math.round(size * 0.28)) }), _jsxs("div", { style: { display: 'grid', gap: 3, minWidth: 0 }, children: [_jsx("div", { style: { color: '#edf2ff', fontSize: size >= 52 ? 22 : 18, fontWeight: 800, lineHeight: 1.12 }, children: displayName }), subtitle ? _jsx("div", { style: { color: '#9aa5b7', lineHeight: 1.55 }, children: subtitle }) : null, meta ? _jsx("div", { style: { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }, children: meta }) : null] })] }));
}
export function InfoHint({ text }) {
    return (_jsxs("span", { className: "info-hint", style: hintWrapperStyle, title: text, children: [_jsx("span", { style: hintIconStyle, children: "?" }), _jsx("span", { className: "info-hint-tooltip", style: hintTooltipStyle, children: text })] }));
}
export function TrendIndicator({ direction, tone, label }) {
    const isNeutral = tone === 'neutral' || direction === 'steady';
    const color = tone === 'positive'
        ? '#7ef5c7'
        : tone === 'negative'
            ? '#ff8f8f'
            : '#8293ac';
    const markerStyle = direction === 'steady'
        ? {
            width: 6,
            height: 6,
            borderRadius: 999,
            background: `${color}33`,
            border: `1px solid ${color}`
        }
        : direction === 'up'
            ? {
                width: 0,
                height: 0,
                borderLeft: '5px solid transparent',
                borderRight: '5px solid transparent',
                borderBottom: `8px solid ${color}`
            }
            : {
                width: 0,
                height: 0,
                borderLeft: '5px solid transparent',
                borderRight: '5px solid transparent',
                borderTop: `8px solid ${color}`
            };
    return (_jsxs("span", { style: { display: 'inline-flex', alignItems: 'center', gap: isNeutral ? 5 : 6, color, fontWeight: isNeutral ? 600 : 700, fontSize: isNeutral ? 11 : 12, lineHeight: 1.1, textAlign: 'left', whiteSpace: 'nowrap' }, children: [_jsx("span", { "aria-hidden": "true", style: markerStyle }), label ? _jsx("span", { style: { letterSpacing: isNeutral ? '0.01em' : undefined }, children: label }) : null] }));
}
const hintWrapperStyle = {
    position: 'relative',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 16,
    height: 16,
    marginLeft: 6
};
const hintIconStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: 14,
    height: 14,
    borderRadius: 999,
    border: '1px solid rgba(255,255,255,0.14)',
    background: 'rgba(255,255,255,0.03)',
    color: '#8e98ab',
    fontSize: 9,
    fontWeight: 700,
    lineHeight: 1,
    cursor: 'help'
};
const hintTooltipStyle = {
    position: 'absolute',
    bottom: 'calc(100% + 10px)',
    left: '50%',
    transform: 'translateX(-50%)',
    minWidth: 220,
    maxWidth: 280,
    padding: '9px 11px',
    borderRadius: 12,
    background: 'rgba(8, 12, 20, 0.98)',
    border: '1px solid rgba(255,255,255,0.08)',
    color: '#dce6f5',
    fontSize: 12,
    lineHeight: 1.5,
    boxShadow: '0 18px 40px rgba(0,0,0,0.35)',
    opacity: 0,
    pointerEvents: 'none',
    zIndex: 20,
    transition: 'opacity 120ms ease, transform 120ms ease'
};
const championAvatarShellStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    border: '1px solid rgba(255,255,255,0.08)',
    background: 'linear-gradient(180deg, rgba(17,22,33,0.96), rgba(7,11,18,0.98))',
    boxShadow: '0 14px 30px rgba(0,0,0,0.22)'
};
