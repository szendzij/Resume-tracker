import React, { useState } from 'react';
import { Mail, X, RefreshCw, Send, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { JobApplication, JobStatus } from '../types';
import { useInboxSync } from './inbox/useInboxSync';
import { InboxSyncTab } from './inbox/InboxSyncTab';
import { InboxAccountsTab } from './inbox/InboxAccountsTab';
import { InboxManualPasteTab } from './inbox/InboxManualPasteTab';

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
  const [showConfirmDialog, setShowConfirmDialog] = useState(false);

  const {
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
  } = useInboxSync(applications, showToast);

  if (!isOpen) return null;

  const handleApplyConfirmed = () => {
    const selected = analyzedResults.filter((r) => selectedResultIds.includes(r.emailId));
    const updates: Array<{
      appId: string;
      newStatus: JobStatus;
      noteAddition: string;
      meetingDate?: string;
    }> = [];

    let newAppsCount = 0;

    selected.forEach((item) => {
      if (item.isNewApplication && item.newApplicationData) {
        onAddNewApplication({
          role: item.newApplicationData.role,
          company: item.newApplicationData.company,
          portal: item.newApplicationData.portal,
          location: item.newApplicationData.location,
          status: item.suggestedStatus as JobStatus,
          notes: `[E-mail]: ${item.summary}${item.reasoning ? ` (${item.reasoning})` : ''}`,
        });
        newAppsCount++;
      } else if (item.matchedApplicationId && item.isStatusChange) {
        updates.push({
          appId: item.matchedApplicationId,
          newStatus: item.suggestedStatus as JobStatus,
          noteAddition: `[E-mail ${new Date().toLocaleDateString('pl-PL')}]: ${item.summary}${
            item.meetingDate ? ` | Termin: ${item.meetingDate}` : ''
          }`,
          meetingDate: item.meetingDate,
        });
      }
    });

    if (updates.length > 0) {
      onApplyStatusUpdates(updates);
    }

    setShowConfirmDialog(false);
    showToast(
      `Zastosowano zmiany: zaktualizowano ${updates.length} aplikacji, dodano ${newAppsCount} nowych.`
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-3xl shadow-xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Mail className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Synchronizacja skrzynki e-mail
              </h3>
              <p className="text-xs text-slate-500">
                Wykrywaj statusy rekrutacji z poczty Outlook & Gmail za pomocą AI Gemini
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
        <div className="px-6 border-b border-slate-200 dark:border-slate-800 flex items-center gap-6 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab('sync')}
            className={`py-3 flex items-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'sync'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Synchronizacja i wyniki</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('accounts')}
            className={`py-3 flex items-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'accounts'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Połączone konta</span>
            {(outlookConnected || gmailConnected) && (
              <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('paste')}
            className={`py-3 flex items-center gap-1.5 border-b-2 transition-colors cursor-pointer ${
              activeTab === 'paste'
                ? 'border-blue-600 text-blue-600 dark:text-blue-400'
                : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>Wklej e-mail ręcznie</span>
          </button>
        </div>

        {/* Tab Content Body */}
        <div className="p-6 overflow-y-auto flex-1">
          {activeTab === 'sync' && (
            <InboxSyncTab
              isScanning={isScanning}
              scanStep={scanStep}
              analyzedResults={analyzedResults}
              selectedResultIds={selectedResultIds}
              expandedEmailId={expandedEmailId}
              onStartScan={startScan}
              onToggleSelect={toggleResultSelection}
              onToggleExpand={toggleExpandEmail}
              onSelectAll={() => setSelectedResultIds(analyzedResults.map((r) => r.emailId))}
              onDeselectAll={() => setSelectedResultIds([])}
              onOpenConfirm={() => setShowConfirmDialog(true)}
            />
          )}

          {activeTab === 'accounts' && (
            <InboxAccountsTab
              outlookConnected={outlookConnected}
              gmailConnected={gmailConnected}
              onConnect={connectAccount}
              onDisconnectOutlook={disconnectOutlook}
              onDisconnectGmail={disconnectGmail}
            />
          )}

          {activeTab === 'paste' && (
            <InboxManualPasteTab
              manualSubject={manualSubject}
              setManualSubject={setManualSubject}
              manualSender={manualSender}
              setManualSender={setManualSender}
              manualBody={manualBody}
              setManualBody={setManualBody}
              isAnalyzing={isAnalyzingManual}
              onAnalyze={analyzeManualEmail}
            />
          )}
        </div>
      </div>

      {/* Confirmation Dialog before applying */}
      {showConfirmDialog && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-5 max-w-md w-full shadow-2xl space-y-4">
            <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              Potwierdź aktualizację trackerera
            </h4>
            <p className="text-xs text-slate-600 dark:text-slate-400">
              Czy chcesz zaktualizować statusy dla{' '}
              <strong className="text-slate-900 dark:text-slate-100">
                {selectedResultIds.length}
              </strong>{' '}
              zaznaczonych wiadomości w Twoim trackerze aplikacji?
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={() => setShowConfirmDialog(false)}
                className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg cursor-pointer"
              >
                Anuluj
              </button>
              <button
                type="button"
                onClick={handleApplyConfirmed}
                className="px-3.5 py-1.5 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold rounded-lg shadow-xs cursor-pointer"
              >
                Potwierdź i zaktualizuj
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
