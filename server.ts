import express, { Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { ENV } from './server/config/env';
import { jobsRouter } from './server/routes/jobs.routes';
import { authRouter, renderAuthCallbackHtml } from './server/routes/auth.routes';
import { emailsRouter } from './server/routes/emails.routes';
import { geminiRouter } from './server/routes/gemini.routes';

// Re-export for backward compatibility
export { deducePortalAndHints } from './server/services/heuristics.service';

const app = express();

app.use(express.json({ limit: '10mb' }));

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// OAuth Callback handler for both Outlook and Gmail popups
app.get(['/auth/callback', '/auth/callback/'], (req: Request, res: Response) => {
  res.send(renderAuthCallbackHtml());
});

// Mount modular API routers
app.use('/api', authRouter);
app.use('/api', jobsRouter);
app.use('/api', emailsRouter);
app.use('/api/gemini', geminiRouter);

// Production static assets & Vite development middleware
async function startServer() {
  if (!ENV.IS_PRODUCTION) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(ENV.PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${ENV.PORT}`);
  });
}

startServer();
