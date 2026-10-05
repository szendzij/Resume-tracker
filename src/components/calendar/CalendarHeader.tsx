import React from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  CalendarDays,
  CalendarRange,
  ListFilter,
  Sparkles,
} from 'lucide-react';
import { formatMonthYear } from '../../utils/calendarUtils';

export type CalendarSubView = 'month' | 'week' | 'agenda';
export type CalendarEventFilter = 'all' | 'interviews' | 'applied' | 'offers';

interface CalendarHeaderProps {
  currentDate: Date;
  subView: CalendarSubView;
  onSubViewChange: (view: CalendarSubView) => void;
  eventFilter: CalendarEventFilter;
  onEventFilterChange: (filter: CalendarEventFilter) => void;
  onPrev: () => void;
  onNext: () => void;
  onToday: () => void;
  totalEventsCount: number;
  interviewsCount: number;
}

export const CalendarHeader: React.FC<CalendarHeaderProps> = ({
  currentDate,
  subView,
  onSubViewChange,
  eventFilter,
  onEventFilterChange,
  onPrev,
  onNext,
  onToday,
  totalEventsCount,
  interviewsCount,
}) => {
  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 sm:p-5 shadow-xs mb-4 space-y-4">
      {/* Top bar: Navigation & View Mode */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4">
        {/* Navigation & Month Title */}
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700/80">
            <button
              type="button"
              onClick={onPrev}
              title="Poprzedni"
              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={onNext}
              title="Następny"
              className="p-1.5 rounded-lg text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-white dark:hover:bg-slate-700 transition-colors cursor-pointer"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>

          <button
            type="button"
            onClick={onToday}
            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
          >
            Dzisiaj
          </button>

          <h2 className="text-lg sm:text-xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2">
            <span>{formatMonthYear(currentDate)}</span>
          </h2>
        </div>

        {/* Sub-view switcher (Miesiąc / Tydzień / Agenda) */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-800/80 p-1 rounded-xl border border-slate-200/80 dark:border-slate-700/80 self-start md:self-auto">
          <button
            type="button"
            onClick={() => onSubViewChange('month')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              subView === 'month'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <CalendarDays className="w-3.5 h-3.5" />
            <span>Miesiąc</span>
          </button>

          <button
            type="button"
            onClick={() => onSubViewChange('week')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              subView === 'week'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <CalendarRange className="w-3.5 h-3.5" />
            <span>Tydzień</span>
          </button>

          <button
            type="button"
            onClick={() => onSubViewChange('agenda')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              subView === 'agenda'
                ? 'bg-white dark:bg-slate-700 text-blue-600 dark:text-blue-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <ListFilter className="w-3.5 h-3.5" />
            <span>Agenda</span>
          </button>
        </div>
      </div>

      {/* Bottom bar: Event type filter pills & statistics */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
        {/* Filter pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-slate-500 dark:text-slate-400 font-medium mr-1 flex items-center gap-1">
            <CalendarIcon className="w-3.5 h-3.5" />
            <span>Pokaż:</span>
          </span>

          <button
            type="button"
            onClick={() => onEventFilterChange('all')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
              eventFilter === 'all'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            Wszystkie ({totalEventsCount})
          </button>

          <button
            type="button"
            onClick={() => onEventFilterChange('interviews')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer flex items-center gap-1 ${
              eventFilter === 'interviews'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40 border border-amber-200/50 dark:border-amber-800/50'
            }`}
          >
            <Sparkles className="w-3 h-3" />
            <span>Rozmowy i zadania ({interviewsCount})</span>
          </button>

          <button
            type="button"
            onClick={() => onEventFilterChange('applied')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
              eventFilter === 'applied'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}
          >
            Wysłane aplikacje
          </button>

          <button
            type="button"
            onClick={() => onEventFilterChange('offers')}
            className={`px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
              eventFilter === 'offers'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-100 dark:hover:bg-emerald-900/40 border border-emerald-200/50 dark:border-emerald-800/50'
            }`}
          >
            Oferty
          </button>
        </div>

        {/* Quick summary metrics */}
        <div className="text-slate-500 dark:text-slate-400 flex items-center gap-3">
          <span>
            Zdarzeń w widoku: <strong className="text-slate-800 dark:text-slate-200">{totalEventsCount}</strong>
          </span>
          {interviewsCount > 0 && (
            <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
              <span>{interviewsCount} rozmów / zadań</span>
            </span>
          )}
        </div>
      </div>
    </div>
  );
};
