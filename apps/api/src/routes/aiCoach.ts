import { Router } from 'express';
import { aiCoachFeedbackSchema, aiCoachRequestSchema } from '../services/aiCoachSchemas.js';
import { generateAICoach } from '../services/aiCoachService.js';
import { saveAICoachingFeedback } from '../services/aiCoachStore.js';
import { getCurrentPatchNotes, refreshPatchNotesFromOfficialSource } from '../services/patchNotes.js';

export const aiCoachRouter = Router();

aiCoachRouter.get('/patch/current', async (_req, res) => {
  try {
    const currentPatch = await getCurrentPatchNotes();
    if (!currentPatch) {
      res.status(404).json({ error: 'No patch notes configured' });
      return;
    }

    res.json(currentPatch);
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

aiCoachRouter.post('/patch/refresh', async (_req, res) => {
  try {
    const patch = await refreshPatchNotesFromOfficialSource(true);
    if (!patch) {
      res.status(404).json({ error: 'No patch note could be refreshed' });
      return;
    }

    res.json({ ok: true, patch });
  } catch (error) {
    res.status(500).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

aiCoachRouter.post('/generate', async (req, res) => {
  try {
    const input = aiCoachRequestSchema.parse(req.body);
    const result = await generateAICoach(input);
    res.json(result);
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

aiCoachRouter.post('/feedback', async (req, res) => {
  try {
    const input = aiCoachFeedbackSchema.parse(req.body);
    const feedbackId = await saveAICoachingFeedback(input);
    res.json({ ok: true, feedbackId });
  } catch (error) {
    res.status(400).json({
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});
