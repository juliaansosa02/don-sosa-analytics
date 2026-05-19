import { access, readdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { Pool } from 'pg';
import { z } from 'zod';
import { env } from '../config/env.js';
import { ensureWrite } from '../utils/fs.js';

const skillCappedDir = fileURLToPath(new URL('../../data/external-meta', import.meta.url));
const statsUrl = 'https://www.skill-capped.com/lol/guides/stats';
const pool = env.DATABASE_URL ? new Pool({ connectionString: env.DATABASE_URL }) : null;
let tableReady: Promise<void> | null = null;

const skillCappedChampionRowSchema = z.object({
  championName: z.string().min(1),
  role: z.enum(['TOP', 'JGL', 'MID', 'ADC', 'SUP']),
  tier: z.enum(['OP', 'S', 'A', 'B', 'C']),
  winRate: z.number(),
  pickRate: z.number(),
  banRate: z.number(),
  matches: z.number().int().nonnegative(),
  coreItemIds: z.array(z.number().int().positive()).default([])
});

const skillCappedMetaSnapshotSchema = z.object({
  patch: z.string().min(1),
  updatedLabel: z.string().min(1),
  fetchedAt: z.string().min(1),
  totalMatchesAnalyzed: z.number().int().nonnegative(),
  sourceUrl: z.string().url(),
  champions: z.array(skillCappedChampionRowSchema)
});

type SkillCappedChampionRow = z.infer<typeof skillCappedChampionRowSchema>;
type SkillCappedMetaSnapshot = z.infer<typeof skillCappedMetaSnapshotSchema>;

function decodeHtmlEntities(input: string) {
  return input
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ');
}

function htmlToText(html: string) {
  return decodeHtmlEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
      .replace(/<\/(p|div|section|article|header|footer|h1|h2|h3|h4|li|ul|ol|br|tr|td|th)>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
  )
    .replace(/\r/g, '')
    .replace(/[ \t]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function toLines(text: string) {
  return text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}

async function fetchText(url: string) {
  const response = await fetch(url, {
    headers: {
      'user-agent': 'Don-Sosa-Coach/1.0'
    }
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }

  return response.text();
}

async function ensureTables() {
  if (!pool) return;
  if (!tableReady) {
    tableReady = pool.query(`
      CREATE TABLE IF NOT EXISTS skill_capped_meta_cache (
        patch TEXT PRIMARY KEY,
        payload JSONB NOT NULL,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `).then(() => undefined);
  }

  await tableReady;
}

async function saveSnapshot(snapshot: SkillCappedMetaSnapshot) {
  if (pool) {
    await ensureTables();
    await pool.query(
      `INSERT INTO skill_capped_meta_cache (patch, payload, updated_at)
       VALUES ($1, $2::jsonb, NOW())
       ON CONFLICT (patch) DO UPDATE SET payload = EXCLUDED.payload, updated_at = NOW()`,
      [snapshot.patch, JSON.stringify(snapshot)]
    );
    return;
  }

  await ensureWrite(`${skillCappedDir}/skill-capped-${snapshot.patch}.auto.json`, `${JSON.stringify(snapshot, null, 2)}\n`);
}

async function loadStoredSnapshots() {
  if (!pool) return [] as SkillCappedMetaSnapshot[];
  await ensureTables();
  const result = await pool.query<{ payload: SkillCappedMetaSnapshot }>(`SELECT payload FROM skill_capped_meta_cache`);
  return result.rows.map((row) => skillCappedMetaSnapshotSchema.parse(row.payload));
}

async function loadLocalSnapshots() {
  try {
    const entries = await readdir(skillCappedDir, { withFileTypes: true });
    const files = entries.filter((entry) => entry.isFile() && entry.name.endsWith('.json'));

    const snapshots = await Promise.all(files.map(async (entry) => {
      const raw = await readFile(`${skillCappedDir}/${entry.name}`, 'utf8');
      return skillCappedMetaSnapshotSchema.parse(JSON.parse(raw));
    }));

    return snapshots;
  } catch (error) {
    if (error instanceof Error && 'code' in error && error.code === 'ENOENT') return [];
    throw error;
  }
}

function parseSnapshot(text: string) {
  const lines = toLines(text);
  const totalMatchesMatch = text.match(/([\d,]+)\s+matches analyzed/i);
  const patchUpdatedMatch = text.match(/Patch\s+(\d+\.\d+)\s*·\s*Updated\s+([^\n]+)/i);

  if (!patchUpdatedMatch) {
    throw new Error('Could not parse Skill-Capped patch/update header');
  }

  const champions: SkillCappedChampionRow[] = [];
  const headerIndex = lines.findIndex((line) => line.includes('Champion Role Tier Win Rate Pick Rate') && line.includes('Build Matches'));

  if (headerIndex === -1) {
    throw new Error('Could not locate Skill-Capped champion table');
  }

  for (let index = headerIndex + 1; index < lines.length; index += 1) {
    const line = lines[index];
    const rowMatch = line.match(/^(.+?)\s+(TOP|JGL|MID|ADC|SUP)\s+(OP|S|A|B|C)\s+([0-9.]+)%([0-9.]+)%([0-9.]+)%$/);
    if (!rowMatch) continue;

    const [, championName, role, tier, winRate, pickRate, banRate] = rowMatch;
    const collectedItemIds: number[] = [];
    let matches = 0;

    for (let lookahead = index + 1; lookahead < Math.min(lines.length, index + 5); lookahead += 1) {
      const candidate = lines[lookahead];
      const numeric = candidate.match(/^\d[\d,]*$/);
      if (numeric) {
        matches = Number(candidate.replace(/,/g, ''));
        break;
      }

      const itemMatches = candidate.matchAll(/Item\s+(\d+)/g);
      for (const match of itemMatches) {
        collectedItemIds.push(Number(match[1]));
      }
    }

    champions.push(skillCappedChampionRowSchema.parse({
      championName: championName.trim(),
      role,
      tier,
      winRate: Number(winRate),
      pickRate: Number(pickRate),
      banRate: Number(banRate),
      matches,
      coreItemIds: collectedItemIds.slice(0, 3)
    }));
  }

  return skillCappedMetaSnapshotSchema.parse({
    patch: patchUpdatedMatch[1],
    updatedLabel: patchUpdatedMatch[2].trim(),
    fetchedAt: new Date().toISOString(),
    totalMatchesAnalyzed: totalMatchesMatch ? Number(totalMatchesMatch[1].replace(/,/g, '')) : 0,
    sourceUrl: statsUrl,
    champions
  });
}

export async function syncSkillCappedMetaSnapshot(force = false) {
  if (!force) {
    const existing = await getLatestSkillCappedMetaSnapshot();
    if (existing) return existing;
  }

  const html = await fetchText(statsUrl);
  const snapshot = parseSnapshot(htmlToText(html));
  await saveSnapshot(snapshot);
  return snapshot;
}

export async function loadSkillCappedMetaSnapshots() {
  const [localSnapshots, storedSnapshots] = await Promise.all([loadLocalSnapshots(), loadStoredSnapshots()]);
  const deduped = new Map<string, SkillCappedMetaSnapshot>();

  for (const snapshot of [...localSnapshots, ...storedSnapshots]) {
    const existing = deduped.get(snapshot.patch);
    if (!existing || snapshot.fetchedAt > existing.fetchedAt) {
      deduped.set(snapshot.patch, snapshot);
    }
  }

  return Array.from(deduped.values()).sort((left, right) => right.patch.localeCompare(left.patch, undefined, { numeric: true }));
}

export async function getLatestSkillCappedMetaSnapshot() {
  const snapshots = await loadSkillCappedMetaSnapshots();
  return snapshots[0] ?? null;
}
