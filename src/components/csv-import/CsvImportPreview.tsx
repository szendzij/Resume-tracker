import React from 'react';
import { ParsedCsvRow } from '../../services/csvImport.service';
import { STATUS_CONFIG, formatPolishDate } from '../../utils/statusConfig';
import { ExternalLink } from 'lucide-react';

interface CsvImportPreviewProps {
  items: ParsedCsvRow[];
  duplicateItems: ParsedCsvRow[];
  filteredItems: ParsedCsvRow[];
  previewFilter: 'all' | 'ready' | 'duplicates';
  onPreviewFilterChange: (filter: 'all' | 'ready' | 'duplicates') => void;
  skipDuplicates: boolean;
  selectedRowIds: Set<string>;
  onToggleRow: (id: string) => void;
  onSelectAllVisible: () => void;
  onDeselectAllVisible: () => void;
}

export const CsvImportPreview: React.FC<CsvImportPreviewProps> = ({
  items,
  duplicateItems,
  filteredItems,
  previewFilter,
  onPreviewFilterChange,
  skipDuplicates,
  selectedRowIds,
  onToggleRow,
  onSelectAllVisible,
  onDeselectAllVisible,
}) => {
  return (
    <div className="space-y-3">
      {/* Preview filters and controls */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => onPreviewFilterChange('all')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
              previewFilter === 'all'
                ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400'
            }`}
          >
            Wszystkie ({items.length})
          </button>

          <button
            type="button"
            onClick={() => onPreviewFilterChange('ready')}
            className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
              previewFilter === 'ready'
                ? 'bg-emerald-600 text-white'
                : 'bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800'
            }`}
          >
            Gotowe do dodania ({items.filter((i) => i.isValid && (!skipDuplicates || !i.isDuplicate)).length})
          </button>

          {duplicateItems.length > 0 && (
            <button
              type="button"
              onClick={() => onPreviewFilterChange('duplicates')}
              className={`px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-colors ${
                previewFilter === 'duplicates'
                  ? 'bg-amber-600 text-white'
                  : 'bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-800'
              }`}
            >
              Duplikaty ({duplicateItems.length})
            </button>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onSelectAllVisible}
            className="text-xs text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
          >
            Zaznacz widoczne
          </button>
          <span className="text-slate-300 dark:text-slate-700">•</span>
          <button
            type="button"
            onClick={onDeselectAllVisible}
            className="text-xs text-slate-500 hover:underline cursor-pointer"
          >
            Odznacz widoczne
          </button>
        </div>
      </div>

      {/* Items List */}
      <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-200 dark:divide-slate-800 max-h-72 overflow-y-auto">
        {filteredItems.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            Brak wierszy spełniających kryteria wybranego filtra.
          </div>
        ) : (
          filteredItems.map((item) => {
            const isSelected = selectedRowIds.has(item.id);
            const statusMeta = STATUS_CONFIG[item.status] || STATUS_CONFIG['Wysłana'];

            return (
              <div
                key={item.id}
                onClick={() => item.isValid && onToggleRow(item.id)}
                className={`p-3 text-xs flex items-center gap-3 transition-colors cursor-pointer ${
                  !item.isValid
                    ? 'bg-rose-50/50 dark:bg-rose-950/20 opacity-75'
                    : isSelected
                    ? 'bg-blue-50/50 dark:bg-blue-950/20'
                    : 'hover:bg-slate-50 dark:hover:bg-slate-800/50'
                }`}
              >
                {/* Checkbox */}
                <input
                  type="checkbox"
                  checked={isSelected}
                  disabled={!item.isValid}
                  onChange={(e) => {
                    e.stopPropagation();
                    onToggleRow(item.id);
                  }}
                  className="w-4 h-4 rounded text-blue-600 focus:ring-blue-500 border-slate-300 dark:border-slate-700 cursor-pointer shrink-0"
                />

                {/* Details */}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-slate-900 dark:text-slate-100 truncate max-w-[200px] sm:max-w-xs">
                      {item.role}
                    </span>
                    <span className="text-slate-400">•</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300 truncate">
                      {item.company}
                    </span>
                    <span className="text-slate-400">•</span>
                    <span className="text-[11px] text-slate-500 truncate">
                      {item.portal}
                    </span>

                    {item.isDuplicate && (
                      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 text-[10px] font-bold border border-amber-200 dark:border-amber-800 flex-wrap">
                        <span>⚠️ {item.duplicateReason || 'Duplikat'}</span>
                        {item.duplicateFields && item.duplicateFields.map((f) => (
                          <span key={f} className="px-1 py-0.2 rounded bg-amber-200 dark:bg-amber-900/90 text-amber-950 dark:text-amber-200 text-[9px] font-semibold">
                            {f === 'url' && 'Link'}
                            {f === 'company' && 'Firma'}
                            {f === 'role' && 'Stanowisko'}
                            {f === 'portal' && 'Portal'}
                            {f === 'appliedDate' && 'Data'}
                            {f === 'location' && 'Lokalizacja'}
                          </span>
                        ))}
                      </span>
                    )}

                    {!item.isValid && (
                      <span className="px-1.5 py-0.5 rounded bg-rose-100 dark:bg-rose-950/80 text-rose-800 dark:text-rose-300 text-[10px] font-bold">
                        {item.validationError}
                      </span>
                    )}
                  </div>

                  <div className="flex flex-wrap items-center gap-3 mt-1 text-[11px] text-slate-500 dark:text-slate-400">
                    <span>Data: {formatPolishDate(item.appliedDate)}</span>
                    {item.location && <span>📍 {item.location}</span>}
                    {item.salary && <span className="font-medium text-emerald-600 dark:text-emerald-400">💰 {item.salary}</span>}
                    {item.skills.length > 0 && (
                      <span className="truncate max-w-[200px]">
                        🛠️ {item.skills.join(', ')}
                      </span>
                    )}
                    {item.url && (
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="text-blue-500 hover:underline flex items-center gap-0.5"
                      >
                        Link <ExternalLink className="w-2.5 h-2.5" />
                      </a>
                    )}
                  </div>
                </div>

                {/* Status Badge */}
                <div className="shrink-0">
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${statusMeta.badgeClass}`}
                  >
                    {item.status}
                  </span>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
