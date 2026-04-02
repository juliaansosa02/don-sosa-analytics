import { Router } from 'express';
import { z } from 'zod';
import { HttpError } from '../lib/http.js';
import { createStripeBillingPortalSession, createStripeCheckoutSession, handleStripeWebhook } from '../services/billingService.js';
import { requireAuthenticatedUser } from '../services/authService.js';

const checkoutSchema = z.object({
  planId: z.enum(['pro_player', 'pro_coach'])
});

export const billingRouter = Router();
export const stripeWebhookRouter = Router();

function getErrorMessage(error: unknown) {
  if (error instanceof HttpError) return error.responseText;
  if (error instanceof Error) return error.message;
  return 'Unknown error';
}

billingRouter.post('/checkout-session', async (req, res) => {
  try {
    const auth = requireAuthenticatedUser(req);
    const input = checkoutSchema.parse(req.body);
    const session = await createStripeCheckoutSession({
      user: auth.actorUser ?? auth.effectiveUser!,
      planId: input.planId
    });
    res.json({ ok: true, session });
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 400;
    res.status(status).json({ error: getErrorMessage(error) });
  }
});

billingRouter.post('/portal-session', async (req, res) => {
  try {
    const auth = requireAuthenticatedUser(req);
    const session = await createStripeBillingPortalSession(auth.effectiveUser!.id);
    res.json({ ok: true, session });
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 400;
    res.status(status).json({ error: getErrorMessage(error) });
  }
});

stripeWebhookRouter.post('/stripe', async (req, res) => {
  try {
    const rawBody = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body ?? '');
    const result = await handleStripeWebhook(rawBody, req.header('stripe-signature') ?? undefined);
    res.json(result);
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 400;
    res.status(status).json({ error: getErrorMessage(error) });
  }
});
