import { z } from 'zod';

export const coachRoleSchema = z.enum(['ALL', 'TOP', 'JUNGLE', 'MIDDLE', 'BOTTOM', 'UTILITY']);
export type CoachRole = z.infer<typeof coachRoleSchema>;

export const diagnosisFocusMetricSchema = z.enum([
  'deaths_pre_10',
  'deaths_pre_14',
  'cs_at_15',
  'gold_diff_at_15',
  'kill_participation',
  'objective_fight_deaths',
  'lead_conversion',
  'champion_pool_stability',
  'matchup_review',
  'primary_pick'
]);
export type DiagnosisFocusMetric = z.infer<typeof diagnosisFocusMetricSchema>;

export const knowledgeSignalSchema = z.enum([
  'match_summary',
  'timeline_gold_xp',
  'objective_windows',
  'items_runes',
  'rank_context',
  'spell_casts',
  'ability_usage',
  'position_frames',
  'ward_events'
]);
export type KnowledgeSignal = z.infer<typeof knowledgeSignalSchema>;

export const skillBracketSchema = z.enum(['low_elo', 'mid_elo', 'high_elo', 'apex']);
export type SkillBracket = z.infer<typeof skillBracketSchema>;

export const localizedTextSchema = z.object({
  en: z.string().min(1),
  es: z.string().min(1)
});
export type LocalizedText = z.infer<typeof localizedTextSchema>;

const focusWeightMapSchema = z.object({
  deaths_pre_10: z.number().min(-1).max(1).optional(),
  deaths_pre_14: z.number().min(-1).max(1).optional(),
  cs_at_15: z.number().min(-1).max(1).optional(),
  gold_diff_at_15: z.number().min(-1).max(1).optional(),
  kill_participation: z.number().min(-1).max(1).optional(),
  objective_fight_deaths: z.number().min(-1).max(1).optional(),
  lead_conversion: z.number().min(-1).max(1).optional(),
  champion_pool_stability: z.number().min(-1).max(1).optional(),
  matchup_review: z.number().min(-1).max(1).optional(),
  primary_pick: z.number().min(-1).max(1).optional()
}).default({});

export type FocusWeightMap = z.infer<typeof focusWeightMapSchema>;

export const roleIdentitySchema = z.object({
  role: coachRoleSchema,
  label: localizedTextSchema,
  csAt15Target: z.number().min(0),
  stableDeathsPre14: z.number().min(0),
  killParticipationTarget: z.number().min(0).max(100),
  goldDiffAt15Target: z.number(),
  levelDiffAt15Target: z.number(),
  evaluationWeights: focusWeightMapSchema,
  fundamentals: z.array(localizedTextSchema).min(2),
  blindSpots: z.array(localizedTextSchema).default([]),
  reviewPrompts: z.array(localizedTextSchema).default([])
});
export type RoleIdentity = z.infer<typeof roleIdentitySchema>;

export const championIdentityHeuristicSchema = z.object({
  id: z.string().min(1),
  title: localizedTextSchema,
  status: z.enum(['active', 'blocked_by_missing_data']),
  requiredSignals: z.array(knowledgeSignalSchema).default([]),
  note: localizedTextSchema
});
export type ChampionIdentityHeuristic = z.infer<typeof championIdentityHeuristicSchema>;

export const championIdentitySchema = z.object({
  championName: z.string().min(1),
  roles: z.array(coachRoleSchema).min(1),
  archetypes: z.array(z.string().min(1)).default([]),
  economyProfile: z.enum(['low_econ', 'standard', 'high_econ']),
  mapProfiles: z.array(z.string().min(1)).default([]),
  evaluationWeights: focusWeightMapSchema,
  performanceAxes: z.array(localizedTextSchema).default([]),
  misreadWarnings: z.array(z.object({
    focusMetric: diagnosisFocusMetricSchema,
    message: localizedTextSchema
  })).default([]),
  priorityNotes: z.array(z.object({
    bracket: z.union([skillBracketSchema, z.literal('all')]),
    message: localizedTextSchema
  })).default([]),
  heuristics: z.array(championIdentityHeuristicSchema).default([])
});
export type ChampionIdentity = z.infer<typeof championIdentitySchema>;

export const eloProfileSchema = z.object({
  bracket: skillBracketSchema,
  tiers: z.array(z.string().min(1)).min(1),
  coachStyle: localizedTextSchema,
  evaluationWeights: focusWeightMapSchema,
  deEmphasizeIfDeathsHigh: z.array(diagnosisFocusMetricSchema).default([]),
  reviewThemes: z.array(localizedTextSchema).default([])
});
export type EloProfile = z.infer<typeof eloProfileSchema>;

export const metaRoleHighlightSchema = z.object({
  role: coachRoleSchema,
  championName: z.string().min(1),
  tier: z.enum(['S', 'A', 'B', 'C']),
  note: localizedTextSchema
});
export type MetaRoleHighlight = z.infer<typeof metaRoleHighlightSchema>;

export const metaChampionBuildSchema = z.object({
  championName: z.string().min(1),
  role: coachRoleSchema,
  coreItems: z.array(z.string().min(1)).default([]),
  situationalItems: z.array(z.string().min(1)).default([]),
  primaryRunes: z.array(z.string().min(1)).default([]),
  secondaryRunes: z.array(z.string().min(1)).default([]),
  note: localizedTextSchema
});
export type MetaChampionBuild = z.infer<typeof metaChampionBuildSchema>;

export const metaPatchReferenceSchema = z.object({
  patch: z.string().min(1),
  updatedAt: z.string().min(1),
  status: z.enum(['ready', 'scaffold_only']),
  summary: localizedTextSchema,
  roleHighlights: z.array(metaRoleHighlightSchema).default([]),
  championBuilds: z.array(metaChampionBuildSchema).default([])
});
export type MetaPatchReference = z.infer<typeof metaPatchReferenceSchema>;

export interface CoachKnowledgeContext {
  knowledgeVersion: string;
  availableSignals: KnowledgeSignal[];
  skillBracket: SkillBracket;
  roleIdentity: {
    role: string;
    label: string;
    csAt15Target: number;
    stableDeathsPre14: number;
    killParticipationTarget: number;
    goldDiffAt15Target: number;
    levelDiffAt15Target: number;
    evaluationWeights: Partial<Record<DiagnosisFocusMetric, number>>;
    fundamentals: string[];
    blindSpots: string[];
    reviewPrompts: string[];
  };
  championIdentity: {
    championName: string;
    roles: string[];
    archetypes: string[];
    economyProfile: 'low_econ' | 'standard' | 'high_econ';
    mapProfiles: string[];
    evaluationWeights: Partial<Record<DiagnosisFocusMetric, number>>;
    performanceAxes: string[];
    misreadWarnings: Array<{
      focusMetric: DiagnosisFocusMetric;
      message: string;
    }>;
    priorityNotes: string[];
    activeHeuristics: Array<{
      id: string;
      title: string;
      note: string;
    }>;
    blockedHeuristics: Array<{
      id: string;
      title: string;
      note: string;
      requiredSignals: KnowledgeSignal[];
    }>;
  } | null;
  eloProfile: {
    bracket: SkillBracket;
    coachStyle: string;
    evaluationWeights: Partial<Record<DiagnosisFocusMetric, number>>;
    deEmphasizeIfDeathsHigh: DiagnosisFocusMetric[];
    reviewThemes: string[];
  };
  metaReference: {
    patch: string | null;
    status: 'ready' | 'scaffold_only' | 'not_configured';
    summary: string;
    roleHighlights: Array<{
      role: string;
      championName: string;
      tier: 'S' | 'A' | 'B' | 'C';
      note: string;
    }>;
    championBuilds: Array<{
      championName: string;
      role: string;
      coreItems: string[];
      situationalItems: string[];
      primaryRunes: string[];
      secondaryRunes: string[];
      note: string;
    }>;
  };
}

export interface CoachDiagnosisIssueSummary {
  problemId: string;
  focusMetric: DiagnosisFocusMetric | null;
  problem: string;
  score: number;
  reasons: string[];
}

export interface CoachDiagnosisSummary {
  primaryIssue: CoachDiagnosisIssueSummary | null;
  rankedIssues: CoachDiagnosisIssueSummary[];
  suppressedIssues: CoachDiagnosisIssueSummary[];
  confidence: number;
  reasonChain: string[];
  dataGaps: string[];
}
