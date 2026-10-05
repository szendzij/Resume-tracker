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

const CUSTOM_GEMINI_KEY_STORAGE = 'job_tracker_gemini_custom_key_v1';

export function getCustomGeminiKey(): string {
  try {
    return localStorage.getItem(CUSTOM_GEMINI_KEY_STORAGE) || '';
  } catch {
    return '';
  }
}

export function setCustomGeminiKey(key: string): void {
  try {
    if (key && key.trim()) {
      localStorage.setItem(CUSTOM_GEMINI_KEY_STORAGE, key.trim());
    } else {
      localStorage.removeItem(CUSTOM_GEMINI_KEY_STORAGE);
    }
  } catch (e) {
    console.error('Error saving custom Gemini key to localStorage', e);
  }
}

function getAuthHeaders(extraHeaders: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...extraHeaders,
  };
  const customKey = getCustomGeminiKey();
  if (customKey) {
    headers['x-gemini-key'] = customKey;
  }
  return headers;
}

export const api = {
  // Parse single job URL or snippet
  async parseJob(payload: { url?: string; rawText?: string; linkTitle?: string }): Promise<ParseJobResponse> {
    const res = await fetch('/api/parse-job', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errJson = await res.json().catch(() => null);
      throw new Error(`Błąd API parse-job: ${errJson?.error || res.statusText}`);
    }
    return res.json();
  },

  // Batch parse multiple job links
  async batchParse(payload: { items: Array<{ id: string; url: string; title: string; rawText?: string }> }): Promise<BatchParseResponse> {
    const res = await fetch('/api/batch-parse', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errJson = await res.json().catch(() => null);
      throw new Error(`Błąd API batch-parse: ${errJson?.error || res.statusText}`);
    }
    return res.json();
  },

  // Fetch OAuth authorization URLs
  async getOutlookAuthUrl(): Promise<{ url: string; redirectUri: string; isConfigured: boolean }> {
    const res = await fetch('/api/auth/outlook/url');
    if (!res.ok) {
      const errJson = await res.json().catch(() => null);
      throw new Error(`Błąd pobierania URL autoryzacji Outlook: ${errJson?.error || res.statusText}`);
    }
    return res.json();
  },

  async getGmailAuthUrl(): Promise<{ url: string; redirectUri: string; isConfigured: boolean }> {
    const res = await fetch('/api/auth/gmail/url');
    if (!res.ok) {
      const errJson = await res.json().catch(() => null);
      throw new Error(`Błąd pobierania URL autoryzacji Gmail: ${errJson?.error || res.statusText}`);
    }
    return res.json();
  },

  // Fetch emails from providers or sample data
  async fetchSampleEmails(): Promise<{ emails: EmailMessage[] }> {
    const res = await fetch('/api/sample-emails');
    if (!res.ok) {
      const errJson = await res.json().catch(() => null);
      throw new Error(`Błąd pobierania przykładowych maili: ${errJson?.error || res.statusText}`);
    }
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
    if (!res.ok) {
      const errJson = await res.json().catch(() => null);
      throw new Error(`Błąd pobierania maili z Outlook: ${errJson?.error || res.statusText}`);
    }
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
    if (!res.ok) {
      const errJson = await res.json().catch(() => null);
      throw new Error(`Błąd pobierania maili z Gmail: ${errJson?.error || res.statusText}`);
    }
    return res.json();
  },

  // Analyze emails with AI against current applications
  async analyzeEmails(payload: {
    emails: EmailMessage[];
    applications: JobApplication[];
  }): Promise<AnalyzeEmailsResponse> {
    const res = await fetch('/api/analyze-emails', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const errJson = await res.json().catch(() => null);
      throw new Error(`Błąd analizy maili: ${errJson?.error || res.statusText}`);
    }
    return res.json();
  },

  // Gemini API Key status & validation
  async getGeminiStatus(): Promise<{ hasEnvKey: boolean; model: string }> {
    const res = await fetch('/api/gemini/status');
    if (!res.ok) {
      return { hasEnvKey: false, model: 'gemini-3.8-flash' };
    }
    return res.json();
  },

  async validateGeminiKey(apiKey?: string): Promise<{
    valid: boolean;
    model: string;
    response?: string;
    error?: string;
  }> {
    const res = await fetch('/api/gemini/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ apiKey }),
    });
    const data = await res.json();
    return data;
  },

  // Applications Database Endpoints
  async getApplications(): Promise<JobApplication[]> {
    const res = await fetch('/api/applications', {
      method: 'GET',
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      const errJson = await res.json().catch(() => null);
      throw new Error(`Błąd pobierania aplikacji: ${errJson?.error || res.statusText}`);
    }
    return res.json();
  },

  async createApplication(app: JobApplication): Promise<JobApplication> {
    const res = await fetch('/api/applications', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(app),
    });
    if (!res.ok) {
      const errJson = await res.json().catch(() => null);
      throw new Error(`Błąd tworzenia aplikacji: ${errJson?.error || res.statusText}`);
    }
    return res.json();
  },

  async batchCreateApplications(applications: JobApplication[]): Promise<{ count: number; success: boolean }> {
    const res = await fetch('/api/applications/batch', {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify({ applications }),
    });
    if (!res.ok) {
      const errJson = await res.json().catch(() => null);
      throw new Error(`Błąd masowego zapisu aplikacji: ${errJson?.error || res.statusText}`);
    }
    return res.json();
  },

  async updateApplication(id: string, updates: Partial<JobApplication>): Promise<JobApplication> {
    const res = await fetch(`/api/applications/${id}`, {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const errJson = await res.json().catch(() => null);
      throw new Error(`Błąd aktualizacji aplikacji: ${errJson?.error || res.statusText}`);
    }
    return res.json();
  },

  async batchUpdateApplications(
    updates: Array<{ id: string } & Partial<JobApplication>>
  ): Promise<{ count: number; success: boolean }> {
    const res = await fetch('/api/applications/batch', {
      method: 'PUT',
      headers: getAuthHeaders(),
      body: JSON.stringify(updates),
    });
    if (!res.ok) {
      const errJson = await res.json().catch(() => null);
      throw new Error(`Błąd masowej aktualizacji aplikacji: ${errJson?.error || res.statusText}`);
    }
    return res.json();
  },

  async deleteApplication(id: string): Promise<{ success: boolean; id: string }> {
    const res = await fetch(`/api/applications/${id}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    if (!res.ok) {
      const errJson = await res.json().catch(() => null);
      throw new Error(`Błąd usuwania aplikacji: ${errJson?.error || res.statusText}`);
    }
    return res.json();
  },

  async batchDeleteApplications(ids: string[]): Promise<{ success: boolean; count: number }> {
    const res = await fetch('/api/applications', {
      method: 'DELETE',
      headers: getAuthHeaders(),
      body: JSON.stringify({ ids }),
    });
    if (!res.ok) {
      const errJson = await res.json().catch(() => null);
      throw new Error(`Błąd masowego usuwania aplikacji: ${errJson?.error || res.statusText}`);
    }
    return res.json();
  },
};
