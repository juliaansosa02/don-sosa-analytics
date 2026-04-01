import { readFile } from 'node:fs/promises';
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

  if (!pool) {
    await ensureWrite(`${generationsDir}/${id}.json`, JSON.stringify({ id, profileKey, ...input }, null, 2));
    return id;
  }

  await ensureTables();
  await pool.query(
    `INSERT INTO ai_coaching_generations (
      id, profile_key, locale, role_filter, queue_filter, window_filter, provider, model,
      request_payload, context_payload, retrieval_payload, response_payload
    ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9::jsonb,$10::jsonb,$11::jsonb,$12::jsonb)`,
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
      JSON.stringify(input.coach)
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
