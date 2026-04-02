import { z } from 'zod';
import { supportedRiotPlatformTuple } from '../lib/riotRouting.js';
import type { CoachDiagnosisSummary, CoachKnowledgeContext } from './coachKnowledgeSchemas.js';

export const knowledgeCardSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  language: z.enum(['es', 'en']).default('en'),
  role: z.enum(['ALL', 'JUNGLE', 'TOP', 'MIDDLE', 'BOTTOM', 'UTILITY']),
  champion: z.string().nullable().optional(),
  matchup: z.string().nullable().optional(),
  phase: z.enum(['draft', 'early_game', 'mid_game', 'late_game', 'macro', 'review']),
  concept: z.string().min(1),
  skillLevel: z.enum(['all', 'silver_plus', 'gold_plus', 'emerald_plus', 'diamond_plus']).default('all'),
  patchSensitivity: z.enum(['evergreen', 'meta_sensitive', 'system_sensitive']).default('evergreen'),
  patch: z.string().nullable().optional(),
  validFromPatch: z.string().nullable().optional(),
  validToPatch: z.string().nullable().optional(),
  tags: z.array(z.string().min(1)).default([]),
  body: z.string().min(1),
  actionables: z.array(z.string().min(1)).min(1),
  source: z.object({
    coach: z.string().min(1),
    title: z.string().min(1),
    url: z.string().url().optional(),
    notes: z.string().optional()
  })
});

export type KnowledgeCard = z.infer<typeof knowledgeCardSchema>;

export const aiCoachRequestSchema = z.object({
  gameName: z.string().min(1),
  tagLine: z.string().min(1),
  platform: z.string().trim().transform((value) => value.toUpperCase()).pipe(z.enum(supportedRiotPlatformTuple)).default('LA2'),
  locale: z.enum(['es', 'en']).default('es'),
  roleFilter: z.string().default('ALL'),
  coachRoles: z.array(z.string().min(1)).max(2).default([]),
  queueFilter: z.enum(['ALL', 'RANKED', 'RANKED_SOLO', 'RANKED_FLEX', 'OTHER']).default('ALL'),
  windowFilter: z.enum(['ALL', 'LAST_20', 'LAST_8']).default('ALL'),
  providerMode: z.enum(['auto', 'openai', 'draft']).default('auto')
});

export type AICoachRequest = z.infer<typeof aiCoachRequestSchema>;

export const aiCoachFeedbackSchema = z.object({
  generationId: z.string().min(1),
  verdict: z.enum(['useful', 'mixed', 'generic', 'incorrect']),
  notes: z.string().max(2000).optional()
});

export type AICoachFeedback = z.infer<typeof aiCoachFeedbackSchema>;

export const aiCoachOutputSchema = z.object({
  summary: z.string().min(1),
  mainLeak: z.string().min(1),
  whyItHappens: z.string().min(1),
  whatToReview: z.array(z.string().min(1)).min(2).max(5),
  whatToDoNext3Games: z.array(z.string().min(1)).min(2).max(5),
  championSpecificNote: z.string().nullable(),
  matchupSpecificNote: z.string().nullable(),
  grounding: z.array(z.string().min(1)).min(2).max(6),
  knowledgeCardIds: z.array(z.string().min(1)).max(10),
  confidence: z.number().min(0).max(1)
});

export type AICoachOutput = z.infer<typeof aiCoachOutputSchema>;

export interface PatchChampionUpdate {
  championName: string;
  changeType: 'buff' | 'nerf' | 'adjustment' | 'rework';
  roles: string[];
  summary: string;
  impactLevel: 'low' | 'medium' | 'high';
}

export interface PatchSystemUpdate {
  category: string;
  summary: string;
  impactLevel: 'low' | 'medium' | 'high';
}

export interface AICoachPatchContext {
  currentPatch: string;
  sourceUrl: string;
  summary: string[];
  relevantChampionUpdates: PatchChampionUpdate[];
  relevantSystemUpdates: PatchSystemUpdate[];
  note: string;
}

export interface AICoachContext {
  player: {
    gameName: string;
    tagLine: string;
    platform: string;
    regionalRoute: string;
    locale: 'es' | 'en';
    roleFilter: string;
    coachRoles: string[];
    roleScopeLabel: string;
    queueFilter: 'ALL' | 'RANKED' | 'RANKED_SOLO' | 'RANKED_FLEX' | 'OTHER';
    windowFilter: 'ALL' | 'LAST_20' | 'LAST_8';
    visibleMatches: number;
    rankLabel?: string;
    highestTier?: string;
    highestLp?: number;
    primaryRole?: string;
    anchorChampion?: string | null;
    profileStrength: 'developing' | 'advanced' | 'elite';
    profileStrengthReasons: string[];
  };
  performance: {
    winRate: number;
    avgPerformance: number;
    avgCsAt15: number;
    avgGoldAt15: number;
    avgGoldDiffAt15: number;
    avgLevelDiffAt15: number;
    avgKillParticipation: number;
    avgDeathsPre14: number;
    avgLaneDeathsPre10: number;
    avgObjectiveFightDeaths: number;
    consistencyIndex: number;
  };
  coaching: {
    headline: string;
    subheadline: string;
    topProblems: Array<{
      id: string;
      problem: string;
      title: string;
      category: string;
      priority: string;
      evidence: string[];
      impact: string;
      cause: string;
      actions: string[];
      focusMetric?: string;
      winRateDelta?: number;
    }>;
    activePlan: {
      focus: string;
      objective: string;
      targetGames: number;
      completedGames: number;
      progressPercent: number;
      successLabel: string;
    } | null;
    trend: {
      baselineMatches: number;
      recentMatches: number;
      baselineScore: number;
      recentScore: number;
      scoreDelta: number;
      baselineWinRate: number;
      recentWinRate: number;
      winRateDelta: number;
      baselineConsistency: number;
      recentConsistency: number;
      consistencyDelta: number;
      baselineCsAt15: number;
      recentCsAt15: number;
      csAt15Delta: number;
      baselineGoldAt15: number;
      recentGoldAt15: number;
      goldAt15Delta: number;
      baselineKillParticipation: number;
      recentKillParticipation: number;
      killParticipationDelta: number;
      baselineDeathsPre14: number;
      recentDeathsPre14: number;
      deathsPre14Delta: number;
    };
  };
  positiveSignals: Array<{
    id: string;
    problem: string;
    title: string;
    category: string;
    priority: string;
    evidence: string[];
    impact: string;
    cause: string;
    actions: string[];
    focusMetric?: string;
    winRateDelta?: number;
  }>;
  reviewAgenda: Array<{
    matchId: string;
    championName: string;
    opponentChampionName?: string;
    gameCreation: number;
    win: boolean;
    kills: number;
    deaths: number;
    assists: number;
    cs: number;
    damageToChampions: number;
    killParticipation: number;
    performanceScore: number;
    title: string;
    reason: string;
    question: string;
    focus: string;
    tags: string[];
  }>;
  championPool: Array<{
    championName: string;
    games: number;
    winRate: number;
    avgScore: number;
    avgCsAt15: number;
    avgDeathsPre14: number;
      classification: string;
    }>;
  problematicMatchup: {
    opponentChampionName: string;
    championName: string;
    recentGames: number;
    recentWins: number;
    recentLosses: number;
    recentWinRate: number;
    directGames: number;
    directWins: number;
    directLosses: number;
    directWinRate: number | null;
    avgCsAt15: number;
    avgGoldDiffAt15: number;
    avgLevelDiffAt15: number;
    avgDeathsPre14: number;
    summary: string;
    adjustments: string[];
  } | null;
  matchupAlert: {
    opponentChampionName: string;
    games: number;
    winRate: number;
    avgGoldDiffAt15: number;
    avgLevelDiffAt15: number;
  } | null;
  recentMatches: Array<{
    matchId: string;
    championName: string;
    opponentChampionName?: string;
    win: boolean;
    csAt15: number;
    goldAt15: number;
    deathsPre14: number;
    goldDiffAt15: number;
    levelDiffAt15: number;
    score: number;
  }>;
  roleLenses: Array<{
    role: string;
    fundamentals: string[];
  }>;
  sample: {
    visibleMatchIds: string[];
    sampleSignature: string;
    latestMatchId: string | null;
    latestGameCreation: number | null;
  };
  patchContext: AICoachPatchContext;
  knowledge: CoachKnowledgeContext;
  diagnosis: CoachDiagnosisSummary;
}

export interface AICoachContinuity {
  mode: 'fresh' | 'updated' | 'reused';
  newVisibleMatches: number;
  previousGenerationId: string | null;
  previousVisibleMatches: number;
}

export interface AICoachProcessingBudget {
  monthKey: string;
  estimatedCostUsd: number;
  budgetUsd: number;
  remainingBudgetUsd: number;
  openaiRuns: number;
  premiumRuns: number;
}

export interface AICoachProcessing {
  mode: 'premium_openai' | 'economy_openai' | 'structured_fallback' | 'cached_reuse';
  tier: 'premium' | 'economy' | 'fallback' | 'cached';
  selectedModel: string | null;
  reason: string;
  budget: AICoachProcessingBudget;
}
