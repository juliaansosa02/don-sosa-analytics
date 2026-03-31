import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Card, KPI } from '../../components/ui';
import type { Dataset } from '../../types';

export function EarlyGameTab({ dataset }: { dataset: Dataset }) {
  const championEarly = dataset.summary.championPool.map((champion) => ({
    champion: champion.championName,
    csAt15: champion.avgCsAt15,
    goldAt15: champion.avgGoldAt15,
    pre14Deaths: champion.avgDeathsPre14
  }));

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 12 }}>
        <KPI label="CS a los 15" value={`${dataset.summary.avgCsAt15}`} hint="Objetivo operativo" />
        <KPI label="Gold@15" value={`${dataset.summary.avgGoldAt15}`} hint="Presión económica" />
        <KPI label="Deaths pre-14" value={`${dataset.summary.avgDeathsPre14}`} hint="Piso de consistencia" />
        <KPI label="KP" value={`${dataset.summary.avgKillParticipation}%`} hint="Conexión con plays" />
      </div>

      <Card title="Early game por campeón" subtitle="Small multiple resumido para no mezclar escalas incompatibles">
        <div style={{ width: '100%', height: 320 }}>
          <ResponsiveContainer>
            <BarChart data={championEarly}>
              <CartesianGrid stroke="rgba(255,255,255,0.08)" />
              <XAxis dataKey="champion" stroke="#8fa8cc" />
              <YAxis stroke="#8fa8cc" />
              <Tooltip />
              <Bar dataKey="csAt15" fill="#7ed4ff" />
              <Bar dataKey="pre14Deaths" fill="#ff9ca3" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Card>
    </div>
  );
}
