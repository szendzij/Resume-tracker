import React from 'react';
import { JobApplication, JobStatus } from '../types';
import { KANBAN_STAGES } from './kanban/kanbanConfig';
import { KanbanColumn } from './kanban/KanbanColumn';

interface JobKanbanProps {
  applications: JobApplication[];
  selectedIds?: string[];
  onToggleSelect?: (id: string) => void;
  onEdit: (app: JobApplication) => void;
  onDelete: (id: string, company: string) => void;
  onStatusChange: (id: string, newStatus: JobStatus) => void;
  onReAnalyzeWithAi?: (app: JobApplication) => void;
  onAddNewToStage?: (defaultStatus: JobStatus) => void;
}

export const JobKanban: React.FC<JobKanbanProps> = ({
  applications,
  selectedIds = [],
  onToggleSelect,
  onEdit,
  onDelete,
  onStatusChange,
  onReAnalyzeWithAi,
  onAddNewToStage,
}) => {
  return (
    <div className="flex gap-4 overflow-x-auto pb-4 pt-1 items-start min-h-[calc(100vh-280px)] scrollbar-thin">
      {KANBAN_STAGES.map((stage) => {
        const stageApps = applications.filter((app) =>
          stage.statuses.includes(app.status)
        );

        return (
          <KanbanColumn
            key={stage.id}
            stage={stage}
            applications={stageApps}
            selectedIds={selectedIds}
            onToggleSelect={onToggleSelect}
            onEdit={onEdit}
            onDelete={onDelete}
            onStatusChange={onStatusChange}
            onReAnalyzeWithAi={onReAnalyzeWithAi}
            onAddNewToStage={onAddNewToStage}
          />
        );
      })}
    </div>
  );
};
