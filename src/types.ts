/**
 * @deprecated Import from 'shared/types' instead. Kept for backwards compatibility.
 *
 * Compatibility shim: the domain contracts were moved to the isolated shared
 * layer (`shared/types`) so both the server and the client can consume them.
 * This module re-exports them unchanged for existing frontend imports.
 */
export * from '../shared/types';
