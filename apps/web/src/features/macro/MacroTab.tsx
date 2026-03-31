import { Card, KPI } from '../../components/ui';
import type { Dataset } from '../../types';

export function MacroTab({ dataset }: { dataset: Dataset }) {
  const avgObjectiveDeaths = dataset.matches.reduce((sum, match) => sum + match.timeline.objectiveFightDeaths, 0) / Math.max(dataset.matches.length, 1);
  const avgMacro = dataset.matches.reduce((sum, match) => sum + match.score.macro, 0) / Math.max(dataset.matches.length, 1);

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 12 }}>
        <KPI label="Macro score" value={avgMacro.toFixed(1)} hint="Conversión de mapa" />
        <KPI label="Deaths near objectives" value={avgObjectiveDeaths.toFixed(1)} hint="Costo previo a drag/heraldo/barón" />
        <KPI label="Vision" value={dataset.summary.avgVisionScore.toFixed(1)} hint="Setup y seguridad" />
      </div>

      <Card title="Qué mirar en esta sección" subtitle="Esta vista está diseñada para el salto de elo desde decisiones de mapa">
        <ul style={{ margin: 0, paddingLeft: 18, color: '#c7d4ea', lineHeight: 1.8 }}>
          <li>¿Morís antes de los objetivos?</li>
          <li>¿Tu ventaja de línea se convierte en torre, dragón o heraldo?</li>
          <li>¿Estás llegando tarde a ventanas de reset y setup?</li>
        </ul>
      </Card>
    </div>
  );
}
