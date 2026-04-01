import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import type { AICoachContext, KnowledgeCard } from './aiCoachSchemas.js';
import { knowledgeCardSchema } from './aiCoachSchemas.js';

const knowledgeCardsDir = fileURLToPath(new URL('../../data/coach-kb/cards', import.meta.url));

async function walkJsonFiles(dir: string): Promise<string[]> {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = await Promise.all(entries.map(async (entry) => {
    const fullPath = `${dir}/${entry.name}`;
    if (entry.isDirectory()) return walkJsonFiles(fullPath);
    return entry.name.endsWith('.json') ? [fullPath] : [];
  }));

  return files.flat();
}

function inferPreferredPhase(context: AICoachContext) {
  const categories = new Set(context.coaching.topProblems.map((problem) => problem.category));
  if (categories.has('early') || context.performance.avgDeathsPre14 >= 2) return 'early_game';
  if (categories.has('macro')) return 'macro';
  if (categories.has('consistency')) return 'review';
  return 'mid_game';
}

function scoreCard(card: KnowledgeCard, context: AICoachContext) {
  let score = 0;
  const anchorChampion = context.player.anchorChampion?.toLowerCase();
  const matchupChampion = context.matchupAlert?.opponentChampionName?.toLowerCase();
  const role = context.player.roleFilter;
  const preferredPhase = inferPreferredPhase(context);
  const topProblemText = context.coaching.topProblems.map((problem) => `${problem.problem} ${problem.title} ${problem.cause}`).join(' ').toLowerCase();

  if (card.role === role) score += 40;
  else if (card.role === 'ALL') score += 12;

  if (card.phase === preferredPhase) score += 16;
  else if (card.phase === 'review') score += 8;

  if (card.champion && anchorChampion && card.champion.toLowerCase() === anchorChampion) score += 35;
  if (card.matchup && matchupChampion && card.matchup.toLowerCase() === matchupChampion) score += 38;

  if (card.skillLevel === 'all') score += 4;
  if (card.skillLevel === 'emerald_plus' && ['PLATINUM', 'EMERALD', 'DIAMOND', 'MASTER', 'GRANDMASTER', 'CHALLENGER'].includes(context.player.highestTier ?? '')) score += 8;
  if (card.skillLevel === 'diamond_plus' && ['DIAMOND', 'MASTER', 'GRANDMASTER', 'CHALLENGER'].includes(context.player.highestTier ?? '')) score += 8;
  if (card.skillLevel === 'gold_plus' && ['GOLD', 'PLATINUM', 'EMERALD', 'DIAMOND', 'MASTER', 'GRANDMASTER', 'CHALLENGER'].includes(context.player.highestTier ?? '')) score += 6;

  for (const tag of card.tags) {
    if (topProblemText.includes(tag.toLowerCase())) score += 6;
  }

  if (topProblemText.includes(card.concept.toLowerCase().replace(/_/g, ' '))) score += 10;
  return score;
}

export async function loadKnowledgeCards() {
  const files = await walkJsonFiles(knowledgeCardsDir);
  const cards: KnowledgeCard[] = [];

  for (const file of files) {
    const raw = await readFile(file, 'utf8');
    const parsed = knowledgeCardSchema.parse(JSON.parse(raw));
    cards.push(parsed);
  }

  return cards;
}

export async function retrieveKnowledgeCards(context: AICoachContext, limit = 6) {
  const cards = await loadKnowledgeCards();
  return cards
    .map((card) => ({ card, score: scoreCard(card, context) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
