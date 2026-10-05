import React from 'react';
import {
  X,
  Plus,
  Calendar as CalendarIcon,
  Building2,
  MapPin,
  DollarSign,
  ExternalLink,
  Edit2,
  Sparkles,
  Clock,
} from 'lucide-react';
import { CalendarEvent } from '../../utils/calendarUtils';
import {
  STATUS_CONFIG,
  formatPolishDate,
  getPortalBadgeStyle,
} from '../../utils/statusConfig';

interface CalendarDayDetailsProps {
  selectedDateStr: string;
  events: CalendarEvent[];
  onClose: () => void;
  onSelectEvent: (event: CalendarEvent) => void;
  onAddNew: (dateStr: string) => void;
}

export const CalendarDayDetails: React.FC<CalendarDayDetailsProps> = ({
  selectedDateStr,
  events,
  onClose,
  onSelectEvent,
  onAddNew,
}) => {
  return (
    <div
      data-testid="calendar-day-details"
      className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs mb-6 space-y-4 animate-in fade-in slide-in-from-top-2 duration-200"
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-100 dark:bg-blue-950/80 text-blue-600 dark:text-blue-400 flex items-center justify-center">
            <CalendarIcon className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
              Szczegóły dnia: {formatPolishDate(selectedDateStr)}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              {events.length === 0
                ? 'Brak zaplanowanych aktywności'
                : `${events.length} ${events.length === 1 ? 'aktywność' : 'aktywności'}`}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => onAddNew(selectedDateStr)}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-1 shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Dodaj w tym dniu</span>
          </button>
          <button
            type="button"
            onClick={onClose}
            title="Zamknij panel dnia"
            className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Events List */}
      {events.length === 0 ? (
        <div className="py-6 text-center text-slate-400 dark:text-slate-600">
          <p className="text-xs">Brak aplikacji lub rozmów zarejestrowanych w tym dniu.</p>
          <button
            type="button"
            onClick={() => onAddNew(selectedDateStr)}
            className="mt-2 text-xs text-blue-600 dark:text-blue-400 hover:underline font-medium inline-flex items-center gap-1 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Kliknij tutaj, aby dodać aplikację z tą datą</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {events.map((ev) => {
            const statusMeta = STATUS_CONFIG[ev.status] || STATUS_CONFIG['Wysłana'];
            const portalStyle = getPortalBadgeStyle(ev.application.portal);
            const isInterview = ev.type === 'interview' || ev.type === 'task';

            return (
              <div
                key={ev.id}
                onClick={() => onSelectEvent(ev)}
                className={`p-3.5 rounded-xl border transition-all text-left group hover:shadow-xs cursor-pointer ${
                  isInterview
                    ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/60'
                    : 'bg-slate-50/60 dark:bg-slate-800/40 border-slate-200/80 dark:border-slate-700/80 hover:border-blue-400 dark:hover:border-blue-500'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-1.5">
                  <span
                    className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border flex items-center gap-1.5 ${
                      statusMeta.badgeClass
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${statusMeta.dot}`} />
                    <span>{ev.status}</span>
                  </span>

                  <div className="flex items-center gap-1">
                    {ev.application.portal && (
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded border font-medium ${portalStyle}`}
                      >
                        {ev.application.portal}
                      </span>
                    )}
                    {ev.application.url && (
                      <a
                        href={ev.application.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        title="Otwórz ofertę"
                        className="p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-md transition-colors cursor-pointer"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    )}
                  </div>
                </div>

                <div className="font-bold text-sm text-slate-900 dark:text-white">
                  {ev.application.role}
                </div>

                <div className="text-xs text-slate-600 dark:text-slate-400 flex items-center gap-1 mt-0.5">
                  <Building2 className="w-3.5 h-3.5 text-slate-400" />
                  <span className="font-medium">{ev.application.company}</span>
                </div>

                {/* Additional metadata */}
                <div className="flex flex-wrap items-center gap-2.5 text-[11px] text-slate-500 dark:text-slate-400 mt-2">
                  {ev.application.location && (
                    <span className="flex items-center gap-0.5">
                      <MapPin className="w-3 h-3 text-slate-400" />
                      <span>{ev.application.location}</span>
                    </span>
                  )}
                  {ev.application.salary && (
                    <span className="flex items-center gap-0.5 text-emerald-600 dark:text-emerald-400 font-medium">
                      <DollarSign className="w-3 h-3" />
                      <span>{ev.application.salary}</span>
                    </span>
                  )}
                </div>

                {ev.notes && (
                  <div className="mt-2 text-xs text-slate-600 dark:text-slate-300 bg-white dark:bg-slate-900/80 p-2 rounded-lg border border-slate-200/80 dark:border-slate-800 flex items-start gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" />
                    <span>{ev.notes}</span>
                  </div>
                )}

                <div className="mt-3 pt-2 border-t border-slate-200/60 dark:border-slate-700/60 flex items-center justify-end">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectEvent(ev);
                    }}
                    className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 font-semibold inline-flex items-center gap-1 cursor-pointer"
                  >
                    <Edit2 className="w-3 h-3" />
                    <span>Edytuj aplikację</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
