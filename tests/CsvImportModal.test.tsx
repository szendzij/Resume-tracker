import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CsvImportModal } from '../src/components/CsvImportModal';

describe('CsvImportModal (characterization)', () => {
  const mockOnClose = vi.fn();
  const mockOnImport = vi.fn();

  const renderModal = (isOpen = true) =>
    render(
      <CsvImportModal
        isOpen={isOpen}
        onClose={mockOnClose}
        existingApplications={[]}
        onImportApplications={mockOnImport}
      />
    );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when isOpen is false', () => {
    const { container } = renderModal(false);
    expect(container.firstChild).toBeNull();
  });

  it('renders the header, file tab, paste tab and template download action', () => {
    renderModal();

    expect(screen.getByText('Import danych z pliku CSV')).toBeDefined();
    expect(screen.getByRole('button', { name: /Wgraj plik/ })).toBeDefined();
    expect(screen.getByRole('button', { name: /Wklej treść CSV/ })).toBeDefined();
    expect(screen.getByRole('button', { name: /Pobierz szablon CSV/ })).toBeDefined();
    // Dropzone for the default (file) tab
    expect(screen.getByText('Przeciągnij i upuść plik CSV tutaj')).toBeDefined();
  });

  it('shows the empty-state footer hint and a disabled import button before any CSV is loaded', () => {
    renderModal();

    expect(screen.getByText('Wgraj plik lub wklej treść CSV, aby zobaczyć podgląd.')).toBeDefined();

    const importBtn = screen.getByRole('button', { name: /Zaimportuj/ });
    expect((importBtn as HTMLButtonElement).disabled).toBe(true);

    // No configuration controls yet (no raw CSV text)
    expect(screen.queryByText('Separator kolumn')).toBeNull();
  });

  it('calls onClose when the footer "Anuluj" button is clicked', () => {
    renderModal();

    fireEvent.click(screen.getByRole('button', { name: 'Anuluj' }));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose from the header close (X) button', () => {
    const { container } = renderModal();

    const header = container.querySelector('.border-b') as HTMLElement;
    const closeBtn = header.querySelector('button:last-child') as HTMLButtonElement;
    fireEvent.click(closeBtn);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('switches to the paste tab and reveals the raw CSV textarea', () => {
    renderModal();

    fireEvent.click(screen.getByRole('button', { name: /Wklej treść CSV/ }));
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    expect(textarea).toBeDefined();
    expect(textarea.value).toBe('');
  });

  it('loads sample data, shows configuration options with the delimiter select and a preview', async () => {
    renderModal();

    fireEvent.click(screen.getByText('Załaduj przykładowe dane CSV'));

    await waitFor(() => {
      expect(screen.getByText('Separator kolumn')).toBeDefined();
    });

    // Delimiter combobox is present and defaults to "auto"
    const selects = screen.getAllByRole('combobox') as HTMLSelectElement[];
    const delimiterSelect = selects.find((s) => s.value === 'auto');
    expect(delimiterSelect).toBeDefined();

    // Preview rendered with the three sample rows
    expect(screen.getByRole('button', { name: /Wszystkie \(3\)/ })).toBeDefined();
    expect(screen.getByText('Domyślny status (dla pustych)')).toBeDefined();

    // Import button is enabled because valid rows are auto-selected
    const importBtn = screen.getByRole('button', { name: /Zaimportuj \(3\)/ });
    expect((importBtn as HTMLButtonElement).disabled).toBe(false);
  });

  it('re-parses when the delimiter changes', async () => {
    renderModal();
    fireEvent.click(screen.getByText('Załaduj przykładowe dane CSV'));

    await waitFor(() => expect(screen.getByText('Separator kolumn')).toBeDefined());

    const selects = () => screen.getAllByRole('combobox') as HTMLSelectElement[];
    const delimiterSelect = selects().find((s) => s.value === 'auto')!;
    fireEvent.change(delimiterSelect, { target: { value: ';' } });

    await waitFor(() => {
      const updated = (screen.getAllByRole('combobox') as HTMLSelectElement[]).find(
        (s) => s.value === ';'
      );
      expect(updated).toBeDefined();
    });
  });

  it('reveals the column mapping grid after toggling "Dopasuj kolumny"', async () => {
    renderModal();
    fireEvent.click(screen.getByText('Załaduj przykładowe dane CSV'));

    await waitFor(() => expect(screen.getByText('Separator kolumn')).toBeDefined());

    expect(screen.queryByText('Mapowanie kolumn z pliku CSV na pola aplikacji')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: /Dopasuj kolumny/ }));

    await waitFor(() => {
      expect(screen.getByText('Mapowanie kolumn z pliku CSV na pola aplikacji')).toBeDefined();
    });
  });
});
