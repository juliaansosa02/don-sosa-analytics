import type { AggregateSummary, ParticipantSnapshot } from '@don-sosa/core';
import type { MembershipPlanDefinition, MembershipPlanId, MembershipStatus } from '@don-sosa/core';

export type MatchSnapshot = ParticipantSnapshot & {
  timeline: ParticipantSnapshot['timeline'] & {
    goldDiffAt15?: number;
    levelDiffAt15?: number;
  };
};

export interface RankSummary {
  label: string;
  queueLabel?: string;
  tier: string;
  division: string;
  leaguePoints: number;
  wins: number;
  losses: number;
  winRate: number;
}

export interface BenchmarkAggregateRecord {
  tier: string;
  role: string;
  queueBucket: 'RANKED_SOLO' | 'RANKED_FLEX' | 'OTHER';
  championName: string | null;
  sampleSize: number;
  avgCsAt15: number;
  avgLevelAt15: number;
  avgGoldAt15: number;
  avgDeathsPre14: number;
}

export interface BenchmarkCatalog {
  source: 'internal';
  note: string;
  totalTrackedEntries: number;
  roleBenchmarks: BenchmarkAggregateRecord[];
  championBenchmarks: BenchmarkAggregateRecord[];
}

export interface Dataset {
  player: string;
  tagLine: string;
  ddragonVersion?: string;
  rawMatchesFetched?: number;
  remakesExcluded?: number;
  profile?: {
    profileIconId: number;
    summonerLevel: number;
  } | null;
  rank?: {
    highest: RankSummary;
    soloQueue: RankSummary;
    flexQueue: RankSummary;
  } | null;
  benchmarks?: BenchmarkCatalog | null;
  summary: AggregateSummary;
  matches: MatchSnapshot[];
}

export interface AICoachResult {
  generationId: string;
  provider: 'draft' | 'openai';
  model: string | null;
  continuity: {
    mode: 'fresh' | 'updated' | 'reused';
    newVisibleMatches: number;
    previousGenerationId: string | null;
    previousVisibleMatches: number;
  };
  processing: {
    mode: 'premium_openai' | 'economy_openai' | 'structured_fallback' | 'cached_reuse';
    tier: 'premium' | 'economy' | 'fallback' | 'cached';
    selectedModel: string | null;
    reason: string;
    budget: {
      monthKey: string;
      estimatedCostUsd: number;
      budgetUsd: number;
      remainingBudgetUsd: number;
      openaiRuns: number;
      premiumRuns: number;
    };
  };
  context: {
    player: {
      visibleMatches: number;
      platform?: string;
      regionalRoute?: string;
      coachRoles?: string[];
      roleScopeLabel?: string;
    };
    patchContext: {
      currentPatch: string;
      sourceUrl: string;
      summary: string[];
      relevantChampionUpdates: Array<{
        championName: string;
        changeType: 'buff' | 'nerf' | 'adjustment' | 'rework';
        roles: string[];
        summary: string;
        impactLevel: 'low' | 'medium' | 'high';
      }>;
      relevantSystemUpdates: Array<{
        category: string;
        summary: string;
        impactLevel: 'low' | 'medium' | 'high';
      }>;
      note: string;
    };
  };
  retrieval: {
    localKnowledgeCount: number;
    localKnowledgeIds: string[];
    usedVectorStore: boolean;
  };
  coach: {
    summary: string;
    mainLeak: string;
    whyItHappens: string;
    whatToReview: string[];
    whatToDoNext3Games: string[];
    championSpecificNote: string | null;
    matchupSpecificNote: string | null;
    grounding: string[];
    knowledgeCardIds: string[];
    confidence: number;
  };
}

export interface MembershipAccount {
  viewerId: string;
  planId: MembershipPlanId;
  status: MembershipStatus;
  source: 'default' | 'dev_override' | 'stripe';
  billingProvider: 'stripe' | null;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  stripePriceId?: string | null;
  currentPeriodEnd?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ViewerProfileLink {
  id: string;
  viewerId: string;
  profileKey: string;
  gameName: string;
  tagLine: string;
  platform: string;
  lastSeenAt: string;
}

export interface MembershipUsageSummary {
  monthKey: string;
  totalGenerations: number;
  openaiGenerations: number;
  premiumGenerations: number;
  estimatedCostUsd: number;
}

export interface MembershipBillingCapabilities {
  provider: 'stripe';
  ready: boolean;
  webhookReady: boolean;
  publishableKeyReady?: boolean;
}

export interface MembershipCatalogResponse {
  plans: MembershipPlanDefinition[];
  order: MembershipPlanId[];
  billing: MembershipBillingCapabilities;
}

export interface MembershipMeResponse {
  viewerId: string;
  subjectId?: string;
  authenticated?: boolean;
  account: MembershipAccount;
  actualPlan?: MembershipPlanDefinition;
  plan: MembershipPlanDefinition;
  linkedProfiles: ViewerProfileLink[];
  usage: MembershipUsageSummary;
  billing: MembershipBillingCapabilities;
  devToolsEnabled: boolean;
  overrideReason?: 'admin_full_access' | null;
}

export type UserRole = 'user' | 'coach' | 'admin';

export interface SafeAuthUser {
  id: string;
  email: string;
  displayName: string;
  role: UserRole;
  locale: 'es' | 'en';
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string | null;
}

export interface AuthMeResponse {
  authenticated: boolean;
  user: SafeAuthUser | null;
  actorUser: SafeAuthUser | null;
  isImpersonating: boolean;
  anonymousViewerId: string | null;
  membership: MembershipMeResponse;
}

export interface AdminUserRecord {
  user: SafeAuthUser;
  membership: MembershipMeResponse;
  usage: MembershipUsageSummary;
}

export interface AdminUsersResponse {
  users: AdminUserRecord[];
}

export interface CoachRosterEntry {
  assignmentId: string;
  note: string | null;
  linkedAt: string;
  user: SafeAuthUser;
}

export interface CoachRosterResponse {
  players: CoachRosterEntry[];
}
