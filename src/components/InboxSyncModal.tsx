import React, { useState, useEffect } from 'react';
import {
  Mail,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Calendar,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  X,
  FileText,
  Copy,
  Check,
  Inbox,
  Send,
  Building2,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { JobApplication, JobStatus, EmailMessage, EmailAnalysisResult } from '../types';
import { STATUS_CONFIG, ALL_STATUSES } from '../utils/statusConfig';

interface InboxSyncModalProps {
  isOpen: boolean;
  onClose: () => void;
  applications: JobApplication[];
  onApplyStatusUpdates: (
    updates: Array<{
      appId: string;
      newStatus: JobStatus;
      noteAddition: string;
      meetingDate?: string;
    }>
  ) => void;
  onAddNewApplication: (newApp: Partial<JobApplication>) => void;
  showToast: (msg: string) => void;
}

export const InboxSyncModal: React.FC<InboxSyncModalProps> = ({
  isOpen,
  onClose,
  applications,
  onApplyStatusUpdates,
  onAddNewApplication,
  showToast,
}) => {
  const [activeTab, setActiveTab] = useState<'sync' | 'accounts' | 'paste'>('sync');

  // Account tokens and connection states
  const [outlookConnected, setOutlookConnected] = useState<boolean>(() => {
    return Boolean(localStorage.getItem('job_tracker_outlook_token'));
  });
  const [outlookToken, setOutlookToken] = useState<string>(() => {
    return localStorage.getItem('job_tracker_outlook_token') || '';
  });

  const [gmailConnected, setGmailConnected] = useState<boolean>(() => {
    return Boolean(localStorage.getItem('job_tracker_gmail_token'));
  });
  const [gmailToken, setGmailToken] = useState<string>(() => {
    return localStorage.getItem('job_tracker_gmail_token') || '';
  });

  // Inbox & Analysis state
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

  // Copied URL state
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  // Confirmation before applying
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const callbackUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/auth/callback`
      : 'https://ais-dev-spni24eqjixuvpqi3qhp4s-865141778207.europe-west2.run.app/auth/callback';

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
            localStorage.setItem('job_tracker_outlook_token', accessToken);
            setOutlookConnected(true);
            showToast('Połączono pomyślnie z Microsoft Outlook!');
          } else {
            setOutlookConnected(true);
            showToast('Połączono z Microsoft Outlook!');
          }
        } else if (provider === 'gmail') {
          if (accessToken) {
            setGmailToken(accessToken);
            localStorage.setItem('job_tracker_gmail_token', accessToken);
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

  if (!isOpen) return null;

  // OAuth Popup launcher
  const handleConnectOutlook = async () => {
    try {
      const res = await fetch('/api/auth/outlook/url');
      const data = await res.json();
      if (data.url) {
        const popup = window.open(data.url, 'outlook_oauth', 'width=600,height=720,status=no,toolbar=no');
        if (!popup) {
          showToast('Przeglądarka zablokowała wyskakujące okienko. Zezwól na pop-up.');
        }
      }
    } catch (e) {
      console.error(e);
      showToast('Nie udało się otworzyć autoryzacji Outlook.');
    }
  };

  const handleConnectGmail = async () => {
    try {
      const res = await fetch('/api/auth/gmail/url');
      const data = await res.json();
      if (data.url) {
        const popup = window.open(data.url, 'gmail_oauth', 'width=600,height=720,status=no,toolbar=no');
        if (!popup) {
          showToast('Przeglądarka zablokowała wyskakujące okienko. Zezwól na pop-up.');
        }
      }
    } catch (e) {
      console.error(e);
      showToast('Nie udało się otworzyć autoryzacji Gmail.');
    }
  };

  // Scan emails (either from real providers or demo sample inbox)
  const handleScanInbox = async (forceDemo = false) => {
    setIsScanning(true);
    setScanStep('Pobieranie wiadomości e-mail ze skrzynek...');
    setAnalyzedResults([]);

    try {
      let fetchedEmails: EmailMessage[] = [];

      if (!forceDemo && outlookConnected && outlookToken) {
        setScanStep('Pobieranie poczty z Microsoft Graph API (Outlook)...');
        try {
          const res = await fetch('/api/outlook/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: outlookToken }),
          });
          if (res.ok) {
            const data = await res.json();
            if (data.emails && Array.isArray(data.emails)) {
              fetchedEmails.push(...data.emails);
            }
          }
        } catch (e) {
          console.warn('Outlook live fetch failed, continuing', e);
        }
      }

      if (!forceDemo && gmailConnected && gmailToken) {
        setScanStep('Pobieranie korespondencji z Gmail API...');
        try {
          const res = await fetch('/api/gmail/messages', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: gmailToken }),
          });
          if (res.ok) {
            const data = await res.json();
            if (data.emails && Array.isArray(data.emails)) {
              fetchedEmails.push(...data.emails);
            }
          }
        } catch (e) {
          console.warn('Gmail live fetch failed, continuing', e);
        }
      }

      // If no live emails or forceDemo requested, load rich realistic recruitment emails
      if (fetchedEmails.length === 0 || forceDemo) {
        setScanStep('Wczytywanie skrzynki rekrutacyjnej (wiadomości od Spyrosoft, Kuehne+Nagel, Sportano, Kadromierz)...');
        const sampleRes = await fetch('/api/sample-emails');
        if (sampleRes.ok) {
          const sampleData = await sampleRes.json();
          fetchedEmails = sampleData.emails || [];
        }
      }

      setScanStep(`Analiza ${fetchedEmails.length} wiadomości przez model AI Gemini...`);
      const analyzeRes = await fetch('/api/analyze-emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emails: fetchedEmails,
          applications,
        }),
      });

      if (!analyzeRes.ok) throw new Error('Błąd analizy wiadomości');
      const analyzeData = await analyzeRes.json();
      const results: EmailAnalysisResult[] = analyzeData.results || [];

      setAnalyzedResults(results);

      // Auto-select status changes by default
      const changeIds = results.filter((r) => r.isStatusChange && r.matchedApplicationId).map((r) => r.emailId);
      setSelectedResultIds(changeIds);

      showToast(`Przeanalizowano skrzynkę! Znaleziono ${changeIds.length} aktualizacji statusów.`);
    } catch (err: any) {
      console.error(err);
      showToast('Wystąpił błąd podczas analizy skrzynki pocztowej.');
    } finally {
      setIsScanning(false);
      setScanStep('');
    }
  };

  // Analyze single manually pasted email
  const handleAnalyzeManual = async () => {
    if (!manualBody.trim() && !manualSubject.trim()) {
      showToast('Podaj temat lub treść wiadomości do analizy.');
      return;
    }

    setIsAnalyzingManual(true);
    try {
      const emailItem: EmailMessage = {
        id: `manual-${Date.now()}`,
        provider: 'manual',
        sender: manualSender || 'rekruter@firma.pl',
        senderName: manualSender || 'Rekruter',
        subject: manualSubject || 'Korespondencja rekrutacyjna',
        date: new Date().toISOString(),
        snippet: manualBody.slice(0, 200),
        body: manualBody,
      };

      const res = await fetch('/api/analyze-emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          emails: [emailItem],
          applications,
        }),
      });

      if (!res.ok) throw new Error('Błąd analizy');
      const data = await res.json();
      const newResults = data.results || [];

      if (newResults.length > 0) {
        setAnalyzedResults((prev) => [...newResults, ...prev]);
        setSelectedResultIds((prev) => [...prev, newResults[0].emailId]);
        setActiveTab('sync');
        showToast('Wiadomość została przeanalizowana!');
      }
    } catch (e) {
      console.error(e);
      showToast('Nie udało się przeanalizować wiadomości.');
    } finally {
      setIsAnalyzingManual(false);
    }
  };

  // Toggle selection for updating
  const handleToggleSelectResult = (emailId: string) => {
    setSelectedResultIds((prev) =>
      prev.includes(emailId) ? prev.filter((id) => id !== emailId) : [...prev, emailId]
    );
  };

  // Apply selected status changes with user confirmation
  const handleConfirmApply = () => {
    const selectedUpdates = analyzedResults
      .filter((r) => selectedResultIds.includes(r.emailId) && r.matchedApplicationId && r.suggestedStatus)
      .map((r) => ({
        appId: r.matchedApplicationId!,
        newStatus: r.suggestedStatus as JobStatus,
        noteAddition: `[E-mail ${r.provider.toUpperCase()} ${new Date(r.date).toLocaleDateString()}]: ${r.summary}${
          r.meetingDate ? ` | Spotkanie: ${r.meetingDate}` : ''
        }`,
        meetingDate: r.meetingDate,
      }));

    if (selectedUpdates.length === 0) {
      showToast('Nie zaznaczono żadnych aktualizacji do wprowadzenia.');
      setShowConfirmDialog(false);
      return;
    }

    onApplyStatusUpdates(selectedUpdates);
    setShowConfirmDialog(false);
    showToast(`Pomyślnie zaktualizowano statusy dla ${selectedUpdates.length} aplikacji!`);
    onClose();
  };

  const handleAddDiscoveredApp = (item: EmailAnalysisResult) => {
    if (!item.newApplicationData) return;
    onAddNewApplication({
      company: item.newApplicationData.company || item.matchedCompany || 'Nowa firma',
      role: item.newApplicationData.role || item.matchedRole || 'Specjalista QA',
      portal: item.newApplicationData.portal || 'E-mail',
      status: (item.suggestedStatus as JobStatus) || 'Weryfikacja CV',
      appliedDate: new Date().toISOString().split('T')[0],
      location: item.newApplicationData.location || 'Polska / Remote',
      notes: `Dodano automatycznie z wykrytej korespondencji e-mail: ${item.summary}`,
    });
    showToast(`Dodano nową aplikację: ${item.newApplicationData.company}`);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedUrl(text);
    setTimeout(() => setCopiedUrl(null), 2500);
    showToast('Skopiowano URL do schowka!');
  };

  const statusChangesList = analyzedResults.filter((r) => r.isStatusChange && r.matchedApplicationId);
  const newAppsList = analyzedResults.filter((r) => r.isNewApplication);
  const infoOnlyList = analyzedResults.filter((r) => !r.isStatusChange && !r.isNewApplication);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        id="inbox-sync-modal"
        className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden text-slate-900 dark:text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50/70 dark:bg-slate-900/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 text-white flex items-center justify-center shadow-xs">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold">Synchronizacja skrzynki e-mail</h2>
                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/70 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">
                  Outlook & Gmail
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Automatyczne wykrywanie odpowiedzi od rekruterów i aktualizacja statusów aplikacji przez AI
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            aria-label="Zamknij"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-6 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 text-xs font-medium bg-white dark:bg-slate-900 overflow-x-auto">
          <button
            onClick={() => setActiveTab('sync')}
            className={`py-3 px-3 border-b-2 font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
              activeTab === 'sync'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Wykryte statusy</span>
            {statusChangesList.length > 0 && (
              <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] bg-blue-600 text-white font-bold">
                {statusChangesList.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('accounts')}
            className={`py-3 px-3 border-b-2 font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
              activeTab === 'accounts'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Podłącz skrzynki (Outlook / Gmail)</span>
            {(outlookConnected || gmailConnected) && (
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('paste')}
            className={`py-3 px-3 border-b-2 font-semibold flex items-center gap-1.5 cursor-pointer transition-colors ${
              activeTab === 'paste'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400 dark:border-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Wklej treść maila ręcznie</span>
          </button>
        </div>

        {/* Content Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* TAB 1: SYNC & STATUS DETECTION */}
          {activeTab === 'sync' && (
            <div className="space-y-6">
              {/* Scan Trigger Bar */}
              <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-bold flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                    Skaner korespondencji rekrutacyjnej
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Pobiera najświeższe wiadomości, rozpoznaje etapy procesów i proponuje zmiany statusów w tabeli.
                  </p>
                </div>
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    id="scan-inbox-btn"
                    onClick={() => handleScanInbox(false)}
                    disabled={isScanning}
                    className="flex-1 sm:flex-initial px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-2 shadow-xs transition-colors cursor-pointer"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
                    <span>{isScanning ? 'Skanowanie...' : 'Skanuj skrzynkę'}</span>
                  </button>

                  <button
                    id="scan-demo-btn"
                    onClick={() => handleScanInbox(true)}
                    disabled={isScanning}
                    className="px-3 py-2 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-600 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer"
                    title="Przetestuj z przykładowymi odpowiedziami od Spyrosoft, Kuehne+Nagel, Sportano i Kadromierz"
                  >
                    <Inbox className="w-3.5 h-3.5 text-indigo-500" />
                    <span>Demo skrzynka</span>
                  </button>
                </div>
              </div>

              {/* Scanning status banner */}
              {isScanning && (
                <div className="p-4 bg-blue-50 dark:bg-blue-950/40 rounded-xl border border-blue-200 dark:border-blue-900/60 flex items-center gap-3 animate-pulse">
                  <div className="w-6 h-6 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                  <div>
                    <p className="text-xs font-semibold text-blue-900 dark:text-blue-200">
                      Trwa synchronizacja...
                    </p>
                    <p className="text-[11px] text-blue-700 dark:text-blue-300">{scanStep}</p>
                  </div>
                </div>
              )}

              {/* Empty state when no scan performed yet */}
              {!isScanning && analyzedResults.length === 0 && (
                <div className="text-center py-12 px-4 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 flex items-center justify-center mb-3">
                    <Mail className="w-7 h-7" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Brak przeanalizowanych wiadomości
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md mx-auto mt-1 mb-4">
                    Kliknij <strong>"Skanuj skrzynkę"</strong> lub <strong>"Demo skrzynka"</strong>, aby pobrać maile i sprawdzić, czy pojawiły się nowe zaproszenia na rozmowy, zadania techniczne lub oferty!
                  </p>
                  <button
                    onClick={() => handleScanInbox(true)}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold inline-flex items-center gap-2 cursor-pointer shadow-xs"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Załaduj demo skrzynkę rekrutacyjną
                  </button>
                </div>
              )}

              {/* SECTION: STATUS UPDATES FOUND */}
              {!isScanning && statusChangesList.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                      <AlertCircle className="w-4 h-4 text-amber-500" />
                      Wykryte zmiany statusów ({statusChangesList.length})
                    </h4>
                    <span className="text-[11px] text-slate-500">
                      Zaznacz zmiany, które chcesz zaaplikować do swoich ofert
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    {statusChangesList.map((item) => {
                      const isSelected = selectedResultIds.includes(item.emailId);
                      const isExpanded = expandedEmailId === item.emailId;
                      const currMeta = item.currentStatus ? STATUS_CONFIG[item.currentStatus] : null;
                      const nextMeta = item.suggestedStatus ? STATUS_CONFIG[item.suggestedStatus] : null;

                      return (
                        <div
                          key={item.emailId}
                          className={`p-4 rounded-xl border transition-all ${
                            isSelected
                              ? 'bg-blue-50/40 dark:bg-blue-950/20 border-blue-300 dark:border-blue-800/80 shadow-2xs'
                              : 'bg-white dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 opacity-80'
                          }`}
                        >
                          <div className="flex items-start gap-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleSelectResult(item.emailId)}
                              className="mt-1 w-4 h-4 rounded text-blue-600 border-slate-300 dark:border-slate-700 cursor-pointer"
                            />

                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                                    {item.matchedCompany}
                                  </span>
                                  <span className="text-xs text-slate-500 dark:text-slate-400">
                                    • {item.matchedRole}
                                  </span>
                                </div>
                                <span className="text-[10px] font-medium text-slate-400 dark:text-slate-500">
                                  {new Date(item.date).toLocaleDateString()}
                                </span>
                              </div>

                              {/* Status Diff Badge */}
                              <div className="flex items-center flex-wrap gap-2 my-2">
                                {currMeta && (
                                  <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${currMeta.badgeClass}`}>
                                    {currMeta.label}
                                  </span>
                                )}
                                <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
                                {nextMeta && (
                                  <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border shadow-2xs ${nextMeta.badgeClass} ring-2 ring-blue-500/20`}>
                                    {nextMeta.label}
                                  </span>
                                )}
                                <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-200 dark:border-emerald-800">
                                  Zgodność: {item.confidence === 'high' ? 'Wysoka' : 'Średnia'}
                                </span>
                              </div>

                              {/* AI Summary */}
                              <p className="text-xs text-slate-700 dark:text-slate-300 font-medium">
                                {item.summary}
                              </p>

                              {/* Meeting Date or Link if detected */}
                              {(item.meetingDate || item.meetingLink) && (
                                <div className="mt-2 flex flex-wrap items-center gap-2 text-[11px]">
                                  {item.meetingDate && (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800 rounded-md font-medium">
                                      <Calendar className="w-3 h-3" />
                                      {item.meetingDate}
                                    </span>
                                  )}
                                  {item.meetingLink && (
                                    <a
                                      href={item.meetingLink}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 rounded-md hover:underline font-medium"
                                    >
                                      <ExternalLink className="w-3 h-3" />
                                      Link do spotkania (Teams / Meet)
                                    </a>
                                  )}
                                </div>
                              )}

                              {/* Toggle email excerpt */}
                              <div className="mt-2.5 pt-2 border-t border-slate-200/60 dark:border-slate-800/60 flex items-center justify-between text-[11px] text-slate-500">
                                <span>Od: {item.senderName || item.sender} ({item.provider})</span>
                                <button
                                  type="button"
                                  onClick={() => setExpandedEmailId(isExpanded ? null : item.emailId)}
                                  className="flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                                >
                                  {isExpanded ? 'Zwiń treść maila' : 'Zobacz treść maila'}
                                  {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                                </button>
                              </div>

                              {isExpanded && (
                                <div className="mt-2 p-3 rounded-lg bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[11px] font-mono text-slate-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">
                                  <strong>Temat:</strong> {item.subject}
                                  {'\n'}
                                  {item.rawExcerpt}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* SECTION: NEW APPLICATIONS DISCOVERED */}
              {!isScanning && newAppsList.length > 0 && (
                <div className="space-y-3 pt-3 border-t border-slate-200 dark:border-slate-800">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600 dark:text-slate-400 flex items-center gap-1.5">
                    <Building2 className="w-4 h-4 text-indigo-500" />
                    Nowo wykryte aplikacje w skrzynce ({newAppsList.length})
                  </h4>
                  <div className="space-y-2">
                    {newAppsList.map((item) => (
                      <div
                        key={item.emailId}
                        className="p-3.5 rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/30 dark:bg-indigo-950/20 flex items-center justify-between gap-3"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                              {item.newApplicationData?.company || item.matchedCompany}
                            </span>
                            <span className="text-xs text-slate-500 dark:text-slate-400">
                              • {item.newApplicationData?.role || item.matchedRole}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-600 dark:text-slate-400 mt-0.5">
                            {item.summary}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleAddDiscoveredApp(item)}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shrink-0 cursor-pointer shadow-xs"
                        >
                          Dodaj do moich aplikacji
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* SECTION: NO STATUS CHANGE */}
              {!isScanning && infoOnlyList.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <details className="text-xs text-slate-500 dark:text-slate-400 group">
                    <summary className="font-semibold cursor-pointer select-none hover:text-slate-800 dark:hover:text-slate-200">
                      Wiadomości bez zmiany statusu ({infoOnlyList.length})
                    </summary>
                    <div className="mt-2 space-y-1.5 pl-2">
                      {infoOnlyList.map((item) => (
                        <div key={item.emailId} className="p-2 rounded bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 flex items-center justify-between text-[11px]">
                          <span>
                            <strong>{item.matchedCompany}:</strong> {item.summary}
                          </span>
                          <span className="text-slate-400">{new Date(item.date).toLocaleDateString()}</span>
                        </div>
                      ))}
                    </div>
                  </details>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: CONNECT ACCOUNTS */}
          {activeTab === 'accounts' && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-bold">Połącz swoje skrzynki pocztowe</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Możesz zintegrować zarówno Microsoft Outlook (Office 365), jak i Google Workspace / Gmail.
                </p>
              </div>

              {/* Microsoft Outlook Card */}
              <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#0078D4] text-white flex items-center justify-center font-bold text-lg shadow-2xs">
                      O
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        Microsoft Outlook / Office 365
                        {outlookConnected && (
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-2 py-0.2 rounded-full font-bold">
                            Połączono
                          </span>
                        )}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Integracja z Microsoft Graph API (odczyt wiadomości Mail.Read)
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleConnectOutlook}
                    className="px-4 py-2 bg-[#0078D4] hover:bg-[#006abc] text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>{outlookConnected ? 'Połącz ponownie' : 'Połącz z Outlook'}</span>
                  </button>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl text-xs space-y-2 border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-600 dark:text-slate-400">
                      Adres zwrotny OAuth (Redirect URI):
                    </span>
                    <button
                      onClick={() => copyToClipboard(callbackUrl)}
                      className="text-blue-600 dark:text-blue-400 flex items-center gap-1 font-mono text-[11px] hover:underline cursor-pointer"
                    >
                      {copiedUrl === callbackUrl ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      Kopiuj
                    </button>
                  </div>
                  <div className="font-mono text-[11px] p-2 bg-white dark:bg-slate-950 rounded border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 break-all select-all">
                    {callbackUrl}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Wklej powyższy Redirect URI w portalu Azure AD (App Registrations) jako platformę Web / SPA.
                  </p>
                </div>
              </div>

              {/* Google Gmail Card */}
              <div className="p-5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-800/40 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#EA4335] text-white flex items-center justify-center font-bold text-lg shadow-2xs">
                      M
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                        Google Gmail
                        {gmailConnected && (
                          <span className="text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-2 py-0.2 rounded-full font-bold">
                            Połączono
                          </span>
                        )}
                      </h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        Integracja z Google Workspace / Gmail API (uprawnienie gmail.readonly)
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={handleConnectGmail}
                    className="px-4 py-2 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 border border-slate-300 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-[#EA4335]" />
                    <span>{gmailConnected ? 'Połącz ponownie' : 'Połącz z Gmail'}</span>
                  </button>
                </div>

                <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl text-xs space-y-2 border border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-600 dark:text-slate-400">
                      Adres zwrotny Google OAuth:
                    </span>
                    <button
                      onClick={() => copyToClipboard(callbackUrl)}
                      className="text-blue-600 dark:text-blue-400 flex items-center gap-1 font-mono text-[11px] hover:underline cursor-pointer"
                    >
                      {copiedUrl === callbackUrl ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      Kopiuj
                    </button>
                  </div>
                  <div className="font-mono text-[11px] p-2 bg-white dark:bg-slate-950 rounded border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 break-all select-all">
                    {callbackUrl}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: PASTE EMAIL MANUALLY */}
          {activeTab === 'paste' && (
            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-bold">Ręczna analiza treści e-maila</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Otrzymałeś maila od rekrutera? Wklej jego treść poniżej, a model AI automatycznie dopasuje firmę i określi odpowiedni status.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    Nadawca (e-mail lub firma)
                  </label>
                  <input
                    type="text"
                    value={manualSender}
                    onChange={(e) => setManualSender(e.target.value)}
                    placeholder="np. rekrutacja@spyro-soft.com"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold mb-1 text-slate-700 dark:text-slate-300">
                    Temat wiadomości
                  </label>
                  <input
                    type="text"
                    value={manualSubject}
                    onChange={(e) => setManualSubject(e.target.value)}
                    placeholder="np. Zaproszenie na rozmowę techniczną (QA)"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 text-slate-700 dark:text-slate-300">
                  Treść e-maila
                </label>
                <textarea
                  rows={6}
                  value={manualBody}
                  onChange={(e) => setManualBody(e.target.value)}
                  placeholder="Wklej tutaj całą treść otrzymanej wiadomości e-mail..."
                  className="w-full p-3 text-xs rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-mono leading-relaxed"
                />
              </div>

              <button
                type="button"
                onClick={handleAnalyzeManual}
                disabled={isAnalyzingManual}
                className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-2 cursor-pointer shadow-xs"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isAnalyzingManual ? 'Analizowanie...' : 'Przeanalizuj treść przez AI'}</span>
              </button>
            </div>
          )}
        </div>

        {/* Footer with Actions */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 flex items-center justify-between gap-3">
          <div className="text-xs text-slate-500 dark:text-slate-400">
            {selectedResultIds.length > 0
              ? `Zaznaczono ${selectedResultIds.length} zmian do wprowadzenia`
              : 'Wybierz zmiany statusów do zatwierdzenia'}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              Anuluj
            </button>

            {statusChangesList.length > 0 && (
              <button
                type="button"
                id="apply-status-changes-btn"
                onClick={() => setShowConfirmDialog(true)}
                disabled={selectedResultIds.length === 0}
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Zastosuj wybrane aktualizacje ({selectedResultIds.length})</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Explicit User Confirmation Dialog for Data Mutations */}
      {showConfirmDialog && (
        <div
          className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-950/75 backdrop-blur-xs animate-in fade-in duration-150"
          onClick={() => setShowConfirmDialog(false)}
        >
          <div
            className="bg-white dark:bg-slate-900 rounded-2xl p-6 max-w-md w-full border border-slate-200 dark:border-slate-800 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/70 text-blue-600 flex items-center justify-center">
                <AlertCircle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Potwierdź aktualizację statusów
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Czy na pewno chcesz zmienić statusy w {selectedResultIds.length} aplikacjach?
                </p>
              </div>
            </div>

            <div className="max-h-48 overflow-y-auto space-y-1.5 p-2 bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-800 text-xs">
              {analyzedResults
                .filter((r) => selectedResultIds.includes(r.emailId) && r.matchedApplicationId)
                .map((r) => (
                  <div key={r.emailId} className="flex items-center justify-between py-1 border-b border-slate-200/50 dark:border-slate-800/50 last:border-0">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{r.matchedCompany}</span>
                    <span className="text-[11px] text-blue-600 dark:text-blue-400 font-bold">{r.suggestedStatus}</span>
                  </div>
                ))}
            </div>

            <p className="text-[11px] text-slate-500">
              Zmiany zostaną zapisane w bazie Twoich aplikacji, a w notatkach pojawi się adnotacja z datą wiadomości i podsumowaniem AI.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowConfirmDialog(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
              >
                Wróć
              </button>
              <button
                type="button"
                id="confirm-apply-btn"
                onClick={handleConfirmApply}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs cursor-pointer"
              >
                Tak, zaktualizuj aplikacje
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
