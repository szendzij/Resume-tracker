import React, { useMemo } from 'react';
import {
  Calendar as CalendarIcon,
  Sparkles,
  Building2,
  MapPin,
  DollarSign,
  ExternalLink,
  Edit2,
  Plus,
  Clock,
} from 'lucide-react';
import { CalendarEvent } from '../../utils/calendarUtils';
import {
  STATUS_CONFIG,
  formatPolishDate,
  getPortalBadgeStyle,
  getRelativeDays,
} from '../../utils/statusConfig';

interface CalendarAgendaViewProps {
  events: CalendarEvent[];
  onSelectEvent: (event: CalendarEvent) => void;
  onAddNew: () => void;
}

export const CalendarAgendaView: React.FC<CalendarAgendaViewProps> = ({
  events,
  onSelectEvent,
  onAddNew,
}) => {
  // Group events by date string
  const groupedEvents = useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const event of events) {
      const list = map.get(event.date) || [];
      list.push(event);
      map.set(event.date, list);
    }

    // Sort dates chronologically
    const sortedDates = Array.from(map.keys()).sort((a, b) => b.localeCompare(a));
    return sortedDates.map((date) => ({
      date,
      items: map.get(date) || [],
    }));
  }, [events]);

  if (events.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center shadow-xs">
        <CalendarIcon className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
        <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">
          Brak zdarzeń do wyświetlenia
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
          Nie znaleziono zdarzeń w wybranym filtrze. Dodaj nową aplikację lub zmień filtr.
        </p>
        <button
          type="button"
          onClick={onAddNew}
          className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold inline-flex items-center gap-1.5 shadow-sm transition-all cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Dodaj aplikację</span>
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {groupedEvents.map((group) => {
        const relativeLabel = getRelativeDays(group.date);

        return (
          <div
            key={group.date}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs"
          >
            {/* Group Header */}
            <div className="flex items-center justify-between gap-3 pb-3 mb-3 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-xs">
                  <CalendarIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900 dark:text-white">
                    {formatPolishDate(group.date)}
                  </h3>
                  <span className="text-xs font-medium text-slate-400 dark:text-slate-500">
                    {relativeLabel}
                  </span>
                </div>
              </div>

              <span className="text-xs font-medium text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full">
                {group.items.length}{' '}
                {group.items.length === 1 ? 'zdarzenie' : 'zdarzeń'}
              </span>
            </div>

            {/* Event Items */}
            <div className="space-y-2.5">
              {group.items.map((ev) => {
                const statusMeta = STATUS_CONFIG[ev.status] || STATUS_CONFIG['Wysłana'];
                const portalStyle = getPortalBadgeStyle(ev.application.portal);
                const isInterview = ev.type === 'interview' || ev.type === 'task';

                return (
                  <div
                    key={ev.id}
                    onClick={() => onSelectEvent(ev)}
                    className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 group hover:shadow-xs cursor-pointer ${
                      isInterview
                        ? 'bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 dark:border-amber-800/60'
                        : 'bg-slate-50/60 dark:bg-slate-800/50 border-slate-200/70 dark:border-slate-700/70 hover:border-blue-400 dark:hover:border-blue-500'
                    }`}
                  >
                    {/* Left: Info */}
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        {/* Status Badge */}
                        <span
                          className={`text-xs font-semibold px-2.5 py-0.5 rounded-full border flex items-center gap-1.5 ${
                            statusMeta.badgeClass
                          }`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${statusMeta.dot}`} />
                          <span>{ev.status}</span>
                        </span>

                        {/* Portal badge */}
                        {ev.application.portal && (
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded border font-medium ${portalStyle}`}
                          >
                            {ev.application.portal}
                          </span>
                        )}

                        {isInterview && (
                          <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-amber-100 dark:bg-amber-900/60 text-amber-800 dark:text-amber-300 flex items-center gap-1">
                            <Sparkles className="w-3 h-3" />
                            <span>Etap rekrutacji</span>
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 pt-0.5">
                        <span className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                          {ev.application.role}
                        </span>
                        <span className="text-slate-400">w</span>
                        <span className="font-semibold text-sm text-slate-700 dark:text-slate-300 flex items-center gap-1">
                          <Building2 className="w-3.5 h-3.5 text-slate-400" />
                          <span>{ev.application.company}</span>
                        </span>
                      </div>

                      {/* Location / Salary / Notes */}
                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 dark:text-slate-400 pt-0.5">
                        {ev.application.location && (
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            <span>{ev.application.location}</span>
                          </span>
                        )}
                        {ev.application.salary && (
                          <span className="flex items-center gap-1 text-emerald-600 dark:text-emerald-400 font-medium">
                            <DollarSign className="w-3 h-3" />
                            <span>{ev.application.salary}</span>
                          </span>
                        )}
                        {ev.notes && (
                          <span className="flex items-center gap-1 italic text-slate-600 dark:text-slate-300">
                            <Clock className="w-3 h-3 text-amber-500" />
                            <span>{ev.notes}</span>
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Right: Actions */}
                    <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-center">
                      {ev.application.url && (
                        <a
                          href={ev.application.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          title="Otwórz ogłoszenie"
                          className="p-2 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-white dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectEvent(ev);
                        }}
                        className="px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer shadow-2xs"
                      >
                        <Edit2 className="w-3.5 h-3.5 text-blue-500" />
                        <span>Szczegóły / Edycja</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};
