import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  getEmailSyncStrategy,
  OutlookSyncStrategy,
  GmailSyncStrategy,
  fetchOutlookMessages,
  fetchGmailMessages,
} from './email-sync.service';

describe('email-sync.service (Strategy Pattern)', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    global.fetch = originalFetch;
  });

  describe('getEmailSyncStrategy factory', () => {
    it('returns OutlookSyncStrategy for "outlook"', () => {
      const strategy = getEmailSyncStrategy('outlook');
      expect(strategy).toBeInstanceOf(OutlookSyncStrategy);
      expect(strategy.provider).toBe('outlook');
    });

    it('returns GmailSyncStrategy for "gmail"', () => {
      const strategy = getEmailSyncStrategy('gmail');
      expect(strategy).toBeInstanceOf(GmailSyncStrategy);
      expect(strategy.provider).toBe('gmail');
    });

    it('throws error for unsupported provider', () => {
      expect(() => getEmailSyncStrategy('yahoo' as any)).toThrow(
        'Nieobsługiwany dostawca poczty: yahoo'
      );
    });
  });

  describe('OutlookSyncStrategy', () => {
    it('fetches and maps messages correctly from Microsoft Graph API', async () => {
      const mockGraphResponse = {
        value: [
          {
            id: 'outlook-msg-1',
            from: {
              emailAddress: {
                name: 'Recruiter Anna',
                address: 'anna@techcorp.com',
              },
            },
            subject: 'Zaproszenie na rozmowę rekrutacyjną',
            receivedDateTime: '2026-03-30T10:00:00Z',
            bodyPreview: 'Dzień dobry, chcielibyśmy zaprosić na rozmowę.',
            body: {
              content: '<p>Dzień dobry, chcielibyśmy zaprosić na rozmowę.</p>',
            },
          },
          {
            id: 'outlook-msg-2',
            from: null,
            subject: '',
            receivedDateTime: '2026-03-29T15:30:00Z',
            bodyPreview: '',
            body: null,
          },
        ],
      };

      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => mockGraphResponse,
      });
      global.fetch = mockFetch;

      const strategy = new OutlookSyncStrategy();
      const messages = await strategy.fetchMessages('test-token-outlook');

      expect(mockFetch).toHaveBeenCalledTimes(1);
      const [url, options] = mockFetch.mock.calls[0];
      expect(url).toContain('https://graph.microsoft.com/v1.0/me/messages');
      expect(options.headers).toEqual({
        Authorization: 'Bearer test-token-outlook',
        Accept: 'application/json',
      });

      expect(messages).toHaveLength(2);
      expect(messages[0]).toEqual({
        id: 'outlook-msg-1',
        provider: 'outlook',
        sender: 'anna@techcorp.com',
        senderName: 'Recruiter Anna',
        subject: 'Zaproszenie na rozmowę rekrutacyjną',
        date: '2026-03-30T10:00:00Z',
        snippet: 'Dzień dobry, chcielibyśmy zaprosić na rozmowę.',
        body: '<p>Dzień dobry, chcielibyśmy zaprosić na rozmowę.</p>',
      });

      // Default fallbacks for missing fields
      expect(messages[1].sender).toBe('nieznany nadawca');
      expect(messages[1].senderName).toBe('Nadawca');
      expect(messages[1].subject).toBe('Brak tematu');
    });

    it('throws error when Microsoft Graph API responds with error status', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 401,
        text: async () => 'Unauthorized token',
      });

      const strategy = new OutlookSyncStrategy();
      await expect(strategy.fetchMessages('invalid-token')).rejects.toThrow(
        'Błąd pobierania wiadomości z Microsoft Graph (401): Unauthorized token'
      );
    });

    it('delegates fetchOutlookMessages helper to outlook strategy', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ value: [] }),
      });

      const messages = await fetchOutlookMessages('token-123');
      expect(messages).toEqual([]);
    });
  });

  describe('GmailSyncStrategy', () => {
    it('uses optimized metadata headers and fields in message detail requests', async () => {
      const mockListResponse = {
        messages: [{ id: 'gmail-msg-1' }, { id: 'gmail-msg-2' }],
      };

      const mockDetail1 = {
        id: 'gmail-msg-1',
        internalDate: '1774864800000',
        snippet: 'Dziękujemy za aplikację na stanowisko Frontend Dev',
        payload: {
          headers: [
            { name: 'Subject', value: 'Status Twojej aplikacji w Google' },
            { name: 'From', value: 'HR Team <hr@google.com>' },
            { name: 'Date', value: 'Mon, 30 Mar 2026 10:00:00 +0000' },
          ],
        },
      };

      const mockDetail2 = {
        id: 'gmail-msg-2',
        internalDate: '1774860000000',
        snippet: 'Oferta pracy',
        payload: {
          headers: [
            { name: 'Subject', value: 'Oferta zatrudnienia' },
            { name: 'From', value: 'jobs@softwarehouse.pl' },
          ],
        },
      };

      const mockFetch = vi.fn().mockImplementation(async (url: string) => {
        if (url.includes('/users/me/messages?')) {
          return {
            ok: true,
            json: async () => mockListResponse,
          };
        }
        if (url.includes('/messages/gmail-msg-1?')) {
          return {
            ok: true,
            json: async () => mockDetail1,
          };
        }
        if (url.includes('/messages/gmail-msg-2?')) {
          return {
            ok: true,
            json: async () => mockDetail2,
          };
        }
        return { ok: false, status: 404 };
      });
      global.fetch = mockFetch;

      const strategy = new GmailSyncStrategy();
      const messages = await strategy.fetchMessages('test-token-gmail');

      expect(mockFetch).toHaveBeenCalledTimes(3);

      // Verify optimized query parameters on detail request (not format=full!)
      const detailCallUrl = mockFetch.mock.calls[1][0] as string;
      expect(detailCallUrl).toContain('format=metadata');
      expect(detailCallUrl).toContain('metadataHeaders=Subject');
      expect(detailCallUrl).toContain('metadataHeaders=From');
      expect(detailCallUrl).toContain('metadataHeaders=Date');
      expect(detailCallUrl).toContain('fields=id,internalDate,snippet,payload/headers');
      expect(detailCallUrl).not.toContain('format=full');

      expect(messages).toHaveLength(2);
      expect(messages[0]).toEqual({
        id: 'gmail-msg-1',
        provider: 'gmail',
        sender: 'HR Team <hr@google.com>',
        senderName: 'HR Team',
        subject: 'Status Twojej aplikacji w Google',
        date: 'Mon, 30 Mar 2026 10:00:00 +0000',
        snippet: 'Dziękujemy za aplikację na stanowisko Frontend Dev',
        body: 'Dziękujemy za aplikację na stanowisko Frontend Dev',
      });

      expect(messages[1].senderName).toBe('jobs@softwarehouse.pl');
      expect(messages[1].subject).toBe('Oferta zatrudnienia');
    });

    it('handles individual message fetch failure without breaking the batch', async () => {
      const mockListResponse = {
        messages: [{ id: 'msg-success' }, { id: 'msg-failing' }],
      };

      global.fetch = vi.fn().mockImplementation(async (url: string) => {
        if (url.includes('/users/me/messages?')) {
          return {
            ok: true,
            json: async () => mockListResponse,
          };
        }
        if (url.includes('/messages/msg-success?')) {
          return {
            ok: true,
            json: async () => ({
              id: 'msg-success',
              snippet: 'Sukces',
              payload: {
                headers: [{ name: 'Subject', value: 'Wiadomość 1' }],
              },
            }),
          };
        }
        // Failure on 2nd message
        return {
          ok: false,
          status: 500,
        };
      });

      const strategy = new GmailSyncStrategy();
      const messages = await strategy.fetchMessages('token-test');

      expect(messages).toHaveLength(1);
      expect(messages[0].id).toBe('msg-success');
    });

    it('throws error when Gmail list messages endpoint fails', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 403,
        text: async () => 'Rate limit exceeded',
      });

      const strategy = new GmailSyncStrategy();
      await expect(strategy.fetchMessages('token-test')).rejects.toThrow(
        'Błąd pobierania listy z Gmail API (403): Rate limit exceeded'
      );
    });

    it('delegates fetchGmailMessages helper to gmail strategy', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ messages: [] }),
      });

      const messages = await fetchGmailMessages('token-xyz');
      expect(messages).toEqual([]);
    });
  });
});
