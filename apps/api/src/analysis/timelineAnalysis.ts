import type { ItemCatalogEntry, ItemMilestoneSummary, ItemTransaction, TimelineCheckpoint } from '@don-sosa/core';
import type { RiotParticipant, RiotTimeline, RiotTimelineEvent } from '../types/riot.js';

function findParticipantIndex(matchParticipant: RiotParticipant, allParticipants: RiotParticipant[]) {
  return allParticipants.findIndex((participant) => participant.puuid === matchParticipant.puuid) + 1;
}

function mapTimelinePoints(timeline: RiotTimeline, participantId: number): TimelineCheckpoint[] {
  return timeline.info.frames.map((frame) => {
    const participantFrame = frame.participantFrames[String(participantId)] ?? {};
    return {
      minute: Number((frame.timestamp / 60000).toFixed(1)),
      cs: (participantFrame.minionsKilled ?? 0) + (participantFrame.jungleMinionsKilled ?? 0),
      totalGold: participantFrame.totalGold ?? 0,
      level: participantFrame.level ?? 0
    };
  });
}

function toItemTransaction(event: RiotTimelineEvent): ItemTransaction | null {
  switch (event.type) {
    case 'ITEM_PURCHASED':
      return {
        type: 'purchase',
        timestamp: event.timestamp,
        minute: Number((event.timestamp / 60000).toFixed(1)),
        itemId: event.itemId
      };
    case 'ITEM_SOLD':
      return {
        type: 'sale',
        timestamp: event.timestamp,
        minute: Number((event.timestamp / 60000).toFixed(1)),
        itemId: event.itemId
      };
    case 'ITEM_DESTROYED':
      return {
        type: 'destroy',
        timestamp: event.timestamp,
        minute: Number((event.timestamp / 60000).toFixed(1)),
        itemId: event.itemId
      };
    case 'ITEM_UNDO':
      return {
        type: 'undo',
        timestamp: event.timestamp,
        minute: Number((event.timestamp / 60000).toFixed(1)),
        beforeId: event.beforeId,
        afterId: event.afterId
      };
    default:
      return null;
  }
}

function removeOne(inventory: number[], itemId?: number) {
  if (!itemId) return;
  const index = inventory.lastIndexOf(itemId);
  if (index >= 0) {
    inventory.splice(index, 1);
  }
}

function isBootsItem(itemId: number, itemCatalog: Map<number, ItemCatalogEntry>) {
  return itemCatalog.get(itemId)?.tags.includes('Boots') ?? false;
}

function isMajorCompletedItem(itemId: number, itemCatalog: Map<number, ItemCatalogEntry>) {
  const item = itemCatalog.get(itemId);
  if (!item) return false;
  if (item.tags.includes('Boots') || item.tags.includes('Consumable') || item.tags.includes('Trinket')) return false;
  return item.goldTotal >= 2200 && item.into.length === 0;
}

function buildItemMilestones(events: ItemTransaction[], itemCatalog: Map<number, ItemCatalogEntry>): ItemMilestoneSummary {
  const inventory: number[] = [];
  const majorItemOrder: number[] = [];
  const milestones: ItemMilestoneSummary = {
    majorItemOrder
  };

  for (const event of events) {
    if (event.type === 'purchase' && event.itemId) {
      inventory.push(event.itemId);
    }

    if ((event.type === 'sale' || event.type === 'destroy') && event.itemId) {
      removeOne(inventory, event.itemId);
    }

    if (event.type === 'undo') {
      if (event.beforeId) removeOne(inventory, event.beforeId);
      if (event.afterId) inventory.push(event.afterId);
    }

    if (!milestones.bootsMinute) {
      const currentBoots = inventory.find((itemId) => isBootsItem(itemId, itemCatalog));
      if (currentBoots) {
        milestones.bootsId = currentBoots;
        milestones.bootsMinute = event.minute;
      }
    }

    if (event.type === 'purchase' && event.itemId && isMajorCompletedItem(event.itemId, itemCatalog)) {
      majorItemOrder.push(event.itemId);
      if (!milestones.firstCompletedItemId) {
        milestones.firstCompletedItemId = event.itemId;
        milestones.firstCompletedItemMinute = event.minute;
      } else if (!milestones.secondCompletedItemId) {
        milestones.secondCompletedItemId = event.itemId;
        milestones.secondCompletedItemMinute = event.minute;
      }
    }
  }

  return milestones;
}

function isTakedown(event: RiotTimelineEvent, participantId: number) {
  return event.type === 'CHAMPION_KILL' && (
    event.killerId === participantId
    || event.assistingParticipantIds?.includes(participantId)
  );
}

function buildPurchaseWindows(events: ItemTransaction[], cutoffMinute = 14) {
  const windows: number[] = [];
  let lastPurchaseMinute: number | null = null;

  for (const event of events) {
    if (event.type !== 'purchase') continue;
    if (event.minute <= 2 || event.minute > cutoffMinute) continue;

    if (lastPurchaseMinute === null || event.minute - lastPurchaseMinute >= 0.75) {
      windows.push(event.minute);
    }

    lastPurchaseMinute = event.minute;
  }

  return windows;
}

function countDeathClusters(deathTimestamps: number[]) {
  if (deathTimestamps.length <= 1) return 0;

  let clusters = 0;
  for (let index = 1; index < deathTimestamps.length; index += 1) {
    if (deathTimestamps[index] - deathTimestamps[index - 1] <= 3 * 60 * 1000) {
      clusters += 1;
    }
  }

  return clusters;
}

function countEventsNearObjective(params: {
  eventTimestamps: number[];
  objectiveTimestamps: number[];
  beforeMs: number;
  afterMs: number;
}) {
  const { eventTimestamps, objectiveTimestamps, beforeMs, afterMs } = params;
  if (!eventTimestamps.length || !objectiveTimestamps.length) return 0;

  return eventTimestamps.filter((timestamp) =>
    objectiveTimestamps.some((objectiveTimestamp) =>
      timestamp >= objectiveTimestamp - beforeMs && timestamp <= objectiveTimestamp + afterMs
    )
  ).length;
}

export function analyzeTimeline(
  participant: RiotParticipant,
  allParticipants: RiotParticipant[],
  timeline: RiotTimeline,
  laneOpponent?: RiotParticipant,
  itemCatalog: Map<number, ItemCatalogEntry> = new Map()
) {
  const participantId = findParticipantIndex(participant, allParticipants);
  const opponentId = laneOpponent ? findParticipantIndex(laneOpponent, allParticipants) : 0;
  const frameAt10 = timeline.info.frames.find((frame) => frame.timestamp >= 10 * 60 * 1000) ?? timeline.info.frames.at(-1);
  const frameAt15 = timeline.info.frames.find((frame) => frame.timestamp >= 15 * 60 * 1000) ?? timeline.info.frames.at(-1);
  const frame10 = frameAt10?.participantFrames[String(participantId)] ?? {};
  const frame15 = frameAt15?.participantFrames[String(participantId)] ?? {};
  const opponentFrame15 = opponentId ? frameAt15?.participantFrames[String(opponentId)] ?? {} : {};
  const timelinePoints = mapTimelinePoints(timeline, participantId);

  let laneDeathsPre10 = 0;
  let deathsPre14 = 0;
  let objectiveFightDeaths = 0;
  let firstMoveMinute: number | null = null;
  let firstDeathMinute: number | null = null;

  const itemEvents: ItemTransaction[] = [];
  const takedownMinutes: number[] = [];
  const takedownTimestamps: number[] = [];
  const deathTimestampsPre14: number[] = [];
  const objectiveTimestamps: number[] = [];

  for (const frame of timeline.info.frames) {
    for (const event of frame.events) {
      if (event.type === 'ELITE_MONSTER_KILL') {
        objectiveTimestamps.push(event.timestamp);
      }

      if (event.participantId === participantId) {
        const transaction = toItemTransaction(event);
        if (transaction) {
          itemEvents.push(transaction);
        }
      }

      if (event.type === 'CHAMPION_KILL' && event.victimId === participantId) {
        if (firstDeathMinute === null) {
          firstDeathMinute = Number((event.timestamp / 60000).toFixed(1));
        }
        if (event.timestamp <= 10 * 60 * 1000) laneDeathsPre10 += 1;
        if (event.timestamp <= 14 * 60 * 1000) {
          deathsPre14 += 1;
          deathTimestampsPre14.push(event.timestamp);
        }

        const nearObjectiveWindow = frame.events.some((candidate) => {
          const types = new Set(['ELITE_MONSTER_KILL', 'BUILDING_KILL']);
          return types.has(candidate.type) && Math.abs(candidate.timestamp - event.timestamp) <= 70 * 1000;
        });
        if (nearObjectiveWindow) objectiveFightDeaths += 1;
      }

      if (isTakedown(event, participantId)) {
        const minute = Number((event.timestamp / 60000).toFixed(1));
        takedownMinutes.push(minute);
        takedownTimestamps.push(event.timestamp);
        if (firstMoveMinute === null) {
          firstMoveMinute = minute;
        }
      }
    }
  }

  const csAt10 = (frame10.minionsKilled ?? 0) + (frame10.jungleMinionsKilled ?? 0);
  const csAt15 = (frame15.minionsKilled ?? 0) + (frame15.jungleMinionsKilled ?? 0);
  const itemMilestones = buildItemMilestones(itemEvents, itemCatalog);
  const purchaseWindows = buildPurchaseWindows(itemEvents);
  const basesPre14 = purchaseWindows.length;
  const firstBaseMinute = purchaseWindows[0] ?? null;
  const deathsAfterFirstDeathPre14 = Math.max(0, deathTimestampsPre14.length - (deathTimestampsPre14.length ? 1 : 0));
  const deathClusterCountPre14 = countDeathClusters(deathTimestampsPre14);
  const objectiveSetupDeaths = countEventsNearObjective({
    eventTimestamps: deathTimestampsPre14,
    objectiveTimestamps,
    beforeMs: 100 * 1000,
    afterMs: 35 * 1000
  });
  const objectiveSetupTakedowns = countEventsNearObjective({
    eventTimestamps: takedownTimestamps,
    objectiveTimestamps,
    beforeMs: 90 * 1000,
    afterMs: 45 * 1000
  });
  const timelineDurationMinutes = (timeline.info.frames.at(-1)?.timestamp ?? 0) / 60000;
  const lateFirstBasePenalty = firstBaseMinute !== null && firstBaseMinute > 7.5
    ? Math.min(1.8, (firstBaseMinute - 7.5) * 0.45)
    : 0;
  const lowBaseCountPenalty = basesPre14 <= 1 ? 0.9 : basesPre14 === 2 ? 0.35 : 0;
  const delayedFirstItemPenalty = itemMilestones.firstCompletedItemMinute
    ? itemMilestones.firstCompletedItemMinute > 13.5
      ? Math.min(1.6, (itemMilestones.firstCompletedItemMinute - 13.5) * 0.35)
      : 0
    : timelineDurationMinutes >= 15
      ? 0.7
      : 0;
  const laneVolatilityScore = Number((
    (laneDeathsPre10 * 1.25) +
    (deathsAfterFirstDeathPre14 * 0.85) +
    (deathClusterCountPre14 * 0.9) +
    (firstDeathMinute !== null && firstDeathMinute <= 8 ? 0.7 : 0)
  ).toFixed(2));
  const resetTimingScore = Number((lateFirstBasePenalty + lowBaseCountPenalty + delayedFirstItemPenalty).toFixed(2));
  const objectiveSetupScore = Number(Math.max(
    0,
    (objectiveSetupDeaths * 1.2) +
    (objectiveFightDeaths * 0.8) -
    (objectiveSetupTakedowns * 0.35)
  ).toFixed(2));

  return {
    csAt10,
    csAt15,
    goldAt10: frame10.totalGold ?? 0,
    goldAt15: frame15.totalGold ?? 0,
    goldDiffAt15: (frame15.totalGold ?? 0) - (opponentFrame15.totalGold ?? 0),
    xpAt10: frame10.xp ?? 0,
    xpAt15: frame15.xp ?? 0,
    levelAt15: frame15.level ?? 0,
    levelDiffAt15: (frame15.level ?? 0) - (opponentFrame15.level ?? 0),
    laneDeathsPre10,
    deathsPre14,
    firstMoveMinute,
    firstDeathMinute,
    deathsAfterFirstDeathPre14,
    deathClusterCountPre14,
    takedownsPre14: takedownMinutes.filter((minute) => minute <= 14).length,
    firstBaseMinute,
    basesPre14,
    objectiveSetupDeaths,
    objectiveSetupTakedowns,
    laneVolatilityScore,
    resetTimingScore,
    objectiveSetupScore,
    objectiveFightDeaths,
    timelinePoints,
    itemEvents,
    takedownMinutes,
    itemMilestones
  };
}
