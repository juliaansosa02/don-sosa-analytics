import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { env } from '../config/env.js';
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

function parsePatchParts(patch?: string | null) {
  if (!patch) return null;
  const match = patch.match(/(\d+)\.(\d+)/);
  if (!match) return null;

  return {
    major: Number(match[1]),
    minor: Number(match[2])
  };
}

function comparePatch(left?: string | null, right?: string | null) {
  const a = parsePatchParts(left);
  const b = parsePatchParts(right);
  if (!a || !b) return null;
  if (a.major !== b.major) return a.major - b.major;
  return a.minor - b.minor;
}

function getFocusMetricKeywords(focusMetric?: string | null) {
  switch (focusMetric) {
    case 'deaths_pre_10':
    case 'deaths_pre_14':
      return ['death', 'deaths', 'discipline', 'tempo', 'stability'];
    case 'cs_at_15':
      return ['farm', 'cs', 'wave', 'reset', 'economy'];
    case 'gold_diff_at_15':
      return ['lane', 'gold', 'tempo', 'trade', 'priority'];
    case 'kill_participation':
      return ['roam', 'map', 'move', 'skirmish', 'connection'];
    case 'objective_fight_deaths':
      return ['objective', 'setup', 'reset', 'vision', 'arrival'];
    case 'lead_conversion':
      return ['convert', 'lead', 'macro', 'pressure', 'side'];
    case 'champion_pool_stability':
      return ['pool', 'champion', 'review'];
    case 'matchup_review':
      return ['matchup', 'lane', 'draft', 'review'];
    default:
      return [];
  }
}

function scorePatchRelevance(card: KnowledgeCard) {
  const currentPatch = env.CURRENT_LOL_PATCH;

  if (card.patchSensitivity === 'evergreen') return 6;
  if (!currentPatch) return -2;

  let score = 0;

  if (card.patch && comparePatch(card.patch, currentPatch) === 0) score += 12;

  const fromCompare = comparePatch(card.validFromPatch, currentPatch);
  const toCompare = comparePatch(card.validToPatch, currentPatch);
  const aboveLowerBound = fromCompare === null || fromCompare <= 0;
  const belowUpperBound = toCompare === null || toCompare >= 0;

  if ((card.validFromPatch || card.validToPatch) && aboveLowerBound && belowUpperBound) {
    score += 10;
  }

  if ((card.validFromPatch || card.validToPatch) && (!aboveLowerBound || !belowUpperBound)) {
    score -= 10;
  }

  if (card.patchSensitivity === 'system_sensitive') score -= 2;

  return score;
}

function scoreCard(card: KnowledgeCard, context: AICoachContext) {
  let score = 0;
  const anchorChampion = context.player.anchorChampion?.toLowerCase();
  const matchupChampion = context.problematicMatchup?.opponentChampionName?.toLowerCase()
    ?? context.matchupAlert?.opponentChampionName?.toLowerCase();
  const scopedRoles = context.player.coachRoles.length
    ? context.player.coachRoles
    : [context.player.primaryRole ?? context.player.roleFilter];
  const preferredPhase = inferPreferredPhase(context);
  const topProblemText = context.coaching.topProblems.map((problem) => `${problem.problem} ${problem.title} ${problem.cause}`).join(' ').toLowerCase();
  const primaryIssueKeywords = getFocusMetricKeywords(context.diagnosis.primaryIssue?.focusMetric);
  const championArchetypes = context.knowledge.championIdentity?.archetypes ?? [];

  if (scopedRoles.includes(card.role)) score += 40;
  else if (card.role === 'ALL') score += 12;

  if (card.phase === preferredPhase) score += 16;
  else if (card.phase === 'review') score += 8;

  if (card.champion && anchorChampion && card.champion.toLowerCase() === anchorChampion) score += 35;
  if (card.matchup && matchupChampion && card.matchup.toLowerCase() === matchupChampion) score += 38;

  if (card.skillLevel === 'all') score += 4;
  if (card.skillLevel === 'emerald_plus' && ['PLATINUM', 'EMERALD', 'DIAMOND', 'MASTER', 'GRANDMASTER', 'CHALLENGER'].includes(context.player.highestTier ?? '')) score += 8;
  if (card.skillLevel === 'diamond_plus' && ['DIAMOND', 'MASTER', 'GRANDMASTER', 'CHALLENGER'].includes(context.player.highestTier ?? '')) score += 8;
  if (card.skillLevel === 'gold_plus' && ['GOLD', 'PLATINUM', 'EMERALD', 'DIAMOND', 'MASTER', 'GRANDMASTER', 'CHALLENGER'].includes(context.player.highestTier ?? '')) score += 6;
  score += scorePatchRelevance(card);

  for (const tag of card.tags) {
    if (topProblemText.includes(tag.toLowerCase())) score += 6;
    if (primaryIssueKeywords.some((keyword) => tag.toLowerCase().includes(keyword))) score += 4;
    if (championArchetypes.some((archetype) => tag.toLowerCase().includes(archetype.toLowerCase()))) score += 3;
  }

  if (primaryIssueKeywords.some((keyword) => card.concept.toLowerCase().includes(keyword))) score += 10;
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
