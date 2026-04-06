import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useMemo, useState } from 'react';
import { formatDecimal, formatSignedNumber } from '../../lib/format';
import { formatChampionName, getItemIconUrl, getQueueLabel, getRoleLabel } from '../../lib/lol';
import { Badge, ChampionIdentity, InfoHint } from '../../components/ui';
import { buildMatchQuickRead, formatMatchDuration, getChampionAccent } from '../dashboard/dashboardSignals';
function toneToBadgeTone(tone) {
    switch (tone) {
        case 'reference':
            return 'low';
        case 'stable':
            return 'default';
        case 'volatile':
            return 'medium';
        case 'warning':
            return 'high';
        default:
            return 'default';
    }
}
function formatObjectives(match, locale) {
    const pieces = [
        match.turretKills ? (locale === 'en' ? `${match.turretKills} towers` : `${match.turretKills} torres`) : null,
        match.dragonKills ? (locale === 'en' ? `${match.dragonKills} drakes` : `${match.dragonKills} dragones`) : null,
        match.baronKills ? (locale === 'en' ? `${match.baronKills} barons` : `${match.baronKills} barones`) : null
    ].filter(Boolean);
    return pieces.length
        ? pieces.join(' · ')
        : (locale === 'en' ? 'No major objectives secured' : 'Sin objetivos mayores asegurados');
}
function buildObjectiveTokens(match, locale) {
    const tokens = [];
    if (match.dragonKills)
        tokens.push({ key: 'dragon', label: locale === 'en' ? 'Drake' : 'Dragón', value: match.dragonKills, tone: 'low' });
    if (match.baronKills)
        tokens.push({ key: 'baron', label: 'Nashor', value: match.baronKills, tone: 'default' });
    if (match.turretKills)
        tokens.push({ key: 'tower', label: locale === 'en' ? 'Tower' : 'Torre', value: match.turretKills, tone: 'default' });
    if (match.firstBloodKill)
        tokens.push({ key: 'fb', label: 'FB', tone: 'medium' });
    if (match.firstTowerKill)
        tokens.push({ key: 'ft', label: 'FT', tone: 'medium' });
    const multiKills = (match.doubleKills ?? 0) + (match.tripleKills ?? 0) + (match.quadraKills ?? 0) + (match.pentaKills ?? 0);
    if (multiKills > 0)
        tokens.push({ key: 'multi', label: locale === 'en' ? 'Multi' : 'Multi', value: multiKills, tone: 'low' });
    return tokens;
}
function formatDetailDate(gameCreation, locale) {
    return new Date(gameCreation).toLocaleDateString(locale === 'en' ? 'en-US' : 'es-AR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    });
}
function detailMetricLabel(locale, key) {
    const labels = {
        firstDeath: { en: 'First death', es: 'Primera muerte' },
        firstBase: { en: 'First base', es: 'Primera base' },
        firstMove: { en: 'First move', es: 'Primer move' },
        firstItem: { en: 'First item', es: 'Primer item' },
        laneVolatility: { en: 'Lane volatility', es: 'Volatilidad' },
        setupScore: { en: 'Setup score', es: 'Score de setup' },
        damage: { en: 'Damage to champs', es: 'Daño a champs' },
        totalDamage: { en: 'Total damage', es: 'Daño total' },
        vision: { en: 'Vision', es: 'Visión' },
        takedowns: { en: 'Takedowns pre14', es: 'Takedowns pre14' },
        deaths: { en: 'Deaths pre14', es: 'Muertes pre14' },
        goldDiff: { en: 'Gold diff 15', es: 'Diff oro 15' }
    };
    return labels[key][locale];
}
function renderItemRow(match, dataset, locale) {
    const finalBuild = match.items?.finalBuild ?? [];
    if (!finalBuild.length)
        return null;
    return (_jsxs("div", { style: { display: 'grid', gap: 10 }, children: [_jsx("div", { style: sectionEyebrowStyle, children: locale === 'en' ? 'Final build snapshot' : 'Snapshot de build final' }), _jsx("div", { style: { display: 'flex', gap: 8, flexWrap: 'wrap' }, children: finalBuild.slice(0, 6).map((itemId) => {
                    const iconUrl = getItemIconUrl(itemId, dataset.ddragonVersion);
                    const itemName = dataset.itemCatalog?.[String(itemId)]?.name ?? `Item ${itemId}`;
                    return (_jsx("div", { style: itemShellStyle, title: itemName, children: iconUrl ? _jsx("img", { src: iconUrl, alt: itemName, width: 34, height: 34, style: { width: 34, height: 34, borderRadius: 10, display: 'block' } }) : _jsx("span", { style: { fontSize: 10, color: '#dfe8f7', fontWeight: 700 }, children: itemId }) }, `${match.matchId}-${itemId}`));
                }) })] }));
}
export function MatchesTab({ dataset, locale = 'es' }) {
    const [expandedMatchId, setExpandedMatchId] = useState(null);
    const matches = useMemo(() => [...dataset.matches].sort((left, right) => right.gameCreation - left.gameCreation), [dataset.matches]);
    return (_jsx("div", { style: { display: 'grid', gap: 16 }, children: matches.map((match) => {
            const accent = getChampionAccent(match.championName);
            const quickRead = buildMatchQuickRead(match, dataset, locale);
            const expanded = expandedMatchId === match.matchId;
            const firstItemMinute = match.items?.milestones.firstCompletedItemMinute;
            const firstItemName = match.items?.milestones.firstCompletedItemId
                ? dataset.itemCatalog?.[String(match.items.milestones.firstCompletedItemId)]?.name ?? null
                : null;
            const objectiveTokens = buildObjectiveTokens(match, locale);
            const earlyDetailMetrics = [
                { label: detailMetricLabel(locale, 'deaths'), value: formatDecimal(match.timeline.deathsPre14) },
                { label: detailMetricLabel(locale, 'laneVolatility'), value: formatDecimal(match.timeline.laneVolatilityScore, 1) },
                ...(match.timeline.firstDeathMinute !== null ? [{ label: detailMetricLabel(locale, 'firstDeath'), value: `${formatDecimal(match.timeline.firstDeathMinute, 1)}m` }] : []),
                ...(match.timeline.firstBaseMinute !== null ? [{ label: detailMetricLabel(locale, 'firstBase'), value: `${formatDecimal(match.timeline.firstBaseMinute, 1)}m` }] : []),
                ...(match.timeline.firstMoveMinute !== null ? [{ label: detailMetricLabel(locale, 'firstMove'), value: `${formatDecimal(match.timeline.firstMoveMinute, 1)}m` }] : []),
                ...(firstItemMinute ? [{ label: detailMetricLabel(locale, 'firstItem'), value: `${formatDecimal(firstItemMinute, 1)}m` }] : []),
                { label: detailMetricLabel(locale, 'goldDiff'), value: formatSignedNumber(match.timeline.goldDiffAt15, 0) },
                { label: locale === 'en' ? 'Level diff 15' : 'Diff nivel 15', value: formatSignedNumber(match.timeline.levelDiffAt15, 1) }
            ];
            return (_jsxs("article", { style: {
                    display: 'grid',
                    gap: 16,
                    padding: 18,
                    borderRadius: 24,
                    background: accent.panel,
                    border: `1px solid ${accent.border}`,
                    boxShadow: `0 18px 38px rgba(0,0,0,0.18), 0 0 0 1px rgba(255,255,255,0.02), 0 0 16px ${accent.glow}`
                }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', gap: 16, alignItems: 'start', flexWrap: 'wrap' }, children: [_jsx(ChampionIdentity, { championName: match.championName, version: dataset.ddragonVersion, subtitle: `${formatDetailDate(match.gameCreation, locale)} · ${getQueueLabel(match.queueId)} · ${formatMatchDuration(match.gameDurationSeconds, locale)}`, meta: _jsxs(_Fragment, { children: [_jsx(Badge, { tone: match.win ? 'low' : 'high', children: match.win ? (locale === 'en' ? 'Win' : 'Victoria') : (locale === 'en' ? 'Loss' : 'Derrota') }), _jsx(Badge, { tone: toneToBadgeTone(quickRead.tone), children: quickRead.toneLabel }), _jsx(Badge, { tone: toneToBadgeTone(quickRead.tone), children: quickRead.impactLabel }), _jsx(Badge, { children: match.opponentChampionName ? `vs ${formatChampionName(match.opponentChampionName)}` : (locale === 'en' ? 'Opponent unknown' : 'Rival sin detectar') }), _jsx(Badge, { children: locale === 'en' ? getRoleLabel(match.role || dataset.summary.primaryRole || 'ALL') : getRoleLabel(match.role || dataset.summary.primaryRole || 'ALL') }), _jsx(Badge, { children: `${match.kills}/${match.deaths}/${match.assists}` }), _jsx(Badge, { children: `${formatDecimal(match.killParticipation)}% KP` })] }) }), _jsx("div", { style: { display: 'grid', gap: 10, justifyItems: 'end' }, children: _jsx("button", { type: "button", onClick: () => setExpandedMatchId(expanded ? null : match.matchId), style: detailToggleStyle, children: expanded
                                        ? (locale === 'en' ? 'Hide mini detail' : 'Ocultar mini detail')
                                        : (locale === 'en' ? 'Open mini detail' : 'Abrir mini detail') }) })] }), _jsxs("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 14 }, children: [_jsxs("div", { style: { display: 'grid', gap: 12 }, children: [_jsxs("div", { style: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(118px, 1fr))', gap: 10 }, children: [_jsx(CompactMetric, { label: locale === 'en' ? 'Score' : 'Score', value: formatDecimal(match.score.total), info: locale === 'en' ? 'Internal execution score for this exact match.' : 'Score interno de ejecución para esta partida exacta.' }), _jsx(CompactMetric, { label: locale === 'en' ? 'Gold diff 15' : 'Diff oro 15', value: formatSignedNumber(match.timeline.goldDiffAt15, 0), info: locale === 'en' ? 'Gold edge against the detected direct opponent at minute 15.' : 'Ventaja de oro contra el rival directo detectado al minuto 15.' }), _jsx(CompactMetric, { label: locale === 'en' ? 'CS 15' : 'CS 15', value: formatDecimal(match.timeline.csAt15), info: locale === 'en' ? 'Lane or jungle economy accumulated by minute 15.' : 'Economía de línea o jungla acumulada al minuto 15.' }), _jsx(CompactMetric, { label: locale === 'en' ? 'Damage' : 'Daño', value: Math.round(match.damageToChampions).toLocaleString(locale === 'en' ? 'en-US' : 'es-AR'), info: locale === 'en' ? 'Damage dealt to enemy champions.' : 'Daño hecho a campeones enemigos.' }), _jsx(CompactMetric, { label: locale === 'en' ? 'Objectives' : 'Objetivos', value: `${(match.turretKills ?? 0) + (match.dragonKills ?? 0) + (match.baronKills ?? 0)}`, info: locale === 'en' ? 'Towers, dragons and barons secured by you.' : 'Torres, dragones y barones asegurados por vos.' }), _jsx(CompactMetric, { label: locale === 'en' ? 'Deaths pre14' : 'Muertes pre14', value: formatDecimal(match.timeline.deathsPre14), info: locale === 'en' ? 'How expensive the early game got before minute 14.' : 'Qué tan caro se volvió el early antes del minuto 14.' })] }), _jsxs("div", { style: { display: 'flex', gap: 8, flexWrap: 'wrap' }, children: [objectiveTokens.length
                                                ? objectiveTokens.map((token) => (_jsx(SignalBadge, { tone: token.tone ?? 'default', children: token.value ? `${token.label} ${token.value}` : token.label }, `${match.matchId}-${token.key}`)))
                                                : _jsx(SignalBadge, { tone: "default", children: formatObjectives(match, locale) }), match.timeline.firstDeathMinute !== null ? _jsx(SignalBadge, { tone: "medium", children: `${detailMetricLabel(locale, 'firstDeath')} ${formatDecimal(match.timeline.firstDeathMinute, 1)}m` }) : null, match.timeline.firstBaseMinute !== null ? _jsx(SignalBadge, { tone: "default", children: `${detailMetricLabel(locale, 'firstBase')} ${formatDecimal(match.timeline.firstBaseMinute, 1)}m` }) : null, firstItemMinute ? _jsx(SignalBadge, { tone: "default", children: `${detailMetricLabel(locale, 'firstItem')} ${formatDecimal(firstItemMinute, 1)}m` }) : null, (match.timeline.laneVolatilityScore ?? 0) >= 1.4 ? _jsx(SignalBadge, { tone: "high", children: locale === 'en' ? 'Volatile early' : 'Early volátil' }) : null, (match.timeline.objectiveSetupScore ?? 0) >= 0.8 ? _jsx(SignalBadge, { tone: "medium", children: locale === 'en' ? 'Setup debt' : 'Deuda de setup' }) : null, (match.timeline.resetTimingScore ?? 0) >= 1 ? _jsx(SignalBadge, { tone: "medium", children: locale === 'en' ? 'Reset debt' : 'Deuda de reset' }) : null, match.firstBloodKill ? _jsx(SignalBadge, { tone: "low", children: locale === 'en' ? 'First blood' : 'First blood' }) : null, match.firstTowerKill ? _jsx(SignalBadge, { tone: "low", children: locale === 'en' ? 'First tower' : 'First tower' }) : null, match.doubleKills > 0 || match.tripleKills > 0 || match.quadraKills > 0 || match.pentaKills > 0
                                                ? _jsx(SignalBadge, { tone: "low", children: locale === 'en' ? 'Multi-kill pressure' : 'Presión de multi-kill' })
                                                : null] })] }), _jsxs("div", { style: {
                                    display: 'grid',
                                    gap: 12,
                                    padding: 16,
                                    borderRadius: 18,
                                    background: 'linear-gradient(180deg, rgba(9,13,21,0.84), rgba(7,10,16,0.96))',
                                    border: `1px solid ${accent.border}`
                                }, children: [_jsx("div", { style: { color: accent.muted, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.09em', fontWeight: 800 }, children: locale === 'en' ? 'Quick read' : 'Lectura rápida' }), _jsx("div", { style: { color: accent.text, fontSize: 20, lineHeight: 1.15, fontWeight: 850 }, children: quickRead.title }), _jsx("div", { style: { color: '#d8e3f5', lineHeight: 1.7 }, children: quickRead.body }), _jsx("div", { style: { display: 'grid', gap: 8 }, children: quickRead.evidence.slice(0, 2).map((entry) => (_jsx("div", { style: evidenceRowStyle, children: entry }, entry))) })] })] }), expanded ? (_jsx("div", { style: detailSurfaceStyle, children: _jsxs("div", { style: { display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }, children: [_jsxs("div", { style: { display: 'grid', gap: 16 }, children: [_jsx(DetailSection, { title: locale === 'en' ? 'Why this game landed here' : 'Por qué esta partida cayó acá', subtitle: locale === 'en' ? 'The goal is to decide what deserves review first.' : 'La idea es decidir qué merece review primero.', children: _jsxs("div", { style: { display: 'grid', gap: 8 }, children: [quickRead.reviewBullets.map((entry) => (_jsx("div", { style: bulletRowStyle, children: entry }, entry))), _jsx("div", { style: bulletRowStyle, children: locale === 'en'
                                                            ? `${championNameOrFallback(match.championName)} vs ${match.opponentChampionName ? formatChampionName(match.opponentChampionName) : 'unknown opponent'} in ${getRoleLabel(match.role || dataset.summary.primaryRole || 'ALL')} should be reviewed with this lens first.`
                                                            : `${championNameOrFallback(match.championName)} vs ${match.opponentChampionName ? formatChampionName(match.opponentChampionName) : 'rival desconocido'} en ${getRoleLabel(match.role || dataset.summary.primaryRole || 'ALL')} conviene revisarlo primero con esta lente.` })] }) }), _jsx(DetailSection, { title: locale === 'en' ? 'Early state and tempo' : 'Estado temprano y tempo', subtitle: locale === 'en' ? 'Useful to separate lane issue, reset issue or setup issue.' : 'Sirve para separar si fue un problema de línea, reset o setup.', children: _jsx("div", { style: detailMetricGridStyle, children: earlyDetailMetrics.map((metric) => (_jsx(DetailMetric, { label: metric.label, value: metric.value }, `${match.matchId}-${metric.label}`))) }) })] }), _jsxs("div", { style: { display: 'grid', gap: 16 }, children: [_jsxs(DetailSection, { title: locale === 'en' ? 'Impact and objective context' : 'Impacto y contexto de objetivos', subtitle: locale === 'en' ? 'Good to tell apart noisy score from real influence.' : 'Útil para separar score ruidoso de influencia real.', children: [_jsxs("div", { style: detailMetricGridStyle, children: [_jsx(DetailMetric, { label: detailMetricLabel(locale, 'damage'), value: Math.round(match.damageToChampions).toLocaleString(locale === 'en' ? 'en-US' : 'es-AR') }), _jsx(DetailMetric, { label: detailMetricLabel(locale, 'totalDamage'), value: Math.round(match.totalDamageDealt ?? 0).toLocaleString(locale === 'en' ? 'en-US' : 'es-AR') }), _jsx(DetailMetric, { label: detailMetricLabel(locale, 'vision'), value: Math.round(match.visionScore).toLocaleString(locale === 'en' ? 'en-US' : 'es-AR') }), _jsx(DetailMetric, { label: detailMetricLabel(locale, 'takedowns'), value: formatDecimal(match.timeline.takedownsPre14) }), _jsx(DetailMetric, { label: detailMetricLabel(locale, 'setupScore'), value: formatDecimal(match.timeline.objectiveSetupScore, 1) }), _jsx(DetailMetric, { label: locale === 'en' ? 'Setup deaths' : 'Muertes de setup', value: formatDecimal(match.timeline.objectiveSetupDeaths, 1) })] }), _jsxs("div", { style: { display: 'flex', gap: 8, flexWrap: 'wrap' }, children: [match.soloKills ? _jsx(SignalBadge, { tone: "default", children: locale === 'en' ? `${match.soloKills} solo kills` : `${match.soloKills} solo kills` }) : null, match.doubleKills ? _jsx(SignalBadge, { tone: "low", children: locale === 'en' ? `${match.doubleKills} doubles` : `${match.doubleKills} dobles` }) : null, match.tripleKills ? _jsx(SignalBadge, { tone: "low", children: locale === 'en' ? `${match.tripleKills} triples` : `${match.tripleKills} triples` }) : null, match.quadraKills ? _jsx(SignalBadge, { tone: "low", children: locale === 'en' ? `${match.quadraKills} quadras` : `${match.quadraKills} quadras` }) : null, match.pentaKills ? _jsx(SignalBadge, { tone: "low", children: locale === 'en' ? `${match.pentaKills} pentas` : `${match.pentaKills} pentas` }) : null] })] }), _jsx(DetailSection, { title: locale === 'en' ? 'Build and item timing' : 'Build y timing de items', subtitle: firstItemName
                                                ? (locale === 'en' ? `First completed item: ${firstItemName}` : `Primer item completo: ${firstItemName}`)
                                                : (locale === 'en' ? 'Useful to review when the curve actually came online.' : 'Sirve para revisar cuándo entró en línea la curva real.'), children: renderItemRow(match, dataset, locale) })] })] }) })) : null] }, match.matchId));
        }) }));
}
function championNameOrFallback(championName) {
    return championName ? formatChampionName(championName) : 'Champion';
}
function CompactMetric({ label, value, info }) {
    return (_jsxs("div", { style: compactMetricStyle, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', color: '#90a1b8', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.07em' }, children: [label, _jsx(InfoHint, { text: info })] }), _jsx("div", { style: { color: '#f6fbff', fontSize: 22, fontWeight: 850, lineHeight: 1.1 }, children: value })] }));
}
function SignalBadge({ children, tone = 'default' }) {
    return _jsx(Badge, { tone: tone, children: children });
}
function DetailSection({ title, subtitle, children }) {
    return (_jsxs("div", { style: detailSectionStyle, children: [_jsxs("div", { style: { display: 'grid', gap: 5 }, children: [_jsx("div", { style: { color: '#f2f7ff', fontSize: 15, fontWeight: 800 }, children: title }), _jsx("div", { style: { color: '#8d9cb2', fontSize: 13, lineHeight: 1.55 }, children: subtitle })] }), children] }));
}
function DetailMetric({ label, value }) {
    return (_jsxs("div", { style: detailMetricStyle, children: [_jsx("div", { style: { color: '#7d8da6', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em' }, children: label }), _jsx("div", { style: { color: '#f0f6ff', fontSize: 18, fontWeight: 800 }, children: value })] }));
}
const compactMetricStyle = {
    display: 'grid',
    gap: 8,
    padding: '13px 12px',
    borderRadius: 16,
    background: 'rgba(7,10,16,0.78)',
    border: '1px solid rgba(255,255,255,0.06)'
};
const evidenceRowStyle = {
    color: '#d7e0ef',
    fontSize: 13,
    lineHeight: 1.65,
    padding: '10px 11px',
    borderRadius: 12,
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.05)'
};
const detailToggleStyle = {
    padding: '10px 13px',
    borderRadius: 999,
    border: '1px solid rgba(255,255,255,0.09)',
    background: 'rgba(255,255,255,0.04)',
    color: '#edf4ff',
    cursor: 'pointer',
    fontWeight: 700
};
const detailSurfaceStyle = {
    display: 'grid',
    gap: 14,
    padding: 16,
    borderRadius: 20,
    background: 'linear-gradient(180deg, rgba(5,8,13,0.9), rgba(8,11,18,0.96))',
    border: '1px solid rgba(255,255,255,0.07)'
};
const detailSectionStyle = {
    display: 'grid',
    gap: 14,
    padding: 16,
    borderRadius: 18,
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.05)'
};
const detailMetricGridStyle = {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
    gap: 10
};
const detailMetricStyle = {
    display: 'grid',
    gap: 6,
    padding: '11px 12px',
    borderRadius: 14,
    background: '#070b12',
    border: '1px solid rgba(255,255,255,0.05)'
};
const bulletRowStyle = {
    color: '#dde7f7',
    lineHeight: 1.65,
    padding: '10px 12px',
    borderRadius: 12,
    background: '#070b12',
    border: '1px solid rgba(255,255,255,0.05)'
};
const sectionEyebrowStyle = {
    color: '#90a1b8',
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: '0.08em',
    fontWeight: 800
};
const itemShellStyle = {
    width: 38,
    height: 38,
    borderRadius: 12,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#070b12',
    border: '1px solid rgba(255,255,255,0.07)'
};
