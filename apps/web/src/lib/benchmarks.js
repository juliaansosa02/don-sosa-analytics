const tierOrder = ['IRON', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'EMERALD', 'DIAMOND', 'MASTER'];
const cs15Benchmarks = {
    JUNGLE: { IRON: 78, BRONZE: 82, SILVER: 87, GOLD: 92, PLATINUM: 97, EMERALD: 101, DIAMOND: 106, MASTER: 110 },
    TOP: { IRON: 82, BRONZE: 86, SILVER: 91, GOLD: 97, PLATINUM: 102, EMERALD: 106, DIAMOND: 111, MASTER: 116 },
    MIDDLE: { IRON: 85, BRONZE: 90, SILVER: 96, GOLD: 102, PLATINUM: 108, EMERALD: 113, DIAMOND: 118, MASTER: 123 },
    BOTTOM: { IRON: 88, BRONZE: 93, SILVER: 99, GOLD: 105, PLATINUM: 110, EMERALD: 115, DIAMOND: 120, MASTER: 125 },
    UTILITY: { IRON: 16, BRONZE: 18, SILVER: 20, GOLD: 22, PLATINUM: 24, EMERALD: 26, DIAMOND: 28, MASTER: 30 }
};
const level15Benchmarks = {
    JUNGLE: { IRON: 9.7, BRONZE: 10.0, SILVER: 10.4, GOLD: 10.8, PLATINUM: 11.1, EMERALD: 11.4, DIAMOND: 11.8, MASTER: 12.1 },
    TOP: { IRON: 10.0, BRONZE: 10.3, SILVER: 10.7, GOLD: 11.0, PLATINUM: 11.4, EMERALD: 11.7, DIAMOND: 12.0, MASTER: 12.3 },
    MIDDLE: { IRON: 10.1, BRONZE: 10.4, SILVER: 10.8, GOLD: 11.2, PLATINUM: 11.5, EMERALD: 11.8, DIAMOND: 12.1, MASTER: 12.4 },
    BOTTOM: { IRON: 9.2, BRONZE: 9.5, SILVER: 9.8, GOLD: 10.1, PLATINUM: 10.4, EMERALD: 10.7, DIAMOND: 11.0, MASTER: 11.3 },
    UTILITY: { IRON: 8.1, BRONZE: 8.3, SILVER: 8.5, GOLD: 8.8, PLATINUM: 9.0, EMERALD: 9.2, DIAMOND: 9.4, MASTER: 9.6 }
};
function normalizeTier(tier) {
    if (!tier)
        return null;
    if (['MASTER', 'GRANDMASTER', 'CHALLENGER'].includes(tier))
        return 'MASTER';
    return tier;
}
function getNextTier(tier) {
    const normalizedTier = normalizeTier(tier ?? undefined);
    if (!normalizedTier)
        return null;
    const currentIndex = tierOrder.indexOf(normalizedTier);
    if (currentIndex === -1 || currentIndex === tierOrder.length - 1)
        return null;
    return tierOrder[currentIndex + 1];
}
function buildTierProgression(role, tier, actualValue, benchmarks) {
    const normalizedTier = normalizeTier(tier ?? undefined);
    if (!normalizedTier || typeof actualValue !== 'number')
        return null;
    const byRole = benchmarks[role];
    if (!byRole)
        return null;
    const currentTierValue = byRole[normalizedTier];
    if (typeof currentTierValue !== 'number')
        return null;
    const nextTier = getNextTier(normalizedTier);
    const nextTierValue = nextTier ? byRole[nextTier] : null;
    return {
        currentTier: { tier: normalizedTier, value: currentTierValue },
        nextTier: nextTier && typeof nextTierValue === 'number' ? { tier: nextTier, value: nextTierValue } : null,
        deltaToCurrent: Number((actualValue - currentTierValue).toFixed(1)),
        deltaToNext: typeof nextTierValue === 'number' ? Number((actualValue - nextTierValue).toFixed(1)) : null
    };
}
export function buildCs15Benchmark(role, tier, avgCsAt15) {
    const normalizedTier = normalizeTier(tier ?? undefined);
    if (!normalizedTier || typeof avgCsAt15 !== 'number')
        return null;
    const byRole = cs15Benchmarks[role];
    if (!byRole)
        return null;
    const target = byRole[normalizedTier];
    if (!target)
        return null;
    const delta = avgCsAt15 - target;
    if (delta >= 5) {
        return {
            label: 'Referencia interna favorable',
            status: 'above',
            message: `Tu CS está ${delta.toFixed(1)} por encima de nuestra referencia interna para ${normalizedTier} en ${role.toLowerCase()}.`
        };
    }
    if (delta <= -5) {
        return {
            label: 'Referencia interna por trabajar',
            status: 'below',
            message: `Tu CS está ${Math.abs(delta).toFixed(1)} por debajo de nuestra referencia interna para ${normalizedTier} en ${role.toLowerCase()}.`
        };
    }
    return {
        label: 'Cerca de la referencia interna',
        status: 'normal',
        message: `Tu farmeo está cerca de la referencia interna que hoy usamos para ${normalizedTier} en ${role.toLowerCase()}.`
    };
}
export function buildCs15ProgressionBenchmark(role, tier, avgCsAt15) {
    return buildTierProgression(role, tier, avgCsAt15, cs15Benchmarks);
}
export function buildLevel15ProgressionBenchmark(role, tier, avgLevelAt15) {
    return buildTierProgression(role, tier, avgLevelAt15, level15Benchmarks);
}
