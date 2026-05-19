import { jsx as _jsx, Fragment as _Fragment, jsxs as _jsxs } from "react/jsx-runtime";
import { useMemo, useState } from 'react';
import { Badge, Card, ChampionIdentity, KPI } from '../../components/ui';
import { formatDecimal, formatPercent, formatSignedNumber } from '../../lib/format';
import { formatChampionName, getRoleLabel } from '../../lib/lol';
import { buildChampionIntelligenceWorkbench } from './championIntelligenceWorkbench';
export function ChampionIntelligenceTab({ dataset, locale = 'es' }) {
    const workbench = useMemo(() => buildChampionIntelligenceWorkbench(dataset, locale), [dataset, locale]);
    const [selectedChampionName, setSelectedChampionName] = useState(workbench.selectedChampionName);
    const selectedChampion = workbench.champions.find((entry) => entry.championName === selectedChampionName) ?? workbench.champions[0] ?? null;
    if (!selectedChampion) {
        return (_jsx(Card, { title: copy(locale, 'Champion intelligence', 'Champion intelligence'), subtitle: copy(locale, 'Todavía no hay muestra suficiente para abrir una lectura de campeón.', 'There is not enough sample yet to open a champion read.'), children: _jsx("div", { style: { color: '#8a95a7', lineHeight: 1.7 }, children: copy(locale, 'Cargá más partidas válidas para empezar a conectar setups, matchups e identidad del pick con tu muestra real.', 'Load more valid matches to start connecting setups, matchups and champion identity to your real sample.') }) }));
    }
    return (_jsxs("div", { style: { display: 'grid', gap: 18 }, children: [_jsx(Card, { title: copy(locale, 'Champion intelligence', 'Champion intelligence'), subtitle: copy(locale, 'Una capa editorial honesta: setups, matchups y reads curadas ancladas a tu propia muestra.', 'An honest editorial layer: setups, matchups and curated reads anchored to your own sample.'), children: _jsxs("div", { style: heroLayoutStyle, children: [_jsxs("div", { style: { display: 'grid', gap: 16 }, children: [_jsx(ChampionIdentity, { championName: selectedChampion.championName, version: dataset.ddragonVersion, size: 70, subtitle: selectedChampion.headline, meta: _jsxs(_Fragment, { children: [_jsx(Badge, { tone: "default", children: selectedChampion.role === 'BOTTOM' ? 'ADC' : getRoleLabel(selectedChampion.role) }), _jsx(Badge, { tone: patchTone(selectedChampion.profile?.patchStatus), children: patchLabel(selectedChampion.profile?.patchStatus, locale) }), _jsx(Badge, { tone: "low", children: selectedChampion.profile?.sourceLabel ?? copy(locale, 'Curated read', 'Curated read') })] }) }), _jsxs("div", { style: { display: 'grid', gap: 10 }, children: [_jsx("div", { style: heroReadStyle, children: selectedChampion.subheadline }), _jsx("div", { style: { color: '#93a0b5', lineHeight: 1.75 }, children: selectedChampion.playerProof.playerFitReason })] }), _jsxs("div", { style: { display: 'flex', gap: 10, flexWrap: 'wrap' }, children: [selectedChampion.recommendedRuneLabel ? _jsxs(Badge, { tone: "default", children: [copy(locale, 'Runas base', 'Baseline runes'), ": ", selectedChampion.recommendedRuneLabel] }) : null, selectedChampion.recommendedBuildLabel ? _jsxs(Badge, { tone: "medium", children: [copy(locale, 'Build base', 'Baseline build'), ": ", selectedChampion.recommendedBuildLabel] }) : null] })] }), _jsxs("div", { style: proofPanelStyle, children: [_jsxs("div", { style: proofHeaderStyle, children: [_jsx("div", { style: { fontSize: 13, color: '#8a95a7', textTransform: 'uppercase', letterSpacing: '0.08em' }, children: copy(locale, 'Your proof', 'Your proof') }), _jsxs(Badge, { tone: "low", children: [selectedChampion.games, " ", copy(locale, 'partidas', 'games')] })] }), _jsxs("div", { style: proofGridStyle, children: [_jsx(KPI, { label: "WR", value: formatPercent(selectedChampion.playerProof.winRate), hint: selectedChampion.playerProof.recentTrendLabel }), _jsx(KPI, { label: "Score", value: formatDecimal(selectedChampion.playerProof.avgScore), hint: copy(locale, 'Promedio actual con este pick', 'Current average on this pick') }), _jsx(KPI, { label: "Gold@15", value: formatSignedNumber(selectedChampion.playerProof.avgGoldDiffAt15, 0), hint: copy(locale, 'Ventaja media al 15', 'Average lead at 15') }), _jsx(KPI, { label: copy(locale, 'Deaths pre14', 'Deaths pre14'), value: formatDecimal(selectedChampion.playerProof.avgDeathsPre14), hint: copy(locale, 'Cuánto castigo temprano estás absorbiendo', 'How much early punishment you are taking') })] })] })] }) }), _jsxs("div", { style: mainLayoutStyle, children: [_jsxs("div", { style: { display: 'grid', gap: 16 }, children: [_jsx(Card, { title: copy(locale, 'Champion desk', 'Champion desk'), subtitle: copy(locale, 'Elegí el pick que querés leer como una página real de setup intelligence.', 'Choose the pick you want to read as a real setup-intelligence page.'), children: _jsx("div", { style: championListStyle, children: workbench.champions.map((entry) => {
                                        const active = entry.championName === selectedChampion.championName;
                                        return (_jsx("button", { type: "button", onClick: () => setSelectedChampionName(entry.championName), style: {
                                                ...championOptionStyle,
                                                ...(active ? championOptionActiveStyle : {})
                                            }, children: _jsx(ChampionIdentity, { championName: entry.championName, version: dataset.ddragonVersion, size: 46, subtitle: entry.playerProof.playerFitLabel, meta: _jsxs(_Fragment, { children: [_jsxs(Badge, { tone: active ? 'low' : 'default', children: [entry.games, " ", copy(locale, 'partidas', 'games')] }), _jsx(Badge, { tone: entry.playerProof.winRate >= 52 ? 'low' : entry.playerProof.winRate <= 47 ? 'high' : 'default', children: formatPercent(entry.playerProof.winRate) })] }) }) }, entry.championName));
                                    }) }) }), _jsx(Card, { title: copy(locale, 'Setup variants', 'Setup variants'), subtitle: copy(locale, 'No es una lista de páginas: cada variante explica qué cambia en tu plan y cuándo conviene usarla.', 'This is not a page list: each variant explains what changes in your plan and when it makes sense to use it.'), children: _jsx("div", { style: { display: 'grid', gap: 14 }, children: selectedChampion.setupVariants.map((variant) => (_jsxs("div", { style: variantCardStyle, children: [_jsxs("div", { style: { display: 'grid', gap: 10 }, children: [_jsxs("div", { style: { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }, children: [_jsx("div", { style: { fontSize: 18, fontWeight: 800 }, children: variant.label }), _jsx(Badge, { tone: stanceTone(variant.stance), children: stanceLabel(variant.stance, locale) }), _jsx(Badge, { tone: confidenceTone(variant.confidence), children: confidenceLabel(variant.confidence, locale) })] }), _jsx("div", { style: { color: '#e5edf9', lineHeight: 1.65 }, children: variant.summary }), _jsxs("div", { style: { display: 'flex', gap: 8, flexWrap: 'wrap' }, children: [variant.keystone ? _jsxs(Badge, { tone: "default", children: [copy(locale, 'Keystone', 'Keystone'), ": ", variant.keystone] }) : null, variant.skillOrder.length ? _jsxs(Badge, { tone: "medium", children: [copy(locale, 'Skill order', 'Skill order'), ": ", variant.skillOrder.join(' > ')] }) : null, variant.itemPath.length ? _jsxs(Badge, { tone: "low", children: [copy(locale, 'Path', 'Path'), ": ", variant.itemPath.join(' -> ')] }) : null] })] }), _jsxs("div", { style: variantNotesGridStyle, children: [_jsx(InsightNote, { label: copy(locale, 'Best when', 'Best when'), value: variant.bestWhen }), _jsx(InsightNote, { label: copy(locale, 'Avoid when', 'Avoid when'), value: variant.avoidWhen }), _jsx(InsightNote, { label: copy(locale, 'Play pattern shift', 'Play pattern shift'), value: variant.playPatternShift })] })] }, variant.id))) }) }), _jsx(Card, { title: copy(locale, 'High-elo reads', 'High-elo reads'), subtitle: copy(locale, 'No pretendemos que un OTP escribió esto: son lecturas curadas, pequeñas y trazables.', 'We do not pretend an OTP wrote this: these are curated, compact and traceable reads.'), children: _jsx("div", { style: { display: 'grid', gap: 14 }, children: selectedChampion.highEloReads.length ? selectedChampion.highEloReads.map((read) => (_jsxs("div", { style: readCardStyle, children: [_jsxs("div", { style: { display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }, children: [_jsx("div", { style: { fontSize: 16, fontWeight: 800 }, children: read.label }), _jsx(Badge, { tone: confidenceTone(read.confidence), children: confidenceLabel(read.confidence, locale) }), _jsx(Badge, { tone: "default", children: read.type.replace(/_/g, ' ') })] }), _jsx("div", { style: { color: '#e9f0fb', lineHeight: 1.7 }, children: read.body })] }, read.id))) : (_jsx("div", { style: { color: '#8e99ac', lineHeight: 1.7 }, children: copy(locale, 'Todavía no cargamos reads curadas para este campeón. La estructura ya está preparada para sumar una capa de referencia real sin generar humo editorial.', 'We have not loaded curated reads for this champion yet. The structure is ready to add real reference material without generating editorial smoke.') })) }) })] }), _jsxs("div", { style: { display: 'grid', gap: 16 }, children: [_jsx(Card, { title: copy(locale, 'Matchup map', 'Matchup map'), subtitle: copy(locale, 'Cruzamos notes curadas con tu propia muestra. No marcamos “hardest matchup” por una sola derrota aislada.', 'We cross curated notes with your own sample. We do not label a “hardest matchup” from a single isolated loss.'), children: _jsx("div", { style: { display: 'grid', gap: 12 }, children: selectedChampion.matchupPlans.length ? selectedChampion.matchupPlans.map((matchup) => (_jsxs("div", { style: matchupCardStyle(matchup.verdict), children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', flexWrap: 'wrap' }, children: [_jsxs("div", { style: { display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }, children: [_jsx("div", { style: { fontSize: 18, fontWeight: 800 }, children: formatChampionName(matchup.opponentChampionName) }), _jsx(Badge, { tone: matchupTone(matchup.verdict), children: matchupLabel(matchup.verdict, locale) })] }), sampleBadgeForMatchup(selectedChampion, matchup, locale)] }), _jsx("div", { style: { color: '#e9f0fb', lineHeight: 1.68 }, children: matchup.answer }), _jsxs("div", { style: matchupDetailGridStyle, children: [_jsx(InsightNote, { label: copy(locale, 'What they punish', 'What they punish'), value: matchup.threat }), _jsx(InsightNote, { label: copy(locale, 'Your window', 'Your window'), value: matchup.answer }), _jsx(InsightNote, { label: copy(locale, 'Setup adjustment', 'Setup adjustment'), value: matchup.setupAdjustments.join(' · ') })] })] }, `${selectedChampion.championName}-${matchup.opponentChampionName}-${matchup.role}`))) : (_jsx("div", { style: { color: '#8e99ac', lineHeight: 1.7 }, children: copy(locale, 'Todavía no hay matchup notes curadas para este pick. La lectura se apoya por ahora en tus resultados medidos contra ese rival.', 'There are no curated matchup notes for this pick yet. The read currently leans on your measured results versus each opponent.') })) }) }), _jsx(Card, { title: copy(locale, 'Player fit', 'Player fit'), subtitle: copy(locale, 'La parte más diferencial: qué versión del campeón te conviene a vos, no sólo cuál gana globalmente.', 'The most differential layer: which version of the champion fits you, not only what wins globally.'), children: _jsxs("div", { style: { display: 'grid', gap: 14 }, children: [_jsxs("div", { style: playerFitBannerStyle, children: [_jsx("div", { style: { fontSize: 18, fontWeight: 800 }, children: selectedChampion.playerProof.playerFitLabel }), _jsx("div", { style: { color: '#d3dded', lineHeight: 1.7 }, children: selectedChampion.playerProof.playerFitReason })] }), _jsxs("div", { style: proofStatsGridStyle, children: [_jsx(KPI, { label: "KP", value: formatPercent(selectedChampion.playerProof.avgKillParticipation), hint: copy(locale, 'Participación media en kills', 'Average kill participation') }), _jsx(KPI, { label: copy(locale, 'Volatility', 'Volatility'), value: formatDecimal(selectedChampion.playerProof.avgLaneVolatility), hint: copy(locale, 'Cuánto se rompe tu early con este pick', 'How much your early breaks with this pick') }), _jsx(KPI, { label: copy(locale, 'Best matchup', 'Best matchup'), value: selectedChampion.playerProof.bestMatchup ? formatChampionName(selectedChampion.playerProof.bestMatchup.championName) : '—', hint: selectedChampion.playerProof.bestMatchup ? `${selectedChampion.playerProof.bestMatchup.games} ${copy(locale, 'partidas', 'games')} · ${formatPercent(selectedChampion.playerProof.bestMatchup.winRate)}` : copy(locale, 'Necesita más muestra confiable', 'Needs more reliable sample') }), _jsx(KPI, { label: copy(locale, 'Hardest matchup', 'Hardest matchup'), value: selectedChampion.playerProof.hardestMatchup ? formatChampionName(selectedChampion.playerProof.hardestMatchup.championName) : '—', hint: selectedChampion.playerProof.hardestMatchup ? `${selectedChampion.playerProof.hardestMatchup.games} ${copy(locale, 'partidas', 'games')} · ${formatPercent(selectedChampion.playerProof.hardestMatchup.winRate)}` : copy(locale, 'No declaramos uno con muestra floja', 'We do not declare one with weak sample') })] })] }) }), _jsx(Card, { title: copy(locale, 'Review triggers', 'Review triggers'), subtitle: copy(locale, 'Checklist real para saber qué partida revisar primero y qué ventana de ejecución auditar.', 'A real checklist to decide which game to review first and which execution window to audit.'), children: _jsx("div", { style: { display: 'grid', gap: 12 }, children: selectedChampion.reviewTriggers.length ? selectedChampion.reviewTriggers.map((trigger) => (_jsxs("div", { style: triggerCardStyle, children: [_jsxs("div", { style: { display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }, children: [_jsx("div", { style: { fontSize: 16, fontWeight: 800 }, children: trigger.label }), _jsx(Badge, { tone: "medium", children: copy(locale, 'Review lens', 'Review lens') })] }), _jsx("div", { style: { color: '#e8eefb', lineHeight: 1.7 }, children: trigger.condition }), _jsxs("div", { style: variantNotesGridStyle, children: [_jsx(InsightNote, { label: copy(locale, 'Why it matters', 'Why it matters'), value: trigger.whyItMatters }), _jsx(InsightNote, { label: copy(locale, 'Prompts', 'Prompts'), value: trigger.prompts.join(' · ') }), _jsx(InsightNote, { label: copy(locale, 'Use it when', 'Use it when'), value: copy(locale, 'Esa partida parece “normal”, pero la ventana clave del pick llegó rota o tarde.', 'The game looks normal on the surface, but the pick’s key window arrived broken or late.') })] })] }, trigger.id))) : (_jsx("div", { style: { color: '#8e99ac', lineHeight: 1.7 }, children: copy(locale, 'Todavía no hay review triggers curados para este campeón. La estructura ya está lista para sumar reglas más fuertes por pick.', 'There are no curated review triggers for this champion yet. The structure is ready to add stronger pick-specific rules.') })) }) })] })] })] }));
}
function sampleBadgeForMatchup(champion, matchup, locale) {
    const best = champion.playerProof.bestMatchup;
    const hardest = champion.playerProof.hardestMatchup;
    if (hardest && hardest.championName === matchup.opponentChampionName) {
        return _jsx(Badge, { tone: "high", children: copy(locale, 'Tu muestra hoy lo marca como cruce duro', 'Your sample currently flags this as a hard matchup') });
    }
    if (best && best.championName === matchup.opponentChampionName) {
        return _jsx(Badge, { tone: "low", children: copy(locale, 'Tu muestra hoy lo está resolviendo bien', 'Your sample is currently handling this well') });
    }
    return _jsx(Badge, { tone: "default", children: copy(locale, 'Referencia curada', 'Curated reference') });
}
function InsightNote({ label, value }) {
    return (_jsxs("div", { style: insightNoteStyle, children: [_jsx("div", { style: insightLabelStyle, children: label }), _jsx("div", { style: { color: '#d8e2f0', lineHeight: 1.62 }, children: value })] }));
}
function copy(locale, es, en) {
    return locale === 'en' ? en : es;
}
function patchTone(status) {
    if (status === 'stable')
        return 'low';
    if (status === 'patch_sensitive')
        return 'medium';
    return 'default';
}
function patchLabel(status, locale) {
    if (status === 'stable')
        return copy(locale, 'Identity stable', 'Identity stable');
    if (status === 'patch_sensitive')
        return copy(locale, 'Patch sensitive', 'Patch sensitive');
    return copy(locale, 'Watch patch', 'Watch patch');
}
function stanceTone(stance) {
    if (stance === 'snowball' || stance === 'anti_frontline')
        return 'medium';
    if (stance === 'stability' || stance === 'utility')
        return 'low';
    return 'default';
}
function stanceLabel(stance, locale) {
    const labels = {
        default: { es: 'Default', en: 'Default' },
        snowball: { es: 'Snowball', en: 'Snowball' },
        stability: { es: 'Stability', en: 'Stability' },
        utility: { es: 'Utility', en: 'Utility' },
        anti_frontline: { es: 'Anti-frontline', en: 'Anti-frontline' },
        anti_range: { es: 'Anti-range', en: 'Anti-range' }
    };
    const label = labels[stance] ?? { es: stance, en: stance };
    return copy(locale, label.es, label.en);
}
function confidenceTone(confidence) {
    if (confidence === 'measured')
        return 'low';
    if (confidence === 'curated')
        return 'default';
    if (confidence === 'inferred')
        return 'medium';
    return 'high';
}
function confidenceLabel(confidence, locale) {
    const labels = {
        measured: { es: 'Measured', en: 'Measured' },
        curated: { es: 'Curated', en: 'Curated' },
        inferred: { es: 'Inferred', en: 'Inferred' },
        hypothesis: { es: 'Hypothesis', en: 'Hypothesis' }
    };
    const label = labels[confidence] ?? { es: confidence, en: confidence };
    return copy(locale, label.es, label.en);
}
function matchupTone(tone) {
    if (tone === 'favored')
        return 'low';
    if (tone === 'difficult')
        return 'high';
    return 'default';
}
function matchupLabel(tone, locale) {
    const labels = {
        favored: { es: 'Favorable', en: 'Favorable' },
        difficult: { es: 'Difícil', en: 'Difficult' },
        skill: { es: 'Skill test', en: 'Skill test' }
    };
    const label = labels[tone] ?? { es: tone, en: tone };
    return copy(locale, label.es, label.en);
}
const heroLayoutStyle = {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1.5fr) minmax(320px, 0.9fr)',
    gap: 18,
    alignItems: 'stretch'
};
const heroReadStyle = {
    fontSize: 16,
    color: '#edf3ff',
    lineHeight: 1.6
};
const proofPanelStyle = {
    display: 'grid',
    gap: 14,
    alignContent: 'start',
    padding: 18,
    borderRadius: 18,
    background: 'radial-gradient(circle at top, rgba(98, 237, 214, 0.12), transparent 35%), linear-gradient(180deg, rgba(10, 16, 26, 0.96), rgba(6, 10, 18, 0.98))',
    border: '1px solid rgba(123, 236, 214, 0.12)'
};
const proofHeaderStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    gap: 10,
    alignItems: 'center',
    flexWrap: 'wrap'
};
const proofGridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: 12
};
const mainLayoutStyle = {
    display: 'grid',
    gridTemplateColumns: 'minmax(0, 1.2fr) minmax(360px, 0.92fr)',
    gap: 18,
    alignItems: 'start'
};
const championListStyle = {
    display: 'grid',
    gap: 10
};
const championOptionStyle = {
    display: 'grid',
    gap: 12,
    width: '100%',
    padding: 14,
    borderRadius: 18,
    border: '1px solid rgba(255,255,255,0.06)',
    background: 'linear-gradient(180deg, rgba(8,12,20,0.9), rgba(6,9,15,0.94))',
    textAlign: 'left',
    cursor: 'pointer'
};
const championOptionActiveStyle = {
    border: '1px solid rgba(133, 243, 214, 0.2)',
    boxShadow: '0 22px 44px rgba(0,0,0,0.16), inset 0 0 0 1px rgba(111, 236, 209, 0.08)',
    background: 'radial-gradient(circle at top left, rgba(84, 220, 190, 0.12), transparent 40%), linear-gradient(180deg, rgba(8,12,20,0.94), rgba(6,9,15,0.98))'
};
const variantCardStyle = {
    display: 'grid',
    gap: 14,
    padding: 16,
    borderRadius: 18,
    background: 'linear-gradient(180deg, rgba(9,14,24,0.96), rgba(6,10,18,0.98))',
    border: '1px solid rgba(255,255,255,0.06)'
};
const variantNotesGridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: 12
};
const readCardStyle = {
    display: 'grid',
    gap: 8,
    padding: 15,
    borderRadius: 16,
    background: '#070c14',
    border: '1px solid rgba(255,255,255,0.05)'
};
const playerFitBannerStyle = {
    display: 'grid',
    gap: 8,
    padding: 16,
    borderRadius: 18,
    background: 'radial-gradient(circle at top left, rgba(91, 226, 189, 0.12), transparent 42%), linear-gradient(180deg, rgba(10,15,23,0.96), rgba(8,12,19,0.98))',
    border: '1px solid rgba(111, 236, 209, 0.1)'
};
const proofStatsGridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
    gap: 12
};
const insightNoteStyle = {
    display: 'grid',
    gap: 6,
    padding: 12,
    borderRadius: 14,
    background: '#07101a',
    border: '1px solid rgba(255,255,255,0.04)'
};
const insightLabelStyle = {
    color: '#8f9cb2',
    fontSize: 12,
    textTransform: 'uppercase',
    letterSpacing: '0.08em'
};
const matchupDetailGridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(3, minmax(0, 1fr))',
    gap: 12
};
function matchupCardStyle(tone) {
    const accent = tone === 'favored'
        ? 'rgba(126, 245, 199, 0.18)'
        : tone === 'difficult'
            ? 'rgba(255, 107, 107, 0.18)'
            : 'rgba(111, 191, 255, 0.14)';
    return {
        display: 'grid',
        gap: 12,
        padding: 16,
        borderRadius: 18,
        background: `linear-gradient(180deg, rgba(8,12,19,0.96), rgba(6,9,15,0.98)), ${accent}`,
        border: `1px solid ${accent}`
    };
}
const triggerCardStyle = {
    display: 'grid',
    gap: 8,
    padding: 15,
    borderRadius: 16,
    background: '#070c14',
    border: '1px solid rgba(255,255,255,0.05)'
};
