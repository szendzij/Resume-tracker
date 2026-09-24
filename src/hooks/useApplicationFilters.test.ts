import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useApplicationFilters } from './useApplicationFilters';
import { JobApplication } from '../types';

describe('useApplicationFilters hook', () => {
  const mockApps: JobApplication[] = [
    {
      id: '1',
      company: 'Spyrosoft',
      role: 'QA Automation Engineer',
      portal: 'LinkedIn',
      status: 'Wysłana',
      appliedDate: '2026-03-20',
      location: 'Wrocław',
      url: 'https://linkedin.com/jobs/1',
      skills: ['Playwright', 'TypeScript'],
      notes: 'Rekrutacja aktywna',
    },
    {
      id: '2',
      company: 'Allegro',
      role: 'Senior QA',
      portal: 'NoFluffJobs',
      status: 'Rozmowa HR',
      appliedDate: '2026-03-10',
      location: 'Warszawa',
      url: 'https://nofluffjobs.com/job/2',
      skills: ['Cypress', 'Python'],
      notes: 'Czekam na termin',
    },
    {
      id: '3',
      company: 'Capgemini',
      role: 'Manual Tester',
      portal: 'Pracuj.pl',
      status: 'Odrzucona',
      appliedDate: '2026-02-01',
      location: 'Kraków',
      url: 'https://pracuj.pl/oferta/3',
      skills: ['Jira'],
    },
  ];

  it('should initialize with default filters and all applications', () => {
    const { result } = renderHook(() => useApplicationFilters(mockApps));

    expect(result.current.filter.status).toBe('ALL');
    expect(result.current.filter.portal).toBe('ALL');
    expect(result.current.filter.search).toBe('');
    expect(result.current.filteredApplications.length).toBe(3);
    expect(result.current.availablePortals).toEqual(['LinkedIn', 'NoFluffJobs', 'Pracuj.pl']);
  });

  it('should filter by free-text search across company, role, skill, and location', () => {
    const { result } = renderHook(() => useApplicationFilters(mockApps));

    // Search by company
    act(() => {
      result.current.setFilter((prev) => ({ ...prev, search: 'Allegro' }));
    });
    expect(result.current.filteredApplications.length).toBe(1);
    expect(result.current.filteredApplications[0].company).toBe('Allegro');

    // Search by skill
    act(() => {
      result.current.setFilter((prev) => ({ ...prev, search: 'playwright' }));
    });
    expect(result.current.filteredApplications.length).toBe(1);
    expect(result.current.filteredApplications[0].company).toBe('Spyrosoft');

    // Search by location
    act(() => {
      result.current.setFilter((prev) => ({ ...prev, search: 'Kraków' }));
    });
    expect(result.current.filteredApplications.length).toBe(1);
    expect(result.current.filteredApplications[0].company).toBe('Capgemini');
  });

  it('should filter by status', () => {
    const { result } = renderHook(() => useApplicationFilters(mockApps));

    act(() => {
      result.current.setFilter((prev) => ({ ...prev, status: 'Rozmowa HR' }));
    });

    expect(result.current.filteredApplications.length).toBe(1);
    expect(result.current.filteredApplications[0].company).toBe('Allegro');
  });

  it('should filter by portal', () => {
    const { result } = renderHook(() => useApplicationFilters(mockApps));

    act(() => {
      result.current.setFilter((prev) => ({ ...prev, portal: 'LinkedIn' }));
    });

    expect(result.current.filteredApplications.length).toBe(1);
    expect(result.current.filteredApplications[0].company).toBe('Spyrosoft');
  });

  it('should sort applications properly', () => {
    const { result } = renderHook(() => useApplicationFilters(mockApps));

    // Sort by company ascending (Allegro, Capgemini, Spyrosoft)
    act(() => {
      result.current.updateSort('companyAsc');
    });
    expect(result.current.filteredApplications.map((a) => a.company)).toEqual([
      'Allegro',
      'Capgemini',
      'Spyrosoft',
    ]);

    // Sort by company descending
    act(() => {
      result.current.updateSort('companyDesc');
    });
    expect(result.current.filteredApplications.map((a) => a.company)).toEqual([
      'Spyrosoft',
      'Capgemini',
      'Allegro',
    ]);
  });
});
