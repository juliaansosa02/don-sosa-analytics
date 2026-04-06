import type { ItemCatalogEntry } from '@don-sosa/core';
import type { Locale } from '../../lib/i18n';
import type { Dataset, MatchSnapshot } from '../../types';
import { classifyComparativeEvidence, type EvidenceTier } from '../premium-analysis/evidence';

type PressureProfile = 'heavy_ad' | 'heavy_ap' | 'double_frontline' | 'mixed';
type DurationBucket = 'short' | 'standard' | 'long';
type EarlyState = 'stable' | 'scrappy' | 'volatile';

export interface TrackedItemWindow {
  label: string;
  minute: number;
  coverage: number;
}

export interface BuildExampleMatch {
  matchId: string;
  win: boolean;
  gameCreation: number;
  opponentChampionName?: string;
  score: number;
  damageToChampions: number;
  csAt15: number;
  goldDiffAt15: number;
  firstItemMinute: number | null;
  secondItemMinute: number | null;
  bootsMinute: number | null;
}

export interface BuildFamilyAggregate {
  key: string;
  championName: string;
  label: string;
  games: number;
  wins: number;
  winRate: number;
  avgScore: number;
  avgTotalDamage: number;
  avgDamageToChampions: number;
  avgCs: number;
  avgCsAt15: number;
  avgGoldDiffAt15: number;
  avgDeathsPre14: number;
  avgLaneVolatility: number;
  avgResetTiming: number;
  avgObjectiveSetup: number;
  avgDurationMinutes: number;
  avgFirstItemMinute: number | null;
  avgSecondItemMinute: number | null;
  avgBootsMinute: number | null;
  pressureProfile: PressureProfile;
  topItems: number[];
  bootsId?: number;
  firstItemId?: number;
  secondItemId?: number;
  trackedWindows: TrackedItemWindow[];
  topMatchups: Array<{ championName: string; games: number; share: number; winRate: number }>;
  durationProfile: Record<DurationBucket, number>;
  earlyStateProfile: Record<EarlyState, number>;
  durationPerformance: Record<DurationBucket, { games: number; winRate: number; avgScore: number }>;
  earlyStatePerformance: Record<EarlyState, { games: number; winRate: number; avgScore: number }>;
  compFitLabel: string;
  missingResponseLabel: string | null;
  examples: BuildExampleMatch[];
}

export interface BuildComparison {
  baseline: BuildFamilyAggregate;
  variant: BuildFamilyAggregate;
  evidenceTier: EvidenceTier;
  summary: string;
  constraint: string | null;
  recommendation: string | null;
  pressureNote: string | null;
  leverageNote: string | null;
  bestWhen: string | null;
  avoidWhen: string | null;
  deltas: {
    winRate: number;
    score: number;
    totalDamage: number;
    damageToChampions: number;
    cs: number;
    csAt15: number;
    goldDiffAt15: number;
    deathsPre14: number;
    laneVolatility: number;
    resetTiming: number;
    firstItemMinute: number | null;
    secondItemMinute: number | null;
    bootsMinute: number | null;
  };
}

export interface ItemImpactAggregate {
  itemId: number;
  name: string;
  games: number;
  usageShare: number;
  avgCompletionMinute: number | null;
  winRateDelta: number;
  scoreDelta: number;
  damageDelta: number;
  earlyStateDelta: number;
  utilityLabel: string;
  evidenceTier: EvidenceTier;
}

export interface ChampionBuildWorkbench {
  championName: string;
  games: number;
  baseline: BuildFamilyAggregate | null;
  buildFamilies: BuildFamilyAggregate[];
  comparisons: BuildComparison[];
  topItems: ItemImpactAggregate[];
  weakItems: ItemImpactAggregate[];
  headline: string;
  decisionNote: string;
}

function copy(locale: Locale, es: string, en: string) {
  return locale === 'en' ? en : es;
}

function average(values: number[]) {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function averageNullable(values: Array<number | null | undefined>) {
  const valid = values.filter((value): value is number => typeof value === 'number' && Number.isFinite(value));
  return valid.length ? average(valid) : null;
}

function round(value: number, digits = 1) {
  return Number(value.toFixed(digits));
}

function bucketDuration(durationMinutes: number): DurationBucket {
  if (durationMinutes < 25) return 'short';
  if (durationMinutes <= 33) return 'standard';
  return 'long';
}

function classifyEarlyState(match: MatchSnapshot): EarlyState {
  if (match.timeline.deathsPre14 >= 2 || (match.timeline.goldDiffAt15 ?? 0) <= -400 || match.timeline.laneVolatilityScore >= 55) return 'volatile';
  if (match.timeline.deathsPre14 === 0 && (match.timeline.goldDiffAt15 ?? 0) >= 0 && match.timeline.laneVolatilityScore <= 38) return 'stable';
  return 'scrappy';
}

function itemTags(itemId: number, catalog: Map<number, ItemCatalogEntry>) {
  return catalog.get(itemId)?.tags ?? [];
}

function itemName(itemId: number | undefined, catalog: Map<number, ItemCatalogEntry>) {
  if (!itemId) return null;
  return catalog.get(itemId)?.name ?? `Item ${itemId}`;
}

function isMajorItem(itemId: number, catalog: Map<number, ItemCatalogEntry>) {
  const item = catalog.get(itemId);
  if (!item) return false;
  if (item.tags.includes('Boots') || item.tags.includes('Consumable') || item.tags.includes('Trinket')) return false;
  return item.goldTotal >= 2200 && item.into.length === 0;
}

function buildCatalogMap(dataset: Dataset) {
  return new Map<number, ItemCatalogEntry>(
    Object.values(dataset.itemCatalog ?? {}).map((item) => [item.id, item])
  );
}

function buildTopMatchups(matches: MatchSnapshot[]) {
  const counts = new Map<string, MatchSnapshot[]>();

  for (const match of matches) {
    if (!match.opponentChampionName) continue;
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

function buildStatePerformance(matches: MatchSnapshot[], by: 'duration' | 'early') {
  const keys = by === 'duration'
    ? ['short', 'standard', 'long'] as const
    : ['stable', 'scrappy', 'volatile'] as const;
  const result = {} as Record<string, { games: number; winRate: number; avgScore: number }>;

  for (const key of keys) {
    const list = matches.filter((match) => (by === 'duration' ? bucketDuration(match.gameDurationSeconds / 60) : classifyEarlyState(match)) === key);
    result[key] = {
      games: list.length,
      winRate: round((list.filter((match) => match.win).length / Math.max(list.length, 1)) * 100, 1),
      avgScore: round(average(list.map((match) => match.score.total)), 1)
    };
  }

  return result as Record<typeof keys[number], { games: number; winRate: number; avgScore: number }>;
}

function enemyPressureForMatch(match: MatchSnapshot, catalog: Map<number, ItemCatalogEntry>): PressureProfile {
  const enemyTeam = match.items?.enemyTeam ?? [];
  let physicalThreats = 0;
  let magicThreats = 0;
  let frontliners = 0;

  for (const enemy of enemyTeam) {
    const tags = new Set(enemy.items.flatMap((itemId) => itemTags(itemId, catalog)));
    const physicalScore = Number(tags.has('CriticalStrike')) + Number(tags.has('AttackSpeed')) + Number(tags.has('Damage'));
    const magicScore = Number(tags.has('SpellDamage')) + Number(tags.has('Mana')) + Number(tags.has('CooldownReduction'));
    const frontlineScore = Number(tags.has('Armor')) + Number(tags.has('SpellBlock')) + Number(tags.has('Health'));

    if (physicalScore >= magicScore && physicalScore >= 2) physicalThreats += 1;
    if (magicScore > physicalScore && magicScore >= 2) magicThreats += 1;
    if (frontlineScore >= 2) frontliners += 1;
  }

  if (magicThreats >= 3) return 'heavy_ap';
  if (physicalThreats >= 3) return 'heavy_ad';
  if (frontliners >= 2) return 'double_frontline';
  return 'mixed';
}

function buildFamilyKey(match: MatchSnapshot, catalog: Map<number, ItemCatalogEntry>) {
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
    bootsId,
    firstItemId: firstTwo[0],
    secondItemId: firstTwo[1]
  };
}

function inferUtilityLabel(item: ItemCatalogEntry, locale: Locale) {
  if (item.tags.includes('Armor') || item.tags.includes('SpellBlock') || item.tags.includes('Health')) {
    return copy(locale, 'utility defensiva', 'defensive utility');
  }
  if (item.tags.includes('Boots')) {
    return copy(locale, 'tempo / movilidad', 'tempo / mobility');
  }
  if (item.tags.includes('CriticalStrike') || item.tags.includes('AttackSpeed')) {
    return copy(locale, 'snowball / greed', 'snowball / greed');
  }
  if (item.tags.includes('SpellDamage') || item.tags.includes('Damage')) {
    return copy(locale, 'power spike de daño', 'damage spike');
  }
  return copy(locale, 'utilidad situacional', 'situational utility');
}

function estimateTrackedWindows(match: MatchSnapshot, catalog: Map<number, ItemCatalogEntry>, locale: Locale) {
  const purchaseEvents = match.items?.purchaseEvents ?? [];
  const timelinePoints = match.items?.timelinePoints ?? [];
  const takedownMinutes = match.items?.takedownMinutes ?? [];
  const tracked: TrackedItemWindow[] = [];

  function firstPurchaseByName(names: string[]) {
    return purchaseEvents.find((event) =>
      event.type === 'purchase'
      && event.itemId
      && names.includes((itemName(event.itemId, catalog) ?? '').toLowerCase())
    );
  }

  const cullPurchase = firstPurchaseByName(['cull']);
  if (cullPurchase) {
    const csAtPurchase = [...timelinePoints].reverse().find((point) => point.minute <= cullPurchase.minute)?.cs ?? 0;
    const payoffPoint = timelinePoints.find((point) => point.minute >= cullPurchase.minute && point.cs >= csAtPurchase + 100);
    if (payoffPoint) tracked.push({ label: copy(locale, 'Cull paga', 'Cull pays off'), minute: payoffPoint.minute, coverage: 1 });
  }

  const sealPurchase = firstPurchaseByName(['dark seal', "mejai's soulstealer"]);
  if (sealPurchase) {
    const firstTakedown = takedownMinutes.find((minute) => minute >= sealPurchase.minute);
    if (firstTakedown) tracked.push({ label: copy(locale, 'Dark Seal arranca', 'Dark Seal activates'), minute: firstTakedown, coverage: 1 });
  }

  const hubrisPurchase = firstPurchaseByName(['hubris']);
  if (hubrisPurchase) {
    const firstTakedown = takedownMinutes.find((minute) => minute >= hubrisPurchase.minute);
    if (firstTakedown) tracked.push({ label: copy(locale, 'Hubris activa', 'Hubris activates'), minute: firstTakedown, coverage: 1 });
  }

  return tracked;
}

function aggregateTrackedWindows(matches: MatchSnapshot[], catalog: Map<number, ItemCatalogEntry>, locale: Locale) {
  const grouped = new Map<string, number[]>();

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

function buildCompFitLabel(family: ReturnType<typeof buildFamilyKey>, pressureProfile: PressureProfile, catalog: Map<number, ItemCatalogEntry>, locale: Locale) {
  const tags = new Set([...family.topItems, family.bootsId].filter((itemId): itemId is number => typeof itemId === 'number').flatMap((itemId) => itemTags(itemId, catalog)));

  if (pressureProfile === 'heavy_ap' && tags.has('SpellBlock')) return copy(locale, 'build con respuesta visible a presión AP', 'build shows a visible answer into AP pressure');
  if (pressureProfile === 'heavy_ad' && tags.has('Armor')) return copy(locale, 'build con respuesta visible a presión AD', 'build shows a visible answer into AD pressure');
  if (pressureProfile === 'double_frontline' && (tags.has('ArmorPenetration') || tags.has('MagicPenetration'))) return copy(locale, 'path alineado para romper frontline', 'path looks aligned to break frontline');
  if (tags.has('CriticalStrike') || tags.has('AttackSpeed')) return copy(locale, 'path de snowball / greed', 'snowball / greed path');
  return copy(locale, 'path mixto / utility', 'mixed / utility path');
}

function buildMissingResponseLabel(family: ReturnType<typeof buildFamilyKey>, pressureProfile: PressureProfile, catalog: Map<number, ItemCatalogEntry>, locale: Locale) {
  const tags = new Set([...family.topItems, family.bootsId].filter((itemId): itemId is number => typeof itemId === 'number').flatMap((itemId) => itemTags(itemId, catalog)));

  if (pressureProfile === 'heavy_ap' && !tags.has('SpellBlock')) return copy(locale, 'faltó una respuesta visible de MR / botas menos greedy', 'missing a visible MR answer / less greedy boots');
  if (pressureProfile === 'heavy_ad' && !tags.has('Armor')) return copy(locale, 'faltó una respuesta visible de armor / tempo defensivo', 'missing a visible armor / defensive tempo answer');
  if (pressureProfile === 'double_frontline' && !tags.has('ArmorPenetration') && !tags.has('MagicPenetration')) return copy(locale, 'faltó más shred o penetración para frontline', 'missing more shred or penetration into frontline');
  return null;
}

function buildExamples(matches: MatchSnapshot[]) {
  return [...matches]
    .sort((left, right) => right.score.total - left.score.total)
    .slice(0, 2)
    .map((match) => ({
      matchId: match.matchId,
      win: match.win,
      gameCreation: match.gameCreation,
      opponentChampionName: match.opponentChampionName,
      score: match.score.total,
      damageToChampions: match.damageToChampions,
      csAt15: match.timeline.csAt15,
      goldDiffAt15: match.timeline.goldDiffAt15 ?? 0,
      firstItemMinute: match.items?.milestones.firstCompletedItemMinute ?? null,
      secondItemMinute: match.items?.milestones.secondCompletedItemMinute ?? null,
      bootsMinute: match.items?.milestones.bootsMinute ?? null
    }));
}

function aggregateFamily(matches: MatchSnapshot[], catalog: Map<number, ItemCatalogEntry>, locale: Locale): BuildFamilyAggregate {
  const family = buildFamilyKey(matches[0], catalog);
  const wins = matches.filter((match) => match.win).length;
  const pressureCounts: Record<PressureProfile, number> = { heavy_ad: 0, heavy_ap: 0, double_frontline: 0, mixed: 0 };
  const durationProfile: Record<DurationBucket, number> = { short: 0, standard: 0, long: 0 };
  const earlyStateProfile: Record<EarlyState, number> = { stable: 0, scrappy: 0, volatile: 0 };

  for (const match of matches) {
    pressureCounts[enemyPressureForMatch(match, catalog)] += 1;
    durationProfile[bucketDuration(match.gameDurationSeconds / 60)] += 1;
    earlyStateProfile[classifyEarlyState(match)] += 1;
  }

  const pressureProfile = (Object.entries(pressureCounts).sort((left, right) => right[1] - left[1])[0]?.[0] ?? 'mixed') as PressureProfile;

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
    avgGoldDiffAt15: round(average(matches.map((match) => match.timeline.goldDiffAt15 ?? 0)), 0),
    avgDeathsPre14: round(average(matches.map((match) => match.timeline.deathsPre14)), 1),
    avgLaneVolatility: round(average(matches.map((match) => match.timeline.laneVolatilityScore)), 1),
    avgResetTiming: round(average(matches.map((match) => match.timeline.resetTimingScore)), 1),
    avgObjectiveSetup: round(average(matches.map((match) => match.timeline.objectiveSetupScore)), 1),
    avgDurationMinutes: round(average(matches.map((match) => match.gameDurationSeconds / 60)), 1),
    avgFirstItemMinute: averageNullable(matches.map((match) => match.items?.milestones.firstCompletedItemMinute ?? null)),
    avgSecondItemMinute: averageNullable(matches.map((match) => match.items?.milestones.secondCompletedItemMinute ?? null)),
    avgBootsMinute: averageNullable(matches.map((match) => match.items?.milestones.bootsMinute ?? null)),
    pressureProfile,
    trackedWindows: aggregateTrackedWindows(matches, catalog, locale),
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
    earlyStatePerformance: buildStatePerformance(matches, 'early'),
    compFitLabel: buildCompFitLabel(family, pressureProfile, catalog, locale),
    missingResponseLabel: buildMissingResponseLabel(family, pressureProfile, catalog, locale),
    examples: buildExamples(matches)
  };
}

function pressureCopy(profile: PressureProfile, locale: Locale) {
  switch (profile) {
    case 'heavy_ad':
      return copy(locale, 'el rival castigó más desde daño físico / autoataques', 'enemy pressure leaned more physical / auto-attack heavy');
    case 'heavy_ap':
      return copy(locale, 'el rival castigó más desde daño mágico', 'enemy pressure leaned more magic-heavy');
    case 'double_frontline':
      return copy(locale, 'la partida tuvo doble frontline real enfrente', 'the game had a real double-frontline enemy setup');
    default:
      return copy(locale, 'la presión enemiga quedó mezclada', 'enemy pressure looked mixed');
  }
}

function buildRecommendation(
  baseline: BuildFamilyAggregate,
  variant: BuildFamilyAggregate,
  catalog: Map<number, ItemCatalogEntry>,
  locale: Locale
) {
  const playerTags = new Set(
    [...variant.topItems, variant.bootsId]
      .filter((itemId): itemId is number => typeof itemId === 'number')
      .flatMap((itemId) => itemTags(itemId, catalog))
  );

  if (variant.pressureProfile === 'heavy_ap' && !playerTags.has('SpellBlock')) {
    return copy(locale, 'Contra esta muestra más AP, faltó una respuesta de MR más temprana o unas botas menos greedy.', 'Into this more AP-heavy sample, an earlier MR answer or less greedy boots could have fit better.');
  }
  if (variant.pressureProfile === 'heavy_ad' && !playerTags.has('Armor')) {
    return copy(locale, 'Contra esta muestra más AD, el build no muestra una respuesta clara de armor / botas defensivas.', 'Into this more AD-heavy sample, the build does not show a clear armor / defensive boots response.');
  }
  if (variant.pressureProfile === 'double_frontline' && variant.avgDamageToChampions < baseline.avgDamageToChampions - 2000) {
    return copy(locale, 'Contra doble frontline faltó una pieza más pensada para shred o penetración.', 'Into double frontline, the build likely needed an earlier shred or penetration slot.');
  }
  if (variant.avgBootsMinute !== null && baseline.avgBootsMinute !== null && variant.avgBootsMinute - baseline.avgBootsMinute >= 2.5) {
    return copy(locale, 'El timing de botas está llegando bastante más tarde que el baseline y eso puede estar costando tempo real.', 'Boots timing is arriving much later than the baseline and may be costing real tempo.');
  }
  return null;
}

function buildConstraint(baseline: BuildFamilyAggregate, variant: BuildFamilyAggregate, locale: Locale) {
  const minSample = Math.min(baseline.games, variant.games);

  if (minSample < 4) return copy(locale, 'La comparación todavía tiene poca muestra pareja.', 'The comparison still has too little balanced sample.');
  if (baseline.pressureProfile !== variant.pressureProfile) return copy(locale, 'Las dos familias no están viendo exactamente el mismo tipo de presión rival.', 'The two families are not seeing exactly the same type of enemy pressure.');
  if (baseline.topMatchups[0]?.championName !== variant.topMatchups[0]?.championName && (variant.topMatchups[0]?.share ?? 0) >= 35) {
    return copy(locale, 'Parte del edge puede venir del matchup que absorbió esta familia.', 'Part of the edge may come from the matchup allocation absorbed by this family.');
  }
  if (baseline.avgFirstItemMinute !== null && variant.avgFirstItemMinute !== null && Math.abs(variant.avgFirstItemMinute - baseline.avgFirstItemMinute) >= 2.5) {
    return copy(locale, 'Parte de la diferencia puede venir del timing y no solo del item path.', 'Part of the difference may come from timing, not only the item path.');
  }
  return null;
}

function buildLeverageNote(baseline: BuildFamilyAggregate, variant: BuildFamilyAggregate, locale: Locale, deltas: BuildComparison['deltas']) {
  if (deltas.firstItemMinute !== null && deltas.firstItemMinute <= -1.2 && deltas.score >= 2) {
    return copy(locale, 'La build parece ganar leverage porque llega antes a su primer spike real.', 'The build seems to gain leverage because it reaches its first real spike earlier.');
  }
  if (deltas.damageToChampions >= 2500 && deltas.goldDiffAt15 >= 180) {
    return copy(locale, 'El path convierte mejor el early en daño útil sobre campeones.', 'The path converts the early game into more useful champion damage.');
  }
  if (deltas.laneVolatility <= -5 && deltas.deathsPre14 <= -0.6) {
    return copy(locale, 'La ventaja parece venir más por ordenar el plan que por puro greed de daño.', 'The edge seems to come more from organizing the plan than from pure damage greed.');
  }
  return null;
}

function buildBestWhen(baseline: BuildFamilyAggregate, variant: BuildFamilyAggregate, locale: Locale) {
  if (variant.earlyStatePerformance.stable.games >= 2 && variant.earlyStatePerformance.stable.winRate >= baseline.earlyStatePerformance.stable.winRate + 8) {
    return copy(locale, 'Cuando el early llega jugable y podés acelerar el spike sin desordenar el plan.', 'When the early stays playable and you can accelerate the spike without derailing the plan.');
  }
  if (variant.durationPerformance.long.games >= 2 && variant.durationPerformance.long.winRate >= baseline.durationPerformance.long.winRate + 8) {
    return copy(locale, 'Cuando la partida tiende a alargarse y esta familia escala mejor.', 'When the game tends to go longer and this family scales better.');
  }
  if (variant.pressureProfile === 'double_frontline') {
    return copy(locale, 'Cuando enfrente hay frontline real y necesitás más daño sostenido / shred.', 'When the enemy shows real frontline and you need more sustained damage / shred.');
  }
  return null;
}

function buildAvoidWhen(baseline: BuildFamilyAggregate, variant: BuildFamilyAggregate, locale: Locale) {
  if (variant.earlyStatePerformance.volatile.games >= 2 && variant.earlyStatePerformance.volatile.winRate <= baseline.earlyStatePerformance.volatile.winRate - 8) {
    return copy(locale, 'Cuando el early viene roto y necesitás una build más indulgente.', 'When the early is already broken and you need a more forgiving build.');
  }
  if (variant.durationPerformance.short.games >= 2 && variant.durationPerformance.short.winRate <= baseline.durationPerformance.short.winRate - 8) {
    return copy(locale, 'Cuando la partida se define demasiado pronto para llegar a pagar el path.', 'When the game resolves too early for the path to pay off.');
  }
  if (variant.missingResponseLabel) return variant.missingResponseLabel;
  return null;
}

function buildComparison(
  baseline: BuildFamilyAggregate,
  variant: BuildFamilyAggregate,
  catalog: Map<number, ItemCatalogEntry>,
  locale: Locale
): BuildComparison {
  const deltas = {
    winRate: round(variant.winRate - baseline.winRate, 1),
    score: round(variant.avgScore - baseline.avgScore, 1),
    totalDamage: round(variant.avgTotalDamage - baseline.avgTotalDamage, 0),
    damageToChampions: round(variant.avgDamageToChampions - baseline.avgDamageToChampions, 0),
    cs: round(variant.avgCs - baseline.avgCs, 0),
    csAt15: round(variant.avgCsAt15 - baseline.avgCsAt15, 1),
    goldDiffAt15: round(variant.avgGoldDiffAt15 - baseline.avgGoldDiffAt15, 0),
    deathsPre14: round(variant.avgDeathsPre14 - baseline.avgDeathsPre14, 1),
    laneVolatility: round(variant.avgLaneVolatility - baseline.avgLaneVolatility, 1),
    resetTiming: round(variant.avgResetTiming - baseline.avgResetTiming, 1),
    firstItemMinute: variant.avgFirstItemMinute !== null && baseline.avgFirstItemMinute !== null ? round(variant.avgFirstItemMinute - baseline.avgFirstItemMinute, 1) : null,
    secondItemMinute: variant.avgSecondItemMinute !== null && baseline.avgSecondItemMinute !== null ? round(variant.avgSecondItemMinute - baseline.avgSecondItemMinute, 1) : null,
    bootsMinute: variant.avgBootsMinute !== null && baseline.avgBootsMinute !== null ? round(variant.avgBootsMinute - baseline.avgBootsMinute, 1) : null
  };

  const signalScore = Math.max(
    Math.abs(deltas.winRate) / 12,
    Math.abs(deltas.score) / 4,
    Math.abs(deltas.damageToChampions) / 3000,
    Math.abs(deltas.totalDamage) / 6000,
    Math.abs(deltas.goldDiffAt15) / 350,
    Math.abs(deltas.laneVolatility) / 10,
    Math.abs(deltas.firstItemMinute ?? 0) / 3
  );
  const contextScore = (
    (baseline.pressureProfile === variant.pressureProfile ? 0.25 : 0)
    + (Math.min(baseline.games, variant.games) >= 6 ? 0.2 : 0)
    + (Math.abs(variant.earlyStateProfile.volatile - baseline.earlyStateProfile.volatile) <= 12 ? 0.15 : 0)
  );
  const constraint = buildConstraint(baseline, variant, locale);
  const evidenceTier = classifyComparativeEvidence({
    leftSample: baseline.games,
    rightSample: variant.games,
    signalScore,
    contextScore: constraint ? contextScore - 0.25 : contextScore
  });

  const summary = deltas.winRate >= 0
    ? copy(locale, `${variant.label} sube ${Math.abs(deltas.winRate).toFixed(1)} pts de WR, ${Math.abs(deltas.score).toFixed(1)} de score y ${Math.abs(deltas.damageToChampions)} de daño a champs contra el baseline.`, `${variant.label} gains ${Math.abs(deltas.winRate).toFixed(1)} WR points, ${Math.abs(deltas.score).toFixed(1)} score and ${Math.abs(deltas.damageToChampions)} champ damage versus the baseline.`)
    : copy(locale, `${variant.label} cae ${Math.abs(deltas.winRate).toFixed(1)} pts de WR y ${Math.abs(deltas.score).toFixed(1)} de score contra el baseline.`, `${variant.label} drops ${Math.abs(deltas.winRate).toFixed(1)} WR points and ${Math.abs(deltas.score).toFixed(1)} score versus the baseline.`);

  return {
    baseline,
    variant,
    evidenceTier,
    summary,
    constraint,
    recommendation: buildRecommendation(baseline, variant, catalog, locale),
    pressureNote: copy(locale, `Contexto principal: ${pressureCopy(variant.pressureProfile, locale)}.`, `Main context: ${pressureCopy(variant.pressureProfile, locale)}.`),
    leverageNote: buildLeverageNote(baseline, variant, locale, deltas),
    bestWhen: buildBestWhen(baseline, variant, locale),
    avoidWhen: buildAvoidWhen(baseline, variant, locale),
    deltas
  };
}

function completionMinuteForItem(match: MatchSnapshot, itemId: number) {
  const events = match.items?.purchaseEvents ?? [];
  const completion = events.find((event) => event.type === 'purchase' && event.itemId === itemId);
  return completion?.minute ?? null;
}

function buildItemImpactAggregates(
  championMatches: MatchSnapshot[],
  baseline: BuildFamilyAggregate | null,
  catalog: Map<number, ItemCatalogEntry>,
  locale: Locale
) {
  const itemMatches = new Map<number, MatchSnapshot[]>();

  for (const match of championMatches) {
    const visibleItems = new Set<number>([
      ...(match.items?.milestones.majorItemOrder ?? []),
      ...(match.items?.finalBuild ?? [])
    ]);

    for (const itemId of visibleItems) {
      if (!catalog.has(itemId)) continue;
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
      const avgStableEarly = round((matches.filter((match) => classifyEarlyState(match) === 'stable').length / Math.max(matches.length, 1)) * 100, 1);
      const signalScore = Math.max(
        Math.abs(winRate - (baseline?.winRate ?? 0)) / 12,
        Math.abs(avgScore - (baseline?.avgScore ?? 0)) / 4,
        Math.abs(avgDamage - (baseline?.avgDamageToChampions ?? 0)) / 3000
      );
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
        earlyStateDelta: round(avgStableEarly - (baseline?.earlyStateProfile.stable ?? 0), 1),
        utilityLabel: item ? inferUtilityLabel(item, locale) : copy(locale, 'utilidad situacional', 'situational utility'),
        evidenceTier
      } satisfies ItemImpactAggregate;
    })
    .filter((item) => item.games >= 2)
    .sort((left, right) => right.games - left.games || right.scoreDelta - left.scoreDelta);
}

function championHeadline(championName: string, comparisons: BuildComparison[], locale: Locale) {
  const strongest = comparisons[0];
  if (!strongest) return copy(locale, `${championName}: todavía no hay una familia alternativa cerrada.`, `${championName}: there is still no closed alternative family.`);
  return copy(locale, `${championName}: ${strongest.variant.label} es la familia que más cambia el output hoy.`, `${championName}: ${strongest.variant.label} is the family shifting output the most today.`);
}

function championDecisionNote(baseline: BuildFamilyAggregate | null, comparisons: BuildComparison[], locale: Locale) {
  if (!baseline) return copy(locale, 'Todavía no hay baseline suficiente.', 'There is still not enough baseline.');
  const strong = comparisons.find((comparison) => comparison.evidenceTier === 'strong');
  if (strong?.recommendation) return strong.recommendation;
  if (baseline.missingResponseLabel) return copy(locale, `Watchpoint base: ${baseline.missingResponseLabel}.`, `Baseline watchpoint: ${baseline.missingResponseLabel}.`);
  return copy(locale, `La familia base hoy se lee como ${baseline.compFitLabel}.`, `The baseline family currently reads as ${baseline.compFitLabel}.`);
}

export function buildChampionBuildWorkbench(dataset: Dataset, locale: Locale = 'es') {
  const catalog = buildCatalogMap(dataset);
  const hasTimelines = dataset.matches.some((match) => match.items?.purchaseEvents?.length);

  if (!catalog.size || !hasTimelines) {
    return {
      ready: false as const,
      champions: [] as ChampionBuildWorkbench[]
    };
  }

  const byChampion = new Map<string, MatchSnapshot[]>();

  for (const match of dataset.matches) {
    const current = byChampion.get(match.championName) ?? [];
    current.push(match);
    byChampion.set(match.championName, current);
  }

  const champions = Array.from(byChampion.entries())
    .map(([championName, championMatches]) => {
      const byFamily = new Map<string, MatchSnapshot[]>();

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
              return weights[right.evidenceTier] - weights[left.evidenceTier] || right.variant.games - left.variant.games;
            })
        : [];
      const itemImpacts = buildItemImpactAggregates(championMatches, baseline, catalog, locale);

      return {
        championName,
        games: championMatches.length,
        baseline,
        buildFamilies,
        comparisons,
        topItems: itemImpacts.filter((item) => item.scoreDelta >= 0).slice(0, 4),
        weakItems: itemImpacts.filter((item) => item.scoreDelta < 0).slice(0, 4),
        headline: championHeadline(championName, comparisons, locale),
        decisionNote: championDecisionNote(baseline, comparisons, locale)
      } satisfies ChampionBuildWorkbench;
    })
    .filter((champion) => champion.games >= 3 && champion.baseline)
    .sort((left, right) => right.games - left.games);

  return {
    ready: true as const,
    champions
  };
}
