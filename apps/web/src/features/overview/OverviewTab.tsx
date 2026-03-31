import { CartesianGrid, Line, LineChart, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, KPI } from '../../components/ui';
import type { Dataset } from '../../types';

export function OverviewTab({ dataset }: { dataset: Dataset }) {
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

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, minmax(0, 1fr))', gap: 12 }}>
        <KPI label="Win Rate" value={`${dataset.summary.winRate}%`} hint={`${dataset.summary.wins}-${dataset.summary.losses}`} />
        <KPI label="Performance" value={`${dataset.summary.avgPerformanceScore}`} hint="Promedio total" />
        <KPI label="KDA" value={`${dataset.summary.avgKda}`} hint="Promedio" />
        <KPI label="CS a los 15" value={`${dataset.summary.avgCsAt15}`} hint="Fundamental de farmeo" />
        <KPI label="Gold@15" value={`${dataset.summary.avgGoldAt15}`} hint="Economía temprana" />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 18 }}>
        <Card title="Tendencia de performance" subtitle="Rolling feel de tus últimas partidas">
          <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer>
              <LineChart data={trend}>
                <CartesianGrid stroke="rgba(255,255,255,0.08)" />
                <XAxis dataKey="game" stroke="#8fa8cc" />
                <YAxis stroke="#8fa8cc" />
                <Tooltip />
                <Line type="monotone" dataKey="score" stroke="#7ed4ff" strokeWidth={3} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card title="Early economy map" subtitle="CS a los 15 vs Gold@15 para ver patrones reales">
          <div style={{ width: '100%', height: 280 }}>
            <ResponsiveContainer>
              <ScatterChart>
                <CartesianGrid stroke="rgba(255,255,255,0.08)" />
                <XAxis type="number" dataKey="x" name="CS a los 15" stroke="#8fa8cc" />
                <YAxis type="number" dataKey="y" name="Gold@15" stroke="#8fa8cc" />
                <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                <Scatter data={scatter} fill="#76e3b5" />
              </ScatterChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>
    </div>
  );
}
