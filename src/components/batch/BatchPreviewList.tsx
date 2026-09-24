import React from 'react';
import { ParsedLinkItem } from '../../utils/linkParser';
import { BatchPreviewItem } from './BatchPreviewItem';
import { CheckCircle2, AlertTriangle, ListFilter } from 'lucide-react';

interface BatchPreviewListProps {
  items: ParsedLinkItem[];
  totalDetected: number;
  uniqueCount: number;
  duplicateCount: number;
  filterMode: 'all' | 'unique' | 'duplicates';
  onFilterChange: (mode: 'all' | 'unique' | 'duplicates') => void;
  onUpdateItem: (id: string, updates: Partial<ParsedLinkItem>) => void;
}

export const BatchPreviewList: React.FC<BatchPreviewListProps> = ({
  items,
  totalDetected,
  uniqueCount,
  duplicateCount,
  filterMode,
  onFilterChange,
  onUpdateItem,
}) => {
  if (totalDetected === 0) return null;

  return (
    <div className="space-y-3">
      {/* Metrics Bar & Filter Pills */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
        <div className="flex items-center gap-3 text-xs text-slate-600 dark:text-slate-400">
          <span>
            Wykryto linków: <strong className="text-slate-900 dark:text-slate-100">{totalDetected}</strong>
          </span>
          <span className="text-emerald-600 dark:text-emerald-400 font-medium">
            • Unikalnych: {uniqueCount}
          </span>
          {duplicateCount > 0 && (
            <span className="text-amber-600 dark:text-amber-400 font-medium">
              • Duplikatów: {duplicateCount}
            </span>
          )}
        </div>

        {/* Filter buttons */}
        <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-lg">
          <button
            type="button"
            onClick={() => onFilterChange('all')}
            className={`px-2.5 py-1 text-xs rounded font-medium cursor-pointer transition-colors ${
              filterMode === 'all'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-2xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Wszystkie ({totalDetected})
          </button>
          <button
            type="button"
            onClick={() => onFilterChange('unique')}
            className={`px-2.5 py-1 text-xs rounded font-medium cursor-pointer transition-colors ${
              filterMode === 'unique'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-100 shadow-2xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
            }`}
          >
            Unikalne ({uniqueCount})
          </button>
          {duplicateCount > 0 && (
            <button
              type="button"
              onClick={() => onFilterChange('duplicates')}
              className={`px-2.5 py-1 text-xs rounded font-medium cursor-pointer transition-colors ${
                filterMode === 'duplicates'
                  ? 'bg-white dark:bg-slate-700 text-amber-600 dark:text-amber-400 shadow-2xs'
                : 'text-slate-500 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              Duplikaty ({duplicateCount})
            </button>
          )}
        </div>
      </div>

      {/* Item cards */}
      <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
        {items.map((item, idx) => (
          <BatchPreviewItem
            key={item.id}
            item={item}
            index={idx}
            onUpdate={onUpdateItem}
          />
        ))}
      </div>
    </div>
  );
};
