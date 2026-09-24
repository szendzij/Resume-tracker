import { useState, useMemo } from 'react';
import { JobApplication, FilterState, SortOption } from '../types';
import { ALL_STATUSES } from '../utils/statusConfig';

const DEFAULT_FILTER: FilterState = {
  search: '',
  status: 'ALL',
  portal: 'ALL',
  dateRange: 'ALL',
  sortBy: 'appliedDateDesc',
};

export function useApplicationFilters(applications: JobApplication[]) {
  const [filter, setFilter] = useState<FilterState>(DEFAULT_FILTER);
  const [viewMode, setViewMode] = useState<'table' | 'kanban' | 'grid'>('table');

  // Available unique portals
  const availablePortals = useMemo(() => {
    const set = new Set<string>();
    applications.forEach((a) => {
      if (a.portal) set.add(a.portal);
    });
    return Array.from(set).sort();
  }, [applications]);

  // Filtered & Sorted applications
  const filteredApplications = useMemo(() => {
    let result = [...applications];

    // Search filter
    if (filter.search.trim()) {
      const q = filter.search.toLowerCase().trim();
      result = result.filter(
        (a) =>
          a.role.toLowerCase().includes(q) ||
          a.company.toLowerCase().includes(q) ||
          (a.location && a.location.toLowerCase().includes(q)) ||
          (a.portal && a.portal.toLowerCase().includes(q)) ||
          (a.notes && a.notes.toLowerCase().includes(q)) ||
          (a.skills && a.skills.some((s) => s.toLowerCase().includes(q)))
      );
    }

    // Status filter
    if (filter.status !== 'ALL') {
      result = result.filter((a) => a.status === filter.status);
    }

    // Portal filter
    if (filter.portal !== 'ALL') {
      result = result.filter((a) => a.portal === filter.portal);
    }

    // Date range filter
    if (filter.dateRange !== 'ALL') {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (filter.dateRange === '7D') {
        const past7 = new Date(today);
        past7.setDate(past7.getDate() - 7);
        result = result.filter((a) => new Date(a.appliedDate) >= past7);
      } else if (filter.dateRange === '14D') {
        const past14 = new Date(today);
        past14.setDate(past14.getDate() - 14);
        result = result.filter((a) => new Date(a.appliedDate) >= past14);
      } else if (filter.dateRange === '30D') {
        const past30 = new Date(today);
        past30.setDate(past30.getDate() - 30);
        result = result.filter((a) => new Date(a.appliedDate) >= past30);
      } else if (filter.dateRange === 'CUSTOM') {
        if (filter.customStartDate) {
          result = result.filter((a) => a.appliedDate >= filter.customStartDate!);
        }
        if (filter.customEndDate) {
          result = result.filter((a) => a.appliedDate <= filter.customEndDate!);
        }
      }
    }

    // Sorting
    result.sort((a, b) => {
      switch (filter.sortBy) {
        case 'appliedDateDesc':
          return b.appliedDate.localeCompare(a.appliedDate);
        case 'appliedDateAsc':
          return a.appliedDate.localeCompare(b.appliedDate);
        case 'companyAsc':
          return a.company.localeCompare(b.company, 'pl', { sensitivity: 'base' });
        case 'companyDesc':
          return b.company.localeCompare(a.company, 'pl', { sensitivity: 'base' });
        case 'roleAsc':
          return a.role.localeCompare(b.role, 'pl', { sensitivity: 'base' });
        case 'roleDesc':
          return b.role.localeCompare(a.role, 'pl', { sensitivity: 'base' });
        case 'portalAsc':
          return (a.portal || '').localeCompare(b.portal || '', 'pl', { sensitivity: 'base' });
        case 'portalDesc':
          return (b.portal || '').localeCompare(a.portal || '', 'pl', { sensitivity: 'base' });
        case 'statusAsc': {
          const orderA = ALL_STATUSES.indexOf(a.status);
          const orderB = ALL_STATUSES.indexOf(b.status);
          return (orderA === -1 ? 99 : orderA) - (orderB === -1 ? 99 : orderB);
        }
        case 'statusDesc': {
          const orderA = ALL_STATUSES.indexOf(a.status);
          const orderB = ALL_STATUSES.indexOf(b.status);
          return (orderB === -1 ? 99 : orderB) - (orderA === -1 ? 99 : orderA);
        }
        case 'locationAsc':
          return (a.location || '').localeCompare(b.location || '', 'pl', { sensitivity: 'base' });
        case 'locationDesc':
          return (b.location || '').localeCompare(a.location || '', 'pl', { sensitivity: 'base' });
        default:
          return 0;
      }
    });

    return result;
  }, [applications, filter]);

  const updateSort = (newSort: SortOption) => {
    setFilter((prev) => ({ ...prev, sortBy: newSort }));
  };

  return {
    filter,
    setFilter,
    updateSort,
    viewMode,
    setViewMode,
    availablePortals,
    filteredApplications,
  };
}
