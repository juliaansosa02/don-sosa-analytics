import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import type { ParticipantSnapshot } from '@don-sosa/core';
import { ensureWrite } from '../utils/fs.js';

export interface BenchmarkAggregateRecord {
  tier: string;
  role: string;
  queueBucket: 'RANKED_SOLO' | 'RANKED_FLEX' | 'OTHER';
  championName: string | null;
  sampleSize: number;
  avgCsAt15: number;
  avgLevelAt15: number;
  avgGoldAt15: number;
  avgDeathsPre14: number;
}

interface BenchmarkStoreFile {
  version: 1;
  updatedAt: string;
  processedEntries: Record<string, true>;
  aggregates: Record<string, {
    tier: string;
    role: string;
    queueBucket: 'RANKED_SOLO' | 'RANKED_FLEX' | 'OTHER';
    championName: string | null;
    sampleSize: number;
    sumCsAt15: number;
    sumLevelAt15: number;
    sumGoldAt15: number;
    sumDeathsPre14: number;
  }>;
}

export interface BenchmarkCatalog {
  source: 'internal';
  note: string;
  totalTrackedEntries: number;
  roleBenchmarks: BenchmarkAggregateRecord[];
  championBenchmarks: BenchmarkAggregateRecord[];
}

interface RankShape {
  highest: { tier: string };
  soloQueue: { tier: string };
  flexQueue: { tier: string };
}

const benchmarkStorePath = fileURLToPath(new URL('../../data/benchmarks.json', import.meta.url));
const tierOrder = ['IRON', 'BRONZE', 'SILVER', 'GOLD', 'PLATINUM', 'EMERALD', 'DIAMOND', 'MASTER', 'GRANDMASTER', 'CHALLENGER'] as const;

function normalizeTier(tier?: string) {
  if (!tier || tier === 'UNRANKED') return null;
  return tier;
}

function getNextTier(tier?: string) {
  const normalizedTier = normalizeTier(tier);
  if (!normalizedTier) return null;
  const index = tierOrder.indexOf(normalizedTier as (typeof tierOrder)[number]);
  if (index === -1 || index === tierOrder.length - 1) return null;
  return tierOrder[index + 1];
}

function queueBucketFromQueueId(queueId: number): 'RANKED_SOLO' | 'RANKED_FLEX' | 'OTHER' {
  if (queueId === 420) return 'RANKED_SOLO';
  if (queueId === 440) return 'RANKED_FLEX';
  return 'OTHER';
}

function tierForMatch(queueBucket: 'RANKED_SOLO' | 'RANKED_FLEX' | 'OTHER', rank: RankShape) {
  if (queueBucket === 'RANKED_SOLO') return rank.soloQueue.tier;
  if (queueBucket === 'RANKED_FLEX') return rank.flexQueue.tier;
  return rank.highest.tier;
}

async function readStore() {
  try {
    const raw = await readFile(benchmarkStorePath, 'utf8');
    return JSON.parse(raw) as BenchmarkStoreFile;
  } catch {
    return {
      version: 1,
      updatedAt: new Date().toISOString(),
      processedEntries: {},
      aggregates: {}
    } satisfies BenchmarkStoreFile;
  }
}

function pushAggregate(
  store: BenchmarkStoreFile,
  snapshot: ParticipantSnapshot,
  tier: string,
  queueBucket: 'RANKED_SOLO' | 'RANKED_FLEX' | 'OTHER',
  championName: string | null
) {
  const role = snapshot.role || 'UNKNOWN';
  const entryKey = [snapshot.matchId, tier, role, queueBucket, championName ?? 'ALL'].join(':');
  if (store.processedEntries[entryKey]) return;

  const aggregateKey = [tier, role, queueBucket, championName ?? 'ALL'].join(':');
  const current = store.aggregates[aggregateKey] ?? {
    tier,
    role,
    queueBucket,
    championName,
    sampleSize: 0,
    sumCsAt15: 0,
    sumLevelAt15: 0,
    sumGoldAt15: 0,
    sumDeathsPre14: 0
  };

  current.sampleSize += 1;
  current.sumCsAt15 += snapshot.timeline.csAt15;
  current.sumLevelAt15 += snapshot.timeline.levelAt15 ?? 0;
  current.sumGoldAt15 += snapshot.timeline.goldAt15;
  current.sumDeathsPre14 += snapshot.timeline.deathsPre14;

  store.processedEntries[entryKey] = true;
  store.aggregates[aggregateKey] = current;
}

function mapAggregate(record: BenchmarkStoreFile['aggregates'][string]): BenchmarkAggregateRecord {
  return {
    tier: record.tier,
    role: record.role,
    queueBucket: record.queueBucket,
    championName: record.championName,
    sampleSize: record.sampleSize,
    avgCsAt15: Number((record.sumCsAt15 / Math.max(record.sampleSize, 1)).toFixed(1)),
    avgLevelAt15: Number((record.sumLevelAt15 / Math.max(record.sampleSize, 1)).toFixed(1)),
    avgGoldAt15: Number((record.sumGoldAt15 / Math.max(record.sampleSize, 1)).toFixed(0)),
    avgDeathsPre14: Number((record.sumDeathsPre14 / Math.max(record.sampleSize, 1)).toFixed(1))
  };
}

export async function updateBenchmarkStore(matches: ParticipantSnapshot[], rank: RankShape) {
  if (!matches.length) return null;
  const store = await readStore();

  for (const snapshot of matches) {
    const queueBucket = queueBucketFromQueueId(snapshot.queueId);
    const tier = tierForMatch(queueBucket, rank);
    if (!tier || tier === 'UNRANKED') continue;

    pushAggregate(store, snapshot, tier, queueBucket, null);
    pushAggregate(store, snapshot, tier, queueBucket, snapshot.championName);
  }

  store.updatedAt = new Date().toISOString();
  await ensureWrite(benchmarkStorePath, JSON.stringify(store, null, 2));
  return store;
}

export async function buildBenchmarkCatalog(rank: RankShape, championNames: string[]) {
  const store = await readStore();
  const relevantTiers = new Set<string>();
  for (const tier of [rank.highest.tier, rank.soloQueue.tier, rank.flexQueue.tier]) {
    const normalizedTier = normalizeTier(tier);
    if (!normalizedTier) continue;
    relevantTiers.add(normalizedTier);
    const nextTier = getNextTier(normalizedTier);
    if (nextTier) relevantTiers.add(nextTier);
  }

  const roleBenchmarks = Object.values(store.aggregates)
    .filter((aggregate) => aggregate.championName === null && relevantTiers.has(aggregate.tier))
    .map(mapAggregate);
  const championBenchmarks = Object.values(store.aggregates)
    .filter((aggregate) => aggregate.championName && championNames.includes(aggregate.championName) && relevantTiers.has(aggregate.tier))
    .map(mapAggregate);

  return {
    source: 'internal',
    note: 'Base propia en construcción. Solo se muestra como referencia cuando ya hay muestra acumulada suficiente.',
    totalTrackedEntries: Object.keys(store.processedEntries).length,
    roleBenchmarks,
    championBenchmarks
  } satisfies BenchmarkCatalog;
}
