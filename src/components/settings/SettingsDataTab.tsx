import React from 'react';
import {
  Database,
  Upload,
  Download,
  FileSpreadsheet,
  FileJson,
  CheckCircle2,
  X,
} from 'lucide-react';
import { JobApplication } from '../../types';
import { exportApplicationsToCSV, exportApplicationsToJSON } from '../../services/export.service';

interface SettingsDataTabProps {
  applications: JobApplication[];
  onClose: () => void;
  onOpenCsvImport: () => void;
  jsonFileInputRef: React.RefObject<HTMLInputElement | null>;
  onJsonFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  jsonImportPreview: { items: JobApplication[]; filename: string } | null;
  jsonImportMode: 'merge' | 'overwrite';
  onSetJsonImportMode: (mode: 'merge' | 'overwrite') => void;
  onDismissJsonPreview: () => void;
  onConfirmJsonImport: () => void;
}

export const SettingsDataTab: React.FC<SettingsDataTabProps> = ({
  applications,
  onClose,
  onOpenCsvImport,
  jsonFileInputRef,
  onJsonFileChange,
  jsonImportPreview,
  jsonImportMode,
  onSetJsonImportMode,
  onDismissJsonPreview,
  onConfirmJsonImport,
}) => (
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
            onChange={onJsonFileChange}
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
              onClick={onDismissJsonPreview}
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
                onChange={() => onSetJsonImportMode('merge')}
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
                onChange={() => onSetJsonImportMode('overwrite')}
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
              onClick={onDismissJsonPreview}
              className="px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400 hover:bg-white dark:hover:bg-slate-800 rounded-lg cursor-pointer"
            >
              Anuluj
            </button>
            <button
              type="button"
              onClick={onConfirmJsonImport}
              className="px-3.5 py-1.5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-lg shadow-xs cursor-pointer"
            >
              Zatwierdź import
            </button>
          </div>
        </div>
      )}
    </div>
  </div>
);
