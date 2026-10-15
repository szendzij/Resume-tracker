import React from 'react';
import {
  Sparkles,
  ShieldCheck,
  ExternalLink,
  Eye,
  EyeOff,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Check,
} from 'lucide-react';

interface GeminiTestResult {
  success: boolean;
  message: string;
  model?: string;
}

interface SettingsGeminiTabProps {
  customKey: string;
  onCustomKeyChange: (value: string) => void;
  showKeyPassword: boolean;
  onToggleShowKeyPassword: () => void;
  isTestingKey: boolean;
  testResult: GeminiTestResult | null;
  systemKeyInfo: { hasEnvKey: boolean; model: string };
  onTestKey: () => void;
  onSaveKey: () => void;
  onClearKey: () => void;
}

export const SettingsGeminiTab: React.FC<SettingsGeminiTabProps> = ({
  customKey,
  onCustomKeyChange,
  showKeyPassword,
  onToggleShowKeyPassword,
  isTestingKey,
  testResult,
  systemKeyInfo,
  onTestKey,
  onSaveKey,
  onClearKey,
}) => (
  <div className="space-y-6 animate-in fade-in duration-150">
    <div>
      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-indigo-500" />
        Konfiguracja Google Gemini AI
      </h4>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
        Aplikacja wykorzystuje model{' '}
        <strong className="text-indigo-600 dark:text-indigo-400">
          {systemKeyInfo.model || 'gemini-3.5-flash-lite'}
        </strong>{' '}
        do analizy linków ofert, automatycznego wyciągania technologii, firm, stanowisk oraz
        interpretacji statusów z poczty e-mail.
      </p>
    </div>

    {/* Status Banner */}
    <div className="p-4 rounded-xl border flex items-start gap-3 bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-800">
      <div className="p-2 rounded-lg bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 mt-0.5">
        <ShieldCheck className="w-4 h-4" />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-slate-900 dark:text-slate-100">
            Status aktywnego silnika AI:
          </span>
          {customKey.trim() ? (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300">
              Aktywny klucz użytkownika (Override)
            </span>
          ) : systemKeyInfo.hasEnvKey ? (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
              Aktywny klucz środowiska AI Studio
            </span>
          ) : (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950 text-amber-700 dark:text-amber-300">
              Tryb regułowy (Heuristics Fallback)
            </span>
          )}
        </div>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 mt-1">
          {customKey.trim()
            ? 'Wszystkie zapytania AI korzystają z Twojego indywidualnego klucza API zapisanego w przeglądarce.'
            : systemKeyInfo.hasEnvKey
            ? 'Aplikacja korzysta z domyślnego klucza serwerowego Google AI Studio. Możesz opcjonalnie podać poniżej własny klucz.'
            : 'Wpisz swój klucz API z Google AI Studio poniżej, aby włączyć zaawansowane funkcje analizy ofert i maili przez model Gemini.'}
        </p>
      </div>
    </div>

    {/* Custom Key Input Form */}
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <label
          htmlFor="gemini-key-input"
          className="text-xs font-bold text-slate-900 dark:text-slate-100"
        >
          Własny klucz Gemini API (opcjonalny):
        </label>
        <a
          href="https://aistudio.google.com/app/apikey"
          target="_blank"
          rel="noopener noreferrer"
          className="text-[11px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1 font-semibold"
        >
          <span>Uzyskaj darmowy klucz w Google AI Studio</span>
          <ExternalLink className="w-3 h-3" />
        </a>
      </div>

      <div className="relative">
        <input
          id="gemini-key-input"
          type={showKeyPassword ? 'text' : 'password'}
          value={customKey}
          onChange={(e) => {
            onCustomKeyChange(e.target.value);
          }}
          placeholder="Wklej klucz: AIzaSy..."
          className="w-full px-3.5 py-2.5 pr-10 text-xs bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
        />
        <button
          type="button"
          onClick={onToggleShowKeyPassword}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
          title={showKeyPassword ? 'Ukryj klucz' : 'Pokaż klucz'}
        >
          {showKeyPassword ? (
            <EyeOff className="w-4 h-4" />
          ) : (
            <Eye className="w-4 h-4" />
          )}
        </button>
      </div>

      <p className="text-[11px] text-slate-500 dark:text-slate-400">
        Twój klucz jest bezpiecznie przesyłany bezpośrednio do zapytań serwerowych (@google/genai SDK) i nie jest nigdzie udostępniany osobom trzecim.
      </p>

      {/* Validation Result Banner */}
      {testResult && (
        <div
          className={`p-3 rounded-xl border text-xs flex items-start gap-2 animate-in fade-in duration-150 ${
            testResult.success
              ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-800 dark:text-emerald-300'
              : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-800 dark:text-rose-300'
          }`}
        >
          {testResult.success ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600 dark:text-rose-400" />
          )}
          <div>
            <div className="font-bold">
              {testResult.success
                ? 'Połączenie z Gemini API aktywne!'
                : 'Błąd połączenia z Gemini API'}
            </div>
            <div className="mt-0.5 text-[11px]">{testResult.message}</div>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onTestKey}
            disabled={isTestingKey}
            className="px-3 py-2 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
          >
            {isTestingKey ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
            )}
            <span>{isTestingKey ? 'Testowanie...' : 'Testuj połączenie'}</span>
          </button>

          {customKey.trim() && (
            <button
              type="button"
              onClick={onClearKey}
              className="px-3 py-2 text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
            >
              Wyczyść klucz
            </button>
          )}
        </div>

        <button
          type="button"
          onClick={onSaveKey}
          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm shadow-indigo-500/20 transition-all cursor-pointer"
        >
          <Check className="w-3.5 h-3.5" />
          <span>Zapisz ustawienia klucza</span>
        </button>
      </div>
    </div>
  </div>
);
