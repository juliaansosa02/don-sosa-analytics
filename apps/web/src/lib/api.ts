import type { AICoachResult, Dataset, MembershipCatalogResponse, MembershipMeResponse } from '../types';
import type { Locale } from './i18n';

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ?? 'http://localhost:8787/api';
const REQUEST_TIMEOUT_MS = 300000;
const POLL_INTERVAL_MS = 1200;
const CLIENT_ID_STORAGE_KEY = 'don-sosa:client-id';

interface CollectionJobResponse {
  jobId: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: {
    stage: string;
    current: number;
    total: number;
    message: string;
  };
  result?: Dataset;
  error?: string;
}

function delay(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function generateClientId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) {
    return crypto.randomUUID();
  }

  return `viewer-${Math.random().toString(36).slice(2)}-${Date.now().toString(36)}`;
}

export function getOrCreateClientId() {
  const existing = window.localStorage.getItem(CLIENT_ID_STORAGE_KEY);
  if (existing) return existing;
  const next = generateClientId();
  window.localStorage.setItem(CLIENT_ID_STORAGE_KEY, next);
  return next;
}

function apiHeaders(extra?: HeadersInit) {
  return {
    'x-don-sosa-client-id': getOrCreateClientId(),
    ...(extra ?? {})
  };
}

async function readErrorMessage(response: Response) {
  const text = await response.text();

  try {
    const parsed = JSON.parse(text) as { error?: string };
    return parsed.error ?? text;
  } catch {
    return text;
  }
}

export async function collectProfile(
  gameName: string,
  tagLine: string,
  count = 100,
  options?: {
    platform?: string;
    locale?: Locale;
    onProgress?: (progress: { stage: string; current: number; total: number; message: string }) => void;
    knownMatchIds?: string[];
  }
): Promise<Dataset> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const startResponse = await fetch(`${API_BASE}/analytics/collect/start`, {
      method: 'POST',
      headers: apiHeaders({ 'Content-Type': 'application/json' }),
      body: JSON.stringify({ gameName, tagLine, platform: options?.platform, count, knownMatchIds: options?.knownMatchIds ?? [], locale: options?.locale ?? 'es' }),
      signal: controller.signal
    });

    if (!startResponse.ok) {
      throw new Error(await readErrorMessage(startResponse));
    }

    const startJob = (await startResponse.json()) as CollectionJobResponse;
    options?.onProgress?.(startJob.progress);

    while (true) {
      await delay(POLL_INTERVAL_MS);

      const jobResponse = await fetch(`${API_BASE}/analytics/collect/${startJob.jobId}`, {
        headers: apiHeaders(),
        signal: controller.signal
      });

      if (!jobResponse.ok) {
        throw new Error(await readErrorMessage(jobResponse));
      }

      const job = (await jobResponse.json()) as CollectionJobResponse;
      options?.onProgress?.(job.progress);

      if (job.status === 'completed' && job.result) {
        return job.result;
      }

      if (job.status === 'failed') {
        throw new Error(job.error ?? 'Unknown error');
      }
    }
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new Error(options?.locale === 'en'
        ? 'The analysis took too long. Try fewer matches or make sure the API is running.'
        : 'El análisis tardó demasiado. Probá con menos partidas o revisá si la API está levantada.');
    }

    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function fetchCachedProfile(gameName: string, tagLine: string, platform: string, locale: Locale = 'es'): Promise<Dataset | null> {
  const response = await fetch(`${API_BASE}/analytics/profile/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}?locale=${locale}&platform=${encodeURIComponent(platform)}`, {
    headers: apiHeaders()
  });
  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return response.json() as Promise<Dataset>;
}

export async function generateAICoach(input: {
  gameName: string;
  tagLine: string;
  platform: string;
  locale: Locale;
  roleFilter: string;
  coachRoles: string[];
  queueFilter: 'ALL' | 'RANKED' | 'RANKED_SOLO' | 'RANKED_FLEX' | 'OTHER';
  windowFilter: 'ALL' | 'LAST_20' | 'LAST_8';
}): Promise<AICoachResult> {
  const response = await fetch(`${API_BASE}/ai/coach/generate`, {
    method: 'POST',
    headers: apiHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(input)
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return response.json() as Promise<AICoachResult>;
}

export async function sendAICoachFeedback(input: {
  generationId: string;
  verdict: 'useful' | 'mixed' | 'generic' | 'incorrect';
  notes?: string;
}) {
  const response = await fetch(`${API_BASE}/ai/coach/feedback`, {
    method: 'POST',
    headers: apiHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify(input)
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return response.json() as Promise<{ ok: true; feedbackId: string }>;
}

export async function fetchMembershipCatalog() {
  const response = await fetch(`${API_BASE}/membership/catalog`, {
    headers: apiHeaders()
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return response.json() as Promise<MembershipCatalogResponse>;
}

export async function fetchMembershipMe() {
  const response = await fetch(`${API_BASE}/membership/me`, {
    headers: apiHeaders()
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return response.json() as Promise<MembershipMeResponse>;
}

export async function setMembershipPlanDev(planId: 'free' | 'pro_player' | 'pro_coach') {
  const response = await fetch(`${API_BASE}/membership/dev/plan`, {
    method: 'POST',
    headers: apiHeaders({ 'Content-Type': 'application/json' }),
    body: JSON.stringify({ planId })
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return response.json() as Promise<{ ok: true; account: MembershipMeResponse['account']; plan: MembershipMeResponse['plan'] }>;
}
