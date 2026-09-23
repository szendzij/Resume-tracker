import React from 'react';
import { JobApplication, JobStatus } from '../types';
import {
  ALL_STATUSES,
  formatPolishDate,
  getPortalBadgeStyle,
  getRelativeDays,
  STATUS_CONFIG,
} from '../utils/statusConfig';
import {
  ExternalLink,
  Edit2,
  Trash2,
  MapPin,
  DollarSign,
  Calendar,
  Sparkles,
  Building2,
} from 'lucide-react';

interface JobGridProps {
  applications: JobApplication[];
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onEdit: (app: JobApplication) => void;
  onDelete: (app: JobApplication) => void;
  onStatusChange: (id: string, newStatus: JobStatus) => void;
  onReAnalyze: (app: JobApplication) => void;
}

export const JobGrid: React.FC<JobGridProps> = ({
  applications,
  selectedIds,
  onToggleSelect,
  onEdit,
  onDelete,
  onStatusChange,
  onReAnalyze,
}) => {
  if (applications.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center shadow-xs">
        <Building2 className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
        <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">Brak aplikacji</h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">Zmień filtry lub dodaj nową ofertę.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {applications.map((app) => {
        const isSelected = selectedIds.includes(app.id);
        const portalStyle = getPortalBadgeStyle(app.portal);
        const statusMeta = STATUS_CONFIG[app.status] || STATUS_CONFIG['Wysłana'];
        const relativeTime = getRelativeDays(app.appliedDate);

        return (
          <div
            key={app.id}
            id={`job-card-${app.id}`}
            className={`bg-white dark:bg-slate-900 border rounded-2xl p-4 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-3 ${
              isSelected
                ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/15 dark:bg-blue-950/20'
                : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
            }`}
          >
            {/* Header: Select Checkbox, Portal, Applied Date, Actions */}
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-2">
                  <input
                    id={`grid-select-${app.id}`}
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => onToggleSelect(app.id)}
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 dark:border-slate-600 dark:bg-slate-700 focus:ring-blue-500 cursor-pointer"
                  />
                  <span
                    className={`px-2 py-0.5 rounded-md text-[11px] font-medium border ${portalStyle.bg} ${portalStyle.text} ${portalStyle.border}`}
                  >
                    {app.portal}
                  </span>
                </div>

                <div className="flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-500 font-mono">
                  <Calendar className="w-3 h-3" />
                  <span>{formatPolishDate(app.appliedDate)}</span>
                  {relativeTime && <span className="text-slate-500 dark:text-slate-400">({relativeTime})</span>}
                </div>
              </div>

              {/* Title & Company */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3
                    onClick={() => onEdit(app)}
                    className="text-sm font-bold text-slate-900 dark:text-slate-100 hover:text-blue-600 dark:hover:text-blue-400 cursor-pointer transition-colors leading-snug"
                  >
                    {app.role}
                  </h3>
                  <div className="text-xs font-semibold text-slate-600 dark:text-slate-300 mt-0.5">
                    {app.company}
                  </div>
                </div>

                {app.url && (
                  <a
                    href={app.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors shrink-0"
                    title="Otwórz link do oferty"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>

              {/* Location & Salary */}
              {(app.location || app.salary) && (
                <div className="mt-2.5 pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap gap-x-3 gap-y-1 text-xs">
                  {app.location && (
                    <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                      <MapPin className="w-3 h-3 text-slate-400 dark:text-slate-500" />
                      <span>{app.location}</span>
                    </div>
                  )}
                  {app.salary && (
                    <div className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-medium">
                      <DollarSign className="w-3 h-3 text-emerald-500 dark:text-emerald-400" />
                      <span>{app.salary}</span>
                    </div>
                  )}
                </div>
              )}

              {/* Skills Chips */}
              {app.skills && app.skills.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2.5">
                  {app.skills.map((skill) => (
                    <span
                      key={skill}
                      className="px-2 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded text-[10px] font-medium"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              )}

              {/* Notes */}
              {app.notes && (
                <p className="text-xs text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/60 p-2 rounded-lg mt-2.5 line-clamp-2 border border-slate-100 dark:border-slate-800">
                  {app.notes}
                </p>
              )}
            </div>

            {/* Bottom Status & Actions Bar */}
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
              <select
                id={`grid-status-${app.id}`}
                value={app.status}
                onChange={(e) => onStatusChange(app.id, e.target.value as JobStatus)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold border cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 ${statusMeta.bg} ${statusMeta.text} ${statusMeta.border}`}
              >
                {ALL_STATUSES.map((st) => (
                  <option key={st} value={st} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-normal">
                    {st}
                  </option>
                ))}
              </select>

              <div className="flex items-center gap-1">
                {app.url && (
                  <button
                    onClick={() => onReAnalyze(app)}
                    title="Analizuj ponownie przez AI Gemini"
                    className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => onEdit(app)}
                  title="Edytuj ofertę"
                  className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
                <button
                  onClick={() => onDelete(app)}
                  title="Usuń ofertę"
                  className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
