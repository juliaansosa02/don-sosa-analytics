import { stringify } from 'csv-stringify/sync';
import { buildAggregateSummary, type ParticipantSnapshot } from '@don-sosa/core';
import { ensureWrite } from '../utils/fs.js';

export async function exportSnapshot(outputDir: string, player: string, tagLine: string, region: string, platform: string, matches: ParticipantSnapshot[]) {
  const summary = buildAggregateSummary(player, tagLine, region, platform, matches);
  const dataset = { player, tagLine, region, platform, generatedAt: new Date().toISOString(), matches, summary };

  await ensureWrite(`${outputDir}/data.json`, JSON.stringify(dataset, null, 2));
  await ensureWrite(`${outputDir}/summary.json`, JSON.stringify(summary, null, 2));

  const csv = stringify(matches.map((match) => ({
    matchId: match.matchId,
    date: new Date(match.gameCreation).toISOString(),
    champion: match.championName,
    result: match.win ? 'WIN' : 'LOSS',
    kills: match.kills,
    deaths: match.deaths,
    assists: match.assists,
    csPerMinute: match.csPerMinute,
    goldPerMinute: match.goldPerMinute,
    csAt10: match.timeline.csAt10,
    goldAt15: match.timeline.goldAt15,
    deathsPre14: match.timeline.deathsPre14,
    runeDamage: match.runeStats.totalDamageFromRunes,
    runeHealing: match.runeStats.totalHealingFromRunes,
    performanceScore: match.score.total
  })), { header: true });

  await ensureWrite(`${outputDir}/matches.csv`, csv);
  return dataset;
}
