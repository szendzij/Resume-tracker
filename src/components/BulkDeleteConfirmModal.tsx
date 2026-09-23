import React from 'react';
import { AlertTriangle, X, Trash2 } from 'lucide-react';
import { JobApplication } from '../types';

interface BulkDeleteConfirmModalProps {
  isOpen: boolean;
  selectedCount: number;
  selectedApps: JobApplication[];
  onClose: () => void;
  onConfirm: () => void;
}

export const BulkDeleteConfirmModal: React.FC<BulkDeleteConfirmModalProps> = ({
  isOpen,
  selectedCount,
  selectedApps,
  onClose,
  onConfirm,
}) => {
  if (!isOpen) return null;

  return (
    <div
      id="bulk-delete-modal-backdrop"
      className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-150"
    >
      <div
        id="bulk-delete-modal-container"
        className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-md shadow-xl overflow-hidden p-6 animate-in zoom-in-95 duration-150"
      >
        <div className="flex items-start gap-4">
          <div className="p-3 bg-rose-100 dark:bg-rose-950/60 text-rose-600 dark:text-rose-400 rounded-xl shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900 dark:text-slate-100">
                Usuń {selectedCount} zaznaczonych ofert
              </h3>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-300 mt-2">
              Czy na pewno chcesz trwale usunąć <strong className="text-slate-900 dark:text-white">{selectedCount}</strong> wybranych aplikacji o pracę?
            </p>

            {/* List preview */}
            <div className="mt-3 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-xl p-3 max-h-32 overflow-y-auto space-y-1 text-xs">
              {selectedApps.map((app) => (
                <div key={app.id} className="text-slate-700 dark:text-slate-300 truncate">
                  • <span className="font-semibold text-slate-900 dark:text-slate-100">{app.company}</span> — {app.role}
                </div>
              ))}
            </div>

            <p className="text-[11px] text-rose-500 dark:text-rose-400 font-medium mt-2">
              Tej operacji nie można cofnąć!
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 mt-6 pt-4 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 cursor-pointer"
          >
            Anuluj
          </button>
          <button
            id="confirm-bulk-delete-btn"
            type="button"
            onClick={() => {
              onConfirm();
              onClose();
            }}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            <span>Usuń trwale ({selectedCount})</span>
          </button>
        </div>
      </div>
    </div>
  );
};
