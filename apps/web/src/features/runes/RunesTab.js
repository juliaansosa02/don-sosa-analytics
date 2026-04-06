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
                            ? 'This tab now looks for same-champion pages, same keystone families, early-state splits, duration splits and measurable rune value before calling an edge.'
                            : 'Esta pestaña ahora busca páginas del mismo campeón, familias con la misma keystone, cortes por early state, duración y valor medible de runas antes de llamar a un edge.' }), _jsx("div", { style: noteBoxStyle, children: locale === 'en'
                            ? 'Best next step: add more games on the same champion and avoid changing several variables at once. The workbench gets much stronger when one pick accumulates at least 6-8 games with two visible rune variants.'
                            : 'Siguiente mejor paso: sumar más partidas en el mismo campeón y no abrir demasiadas variables a la vez. El workbench mejora mucho cuando un pick junta al menos 6-8 partidas con dos variantes visibles de runas.' })] }) }));
    }
    return (_jsxs("div", { style: { display: 'grid', gap: 18 }, children: [_jsx(Card, { title: locale === 'en' ? 'Runes workbench' : 'Workbench de runas', subtitle: locale === 'en'
                    ? 'A serious optimization surface: same-champion pages, same-keystone swaps, context splits and explicit evidence tiers.'
                    : 'Una superficie seria de optimización: páginas del mismo campeón, swaps dentro de la misma keystone, cortes de contexto y tiers de evidencia explícitos.', children: _jsxs("div", { style: { display: 'grid', gap: 16 }, children: [_jsxs("div", { style: summaryGridStyle, children: [_jsx(SummaryTile, { label: locale === 'en' ? 'Champions with real variants' : 'Campeones con variantes reales', value: String(champions.length), hint: locale === 'en' ? 'Same champion, repeat sample, at least one alternative page.' : 'Mismo campeón, muestra repetida y al menos una página alternativa.' }), _jsx(SummaryTile, { label: locale === 'en' ? 'Strong reads' : 'Lecturas fuertes', value: String(strongReads), hint: locale === 'en' ? 'Good sample on both sides plus a real signal.' : 'Buena muestra en ambos lados más una señal real.' }), _jsx(SummaryTile, { label: locale === 'en' ? 'Watchpoints' : 'Puntos de seguimiento', value: String(weakReads + hypothesisReads), hint: locale === 'en' ? 'Directional reads or still-open hypotheses.' : 'Lecturas direccionales o hipótesis todavía abiertas.' })] }), _jsxs("div", { style: methodologyPanelStyle, children: [_jsx("div", { style: sectionLabelStyle, children: locale === 'en' ? 'Why this is different' : 'Por qué esto es distinto' }), _jsx("div", { style: { color: '#edf3ff', lineHeight: 1.7 }, children: locale === 'en'
                                        ? 'The baseline is the most repeated page inside each keystone family for that champion. Every alternative page is compared against that baseline, but also split by early-state quality, game length, top matchup exposure and measurable rune output before making a claim.'
                                        : 'El baseline es la página más repetida dentro de cada familia de keystone para ese campeón. Cada página alternativa se compara contra ese baseline, pero además se corta por calidad del early, duración de partida, exposición a matchup y output medible de runas antes de hacer un claim.' })] })] }) }), champions.map((champion) => (_jsx(Card, { title: formatChampionName(champion.championName), subtitle: locale === 'en'
                    ? `${champion.games} visible games. The point is not “most picked”, but which page fits the way this player is really piloting the champion.`
                    : `${champion.games} partidas visibles. El objetivo no es “most picked”, sino qué página calza mejor con cómo este jugador está piloteando el campeón.`, children: _jsxs("div", { style: { display: 'grid', gap: 18 }, children: [_jsx(ChampionIdentity, { championName: champion.championName, version: dataset.ddragonVersion, subtitle: champion.headline, meta: _jsxs(_Fragment, { children: [champion.strongReads ? _jsx(Badge, { tone: "low", children: locale === 'en' ? `${champion.strongReads} strong` : `${champion.strongReads} fuertes` }) : null, champion.weakReads ? _jsx(Badge, { tone: "medium", children: locale === 'en' ? `${champion.weakReads} weak` : `${champion.weakReads} débiles` }) : null, champion.hypothesisReads ? _jsx(Badge, { children: locale === 'en' ? `${champion.hypothesisReads} hypotheses` : `${champion.hypothesisReads} hipótesis` }) : null] }) }), _jsx("div", { style: headlinePanelStyle, children: champion.decisionNote }), _jsx("div", { style: { display: 'grid', gap: 14 }, children: champion.keystones.map((keystone) => (_jsx("section", { style: keystoneCardStyle, children: _jsxs("div", { style: { display: 'grid', gap: 12 }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'center' }, children: [_jsxs("div", { style: { display: 'grid', gap: 4 }, children: [_jsx("div", { style: { color: '#edf3ff', fontSize: 18, fontWeight: 800 }, children: keystone.keystone }), _jsx("div", { style: { color: '#8d9bb0', fontSize: 13 }, children: locale === 'en'
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
                            : `${baseline.games} partidas · ${formatPercent(baseline.winRate)} WR · ${formatDecimal(baseline.avgScore)} de score medio` })] }), _jsxs("div", { style: metricRowStyle, children: [_jsx(MetricChip, { label: "WR", value: formatPercent(baseline.winRate) }), _jsx(MetricChip, { label: locale === 'en' ? 'Score' : 'Score', value: formatDecimal(baseline.avgScore) }), _jsx(MetricChip, { label: locale === 'en' ? 'Rune value' : 'Valor runa', value: formatInteger(baseline.avgRuneValue) }), _jsx(MetricChip, { label: locale === 'en' ? 'Rune dmg' : 'Daño runa', value: formatInteger(baseline.avgRuneDamage) }), _jsx(MetricChip, { label: "CS@15", value: formatDecimal(baseline.avgCsAt15) }), _jsx(MetricChip, { label: "GD@15", value: formatInteger(baseline.avgGoldDiffAt15) }), _jsx(MetricChip, { label: locale === 'en' ? 'Pre14 deaths' : 'Muertes pre14', value: formatDecimal(baseline.avgDeathsPre14) })] }), _jsxs("div", { className: "rune-context-grid", style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 10 }, children: [_jsx(ContextBox, { title: locale === 'en' ? 'Early state' : 'Estado del early', lines: [
                            `${locale === 'en' ? 'Stable' : 'Estable'} ${baseline.earlyStateProfile.stable}%`,
                            `${locale === 'en' ? 'Scrappy' : 'Tenso'} ${baseline.earlyStateProfile.scrappy}%`,
                            `${locale === 'en' ? 'Volatile' : 'Volátil'} ${baseline.earlyStateProfile.volatile}%`
                        ] }), _jsx(ContextBox, { title: locale === 'en' ? 'Duration split' : 'Split por duración', lines: [
                            `${locale === 'en' ? 'Short' : 'Corta'} ${baseline.durationProfile.short}%`,
                            `${locale === 'en' ? 'Standard' : 'Media'} ${baseline.durationProfile.standard}%`,
                            `${locale === 'en' ? 'Long' : 'Larga'} ${baseline.durationProfile.long}%`
                        ] }), _jsx(ContextBox, { title: locale === 'en' ? 'Tempo read' : 'Lectura de tempo', lines: [
                            `${locale === 'en' ? 'Volatility' : 'Volatilidad'} ${formatDecimal(baseline.avgLaneVolatility)}`,
                            `${locale === 'en' ? 'Reset' : 'Reset'} ${formatDecimal(baseline.avgResetTiming)}`,
                            `${locale === 'en' ? 'Setup' : 'Setup'} ${formatDecimal(baseline.avgObjectiveSetup)}`
                        ] })] }), _jsx("div", { style: { display: 'flex', gap: 8, flexWrap: 'wrap' }, children: baseline.topMatchups.map((matchup) => (_jsxs("div", { style: contextPillStyle, children: [_jsx("strong", { children: formatChampionName(matchup.championName) }), _jsxs("span", { children: [matchup.games, " \u00B7 ", formatDecimal(matchup.share), "% \u00B7 ", formatPercent(matchup.winRate)] })] }, `${baseline.key}-${matchup.championName}`))) })] }));
}
function ComparisonCard({ comparison, locale }) {
    return (_jsxs("div", { style: comparisonCardStyle, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', alignItems: 'start' }, children: [_jsxs("div", { style: { display: 'grid', gap: 5 }, children: [_jsx("div", { style: sectionLabelStyle, children: locale === 'en' ? 'Micro-variant under review' : 'Microvariante bajo revisión' }), _jsx("div", { style: { color: '#eef4ff', fontSize: 17, fontWeight: 800 }, children: comparison.variant.compactLabel }), _jsx("div", { style: { color: '#8d9bb0', lineHeight: 1.6 }, children: comparison.differenceLabel })] }), _jsx(Badge, { tone: evidenceTone(comparison.evidenceTier), children: evidenceBadgeLabel(comparison.evidenceTier, locale) })] }), _jsxs("div", { style: deltaGridStyle, children: [_jsx(DeltaTile, { label: "WR", value: formatSignedNumber(comparison.deltas.winRate, 1, '%') }), _jsx(DeltaTile, { label: locale === 'en' ? 'Score' : 'Score', value: formatSignedNumber(comparison.deltas.score) }), _jsx(DeltaTile, { label: locale === 'en' ? 'Rune value' : 'Valor runa', value: formatSignedNumber(comparison.deltas.runeValue, 0) }), _jsx(DeltaTile, { label: locale === 'en' ? 'Rune dmg' : 'Daño runa', value: formatSignedNumber(comparison.deltas.runeDamage, 0) }), _jsx(DeltaTile, { label: locale === 'en' ? 'Heal/shield' : 'Heal/shield', value: formatSignedNumber(comparison.deltas.runeHealing, 0) }), _jsx(DeltaTile, { label: "CS@15", value: formatSignedNumber(comparison.deltas.csAt15) }), _jsx(DeltaTile, { label: "GD@15", value: formatSignedNumber(comparison.deltas.goldDiffAt15, 0) }), _jsx(DeltaTile, { label: locale === 'en' ? 'Volatility' : 'Volatilidad', value: formatSignedNumber(comparison.deltas.laneVolatility) }), _jsx(DeltaTile, { label: locale === 'en' ? 'Reset' : 'Reset', value: formatSignedNumber(comparison.deltas.resetTiming) }), _jsx(DeltaTile, { label: locale === 'en' ? 'Pre14 deaths' : 'Muertes pre14', value: formatSignedNumber(comparison.deltas.deathsPre14) })] }), _jsxs("div", { style: { display: 'grid', gap: 8 }, children: [_jsx("div", { style: { color: '#f0f6ff', lineHeight: 1.65, fontWeight: 700 }, children: comparison.summary }), _jsx("div", { style: { color: '#9aa7ba', lineHeight: 1.65 }, children: comparison.signalNote }), comparison.contextNote ? _jsx("div", { style: contextCalloutStyle, children: comparison.contextNote }) : null, _jsxs("div", { className: "rune-decision-grid", style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 10 }, children: [_jsx(DecisionBox, { title: locale === 'en' ? 'Best when' : 'Rinde más cuando', value: comparison.bestWhen ?? (locale === 'en' ? 'No clear context edge yet.' : 'Todavía no aparece un edge contextual claro.') }), _jsx(DecisionBox, { title: locale === 'en' ? 'Careful when' : 'Ojo cuando', value: comparison.avoidWhen ?? (locale === 'en' ? 'No clear avoid-case yet.' : 'Todavía no aparece un avoid-case claro.') })] }), _jsx("div", { style: recommendationStyle, children: comparison.recommendation }), _jsx("div", { style: { color: '#7f8da2', fontSize: 12, lineHeight: 1.6 }, children: evidenceExplanation(comparison.evidenceTier, locale, comparison.baseline.games + comparison.variant.games, comparison.constraint) })] })] }));
}
function MetricChip({ label, value }) {
    return (_jsxs("div", { style: metricChipStyle, children: [_jsx("div", { style: metricChipLabelStyle, children: label }), _jsx("div", { style: metricChipValueStyle, children: value })] }));
}
function DeltaTile({ label, value }) {
    return (_jsxs("div", { style: deltaTileStyle, children: [_jsx("div", { style: metricChipLabelStyle, children: label }), _jsx("div", { style: deltaValueStyle, children: value })] }));
}
function ContextBox({ title, lines }) {
    return (_jsxs("div", { style: contextBoxStyle, children: [_jsx("div", { style: sectionLabelStyle, children: title }), _jsx("div", { style: { display: 'grid', gap: 4 }, children: lines.map((line) => _jsx("div", { style: { color: '#dce6f5', lineHeight: 1.5 }, children: line }, line)) })] }));
}
function DecisionBox({ title, value }) {
    return (_jsxs("div", { style: decisionBoxStyle, children: [_jsx("div", { style: sectionLabelStyle, children: title }), _jsx("div", { style: { color: '#ecf3ff', lineHeight: 1.6 }, children: value })] }));
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
const headlinePanelStyle = {
    padding: '14px 15px',
    borderRadius: 18,
    background: 'rgba(125,174,255,0.07)',
    border: '1px solid rgba(125,174,255,0.12)',
    color: '#deebff',
    lineHeight: 1.65
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
    gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
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
    gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
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
const recommendationStyle = {
    padding: '11px 12px',
    borderRadius: 14,
    background: 'rgba(126,245,199,0.08)',
    border: '1px solid rgba(126,245,199,0.14)',
    color: '#dff7eb',
    lineHeight: 1.6
};
const contextBoxStyle = {
    display: 'grid',
    gap: 8,
    padding: '11px 12px',
    borderRadius: 14,
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.05)'
};
const decisionBoxStyle = {
    display: 'grid',
    gap: 8,
    padding: '11px 12px',
    borderRadius: 14,
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.05)'
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
