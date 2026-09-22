import React from 'react';
import { JobApplication, JobStatus } from '../types';
import { ALL_STATUSES, formatPolishDate, getPortalBadgeStyle, getRelativeDays, STATUS_CONFIG } from '../utils/statusConfig';
import { ExternalLink, Edit2, Trash2, MapPin, DollarSign, Calendar, Sparkles, Building2 } from 'lucide-react';

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
      <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-xs">
        <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h3 className="text-base font-semibold text-slate-800">Brak aplikacji</h3>
        <p className="text-xs text-slate-500 mt-1">Zmień filtry lub dodaj nową ofertę.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {applications.map((app) => {
        const isSelected = selectedIds.includes(app.id);
        const portalStyle = getPortalBadgeStyle(app.portal);
        const statusMeta = STATUS_CONFIG[app.status];
        const relativeTime = getRelativeDays(app.appliedDate);

        return (
          <div
            key={app.id}
            id={`job-card-${app.id}`}
            className={`bg-white border rounded-2xl p-4 shadow-xs hover:shadow-md transition-all flex flex-col justify-between space-y-3 ${
              isSelected
                ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/15'
                : 'border-slate-200'
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
                    className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                  />
                  <span
                    className={`px-2 py-0.5 rounded-md text-[11px] font-medium border ${portalStyle.bg} ${portalStyle.text} ${portalStyle.border}`}
                  >
                    {app.portal}
                  </span>
                </div>

                <div className="flex items-center gap-1 text-[11px] text-slate-400 font-mono">
                  <Calendar className="w-3 h-3" />
                  <span>{formatPolishDate(app.appliedDate)}</span>
                  {relativeTime && <span className="text-slate-500">({relativeTime})</span>}
                </div>
              </div>

              {/* Title & Company */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 leading-snug hover:text-blue-600 transition-colors">
                    {app.role}
                  </h3>
                  <p className="text-xs font-semibold text-slate-600 mt-0.5">{app.company}</p>
                </div>
                {app.url && (
                  <a
                    href={app.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors shrink-0"
                    title="Otwórz link do oferty"
                  >
                    <ExternalLink className="w-4 h-4" />
                  </a>
                )}
              </div>
            </div>

            {/* Location, Salary, Notes */}
            <div className="space-y-2 text-xs">
              <div className="flex flex-wrap items-center gap-3 text-slate-600">
                {app.location && (
                  <span className="inline-flex items-center gap-1 text-[11px]">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    {app.location}
                  </span>
                )}
                {app.salary && (
                  <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700">
                    <DollarSign className="w-3.5 h-3.5 text-emerald-500" />
                    {app.salary}
                  </span>
                )}
              </div>

              {app.skills && app.skills.length > 0 && (
                <div className="flex flex-wrap gap-1 pt-1">
                  {app.skills.map((skill) => (
                    <span
                      key={skill}
                      className="px-2 py-0.5 bg-slate-100 border border-slate-200 text-slate-600 rounded text-[10px] font-medium"
                    >
                      {skill}
                    </span>
                  ))}
                </div>
              )}

              {app.notes && (
                <p className="text-[11px] text-slate-500 bg-slate-50 p-2 rounded-lg border border-slate-100 italic">
                  "{app.notes}"
                </p>
              )}
            </div>

            {/* Status & Quick Change Footer */}
            <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
              <div className="relative">
                <select
                  value={app.status}
                  onChange={(e) => onStatusChange(app.id, e.target.value as JobStatus)}
                  className={`text-xs font-semibold py-1 pl-2.5 pr-6 rounded-full border cursor-pointer appearance-none transition-all ${statusMeta.bg} ${statusMeta.text} ${statusMeta.border}`}
                >
                  {ALL_STATUSES.map((st) => (
                    <option key={st} value={st} className="bg-white text-slate-800 font-normal">
                      {st}
                    </option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                  <span className={`w-1.5 h-1.5 rounded-full ${statusMeta.dot}`} />
                </div>
              </div>

              <div className="flex items-center gap-1">
                {app.url && (
                  <button
                    onClick={() => onReAnalyze(app)}
                    title="Przeanalizuj ponownie z AI"
                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={() => onEdit(app)}
                  title="Edytuj ofertę"
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => onDelete(app)}
                  title="Usuń aplikację"
                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};
