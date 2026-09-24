/**
 * Service for fetching emails from Microsoft Graph and Google Gmail APIs
 */

export interface UnifiedEmailMessage {
  id: string;
  provider: 'outlook' | 'gmail';
  sender: string;
  senderName: string;
  subject: string;
  date: string;
  snippet: string;
  body: string;
}

export async function fetchOutlookMessages(token: string): Promise<UnifiedEmailMessage[]> {
  const graphRes = await fetch(
    'https://graph.microsoft.com/v1.0/me/messages?$top=40&$select=id,subject,from,receivedDateTime,bodyPreview,body&$orderby=receivedDateTime desc',
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    }
  );

  if (!graphRes.ok) {
    const errBody = await graphRes.text();
    throw new Error(`Błąd pobierania wiadomości z Microsoft Graph (${graphRes.status}): ${errBody}`);
  }

  const graphData = await graphRes.json();
  return (graphData.value || []).map((msg: any) => ({
    id: msg.id,
    provider: 'outlook' as const,
    sender: msg.from?.emailAddress?.address || 'nieznany nadawca',
    senderName: msg.from?.emailAddress?.name || msg.from?.emailAddress?.address || 'Nadawca',
    subject: msg.subject || 'Brak tematu',
    date: msg.receivedDateTime,
    snippet: msg.bodyPreview || '',
    body: msg.body?.content || msg.bodyPreview || '',
  }));
}

export async function fetchGmailMessages(token: string): Promise<UnifiedEmailMessage[]> {
  const query = encodeURIComponent('subject:(rekrutacja OR interview OR aplikacja OR oferta OR "praca" OR "QA" OR "status")');
  const listRes = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages?maxResults=25&q=${query}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: 'application/json',
      },
    }
  );

  if (!listRes.ok) {
    const errBody = await listRes.text();
    throw new Error(`Błąd pobierania listy z Gmail API (${listRes.status}): ${errBody}`);
  }

  const listData = await listRes.json();
  const messageRefs = listData.messages || [];

  const detailPromises = messageRefs.slice(0, 15).map(async (m: { id: string }) => {
    try {
      const itemRes = await fetch(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=full`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (!itemRes.ok) return null;
      const itemData = await itemRes.json();
      const headers = itemData.payload?.headers || [];
      const getHeader = (name: string) =>
        headers.find((h: any) => h.name.toLowerCase() === name.toLowerCase())?.value || '';

      const subject = getHeader('Subject');
      const from = getHeader('From');
      const date = getHeader('Date');

      return {
        id: itemData.id,
        provider: 'gmail' as const,
        sender: from,
        senderName: from.split('<')[0].replace(/"/g, '').trim() || from,
        subject: subject || 'Brak tematu',
        date: date || new Date(parseInt(itemData.internalDate || '0', 10)).toISOString(),
        snippet: itemData.snippet || '',
        body: itemData.snippet || '',
      };
    } catch {
      return null;
    }
  });

  const detailedList = (await Promise.all(detailPromises)).filter(Boolean) as UnifiedEmailMessage[];
  return detailedList;
}
