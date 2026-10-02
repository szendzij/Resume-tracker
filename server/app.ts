import express, { Request, Response } from 'express';
import { jobsRouter } from './routes/jobs.routes';
import { authRouter, renderAuthCallbackHtml } from './routes/auth.routes';
import { emailsRouter } from './routes/emails.routes';
import { geminiRouter } from './routes/gemini.routes';
import { applicationsRouter } from './routes/applications.routes';

export const app = express();

app.use(express.json({ limit: '10mb' }));

app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-gemini-key');
  res.header('Access-Control-Allow-Private-Network', 'true');
  if (req.method === 'OPTIONS') {
    res.sendStatus(204);
    return;
  }
  next();
});

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
app.use('/api/applications', applicationsRouter);
