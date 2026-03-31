import { Router } from 'express';
import { z } from 'zod';
import { HttpError } from '../lib/http.js';
import { collectPlayerSnapshot } from '../services/collectionService.js';
import { createJob, getJob, updateJob } from '../services/jobStore.js';
import { loadProfileSnapshot } from '../services/profileStore.js';

const bodySchema = z.object({
  gameName: z.string().min(1),
  tagLine: z.string().min(1),
  count: z.number().int().positive().max(100).optional(),
  knownMatchIds: z.array(z.string().min(1)).max(500).optional()
});

export const analyticsRouter = Router();

function formatCollectionError(error: unknown) {
  if (error instanceof HttpError) {
    if (error.status === 403) {
      return 'La Riot API key del servidor no es válida o ya expiró. Actualizala en Render antes de seguir analizando.';
    }

    if (error.status === 429) {
      return 'Riot limitó temporalmente las requests. Esperá un poco y probá otra vez con menos partidas si hace falta.';
    }

    if (error.status === 404) {
      return 'No pudimos encontrar esa cuenta o alguna de sus partidas. Revisá el Riot ID y volvé a intentar.';
    }
  }

  return error instanceof Error ? error.message : 'Unknown error';
}

analyticsRouter.post('/collect', async (req, res) => {
  try {
    const input = bodySchema.parse(req.body);
    const dataset = await collectPlayerSnapshot(input);
    res.json(dataset);
  } catch (error) {
    res.status(400).json({ error: formatCollectionError(error) });
  }
});

analyticsRouter.post('/collect/start', async (req, res) => {
  try {
    const input = bodySchema.parse(req.body);
    const job = createJob();

    void collectPlayerSnapshot({
      ...input,
      onProgress: (progress) => updateJob(job.id, { status: 'running', progress })
    })
      .then((dataset) => {
        updateJob(job.id, {
          status: 'completed',
          progress: {
            stage: 'completed',
            current: dataset.summary.matches,
            total: dataset.summary.matches || 1,
            message: 'Analisis completado'
          },
          result: dataset
        });
      })
      .catch((error) => {
        updateJob(job.id, {
          status: 'failed',
          error: formatCollectionError(error)
        });
      });

    res.json({
      jobId: job.id,
      status: job.status,
      progress: job.progress
    });
  } catch (error) {
    res.status(400).json({ error: formatCollectionError(error) });
  }
});

analyticsRouter.get('/collect/:jobId', (req, res) => {
  const job = getJob(req.params.jobId);
  if (!job) {
    res.status(404).json({ error: 'Job not found' });
    return;
  }

  res.json(job);
});

analyticsRouter.get('/profile/:gameName/:tagLine', async (req, res) => {
  const dataset = await loadProfileSnapshot(req.params.gameName, req.params.tagLine);
  if (!dataset) {
    res.status(404).json({ error: 'No cached profile found' });
    return;
  }

  res.json(dataset);
});
