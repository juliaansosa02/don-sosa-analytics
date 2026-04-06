import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Badge, Card, ChampionIdentity } from '../../components/ui';
import { getItemIconUrl } from '../../lib/lol';
import { formatDecimal, formatInteger, formatPercent, formatSignedNumber } from '../../lib/format';
import { evidenceBadgeLabel, evidenceExplanation, evidenceTone } from '../premium-analysis/evidence';
import { buildChampionBuildWorkbench } from './buildWorkbench';
export function BuildsTab({ dataset, locale = 'es' }) {
    const workspace = buildChampionBuildWorkbench(dataset, locale);
    if (!workspace.ready) {
        return (_jsx(Card, { title: locale === 'en' ? 'Builds / items lab' : 'Lab de builds / items', subtitle: locale === 'en'
                ? 'This workspace needs the new timeline-enriched snapshots. A fresh sync will unlock item timings, tracked activations and build families.'
                : 'Este workspace necesita los nuevos snapshots enriquecidos con timeline. Un sync fresco va a desbloquear timings de items, activaciones seguidas y familias de build.', children: _jsxs("div", { style: { display: 'grid', gap: 12, color: '#c8d5e7', lineHeight: 1.7 }, children: [_jsx("div", { children: locale === 'en'
                            ? 'The implementation is ready, but the visible profile was collected before we started storing purchase events and item milestones.'
                            : 'La implementación ya está lista, pero el perfil visible fue recolectado antes de que empezáramos a guardar eventos de compra y milestones de items.' }), _jsx("div", { style: notePanelStyle, children: locale === 'en'
                            ? 'Next step: refresh the profile so the collector stores first item / second item / boots timings, tracked windows like Cull or Hubris, and enemy composition pressure summaries.'
                            : 'Siguiente paso: refrescar el perfil para que el collector guarde timings de primer item / segundo item / botas, ventanas seguidas como Cull o Hubris y resúmenes de presión de composición enemiga.' })] }) }));
    }
    const comparisons = workspace.champions.flatMap((champion) => champion.comparisons);
    const strongReads = comparisons.filter((comparison) => comparison.evidenceTier === 'strong').length;
    const weakReads = comparisons.filter((comparison) => comparison.evidenceTier === 'weak').length;
    return (_jsxs("div", { style: { display: 'grid', gap: 18 }, children: [_jsx(Card, { title: locale === 'en' ? 'Builds / items lab' : 'Lab de builds / items', subtitle: locale === 'en'
                    ? 'A premium build system: family comparisons, timing leverage, comp-fit, missing answers and concrete examples.'
                    : 'Un sistema premium de builds: comparaciones de familias, leverage de timing, comp-fit, respuestas faltantes y ejemplos concretos.', children: _jsxs("div", { style: { display: 'grid', gap: 16 }, children: [_jsxs("div", { style: topSummaryGridStyle, children: [_jsx(SummaryBox, { label: locale === 'en' ? 'Champions with build families' : 'Campeones con familias de build', value: String(workspace.champions.length), hint: locale === 'en' ? 'At least one baseline plus an alternative path.' : 'Al menos un baseline más un path alternativo.' }), _jsx(SummaryBox, { label: locale === 'en' ? 'Strong build reads' : 'Lecturas fuertes de build', value: String(strongReads), hint: locale === 'en' ? 'Families with decent sample and a real change in output.' : 'Familias con muestra decente y un cambio real de output.' }), _jsx(SummaryBox, { label: locale === 'en' ? 'Directional reads' : 'Lecturas direccionales', value: String(weakReads + comparisons.length - strongReads - weakReads), hint: locale === 'en' ? 'Useful for watchlists, not yet a closed answer.' : 'Sirven para watchlists, no todavía como respuesta cerrada.' })] }), _jsx("div", { style: notePanelStyle, children: locale === 'en'
                                ? 'Every champion now gets a baseline family, alternative families, timing deltas, early-state and duration splits, comp-fit heuristics, leverage/underperformance by item, and a mini context layer with example matches.'
                                : 'Cada campeón ahora recibe una familia baseline, familias alternativas, deltas de timing, cortes por early y duración, heurísticas de comp-fit, leverage/underperformance por item y una mini capa de contexto con partidas ejemplo.' })] }) }), workspace.champions.map((champion) => (_jsx(Card, { title: champion.championName, subtitle: locale === 'en'
                    ? `${champion.games} visible games. The baseline is the most repeated build family for this champion in the current sample.`
                    : `${champion.games} partidas visibles. El baseline es la familia de build más repetida para este campeón en la muestra actual.`, children: _jsxs("div", { style: { display: 'grid', gap: 18 }, children: [_jsx(ChampionIdentity, { championName: champion.championName, version: dataset.ddragonVersion, subtitle: champion.headline, meta: _jsx(Badge, { children: locale === 'en' ? `${champion.buildFamilies.length} visible families` : `${champion.buildFamilies.length} familias visibles` }) }), _jsx("div", { style: headlinePanelStyle, children: champion.decisionNote }), champion.baseline ? _jsx(BaselineBuildPanel, { dataset: dataset, baseline: champion.baseline, locale: locale }) : null, champion.comparisons.length ? (_jsx("div", { style: { display: 'grid', gap: 12 }, children: champion.comparisons.slice(0, 3).map((comparison) => (_jsx(BuildComparisonCard, { dataset: dataset, comparison: comparison, locale: locale }, `${comparison.variant.key}-${comparison.variant.label}`))) })) : (_jsx("div", { style: emptyStateStyle, children: locale === 'en'
                                ? 'There is still only one clear family for this champion, so the workspace tracks timings, comp-fit and item signals without forcing fake build-versus-build claims.'
                                : 'Todavía hay una sola familia clara para este campeón, así que el workspace sigue timings, comp-fit y señales por item sin forzar claims falsos de build contra build.' })), _jsxs("div", { style: signalGridStyle, children: [_jsx(ItemSignalColumn, { title: locale === 'en' ? 'Items with leverage' : 'Items con leverage', emptyLabel: locale === 'en' ? 'Still no item shows a clean positive lift.' : 'Todavía no aparece un item con lift positivo limpio.', items: champion.topItems, dataset: dataset, locale: locale }), _jsx(ItemSignalColumn, { title: locale === 'en' ? 'Items underperforming' : 'Items flojos', emptyLabel: locale === 'en' ? 'Still no weak item pattern is visible.' : 'Todavía no aparece un patrón claro de item flojo.', items: champion.weakItems, dataset: dataset, locale: locale })] })] }) }, champion.championName)))] }));
}
function SummaryBox({ label, value, hint }) {
    return (_jsxs("div", { style: summaryBoxStyle, children: [_jsx("div", { style: summaryLabelStyle, children: label }), _jsx("div", { style: summaryValueStyle, children: value }), _jsx("div", { style: summaryHintStyle, children: hint })] }));
}
function BaselineBuildPanel({ dataset, baseline, locale }) {
    const timingMetrics = [
        ...(baseline.avgFirstItemMinute !== null ? [{ label: locale === 'en' ? '1st item' : '1er item', value: `${formatDecimal(baseline.avgFirstItemMinute)}m` }] : []),
        ...(baseline.avgSecondItemMinute !== null ? [{ label: locale === 'en' ? '2nd item' : '2do item', value: `${formatDecimal(baseline.avgSecondItemMinute)}m` }] : []),
        ...(baseline.avgBootsMinute !== null ? [{ label: locale === 'en' ? 'Boots' : 'Botas', value: `${formatDecimal(baseline.avgBootsMinute)}m` }] : [])
    ];
    return (_jsxs("div", { style: baselineCardStyle, children: [_jsxs("div", { style: { display: 'grid', gap: 6 }, children: [_jsx("div", { style: sectionLabelStyle, children: locale === 'en' ? 'Baseline family' : 'Familia baseline' }), _jsx("div", { style: { color: '#f4fbff', fontSize: 20, fontWeight: 800 }, children: baseline.label }), _jsx("div", { style: { color: '#90a0b5', lineHeight: 1.6 }, children: locale === 'en'
                            ? `${baseline.games} games · ${formatPercent(baseline.winRate)} WR · ${formatDecimal(baseline.avgScore)} average score`
                            : `${baseline.games} partidas · ${formatPercent(baseline.winRate)} WR · ${formatDecimal(baseline.avgScore)} de score medio` })] }), _jsxs("div", { style: metricsGridStyle, children: [_jsx(MetricBox, { label: locale === 'en' ? 'Total damage' : 'Daño total', value: formatInteger(baseline.avgTotalDamage) }), _jsx(MetricBox, { label: locale === 'en' ? 'Damage to champs' : 'Daño a champs', value: formatInteger(baseline.avgDamageToChampions) }), _jsx(MetricBox, { label: "CS@15", value: formatDecimal(baseline.avgCsAt15) }), _jsx(MetricBox, { label: "GD@15", value: formatInteger(baseline.avgGoldDiffAt15) }), timingMetrics.map((metric) => _jsx(MetricBox, { label: metric.label, value: metric.value }, `${baseline.key}-${metric.label}`))] }), _jsxs("div", { style: { display: 'flex', gap: 8, flexWrap: 'wrap' }, children: [baseline.topItems.map((itemId) => _jsx(ItemPill, { dataset: dataset, itemId: itemId }, `${baseline.key}-${itemId}`)), baseline.bootsId ? _jsx(ItemPill, { dataset: dataset, itemId: baseline.bootsId }) : null, _jsxs("div", { style: contextPillStyle, children: [_jsx("strong", { children: locale === 'en' ? 'Comp fit' : 'Comp fit' }), _jsx("span", { children: baseline.compFitLabel })] }), _jsxs("div", { style: contextPillStyle, children: [_jsx("strong", { children: locale === 'en' ? 'Enemy pressure' : 'Presión rival' }), _jsx("span", { children: baseline.pressureProfile.replaceAll('_', ' ') })] })] }), _jsxs("div", { className: "build-context-grid", style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }, children: [_jsx(ContextCard, { title: locale === 'en' ? 'Early state' : 'Estado del early', lines: [
                            `${locale === 'en' ? 'Stable' : 'Estable'} ${baseline.earlyStateProfile.stable}%`,
                            `${locale === 'en' ? 'Scrappy' : 'Tenso'} ${baseline.earlyStateProfile.scrappy}%`,
                            `${locale === 'en' ? 'Volatile' : 'Volátil'} ${baseline.earlyStateProfile.volatile}%`
                        ] }), _jsx(ContextCard, { title: locale === 'en' ? 'Duration split' : 'Split por duración', lines: [
                            `${locale === 'en' ? 'Short' : 'Corta'} ${baseline.durationProfile.short}%`,
                            `${locale === 'en' ? 'Standard' : 'Media'} ${baseline.durationProfile.standard}%`,
                            `${locale === 'en' ? 'Long' : 'Larga'} ${baseline.durationProfile.long}%`
                        ] }), _jsx(ContextCard, { title: locale === 'en' ? 'Plan quality' : 'Calidad del plan', lines: [
                            `${locale === 'en' ? 'Volatility' : 'Volatilidad'} ${formatDecimal(baseline.avgLaneVolatility)}`,
                            `${locale === 'en' ? 'Reset' : 'Reset'} ${formatDecimal(baseline.avgResetTiming)}`,
                            `${locale === 'en' ? 'Setup' : 'Setup'} ${formatDecimal(baseline.avgObjectiveSetup)}`
                        ] })] }), baseline.missingResponseLabel ? _jsx("div", { style: warningCalloutStyle, children: baseline.missingResponseLabel }) : null, baseline.trackedWindows.length ? (_jsx("div", { style: { display: 'flex', gap: 8, flexWrap: 'wrap' }, children: baseline.trackedWindows.map((window) => (_jsxs("div", { style: trackingPillStyle, children: [_jsx("strong", { children: window.label }), _jsxs("span", { children: [formatDecimal(window.minute), "m \u00B7 ", window.coverage, "%"] })] }, `${baseline.key}-${window.label}`))) })) : null, _jsx(ExampleMatchesPanel, { examples: baseline.examples, locale: locale })] }));
}
function BuildComparisonCard({ dataset, comparison, locale }) {
    const deltaMetrics = [
        { label: 'WR', value: formatSignedNumber(comparison.deltas.winRate, 1, '%') },
        { label: locale === 'en' ? 'Score' : 'Score', value: formatSignedNumber(comparison.deltas.score) },
        { label: locale === 'en' ? 'Champ dmg' : 'Daño champs', value: formatSignedNumber(comparison.deltas.damageToChampions, 0) },
        { label: 'CS@15', value: formatSignedNumber(comparison.deltas.csAt15) },
        { label: 'GD@15', value: formatSignedNumber(comparison.deltas.goldDiffAt15, 0) },
        { label: locale === 'en' ? 'Pre14 deaths' : 'Muertes pre14', value: formatSignedNumber(comparison.deltas.deathsPre14) },
        { label: locale === 'en' ? 'Volatility' : 'Volatilidad', value: formatSignedNumber(comparison.deltas.laneVolatility) },
        ...(comparison.deltas.firstItemMinute !== null
            ? [{ label: locale === 'en' ? '1st item' : '1er item', value: formatSignedNumber(comparison.deltas.firstItemMinute, 1, 'm') }]
            : [])
    ];
    return (_jsxs("div", { style: comparisonCardStyle, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'start' }, children: [_jsxs("div", { style: { display: 'grid', gap: 5 }, children: [_jsx("div", { style: sectionLabelStyle, children: locale === 'en' ? 'Alternative family' : 'Familia alternativa' }), _jsx("div", { style: { color: '#eef4ff', fontSize: 18, fontWeight: 800 }, children: comparison.variant.label }), _jsxs("div", { style: { display: 'flex', gap: 8, flexWrap: 'wrap' }, children: [comparison.variant.topItems.map((itemId) => _jsx(ItemPill, { dataset: dataset, itemId: itemId }, `${comparison.variant.key}-${itemId}`)), comparison.variant.bootsId ? _jsx(ItemPill, { dataset: dataset, itemId: comparison.variant.bootsId }) : null] })] }), _jsx(Badge, { tone: evidenceTone(comparison.evidenceTier), children: evidenceBadgeLabel(comparison.evidenceTier, locale) })] }), _jsx("div", { style: deltaGridStyle, children: deltaMetrics.map((metric) => _jsx(DeltaBox, { label: metric.label, value: metric.value }, `${comparison.variant.key}-${metric.label}`)) }), _jsxs("div", { style: { display: 'grid', gap: 8 }, children: [_jsx("div", { style: { color: '#f2f8ff', fontWeight: 700, lineHeight: 1.65 }, children: comparison.summary }), comparison.pressureNote ? _jsx("div", { style: { color: '#9ba9bc', lineHeight: 1.6 }, children: comparison.pressureNote }) : null, comparison.leverageNote ? _jsx("div", { style: recommendationBoxStyle, children: comparison.leverageNote }) : null, _jsxs("div", { className: "build-decision-grid", style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }, children: [_jsx(DecisionCard, { title: locale === 'en' ? 'Best when' : 'Rinde más cuando', value: comparison.bestWhen ?? (locale === 'en' ? 'No clear edge yet.' : 'Todavía no aparece un edge claro.') }), _jsx(DecisionCard, { title: locale === 'en' ? 'Careful when' : 'Ojo cuando', value: comparison.avoidWhen ?? (locale === 'en' ? 'No clear avoid-case yet.' : 'Todavía no aparece un avoid-case claro.') })] }), comparison.recommendation ? _jsx("div", { style: warningCalloutStyle, children: comparison.recommendation }) : null, _jsx(ExampleMatchesPanel, { examples: comparison.variant.examples, locale: locale }), _jsx("div", { style: { color: '#7f8da2', fontSize: 12, lineHeight: 1.6 }, children: evidenceExplanation(comparison.evidenceTier, locale, comparison.baseline.games + comparison.variant.games, comparison.constraint) })] })] }));
}
function ItemSignalColumn({ title, emptyLabel, items, dataset, locale }) {
    return (_jsxs("div", { style: signalColumnStyle, children: [_jsx("div", { style: sectionLabelStyle, children: title }), items.length ? (_jsx("div", { style: { display: 'grid', gap: 10 }, children: items.map((item) => {
                    const impactMetrics = [
                        { label: 'WR', value: formatSignedNumber(item.winRateDelta, 1, '%') },
                        { label: locale === 'en' ? 'Score' : 'Score', value: formatSignedNumber(item.scoreDelta) },
                        { label: locale === 'en' ? 'Champ dmg' : 'Daño champs', value: formatSignedNumber(item.damageDelta, 0) },
                        { label: locale === 'en' ? 'Stable early' : 'Early estable', value: formatSignedNumber(item.earlyStateDelta, 1, '%') },
                        ...(item.avgCompletionMinute !== null ? [{ label: locale === 'en' ? 'Completion' : 'Completa', value: `${formatDecimal(item.avgCompletionMinute)}m` }] : [])
                    ];
                    return (_jsxs("div", { style: itemImpactCardStyle, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', gap: 10, flexWrap: 'wrap', alignItems: 'center' }, children: [_jsxs("div", { style: { display: 'flex', gap: 10, alignItems: 'center' }, children: [_jsx(ItemPill, { dataset: dataset, itemId: item.itemId, compact: true }), _jsxs("div", { style: { display: 'grid', gap: 3 }, children: [_jsx("div", { style: { color: '#eef4ff', fontWeight: 700 }, children: item.name }), _jsxs("div", { style: { color: '#8d9bb0', fontSize: 12 }, children: [item.games, " \u00B7 ", formatDecimal(item.usageShare), "% \u00B7 ", item.utilityLabel] })] })] }), _jsx(Badge, { tone: evidenceTone(item.evidenceTier), children: evidenceBadgeLabel(item.evidenceTier, locale) })] }), _jsx("div", { style: itemImpactMetricsStyle, children: impactMetrics.map((metric) => _jsx(DeltaBox, { label: metric.label, value: metric.value }, `${title}-${item.itemId}-${metric.label}`)) })] }, `${title}-${item.itemId}`));
                }) })) : (_jsx("div", { style: emptyStateStyle, children: emptyLabel }))] }));
}
function ExampleMatchesPanel({ examples, locale }) {
    if (!examples.length)
        return null;
    return (_jsxs("div", { style: { display: 'grid', gap: 10 }, children: [_jsx("div", { style: sectionLabelStyle, children: locale === 'en' ? 'Match explorer' : 'Match explorer' }), _jsx("div", { className: "example-match-grid", style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }, children: examples.map((example) => {
                    const timingLine = [
                        ...(example.firstItemMinute ? [`1st ${formatDecimal(example.firstItemMinute)}m`] : []),
                        ...(example.secondItemMinute ? [`2nd ${formatDecimal(example.secondItemMinute)}m`] : []),
                        ...(example.bootsMinute ? [`Boots ${formatDecimal(example.bootsMinute)}m`] : [])
                    ].join(' · ');
                    return (_jsxs("div", { style: exampleCardStyle, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap' }, children: [_jsx("div", { style: { color: '#eef4ff', fontWeight: 800 }, children: example.opponentChampionName ? `vs ${example.opponentChampionName}` : (locale === 'en' ? 'Match sample' : 'Partida muestra') }), _jsx(Badge, { tone: example.win ? 'low' : 'high', children: example.win ? 'Win' : 'Loss' })] }), _jsx("div", { style: { color: '#8ea0b6', fontSize: 13, lineHeight: 1.55 }, children: new Date(example.gameCreation).toLocaleDateString(locale === 'en' ? 'en-US' : 'es-AR') }), _jsxs("div", { style: { display: 'grid', gap: 5 }, children: [_jsx("div", { style: { color: '#eef4ff' }, children: `Score ${formatDecimal(example.score)} · ${formatInteger(example.damageToChampions)} dmg` }), _jsx("div", { style: { color: '#8ea0b6' }, children: `CS@15 ${formatDecimal(example.csAt15)} · GD@15 ${formatInteger(example.goldDiffAt15)}` }), timingLine ? _jsx("div", { style: { color: '#8ea0b6' }, children: timingLine }) : null] })] }, example.matchId));
                }) })] }));
}
function MetricBox({ label, value }) {
    return (_jsxs("div", { style: metricBoxStyle, children: [_jsx("div", { style: metricLabelStyle, children: label }), _jsx("div", { style: metricValueStyle, children: value })] }));
}
function DeltaBox({ label, value }) {
    return (_jsxs("div", { style: deltaBoxStyle, children: [_jsx("div", { style: metricLabelStyle, children: label }), _jsx("div", { style: deltaValueStyle, children: value })] }));
}
function ContextCard({ title, lines }) {
    return (_jsxs("div", { style: contextCardStyle, children: [_jsx("div", { style: sectionLabelStyle, children: title }), _jsx("div", { style: { display: 'grid', gap: 4 }, children: lines.map((line) => _jsx("div", { style: { color: '#dce6f5', lineHeight: 1.5 }, children: line }, line)) })] }));
}
function DecisionCard({ title, value }) {
    return (_jsxs("div", { style: decisionCardStyle, children: [_jsx("div", { style: sectionLabelStyle, children: title }), _jsx("div", { style: { color: '#ecf3ff', lineHeight: 1.6 }, children: value })] }));
}
function ItemPill({ dataset, itemId, compact = false }) {
    const icon = getItemIconUrl(itemId, dataset.ddragonVersion);
    const item = dataset.itemCatalog?.[String(itemId)];
    return (_jsxs("div", { style: compact ? compactItemPillStyle : itemPillStyle, children: [icon ? _jsx("img", { src: icon, alt: item?.name ?? String(itemId), width: compact ? 24 : 28, height: compact ? 24 : 28, style: itemIconStyle }) : null, _jsx("span", { children: item?.name ?? `Item ${itemId}` })] }));
}
const topSummaryGridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: 12
};
const summaryBoxStyle = {
    display: 'grid',
    gap: 8,
    padding: '14px 15px',
    borderRadius: 16,
    background: '#070d15',
    border: '1px solid rgba(255,255,255,0.06)'
};
const summaryLabelStyle = {
    color: '#7d8ba0',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: '0.08em'
};
const summaryValueStyle = {
    color: '#f4fbff',
    fontSize: 30,
    fontWeight: 800
};
const summaryHintStyle = {
    color: '#8fa0b5',
    lineHeight: 1.6
};
const notePanelStyle = {
    padding: '13px 14px',
    borderRadius: 16,
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.05)',
    color: '#cbd7e8',
    lineHeight: 1.7
};
const headlinePanelStyle = {
    padding: '14px 15px',
    borderRadius: 18,
    background: 'rgba(125,174,255,0.07)',
    border: '1px solid rgba(125,174,255,0.12)',
    color: '#deebff',
    lineHeight: 1.65
};
const baselineCardStyle = {
    display: 'grid',
    gap: 14,
    padding: '15px 16px',
    borderRadius: 18,
    background: 'linear-gradient(180deg, rgba(14,22,35,0.96), rgba(7,12,19,0.98))',
    border: '1px solid rgba(255,255,255,0.06)'
};
const sectionLabelStyle = {
    color: '#7f8da2',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: '0.08em'
};
const metricsGridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
    gap: 10
};
const metricBoxStyle = {
    display: 'grid',
    gap: 6,
    padding: '11px 12px',
    borderRadius: 14,
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.05)'
};
const metricLabelStyle = {
    color: '#7d8ba0',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: '0.06em'
};
const metricValueStyle = {
    color: '#f0f6ff',
    fontSize: 17,
    fontWeight: 800
};
const comparisonCardStyle = {
    display: 'grid',
    gap: 14,
    padding: '15px 16px',
    borderRadius: 16,
    background: '#070d15',
    border: '1px solid rgba(255,255,255,0.06)'
};
const deltaGridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
    gap: 10
};
const deltaBoxStyle = {
    display: 'grid',
    gap: 6,
    padding: '11px 12px',
    borderRadius: 14,
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.05)'
};
const deltaValueStyle = {
    color: '#f4fbff',
    fontSize: 17,
    fontWeight: 800
};
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
    whiteSpace: 'nowrap'
};
const compactItemPillStyle = {
    ...itemPillStyle,
    padding: '6px 8px'
};
const itemIconStyle = {
    borderRadius: 8,
    border: '1px solid rgba(255,255,255,0.08)'
};
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
};
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
};
const warningCalloutStyle = {
    padding: '10px 12px',
    borderRadius: 14,
    background: 'rgba(255,196,82,0.07)',
    border: '1px solid rgba(255,196,82,0.14)',
    color: '#e6d3a4',
    lineHeight: 1.6
};
const recommendationBoxStyle = {
    padding: '10px 12px',
    borderRadius: 14,
    background: 'rgba(126,245,199,0.08)',
    border: '1px solid rgba(126,245,199,0.12)',
    color: '#d7f7e9',
    lineHeight: 1.6
};
const emptyStateStyle = {
    padding: '14px 15px',
    borderRadius: 14,
    background: 'rgba(255,255,255,0.03)',
    border: '1px dashed rgba(255,255,255,0.08)',
    color: '#9aa7ba',
    lineHeight: 1.7
};
const signalGridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: 12
};
const signalColumnStyle = {
    display: 'grid',
    gap: 12,
    padding: '14px 15px',
    borderRadius: 16,
    background: '#070d15',
    border: '1px solid rgba(255,255,255,0.06)'
};
const itemImpactCardStyle = {
    display: 'grid',
    gap: 10,
    padding: '12px 13px',
    borderRadius: 14,
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.05)'
};
const itemImpactMetricsStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(92px, 1fr))',
    gap: 8
};
const contextCardStyle = {
    display: 'grid',
    gap: 8,
    padding: '11px 12px',
    borderRadius: 14,
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.05)'
};
const decisionCardStyle = {
    display: 'grid',
    gap: 8,
    padding: '11px 12px',
    borderRadius: 14,
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.05)'
};
const exampleCardStyle = {
    display: 'grid',
    gap: 8,
    padding: '11px 12px',
    borderRadius: 14,
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.05)'
};
