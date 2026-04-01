import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
export function Shell({ sidebar, children }) {
    return (_jsxs("div", { className: "app-shell", style: { display: 'grid', gridTemplateColumns: sidebar ? 'minmax(280px, 320px) minmax(0, 1fr)' : '1fr', minHeight: '100vh', background: 'radial-gradient(circle at top left, rgba(56, 44, 116, 0.16), transparent 28%), #04070c' }, children: [sidebar ? _jsx("aside", { className: "app-sidebar", style: { borderRight: '1px solid rgba(255,255,255,0.07)', padding: 24, background: '#05080e' }, children: sidebar }) : null, _jsx("main", { style: { padding: 28 }, children: children })] }));
}
export function Card({ title, subtitle, children }) {
    return (_jsxs("section", { style: { background: 'linear-gradient(180deg, rgba(8,12,20,0.98), rgba(5,8,14,0.98))', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 20, padding: 20, boxShadow: '0 18px 50px rgba(0,0,0,0.18)' }, children: [_jsxs("div", { style: { marginBottom: 18, display: 'grid', gap: 8 }, children: [_jsx("h3", { style: { margin: 0, fontSize: 18, letterSpacing: '-0.02em' }, children: title }), subtitle ? _jsx("p", { style: { margin: 0, color: '#7f8898', lineHeight: 1.6 }, children: subtitle }) : null] }), children] }));
}
export function KPI({ label, value, hint, info }) {
    return (_jsxs("div", { style: { padding: 15, borderRadius: 16, background: '#070b12', border: '1px solid rgba(255,255,255,0.06)', display: 'grid', gap: 6 }, children: [_jsxs("div", { style: { color: '#7f8898', fontSize: 12, display: 'flex', alignItems: 'center', textTransform: 'uppercase', letterSpacing: '0.06em' }, children: [label, info ? _jsx(InfoHint, { text: info }) : null] }), _jsx("div", { style: { fontSize: 28, fontWeight: 800, letterSpacing: '-0.04em' }, children: value }), hint ? _jsx("div", { style: { color: '#7f8898', fontSize: 12, lineHeight: 1.5 }, children: hint }) : null] }));
}
export function Badge({ children, tone = 'default' }) {
    const tones = {
        default: { background: 'rgba(111,191,255,.12)', color: '#9ccfff' },
        high: { background: 'rgba(255,107,107,.16)', color: '#ffb3b3' },
        medium: { background: 'rgba(255,196,82,.16)', color: '#ffd989' },
        low: { background: 'rgba(126,245,199,.14)', color: '#9ff0cf' }
    };
    return _jsx("span", { style: { display: 'inline-flex', alignItems: 'center', padding: '7px 11px', borderRadius: 999, background: tones[tone].background, color: tones[tone].color, fontSize: 12, fontWeight: 700, letterSpacing: '0.02em', border: '1px solid rgba(255,255,255,0.05)' }, children: children });
}
export function InfoHint({ text }) {
    return (_jsxs("span", { className: "info-hint", style: hintWrapperStyle, title: text, children: [_jsx("span", { style: hintIconStyle, children: "?" }), _jsx("span", { className: "info-hint-tooltip", style: hintTooltipStyle, children: text })] }));
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
