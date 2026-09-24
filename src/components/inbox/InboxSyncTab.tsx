import React from 'react';
import { EmailAnalysisResult } from '../../types';
import { InboxResultCard } from './InboxResultCard';
import { RefreshCw, Sparkles, Inbox, CheckSquare, Square, ArrowRight } from 'lucide-react';

interface InboxSyncTabProps {
  isScanning: boolean;
  scanStep: string;
  analyzedResults: EmailAnalysisResult[];
  selectedResultIds: string[];
  expandedEmailId: string | null;
  onStartScan: () => void;
  onToggleSelect: (id: string) => void;
  onToggleExpand: (id: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  onOpenConfirm: () => void;
}

export const InboxSyncTab: React.FC<InboxSyncTabProps> = ({
  isScanning,
  scanStep,
  analyzedResults,
  selectedResultIds,
  expandedEmailId,
  onStartScan,
  onToggleSelect,
  onToggleExpand,
  onSelectAll,
  onDeselectAll,
  onOpenConfirm,
}) => {
  const statusChangesCount = analyzedResults.filter((r) => r.isStatusChange).length;
  const newAppsCount = analyzedResults.filter((r) => r.isNewApplication).length;

  return (
    <div className="space-y-4 py-2">
      {/* Top action / scan hero */}
      <div className="bg-slate-50 dark:bg-slate-800/60 p-4 rounded-xl border border-slate-200 dark:border-slate-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-blue-500" />
            Wykrywanie statusów rekrutacji przez AI
          </h4>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Skanuje skrzynki w poszukiwaniu zaproszeń na wywiady, feedbacku, zadań i ofert.
          </p>
        </div>

        <button
          type="button"
          onClick={onStartScan}
          disabled={isScanning}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer shadow-xs shrink-0"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
          <span>{isScanning ? 'Skanowanie...' : 'Skanuj skrzynkę teraz'}</span>
        </button>
      </div>

      {/* Progress banner during scan */}
      {isScanning && (
        <div className="p-3.5 bg-blue-50 dark:bg-blue-950/40 border border-blue-200 dark:border-blue-800 rounded-xl flex items-center gap-3 text-xs text-blue-800 dark:text-blue-300">
          <RefreshCw className="w-4 h-4 animate-spin text-blue-600 dark:text-blue-400 shrink-0" />
          <span>{scanStep || 'Analizowanie...'}</span>
        </div>
      )}

      {/* Results Header and Selection Bar */}
      {analyzedResults.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
            <span>
              Znaleziono <strong className="text-slate-900 dark:text-slate-100">{analyzedResults.length}</strong> wiadomości
            </span>
            {statusChangesCount > 0 && (
              <span className="text-blue-600 dark:text-blue-400 font-medium">
                • {statusChangesCount} nowych statusów
              </span>
            )}
            {newAppsCount > 0 && (
              <span className="text-emerald-600 dark:text-emerald-400 font-medium">
                • {newAppsCount} nowych firm
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onSelectAll}
              className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 flex items-center gap-1 cursor-pointer"
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>Zaznacz wszystko</span>
            </button>
            <span className="text-slate-300 dark:text-slate-700">|</span>
            <button
              type="button"
              onClick={onDeselectAll}
              className="text-xs text-slate-500 hover:text-slate-800 dark:hover:text-slate-300 flex items-center gap-1 cursor-pointer"
            >
              <Square className="w-3.5 h-3.5" />
              <span>Odznacz</span>
            </button>
          </div>
        </div>
      )}

      {/* Cards list */}
      {analyzedResults.length > 0 ? (
        <div className="space-y-3 max-h-[420px] overflow-y-auto pr-1">
          {analyzedResults.map((item) => (
            <InboxResultCard
              key={item.emailId}
              item={item}
              isSelected={selectedResultIds.includes(item.emailId)}
              isExpanded={expandedEmailId === item.emailId}
              onToggleSelect={onToggleSelect}
              onToggleExpand={onToggleExpand}
            />
          ))}
        </div>
      ) : (
        !isScanning && (
          <div className="text-center py-12 px-4 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
            <Inbox className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Brak przeanalizowanych wiadomości w tej sesji
            </p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
              Kliknij &ldquo;Skanuj skrzynkę teraz&rdquo;, aby pobrać najnowsze wiadomości rekrutacyjne lub przejdź do zakładki &ldquo;Wklej e-mail&rdquo;.
            </p>
          </div>
        )
      )}

      {/* Apply updates button */}
      {analyzedResults.length > 0 && (
        <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-500">
            Zaznaczono <strong className="text-slate-900 dark:text-slate-100">{selectedResultIds.length}</strong> pozycji
          </span>
          <button
            type="button"
            onClick={onOpenConfirm}
            disabled={selectedResultIds.length === 0}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs"
          >
            <ArrowRight className="w-4 h-4" />
            <span>Zastosuj zaznaczone zmiany w trackerze</span>
          </button>
        </div>
      )}
    </div>
  );
};
