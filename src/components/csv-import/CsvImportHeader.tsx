import React from 'react';
import { downloadSampleCsvTemplate } from '../../services/csvImport.service';
import { FileSpreadsheet, Download, X } from 'lucide-react';

interface CsvImportHeaderProps {
  onClose: () => void;
}

export const CsvImportHeader: React.FC<CsvImportHeaderProps> = ({ onClose }) => {
  return (
    <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shadow-xs">
          <FileSpreadsheet className="w-5 h-5" />
        </div>
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Import danych z pliku CSV
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Wczytaj plik CSV z historią zgłoszeń lub wklej treść. Automatycznie mapujemy kolumny i wykrywamy duplikaty.
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={downloadSampleCsvTemplate}
          title="Pobierz gotowy szablon CSV do wypełnienia w Excelu lub arkuszach"
          className="px-2.5 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <Download className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span className="hidden sm:inline">Pobierz szablon CSV</span>
          <span className="sm:hidden">Szablon</span>
        </button>

        <button
          type="button"
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
