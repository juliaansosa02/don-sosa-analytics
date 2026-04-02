import { Router } from 'express';
import { z } from 'zod';
import { membershipPlanOrder, type MembershipPlanId } from '@don-sosa/core';
import { env } from '../config/env.js';
import { buildBillingCapabilities, getMembershipCatalog, resolveMembershipContext, resolveViewerId, setViewerPlanForDev } from '../services/membershipService.js';
import { loadAICoachUsageForMonth } from '../services/aiCoachStore.js';
import { getAuthContext } from '../services/authService.js';

const membershipPlanTuple = ['free', 'pro_player', 'pro_coach'] as const satisfies readonly [MembershipPlanId, ...MembershipPlanId[]];
const paidMembershipPlanTuple = ['pro_player', 'pro_coach'] as const;

const devPlanSchema = z.object({
  planId: z.enum(membershipPlanTuple)
});

const billingIntentSchema = z.object({
  planId: z.enum(paidMembershipPlanTuple)
});

export const membershipRouter = Router();

membershipRouter.get('/catalog', (_req, res) => {
  res.json({
    plans: getMembershipCatalog(),
    order: membershipPlanOrder,
    billing: buildBillingCapabilities()
  });
});

membershipRouter.get('/me', async (req, res) => {
  try {
    const membership = await resolveMembershipContext(req);
    const usage = await loadAICoachUsageForMonth({ viewerId: membership.viewerId });
    const auth = getAuthContext(req);

    res.json({
      viewerId: membership.viewerId,
      subjectId: membership.viewerId,
      authenticated: auth.isAuthenticated,
      account: membership.account,
      actualPlan: membership.actualPlan,
      plan: membership.plan,
      linkedProfiles: membership.linkedProfiles,
      usage,
      billing: buildBillingCapabilities(),
      devToolsEnabled: env.MEMBERSHIP_DEV_TOOLS,
      overrideReason: membership.actualPlan.id !== membership.plan.id ? 'admin_full_access' : null
    });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

membershipRouter.post('/dev/plan', async (req, res) => {
  try {
    if (!env.MEMBERSHIP_DEV_TOOLS) {
      res.status(403).json({ error: 'Dev membership tools are disabled.' });
      return;
    }

    const input = devPlanSchema.parse(req.body);
    const viewerId = resolveViewerId(req);
    const account = await setViewerPlanForDev(viewerId, input.planId);
    const membership = await resolveMembershipContext(req);

    res.json({
      ok: true,
      account,
      plan: membership.plan
    });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});

membershipRouter.post('/billing/checkout-session', async (req, res) => {
  try {
    const input = billingIntentSchema.parse(req.body);
    if (!env.STRIPE_SECRET_KEY) {
      res.status(501).json({
        error: 'Stripe is not configured yet.',
        planId: input.planId,
        billing: buildBillingCapabilities()
      });
      return;
    }

    res.status(501).json({
      error: 'Stripe checkout is not wired yet, but the billing contract is ready for implementation.',
      planId: input.planId,
      billing: buildBillingCapabilities()
    });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
  }
});
