import { readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { env } from '../config/env.js';
import {
  saveCoachPlayerAssignment,
  saveCoachProfileAssignment,
  savePasswordResetToken,
  saveSession,
  saveUser,
  type AuthSessionRecord,
  type AuthUserRecord,
  type CoachPlayerAssignmentRecord,
  type CoachProfileAssignmentRecord,
  type PasswordResetTokenRecord
} from '../services/authStore.js';
import {
  saveMembershipAccount,
  touchViewerProfileLink,
  type MembershipAccountRecord,
  type ViewerProfileLinkRecord
} from '../services/membershipStore.js';
import { saveProfileSnapshot } from '../services/profileStore.js';

const dataRoot = fileURLToPath(new URL('../../data', import.meta.url));

type StoredProfileDataset = {
  player: string;
  tagLine: string;
  summary?: {
    platform?: string;
  };
} & Record<string, unknown>;

async function listJsonFiles(dir: string) {
  try {
    const entries = await readdir(dir, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
      .map((entry) => `${dir}/${entry.name}`);
  } catch {
    return [] as string[];
  }
}

async function readJsonFiles<T>(dir: string) {
  const files = await listJsonFiles(dir);
  const parsed = await Promise.all(files.map(async (file) => {
    const raw = await readFile(file, 'utf8');
    return JSON.parse(raw) as T;
  }));
  return parsed;
}

async function migrateUsers() {
  const records = await readJsonFiles<AuthUserRecord>(`${dataRoot}/auth/users`);
  for (const record of records) {
    await saveUser(record);
  }
  return records.length;
}

async function migrateSessions() {
  const records = await readJsonFiles<AuthSessionRecord>(`${dataRoot}/auth/sessions`);
  for (const record of records) {
    await saveSession(record);
  }
  return records.length;
}

async function migratePasswordResetTokens() {
  const records = await readJsonFiles<PasswordResetTokenRecord>(`${dataRoot}/auth/password-reset`);
  for (const record of records) {
    await savePasswordResetToken(record);
  }
  return records.length;
}

async function migrateCoachAssignments() {
  const playerLists = await readJsonFiles<CoachPlayerAssignmentRecord[]>(`${dataRoot}/auth/coach-assignments`);
  const profileLists = await readJsonFiles<CoachProfileAssignmentRecord[]>(`${dataRoot}/auth/coach-profile-assignments`);

  let playerCount = 0;
  let profileCount = 0;

  for (const records of playerLists) {
    for (const record of records) {
      await saveCoachPlayerAssignment(record);
      playerCount += 1;
    }
  }

  for (const records of profileLists) {
    for (const record of records) {
      await saveCoachProfileAssignment(record);
      profileCount += 1;
    }
  }

  return { playerCount, profileCount };
}

async function migrateMembershipAccounts() {
  const records = await readJsonFiles<MembershipAccountRecord>(`${dataRoot}/membership/accounts`);
  for (const record of records) {
    await saveMembershipAccount(record);
  }
  return records.length;
}

async function migrateViewerProfileLinks() {
  const linkLists = await readJsonFiles<ViewerProfileLinkRecord[]>(`${dataRoot}/membership/profile-links`);
  let count = 0;

  for (const records of linkLists) {
    for (const record of records) {
      await touchViewerProfileLink(record);
      count += 1;
    }
  }

  return count;
}

async function migrateProfileSnapshots() {
  const records = await readJsonFiles<StoredProfileDataset>(`${dataRoot}/profiles`);
  for (const record of records) {
    await saveProfileSnapshot(record);
  }
  return records.length;
}

async function main() {
  if (!env.DATABASE_URL) {
    throw new Error('DATABASE_URL is required to migrate fallback JSON data into Postgres.');
  }

  const [
    users,
    sessions,
    passwordResetTokens,
    coachAssignments,
    membershipAccounts,
    viewerProfileLinks,
    profileSnapshots
  ] = await Promise.all([
    migrateUsers(),
    migrateSessions(),
    migratePasswordResetTokens(),
    migrateCoachAssignments(),
    migrateMembershipAccounts(),
    migrateViewerProfileLinks(),
    migrateProfileSnapshots()
  ]);

  console.log('Fallback JSON migration complete.');
  console.log(JSON.stringify({
    users,
    sessions,
    passwordResetTokens,
    coachPlayerAssignments: coachAssignments.playerCount,
    coachProfileAssignments: coachAssignments.profileCount,
    membershipAccounts,
    viewerProfileLinks,
    profileSnapshots
  }, null, 2));
}

void main().catch((error) => {
  console.error('Fallback JSON migration failed:', error);
  process.exitCode = 1;
});
