import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { Pool } from 'pg';
import { env } from '../config/env.js';
import { ensureWrite } from '../utils/fs.js';

interface StoredProfileDataset {
  player: string;
  tagLine: string;
}

const profilesDir = fileURLToPath(new URL('../../data/profiles', import.meta.url));
const tableName = 'profile_snapshots';
const pool = env.DATABASE_URL ? new Pool({ connectionString: env.DATABASE_URL }) : null;
let tableReady: Promise<void> | null = null;

function normalizeKey(gameName: string, tagLine: string) {
  return `${gameName.trim().toLowerCase()}-${tagLine.trim().toLowerCase()}`
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/-+/g, '-');
}

function profilePath(gameName: string, tagLine: string) {
  return `${profilesDir}/${normalizeKey(gameName, tagLine)}.json`;
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
  await ensureWrite(profilePath(dataset.player, dataset.tagLine), JSON.stringify(dataset, null, 2));
}

async function loadProfileSnapshotFromFile<T>(gameName: string, tagLine: string) {
  try {
    const raw = await readFile(profilePath(gameName, tagLine), 'utf8');
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
}

export async function saveProfileSnapshot(dataset: unknown & StoredProfileDataset) {
  if (!pool) {
    await saveProfileSnapshotToFile(dataset);
    return;
  }

  await ensureTable();
  const profileKey = normalizeKey(dataset.player, dataset.tagLine);
  await pool.query(
    `INSERT INTO ${tableName} (profile_key, player, tag_line, payload, updated_at)
     VALUES ($1, $2, $3, $4::jsonb, NOW())
     ON CONFLICT (profile_key)
     DO UPDATE SET payload = EXCLUDED.payload, updated_at = NOW(), player = EXCLUDED.player, tag_line = EXCLUDED.tag_line`,
    [profileKey, dataset.player, dataset.tagLine, JSON.stringify(dataset)]
  );
}

export async function loadProfileSnapshot<T>(gameName: string, tagLine: string) {
  if (!pool) {
    return loadProfileSnapshotFromFile<T>(gameName, tagLine);
  }

  await ensureTable();
  const profileKey = normalizeKey(gameName, tagLine);
  const result = await pool.query<{ payload: T }>(
    `SELECT payload FROM ${tableName} WHERE profile_key = $1 LIMIT 1`,
    [profileKey]
  );
  return result.rows[0]?.payload ?? null;
}
