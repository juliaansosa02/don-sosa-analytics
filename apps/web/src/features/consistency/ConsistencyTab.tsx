import { Area, AreaChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card } from '../../components/ui';
import type { Dataset } from '../../types';

export function ConsistencyTab({ dataset }: { dataset: Dataset }) {
  const data = dataset.matches.slice().reverse().map((match, index) => ({
    game: index + 1,
    score: match.score.total,
    deathsPre14: match.timeline.deathsPre14
  }));

  return (
    <Card title="Volatilidad de performance" subtitle="Tu objetivo no es solo subir el techo: es subir el piso">
      <div style={{ width: '100%', height: 320 }}>
        <ResponsiveContainer>
          <AreaChart data={data}>
            <CartesianGrid stroke="rgba(255,255,255,0.08)" />
            <XAxis dataKey="game" stroke="#8fa8cc" />
            <YAxis stroke="#8fa8cc" />
            <Tooltip />
            <Area type="monotone" dataKey="score" stroke="#79d8ff" fill="rgba(121,216,255,.25)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}
