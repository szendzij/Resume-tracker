import React from 'react';
import { FilterState, JobApplication } from '../types';
import { ALL_STATUSES, STATUS_CONFIG } from '../utils/statusConfig';
import { Search, X, Calendar, SlidersHorizontal, LayoutGrid, Kanban, Table2 } from 'lucide-react';

interface FilterBarProps {
  filter: FilterState;
  onFilterChange: (newFilter: FilterState) => void;
  applications: JobApplication[];
  availablePortals: string[];
  viewMode: 'table' | 'kanban' | 'grid';
  onViewModeChange: (mode: 'table' | 'kanban' | 'grid') => void;
}

export const FilterBar: React.FC<FilterBarProps> = ({
  filter,
  onFilterChange,
  applications,
  availablePortals,
  viewMode,
  onViewModeChange,
}) => {
  // Count per status
  const statusCounts = ALL_STATUSES.reduce((acc, status) => {
    acc[status] = applications.filter((app) => app.status === status).length;
    return acc;
  }, {} as Record<string, number>);

  const isFiltered =
    filter.search !== '' ||
    filter.status !== 'ALL' ||
    filter.portal !== 'ALL' ||
    filter.dateRange !== 'ALL' ||
    Boolean(filter.customStartDate) ||
    Boolean(filter.customEndDate);

  const resetFilters = () => {
    onFilterChange({
      search: '',
      status: 'ALL',
      portal: 'ALL',
      dateRange: 'ALL',
      customStartDate: '',
      customEndDate: '',
      sortBy: 'appliedDateDesc',
    });
  };

  return (
    <div id="filter-bar-wrapper" className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-4 mb-6 shadow-xs space-y-4">
      {/* Search and Quick Actions */}
      <div className="flex flex-col lg:flex-row gap-3 items-stretch lg:items-center justify-between">
        {/* Search input */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            id="search-input"
            type="text"
            value={filter.search}
            onChange={(e) => onFilterChange({ ...filter, search: e.target.value })}
            placeholder="Szukaj po firmie, stanowisku, technologiach..."
            className="w-full pl-10 pr-9 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
          />
          {filter.search && (
            <button
              id="clear-search-btn"
              onClick={() => onFilterChange({ ...filter, search: '' })}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Portal Filter */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Portal:</span>
          </div>
          <select
            id="portal-select"
            value={filter.portal}
            onChange={(e) => onFilterChange({ ...filter, portal: e.target.value })}
            className="px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          >
            <option value="ALL">Wszystkie portale ({applications.length})</option>
            {availablePortals.map((portal) => {
              const count = applications.filter((a) => a.portal === portal).length;
              return (
                <option key={portal} value={portal}>
                  {portal} ({count})
                </option>
              );
            })}
          </select>

          {/* Date Filter */}
          <div className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium whitespace-nowrap ml-1">
            <Calendar className="w-3.5 h-3.5" />
            <span>Data:</span>
          </div>
          <select
            id="date-range-select"
            value={filter.dateRange}
            onChange={(e) =>
              onFilterChange({
                ...filter,
                dateRange: e.target.value as FilterState['dateRange'],
              })
            }
            className="px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          >
            <option value="ALL">Wszystkie daty</option>
            <option value="7D">Ostatnie 7 dni</option>
            <option value="14D">Ostatnie 14 dni</option>
            <option value="30D">Ostatnie 30 dni</option>
            <option value="CUSTOM">Własny zakres</option>
          </select>

          {/* Sort By */}
          <select
            id="sort-by-select"
            value={filter.sortBy}
            onChange={(e) =>
              onFilterChange({
                ...filter,
                sortBy: e.target.value as FilterState['sortBy'],
              })
            }
            className="px-3 py-2 bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 rounded-lg text-sm text-slate-800 dark:text-slate-200 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 cursor-pointer"
          >
            <option value="appliedDateDesc">Data: najnowsze ↓</option>
            <option value="appliedDateAsc">Data: najstarsze ↑</option>
            <option value="roleAsc">Stanowisko: A-Z ↓</option>
            <option value="roleDesc">Stanowisko: Z-A ↑</option>
            <option value="companyAsc">Firma: A-Z ↓</option>
            <option value="companyDesc">Firma: Z-A ↑</option>
            <option value="portalAsc">Portal: A-Z ↓</option>
            <option value="portalDesc">Portal: Z-A ↑</option>
            <option value="statusAsc">Status: etapy procesu</option>
            <option value="statusDesc">Status: odwrócony</option>
            <option value="locationAsc">Lokalizacja: A-Z ↓</option>
            <option value="locationDesc">Lokalizacja: Z-A ↑</option>
          </select>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-100 dark:bg-slate-800 p-1 rounded-lg border border-slate-200 dark:border-slate-700 ml-auto">
            <button
              id="view-table-btn"
              onClick={() => onViewModeChange('table')}
              title="Widok tabeli"
              className={`p-1.5 rounded-md text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer ${
                viewMode === 'table'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Table2 className="w-4 h-4" />
              <span className="hidden sm:inline">Tabela</span>
            </button>
            <button
              id="view-kanban-btn"
              onClick={() => onViewModeChange('kanban')}
              title="Widok tablicy Kanban"
              className={`p-1.5 rounded-md text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer ${
                viewMode === 'kanban'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <Kanban className="w-4 h-4" />
              <span className="hidden sm:inline">Tablica</span>
            </button>
            <button
              id="view-grid-btn"
              onClick={() => onViewModeChange('grid')}
              title="Widok kart"
              className={`p-1.5 rounded-md text-xs font-medium flex items-center gap-1 transition-colors cursor-pointer ${
                viewMode === 'grid'
                  ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
              }`}
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="hidden sm:inline">Karty</span>
            </button>
          </div>
        </div>
      </div>

      {/* Custom Date Range if selected */}
      {filter.dateRange === 'CUSTOM' && (
        <div id="custom-date-pickers" className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 dark:text-slate-400">Od:</span>
            <input
              type="date"
              value={filter.customStartDate || ''}
              onChange={(e) => onFilterChange({ ...filter, customStartDate: e.target.value })}
              className="px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-800 dark:text-slate-200"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 dark:text-slate-400">Do:</span>
            <input
              type="date"
              value={filter.customEndDate || ''}
              onChange={(e) => onFilterChange({ ...filter, customEndDate: e.target.value })}
              className="px-2.5 py-1.5 text-xs bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md text-slate-800 dark:text-slate-200"
            />
          </div>
        </div>
      )}

      {/* Status Filter Badges/Pills */}
      <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center gap-1.5">
        <button
          id="status-filter-all"
          onClick={() => onFilterChange({ ...filter, status: 'ALL' })}
          className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
            filter.status === 'ALL'
              ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-xs'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200/80 dark:hover:bg-slate-700'
          }`}
        >
          Wszystkie ({applications.length})
        </button>

        {ALL_STATUSES.map((status) => {
          const count = statusCounts[status] || 0;
          const isSelected = filter.status === status;
          const meta = STATUS_CONFIG[status];
          return (
            <button
              key={status}
              id={`status-filter-${status}`}
              onClick={() => onFilterChange({ ...filter, status: isSelected ? 'ALL' : status })}
              className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all border cursor-pointer ${
                isSelected
                  ? `${meta.bg} ${meta.text} ${meta.border} ring-2 ring-blue-400 font-semibold shadow-xs`
                  : 'bg-white dark:bg-slate-800/80 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700'
              }`}
            >
              <span className={`w-2 h-2 rounded-full ${meta.dot}`} />
              <span>{status}</span>
              <span className="text-[11px] opacity-75 font-mono">({count})</span>
            </button>
          );
        })}

        {isFiltered && (
          <button
            id="reset-filters-btn"
            onClick={resetFilters}
            className="ml-auto text-xs font-medium text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 flex items-center gap-1 px-2 py-1 hover:bg-blue-50 dark:hover:bg-blue-950/40 rounded-md transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
            Wyczyść filtry
          </button>
        )}
      </div>
    </div>
  );
};
