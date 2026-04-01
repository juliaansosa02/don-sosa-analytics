import OpenAI from 'openai';
import { zodTextFormat } from 'openai/helpers/zod';
import { buildAggregateSummary } from '@don-sosa/core';
import { createHash } from 'node:crypto';
import { env } from '../config/env.js';
import { loadProfileSnapshot } from './profileStore.js';
import { retrieveKnowledgeCards } from './knowledgeBase.js';
import { getPatchContextForCoach } from './patchNotes.js';
import { aiCoachOutputSchema, type AICoachContext, type AICoachContinuity, type AICoachOutput, type AICoachProcessing, type AICoachRequest } from './aiCoachSchemas.js';
import { loadAICoachUsageForMonth, loadLatestAICoachingGenerationForRequest, saveAICoachingGeneration } from './aiCoachStore.js';
import type { collectPlayerSnapshot } from './collectionService.js';

type StoredDataset = Awaited<ReturnType<typeof collectPlayerSnapshot>>;

const openai = env.OPENAI_API_KEY ? new OpenAI({ apiKey: env.OPENAI_API_KEY }) : null;

function roundUsd(value: number) {
  return Number(value.toFixed(4));
}

function getModelPricingPer1M(model: string) {
  const pricingMap: Record<string, { input: number; output: number }> = {
    'gpt-5.4-nano': { input: 0.2, output: 1.25 },
    'gpt-5.4-mini': { input: 0.75, output: 4.5 },
    'gpt-5.4': { input: 2.5, output: 15 },
    'gpt-4.1-mini': { input: 0.4, output: 1.6 },
    'gpt-4o-mini': { input: 0.15, output: 0.6 }
  };

  return pricingMap[model] ?? null;
}

function estimateCostUsd(model: string, usage: { inputTokens: number; outputTokens: number }) {
  const pricing = getModelPricingPer1M(model);
  if (!pricing) return 0;

  return roundUsd(
    ((usage.inputTokens / 1_000_000) * pricing.input) +
    ((usage.outputTokens / 1_000_000) * pricing.output)
  );
}

function buildBudgetSnapshot(monthlyUsage: {
  monthKey: string;
  openaiGenerations: number;
  premiumGenerations: number;
  estimatedCostUsd: number;
}) {
  const remainingBudgetUsd = Math.max(0, env.AI_COACH_MONTHLY_BUDGET_USD - monthlyUsage.estimatedCostUsd);

  return {
    monthKey: monthlyUsage.monthKey,
    estimatedCostUsd: roundUsd(monthlyUsage.estimatedCostUsd),
    budgetUsd: env.AI_COACH_MONTHLY_BUDGET_USD,
    remainingBudgetUsd: roundUsd(remainingBudgetUsd),
    openaiRuns: monthlyUsage.openaiGenerations,
    premiumRuns: monthlyUsage.premiumGenerations
  };
}

function getProcessingReason(locale: 'es' | 'en', key: 'cached' | 'fresh_premium' | 'fresh_economy' | 'updated_premium' | 'updated_economy' | 'budget_cap' | 'provider_draft' | 'quota_fallback') {
  const messages = {
    en: {
      cached: 'The visible sample did not change, so the latest saved coaching block was reused.',
      fresh_premium: 'This is a new or strategically important coaching block, so the higher-quality model was used.',
      fresh_economy: 'A fresh coaching block was generated with the economy model to preserve budget.',
      updated_premium: 'The sample changed enough to justify a higher-quality refresh.',
      updated_economy: 'The coaching block was updated with the lower-cost model because the new sample delta was small.',
      budget_cap: 'The monthly AI budget for this profile is exhausted, so the system used structured fallback coaching instead of spending more tokens.',
      provider_draft: 'Draft mode was requested, so the system skipped OpenAI and used structured coaching.',
      quota_fallback: 'OpenAI was temporarily unavailable, so the system fell back to structured coaching.'
    },
    es: {
      cached: 'La muestra visible no cambió, así que se reutilizó el último bloque de coaching guardado.',
      fresh_premium: 'Este es un bloque nuevo o estratégicamente importante, así que se usó el modelo de mayor calidad.',
      fresh_economy: 'Se generó un bloque nuevo con el modelo económico para preservar presupuesto.',
      updated_premium: 'La muestra cambió lo suficiente como para justificar una actualización de mayor calidad.',
      updated_economy: 'El bloque se actualizó con el modelo de menor costo porque el cambio en la muestra fue chico.',
      budget_cap: 'El presupuesto mensual de IA para este perfil se agotó, así que el sistema usó coaching estructurado en vez de gastar más tokens.',
      provider_draft: 'Se pidió modo draft, así que el sistema omitió OpenAI y usó coaching estructurado.',
      quota_fallback: 'OpenAI no estuvo disponible temporalmente, así que el sistema cayó a coaching estructurado.'
    }
  } as const;

  return messages[locale][key];
}

function decideProcessingPolicy(input: AICoachRequest, context: AICoachContext, monthlyUsage: {
  monthKey: string;
  openaiGenerations: number;
  premiumGenerations: number;
  estimatedCostUsd: number;
}, newVisibleMatchCount: number, hasPreviousGeneration: boolean): AICoachProcessing {
  const budget = buildBudgetSnapshot(monthlyUsage);

  if (input.providerMode === 'draft' || !openai) {
    return {
      mode: 'structured_fallback',
      tier: 'fallback',
      selectedModel: null,
      reason: getProcessingReason(input.locale, 'provider_draft'),
      budget
    };
  }

  const hardBudgetReached = budget.remainingBudgetUsd <= 0
    || monthlyUsage.openaiGenerations >= env.AI_COACH_MAX_MONTHLY_OPENAI_RUNS;

  if (hardBudgetReached) {
    return {
      mode: 'structured_fallback',
      tier: 'fallback',
      selectedModel: null,
      reason: getProcessingReason(input.locale, 'budget_cap'),
      budget
    };
  }

  const premiumDesired = !hasPreviousGeneration
    ? context.player.visibleMatches >= env.AI_COACH_PREMIUM_MIN_VISIBLE_MATCHES
    : newVisibleMatchCount >= env.AI_COACH_PREMIUM_MIN_NEW_MATCHES;

  const premiumAllowed = premiumDesired
    && monthlyUsage.premiumGenerations < env.AI_COACH_MAX_MONTHLY_PREMIUM_RUNS
    && budget.remainingBudgetUsd >= env.AI_COACH_PREMIUM_MIN_REMAINING_BUDGET_USD;

  if (premiumAllowed) {
    return {
      mode: 'premium_openai',
      tier: 'premium',
      selectedModel: env.openAIPremiumModel,
      reason: getProcessingReason(input.locale, hasPreviousGeneration ? 'updated_premium' : 'fresh_premium'),
      budget
    };
  }

  return {
    mode: 'economy_openai',
    tier: 'economy',
    selectedModel: env.openAIEconomyModel,
    reason: getProcessingReason(input.locale, hasPreviousGeneration ? 'updated_economy' : 'fresh_economy'),
    budget
  };
}

function getQueueBucket(queueId: number) {
  if (queueId === 420 || queueId === 440) return queueId === 420 ? 'RANKED_SOLO' : 'RANKED_FLEX';
  return 'OTHER';
}

function normalizeCoachRoles(input: AICoachRequest) {
  const explicitRoles = Array.from(new Set((input.coachRoles ?? [])
    .map((role) => role.trim().toUpperCase())
    .filter((role) => role && role !== 'ALL' && role !== 'NONE'))).sort();

  if (explicitRoles.length) return explicitRoles.slice(0, 2);

  const singleRole = input.roleFilter.trim().toUpperCase();
  if (singleRole && singleRole !== 'ALL' && singleRole !== 'NONE') {
    return [singleRole];
  }

  return [];
}

function buildRoleScopeLabel(roles: string[], locale: 'es' | 'en') {
  if (!roles.length) {
    return locale === 'en' ? 'all roles' : 'todos los roles';
  }

  const labels = roles.map((role) => getRoleLabel(role, locale));
  return labels.join(locale === 'en' ? ' + ' : ' + ');
}

function filterMatches(dataset: StoredDataset, input: AICoachRequest) {
  let matches = [...dataset.matches];
  const coachRoles = normalizeCoachRoles(input);

  if (coachRoles.length) {
    matches = matches.filter((match) => coachRoles.includes((match.role || 'NONE').toUpperCase()));
  } else if (input.roleFilter !== 'ALL') {
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

async function buildCoachContext(dataset: StoredDataset, input: AICoachRequest): Promise<AICoachContext> {
  const matches = filterMatches(dataset, input);
  const coachRoles = normalizeCoachRoles(input);
  const roleScopeLabel = buildRoleScopeLabel(coachRoles, input.locale);
  const summary = buildAggregateSummary(dataset.player, dataset.tagLine, dataset.summary.region, dataset.summary.platform, matches, input.locale);
  const anchorChampion = summary.championPool[0]?.championName ?? null;
  const matchupAlert = buildMatchupAlert(matches);

  const visibleMatchIds = matches.map((match) => match.matchId).slice(0, 20);
  const sampleSignature = createHash('sha1')
    .update(JSON.stringify({
      roleFilter: input.roleFilter,
      coachRoles,
      queueFilter: input.queueFilter,
      windowFilter: input.windowFilter,
      matchIds: matches.map((match) => match.matchId)
    }))
    .digest('hex');

  const baseContext: Omit<AICoachContext, 'patchContext'> = {
    player: {
      gameName: dataset.player,
      tagLine: dataset.tagLine,
      platform: dataset.summary.platform,
      regionalRoute: dataset.summary.region,
      locale: input.locale,
      roleFilter: input.roleFilter,
      coachRoles,
      roleScopeLabel,
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
    matchupAlert,
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
    })),
    sample: {
      visibleMatchIds,
      sampleSignature,
      latestMatchId: matches[0]?.matchId ?? null,
      latestGameCreation: matches[0]?.gameCreation ?? null
    }
  };

  const patchContext = await getPatchContextForCoach(baseContext);

  return {
    ...baseContext,
    patchContext
  };
}

function buildDraftCoach(context: AICoachContext, knowledgeCards: Array<{ card: { id: string; title: string; body: string; actionables: string[] } }>): AICoachOutput {
  const topProblem = context.coaching.topProblems[0];
  const secondProblem = context.coaching.topProblems[1];
  const topCards = knowledgeCards.slice(0, 3).map((entry) => entry.card);
  const championPatchAlert = context.patchContext.relevantChampionUpdates[0] ?? null;

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
        ? championPatchAlert
          ? `${context.player.anchorChampion} is your current anchor pick, and patch ${context.patchContext.currentPatch} recently touched it: ${championPatchAlert.summary}`
          : `${context.player.anchorChampion} is your current anchor pick. Use it as the reference for recalls, tempo and objective setup before widening the pool.`
        : championPatchAlert
          ? `${context.player.anchorChampion} es tu pick ancla actual, y el parche ${context.patchContext.currentPatch} lo tocó hace poco: ${championPatchAlert.summary}`
          : `${context.player.anchorChampion} es tu pick ancla actual. Usalo como referencia para recalls, tempo y setup de objetivos antes de abrir más el pool.`)
      : null,
    matchupSpecificNote: context.matchupAlert
      ? (context.player.locale === 'en'
        ? `${context.matchupAlert.opponentChampionName} deserves explicit preparation: the pattern is recurring enough to justify review before you queue again.`
        : `${context.matchupAlert.opponentChampionName} merece preparación explícita: el patrón se repite lo suficiente como para justificar review antes de volver a jugar.`)
      : null,
    grounding: [
      topProblem?.impact,
      ...context.patchContext.relevantChampionUpdates.slice(0, 1).map((update) => `${update.championName}: ${update.summary}`),
      ...topCards.map((card) => card.title)
    ].filter(Boolean).slice(0, 4) as string[],
    knowledgeCardIds: topCards.map((card) => card.id),
    confidence: topProblem ? 0.56 : 0.28
  };
}

function getRoleLabel(roleFilter: string, locale: 'es' | 'en') {
  const map = locale === 'en'
    ? {
        JUNGLE: 'jungle',
        TOP: 'top',
        MIDDLE: 'mid',
        BOTTOM: 'ADC',
        UTILITY: 'support',
        ALL: 'main role'
      }
    : {
        JUNGLE: 'jungla',
        TOP: 'top',
        MIDDLE: 'mid',
        BOTTOM: 'ADC',
        UTILITY: 'support',
        ALL: 'rol principal'
      };

  return map[roleFilter as keyof typeof map] ?? roleFilter.toLowerCase();
}

function buildPersonalizedMainLeak(context: AICoachContext, coach: AICoachOutput) {
  const locale = context.player.locale;
  const topProblem = context.coaching.topProblems[0];
  const anchorChampion = context.player.anchorChampion;
  const championText = anchorChampion
    ? anchorChampion
    : locale === 'en'
      ? 'your current pick'
      : 'tu pick actual';
  const roleText = context.player.roleScopeLabel || getRoleLabel(context.player.roleFilter, locale);

  if (!topProblem) return coach.mainLeak;

  switch (topProblem.focusMetric) {
    case 'deaths_pre_14':
      return locale === 'en'
        ? `${championText} is entering the game too unstable: you are losing too much before minute 14 and that is breaking your plan before you reach your strong window.`
        : `${championText} está entrando demasiado inestable a la partida: estás perdiendo demasiado antes del minuto 14 y eso te rompe el plan antes de llegar a tu zona fuerte.`;
    case 'cs_at_15':
      return locale === 'en'
        ? `Your biggest leak is early income on ${roleText}: you are leaving too much gold on the map before the game reaches a playable mid game.`
        : `Tu mayor fuga hoy es de ingresos tempranos en ${roleText}: estás dejando demasiado oro en el mapa antes de que la partida llegue a un mid game jugable.`;
    case 'objective_fight_deaths':
      return locale === 'en'
        ? `You are not mainly losing one random fight. You are arriving badly to objective windows and giving away control before the real play starts.`
        : `No estás perdiendo por una teamfight aislada. Estás llegando mal a las ventanas de objetivo y regalando el control antes de que empiece la jugada real.`;
    case 'matchup_review':
      return locale === 'en'
        ? `${coach.mainLeak}. This is already specific enough to justify targeted matchup prep before you queue again.`
        : `${coach.mainLeak}. El patrón ya es lo bastante específico como para justificar preparación puntual del matchup antes de volver a jugar.`;
    default:
      return locale === 'en'
        ? `${coach.mainLeak}. Right now this is the cleanest explanation for why your current block is not converting.`
        : `${coach.mainLeak}. Hoy esta es la explicación más limpia de por qué tu bloque actual no está convirtiendo mejor.`;
  }
}

function buildPersonalizedSummary(context: AICoachContext, coach: AICoachOutput) {
  const locale = context.player.locale;
  const topProblem = context.coaching.topProblems[0];

  if (!topProblem) return coach.summary;

  if (topProblem.focusMetric === 'deaths_pre_14') {
    return locale === 'en'
      ? `The pattern is clear: your first unstable minute is costing too much tempo, gold and map freedom. If we clean that up, the rest of your games should become much more playable.`
      : `El patrón es claro: tu primer minuto inestable está costando demasiado tempo, oro y libertad de mapa. Si limpiamos eso, el resto de tus partidas debería volverse mucho más jugable.`;
  }

  if (topProblem.focusMetric === 'cs_at_15') {
    return locale === 'en'
      ? `This is not about farming for style points. It is about reaching the part of the game where your champion can actually matter with enough gold, tempo and pressure.`
      : `No se trata de farmear por estética. Se trata de llegar a la parte de la partida donde tu campeón realmente puede importar con suficiente oro, tempo y presión.`;
  }

  if (topProblem.focusMetric === 'objective_fight_deaths') {
    return locale === 'en'
      ? `Your games are leaking value before or around the setup, not only during the fight itself. The fastest improvement is to organize resets, vision and arrival timing better.`
      : `Tus partidas están perdiendo valor antes o alrededor del setup, no solo durante la pelea. La mejora más rápida pasa por ordenar mejor resets, visión y tiempo de llegada.`;
  }

  return coach.summary;
}

function normalizeCoachOutput(context: AICoachContext, coach: AICoachOutput): AICoachOutput {
  return {
    ...coach,
    mainLeak: buildPersonalizedMainLeak(context, coach),
    summary: buildPersonalizedSummary(context, coach)
  };
}

const SYSTEM_PROMPT = `You are the AI coaching layer for Don Sosa Coach, a League of Legends post-game improvement product.

Your job is not to invent problems. Your job is to translate structured gameplay signals into expert-level coaching.

Rules:
- Ground your answer in the supplied stats, ranked context, role filter and matchup context.
- Use retrieved coaching knowledge only to explain or sharpen the recommendation.
- Use patch context to warn about recent champion or system changes when it materially affects the advice.
- Write every field fully in the player's locale. Never mix Spanish and English inside the same answer.
- Do not claim external elo benchmarks unless explicitly provided.
- Avoid generic advice like "farm better" or "play safer".
- Always turn the diagnosis into review instructions and next-game habits.
- Write with the tone of a high-level analyst coaching a serious player.
- If the evidence is weak, say so and lower confidence.
- Return only structured JSON that matches the schema.`;

function buildUserPrompt(
  context: AICoachContext,
  localCards: Array<{ card: { id: string; title: string; body: string; actionables: string[] } }>,
  previousCoaching?: {
    coach: AICoachOutput;
    previousVisibleMatchIds: string[];
  } | null
) {
  const newMatchIds = previousCoaching
    ? context.sample.visibleMatchIds.filter((matchId) => !previousCoaching.previousVisibleMatchIds.includes(matchId))
    : [];

  return JSON.stringify({
    context,
    localKnowledge: localCards.map((entry) => entry.card),
    previousCoaching: previousCoaching
      ? {
          summary: previousCoaching.coach.summary,
          mainLeak: previousCoaching.coach.mainLeak,
          whatToReview: previousCoaching.coach.whatToReview,
          whatToDoNext3Games: previousCoaching.coach.whatToDoNext3Games,
          newVisibleMatchIds: newMatchIds
        }
      : null,
    instruction: context.player.locale === 'en'
      ? 'Use the diagnosis and the retrieved coaching knowledge to produce the next coaching block. Write only in English, make the main leak concrete and personalized, avoid generic labels, and if previous coaching exists, update the guidance with continuity instead of restarting from zero.'
      : 'Usá el diagnóstico y el conocimiento recuperado para producir el siguiente bloque de coaching. Escribí solo en español, hacé que el problema principal sea concreto y personalizado, evitá etiquetas genéricas y, si existe coaching previo, actualizá la guía con continuidad en vez de reiniciarla desde cero.'
  });
}

async function generateWithOpenAI(
  context: AICoachContext,
  localCards: Awaited<ReturnType<typeof retrieveKnowledgeCards>>,
  model: string,
  previousCoaching?: {
    coach: AICoachOutput;
    previousVisibleMatchIds: string[];
  } | null
) {
  if (!openai) return null;

  const response = await openai.responses.parse({
    model,
    input: [
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: buildUserPrompt(context, localCards, previousCoaching) }
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

  return {
    output: response.output_parsed,
    usage: {
      inputTokens: response.usage?.input_tokens ?? 0,
      outputTokens: response.usage?.output_tokens ?? 0
    }
  };
}

function isRecoverableOpenAIError(error: unknown) {
  if (!(error instanceof Error)) return false;

  const message = error.message.toLowerCase();
  return (
    message.includes('insufficient_quota') ||
    message.includes('exceeded your current quota') ||
    message.includes('billing details') ||
    message.includes('rate limit') ||
    message.includes('too many requests') ||
    message.includes('429')
  );
}

export async function generateAICoach(input: AICoachRequest) {
  const dataset = await loadProfileSnapshot<StoredDataset>(input.gameName, input.tagLine, input.platform);
  if (!dataset) {
    throw new Error(input.locale === 'en' ? 'No cached analysis was found for that account yet.' : 'Todavía no existe un análisis guardado para esa cuenta.');
  }

  const context = await buildCoachContext(dataset, input);
  const previousGeneration = await loadLatestAICoachingGenerationForRequest({
    gameName: input.gameName,
    tagLine: input.tagLine,
    platform: input.platform,
    locale: input.locale,
    roleFilter: input.roleFilter,
    queueFilter: input.queueFilter,
    windowFilter: input.windowFilter
  });
  const previousVisibleMatchIds = previousGeneration?.context_payload?.sample?.visibleMatchIds ?? [];
  const newVisibleMatchIds = context.sample.visibleMatchIds.filter((matchId) => !previousVisibleMatchIds.includes(matchId));
  const monthlyUsage = await loadAICoachUsageForMonth({
    gameName: input.gameName,
    tagLine: input.tagLine,
    platform: input.platform
  });

  if (previousGeneration?.context_payload?.sample?.sampleSignature === context.sample.sampleSignature) {
    const continuity: AICoachContinuity = {
      mode: 'reused',
      newVisibleMatches: 0,
      previousGenerationId: previousGeneration.id,
      previousVisibleMatches: previousVisibleMatchIds.length
    };
    const processing: AICoachProcessing = {
      mode: 'cached_reuse',
      tier: 'cached',
      selectedModel: previousGeneration.model,
      reason: getProcessingReason(input.locale, 'cached'),
      budget: buildBudgetSnapshot(monthlyUsage)
    };

    return {
      generationId: previousGeneration.id,
      provider: previousGeneration.provider,
      model: previousGeneration.model,
      context: previousGeneration.context_payload,
      retrieval: previousGeneration.retrieval_payload,
      coach: previousGeneration.response_payload,
      continuity,
      processing
    };
  }

  const localKnowledge = await retrieveKnowledgeCards(context, 6);

  if (!context.player.visibleMatches) {
    throw new Error(input.locale === 'en'
      ? 'The selected filters leave no visible matches. Change role, queue or time window and try again.'
      : 'Los filtros elegidos dejan la muestra vacía. Cambiá rol, cola o ventana y volvé a probar.');
  }

  let provider: 'draft' | 'openai' = 'draft';
  let coach = normalizeCoachOutput(context, buildDraftCoach(context, localKnowledge));
  let selectedModel: string | null = null;
  let estimatedCostUsd = 0;
  let inputTokens = 0;
  let outputTokens = 0;
  let processing = decideProcessingPolicy(input, context, monthlyUsage, newVisibleMatchIds.length, Boolean(previousGeneration));
  const previousCoaching = previousGeneration
    ? {
        coach: previousGeneration.response_payload,
        previousVisibleMatchIds
      }
    : null;

  if (processing.mode !== 'structured_fallback' && openai && processing.selectedModel) {
    try {
      const modelOutput = await generateWithOpenAI(context, localKnowledge, processing.selectedModel, previousCoaching);
      if (modelOutput?.output) {
        provider = 'openai';
        selectedModel = processing.selectedModel;
        coach = normalizeCoachOutput(context, modelOutput.output);
        inputTokens = modelOutput.usage.inputTokens;
        outputTokens = modelOutput.usage.outputTokens;
        estimatedCostUsd = estimateCostUsd(processing.selectedModel, modelOutput.usage);
        processing = {
          ...processing,
          budget: buildBudgetSnapshot({
            ...monthlyUsage,
            openaiGenerations: monthlyUsage.openaiGenerations + 1,
            premiumGenerations: monthlyUsage.premiumGenerations + (processing.tier === 'premium' ? 1 : 0),
            estimatedCostUsd: monthlyUsage.estimatedCostUsd + estimatedCostUsd
          })
        };
      }
    } catch (error) {
      if (!isRecoverableOpenAIError(error)) {
        throw error;
      }

      console.warn('OpenAI unavailable for AI coach, falling back to structured draft mode:', error instanceof Error ? error.message : error);
      processing = {
        mode: 'structured_fallback',
        tier: 'fallback',
        selectedModel: null,
        reason: getProcessingReason(input.locale, 'quota_fallback'),
        budget: buildBudgetSnapshot(monthlyUsage)
      };
    }
  }

  const generationId = await saveAICoachingGeneration({
    request: input,
    context,
    provider,
    model: provider === 'openai' ? selectedModel : null,
    retrieval: {
      localKnowledgeCount: localKnowledge.length,
      localKnowledgeIds: localKnowledge.map((entry) => entry.card.id),
      usedVectorStore: Boolean(env.OPENAI_VECTOR_STORE_ID && provider === 'openai'),
      policyMode: processing.mode,
      policyTier: processing.tier,
      policyReason: processing.reason,
      inputTokens,
      outputTokens,
      estimatedCostUsd
    },
    coach
  });
  const continuity: AICoachContinuity = {
    mode: previousGeneration ? 'updated' : 'fresh',
    newVisibleMatches: previousGeneration ? newVisibleMatchIds.length : context.sample.visibleMatchIds.length,
    previousGenerationId: previousGeneration?.id ?? null,
    previousVisibleMatches: previousVisibleMatchIds.length
  };

  return {
    generationId,
    provider,
    model: provider === 'openai' ? selectedModel : null,
    context,
    retrieval: {
      localKnowledgeCount: localKnowledge.length,
      localKnowledgeIds: localKnowledge.map((entry) => entry.card.id),
      usedVectorStore: Boolean(env.OPENAI_VECTOR_STORE_ID && provider === 'openai'),
      policyMode: processing.mode,
      policyTier: processing.tier,
      policyReason: processing.reason,
      inputTokens,
      outputTokens,
      estimatedCostUsd
    },
    coach,
    continuity,
    processing
  };
}
