import { Router } from 'express';
import type { Request } from 'express';
import { env } from '../config/env.js';
import { analyzeCurrentPatchImpact, getCurrentPatchImpactReport } from '../services/patchImpact.js';
import { getCurrentPatchNotes, refreshPatchNotesFromOfficialSource } from '../services/patchNotes.js';

export const internalRouter = Router();

function extractSyncSecret(req: Request) {
  const authHeader = req.header('authorization');
  if (authHeader?.startsWith('Bearer ')) {
    return authHeader.slice('Bearer '.length).trim();
  }

  return req.header('x-patch-sync-secret')?.trim() ?? null;
}

function isPatchSyncAuthorized(req: Request) {
  if (!env.PATCH_SYNC_SECRET) return false;
  return extractSyncSecret(req) === env.PATCH_SYNC_SECRET;
}

internalRouter.use('/patch', (req, res, next) => {
  if (!env.PATCH_SYNC_SECRET) {
    res.status(503).json({
      error: 'PATCH_SYNC_SECRET is not configured'
    });
    return;
  }

  if (!isPatchSyncAuthorized(req)) {
    res.status(401).json({
      error: 'Invalid patch sync secret'
    });
    return;
  }

  next();
});

internalRouter.get('/patch/status', async (_req, res) => {
  try {
    const currentPatch = await getCurrentPatchNotes();
    res.json({
      ok: true,
      autoSyncEnabled: env.PATCH_NOTES_AUTO_SYNC,
      intervalHours: env.PATCH_NOTES_SYNC_INTERVAL_HOURS,
      currentPatch: currentPatch?.patch ?? null,
      sourceUrl: currentPatch?.sourceUrl ?? env.PATCH_NOTES_TAG_URL,
      detectedAt: currentPatch?.detectedAt ?? null
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

internalRouter.post('/patch/sync', async (_req, res) => {
  try {
    const refreshedPatch = await refreshPatchNotesFromOfficialSource(true);
    const currentPatch = await getCurrentPatchNotes();

    res.json({
      ok: true,
      refreshed: Boolean(refreshedPatch),
      currentPatch: currentPatch?.patch ?? null,
      refreshedPatch: refreshedPatch?.patch ?? null,
      sourceUrl: currentPatch?.sourceUrl ?? env.PATCH_NOTES_TAG_URL,
      detectedAt: currentPatch?.detectedAt ?? refreshedPatch?.detectedAt ?? null
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

internalRouter.get('/patch/impact/status', async (_req, res) => {
  try {
    const report = await getCurrentPatchImpactReport();
    res.json({
      ok: true,
      patch: report?.patch ?? null,
      generatedAt: report?.generatedAt ?? null,
      signals: report?.signals.length ?? 0,
      summary: report?.summary ?? null
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

internalRouter.post('/patch/impact/analyze', async (_req, res) => {
  try {
    const report = await analyzeCurrentPatchImpact(true);
    if (!report) {
      res.status(404).json({ error: 'No patch impact report could be generated' });
      return;
    }

    res.json({
      ok: true,
      patch: report.patch,
      generatedAt: report.generatedAt,
      signals: report.signals.length,
      summary: report.summary
    });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});
