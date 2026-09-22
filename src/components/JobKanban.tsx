import React from 'react';
import { JobApplication, JobStatus } from '../types';
import { formatPolishDate, getPortalBadgeStyle, getRelativeDays, STATUS_CONFIG } from '../utils/statusConfig';
import { ExternalLink, Edit2, Trash2, MapPin, DollarSign, ChevronRight, ChevronLeft } from 'lucide-react';

interface JobKanbanProps {
  applications: JobApplication[];
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onEdit: (app: JobApplication) => void;
  onDelete: (app: JobApplication) => void;
  onStatusChange: (id: string, newStatus: JobStatus) => void;
}

const KANBAN_STAGES: { id: string; label: string; statuses: JobStatus[]; color: string }[] = [
  { id: 'sent', label: 'Wysłane CV', statuses: ['Wysłana'], color: 'border-blue-300 text-blue-800' },
  { id: 'review', label: 'Weryfikacja CV', statuses: ['Weryfikacja CV'], color: 'border-purple-300 text-purple-800' },
  { id: 'interviews', label: 'Rozmowy (HR / Tech)', statuses: ['Rozmowa HR', 'Rozmowa techniczna'], color: 'border-amber-300 text-amber-800' },
  { id: 'tasks', label: 'Zadania rekrutacyjne', statuses: ['Zadanie rekrutacyjne'], color: 'border-cyan-300 text-cyan-800' },
  { id: 'offers', label: 'Oferty pracy 🎉', statuses: ['Oferta'], color: 'border-emerald-300 text-emerald-800' },
  { id: 'rejected', label: 'Zakończone / Odrzucone', statuses: ['Odrzucona', 'Zrezygnowano'], color: 'border-rose-300 text-rose-800' },
];

export const JobKanban: React.FC<JobKanbanProps> = ({
  applications,
  selectedIds,
  onToggleSelect,
  onEdit,
  onDelete,
  onStatusChange,
}) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4 items-start overflow-x-auto pb-4">
      {KANBAN_STAGES.map((stage) => {
        const stageApps = applications.filter((a) => stage.statuses.includes(a.status));

        return (
          <div
            key={stage.id}
            id={`kanban-column-${stage.id}`}
            className="bg-slate-100/80 border border-slate-200/90 rounded-xl p-3 flex flex-col min-w-[260px]"
          >
            {/* Column Header */}
            <div className="flex items-center justify-between pb-2.5 mb-2.5 border-b border-slate-200">
              <span className={`text-xs font-bold uppercase tracking-wider ${stage.color}`}>
                {stage.label}
              </span>
              <span className="px-2 py-0.5 bg-white border border-slate-200 text-slate-700 text-xs font-semibold rounded-full">
                {stageApps.length}
              </span>
            </div>

            {/* Cards */}
            <div className="space-y-2.5 flex-1 min-h-[120px]">
              {stageApps.length === 0 ? (
                <div className="p-4 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-lg">
                  Brak aplikacji w tym etapie
                </div>
              ) : (
                stageApps.map((app) => {
                  const isSelected = selectedIds.includes(app.id);
                  const portalStyle = getPortalBadgeStyle(app.portal);
                  const statusMeta = STATUS_CONFIG[app.status];

                  return (
                    <div
                      key={app.id}
                      id={`kanban-card-${app.id}`}
                      className={`bg-white border rounded-xl p-3.5 shadow-2xs hover:shadow-xs transition-all space-y-2 group ${
                        isSelected
                          ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/15'
                          : 'border-slate-200'
                      }`}
                    >
                      {/* Top Bar: Checkbox, Portal & Date */}
                      <div className="flex items-center justify-between gap-1 text-[11px]">
                        <div className="flex items-center gap-1.5">
                          <input
                            id={`kanban-select-${app.id}`}
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => onToggleSelect(app.id)}
                            className="w-3.5 h-3.5 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                          />
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-medium border ${portalStyle.bg} ${portalStyle.text} ${portalStyle.border}`}
                          >
                            {app.portal}
                          </span>
                        </div>
                        <span className="text-slate-400 font-mono text-[10px]">
                          {formatPolishDate(app.appliedDate)}
                        </span>
                      </div>

                      {/* Role & Company */}
                      <div>
                        <div className="flex items-start justify-between gap-1">
                          <h4 className="text-xs font-bold text-slate-900 leading-snug group-hover:text-blue-600 transition-colors">
                            {app.role}
                          </h4>
                          {app.url && (
                            <a
                              href={app.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-slate-400 hover:text-blue-600 shrink-0 p-0.5"
                              title="Otwórz link"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                        <p className="text-xs font-medium text-slate-600 mt-0.5">{app.company}</p>
                      </div>

                      {/* Location & Salary */}
                      {(app.location || app.salary) && (
                        <div className="space-y-0.5 text-[11px] pt-1 border-t border-slate-100">
                          {app.location && (
                            <div className="flex items-center gap-1 text-slate-500">
                              <MapPin className="w-3 h-3 shrink-0 text-slate-400" />
                              <span className="truncate">{app.location}</span>
                            </div>
                          )}
                          {app.salary && (
                            <div className="flex items-center gap-1 text-emerald-700 font-medium">
                              <DollarSign className="w-3 h-3 shrink-0 text-emerald-500" />
                              <span className="truncate">{app.salary}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Skills Chips */}
                      {app.skills && app.skills.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {app.skills.slice(0, 2).map((s) => (
                            <span
                              key={s}
                              className="px-1.5 py-0.5 bg-slate-50 border border-slate-200 text-slate-600 rounded text-[9px] font-medium"
                            >
                              {s}
                            </span>
                          ))}
                          {app.skills.length > 2 && (
                            <span className="text-[9px] text-slate-400 self-center">
                              +{app.skills.length - 2}
                            </span>
                          )}
                        </div>
                      )}

                      {/* Status Tag and Stage shift buttons */}
                      <div className="flex items-center justify-between pt-1.5 border-t border-slate-100">
                        <span
                          className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusMeta.bg} ${statusMeta.text} ${statusMeta.border}`}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full ${statusMeta.dot}`} />
                          {app.status}
                        </span>

                        <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                          <button
                            onClick={() => onEdit(app)}
                            title="Edytuj"
                            className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100"
                          >
                            <Edit2 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => onDelete(app)}
                            title="Usuń"
                            className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
