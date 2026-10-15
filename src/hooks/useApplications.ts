import { useApplicationSync } from './useApplicationSync';
import { useOptimisticCrud } from './useOptimisticCrud';

export type { SyncStatus } from './useApplicationSync';

/**
 * Public entry point for application data. Thin facade that composes the
 * server-sync layer (useApplicationSync) with the optimistic CRUD layer
 * (useOptimisticCrud) while keeping the exact same return contract.
 */
export function useApplications(onNotification?: (msg: string) => void) {
  const sync = useApplicationSync(onNotification);
  const crud = useOptimisticCrud({
    applications: sync.applications,
    setApplications: sync.setApplications,
    applicationsRef: sync.applicationsRef,
    setSyncStatus: sync.setSyncStatus,
    notify: sync.notify,
  });

  return {
    applications: sync.applications,
    isLoading: sync.isLoading,
    syncStatus: sync.syncStatus,
    setApplications: sync.setApplications,
    setSyncStatus: sync.setSyncStatus,
    ...crud,
  };
}
