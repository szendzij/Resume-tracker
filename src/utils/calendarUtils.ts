import { JobApplication, JobStatus } from '../types';

export type CalendarEventType = 'applied' | 'interview' | 'task' | 'offer' | 'status_change';

export interface CalendarEvent {
  id: string;
  applicationId: string;
  application: JobApplication;
  date: string; // YYYY-MM-DD
  type: CalendarEventType;
  title: string;
  status: JobStatus;
  notes?: string;
  isMilestone: boolean;
}

export interface CalendarDay {
  date: Date;
  dateString: string; // YYYY-MM-DD
  dayNumber: number;
  isCurrentMonth: boolean;
  isToday: boolean;
  isWeekend: boolean;
  events: CalendarEvent[];
}

export const POLISH_MONTH_NAMES = [
  'Styczeń',
  'Luty',
  'Marzec',
  'Kwiecień',
  'Maj',
  'Czerwiec',
  'Lipiec',
  'Sierpień',
  'Wrzesień',
  'Październik',
  'Listopad',
  'Grudzień',
];

export const POLISH_DAY_NAMES = [
  'Poniedziałek',
  'Wtorek',
  'Środa',
  'Czwartek',
  'Piątek',
  'Sobota',
  'Niedziela',
];

export const POLISH_DAY_SHORT = ['Pon', 'Wt', 'Śr', 'Czw', 'Pt', 'Sob', 'Nie'];

/**
 * Formats a Date object to YYYY-MM-DD string in local time
 */
export function formatDateToYYYYMMDD(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Normalizes any date string (ISO or YYYY-MM-DD) to YYYY-MM-DD
 */
export function normalizeDateString(dateStr: string): string {
  if (!dateStr) return '';
  if (dateStr.includes('T')) {
    return dateStr.split('T')[0];
  }
  return dateStr.slice(0, 10);
}

/**
 * Classifies an event type based on the status
 */
export function classifyEventType(status: JobStatus): CalendarEventType {
  if (status === 'Rozmowa HR' || status === 'Rozmowa techniczna') {
    return 'interview';
  }
  if (status === 'Zadanie rekrutacyjne') {
    return 'task';
  }
  if (status === 'Oferta') {
    return 'offer';
  }
  if (status === 'Wysłana' || status === 'Do zaaplikowania') {
    return 'applied';
  }
  return 'status_change';
}

/**
 * Extracts and maps calendar events from applications and their timelines
 */
export function extractCalendarEvents(
  applications: JobApplication[],
  filterType: 'all' | 'interviews' | 'applied' | 'offers' = 'all'
): CalendarEvent[] {
  const events: CalendarEvent[] = [];

  for (const app of applications) {
    // 1. Primary applied date event
    if (app.appliedDate) {
      const date = normalizeDateString(app.appliedDate);
      const isMilestone = app.status === 'Oferta' || app.status.startsWith('Rozmowa');
      events.push({
        id: `applied-${app.id}`,
        applicationId: app.id,
        application: app,
        date,
        type: 'applied',
        title: `${app.role} @ ${app.company}`,
        status: app.status,
        notes: app.notes,
        isMilestone,
      });
    }

    // 2. Timeline history milestones
    if (app.timeline && app.timeline.length > 0) {
      for (const entry of app.timeline) {
        if (!entry.date) continue;
        const entryDate = normalizeDateString(entry.date);
        const eventType = classifyEventType(entry.status);

        // Avoid adding duplicate event if entry represents initial application submission
        const isInitialSubmission =
          entryDate === normalizeDateString(app.appliedDate) &&
          (entry.status === 'Wysłana' ||
            entry.status === 'Do zaaplikowania' ||
            entry.status === app.status);

        if (!isInitialSubmission) {
          const isMilestone =
            eventType === 'interview' || eventType === 'task' || eventType === 'offer';
          events.push({
            id: `timeline-${entry.id || `${app.id}-${entryDate}-${entry.status}`}`,
            applicationId: app.id,
            application: app,
            date: entryDate,
            type: eventType,
            title: `${entry.status}: ${app.company}`,
            status: entry.status,
            notes: entry.notes || app.notes,
            isMilestone,
          });
        }
      }
    }
  }

  // Filter based on selected filterType
  let filtered = events;
  if (filterType === 'interviews') {
    filtered = events.filter((e) => e.type === 'interview' || e.type === 'task');
  } else if (filterType === 'applied') {
    filtered = events.filter((e) => e.type === 'applied');
  } else if (filterType === 'offers') {
    filtered = events.filter((e) => e.status === 'Oferta');
  }

  // Sort events chronologically, then milestone first
  return filtered.sort((a, b) => {
    const cmp = a.date.localeCompare(b.date);
    if (cmp !== 0) return cmp;
    if (a.isMilestone && !b.isMilestone) return -1;
    if (!a.isMilestone && b.isMilestone) return 1;
    return a.title.localeCompare(b.title);
  });
}

/**
 * Generates the full 35- or 42-day calendar grid for a given month and year.
 * Weeks start on Monday (European standard).
 */
export function getCalendarDays(
  year: number,
  month: number, // 0-indexed (0 = January, 11 = December)
  events: CalendarEvent[] = []
): CalendarDay[] {
  const todayStr = formatDateToYYYYMMDD(new Date());

  // First day of current month
  const firstDayOfMonth = new Date(year, month, 1);
  // Last day of current month
  const lastDayOfMonth = new Date(year, month + 1, 0);

  // Day of week for 1st of month: 0 (Sun) to 6 (Sat)
  // Convert to Monday = 0, ..., Sunday = 6
  let firstDayWeekday = firstDayOfMonth.getDay() - 1;
  if (firstDayWeekday < 0) firstDayWeekday = 6;

  // Days needed from previous month to align with Monday
  const prevMonthPadding = firstDayWeekday;

  // Last day of previous month
  const lastDayOfPrevMonth = new Date(year, month, 0).getDate();

  const days: CalendarDay[] = [];

  // Group events by date string for fast lookup
  const eventsByDate = new Map<string, CalendarEvent[]>();
  for (const event of events) {
    const list = eventsByDate.get(event.date) || [];
    list.push(event);
    eventsByDate.set(event.date, list);
  }

  // 1. Previous month padding days
  for (let i = prevMonthPadding - 1; i >= 0; i--) {
    const dayNumber = lastDayOfPrevMonth - i;
    const date = new Date(year, month - 1, dayNumber);
    const dateString = formatDateToYYYYMMDD(date);
    const dayOfWeek = date.getDay();
    days.push({
      date,
      dateString,
      dayNumber,
      isCurrentMonth: false,
      isToday: dateString === todayStr,
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
      events: eventsByDate.get(dateString) || [],
    });
  }

  // 2. Current month days
  const daysInCurrentMonth = lastDayOfMonth.getDate();
  for (let d = 1; d <= daysInCurrentMonth; d++) {
    const date = new Date(year, month, d);
    const dateString = formatDateToYYYYMMDD(date);
    const dayOfWeek = date.getDay();
    days.push({
      date,
      dateString,
      dayNumber: d,
      isCurrentMonth: true,
      isToday: dateString === todayStr,
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
      events: eventsByDate.get(dateString) || [],
    });
  }

  // 3. Next month padding days to complete full weeks (multiples of 7, usually 35 or 42 total)
  const remainingDays = (7 - (days.length % 7)) % 7;
  const targetTotal = days.length + remainingDays < 35 ? 35 : days.length + remainingDays;
  const nextMonthPadding = targetTotal - days.length;

  for (let d = 1; d <= nextMonthPadding; d++) {
    const date = new Date(year, month + 1, d);
    const dateString = formatDateToYYYYMMDD(date);
    const dayOfWeek = date.getDay();
    days.push({
      date,
      dateString,
      dayNumber: d,
      isCurrentMonth: false,
      isToday: dateString === todayStr,
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
      events: eventsByDate.get(dateString) || [],
    });
  }

  return days;
}

/**
 * Returns the 7 days of the week containing the given date (Monday to Sunday).
 */
export function getWeekDays(referenceDate: Date, events: CalendarEvent[] = []): CalendarDay[] {
  const todayStr = formatDateToYYYYMMDD(new Date());

  // Find Monday of this week
  const day = referenceDate.getDay();
  const diff = referenceDate.getDate() - day + (day === 0 ? -6 : 1);
  const monday = new Date(referenceDate);
  monday.setDate(diff);

  const eventsByDate = new Map<string, CalendarEvent[]>();
  for (const event of events) {
    const list = eventsByDate.get(event.date) || [];
    list.push(event);
    eventsByDate.set(event.date, list);
  }

  const days: CalendarDay[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    const dateString = formatDateToYYYYMMDD(d);
    const dayOfWeek = d.getDay();
    days.push({
      date: d,
      dateString,
      dayNumber: d.getDate(),
      isCurrentMonth: d.getMonth() === referenceDate.getMonth(),
      isToday: dateString === todayStr,
      isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
      events: eventsByDate.get(dateString) || [],
    });
  }

  return days;
}

/**
 * Formats a month and year header string in Polish
 */
export function formatMonthYear(date: Date): string {
  const monthName = POLISH_MONTH_NAMES[date.getMonth()];
  const year = date.getFullYear();
  return `${monthName} ${year}`;
}
