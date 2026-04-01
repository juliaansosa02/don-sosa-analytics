import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { Pool } from 'pg';
import { env } from '../config/env.js';
import { buildLegacyProfileStorageKey, buildProfileKeyCandidates, buildProfileStorageKey, normalizeRiotPlatform } from '../lib/riotRouting.js';
import { ensureWrite } from '../utils/fs.js';

interface StoredProfileDataset {
  player: string;
  tagLine: string;
  summary?: {
    platform?: string;
  };
}

const profilesDir = fileURLToPath(new URL('../../data/profiles', import.meta.url));
const tableName = 'profile_snapshots';
const pool = env.DATABASE_URL ? new Pool({ connectionString: env.DATABASE_URL }) : null;
let tableReady: Promise<void> | null = null;

function profilePath(gameName: string, tagLine: string, platform?: string | null) {
  return `${profilesDir}/${buildProfileStorageKey(gameName, tagLine, platform)}.json`;
}

function legacyProfilePath(gameName: string, tagLine: string) {
  return `${profilesDir}/${buildLegacyProfileStorageKey(gameName, tagLine)}.json`;
}

async function ensureTable() {
  if (!pool) return;
  if (!tableReady) {
    tableReady = pool.query(`
      CREATE TABLE IF NOT EXISTS ${tableName} (
        profile_key TEXT PRIMARY KEY,
        player TEXT NOT NULL,
        tag_line TEXT NOT NULL,
        payload JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `).then(() => undefined);
  }

  await tableReady;
}

async function saveProfileSnapshotToFile(dataset: unknown & StoredProfileDataset) {
  await ensureWrite(profilePath(dataset.player, dataset.tagLine, dataset.summary?.platform), JSON.stringify(dataset, null, 2));
}

async function loadProfileSnapshotFromFile<T>(gameName: string, tagLine: string, platform?: string) {
  const candidates = [
    profilePath(gameName, tagLine, platform),
    legacyProfilePath(gameName, tagLine)
  ];

  for (const candidate of candidates) {
    try {
      const raw = await readFile(candidate, 'utf8');
      return JSON.parse(raw) as T;
    } catch {
      continue;
    }
  }

  return null;
}

export async function saveProfileSnapshot(dataset: unknown & StoredProfileDataset) {
  if (!pool) {
    await saveProfileSnapshotToFile(dataset);
    return;
  }

  await ensureTable();
  const profileKey = buildProfileStorageKey(dataset.player, dataset.tagLine, dataset.summary?.platform);
  await pool.query(
    `INSERT INTO ${tableName} (profile_key, player, tag_line, payload, updated_at)
     VALUES ($1, $2, $3, $4::jsonb, NOW())
     ON CONFLICT (profile_key)
     DO UPDATE SET payload = EXCLUDED.payload, updated_at = NOW(), player = EXCLUDED.player, tag_line = EXCLUDED.tag_line`,
    [profileKey, dataset.player, dataset.tagLine, JSON.stringify(dataset)]
  );
}

export async function loadProfileSnapshot<T>(gameName: string, tagLine: string, platform?: string) {
  if (!pool) {
    return loadProfileSnapshotFromFile<T>(gameName, tagLine, normalizeRiotPlatform(platform));
  }

  await ensureTable();
  const candidates = buildProfileKeyCandidates(gameName, tagLine, platform);
  const result = await pool.query<{ payload: T; profile_key: string }>(
    `SELECT profile_key, payload
     FROM ${tableName}
     WHERE profile_key = ANY($1::text[])
     ORDER BY array_position($1::text[], profile_key)
     LIMIT 1`,
    [candidates]
  );
  return result.rows[0]?.payload ?? null;
}
