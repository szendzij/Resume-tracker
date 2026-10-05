import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { JobTable } from '../src/components/JobTable';
import { JobApplication, JobStatus } from '../src/types';

describe('JobTable Component', () => {
  const mockApplications: JobApplication[] = [
    {
      id: 'job-1',
      role: 'Senior React Developer',
      company: 'TechCorp Poland',
      portal: 'LinkedIn',
      url: 'https://linkedin.com/jobs/1',
      appliedDate: '2026-10-01',
      status: 'Rozmowa HR',
      location: 'Warszawa (hybrydowo)',
      salary: '20 000 - 25 000 PLN B2B',
      skills: ['React', 'TypeScript', 'Tailwind'],
      notes: 'Kontakt od rekruterki',
      timeline: [
        { id: 'tl-1', status: 'Wysłana', date: '2026-10-01' },
        { id: 'tl-2', status: 'Rozmowa HR', date: '2026-10-08', notes: 'Pierwszy etap' },
      ],
    },
    {
      id: 'job-2',
      role: 'QA Engineer',
      company: 'SoftHouse',
      portal: 'NoFluffJobs',
      url: 'https://nofluffjobs.com/job/2',
      appliedDate: '2026-10-03',
      status: 'Wysłana',
      location: 'Zdalnie',
      skills: ['Playwright', 'Jest'],
    },
  ];

  const defaultProps = {
    applications: mockApplications,
    selectedIds: [],
    onToggleSelect: vi.fn(),
    onSelectAllVisible: vi.fn(),
    onDeselectAll: vi.fn(),
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    onStatusChange: vi.fn(),
    onReAnalyze: vi.fn(),
    sortBy: 'date-desc' as const,
    onSortChange: vi.fn(),
  };

  it('renders application rows with role, company, portal and salary', () => {
    render(<JobTable {...defaultProps} />);

    expect(screen.getByText('Senior React Developer')).toBeDefined();
    expect(screen.getByText('TechCorp Poland')).toBeDefined();
    expect(screen.getByText('QA Engineer')).toBeDefined();
    expect(screen.getByText('SoftHouse')).toBeDefined();
    expect(screen.getByText('20 000 - 25 000 PLN B2B')).toBeDefined();
  });

  it('renders status dropdown for each application', () => {
    render(<JobTable {...defaultProps} />);

    const select1 = document.getElementById('status-select-job-1') as HTMLSelectElement;
    expect(select1).not.toBeNull();
    expect(select1.value).toBe('Rozmowa HR');

    const select2 = document.getElementById('status-select-job-2') as HTMLSelectElement;
    expect(select2).not.toBeNull();
    expect(select2.value).toBe('Wysłana');
  });

  it('DOES NOT render stage history badge (etap:) in the table view (regression test for Bug 2)', () => {
    render(<JobTable {...defaultProps} />);

    // In Bug 2, a badge with "etap: <date>" was improperly rendered next to the status select.
    // The table view must strictly remain clean without stage history badges.
    const allStageBadges = screen.queryAllByText(/etap:/i);
    expect(allStageBadges.length).toBe(0);

    // Verify raw text in entire table does not contain "etap:"
    const tableBody = document.querySelector('tbody');
    expect(tableBody?.textContent).not.toContain('etap:');
  });

  it('calls onStatusChange when a different status is selected', () => {
    const onStatusChange = vi.fn();
    render(<JobTable {...defaultProps} onStatusChange={onStatusChange} />);

    const select = document.getElementById('status-select-job-1') as HTMLSelectElement;
    fireEvent.change(select, { target: { value: 'Oferta' } });

    expect(onStatusChange).toHaveBeenCalledWith('job-1', 'Oferta');
  });

  it('renders empty state when applications array is empty', () => {
    render(<JobTable {...defaultProps} applications={[]} />);

    expect(screen.getByText('Brak aplikacji spełniających kryteria')).toBeDefined();
  });
});
