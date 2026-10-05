import React from 'react';
import { Plus, Sparkles, Building2, MapPin, ExternalLink, Calendar } from 'lucide-react';
import { CalendarDay, CalendarEvent, POLISH_DAY_NAMES } from '../../utils/calendarUtils';
import { STATUS_CONFIG, getPortalBadgeStyle } from '../../utils/statusConfig';

interface CalendarWeekGridProps {
  days: CalendarDay[];
  selectedDateStr: string | null;
  onSelectDay: (day: CalendarDay) => void;
  onSelectEvent: (event: CalendarEvent) => void;
  onAddNewForDate: (dateStr: string) => void;
}

export const CalendarWeekGrid: React.FC<CalendarWeekGridProps> = ({
  days,
  selectedDateStr,
  onSelectDay,
  onSelectEvent,
  onAddNewForDate,
}) => {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
      {/* 7 Columns for the week */}
      <div className="grid grid-cols-1 md:grid-cols-7 divide-y md:divide-y-0 md:divide-x divide-slate-200 dark:divide-slate-800 min-h-[500px]">
        {days.map((day, index) => {
          const isSelected = selectedDateStr === day.dateString;
          const dayName = POLISH_DAY_NAMES[index] || '';

          return (
            <div
              key={day.dateString}
              onClick={() => onSelectDay(day)}
              className={`flex flex-col transition-colors cursor-pointer ${
                day.isToday
                  ? 'bg-blue-50/20 dark:bg-blue-950/10'
                  : day.isWeekend
                  ? 'bg-slate-50/40 dark:bg-slate-900/30'
                  : 'bg-white dark:bg-slate-900'
              } ${isSelected ? 'ring-2 ring-inset ring-blue-500' : ''}`}
            >
              {/* Day Header */}
              <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
                <div>
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 truncate">
                    {dayName}
                  </div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span
                      className={`text-base font-bold inline-flex items-center justify-center w-7 h-7 rounded-full ${
                        day.isToday
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-800 dark:text-slate-100'
                      }`}
                    >
                      {day.dayNumber}
                    </span>
                    <span className="text-xs text-slate-400">
                      {day.events.length > 0 && `(${day.events.length})`}
                    </span>
                  </div>
                </div>

                {/* Add button */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddNewForDate(day.dateString);
                  }}
                  title={`Dodaj aplikację na dzień ${day.dateString}`}
                  className="p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>

              {/* Day Events List */}
              <div className="p-2 flex-1 space-y-2 overflow-y-auto max-h-[550px]">
                {day.events.length === 0 ? (
                  <div className="h-full min-h-[80px] flex flex-col items-center justify-center text-center p-3 text-slate-400 dark:text-slate-600">
                    <span className="text-[11px]">Brak zdarzeń</span>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onAddNewForDate(day.dateString);
                      }}
                      className="text-[11px] text-blue-500 hover:text-blue-600 dark:text-blue-400 font-medium mt-1 inline-flex items-center gap-0.5 cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Dodaj</span>
                    </button>
                  </div>
                ) : (
                  day.events.map((ev) => {
                    const statusMeta = STATUS_CONFIG[ev.status] || STATUS_CONFIG['Wysłana'];
                    const portalStyle = getPortalBadgeStyle(ev.application.portal);
                    const isInterview = ev.type === 'interview' || ev.type === 'task';

                    return (
                      <div
                        key={ev.id}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectEvent(ev);
                        }}
                        className={`p-2.5 rounded-xl border transition-all text-left group hover:shadow-xs cursor-pointer ${
                          isInterview
                            ? 'bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800/60'
                            : 'bg-white dark:bg-slate-800/80 border-slate-200/80 dark:border-slate-700/80 hover:border-blue-400 dark:hover:border-blue-500'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-1 mb-1">
                          <span
                            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border flex items-center gap-1 ${
                              statusMeta.badgeClass
                            }`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${statusMeta.dot}`} />
                            <span className="truncate max-w-[90px]">{ev.status}</span>
                          </span>

                          {ev.application.portal && (
                            <span
                              className={`text-[9px] px-1.5 py-0.2 rounded border font-medium truncate max-w-[65px] ${portalStyle}`}
                            >
                              {ev.application.portal}
                            </span>
                          )}
                        </div>

                        <div className="font-semibold text-xs text-slate-900 dark:text-white truncate">
                          {ev.application.role}
                        </div>
                        <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate flex items-center gap-1 mt-0.5">
                          <Building2 className="w-3 h-3 shrink-0" />
                          <span className="truncate">{ev.application.company}</span>
                        </div>

                        {ev.notes && (
                          <div className="mt-1.5 text-[10px] text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/60 p-1.5 rounded-md border border-slate-100 dark:border-slate-800/80 line-clamp-2">
                            {ev.notes}
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
