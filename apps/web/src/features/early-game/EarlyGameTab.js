import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, KPI } from '../../components/ui';
export function EarlyGameTab({ dataset }) {
    const championEarly = dataset.summary.championPool.map((champion) => ({
        champion: champion.championName,
        csAt15: champion.avgCsAt15,
        goldAt15: champion.avgGoldAt15,
        pre14Deaths: champion.avgDeathsPre14
    }));
    return (_jsxs("div", { style: { display: 'grid', gap: 18 }, children: [_jsxs("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12 }, children: [_jsx(KPI, { label: "CS a los 15", value: `${dataset.summary.avgCsAt15}`, hint: "Objetivo operativo" }), _jsx(KPI, { label: "Gold@15", value: `${dataset.summary.avgGoldAt15}`, hint: "Presi\u00F3n econ\u00F3mica" }), _jsx(KPI, { label: "Deaths pre-14", value: `${dataset.summary.avgDeathsPre14}`, hint: "Piso de consistencia" }), _jsx(KPI, { label: "KP", value: `${dataset.summary.avgKillParticipation}%`, hint: "Conexi\u00F3n con plays" })] }), _jsx(Card, { title: "Early game por campe\u00F3n", subtitle: "Small multiple resumido para no mezclar escalas incompatibles", children: _jsx("div", { style: { width: '100%', height: 320 }, children: _jsx(ResponsiveContainer, { children: _jsxs(BarChart, { data: championEarly, children: [_jsx(CartesianGrid, { stroke: "rgba(255,255,255,0.08)" }), _jsx(XAxis, { dataKey: "champion", stroke: "#8fa8cc" }), _jsx(YAxis, { stroke: "#8fa8cc" }), _jsx(Tooltip, {}), _jsx(Bar, { dataKey: "csAt15", fill: "#7ed4ff" }), _jsx(Bar, { dataKey: "pre14Deaths", fill: "#ff9ca3" })] }) }) }) })] }));
}
