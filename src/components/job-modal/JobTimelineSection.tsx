import React from 'react';
import { Clock, Plus, Calendar, Trash2 } from 'lucide-react';
import { ApplicationTimelineEntry, JobStatus } from '../../types';
import { ALL_STATUSES } from '../../utils/statusConfig';

export interface JobTimelineSectionProps {
  timeline: ApplicationTimelineEntry[];
  onAddEntry: () => void;
  onUpdateEntry: (id: string, field: 'status' | 'date' | 'notes', value: string) => void;
  onRemoveEntry: (id: string) => void;
}

export const JobTimelineSection: React.FC<JobTimelineSectionProps> = ({
  timeline,
  onAddEntry,
  onUpdateEntry,
  onRemoveEntry,
}) => {
  return (
    <div className="bg-slate-50 dark:bg-slate-800/50 p-4 rounded-xl border border-slate-200 dark:border-slate-700/80 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100">
            Historia etapów i daty statusów
          </h4>
        </div>
        <button
          type="button"
          onClick={onAddEntry}
          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-lg bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 hover:bg-blue-100 dark:hover:bg-blue-900/60 border border-blue-200 dark:border-blue-800/80 transition-colors cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Dodaj etap</span>
        </button>
      </div>

      <p className="text-[11px] text-slate-500 dark:text-slate-400">
        Oznaczaj dokładne daty, kiedy odbyła się rozmowa z HR, rozmowa techniczna lub nastąpiła zmiana etapu.
      </p>

      {timeline.length === 0 ? (
        <div className="text-center py-3 text-xs text-slate-400 dark:text-slate-500">
          Brak zarejestrowanych etapów. Kliknij &quot;Dodaj etap&quot;, aby dodać datę statusu.
        </div>
      ) : (
        <div className="space-y-2">
          {timeline.map((entry, idx) => (
            <div
              key={entry.id || idx}
              className="flex flex-col sm:flex-row sm:items-center gap-2 p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-750 text-xs shadow-2xs"
            >
              {/* Status selector for this entry */}
              <div className="w-full sm:w-44 shrink-0">
                <select
                  value={entry.status}
                  onChange={(e) => onUpdateEntry(entry.id, 'status', e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-xs font-medium text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                >
                  {ALL_STATUSES.map((st) => (
                    <option
                      key={st}
                      value={st}
                      className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-normal"
                    >
                      {st}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date Picker */}
              <div className="flex items-center gap-1.5 shrink-0">
                <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                <input
                  type="date"
                  value={entry.date}
                  onChange={(e) => onUpdateEntry(entry.id, 'date', e.target.value)}
                  className="px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-xs font-mono text-slate-800 dark:text-slate-200 dark:[color-scheme:dark] focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Optional Notes */}
              <div className="flex-1 min-w-0">
                <input
                  type="text"
                  value={entry.notes || ''}
                  onChange={(e) => onUpdateEntry(entry.id, 'notes', e.target.value)}
                  placeholder="Notatka do etapu (np. rozmowa z rekruterem)..."
                  className="w-full px-2.5 py-1.5 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Remove entry button */}
              <button
                type="button"
                onClick={() => onRemoveEntry(entry.id)}
                disabled={timeline.length <= 1}
                title={timeline.length <= 1 ? 'Wymagany co najmniej jeden etap' : 'Usuń ten etap'}
                className="p-1.5 text-slate-400 hover:text-rose-600 dark:text-slate-500 dark:hover:text-rose-400 disabled:opacity-30 disabled:cursor-not-allowed rounded cursor-pointer shrink-0 self-end sm:self-center transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
