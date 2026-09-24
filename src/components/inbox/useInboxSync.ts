import { useState, useEffect, useCallback } from 'react';
import { JobApplication, EmailMessage, EmailAnalysisResult } from '../../types';
import { api } from '../../services/api';

const OUTLOOK_TOKEN_KEY = 'job_tracker_outlook_token';
const GMAIL_TOKEN_KEY = 'job_tracker_gmail_token';

export function useInboxSync(
  applications: JobApplication[],
  showToast: (msg: string) => void
) {
  const [outlookConnected, setOutlookConnected] = useState<boolean>(() => {
    return Boolean(localStorage.getItem(OUTLOOK_TOKEN_KEY));
  });
  const [outlookToken, setOutlookToken] = useState<string>(() => {
    return localStorage.getItem(OUTLOOK_TOKEN_KEY) || '';
  });

  const [gmailConnected, setGmailConnected] = useState<boolean>(() => {
    return Boolean(localStorage.getItem(GMAIL_TOKEN_KEY));
  });
  const [gmailToken, setGmailToken] = useState<string>(() => {
    return localStorage.getItem(GMAIL_TOKEN_KEY) || '';
  });

  const [isScanning, setIsScanning] = useState(false);
  const [scanStep, setScanStep] = useState<string>('');
  const [analyzedResults, setAnalyzedResults] = useState<EmailAnalysisResult[]>([]);
  const [selectedResultIds, setSelectedResultIds] = useState<string[]>([]);
  const [expandedEmailId, setExpandedEmailId] = useState<string | null>(null);

  // Manual paste state
  const [manualSubject, setManualSubject] = useState('');
  const [manualSender, setManualSender] = useState('');
  const [manualBody, setManualBody] = useState('');
  const [isAnalyzingManual, setIsAnalyzingManual] = useState(false);

  // Listen for OAuth postMessage callbacks from popup
  useEffect(() => {
    const handleAuthMessage = (event: MessageEvent) => {
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS') {
        const { provider, accessToken, error } = event.data;
        if (error) {
          showToast(`Błąd autoryzacji: ${error}`);
          return;
        }

        if (provider === 'outlook' || !provider) {
          if (accessToken) {
            setOutlookToken(accessToken);
            localStorage.setItem(OUTLOOK_TOKEN_KEY, accessToken);
            setOutlookConnected(true);
            showToast('Połączono pomyślnie z Microsoft Outlook!');
          } else {
            setOutlookConnected(true);
            showToast('Połączono z Microsoft Outlook!');
          }
        } else if (provider === 'gmail') {
          if (accessToken) {
            setGmailToken(accessToken);
            localStorage.setItem(GMAIL_TOKEN_KEY, accessToken);
            setGmailConnected(true);
            showToast('Połączono pomyślnie z kontem Gmail!');
          } else {
            setGmailConnected(true);
            showToast('Połączono z kontem Gmail!');
          }
        }
      }
    };

    window.addEventListener('message', handleAuthMessage);
    return () => window.removeEventListener('message', handleAuthMessage);
  }, [showToast]);

  const disconnectOutlook = () => {
    localStorage.removeItem(OUTLOOK_TOKEN_KEY);
    setOutlookToken('');
    setOutlookConnected(false);
    showToast('Rozłączono konto Outlook.');
  };

  const disconnectGmail = () => {
    localStorage.removeItem(GMAIL_TOKEN_KEY);
    setGmailToken('');
    setGmailConnected(false);
    showToast('Rozłączono konto Gmail.');
  };

  const connectAccount = async (provider: 'outlook' | 'gmail') => {
    try {
      const data =
        provider === 'outlook'
          ? await api.getOutlookAuthUrl()
          : await api.getGmailAuthUrl();

      const width = 560;
      const height = 680;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;

      window.open(
        data.url,
        `OAuth_${provider}`,
        `width=${width},height=${height},top=${top},left=${left},toolbar=no,menubar=no`
      );
    } catch {
      showToast(`Nie udało się otworzyć okna logowania ${provider}.`);
    }
  };

  // Perform full scan
  const startScan = async () => {
    setIsScanning(true);
    setScanStep('Pobieranie wiadomości e-mail ze skrzynek...');

    try {
      let allEmails: EmailMessage[] = [];

      // 1. Fetch from Outlook if connected
      if (outlookToken) {
        try {
          setScanStep('Pobieranie wiadomości z Microsoft Graph (Outlook)...');
          const res = await api.fetchOutlookMessages(outlookToken);
          allEmails = [...allEmails, ...res.emails];
        } catch (e) {
          console.warn('Outlook sync error', e);
        }
      }

      // 2. Fetch from Gmail if connected
      if (gmailToken) {
        try {
          setScanStep('Pobieranie wiadomości z Gmail API...');
          const res = await api.fetchGmailMessages(gmailToken);
          allEmails = [...allEmails, ...res.emails];
        } catch (e) {
          console.warn('Gmail sync error', e);
        }
      }

      // 3. If no live provider is connected or no messages returned, load realistic sample recruitment emails
      if (allEmails.length === 0) {
        setScanStep('Ładowanie przykładowych wiadomości rekrutacyjnych...');
        const res = await api.fetchSampleEmails();
        allEmails = res.emails;
      }

      setScanStep(`Analiza ${allEmails.length} wiadomości przez model Gemini AI...`);

      const analysisData = await api.analyzeEmails({
        emails: allEmails,
        applications,
      });

      setAnalyzedResults(analysisData.results);
      // Auto-select status changes and newly found applications
      const relevantIds = analysisData.results
        .filter((r) => r.isStatusChange || r.isNewApplication)
        .map((r) => r.emailId);
      setSelectedResultIds(relevantIds);

      showToast(
        `Przeanalizowano ${analysisData.analyzedCount} wiadomości. Wykryto ${analysisData.changesCount} zmian statusów!`
      );
    } catch (e: any) {
      console.error(e);
      showToast(`Błąd synchronizacji: ${e.message || 'Spróbuj ponownie'}`);
    } finally {
      setIsScanning(false);
      setScanStep('');
    }
  };

  // Analyze manually pasted email
  const analyzeManualEmail = async () => {
    if (!manualSubject.trim() && !manualBody.trim()) {
      showToast('Wklej treść lub temat wiadomości.');
      return;
    }

    setIsAnalyzingManual(true);
    try {
      const manualEmail: EmailMessage = {
        id: `manual-msg-${Date.now()}`,
        provider: 'manual',
        sender: manualSender.trim() || 'rekruter@firma.com',
        senderName: manualSender.split('@')[0] || 'Dział Rekrutacji',
        subject: manualSubject.trim() || 'Wiadomość w sprawie aplikacji',
        date: new Date().toISOString(),
        snippet: (manualBody || '').slice(0, 150),
        body: manualBody,
      };

      const analysisData = await api.analyzeEmails({
        emails: [manualEmail],
        applications,
      });

      if (analysisData.results.length > 0) {
        const item = analysisData.results[0];
        setAnalyzedResults((prev) => [item, ...prev]);
        setSelectedResultIds((prev) => [...prev, item.emailId]);
        showToast(`Wyodrębniono status: ${item.suggestedStatus}`);
        setManualBody('');
        setManualSubject('');
        setManualSender('');
      }
    } catch (e: any) {
      showToast(`Błąd analizy: ${e.message}`);
    } finally {
      setIsAnalyzingManual(false);
    }
  };

  const toggleResultSelection = (id: string) => {
    setSelectedResultIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleExpandEmail = (id: string) => {
    setExpandedEmailId((prev) => (prev === id ? null : id));
  };

  return {
    outlookConnected,
    gmailConnected,
    connectAccount,
    disconnectOutlook,
    disconnectGmail,
    isScanning,
    scanStep,
    analyzedResults,
    selectedResultIds,
    setSelectedResultIds,
    expandedEmailId,
    startScan,
    toggleResultSelection,
    toggleExpandEmail,
    manualSubject,
    setManualSubject,
    manualSender,
    setManualSender,
    manualBody,
    setManualBody,
    isAnalyzingManual,
    analyzeManualEmail,
  };
}
