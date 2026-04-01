import { Router } from 'express';
import { aiCoachFeedbackSchema, aiCoachRequestSchema } from '../services/aiCoachSchemas.js';
import { generateAICoach } from '../services/aiCoachService.js';
import { saveAICoachingFeedback } from '../services/aiCoachStore.js';

export const aiCoachRouter = Router();

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
