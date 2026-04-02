import { calculateScore, type ItemCatalogEntry, type ParticipantSnapshot, type RuneSelection, type TeamParticipantSummary } from '@don-sosa/core';
import type { RiotMatch, RiotParticipant, RiotTimeline, RuneNode } from '../types/riot.js';
import { analyzeTimeline } from './timelineAnalysis.js';

function buildRuneSelections(selections: { perk: number; var1?: number; var2?: number; var3?: number }[] | undefined, runeIndex: Map<number, RuneNode>): RuneSelection[] {
  return (selections ?? []).map((selection) => {
    const rune = runeIndex.get(selection.perk);
    return {
      perk: selection.perk,
      var1: selection.var1,
      var2: selection.var2,
      var3: selection.var3,
      name: rune?.name,
      icon: rune?.icon,
      longDesc: rune?.longDesc
    };
  });
}

function findLaneOpponent(participant: RiotParticipant, allParticipants: RiotParticipant[]) {
  const sameRoleOpponent = allParticipants.find((candidate) =>
    candidate.puuid !== participant.puuid &&
    candidate.win !== participant.win &&
    candidate.teamPosition &&
    participant.teamPosition &&
    candidate.teamPosition === participant.teamPosition
  );

  if (sameRoleOpponent) return sameRoleOpponent;

  return allParticipants.find((candidate) =>
    candidate.puuid !== participant.puuid &&
    candidate.win !== participant.win &&
    candidate.lane &&
    participant.lane &&
    candidate.lane === participant.lane
  );
}

function mapTeamParticipant(candidate: RiotParticipant): TeamParticipantSummary {
  return {
    championName: candidate.championName,
    role: candidate.teamPosition || candidate.lane,
    items: [candidate.item0, candidate.item1, candidate.item2, candidate.item3, candidate.item4, candidate.item5]
      .filter((itemId): itemId is number => typeof itemId === 'number' && itemId > 0)
  };
}

export function createParticipantSnapshot(
  match: RiotMatch,
  timeline: RiotTimeline,
  participant: RiotParticipant,
  runeIndex: Map<number, RuneNode>,
  itemCatalog: Map<number, ItemCatalogEntry> = new Map()
): ParticipantSnapshot {
  const durationMinutes = Math.max(match.info.gameDuration / 60, 1);
  const cs = participant.totalMinionsKilled + participant.neutralMinionsKilled;
  const primary = participant.perks?.styles?.[0]?.selections ?? [];
  const secondary = participant.perks?.styles?.[1]?.selections ?? [];
  const primaryRunes = buildRuneSelections(primary, runeIndex);
  const secondaryRunes = buildRuneSelections(secondary, runeIndex);
  const laneOpponent = findLaneOpponent(participant, match.info.participants);
  const timelineStats = analyzeTimeline(participant, match.info.participants, timeline, laneOpponent, itemCatalog);
  const allyTeam = match.info.participants
    .filter((candidate) => candidate.win === participant.win && candidate.puuid !== participant.puuid)
    .map(mapTeamParticipant);
  const enemyTeam = match.info.participants
    .filter((candidate) => candidate.win !== participant.win)
    .map(mapTeamParticipant);
  const finalBuild = [participant.item0, participant.item1, participant.item2, participant.item3, participant.item4, participant.item5]
    .filter((itemId): itemId is number => typeof itemId === 'number' && itemId > 0);
  const {
    itemEvents,
    takedownMinutes,
    timelinePoints,
    itemMilestones,
    ...timelineSummary
  } = timelineStats;

  const participantBase = {
    matchId: match.metadata.matchId,
    championName: participant.championName,
    opponentChampionName: laneOpponent?.championName,
    opponentRole: laneOpponent?.teamPosition ?? laneOpponent?.lane,
    isRemake: match.info.gameDuration <= 300,
    role: participant.teamPosition,
    lane: participant.lane,
    queueId: match.info.queueId,
    gameCreation: match.info.gameCreation,
    gameDurationSeconds: match.info.gameDuration,
    win: participant.win,
    kills: participant.kills,
    deaths: participant.deaths,
    assists: participant.assists,
    cs,
    csPerMinute: Number((cs / durationMinutes).toFixed(2)),
    goldEarned: participant.goldEarned,
    goldPerMinute: Number((participant.goldEarned / durationMinutes).toFixed(2)),
    totalDamageDealt: participant.totalDamageDealt ?? 0,
    damageToChampions: participant.totalDamageDealtToChampions,
    damageTaken: participant.totalDamageTaken,
    visionScore: participant.visionScore,
    killParticipation: Number((participant.challenges?.killParticipation ?? 0) * 100),
    doubleKills: participant.doubleKills ?? 0,
    tripleKills: participant.tripleKills ?? 0,
    quadraKills: participant.quadraKills ?? 0,
    pentaKills: participant.pentaKills ?? 0,
    soloKills: participant.challenges?.soloKills ?? 0,
    turretKills: participant.turretKills ?? 0,
    dragonKills: participant.dragonKills ?? 0,
    baronKills: participant.baronKills ?? 0,
    firstBloodKill: participant.firstBloodKill ?? false,
    firstTowerKill: participant.firstTowerKill ?? false,
    item0: participant.item0,
    item1: participant.item1,
    item2: participant.item2,
    item3: participant.item3,
    item4: participant.item4,
    item5: participant.item5,
    item6: participant.item6,
    primaryRunes,
    secondaryRunes,
    statRunes: Object.values(participant.perks?.statPerks ?? {}).map((value) => Number(value)),
    items: {
      finalBuild,
      purchaseEvents: itemEvents,
      takedownMinutes,
      timelinePoints,
      milestones: itemMilestones,
      allyTeam,
      enemyTeam
    },
    runeStats: {
      totalDamageFromRunes: primary.reduce((sum, rune) => sum + Math.max(rune.var1 ?? 0, 0), 0) + secondary.reduce((sum, rune) => sum + Math.max(rune.var1 ?? 0, 0), 0),
      totalHealingFromRunes: primary.reduce((sum, rune) => sum + Math.max(rune.var2 ?? 0, 0), 0) + secondary.reduce((sum, rune) => sum + Math.max(rune.var2 ?? 0, 0), 0),
      totalShieldingFromRunes: primary.reduce((sum, rune) => sum + Math.max(rune.var3 ?? 0, 0), 0) + secondary.reduce((sum, rune) => sum + Math.max(rune.var3 ?? 0, 0), 0),
      keystoneValue: Math.max(primary[0]?.var1 ?? 0, 0)
    },
    timeline: timelineSummary
  };

  return {
    ...participantBase,
    score: calculateScore(participantBase)
  };
}
