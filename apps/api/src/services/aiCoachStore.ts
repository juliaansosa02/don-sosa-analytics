import { readFile, readdir } from 'node:fs/promises';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { Pool } from 'pg';
import { env } from '../config/env.js';
import { ensureWrite } from '../utils/fs.js';
import type { AICoachFeedback, AICoachOutput, AICoachRequest, AICoachContext } from './aiCoachSchemas.js';

const generationsDir = fileURLToPath(new URL('../../data/ai-coach/generations', import.meta.url));
const feedbackDir = fileURLToPath(new URL('../../data/ai-coach/feedback', import.meta.url));
const pool = env.DATABASE_URL ? new Pool({ connectionString: env.DATABASE_URL }) : null;
let tableReady: Promise<void> | null = null;

async function ensureTables() {
  if (!pool) return;
  if (!tableReady) {
    tableReady = Promise.all([
      pool.query(`
        CREATE TABLE IF NOT EXISTS ai_coaching_generations (
          id TEXT PRIMARY KEY,
          profile_key TEXT NOT NULL,
          locale TEXT NOT NULL,
          role_filter TEXT NOT NULL,
          queue_filter TEXT NOT NULL,
          window_filter TEXT NOT NULL,
          provider TEXT NOT NULL,
          model TEXT,
          request_payload JSONB NOT NULL,
          context_payload JSONB NOT NULL,
          retrieval_payload JSONB NOT NULL,
          response_payload JSONB NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `),
      pool.query(`
        CREATE TABLE IF NOT EXISTS ai_coaching_feedback (
          id TEXT PRIMARY KEY,
          generation_id TEXT NOT NULL,
          verdict TEXT NOT NULL,
          notes TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `)
    ]).then(() => undefined);
  }

  await tableReady;
}

function normalizeProfileKey(gameName: string, tagLine: string) {
  return `${gameName.trim().toLowerCase()}-${tagLine.trim().toLowerCase()}`
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/-+/g, '-');
}

function buildMonthRange(monthKey?: string) {
  const now = monthKey ? new Date(`${monthKey}-01T00:00:00.000Z`) : new Date();
  const year = now.getUTCFullYear();
  const month = now.getUTCMonth();
  const start = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, month + 1, 1, 0, 0, 0, 0));
  const normalizedMonthKey = `${start.getUTCFullYear()}-${String(start.getUTCMonth() + 1).padStart(2, '0')}`;
  return { monthKey: normalizedMonthKey, start, end };
}

export async function saveAICoachingGeneration(input: {
  request: AICoachRequest;
  context: AICoachContext;
  provider: 'draft' | 'openai';
  model?: string | null;
  retrieval: unknown;
  coach: AICoachOutput;
}) {
  const id = randomUUID();
  const profileKey = normalizeProfileKey(input.request.gameName, input.request.tagLine);
  const createdAt = new Date().toISOString();

  if (!pool) {
    await ensureWrite(`${generationsDir}/${id}.json`, JSON.stringify({ id, profileKey, createdAt, ...input }, null, 2));
    return id;
  }

  await ensureTables();
  await pool.query(
    `INSERT INTO ai_coaching_generations (
      id, profile_key, locale, role_filter, queue_filter, window_filter, provider, model,
      request_payload, context_payload, retrieval_payload, response_payload, created_at
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10::jsonb,$11::jsonb,$12::jsonb,$13)`,
    [
      id,
      profileKey,
      input.request.locale,
      input.request.roleFilter,
      input.request.queueFilter,
      input.request.windowFilter,
      input.provider,
      input.model ?? null,
      JSON.stringify(input.request),
      JSON.stringify(input.context),
      JSON.stringify(input.retrieval),
      JSON.stringify(input.coach),
      createdAt
    ]
  );

  return id;
}

export async function saveAICoachingFeedback(feedback: AICoachFeedback) {
  const id = randomUUID();

  if (!pool) {
    await ensureWrite(`${feedbackDir}/${id}.json`, JSON.stringify({ id, ...feedback }, null, 2));
    return id;
  }

  await ensureTables();
  await pool.query(
    `INSERT INTO ai_coaching_feedback (id, generation_id, verdict, notes) VALUES ($1, $2, $3, $4)`,
    [id, feedback.generationId, feedback.verdict, feedback.notes ?? null]
  );
  return id;
}

export async function loadAICoachingGeneration(id: string) {
  if (!pool) {
    try {
      const raw = await readFile(`${generationsDir}/${id}.json`, 'utf8');
      return JSON.parse(raw) as unknown;
    } catch {
      return null;
    }
  }

  await ensureTables();
  const result = await pool.query<{ response_payload: unknown; retrieval_payload: unknown; context_payload: unknown; provider: string; model: string | null }>(
    `SELECT response_payload, retrieval_payload, context_payload, provider, model FROM ai_coaching_generations WHERE id = $1 LIMIT 1`,
    [id]
  );
  return result.rows[0] ?? null;
}

export async function loadLatestAICoachingGenerationForRequest(input: {
  gameName: string;
  tagLine: string;
  locale: string;
  roleFilter: string;
  queueFilter: string;
  windowFilter: string;
}) {
  const profileKey = normalizeProfileKey(input.gameName, input.tagLine);

  if (!pool) {
    try {
      const files = await readdir(generationsDir);
      const generations = await Promise.all(files
        .filter((file) => file.endsWith('.json'))
        .map(async (file) => {
          try {
            const raw = await readFile(`${generationsDir}/${file}`, 'utf8');
            return JSON.parse(raw) as {
              id: string;
              profileKey: string;
              createdAt?: string;
              request: AICoachRequest;
              provider: 'draft' | 'openai';
              model: string | null;
              context: AICoachContext;
              retrieval: {
                localKnowledgeCount: number;
                localKnowledgeIds: string[];
                usedVectorStore: boolean;
              };
              coach: AICoachOutput;
            };
          } catch {
            return null;
          }
        }));

      return generations
        .filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
        .filter((entry) => (
          entry.profileKey === profileKey &&
          entry.request.locale === input.locale &&
          entry.request.roleFilter === input.roleFilter &&
          entry.request.queueFilter === input.queueFilter &&
          entry.request.windowFilter === input.windowFilter
        ))
        .sort((a, b) => Date.parse(b.createdAt ?? '') - Date.parse(a.createdAt ?? ''))
        .map((entry) => ({
          id: entry.id,
          provider: entry.provider,
          model: entry.model,
          context_payload: entry.context,
          retrieval_payload: entry.retrieval,
          response_payload: entry.coach
        }))[0] ?? null;
    } catch {
      return null;
    }
  }

  await ensureTables();
  const result = await pool.query<{
    id: string;
    provider: 'draft' | 'openai';
    model: string | null;
    context_payload: AICoachContext;
    retrieval_payload: {
      localKnowledgeCount: number;
      localKnowledgeIds: string[];
      usedVectorStore: boolean;
    };
    response_payload: AICoachOutput;
  }>(
    `SELECT id, provider, model, context_payload, retrieval_payload, response_payload
     FROM ai_coaching_generations
     WHERE profile_key = $1
       AND locale = $2
       AND role_filter = $3
       AND queue_filter = $4
       AND window_filter = $5
     ORDER BY created_at DESC
     LIMIT 1`,
    [profileKey, input.locale, input.roleFilter, input.queueFilter, input.windowFilter]
  );

  return result.rows[0] ?? null;
}

export async function loadAICoachUsageForMonth(input: {
  gameName: string;
  tagLine: string;
  monthKey?: string;
}) {
  const profileKey = normalizeProfileKey(input.gameName, input.tagLine);
  const { monthKey, start, end } = buildMonthRange(input.monthKey);

  if (!pool) {
    try {
      const files = await readdir(generationsDir);
      const generations = await Promise.all(files
        .filter((file) => file.endsWith('.json'))
        .map(async (file) => {
          try {
            const raw = await readFile(`${generationsDir}/${file}`, 'utf8');
            return JSON.parse(raw) as {
              profileKey: string;
              provider: 'draft' | 'openai';
              createdAt?: string;
              retrieval?: {
                estimatedCostUsd?: number;
                policyTier?: 'premium' | 'economy' | 'fallback' | 'cached';
              };
            };
          } catch {
            return null;
          }
        }));

      const monthGenerations = generations.filter((entry): entry is NonNullable<typeof entry> => Boolean(entry))
        .filter((entry) => {
          const createdAt = entry.createdAt ? Date.parse(entry.createdAt) : NaN;
          return entry.profileKey === profileKey && Number.isFinite(createdAt) && createdAt >= start.getTime() && createdAt < end.getTime();
        });

      const openaiGenerations = monthGenerations.filter((entry) => entry.provider === 'openai');
      const premiumGenerations = openaiGenerations.filter((entry) => entry.retrieval?.policyTier === 'premium');
      const estimatedCostUsd = openaiGenerations.reduce((sum, entry) => sum + Number(entry.retrieval?.estimatedCostUsd ?? 0), 0);

      return {
        monthKey,
        totalGenerations: monthGenerations.length,
        openaiGenerations: openaiGenerations.length,
        premiumGenerations: premiumGenerations.length,
        estimatedCostUsd: Number(estimatedCostUsd.toFixed(4))
      };
    } catch {
      return {
        monthKey,
        totalGenerations: 0,
        openaiGenerations: 0,
        premiumGenerations: 0,
        estimatedCostUsd: 0
      };
    }
  }

  await ensureTables();
  const result = await pool.query<{
    total_generations: string;
    openai_generations: string;
    premium_generations: string;
    estimated_cost_usd: string;
  }>(
    `SELECT
       COUNT(*)::text AS total_generations,
       COUNT(*) FILTER (WHERE provider = 'openai')::text AS openai_generations,
       COUNT(*) FILTER (
         WHERE provider = 'openai'
           AND COALESCE(retrieval_payload->>'policyTier', '') = 'premium'
       )::text AS premium_generations,
       COALESCE(
         SUM(
           CASE
             WHEN provider = 'openai' THEN COALESCE(NULLIF(retrieval_payload->>'estimatedCostUsd', '')::numeric, 0)
             ELSE 0
           END
         ),
         0
       )::text AS estimated_cost_usd
     FROM ai_coaching_generations
     WHERE profile_key = $1
       AND created_at >= $2
       AND created_at < $3`,
    [profileKey, start.toISOString(), end.toISOString()]
  );

  const row = result.rows[0];
  return {
    monthKey,
    totalGenerations: Number(row?.total_generations ?? 0),
    openaiGenerations: Number(row?.openai_generations ?? 0),
    premiumGenerations: Number(row?.premium_generations ?? 0),
    estimatedCostUsd: Number(Number(row?.estimated_cost_usd ?? 0).toFixed(4))
  };
}
