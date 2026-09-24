import React from 'react';
import {
  Briefcase,
  Plus,
  ListPlus,
  Settings,
} from 'lucide-react';

interface AppHeaderProps {
  applicationsCount: number;
  filteredCount: number;
  onOpenSettings: (tab?: 'theme' | 'data' | 'email' | 'gemini') => void;
  onOpenAddModal: () => void;
  onOpenBatchAdd: () => void;
}

export const AppHeader: React.FC<AppHeaderProps> = ({
  applicationsCount,
  filteredCount,
  onOpenSettings,
  onOpenAddModal,
  onOpenBatchAdd,
}) => {
  return (
    <header className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-b border-slate-200 dark:border-slate-800 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-wrap items-center justify-between gap-3">
        {/* Brand logo & title */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
            <Briefcase className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-slate-900 dark:text-white leading-none">
                Job Tracker
              </h1>
              <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300">
                AI Powered
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Inteligentne śledzenie aplikacji rekrutacyjnych i ofert pracy
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Masowy import linków */}
          <button
            type="button"
            onClick={onOpenBatchAdd}
            className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <ListPlus className="w-3.5 h-3.5 text-indigo-500" />
            <span>Masowy import</span>
          </button>

          {/* Add single application */}
          <button
            type="button"
            onClick={onOpenAddModal}
            className="px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm shadow-blue-500/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Nowa aplikacja</span>
          </button>

          {/* Settings button - placed at the end */}
          <button
            type="button"
            onClick={() => onOpenSettings()}
            title="Ustawienia (motyw, import/eksport, poczta, Gemini AI)"
            className="px-3 py-2 rounded-xl text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-semibold border border-transparent hover:border-slate-300 dark:hover:border-slate-700"
          >
            <Settings className="w-4 h-4 text-slate-600 dark:text-slate-300" />
            <span>Ustawienia</span>
          </button>
        </div>
      </div>
    </header>
  );
};

