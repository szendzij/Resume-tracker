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
    <div id="filter-bar-wrapper" className="bg-white border border-slate-200 rounded-xl p-4 mb-6 shadow-xs space-y-4">
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
            className="w-full pl-10 pr-9 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-colors"
          />
          {filter.search && (
            <button
              id="clear-search-btn"
              onClick={() => onFilterChange({ ...filter, search: '' })}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Portal Filter */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium whitespace-nowrap">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>Portal:</span>
          </div>
          <select
            id="portal-select"
            value={filter.portal}
            onChange={(e) => onFilterChange({ ...filter, portal: e.target.value })}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
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
          <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium whitespace-nowrap ml-1">
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
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
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
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          >
            <option value="appliedDateDesc">Data: najnowsze</option>
            <option value="appliedDateAsc">Data: najstarsze</option>
            <option value="companyAsc">Firma: A-Z</option>
            <option value="roleAsc">Stanowisko: A-Z</option>
          </select>

          {/* View Mode Toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-lg border border-slate-200 ml-auto">
            <button
              id="view-table-btn"
              onClick={() => onViewModeChange('table')}
              title="Widok tabeli"
              className={`p-1.5 rounded-md text-xs font-medium flex items-center gap-1 transition-colors ${
                viewMode === 'table' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Table2 className="w-4 h-4" />
              <span className="hidden sm:inline">Tabela</span>
            </button>
            <button
              id="view-kanban-btn"
              onClick={() => onViewModeChange('kanban')}
              title="Widok tablicy Kanban"
              className={`p-1.5 rounded-md text-xs font-medium flex items-center gap-1 transition-colors ${
                viewMode === 'kanban' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Kanban className="w-4 h-4" />
              <span className="hidden sm:inline">Tablica</span>
            </button>
            <button
              id="view-grid-btn"
              onClick={() => onViewModeChange('grid')}
              title="Widok kart"
              className={`p-1.5 rounded-md text-xs font-medium flex items-center gap-1 transition-colors ${
                viewMode === 'grid' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
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
        <div id="custom-date-pickers" className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Od:</span>
            <input
              type="date"
              value={filter.customStartDate || ''}
              onChange={(e) => onFilterChange({ ...filter, customStartDate: e.target.value })}
              className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md text-slate-800"
            />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500">Do:</span>
            <input
              type="date"
              value={filter.customEndDate || ''}
              onChange={(e) => onFilterChange({ ...filter, customEndDate: e.target.value })}
              className="px-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md text-slate-800"
            />
          </div>
        </div>
      )}

      {/* Status Filter Badges/Pills */}
      <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center gap-1.5">
        <button
          id="status-filter-all"
          onClick={() => onFilterChange({ ...filter, status: 'ALL' })}
          className={`px-2.5 py-1 rounded-md text-xs font-medium transition-all ${
            filter.status === 'ALL'
              ? 'bg-slate-900 text-white shadow-xs'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200/80'
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
              className={`px-2.5 py-1 rounded-md text-xs font-medium flex items-center gap-1.5 transition-all border ${
                isSelected
                  ? `${meta.bg} ${meta.text} ${meta.border} ring-2 ring-blue-400 font-semibold shadow-xs`
                  : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
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
            className="ml-auto text-xs font-medium text-blue-600 hover:text-blue-800 flex items-center gap-1 px-2 py-1 hover:bg-blue-50 rounded-md transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            Wyczyść filtry
          </button>
        )}
      </div>
    </div>
  );
};
