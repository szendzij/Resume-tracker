import React from 'react';
import { JobApplication } from '../types';
import { useBatchAdd } from './batch/useBatchAdd';
import { BatchFormControls } from './batch/BatchFormControls';
import { BatchPreviewList } from './batch/BatchPreviewList';
import { X, ListPlus, AlertTriangle, CheckCircle2, ArrowRight } from 'lucide-react';

interface BatchAddModalProps {
  isOpen: boolean;
  onClose: () => void;
  existingApplications: JobApplication[];
  onBatchAdd: (newApps: JobApplication[], duplicateCount: number) => void;
}

export const BatchAddModal: React.FC<BatchAddModalProps> = ({
  isOpen,
  onClose,
  existingApplications,
  onBatchAdd,
}) => {
  const {
    linksText,
    setLinksText,
    defaultStatus,
    setDefaultStatus,
    defaultDate,
    setDefaultDate,
    skipDuplicates,
    setSkipDuplicates,
    filterPreview,
    setFilterPreview,
    isAiExtracting,
    enrichedItems,
    aiFeedback,
    parseResult,
    itemsToImport,
    filteredPreviewItems,
    enrichWithAi,
    updateItemDetails,
  } = useBatchAdd(existingApplications);

  if (!isOpen) return null;

  const handleImportSubmit = () => {
    if (itemsToImport.length === 0) return;

    const newApplications: JobApplication[] = itemsToImport.map((item) => ({
      id: `job-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      role: item.role,
      company: item.company,
      portal: item.portal,
      url: item.url,
      appliedDate: defaultDate,
      status: defaultStatus,
      location: item.location,
      skills: item.skills || ['QA', 'Testing'],
      notes: item.notes || (item.isAiEnriched ? 'Wyodrębniono przez AI Gemini' : ''),
      lastUpdated: new Date().toISOString(),
    }));

    onBatchAdd(newApplications, parseResult.duplicateCount);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-3xl shadow-xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <ListPlus className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                Masowy import linków rekrutacyjnych
              </h3>
              <p className="text-xs text-slate-500">
                Wklej listę linków w formacie Markdown [Tytuł](URL) lub czystych adresów URL
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

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {/* Text Area Input */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
              Wklej linki (każdy w nowej linii lub w formacie Markdown)
            </label>
            <textarea
              rows={5}
              value={linksText}
              onChange={(e) => setLinksText(e.target.value)}
              placeholder="np.&#10;[Senior QA Engineer - Spyrosoft](https://spyro-soft.com/job/qa)&#10;https://nofluffjobs.com/job/gft-poland-qa&#10;QA Tester: https://justjoin.it/offers/..."
              className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-xs font-mono focus:ring-2 focus:ring-blue-500 outline-none resize-none"
            />
          </div>

          {/* AI Feedback Banner */}
          {aiFeedback && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                aiFeedback.type === 'success'
                  ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
                  : 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800 text-amber-800 dark:text-amber-300'
              }`}
            >
              {aiFeedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              )}
              <span>{aiFeedback.text}</span>
            </div>
          )}

          {/* Controls Bar */}
          <BatchFormControls
            defaultStatus={defaultStatus}
            setDefaultStatus={setDefaultStatus}
            defaultDate={defaultDate}
            setDefaultDate={setDefaultDate}
            skipDuplicates={skipDuplicates}
            setSkipDuplicates={setSkipDuplicates}
            detectedCount={parseResult.totalDetected}
            isAiExtracting={isAiExtracting}
            hasEnriched={Boolean(enrichedItems)}
            onEnrichWithAi={enrichWithAi}
          />

          {/* Parsed Preview List */}
          <BatchPreviewList
            items={filteredPreviewItems}
            totalDetected={parseResult.totalDetected}
            uniqueCount={parseResult.uniqueCount}
            duplicateCount={parseResult.duplicateCount}
            filterMode={filterPreview}
            onFilterChange={setFilterPreview}
            onUpdateItem={updateItemDetails}
          />
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-3.5 bg-slate-50 dark:bg-slate-800/60 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Do zaimportowania: <strong className="text-slate-900 dark:text-slate-100">{itemsToImport.length}</strong> ofert
          </span>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 text-xs font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
            >
              Anuluj
            </button>
            <button
              type="button"
              onClick={handleImportSubmit}
              disabled={itemsToImport.length === 0}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
            >
              <ArrowRight className="w-4 h-4" />
              <span>Zatwierdź i dodaj ({itemsToImport.length})</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
