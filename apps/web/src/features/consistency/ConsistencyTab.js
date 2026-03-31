import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card } from '../../components/ui';
export function ConsistencyTab({ dataset }) {
    const data = dataset.matches.slice().reverse().map((match, index) => ({
        game: index + 1,
        score: match.score.total,
        deathsPre14: match.timeline.deathsPre14
    }));
    return (_jsx(Card, { title: "Volatilidad de performance", subtitle: "Tu objetivo no es solo subir el techo: es subir el piso", children: _jsx("div", { style: { width: '100%', height: 320 }, children: _jsx(ResponsiveContainer, { children: _jsxs(AreaChart, { data: data, children: [_jsx(CartesianGrid, { stroke: "rgba(255,255,255,0.08)" }), _jsx(XAxis, { dataKey: "game", stroke: "#8fa8cc" }), _jsx(YAxis, { stroke: "#8fa8cc" }), _jsx(Tooltip, {}), _jsx(Area, { type: "monotone", dataKey: "score", stroke: "#79d8ff", fill: "rgba(121,216,255,.25)" })] }) }) }) }));
}
