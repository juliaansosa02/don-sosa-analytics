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

  const itemEvents: ItemTransaction[] = [];
  const takedownMinutes: number[] = [];

  for (const frame of timeline.info.frames) {
    for (const event of frame.events) {
      if (event.participantId === participantId) {
        const transaction = toItemTransaction(event);
        if (transaction) {
          itemEvents.push(transaction);
        }
      }

      if (event.type === 'CHAMPION_KILL' && event.victimId === participantId) {
        if (event.timestamp <= 10 * 60 * 1000) laneDeathsPre10 += 1;
        if (event.timestamp <= 14 * 60 * 1000) deathsPre14 += 1;

        const nearObjectiveWindow = frame.events.some((candidate) => {
          const types = new Set(['ELITE_MONSTER_KILL', 'BUILDING_KILL']);
          return types.has(candidate.type) && Math.abs(candidate.timestamp - event.timestamp) <= 70 * 1000;
        });
        if (nearObjectiveWindow) objectiveFightDeaths += 1;
      }

      if (isTakedown(event, participantId)) {
        const minute = Number((event.timestamp / 60000).toFixed(1));
        takedownMinutes.push(minute);
        if (firstMoveMinute === null) {
          firstMoveMinute = minute;
        }
      }
    }
  }

  const csAt10 = (frame10.minionsKilled ?? 0) + (frame10.jungleMinionsKilled ?? 0);
  const csAt15 = (frame15.minionsKilled ?? 0) + (frame15.jungleMinionsKilled ?? 0);

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
    objectiveFightDeaths,
    timelinePoints,
    itemEvents,
    takedownMinutes,
    itemMilestones: buildItemMilestones(itemEvents, itemCatalog)
  };
}
