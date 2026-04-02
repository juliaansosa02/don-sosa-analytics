import { randomUUID } from 'node:crypto';
import { readFile, readdir, unlink } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { Pool } from 'pg';
import { env } from '../config/env.js';
import { ensureWrite } from '../utils/fs.js';

const usersDir = fileURLToPath(new URL('../../data/auth/users', import.meta.url));
const sessionsDir = fileURLToPath(new URL('../../data/auth/sessions', import.meta.url));
const passwordResetDir = fileURLToPath(new URL('../../data/auth/password-reset', import.meta.url));
const coachAssignmentsDir = fileURLToPath(new URL('../../data/auth/coach-assignments', import.meta.url));
const pool = env.DATABASE_URL ? new Pool({ connectionString: env.DATABASE_URL }) : null;
let tableReady: Promise<void> | null = null;

export type UserRole = 'user' | 'coach' | 'admin';

export interface AuthUserRecord {
  id: string;
  email: string;
  passwordHash: string;
  displayName: string;
  role: UserRole;
  locale: 'es' | 'en';
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
  lastLoginAt?: string | null;
}

export interface AuthSessionRecord {
  id: string;
  userId: string;
  tokenHash: string;
  impersonatedUserId?: string | null;
  createdAt: string;
  expiresAt: string;
  lastSeenAt: string;
}

export interface PasswordResetTokenRecord {
  id: string;
  userId: string;
  tokenHash: string;
  createdAt: string;
  expiresAt: string;
  usedAt?: string | null;
}

export interface CoachPlayerAssignmentRecord {
  id: string;
  coachUserId: string;
  playerUserId: string;
  note?: string | null;
  createdAt: string;
}

async function ensureTables() {
  if (!pool) return;
  if (!tableReady) {
    tableReady = Promise.all([
      pool.query(`
        CREATE TABLE IF NOT EXISTS auth_users (
          id TEXT PRIMARY KEY,
          email TEXT NOT NULL UNIQUE,
          password_hash TEXT NOT NULL,
          display_name TEXT NOT NULL,
          role TEXT NOT NULL,
          locale TEXT NOT NULL DEFAULT 'es',
          email_verified BOOLEAN NOT NULL DEFAULT FALSE,
          last_login_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `),
      pool.query(`
        CREATE TABLE IF NOT EXISTS auth_sessions (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          token_hash TEXT NOT NULL UNIQUE,
          impersonated_user_id TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          expires_at TIMESTAMPTZ NOT NULL,
          last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `),
      pool.query(`
        CREATE TABLE IF NOT EXISTS auth_password_reset_tokens (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          token_hash TEXT NOT NULL UNIQUE,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          expires_at TIMESTAMPTZ NOT NULL,
          used_at TIMESTAMPTZ
        )
      `),
      pool.query(`
        CREATE TABLE IF NOT EXISTS coach_player_assignments (
          id TEXT PRIMARY KEY,
          coach_user_id TEXT NOT NULL,
          player_user_id TEXT NOT NULL,
          note TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          UNIQUE(coach_user_id, player_user_id)
        )
      `)
    ]).then(() => undefined);
  }

  await tableReady;
}

function userPath(userId: string) {
  return `${usersDir}/${userId}.json`;
}

function sessionPath(sessionId: string) {
  return `${sessionsDir}/${sessionId}.json`;
}

function passwordResetPath(tokenId: string) {
  return `${passwordResetDir}/${tokenId}.json`;
}

function coachAssignmentsPath(coachUserId: string) {
  return `${coachAssignmentsDir}/${coachUserId}.json`;
}

async function readJsonFile<T>(path: string) {
  try {
    const raw = await readFile(path, 'utf8');
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

async function readAllJsonFiles<T>(dir: string) {
  try {
    const files = await readdir(dir);
    const entries = await Promise.all(files
      .filter((file) => file.endsWith('.json'))
      .map((file) => readJsonFile<T>(`${dir}/${file}`)));
    return entries.filter(Boolean) as T[];
  } catch {
    return [] as T[];
  }
}

export async function loadUserById(userId: string) {
  if (!pool) {
    return readJsonFile<AuthUserRecord>(userPath(userId));
  }

  await ensureTables();
  const result = await pool.query<{
    id: string;
    email: string;
    password_hash: string;
    display_name: string;
    role: UserRole;
    locale: 'es' | 'en';
    email_verified: boolean;
    last_login_at: string | null;
    created_at: string;
    updated_at: string;
  }>(
    `SELECT * FROM auth_users WHERE id = $1 LIMIT 1`,
    [userId]
  );

  const row = result.rows[0];
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    passwordHash: row.password_hash,
    displayName: row.display_name,
    role: row.role,
    locale: row.locale,
    emailVerified: row.email_verified,
    lastLoginAt: row.last_login_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  } satisfies AuthUserRecord;
}

export async function loadUserByEmail(email: string) {
  const normalizedEmail = email.trim().toLowerCase();

  if (!pool) {
    const users = await readAllJsonFiles<AuthUserRecord>(usersDir);
    return users.find((user) => user.email === normalizedEmail) ?? null;
  }

  await ensureTables();
  const result = await pool.query<{
    id: string;
    email: string;
    password_hash: string;
    display_name: string;
    role: UserRole;
    locale: 'es' | 'en';
    email_verified: boolean;
    last_login_at: string | null;
    created_at: string;
    updated_at: string;
  }>(
    `SELECT * FROM auth_users WHERE email = $1 LIMIT 1`,
    [normalizedEmail]
  );

  const row = result.rows[0];
  if (!row) return null;
  return {
    id: row.id,
    email: row.email,
    passwordHash: row.password_hash,
    displayName: row.display_name,
    role: row.role,
    locale: row.locale,
    emailVerified: row.email_verified,
    lastLoginAt: row.last_login_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  } satisfies AuthUserRecord;
}

export async function listUsers() {
  if (!pool) {
    const users = await readAllJsonFiles<AuthUserRecord>(usersDir);
    return users.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  }

  await ensureTables();
  const result = await pool.query<{
    id: string;
    email: string;
    password_hash: string;
    display_name: string;
    role: UserRole;
    locale: 'es' | 'en';
    email_verified: boolean;
    last_login_at: string | null;
    created_at: string;
    updated_at: string;
  }>(
    `SELECT * FROM auth_users ORDER BY created_at DESC`
  );

  return result.rows.map((row) => ({
    id: row.id,
    email: row.email,
    passwordHash: row.password_hash,
    displayName: row.display_name,
    role: row.role,
    locale: row.locale,
    emailVerified: row.email_verified,
    lastLoginAt: row.last_login_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  } satisfies AuthUserRecord));
}

export async function saveUser(record: Omit<AuthUserRecord, 'id' | 'createdAt' | 'updatedAt'> & {
  id?: string;
  createdAt?: string;
  updatedAt?: string;
}) {
  const payload: AuthUserRecord = {
    id: record.id ?? randomUUID(),
    email: record.email.trim().toLowerCase(),
    passwordHash: record.passwordHash,
    displayName: record.displayName.trim(),
    role: record.role,
    locale: record.locale,
    emailVerified: record.emailVerified,
    lastLoginAt: record.lastLoginAt ?? null,
    createdAt: record.createdAt ?? new Date().toISOString(),
    updatedAt: record.updatedAt ?? new Date().toISOString()
  };

  if (!pool) {
    await ensureWrite(userPath(payload.id), JSON.stringify(payload, null, 2));
    return payload;
  }

  await ensureTables();
  await pool.query(
    `INSERT INTO auth_users (
      id, email, password_hash, display_name, role, locale, email_verified, last_login_at, created_at, updated_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
    ON CONFLICT (id)
    DO UPDATE SET
      email = EXCLUDED.email,
      password_hash = EXCLUDED.password_hash,
      display_name = EXCLUDED.display_name,
      role = EXCLUDED.role,
      locale = EXCLUDED.locale,
      email_verified = EXCLUDED.email_verified,
      last_login_at = EXCLUDED.last_login_at,
      updated_at = EXCLUDED.updated_at`,
    [
      payload.id,
      payload.email,
      payload.passwordHash,
      payload.displayName,
      payload.role,
      payload.locale,
      payload.emailVerified,
      payload.lastLoginAt ?? null,
      payload.createdAt,
      payload.updatedAt
    ]
  );

  return payload;
}

export async function saveSession(record: Omit<AuthSessionRecord, 'id' | 'createdAt' | 'lastSeenAt'> & {
  id?: string;
  createdAt?: string;
  lastSeenAt?: string;
}) {
  const payload: AuthSessionRecord = {
    id: record.id ?? randomUUID(),
    userId: record.userId,
    tokenHash: record.tokenHash,
    impersonatedUserId: record.impersonatedUserId ?? null,
    createdAt: record.createdAt ?? new Date().toISOString(),
    expiresAt: record.expiresAt,
    lastSeenAt: record.lastSeenAt ?? new Date().toISOString()
  };

  if (!pool) {
    await ensureWrite(sessionPath(payload.id), JSON.stringify(payload, null, 2));
    return payload;
  }

  await ensureTables();
  await pool.query(
    `INSERT INTO auth_sessions (
      id, user_id, token_hash, impersonated_user_id, created_at, expires_at, last_seen_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7)
    ON CONFLICT (id)
    DO UPDATE SET
      user_id = EXCLUDED.user_id,
      token_hash = EXCLUDED.token_hash,
      impersonated_user_id = EXCLUDED.impersonated_user_id,
      expires_at = EXCLUDED.expires_at,
      last_seen_at = EXCLUDED.last_seen_at`,
    [
      payload.id,
      payload.userId,
      payload.tokenHash,
      payload.impersonatedUserId ?? null,
      payload.createdAt,
      payload.expiresAt,
      payload.lastSeenAt
    ]
  );

  return payload;
}

export async function loadSessionByTokenHash(tokenHash: string) {
  if (!pool) {
    const sessions = await readAllJsonFiles<AuthSessionRecord>(sessionsDir);
    return sessions.find((session) => session.tokenHash === tokenHash) ?? null;
  }

  await ensureTables();
  const result = await pool.query<{
    id: string;
    user_id: string;
    token_hash: string;
    impersonated_user_id: string | null;
    created_at: string;
    expires_at: string;
    last_seen_at: string;
  }>(
    `SELECT * FROM auth_sessions WHERE token_hash = $1 LIMIT 1`,
    [tokenHash]
  );

  const row = result.rows[0];
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    tokenHash: row.token_hash,
    impersonatedUserId: row.impersonated_user_id,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    lastSeenAt: row.last_seen_at
  } satisfies AuthSessionRecord;
}

export async function deleteSession(sessionId: string) {
  if (!pool) {
    try {
      await unlink(sessionPath(sessionId));
    } catch {
      return;
    }
    return;
  }

  await ensureTables();
  await pool.query(`DELETE FROM auth_sessions WHERE id = $1`, [sessionId]);
}

export async function savePasswordResetToken(record: Omit<PasswordResetTokenRecord, 'id' | 'createdAt' | 'usedAt'> & {
  id?: string;
  createdAt?: string;
  usedAt?: string | null;
}) {
  const payload: PasswordResetTokenRecord = {
    id: record.id ?? randomUUID(),
    userId: record.userId,
    tokenHash: record.tokenHash,
    createdAt: record.createdAt ?? new Date().toISOString(),
    expiresAt: record.expiresAt,
    usedAt: record.usedAt ?? null
  };

  if (!pool) {
    await ensureWrite(passwordResetPath(payload.id), JSON.stringify(payload, null, 2));
    return payload;
  }

  await ensureTables();
  await pool.query(
    `INSERT INTO auth_password_reset_tokens (
      id, user_id, token_hash, created_at, expires_at, used_at
    ) VALUES ($1,$2,$3,$4,$5,$6)
    ON CONFLICT (id)
    DO UPDATE SET
      user_id = EXCLUDED.user_id,
      token_hash = EXCLUDED.token_hash,
      expires_at = EXCLUDED.expires_at,
      used_at = EXCLUDED.used_at`,
    [
      payload.id,
      payload.userId,
      payload.tokenHash,
      payload.createdAt,
      payload.expiresAt,
      payload.usedAt ?? null
    ]
  );

  return payload;
}

export async function loadPasswordResetTokenByHash(tokenHash: string) {
  if (!pool) {
    const tokens = await readAllJsonFiles<PasswordResetTokenRecord>(passwordResetDir);
    return tokens.find((token) => token.tokenHash === tokenHash) ?? null;
  }

  await ensureTables();
  const result = await pool.query<{
    id: string;
    user_id: string;
    token_hash: string;
    created_at: string;
    expires_at: string;
    used_at: string | null;
  }>(
    `SELECT * FROM auth_password_reset_tokens WHERE token_hash = $1 LIMIT 1`,
    [tokenHash]
  );

  const row = result.rows[0];
  if (!row) return null;
  return {
    id: row.id,
    userId: row.user_id,
    tokenHash: row.token_hash,
    createdAt: row.created_at,
    expiresAt: row.expires_at,
    usedAt: row.used_at
  } satisfies PasswordResetTokenRecord;
}

export async function saveCoachPlayerAssignment(input: {
  coachUserId: string;
  playerUserId: string;
  note?: string | null;
}) {
  const payload: CoachPlayerAssignmentRecord = {
    id: randomUUID(),
    coachUserId: input.coachUserId,
    playerUserId: input.playerUserId,
    note: input.note ?? null,
    createdAt: new Date().toISOString()
  };

  if (!pool) {
    const current = await listCoachPlayerAssignments(input.coachUserId);
    const merged = [payload, ...current.filter((entry) => entry.playerUserId !== input.playerUserId)];
    await ensureWrite(coachAssignmentsPath(input.coachUserId), JSON.stringify(merged, null, 2));
    return payload;
  }

  await ensureTables();
  await pool.query(
    `INSERT INTO coach_player_assignments (
      id, coach_user_id, player_user_id, note, created_at
    ) VALUES ($1,$2,$3,$4,$5)
    ON CONFLICT (coach_user_id, player_user_id)
    DO UPDATE SET note = EXCLUDED.note`,
    [payload.id, payload.coachUserId, payload.playerUserId, payload.note ?? null, payload.createdAt]
  );
  return payload;
}

export async function listCoachPlayerAssignments(coachUserId: string) {
  if (!pool) {
    const entries = await readJsonFile<CoachPlayerAssignmentRecord[]>(coachAssignmentsPath(coachUserId));
    return entries ?? [];
  }

  await ensureTables();
  const result = await pool.query<{
    id: string;
    coach_user_id: string;
    player_user_id: string;
    note: string | null;
    created_at: string;
  }>(
    `SELECT * FROM coach_player_assignments WHERE coach_user_id = $1 ORDER BY created_at DESC`,
    [coachUserId]
  );

  return result.rows.map((row) => ({
    id: row.id,
    coachUserId: row.coach_user_id,
    playerUserId: row.player_user_id,
    note: row.note,
    createdAt: row.created_at
  } satisfies CoachPlayerAssignmentRecord));
}

export async function removeCoachPlayerAssignment(coachUserId: string, playerUserId: string) {
  if (!pool) {
    const current = await listCoachPlayerAssignments(coachUserId);
    await ensureWrite(
      coachAssignmentsPath(coachUserId),
      JSON.stringify(current.filter((entry) => entry.playerUserId !== playerUserId), null, 2)
    );
    return;
  }

  await ensureTables();
  await pool.query(
    `DELETE FROM coach_player_assignments WHERE coach_user_id = $1 AND player_user_id = $2`,
    [coachUserId, playerUserId]
  );
}
