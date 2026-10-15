import React from 'react';
import { Sun, Moon, Database, Mail, Sparkles } from 'lucide-react';
import { SettingsTab } from './types';

interface SettingsTabNavProps {
  activeTab: SettingsTab;
  onSelectTab: (tab: SettingsTab) => void;
  isDark: boolean;
  hasConnectedEmail: boolean;
  hasCustomKey: boolean;
}

export const SettingsTabNav: React.FC<SettingsTabNavProps> = ({
  activeTab,
  onSelectTab,
  isDark,
  hasConnectedEmail,
  hasCustomKey,
}) => (
  <div className="px-6 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2 sm:gap-6 text-xs font-semibold overflow-x-auto">
    <button
      type="button"
      onClick={() => onSelectTab('theme')}
      className={`py-3 flex items-center gap-1.5 border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
        activeTab === 'theme'
          ? 'border-blue-600 text-blue-600 dark:text-blue-400'
          : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
      }`}
    >
      {isDark ? <Moon className="w-3.5 h-3.5" /> : <Sun className="w-3.5 h-3.5" />}
      <span>Wygląd i motyw</span>
    </button>

    <button
      type="button"
      onClick={() => onSelectTab('data')}
      className={`py-3 flex items-center gap-1.5 border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
        activeTab === 'data'
          ? 'border-blue-600 text-blue-600 dark:text-blue-400'
          : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
      }`}
    >
      <Database className="w-3.5 h-3.5" />
      <span>Import i eksport danych</span>
    </button>

    <button
      type="button"
      onClick={() => onSelectTab('email')}
      className={`py-3 flex items-center gap-1.5 border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
        activeTab === 'email'
          ? 'border-blue-600 text-blue-600 dark:text-blue-400'
          : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
      }`}
    >
      <Mail className="w-3.5 h-3.5" />
      <span>Sync poczty</span>
      {hasConnectedEmail && (
        <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
      )}
    </button>

    <button
      type="button"
      onClick={() => onSelectTab('gemini')}
      className={`py-3 flex items-center gap-1.5 border-b-2 whitespace-nowrap transition-colors cursor-pointer ${
        activeTab === 'gemini'
          ? 'border-blue-600 text-blue-600 dark:text-blue-400'
          : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-slate-300'
      }`}
    >
      <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
      <span>Klucz Gemini AI</span>
      {hasCustomKey && (
        <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 font-bold">
          Własny
        </span>
      )}
    </button>
  </div>
);
