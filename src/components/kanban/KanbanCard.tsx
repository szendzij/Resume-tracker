import React, { useState } from 'react';
import { JobApplication, JobStatus } from '../../types';
import { STATUS_CONFIG, getPortalBadgeStyle, ALL_STATUSES } from '../../utils/statusConfig';
import {
  Building2,
  Calendar,
  ExternalLink,
  Edit2,
  Trash2,
  Sparkles,
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
  const statusCfg = STATUS_CONFIG[app.status];
  const portalBadge = getPortalBadgeStyle(app.portal);

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
          <span
            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${portalBadge.bg} ${portalBadge.text}`}
          >
            {app.portal}
          </span>
        </div>

        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
          {onReAnalyzeWithAi && app.url && (
            <button
              type="button"
              onClick={() => onReAnalyzeWithAi(app)}
              title="Przeanalizuj ofertę przez AI"
              className="p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded cursor-pointer"
            >
              <Sparkles className="w-3 h-3" />
            </button>
          )}
          <button
            type="button"
            onClick={() => onEdit(app)}
            title="Edytuj ofertę"
            className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded cursor-pointer"
          >
            <Edit2 className="w-3 h-3" />
          </button>
          <button
            type="button"
            onClick={() => onDelete(app.id, app.company)}
            title="Usuń ofertę"
            className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
          >
            <Trash2 className="w-3 h-3" />
          </button>
        </div>
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
        <div className="flex items-center gap-1 text-[11px] text-slate-400">
          <Calendar className="w-3 h-3" />
          <span>{app.appliedDate}</span>
        </div>

        <div className="relative">
          <button
            type="button"
            onClick={() => setShowStatusPicker(!showStatusPicker)}
            className={`text-[10px] font-semibold px-2 py-0.5 rounded-full flex items-center gap-1 cursor-pointer transition-colors ${statusCfg.badgeClass}`}
          >
            <span>{app.status}</span>
            <ChevronDown className="w-2.5 h-2.5 opacity-70" />
          </button>

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
