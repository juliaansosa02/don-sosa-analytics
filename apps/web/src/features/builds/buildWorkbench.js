import { classifyComparativeEvidence } from '../premium-analysis/evidence';
function copy(locale, es, en) {
    return locale === 'en' ? en : es;
}
function average(values) {
    if (!values.length)
        return 0;
    return values.reduce((sum, value) => sum + value, 0) / values.length;
}
function averageNullable(values) {
    const valid = values.filter((value) => typeof value === 'number' && Number.isFinite(value));
    return valid.length ? average(valid) : null;
}
function round(value, digits = 1) {
    return Number(value.toFixed(digits));
}
function itemTags(itemId, catalog) {
    return catalog.get(itemId)?.tags ?? [];
}
function itemName(itemId, catalog) {
    if (!itemId)
        return null;
    return catalog.get(itemId)?.name ?? `Item ${itemId}`;
}
function isBoots(itemId, catalog) {
    return itemTags(itemId, catalog).includes('Boots');
}
function isMajorItem(itemId, catalog) {
    const item = catalog.get(itemId);
    if (!item)
        return false;
    if (item.tags.includes('Boots') || item.tags.includes('Consumable') || item.tags.includes('Trinket'))
        return false;
    return item.goldTotal >= 2200 && item.into.length === 0;
}
function buildCatalogMap(dataset) {
    return new Map(Object.values(dataset.itemCatalog ?? {}).map((item) => [item.id, item]));
}
function enemyPressureForMatch(match, catalog) {
    const enemyTeam = match.items?.enemyTeam ?? [];
    let physicalThreats = 0;
    let magicThreats = 0;
    let frontliners = 0;
    for (const enemy of enemyTeam) {
        const tags = new Set(enemy.items.flatMap((itemId) => itemTags(itemId, catalog)));
        const physicalScore = Number(tags.has('CriticalStrike')) + Number(tags.has('AttackSpeed')) + Number(tags.has('Damage'));
        const magicScore = Number(tags.has('SpellDamage')) + Number(tags.has('Mana')) + Number(tags.has('CooldownReduction'));
        const frontlineScore = Number(tags.has('Armor')) + Number(tags.has('SpellBlock')) + Number(tags.has('Health'));
        if (physicalScore >= magicScore && physicalScore >= 2)
            physicalThreats += 1;
        if (magicScore > physicalScore && magicScore >= 2)
            magicThreats += 1;
        if (frontlineScore >= 2)
            frontliners += 1;
    }
    if (magicThreats >= 3)
        return 'heavy_ap';
    if (physicalThreats >= 3)
        return 'heavy_ad';
    if (frontliners >= 2)
        return 'double_frontline';
    return 'mixed';
}
function buildFamilyKey(match, catalog) {
    const majorOrder = (match.items?.milestones.majorItemOrder ?? []).filter((itemId) => isMajorItem(itemId, catalog));
    const firstTwo = majorOrder.slice(0, 2);
    const bootsId = match.items?.milestones.bootsId;
    const key = `${firstTwo.join('>') || 'no-major'}|boots:${bootsId ?? 0}`;
    const labelParts = [
        firstTwo[0] ? itemName(firstTwo[0], catalog) : null,
        firstTwo[1] ? itemName(firstTwo[1], catalog) : null
    ].filter(Boolean);
    const bootsLabel = itemName(bootsId, catalog);
    return {
        key,
        label: `${labelParts.join(' -> ') || 'Build still open'}${bootsLabel ? ` + ${bootsLabel}` : ''}`,
        topItems: firstTwo,
        bootsId
    };
}
function inferUtilityLabel(item, locale) {
    if (item.tags.includes('Armor') || item.tags.includes('SpellBlock') || item.tags.includes('Health')) {
        return copy(locale, 'utility defensiva', 'defensive utility');
    }
    if (item.tags.includes('Boots')) {
        return copy(locale, 'tempo / movilidad', 'tempo / mobility');
    }
    if (item.tags.includes('SpellDamage') || item.tags.includes('Damage') || item.tags.includes('CriticalStrike')) {
        return copy(locale, 'power spike de daño', 'damage spike');
    }
    return copy(locale, 'utilidad situacional', 'situational utility');
}
function estimateTrackedWindows(match, catalog, locale) {
    const purchaseEvents = match.items?.purchaseEvents ?? [];
    const timelinePoints = match.items?.timelinePoints ?? [];
    const takedownMinutes = match.items?.takedownMinutes ?? [];
    const tracked = [];
    function firstPurchaseByName(names) {
        return purchaseEvents.find((event) => event.type === 'purchase'
            && event.itemId
            && names.includes((itemName(event.itemId, catalog) ?? '').toLowerCase()));
    }
    const cullPurchase = firstPurchaseByName(['cull']);
    if (cullPurchase) {
        const csAtPurchase = [...timelinePoints]
            .reverse()
            .find((point) => point.minute <= cullPurchase.minute)?.cs
            ?? 0;
        const payoffPoint = timelinePoints.find((point) => point.minute >= cullPurchase.minute && point.cs >= csAtPurchase + 100);
        if (payoffPoint) {
            tracked.push({
                label: copy(locale, 'Cull paga', 'Cull pays off'),
                minute: payoffPoint.minute,
                coverage: 1
            });
        }
    }
    const darkSealPurchase = firstPurchaseByName(['dark seal', "mejai's soulstealer"]);
    if (darkSealPurchase) {
        const firstTakedown = takedownMinutes.find((minute) => minute >= darkSealPurchase.minute);
        if (firstTakedown) {
            tracked.push({
                label: copy(locale, 'Dark Seal arranca', 'Dark Seal activates'),
                minute: firstTakedown,
                coverage: 1
            });
        }
    }
    const hubrisPurchase = firstPurchaseByName(['hubris']);
    if (hubrisPurchase) {
        const firstTakedown = takedownMinutes.find((minute) => minute >= hubrisPurchase.minute);
        if (firstTakedown) {
            tracked.push({
                label: copy(locale, 'Hubris activa', 'Hubris activates'),
                minute: firstTakedown,
                coverage: 1
            });
        }
    }
    return tracked;
}
function aggregateTrackedWindows(matches, catalog, locale) {
    const grouped = new Map();
    for (const match of matches) {
        for (const window of estimateTrackedWindows(match, catalog, locale)) {
            const current = grouped.get(window.label) ?? [];
            current.push(window.minute);
            grouped.set(window.label, current);
        }
    }
    return Array.from(grouped.entries())
        .map(([label, minutes]) => ({
        label,
        minute: round(average(minutes), 1),
        coverage: round((minutes.length / Math.max(matches.length, 1)) * 100, 0)
    }))
        .sort((left, right) => left.minute - right.minute);
}
function aggregateFamily(matches, catalog, locale) {
    const family = buildFamilyKey(matches[0], catalog);
    const wins = matches.filter((match) => match.win).length;
    const pressureCounts = {
        heavy_ad: 0,
        heavy_ap: 0,
        double_frontline: 0,
        mixed: 0
    };
    for (const match of matches) {
        pressureCounts[enemyPressureForMatch(match, catalog)] += 1;
    }
    const pressureProfile = (Object.entries(pressureCounts).sort((left, right) => right[1] - left[1])[0]?.[0] ?? 'mixed');
    return {
        ...family,
        championName: matches[0].championName,
        games: matches.length,
        wins,
        winRate: round((wins / Math.max(matches.length, 1)) * 100, 1),
        avgScore: round(average(matches.map((match) => match.score.total)), 1),
        avgTotalDamage: round(average(matches.map((match) => match.totalDamageDealt ?? 0)), 0),
        avgDamageToChampions: round(average(matches.map((match) => match.damageToChampions)), 0),
        avgCs: round(average(matches.map((match) => match.cs)), 0),
        avgCsAt15: round(average(matches.map((match) => match.timeline.csAt15)), 1),
        avgDeathsPre14: round(average(matches.map((match) => match.timeline.deathsPre14)), 1),
        avgDurationMinutes: round(average(matches.map((match) => match.gameDurationSeconds / 60)), 1),
        avgFirstItemMinute: averageNullable(matches.map((match) => match.items?.milestones.firstCompletedItemMinute ?? null)),
        avgSecondItemMinute: averageNullable(matches.map((match) => match.items?.milestones.secondCompletedItemMinute ?? null)),
        avgBootsMinute: averageNullable(matches.map((match) => match.items?.milestones.bootsMinute ?? null)),
        pressureProfile,
        trackedWindows: aggregateTrackedWindows(matches, catalog, locale)
    };
}
function pressureCopy(profile, locale) {
    switch (profile) {
        case 'heavy_ad':
            return copy(locale, 'el rival castigó más desde daño físico / autoataques', 'the enemy pressure leaned more physical / auto-attack heavy');
        case 'heavy_ap':
            return copy(locale, 'el rival castigó más desde daño mágico', 'the enemy pressure leaned more magic-heavy');
        case 'double_frontline':
            return copy(locale, 'la partida tuvo doble frontline real enfrente', 'the game had a real double-frontline enemy setup');
        default:
            return copy(locale, 'la presión enemiga quedó mezclada', 'enemy pressure looked mixed');
    }
}
function buildRecommendation(baseline, variant, catalog, locale) {
    const playerTags = new Set([...variant.topItems, variant.bootsId]
        .filter((itemId) => typeof itemId === 'number')
        .flatMap((itemId) => itemTags(itemId, catalog)));
    if (variant.pressureProfile === 'heavy_ap' && !playerTags.has('SpellBlock')) {
        return copy(locale, 'Contra esta muestra más AP, faltó una respuesta de MR más temprana o unas botas menos greedy.', 'Into this more AP-heavy sample, an earlier MR answer or less greedy boots could have fit better.');
    }
    if (variant.pressureProfile === 'heavy_ad' && !playerTags.has('Armor')) {
        return copy(locale, 'Contra esta muestra más AD, el build no muestra una respuesta clara de armor / botas defensivas.', 'Into this more AD-heavy sample, the build does not show a clear armor / defensive boots response.');
    }
    if (variant.pressureProfile === 'double_frontline' && variant.avgDamageToChampions < baseline.avgDamageToChampions - 2000) {
        return copy(locale, 'Contra doble frontline faltó una pieza más pensada para shred o penetración.', 'Into double frontline, the build likely needed an earlier shred or penetration slot.');
    }
    if (variant.avgBootsMinute !== null
        && baseline.avgBootsMinute !== null
        && variant.avgBootsMinute - baseline.avgBootsMinute >= 2.5) {
        return copy(locale, 'El timing de botas está llegando bastante más tarde que el baseline y eso puede estar costando tempo real.', 'Boots timing is arriving much later than the baseline and may be costing real tempo.');
    }
    return null;
}
function buildConstraint(baseline, variant, locale) {
    const minSample = Math.min(baseline.games, variant.games);
    if (minSample < 4) {
        return copy(locale, 'La comparación todavía tiene poca muestra pareja.', 'The comparison still has too little balanced sample.');
    }
    if (baseline.pressureProfile !== variant.pressureProfile) {
        return copy(locale, 'Las dos familias no están viendo exactamente el mismo tipo de presión rival.', 'The two families are not seeing exactly the same type of enemy pressure.');
    }
    if (baseline.avgFirstItemMinute !== null
        && variant.avgFirstItemMinute !== null
        && Math.abs(variant.avgFirstItemMinute - baseline.avgFirstItemMinute) >= 2.5) {
        return copy(locale, 'Parte de la diferencia puede venir del timing y no solo del item path.', 'Part of the difference may come from timing, not only from the item path.');
    }
    return null;
}
function buildComparison(baseline, variant, catalog, locale) {
    const deltas = {
        winRate: round(variant.winRate - baseline.winRate, 1),
        score: round(variant.avgScore - baseline.avgScore, 1),
        totalDamage: round(variant.avgTotalDamage - baseline.avgTotalDamage, 0),
        damageToChampions: round(variant.avgDamageToChampions - baseline.avgDamageToChampions, 0),
        cs: round(variant.avgCs - baseline.avgCs, 0),
        firstItemMinute: variant.avgFirstItemMinute !== null && baseline.avgFirstItemMinute !== null
            ? round(variant.avgFirstItemMinute - baseline.avgFirstItemMinute, 1)
            : null,
        secondItemMinute: variant.avgSecondItemMinute !== null && baseline.avgSecondItemMinute !== null
            ? round(variant.avgSecondItemMinute - baseline.avgSecondItemMinute, 1)
            : null,
        bootsMinute: variant.avgBootsMinute !== null && baseline.avgBootsMinute !== null
            ? round(variant.avgBootsMinute - baseline.avgBootsMinute, 1)
            : null
    };
    const signalScore = Math.max(Math.abs(deltas.winRate) / 12, Math.abs(deltas.score) / 4, Math.abs(deltas.damageToChampions) / 3000, Math.abs(deltas.totalDamage) / 6000, Math.abs((deltas.firstItemMinute ?? 0)) / 3);
    const contextScore = ((baseline.pressureProfile === variant.pressureProfile ? 0.25 : 0)
        + (Math.min(baseline.games, variant.games) >= 6 ? 0.2 : 0)
        + (Math.abs(deltas.cs) <= 20 ? 0.1 : 0));
    const constraint = buildConstraint(baseline, variant, locale);
    const evidenceTier = classifyComparativeEvidence({
        leftSample: baseline.games,
        rightSample: variant.games,
        signalScore,
        contextScore: constraint ? contextScore - 0.25 : contextScore
    });
    const summary = deltas.winRate >= 0
        ? copy(locale, `${variant.label} sube ${Math.abs(deltas.winRate).toFixed(1)} pts de WR y ${Math.abs(deltas.score).toFixed(1)} de score contra el baseline.`, `${variant.label} gains ${Math.abs(deltas.winRate).toFixed(1)} WR points and ${Math.abs(deltas.score).toFixed(1)} score versus the baseline.`)
        : copy(locale, `${variant.label} cae ${Math.abs(deltas.winRate).toFixed(1)} pts de WR y ${Math.abs(deltas.score).toFixed(1)} de score contra el baseline.`, `${variant.label} drops ${Math.abs(deltas.winRate).toFixed(1)} WR points and ${Math.abs(deltas.score).toFixed(1)} score versus the baseline.`);
    return {
        baseline,
        variant,
        evidenceTier,
        summary,
        constraint,
        recommendation: buildRecommendation(baseline, variant, catalog, locale),
        pressureNote: copy(locale, `Contexto principal: ${pressureCopy(variant.pressureProfile, locale)}.`, `Main context: ${pressureCopy(variant.pressureProfile, locale)}.`),
        deltas
    };
}
function completionMinuteForItem(match, itemId) {
    const events = match.items?.purchaseEvents ?? [];
    const completion = events.find((event) => event.type === 'purchase' && event.itemId === itemId);
    return completion?.minute ?? null;
}
function buildItemImpactAggregates(championMatches, baseline, catalog, locale) {
    const itemMatches = new Map();
    for (const match of championMatches) {
        const visibleItems = new Set([
            ...(match.items?.milestones.majorItemOrder ?? []),
            ...(match.items?.finalBuild ?? [])
        ]);
        for (const itemId of visibleItems) {
            if (!catalog.has(itemId))
                continue;
            const current = itemMatches.get(itemId) ?? [];
            current.push(match);
            itemMatches.set(itemId, current);
        }
    }
    return Array.from(itemMatches.entries())
        .map(([itemId, matches]) => {
        const item = catalog.get(itemId);
        const wins = matches.filter((match) => match.win).length;
        const winRate = round((wins / Math.max(matches.length, 1)) * 100, 1);
        const avgScore = round(average(matches.map((match) => match.score.total)), 1);
        const avgDamage = round(average(matches.map((match) => match.damageToChampions)), 0);
        const signalScore = Math.max(Math.abs(winRate - (baseline?.winRate ?? 0)) / 12, Math.abs(avgScore - (baseline?.avgScore ?? 0)) / 4, Math.abs(avgDamage - (baseline?.avgDamageToChampions ?? 0)) / 3000);
        const evidenceTier = classifyComparativeEvidence({
            leftSample: matches.length,
            rightSample: Math.max((baseline?.games ?? 0) - matches.length, 2),
            signalScore,
            contextScore: matches.length >= 4 ? 0.2 : 0
        });
        return {
            itemId,
            name: item?.name ?? `Item ${itemId}`,
            games: matches.length,
            usageShare: round((matches.length / Math.max(championMatches.length, 1)) * 100, 1),
            avgCompletionMinute: averageNullable(matches.map((match) => completionMinuteForItem(match, itemId))),
            winRateDelta: round(winRate - (baseline?.winRate ?? 0), 1),
            scoreDelta: round(avgScore - (baseline?.avgScore ?? 0), 1),
            damageDelta: round(avgDamage - (baseline?.avgDamageToChampions ?? 0), 0),
            utilityLabel: item ? inferUtilityLabel(item, locale) : copy(locale, 'utilidad situacional', 'situational utility'),
            evidenceTier
        };
    })
        .filter((item) => item.games >= 2)
        .sort((left, right) => right.games - left.games || right.scoreDelta - left.scoreDelta);
}
export function buildChampionBuildWorkbench(dataset, locale = 'es') {
    const catalog = buildCatalogMap(dataset);
    const hasTimelines = dataset.matches.some((match) => match.items?.purchaseEvents?.length);
    if (!catalog.size || !hasTimelines) {
        return {
            ready: false,
            champions: []
        };
    }
    const byChampion = new Map();
    for (const match of dataset.matches) {
        const current = byChampion.get(match.championName) ?? [];
        current.push(match);
        byChampion.set(match.championName, current);
    }
    const champions = Array.from(byChampion.entries())
        .map(([championName, championMatches]) => {
        const byFamily = new Map();
        for (const match of championMatches) {
            const family = buildFamilyKey(match, catalog);
            const current = byFamily.get(family.key) ?? [];
            current.push(match);
            byFamily.set(family.key, current);
        }
        const buildFamilies = Array.from(byFamily.values())
            .map((matches) => aggregateFamily(matches, catalog, locale))
            .sort((left, right) => right.games - left.games || right.winRate - left.winRate);
        const baseline = buildFamilies[0] ?? null;
        const comparisons = baseline
            ? buildFamilies
                .slice(1)
                .filter((family) => family.games >= 2)
                .map((family) => buildComparison(baseline, family, catalog, locale))
                .sort((left, right) => {
                const weights = { strong: 3, weak: 2, hypothesis: 1 };
                return weights[right.evidenceTier] - weights[left.evidenceTier]
                    || right.variant.games - left.variant.games;
            })
            : [];
        const itemImpacts = buildItemImpactAggregates(championMatches, baseline, catalog, locale);
        return {
            championName,
            games: championMatches.length,
            baseline,
            buildFamilies,
            comparisons,
            topItems: itemImpacts.filter((item) => item.scoreDelta >= 0).slice(0, 3),
            weakItems: itemImpacts.filter((item) => item.scoreDelta < 0).slice(0, 3)
        };
    })
        .filter((champion) => champion.games >= 3 && champion.baseline)
        .sort((left, right) => right.games - left.games);
    return {
        ready: true,
        champions
    };
}
