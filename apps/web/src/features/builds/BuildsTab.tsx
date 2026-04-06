import { Badge, Card, ChampionIdentity } from '../../components/ui';
import type { Dataset } from '../../types';
import { getItemIconUrl } from '../../lib/lol';
import { formatDecimal, formatInteger, formatPercent, formatSignedNumber } from '../../lib/format';
import type { Locale } from '../../lib/i18n';
import { evidenceBadgeLabel, evidenceExplanation, evidenceTone } from '../premium-analysis/evidence';
import { buildChampionBuildWorkbench, type BuildComparison, type BuildExampleMatch, type BuildFamilyAggregate, type ItemImpactAggregate } from './buildWorkbench';

export function BuildsTab({ dataset, locale = 'es' }: { dataset: Dataset; locale?: Locale }) {
  const workspace = buildChampionBuildWorkbench(dataset, locale);

  if (!workspace.ready) {
    return (
      <Card
        title={locale === 'en' ? 'Builds / items lab' : 'Lab de builds / items'}
        subtitle={locale === 'en'
          ? 'This workspace needs the new timeline-enriched snapshots. A fresh sync will unlock item timings, tracked activations and build families.'
          : 'Este workspace necesita los nuevos snapshots enriquecidos con timeline. Un sync fresco va a desbloquear timings de items, activaciones seguidas y familias de build.'}
      >
        <div style={{ display: 'grid', gap: 12, color: '#c8d5e7', lineHeight: 1.7 }}>
          <div>
            {locale === 'en'
              ? 'The implementation is ready, but the visible profile was collected before we started storing purchase events and item milestones.'
              : 'La implementación ya está lista, pero el perfil visible fue recolectado antes de que empezáramos a guardar eventos de compra y milestones de items.'}
          </div>
          <div style={notePanelStyle}>
            {locale === 'en'
              ? 'Next step: refresh the profile so the collector stores first item / second item / boots timings, tracked windows like Cull or Hubris, and enemy composition pressure summaries.'
              : 'Siguiente paso: refrescar el perfil para que el collector guarde timings de primer item / segundo item / botas, ventanas seguidas como Cull o Hubris y resúmenes de presión de composición enemiga.'}
          </div>
        </div>
      </Card>
    );
  }

  const comparisons = workspace.champions.flatMap((champion) => champion.comparisons);
  const strongReads = comparisons.filter((comparison) => comparison.evidenceTier === 'strong').length;
  const weakReads = comparisons.filter((comparison) => comparison.evidenceTier === 'weak').length;

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      <Card
        title={locale === 'en' ? 'Builds / items lab' : 'Lab de builds / items'}
        subtitle={locale === 'en'
          ? 'A premium build system: family comparisons, timing leverage, comp-fit, missing answers and concrete examples.'
          : 'Un sistema premium de builds: comparaciones de familias, leverage de timing, comp-fit, respuestas faltantes y ejemplos concretos.'}
      >
        <div style={{ display: 'grid', gap: 16 }}>
          <div style={topSummaryGridStyle}>
            <SummaryBox
              label={locale === 'en' ? 'Champions with build families' : 'Campeones con familias de build'}
              value={String(workspace.champions.length)}
              hint={locale === 'en' ? 'At least one baseline plus an alternative path.' : 'Al menos un baseline más un path alternativo.'}
            />
            <SummaryBox
              label={locale === 'en' ? 'Strong build reads' : 'Lecturas fuertes de build'}
              value={String(strongReads)}
              hint={locale === 'en' ? 'Families with decent sample and a real change in output.' : 'Familias con muestra decente y un cambio real de output.'}
            />
            <SummaryBox
              label={locale === 'en' ? 'Directional reads' : 'Lecturas direccionales'}
              value={String(weakReads + comparisons.length - strongReads - weakReads)}
              hint={locale === 'en' ? 'Useful for watchlists, not yet a closed answer.' : 'Sirven para watchlists, no todavía como respuesta cerrada.'}
            />
          </div>

          <div style={notePanelStyle}>
            {locale === 'en'
              ? 'Every champion now gets a baseline family, alternative families, timing deltas, early-state and duration splits, comp-fit heuristics, leverage/underperformance by item, and a mini context layer with example matches.'
              : 'Cada campeón ahora recibe una familia baseline, familias alternativas, deltas de timing, cortes por early y duración, heurísticas de comp-fit, leverage/underperformance por item y una mini capa de contexto con partidas ejemplo.'}
          </div>
        </div>
      </Card>

      {workspace.champions.map((champion) => (
        <Card
          key={champion.championName}
          title={champion.championName}
          subtitle={locale === 'en'
            ? `${champion.games} visible games. The baseline is the most repeated build family for this champion in the current sample.`
            : `${champion.games} partidas visibles. El baseline es la familia de build más repetida para este campeón en la muestra actual.`}
        >
          <div style={{ display: 'grid', gap: 18 }}>
            <ChampionIdentity
              championName={champion.championName}
              version={dataset.ddragonVersion}
              subtitle={champion.headline}
              meta={<Badge>{locale === 'en' ? `${champion.buildFamilies.length} visible families` : `${champion.buildFamilies.length} familias visibles`}</Badge>}
            />

            <div style={headlinePanelStyle}>{champion.decisionNote}</div>

            {champion.baseline ? <BaselineBuildPanel dataset={dataset} baseline={champion.baseline} locale={locale} /> : null}

            {champion.comparisons.length ? (
              <div style={{ display: 'grid', gap: 12 }}>
                {champion.comparisons.slice(0, 3).map((comparison) => (
                  <BuildComparisonCard key={`${comparison.variant.key}-${comparison.variant.label}`} dataset={dataset} comparison={comparison} locale={locale} />
                ))}
              </div>
            ) : (
              <div style={emptyStateStyle}>
                {locale === 'en'
                  ? 'There is still only one clear family for this champion, so the workspace tracks timings, comp-fit and item signals without forcing fake build-versus-build claims.'
                  : 'Todavía hay una sola familia clara para este campeón, así que el workspace sigue timings, comp-fit y señales por item sin forzar claims falsos de build contra build.'}
              </div>
            )}

            <div style={signalGridStyle}>
              <ItemSignalColumn
                title={locale === 'en' ? 'Items with leverage' : 'Items con leverage'}
                emptyLabel={locale === 'en' ? 'Still no item shows a clean positive lift.' : 'Todavía no aparece un item con lift positivo limpio.'}
                items={champion.topItems}
                dataset={dataset}
                locale={locale}
              />
              <ItemSignalColumn
                title={locale === 'en' ? 'Items underperforming' : 'Items flojos'}
                emptyLabel={locale === 'en' ? 'Still no weak item pattern is visible.' : 'Todavía no aparece un patrón claro de item flojo.'}
                items={champion.weakItems}
                dataset={dataset}
                locale={locale}
              />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

function SummaryBox({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div style={summaryBoxStyle}>
      <div style={summaryLabelStyle}>{label}</div>
      <div style={summaryValueStyle}>{value}</div>
      <div style={summaryHintStyle}>{hint}</div>
    </div>
  );
}

function BaselineBuildPanel({ dataset, baseline, locale }: { dataset: Dataset; baseline: BuildFamilyAggregate; locale: Locale }) {
  return (
    <div style={baselineCardStyle}>
      <div style={{ display: 'grid', gap: 6 }}>
        <div style={sectionLabelStyle}>{locale === 'en' ? 'Baseline family' : 'Familia baseline'}</div>
        <div style={{ color: '#f4fbff', fontSize: 20, fontWeight: 800 }}>{baseline.label}</div>
        <div style={{ color: '#90a0b5', lineHeight: 1.6 }}>
          {locale === 'en'
            ? `${baseline.games} games · ${formatPercent(baseline.winRate)} WR · ${formatDecimal(baseline.avgScore)} average score`
            : `${baseline.games} partidas · ${formatPercent(baseline.winRate)} WR · ${formatDecimal(baseline.avgScore)} de score medio`}
        </div>
      </div>

      <div style={metricsGridStyle}>
        <MetricBox label={locale === 'en' ? 'Total damage' : 'Daño total'} value={formatInteger(baseline.avgTotalDamage)} />
        <MetricBox label={locale === 'en' ? 'Damage to champs' : 'Daño a champs'} value={formatInteger(baseline.avgDamageToChampions)} />
        <MetricBox label="CS@15" value={formatDecimal(baseline.avgCsAt15)} />
        <MetricBox label="GD@15" value={formatInteger(baseline.avgGoldDiffAt15)} />
        <MetricBox label={locale === 'en' ? '1st item' : '1er item'} value={baseline.avgFirstItemMinute !== null ? `${formatDecimal(baseline.avgFirstItemMinute)}m` : '—'} />
        <MetricBox label={locale === 'en' ? '2nd item' : '2do item'} value={baseline.avgSecondItemMinute !== null ? `${formatDecimal(baseline.avgSecondItemMinute)}m` : '—'} />
        <MetricBox label={locale === 'en' ? 'Boots' : 'Botas'} value={baseline.avgBootsMinute !== null ? `${formatDecimal(baseline.avgBootsMinute)}m` : '—'} />
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        {baseline.topItems.map((itemId) => <ItemPill key={`${baseline.key}-${itemId}`} dataset={dataset} itemId={itemId} />)}
        {baseline.bootsId ? <ItemPill dataset={dataset} itemId={baseline.bootsId} /> : null}
        <div style={contextPillStyle}>
          <strong>{locale === 'en' ? 'Comp fit' : 'Comp fit'}</strong>
          <span>{baseline.compFitLabel}</span>
        </div>
        <div style={contextPillStyle}>
          <strong>{locale === 'en' ? 'Enemy pressure' : 'Presión rival'}</strong>
          <span>{baseline.pressureProfile.replaceAll('_', ' ')}</span>
        </div>
      </div>

      <div className="build-context-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }}>
        <ContextCard
          title={locale === 'en' ? 'Early state' : 'Estado del early'}
          lines={[
            `${locale === 'en' ? 'Stable' : 'Estable'} ${baseline.earlyStateProfile.stable}%`,
            `${locale === 'en' ? 'Scrappy' : 'Tenso'} ${baseline.earlyStateProfile.scrappy}%`,
            `${locale === 'en' ? 'Volatile' : 'Volátil'} ${baseline.earlyStateProfile.volatile}%`
          ]}
        />
        <ContextCard
          title={locale === 'en' ? 'Duration split' : 'Split por duración'}
          lines={[
            `${locale === 'en' ? 'Short' : 'Corta'} ${baseline.durationProfile.short}%`,
            `${locale === 'en' ? 'Standard' : 'Media'} ${baseline.durationProfile.standard}%`,
            `${locale === 'en' ? 'Long' : 'Larga'} ${baseline.durationProfile.long}%`
          ]}
        />
        <ContextCard
          title={locale === 'en' ? 'Plan quality' : 'Calidad del plan'}
          lines={[
            `${locale === 'en' ? 'Volatility' : 'Volatilidad'} ${formatDecimal(baseline.avgLaneVolatility)}`,
            `${locale === 'en' ? 'Reset' : 'Reset'} ${formatDecimal(baseline.avgResetTiming)}`,
            `${locale === 'en' ? 'Setup' : 'Setup'} ${formatDecimal(baseline.avgObjectiveSetup)}`
          ]}
        />
      </div>

      {baseline.missingResponseLabel ? <div style={warningCalloutStyle}>{baseline.missingResponseLabel}</div> : null}

      {baseline.trackedWindows.length ? (
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {baseline.trackedWindows.map((window) => (
            <div key={`${baseline.key}-${window.label}`} style={trackingPillStyle}>
              <strong>{window.label}</strong>
              <span>{formatDecimal(window.minute)}m · {window.coverage}%</span>
            </div>
          ))}
        </div>
      ) : null}

      <ExampleMatchesPanel examples={baseline.examples} locale={locale} />
    </div>
  );
}

function BuildComparisonCard({ dataset, comparison, locale }: { dataset: Dataset; comparison: BuildComparison; locale: Locale }) {
  return (
    <div style={comparisonCardStyle}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'start' }}>
        <div style={{ display: 'grid', gap: 5 }}>
          <div style={sectionLabelStyle}>{locale === 'en' ? 'Alternative family' : 'Familia alternativa'}</div>
          <div style={{ color: '#eef4ff', fontSize: 18, fontWeight: 800 }}>{comparison.variant.label}</div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {comparison.variant.topItems.map((itemId) => <ItemPill key={`${comparison.variant.key}-${itemId}`} dataset={dataset} itemId={itemId} />)}
            {comparison.variant.bootsId ? <ItemPill dataset={dataset} itemId={comparison.variant.bootsId} /> : null}
          </div>
        </div>
        <Badge tone={evidenceTone(comparison.evidenceTier)}>
          {evidenceBadgeLabel(comparison.evidenceTier, locale)}
        </Badge>
      </div>

      <div style={deltaGridStyle}>
        <DeltaBox label="WR" value={formatSignedNumber(comparison.deltas.winRate, 1, '%')} />
        <DeltaBox label={locale === 'en' ? 'Score' : 'Score'} value={formatSignedNumber(comparison.deltas.score)} />
        <DeltaBox label={locale === 'en' ? 'Champ dmg' : 'Daño champs'} value={formatSignedNumber(comparison.deltas.damageToChampions, 0)} />
        <DeltaBox label="CS@15" value={formatSignedNumber(comparison.deltas.csAt15)} />
        <DeltaBox label="GD@15" value={formatSignedNumber(comparison.deltas.goldDiffAt15, 0)} />
        <DeltaBox label={locale === 'en' ? 'Pre14 deaths' : 'Muertes pre14'} value={formatSignedNumber(comparison.deltas.deathsPre14)} />
        <DeltaBox label={locale === 'en' ? 'Volatility' : 'Volatilidad'} value={formatSignedNumber(comparison.deltas.laneVolatility)} />
        <DeltaBox label={locale === 'en' ? '1st item' : '1er item'} value={comparison.deltas.firstItemMinute !== null ? formatSignedNumber(comparison.deltas.firstItemMinute, 1, 'm') : '—'} />
      </div>

      <div style={{ display: 'grid', gap: 8 }}>
        <div style={{ color: '#f2f8ff', fontWeight: 700, lineHeight: 1.65 }}>{comparison.summary}</div>
        {comparison.pressureNote ? <div style={{ color: '#9ba9bc', lineHeight: 1.6 }}>{comparison.pressureNote}</div> : null}
        {comparison.leverageNote ? <div style={recommendationBoxStyle}>{comparison.leverageNote}</div> : null}
        <div className="build-decision-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
          <DecisionCard title={locale === 'en' ? 'Best when' : 'Rinde más cuando'} value={comparison.bestWhen ?? (locale === 'en' ? 'No clear edge yet.' : 'Todavía no aparece un edge claro.')} />
          <DecisionCard title={locale === 'en' ? 'Careful when' : 'Ojo cuando'} value={comparison.avoidWhen ?? (locale === 'en' ? 'No clear avoid-case yet.' : 'Todavía no aparece un avoid-case claro.')} />
        </div>
        {comparison.recommendation ? <div style={warningCalloutStyle}>{comparison.recommendation}</div> : null}
        <ExampleMatchesPanel examples={comparison.variant.examples} locale={locale} />
        <div style={{ color: '#7f8da2', fontSize: 12, lineHeight: 1.6 }}>
          {evidenceExplanation(comparison.evidenceTier, locale, comparison.baseline.games + comparison.variant.games, comparison.constraint)}
        </div>
      </div>
    </div>
  );
}

function ItemSignalColumn({
  title,
  emptyLabel,
  items,
  dataset,
  locale
}: {
  title: string;
  emptyLabel: string;
  items: ItemImpactAggregate[];
  dataset: Dataset;
  locale: Locale;
}) {
  return (
    <div style={signalColumnStyle}>
      <div style={sectionLabelStyle}>{title}</div>
      {items.length ? (
        <div style={{ display: 'grid', gap: 10 }}>
          {items.map((item) => (
            <div key={`${title}-${item.itemId}`} style={itemImpactCardStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                  <ItemPill dataset={dataset} itemId={item.itemId} compact />
                  <div style={{ display: 'grid', gap: 3 }}>
                    <div style={{ color: '#eef4ff', fontWeight: 700 }}>{item.name}</div>
                    <div style={{ color: '#8d9bb0', fontSize: 12 }}>
                      {item.games} · {formatDecimal(item.usageShare)}% · {item.utilityLabel}
                    </div>
                  </div>
                </div>
                <Badge tone={evidenceTone(item.evidenceTier)}>{evidenceBadgeLabel(item.evidenceTier, locale)}</Badge>
              </div>

              <div style={itemImpactMetricsStyle}>
                <DeltaBox label="WR" value={formatSignedNumber(item.winRateDelta, 1, '%')} />
                <DeltaBox label={locale === 'en' ? 'Score' : 'Score'} value={formatSignedNumber(item.scoreDelta)} />
                <DeltaBox label={locale === 'en' ? 'Champ dmg' : 'Daño champs'} value={formatSignedNumber(item.damageDelta, 0)} />
                <DeltaBox label={locale === 'en' ? 'Stable early' : 'Early estable'} value={formatSignedNumber(item.earlyStateDelta, 1, '%')} />
                <DeltaBox label={locale === 'en' ? 'Completion' : 'Completa'} value={item.avgCompletionMinute !== null ? `${formatDecimal(item.avgCompletionMinute)}m` : '—'} />
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div style={emptyStateStyle}>{emptyLabel}</div>
      )}
    </div>
  );
}

function ExampleMatchesPanel({ examples, locale }: { examples: BuildExampleMatch[]; locale: Locale }) {
  if (!examples.length) return null;
  return (
    <div style={{ display: 'grid', gap: 10 }}>
      <div style={sectionLabelStyle}>{locale === 'en' ? 'Match explorer' : 'Match explorer'}</div>
      <div className="example-match-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }}>
        {examples.map((example) => (
          <div key={example.matchId} style={exampleCardStyle}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }}>
              <div style={{ color: '#eef4ff', fontWeight: 800 }}>{example.opponentChampionName ? `vs ${example.opponentChampionName}` : (locale === 'en' ? 'Match sample' : 'Partida muestra')}</div>
              <Badge tone={example.win ? 'low' : 'high'}>{example.win ? 'Win' : 'Loss'}</Badge>
            </div>
            <div style={{ color: '#8ea0b6', fontSize: 13, lineHeight: 1.55 }}>
              {new Date(example.gameCreation).toLocaleDateString(locale === 'en' ? 'en-US' : 'es-AR')}
            </div>
            <div style={{ display: 'grid', gap: 5 }}>
              <div style={{ color: '#eef4ff' }}>{`Score ${formatDecimal(example.score)} · ${formatInteger(example.damageToChampions)} dmg`}</div>
              <div style={{ color: '#8ea0b6' }}>{`CS@15 ${formatDecimal(example.csAt15)} · GD@15 ${formatInteger(example.goldDiffAt15)}`}</div>
              <div style={{ color: '#8ea0b6' }}>
                {`1st ${example.firstItemMinute ? `${formatDecimal(example.firstItemMinute)}m` : '—'} · 2nd ${example.secondItemMinute ? `${formatDecimal(example.secondItemMinute)}m` : '—'} · Boots ${example.bootsMinute ? `${formatDecimal(example.bootsMinute)}m` : '—'}`}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MetricBox({ label, value }: { label: string; value: string }) {
  return (
    <div style={metricBoxStyle}>
      <div style={metricLabelStyle}>{label}</div>
      <div style={metricValueStyle}>{value}</div>
    </div>
  );
}

function DeltaBox({ label, value }: { label: string; value: string }) {
  return (
    <div style={deltaBoxStyle}>
      <div style={metricLabelStyle}>{label}</div>
      <div style={deltaValueStyle}>{value}</div>
    </div>
  );
}

function ContextCard({ title, lines }: { title: string; lines: string[] }) {
  return (
    <div style={contextCardStyle}>
      <div style={sectionLabelStyle}>{title}</div>
      <div style={{ display: 'grid', gap: 4 }}>
        {lines.map((line) => <div key={line} style={{ color: '#dce6f5', lineHeight: 1.5 }}>{line}</div>)}
      </div>
    </div>
  );
}

function DecisionCard({ title, value }: { title: string; value: string }) {
  return (
    <div style={decisionCardStyle}>
      <div style={sectionLabelStyle}>{title}</div>
      <div style={{ color: '#ecf3ff', lineHeight: 1.6 }}>{value}</div>
    </div>
  );
}

function ItemPill({ dataset, itemId, compact = false }: { dataset: Dataset; itemId: number; compact?: boolean }) {
  const icon = getItemIconUrl(itemId, dataset.ddragonVersion);
  const item = dataset.itemCatalog?.[String(itemId)];
  return (
    <div style={compact ? compactItemPillStyle : itemPillStyle}>
      {icon ? <img src={icon} alt={item?.name ?? String(itemId)} width={compact ? 24 : 28} height={compact ? 24 : 28} style={itemIconStyle} /> : null}
      <span>{item?.name ?? `Item ${itemId}`}</span>
    </div>
  );
}

const topSummaryGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
  gap: 12
} as const;

const summaryBoxStyle = {
  display: 'grid',
  gap: 8,
  padding: '14px 15px',
  borderRadius: 16,
  background: '#070d15',
  border: '1px solid rgba(255,255,255,0.06)'
} as const;

const summaryLabelStyle = {
  color: '#7d8ba0',
  fontSize: 11,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.08em'
} as const;

const summaryValueStyle = {
  color: '#f4fbff',
  fontSize: 30,
  fontWeight: 800
} as const;

const summaryHintStyle = {
  color: '#8fa0b5',
  lineHeight: 1.6
} as const;

const notePanelStyle = {
  padding: '13px 14px',
  borderRadius: 16,
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.05)',
  color: '#cbd7e8',
  lineHeight: 1.7
} as const;

const headlinePanelStyle = {
  padding: '14px 15px',
  borderRadius: 18,
  background: 'rgba(125,174,255,0.07)',
  border: '1px solid rgba(125,174,255,0.12)',
  color: '#deebff',
  lineHeight: 1.65
} as const;

const baselineCardStyle = {
  display: 'grid',
  gap: 14,
  padding: '15px 16px',
  borderRadius: 18,
  background: 'linear-gradient(180deg, rgba(14,22,35,0.96), rgba(7,12,19,0.98))',
  border: '1px solid rgba(255,255,255,0.06)'
} as const;

const sectionLabelStyle = {
  color: '#7f8da2',
  fontSize: 11,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.08em'
} as const;

const metricsGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
  gap: 10
} as const;

const metricBoxStyle = {
  display: 'grid',
  gap: 6,
  padding: '11px 12px',
  borderRadius: 14,
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.05)'
} as const;

const metricLabelStyle = {
  color: '#7d8ba0',
  fontSize: 11,
  textTransform: 'uppercase' as const,
  letterSpacing: '0.06em'
} as const;

const metricValueStyle = {
  color: '#f0f6ff',
  fontSize: 17,
  fontWeight: 800
} as const;

const comparisonCardStyle = {
  display: 'grid',
  gap: 14,
  padding: '15px 16px',
  borderRadius: 16,
  background: '#070d15',
  border: '1px solid rgba(255,255,255,0.06)'
} as const;

const deltaGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
  gap: 10
} as const;

const deltaBoxStyle = {
  display: 'grid',
  gap: 6,
  padding: '11px 12px',
  borderRadius: 14,
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.05)'
} as const;

const deltaValueStyle = {
  color: '#f4fbff',
  fontSize: 17,
  fontWeight: 800
} as const;

const itemPillStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  padding: '8px 10px',
  borderRadius: 999,
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.05)',
  color: '#d7e2f1',
  fontSize: 12,
  whiteSpace: 'nowrap' as const
} as const;

const compactItemPillStyle = {
  ...itemPillStyle,
  padding: '6px 8px'
} as const;

const itemIconStyle = {
  borderRadius: 8,
  border: '1px solid rgba(255,255,255,0.08)'
} as const;

const contextPillStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  padding: '8px 10px',
  borderRadius: 999,
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.05)',
  color: '#cdd8e8',
  fontSize: 12
} as const;

const trackingPillStyle = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 8,
  padding: '8px 10px',
  borderRadius: 999,
  background: 'rgba(126,245,199,0.08)',
  border: '1px solid rgba(126,245,199,0.12)',
  color: '#d7f7e9',
  fontSize: 12
} as const;

const warningCalloutStyle = {
  padding: '10px 12px',
  borderRadius: 14,
  background: 'rgba(255,196,82,0.07)',
  border: '1px solid rgba(255,196,82,0.14)',
  color: '#e6d3a4',
  lineHeight: 1.6
} as const;

const recommendationBoxStyle = {
  padding: '10px 12px',
  borderRadius: 14,
  background: 'rgba(126,245,199,0.08)',
  border: '1px solid rgba(126,245,199,0.12)',
  color: '#d7f7e9',
  lineHeight: 1.6
} as const;

const emptyStateStyle = {
  padding: '14px 15px',
  borderRadius: 14,
  background: 'rgba(255,255,255,0.03)',
  border: '1px dashed rgba(255,255,255,0.08)',
  color: '#9aa7ba',
  lineHeight: 1.7
} as const;

const signalGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
  gap: 12
} as const;

const signalColumnStyle = {
  display: 'grid',
  gap: 12,
  padding: '14px 15px',
  borderRadius: 16,
  background: '#070d15',
  border: '1px solid rgba(255,255,255,0.06)'
} as const;

const itemImpactCardStyle = {
  display: 'grid',
  gap: 10,
  padding: '12px 13px',
  borderRadius: 14,
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.05)'
} as const;

const itemImpactMetricsStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(92px, 1fr))',
  gap: 8
} as const;

const contextCardStyle = {
  display: 'grid',
  gap: 8,
  padding: '11px 12px',
  borderRadius: 14,
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.05)'
} as const;

const decisionCardStyle = {
  display: 'grid',
  gap: 8,
  padding: '11px 12px',
  borderRadius: 14,
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.05)'
} as const;

const exampleCardStyle = {
  display: 'grid',
  gap: 8,
  padding: '11px 12px',
  borderRadius: 14,
  background: 'rgba(255,255,255,0.03)',
  border: '1px solid rgba(255,255,255,0.05)'
} as const;
