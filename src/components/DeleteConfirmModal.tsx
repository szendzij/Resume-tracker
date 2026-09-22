import React from 'react';
import { JobApplication } from '../types';
import { AlertTriangle, X } from 'lucide-react';

interface DeleteConfirmModalProps {
  isOpen: boolean;
  application: JobApplication | null;
  onClose: () => void;
  onConfirm: () => void;
}

export const DeleteConfirmModal: React.FC<DeleteConfirmModalProps> = ({
  isOpen,
  application,
  onClose,
  onConfirm,
}) => {
  if (!isOpen || !application) return null;

  return (
    <div
      id="delete-modal-backdrop"
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div
        id="delete-modal-container"
        className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-xl overflow-hidden p-6"
      >
        <div className="flex items-start gap-4">
          <div className="p-3 bg-rose-100 text-rose-600 rounded-xl shrink-0">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div className="flex-1">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-semibold text-slate-900">Usuń aplikację</h3>
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-xs text-slate-600 mt-2">
              Czy na pewno chcesz usunąć aplikację na stanowisko{' '}
              <strong className="text-slate-900">{application.role}</strong> w firmie{' '}
              <strong className="text-slate-900">{application.company}</strong>?
            </p>
            <p className="text-[11px] text-slate-400 mt-1">Tej operacji nie można cofnąć.</p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 mt-6 pt-4 border-t border-slate-100">
          <button
            id="cancel-delete-btn"
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 cursor-pointer"
          >
            Anuluj
          </button>
          <button
            id="confirm-delete-btn"
            type="button"
            onClick={onConfirm}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-medium shadow-xs transition-colors cursor-pointer"
          >
            Usuń trwale
          </button>
        </div>
      </div>
    </div>
  );
};
