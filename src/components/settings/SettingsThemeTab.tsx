import React from 'react';
import { Sun, Moon, Check } from 'lucide-react';

interface SettingsThemeTabProps {
  isDark: boolean;
  onSetTheme: (theme: 'light' | 'dark') => void;
}

export const SettingsThemeTab: React.FC<SettingsThemeTabProps> = ({ isDark, onSetTheme }) => (
  <div className="space-y-6 animate-in fade-in duration-150">
    <div>
      <h4 className="text-sm font-bold text-slate-900 dark:text-slate-100">
        Wybierz motyw interfejsu
      </h4>
      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
        Dostosuj kolorystykę aplikacji do swoich preferencji lub warunków oświetlenia.
      </p>
    </div>

    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {/* Light Mode Card */}
      <button
        type="button"
        onClick={() => onSetTheme('light')}
        className={`p-4 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
          !isDark
            ? 'border-blue-600 ring-2 ring-blue-500/20 bg-blue-50/40 dark:bg-blue-950/20'
            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800/40'
        }`}
      >
        <div className="flex items-center justify-between w-full mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-600 flex items-center justify-center">
              <Sun className="w-4 h-4" />
            </div>
            <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Tryb jasny
            </span>
          </div>
          {!isDark && (
            <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center">
              <Check className="w-3 h-3 stroke-[3]" />
            </span>
          )}
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Czysty, jasny wygląd o wysokim kontraście do pracy w ciągu dnia.
        </p>
      </button>

      {/* Dark Mode Card */}
      <button
        type="button"
        onClick={() => onSetTheme('dark')}
        className={`p-4 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
          isDark
            ? 'border-blue-600 ring-2 ring-blue-500/20 bg-blue-950/20'
            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-800/40'
        }`}
      >
        <div className="flex items-center justify-between w-full mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-indigo-900/60 text-indigo-300 flex items-center justify-center">
              <Moon className="w-4 h-4" />
            </div>
            <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
              Tryb ciemny
            </span>
          </div>
          {isDark && (
            <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center">
              <Check className="w-3 h-3 stroke-[3]" />
            </span>
          )}
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Elegancki ciemny motyw łagodny dla oczu podczas wieczornej pracy.
        </p>
      </button>
    </div>
  </div>
);
