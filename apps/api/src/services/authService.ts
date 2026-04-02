import { createHash, randomBytes, randomUUID, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import type { NextFunction, Request, Response } from 'express';
import { getMembershipPlan } from '@don-sosa/core';
import { env } from '../config/env.js';
import { clearCookie, readCookies, setCookie } from '../lib/cookies.js';
import { HttpError } from '../lib/http.js';
import { buildProfileStorageKey, normalizeRiotPlatform } from '../lib/riotRouting.js';
import { transferAICoachViewerState } from './aiCoachStore.js';
import {
  deleteSession,
  listCoachPlayerAssignments,
  listCoachProfileAssignments,
  listUsers,
  loadPasswordResetTokenByHash,
  loadSessionByTokenHash,
  loadUserByEmail,
  loadUserById,
  removeCoachPlayerAssignmentById,
  removeCoachProfileAssignment,
  saveCoachPlayerAssignment,
  saveCoachProfileAssignment,
  savePasswordResetToken,
  saveSession,
  saveUser,
  type AuthSessionRecord,
  type AuthUserRecord,
  type UserRole
} from './authStore.js';
import { findViewerProfileLink, listViewerProfileLinks, loadMembershipAccount, saveMembershipAccount, transferMembershipState } from './membershipStore.js';

const scrypt = promisify(scryptCallback);
const authContextKey = Symbol.for('don-sosa.auth-context');

export interface AuthContext {
  session: AuthSessionRecord | null;
  actorUser: AuthUserRecord | null;
  effectiveUser: AuthUserRecord | null;
  isAuthenticated: boolean;
  isImpersonating: boolean;
  anonymousViewerId: string | null;
  subjectId: string;
}

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

function getRequestStore(req: Request) {
  return req as Request & { [authContextKey]?: AuthContext };
}

function nowIso() {
  return new Date().toISOString();
}

export function buildUserSubjectId(userId: string) {
  return `user:${userId}`;
}

export function resolveAnonymousViewerId(req: Request) {
  const raw = req.header('x-don-sosa-client-id')?.trim();
  return raw ? raw.slice(0, 128) : null;
}

function hashValue(value: string) {
  return createHash('sha256').update(value).digest('hex');
}

async function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  const derived = await scrypt(password, salt, 64) as Buffer;
  return `scrypt$${salt}$${derived.toString('hex')}`;
}

async function verifyPassword(password: string, passwordHash: string) {
  const [algorithm, salt, expected] = passwordHash.split('$');
  if (algorithm !== 'scrypt' || !salt || !expected) return false;
  const derived = await scrypt(password, salt, 64) as Buffer;
  const expectedBuffer = Buffer.from(expected, 'hex');
  if (derived.length !== expectedBuffer.length) return false;
  return timingSafeEqual(derived, expectedBuffer);
}

function generateOpaqueToken() {
  return randomBytes(32).toString('base64url');
}

function getSessionCookieName() {
  return env.SESSION_COOKIE_NAME;
}

function getSessionTtlSeconds() {
  return Math.max(60, Math.floor(env.SESSION_TTL_DAYS * 24 * 60 * 60));
}

function setSessionCookie(res: Response, token: string) {
  setCookie(res, getSessionCookieName(), token, {
    maxAgeSeconds: getSessionTtlSeconds(),
    httpOnly: true,
    sameSite: 'Lax',
    secure: process.env.NODE_ENV === 'production'
  });
}

function clearSessionCookie(res: Response) {
  clearCookie(res, getSessionCookieName(), {
    secure: process.env.NODE_ENV === 'production'
  });
}

function parseSessionToken(req: Request) {
  const cookies = readCookies(req);
  const token = cookies[getSessionCookieName()];
  return token?.trim() ? token.trim() : null;
}

function sanitizeUser(user: AuthUserRecord): SafeAuthUser {
  return {
    id: user.id,
    email: user.email,
    displayName: user.displayName,
    role: user.role,
    locale: user.locale,
    emailVerified: user.emailVerified,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    lastLoginAt: user.lastLoginAt ?? null
  };
}

async function migrateAnonymousViewerIntoUser(anonymousViewerId: string | null, userId: string) {
  if (!anonymousViewerId) return;
  const userSubjectId = buildUserSubjectId(userId);
  await Promise.all([
    transferMembershipState(anonymousViewerId, userSubjectId),
    transferAICoachViewerState(anonymousViewerId, userSubjectId)
  ]);
}

async function createSessionForUser(userId: string, res: Response, impersonatedUserId?: string | null) {
  const token = generateOpaqueToken();
  const expiresAt = new Date(Date.now() + getSessionTtlSeconds() * 1000).toISOString();
  await saveSession({
    userId,
    tokenHash: hashValue(token),
    impersonatedUserId: impersonatedUserId ?? null,
    expiresAt
  });
  setSessionCookie(res, token);
}

async function touchUserLogin(user: AuthUserRecord) {
  return saveUser({
    ...user,
    lastLoginAt: nowIso(),
    createdAt: user.createdAt
  });
}

export async function attachAuthContext(req: Request, _res: Response, next: NextFunction) {
  const requestStore = getRequestStore(req);
  const anonymousViewerId = resolveAnonymousViewerId(req);
  const token = parseSessionToken(req);

  if (!token) {
    requestStore[authContextKey] = {
      session: null,
      actorUser: null,
      effectiveUser: null,
      isAuthenticated: false,
      isImpersonating: false,
      anonymousViewerId,
      subjectId: anonymousViewerId ?? 'anon-viewer'
    };
    next();
    return;
  }

  const session = await loadSessionByTokenHash(hashValue(token));
  if (!session || Date.parse(session.expiresAt) <= Date.now()) {
    if (session) {
      await deleteSession(session.id);
    }
    requestStore[authContextKey] = {
      session: null,
      actorUser: null,
      effectiveUser: null,
      isAuthenticated: false,
      isImpersonating: false,
      anonymousViewerId,
      subjectId: anonymousViewerId ?? 'anon-viewer'
    };
    next();
    return;
  }

  const actorUser = await loadUserById(session.userId);
  const effectiveUser = session.impersonatedUserId ? await loadUserById(session.impersonatedUserId) : actorUser;
  if (!actorUser || !effectiveUser) {
    await deleteSession(session.id);
    requestStore[authContextKey] = {
      session: null,
      actorUser: null,
      effectiveUser: null,
      isAuthenticated: false,
      isImpersonating: false,
      anonymousViewerId,
      subjectId: anonymousViewerId ?? 'anon-viewer'
    };
    next();
    return;
  }

  await saveSession({
    ...session,
    lastSeenAt: nowIso()
  });

  requestStore[authContextKey] = {
    session,
    actorUser,
    effectiveUser,
    isAuthenticated: true,
    isImpersonating: Boolean(session.impersonatedUserId && session.impersonatedUserId !== session.userId),
    anonymousViewerId,
    subjectId: buildUserSubjectId(effectiveUser.id)
  };
  next();
}

export function getAuthContext(req: Request): AuthContext {
  return getRequestStore(req)[authContextKey] ?? {
    session: null,
    actorUser: null,
    effectiveUser: null,
    isAuthenticated: false,
    isImpersonating: false,
    anonymousViewerId: resolveAnonymousViewerId(req),
    subjectId: resolveAnonymousViewerId(req) ?? 'anon-viewer'
  };
}

export function requireAuthenticatedUser(req: Request) {
  const auth = getAuthContext(req);
  if (!auth.isAuthenticated || !auth.effectiveUser) {
    throw new HttpError(401, 'auth://required', 'Necesitás iniciar sesión para usar esta función.');
  }
  return auth;
}

export function requireRole(req: Request, roles: UserRole[]) {
  const auth = requireAuthenticatedUser(req);
  const actorRole = auth.actorUser?.role;
  if (!actorRole || !roles.includes(actorRole)) {
    throw new HttpError(403, 'auth://forbidden', 'No tenés permisos para usar esta función.');
  }
  return auth;
}

function extractUserIdFromViewerId(viewerId?: string | null) {
  if (!viewerId?.startsWith('user:')) return null;
  return viewerId.slice('user:'.length);
}

async function resolveCoachWorkspacePlan(userId: string, actorRole?: UserRole | null) {
  if (actorRole === 'admin') return getMembershipPlan('pro_coach');
  const account = await loadMembershipAccount(buildUserSubjectId(userId));
  return getMembershipPlan(account?.planId ?? 'free');
}

async function assertCoachWorkspaceAccess(userId: string, actorRole?: UserRole | null) {
  const plan = await resolveCoachWorkspacePlan(userId, actorRole);
  if (!plan.entitlements.canUseCoachWorkspace) {
    throw new HttpError(403, 'coach://workspace-disabled', 'Tu plan actual no incluye el espacio coach.');
  }
  return plan;
}

function validatePassword(password: string) {
  if (password.length < 8) {
    throw new HttpError(400, 'auth://password-short', 'La contraseña debe tener al menos 8 caracteres.');
  }
}

export async function signupUser(input: {
  email: string;
  password: string;
  displayName: string;
  locale?: 'es' | 'en';
  anonymousViewerId?: string | null;
}, res: Response) {
  const email = input.email.trim().toLowerCase();
  validatePassword(input.password);
  const existing = await loadUserByEmail(email);
  if (existing) {
    throw new HttpError(409, 'auth://email-taken', 'Ya existe una cuenta con ese email.');
  }

  const user = await saveUser({
    email,
    passwordHash: await hashPassword(input.password),
    displayName: input.displayName.trim() || email.split('@')[0],
    role: 'user',
    locale: input.locale ?? 'es',
    emailVerified: process.env.NODE_ENV !== 'production'
  });

  await saveMembershipAccount({
    viewerId: buildUserSubjectId(user.id),
    planId: 'free',
    status: 'active',
    source: 'default',
    billingProvider: null
  });

  await migrateAnonymousViewerIntoUser(input.anonymousViewerId ?? null, user.id);
  await createSessionForUser(user.id, res);

  return sanitizeUser(user);
}

export async function loginUser(input: {
  email: string;
  password: string;
  anonymousViewerId?: string | null;
}, res: Response) {
  const user = await loadUserByEmail(input.email);
  if (!user) {
    throw new HttpError(401, 'auth://invalid-login', 'Email o contraseña incorrectos.');
  }

  const passwordOk = await verifyPassword(input.password, user.passwordHash);
  if (!passwordOk) {
    throw new HttpError(401, 'auth://invalid-login', 'Email o contraseña incorrectos.');
  }

  await touchUserLogin(user);
  const subjectId = buildUserSubjectId(user.id);
  const existingMembership = await loadMembershipAccount(subjectId);
  if (!existingMembership) {
    await saveMembershipAccount({
      viewerId: subjectId,
      planId: 'free',
      status: 'active',
      source: 'default',
      billingProvider: null
    });
  }
  await migrateAnonymousViewerIntoUser(input.anonymousViewerId ?? null, user.id);
  await createSessionForUser(user.id, res);

  return sanitizeUser(await loadUserById(user.id) ?? user);
}

export async function logoutUser(req: Request, res: Response) {
  const token = parseSessionToken(req);
  if (token) {
    const session = await loadSessionByTokenHash(hashValue(token));
    if (session) {
      await deleteSession(session.id);
    }
  }
  clearSessionCookie(res);
}

export async function requestPasswordReset(email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const user = await loadUserByEmail(normalizedEmail);
  if (!user) {
    return {
      ok: true as const,
      devResetToken: null as string | null,
      devResetUrl: null as string | null
    };
  }

  const rawToken = `${randomUUID()}-${generateOpaqueToken()}`;
  const expiresAt = new Date(Date.now() + env.PASSWORD_RESET_TTL_MINUTES * 60_000).toISOString();
  await savePasswordResetToken({
    userId: user.id,
    tokenHash: hashValue(rawToken),
    expiresAt
  });

  return {
    ok: true as const,
    devResetToken: env.DEV_EXPOSE_RESET_TOKEN ? rawToken : null,
    devResetUrl: env.DEV_EXPOSE_RESET_TOKEN
      ? `${env.APP_BASE_URL.replace(/\/$/, '')}/?account=auth&authMode=reset&resetToken=${encodeURIComponent(rawToken)}`
      : null
  };
}

export async function resetPassword(rawToken: string, newPassword: string) {
  validatePassword(newPassword);
  const token = await loadPasswordResetTokenByHash(hashValue(rawToken));
  if (!token || token.usedAt || Date.parse(token.expiresAt) <= Date.now()) {
    throw new HttpError(400, 'auth://invalid-reset-token', 'El token de recuperación no es válido o ya expiró.');
  }

  const user = await loadUserById(token.userId);
  if (!user) {
    throw new HttpError(404, 'auth://user-not-found', 'No encontramos la cuenta para ese token.');
  }

  await saveUser({
    ...user,
    passwordHash: await hashPassword(newPassword),
    updatedAt: nowIso(),
    createdAt: user.createdAt
  });
  await savePasswordResetToken({
    ...token,
    usedAt: nowIso()
  });

  return { ok: true as const };
}

export async function changePassword(userId: string, currentPassword: string, newPassword: string) {
  validatePassword(newPassword);
  const user = await loadUserById(userId);
  if (!user) {
    throw new HttpError(404, 'auth://user-not-found', 'No encontramos el usuario.');
  }

  const passwordOk = await verifyPassword(currentPassword, user.passwordHash);
  if (!passwordOk) {
    throw new HttpError(401, 'auth://invalid-password', 'La contraseña actual no coincide.');
  }

  await saveUser({
    ...user,
    passwordHash: await hashPassword(newPassword),
    updatedAt: nowIso(),
    createdAt: user.createdAt
  });

  return { ok: true as const };
}

export async function updateUserRole(userId: string, role: UserRole) {
  const user = await loadUserById(userId);
  if (!user) {
    throw new HttpError(404, 'auth://user-not-found', 'No encontramos el usuario.');
  }

  return saveUser({
    ...user,
    role,
    updatedAt: nowIso(),
    createdAt: user.createdAt
  });
}

export async function bootstrapAdminAccounts() {
  const candidates = [
    { email: env.ADMIN_1_EMAIL, password: env.ADMIN_1_PASSWORD, name: env.ADMIN_1_NAME },
    { email: env.ADMIN_2_EMAIL, password: env.ADMIN_2_PASSWORD, name: env.ADMIN_2_NAME }
  ].filter((entry) => entry.email && entry.password);

  for (const entry of candidates) {
    const existing = await loadUserByEmail(entry.email!);
    if (existing) {
      if (existing.role !== 'admin') {
        await saveUser({
          ...existing,
          role: 'admin',
          displayName: entry.name?.trim() || existing.displayName,
          createdAt: existing.createdAt,
          updatedAt: nowIso()
        });
      }
      await saveMembershipAccount({
        viewerId: buildUserSubjectId(existing.id),
        planId: 'pro_coach',
        status: 'active',
        source: 'default',
        billingProvider: null
      });
      continue;
    }

    const user = await saveUser({
      email: entry.email!,
      passwordHash: await hashPassword(entry.password!),
      displayName: entry.name?.trim() || entry.email!.split('@')[0],
      role: 'admin',
      locale: 'es',
      emailVerified: true
    });
    await saveMembershipAccount({
      viewerId: buildUserSubjectId(user.id),
      planId: 'pro_coach',
      status: 'active',
      source: 'default',
      billingProvider: null
    });
  }
}

export async function listAdminUsers() {
  const users = await listUsers();
  return users.map(sanitizeUser);
}

export async function startAdminImpersonation(req: Request, res: Response, targetUserId: string) {
  const auth = requireRole(req, ['admin']);
  const targetUser = await loadUserById(targetUserId);
  if (!targetUser) {
    throw new HttpError(404, 'auth://user-not-found', 'No encontramos el usuario a impersonar.');
  }
  if (!auth.session) {
    throw new HttpError(400, 'auth://missing-session', 'No encontramos una sesión activa para impersonar.');
  }

  await saveSession({
    ...auth.session,
    impersonatedUserId: targetUserId,
    lastSeenAt: nowIso()
  });
  await createSessionForUser(auth.actorUser!.id, res, targetUserId);
  return sanitizeUser(targetUser);
}

export async function stopAdminImpersonation(req: Request, res: Response) {
  const auth = requireRole(req, ['admin']);
  if (!auth.session) {
    throw new HttpError(400, 'auth://missing-session', 'No encontramos una sesión activa.');
  }

  await saveSession({
    ...auth.session,
    impersonatedUserId: null,
    lastSeenAt: nowIso()
  });
  await createSessionForUser(auth.actorUser!.id, res, null);
  return sanitizeUser(auth.actorUser!);
}

export async function listCoachRoster(req: Request) {
  const auth = requireAuthenticatedUser(req);
  const actorRole = auth.actorUser?.role;
  if (actorRole !== 'coach' && actorRole !== 'admin') {
    throw new HttpError(403, 'coach://forbidden', 'Esta función es solo para coaches o admins.');
  }

  await assertCoachWorkspaceAccess(auth.effectiveUser!.id, actorRole);

  const [userAssignments, profileAssignments] = await Promise.all([
    listCoachPlayerAssignments(auth.effectiveUser!.id),
    listCoachProfileAssignments(auth.effectiveUser!.id)
  ]);

  const userEntries = await Promise.all(userAssignments.map(async (assignment) => {
    const user = await loadUserById(assignment.playerUserId);
    if (!user) return null;
    const linkedProfiles = await listViewerProfileLinks(buildUserSubjectId(user.id));
    const latestProfile = linkedProfiles[0] ?? null;
    return {
      assignmentId: assignment.id,
      targetType: 'account' as const,
      note: assignment.note ?? null,
      linkedAt: assignment.createdAt,
      user: sanitizeUser(user),
      profile: latestProfile ? {
        profileKey: latestProfile.profileKey,
        gameName: latestProfile.gameName,
        tagLine: latestProfile.tagLine,
        platform: latestProfile.platform
      } : null
    };
  }));

  const profileEntries = await Promise.all(profileAssignments.map(async (assignment) => {
    const linkedProfile = await findViewerProfileLink({
      gameName: assignment.gameName,
      tagLine: assignment.tagLine,
      platform: assignment.platform
    });
    const userId = extractUserIdFromViewerId(linkedProfile?.viewerId);
    const linkedUser = userId ? await loadUserById(userId) : null;
    return {
      assignmentId: assignment.id,
      targetType: 'riot_profile' as const,
      note: assignment.note ?? null,
      linkedAt: assignment.createdAt,
      user: linkedUser ? sanitizeUser(linkedUser) : null,
      profile: {
        profileKey: assignment.profileKey,
        gameName: assignment.gameName,
        tagLine: assignment.tagLine,
        platform: assignment.platform
      }
    };
  }));

  return [...userEntries, ...profileEntries]
    .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
    .sort((a, b) => Date.parse(b.linkedAt) - Date.parse(a.linkedAt));
}

export async function addCoachPlayer(req: Request, input: {
  playerEmail?: string;
  gameName?: string;
  tagLine?: string;
  platform?: string;
  note?: string;
}) {
  const auth = requireAuthenticatedUser(req);
  const actorRole = auth.actorUser?.role;
  if (actorRole !== 'coach' && actorRole !== 'admin') {
    throw new HttpError(403, 'coach://forbidden', 'Esta función es solo para coaches o admins.');
  }

  const coachUserId = auth.effectiveUser!.id;
  const plan = await assertCoachWorkspaceAccess(coachUserId, actorRole);
  const [existingUserAssignments, existingProfileAssignments] = await Promise.all([
    listCoachPlayerAssignments(coachUserId),
    listCoachProfileAssignments(coachUserId)
  ]);

  const normalizedNote = input.note?.trim() || undefined;
  const normalizedEmail = input.playerEmail?.trim().toLowerCase();
  const normalizedGameName = input.gameName?.trim();
  const normalizedTagLine = input.tagLine?.replace(/^#+/, '').trim();
  const normalizedPlatform = normalizeRiotPlatform(input.platform);

  if (normalizedEmail) {
    const player = await loadUserByEmail(normalizedEmail);
    if (!player) {
      throw new HttpError(404, 'coach://player-not-found', 'No encontramos un jugador con ese email.');
    }

    const alreadyLinked = existingUserAssignments.some((assignment) => assignment.playerUserId === player.id);
    if (!alreadyLinked && existingUserAssignments.length + existingProfileAssignments.length >= plan.entitlements.maxManagedPlayers) {
      throw new HttpError(403, 'coach://roster-limit', `Tu plan permite hasta ${plan.entitlements.maxManagedPlayers} jugadores en el roster coach.`);
    }

    await saveCoachPlayerAssignment({
      coachUserId,
      playerUserId: player.id,
      note: normalizedNote
    });

    return {
      targetType: 'account' as const,
      user: sanitizeUser(player)
    };
  }

  if (!normalizedGameName || !normalizedTagLine || !normalizedPlatform) {
    throw new HttpError(400, 'coach://invalid-player-target', 'Para agregar por Riot ID necesitamos game name, tag y platform.');
  }

  const profileKey = buildProfileStorageKey(normalizedGameName, normalizedTagLine, normalizedPlatform);
  const linkedProfile = await findViewerProfileLink({
    gameName: normalizedGameName,
    tagLine: normalizedTagLine,
    platform: normalizedPlatform
  });
  const linkedUserId = extractUserIdFromViewerId(linkedProfile?.viewerId);

  if (linkedUserId) {
    const player = await loadUserById(linkedUserId);
    if (player) {
      const alreadyLinked = existingUserAssignments.some((assignment) => assignment.playerUserId === player.id);
      if (!alreadyLinked && existingUserAssignments.length + existingProfileAssignments.length >= plan.entitlements.maxManagedPlayers) {
        throw new HttpError(403, 'coach://roster-limit', `Tu plan permite hasta ${plan.entitlements.maxManagedPlayers} jugadores en el roster coach.`);
      }

      await saveCoachPlayerAssignment({
        coachUserId,
        playerUserId: player.id,
        note: normalizedNote
      });

      return {
        targetType: 'account' as const,
        user: sanitizeUser(player)
      };
    }
  }

  const alreadyLinked = existingProfileAssignments.some((assignment) => assignment.profileKey === profileKey);
  if (!alreadyLinked && existingUserAssignments.length + existingProfileAssignments.length >= plan.entitlements.maxManagedPlayers) {
    throw new HttpError(403, 'coach://roster-limit', `Tu plan permite hasta ${plan.entitlements.maxManagedPlayers} jugadores en el roster coach.`);
  }

  await saveCoachProfileAssignment({
    coachUserId,
    profileKey,
    gameName: normalizedGameName,
    tagLine: normalizedTagLine,
    platform: normalizedPlatform,
    note: normalizedNote
  });

  return {
    targetType: 'riot_profile' as const,
    profile: {
      profileKey,
      gameName: normalizedGameName,
      tagLine: normalizedTagLine,
      platform: normalizedPlatform
    }
  };
}

export async function removeCoachPlayer(req: Request, assignmentId: string) {
  const auth = requireAuthenticatedUser(req);
  const actorRole = auth.actorUser?.role;
  if (actorRole !== 'coach' && actorRole !== 'admin') {
    throw new HttpError(403, 'coach://forbidden', 'Esta función es solo para coaches o admins.');
  }

  await assertCoachWorkspaceAccess(auth.effectiveUser!.id, actorRole);

  const [userAssignments, profileAssignments] = await Promise.all([
    listCoachPlayerAssignments(auth.effectiveUser!.id),
    listCoachProfileAssignments(auth.effectiveUser!.id)
  ]);

  const userAssignment = userAssignments.find((assignment) => assignment.id === assignmentId);
  if (userAssignment) {
    await removeCoachPlayerAssignmentById(auth.effectiveUser!.id, assignmentId);
    return { ok: true as const };
  }

  const profileAssignment = profileAssignments.find((assignment) => assignment.id === assignmentId);
  if (profileAssignment) {
    await removeCoachProfileAssignment(auth.effectiveUser!.id, assignmentId);
    return { ok: true as const };
  }

  throw new HttpError(404, 'coach://assignment-not-found', 'No encontramos ese vínculo dentro del roster coach.');
}

export function getSafeUserFromAuth(req: Request) {
  const auth = getAuthContext(req);
  return auth.effectiveUser ? sanitizeUser(auth.effectiveUser) : null;
}
