import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import React from 'react';
import {
  StatusBadge,
  PortalBadge,
  JobActionButtons,
  StatusSelect,
  ModalShell,
} from '../src/components/common';
import { JobApplication } from '../src/types';
import { ALL_STATUSES } from '../src/utils/statusConfig';

describe('Common UI Microcomponents', () => {
  const sampleApp: JobApplication = {
    id: 'app-123',
    role: 'Fullstack Developer',
    company: 'Acme Corp',
    portal: 'LinkedIn',
    url: 'https://linkedin.com/jobs/123',
    appliedDate: '2026-03-30',
    status: 'Rozmowa techniczna',
  };

  describe('StatusBadge', () => {
    it('renders label and status styles correctly', () => {
      render(<StatusBadge status="Rozmowa techniczna" />);
      const badge = screen.getByText('Rozmowa techniczna');
      expect(badge).toBeTruthy();
      expect(badge.parentElement?.className).toContain('text-indigo-700');
    });

    it('renders dot indicator when showIcon is true', () => {
      const { container } = render(<StatusBadge status="Oferta" showIcon={true} />);
      const dot = container.querySelector('.rounded-full.bg-emerald-500');
      expect(dot).not.toBeNull();
    });

    it('supports click interactions when onClick is provided', () => {
      const handleClick = vi.fn();
      render(<StatusBadge status="Wysłana" onClick={handleClick} />);
      const button = screen.getByRole('button');
      fireEvent.click(button);
      expect(handleClick).toHaveBeenCalledTimes(1);
    });
  });

  describe('PortalBadge', () => {
    it('renders portal name and portal badge styling', () => {
      render(<PortalBadge portal="LinkedIn" />);
      const badge = screen.getByText('LinkedIn');
      expect(badge).toBeTruthy();
      expect(badge.className).toContain('text-[#0077b5]');
    });

    it('falls back to "Inne" when portal is empty', () => {
      render(<PortalBadge portal="" />);
      expect(screen.getByText('Inne')).toBeTruthy();
    });
  });

  describe('JobActionButtons', () => {
    it('renders all action buttons and triggers callbacks', () => {
      const handleEdit = vi.fn();
      const handleDelete = vi.fn();
      const handleReAnalyze = vi.fn();

      render(
        <JobActionButtons
          app={sampleApp}
          onEdit={handleEdit}
          onDelete={handleDelete}
          onReAnalyze={handleReAnalyze}
        />
      );

      // Re-analyze
      const reAnalyzeBtn = screen.getByTitle('Odśwież dane oferty przez AI Gemini');
      fireEvent.click(reAnalyzeBtn);
      expect(handleReAnalyze).toHaveBeenCalledWith(sampleApp);

      // External link
      const link = screen.getByTitle('Otwórz link do oferty');
      expect(link.getAttribute('href')).toBe(sampleApp.url);
      expect(link.getAttribute('target')).toBe('_blank');

      // Edit
      const editBtn = screen.getByTitle('Edytuj ofertę');
      fireEvent.click(editBtn);
      expect(handleEdit).toHaveBeenCalledWith(sampleApp);

      // Delete
      const deleteBtn = screen.getByTitle('Usuń ofertę');
      fireEvent.click(deleteBtn);
      expect(handleDelete).toHaveBeenCalledWith(sampleApp);
    });

    it('omits external link and re-analyze button if app has no url', () => {
      const appWithoutUrl = { ...sampleApp, url: '' };
      render(
        <JobActionButtons
          app={appWithoutUrl}
          onEdit={vi.fn()}
          onDelete={vi.fn()}
          onReAnalyze={vi.fn()}
        />
      );

      expect(screen.queryByTitle('Otwórz link do oferty')).toBeNull();
      expect(screen.queryByTitle('Odśwież dane oferty przez AI Gemini')).toBeNull();
      expect(screen.getByTitle('Edytuj ofertę')).toBeTruthy();
      expect(screen.getByTitle('Usuń ofertę')).toBeTruthy();
    });
  });

  describe('StatusSelect', () => {
    it('renders every ALL_STATUSES entry as an option', () => {
      render(<StatusSelect value="Wysłana" onChange={vi.fn()} />);

      const options = screen.getAllByRole('option');
      expect(options.length).toBe(ALL_STATUSES.length);
      ALL_STATUSES.forEach((status) => {
        expect(screen.getByRole('option', { name: status })).toBeTruthy();
      });
    });

    it('reflects the current value and calls onChange with the new status', () => {
      const handleChange = vi.fn();
      render(<StatusSelect value="Wysłana" onChange={handleChange} />);

      const select = screen.getByRole('combobox') as HTMLSelectElement;
      expect(select.value).toBe('Wysłana');

      fireEvent.change(select, { target: { value: 'Oferta' } });
      expect(handleChange).toHaveBeenCalledTimes(1);
      expect(handleChange).toHaveBeenCalledWith('Oferta');
    });
  });

  describe('ModalShell', () => {
    it('renders the title, children and triggers onClose from the close button', () => {
      const handleClose = vi.fn();
      render(
        <ModalShell title="Testowy tytuł modala" onClose={handleClose}>
          <span>zawartość modala</span>
        </ModalShell>
      );

      expect(screen.getByText('Testowy tytuł modala')).toBeTruthy();
      expect(screen.getByText('zawartość modala')).toBeTruthy();

      fireEvent.click(screen.getByRole('button'));
      expect(handleClose).toHaveBeenCalledTimes(1);
    });

    it('renders an optional subtitle and icon', () => {
      render(
        <ModalShell
          title="Tytuł"
          subtitle="Podtytuł modala"
          icon={<span data-testid="modal-icon" />}
          onClose={vi.fn()}
        >
          <div />
        </ModalShell>
      );

      expect(screen.getByText('Podtytuł modala')).toBeTruthy();
      expect(screen.getByTestId('modal-icon')).toBeTruthy();
    });
  });
});
