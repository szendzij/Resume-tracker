import React from 'react';
import { HelpCircle } from 'lucide-react';

export const CsvImportHints: React.FC = () => {
  return (
    <div className="p-3 bg-slate-50 dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-800 flex items-start gap-2.5 text-xs text-slate-600 dark:text-slate-400">
      <HelpCircle className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
      <div className="space-y-1">
        <p>
          <strong>Wskazówka:</strong> Możesz zaimportować plik CSV wyeksportowany z tej aplikacji lub z dowolnego arkusza Excel/Google Sheets. Rozpoznajemy kolumny w języku polskim oraz angielskim (np. Stanowisko, Firma, Portal, Data, Status, Wynagrodzenie, Technologie, Link).
        </p>
      </div>
    </div>
  );
};
