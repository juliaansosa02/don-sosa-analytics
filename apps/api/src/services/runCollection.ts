import { env } from '../config/env.js';
import { collectPlayerSnapshot } from './collectionService.js';

async function main() {
  if (!env.DEFAULT_GAME_NAME || !env.DEFAULT_TAG_LINE) {
    throw new Error('Set DEFAULT_GAME_NAME and DEFAULT_TAG_LINE in .env or call the HTTP endpoint.');
  }

  const dataset = await collectPlayerSnapshot({
    gameName: env.DEFAULT_GAME_NAME,
    tagLine: env.DEFAULT_TAG_LINE,
    count: env.MATCH_COUNT
  });

  console.log(`Collected ${dataset.matches.length} matches for ${dataset.player}#${dataset.tagLine}`);
  console.log(`Average score: ${dataset.summary.avgPerformanceScore}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
