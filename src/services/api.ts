import { JobApplication, EmailMessage, EmailAnalysisResult } from '../types';

export interface ParseJobResponse {
  role: string;
  company: string;
  location?: string;
  salary?: string;
  portal: string;
  skills?: string[];
  notes?: string;
  source: string;
}

export interface BatchParseResponse {
  results: Array<{
    id: string;
    url: string;
    title?: string;
    role: string;
    company: string;
    location?: string;
    portal: string;
    skills: string[];
    notes?: string;
    source: string;
  }>;
  isAiUsed: boolean;
  warning?: string;
}

export interface AnalyzeEmailsResponse {
  results: EmailAnalysisResult[];
  analyzedCount: number;
  changesCount: number;
  source: 'gemini' | 'fallback' | 'heuristic';
  warning?: string;
}

export const api = {
  // Parse single job URL or snippet
  async parseJob(payload: { url?: string; rawText?: string; linkTitle?: string }): Promise<ParseJobResponse> {
    const res = await fetch('/api/parse-job', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      throw new Error(`Błąd API parse-job: ${res.statusText}`);
    }
    return res.json();
  },

  // Batch parse multiple job links
  async batchParse(payload: { items: Array<{ id: string; url: string; title: string; rawText?: string }> }): Promise<BatchParseResponse> {
    const res = await fetch('/api/batch-parse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      throw new Error(`Błąd API batch-parse: ${res.statusText}`);
    }
    return res.json();
  },

  // Fetch OAuth authorization URLs
  async getOutlookAuthUrl(): Promise<{ url: string; redirectUri: string; isConfigured: boolean }> {
    const res = await fetch('/api/auth/outlook/url');
    if (!res.ok) throw new Error('Błąd pobierania URL autoryzacji Outlook');
    return res.json();
  },

  async getGmailAuthUrl(): Promise<{ url: string; redirectUri: string; isConfigured: boolean }> {
    const res = await fetch('/api/auth/gmail/url');
    if (!res.ok) throw new Error('Błąd pobierania URL autoryzacji Gmail');
    return res.json();
  },

  // Fetch emails from providers or sample data
  async fetchSampleEmails(): Promise<{ emails: EmailMessage[] }> {
    const res = await fetch('/api/sample-emails');
    if (!res.ok) throw new Error('Błąd pobierania przykładowych maili');
    return res.json();
  },

  async fetchOutlookMessages(token: string): Promise<{ emails: EmailMessage[] }> {
    const res = await fetch('/api/outlook/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ token }),
    });
    if (!res.ok) throw new Error('Błąd pobierania maili z Outlook');
    return res.json();
  },

  async fetchGmailMessages(token: string): Promise<{ emails: EmailMessage[] }> {
    const res = await fetch('/api/gmail/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ token }),
    });
    if (!res.ok) throw new Error('Błąd pobierania maili z Gmail');
    return res.json();
  },

  // Analyze emails with AI against current applications
  async analyzeEmails(payload: {
    emails: EmailMessage[];
    applications: JobApplication[];
  }): Promise<AnalyzeEmailsResponse> {
    const res = await fetch('/api/analyze-emails', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      throw new Error(`Błąd analizy maili: ${res.statusText}`);
    }
    return res.json();
  },
};
