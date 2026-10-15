import React from 'react';
import { ColumnMapping, TargetField } from '../../services/csvImport.service';
import { Settings2 } from 'lucide-react';

const TARGET_FIELD_LABELS: Record<TargetField, string> = {
  role: 'Stanowisko / Rola (Wymagane)',
  company: 'Firma / Pracodawca (Wymagane)',
  portal: 'Portal / Serwis rekrutacyjny',
  appliedDate: 'Data wysłania CV',
  status: 'Status aplikacji',
  location: 'Lokalizacja / Miasto',
  salary: 'Widełki wynagrodzenia',
  skills: 'Technologie / Umiejętności',
  url: 'Link do oferty URL',
  notes: 'Notatki / Komentarz',
  ignore: '-- Ignoruj tę kolumnę --',
};

interface CsvColumnMappingProps {
  headers: string[];
  customMappings: ColumnMapping[];
  columnMappings: ColumnMapping[];
  onUpdateMapping: (header: string, target: TargetField) => void;
}

export const CsvColumnMapping: React.FC<CsvColumnMappingProps> = ({
  headers,
  customMappings,
  columnMappings,
  onUpdateMapping,
}) => {
  return (
    <div className="p-4 bg-blue-50/40 dark:bg-blue-950/20 rounded-xl border border-blue-200/80 dark:border-blue-900/60 space-y-3 animate-in fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Settings2 className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200">
            Mapowanie kolumn z pliku CSV na pola aplikacji
          </h4>
        </div>
        <span className="text-[11px] text-slate-500">
          Dopasowano automatycznie. W razie potrzeby możesz zmienić przypisanie.
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {headers.map((header) => {
          const currentMapping =
            customMappings.find((m) => m.csvHeader === header)?.targetField ||
            columnMappings.find((m) => m.csvHeader === header)?.targetField ||
            'ignore';

          return (
            <div
              key={header}
              className="bg-white dark:bg-slate-900 p-2.5 rounded-lg border border-slate-200 dark:border-slate-800 shadow-2xs"
            >
              <div className="text-[11px] font-bold text-slate-700 dark:text-slate-300 truncate mb-1">
                Kolumna w CSV: <span className="text-blue-600 dark:text-blue-400">"{header}"</span>
              </div>
              <select
                value={currentMapping}
                onChange={(e) => onUpdateMapping(header, e.target.value as TargetField)}
                className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded px-2 py-1 text-xs text-slate-800 dark:text-slate-200 outline-none"
              >
                {Object.entries(TARGET_FIELD_LABELS).map(([field, label]) => (
                  <option key={field} value={field}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
          );
        })}
      </div>
    </div>
  );
};
