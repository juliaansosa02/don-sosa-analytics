import { fileURLToPath } from 'node:url';
import { buildAggregateSummary, type ParticipantSnapshot, type SummaryLocale } from '@don-sosa/core';
import { env } from '../config/env.js';
import { createParticipantSnapshot } from '../analysis/participantFactory.js';
import { buildRuneIndex, getLatestDDragonVersion } from './dataDragon.js';
import { buildBenchmarkCatalog, updateBenchmarkStore } from './benchmarkStore.js';
import { exportSnapshot } from './exporter.js';
import { loadProfileSnapshot, saveProfileSnapshot } from './profileStore.js';
import { normalizeRiotPlatform, resolveRiotPlatform } from '../lib/riotRouting.js';
import { createRiotClient } from './riotClient.js';

export interface CollectionParams {
  gameName: string;
  tagLine: string;
  platform?: string;
  count?: number;
  locale?: SummaryLocale;
  knownMatchIds?: string[];
  outputDir?: string;
  onProgress?: (progress: { stage: string; current: number; total: number; message: string }) => void;
}

type StoredCollectionDataset = Awaited<ReturnType<typeof collectPlayerSnapshot>>;

function queueLabel(queueType?: string) {
  if (queueType === 'RANKED_SOLO_5x5') return 'Solo/Duo';
  if (queueType === 'RANKED_FLEX_SR') return 'Flex';
  return 'Ranked';
}

function mapRankTier(entry?: { queueType: string; tier: string; rank: string; leaguePoints: number; wins: number; losses: number }) {
  if (!entry) return null;
  return {
    label: `${entry.tier} ${entry.rank}`,
    queueLabel: queueLabel(entry.queueType),
    tier: entry.tier,
    division: entry.rank,
    leaguePoints: entry.leaguePoints,
    wins: entry.wins,
    losses: entry.losses,
    winRate: Number(((entry.wins / Math.max(entry.wins + entry.losses, 1)) * 100).toFixed(1))
  };
}

function rankWeight(entry: { tier: string; division: string; leaguePoints: number } | null) {
  if (!entry) return -1;

  const tierOrder = ['IRON', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'EMERALD', 'DIAMOND', 'MASTER', 'GRANDMASTER', 'CHALLENGER'];
  const divisionOrder = ['IV', 'III', 'II', 'I'];
  const tierIndex = tierOrder.indexOf(entry.tier);
  const divisionIndex = divisionOrder.indexOf(entry.division);
  return tierIndex * 1000 + (divisionIndex === -1 ? 500 : (divisionOrder.length - divisionIndex) * 100) + entry.leaguePoints;
}

function mapRankBundle(entries: Array<{ queueType: string; tier: string; rank: string; leaguePoints: number; wins: number; losses: number }>) {
  const soloQueue = mapRankTier(entries.find((entry) => entry.queueType === 'RANKED_SOLO_5x5'));
  const flexQueue = mapRankTier(entries.find((entry) => entry.queueType === 'RANKED_FLEX_SR'));
  const highest = rankWeight(soloQueue ? { tier: soloQueue.tier, division: soloQueue.division, leaguePoints: soloQueue.leaguePoints } : null) >= rankWeight(flexQueue ? { tier: flexQueue.tier, division: flexQueue.division, leaguePoints: flexQueue.leaguePoints } : null)
    ? soloQueue
    : flexQueue;

  return {
    highest: highest ?? { label: 'Unranked', queueLabel: 'Ranked', tier: 'UNRANKED', division: '', leaguePoints: 0, wins: 0, losses: 0, winRate: 0 },
    soloQueue: soloQueue ?? { label: 'Unranked', queueLabel: 'Solo/Duo', tier: 'UNRANKED', division: '', leaguePoints: 0, wins: 0, losses: 0, winRate: 0 },
    flexQueue: flexQueue ?? { label: 'Unranked', queueLabel: 'Flex', tier: 'UNRANKED', division: '', leaguePoints: 0, wins: 0, losses: 0, winRate: 0 }
  };
}

function mapProfile(summoner?: { profileIconId?: number; summonerLevel?: number }) {
  if (!summoner) return null;
  return {
    profileIconId: summoner.profileIconId ?? 29,
    summonerLevel: summoner.summonerLevel ?? 0
  };
}

const defaultOutputDir = fileURLToPath(new URL('../../data/output', import.meta.url));

export async function collectPlayerSnapshot({
  gameName,
  tagLine,
  platform,
  count = env.MATCH_COUNT,
  locale = 'es',
  knownMatchIds = [],
  outputDir = defaultOutputDir,
  onProgress
}: CollectionParams) {
  onProgress?.({ stage: 'setup', current: 0, total: 1, message: locale === 'en' ? 'Preparing analysis' : 'Preparando análisis' });
  const normalizedPlatform = normalizeRiotPlatform(platform || env.RIOT_PLATFORM);
  const routing = resolveRiotPlatform(normalizedPlatform);
  if (!routing) {
    throw new Error(locale === 'en'
      ? `Unsupported Riot platform "${platform}".`
      : `La platform de Riot "${platform}" no está soportada.`);
  }

  const riotClient = createRiotClient(routing);
  const existingDataset = await loadProfileSnapshot<StoredCollectionDataset>(gameName, tagLine, routing.platform);
  const [runeIndex, ddragonVersion] = await Promise.all([
    buildRuneIndex(),
    getLatestDDragonVersion()
  ]);
  const account = await riotClient.getAccountByRiotId(gameName, tagLine);
  const summoner = await riotClient.getSummonerByPuuid(account.puuid);
  const leagueEntries = await riotClient.getLeagueEntriesByPuuid(account.puuid);
  const rank = mapRankBundle(leagueEntries);
  const mergedKnownMatchIds = Array.from(new Set([
    ...knownMatchIds,
    ...(existingDataset?.matches.map((match) => match.matchId) ?? [])
  ]));
  const knownIds = new Set(mergedKnownMatchIds);
  const matchIds: string[] = [];

  if (knownIds.size) {
    let start = 0;
    let foundKnownBoundary = false;

    while (matchIds.length < count && !foundKnownBoundary) {
      const batch = await riotClient.getMatchIdsByPuuid(account.puuid, Math.min(20, count), start);
      if (!batch.length) break;

      for (const matchId of batch) {
        if (knownIds.has(matchId)) {
          foundKnownBoundary = true;
          break;
        }

        matchIds.push(matchId);
        if (matchIds.length >= count) break;
      }

      if (batch.length < Math.min(20, count)) break;
      start += batch.length;
    }
  } else {
    matchIds.push(...await riotClient.getMatchIdsByPuuid(account.puuid, count));
  }

  onProgress?.({ stage: 'fetching', current: 0, total: matchIds.length, message: locale === 'en' ? 'Downloading matches' : 'Descargando partidas' });

  const snapshots: ParticipantSnapshot[] = [];

  for (const [index, matchId] of matchIds.entries()) {
    onProgress?.({ stage: 'fetching', current: index + 1, total: matchIds.length, message: locale === 'en' ? `Downloading match ${index + 1} of ${matchIds.length}` : `Descargando partida ${index + 1} de ${matchIds.length}` });
    const [match, timeline] = await Promise.all([
      riotClient.getMatch(matchId),
      riotClient.getTimeline(matchId)
    ]);

    const participant = match.info.participants.find((entry) => entry.puuid === account.puuid);
    if (!participant) continue;

    snapshots.push(createParticipantSnapshot(match, timeline, participant, runeIndex));
  }

  const mergedSnapshotsMap = new Map<string, ParticipantSnapshot>();
  for (const snapshot of existingDataset?.matches ?? []) {
    mergedSnapshotsMap.set(snapshot.matchId, snapshot);
  }
  for (const snapshot of snapshots) {
    mergedSnapshotsMap.set(snapshot.matchId, snapshot);
  }

  const mergedSnapshots = Array.from(mergedSnapshotsMap.values()).sort((a, b) => b.gameCreation - a.gameCreation);
  const cappedSnapshots = mergedSnapshots.slice(0, Math.max(count, existingDataset?.matches.length ?? 0));
  const eligibleSnapshots = cappedSnapshots.filter((snapshot) => !snapshot.isRemake);
  const remakesExcluded = cappedSnapshots.length - eligibleSnapshots.length;
  onProgress?.({ stage: 'processing', current: eligibleSnapshots.length, total: eligibleSnapshots.length || 1, message: locale === 'en' ? 'Processing insights and building summary' : 'Procesando insights y resumiendo datos' });
  await updateBenchmarkStore(eligibleSnapshots, rank);
  const benchmarks = await buildBenchmarkCatalog(rank, Array.from(new Set(eligibleSnapshots.map((snapshot) => snapshot.championName))));

  const exported = await exportSnapshot(
    outputDir,
    account.gameName,
    account.tagLine,
    routing.regionalRoute,
    routing.platform,
    eligibleSnapshots
  );

  const result = {
    ...exported,
    ddragonVersion,
    rawMatchesFetched: snapshots.length,
    remakesExcluded,
    profile: mapProfile(summoner),
    rank,
    benchmarks,
    summary: buildAggregateSummary(
      account.gameName,
      account.tagLine,
      routing.regionalRoute,
      routing.platform,
      eligibleSnapshots,
      locale
    )
  };

  await saveProfileSnapshot(result);
  return result;
}
