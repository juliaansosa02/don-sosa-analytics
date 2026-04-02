import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { Badge, Card, ChampionIdentity } from '../../components/ui';
import { formatChampionName } from '../../lib/lol';
import { formatDecimal, formatInteger, formatPercent, formatSignedNumber } from '../../lib/format';
import { evidenceBadgeLabel, evidenceExplanation, evidenceTone } from '../premium-analysis/evidence';
import { buildChampionRuneWorkbench } from './runeWorkbench';
export function RunesTab({ dataset, locale = 'es' }) {
    const champions = buildChampionRuneWorkbench(dataset, locale);
    const comparisons = champions.flatMap((champion) => champion.keystones.flatMap((keystone) => keystone.comparisons));
    const strongReads = comparisons.filter((comparison) => comparison.evidenceTier === 'strong').length;
    const weakReads = comparisons.filter((comparison) => comparison.evidenceTier === 'weak').length;
    const hypothesisReads = comparisons.filter((comparison) => comparison.evidenceTier === 'hypothesis').length;
    if (!champions.length) {
        return (_jsx(Card, { title: locale === 'en' ? 'Runes workbench' : 'Workbench de runas', subtitle: locale === 'en'
                ? 'We need more repeated champion sample before the system can compare real micro-variants inside the same pick.'
                : 'Necesitamos más muestra repetida por campeón antes de comparar microvariantes reales dentro del mismo pick.', children: _jsxs("div", { style: { display: 'grid', gap: 12, color: '#c8d5e7', lineHeight: 1.7 }, children: [_jsx("div", { children: locale === 'en'
                            ? 'This tab now looks for same-champion pages, same keystone families and small rune swaps with enough sample on both sides. Right now the visible block is still too thin to call those differences.'
                            : 'Esta pestaña ahora busca páginas del mismo campeón, familias con la misma keystone y swaps chicos con suficiente muestra en ambos lados. En el bloque visible todavía no alcanza para leer esas diferencias con honestidad.' }), _jsx("div", { style: noteBoxStyle, children: locale === 'en'
                            ? 'Best next step: add more games on the same champion and avoid changing several variables at once. The workbench gets much stronger when one pick accumulates at least 6-8 games with two visible rune variants.'
                            : 'Siguiente mejor paso: sumar más partidas en el mismo campeón y no abrir demasiadas variables a la vez. El workbench mejora mucho cuando un pick junta al menos 6-8 partidas con dos variantes visibles de runas.' })] }) }));
    }
    return (_jsxs("div", { style: { display: 'grid', gap: 18 }, children: [_jsx(Card, { title: locale === 'en' ? 'Runes workbench' : 'Workbench de runas', subtitle: locale === 'en'
                    ? 'Champion-first comparisons, same-keystone families and explicit evidence tiers so each rune read is useful for decisions.'
                    : 'Comparaciones champion-first, familias con la misma keystone y tiers de evidencia explícitos para que cada lectura sirva para decidir.', children: _jsxs("div", { style: { display: 'grid', gap: 16 }, children: [_jsxs("div", { style: summaryGridStyle, children: [_jsx(SummaryTile, { label: locale === 'en' ? 'Champions with real variants' : 'Campeones con variantes reales', value: String(champions.length), hint: locale === 'en' ? 'Same champion, repeat sample, at least one alternative page.' : 'Mismo campeón, muestra repetida y al menos una página alternativa.' }), _jsx(SummaryTile, { label: locale === 'en' ? 'Strong reads' : 'Lecturas fuertes', value: String(strongReads), hint: locale === 'en' ? 'Good sample on both sides plus a real signal.' : 'Buena muestra en ambos lados más una señal real.' }), _jsx(SummaryTile, { label: locale === 'en' ? 'Watchpoints' : 'Puntos de seguimiento', value: String(weakReads + hypothesisReads), hint: locale === 'en' ? 'Directional reads or still-open hypotheses.' : 'Lecturas direccionales o hipótesis todavía abiertas.' })] }), _jsxs("div", { style: methodologyPanelStyle, children: [_jsx("div", { style: sectionLabelStyle, children: locale === 'en' ? 'How to read this' : 'Cómo leer esto' }), _jsx("div", { style: { color: '#edf3ff', lineHeight: 1.7 }, children: locale === 'en'
                                        ? 'The baseline is the most repeated page inside each keystone family for that champion. Every alternative page is compared against that baseline, checking small rune swaps, matchup skew, game length and execution metrics before calling it strong, weak or just a hypothesis.'
                                        : 'El baseline es la página más repetida dentro de cada familia de keystone para ese campeón. Cada página alternativa se compara contra ese baseline revisando swaps chicos, sesgo de matchup, duración de partida y métricas de ejecución antes de llamarla fuerte, débil o solo hipótesis.' })] })] }) }), champions.map((champion) => (_jsx(Card, { title: formatChampionName(champion.championName), subtitle: locale === 'en'
                    ? `${champion.games} visible games. The goal is not “most picked” but whether small swaps move the actual output of the champion.`
                    : `${champion.games} partidas visibles. El objetivo no es “most picked” sino si los swaps chicos mueven el output real del campeón.`, children: _jsxs("div", { style: { display: 'grid', gap: 18 }, children: [_jsx("div", { style: { display: 'flex', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap', alignItems: 'center' }, children: _jsx(ChampionIdentity, { championName: champion.championName, version: dataset.ddragonVersion, subtitle: locale === 'en'
                                    ? 'Variants are grouped by keystone first, then compared inside the same family.'
                                    : 'Las variantes se agrupan primero por keystone y después se comparan dentro de la misma familia.', meta: _jsxs(_Fragment, { children: [champion.strongReads ? _jsx(Badge, { tone: "low", children: locale === 'en' ? `${champion.strongReads} strong` : `${champion.strongReads} fuertes` }) : null, champion.weakReads ? _jsx(Badge, { tone: "medium", children: locale === 'en' ? `${champion.weakReads} weak` : `${champion.weakReads} débiles` }) : null, champion.hypothesisReads ? _jsx(Badge, { children: locale === 'en' ? `${champion.hypothesisReads} hypotheses` : `${champion.hypothesisReads} hipótesis` }) : null] }) }) }), _jsx("div", { style: { display: 'grid', gap: 14 }, children: champion.keystones.map((keystone) => (_jsx("section", { style: keystoneCardStyle, children: _jsxs("div", { style: { display: 'grid', gap: 12 }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }, children: [_jsxs("div", { style: { display: 'grid', gap: 4 }, children: [_jsx("div", { style: { color: '#edf3ff', fontSize: 18, fontWeight: 800 }, children: keystone.keystone }), _jsx("div", { style: { color: '#8d9bb0', fontSize: 13 }, children: locale === 'en'
                                                                ? `${keystone.totalGames} games in this family · baseline = the most repeated page`
                                                                : `${keystone.totalGames} partidas en esta familia · baseline = la página más repetida` })] }), _jsx(Badge, { tone: "default", children: locale === 'en'
                                                        ? `${keystone.variants.length} visible variants`
                                                        : `${keystone.variants.length} variantes visibles` })] }), _jsx(BaselinePanel, { baseline: keystone.baseline, locale: locale }), keystone.comparisons.length ? (_jsx("div", { style: { display: 'grid', gap: 12 }, children: keystone.comparisons.slice(0, 3).map((comparison) => (_jsx(ComparisonCard, { comparison: comparison, locale: locale }, `${comparison.variant.key}-${comparison.differenceLabel}`))) })) : (_jsx("div", { style: emptyComparisonStyle, children: locale === 'en'
                                                ? 'There is still only one visible page inside this keystone family, so the system keeps it as a baseline without forcing fake comparisons.'
                                                : 'Todavía hay una sola página visible dentro de esta familia de keystone, así que el sistema la guarda como baseline sin forzar comparaciones falsas.' }))] }) }, `${champion.championName}-${keystone.keystone}`))) })] }) }, champion.championName)))] }));
}
function SummaryTile({ label, value, hint }) {
    return (_jsxs("div", { style: summaryTileStyle, children: [_jsx("div", { style: summaryLabelStyle, children: label }), _jsx("div", { style: summaryValueStyle, children: value }), _jsx("div", { style: summaryHintStyle, children: hint })] }));
}
function BaselinePanel({ baseline, locale }) {
    return (_jsxs("div", { style: baselinePanelStyle, children: [_jsxs("div", { style: { display: 'grid', gap: 6 }, children: [_jsx("div", { style: sectionLabelStyle, children: locale === 'en' ? 'Baseline page' : 'Página baseline' }), _jsx("div", { style: { color: '#f6fbff', fontWeight: 800, fontSize: 18 }, children: baseline.compactLabel }), _jsx("div", { style: { color: '#8d9bb0', lineHeight: 1.6 }, children: locale === 'en'
                            ? `${baseline.games} games · ${formatPercent(baseline.winRate)} WR · ${formatDecimal(baseline.avgScore)} average score`
                            : `${baseline.games} partidas · ${formatPercent(baseline.winRate)} WR · ${formatDecimal(baseline.avgScore)} de score medio` })] }), _jsxs("div", { style: metricRowStyle, children: [_jsx(MetricChip, { label: "WR", value: formatPercent(baseline.winRate) }), _jsx(MetricChip, { label: locale === 'en' ? 'Score' : 'Score', value: formatDecimal(baseline.avgScore) }), _jsx(MetricChip, { label: locale === 'en' ? 'Damage' : 'Daño', value: formatInteger(baseline.avgDamageToChampions) }), _jsx(MetricChip, { label: "CS@15", value: formatDecimal(baseline.avgCsAt15) }), _jsx(MetricChip, { label: locale === 'en' ? 'Pre14 deaths' : 'Muertes pre14', value: formatDecimal(baseline.avgDeathsPre14) })] }), _jsx("div", { style: { display: 'flex', gap: 8, flexWrap: 'wrap' }, children: baseline.topMatchups.map((matchup) => (_jsxs("div", { style: contextPillStyle, children: [_jsx("strong", { children: formatChampionName(matchup.championName) }), _jsxs("span", { children: [matchup.games, " \u00B7 ", formatDecimal(matchup.share), "%"] })] }, `${baseline.key}-${matchup.championName}`))) })] }));
}
function ComparisonCard({ comparison, locale }) {
    return (_jsxs("div", { style: comparisonCardStyle, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'start' }, children: [_jsxs("div", { style: { display: 'grid', gap: 5 }, children: [_jsx("div", { style: sectionLabelStyle, children: locale === 'en' ? 'Micro-variant under review' : 'Microvariante bajo revisión' }), _jsx("div", { style: { color: '#eef4ff', fontSize: 17, fontWeight: 800 }, children: comparison.variant.compactLabel }), _jsx("div", { style: { color: '#8d9bb0', lineHeight: 1.6 }, children: comparison.differenceLabel })] }), _jsx(Badge, { tone: evidenceTone(comparison.evidenceTier), children: evidenceBadgeLabel(comparison.evidenceTier, locale) })] }), _jsxs("div", { style: deltaGridStyle, children: [_jsx(DeltaTile, { label: "WR", value: formatSignedNumber(comparison.deltas.winRate, 1, '%') }), _jsx(DeltaTile, { label: locale === 'en' ? 'Score' : 'Score', value: formatSignedNumber(comparison.deltas.score) }), _jsx(DeltaTile, { label: locale === 'en' ? 'Damage' : 'Daño', value: formatSignedNumber(comparison.deltas.damageToChampions, 0) }), _jsx(DeltaTile, { label: "CS@15", value: formatSignedNumber(comparison.deltas.csAt15) }), _jsx(DeltaTile, { label: locale === 'en' ? 'Duration' : 'Duración', value: formatSignedNumber(comparison.deltas.durationMinutes, 1, 'm') }), _jsx(DeltaTile, { label: locale === 'en' ? 'Pre14 deaths' : 'Muertes pre14', value: formatSignedNumber(comparison.deltas.deathsPre14) })] }), _jsxs("div", { style: { display: 'grid', gap: 8 }, children: [_jsx("div", { style: { color: '#f0f6ff', lineHeight: 1.65, fontWeight: 700 }, children: comparison.summary }), _jsx("div", { style: { color: '#9aa7ba', lineHeight: 1.65 }, children: comparison.signalNote }), comparison.contextNote ? _jsx("div", { style: contextCalloutStyle, children: comparison.contextNote }) : null, _jsx("div", { style: { color: '#7f8da2', fontSize: 12, lineHeight: 1.6 }, children: evidenceExplanation(comparison.evidenceTier, locale, comparison.baseline.games + comparison.variant.games, comparison.constraint) })] })] }));
}
function MetricChip({ label, value }) {
    return (_jsxs("div", { style: metricChipStyle, children: [_jsx("div", { style: metricChipLabelStyle, children: label }), _jsx("div", { style: metricChipValueStyle, children: value })] }));
}
function DeltaTile({ label, value }) {
    return (_jsxs("div", { style: deltaTileStyle, children: [_jsx("div", { style: metricChipLabelStyle, children: label }), _jsx("div", { style: deltaValueStyle, children: value })] }));
}
const summaryGridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: 12
};
const summaryTileStyle = {
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
    color: '#f5fbff',
    fontSize: 30,
    fontWeight: 800,
    lineHeight: 1
};
const summaryHintStyle = {
    color: '#91a0b5',
    lineHeight: 1.6
};
const methodologyPanelStyle = {
    display: 'grid',
    gap: 8,
    padding: '14px 15px',
    borderRadius: 16,
    background: 'linear-gradient(180deg, rgba(12,17,28,0.96), rgba(8,12,19,0.98))',
    border: '1px solid rgba(216,253,241,0.08)'
};
const keystoneCardStyle = {
    display: 'grid',
    gap: 14,
    padding: 16,
    borderRadius: 18,
    background: '#060b12',
    border: '1px solid rgba(255,255,255,0.06)'
};
const baselinePanelStyle = {
    display: 'grid',
    gap: 12,
    padding: '14px 15px',
    borderRadius: 16,
    background: 'linear-gradient(180deg, rgba(16,24,38,0.94), rgba(8,12,20,0.98))',
    border: '1px solid rgba(255,255,255,0.06)'
};
const sectionLabelStyle = {
    color: '#7f8da2',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: '0.08em'
};
const metricRowStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(5, minmax(0, 1fr))',
    gap: 10
};
const metricChipStyle = {
    display: 'grid',
    gap: 5,
    padding: '11px 12px',
    borderRadius: 14,
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.05)'
};
const metricChipLabelStyle = {
    color: '#7d8ba0',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: '0.06em'
};
const metricChipValueStyle = {
    color: '#eef4ff',
    fontSize: 18,
    fontWeight: 800
};
const contextPillStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '8px 10px',
    borderRadius: 999,
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.05)',
    color: '#cbd7e8',
    fontSize: 12
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
    gridTemplateColumns: 'repeat(6, minmax(0, 1fr))',
    gap: 10
};
const deltaTileStyle = {
    display: 'grid',
    gap: 6,
    padding: '11px 12px',
    borderRadius: 14,
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.05)'
};
const deltaValueStyle = {
    color: '#f4fbff',
    fontSize: 18,
    fontWeight: 800
};
const contextCalloutStyle = {
    padding: '10px 12px',
    borderRadius: 14,
    background: 'rgba(255, 196, 82, 0.07)',
    border: '1px solid rgba(255, 196, 82, 0.14)',
    color: '#e7d2a2',
    lineHeight: 1.6
};
const emptyComparisonStyle = {
    padding: '14px 15px',
    borderRadius: 14,
    background: 'rgba(255,255,255,0.03)',
    border: '1px dashed rgba(255,255,255,0.08)',
    color: '#9aa7ba',
    lineHeight: 1.7
};
const noteBoxStyle = {
    padding: '12px 14px',
    borderRadius: 16,
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.05)'
};
