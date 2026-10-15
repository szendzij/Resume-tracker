import type { Dispatch, SetStateAction } from 'react';
import type { SyncStatus } from './useApplicationSync';

/**
 * Shared tail of every optimistic mutation in this layer: apply the local
 * change, notify the user, mark the layer as `syncing`, call the server, and —
 * on failure — log, roll the local change back, mark the layer as `error` and
 * tell the user. Every mutation in `useOptimisticCrud` used to inline this
 * sequence verbatim; centralising it removes that repetition without changing
 * the resulting state, the notifications, or the order in which they fire.
 */
export interface OptimisticMutation<T> {
  /** Apply the optimistic state; runs first, before anything else. */
  applyOptimistic: () => void;
  /** Optional user notification fired right after `applyOptimistic`. */
  notifyOptimistic?: () => void;
  /** The server request; resolves on success, rejects to trigger rollback. */
  request: () => Promise<T>;
  /** Restore the previous state when `request` rejects. */
  rollback: () => void;
  /** Message logged via console.error when `request` rejects. */
  errorLabel: string;
  /** Optional side effect after a successful request (status is already idle). */
  onSuccess?: (result: T) => void;
}

export const ROLLBACK_NOTIFICATION = 'Błąd zapisu na serwerze - przywrócono poprzedni stan.';

export interface OptimisticMutationDeps {
  setSyncStatus: Dispatch<SetStateAction<SyncStatus>>;
  notify: (msg: string) => void;
}

/**
 * Runs an optimistic mutation end to end. A rejected `request` is fully handled
 * here (rollback + error status + notification) and never rethrown, so callers
 * that wrap this call in their own try/catch only observe failures of code that
 * runs *before* it.
 */
export async function runOptimisticMutation<T>(
  mutation: OptimisticMutation<T>,
  { setSyncStatus, notify }: OptimisticMutationDeps
): Promise<void> {
  mutation.applyOptimistic();
  mutation.notifyOptimistic?.();

  setSyncStatus('syncing');
  try {
    const result = await mutation.request();
    setSyncStatus('idle');
    mutation.onSuccess?.(result);
  } catch (err) {
    console.error(mutation.errorLabel, err);
    mutation.rollback();
    setSyncStatus('error');
    notify(ROLLBACK_NOTIFICATION);
  }
}
