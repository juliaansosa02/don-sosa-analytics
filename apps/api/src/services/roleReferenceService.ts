import { buildAggregateSummary, type SummaryLocale } from '@don-sosa/core';
import type { RiotPlatform } from '../lib/riotRouting.js';
import { roleReferenceSeeds, type RoleReferenceSeed } from '../data/roleReferenceSeeds.js';
import { collectPlayerSnapshot } from './collectionService.js';
import { loadProfileSnapshot } from './profileStore.js';

type StoredDataset = Awaited<ReturnType<typeof collectPlayerSnapshot>>;
type RoleKey = RoleReferenceSeed['role'];

export interface RoleReferenceProfile {
  slotId: 'kr_best' | 'euw_best' | 'home_best';
  slotLabel: string;
  requestedPlatform: RiotPlatform;
  sourcePlatform: RiotPlatform;
  fallbackUsed: boolean;
  gameName: string;
  tagLine: string;
  role: RoleKey;
  profileIconId?: number;
  ddragonVersion?: string;
  rankLabel: string;
  highestTier: string;
  leaguePoints: number;
  matches: number;
  recentWinRate: number;
  avgPerformance: number;
  avgKda: number;
  avgKillParticipation: number;
  avgCsAt15: number;
  avgGoldAt15: number;
  avgDeathsPre14: number;
  consistencyIndex: number;
  topChampions: string[];
}

function text(locale: SummaryLocale, es: string, en: string) {
  return locale === 'en' ? en : es;
}

function buildSlotLabel(slotId: RoleReferenceProfile['slotId'], locale: SummaryLocale, fallbackUsed: boolean, sourcePlatform: RiotPlatform) {
  if (slotId === 'kr_best') {
    return locale === 'en' ? 'Best KR reference' : 'Referencia KR';
  }

  if (slotId === 'euw_best') {
    return locale === 'en' ? 'Best EUW reference' : 'Referencia EUW';
  }

  if (fallbackUsed && sourcePlatform === 'KR') {
    return locale === 'en' ? 'KR fallback reference' : 'Referencia KR extra';
  }

  return locale === 'en' ? 'Best home-server reference' : 'Referencia de tu servidor';
}

function rankScore(dataset: StoredDataset) {
  const highest = dataset.rank?.highest;
  if (!highest) return -1;

  const tierOrder = ['UNRANKED', 'IRON', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'EMERALD', 'DIAMOND', 'MASTER', 'GRANDMASTER', 'CHALLENGER'];
  const divisionOrder = ['IV', 'III', 'II', 'I'];
  const tierIndex = tierOrder.indexOf(highest.tier);
  const divisionIndex = divisionOrder.indexOf(highest.division);
  return (tierIndex * 10_000) + ((divisionIndex === -1 ? 5 : divisionOrder.length - divisionIndex) * 1_000) + highest.leaguePoints;
}

async function loadSeedDataset(seed: RoleReferenceSeed, locale: SummaryLocale) {
  const cached = await loadProfileSnapshot<StoredDataset>(seed.gameName, seed.tagLine, seed.platform);
  if (cached) return cached;

  try {
    return await collectPlayerSnapshot({
      gameName: seed.gameName,
      tagLine: seed.tagLine,
      platform: seed.platform,
      count: 30,
      locale
    });
  } catch {
    return null;
  }
}

function buildReferenceProfile(dataset: StoredDataset, seed: RoleReferenceSeed, locale: SummaryLocale, slotId: RoleReferenceProfile['slotId'], requestedPlatform: RiotPlatform, sourcePlatform: RiotPlatform, fallbackUsed: boolean): RoleReferenceProfile | null {
  const localizedSummary = buildAggregateSummary(dataset.player, dataset.tagLine, dataset.summary.region, dataset.summary.platform, dataset.matches, locale);
  if (localizedSummary.primaryRole !== seed.role) return null;

  return {
    slotId,
    slotLabel: buildSlotLabel(slotId, locale, fallbackUsed, sourcePlatform),
    requestedPlatform,
    sourcePlatform,
    fallbackUsed,
    gameName: dataset.player,
    tagLine: dataset.tagLine,
    role: seed.role,
    profileIconId: dataset.profile?.profileIconId,
    ddragonVersion: dataset.ddragonVersion,
    rankLabel: dataset.rank?.highest.label ?? text(locale, 'Sin rango visible', 'No visible rank'),
    highestTier: dataset.rank?.highest.tier ?? 'UNRANKED',
    leaguePoints: dataset.rank?.highest.leaguePoints ?? 0,
    matches: localizedSummary.matches,
    recentWinRate: localizedSummary.coaching.trend.recentWinRate,
    avgPerformance: localizedSummary.avgPerformanceScore,
    avgKda: localizedSummary.avgKda,
    avgKillParticipation: localizedSummary.avgKillParticipation,
    avgCsAt15: localizedSummary.avgCsAt15,
    avgGoldAt15: localizedSummary.avgGoldAt15,
    avgDeathsPre14: localizedSummary.avgDeathsPre14,
    consistencyIndex: localizedSummary.consistencyIndex,
    topChampions: localizedSummary.championPool.slice(0, 3).map((entry) => entry.championName)
  };
}

async function resolveBestReferenceForPlatform(params: {
  role: RoleKey;
  requestedPlatform: RiotPlatform;
  sourcePlatform: RiotPlatform;
  slotId: RoleReferenceProfile['slotId'];
  locale: SummaryLocale;
  excludeKeys: Set<string>;
  fallbackUsed: boolean;
}) {
  const seeds = roleReferenceSeeds[params.sourcePlatform]?.[params.role] ?? [];
  if (!seeds.length) return null;

  const candidates: Array<{ profile: RoleReferenceProfile; score: number }> = [];
  for (const seed of seeds) {
    const dataset = await loadSeedDataset(seed, params.locale);
    if (!dataset) continue;
    const key = `${dataset.summary.platform}:${dataset.player.toLowerCase()}#${dataset.tagLine.toLowerCase()}`;
    if (params.excludeKeys.has(key)) continue;

    const profile = buildReferenceProfile(
      dataset,
      seed,
      params.locale,
      params.slotId,
      params.requestedPlatform,
      params.sourcePlatform,
      params.fallbackUsed
    );

    if (!profile) continue;
    candidates.push({ profile, score: rankScore(dataset) });
  }

  return candidates
    .sort((a, b) =>
      b.score - a.score ||
      b.profile.recentWinRate - a.profile.recentWinRate ||
      b.profile.avgPerformance - a.profile.avgPerformance
    )[0]?.profile ?? null;
}

function buildSlotPlatforms(platform: RiotPlatform) {
  const homePlatform = platform;
  const homePlatformHasSeeds = Boolean(roleReferenceSeeds[homePlatform]);
  const krPlatform: RiotPlatform = 'KR';
  const euwPlatform: RiotPlatform = 'EUW1';

  return [
    { slotId: 'kr_best' as const, requestedPlatform: platform, sourcePlatforms: [krPlatform] },
    { slotId: 'euw_best' as const, requestedPlatform: platform, sourcePlatforms: [euwPlatform] },
    {
      slotId: 'home_best' as const,
      requestedPlatform: platform,
      sourcePlatforms: homePlatformHasSeeds && homePlatform !== 'KR' && homePlatform !== 'EUW1'
        ? [homePlatform, krPlatform]
        : homePlatform === 'KR'
          ? [krPlatform, euwPlatform]
          : homePlatform === 'EUW1'
            ? [euwPlatform, krPlatform]
            : [krPlatform]
    }
  ];
}

export async function getRoleReferenceProfiles(params: {
  role: RoleKey;
  platform: RiotPlatform;
  locale: SummaryLocale;
}) {
  const excludeKeys = new Set<string>();
  const references: RoleReferenceProfile[] = [];

  for (const slot of buildSlotPlatforms(params.platform)) {
    let resolved: RoleReferenceProfile | null = null;

    for (const [index, sourcePlatform] of slot.sourcePlatforms.entries()) {
      resolved = await resolveBestReferenceForPlatform({
        role: params.role,
        requestedPlatform: slot.requestedPlatform,
        sourcePlatform,
        slotId: slot.slotId,
        locale: params.locale,
        excludeKeys,
        fallbackUsed: index > 0 || sourcePlatform !== slot.requestedPlatform
      });

      if (resolved) {
        break;
      }
    }

    if (resolved) {
      references.push(resolved);
      excludeKeys.add(`${resolved.sourcePlatform}:${resolved.gameName.toLowerCase()}#${resolved.tagLine.toLowerCase()}`);
    }
  }

  return {
    role: params.role,
    references
  };
}
