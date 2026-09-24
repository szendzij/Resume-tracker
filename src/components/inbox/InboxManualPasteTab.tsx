import React from 'react';
import { Send, Loader2, Sparkles } from 'lucide-react';

interface InboxManualPasteTabProps {
  manualSubject: string;
  setManualSubject: (val: string) => void;
  manualSender: string;
  setManualSender: (val: string) => void;
  manualBody: string;
  setManualBody: (val: string) => void;
  isAnalyzing: boolean;
  onAnalyze: () => void;
}

export const InboxManualPasteTab: React.FC<InboxManualPasteTabProps> = ({
  manualSubject,
  setManualSubject,
  manualSender,
  setManualSender,
  manualBody,
  setManualBody,
  isAnalyzing,
  onAnalyze,
}) => {
  return (
    <div className="space-y-4 py-2">
      <div className="text-xs text-slate-500 dark:text-slate-400">
        Nie chcesz łączyć konta e-mail? Wklej treść wiadomości rekrutacyjnej tutaj. Model Gemini AI
        odczyta firmę, nowe statusy, zaproszenie na wywiad oraz linki do spotkań.
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Temat wiadomości
          </label>
          <input
            type="text"
            value={manualSubject}
            onChange={(e) => setManualSubject(e.target.value)}
            placeholder="np. Zaproszenie na rozmowę kwalifikacyjną"
            className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
        <div>
          <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
            Nadawca / Firma
          </label>
          <input
            type="text"
            value={manualSender}
            onChange={(e) => setManualSender(e.target.value)}
            placeholder="np. rekrutacja@spyro-soft.com"
            className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-500 outline-none"
          />
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
          Treść e-maila
        </label>
        <textarea
          rows={6}
          value={manualBody}
          onChange={(e) => setManualBody(e.target.value)}
          placeholder="Wklej tutaj treść otrzymanej wiadomości..."
          className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-3 text-xs focus:ring-2 focus:ring-blue-500 outline-none resize-none font-sans"
        />
      </div>

      <div className="flex justify-end">
        <button
          type="button"
          onClick={onAnalyze}
          disabled={isAnalyzing}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          {isAnalyzing ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Analizowanie wiadomości...</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5" />
              <span>Przeanalizuj wiadomość przez AI</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
};
