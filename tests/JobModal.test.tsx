import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { JobModal } from '../src/components/JobModal';
import { JobApplication } from '../shared/types';

describe('JobModal Component', () => {
  const mockOnClose = vi.fn();
  const mockOnSave = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not render anything when isOpen is false', () => {
    const { container } = render(
      <JobModal
        isOpen={false}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );
    expect(container.firstChild).toBeNull();
  });

  it('renders modal in add mode with default fields when initialData is null', () => {
    render(
      <JobModal
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    expect(screen.getByText('Dodaj nową aplikację')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Dodaj aplikację' })).toBeDefined();

    const roleInput = document.getElementById('job-role-input') as HTMLInputElement;
    const companyInput = document.getElementById('job-company-input') as HTMLInputElement;
    const portalSelect = document.getElementById('job-portal-select') as HTMLSelectElement;
    const statusSelect = document.getElementById('job-status-select') as HTMLSelectElement;

    expect(roleInput).toBeDefined();
    expect(roleInput.value).toBe('');
    expect(companyInput).toBeDefined();
    expect(companyInput.value).toBe('');
    expect(portalSelect.value).toBe('LinkedIn');
    expect(statusSelect.value).toBe('Wysłana');
  });

  it('populates fields correctly when initialData is provided (edit mode)', () => {
    const initialJob: JobApplication = {
      id: 'job-101',
      role: 'Senior QA Engineer',
      company: 'Acme Software',
      portal: 'NoFluffJobs',
      url: 'https://nofluffjobs.com/job/qa-101',
      appliedDate: '2026-10-01',
      status: 'Rozmowa HR',
      location: 'Warszawa (Hybrydowo)',
      salary: '20 000 - 25 000 PLN',
      skills: ['Playwright', 'TypeScript'],
      notes: 'Rozmowa wstępna zakończona sukcesem',
      timeline: [
        { id: 'tl-1', status: 'Wysłana', date: '2026-10-01' },
        { id: 'tl-2', status: 'Rozmowa HR', date: '2026-10-04', notes: 'HR screener' },
      ],
    };

    render(
      <JobModal
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
        initialData={initialJob}
      />
    );

    expect(screen.getByText('Edytuj aplikację')).toBeDefined();
    expect(screen.getByRole('button', { name: 'Zapisz zmiany' })).toBeDefined();

    const roleInput = document.getElementById('job-role-input') as HTMLInputElement;
    const companyInput = document.getElementById('job-company-input') as HTMLInputElement;
    const portalSelect = document.getElementById('job-portal-select') as HTMLSelectElement;
    const statusSelect = document.getElementById('job-status-select') as HTMLSelectElement;
    const locationInput = document.getElementById('job-location-input') as HTMLInputElement;
    const salaryInput = document.getElementById('job-salary-input') as HTMLInputElement;
    const notesInput = document.getElementById('job-notes-input') as HTMLTextAreaElement;

    expect(roleInput.value).toBe('Senior QA Engineer');
    expect(companyInput.value).toBe('Acme Software');
    expect(portalSelect.value).toBe('NoFluffJobs');
    expect(statusSelect.value).toBe('Rozmowa HR');
    expect(locationInput.value).toBe('Warszawa (Hybrydowo)');
    expect(salaryInput.value).toBe('20 000 - 25 000 PLN');
    expect(notesInput.value).toBe('Rozmowa wstępna zakończona sukcesem');

    // Skills rendered
    expect(screen.getByText('Playwright')).toBeDefined();
    expect(screen.getByText('TypeScript')).toBeDefined();
  });

  it('allows adding and removing skills', () => {
    render(
      <JobModal
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    const skillInput = document.getElementById('job-skill-input') as HTMLInputElement;
    const addSkillBtn = screen.getByText('Dodaj tag');

    // Add first skill
    fireEvent.change(skillInput, { target: { value: 'React' } });
    fireEvent.click(addSkillBtn);

    expect(screen.getByText('React')).toBeDefined();

    // Add second skill via Enter key
    fireEvent.change(skillInput, { target: { value: 'Node.js' } });
    fireEvent.keyDown(skillInput, { key: 'Enter', code: 'Enter' });

    expect(screen.getByText('Node.js')).toBeDefined();

    // Remove first skill
    const reactBadge = screen.getByText('React').parentElement;
    const removeBtn = reactBadge?.querySelector('button');
    expect(removeBtn).not.toBeNull();
    if (removeBtn) {
      fireEvent.click(removeBtn);
    }

    expect(screen.queryByText('React')).toBeNull();
    expect(screen.getByText('Node.js')).toBeDefined();
  });

  it('triggers onClose when close button or cancel button is clicked', () => {
    render(
      <JobModal
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    const closeBtn = document.getElementById('close-modal-btn');
    expect(closeBtn).not.toBeNull();
    if (closeBtn) fireEvent.click(closeBtn);
    expect(mockOnClose).toHaveBeenCalledTimes(1);

    const cancelBtn = document.getElementById('cancel-modal-btn');
    expect(cancelBtn).not.toBeNull();
    if (cancelBtn) fireEvent.click(cancelBtn);
    expect(mockOnClose).toHaveBeenCalledTimes(2);
  });

  it('validates required fields and saves valid application', () => {
    render(
      <JobModal
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
      />
    );

    const saveBtn = document.getElementById('save-job-btn')!;

    // Attempt save with empty fields
    fireEvent.click(saveBtn);
    expect(mockOnSave).not.toHaveBeenCalled();

    // Fill required fields
    const roleInput = document.getElementById('job-role-input')!;
    const companyInput = document.getElementById('job-company-input')!;
    const locationInput = document.getElementById('job-location-input')!;
    const salaryInput = document.getElementById('job-salary-input')!;

    fireEvent.change(roleInput, { target: { value: 'Frontend Developer' } });
    fireEvent.change(companyInput, { target: { value: 'Google' } });
    fireEvent.change(locationInput, { target: { value: 'Kraków' } });
    fireEvent.change(salaryInput, { target: { value: '25 000 PLN' } });

    fireEvent.click(saveBtn);

    expect(mockOnSave).toHaveBeenCalledTimes(1);
    const savedData = mockOnSave.mock.calls[0][0];
    expect(savedData.role).toBe('Frontend Developer');
    expect(savedData.company).toBe('Google');
    expect(savedData.location).toBe('Kraków');
    expect(savedData.salary).toBe('25 000 PLN');
    expect(savedData.status).toBe('Wysłana');
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('detects duplicate offer and blocks save until explicitly confirmed', () => {
    const existingApp: JobApplication = {
      id: 'job-existing-1',
      role: 'Fullstack Engineer',
      company: 'Spotify',
      portal: 'LinkedIn',
      url: 'https://linkedin.com/jobs/view/12345',
      appliedDate: '2026-10-01',
      status: 'Wysłana',
    };

    render(
      <JobModal
        isOpen={true}
        onClose={mockOnClose}
        onSave={mockOnSave}
        existingApplications={[existingApp]}
      />
    );

    const roleInput = document.getElementById('job-role-input')!;
    const companyInput = document.getElementById('job-company-input')!;
    const saveBtn = document.getElementById('save-job-btn')!;

    // Type matching company and role
    fireEvent.change(roleInput, { target: { value: 'Fullstack Engineer' } });
    fireEvent.change(companyInput, { target: { value: 'Spotify' } });

    // Warning banner should be rendered
    const warningBanner = document.getElementById('job-duplicate-warning-banner');
    expect(warningBanner).not.toBeNull();
    expect(screen.getByText('Wykryto prawdopodobny duplikat z ofertą w bazie!')).toBeDefined();

    // Clicking save initially should not trigger onSave because duplicate prompt opens
    fireEvent.click(saveBtn);
    expect(mockOnSave).not.toHaveBeenCalled();

    // Confirm save via 'Dodaj mimo to' button
    const overrideBtn = screen.getByText('Dodaj mimo to');
    fireEvent.click(overrideBtn);

    expect(mockOnSave).toHaveBeenCalledTimes(1);
    expect(mockOnSave.mock.calls[0][0].company).toBe('Spotify');
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });
});
