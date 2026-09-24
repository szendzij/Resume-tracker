import { useState, useMemo, useCallback } from 'react';
import { JobApplication } from '../types';

export function useBulkSelection(
  applications: JobApplication[],
  filteredApplications: JobApplication[]
) {
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const selectedApplications = useMemo(() => {
    return applications.filter((a) => selectedIds.includes(a.id));
  }, [applications, selectedIds]);

  const allVisibleSelected = useMemo(() => {
    return (
      filteredApplications.length > 0 &&
      filteredApplications.every((a) => selectedIds.includes(a.id))
    );
  }, [filteredApplications, selectedIds]);

  const handleToggleSelect = useCallback((id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((itemId) => itemId !== id) : [...prev, id]
    );
  }, []);

  const handleSelectAllVisible = useCallback(() => {
    const visibleIds = filteredApplications.map((a) => a.id);
    setSelectedIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
  }, [filteredApplications]);

  const handleDeselectAll = useCallback(() => {
    setSelectedIds([]);
  }, []);

  const clearDeletedSelections = useCallback((deletedIds: string[]) => {
    setSelectedIds((prev) => prev.filter((id) => !deletedIds.includes(id)));
  }, []);

  return {
    selectedIds,
    selectedApplications,
    allVisibleSelected,
    handleToggleSelect,
    handleSelectAllVisible,
    handleDeselectAll,
    clearDeletedSelections,
    setSelectedIds,
  };
}
