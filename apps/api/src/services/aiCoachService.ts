import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';
import { buildAggregateSummary } from '@don-sosa/core';
import { env } from '../config/env.js';
import { loadProfileSnapshot } from './profileStore.js';
import { retrieveKnowledgeCards } from './knowledgeBase.js';
import { aiCoachOutputSchema, type AICoachContext, type AICoachOutput, type AICoachRequest } from './aiCoachSchemas.js';
import { saveAICoachingGeneration } from './aiCoachStore.js';
import type { collectPlayerSnapshot } from './collectionService.js';

type StoredDataset = Awaited<ReturnType<typeof collectPlayerSnapshot>>;

const openai = env.OPENAI_API_KEY ? new OpenAI({ apiKey: env.OPENAI_API_KEY }) : null;

function getQueueBucket(queueId: number) {
  if (queueId === 420 || queueId === 440) return queueId === 420 ? 'RANKED_SOLO' : 'RANKED_FLEX';
  return 'OTHER';
}

function filterMatches(dataset: StoredDataset, input: AICoachRequest) {
  let matches = [...dataset.matches];

  if (input.roleFilter !== 'ALL') {
    matches = matches.filter((match) => (match.role || 'NONE') === input.roleFilter);
  }

  if (input.queueFilter !== 'ALL') {
    matches = matches.filter((match) => {
      const bucket = getQueueBucket(match.queueId);
      if (input.queueFilter === 'RANKED') return bucket === 'RANKED_SOLO' || bucket === 'RANKED_FLEX';
      return bucket === input.queueFilter;
    });
  }

  matches.sort((a, b) => b.gameCreation - a.gameCreation);
  if (input.windowFilter === 'LAST_20') matches = matches.slice(0, 20);
  if (input.windowFilter === 'LAST_8') matches = matches.slice(0, 8);
  return matches;
}

function buildMatchupAlert(matches: StoredDataset['matches']) {
  const grouped = new Map<string, { games: number; wins: number; goldDiff: number; levelDiff: number }>();
  for (const match of matches) {
    if (!match.opponentChampionName) continue;
    const key = match.opponentChampionName;
    const current = grouped.get(key) ?? { games: 0, wins: 0, goldDiff: 0, levelDiff: 0 };
    current.games += 1;
    current.wins += match.win ? 1 : 0;
    current.goldDiff += match.timeline.goldDiffAt15 ?? 0;
    current.levelDiff += match.timeline.levelDiffAt15 ?? 0;
    grouped.set(key, current);
  }

  const risky = Array.from(grouped.entries())
    .map(([opponentChampionName, entry]) => ({
      opponentChampionName,
      games: entry.games,
      winRate: Number(((entry.wins / Math.max(entry.games, 1)) * 100).toFixed(1)),
      avgGoldDiffAt15: Number((entry.goldDiff / Math.max(entry.games, 1)).toFixed(0)),
      avgLevelDiffAt15: Number((entry.levelDiff / Math.max(entry.games, 1)).toFixed(1))
    }))
    .filter((entry) => entry.games >= 2)
    .sort((a, b) => a.winRate - b.winRate || a.avgGoldDiffAt15 - b.avgGoldDiffAt15)[0];

  return risky ?? null;
}

function buildCoachContext(dataset: StoredDataset, input: AICoachRequest): AICoachContext {
  const matches = filterMatches(dataset, input);
  const summary = buildAggregateSummary(dataset.player, dataset.tagLine, dataset.summary.region, dataset.summary.platform, matches, input.locale);
  const anchorChampion = summary.championPool[0]?.championName ?? null;

  return {
    player: {
      gameName: dataset.player,
      tagLine: dataset.tagLine,
      locale: input.locale,
      roleFilter: input.roleFilter,
      queueFilter: input.queueFilter,
      windowFilter: input.windowFilter,
      visibleMatches: summary.matches,
      rankLabel: dataset.rank?.highest.label,
      highestTier: dataset.rank?.highest.tier,
      anchorChampion
    },
    performance: {
      winRate: summary.winRate,
      avgPerformance: summary.avgPerformanceScore,
      avgCsAt15: summary.avgCsAt15,
      avgGoldAt15: summary.avgGoldAt15,
      avgDeathsPre14: summary.avgDeathsPre14,
      consistencyIndex: summary.consistencyIndex
    },
    coaching: {
      headline: summary.coaching.headline,
      subheadline: summary.coaching.subheadline,
      topProblems: summary.coaching.topProblems.map((problem) => ({
        id: problem.id,
        problem: problem.problem,
        title: problem.title,
        category: problem.category,
        priority: problem.priority,
        evidence: problem.evidence,
        impact: problem.impact,
        cause: problem.cause,
        actions: problem.actions,
        focusMetric: problem.focusMetric,
        winRateDelta: problem.winRateDelta
      })),
      activePlan: summary.coaching.activePlan
    },
    championPool: summary.championPool.slice(0, 4).map((champion) => ({
      championName: champion.championName,
      games: champion.games,
      winRate: champion.winRate,
      avgScore: champion.avgScore,
      avgCsAt15: champion.avgCsAt15,
      avgDeathsPre14: champion.avgDeathsPre14,
      classification: champion.classification
    })),
    matchupAlert: buildMatchupAlert(matches),
    recentMatches: matches.slice(0, 8).map((match) => ({
      matchId: match.matchId,
      championName: match.championName,
      opponentChampionName: match.opponentChampionName,
      win: match.win,
      csAt15: match.timeline.csAt15,
      goldAt15: match.timeline.goldAt15,
      deathsPre14: match.timeline.deathsPre14,
      goldDiffAt15: match.timeline.goldDiffAt15,
      levelDiffAt15: match.timeline.levelDiffAt15,
      score: match.score.total
    }))
  };
}

function buildDraftCoach(context: AICoachContext, knowledgeCards: Array<{ card: { id: string; title: string; body: string; actionables: string[] } }>): AICoachOutput {
  const topProblem = context.coaching.topProblems[0];
  const secondProblem = context.coaching.topProblems[1];
  const topCards = knowledgeCards.slice(0, 3).map((entry) => entry.card);

  return {
    summary: topProblem
      ? context.player.locale === 'en'
        ? `${topProblem.problem}. The immediate goal is to turn this from a recurring leak into a controllable habit.`
        : `${topProblem.problem}. El objetivo inmediato es convertir esto de una fuga recurrente en un hábito controlable.`
      : context.player.locale === 'en'
        ? 'There is not enough signal yet to define a sharp AI coaching read.'
        : 'Todavía no hay suficiente señal para definir una lectura de coaching IA realmente filosa.',
    mainLeak: topProblem?.problem ?? (context.player.locale === 'en' ? 'Insufficient sample' : 'Muestra insuficiente'),
    whyItHappens: topProblem?.cause ?? (context.player.locale === 'en'
      ? 'The current sample is still too small or too mixed to isolate a real root cause.'
      : 'La muestra todavía es demasiado chica o demasiado mezclada como para aislar una causa raíz real.'),
    whatToReview: [
      ...(topProblem?.evidence.slice(0, 2) ?? []),
      ...(topCards[0] ? [topCards[0].body] : []),
      ...(secondProblem ? [secondProblem.problem] : [])
    ].slice(0, 4),
    whatToDoNext3Games: [
      ...(topProblem?.actions.slice(0, 2) ?? []),
      ...topCards.flatMap((card) => card.actionables).slice(0, 3)
    ].slice(0, 4),
    championSpecificNote: context.player.anchorChampion
      ? (context.player.locale === 'en'
        ? `${context.player.anchorChampion} is your current anchor pick. Use it as the reference for recalls, tempo and objective setup before widening the pool.`
        : `${context.player.anchorChampion} es tu pick ancla actual. Usalo como referencia para recalls, tempo y setup de objetivos antes de abrir más el pool.`)
      : null,
    matchupSpecificNote: context.matchupAlert
      ? (context.player.locale === 'en'
        ? `${context.matchupAlert.opponentChampionName} deserves explicit preparation: the pattern is recurring enough to justify review before you queue again.`
        : `${context.matchupAlert.opponentChampionName} merece preparación explícita: el patrón se repite lo suficiente como para justificar review antes de volver a jugar.`)
      : null,
    grounding: [
      topProblem?.impact,
      ...topCards.map((card) => card.title)
    ].filter(Boolean).slice(0, 4) as string[],
    knowledgeCardIds: topCards.map((card) => card.id),
    confidence: topProblem ? 0.56 : 0.28
  };
}

const SYSTEM_PROMPT = `You are the AI coaching layer for Don Sosa Coach, a League of Legends post-game improvement product.

Your job is not to invent problems. Your job is to translate structured gameplay signals into expert-level coaching.

Rules:
- Ground your answer in the supplied stats, ranked context, role filter and matchup context.
- Use retrieved coaching knowledge only to explain or sharpen the recommendation.
- Do not claim external elo benchmarks unless explicitly provided.
- Avoid generic advice like "farm better" or "play safer".
- Always turn the diagnosis into review instructions and next-game habits.
- Write with the tone of a high-level analyst coaching a serious player.
- If the evidence is weak, say so and lower confidence.
- Return only structured JSON that matches the schema.`;

function buildUserPrompt(context: AICoachContext, localCards: Array<{ card: { id: string; title: string; body: string; actionables: string[] } }>) {
  return JSON.stringify({
    context,
    localKnowledge: localCards.map((entry) => entry.card),
    instruction: context.player.locale === 'en'
      ? 'Use the diagnosis and the retrieved coaching knowledge to produce the next coaching block.'
      : 'Usá el diagnóstico y el conocimiento recuperado para producir el siguiente bloque de coaching.'
  });
}

async function generateWithOpenAI(context: AICoachContext, localCards: Awaited<ReturnType<typeof retrieveKnowledgeCards>>) {
  if (!openai) return null;

  const response = await openai.responses.parse({
    model: env.OPENAI_MODEL,
    input: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: buildUserPrompt(context, localCards) }
    ],
    ...(env.OPENAI_VECTOR_STORE_ID ? {
      tools: [{
        type: 'file_search' as const,
        vector_store_ids: [env.OPENAI_VECTOR_STORE_ID],
        max_num_results: 6
      }]
    } : {}),
    text: {
      format: zodTextFormat(aiCoachOutputSchema, 'don_sosa_ai_coach')
    }
  });

  return response.output_parsed;
}

export async function generateAICoach(input: AICoachRequest) {
  const dataset = await loadProfileSnapshot<StoredDataset>(input.gameName, input.tagLine);
  if (!dataset) {
    throw new Error(input.locale === 'en' ? 'No cached analysis was found for that account yet.' : 'Todavía no existe un análisis guardado para esa cuenta.');
  }

  const context = buildCoachContext(dataset, input);
  const localKnowledge = await retrieveKnowledgeCards(context, 6);

  if (!context.player.visibleMatches) {
    throw new Error(input.locale === 'en'
      ? 'The selected filters leave no visible matches. Change role, queue or time window and try again.'
      : 'Los filtros elegidos dejan la muestra vacía. Cambiá rol, cola o ventana y volvé a probar.');
  }

  let provider: 'draft' | 'openai' = 'draft';
  let coach = buildDraftCoach(context, localKnowledge);

  if (input.providerMode !== 'draft' && openai) {
    const modelOutput = await generateWithOpenAI(context, localKnowledge);
    if (modelOutput) {
      provider = 'openai';
      coach = modelOutput;
    }
  }

  const generationId = await saveAICoachingGeneration({
    request: input,
    context,
    provider,
    model: provider === 'openai' ? env.OPENAI_MODEL : null,
    retrieval: {
      localKnowledgeCount: localKnowledge.length,
      localKnowledgeIds: localKnowledge.map((entry) => entry.card.id),
      usedVectorStore: Boolean(env.OPENAI_VECTOR_STORE_ID && provider === 'openai')
    },
    coach
  });

  return {
    generationId,
    provider,
    model: provider === 'openai' ? env.OPENAI_MODEL : null,
    context,
    retrieval: {
      localKnowledgeCount: localKnowledge.length,
      localKnowledgeIds: localKnowledge.map((entry) => entry.card.id),
      usedVectorStore: Boolean(env.OPENAI_VECTOR_STORE_ID && provider === 'openai')
    },
    coach
  };
}
