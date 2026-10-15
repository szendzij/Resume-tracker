import React from 'react';
import { X } from 'lucide-react';

export interface ModalShellProps {
  title: string;
  onClose: () => void;
  children: React.ReactNode;
  icon?: React.ReactNode;
  subtitle?: string;
  panelClassName?: string;
}

const DEFAULT_PANEL_CLASS_NAME =
  'bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-3xl shadow-xl flex flex-col max-h-[90vh] overflow-hidden';

export const ModalShell: React.FC<ModalShellProps> = ({
  title,
  onClose,
  children,
  icon,
  subtitle,
  panelClassName = DEFAULT_PANEL_CLASS_NAME,
}) => (
  <div className={panelClassName}>
    <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-400 flex items-center justify-center">
          {icon}
        </div>
        <div>
          <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100">{title}</h3>
          {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
        </div>
      </div>

      <button
        type="button"
        onClick={onClose}
        className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
    {children}
  </div>
);
