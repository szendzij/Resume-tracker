import React from 'react';
import { JobStatus } from '../../types';
import { Delimiter } from '../../services/csvImport.service';
import { StatusSelect } from '../common/StatusSelect';
import { Settings2, ChevronDown, ChevronUp } from 'lucide-react';

interface CsvImportSettingsProps {
  delimiter: Delimiter;
  onDelimiterChange: (delimiter: Delimiter) => void;
  delimiterUsed?: string;
  defaultStatus: JobStatus;
  onDefaultStatusChange: (status: JobStatus) => void;
  defaultDate: string;
  onDefaultDateChange: (date: string) => void;
  skipDuplicates: boolean;
  onSkipDuplicatesChange: (skip: boolean) => void;
  showMappingConfig: boolean;
  onToggleMappingConfig: () => void;
  headerCount: number;
  duplicateCount: number;
}

export const CsvImportSettings: React.FC<CsvImportSettingsProps> = ({
  delimiter,
  onDelimiterChange,
  delimiterUsed,
  defaultStatus,
  onDefaultStatusChange,
  defaultDate,
  onDefaultDateChange,
  skipDuplicates,
  onSkipDuplicatesChange,
  showMappingConfig,
  onToggleMappingConfig,
  headerCount,
  duplicateCount,
}) => {
  return (
    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3">
        {/* Delimiter */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Separator kolumn
          </label>
          <select
            value={delimiter}
            onChange={(e) => onDelimiterChange(e.target.value as Delimiter)}
            className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
          >
            <option value="auto">
              Automatyczny ({delimiterUsed ? `wykryto: "${delimiterUsed}"` : 'detekcja'})
            </option>
            <option value=";">Średnik (;) [Polska / Excel]</option>
            <option value=",">Przecinek (,) [US / Standard]</option>
            <option value="&#9;">Tabulacja (\t)</option>
            <option value="|">Kreska pionowa (|)</option>
          </select>
        </div>

        {/* Default Status */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Domyślny status (dla pustych)
          </label>
          <StatusSelect value={defaultStatus} onChange={onDefaultStatusChange} />
        </div>

        {/* Default Date */}
        <div>
          <label className="block text-[11px] font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Domyślna data wysłania
          </label>
          <input
            type="date"
            value={defaultDate}
            onChange={(e) => onDefaultDateChange(e.target.value)}
            className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>

        {/* Toggle Column Mappings */}
        <div className="flex flex-col justify-end">
          <button
            type="button"
            onClick={onToggleMappingConfig}
            className="w-full py-1.5 px-3 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
          >
            <Settings2 className="w-3.5 h-3.5 text-blue-500" />
            <span>Dopasuj kolumny ({headerCount})</span>
            {showMappingConfig ? (
              <ChevronUp className="w-3.5 h-3.5 ml-auto" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 ml-auto" />
            )}
          </button>
        </div>
      </div>

      {/* Skip duplicates toggle */}
      <div className="pt-2 border-t border-slate-200 dark:border-slate-700/80 flex items-center justify-between">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={skipDuplicates}
            onChange={(e) => onSkipDuplicatesChange(e.target.checked)}
            className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-700 cursor-pointer"
          />
          <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
            Automatycznie odznacz wykryte duplikaty ofert (weryfikacja wg linku URL, firmy, stanowiska, portalu i daty)
          </span>
        </label>

        {duplicateCount > 0 && (
          <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/60 px-2 py-0.5 rounded-md border border-amber-200 dark:border-amber-800">
            Wykryto {duplicateCount} duplikatów
          </span>
        )}
      </div>
    </div>
  );
};
