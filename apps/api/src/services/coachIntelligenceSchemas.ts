import { z } from 'zod';
import {
  coachRoleSchema,
  diagnosisFocusMetricSchema,
  knowledgeSignalSchema,
  localizedTextSchema,
  skillBracketSchema
} from './coachKnowledgeSchemas.js';

export const taxonomyPriorityBandSchema = z.enum(['foundational', 'structural', 'advanced']);
export type TaxonomyPriorityBand = z.infer<typeof taxonomyPriorityBandSchema>;

export const intelligenceDetectionModeSchema = z.enum(['measured', 'proxy', 'blocked']);
export type IntelligenceDetectionMode = z.infer<typeof intelligenceDetectionModeSchema>;

export const intelligenceReviewDepthSchema = z.enum(['quick_review', 'coach_review', 'deep_vod_review']);
export type IntelligenceReviewDepth = z.infer<typeof intelligenceReviewDepthSchema>;

export const intelligenceSignalStateSchema = z.enum([
  'stable_signal',
  'stable_leak',
  'emerging_regression',
  'recent_anomaly',
  'improving',
  'volatile'
]);
export type IntelligenceSignalState = z.infer<typeof intelligenceSignalStateSchema>;

export const intelligenceLanguageModeSchema = z.enum(['fundamental', 'scaffolded', 'direct', 'optimization']);
export type IntelligenceLanguageMode = z.infer<typeof intelligenceLanguageModeSchema>;

export const intelligenceUrgencySchema = z.enum(['play_now', 'next_block', 'later', 'watch']);
export type IntelligenceUrgency = z.infer<typeof intelligenceUrgencySchema>;

export const intelligenceKnowledgeScopeSchema = z.enum(['evergreen', 'patch', 'champion', 'role', 'elo', 'sample']);
export type IntelligenceKnowledgeScope = z.infer<typeof intelligenceKnowledgeScopeSchema>;

export const problemTaxonomyEntrySchema = z.object({
  id: z.string().min(1),
  label: localizedTextSchema,
  summary: localizedTextSchema,
  priorityBand: taxonomyPriorityBandSchema,
  focusMetrics: z.array(diagnosisFocusMetricSchema).min(1),
  roleBias: z.array(coachRoleSchema).default([]),
  championArchetypes: z.array(z.string().min(1)).default([]),
  skillBrackets: z.array(z.union([skillBracketSchema, z.literal('all')])).default(['all']),
  requiredSignals: z.array(knowledgeSignalSchema).default([]),
  quickReviewPrompts: z.array(localizedTextSchema).min(1),
  coachReviewPrompts: z.array(localizedTextSchema).min(1),
  deepVodPrompts: z.array(localizedTextSchema).min(1)
});
export type ProblemTaxonomyEntry = z.infer<typeof problemTaxonomyEntrySchema>;

export const referenceRegistryEntrySchema = z.object({
  id: z.string().min(1),
  scope: intelligenceKnowledgeScopeSchema,
  label: localizedTextSchema,
  source: z.string().min(1),
  version: z.string().min(1),
  note: localizedTextSchema,
  upgradePath: localizedTextSchema
});
export type ReferenceRegistryEntry = z.infer<typeof referenceRegistryEntrySchema>;

export interface CoachProblemTypeHit {
  taxonomyId: string;
  label: string;
  summary: string;
  confidence: number;
  priorityBand: TaxonomyPriorityBand;
  detectionMode: IntelligenceDetectionMode;
  reasons: string[];
  missingSignals: string[];
}

export interface CoachProblemMapping {
  problemId: string;
  focusMetric: string | null;
  detectedTypes: CoachProblemTypeHit[];
  candidateTypes: CoachProblemTypeHit[];
  blockedTypes: CoachProblemTypeHit[];
}

export interface CoachSignalStabilityEntry {
  metric: string;
  label: string;
  measurementType: 'measured' | 'derived' | 'proxy';
  state: IntelligenceSignalState;
  baselineValue: number | null;
  recentValue: number | null;
  delta: number | null;
  summary: string;
}

export interface CoachReferenceFrame {
  id: string;
  scope: IntelligenceKnowledgeScope;
  label: string;
  version: string;
  source: string;
  status: 'active' | 'weak' | 'scaffold_only' | 'missing';
  justification: string;
  nextUpgrade: string | null;
}

export interface CoachInterventionItem {
  problemId: string;
  focusMetric: string | null;
  title: string;
  urgency: IntelligenceUrgency;
  recommendedDepth: IntelligenceReviewDepth;
  languageMode: IntelligenceLanguageMode;
  score: number;
  taxonomyIds: string[];
  stability: IntelligenceSignalState;
  reasons: string[];
}

export interface CoachReviewLayerPlan {
  layer: IntelligenceReviewDepth;
  objective: string;
  prompts: string[];
  anchors: string[];
}

export interface CoachIntelligenceSummary {
  intelligenceVersion: string;
  languagePlan: {
    mode: IntelligenceLanguageMode;
    explanationStyle: string;
    priorityRule: string;
    avoid: string[];
  };
  taxonomy: {
    primaryProblemId: string | null;
    mappedProblems: CoachProblemMapping[];
  };
  interventionPlan: {
    primaryObjective: string;
    whyNow: string[];
    queue: CoachInterventionItem[];
    suppressed: CoachInterventionItem[];
  };
  reviewPlan: {
    quickReview: CoachReviewLayerPlan;
    coachReview: CoachReviewLayerPlan;
    deepVodReview: CoachReviewLayerPlan;
  };
  signalStability: {
    overallState: IntelligenceSignalState;
    summary: string;
    primarySignal: CoachSignalStabilityEntry | null;
    signals: CoachSignalStabilityEntry[];
  };
  referenceFrames: CoachReferenceFrame[];
  metaReadiness: {
    status: 'ready' | 'partial' | 'missing';
    availableSignals: string[];
    missingSignals: string[];
    futureSources: string[];
  };
}
