import React from 'react';
import { Mail, RefreshCw, Sparkles } from 'lucide-react';

interface SettingsEmailTabProps {
  outlookConnected: boolean;
  gmailConnected: boolean;
  onDisconnectOutlook: () => void;
  onDisconnectGmail: () => void;
  onClose: () => void;
  onOpenInboxSync: () => void;
}

export const SettingsEmailTab: React.FC<SettingsEmailTabProps> = ({
  outlookConnected,
  gmailConnected,
  onDisconnectOutlook,
  onDisconnectGmail,
  onClose,
  onOpenInboxSync,
}) => (
  <div className="space-y-6 animate-in fade-in duration-150">
    <div>
      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
        Synchronizacja poczty rekrutacyjnej
      </h4>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
        Połącz swoje skrzynki e-mail lub wklej treść wiadomości, aby model AI automatycznie
        aktualizował statusy aplikacji (oferta, odrzucenie, rozmowa HR/techniczna, zadanie).
      </p>
    </div>

    {/* Accounts Status Cards */}
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {/* Outlook Card */}
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/70 dark:bg-slate-800/70 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 transition-all flex flex-col justify-between space-y-3 shadow-2xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 flex items-center justify-center font-bold text-xs">
              MS
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                Microsoft Outlook
              </div>
              <div className="text-[10px] text-slate-500">Microsoft Graph API</div>
            </div>
          </div>

          {outlookConnected ? (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
              Połączono
            </span>
          ) : (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
              Niepołączono
            </span>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200/80 dark:border-slate-700/60">
          {outlookConnected ? (
            <button
              type="button"
              onClick={onDisconnectOutlook}
              className="px-2.5 py-1 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg cursor-pointer"
            >
              Rozłącz
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenInboxSync();
              }}
              className="px-3 py-1.5 text-xs bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-lg cursor-pointer flex items-center gap-1 shadow-xs"
            >
              <span>Połącz Outlook</span>
            </button>
          )}
        </div>
      </div>

      {/* Gmail Card */}
      <div className="p-4 rounded-xl border border-slate-200 dark:border-slate-700/80 bg-slate-50/70 dark:bg-slate-800/70 hover:bg-slate-50 dark:hover:bg-slate-800 hover:border-slate-300 dark:hover:border-slate-600 transition-all flex flex-col justify-between space-y-3 shadow-2xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-950 text-red-600 flex items-center justify-center font-bold text-xs">
              G
            </div>
            <div>
              <div className="text-xs font-bold text-slate-900 dark:text-slate-100">
                Google Gmail
              </div>
              <div className="text-[10px] text-slate-500">Gmail REST API</div>
            </div>
          </div>

          {gmailConnected ? (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300">
              Połączono
            </span>
          ) : (
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500">
              Niepołączono
            </span>
          )}
        </div>

        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200/80 dark:border-slate-700/60">
          {gmailConnected ? (
            <button
              type="button"
              onClick={onDisconnectGmail}
              className="px-2.5 py-1 text-xs text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg cursor-pointer"
            >
              Rozłącz
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenInboxSync();
              }}
              className="px-3 py-1.5 text-xs bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg cursor-pointer flex items-center gap-1 shadow-xs"
            >
              <span>Połącz Gmail</span>
            </button>
          )}
        </div>
      </div>
    </div>

    {/* Quick Action to open full sync */}
    <div className="p-4 rounded-xl bg-blue-50/90 dark:bg-blue-950/50 border border-blue-200 dark:border-blue-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
      <div>
        <h5 className="text-xs font-bold text-blue-900 dark:text-blue-200 flex items-center gap-1.5">
          <RefreshCw className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          Skanowanie i synchronizacja statusów
        </h5>
        <p className="text-[11px] text-blue-700 dark:text-blue-300 mt-0.5">
          Przejdź do pełnego modułu skrzynki odbiorczej, pobierz maile i przejrzyj sugerowane aktualizacje.
        </p>
      </div>
      <button
        type="button"
        onClick={() => {
          onClose();
          onOpenInboxSync();
        }}
        className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold flex items-center justify-center gap-1.5 whitespace-nowrap cursor-pointer shadow-sm shadow-blue-500/20"
      >
        <Mail className="w-3.5 h-3.5" />
        <span>Otwórz Inbox Sync</span>
      </button>
    </div>

    {/* Status detection info */}
    <div className="p-4 rounded-xl bg-slate-50/80 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700/60 space-y-2 text-xs text-slate-600 dark:text-slate-300 shadow-2xs">
      <div className="font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
        <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
        Jak AI Gemini analizuje korespondencję?
      </div>
      <ul className="list-disc pl-5 space-y-1 text-[11px] text-slate-600 dark:text-slate-400">
        <li>
          <strong className="text-slate-700 dark:text-slate-300">Weryfikacja CV:</strong> Automatyczne potwierdzenia otrzymania aplikacji.
        </li>
        <li>
          <strong className="text-slate-700 dark:text-slate-300">Rozmowa HR / Techniczna:</strong> Zaproszenia na spotkania (wykrywanie dat, linków MS Teams, Zoom, Google Meet).
        </li>
        <li>
          <strong className="text-slate-700 dark:text-slate-300">Zadanie rekrutacyjne:</strong> E-maile z linkami do Codility, GitHub, testów technicznych.
        </li>
        <li>
          <strong className="text-slate-700 dark:text-slate-300">Oferta / Odrzucona:</strong> Ostateczne decyzje rekruterów z automatyczną zmianą statusu.
        </li>
      </ul>
    </div>
  </div>
);
