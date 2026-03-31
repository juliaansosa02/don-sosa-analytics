import { Card, Badge } from '../../components/ui';
import type { Dataset } from '../../types';

export function CoachTab({ dataset }: { dataset: Dataset }) {
  return (
    <div style={{ display: 'grid', gap: 16 }}>
      {dataset.summary.insights.map((insight) => (
        <Card key={insight.id} title={insight.title} subtitle={insight.category}>
          <div style={{ display: 'grid', gap: 10, color: '#c7d4ea' }}>
            <Badge tone={insight.priority}>{insight.priority.toUpperCase()}</Badge>
            <div><strong>Problema:</strong> {insight.problem}</div>
            <div><strong>Evidencia:</strong> {insight.evidence.join(' ')}</div>
            <div><strong>Impacto:</strong> {insight.impact}</div>
            <div><strong>Causa:</strong> {insight.cause}</div>
            <div><strong>Acción:</strong> {insight.actions.join(' ')}</div>
          </div>
        </Card>
      ))}
    </div>
  );
}
