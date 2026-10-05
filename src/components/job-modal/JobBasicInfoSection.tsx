import React from 'react';
import {
  Link2,
  Sparkles,
  Loader2,
  Briefcase,
  Building2,
  Calendar,
  MapPin,
  DollarSign,
} from 'lucide-react';
import { JobStatus } from '../../types';
import { ALL_STATUSES, POPULAR_PORTALS } from '../../utils/statusConfig';

export interface JobBasicInfoSectionProps {
  url: string;
  setUrl: (url: string) => void;
  isAiLoading: boolean;
  aiMessage: { type: 'success' | 'error'; text: string } | null;
  onAiExtract: () => void;
  role: string;
  setRole: (role: string) => void;
  company: string;
  setCompany: (company: string) => void;
  portal: string;
  setPortal: (portal: string) => void;
  customPortal: string;
  setCustomPortal: (customPortal: string) => void;
  status: JobStatus;
  onStatusChange: (status: JobStatus) => void;
  appliedDate: string;
  onAppliedDateChange: (date: string) => void;
  location: string;
  setLocation: (loc: string) => void;
  salary: string;
  setSalary: (salary: string) => void;
}

export const JobBasicInfoSection: React.FC<JobBasicInfoSectionProps> = ({
  url,
  setUrl,
  isAiLoading,
  aiMessage,
  onAiExtract,
  role,
  setRole,
  company,
  setCompany,
  portal,
  setPortal,
  customPortal,
  setCustomPortal,
  status,
  onStatusChange,
  appliedDate,
  onAppliedDateChange,
  location,
  setLocation,
  salary,
  setSalary,
}) => {
  return (
    <>
      {/* AI Auto-extract section */}
      <div className="bg-gradient-to-r from-blue-50/70 to-indigo-50/70 dark:from-blue-950/40 dark:to-indigo-950/40 border border-blue-100 dark:border-blue-900/60 rounded-xl p-3.5 space-y-2">
        <label className="text-xs font-semibold text-blue-900 dark:text-blue-200 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <Link2 className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
            Link do oferty pracy (URL)
          </span>
          <span className="text-[11px] text-blue-600 dark:text-blue-400 font-normal">
            np. LinkedIn, NoFluffJobs, JustJoinIT, Pracuj.pl
          </span>
        </label>

        <div className="flex gap-2">
          <input
            id="job-url-input"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://nofluffjobs.com/job/... lub https://www.linkedin.com/jobs/view/..."
            className="flex-1 px-3 py-2 bg-white dark:bg-slate-800 border border-blue-200 dark:border-blue-800/80 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/30"
          />
          <button
            id="ai-extract-btn"
            type="button"
            onClick={onAiExtract}
            disabled={isAiLoading || !url}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-300 dark:disabled:bg-blue-900/40 text-white rounded-lg text-xs font-medium flex items-center gap-1.5 shadow-xs transition-all shrink-0 cursor-pointer disabled:cursor-not-allowed"
            title="Wyciągnij dane o stanowisku i firmie przez model LLM"
          >
            {isAiLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Analizuję...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Wyciągnij z AI</span>
              </>
            )}
          </button>
        </div>

        {aiMessage && (
          <div
            className={`text-xs px-2.5 py-1.5 rounded-md flex items-center gap-1.5 ${
              aiMessage.type === 'success'
                ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-800 dark:text-emerald-200 border border-emerald-200 dark:border-emerald-800'
                : 'bg-rose-50 dark:bg-rose-950/60 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-800'
            }`}
          >
            {aiMessage.text}
          </div>
        )}
      </div>

      {/* Role and Company */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
            Stanowisko / Rola <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <Briefcase className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="job-role-input"
              type="text"
              required
              value={role}
              onChange={(e) => setRole(e.target.value)}
              placeholder="np. Software Engineer, Product Manager, QA"
              className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
            Firma / Pracodawca <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <Building2 className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="job-company-input"
              type="text"
              required
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              placeholder="np. Spyrosoft, GFT Poland"
              className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
        </div>
      </div>

      {/* Portal, Status and Date */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
            Portal / Źródło oferty
          </label>
          <select
            id="job-portal-select"
            value={portal}
            onChange={(e) => setPortal(e.target.value)}
            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          >
            {POPULAR_PORTALS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
          {portal === 'Inny portal' && (
            <input
              type="text"
              value={customPortal}
              onChange={(e) => setCustomPortal(e.target.value)}
              placeholder="Wpisz nazwę portalu..."
              className="w-full mt-2 px-3 py-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-slate-100"
            />
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
            Status aplikacji
          </label>
          <select
            id="job-status-select"
            value={status}
            onChange={(e) => onStatusChange(e.target.value as JobStatus)}
            className="w-full px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-medium"
          >
            {ALL_STATUSES.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
            Data wysłania CV <span className="text-rose-500">*</span>
          </label>
          <div className="relative">
            <Calendar className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="job-applied-date-input"
              type="date"
              required
              value={appliedDate}
              onChange={(e) => onAppliedDateChange(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 font-mono"
            />
          </div>
        </div>
      </div>

      {/* Location and Salary */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
            Lokalizacja / Tryb pracy
          </label>
          <div className="relative">
            <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="job-location-input"
              type="text"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="np. Wrocław, Remote, Warszawa (Hybrydowo)"
              className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
            Widełki wynagrodzenia (opcjonalnie)
          </label>
          <div className="relative">
            <DollarSign className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              id="job-salary-input"
              type="text"
              value={salary}
              onChange={(e) => setSalary(e.target.value)}
              placeholder="np. 18 000 - 24 000 PLN B2B"
              className="w-full pl-9 pr-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
            />
          </div>
        </div>
      </div>
    </>
  );
};
