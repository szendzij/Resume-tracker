import React from 'react';
import { Plus, Sparkles, Building2 } from 'lucide-react';
import { CalendarDay, CalendarEvent, POLISH_DAY_SHORT } from '../../utils/calendarUtils';
import { STATUS_CONFIG } from '../../utils/statusConfig';

interface CalendarMonthGridProps {
  days: CalendarDay[];
  selectedDateStr: string | null;
  onSelectDay: (day: CalendarDay) => void;
  onSelectEvent: (event: CalendarEvent) => void;
  onAddNewForDate: (dateStr: string) => void;
}

export const CalendarMonthGrid: React.FC<CalendarMonthGridProps> = ({
  days,
  selectedDateStr,
  onSelectDay,
  onSelectEvent,
  onAddNewForDate,
}) => {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
      {/* Day of Week Headers */}
      <div className="grid grid-cols-7 border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/70 text-center py-2.5">
        {POLISH_DAY_SHORT.map((name, index) => {
          const isWeekend = index === 5 || index === 6;
          return (
            <div
              key={name}
              className={`text-xs font-semibold ${
                isWeekend
                  ? 'text-slate-400 dark:text-slate-500'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              {name}
            </div>
          );
        })}
      </div>

      {/* Calendar Days Grid */}
      <div className="grid grid-cols-7 auto-rows-fr divide-x divide-y divide-slate-100 dark:divide-slate-800/80 border-b border-slate-100 dark:border-slate-800">
        {days.map((day) => {
          const isSelected = selectedDateStr === day.dateString;
          const maxVisibleEvents = 3;
          const visibleEvents = day.events.slice(0, maxVisibleEvents);
          const hiddenCount = day.events.length - maxVisibleEvents;

          return (
            <div
              key={day.dateString}
              data-testid={`calendar-day-${day.dateString}`}
              onClick={() => onSelectDay(day)}
              className={`min-h-[96px] sm:min-h-[110px] p-1.5 sm:p-2 flex flex-col justify-between transition-colors group relative cursor-pointer ${
                day.isCurrentMonth
                  ? day.isWeekend
                    ? 'bg-slate-50/40 dark:bg-slate-900/30'
                    : 'bg-white dark:bg-slate-900'
                  : 'bg-slate-50/80 dark:bg-slate-950/60 opacity-45'
              } ${
                isSelected
                  ? 'ring-2 ring-inset ring-blue-500 bg-blue-50/30 dark:bg-blue-950/20'
                  : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
              }`}
            >
              {/* Day Cell Header */}
              <div className="flex items-center justify-between gap-1 mb-1">
                <span
                  className={`text-xs font-semibold inline-flex items-center justify-center w-6 h-6 rounded-full transition-colors ${
                    day.isToday
                      ? 'bg-blue-600 text-white font-bold shadow-xs'
                      : day.isCurrentMonth
                      ? 'text-slate-700 dark:text-slate-200'
                      : 'text-slate-400 dark:text-slate-500'
                  }`}
                >
                  {day.dayNumber}
                </span>

                {/* Quick Add Button on Day (visible on hover) */}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onAddNewForDate(day.dateString);
                  }}
                  title={`Dodaj aplikację na dzień ${day.dateString}`}
                  className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-950/50 rounded-md transition-all cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Events in Day Cell */}
              <div className="flex-1 space-y-1 overflow-hidden">
                {visibleEvents.map((ev) => {
                  const statusMeta = STATUS_CONFIG[ev.status] || STATUS_CONFIG['Wysłana'];
                  const isInterview = ev.type === 'interview' || ev.type === 'task';

                  return (
                    <button
                      key={ev.id}
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectEvent(ev);
                      }}
                      title={`${ev.title} (${ev.status})${ev.notes ? ` - ${ev.notes}` : ''}`}
                      className={`w-full text-left px-1.5 py-0.5 rounded text-[11px] font-medium leading-tight truncate flex items-center gap-1 border transition-all cursor-pointer ${
                        statusMeta.badgeClass || 'bg-slate-100 text-slate-800'
                      } hover:brightness-95 dark:hover:brightness-110 shadow-2xs`}
                    >
                      {isInterview ? (
                        <Sparkles className="w-2.5 h-2.5 shrink-0 text-amber-600 dark:text-amber-400" />
                      ) : (
                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusMeta.dot}`} />
                      )}
                      <span className="truncate">{ev.application.company}</span>
                    </button>
                  );
                })}

                {/* More events counter */}
                {hiddenCount > 0 && (
                  <div className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 px-1 pt-0.5 hover:text-blue-600 dark:hover:text-blue-400">
                    +{hiddenCount} więcej
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
