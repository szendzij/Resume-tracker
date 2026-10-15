import React from 'react';
import { Upload, FileText, FileSpreadsheet, Copy, X } from 'lucide-react';

type TabMode = 'file' | 'paste';

interface CsvImportSourcePickerProps {
  activeTab: TabMode;
  onTabChange: (tab: TabMode) => void;
  rawCsvText: string;
  fileName: string;
  fileSize: string;
  totalRows: number;
  isDragging: boolean;
  onSetDragging: (dragging: boolean) => void;
  onDrop: (e: React.DragEvent<HTMLDivElement>) => void;
  onFileInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onClearFile: () => void;
  onLoadSample: () => void;
  onPasteChange: (value: string) => void;
  onClearPaste: () => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}

export const CsvImportSourcePicker: React.FC<CsvImportSourcePickerProps> = ({
  activeTab,
  onTabChange,
  rawCsvText,
  fileName,
  fileSize,
  totalRows,
  isDragging,
  onSetDragging,
  onDrop,
  onFileInputChange,
  onClearFile,
  onLoadSample,
  onPasteChange,
  onClearPaste,
  fileInputRef,
}) => {
  return (
    <>
      {/* Tabs: File Upload vs Text Paste */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2.5">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onTabChange('file')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'file'
                ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Wgraj plik (.csv)</span>
          </button>

          <button
            type="button"
            onClick={() => onTabChange('paste')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeTab === 'paste'
                ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800'
                : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>Wklej treść CSV</span>
          </button>
        </div>

        {!rawCsvText && (
          <button
            type="button"
            onClick={onLoadSample}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <Copy className="w-3 h-3" />
            <span>Załaduj przykładowe dane CSV</span>
          </button>
        )}
      </div>

      {/* Upload Dropzone */}
      {activeTab === 'file' && (
        <div>
          {fileName ? (
            <div className="p-4 rounded-xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/60 dark:bg-emerald-950/20 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-lg bg-emerald-100 dark:bg-emerald-900/60 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
                    {fileName}
                  </h4>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Rozmiar: {fileSize} • Wykryto {totalRows} wierszy
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-2.5 py-1.5 text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                >
                  Zmień plik
                </button>
                <button
                  type="button"
                  onClick={onClearFile}
                  className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg transition-colors cursor-pointer"
                  title="Usuń wczytany plik"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>
          ) : (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                onSetDragging(true);
              }}
              onDragLeave={() => onSetDragging(false)}
              onDrop={onDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 scale-[0.99]'
                  : 'border-slate-300 dark:border-slate-700 hover:border-slate-400 dark:hover:border-slate-600 bg-slate-50/50 dark:bg-slate-800/30'
              }`}
            >
              <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                <Upload className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-1">
                Przeciągnij i upuść plik CSV tutaj
              </h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-3">
                Obsługuje standardowy format CSV z Excela, NoFluffJobs, LinkedIn lub z wyeksportowanych raportów (.csv).
              </p>
              <span className="inline-block px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-xs">
                Wybierz plik z dysku
              </span>
            </div>
          )}

          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv,application/vnd.ms-excel"
            onChange={onFileInputChange}
            className="hidden"
          />
        </div>
      )}

      {/* Paste Raw CSV Area */}
      {activeTab === 'paste' && (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Wklej surowy tekst CSV (pierwszy wiersz powinien zawierać nazwy kolumn)
            </label>
            {rawCsvText && (
              <button
                type="button"
                onClick={onClearPaste}
                className="text-xs text-rose-600 dark:text-rose-400 hover:underline cursor-pointer"
              >
                Wyczyść
              </button>
            )}
          </div>
          <textarea
            rows={6}
            value={rawCsvText}
            onChange={(e) => onPasteChange(e.target.value)}
            placeholder="Stanowisko;Firma;Portal;Data wyslania CV;Status;Lokalizacja;Widelki;Technologie;Link;Notatki&#10;Software Engineer;Allegro;Pracuj.pl;2026-03-10;Rozmowa HR;Warszawa;22 000 PLN;React, TypeScript;https://..."
            className="w-full bg-slate-50 dark:bg-slate-800/80 border border-slate-300 dark:border-slate-700 rounded-xl p-3 text-xs font-mono text-slate-800 dark:text-slate-200 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
          />
        </div>
      )}
    </>
  );
};
