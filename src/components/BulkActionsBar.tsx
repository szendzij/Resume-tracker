import React, { useState } from 'react';
import { JobStatus, JobApplication } from '../types';
import { ALL_STATUSES, STATUS_CONFIG } from '../utils/statusConfig';
import {
  Trash2,
  Calendar,
  CheckCircle,
  X,
  FileSpreadsheet,
  CheckSquare,
  Square,
  ChevronDown,
  Layers,
} from 'lucide-react';

interface BulkActionsBarProps {
  selectedIds: string[];
  totalVisible: number;
  allVisibleSelected: boolean;
  onSelectAllVisible: () => void;
  onDeselectAll: () => void;
  onBulkStatusChange: (status: JobStatus) => void;
  onOpenBulkDateModal: () => void;
  onOpenBulkDeleteModal: () => void;
  onBulkExportCSV: () => void;
}

export const BulkActionsBar: React.FC<BulkActionsBarProps> = ({
  selectedIds,
  totalVisible,
  allVisibleSelected,
  onSelectAllVisible,
  onDeselectAll,
  onBulkStatusChange,
  onOpenBulkDateModal,
  onOpenBulkDeleteModal,
  onBulkExportCSV,
}) => {
  const [isStatusMenuOpen, setIsStatusMenuOpen] = useState(false);

  if (selectedIds.length === 0) return null;

  return (
    <div
      id="bulk-actions-dock"
      className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 w-[95%] max-w-4xl animate-in slide-in-from-bottom-5 fade-in duration-200"
    >
      <div className="bg-slate-900/95 backdrop-blur-md text-white border border-slate-700/80 rounded-2xl p-3 sm:px-5 sm:py-3.5 shadow-2xl flex flex-wrap items-center justify-between gap-3">
        {/* Left Section: Selection Count & Select/Deselect all */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={allVisibleSelected ? onDeselectAll : onSelectAllVisible}
              className="p-1 rounded-md text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
              title={allVisibleSelected ? 'Odznacz wszystkie' : 'Zaznacz wszystkie widoczne'}
            >
              {allVisibleSelected ? (
                <CheckSquare className="w-5 h-5 text-blue-400" />
              ) : (
                <Square className="w-5 h-5 text-slate-400" />
              )}
            </button>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-white">
                <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                <span>Zaznaczono:</span>
                <span className="px-1.5 py-0.5 bg-blue-500/30 text-blue-300 border border-blue-400/30 rounded-md font-mono font-bold">
                  {selectedIds.length}
                </span>
              </div>
              <span className="text-[11px] text-slate-400">
                z {totalVisible} widocznych ofert
              </span>
            </div>
          </div>

          <button
            onClick={allVisibleSelected ? onDeselectAll : onSelectAllVisible}
            className="hidden md:inline-flex text-xs text-slate-300 hover:text-white underline underline-offset-2 ml-1 cursor-pointer"
          >
            {allVisibleSelected ? 'Odznacz wszystkie' : `Zaznacz wszystkie (${totalVisible})`}
          </button>
        </div>

        {/* Right Section: Action buttons */}
        <div className="flex items-center flex-wrap gap-2">
          {/* Status Change Dropdown */}
          <div className="relative">
            <button
              id="bulk-status-trigger-btn"
              type="button"
              onClick={() => setIsStatusMenuOpen(!isStatusMenuOpen)}
              className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-medium flex items-center gap-1.5 border border-slate-700 transition-colors cursor-pointer"
            >
              <CheckCircle className="w-4 h-4 text-emerald-400" />
              <span>Zmień status</span>
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            </button>

            {isStatusMenuOpen && (
              <>
                <div
                  className="fixed inset-0 z-40"
                  onClick={() => setIsStatusMenuOpen(false)}
                />
                <div className="absolute right-0 bottom-full mb-2 z-50 w-52 bg-white rounded-xl shadow-xl border border-slate-200 py-1.5 text-slate-800 text-xs overflow-hidden animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400 border-b border-slate-100">
                    Wybierz nowy status:
                  </div>
                  {ALL_STATUSES.map((status) => {
                    const meta = STATUS_CONFIG[status];
                    return (
                      <button
                        key={status}
                        onClick={() => {
                          onBulkStatusChange(status);
                          setIsStatusMenuOpen(false);
                        }}
                        className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2 transition-colors cursor-pointer"
                      >
                        <span className={`w-2 h-2 rounded-full ${meta.dot}`} />
                        <span className="font-medium text-slate-800">{status}</span>
                      </button>
                    );
                  })}
                </div>
              </>
            )}
          </div>

          {/* Change Date Button */}
          <button
            id="bulk-date-trigger-btn"
            type="button"
            onClick={onOpenBulkDateModal}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-medium flex items-center gap-1.5 border border-slate-700 transition-colors cursor-pointer"
            title="Zmień datę wysłania CV dla zaznaczonych"
          >
            <Calendar className="w-4 h-4 text-blue-400" />
            <span>Zmień datę</span>
          </button>

          {/* Export Selected to CSV */}
          <button
            id="bulk-export-trigger-btn"
            type="button"
            onClick={onBulkExportCSV}
            className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-medium flex items-center gap-1.5 border border-slate-700 transition-colors cursor-pointer"
            title="Eksportuj zaznaczone oferty do pliku CSV"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">CSV</span>
          </button>

          {/* Bulk Delete Button */}
          <button
            id="bulk-delete-trigger-btn"
            type="button"
            onClick={onOpenBulkDeleteModal}
            className="px-3 py-2 bg-rose-600/90 hover:bg-rose-600 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-rose-500/50 transition-colors cursor-pointer"
            title="Usuń trwale wszystkie zaznaczone aplikacje"
          >
            <Trash2 className="w-4 h-4" />
            <span>Usuń ({selectedIds.length})</span>
          </button>

          {/* Deselect / Cancel */}
          <button
            id="bulk-deselect-btn"
            type="button"
            onClick={onDeselectAll}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors ml-1"
            title="Wyczyść zaznaczenie"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
