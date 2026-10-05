import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AppHeader } from '../src/components/AppHeader';

describe('AppHeader Component - syncStatus indicators', () => {
  const defaultProps = {
    applicationsCount: 10,
    filteredCount: 5,
    onOpenSettings: vi.fn(),
    onOpenAddModal: vi.fn(),
    onOpenBatchAdd: vi.fn(),
  };

  it('renders "Synchronizowanie..." when syncStatus is syncing', () => {
    render(<AppHeader {...defaultProps} syncStatus="syncing" />);
    expect(screen.getByText('Synchronizowanie...')).toBeTruthy();
    const indicator = screen.getByText('Synchronizowanie...').closest('#sync-status-indicator');
    expect(indicator).toBeTruthy();
    expect(indicator?.getAttribute('data-status')).toBe('syncing');
  });

  it('renders "Zsynchronizowano z bazą" when syncStatus is idle', () => {
    render(<AppHeader {...defaultProps} syncStatus="idle" />);
    expect(screen.getByText('Zsynchronizowano z bazą')).toBeTruthy();
    const indicator = screen.getByText('Zsynchronizowano z bazą').closest('#sync-status-indicator');
    expect(indicator?.getAttribute('data-status')).toBe('idle');
  });

  it('renders "Tryb lokalny" when syncStatus is offline', () => {
    render(<AppHeader {...defaultProps} syncStatus="offline" />);
    expect(screen.getByText('Tryb lokalny')).toBeTruthy();
    const indicator = screen.getByText('Tryb lokalny').closest('#sync-status-indicator');
    expect(indicator?.getAttribute('data-status')).toBe('offline');
  });

  it('renders "Błąd synchronizacji" when syncStatus is error', () => {
    render(<AppHeader {...defaultProps} syncStatus="error" />);
    expect(screen.getByText('Błąd synchronizacji')).toBeTruthy();
    const indicator = screen.getByText('Błąd synchronizacji').closest('#sync-status-indicator');
    expect(indicator?.getAttribute('data-status')).toBe('error');
  });

  it('does not render sync status indicator when syncStatus is undefined', () => {
    const { container } = render(<AppHeader {...defaultProps} />);
    expect(container.querySelector('#sync-status-indicator')).toBeNull();
  });
});
