import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { CartesianGrid, Line, LineChart, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, KPI } from '../../components/ui';
export function OverviewTab({ dataset }) {
    const trend = dataset.matches.slice().reverse().map((match, index) => ({
        game: index + 1,
        score: match.score.total,
        result: match.win ? 1 : 0
    }));
    const scatter = dataset.matches.map((match) => ({
        x: match.timeline.csAt15,
        y: match.timeline.goldAt15,
        z: match.score.total,
        result: match.win ? 'Win' : 'Loss'
    }));
    return (_jsxs("div", { style: { display: 'grid', gap: 18 }, children: [_jsxs("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 12 }, children: [_jsx(KPI, { label: "Win Rate", value: `${dataset.summary.winRate}%`, hint: `${dataset.summary.wins}-${dataset.summary.losses}` }), _jsx(KPI, { label: "Performance", value: `${dataset.summary.avgPerformanceScore}`, hint: "Promedio total" }), _jsx(KPI, { label: "KDA", value: `${dataset.summary.avgKda}`, hint: "Promedio" }), _jsx(KPI, { label: "CS a los 15", value: `${dataset.summary.avgCsAt15}`, hint: "Fundamental de farmeo" }), _jsx(KPI, { label: "Gold@15", value: `${dataset.summary.avgGoldAt15}`, hint: "Econom\u00EDa temprana" })] }), _jsxs("div", { style: { display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 18 }, children: [_jsx(Card, { title: "Tendencia de performance", subtitle: "Rolling feel de tus \u00FAltimas partidas", children: _jsx("div", { style: { width: '100%', height: 280 }, children: _jsx(ResponsiveContainer, { children: _jsxs(LineChart, { data: trend, children: [_jsx(CartesianGrid, { stroke: "rgba(255,255,255,0.08)" }), _jsx(XAxis, { dataKey: "game", stroke: "#8fa8cc" }), _jsx(YAxis, { stroke: "#8fa8cc" }), _jsx(Tooltip, {}), _jsx(Line, { type: "monotone", dataKey: "score", stroke: "#7ed4ff", strokeWidth: 3, dot: false })] }) }) }) }), _jsx(Card, { title: "Early economy map", subtitle: "CS a los 15 vs Gold@15 para ver patrones reales", children: _jsx("div", { style: { width: '100%', height: 280 }, children: _jsx(ResponsiveContainer, { children: _jsxs(ScatterChart, { children: [_jsx(CartesianGrid, { stroke: "rgba(255,255,255,0.08)" }), _jsx(XAxis, { type: "number", dataKey: "x", name: "CS a los 15", stroke: "#8fa8cc" }), _jsx(YAxis, { type: "number", dataKey: "y", name: "Gold@15", stroke: "#8fa8cc" }), _jsx(Tooltip, { cursor: { strokeDasharray: '3 3' } }), _jsx(Scatter, { data: scatter, fill: "#76e3b5" })] }) }) }) })] })] }));
}
