import { Router, Request, Response } from 'express';
import { SAMPLE_RECRUITMENT_EMAILS } from '../data/sample-emails';
import { fetchOutlookMessages, fetchGmailMessages } from '../services/email-sync.service';
import { analyzeEmailsWithAI } from '../services/email-analyzer.service';
import { asyncHandler } from '../middleware/asyncHandler';

export const emailsRouter = Router();

// Endpoint: Sample realistic recruitment emails for immediate testing
emailsRouter.get('/sample-emails', (req: Request, res: Response) => {
  res.json({ emails: SAMPLE_RECRUITMENT_EMAILS });
});

// Endpoint: Fetch real messages from Microsoft Graph API
emailsRouter.post(
  '/outlook/messages',
  asyncHandler(
    async (req: Request, res: Response) => {
      const token = req.headers.authorization?.replace(/^Bearer\s+/i, '') || req.body.token;

      if (!token) {
        res.status(401).json({ error: 'Brak tokena dostępu do Microsoft Graph' });
        return;
      }

      const emails = await fetchOutlookMessages(token);
      res.json({ emails });
    },
    { message: 'Nie udało się pobrać wiadomości z Outlook' }
  )
);

// Endpoint: Fetch real messages from Gmail API
emailsRouter.post(
  '/gmail/messages',
  asyncHandler(
    async (req: Request, res: Response) => {
      const token = req.headers.authorization?.replace(/^Bearer\s+/i, '') || req.body.token;

      if (!token) {
        res.status(401).json({ error: 'Brak tokena dostępu do Gmail API' });
        return;
      }

      const emails = await fetchGmailMessages(token);
      res.json({ emails });
    },
    { message: 'Nie udało się pobrać wiadomości z Gmail' }
  )
);

// Endpoint: AI Analysis of Emails against user's applications
emailsRouter.post(
  '/analyze-emails',
  asyncHandler(
    async (req: Request, res: Response) => {
      const { emails, applications, customApiKey } = req.body;
      const customKey = (req.headers['x-gemini-key'] as string) || customApiKey;

      if (!Array.isArray(emails) || emails.length === 0) {
        res.status(400).json({ error: 'Przekaż tablicę wiadomości do analizy (emails)' });
        return;
      }

      const appList = Array.isArray(applications) ? applications : [];
      const result = await analyzeEmailsWithAI(emails, appList, customKey);
      res.json(result);
    },
    { message: 'Nie udało się przeanalizować wiadomości' }
  )
);
