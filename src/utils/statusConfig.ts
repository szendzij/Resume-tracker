import { JobStatus } from '../types';

export interface StatusMeta {
  label: JobStatus;
  bg: string;
  text: string;
  border: string;
  dot: string;
  badgeClass: string;
  description: string;
}

export const STATUS_CONFIG: Record<JobStatus, StatusMeta> = {
  'Wysłana': {
    label: 'Wysłana',
    bg: 'bg-blue-50 dark:bg-blue-950/50',
    text: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-200 dark:border-blue-800/70',
    dot: 'bg-blue-500 dark:bg-blue-400',
    badgeClass: 'bg-blue-50 dark:bg-blue-950/50 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-800/70 hover:bg-blue-100 dark:hover:bg-blue-900/60',
    description: 'CV wysłane, oczekiwanie na pierwszą odpowiedź',
  },
  'Weryfikacja CV': {
    label: 'Weryfikacja CV',
    bg: 'bg-purple-50 dark:bg-purple-950/50',
    text: 'text-purple-700 dark:text-purple-300',
    border: 'border-purple-200 dark:border-purple-800/70',
    dot: 'bg-purple-500 dark:bg-purple-400',
    badgeClass: 'bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border-purple-200 dark:border-purple-800/70 hover:bg-purple-100 dark:hover:bg-purple-900/60',
    description: 'Aplikacja otwarta lub weryfikowana przez rekrutera',
  },
  'Rozmowa HR': {
    label: 'Rozmowa HR',
    bg: 'bg-amber-50 dark:bg-amber-950/50',
    text: 'text-amber-800 dark:text-amber-300',
    border: 'border-amber-200 dark:border-amber-800/70',
    dot: 'bg-amber-500 dark:bg-amber-400',
    badgeClass: 'bg-amber-50 dark:bg-amber-950/50 text-amber-800 dark:text-amber-300 border-amber-200 dark:border-amber-800/70 hover:bg-amber-100 dark:hover:bg-amber-900/60',
    description: 'Pierwszy kontakt telefoniczny lub rozmowa z HR',
  },
  'Rozmowa techniczna': {
    label: 'Rozmowa techniczna',
    bg: 'bg-indigo-50 dark:bg-indigo-950/50',
    text: 'text-indigo-700 dark:text-indigo-300',
    border: 'border-indigo-200 dark:border-indigo-800/70',
    dot: 'bg-indigo-500 dark:bg-indigo-400',
    badgeClass: 'bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800/70 hover:bg-indigo-100 dark:hover:bg-indigo-900/60',
    description: 'Spotkanie z liderem technicznym lub zespołem QA',
  },
  'Zadanie rekrutacyjne': {
    label: 'Zadanie rekrutacyjne',
    bg: 'bg-cyan-50 dark:bg-cyan-950/50',
    text: 'text-cyan-700 dark:text-cyan-300',
    border: 'border-cyan-200 dark:border-cyan-800/70',
    dot: 'bg-cyan-500 dark:bg-cyan-400',
    badgeClass: 'bg-cyan-50 dark:bg-cyan-950/50 text-cyan-700 dark:text-cyan-300 border-cyan-200 dark:border-cyan-800/70 hover:bg-cyan-100 dark:hover:bg-cyan-900/60',
    description: 'Wykonywanie zadania domowego lub testu technicznego',
  },
  'Oferta': {
    label: 'Oferta',
    bg: 'bg-emerald-50 dark:bg-emerald-950/50',
    text: 'text-emerald-700 dark:text-emerald-300',
    border: 'border-emerald-200 dark:border-emerald-800/70',
    dot: 'bg-emerald-500 dark:bg-emerald-400',
    badgeClass: 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800/70 hover:bg-emerald-100 dark:hover:bg-emerald-900/60',
    description: 'Złożono oficjalną propozycję współpracy!',
  },
  'Odrzucona': {
    label: 'Odrzucona',
    bg: 'bg-rose-50 dark:bg-rose-950/50',
    text: 'text-rose-700 dark:text-rose-300',
    border: 'border-rose-200 dark:border-rose-800/70',
    dot: 'bg-rose-400 dark:bg-rose-400',
    badgeClass: 'bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border-rose-200 dark:border-rose-800/70 hover:bg-rose-100 dark:hover:bg-rose-900/60',
    description: 'Proces zakończony brakiem dopasowania',
  },
  'Zrezygnowano': {
    label: 'Zrezygnowano',
    bg: 'bg-slate-100 dark:bg-slate-800',
    text: 'text-slate-700 dark:text-slate-300',
    border: 'border-slate-200 dark:border-slate-700',
    dot: 'bg-slate-400 dark:bg-slate-500',
    badgeClass: 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700',
    description: 'Rezygnacja z udziału w dalszych etapach',
  },
};

export const ALL_STATUSES: JobStatus[] = [
  'Wysłana',
  'Weryfikacja CV',
  'Rozmowa HR',
  'Rozmowa techniczna',
  'Zadanie rekrutacyjne',
  'Oferta',
  'Odrzucona',
  'Zrezygnowano',
];

export const POPULAR_PORTALS = [
  'LinkedIn',
  'NoFluffJobs',
  'Just Join IT',
  'Pracuj.pl',
  'The Protocol',
  'TheSmartJobs',
  'Spyrosoft Careers',
  'Kuehne+Nagel Careers',
  'PPG Careers',
  'SoftServe Careers',
  'Strona karier firmy',
  'Inny portal',
];

export function formatPolishDate(dateStr: string): string {
  if (!dateStr) return 'Brak daty';
  try {
    const [year, month, day] = dateStr.split('-');
    if (!year || !month || !day) return dateStr;
    const monthsPl = [
      'sty',
      'lut',
      'mar',
      'kwi',
      'maj',
      'cze',
      'lip',
      'sie',
      'wrz',
      'paź',
      'lis',
      'gru',
    ];
    const mIdx = parseInt(month, 10) - 1;
    return `${parseInt(day, 10)} ${monthsPl[mIdx] || month} ${year}`;
  } catch {
    return dateStr;
  }
}

export function getRelativeDays(dateStr: string): string {
  if (!dateStr) return '';
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr);
    target.setHours(0, 0, 0, 0);

    const diffTime = today.getTime() - target.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return 'dzisiaj';
    if (diffDays === 1) return 'wczoraj';
    if (diffDays > 1) return `${diffDays} dni temu`;
    if (diffDays < 0) return `za ${Math.abs(diffDays)} dni`;
    return '';
  } catch {
    return '';
  }
}

export function getPortalBadgeStyle(portal: string): { bg: string; text: string; border: string } {
  const p = portal.toLowerCase();
  if (p.includes('linkedin')) {
    return {
      bg: 'bg-[#0077b5]/10 dark:bg-[#0077b5]/20',
      text: 'text-[#0077b5] dark:text-[#38bdf8]',
      border: 'border-[#0077b5]/20 dark:border-[#0077b5]/40',
    };
  }
  if (p.includes('nofluff')) {
    return {
      bg: 'bg-emerald-50 dark:bg-emerald-950/50',
      text: 'text-emerald-700 dark:text-emerald-300',
      border: 'border-emerald-200 dark:border-emerald-800/70',
    };
  }
  if (p.includes('justjoin') || p.includes('just join')) {
    return {
      bg: 'bg-pink-50 dark:bg-pink-950/50',
      text: 'text-pink-700 dark:text-pink-300',
      border: 'border-pink-200 dark:border-pink-800/70',
    };
  }
  if (p.includes('pracuj')) {
    return {
      bg: 'bg-blue-50 dark:bg-blue-950/50',
      text: 'text-blue-800 dark:text-blue-300',
      border: 'border-blue-200 dark:border-blue-800/70',
    };
  }
  if (p.includes('protocol')) {
    return {
      bg: 'bg-violet-50 dark:bg-violet-950/50',
      text: 'text-violet-700 dark:text-violet-300',
      border: 'border-violet-200 dark:border-violet-800/70',
    };
  }
  if (p.includes('careers') || p.includes('karier')) {
    return {
      bg: 'bg-amber-50 dark:bg-amber-950/50',
      text: 'text-amber-800 dark:text-amber-300',
      border: 'border-amber-200 dark:border-amber-800/70',
    };
  }
  return {
    bg: 'bg-slate-100 dark:bg-slate-800',
    text: 'text-slate-700 dark:text-slate-300',
    border: 'border-slate-200 dark:border-slate-700',
  };
}
