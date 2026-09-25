import React from 'react';
import { JobStatus } from '../../types';
import { ALL_STATUSES } from '../../utils/statusConfig';
import { Sparkles, Loader2, BrainCircuit } from 'lucide-react';

interface BatchFormControlsProps {
  defaultStatus: JobStatus;
  setDefaultStatus: (status: JobStatus) => void;
  defaultDate: string;
  setDefaultDate: (date: string) => void;
  skipDuplicates: boolean;
  setSkipDuplicates: (skip: boolean) => void;
  detectedCount: number;
  isAiExtracting: boolean;
  hasEnriched: boolean;
  onEnrichWithAi: () => void;
}

export const BatchFormControls: React.FC<BatchFormControlsProps> = ({
  defaultStatus,
  setDefaultStatus,
  defaultDate,
  setDefaultDate,
  skipDuplicates,
  setSkipDuplicates,
  detectedCount,
  isAiExtracting,
  hasEnriched,
  onEnrichWithAi,
}) => {
  return (
    <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {/* Default Status */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Domyślny status dla importu
          </label>
          <select
            value={defaultStatus}
            onChange={(e) => setDefaultStatus(e.target.value as JobStatus)}
            className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
          >
            {ALL_STATUSES.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        </div>

        {/* Default Date */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Data wysłania zgłoszenia
          </label>
          <input
            type="date"
            value={defaultDate}
            onChange={(e) => setDefaultDate(e.target.value)}
            className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        {/* AI Action button */}
        <div className="flex flex-col justify-end">
          <button
            type="button"
            onClick={onEnrichWithAi}
            disabled={isAiExtracting || detectedCount === 0 || hasEnriched}
            className="w-full py-2 px-3 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 shadow-xs transition-colors cursor-pointer"
          >
            {isAiExtracting ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Analiza AI...</span>
              </>
            ) : hasEnriched ? (
              <>
                <BrainCircuit className="w-3.5 h-3.5 text-emerald-300" />
                <span>Wzbogacono przez AI</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Wzbogać dane przez AI</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Skip Duplicates Checkbox */}
      <div className="pt-2 border-t border-slate-200 dark:border-slate-700 flex items-center justify-between">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={skipDuplicates}
            onChange={(e) => setSkipDuplicates(e.target.checked)}
            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-700 cursor-pointer"
          />
          <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
            Automatycznie pomijaj wykryte duplikaty ofert (weryfikacja wg linku URL, firmy, stanowiska i portalu)
          </span>
        </label>
      </div>
    </div>
  );
};
