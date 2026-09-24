import { JobStatus } from '../../types';

export interface KanbanStage {
  id: string;
  label: string;
  shortLabel: string;
  statuses: JobStatus[];
  defaultStatus: JobStatus;
  accentClass: string;
  badgeBg: string;
  borderClass: string;
}

export const KANBAN_STAGES: KanbanStage[] = [
  {
    id: 'sent',
    label: 'Wysłane CV',
    shortLabel: 'Wysłane',
    statuses: ['Wysłana'],
    defaultStatus: 'Wysłana',
    accentClass: 'text-blue-700 dark:text-blue-300',
    badgeBg: 'bg-blue-100 text-blue-800 dark:bg-blue-900/60 dark:text-blue-300',
    borderClass: 'border-blue-300/80 dark:border-blue-800/80',
  },
  {
    id: 'review',
    label: 'Weryfikacja CV',
    shortLabel: 'Weryfikacja',
    statuses: ['Weryfikacja CV'],
    defaultStatus: 'Weryfikacja CV',
    accentClass: 'text-purple-700 dark:text-purple-300',
    badgeBg: 'bg-purple-100 text-purple-800 dark:bg-purple-900/60 dark:text-purple-300',
    borderClass: 'border-purple-300/80 dark:border-purple-800/80',
  },
  {
    id: 'interviews',
    label: 'Rozmowy HR / Tech',
    shortLabel: 'Rozmowy',
    statuses: ['Rozmowa HR', 'Rozmowa techniczna'],
    defaultStatus: 'Rozmowa HR',
    accentClass: 'text-amber-700 dark:text-amber-300',
    badgeBg: 'bg-amber-100 text-amber-800 dark:bg-amber-900/60 dark:text-amber-300',
    borderClass: 'border-amber-300/80 dark:border-amber-800/80',
  },
  {
    id: 'tasks',
    label: 'Zadania rekrutacyjne',
    shortLabel: 'Zadania',
    statuses: ['Zadanie rekrutacyjne'],
    defaultStatus: 'Zadanie rekrutacyjne',
    accentClass: 'text-cyan-700 dark:text-cyan-300',
    badgeBg: 'bg-cyan-100 text-cyan-800 dark:bg-cyan-900/60 dark:text-cyan-300',
    borderClass: 'border-cyan-300/80 dark:border-cyan-800/80',
  },
  {
    id: 'offers',
    label: 'Oferty pracy 🎉',
    shortLabel: 'Oferty',
    statuses: ['Oferta'],
    defaultStatus: 'Oferta',
    accentClass: 'text-emerald-700 dark:text-emerald-300',
    badgeBg: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/60 dark:text-emerald-300',
    borderClass: 'border-emerald-300/80 dark:border-emerald-800/80',
  },
  {
    id: 'rejected',
    label: 'Odrzucone / Koniec',
    shortLabel: 'Odrzucone',
    statuses: ['Odrzucona', 'Zrezygnowano'],
    defaultStatus: 'Odrzucona',
    accentClass: 'text-rose-700 dark:text-rose-300',
    badgeBg: 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300',
    borderClass: 'border-rose-300/80 dark:border-rose-800/80',
  },
];
