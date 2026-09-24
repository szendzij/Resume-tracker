import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Settings,
  Sun,
  Moon,
  Database,
  Mail,
  Sparkles,
  Download,
  Upload,
  FileSpreadsheet,
  FileJson,
  Check,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  ExternalLink,
  ShieldCheck,
  RefreshCw,
  Sliders,
  Send,
} from 'lucide-react';
import { JobApplication } from '../types';
import { exportApplicationsToCSV, exportApplicationsToJSON } from '../services/export.service';
import { api, getCustomGeminiKey, setCustomGeminiKey } from '../services/api';

export type SettingsTab = 'theme' | 'data' | 'email' | 'gemini';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: SettingsTab;
  isDark: boolean;
  onSetTheme: (theme: 'light' | 'dark') => void;
  applications: JobApplication[];
  onOpenCsvImport: () => void;
  onOpenInboxSync: () => void;
  onImportJson: (apps: JobApplication[], mode: 'merge' | 'overwrite') => void;
  showToast: (msg: string) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'theme',
  isDark,
  onSetTheme,
  applications,
  onOpenCsvImport,
  onOpenInboxSync,
  onImportJson,
  showToast,
}) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>(initialTab);

  // Gemini API Key State
  const [customKey, setCustomKey] = useState<string>('');
  const [showKeyPassword, setShowKeyPassword] = useState<boolean>(false);
  const [isTestingKey, setIsTestingKey] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<{
    success: boolean;
    message: string;
    model?: string;
  } | null>(null);
  const [systemKeyInfo, setSystemKeyInfo] = useState<{ hasEnvKey: boolean; model: string }>({
    hasEnvKey: false,
    model: 'gemini-3.8-flash',
  });

  // JSON Import State
  const jsonFileInputRef = useRef<HTMLInputElement | null>(null);
  const [jsonImportPreview, setJsonImportPreview] = useState<{
    items: JobApplication[];
    filename: string;
  } | null>(null);
  const [jsonImportMode, setJsonImportMode] = useState<'merge' | 'overwrite'>('merge');

  // Outlook / Gmail connection statuses
  const [outlookConnected, setOutlookConnected] = useState<boolean>(() => {
    return Boolean(localStorage.getItem('outlook_access_token'));
  });
  const [gmailConnected, setGmailConnected] = useState<boolean>(() => {
    return Boolean(localStorage.getItem('gmail_access_token'));
  });

  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
      const savedCustomKey = getCustomGeminiKey();
      setCustomKey(savedCustomKey);
      setTestResult(null);
      setJsonImportPreview(null);

      // Fetch server Gemini status
      api.getGeminiStatus().then((info) => {
        setSystemKeyInfo(info);
      });

      // Update connected accounts
      setOutlookConnected(Boolean(localStorage.getItem('outlook_access_token')));
      setGmailConnected(Boolean(localStorage.getItem('gmail_access_token')));
    }
  }, [isOpen, initialTab]);

  if (!isOpen) return null;

  // Handle Save Gemini Key
  const handleSaveGeminiKey = () => {
    setCustomGeminiKey(customKey);
    setTestResult(null);
    showToast(
      customKey.trim()
        ? 'Zapisano własny klucz Gemini API!'
        : 'Przywrócono domyślny klucz środowiskowy.'
    );
  };

  // Handle Clear / Reset Gemini Key
  const handleClearGeminiKey = () => {
    setCustomKey('');
    setCustomGeminiKey('');
    setTestResult(null);
    showToast('Wyczyszczono własny klucz. Aplikacja korzysta z klucza systemowego.');
  };

  // Handle Test Gemini Key
  const handleTestGeminiKey = async () => {
    setIsTestingKey(true);
    setTestResult(null);

    try {
      const res = await api.validateGeminiKey(customKey.trim() || undefined);
      if (res.valid) {
        setTestResult({
          success: true,
          message: `Klucz jest poprawny! Odpowiedź modelu ${res.model}: "${res.response || 'OK'}"`,
          model: res.model,
        });
        showToast('Test Gemini API powiódł się!');
      } else {
        setTestResult({
          success: false,
          message: res.error || 'Nie udało się nawiązać połączenia z Gemini API.',
        });
      }
    } catch (err: any) {
      setTestResult({
        success: false,
        message: err.message || 'Wystąpił błąd podczas sprawdzania klucza.',
      });
    } finally {
      setIsTestingKey(false);
    }
  };

  // JSON File selection
  const handleJsonFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const content = event.target?.result as string;
        const parsed = JSON.parse(content);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setJsonImportPreview({
            items: parsed,
            filename: file.name,
          });
        } else {
          showToast('Plik nie zawiera poprawnej listy aplikacji JSON.');
        }
      } catch (err) {
        showToast('Niepoprawny format pliku JSON.');
      }
    };
    reader.readAsText(file);
    // Reset file input value so same file can be reselected
    e.target.value = '';
  };

  // Confirm JSON Import
  const handleConfirmJsonImport = () => {
    if (!jsonImportPreview) return;
    onImportJson(jsonImportPreview.items, jsonImportMode);
    setJsonImportPreview(null);
  };

  // Disconnect accounts
  const handleDisconnectOutlook = () => {
    localStorage.removeItem('outlook_access_token');
    localStorage.removeItem('outlook_account_email');
    setOutlookConnected(false);
    showToast('Rozłączono konto Microsoft Outlook.');
  };

  const handleDisconnectGmail = () => {
    localStorage.removeItem('gmail_access_token');
    localStorage.removeItem('gmail_account_email');
    setGmailConnected(false);
    showToast('Rozłączono konto Gmail.');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Ustawienia aplikacji
              </h3>
              <p className="text-xs text-slate-500">
                Zarządzaj motywem, importem/eksportem danych, pocztą oraz modelem Gemini AI
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="px-6 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 sm:gap-6 text-xs font-semibold overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('theme')}
            className={`py-3 flex items-center gap-1.5 border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'theme'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            {isDark ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
            <span>Wygląd i motyw</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('data')}
            className={`py-3 flex items-center gap-1.5 border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'data'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <Database className="w-3.5 h-3.5" />
            <span>Import i eksport danych</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('email')}
            className={`py-3 flex items-center gap-1.5 border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'email'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <Mail className="w-3.5 h-3.5" />
            <span>Sync poczty</span>
            {(outlookConnected || gmailConnected) && (
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('gemini')}
            className={`py-3 flex items-center gap-1.5 border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
              activeTab === 'gemini'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            <span>Klucz Gemini AI</span>
            {customKey.trim() && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold">
                Własny
              </span>
            )}
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* TAB 1: THEME & APPEARANCE */}
          {activeTab === 'theme' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Wybierz motyw interfejsu
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Dostosuj kolorystykę aplikacji do swoich preferencji lub warunków oświetlenia.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Light Mode Card */}
                <button
                  type="button"
                  onClick={() => onSetTheme('light')}
                  className={`p-4 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                    !isDark
                      ? 'border-blue-600 ring-2 ring-blue-500/20 bg-blue-50/40 dark:bg-blue-950/20'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
                        <Sun className="w-4 h-4" />
                      </div>
                      <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        Tryb jasny
                      </span>
                    </div>
                    {!isDark && (
                      <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Czysty, jasny wygląd o wysokim kontraście do pracy w ciągu dnia.
                  </p>
                </button>

                {/* Dark Mode Card */}
                <button
                  type="button"
                  onClick={() => onSetTheme('dark')}
                  className={`p-4 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                    isDark
                      ? 'border-blue-600 ring-2 ring-blue-500/20 bg-blue-950/20'
                      : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800/40'
                  }`}
                >
                  <div className="flex items-center justify-between w-full mb-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-indigo-900/60 text-indigo-300 flex items-center justify-center">
                        <Moon className="w-4 h-4" />
                      </div>
                      <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                        Tryb ciemny
                      </span>
                    </div>
                    {isDark && (
                      <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Elegancki ciemny motyw łagodny dla oczu podczas wieczornej pracy.
                  </p>
                </button>
              </div>
            </div>
          )}

          {/* TAB 2: DATA IMPORT & EXPORT */}
          {activeTab === 'data' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              {/* Summary Stats */}
              <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/40 border border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-xs text-slate-500 dark:text-slate-400">
                    Liczba zapisanych aplikacji w bazie:
                  </span>
                  <p className="text-lg font-bold text-slate-900 dark:text-slate-100">
                    {applications.length}{' '}
                    <span className="text-xs font-normal text-slate-500">pozycji</span>
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-full border border-emerald-200 dark:border-emerald-800">
                    <Database className="w-3 h-3" />
                    Pamięć lokalna przeglądarki
                  </span>
                </div>
              </div>

              {/* Export Section */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Eksport danych
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Export CSV */}
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/70 dark:bg-slate-800/70 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 transition-all flex flex-col justify-between space-y-3 shadow-2xs">
                    <div>
                      <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-semibold text-xs mb-1">
                        <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span>Arkusz kalkulacyjny CSV</span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Pobierz plik `.csv` kompatybilny z Microsoft Excel, Google Sheets i LibreOffice.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => exportApplicationsToCSV(applications)}
                      className="w-full px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Eksportuj do CSV</span>
                    </button>
                  </div>

                  {/* Export JSON Backup */}
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/70 dark:bg-slate-800/70 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 transition-all flex flex-col justify-between space-y-3 shadow-2xs">
                    <div>
                      <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-semibold text-xs mb-1">
                        <FileJson className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        <span>Pełna kopia zapasowa JSON</span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Pobierz kompletny backup ze wszystkimi polami, linkami, umiejętnościami i notatkami.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => exportApplicationsToJSON(applications)}
                      className="w-full px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-xs"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Pobierz kopię JSON</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Import Section */}
              <div className="space-y-3">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                  Import i przywracanie danych
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Import CSV Trigger */}
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/70 dark:bg-slate-800/70 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 transition-all flex flex-col justify-between space-y-3 shadow-2xs">
                    <div>
                      <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-semibold text-xs mb-1">
                        <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                        <span>Importuj z pliku CSV</span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Kreator importu z mapowaniem kolumn, wykrywaniem duplikatów i podglądem.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        onClose();
                        onOpenCsvImport();
                      }}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-600 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Otwórz kreator CSV</span>
                    </button>
                  </div>

                  {/* Restore from JSON */}
                  <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/70 dark:bg-slate-800/70 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 transition-all flex flex-col justify-between space-y-3 shadow-2xs">
                    <div>
                      <div className="flex items-center gap-2 text-slate-900 dark:text-slate-100 font-semibold text-xs mb-1">
                        <FileJson className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                        <span>Przywróć z kopii JSON</span>
                      </div>
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        Wgraj wcześniej pobrany plik kopii zapasowej `.json`.
                      </p>
                    </div>
                    <input
                      ref={jsonFileInputRef}
                      type="file"
                      accept=".json,application/json"
                      onChange={handleJsonFileChange}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => jsonFileInputRef.current?.click()}
                      className="w-full px-3 py-2 bg-white dark:bg-slate-700 hover:bg-slate-100 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-100 border border-slate-200 dark:border-slate-600 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer shadow-2xs"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Wybierz plik JSON</span>
                    </button>
                  </div>
                </div>

                {/* JSON Import Preview Dialog / Alert */}
                {jsonImportPreview && (
                  <div className="p-4 rounded-xl bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/80 space-y-3 animate-in fade-in">
                    <div className="flex items-start justify-between">
                      <div>
                        <h5 className="text-xs font-bold text-indigo-900 dark:text-indigo-200 flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />
                          Odczytano plik: {jsonImportPreview.filename}
                        </h5>
                        <p className="text-[11px] text-indigo-700 dark:text-indigo-300 mt-0.5">
                          Znaleziono{' '}
                          <strong>{jsonImportPreview.items.length} ofert pracy</strong> w pliku.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setJsonImportPreview(null)}
                        className="text-indigo-400 hover:text-indigo-600 dark:hover:text-indigo-200 cursor-pointer"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center gap-4 text-xs">
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="jsonMode"
                          checked={jsonImportMode === 'merge'}
                          onChange={() => setJsonImportMode('merge')}
                          className="text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-slate-700 dark:text-slate-300">
                          Połącz z obecnymi (Merge)
                        </span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer">
                        <input
                          type="radio"
                          name="jsonMode"
                          checked={jsonImportMode === 'overwrite'}
                          onChange={() => setJsonImportMode('overwrite')}
                          className="text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-slate-700 dark:text-slate-300">
                          Zastąp obecne dane (Overwrite)
                        </span>
                      </label>
                    </div>

                    <div className="flex justify-end gap-2 pt-2 border-t border-indigo-200 dark:border-indigo-800/60">
                      <button
                        type="button"
                        onClick={() => setJsonImportPreview(null)}
                        className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 rounded-lg cursor-pointer"
                      >
                        Anuluj
                      </button>
                      <button
                        type="button"
                        onClick={handleConfirmJsonImport}
                        className="px-3.5 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-xs cursor-pointer"
                      >
                        Zatwierdź import
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: EMAIL SYNC */}
          {activeTab === 'email' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  Synchronizacja poczty rekrutacyjnej
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Połącz swoje skrzynki e-mail lub wklej treść wiadomości, aby model AI automatycznie
                  aktualizował statusy aplikacji (oferta, odrzucenie, rozmowa HR/techniczna, zadanie).
                </p>
              </div>

              {/* Accounts Status Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Outlook Card */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/70 dark:bg-slate-800/70 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 transition-all flex flex-col justify-between space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 flex items-center justify-center font-bold text-xs">
                        MS
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                          Microsoft Outlook
                        </div>
                        <div className="text-[10px] text-slate-500">Microsoft Graph API</div>
                      </div>
                    </div>

                    {outlookConnected ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                        Połączono
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                        Niepołączono
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200/80 dark:border-slate-700/60">
                    {outlookConnected ? (
                      <button
                        type="button"
                        onClick={handleDisconnectOutlook}
                        className="px-2.5 py-1 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg cursor-pointer"
                      >
                        Rozłącz
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenInboxSync();
                        }}
                        className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg cursor-pointer flex items-center gap-1 shadow-xs"
                      >
                        <span>Połącz Outlook</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Gmail Card */}
                <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/70 dark:bg-slate-800/70 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 transition-all flex flex-col justify-between space-y-3 shadow-2xs">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-950 text-red-600 flex items-center justify-center font-bold text-xs">
                        G
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                          Google Gmail
                        </div>
                        <div className="text-[10px] text-slate-500">Gmail REST API</div>
                      </div>
                    </div>

                    {gmailConnected ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                        Połączono
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
                        Niepołączono
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200/80 dark:border-slate-700/60">
                    {gmailConnected ? (
                      <button
                        type="button"
                        onClick={handleDisconnectGmail}
                        className="px-2.5 py-1 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg cursor-pointer"
                      >
                        Rozłącz
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          onClose();
                          onOpenInboxSync();
                        }}
                        className="px-3 py-1.5 text-xs bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg cursor-pointer flex items-center gap-1 shadow-xs"
                      >
                        <span>Połącz Gmail</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Quick Action to open full sync */}
              <div className="p-4 rounded-xl bg-blue-50/90 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                <div>
                  <h5 className="text-xs font-bold text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
                    <RefreshCw className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
                    Skanowanie i synchronizacja statusów
                  </h5>
                  <p className="text-[11px] text-blue-700 dark:text-blue-300 mt-0.5">
                    Przejdź do pełnego modułu skrzynki odbiorczej, pobierz maile i przejrzyj sugerowane aktualizacje.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenInboxSync();
                  }}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer shadow-sm shadow-blue-500/20"
                >
                  <Mail className="w-3.5 h-3.5" />
                  <span>Otwórz Inbox Sync</span>
                </button>
              </div>

              {/* Status detection info */}
              <div className="p-4 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 space-y-2 text-xs text-slate-600 dark:text-slate-300 shadow-2xs">
                <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                  Jak AI Gemini analizuje korespondencję?
                </div>
                <ul className="list-disc pl-5 space-y-1 text-[11px] text-slate-600 dark:text-slate-400">
                  <li>
                    <strong className="text-slate-700 dark:text-slate-300">Weryfikacja CV:</strong> Automatyczne potwierdzenia otrzymania aplikacji.
                  </li>
                  <li>
                    <strong className="text-slate-700 dark:text-slate-300">Rozmowa HR / Techniczna:</strong> Zaproszenia na spotkania (wykrywanie dat, linków MS Teams, Zoom, Google Meet).
                  </li>
                  <li>
                    <strong className="text-slate-700 dark:text-slate-300">Zadanie rekrutacyjne:</strong> E-maile z linkami do Codility, GitHub, testów technicznych.
                  </li>
                  <li>
                    <strong className="text-slate-700 dark:text-slate-300">Oferta / Odrzucona:</strong> Ostateczne decyzje rekruterów z automatyczną zmianą statusu.
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* TAB 4: GEMINI AI API KEY */}
          {activeTab === 'gemini' && (
            <div className="space-y-6 animate-in fade-in duration-150">
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-indigo-500" />
                  Konfiguracja Google Gemini AI
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Aplikacja wykorzystuje model{' '}
                  <strong className="text-indigo-600 dark:text-indigo-400">
                    {systemKeyInfo.model || 'gemini-3.8-flash'}
                  </strong>{' '}
                  do analizy linków ofert, automatycznego wyciągania technologii, firm, stanowisk oraz
                  interpretacji statusów z poczty e-mail.
                </p>
              </div>

              {/* Status Banner */}
              <div className="p-4 rounded-xl border flex items-start gap-3 bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-800">
                <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 mt-0.5">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
                      Status aktywnego silnika AI:
                    </span>
                    {customKey.trim() ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
                        Aktywny klucz użytkownika (Override)
                      </span>
                    ) : systemKeyInfo.hasEnvKey ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
                        Aktywny klucz środowiska AI Studio
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
                        Tryb regułowy (Heuristics Fallback)
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
                    {customKey.trim()
                      ? 'Wszystkie zapytania AI korzystają z Twojego indywidualnego klucza API zapisanego w przeglądarce.'
                      : systemKeyInfo.hasEnvKey
                      ? 'Aplikacja korzysta z domyślnego klucza serwerowego Google AI Studio. Możesz opcjonalnie podać poniżej własny klucz.'
                      : 'Wpisz swój klucz API z Google AI Studio poniżej, aby włączyć zaawansowane funkcje analizy ofert i maili przez model Gemini.'}
                  </p>
                </div>
              </div>

              {/* Custom Key Input Form */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <label
                    htmlFor="gemini-key-input"
                    className="text-xs font-bold text-slate-900 dark:text-slate-100"
                  >
                    Własny klucz Gemini API (opcjonalny):
                  </label>
                  <a
                    href="https://aistudio.google.com/app/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-semibold"
                  >
                    <span>Uzyskaj darmowy klucz w Google AI Studio</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <div className="relative">
                  <input
                    id="gemini-key-input"
                    type={showKeyPassword ? 'text' : 'password'}
                    value={customKey}
                    onChange={(e) => {
                      setCustomKey(e.target.value);
                      setTestResult(null);
                    }}
                    placeholder="Wklej klucz: AIzaSy..."
                    className="w-full px-3.5 py-2.5 pr-10 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowKeyPassword((prev) => !prev)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
                    title={showKeyPassword ? 'Ukryj klucz' : 'Pokaż klucz'}
                  >
                    {showKeyPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>

                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  Twój klucz jest bezpiecznie przesyłany bezpośrednio do zapytań serwerowych (@google/genai SDK) i nie jest nigdzie udostępniany osobom trzecim.
                </p>

                {/* Validation Result Banner */}
                {testResult && (
                  <div
                    className={`p-3 rounded-xl border text-xs flex items-start gap-2 animate-in fade-in duration-150 ${
                      testResult.success
                        ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                        : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
                    }`}
                  >
                    {testResult.success ? (
                      <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
                    )}
                    <div>
                      <div className="font-bold">
                        {testResult.success
                          ? 'Połączenie z Gemini API aktywne!'
                          : 'Błąd połączenia z Gemini API'}
                      </div>
                      <div className="mt-0.5 text-[11px]">{testResult.message}</div>
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleTestGeminiKey}
                      disabled={isTestingKey}
                      className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                    >
                      {isTestingKey ? (
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      ) : (
                        <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                      )}
                      <span>{isTestingKey ? 'Testowanie...' : 'Testuj połączenie'}</span>
                    </button>

                    {customKey.trim() && (
                      <button
                        type="button"
                        onClick={handleClearGeminiKey}
                        className="px-3 py-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                      >
                        Wyczyść klucz
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleSaveGeminiKey}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm shadow-indigo-500/20 transition-all cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Zapisz ustawienia klucza</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-800/40 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs text-slate-500">
          <div>Job Tracker &copy; 2026 &bull; Gemini 3.8 Flash</div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 dark:bg-slate-700 dark:hover:bg-slate-600 text-slate-800 dark:text-slate-200 rounded-lg font-semibold cursor-pointer transition-colors"
          >
            Zamknij
          </button>
        </div>
      </div>
    </div>
  );
};
