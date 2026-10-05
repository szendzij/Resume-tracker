import React, { useState } from 'react';
import { JobApplication, JobStatus } from '../../types';
import { ALL_STATUSES, getLatestStatusDate } from '../../utils/statusConfig';
import { StatusBadge, PortalBadge, JobActionButtons } from '../common';
import {
  Building2,
  Calendar,
  ExternalLink,
  MapPin,
  ChevronDown,
} from 'lucide-react';

interface KanbanCardProps {
  app: JobApplication;
  isSelected: boolean;
  onToggleSelect?: (id: string) => void;
  onEdit: (app: JobApplication) => void;
  onDelete: (id: string, company: string) => void;
  onStatusChange: (id: string, newStatus: JobStatus) => void;
  onReAnalyzeWithAi?: (app: JobApplication) => void;
}

export const KanbanCard: React.FC<KanbanCardProps> = ({
  app,
  isSelected,
  onToggleSelect,
  onEdit,
  onDelete,
  onStatusChange,
  onReAnalyzeWithAi,
}) => {
  const [showStatusPicker, setShowStatusPicker] = useState(false);
  const latestStatusDate = getLatestStatusDate(app);

  return (
    <div
      className={`group relative bg-white dark:bg-slate-900 border rounded-xl p-3.5 shadow-2xs hover:shadow-md transition-all duration-200 ${
        isSelected
          ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/20 dark:bg-blue-950/20'
          : 'border-slate-200/90 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
      }`}
    >
      {/* Card Header: Selection, Portal, and Actions */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          {onToggleSelect && (
            <input
              type="checkbox"
              checked={isSelected}
              onChange={() => onToggleSelect(app.id)}
              className="w-3.5 h-3.5 rounded text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-700 cursor-pointer"
            />
          )}
          <PortalBadge portal={app.portal} className="text-[10px] py-0.5 rounded-full" />
        </div>

        <JobActionButtons
          app={app}
          onEdit={onEdit}
          onDelete={() => onDelete(app.id, app.company)}
          onReAnalyze={onReAnalyzeWithAi}
          showExternalLink={false}
          size="sm"
          className="opacity-80 group-hover:opacity-100 transition-opacity"
        />
      </div>

      {/* Role Title */}
      <h4 className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-snug line-clamp-2 mb-1">
        {app.role}
      </h4>

      {/* Company Name */}
      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2">
        <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
        <span className="truncate">{app.company}</span>
      </div>

      {/* Location / Salary */}
      {(app.location || app.salary) && (
        <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 mb-2.5">
          {app.location && (
            <span className="flex items-center gap-1">
              <MapPin className="w-3 h-3 text-slate-400" />
              <span className="truncate max-w-[140px]">{app.location}</span>
            </span>
          )}
          {app.salary && (
            <span className="font-semibold text-emerald-600 dark:text-emerald-400 truncate max-w-[150px]">
              {app.salary}
            </span>
          )}
        </div>
      )}

      {/* Technologies pills */}
      {app.skills && app.skills.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-3">
          {app.skills.slice(0, 3).map((skill, idx) => (
            <span
              key={idx}
              className="text-[10px] bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded font-mono"
            >
              {skill}
            </span>
          ))}
          {app.skills.length > 3 && (
            <span className="text-[10px] text-slate-400 font-mono self-center">
              +{app.skills.length - 3}
            </span>
          )}
        </div>
      )}

      {/* Footer: Date, Status trigger, Link */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs">
        <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
          <Calendar className="w-3 h-3 text-slate-400 dark:text-slate-500" />
          <span title={`Data wysłania: ${app.appliedDate}`}>{app.appliedDate}</span>
          {latestStatusDate && latestStatusDate !== app.appliedDate && (
            <span
              title={`Data obecnego etapu (${app.status}): ${latestStatusDate}`}
              className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 font-medium border border-slate-200 dark:border-slate-700"
            >
              etap: {latestStatusDate}
            </span>
          )}
        </div>

        <div className="relative">
          <StatusBadge
            status={app.status}
            onClick={() => setShowStatusPicker(!showStatusPicker)}
            className="text-[10px] py-0.5"
          >
            <ChevronDown className="w-2.5 h-2.5 opacity-70 ml-0.5" />
          </StatusBadge>

          {/* Quick status dropdown */}
          {showStatusPicker && (
            <div className="absolute right-0 bottom-full mb-1.5 z-30 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg p-1.5 min-w-[170px] space-y-0.5">
              {ALL_STATUSES.map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => {
                    onStatusChange(app.id, st);
                    setShowStatusPicker(false);
                  }}
                  className={`w-full text-left px-2.5 py-1 text-xs rounded-lg transition-colors cursor-pointer flex items-center justify-between ${
                    app.status === st
                      ? 'bg-blue-50 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300 font-bold'
                      : 'text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700'
                  }`}
                >
                  <span>{st}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {app.url && (
          <a
            href={app.url}
            target="_blank"
            rel="noopener noreferrer"
            title="Otwórz ofertę pracy"
            className="text-slate-400 hover:text-blue-600 dark:hover:text-blue-400"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        )}
      </div>
    </div>
  );
};
