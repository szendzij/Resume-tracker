import React, { useState } from 'react';
import { Calendar, X, Clock, Check } from 'lucide-react';
import { JobApplication } from '../types';

interface BulkDateModalProps {
  isOpen: boolean;
  selectedCount: number;
  selectedApps: JobApplication[];
  onClose: () => void;
  onConfirm: (newDate: string) => void;
}

export const BulkDateModal: React.FC<BulkDateModalProps> = ({
  isOpen,
  selectedCount,
  selectedApps,
  onClose,
  onConfirm,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(todayStr);

  if (!isOpen) return null;

  const setOffsetDays = (days: number) => {
    const d = new Date();
    d.setDate(d.getDate() - days);
    setSelectedDate(d.toISOString().split('T')[0]);
  };

  const handleApply = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDate) return;
    onConfirm(selectedDate);
    onClose();
  };

  return (
    <div
      id="bulk-date-modal-backdrop"
      className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div
        id="bulk-date-modal-container"
        className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-blue-100 text-blue-700 rounded-xl">
              <Calendar className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Masowa zmiana daty wysłania</h3>
              <p className="text-xs text-slate-500">Zaktualizuj datę dla {selectedCount} zaznaczonych ofert</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleApply} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-2">
              Szybkie ustawienie daty:
            </label>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setOffsetDays(0)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors cursor-pointer ${
                  selectedDate === todayStr
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                Dzisiaj
              </button>
              <button
                type="button"
                onClick={() => setOffsetDays(1)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium border bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Wczoraj
              </button>
              <button
                type="button"
                onClick={() => setOffsetDays(3)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium border bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                3 dni temu
              </button>
              <button
                type="button"
                onClick={() => setOffsetDays(7)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium border bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                Tydzień temu
              </button>
              <button
                type="button"
                onClick={() => setOffsetDays(14)}
                className="px-3 py-1.5 rounded-lg text-xs font-medium border bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100 transition-colors cursor-pointer"
              >
                2 tyg. temu
              </button>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Wybierz dokładną datę:
            </label>
            <div className="relative">
              <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                id="bulk-date-input"
                type="date"
                required
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-lg text-sm text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
              />
            </div>
          </div>

          {/* Preview of selected apps */}
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200/80 text-xs">
            <span className="font-semibold text-slate-700 block mb-1.5">
              Przykłady modyfikowanych ofert:
            </span>
            <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
              {selectedApps.slice(0, 5).map((app) => (
                <span
                  key={app.id}
                  className="px-2 py-0.5 bg-white border border-slate-200 rounded text-[11px] text-slate-600 truncate max-w-[200px]"
                >
                  {app.company} – {app.role}
                </span>
              ))}
              {selectedApps.length > 5 && (
                <span className="px-2 py-0.5 bg-slate-200/60 rounded text-[11px] text-slate-500 font-medium">
                  +{selectedApps.length - 5} kolejnych
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
            >
              Anuluj
            </button>
            <button
              id="confirm-bulk-date-btn"
              type="submit"
              className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Zastosuj datę dla {selectedCount} ofert</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
