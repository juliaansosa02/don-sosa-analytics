import { Router } from 'express';
import { z } from 'zod';
import { HttpError } from '../lib/http.js';
import {
  addCoachPlayer,
  changePassword,
  getAuthContext,
  getSafeUserFromAuth,
  loginUser,
  removeCoachPlayer,
  logoutUser,
  requestPasswordReset,
  resetPassword,
  signupUser,
  startAdminImpersonation,
  stopAdminImpersonation,
  updateUserRole
} from '../services/authService.js';
import { buildUserSubjectId, listAdminUsers, listCoachRoster, requireRole, resolveAnonymousViewerId } from '../services/authService.js';
import { resolveMembershipContext, resolveMembershipContextForSubject, setViewerPlanForDev } from '../services/membershipService.js';
import { loadAICoachUsageForMonth } from '../services/aiCoachStore.js';

const signupSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().trim().min(2).max(48),
  locale: z.enum(['es', 'en']).default('es')
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

const requestResetSchema = z.object({
  email: z.string().email()
});

const resetPasswordSchema = z.object({
  token: z.string().min(8),
  newPassword: z.string().min(8)
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8)
});

const updateRoleSchema = z.object({
  role: z.enum(['user', 'coach', 'admin'])
});

const updatePlanSchema = z.object({
  planId: z.enum(['free', 'pro_player', 'pro_coach'])
});

const coachLinkSchema = z.object({
  playerEmail: z.string().email(),
  note: z.string().trim().max(240).optional()
});

const impersonateSchema = z.object({
  userId: z.string().uuid()
});

export const authRouter = Router();
export const adminRouter = Router();
export const coachRouter = Router();

function getErrorMessage(error: unknown) {
  if (error instanceof HttpError) return error.responseText;
  if (error instanceof Error) return error.message;
  return 'Unknown error';
}

authRouter.get('/me', async (req, res) => {
  try {
    const auth = getAuthContext(req);
    const membership = await resolveMembershipContext(req);
    res.json({
      authenticated: auth.isAuthenticated,
      user: getSafeUserFromAuth(req),
      actorUser: auth.actorUser ? {
        id: auth.actorUser.id,
        email: auth.actorUser.email,
        displayName: auth.actorUser.displayName,
        role: auth.actorUser.role,
        locale: auth.actorUser.locale,
        emailVerified: auth.actorUser.emailVerified,
        createdAt: auth.actorUser.createdAt,
        updatedAt: auth.actorUser.updatedAt,
        lastLoginAt: auth.actorUser.lastLoginAt ?? null
      } : null,
      isImpersonating: auth.isImpersonating,
      anonymousViewerId: resolveAnonymousViewerId(req),
      membership
    });
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 400;
    res.status(status).json({ error: getErrorMessage(error) });
  }
});

authRouter.post('/signup', async (req, res) => {
  try {
    const input = signupSchema.parse(req.body);
    const user = await signupUser({
      ...input,
      anonymousViewerId: resolveAnonymousViewerId(req)
    }, res);
    const membership = await resolveMembershipContext(req);
    res.status(201).json({ ok: true, user, membership });
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 400;
    res.status(status).json({ error: getErrorMessage(error) });
  }
});

authRouter.post('/login', async (req, res) => {
  try {
    const input = loginSchema.parse(req.body);
    const user = await loginUser({
      ...input,
      anonymousViewerId: resolveAnonymousViewerId(req)
    }, res);
    const membership = await resolveMembershipContext(req);
    res.json({ ok: true, user, membership });
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 400;
    res.status(status).json({ error: getErrorMessage(error) });
  }
});

authRouter.post('/logout', async (req, res) => {
  try {
    await logoutUser(req, res);
    res.json({ ok: true });
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 400;
    res.status(status).json({ error: getErrorMessage(error) });
  }
});

authRouter.post('/password/request-reset', async (req, res) => {
  try {
    const input = requestResetSchema.parse(req.body);
    const result = await requestPasswordReset(input.email);
    res.json(result);
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 400;
    res.status(status).json({ error: getErrorMessage(error) });
  }
});

authRouter.post('/password/reset', async (req, res) => {
  try {
    const input = resetPasswordSchema.parse(req.body);
    const result = await resetPassword(input.token, input.newPassword);
    res.json(result);
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 400;
    res.status(status).json({ error: getErrorMessage(error) });
  }
});

authRouter.post('/password/change', async (req, res) => {
  try {
    const auth = getAuthContext(req);
    if (!auth.effectiveUser) {
      throw new HttpError(401, 'auth://required', 'Necesitás iniciar sesión para cambiar la contraseña.');
    }
    const input = changePasswordSchema.parse(req.body);
    const result = await changePassword(auth.effectiveUser.id, input.currentPassword, input.newPassword);
    res.json(result);
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 400;
    res.status(status).json({ error: getErrorMessage(error) });
  }
});

adminRouter.get('/users', async (req, res) => {
  try {
    requireRole(req, ['admin']);
    const users = await listAdminUsers();
    const enriched = await Promise.all(users.map(async (user) => {
      const membership = await resolveMembershipContextForSubject(buildUserSubjectId(user.id), user.role);
      const usage = await loadAICoachUsageForMonth({ viewerId: buildUserSubjectId(user.id) });
      return {
        user,
        membership,
        usage
      };
    }));
    res.json({ users: enriched });
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 400;
    res.status(status).json({ error: getErrorMessage(error) });
  }
});

adminRouter.post('/users/:userId/role', async (req, res) => {
  try {
    requireRole(req, ['admin']);
    const { userId } = req.params;
    const input = updateRoleSchema.parse(req.body);
    const user = await updateUserRole(userId, input.role);
    res.json({ ok: true, user });
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 400;
    res.status(status).json({ error: getErrorMessage(error) });
  }
});

adminRouter.post('/users/:userId/plan', async (req, res) => {
  try {
    requireRole(req, ['admin']);
    const { userId } = req.params;
    const input = updatePlanSchema.parse(req.body);
    const account = await setViewerPlanForDev(`user:${userId}`, input.planId);
    res.json({ ok: true, account });
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 400;
    res.status(status).json({ error: getErrorMessage(error) });
  }
});

adminRouter.post('/impersonate', async (req, res) => {
  try {
    const input = impersonateSchema.parse(req.body);
    const user = await startAdminImpersonation(req, res, input.userId);
    res.json({ ok: true, user });
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 400;
    res.status(status).json({ error: getErrorMessage(error) });
  }
});

adminRouter.post('/impersonate/stop', async (req, res) => {
  try {
    const user = await stopAdminImpersonation(req, res);
    res.json({ ok: true, user });
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 400;
    res.status(status).json({ error: getErrorMessage(error) });
  }
});

coachRouter.get('/players', async (req, res) => {
  try {
    const players = await listCoachRoster(req);
    res.json({ players });
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 400;
    res.status(status).json({ error: getErrorMessage(error) });
  }
});

coachRouter.post('/players', async (req, res) => {
  try {
    const input = coachLinkSchema.parse(req.body);
    const user = await addCoachPlayer(req, input.playerEmail, input.note);
    res.status(201).json({ ok: true, user });
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 400;
    res.status(status).json({ error: getErrorMessage(error) });
  }
});

coachRouter.delete('/players/:playerUserId', async (req, res) => {
  try {
    const result = await removeCoachPlayer(req, req.params.playerUserId);
    res.json(result);
  } catch (error) {
    const status = error instanceof HttpError ? error.status : 400;
    res.status(status).json({ error: getErrorMessage(error) });
  }
});
