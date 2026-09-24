import React, { useState } from 'react';
import { Mail, CheckCircle2, Copy, Check, ShieldCheck, ExternalLink } from 'lucide-react';

interface InboxAccountsTabProps {
  outlookConnected: boolean;
  gmailConnected: boolean;
  onConnect: (provider: 'outlook' | 'gmail') => void;
  onDisconnectOutlook: () => void;
  onDisconnectGmail: () => void;
}

export const InboxAccountsTab: React.FC<InboxAccountsTabProps> = ({
  outlookConnected,
  gmailConnected,
  onConnect,
  onDisconnectOutlook,
  onDisconnectGmail,
}) => {
  const [copiedUrl, setCopiedUrl] = useState(false);

  const callbackUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/auth/callback`
      : 'https://ais-dev-spni24eqjixuvpqi3qhp4s-865141778207.europe-west2.run.app/auth/callback';

  const copyCallbackUrl = () => {
    navigator.clipboard.writeText(callbackUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2000);
  };

  return (
    <div className="space-y-6 py-2">
      <div className="bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900 rounded-xl p-4 text-xs text-blue-800 dark:text-blue-300 flex items-start gap-3">
        <ShieldCheck className="w-5 h-5 text-blue-600 dark:text-blue-400 shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-sm">Prywatność i bezpieczeństwo danych</p>
          <p className="text-blue-700/90 dark:text-blue-300/90 leading-relaxed">
            Aplikacja pobiera wyłącznie nagłówki i fragmenty wiadomości o tematyce rekrutacyjnej.
            Tokeny OAuth zapisywane są tylko w pamięci podręcznej Twojej przeglądarki.
          </p>
        </div>
      </div>

      {/* Account cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Microsoft Outlook */}
        <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-5 bg-white dark:bg-slate-900 flex flex-col justify-between shadow-2xs">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-sky-100 dark:bg-sky-950 text-sky-600 dark:text-sky-400 flex items-center justify-center font-bold text-sm">
                  MS
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Microsoft Outlook
                  </h4>
                  <p className="text-xs text-slate-500">Office 365 / Hotmail</p>
                </div>
              </div>
              {outlookConnected ? (
                <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Połączono
                </span>
              ) : (
                <span className="text-[11px] font-medium text-slate-400">Niepołączone</span>
              )}
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-4">
              Pobieraj zaproszenia na rozmowy, zadania techniczne i odpowiedzi rekruterów z konta Microsoft.
            </p>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            {outlookConnected ? (
              <button
                type="button"
                onClick={onDisconnectOutlook}
                className="text-xs text-red-600 hover:text-red-700 font-medium cursor-pointer"
              >
                Rozłącz konto
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onConnect('outlook')}
                className="w-full py-2 px-3 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                Połącz z Outlook
              </button>
            )}
          </div>
        </div>

        {/* Google Gmail */}
        <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-5 bg-white dark:bg-slate-900 flex flex-col justify-between shadow-2xs">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-lg bg-red-100 dark:bg-red-950 text-red-600 dark:text-red-400 flex items-center justify-center font-bold text-sm">
                  G
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
                    Google Gmail
                  </h4>
                  <p className="text-xs text-slate-500">Google Workspace / Gmail</p>
                </div>
              </div>
              {gmailConnected ? (
                <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950 px-2 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Połączono
                </span>
              ) : (
                <span className="text-[11px] font-medium text-slate-400">Niepołączone</span>
              )}
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 mb-4">
              Automatycznie weryfikuj korespondencję rekrutacyjną i oferty pracy przesłane na Twojego Gmaila.
            </p>
          </div>

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
            {gmailConnected ? (
              <button
                type="button"
                onClick={onDisconnectGmail}
                className="text-xs text-red-600 hover:text-red-700 font-medium cursor-pointer"
              >
                Rozłącz konto
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onConnect('gmail')}
                className="w-full py-2 px-3 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                Połącz z Gmail
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Redirect URI helper box */}
      <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700 text-xs">
        <h5 className="font-semibold text-slate-800 dark:text-slate-200 mb-1">
          OAuth Redirect URI (dla konfiguracji w Azure / Google Cloud)
        </h5>
        <div className="flex items-center gap-2 mt-2">
          <input
            type="text"
            readOnly
            value={callbackUrl}
            className="flex-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-600 rounded px-2.5 py-1.5 font-mono text-[11px] text-slate-700 dark:text-slate-300"
          />
          <button
            type="button"
            onClick={copyCallbackUrl}
            className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 rounded text-xs font-semibold flex items-center gap-1 cursor-pointer"
          >
            {copiedUrl ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedUrl ? 'Skopiowano!' : 'Kopiuj'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
