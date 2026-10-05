import React from 'react';
import { ExternalLink, Edit2, Trash2, Sparkles } from 'lucide-react';
import { JobApplication } from '../../types';

export interface JobActionButtonsProps {
  app: JobApplication;
  onEdit: (app: JobApplication) => void;
  onDelete: (app: JobApplication) => void;
  onReAnalyze?: (app: JobApplication) => void;
  showExternalLink?: boolean;
  size?: 'sm' | 'md';
  className?: string;
}

export const JobActionButtons: React.FC<JobActionButtonsProps> = ({
  app,
  onEdit,
  onDelete,
  onReAnalyze,
  showExternalLink = true,
  size = 'md',
  className = '',
}) => {
  const iconSizeClass = size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5';
  const btnPadClass = size === 'sm' ? 'p-1' : 'p-1.5';

  return (
    <div className={`flex items-center gap-1 ${className}`}>
      {/* AI Re-Analyze */}
      {onReAnalyze && app.url && (
        <button
          type="button"
          id={`reanalyze-btn-${app.id}`}
          onClick={() => onReAnalyze(app)}
          title="Odśwież dane oferty przez AI Gemini"
          className={`${btnPadClass} text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer`}
        >
          <Sparkles className={iconSizeClass} />
        </button>
      )}

      {/* External Link */}
      {showExternalLink && app.url && (
        <a
          href={app.url}
          target="_blank"
          rel="noopener noreferrer"
          title="Otwórz link do oferty"
          className={`${btnPadClass} text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors inline-flex items-center cursor-pointer`}
        >
          <ExternalLink className={iconSizeClass} />
        </a>
      )}

      {/* Edit button */}
      <button
        type="button"
        id={`edit-btn-${app.id}`}
        onClick={() => onEdit(app)}
        title="Edytuj ofertę"
        className={`${btnPadClass} text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer`}
      >
        <Edit2 className={iconSizeClass} />
      </button>

      {/* Delete button */}
      <button
        type="button"
        id={`delete-btn-${app.id}`}
        onClick={() => onDelete(app)}
        title="Usuń ofertę"
        className={`${btnPadClass} text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer`}
      >
        <Trash2 className={iconSizeClass} />
      </button>
    </div>
  );
};
