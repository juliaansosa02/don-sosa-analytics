import { Card, Badge, InfoHint } from '../../components/ui';
import type { Dataset } from '../../types';
import { useMemo, useState } from 'react';
import { getChampionIconUrl } from '../../lib/lol';
import { formatDecimal, formatInteger, formatPercent } from '../../lib/format';

const classificationLabel: Record<string, string> = {
  CORE_PICK: 'PICK PRINCIPAL',
  COMFORT_TRAP: 'COMFORT TRAP',
  POCKET_PICK: 'POCKET PICK',
  UNSTABLE: 'INESTABLE'
};

export function ChampionPoolTab({ dataset }: { dataset: Dataset }) {
  const [sortKey, setSortKey] = useState<'games' | 'winRate' | 'avgScore' | 'avgCsAt15' | 'avgGoldAt15' | 'avgDeathsPre14'>('games');
  const sortedPool = useMemo(() => {
    const items = [...dataset.summary.championPool];
    return items.sort((a, b) => {
      const direction = sortKey === 'avgDeathsPre14' ? 1 : -1;
      return ((a[sortKey] as number) - (b[sortKey] as number)) * direction;
    });
  }, [dataset.summary.championPool, sortKey]);

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <Card title="Champion pool" subtitle="Qué campeones te dan una base confiable y cuáles necesitan más criterio de uso">
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 16, flexWrap: 'wrap' }}>
          <div style={{ color: '#8894a7', fontSize: 13 }}>Ordená para leer tu pool según rendimiento, volumen o economía temprana.</div>
          <select value={sortKey} onChange={(event) => setSortKey(event.target.value as typeof sortKey)} style={sortSelectStyle}>
            <option value="games">Más partidas</option>
            <option value="winRate">Mayor win rate</option>
            <option value="avgScore">Mayor performance</option>
            <option value="avgCsAt15">Mayor CS a los 15</option>
            <option value="avgGoldAt15">Mayor oro a los 15</option>
            <option value="avgDeathsPre14">Menos muertes pre 14</option>
          </select>
        </div>
        <div style={headerRowStyle}>
          <HeaderLabel label="Campeón" info="Campeones ordenados por volumen dentro de la muestra actual." />
          <HeaderLabel label="Partidas" info="Cantidad de partidas jugadas con ese campeón en la muestra filtrada." />
          <HeaderLabel label="Win rate" info="Porcentaje de victorias con ese campeón." />
          <HeaderLabel label="Performance" info="Promedio del índice interno de ejecución con ese campeón." />
          <HeaderLabel label="CS a los 15 min" info="Economía media temprana con ese campeón." />
          <HeaderLabel label="Oro a los 15 min" info="Valor económico medio conseguido antes del mid game." />
          <HeaderLabel label="Muertes pre 14" info="Cantidad media de muertes tempranas con ese campeón." />
        </div>

        <div style={{ display: 'grid', gap: 12 }}>
          {sortedPool.map((champion) => {
            const iconUrl = getChampionIconUrl(champion.championName, dataset.ddragonVersion);

            return (
              <div key={champion.championName} style={cardStyle}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  {iconUrl ? <img src={iconUrl} alt={champion.championName} width={52} height={52} style={iconStyle} /> : null}
                  <div style={{ display: 'grid', gap: 6 }}>
                    <div style={{ fontSize: 18, fontWeight: 700 }}>{champion.championName}</div>
                    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                      <Badge tone={badgeTone(champion.classification)}>{classificationLabel[champion.classification] ?? champion.classification}</Badge>
                    </div>
                  </div>
                </div>

                <div className="six-col-grid" style={metricGridStyle}>
                  <MetricBlock label="Partidas" value={formatInteger(champion.games)} info="Volumen de uso del campeón en esta muestra." />
                  <MetricBlock label="Win rate" value={formatPercent(champion.winRate)} info="Resultado competitivo del campeón dentro de tu muestra actual." />
                  <MetricBlock label="Performance" value={formatDecimal(champion.avgScore)} info="Cómo se ve tu ejecución general cuando jugás este campeón." />
                  <MetricBlock label="CS a los 15 min" value={formatDecimal(champion.avgCsAt15)} info="Farmeo temprano medio con este campeón." />
                  <MetricBlock label="Oro a los 15 min" value={formatInteger(champion.avgGoldAt15)} info="Cuánto valor económico generás temprano con este campeón." />
                  <MetricBlock label="Muertes pre 14" value={formatDecimal(champion.avgDeathsPre14)} info="Qué tan limpio o castigado suele ser tu early con este campeón." />
                </div>
              </div>
            );
          })}
        </div>
      </Card>
    </div>
  );
}

function HeaderLabel({ label, info }: { label: string; info: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      <span>{label}</span>
      <InfoHint text={info} />
    </div>
  );
}

function MetricBlock({ label, value, info }: { label: string; value: string; info: string }) {
  return (
    <div style={metricBlockStyle}>
      <div style={{ ...metricLabelStyle, display: 'flex', alignItems: 'center' }}>
        {label}
        <InfoHint text={info} />
      </div>
      <div style={metricValueStyle}>{value}</div>
    </div>
  );
}

function badgeTone(classification: string): 'low' | 'medium' | 'high' | 'default' {
  if (classification === 'CORE_PICK' || classification === 'POCKET_PICK') return 'low';
  if (classification === 'COMFORT_TRAP') return 'high';
  return 'default';
}

const headerRowStyle = {
  display: 'grid',
  gridTemplateColumns: '1.4fr repeat(6, minmax(0, 1fr))',
  gap: 12,
  color: '#6f7886',
  fontSize: 12,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.08em',
  marginBottom: 12,
  paddingInline: 4
};

const cardStyle = {
  display: 'grid',
  gap: 16,
  padding: 18,
  borderRadius: 16,
  background: '#060a10',
  border: '1px solid rgba(255,255,255,0.06)'
} as const;

const metricGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(6, minmax(0, 1fr))',
  gap: 12
} as const;

const metricBlockStyle = {
  padding: '12px 10px',
  borderRadius: 12,
  background: '#090e16',
  border: '1px solid rgba(255,255,255,0.04)'
} as const;

const metricLabelStyle = {
  color: '#758091',
  fontSize: 12,
  marginBottom: 8
} as const;

const metricValueStyle = {
  color: '#f4f7fb',
  fontSize: 20,
  fontWeight: 700
} as const;

const iconStyle = {
  borderRadius: 14,
  border: '1px solid rgba(255,255,255,0.08)'
} as const;

const sortSelectStyle = {
  minWidth: 220,
  padding: '11px 12px',
  borderRadius: 12,
  border: '1px solid rgba(255,255,255,0.08)',
  background: '#070b12',
  color: '#edf2ff'
} as const;
