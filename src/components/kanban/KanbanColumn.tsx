import React from 'react';
import { JobApplication, JobStatus } from '../../types';
import { KanbanStage } from './kanbanConfig';
import { KanbanCard } from './KanbanCard';
import { Plus } from 'lucide-react';

interface KanbanColumnProps {
  stage: KanbanStage;
  applications: JobApplication[];
  selectedIds: string[];
  onToggleSelect?: (id: string) => void;
  onEdit: (app: JobApplication) => void;
  onDelete: (id: string, company: string) => void;
  onStatusChange: (id: string, newStatus: JobStatus) => void;
  onReAnalyzeWithAi?: (app: JobApplication) => void;
  onAddNewToStage?: (defaultStatus: JobStatus) => void;
}

export const KanbanColumn: React.FC<KanbanColumnProps> = ({
  stage,
  applications,
  selectedIds,
  onToggleSelect,
  onEdit,
  onDelete,
  onStatusChange,
  onReAnalyzeWithAi,
  onAddNewToStage,
}) => {
  return (
    <div className="flex flex-col min-w-[280px] max-w-[320px] bg-slate-50 dark:bg-slate-900/60 rounded-2xl border border-slate-200/80 dark:border-slate-800 p-3 h-full shadow-2xs">
      {/* Column Header */}
      <div className="flex items-center justify-between gap-2 mb-3 px-1">
        <div className="flex items-center gap-2">
          <h3 className={`text-xs font-bold ${stage.accentClass}`}>
            {stage.label}
          </h3>
          <span
            className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${stage.badgeBg}`}
          >
            {applications.length}
          </span>
        </div>

        {onAddNewToStage && (
          <button
            type="button"
            onClick={() => onAddNewToStage(stage.defaultStatus)}
            title={`Dodaj aplikację do: ${stage.label}`}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800 cursor-pointer transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Cards List */}
      <div className="flex-1 space-y-2.5 overflow-y-auto pr-0.5 min-h-[300px]">
        {applications.length > 0 ? (
          applications.map((app) => (
            <KanbanCard
              key={app.id}
              app={app}
              isSelected={selectedIds.includes(app.id)}
              onToggleSelect={onToggleSelect}
              onEdit={onEdit}
              onDelete={onDelete}
              onStatusChange={onStatusChange}
              onReAnalyzeWithAi={onReAnalyzeWithAi}
            />
          ))
        ) : (
          <div className="h-32 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl flex items-center justify-center text-xs text-slate-400">
            Brak ofert
          </div>
        )}
      </div>
    </div>
  );
};
