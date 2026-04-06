import { buildChampionBuildWorkbench } from '../builds/buildWorkbench';
import { buildChampionRuneWorkbench } from '../runes/runeWorkbench';
function t(locale, es, en) {
    return locale === 'en' ? en : es;
}
function formatPercent(value) {
    return `${value.toFixed(1)}%`;
}
function formatMetric(value, digits = 1) {
    return value.toFixed(digits);
}
function formatMinute(value) {
    return typeof value === 'number' && Number.isFinite(value) ? `${value.toFixed(1)}m` : null;
}
function unique(values) {
    return Array.from(new Set(values));
}
function buildOperatingSummary(problem, locale) {
    switch (problem?.focusMetric) {
        case 'deaths_pre_10':
        case 'deaths_pre_14':
            return t(locale, 'No abras más variables hasta que este pick llegue vivo y jugable al primer bloque serio del mapa.', 'Do not open more variables until this pick reaches the first serious map block alive and playable.');
        case 'cs_at_15':
        case 'gold_diff_at_15':
            return t(locale, 'La prioridad del loadout no es “pegar más”: es sostener piso económico y tempo real hasta minuto 15.', 'The loadout priority is not “hit harder”: it is to hold economic floor and real tempo through minute 15.');
        case 'objective_fight_deaths':
        case 'kill_participation':
        case 'lead_conversion':
            return t(locale, 'La versión premium del pick aparece cuando llegás ordenado al mapa y convertís bien la ventaja, no cuando abrís más microvariantes.', 'The premium version of the pick appears when you arrive organized to the map and convert advantages well, not when you open more micro-variants.');
        default:
            return t(locale, 'Usá este pick como base operativa del bloque: menos ruido, mismo plan, mejor ejecución.', 'Use this pick as the operating base of the block: less noise, same plan, better execution.');
    }
}
function buildBuildPressureLabel(value, locale) {
    switch (value) {
        case 'heavy_ad':
            return t(locale, 'presión rival más AD', 'more AD-heavy enemy pressure');
        case 'heavy_ap':
            return t(locale, 'presión rival más AP', 'more AP-heavy enemy pressure');
        case 'double_frontline':
            return t(locale, 'doble frontline enfrente', 'double frontline across from you');
        default:
            return t(locale, 'presión rival mixta', 'mixed enemy pressure');
    }
}
function buildRuneChecklistAction(locale, baselineLabel, variantLabel, evidenceTier) {
    if (!variantLabel) {
        return t(locale, `No abras otra página sin trigger claro: el default sigue siendo ${baselineLabel}.`, `Do not open another page without a clear trigger: the default stays ${baselineLabel}.`);
    }
    if (evidenceTier === 'strong' || evidenceTier === 'weak') {
        return t(locale, `Si vuelve el mismo contexto, testeá ${variantLabel} contra ${baselineLabel} sin cambiar más variables a la vez.`, `If the same context returns, test ${variantLabel} against ${baselineLabel} without changing more variables at once.`);
    }
    return t(locale, `No promociones ${variantLabel} a default todavía: seguí usando ${baselineLabel} mientras juntás más muestra limpia.`, `Do not promote ${variantLabel} to default yet: keep using ${baselineLabel} while you build cleaner sample.`);
}
function buildBuildChecklistAction(locale, defaultPath, recommendation) {
    if (recommendation)
        return recommendation;
    if (!defaultPath) {
        return t(locale, 'Hacé un refresh del perfil antes de decidir microajustes de build: hoy faltan timings reales de items.', 'Refresh the profile before deciding build micro-adjustments: real item timings are still missing today.');
    }
    return t(locale, `Tomá ${defaultPath} como path default hasta que la presión rival justifique salir de esa familia.`, `Use ${defaultPath} as the default path until enemy pressure clearly justifies leaving that family.`);
}
function itemName(dataset, itemId) {
    return dataset.itemCatalog?.[String(itemId)]?.name ?? `Item ${itemId}`;
}
function buildRelatedPicks(dataset, anchorChampion, locale) {
    return dataset.summary.championPool
        .filter((entry) => entry.championName !== anchorChampion.championName)
        .sort((left, right) => right.games - left.games || right.avgScore - left.avgScore)
        .slice(0, 2)
        .map((entry) => ({
        championName: entry.championName,
        note: t(locale, `${entry.games} partidas · ${formatPercent(entry.winRate)} WR · ${formatMetric(entry.avgScore)} score medio`, `${entry.games} games · ${formatPercent(entry.winRate)} WR · ${formatMetric(entry.avgScore)} average score`)
    }));
}
export function buildChampionPrepBrief({ dataset, locale = 'es', anchorChampion, mainProblem, todayActions, aiCoach, problematicMatchup }) {
    if (!anchorChampion)
        return null;
    const runeWorkbench = buildChampionRuneWorkbench(dataset, locale)
        .find((entry) => entry.championName === anchorChampion.championName);
    const runeKeystone = runeWorkbench?.keystones[0] ?? null;
    const runeComparison = runeKeystone?.comparisons[0] ?? null;
    const buildWorkbench = buildChampionBuildWorkbench(dataset, locale);
    const buildChampion = buildWorkbench.ready
        ? buildWorkbench.champions.find((entry) => entry.championName === anchorChampion.championName) ?? null
        : null;
    const buildComparison = buildChampion?.comparisons[0] ?? null;
    const buildBaseline = buildChampion?.baseline ?? null;
    const relatedPicks = buildRelatedPicks(dataset, anchorChampion, locale);
    const matchupApplies = problematicMatchup?.championName === anchorChampion.championName;
    const matchupSummary = matchupApplies
        ? (aiCoach?.coach.matchupSpecificNote ?? problematicMatchup?.summary ?? null)
        : (aiCoach?.coach.matchupSpecificNote ?? null);
    const matchupAdjustments = matchupApplies ? (problematicMatchup?.adjustments.slice(0, 2) ?? []) : [];
    const rawFocusNote = aiCoach?.coach.championSpecificNote ?? null;
    const normalizedFocusNote = rawFocusNote?.toLowerCase() ?? '';
    const focusNote = rawFocusNote && (normalizedFocusNote.includes(anchorChampion.championName.toLowerCase()) ||
        !relatedPicks.some((entry) => normalizedFocusNote.includes(entry.championName.toLowerCase())))
        ? rawFocusNote
        : null;
    const runePlan = runeKeystone
        ? {
            championName: anchorChampion.championName,
            defaultPage: `${runeKeystone.baseline.keystone} · ${runeKeystone.baseline.compactLabel}`,
            baselineSummary: t(locale, `${runeKeystone.baseline.games} partidas · ${formatPercent(runeKeystone.baseline.winRate)} WR · ${formatMetric(runeKeystone.baseline.avgCsAt15)} CS@15`, `${runeKeystone.baseline.games} games · ${formatPercent(runeKeystone.baseline.winRate)} WR · ${formatMetric(runeKeystone.baseline.avgCsAt15)} CS@15`),
            evidenceTier: runeComparison?.evidenceTier ?? null,
            swapSummary: runeComparison
                ? `${runeComparison.summary} ${runeComparison.contextNote ?? runeComparison.signalNote}`
                : t(locale, 'Todavía no hay otra página con muestra suficiente para reclamar una mejora real sobre este baseline.', 'There is still no second page with enough sample to claim a real improvement over this baseline.'),
            supportingChips: unique([
                `${formatMetric(runeKeystone.baseline.avgScore)} ${t(locale, 'score', 'score')}`,
                `${formatMetric(runeKeystone.baseline.avgDeathsPre14)} ${t(locale, 'muertes pre14', 'deaths pre14')}`,
                ...(runeKeystone.baseline.topMatchups[0]
                    ? [`${t(locale, 'más visto vs', 'most seen vs')} ${runeKeystone.baseline.topMatchups[0].championName}`]
                    : [])
            ]).slice(0, 3)
        }
        : null;
    const buildPlan = buildBaseline
        ? {
            championName: anchorChampion.championName,
            status: 'ready',
            defaultPath: buildBaseline.label,
            baselineSummary: t(locale, `${buildBaseline.games} partidas · ${formatPercent(buildBaseline.winRate)} WR · ${formatMetric(buildBaseline.avgScore)} score`, `${buildBaseline.games} games · ${formatPercent(buildBaseline.winRate)} WR · ${formatMetric(buildBaseline.avgScore)} score`),
            evidenceTier: buildComparison?.evidenceTier ?? null,
            swapSummary: buildComparison
                ? `${buildComparison.summary} ${buildComparison.recommendation ?? buildComparison.pressureNote ?? ''}`.trim()
                : t(locale, 'Hoy esta familia es la referencia más honesta: todavía no aparece otra con muestra suficiente para desplazarla.', 'Today this family is the most honest reference: another one has not shown enough sample to displace it yet.'),
            supportingChips: unique([
                buildBuildPressureLabel(buildBaseline.pressureProfile, locale),
                ...(buildBaseline.topItems.length
                    ? [`${t(locale, 'core', 'core')}: ${buildBaseline.topItems.map((itemId) => itemName(dataset, itemId)).join(' / ')}`]
                    : []),
                ...(formatMinute(buildBaseline.avgFirstItemMinute) ? [`1st ${formatMinute(buildBaseline.avgFirstItemMinute)}`] : []),
                ...(formatMinute(buildBaseline.avgBootsMinute) ? [`Boots ${formatMinute(buildBaseline.avgBootsMinute)}`] : [])
            ]).slice(0, 4)
        }
        : buildWorkbench.ready
            ? {
                championName: anchorChampion.championName,
                status: 'missing',
                defaultPath: null,
                baselineSummary: t(locale, 'Este campeón todavía no tiene familia de build suficientemente repetida dentro del scope actual.', 'This champion still does not have a repeated enough build family inside the current scope.'),
                evidenceTier: null,
                swapSummary: t(locale, 'Conviene mantener una sola familia de build durante más partidas antes de sacar conclusiones de microajuste.', 'It is better to hold one build family across more games before drawing micro-adjustment conclusions.'),
                supportingChips: []
            }
            : {
                championName: anchorChampion.championName,
                status: 'needs-refresh',
                defaultPath: null,
                baselineSummary: t(locale, 'El collector actual necesita un refresh para traer timings de items, botas y ventanas seguidas.', 'The current collector needs a refresh to bring item timings, boots timing and tracked windows.'),
                evidenceTier: null,
                swapSummary: t(locale, 'La capa de build ya existe, pero esta muestra fue guardada antes de que el producto empezara a persistir ese timeline enriquecido.', 'The build layer already exists, but this sample was saved before the product started persisting that enriched timeline.'),
                supportingChips: []
            };
    const checklist = [
        ...todayActions.map((label) => ({ label, source: 'coach' })),
        ...(matchupAdjustments[0] ? [{ label: matchupAdjustments[0], source: 'matchup' }] : []),
        ...(runePlan ? [{
                label: buildRuneChecklistAction(locale, runePlan.defaultPage, runeComparison?.variant.compactLabel ?? null, runePlan.evidenceTier),
                source: 'runes'
            }] : []),
        {
            label: buildBuildChecklistAction(locale, buildPlan.defaultPath, buildComparison?.recommendation ?? null),
            source: 'builds'
        }
    ]
        .filter((entry, index, list) => list.findIndex((candidate) => candidate.label === entry.label) === index)
        .slice(0, 3);
    return {
        championName: anchorChampion.championName,
        relatedPicks,
        readiness: runePlan && buildPlan.status === 'ready' ? 'full' : 'partial',
        operatingSummary: buildOperatingSummary(mainProblem, locale),
        focusNote,
        matchupSummary,
        matchupAdjustments,
        runePlan,
        buildPlan,
        checklist
    };
}
