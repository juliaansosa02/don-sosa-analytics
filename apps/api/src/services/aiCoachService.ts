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
import { assertCoachEntitlement, limitDatasetToMembership, type MembershipContext } from './membershipService.js';

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
}, newVisibleMatchCount: number, hasPreviousGeneration: boolean, membership: MembershipContext): AICoachProcessing {
  const budget = buildBudgetSnapshot(monthlyUsage);
  const maxOpenAiRuns = Math.min(membership.plan.entitlements.maxAICoachRunsPerMonth, env.AI_COACH_MAX_MONTHLY_OPENAI_RUNS);
  const maxPremiumRuns = Math.min(membership.plan.entitlements.maxPremiumAICoachRunsPerMonth, env.AI_COACH_MAX_MONTHLY_PREMIUM_RUNS);

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
    || monthlyUsage.openaiGenerations >= maxOpenAiRuns;

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
    && maxPremiumRuns > 0
    && monthlyUsage.premiumGenerations < maxPremiumRuns
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

function buildRoleFundamentals(role: string, locale: 'es' | 'en') {
  const en: Record<string, string[]> = {
    TOP: [
      'wave control, trade windows and crash/reset discipline',
      'matchup spacing and surviving weakside without donating tempo',
      'side-lane assignment, tower pressure and teleport value'
    ],
    JUNGLE: [
      'pathing efficiency, first clear tempo and camp-to-play connection',
      'lane reading before committing to ganks, covers or invades',
      'objective setup, numbers advantage and converting first tempo into map control'
    ],
    MIDDLE: [
      'lane priority, crash timing and first move quality',
      'trading without losing reset tempo or mid control',
      'moving to the live side of the map before objectives and skirmishes'
    ],
    BOTTOM: [
      'lane economy, trade spacing and wave control with support timing',
      'clean recalls, item windows and entering mid game with stable DPS setup',
      'fight entry discipline, front-to-back positioning and damage uptime'
    ],
    UTILITY: [
      'lane control through spacing, cooldown tracking and vision discipline',
      'roam timing that does not grief bot wave or objective setup',
      'protecting carries, starting fights on advantage and controlling map information'
    ]
  };

  const es: Record<string, string[]> = {
    TOP: [
      'control de ola, ventanas de trade y disciplina de crash/reset',
      'spacing del matchup y sobrevivir weakside sin regalar tempo',
      'asignación de side lane, presión de torre y valor real del teleport'
    ],
    JUNGLE: [
      'eficiencia de pathing, tempo del primer clear y conexión entre camps y jugada',
      'lectura de líneas antes de comprometer ganks, covers o invades',
      'setup de objetivos, ventaja numérica y convertir el primer tempo en control de mapa'
    ],
    MIDDLE: [
      'prioridad de línea, timing de crash y calidad del first move',
      'tradear sin perder tempo de reset ni control de mid',
      'moverse al lado vivo del mapa antes de objetivos y escaramuzas'
    ],
    BOTTOM: [
      'economía de línea, spacing de trades y control de ola con el timing del support',
      'recalls limpios, ventanas de item y entrar al mid game con DPS estable',
      'disciplina de entrada a peleas, posicionamiento front-to-back y uptime de daño'
    ],
    UTILITY: [
      'control de línea mediante spacing, tracking de cooldowns y visión disciplinada',
      'timing de roam sin griefear la bot wave ni el setup del objetivo',
      'proteger carries, iniciar con ventaja y controlar la información del mapa'
    ]
  };

  return (locale === 'en' ? en : es)[role] ?? (locale === 'en'
    ? ['tempo, economy and map decisions']
    : ['tempo, economía y decisiones de mapa']);
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

function resolvePrimaryCoachRole(context: AICoachContext) {
  return context.player.primaryRole
    ?? context.player.coachRoles[0]
    ?? context.player.roleFilter.split('+')[0]
    ?? 'ALL';
}

function getRoleTargets(role: string) {
  switch (role) {
    case 'JUNGLE':
      return { csAt15Target: 95, stableDeathsPre14: 1 };
    case 'TOP':
      return { csAt15Target: 102, stableDeathsPre14: 1 };
    case 'MIDDLE':
      return { csAt15Target: 105, stableDeathsPre14: 1 };
    case 'BOTTOM':
      return { csAt15Target: 108, stableDeathsPre14: 1 };
    case 'UTILITY':
      return { csAt15Target: 22, stableDeathsPre14: 2 };
    default:
      return { csAt15Target: 100, stableDeathsPre14: 1 };
  }
}

async function buildCoachContext(dataset: StoredDataset, input: AICoachRequest): Promise<AICoachContext> {
  const matches = filterMatches(dataset, input);
  const coachRoles = normalizeCoachRoles(input);
  const roleScopeLabel = buildRoleScopeLabel(coachRoles, input.locale);
  const summary = buildAggregateSummary(dataset.player, dataset.tagLine, dataset.summary.region, dataset.summary.platform, matches, input.locale);
  const primaryRole = summary.primaryRole ?? coachRoles[0] ?? undefined;
  const anchorChampion = summary.championPool[0]?.championName ?? null;
  const matchupAlert = summary.problematicMatchup
    ? {
        opponentChampionName: summary.problematicMatchup.opponentChampionName,
        games: summary.problematicMatchup.recentGames,
        winRate: summary.problematicMatchup.recentWinRate,
        avgGoldDiffAt15: summary.problematicMatchup.avgGoldDiffAt15,
        avgLevelDiffAt15: summary.problematicMatchup.avgLevelDiffAt15
      }
    : buildMatchupAlert(matches);
  const avgGoldDiffAt15 = matches.length
    ? Number((matches.reduce((total, match) => total + (match.timeline.goldDiffAt15 ?? 0), 0) / matches.length).toFixed(0))
    : 0;
  const avgLevelDiffAt15 = matches.length
    ? Number((matches.reduce((total, match) => total + (match.timeline.levelDiffAt15 ?? 0), 0) / matches.length).toFixed(1))
    : 0;
  const avgKillParticipation = matches.length
    ? Number((matches.reduce((total, match) => total + match.killParticipation, 0) / matches.length).toFixed(1))
    : 0;

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
      primaryRole,
      anchorChampion
    },
    performance: {
      winRate: summary.winRate,
      avgPerformance: summary.avgPerformanceScore,
      avgCsAt15: summary.avgCsAt15,
      avgGoldAt15: summary.avgGoldAt15,
      avgGoldDiffAt15,
      avgLevelDiffAt15,
      avgKillParticipation,
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
      activePlan: summary.coaching.activePlan,
      trend: summary.coaching.trend
    },
    positiveSignals: summary.positiveSignals.map((signal) => ({
      id: signal.id,
      problem: signal.problem,
      title: signal.title,
      category: signal.category,
      priority: signal.priority,
      evidence: signal.evidence,
      impact: signal.impact,
      cause: signal.cause,
      actions: signal.actions,
      focusMetric: signal.focusMetric,
      winRateDelta: signal.winRateDelta
    })),
    reviewAgenda: summary.reviewAgenda.map((item) => ({
      matchId: item.matchId,
      championName: item.championName,
      opponentChampionName: item.opponentChampionName,
      gameCreation: item.gameCreation,
      win: item.win,
      title: item.title,
      reason: item.reason,
      question: item.question,
      focus: item.focus,
      tags: item.tags
    })),
    championPool: summary.championPool.slice(0, 4).map((champion) => ({
      championName: champion.championName,
      games: champion.games,
      winRate: champion.winRate,
      avgScore: champion.avgScore,
      avgCsAt15: champion.avgCsAt15,
      avgDeathsPre14: champion.avgDeathsPre14,
      classification: champion.classification
    })),
    problematicMatchup: summary.problematicMatchup ? {
      opponentChampionName: summary.problematicMatchup.opponentChampionName,
      championName: summary.problematicMatchup.championName,
      recentGames: summary.problematicMatchup.recentGames,
      recentWins: summary.problematicMatchup.recentWins,
      recentLosses: summary.problematicMatchup.recentLosses,
      recentWinRate: summary.problematicMatchup.recentWinRate,
      directGames: summary.problematicMatchup.directGames,
      directWins: summary.problematicMatchup.directWins,
      directLosses: summary.problematicMatchup.directLosses,
      directWinRate: summary.problematicMatchup.directWinRate,
      avgCsAt15: summary.problematicMatchup.avgCsAt15,
      avgGoldDiffAt15: summary.problematicMatchup.avgGoldDiffAt15,
      avgLevelDiffAt15: summary.problematicMatchup.avgLevelDiffAt15,
      avgDeathsPre14: summary.problematicMatchup.avgDeathsPre14,
      summary: summary.problematicMatchup.summary,
      adjustments: summary.problematicMatchup.adjustments
    } : null,
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
    roleLenses: (coachRoles.length ? coachRoles : (primaryRole ? [primaryRole] : []))
      .slice(0, 2)
      .map((role) => ({
        role,
        fundamentals: buildRoleFundamentals(role, input.locale)
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
  const topPositive = context.positiveSignals[0];
  const topReview = context.reviewAgenda[0];
  const topCards = knowledgeCards.slice(0, 3).map((entry) => entry.card);
  const championPatchAlert = context.patchContext.relevantChampionUpdates[0] ?? null;
  const problematicMatchup = context.problematicMatchup;

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
      ...(context.reviewAgenda.map((item) =>
        context.player.locale === 'en'
          ? `${item.title}: ${item.question}`
          : `${item.title}: ${item.question}`
      ) ?? []),
      ...(topProblem?.evidence.slice(0, 1) ?? []),
      ...(problematicMatchup ? [problematicMatchup.summary] : []),
      ...(topCards[0] ? [topCards[0].body] : []),
      ...(secondProblem ? [secondProblem.problem] : [])
    ].slice(0, 4),
    whatToDoNext3Games: [
      ...(problematicMatchup?.adjustments.slice(0, 1) ?? []),
      ...(topProblem?.actions.slice(0, 2) ?? []),
      ...(topPositive?.actions.slice(0, 1) ?? []),
      ...topCards.flatMap((card) => card.actionables).slice(0, 3)
    ].slice(0, 4),
    championSpecificNote: context.player.anchorChampion
      ? (context.player.locale === 'en'
        ? championPatchAlert
          ? `${context.player.anchorChampion} is your current reference pick, and patch ${context.patchContext.currentPatch} recently touched it: ${championPatchAlert.summary}`
          : `${context.player.anchorChampion} is your current reference pick. Use it as the cleanest lens for recalls, tempo and objective setup before widening the pool.`
        : championPatchAlert
          ? `${context.player.anchorChampion} es hoy tu pick de referencia, y el parche ${context.patchContext.currentPatch} lo tocó hace poco: ${championPatchAlert.summary}`
          : `${context.player.anchorChampion} es hoy tu pick de referencia. Usalo como la lente más limpia para recalls, tempo y setup de objetivos antes de abrir más el pool.`)
      : null,
    matchupSpecificNote: problematicMatchup
      ? problematicMatchup.summary
      : context.matchupAlert
      ? (context.player.locale === 'en'
        ? `${context.matchupAlert.opponentChampionName} deserves explicit preparation: the pattern is recurring enough to justify review before you queue again.`
        : `${context.matchupAlert.opponentChampionName} merece preparación explícita: el patrón se repite lo suficiente como para justificar review antes de volver a jugar.`)
      : null,
    grounding: [
      topProblem?.impact,
      topPositive?.impact,
      topReview ? `${topReview.title}: ${topReview.reason}` : null,
      problematicMatchup?.summary,
      ...context.patchContext.relevantChampionUpdates.slice(0, 1).map((update) => `${update.championName}: ${update.summary}`),
      ...topCards.map((card) => card.title)
    ].filter(Boolean).slice(0, 4) as string[],
    knowledgeCardIds: topCards.map((card) => card.id),
    confidence: topProblem ? (context.reviewAgenda.length ? 0.68 : 0.62) : (topPositive ? 0.42 : 0.32)
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
  const roleTargets = getRoleTargets(resolvePrimaryCoachRole(context));
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
        ? `${championText} is entering games too unstable: you are averaging ${context.performance.avgDeathsPre14} deaths before minute 14 when this block needs ${roleTargets.stableDeathsPre14} or fewer.`
        : `${championText} está entrando demasiado inestable a las partidas: promediás ${context.performance.avgDeathsPre14} muertes antes del 14 cuando este bloque necesita ${roleTargets.stableDeathsPre14} o menos.`;
    case 'cs_at_15':
      return locale === 'en'
        ? `Your biggest leak is early income on ${roleText}: you are averaging ${context.performance.avgCsAt15} CS at 15 when the current block needs to be closer to ${roleTargets.csAt15Target}.`
        : `Tu mayor fuga hoy es de ingresos tempranos en ${roleText}: promediás ${context.performance.avgCsAt15} CS al 15 cuando el bloque actual necesita acercarse más a ${roleTargets.csAt15Target}.`;
    case 'objective_fight_deaths':
      return locale === 'en'
        ? `You are not mainly losing one random fight. You are arriving badly to objective windows and giving away control before the real play starts.`
        : `No estás perdiendo por una teamfight aislada. Estás llegando mal a las ventanas de objetivo y regalando el control antes de que empiece la jugada real.`;
    case 'gold_diff_at_15':
      return locale === 'en'
        ? `Your current block is leaking too much state before minute 15: you are averaging ${context.performance.avgGoldDiffAt15} gold diff and ${context.performance.avgLevelDiffAt15} levels by minute 15 on ${roleText}.`
        : `Tu bloque actual está cediendo demasiado estado antes del minuto 15: estás promediando ${context.performance.avgGoldDiffAt15} de diff. de oro y ${context.performance.avgLevelDiffAt15} niveles al 15 en ${roleText}.`;
    case 'kill_participation':
      return locale === 'en'
        ? `The issue is not just execution. You are only averaging ${context.performance.avgKillParticipation}% KP, which says you are reaching too few of the plays that really move the map for ${roleText}.`
        : `El problema no es solo de ejecución. Estás en ${context.performance.avgKillParticipation}% de KP, y eso dice que estás llegando a muy pocas de las jugadas que realmente mueven el mapa para ${roleText}.`;
    case 'champion_pool_stability':
      return locale === 'en'
        ? `Your current pool is too open for the kind of improvement block you want. The sample is spreading your mistakes across too many picks to lock habits fast.`
        : `Tu pool actual está demasiado abierto para el tipo de bloque de mejora que querés. La muestra está repartiendo tus errores entre demasiados picks como para fijar hábitos rápido.`;
    case 'lead_conversion':
      return locale === 'en'
        ? `You are creating enough early edge to matter, but you are not converting that advantage into stable control of the game often enough.`
        : `Estás generando una ventaja temprana suficiente como para pesar, pero no la estás convirtiendo lo bastante seguido en control estable de la partida.`;
    case 'matchup_review':
      return context.problematicMatchup
        ? (locale === 'en'
          ? `${context.problematicMatchup.opponentChampionName} is the matchup that is currently punishing you the most, and ${context.problematicMatchup.championName} is the recent pick that needs a cleaner plan into it.`
          : `${context.problematicMatchup.opponentChampionName} es el matchup que hoy más te está castigando, y ${context.problematicMatchup.championName} es el pick reciente que necesita un plan más limpio para jugarlo.`)
        : (locale === 'en'
          ? `${coach.mainLeak}. This is already specific enough to justify targeted matchup prep before you queue again.`
          : `${coach.mainLeak}. El patrón ya es lo bastante específico como para justificar preparación puntual del matchup antes de volver a jugar.`);
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

  if (topProblem.focusMetric === 'gold_diff_at_15') {
    return locale === 'en'
      ? `The problem is not one isolated fight. It is the amount of game state you are handing over before the map even reaches a stable mid game.`
      : `El problema no es una pelea aislada. Es la cantidad de estado de partida que estás entregando antes de que el mapa siquiera llegue a un mid game estable.`;
  }

  if (topProblem.focusMetric === 'kill_participation') {
    return locale === 'en'
      ? `The sample points to a map-connection issue: your champion is not arriving often enough to the decisive sequences with the right tempo, pathing or priority.`
      : `La muestra apunta a un problema de conexión con el mapa: tu campeón no está llegando lo bastante seguido a las secuencias decisivas con el tempo, el pathing o la prioridad correctos.`;
  }

  if (topProblem.focusMetric === 'champion_pool_stability') {
    return locale === 'en'
      ? `This is less about raw strength and more about learning speed. The current pool is wide enough that it keeps blurring what you really need to fix first.`
      : `Esto tiene menos que ver con fuerza bruta y más con velocidad de aprendizaje. El pool actual es lo bastante ancho como para seguir tapando qué necesitás corregir primero.`;
  }

  if (topProblem.focusMetric === 'lead_conversion') {
    return locale === 'en'
      ? `You are already opening some games well. The next jump comes from learning how to protect and convert those openings instead of letting the map reset for free.`
      : `Ya estás abriendo bien algunas partidas. El próximo salto pasa por aprender a proteger y convertir esas aperturas en vez de dejar que el mapa se reseteé gratis.`;
  }

  if (topProblem.focusMetric === 'matchup_review' && context.problematicMatchup) {
    return locale === 'en'
      ? `${context.problematicMatchup.summary} Use that cross as preparation material, not as background noise.`
      : `${context.problematicMatchup.summary} Usá ese cruce como material de preparación, no como ruido de fondo.`;
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
- Differentiate clearly between lane state, income, deaths, map connection, lead conversion, champion mastery and objective setup.
- Do not default to objective setup if another leak is better supported by the evidence.
- Use the provided role fundamentals to decide what matters most for this player before you speak.
- If the scope is role-specific, stay inside that role. Do not bring champions from other roles unless you explicitly explain why they are relevant.
- If a problematic matchup is provided, use the exact champion names and explain the matchup in concrete terms instead of falling back to a reusable generic leak.
- If positive signals are provided, surface them only when they are specific and evidence-backed. Do not leave the positive section empty if a real positive pattern exists.
- If a review agenda is provided, convert it into concrete replay questions instead of generic "review your games" advice.
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
      ? 'Use the diagnosis, role fundamentals, patch context, positive signals, review agenda and retrieved coaching knowledge to produce the next coaching block. Write only in English, make the main leak concrete and personalized, keep the read inside the scoped role and picks unless the connection is explicit, surface real strengths when they exist, and if previous coaching exists, update the guidance with continuity instead of restarting from zero.'
      : 'Usá el diagnóstico, los fundamentos del rol, el contexto de parche, las señales positivas, la agenda de review y el conocimiento recuperado para producir el siguiente bloque de coaching. Escribí solo en español, hacé que el problema principal sea concreto y personalizado, mantené la lectura dentro del rol y de los picks del scope salvo conexión explícita, mostrà fortalezas reales cuando existan, y si existe coaching previo, actualizá la guía con continuidad en vez de reiniciarla desde cero.'
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

export async function generateAICoach(input: AICoachRequest, membership: MembershipContext) {
  assertCoachEntitlement(membership, input);
  const storedDataset = await loadProfileSnapshot<StoredDataset>(input.gameName, input.tagLine, input.platform);
  const dataset = storedDataset ? limitDatasetToMembership(storedDataset, membership.plan, input.locale) : null;
  if (!dataset) {
    throw new Error(input.locale === 'en' ? 'No cached analysis was found for that account yet.' : 'Todavía no existe un análisis guardado para esa cuenta.');
  }

  const context = await buildCoachContext(dataset, input);
  const previousGeneration = await loadLatestAICoachingGenerationForRequest({
    viewerId: membership.viewerId,
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
    viewerId: membership.viewerId
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
  let processing = decideProcessingPolicy(input, context, monthlyUsage, newVisibleMatchIds.length, Boolean(previousGeneration), membership);
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
    viewerId: membership.viewerId,
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
