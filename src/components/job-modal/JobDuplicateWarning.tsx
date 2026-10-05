import React from 'react';
import { AlertTriangle, ExternalLink } from 'lucide-react';
import { DuplicateDetectionResult } from '../../utils/duplicateDetector';
import { JobApplication } from '../../types';

export interface JobDuplicateWarningProps {
  duplicateCheck: DuplicateDetectionResult;
  showDuplicatePrompt: boolean;
  allowDuplicateSave: boolean;
  setAllowDuplicateSave: (allow: boolean) => void;
  setShowDuplicatePrompt: (show: boolean) => void;
  onConfirmSave: () => void;
}

export const JobDuplicateWarning: React.FC<JobDuplicateWarningProps> = ({
  duplicateCheck,
  showDuplicatePrompt,
  allowDuplicateSave,
  setAllowDuplicateSave,
  setShowDuplicatePrompt,
  onConfirmSave,
}) => {
  if (!duplicateCheck.isDuplicate) return null;

  return (
    <div
      id="job-duplicate-warning-banner"
      className={`p-4 rounded-xl border transition-all animate-in fade-in duration-200 ${
        showDuplicatePrompt
          ? 'bg-amber-100/90 dark:bg-amber-950/70 border-amber-400 dark:border-amber-600 shadow-md ring-2 ring-amber-400/40'
          : 'bg-amber-50/80 dark:bg-amber-950/40 border-amber-300 dark:border-amber-800'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="p-2 rounded-lg bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5">
          <AlertTriangle className="w-5 h-5" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-xs text-amber-950 dark:text-amber-100">
              Wykryto prawdopodobny duplikat z ofertą w bazie!
            </span>

            {/* Matched parameters tags */}
            <div className="flex flex-wrap items-center gap-1">
              {duplicateCheck.matchedFields.includes('url') && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-200/80 dark:bg-amber-900/80 text-amber-900 dark:text-amber-200 text-[10px] font-bold">
                  🔗 Link URL
                </span>
              )}
              {duplicateCheck.matchedFields.includes('company') && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-200/80 dark:bg-amber-900/80 text-amber-900 dark:text-amber-200 text-[10px] font-bold">
                  🏢 Firma
                </span>
              )}
              {duplicateCheck.matchedFields.includes('role') && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-200/80 dark:bg-amber-900/80 text-amber-900 dark:text-amber-200 text-[10px] font-bold">
                  💼 Stanowisko
                </span>
              )}
              {duplicateCheck.matchedFields.includes('appliedDate') && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-200/80 dark:bg-amber-900/80 text-amber-900 dark:text-amber-200 text-[10px] font-bold">
                  📅 Data
                </span>
              )}
              {duplicateCheck.matchedFields.includes('portal') && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-200/80 dark:bg-amber-900/80 text-amber-900 dark:text-amber-200 text-[10px] font-bold">
                  🌐 Portal
                </span>
              )}
              {duplicateCheck.matchedFields.includes('location') && (
                <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-amber-200/80 dark:bg-amber-900/80 text-amber-900 dark:text-amber-200 text-[10px] font-bold">
                  📍 Lokalizacja
                </span>
              )}
            </div>
          </div>

          <p className="mt-1 text-xs text-amber-900 dark:text-amber-200">
            {duplicateCheck.reason}
          </p>

          {/* Matched application summary snippet */}
          {duplicateCheck.matchedApplication && (
            <div className="mt-2 text-[11px] p-2 rounded-lg bg-amber-100/60 dark:bg-amber-900/30 border border-amber-200 dark:border-amber-800/60 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {duplicateCheck.matchedApplication.company} – {duplicateCheck.matchedApplication.role}
                </span>
                <span className="text-slate-500 dark:text-slate-400">•</span>
                <span className="px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-300 font-medium">
                  {(duplicateCheck.matchedApplication as JobApplication).status || 'Wysłana'}
                </span>
                {duplicateCheck.matchedApplication.appliedDate && (
                  <span className="text-slate-600 dark:text-slate-300">
                    złożono: {duplicateCheck.matchedApplication.appliedDate}
                  </span>
                )}
              </div>

              {duplicateCheck.matchedApplication.url && (
                <a
                  href={duplicateCheck.matchedApplication.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Zobacz istniejący link <ExternalLink className="w-3 h-3" />
                </a>
              )}
            </div>
          )}

          {/* Allow save checkbox */}
          <div className="mt-3 flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-amber-200 dark:border-amber-800/80">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-amber-950 dark:text-amber-200">
              <input
                type="checkbox"
                checked={allowDuplicateSave}
                onChange={(e) => {
                  setAllowDuplicateSave(e.target.checked);
                  if (e.target.checked) setShowDuplicatePrompt(false);
                }}
                className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer"
              />
              <span>Zezwól na dodanie/zapisanie mimo wykrytego duplikatu</span>
            </label>

            <button
              type="button"
              onClick={() => {
                setAllowDuplicateSave(true);
                onConfirmSave();
              }}
              className="px-2.5 py-1 text-xs font-semibold rounded-md bg-amber-600 hover:bg-amber-700 text-white transition-colors cursor-pointer"
            >
              Dodaj mimo to
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
