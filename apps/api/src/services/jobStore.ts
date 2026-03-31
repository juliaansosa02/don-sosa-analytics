import { randomUUID } from 'node:crypto';

export interface JobProgress {
  stage: string;
  current: number;
  total: number;
  message: string;
}

export interface CollectionJob<T = unknown> {
  id: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  progress: JobProgress;
  result?: T;
  error?: string;
  createdAt: string;
  updatedAt: string;
}

const jobs = new Map<string, CollectionJob>();

function now() {
  return new Date().toISOString();
}

export function createJob() {
  const id = randomUUID();
  const job: CollectionJob = {
    id,
    status: 'pending',
    progress: {
      stage: 'queued',
      current: 0,
      total: 1,
      message: 'Trabajo en cola'
    },
    createdAt: now(),
    updatedAt: now()
  };

  jobs.set(id, job);
  return job;
}

export function getJob<T = unknown>(id: string) {
  return jobs.get(id) as CollectionJob<T> | undefined;
}

export function updateJob(id: string, patch: Partial<CollectionJob>) {
  const current = jobs.get(id);
  if (!current) return;

  jobs.set(id, {
    ...current,
    ...patch,
    progress: patch.progress ?? current.progress,
    updatedAt: now()
  });
}
