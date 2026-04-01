import { buildAggregateSummary, getMembershipPlan, membershipPlanCatalog, membershipPlanOrder, type MembershipPlanDefinition, type MembershipPlanId } from '@don-sosa/core';
import type { Request } from 'express';
import { HttpError } from '../lib/http.js';
import { buildProfileStorageKey, normalizeRiotPlatform } from '../lib/riotRouting.js';
import { env } from '../config/env.js';
import { listViewerProfileLinks, loadMembershipAccount, saveMembershipAccount, touchViewerProfileLink, type MembershipAccountRecord } from './membershipStore.js';
import type { collectPlayerSnapshot } from './collectionService.js';
import type { AICoachRequest } from './aiCoachSchemas.js';

type StoredDataset = Awaited<ReturnType<typeof collectPlayerSnapshot>>;

export interface MembershipContext {
  viewerId: string;
  account: MembershipAccountRecord;
  plan: MembershipPlanDefinition;
  linkedProfiles: Awaited<ReturnType<typeof listViewerProfileLinks>>;
}

export function resolveViewerId(req: Request) {
  const raw = req.header('x-don-sosa-client-id')?.trim();
  if (raw) return raw.slice(0, 128);
  return 'anon-viewer';
}

export async function resolveMembershipContext(req: Request): Promise<MembershipContext> {
  const viewerId = resolveViewerId(req);
  const existingAccount = await loadMembershipAccount(viewerId);
  const account = existingAccount ?? await saveMembershipAccount({
    viewerId,
    planId: 'free',
    status: 'active',
    source: 'default',
    billingProvider: null
  });
  const linkedProfiles = await listViewerProfileLinks(viewerId);
  return {
    viewerId,
    account,
    plan: getMembershipPlan(account.planId),
    linkedProfiles
  };
}

export function getMembershipCatalog() {
  return membershipPlanOrder.map((planId) => membershipPlanCatalog[planId]);
}

export async function setViewerPlanForDev(viewerId: string, planId: MembershipPlanId) {
  const current = await loadMembershipAccount(viewerId);
  return saveMembershipAccount({
    viewerId,
    planId,
    status: 'active',
    source: 'dev_override',
    billingProvider: current?.billingProvider ?? null,
    stripeCustomerId: current?.stripeCustomerId ?? null,
    stripeSubscriptionId: current?.stripeSubscriptionId ?? null,
    stripePriceId: current?.stripePriceId ?? null,
    currentPeriodEnd: current?.currentPeriodEnd ?? null,
    createdAt: current?.createdAt
  });
}

export function assertCollectionEntitlement(context: MembershipContext, input: {
  gameName: string;
  tagLine: string;
  platform?: string;
  count: number;
  locale?: 'es' | 'en';
}) {
  const locale = input.locale ?? 'es';
  const normalizedPlatform = normalizeRiotPlatform(input.platform);
  const profileKey = buildProfileStorageKey(input.gameName, input.tagLine, normalizedPlatform);
  const alreadyLinked = context.linkedProfiles.some((profile) => profile.profileKey === profileKey);

  if (!alreadyLinked && context.linkedProfiles.length >= context.plan.entitlements.maxStoredProfiles) {
    throw new HttpError(
      403,
      'membership://profile-limit',
      locale === 'en'
        ? `Your ${context.plan.name} plan allows up to ${context.plan.entitlements.maxStoredProfiles} saved profiles. Upgrade to store more accounts.`
        : `Tu plan ${context.plan.name} permite hasta ${context.plan.entitlements.maxStoredProfiles} perfiles guardados. Mejorá el plan para guardar más cuentas.`
    );
  }

  if (input.count > context.plan.entitlements.maxStoredMatchesPerProfile) {
    throw new HttpError(
      403,
      'membership://match-limit',
      locale === 'en'
        ? `Your ${context.plan.name} plan allows up to ${context.plan.entitlements.maxStoredMatchesPerProfile} matches per profile.`
        : `Tu plan ${context.plan.name} permite hasta ${context.plan.entitlements.maxStoredMatchesPerProfile} partidas por perfil.`
    );
  }

  return { profileKey, alreadyLinked };
}

export async function registerViewedProfile(context: MembershipContext, input: {
  gameName: string;
  tagLine: string;
  platform: string;
}) {
  await touchViewerProfileLink({
    viewerId: context.viewerId,
    profileKey: buildProfileStorageKey(input.gameName, input.tagLine, input.platform),
    gameName: input.gameName,
    tagLine: input.tagLine,
    platform: input.platform
  });
}

export function limitDatasetToMembership(dataset: StoredDataset, plan: MembershipPlanDefinition, locale: 'es' | 'en') {
  const cap = plan.entitlements.maxStoredMatchesPerProfile;
  if (dataset.matches.length <= cap) return dataset;

  const limitedMatches = [...dataset.matches].sort((a, b) => b.gameCreation - a.gameCreation).slice(0, cap);
  return {
    ...dataset,
    matches: limitedMatches,
    summary: buildAggregateSummary(dataset.player, dataset.tagLine, dataset.summary.region, dataset.summary.platform, limitedMatches, locale)
  };
}

export function assertCoachEntitlement(context: MembershipContext, input: Pick<AICoachRequest, 'locale' | 'coachRoles'>) {
  if (!context.plan.entitlements.canUseAICoach) {
    throw new HttpError(
      403,
      'membership://coach-disabled',
      input.locale === 'en'
        ? `Your ${context.plan.name} plan does not include AI coaching.`
        : `Tu plan ${context.plan.name} no incluye coaching IA.`
    );
  }

  if ((input.coachRoles?.length ?? 0) > context.plan.entitlements.maxCoachRoles) {
    throw new HttpError(
      403,
      'membership://coach-roles',
      input.locale === 'en'
        ? `Your ${context.plan.name} plan allows up to ${context.plan.entitlements.maxCoachRoles} coaching role${context.plan.entitlements.maxCoachRoles === 1 ? '' : 's'} per block.`
        : `Tu plan ${context.plan.name} permite hasta ${context.plan.entitlements.maxCoachRoles} rol${context.plan.entitlements.maxCoachRoles === 1 ? '' : 'es'} de coaching por bloque.`
    );
  }
}

export function buildBillingCapabilities() {
  return {
    provider: 'stripe' as const,
    ready: Boolean(env.STRIPE_SECRET_KEY),
    webhookReady: Boolean(env.STRIPE_WEBHOOK_SECRET)
  };
}
