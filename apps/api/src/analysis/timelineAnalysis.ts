import type { RiotParticipant, RiotTimeline } from '../types/riot.js';

function findParticipantIndex(matchParticipant: RiotParticipant, allParticipants: RiotParticipant[]) {
  return allParticipants.findIndex((participant) => participant.puuid === matchParticipant.puuid) + 1;
}

export function analyzeTimeline(
  participant: RiotParticipant,
  allParticipants: RiotParticipant[],
  timeline: RiotTimeline,
  laneOpponent?: RiotParticipant
) {
  const participantId = findParticipantIndex(participant, allParticipants);
  const opponentId = laneOpponent ? findParticipantIndex(laneOpponent, allParticipants) : 0;
  const frameAt10 = timeline.info.frames.find((frame) => frame.timestamp >= 10 * 60 * 1000) ?? timeline.info.frames.at(-1);
  const frameAt15 = timeline.info.frames.find((frame) => frame.timestamp >= 15 * 60 * 1000) ?? timeline.info.frames.at(-1);
  const frame10 = frameAt10?.participantFrames[String(participantId)] ?? {};
  const frame15 = frameAt15?.participantFrames[String(participantId)] ?? {};
  const opponentFrame15 = opponentId ? frameAt15?.participantFrames[String(opponentId)] ?? {} : {};

  let laneDeathsPre10 = 0;
  let deathsPre14 = 0;
  let objectiveFightDeaths = 0;
  let firstMoveMinute: number | null = null;

  for (const frame of timeline.info.frames) {
    for (const event of frame.events) {
      if (event.type === 'CHAMPION_KILL' && event.victimId === participantId) {
        if (event.timestamp <= 10 * 60 * 1000) laneDeathsPre10 += 1;
        if (event.timestamp <= 14 * 60 * 1000) deathsPre14 += 1;

        const nearObjectiveWindow = frame.events.some((candidate) => {
          const types = new Set(['ELITE_MONSTER_KILL', 'BUILDING_KILL']);
          return types.has(candidate.type) && Math.abs(candidate.timestamp - event.timestamp) <= 70 * 1000;
        });
        if (nearObjectiveWindow) objectiveFightDeaths += 1;
      }

      if (firstMoveMinute === null && event.type === 'CHAMPION_KILL' && (event.killerId === participantId || event.assistingParticipantIds?.includes(participantId))) {
        firstMoveMinute = Number((event.timestamp / 60000).toFixed(1));
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
    objectiveFightDeaths
  };
}
