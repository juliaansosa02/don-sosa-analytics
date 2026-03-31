import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { Card, Badge, InfoHint } from '../../components/ui';
import { formatDecimal, formatSignedNumber } from '../../lib/format';
import { buildCs15ProgressionBenchmark, buildLevel15ProgressionBenchmark } from '../../lib/benchmarks';
import { getQueueBucket, getRoleLabel } from '../../lib/lol';
const ROLE_BENCHMARK_MIN_SAMPLE = 30;
const CHAMPION_BENCHMARK_MIN_SAMPLE = 15;
const tierOrder = ['IRON', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'EMERALD', 'DIAMOND', 'MASTER', 'GRANDMASTER', 'CHALLENGER'];
function detectPrimaryRole(dataset) {
    const counts = new Map();
    for (const match of dataset.matches) {
        const role = match.role || 'ALL';
        counts.set(role, (counts.get(role) ?? 0) + 1);
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'ALL';
}
function detectPrimaryQueueBucket(dataset) {
    const counts = new Map();
    for (const match of dataset.matches) {
        const bucket = getQueueBucket(match.queueId);
        counts.set(bucket, (counts.get(bucket) ?? 0) + 1);
    }
    return Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0]?.[0] ?? 'OTHER';
}
function detectAnchorChampion(dataset) {
    const counts = new Map();
    for (const match of dataset.matches) {
        counts.set(match.championName, (counts.get(match.championName) ?? 0) + 1);
    }
    const [championName, games] = Array.from(counts.entries()).sort((a, b) => b[1] - a[1])[0] ?? [];
    if (!championName || !games || games / Math.max(dataset.matches.length, 1) < 0.35)
        return null;
    return championName;
}
function averageLevelAt15(dataset) {
    return dataset.matches.length
        ? dataset.matches.reduce((sum, match) => sum + (match.timeline.levelAt15 ?? 0), 0) / dataset.matches.length
        : 0;
}
function nextTier(tier) {
    if (!tier)
        return null;
    const index = tierOrder.indexOf(tier);
    if (index === -1 || index === tierOrder.length - 1)
        return null;
    return tierOrder[index + 1];
}
function queueLabel(queueBucket) {
    if (queueBucket === 'RANKED_SOLO')
        return 'Solo/Duo';
    if (queueBucket === 'RANKED_FLEX')
        return 'Flex';
    return 'otras colas';
}
function findBenchmarkRecord(records, options) {
    if (!options.tier)
        return null;
    return records.find((record) => record.role === options.role &&
        record.queueBucket === options.queueBucket &&
        record.tier === options.tier &&
        record.championName === (options.championName ?? null)) ?? null;
}
function resolveBenchmarkContext(dataset, primaryRole) {
    const primaryQueueBucket = detectPrimaryQueueBucket(dataset);
    const anchorChampion = detectAnchorChampion(dataset);
    const benchmarkTier = primaryQueueBucket === 'RANKED_SOLO'
        ? dataset.rank?.soloQueue.tier
        : primaryQueueBucket === 'RANKED_FLEX'
            ? dataset.rank?.flexQueue.tier
            : dataset.rank?.highest.tier;
    const nextBenchmarkTier = nextTier(benchmarkTier);
    const championCurrent = findBenchmarkRecord(dataset.benchmarks?.championBenchmarks ?? [], {
        role: primaryRole,
        queueBucket: primaryQueueBucket,
        tier: benchmarkTier,
        championName: anchorChampion
    });
    const championNext = findBenchmarkRecord(dataset.benchmarks?.championBenchmarks ?? [], {
        role: primaryRole,
        queueBucket: primaryQueueBucket,
        tier: nextBenchmarkTier,
        championName: anchorChampion
    });
    const roleCurrent = findBenchmarkRecord(dataset.benchmarks?.roleBenchmarks ?? [], {
        role: primaryRole,
        queueBucket: primaryQueueBucket,
        tier: benchmarkTier
    });
    const roleNext = findBenchmarkRecord(dataset.benchmarks?.roleBenchmarks ?? [], {
        role: primaryRole,
        queueBucket: primaryQueueBucket,
        tier: nextBenchmarkTier
    });
    const championReady = championCurrent && championCurrent.sampleSize >= CHAMPION_BENCHMARK_MIN_SAMPLE;
    const roleReady = roleCurrent && roleCurrent.sampleSize >= ROLE_BENCHMARK_MIN_SAMPLE;
    if (championReady) {
        return {
            mode: 'champion',
            queueBucket: primaryQueueBucket,
            tier: benchmarkTier,
            current: championCurrent,
            next: championNext && championNext.sampleSize >= CHAMPION_BENCHMARK_MIN_SAMPLE ? championNext : null,
            description: `Base propia real con ${championCurrent.sampleSize} partidas de ${championCurrent.championName} en ${getRoleLabel(primaryRole)} y ${queueLabel(primaryQueueBucket)}.`
        };
    }
    if (roleReady) {
        return {
            mode: 'role',
            queueBucket: primaryQueueBucket,
            tier: benchmarkTier,
            current: roleCurrent,
            next: roleNext && roleNext.sampleSize >= ROLE_BENCHMARK_MIN_SAMPLE ? roleNext : null,
            description: `Base propia real con ${roleCurrent.sampleSize} partidas de ${getRoleLabel(primaryRole)} en ${queueLabel(primaryQueueBucket)} para ${roleCurrent.tier}.`
        };
    }
    return {
        mode: 'provisional',
        queueBucket: primaryQueueBucket,
        tier: benchmarkTier,
        current: null,
        next: null,
        description: 'Todavía no tenemos suficiente muestra propia para comparar con tu elo de forma fehaciente. Hasta tenerla, esta sección queda como referencia interna provisional.'
    };
}
function buildRealBenchmark(actual, metric, current, next) {
    const currentValue = current[metric];
    const nextValue = next ? next[metric] : null;
    return {
        currentTier: { tier: current.tier, value: currentValue },
        nextTier: nextValue !== null ? { tier: next.tier, value: nextValue } : null,
        deltaToCurrent: Number((actual - currentValue).toFixed(1)),
        deltaToNext: nextValue !== null ? Number((actual - nextValue).toFixed(1)) : null
    };
}
export function StatsTab({ dataset }) {
    const primaryRole = detectPrimaryRole(dataset);
    const averageLevel = averageLevelAt15(dataset);
    const benchmarkContext = resolveBenchmarkContext(dataset, primaryRole);
    const csBenchmark = benchmarkContext.current
        ? buildRealBenchmark(dataset.summary.avgCsAt15, 'avgCsAt15', benchmarkContext.current, benchmarkContext.next)
        : buildCs15ProgressionBenchmark(primaryRole, benchmarkContext.tier, dataset.summary.avgCsAt15);
    const levelBenchmark = benchmarkContext.current
        ? buildRealBenchmark(averageLevel, 'avgLevelAt15', benchmarkContext.current, benchmarkContext.next)
        : buildLevel15ProgressionBenchmark(primaryRole, benchmarkContext.tier, averageLevel);
    const strengths = [
        { label: 'Performance', value: formatDecimal(dataset.summary.avgPerformanceScore), note: 'Ejecución media de la muestra.' },
        { label: 'Visión', value: formatDecimal(dataset.summary.avgVisionScore), note: 'Control de mapa y seguridad.' },
        { label: 'KP', value: `${formatDecimal(dataset.summary.avgKillParticipation)}%`, note: 'Participación en jugadas.' }
    ].sort((a, b) => Number(b.value.replace(',', '.').replace('%', '')) - Number(a.value.replace(',', '.').replace('%', '')));
    const focusAreas = [
        { label: 'Muertes pre 14', value: formatDecimal(dataset.summary.avgDeathsPre14), note: 'Más bajo suele ser mejor.' },
        { label: 'CS a los 15', value: formatDecimal(dataset.summary.avgCsAt15), note: 'Tu base de economía temprana.' },
        { label: 'Consistencia', value: formatDecimal(dataset.summary.consistencyIndex), note: 'Qué tan parejo es tu nivel.' }
    ];
    const recentMatches = [...dataset.matches].sort((a, b) => b.gameCreation - a.gameCreation).slice(0, 5);
    return (_jsxs("div", { style: { display: 'grid', gap: 16 }, children: [_jsxs("div", { className: "three-col-grid", style: { display: 'grid', gridTemplateColumns: '1.05fr 1.05fr .9fr', gap: 16 }, children: [_jsx(Card, { title: "Qu\u00E9 ya est\u00E1 sosteniendo tu nivel", subtitle: "Se\u00F1ales que hoy te est\u00E1n dando base competitiva", children: _jsx("div", { style: { display: 'grid', gap: 10 }, children: strengths.map((entry) => (_jsx(InsightRow, { label: entry.label, value: entry.value, note: entry.note, tone: "positive" }, entry.label))) }) }), _jsx(Card, { title: "Qu\u00E9 deber\u00EDas vigilar", subtitle: "Variables que m\u00E1s suelen definir si la partida queda jugable o no", children: _jsx("div", { style: { display: 'grid', gap: 10 }, children: focusAreas.map((entry) => (_jsx(InsightRow, { label: entry.label, value: entry.value, note: entry.note, tone: entry.label === 'Muertes pre 14' ? 'negative' : 'neutral' }, entry.label))) }) }), _jsx(Card, { title: "Contexto", subtitle: "La lectura cambia mucho seg\u00FAn lo que est\u00E1s filtrando", children: _jsxs("div", { style: { display: 'grid', gap: 10 }, children: [_jsx(ContextChip, { label: "Rol principal", value: getRoleLabel(primaryRole) }), _jsx(ContextChip, { label: "Muestra visible", value: `${dataset.summary.matches} partidas` }), _jsx(ContextChip, { label: "Rango", value: dataset.rank?.highest.label ?? 'Sin rango' })] }) })] }), _jsxs("div", { className: "two-col-grid", style: { display: 'grid', gridTemplateColumns: '1.15fr .85fr', gap: 16 }, children: [_jsx(Card, { title: "Benchmark de econom\u00EDa", subtitle: benchmarkContext.description, children: _jsxs("div", { style: { display: 'grid', gap: 12 }, children: [_jsx(BenchmarkLane, { title: "CS a los 15", info: benchmarkContext.mode === 'provisional'
                                        ? 'Todavía no hay suficiente base propia acumulada para comparar con tu elo real. Por ahora esta lectura solo ordena la conversación de coaching y no pretende validar una referencia externa.'
                                        : 'Comparación contra la base propia acumulada por tier, rol y cola. Si el pick principal concentra suficiente muestra, priorizamos esa referencia antes que la general del rol.', actual: dataset.summary.avgCsAt15, benchmark: csBenchmark, mode: benchmarkContext.mode }), _jsx(BenchmarkLane, { title: "Nivel al 15", info: benchmarkContext.mode === 'provisional'
                                        ? 'Hasta que no juntamos una muestra propia suficiente, esta métrica no debería leerse como comparación exacta contra tu elo.'
                                        : 'Compara tu ritmo de experiencia contra la base propia acumulada en el mismo contexto competitivo.', actual: averageLevel, benchmark: levelBenchmark, mode: benchmarkContext.mode }), dataset.benchmarks ? (_jsxs("div", { style: { color: '#7f8ca1', fontSize: 12, lineHeight: 1.6 }, children: [dataset.benchmarks.note, " Hoy la base acumulada lleva ", dataset.benchmarks.totalTrackedEntries, " registros procesados."] })) : null] }) }), _jsx(Card, { title: "Tramo m\u00E1s reciente", subtitle: "Las \u00FAltimas partidas cuentan m\u00E1s si quer\u00E9s coaching aplicable hoy", children: _jsx("div", { style: { display: 'grid', gap: 10 }, children: recentMatches.map((match) => (_jsxs("div", { style: recentMatchRowStyle, children: [_jsxs("div", { style: { display: 'grid', gap: 2 }, children: [_jsx("div", { style: { color: '#edf2ff', fontWeight: 700 }, children: match.championName }), _jsx("div", { style: { color: '#8190a4', fontSize: 12 }, children: new Date(match.gameCreation).toLocaleDateString('es-AR') })] }), _jsxs("div", { style: { display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'end' }, children: [_jsx(Badge, { tone: match.win ? 'low' : 'high', children: match.win ? 'Win' : 'Loss' }), _jsx(Badge, { children: `${formatDecimal(match.timeline.csAt15)} CS@15` }), _jsx(Badge, { children: `${formatDecimal(match.timeline.levelAt15 ?? 0)} lvl@15` })] })] }, match.matchId))) }) })] })] }));
}
function InsightRow({ label, value, note, tone }) {
    const borderColor = tone === 'positive'
        ? 'rgba(103,214,164,0.18)'
        : tone === 'negative'
            ? 'rgba(255,107,107,0.16)'
            : 'rgba(255,255,255,0.06)';
    return (_jsxs("div", { style: { ...insightRowStyle, borderColor }, children: [_jsxs("div", { style: { display: 'grid', gap: 3 }, children: [_jsx("div", { style: { color: '#edf2ff', fontWeight: 700 }, children: label }), _jsx("div", { style: { color: '#8592a8', fontSize: 12 }, children: note })] }), _jsx("div", { style: { fontSize: 22, fontWeight: 800 }, children: value })] }));
}
function ContextChip({ label, value }) {
    return (_jsxs("div", { style: contextChipStyle, children: [_jsx("div", { style: { color: '#7f8ca1', fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.08em' }, children: label }), _jsx("div", { style: { color: '#edf2ff', fontSize: 15, fontWeight: 800 }, children: value })] }));
}
function BenchmarkLane({ title, info, actual, benchmark, mode }) {
    const targets = benchmark
        ? [benchmark.currentTier.value, benchmark.nextTier?.value ?? benchmark.currentTier.value]
        : [actual, actual];
    const maxTarget = Math.max(actual, ...targets);
    return (_jsxs("div", { style: benchmarkLaneStyle, children: [_jsxs("div", { style: { display: 'flex', alignItems: 'center', color: '#edf2ff', fontWeight: 700, gap: 6 }, children: [title, _jsx(InfoHint, { text: info })] }), _jsxs("div", { style: { display: 'grid', gap: 10 }, children: [_jsx(BenchmarkBar, { label: "Tu muestra", value: actual, maxValue: maxTarget, tone: "player" }), benchmark ? _jsx(BenchmarkBar, { label: mode === 'provisional' ? `Referencia ${benchmark.currentTier.tier}` : `Base ${benchmark.currentTier.tier}`, value: benchmark.currentTier.value, maxValue: maxTarget, tone: "current" }) : null, benchmark?.nextTier ? _jsx(BenchmarkBar, { label: mode === 'provisional' ? `Objetivo ${benchmark.nextTier.tier}` : `Escalón ${benchmark.nextTier.tier}`, value: benchmark.nextTier.value, maxValue: maxTarget, tone: "next" }) : null] }), benchmark ? (_jsxs("div", { style: { display: 'flex', gap: 8, flexWrap: 'wrap' }, children: [_jsxs(Badge, { tone: benchmark.deltaToCurrent >= 0 ? 'low' : mode === 'provisional' ? 'default' : 'high', children: [mode === 'provisional'
                                ? 'Referencia interna provisional'
                                : benchmark.deltaToCurrent >= 0
                                    ? 'Sobre la base propia'
                                    : 'Debajo de la base propia', " ", formatSignedNumber(benchmark.deltaToCurrent)] }), benchmark.nextTier ? (_jsx(Badge, { tone: benchmark.deltaToNext !== null && benchmark.deltaToNext >= 0 ? 'low' : 'default', children: mode === 'provisional'
                            ? (benchmark.deltaToNext !== null && benchmark.deltaToNext >= 0 ? 'Ya superás el siguiente objetivo interno' : `A ${formatSignedNumber(Math.abs(benchmark.deltaToNext ?? 0))} del siguiente objetivo interno`)
                            : (benchmark.deltaToNext !== null && benchmark.deltaToNext >= 0 ? 'Ya superás el siguiente escalón real' : `A ${formatSignedNumber(Math.abs(benchmark.deltaToNext ?? 0))} del siguiente escalón real`) })) : null] })) : null] }));
}
function BenchmarkBar({ label, value, maxValue, tone }) {
    const fill = tone === 'player' ? '#d8fdf1' : tone === 'current' ? '#76b8ff' : '#b98fff';
    return (_jsxs("div", { style: { display: 'grid', gap: 6 }, children: [_jsxs("div", { style: { display: 'flex', justifyContent: 'space-between', gap: 10, color: '#95a1b4', fontSize: 13 }, children: [_jsx("span", { children: label }), _jsx("span", { children: formatDecimal(value) })] }), _jsx("div", { style: { height: 10, borderRadius: 999, background: 'rgba(255,255,255,0.06)', overflow: 'hidden' }, children: _jsx("div", { style: { width: `${Math.max(4, (value / Math.max(maxValue, 1)) * 100)}%`, height: '100%', background: fill, borderRadius: 999 } }) })] }));
}
const insightRowStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    padding: '13px 14px',
    borderRadius: 14,
    background: '#080d15',
    border: '1px solid rgba(255,255,255,0.06)'
};
const contextChipStyle = {
    display: 'grid',
    gap: 4,
    padding: '12px 13px',
    borderRadius: 14,
    background: '#080d15',
    border: '1px solid rgba(255,255,255,0.06)'
};
const benchmarkLaneStyle = {
    display: 'grid',
    gap: 12,
    padding: '14px 15px',
    borderRadius: 16,
    background: '#080d15',
    border: '1px solid rgba(255,255,255,0.06)'
};
const recentMatchRowStyle = {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    gap: 12,
    padding: '12px 14px',
    borderRadius: 14,
    background: '#080d15',
    border: '1px solid rgba(255,255,255,0.06)'
};
