import { Router } from 'express';
import { z } from 'zod';
import { collectPlayerSnapshot } from '../services/collectionService.js';
import { createJob, getJob, updateJob } from '../services/jobStore.js';

const bodySchema = z.object({
  gameName: z.string().min(1),
  tagLine: z.string().min(1),
  count: z.number().int().positive().max(100).optional(),
  knownMatchIds: z.array(z.string().min(1)).max(500).optional()
});

export const analyticsRouter = Router();

analyticsRouter.post('/collect', async (req, res) => {
  try {
    const input = bodySchema.parse(req.body);
    const dataset = await collectPlayerSnapshot(input);
    res.json(dataset);
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
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
          error: error instanceof Error ? error.message : 'Unknown error'
        });
      });

    res.json({
      jobId: job.id,
      status: job.status,
      progress: job.progress
    });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Unknown error' });
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
