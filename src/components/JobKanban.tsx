import React, { useState, useRef } from 'react';
import { JobApplication, JobStatus } from '../types';
import {
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
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Plus,
  Sliders,
  CheckCircle,
  XCircle,
  ArrowRight,
  GripVertical,
  Columns,
} from 'lucide-react';

interface JobKanbanProps {
  applications: JobApplication[];
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onEdit: (app: JobApplication) => void;
  onDelete: (app: JobApplication) => void;
  onStatusChange: (id: string, newStatus: JobStatus) => void;
  onAddNewWithStatus?: (status: JobStatus) => void;
}

interface KanbanStage {
  id: string;
  label: string;
  shortLabel: string;
  statuses: JobStatus[];
  defaultStatus: JobStatus;
  accentClass: string;
  badgeBg: string;
  borderClass: string;
}

const KANBAN_STAGES: KanbanStage[] = [
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
    label: 'Zakończone / Odrzucone',
    shortLabel: 'Zakończone',
    statuses: ['Odrzucona', 'Zrezygnowano'],
    defaultStatus: 'Odrzucona',
    accentClass: 'text-rose-700 dark:text-rose-300',
    badgeBg: 'bg-rose-100 text-rose-800 dark:bg-rose-900/60 dark:text-rose-300',
    borderClass: 'border-rose-300/80 dark:border-rose-800/80',
  },
];

export const JobKanban: React.FC<JobKanbanProps> = ({
  applications,
  selectedIds,
  onToggleSelect,
  onEdit,
  onDelete,
  onStatusChange,
  onAddNewWithStatus,
}) => {
  const [density, setDensity] = useState<'normal' | 'compact'>('normal');
  const [collapsedStageIds, setCollapsedStageIds] = useState<string[]>([]);
  const [draggedAppId, setDraggedAppId] = useState<string | null>(null);
  const [dragOverStageId, setDragOverStageId] = useState<string | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Scroll helpers
  const handleScroll = (direction: 'left' | 'right') => {
    if (scrollContainerRef.current) {
      const offset = direction === 'left' ? -350 : 350;
      scrollContainerRef.current.scrollBy({ left: offset, behavior: 'smooth' });
    }
  };

  // Toggle stage collapsed
  const toggleCollapse = (stageId: string) => {
    setCollapsedStageIds((prev) =>
      prev.includes(stageId) ? prev.filter((id) => id !== stageId) : [...prev, stageId]
    );
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, id: string) => {
    e.dataTransfer.setData('text/plain', id);
    setDraggedAppId(id);
  };

  const handleDragOver = (e: React.DragEvent, stageId: string) => {
    e.preventDefault();
    if (dragOverStageId !== stageId) {
      setDragOverStageId(stageId);
    }
  };

  const handleDragLeave = () => {
    setDragOverStageId(null);
  };

  const handleDrop = (e: React.DragEvent, targetStatus: JobStatus) => {
    e.preventDefault();
    setDragOverStageId(null);
    const appId = e.dataTransfer.getData('text/plain') || draggedAppId;
    if (appId) {
      onStatusChange(appId, targetStatus);
    }
    setDraggedAppId(null);
  };

  // Stage shifting helpers
  const getStageIndex = (status: JobStatus) => {
    return KANBAN_STAGES.findIndex((s) => s.statuses.includes(status));
  };

  const handleMoveStage = (app: JobApplication, direction: 'prev' | 'next') => {
    const currentIndex = getStageIndex(app.status);
    if (currentIndex === -1) return;

    if (direction === 'prev' && currentIndex > 0) {
      const prevStage = KANBAN_STAGES[currentIndex - 1];
      onStatusChange(app.id, prevStage.defaultStatus);
    } else if (direction === 'next' && currentIndex < KANBAN_STAGES.length - 1) {
      const nextStage = KANBAN_STAGES[currentIndex + 1];
      onStatusChange(app.id, nextStage.defaultStatus);
    }
  };

  return (
    <div id="job-kanban-root" className="space-y-3.5">
      {/* Kanban Sub-Header & Scaling Controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl px-4 py-2.5 shadow-xs">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-200">
            <Columns className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            <span>Tablica rekrutacji</span>
          </div>
          <span className="text-slate-300 dark:text-slate-700">•</span>
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {applications.length} {applications.length === 1 ? 'oferta' : 'ofert'} w 6 etapach
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Density Toggle */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-0.5 rounded-lg border border-slate-200 dark:border-slate-700 text-xs">
            <button
              id="kanban-density-normal"
              onClick={() => setDensity('normal')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                density === 'normal'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Szczegółowy
            </button>
            <button
              id="kanban-density-compact"
              onClick={() => setDensity('compact')}
              className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
                density === 'compact'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-2xs'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Kompaktowy
            </button>
          </div>

          {/* Quick Horizontal Scroll Navigators */}
          <div className="flex items-center gap-1">
            <button
              id="kanban-scroll-left"
              onClick={() => handleScroll('left')}
              title="Przewiń kolumny w lewo"
              className="p-1.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              id="kanban-scroll-right"
              onClick={() => handleScroll('right')}
              title="Przewiń kolumny w prawo"
              className="p-1.5 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 rounded-lg transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Kanban Board Horizontal Track */}
      <div
        ref={scrollContainerRef}
        id="kanban-scroll-track"
        className="flex gap-4 overflow-x-auto pb-6 pt-1 items-start scrollbar-thin scroll-smooth min-h-[580px] w-full"
      >
        {KANBAN_STAGES.map((stage, sIdx) => {
          const stageApps = applications.filter((a) => stage.statuses.includes(a.status));
          const isCollapsed = collapsedStageIds.includes(stage.id);
          const isDragOver = dragOverStageId === stage.id;

          if (isCollapsed) {
            return (
              <div
                key={stage.id}
                onClick={() => toggleCollapse(stage.id)}
                className="w-14 shrink-0 bg-slate-100/90 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 hover:border-blue-400 rounded-2xl p-3 flex flex-col items-center justify-between min-h-[450px] cursor-pointer transition-all shadow-xs group"
                title={`Rozwiń kolumnę ${stage.label}`}
              >
                <div className="flex flex-col items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-700 dark:text-slate-200 flex items-center justify-center">
                    {stageApps.length}
                  </span>
                  <span
                    className="writing-mode-vertical text-xs font-semibold tracking-wider uppercase text-slate-500 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 rotate-180 py-4"
                    style={{ writingMode: 'vertical-rl' }}
                  >
                    {stage.shortLabel}
                  </span>
                </div>
                <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 -rotate-90" />
              </div>
            );
          }

          return (
            <div
              key={stage.id}
              id={`kanban-column-${stage.id}`}
              onDragOver={(e) => handleDragOver(e, stage.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, stage.defaultStatus)}
              className={`w-[310px] min-w-[280px] max-w-[340px] shrink-0 2xl:flex-1 rounded-2xl p-3 flex flex-col transition-all duration-200 shadow-xs border ${
                isDragOver
                  ? 'bg-blue-50/70 dark:bg-blue-950/40 border-dashed border-2 border-blue-500 ring-2 ring-blue-500/20'
                  : 'bg-slate-100/80 dark:bg-slate-900/70 border-slate-200/90 dark:border-slate-800/80'
              }`}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between pb-3 mb-2.5 border-b border-slate-200 dark:border-slate-800 shrink-0">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`text-xs font-bold uppercase tracking-wider truncate ${stage.accentClass}`}>
                    {stage.label}
                  </span>
                  <span
                    className={`px-2 py-0.5 text-xs font-semibold rounded-full border border-slate-200/80 dark:border-slate-700/80 ${stage.badgeBg}`}
                  >
                    {stageApps.length}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  {onAddNewWithStatus && (
                    <button
                      onClick={() => onAddNewWithStatus(stage.defaultStatus)}
                      title={`Dodaj nową ofertę ze statusem: ${stage.label}`}
                      className="p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-md hover:bg-white dark:hover:bg-slate-800 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  )}
                  <button
                    onClick={() => toggleCollapse(stage.id)}
                    title="Zwiń kolumnę"
                    className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-md hover:bg-white dark:hover:bg-slate-800 transition-colors"
                  >
                    <ChevronDown className="w-3.5 h-3.5 rotate-90" />
                  </button>
                </div>
              </div>

              {/* Cards Container */}
              <div className="space-y-2.5 flex-1 min-h-[350px]">
                {stageApps.length === 0 ? (
                  <div className="h-32 flex flex-col items-center justify-center p-4 text-center text-xs text-slate-400 dark:text-slate-500 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl bg-white/40 dark:bg-slate-800/20">
                    <span>Przeciągnij tutaj ofertę</span>
                    <span className="text-[10px] text-slate-400 dark:text-slate-600 mt-1">
                      lub zmień jej status
                    </span>
                  </div>
                ) : (
                  stageApps.map((app) => {
                    const isSelected = selectedIds.includes(app.id);
                    const portalStyle = getPortalBadgeStyle(app.portal);
                    const statusMeta = STATUS_CONFIG[app.status] || STATUS_CONFIG['Wysłana'];
                    const relativeDays = getRelativeDays(app.appliedDate);

                    return (
                      <div
                        key={app.id}
                        id={`kanban-card-${app.id}`}
                        draggable
                        onDragStart={(e) => handleDragStart(e, app.id)}
                        className={`bg-white dark:bg-slate-800/90 border rounded-xl shadow-2xs hover:shadow-md transition-all space-y-2 group cursor-grab active:cursor-grabbing relative select-none ${
                          isSelected
                            ? 'border-blue-500 ring-2 ring-blue-500/20 bg-blue-50/20 dark:bg-blue-950/30'
                            : 'border-slate-200 dark:border-slate-700/80 hover:border-slate-300 dark:hover:border-slate-600'
                        } ${density === 'compact' ? 'p-2.5' : 'p-3.5'}`}
                      >
                        {/* Top Bar: Checkbox, Portal & Date */}
                        <div className="flex items-center justify-between gap-1 text-[11px]">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <input
                              id={`kanban-select-${app.id}`}
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => onToggleSelect(app.id)}
                              onClick={(e) => e.stopPropagation()}
                              className="w-3.5 h-3.5 text-blue-600 rounded border-slate-300 dark:border-slate-600 dark:bg-slate-700 focus:ring-blue-500 cursor-pointer shrink-0"
                            />
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-medium border truncate ${portalStyle.bg} ${portalStyle.text} ${portalStyle.border}`}
                            >
                              {app.portal}
                            </span>
                          </div>
                          <span
                            className="text-slate-400 dark:text-slate-500 font-mono text-[10px] shrink-0"
                            title={relativeDays ? `Wysłano ${relativeDays}` : undefined}
                          >
                            {formatPolishDate(app.appliedDate)}
                          </span>
                        </div>

                        {/* Role & Company */}
                        <div>
                          <div className="flex items-start justify-between gap-1.5">
                            <h4
                              onClick={() => onEdit(app)}
                              className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-snug group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors cursor-pointer line-clamp-2"
                            >
                              {app.role}
                            </h4>
                            {app.url && (
                              <a
                                href={app.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                onClick={(e) => e.stopPropagation()}
                                className="text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 shrink-0 p-0.5"
                                title="Otwórz link do oferty"
                              >
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            )}
                          </div>
                          <p className="text-xs font-medium text-slate-600 dark:text-slate-300 mt-0.5 truncate">
                            {app.company}
                          </p>
                        </div>

                        {/* Detailed Mode Info: Location, Salary, Skills, Notes */}
                        {density === 'normal' && (
                          <>
                            {(app.location || app.salary) && (
                              <div className="space-y-0.5 text-[11px] pt-1 border-t border-slate-100 dark:border-slate-700/60">
                                {app.location && (
                                  <div className="flex items-center gap-1 text-slate-500 dark:text-slate-400">
                                    <MapPin className="w-3 h-3 shrink-0 text-slate-400 dark:text-slate-500" />
                                    <span className="truncate">{app.location}</span>
                                  </div>
                                )}
                                {app.salary && (
                                  <div className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-medium">
                                    <DollarSign className="w-3 h-3 shrink-0 text-emerald-500 dark:text-emerald-400" />
                                    <span className="truncate">{app.salary}</span>
                                  </div>
                                )}
                              </div>
                            )}

                            {/* Skills Chips */}
                            {app.skills && app.skills.length > 0 && (
                              <div className="flex flex-wrap gap-1 pt-0.5">
                                {app.skills.slice(0, 3).map((s) => (
                                  <span
                                    key={s}
                                    className="px-1.5 py-0.5 bg-slate-50 dark:bg-slate-700/50 border border-slate-200/80 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded text-[9px] font-medium"
                                  >
                                    {s}
                                  </span>
                                ))}
                                {app.skills.length > 3 && (
                                  <span className="text-[9px] text-slate-400 dark:text-slate-500 self-center">
                                    +{app.skills.length - 3}
                                  </span>
                                )}
                              </div>
                            )}
                          </>
                        )}

                        {/* Status Tag and Fast Stage Shift Controls */}
                        <div className="flex items-center justify-between pt-1.5 border-t border-slate-100 dark:border-slate-700/60 gap-1">
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusMeta.bg} ${statusMeta.text} ${statusMeta.border}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${statusMeta.dot}`} />
                            <span className="truncate max-w-[110px]">{app.status}</span>
                          </span>

                          {/* Quick stage transition arrows */}
                          <div className="flex items-center gap-0.5">
                            {sIdx > 0 && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMoveStage(app, 'prev');
                                }}
                                title={`Cofnij do etapu: ${KANBAN_STAGES[sIdx - 1].label}`}
                                className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                              >
                                <ChevronLeft className="w-3.5 h-3.5" />
                              </button>
                            )}

                            {sIdx < KANBAN_STAGES.length - 1 && (
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleMoveStage(app, 'next');
                                }}
                                title={`Przesuń do etapu: ${KANBAN_STAGES[sIdx + 1].label}`}
                                className="p-1 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded hover:bg-blue-50 dark:hover:bg-slate-700 transition-colors"
                              >
                                <ChevronRight className="w-3.5 h-3.5" />
                              </button>
                            )}

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onEdit(app);
                              }}
                              title="Edytuj ofertę"
                              className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onDelete(app);
                              }}
                              title="Usuń ofertę"
                              className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
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
    </div>
  );
};
