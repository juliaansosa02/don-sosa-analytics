import type { Dataset } from '../types';

const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined)?.replace(/\/$/, '') ?? 'http://localhost:8787/api';
const REQUEST_TIMEOUT_MS = 300000;
const POLL_INTERVAL_MS = 1200;

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
    onProgress?: (progress: { stage: string; current: number; total: number; message: string }) => void;
    knownMatchIds?: string[];
  }
): Promise<Dataset> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    const startResponse = await fetch(`${API_BASE}/analytics/collect/start`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameName, tagLine, count, knownMatchIds: options?.knownMatchIds ?? [] }),
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
      throw new Error('El análisis tardó demasiado. Probá con menos partidas o revisá si la API está levantada.');
    }

    throw error;
  } finally {
    window.clearTimeout(timeout);
  }
}

export async function fetchCachedProfile(gameName: string, tagLine: string): Promise<Dataset | null> {
  const response = await fetch(`${API_BASE}/analytics/profile/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`);
  if (response.status === 404) {
    return null;
  }

  if (!response.ok) {
    throw new Error(await readErrorMessage(response));
  }

  return response.json() as Promise<Dataset>;
}
