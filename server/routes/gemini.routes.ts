import { Router, Request, Response } from 'express';
import { ENV } from '../config/env';
import { validateGeminiApiKey } from '../services/gemini.service';

export const geminiRouter = Router();

// GET /api/gemini/status - Check whether an environment key is active and which model is configured
geminiRouter.get('/status', (req: Request, res: Response) => {
  res.json({
    hasEnvKey: Boolean(ENV.GEMINI_API_KEY && ENV.GEMINI_API_KEY.trim()),
    model: 'gemini-3.8-flash',
  });
});

// POST /api/gemini/validate - Test connection with Gemini API using provided or env key
geminiRouter.post('/validate', async (req: Request, res: Response) => {
  const customKey =
    (req.body?.apiKey as string) || (req.headers['x-gemini-key'] as string) || undefined;

  const result = await validateGeminiApiKey(customKey);
  if (!result.valid) {
    res.status(400).json(result);
    return;
  }
  res.json(result);
});
