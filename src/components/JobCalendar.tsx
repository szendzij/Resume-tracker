import React, { useState, useMemo } from 'react';
import { JobApplication } from '../types';
import {
  extractCalendarEvents,
  getCalendarDays,
  getWeekDays,
  formatDateToYYYYMMDD,
  CalendarDay,
  CalendarEvent,
} from '../utils/calendarUtils';
import {
  CalendarHeader,
  CalendarSubView,
  CalendarEventFilter,
} from './calendar/CalendarHeader';
import { CalendarMonthGrid } from './calendar/CalendarMonthGrid';
import { CalendarWeekGrid } from './calendar/CalendarWeekGrid';
import { CalendarAgendaView } from './calendar/CalendarAgendaView';
import { CalendarDayDetails } from './calendar/CalendarDayDetails';

interface JobCalendarProps {
  applications: JobApplication[];
  onEdit: (app: JobApplication) => void;
  onDelete: (app: JobApplication) => void;
  onAddNew: (defaultDate?: string) => void;
}

export const JobCalendar: React.FC<JobCalendarProps> = ({
  applications,
  onEdit,
  onDelete,
  onAddNew,
}) => {
  const [currentDate, setCurrentDate] = useState<Date>(() => new Date());
  const [subView, setSubView] = useState<CalendarSubView>('month');
  const [eventFilter, setEventFilter] = useState<CalendarEventFilter>('all');
  const [selectedDateStr, setSelectedDateStr] = useState<string | null>(null);

  // Extract all calendar events from applications
  const allEvents = useMemo(() => {
    return extractCalendarEvents(applications, 'all');
  }, [applications]);

  // Filtered events based on selected pill
  const filteredEvents = useMemo(() => {
    return extractCalendarEvents(applications, eventFilter);
  }, [applications, eventFilter]);

  // Statistics
  const interviewsCount = useMemo(() => {
    return allEvents.filter((e) => e.type === 'interview' || e.type === 'task').length;
  }, [allEvents]);

  // Month days
  const monthDays = useMemo(() => {
    return getCalendarDays(
      currentDate.getFullYear(),
      currentDate.getMonth(),
      filteredEvents
    );
  }, [currentDate, filteredEvents]);

  // Week days
  const weekDays = useMemo(() => {
    return getWeekDays(currentDate, filteredEvents);
  }, [currentDate, filteredEvents]);

  // Selected day events
  const selectedDayEvents = useMemo(() => {
    if (!selectedDateStr) return [];
    return allEvents.filter((e) => e.date === selectedDateStr);
  }, [selectedDateStr, allEvents]);

  // Navigation handlers
  const handlePrev = () => {
    setCurrentDate((prev) => {
      const next = new Date(prev);
      if (subView === 'week') {
        next.setDate(next.getDate() - 7);
      } else {
        next.setMonth(next.getMonth() - 1);
      }
      return next;
    });
  };

  const handleNext = () => {
    setCurrentDate((prev) => {
      const next = new Date(prev);
      if (subView === 'week') {
        next.setDate(next.getDate() + 7);
      } else {
        next.setMonth(next.getMonth() + 1);
      }
      return next;
    });
  };

  const handleToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDateStr(formatDateToYYYYMMDD(today));
  };

  const handleSelectDay = (day: CalendarDay) => {
    if (selectedDateStr === day.dateString) {
      setSelectedDateStr(null);
    } else {
      setSelectedDateStr(day.dateString);
    }
  };

  const handleSelectEvent = (event: CalendarEvent) => {
    onEdit(event.application);
  };

  return (
    <div id="job-calendar-container" className="space-y-4">
      {/* Calendar Header with Navigation, Views & Filters */}
      <CalendarHeader
        currentDate={currentDate}
        subView={subView}
        onSubViewChange={setSubView}
        eventFilter={eventFilter}
        onEventFilterChange={setEventFilter}
        onPrev={handlePrev}
        onNext={handleNext}
        onToday={handleToday}
        totalEventsCount={filteredEvents.length}
        interviewsCount={interviewsCount}
      />

      {/* Selected Day Details Panel (when a day is clicked) */}
      {selectedDateStr && (
        <CalendarDayDetails
          selectedDateStr={selectedDateStr}
          events={selectedDayEvents}
          onClose={() => setSelectedDateStr(null)}
          onSelectEvent={handleSelectEvent}
          onAddNew={onAddNew}
        />
      )}

      {/* Active Sub-View */}
      {subView === 'month' && (
        <CalendarMonthGrid
          days={monthDays}
          selectedDateStr={selectedDateStr}
          onSelectDay={handleSelectDay}
          onSelectEvent={handleSelectEvent}
          onAddNewForDate={onAddNew}
        />
      )}

      {subView === 'week' && (
        <CalendarWeekGrid
          days={weekDays}
          selectedDateStr={selectedDateStr}
          onSelectDay={handleSelectDay}
          onSelectEvent={handleSelectEvent}
          onAddNewForDate={onAddNew}
        />
      )}

      {subView === 'agenda' && (
        <CalendarAgendaView
          events={filteredEvents}
          onSelectEvent={handleSelectEvent}
          onAddNew={() => onAddNew()}
        />
      )}
    </div>
  );
};
