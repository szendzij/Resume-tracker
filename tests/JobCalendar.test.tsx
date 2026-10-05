import React from 'react';
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { JobCalendar } from '../src/components/JobCalendar';
import { JobApplication } from '../src/types';

describe('JobCalendar component', () => {
  const mockApplications: JobApplication[] = [
    {
      id: 'app-1',
      role: 'Senior React Developer',
      company: 'TechCorp Poland',
      portal: 'LinkedIn',
      url: 'https://linkedin.com/jobs/1',
      appliedDate: '2026-10-05',
      status: 'Rozmowa techniczna',
      timeline: [
        { id: 't1', status: 'Wysłana', date: '2026-10-01' },
        { id: 't2', status: 'Rozmowa HR', date: '2026-10-03', notes: 'Rozmowa telefoniczna z HR' },
        { id: 't3', status: 'Rozmowa techniczna', date: '2026-10-05', notes: 'Zadanie live coding na Zoom' },
      ],
    },
    {
      id: 'app-2',
      role: 'Fullstack Node/React',
      company: 'InnovateX',
      portal: 'JustJoinIT',
      url: 'https://justjoin.it/offers/2',
      appliedDate: '2026-10-08',
      status: 'Oferta',
      salary: '25 000 PLN',
      timeline: [
        { id: 't4', status: 'Wysłana', date: '2026-10-02' },
        { id: 't5', status: 'Oferta', date: '2026-10-08', notes: 'Złożona oferta B2B' },
      ],
    },
  ];

  const defaultProps = {
    applications: mockApplications,
    onEdit: vi.fn(),
    onDelete: vi.fn(),
    onAddNew: vi.fn(),
  };

  it('renders calendar header with navigation and view switcher', () => {
    render(<JobCalendar {...defaultProps} />);

    // Navigation buttons
    expect(screen.getByText('Dzisiaj')).toBeDefined();
    // Sub-view buttons
    expect(screen.getByText('Miesiąc')).toBeDefined();
    expect(screen.getByText('Tydzień')).toBeDefined();
    expect(screen.getByText('Agenda')).toBeDefined();
  });

  it('renders month grid with day names and applications', () => {
    render(<JobCalendar {...defaultProps} />);

    // Day names in European standard
    expect(screen.getByText('Pon')).toBeDefined();
    expect(screen.getByText('Wt')).toBeDefined();
    expect(screen.getByText('Śr')).toBeDefined();
    expect(screen.getByText('Czw')).toBeDefined();
    expect(screen.getByText('Pt')).toBeDefined();
    expect(screen.getByText('Sob')).toBeDefined();
    expect(screen.getByText('Nie')).toBeDefined();

    // Companies should be visible in day chips
    expect(screen.getAllByText('TechCorp Poland').length).toBeGreaterThan(0);
  });

  it('switches to week view when clicking "Tydzień"', () => {
    render(<JobCalendar {...defaultProps} />);

    const weekBtn = screen.getByText('Tydzień');
    fireEvent.click(weekBtn);

    // Week view shows full day names (Poniedziałek, Wtorek, etc.)
    expect(screen.getByText('Poniedziałek')).toBeDefined();
    expect(screen.getByText('Wtorek')).toBeDefined();
  });

  it('switches to agenda view when clicking "Agenda"', () => {
    render(<JobCalendar {...defaultProps} />);

    const agendaBtn = screen.getByText('Agenda');
    fireEvent.click(agendaBtn);

    // Shows chronological list with role and company
    expect(screen.getAllByText('Senior React Developer').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Fullstack Node/React').length).toBeGreaterThan(0);
  });

  it('filters events when clicking filter pills', () => {
    render(<JobCalendar {...defaultProps} />);

    // Switch to agenda to easily inspect list items
    fireEvent.click(screen.getByText('Agenda'));

    // Click "Oferty"
    const offersPill = screen.getByText('Oferty');
    fireEvent.click(offersPill);

    expect(screen.getByText('Fullstack Node/React')).toBeDefined();
    expect(screen.queryByText('Senior React Developer')).toBeNull();
  });

  it('calls onEdit when clicking on an event chip', () => {
    const onEditMock = vi.fn();
    render(<JobCalendar {...defaultProps} onEdit={onEditMock} />);

    // In month view, click on company chip
    const companyChips = screen.getAllByText('TechCorp Poland');
    fireEvent.click(companyChips[0]);

    expect(onEditMock).toHaveBeenCalledWith(
      expect.objectContaining({
        company: 'TechCorp Poland',
      })
    );
  });

  it('opens day details panel when clicking on a day and supports adding a job on that day', () => {
    const onAddNewMock = vi.fn();
    render(<JobCalendar {...defaultProps} onAddNew={onAddNewMock} />);

    // Click on day 2026-10-05 in the calendar
    const dayElement = screen.getByTestId('calendar-day-2026-10-05');
    fireEvent.click(dayElement);

    // Should open day details panel
    expect(screen.getByTestId('calendar-day-details')).toBeDefined();

    // Click "Dodaj w tym dniu" button
    const addForDayBtn = screen.getByText('Dodaj w tym dniu');
    fireEvent.click(addForDayBtn);

    expect(onAddNewMock).toHaveBeenCalledWith('2026-10-05');
  });
});
