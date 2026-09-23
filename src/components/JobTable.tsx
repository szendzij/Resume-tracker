import React from 'react';
import { JobApplication, JobStatus, SortOption } from '../types';
import {
  ALL_STATUSES,
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
  Sparkles,
  Building2,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
} from 'lucide-react';

interface JobTableProps {
  applications: JobApplication[];
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onSelectAllVisible: () => void;
  onDeselectAll: () => void;
  onEdit: (app: JobApplication) => void;
  onDelete: (app: JobApplication) => void;
  onStatusChange: (id: string, newStatus: JobStatus) => void;
  onReAnalyze: (app: JobApplication) => void;
  sortBy: SortOption;
  onSortChange: (newSort: SortOption) => void;
}

export const JobTable: React.FC<JobTableProps> = ({
  applications,
  selectedIds,
  onToggleSelect,
  onSelectAllVisible,
  onDeselectAll,
  onEdit,
  onDelete,
  onStatusChange,
  onReAnalyze,
  sortBy,
  onSortChange,
}) => {
  const allVisibleSelected =
    applications.length > 0 &&
    applications.every((app) => selectedIds.includes(app.id));
  const someVisibleSelected =
    applications.some((app) => selectedIds.includes(app.id)) && !allVisibleSelected;

  const renderSortHeader = (
    label: string,
    field: 'appliedDate' | 'role' | 'company' | 'portal' | 'status' | 'location'
  ) => {
    const isAsc = sortBy === `${field}Asc`;
    const isDesc = sortBy === `${field}Desc`;
    const isActive = isAsc || isDesc;

    const handleClick = () => {
      if (field === 'appliedDate') {
        if (isDesc) {
          onSortChange('appliedDateAsc');
        } else {
          onSortChange('appliedDateDesc');
        }
        return;
      }

      if (isAsc) {
        onSortChange(`${field}Desc` as SortOption);
      } else {
        onSortChange(`${field}Asc` as SortOption);
      }
    };

    return (
      <button
        type="button"
        id={`sort-header-${field}`}
        onClick={handleClick}
        title={`Sortuj po: ${label} (${
          isActive ? (isAsc ? 'rosnąco, kliknij by odwrócić' : 'malejąco, kliknij by odwrócić') : 'kliknij aby posortować'
        })`}
        className={`inline-flex items-center gap-1 group py-1 px-1.5 -mx-1.5 rounded-md transition-colors cursor-pointer select-none text-left ${
          isActive
            ? 'text-blue-600 dark:text-blue-400 bg-blue-50/90 dark:bg-blue-950/60 font-bold shadow-2xs'
            : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800/60 font-semibold'
        }`}
      >
        <span>{label}</span>
        {isActive ? (
          isAsc ? (
            <ArrowUp className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
          ) : (
            <ArrowDown className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400 shrink-0" />
          )
        ) : (
          <ArrowUpDown className="w-3 h-3 text-slate-400 dark:text-slate-500 opacity-40 group-hover:opacity-100 transition-opacity shrink-0" />
        )}
      </button>
    );
  };

  if (applications.length === 0) {
    return (
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-12 text-center shadow-xs">
        <Building2 className="w-12 h-12 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
        <h3 className="text-base font-semibold text-slate-800 dark:text-slate-200">
          Brak aplikacji spełniających kryteria
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 max-w-sm mx-auto">
          Spróbuj zresetować aktywne filtry wyszukiwania, statusu lub daty, albo dodaj nową ofertę pracy.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/80 dark:bg-slate-800/60 border-b border-slate-200 dark:border-slate-800 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              <th className="py-3 px-3 w-10 text-center">
                <input
                  id="select-all-visible-checkbox"
                  type="checkbox"
                  checked={allVisibleSelected}
                  ref={(input) => {
                    if (input) input.indeterminate = someVisibleSelected;
                  }}
                  onChange={() => {
                    if (allVisibleSelected) {
                      onDeselectAll();
                    } else {
                      onSelectAllVisible();
                    }
                  }}
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 dark:border-slate-600 dark:bg-slate-700 focus:ring-blue-500 cursor-pointer"
                  title={allVisibleSelected ? 'Odznacz wszystkie' : 'Zaznacz wszystkie widoczne'}
                />
              </th>
              <th className="py-3 px-4">
                <div className="flex items-center gap-1.5 flex-wrap">
                  {renderSortHeader('Stanowisko', 'role')}
                  <span className="text-slate-300 dark:text-slate-600 font-normal">/</span>
                  {renderSortHeader('Firma', 'company')}
                </div>
              </th>
              <th className="py-3 px-4">
                {renderSortHeader('Portal', 'portal')}
              </th>
              <th className="py-3 px-4 whitespace-nowrap">
                {renderSortHeader('Data wysłania', 'appliedDate')}
              </th>
              <th className="py-3 px-4 whitespace-nowrap">
                {renderSortHeader('Status', 'status')}
              </th>
              <th className="py-3 px-4">
                {renderSortHeader('Lokalizacja', 'location')}
              </th>
              <th className="py-3 px-4">Technologie / Notatki</th>
              <th className="py-3 px-4 text-right">Akcje</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800 text-xs text-slate-700 dark:text-slate-300">
            {applications.map((app) => {
              const isSelected = selectedIds.includes(app.id);
              const statusMeta = STATUS_CONFIG[app.status] || STATUS_CONFIG['Wysłana'];
              const portalStyle = getPortalBadgeStyle(app.portal);
              const relativeTime = getRelativeDays(app.appliedDate);

              return (
                <tr
                  key={app.id}
                  id={`job-row-${app.id}`}
                  className={`hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors ${
                    isSelected ? 'bg-blue-50/40 dark:bg-blue-950/20' : ''
                  }`}
                >
                  {/* Select Checkbox */}
                  <td className="py-3 px-3 text-center">
                    <input
                      id={`select-row-${app.id}`}
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggleSelect(app.id)}
                      className="w-4 h-4 text-blue-600 rounded border-slate-300 dark:border-slate-600 dark:bg-slate-700 focus:ring-blue-500 cursor-pointer"
                    />
                  </td>

                  {/* Role & Company */}
                  <td className="py-3 px-4">
                    <div className="font-semibold text-slate-900 dark:text-slate-100 flex items-center gap-1.5 group">
                      <span
                        onClick={() => onEdit(app)}
                        className="cursor-pointer hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                      >
                        {app.role}
                      </span>
                      {app.url && (
                        <a
                          href={app.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 p-0.5 inline-flex"
                          title="Otwórz oryginalne ogłoszenie"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      )}
                    </div>
                    <div className="text-slate-500 dark:text-slate-400 font-medium text-[11px] mt-0.5">
                      {app.company}
                    </div>
                  </td>

                  {/* Portal */}
                  <td className="py-3 px-4">
                    <span
                      className={`inline-block px-2 py-0.5 rounded-md text-[11px] font-medium border ${portalStyle.bg} ${portalStyle.text} ${portalStyle.border}`}
                    >
                      {app.portal}
                    </span>
                  </td>

                  {/* Applied Date */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    <div className="font-mono text-slate-800 dark:text-slate-200">
                      {formatPolishDate(app.appliedDate)}
                    </div>
                    {relativeTime && (
                      <div className="text-[10px] text-slate-400 dark:text-slate-500">{relativeTime}</div>
                    )}
                  </td>

                  {/* Status Dropdown */}
                  <td className="py-3 px-4 whitespace-nowrap">
                    <select
                      id={`status-select-${app.id}`}
                      value={app.status}
                      onChange={(e) => onStatusChange(app.id, e.target.value as JobStatus)}
                      className={`px-2 py-1 rounded-md text-xs font-semibold border cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 ${statusMeta.bg} ${statusMeta.text} ${statusMeta.border}`}
                    >
                      {ALL_STATUSES.map((st) => (
                        <option key={st} value={st} className="bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-normal">
                          {st}
                        </option>
                      ))}
                    </select>
                  </td>

                  {/* Location & Salary */}
                  <td className="py-3 px-4">
                    {app.location ? (
                      <div className="flex items-center gap-1 text-slate-600 dark:text-slate-300">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{app.location}</span>
                      </div>
                    ) : (
                      <span className="text-slate-400 dark:text-slate-600 text-[11px]">-</span>
                    )}
                    {app.salary && (
                      <div className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-medium text-[11px] mt-0.5">
                        <DollarSign className="w-3 h-3 text-emerald-500 shrink-0" />
                        <span>{app.salary}</span>
                      </div>
                    )}
                  </td>

                  {/* Skills / Notes */}
                  <td className="py-3 px-4 max-w-xs">
                    {app.skills && app.skills.length > 0 && (
                      <div className="flex flex-wrap gap-1 mb-1">
                        {app.skills.slice(0, 3).map((s) => (
                          <span
                            key={s}
                            className="px-1.5 py-0.5 bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 rounded text-[10px] font-medium"
                          >
                            {s}
                          </span>
                        ))}
                        {app.skills.length > 3 && (
                          <span className="text-[10px] text-slate-400 dark:text-slate-500 self-center">
                            +{app.skills.length - 3}
                          </span>
                        )}
                      </div>
                    )}
                    {app.notes && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate" title={app.notes}>
                        {app.notes}
                      </p>
                    )}
                  </td>

                  {/* Actions */}
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      {app.url && (
                        <button
                          id={`reanalyze-btn-${app.id}`}
                          onClick={() => onReAnalyze(app)}
                          title="Odśwież dane oferty przez AI Gemini"
                          className="p-1.5 text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        id={`edit-btn-${app.id}`}
                        onClick={() => onEdit(app)}
                        title="Edytuj"
                        className="p-1.5 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors cursor-pointer"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        id={`delete-btn-${app.id}`}
                        onClick={() => onDelete(app)}
                        title="Usuń"
                        className="p-1.5 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
};
