import React from 'react';
import { JobApplication, JobStatus } from '../types';
import { ALL_STATUSES, formatPolishDate, getPortalBadgeStyle, getRelativeDays, STATUS_CONFIG } from '../utils/statusConfig';
import { ExternalLink, Edit2, Trash2, MapPin, DollarSign, Sparkles, Building2 } from 'lucide-react';

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
}) => {
  const allVisibleSelected =
    applications.length > 0 &&
    applications.every((app) => selectedIds.includes(app.id));
  const someVisibleSelected =
    applications.some((app) => selectedIds.includes(app.id)) && !allVisibleSelected;

  if (applications.length === 0) {
    return (
      <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center shadow-xs">
        <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
        <h3 className="text-base font-semibold text-slate-800">Brak aplikacji spełniających kryteria</h3>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          Spróbuj zresetować aktywne filtry wyszukiwania, statusu lub daty, albo dodaj nową ofertę pracy.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white border border-slate-200 rounded-2xl shadow-xs overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
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
                  className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                  title={allVisibleSelected ? 'Odznacz wszystkie' : 'Zaznacz wszystkie widoczne'}
                />
              </th>
              <th className="py-3 px-4">Stanowisko & Firma</th>
              <th className="py-3 px-4">Portal</th>
              <th className="py-3 px-4">Data wysłania CV</th>
              <th className="py-3 px-4">Status rekrutacji</th>
              <th className="py-3 px-4">Lokalizacja / Widełki</th>
              <th className="py-3 px-4">Technologie / Notatki</th>
              <th className="py-3 px-4 text-right">Akcje</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 text-xs text-slate-700">
            {applications.map((app) => {
              const isSelected = selectedIds.includes(app.id);
              const statusMeta = STATUS_CONFIG[app.status] || STATUS_CONFIG['Wysłana'];
              const portalStyle = getPortalBadgeStyle(app.portal);
              const relativeTime = getRelativeDays(app.appliedDate);

              return (
                <tr
                  key={app.id}
                  id={`job-row-${app.id}`}
                  className={`transition-colors group ${
                    isSelected ? 'bg-blue-50/70 border-l-3 border-l-blue-600' : 'hover:bg-slate-50/60'
                  }`}
                >
                  {/* Select checkbox */}
                  <td className="py-3.5 px-3 w-10 text-center">
                    <input
                      id={`select-job-${app.id}`}
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => onToggleSelect(app.id)}
                      className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500 cursor-pointer"
                    />
                  </td>

                  {/* Role & Company */}
                  <td className="py-3.5 px-4">
                    <div className="flex flex-col">
                      <div className="flex items-center gap-1.5">
                        <span className="font-semibold text-slate-900 group-hover:text-blue-600 transition-colors">
                          {app.role}
                        </span>
                        {app.url && (
                          <a
                            href={app.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-slate-400 hover:text-blue-600 p-0.5 rounded transition-colors inline-flex"
                            title="Otwórz oryginalną ofertę w nowej karcie"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </a>
                        )}
                      </div>
                      <span className="text-slate-500 font-medium">{app.company}</span>
                    </div>
                  </td>

                  {/* Portal */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border ${portalStyle.bg} ${portalStyle.text} ${portalStyle.border}`}
                    >
                      {app.portal}
                    </span>
                  </td>

                  {/* Applied Date */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <div className="flex flex-col">
                      <span className="font-medium text-slate-800 font-mono">
                        {formatPolishDate(app.appliedDate)}
                      </span>
                      {relativeTime && (
                        <span className="text-[11px] text-slate-400">{relativeTime}</span>
                      )}
                    </div>
                  </td>

                  {/* Status with inline quick dropdown */}
                  <td className="py-3.5 px-4 whitespace-nowrap">
                    <div className="relative inline-block">
                      <select
                        value={app.status}
                        onChange={(e) => onStatusChange(app.id, e.target.value as JobStatus)}
                        className={`appearance-none text-xs font-semibold py-1 pl-2.5 pr-6 rounded-full border cursor-pointer transition-all focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 ${statusMeta.bg} ${statusMeta.text} ${statusMeta.border}`}
                      >
                        {ALL_STATUSES.map((st) => (
                          <option key={st} value={st} className="bg-white text-slate-800 font-normal">
                            {st}
                          </option>
                        ))}
                      </select>
                      <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                        <span className={`w-1.5 h-1.5 rounded-full ${statusMeta.dot}`} />
                      </div>
                    </div>
                  </td>

                  {/* Location & Salary */}
                  <td className="py-3.5 px-4">
                    <div className="flex flex-col gap-0.5">
                      {app.location && (
                        <span className="inline-flex items-center gap-1 text-[11px] text-slate-600">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate max-w-[140px]">{app.location}</span>
                        </span>
                      )}
                      {app.salary && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-700">
                          <DollarSign className="w-3 h-3 text-emerald-500 shrink-0" />
                          <span className="truncate max-w-[140px]">{app.salary}</span>
                        </span>
                      )}
                      {!app.location && !app.salary && (
                        <span className="text-slate-300 text-[11px]">-</span>
                      )}
                    </div>
                  </td>

                  {/* Skills & Notes */}
                  <td className="py-3.5 px-4 max-w-xs">
                    <div className="space-y-1">
                      {app.skills && app.skills.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {app.skills.slice(0, 3).map((sk) => (
                            <span
                              key={sk}
                              className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] font-medium"
                            >
                              {sk}
                            </span>
                          ))}
                          {app.skills.length > 3 && (
                            <span className="text-[10px] text-slate-400">
                              +{app.skills.length - 3}
                            </span>
                          )}
                        </div>
                      )}
                      {app.notes && (
                        <p className="text-[11px] text-slate-500 line-clamp-1 italic">
                          "{app.notes}"
                        </p>
                      )}
                    </div>
                  </td>

                  {/* Actions */}
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1">
                      {app.url && (
                        <button
                          onClick={() => onReAnalyze(app)}
                          title="Przeanalizuj ponownie z AI"
                          className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-md transition-colors"
                        >
                          <Sparkles className="w-3.5 h-3.5" />
                        </button>
                      )}
                      <button
                        onClick={() => onEdit(app)}
                        title="Edytuj ofertę"
                        className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => onDelete(app)}
                        title="Usuń aplikację"
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-md transition-colors"
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
      <div className="px-4 py-2.5 bg-slate-50/60 border-t border-slate-100 text-xs text-slate-500 flex items-center justify-between">
        <span>Wyświetlono {applications.length} aplikacji</span>
        <span className="text-[11px]">Wskazówka: Możesz zmieniać status aplikacji bezpośrednio w tabeli.</span>
      </div>
    </div>
  );
};
