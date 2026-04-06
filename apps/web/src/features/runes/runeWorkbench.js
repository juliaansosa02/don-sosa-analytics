import { classifyComparativeEvidence } from '../premium-analysis/evidence';
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
function copy(locale, es, en) {
    return locale === 'en' ? en : es;
}
function bucketDuration(durationMinutes) {
    if (durationMinutes < 25)
        return 'short';
    if (durationMinutes <= 33)
        return 'standard';
    return 'long';
}
function classifyEarlyState(match) {
    if (match.timeline.deathsPre14 >= 2 || (match.timeline.goldDiffAt15 ?? 0) <= -400 || match.timeline.laneVolatilityScore >= 55)
        return 'volatile';
    if (match.timeline.deathsPre14 === 0 && (match.timeline.goldDiffAt15 ?? 0) >= 0 && match.timeline.laneVolatilityScore <= 38)
        return 'stable';
    return 'scrappy';
}
function runeName(name, perk) {
    return name?.trim() || `Perk ${perk ?? 'unknown'}`;
}
function buildVariantDescriptor(match) {
    const keystone = runeName(match.primaryRunes[0]?.name, match.primaryRunes[0]?.perk);
    const primaryMinor = match.primaryRunes.slice(1).map((rune) => runeName(rune.name, rune.perk));
    const secondaryMinor = match.secondaryRunes.map((rune) => runeName(rune.name, rune.perk));
    const key = [keystone, ...primaryMinor, '::', ...secondaryMinor].join('|');
    const compactLabel = secondaryMinor.length
        ? secondaryMinor.join(' + ')
        : primaryMinor.length
            ? primaryMinor.join(' + ')
            : keystone;
    return {
        key,
        keystone,
        label: `${keystone} | ${primaryMinor.join(' / ')} + ${secondaryMinor.join(' / ')}`,
        compactLabel,
        primaryMinor,
        secondaryMinor
    };
}
function buildTopMatchups(matches) {
    const counts = new Map();
    for (const match of matches) {
        if (!match.opponentChampionName)
            continue;
        const current = counts.get(match.opponentChampionName) ?? [];
        current.push(match);
        counts.set(match.opponentChampionName, current);
    }
    return Array.from(counts.entries())
        .map(([championName, list]) => ({
        championName,
        games: list.length,
        share: round((list.length / Math.max(matches.length, 1)) * 100, 1),
        winRate: round((list.filter((match) => match.win).length / Math.max(list.length, 1)) * 100, 1)
    }))
        .sort((left, right) => right.games - left.games)
        .slice(0, 3);
}
function buildStatePerformance(matches, by) {
    const keys = by === 'duration'
        ? ['short', 'standard', 'long']
        : ['stable', 'scrappy', 'volatile'];
    const result = {};
    for (const key of keys) {
        const list = matches.filter((match) => (by === 'duration' ? bucketDuration(match.gameDurationSeconds / 60) : classifyEarlyState(match)) === key);
        result[key] = {
            games: list.length,
            winRate: round((list.filter((match) => match.win).length / Math.max(list.length, 1)) * 100, 1),
            avgScore: round(average(list.map((match) => match.score.total)), 1)
        };
    }
    return result;
}
function aggregateVariant(matches) {
    const descriptor = buildVariantDescriptor(matches[0]);
    const wins = matches.filter((match) => match.win).length;
    const durationProfile = { short: 0, standard: 0, long: 0 };
    const earlyStateProfile = { stable: 0, scrappy: 0, volatile: 0 };
    for (const match of matches) {
        durationProfile[bucketDuration(match.gameDurationSeconds / 60)] += 1;
        earlyStateProfile[classifyEarlyState(match)] += 1;
    }
    return {
        ...descriptor,
        games: matches.length,
        wins,
        winRate: round((wins / Math.max(matches.length, 1)) * 100, 1),
        avgScore: round(average(matches.map((match) => match.score.total)), 1),
        avgDamageToChampions: round(average(matches.map((match) => match.damageToChampions)), 0),
        avgCsAt15: round(average(matches.map((match) => match.timeline.csAt15)), 1),
        avgGoldAt15: round(average(matches.map((match) => match.timeline.goldAt15)), 0),
        avgGoldDiffAt15: round(average(matches.map((match) => match.timeline.goldDiffAt15 ?? 0)), 0),
        avgDurationMinutes: round(average(matches.map((match) => match.gameDurationSeconds / 60)), 1),
        avgDeathsPre14: round(average(matches.map((match) => match.timeline.deathsPre14)), 1),
        avgFirstMoveMinute: averageNullable(matches.map((match) => match.timeline.firstMoveMinute)),
        avgLaneVolatility: round(average(matches.map((match) => match.timeline.laneVolatilityScore)), 1),
        avgResetTiming: round(average(matches.map((match) => match.timeline.resetTimingScore)), 1),
        avgObjectiveSetup: round(average(matches.map((match) => match.timeline.objectiveSetupScore)), 1),
        avgRuneValue: round(average(matches.map((match) => match.runeStats.keystoneValue)), 0),
        avgRuneDamage: round(average(matches.map((match) => match.runeStats.totalDamageFromRunes)), 0),
        avgRuneHealing: round(average(matches.map((match) => match.runeStats.totalHealingFromRunes)), 0),
        avgRuneShielding: round(average(matches.map((match) => match.runeStats.totalShieldingFromRunes)), 0),
        topMatchups: buildTopMatchups(matches),
        durationProfile: {
            short: round((durationProfile.short / Math.max(matches.length, 1)) * 100, 0),
            standard: round((durationProfile.standard / Math.max(matches.length, 1)) * 100, 0),
            long: round((durationProfile.long / Math.max(matches.length, 1)) * 100, 0)
        },
        earlyStateProfile: {
            stable: round((earlyStateProfile.stable / Math.max(matches.length, 1)) * 100, 0),
            scrappy: round((earlyStateProfile.scrappy / Math.max(matches.length, 1)) * 100, 0),
            volatile: round((earlyStateProfile.volatile / Math.max(matches.length, 1)) * 100, 0)
        },
        durationPerformance: buildStatePerformance(matches, 'duration'),
        earlyStatePerformance: buildStatePerformance(matches, 'early')
    };
}
function describeDifferences(baseline, variant) {
    const changes = [];
    baseline.primaryMinor.forEach((name, index) => {
        const next = variant.primaryMinor[index];
        if (next && next !== name)
            changes.push(`${name} -> ${next}`);
    });
    baseline.secondaryMinor.forEach((name, index) => {
        const next = variant.secondaryMinor[index];
        if (next && next !== name)
            changes.push(`${name} -> ${next}`);
    });
    if (!changes.length && baseline.compactLabel !== variant.compactLabel)
        changes.push(variant.compactLabel);
    if (!changes.length) {
        return baseline.compactLabel === variant.compactLabel
            ? 'Misma página, mismo árbol'
            : `${baseline.compactLabel} -> ${variant.compactLabel}`;
    }
    return changes.slice(0, 2).join(' · ');
}
function buildContextNote(baseline, variant, locale) {
    const variantTop = variant.topMatchups[0];
    const baselineTop = baseline.topMatchups[0];
    const durationGap = round(variant.avgDurationMinutes - baseline.avgDurationMinutes, 1);
    if (variantTop && (!baselineTop || variantTop.championName !== baselineTop.championName) && variantTop.share >= 35) {
        return copy(locale, `La variante está más sesgada a ${variantTop.championName} (${variantTop.share}% de la muestra).`, `The variant is more skewed toward ${variantTop.championName} (${variantTop.share}% of the sample).`);
    }
    if (Math.abs(durationGap) >= 3.5) {
        return durationGap > 0
            ? copy(locale, 'La variante aparece en partidas bastante más largas que el baseline.', 'The variant shows up in meaningfully longer games than the baseline.')
            : copy(locale, 'La variante aparece en partidas bastante más cortas que el baseline.', 'The variant shows up in meaningfully shorter games than the baseline.');
    }
    if (variant.earlyStateProfile.volatile - baseline.earlyStateProfile.volatile >= 18) {
        return copy(locale, 'La página alternativa se usa más en earlys rotos o volátiles.', 'The alternative page appears more often in broken or volatile early games.');
    }
    if (variant.earlyStateProfile.stable - baseline.earlyStateProfile.stable >= 18) {
        return copy(locale, 'La página alternativa se está viendo más en earlys limpios y controlados.', 'The alternative page is showing up more often in clean and controlled early games.');
    }
    return null;
}
function buildSignalNote(baseline, variant, locale, deltas) {
    if (deltas.runeValue >= 1500 && deltas.score >= 2) {
        return copy(locale, 'No cambia solo el WR: también sube el valor real que la página extrae del kit.', 'This is not only a WR shift: the page is also extracting more real value from the kit.');
    }
    if (deltas.laneVolatility <= -6 && deltas.deathsPre14 <= -0.6) {
        return copy(locale, 'La variante parece ordenar mejor el early y bajar el costo de los errores.', 'The variant seems to organize the early game better and reduce the cost of mistakes.');
    }
    if (deltas.goldDiffAt15 >= 180 && deltas.csAt15 >= 3) {
        return copy(locale, 'La señal va con mejor economía temprana y no solo con outcomes tardíos.', 'The signal tracks with better early economy, not only with late outcomes.');
    }
    if (deltas.runeHealing >= 250 || deltas.runeDamage >= 1200) {
        return copy(locale, 'El swap está moviendo output medible de runas y no solo sensación subjetiva.', 'The swap is moving measurable rune output, not only subjective feel.');
    }
    return copy(locale, 'La lectura principal es si el swap mejora la versión del campeón que querés ejecutar.', 'The main read is whether the swap improves the version of the champion you want to execute.');
}
function buildConstraint(baseline, variant, locale) {
    const minSample = Math.min(baseline.games, variant.games);
    if (minSample < 4) {
        return copy(locale, 'Todavía no hay suficiente muestra pareja entre ambos lados.', 'There is not enough balanced sample on both sides yet.');
    }
    if ((variant.topMatchups[0]?.share ?? 0) >= 35 && variant.topMatchups[0]?.championName !== baseline.topMatchups[0]?.championName) {
        return copy(locale, 'Parte del edge puede venir del matchup que absorbió esta variante.', 'Part of the edge may come from the matchup allocation absorbed by this variant.');
    }
    if (Math.abs(variant.avgDurationMinutes - baseline.avgDurationMinutes) >= 4) {
        return copy(locale, 'La duración media cambió bastante entre páginas, así que conviene leer el edge con cuidado.', 'Average duration changed a lot between pages, so the edge needs a careful read.');
    }
    if (Math.abs(variant.earlyStateProfile.volatile - baseline.earlyStateProfile.volatile) >= 20) {
        return copy(locale, 'La página no está entrando al mismo tipo de early, así que no toda la diferencia es de runas.', 'The page is not entering the same type of early, so not all the difference belongs to the runes.');
    }
    return null;
}
function buildBestWhen(baseline, variant, locale) {
    if (variant.earlyStatePerformance.stable.games >= 2 && variant.earlyStatePerformance.stable.winRate >= baseline.earlyStatePerformance.stable.winRate + 8) {
        return copy(locale, 'Cuando el early llega limpio y podés jugar una versión ordenada del campeón.', 'When the early game stays clean and you can play an orderly version of the champion.');
    }
    if (variant.durationPerformance.long.games >= 2 && variant.durationPerformance.long.winRate >= baseline.durationPerformance.long.winRate + 8) {
        return copy(locale, 'Cuando la partida suele alargarse y la página escala mejor con el tiempo.', 'When the game tends to go longer and the page scales better over time.');
    }
    if (variant.topMatchups[0]?.share && variant.topMatchups[0].share >= 30) {
        return copy(locale, `Cuando el bloque entra seguido contra ${variant.topMatchups[0].championName}.`, `When the block often lands into ${variant.topMatchups[0].championName}.`);
    }
    return null;
}
function buildAvoidWhen(baseline, variant, locale) {
    if (variant.earlyStatePerformance.volatile.games >= 2 && variant.earlyStatePerformance.volatile.winRate <= baseline.earlyStatePerformance.volatile.winRate - 8) {
        return copy(locale, 'Cuando el early se rompe rápido y necesitás una página más indulgente.', 'When the early game breaks quickly and you need a more forgiving page.');
    }
    if (variant.durationPerformance.short.games >= 2 && variant.durationPerformance.short.winRate <= baseline.durationPerformance.short.winRate - 8) {
        return copy(locale, 'Cuando la partida se define demasiado temprano y la página no llega a exprimir su valor.', 'When the game gets decided too early and the page does not get to extract its value.');
    }
    return null;
}
function buildRecommendation(variant, deltas, locale) {
    if (deltas.winRate >= 3 && deltas.score >= 2 && deltas.runeValue >= 1000) {
        return copy(locale, `Probala como página de trabajo cuando quieras optimizar output real, no solo comodidad.`, `Use it as a working page when you want to optimize real output, not only comfort.`);
    }
    if (deltas.deathsPre14 <= -0.6 && deltas.laneVolatility <= -5) {
        return copy(locale, 'Vale más como página de estabilidad: ordena el early y baja el costo de ejecución.', 'It looks more valuable as a stability page: it organizes the early game and lowers execution cost.');
    }
    if (variant.avgRuneHealing > 0 || variant.avgRuneShielding > 0) {
        return copy(locale, 'Leela como una página de margen y sustain, no solo como una de daño bruto.', 'Read it as a margin/sustain page, not only as a raw damage page.');
    }
    return copy(locale, 'Seguila como variante útil, pero todavía no como respuesta cerrada para todo contexto.', 'Keep it as a useful variant, but not yet as a closed answer for every context.');
}
function buildComparison(baseline, variant, locale) {
    const deltas = {
        winRate: round(variant.winRate - baseline.winRate, 1),
        score: round(variant.avgScore - baseline.avgScore, 1),
        damageToChampions: round(variant.avgDamageToChampions - baseline.avgDamageToChampions, 0),
        csAt15: round(variant.avgCsAt15 - baseline.avgCsAt15, 1),
        goldDiffAt15: round(variant.avgGoldDiffAt15 - baseline.avgGoldDiffAt15, 0),
        durationMinutes: round(variant.avgDurationMinutes - baseline.avgDurationMinutes, 1),
        deathsPre14: round(variant.avgDeathsPre14 - baseline.avgDeathsPre14, 1),
        runeValue: round(variant.avgRuneValue - baseline.avgRuneValue, 0),
        runeDamage: round(variant.avgRuneDamage - baseline.avgRuneDamage, 0),
        runeHealing: round((variant.avgRuneHealing + variant.avgRuneShielding) - (baseline.avgRuneHealing + baseline.avgRuneShielding), 0),
        laneVolatility: round(variant.avgLaneVolatility - baseline.avgLaneVolatility, 1),
        resetTiming: round(variant.avgResetTiming - baseline.avgResetTiming, 1)
    };
    const signalScore = Math.max(Math.abs(deltas.winRate) / 12, Math.abs(deltas.score) / 4, Math.abs(deltas.damageToChampions) / 3000, Math.abs(deltas.csAt15) / 8, Math.abs(deltas.goldDiffAt15) / 350, Math.abs(deltas.runeValue) / 2500, Math.abs(deltas.laneVolatility) / 10);
    const contextScore = ((Math.min(baseline.games, variant.games) >= 6 ? 0.25 : 0)
        + (Math.abs(deltas.durationMinutes) <= 2.5 ? 0.15 : 0)
        + (Math.abs(variant.earlyStateProfile.volatile - baseline.earlyStateProfile.volatile) <= 12 ? 0.15 : 0));
    const constraint = buildConstraint(baseline, variant, locale);
    const evidenceTier = classifyComparativeEvidence({
        leftSample: baseline.games,
        rightSample: variant.games,
        signalScore,
        contextScore: constraint ? contextScore - 0.25 : contextScore
    });
    const summary = deltas.winRate >= 0
        ? copy(locale, `${variant.compactLabel} está ${Math.abs(deltas.winRate).toFixed(1)} pts arriba en WR, ${Math.abs(deltas.score).toFixed(1)} arriba en score y ${Math.abs(deltas.runeValue)} arriba en valor de runa.`, `${variant.compactLabel} is ${Math.abs(deltas.winRate).toFixed(1)} pts up in WR, ${Math.abs(deltas.score).toFixed(1)} up in score and ${Math.abs(deltas.runeValue)} up in rune value.`)
        : copy(locale, `${variant.compactLabel} está ${Math.abs(deltas.winRate).toFixed(1)} pts abajo en WR y ${Math.abs(deltas.score).toFixed(1)} abajo en score.`, `${variant.compactLabel} is ${Math.abs(deltas.winRate).toFixed(1)} pts down in WR and ${Math.abs(deltas.score).toFixed(1)} down in score.`);
    return {
        baseline,
        variant,
        evidenceTier,
        differenceLabel: describeDifferences(baseline, variant),
        summary,
        recommendation: buildRecommendation(variant, deltas, locale),
        contextNote: buildContextNote(baseline, variant, locale),
        signalNote: buildSignalNote(baseline, variant, locale, deltas),
        constraint,
        bestWhen: buildBestWhen(baseline, variant, locale),
        avoidWhen: buildAvoidWhen(baseline, variant, locale),
        deltas
    };
}
function buildKeystoneWorkbench(matches, locale) {
    const byVariant = new Map();
    for (const match of matches) {
        const descriptor = buildVariantDescriptor(match);
        const current = byVariant.get(descriptor.key) ?? [];
        current.push(match);
        byVariant.set(descriptor.key, current);
    }
    const variants = Array.from(byVariant.values())
        .map((groupedMatches) => aggregateVariant(groupedMatches))
        .sort((left, right) => right.games - left.games || right.winRate - left.winRate);
    const baseline = variants[0];
    const comparisons = variants
        .slice(1)
        .filter((variant) => variant.games >= 2)
        .map((variant) => buildComparison(baseline, variant, locale))
        .sort((left, right) => {
        const tierWeight = { strong: 3, weak: 2, hypothesis: 1 };
        return tierWeight[right.evidenceTier] - tierWeight[left.evidenceTier]
            || right.variant.games - left.variant.games
            || Math.abs(right.deltas.score) - Math.abs(left.deltas.score);
    });
    return {
        keystone: baseline.keystone,
        totalGames: matches.length,
        baseline,
        variants,
        comparisons
    };
}
function championHeadline(championName, comparisons, locale) {
    const strongest = comparisons[0];
    if (!strongest) {
        return copy(locale, `${championName}: todavía no hay una variante cerrada.`, `${championName}: there is still no closed rune variant.`);
    }
    return copy(locale, `${championName}: ${strongest.variant.compactLabel} es la lectura más útil hoy.`, `${championName}: ${strongest.variant.compactLabel} is the most useful read today.`);
}
function championDecisionNote(comparisons, locale) {
    const strong = comparisons.find((comparison) => comparison.evidenceTier === 'strong');
    if (strong)
        return strong.recommendation;
    const weak = comparisons[0];
    return weak
        ? copy(locale, 'Todavía sirve más como decisión contextual que como default absoluto.', 'For now this works better as a contextual decision than as an absolute default.')
        : copy(locale, 'Todavía hace falta más repetición para una decisión real de optimización.', 'More repetition is still needed for a real optimization decision.');
}
export function buildChampionRuneWorkbench(dataset, locale = 'es') {
    const byChampion = new Map();
    for (const match of dataset.matches) {
        const current = byChampion.get(match.championName) ?? [];
        current.push(match);
        byChampion.set(match.championName, current);
    }
    return Array.from(byChampion.entries())
        .map(([championName, championMatches]) => {
        const byKeystone = new Map();
        for (const match of championMatches) {
            const descriptor = buildVariantDescriptor(match);
            const current = byKeystone.get(descriptor.keystone) ?? [];
            current.push(match);
            byKeystone.set(descriptor.keystone, current);
        }
        const keystones = Array.from(byKeystone.values())
            .filter((matches) => matches.length >= 2)
            .map((matches) => buildKeystoneWorkbench(matches, locale))
            .sort((left, right) => right.totalGames - left.totalGames);
        const allComparisons = keystones.flatMap((keystone) => keystone.comparisons);
        return {
            championName,
            games: championMatches.length,
            strongReads: allComparisons.filter((comparison) => comparison.evidenceTier === 'strong').length,
            weakReads: allComparisons.filter((comparison) => comparison.evidenceTier === 'weak').length,
            hypothesisReads: allComparisons.filter((comparison) => comparison.evidenceTier === 'hypothesis').length,
            headline: championHeadline(championName, allComparisons, locale),
            decisionNote: championDecisionNote(allComparisons, locale),
            keystones
        };
    })
        .filter((champion) => champion.games >= 3 && champion.keystones.length)
        .sort((left, right) => right.games - left.games);
}
