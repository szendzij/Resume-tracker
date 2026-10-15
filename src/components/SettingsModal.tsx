import React, { useState, useEffect, useRef } from 'react';
import { Settings } from 'lucide-react';
import { JobApplication } from '../types';
import { ModalShell } from './common/ModalShell';
import { api, getCustomGeminiKey, setCustomGeminiKey } from '../services/api';
import { SettingsTab } from './settings/types';
import { SettingsTabNav } from './settings/SettingsTabNav';
import { SettingsThemeTab } from './settings/SettingsThemeTab';
import { SettingsDataTab } from './settings/SettingsDataTab';
import { SettingsEmailTab } from './settings/SettingsEmailTab';
import { SettingsGeminiTab } from './settings/SettingsGeminiTab';

export type { SettingsTab } from './settings/types';

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
    model: 'gemini-3.5-flash-lite',
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
      <ModalShell
        title="Ustawienia aplikacji"
        subtitle="Zarządzaj motywem, importem/eksportem danych, pocztą oraz modelem Gemini AI"
        icon={<Settings className="w-4 h-4" />}
        onClose={onClose}
        panelClassName="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden"
      >

        {/* Tab Navigation */}
        <SettingsTabNav
          activeTab={activeTab}
          onSelectTab={setActiveTab}
          isDark={isDark}
          hasConnectedEmail={outlookConnected || gmailConnected}
          hasCustomKey={Boolean(customKey.trim())}
        />

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {/* TAB 1: THEME & APPEARANCE */}
          {activeTab === 'theme' && (
            <SettingsThemeTab isDark={isDark} onSetTheme={onSetTheme} />
          )}

          {/* TAB 2: DATA IMPORT & EXPORT */}
          {activeTab === 'data' && (
            <SettingsDataTab
              applications={applications}
              onClose={onClose}
              onOpenCsvImport={onOpenCsvImport}
              jsonFileInputRef={jsonFileInputRef}
              onJsonFileChange={handleJsonFileChange}
              jsonImportPreview={jsonImportPreview}
              jsonImportMode={jsonImportMode}
              onSetJsonImportMode={setJsonImportMode}
              onDismissJsonPreview={() => setJsonImportPreview(null)}
              onConfirmJsonImport={handleConfirmJsonImport}
            />
          )}

          {/* TAB 3: EMAIL SYNC */}
          {activeTab === 'email' && (
            <SettingsEmailTab
              outlookConnected={outlookConnected}
              gmailConnected={gmailConnected}
              onDisconnectOutlook={handleDisconnectOutlook}
              onDisconnectGmail={handleDisconnectGmail}
              onClose={onClose}
              onOpenInboxSync={onOpenInboxSync}
            />
          )}

          {/* TAB 4: GEMINI AI API KEY */}
          {activeTab === 'gemini' && (
            <SettingsGeminiTab
              customKey={customKey}
              onCustomKeyChange={(value) => {
                setCustomKey(value);
                setTestResult(null);
              }}
              showKeyPassword={showKeyPassword}
              onToggleShowKeyPassword={() => setShowKeyPassword((prev) => !prev)}
              isTestingKey={isTestingKey}
              testResult={testResult}
              systemKeyInfo={systemKeyInfo}
              onTestKey={handleTestGeminiKey}
              onSaveKey={handleSaveGeminiKey}
              onClearKey={handleClearGeminiKey}
            />
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
      </ModalShell>
    </div>
  );
};
