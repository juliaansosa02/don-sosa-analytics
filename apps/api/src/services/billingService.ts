import { createHmac, timingSafeEqual } from 'node:crypto';
import { getMembershipPlan, type MembershipPlanId } from '@don-sosa/core';
import { env } from '../config/env.js';
import { HttpError } from '../lib/http.js';
import { loadUserById, type AuthUserRecord } from './authStore.js';
import { buildUserSubjectId } from './authService.js';
import {
  loadMembershipAccount,
  loadMembershipAccountByStripeCustomerId,
  loadMembershipAccountByStripeSubscriptionId,
  saveMembershipAccount
} from './membershipStore.js';

const stripeApiBase = 'https://api.stripe.com/v1';

interface StripeListResponse<T> {
  data: T[];
}

interface StripePrice {
  id: string;
  lookup_key: string | null;
}

function getStripeHeaders() {
  if (!env.STRIPE_SECRET_KEY) {
    throw new HttpError(501, 'billing://stripe-not-configured', 'Stripe no está configurado todavía.');
  }

  return {
    Authorization: `Bearer ${env.STRIPE_SECRET_KEY}`
  };
}

async function stripeFormRequest<T>(path: string, body: URLSearchParams) {
  const response = await fetch(`${stripeApiBase}${path}`, {
    method: 'POST',
    headers: {
      ...getStripeHeaders(),
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body
  });

  const text = await response.text();
  if (!response.ok) {
    throw new HttpError(response.status, `${stripeApiBase}${path}`, text);
  }

  return JSON.parse(text) as T;
}

async function stripeGet<T>(path: string) {
  const response = await fetch(`${stripeApiBase}${path}`, {
    headers: getStripeHeaders()
  });
  const text = await response.text();
  if (!response.ok) {
    throw new HttpError(response.status, `${stripeApiBase}${path}`, text);
  }
  return JSON.parse(text) as T;
}

async function resolveStripePriceId(planId: MembershipPlanId) {
  const plan = getMembershipPlan(planId);
  const prices = await stripeGet<StripeListResponse<StripePrice>>(
    `/prices?lookup_keys[0]=${encodeURIComponent(plan.billing.stripePriceLookupKey)}&active=true&limit=1`
  );
  const price = prices.data[0];
  if (!price?.id) {
    throw new HttpError(500, 'billing://missing-stripe-price', `No encontramos un price activo en Stripe para ${plan.id}.`);
  }
  return price.id;
}

async function ensureStripeCustomer(user: AuthUserRecord, stripeCustomerId?: string | null) {
  if (stripeCustomerId) return stripeCustomerId;

  const body = new URLSearchParams();
  body.set('email', user.email);
  body.set('name', user.displayName);
  body.set('metadata[userId]', user.id);
  body.set('metadata[email]', user.email);
  const customer = await stripeFormRequest<{ id: string }>('/customers', body);
  return customer.id;
}

function mapStripeSubscriptionStatus(status: string | null | undefined): 'active' | 'trialing' | 'past_due' | 'canceled' | 'inactive' {
  switch (status) {
    case 'trialing':
      return 'trialing';
    case 'active':
      return 'active';
    case 'past_due':
    case 'unpaid':
      return 'past_due';
    case 'canceled':
      return 'canceled';
    default:
      return 'inactive';
  }
}

export async function createStripeCheckoutSession(input: {
  user: AuthUserRecord;
  planId: MembershipPlanId;
}) {
  if (input.planId === 'free') {
    throw new HttpError(400, 'billing://free-plan', 'El plan Free no necesita checkout.');
  }

  const subjectId = buildUserSubjectId(input.user.id);
  const currentAccount = await loadMembershipAccount(subjectId);
  const stripeCustomerId = await ensureStripeCustomer(input.user, currentAccount?.stripeCustomerId ?? null);
  const stripePriceId = await resolveStripePriceId(input.planId);
  const successUrl = env.STRIPE_SUCCESS_URL ?? `${env.APP_BASE_URL}/?billing=success`;
  const cancelUrl = env.STRIPE_CANCEL_URL ?? `${env.APP_BASE_URL}/?billing=cancel`;

  const body = new URLSearchParams();
  body.set('mode', 'subscription');
  body.set('customer', stripeCustomerId);
  body.set('success_url', successUrl);
  body.set('cancel_url', cancelUrl);
  body.set('allow_promotion_codes', 'true');
  body.set('client_reference_id', input.user.id);
  body.set('metadata[userId]', input.user.id);
  body.set('metadata[planId]', input.planId);
  body.set('line_items[0][price]', stripePriceId);
  body.set('line_items[0][quantity]', '1');
  body.set('subscription_data[metadata][userId]', input.user.id);
  body.set('subscription_data[metadata][planId]', input.planId);

  const session = await stripeFormRequest<{ id: string; url: string }>('/checkout/sessions', body);

  await saveMembershipAccount({
    viewerId: subjectId,
    planId: currentAccount?.planId ?? 'free',
    status: currentAccount?.status ?? 'inactive',
    source: currentAccount?.source ?? 'default',
    billingProvider: 'stripe',
    stripeCustomerId,
    stripeSubscriptionId: currentAccount?.stripeSubscriptionId ?? null,
    stripePriceId,
    currentPeriodEnd: currentAccount?.currentPeriodEnd ?? null,
    createdAt: currentAccount?.createdAt
  });

  return session;
}

export function verifyStripeWebhookSignature(rawBody: Buffer, signatureHeader: string | undefined) {
  if (!env.STRIPE_WEBHOOK_SECRET) {
    throw new HttpError(501, 'billing://webhook-not-configured', 'Stripe webhook secret no configurado.');
  }

  if (!signatureHeader) {
    throw new HttpError(400, 'billing://missing-signature', 'Falta la firma de Stripe.');
  }

  const parts = Object.fromEntries(signatureHeader.split(',').map((part) => {
    const [key, value] = part.split('=');
    return [key, value];
  }));

  const timestamp = parts.t;
  const signature = parts.v1;
  if (!timestamp || !signature) {
    throw new HttpError(400, 'billing://invalid-signature', 'La firma de Stripe no es válida.');
  }

  const payload = `${timestamp}.${rawBody.toString('utf8')}`;
  const expected = createHmac('sha256', env.STRIPE_WEBHOOK_SECRET).update(payload).digest('hex');
  const left = Buffer.from(expected, 'hex');
  const right = Buffer.from(signature, 'hex');
  if (left.length !== right.length || !timingSafeEqual(left, right)) {
    throw new HttpError(400, 'billing://invalid-signature', 'La firma de Stripe no coincide.');
  }

  return JSON.parse(rawBody.toString('utf8')) as {
    type: string;
    data: {
      object: {
        id: string;
        customer?: string;
        current_period_end?: number;
        status?: string;
        metadata?: Record<string, string>;
        items?: {
          data?: Array<{
            price?: {
              id?: string;
            };
          }>;
        };
        subscription?: string;
      };
    };
  };
}

async function syncStripeMembershipFromObject(object: {
  id: string;
  customer?: string;
  current_period_end?: number;
  status?: string;
  metadata?: Record<string, string>;
  items?: {
    data?: Array<{
      price?: {
        id?: string;
      };
    }>;
  };
  subscription?: string;
}) {
  const subscriptionId = object.subscription ?? object.id;
  const customerId = object.customer;
  const metadataPlanId = object.metadata?.planId as MembershipPlanId | undefined;
  const metadataUserId = object.metadata?.userId;
  const subjectId = metadataUserId ? buildUserSubjectId(metadataUserId) : null;

  const existingAccount = subjectId
    ? await loadMembershipAccount(subjectId)
    : customerId
      ? await loadMembershipAccountByStripeCustomerId(customerId)
      : subscriptionId
        ? await loadMembershipAccountByStripeSubscriptionId(subscriptionId)
        : null;

  if (!existingAccount && !subjectId) {
    return;
  }

  const planId = metadataPlanId ?? existingAccount?.planId ?? 'free';
  const viewerId = subjectId ?? existingAccount!.viewerId;
  await saveMembershipAccount({
    viewerId,
    planId,
    status: mapStripeSubscriptionStatus(object.status),
    source: 'stripe',
    billingProvider: 'stripe',
    stripeCustomerId: customerId ?? existingAccount?.stripeCustomerId ?? null,
    stripeSubscriptionId: subscriptionId ?? existingAccount?.stripeSubscriptionId ?? null,
    stripePriceId: object.items?.data?.[0]?.price?.id ?? existingAccount?.stripePriceId ?? null,
    currentPeriodEnd: object.current_period_end ? new Date(object.current_period_end * 1000).toISOString() : existingAccount?.currentPeriodEnd ?? null,
    createdAt: existingAccount?.createdAt
  });
}

export async function handleStripeWebhook(rawBody: Buffer, signatureHeader: string | undefined) {
  const event = verifyStripeWebhookSignature(rawBody, signatureHeader);

  switch (event.type) {
    case 'checkout.session.completed':
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
    case 'customer.subscription.deleted':
      await syncStripeMembershipFromObject(event.data.object);
      break;
    default:
      break;
  }

  return { received: true as const, type: event.type };
}

export async function createStripeBillingPortalSession(userId: string) {
  const subjectId = buildUserSubjectId(userId);
  const account = await loadMembershipAccount(subjectId);
  if (!account?.stripeCustomerId) {
    throw new HttpError(400, 'billing://no-customer', 'La cuenta todavía no tiene customer de Stripe.');
  }

  const body = new URLSearchParams();
  body.set('customer', account.stripeCustomerId);
  body.set('return_url', env.APP_BASE_URL);
  return stripeFormRequest<{ id: string; url: string }>('/billing_portal/sessions', body);
}
