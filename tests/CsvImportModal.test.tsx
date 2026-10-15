import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CsvImportModal } from '../src/components/CsvImportModal';
import { JobApplication } from '../src/types';

describe('CsvImportModal (characterization)', () => {
  const mockOnClose = vi.fn();
  const mockOnImport = vi.fn();
  // Stable identity: the real app passes a state array (App.tsx) whose reference is
  // preserved across re-renders. A fresh [] each render would force parseCsvApplications
  // to regenerate row ids, desyncing the checkbox selection.
  const existingApplications: JobApplication[] = [];

  const renderModal = (isOpen = true) =>
    render(
      <CsvImportModal
        isOpen={isOpen}
        onClose={mockOnClose}
        existingApplications={existingApplications}
        onImportApplications={mockOnImport}
      />
    );

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders nothing when isOpen is false', () => {
    const { container } = renderModal(false);
    expect(container.firstChild).toBeNull();
    expect(screen.queryByText('Import danych z pliku CSV')).toBeNull();
  });

  it('renders the header, file/paste tabs and template download action', () => {
    renderModal();

    expect(screen.getByText('Import danych z pliku CSV')).toBeTruthy();
    expect(screen.getByText('Przeciągnij i upuść plik CSV tutaj')).toBeTruthy();

    const templateBtn = screen.getByRole('button', { name: /Pobierz szablon CSV/ });
    expect(templateBtn.getAttribute('title')).toContain('szablon CSV');

    // File tab is active by default, paste tab is not
    const fileTab = screen.getByRole('button', { name: /Wgraj plik/ });
    const pasteTab = screen.getByRole('button', { name: /Wklej treść CSV/ });
    expect(fileTab.className).toContain('bg-blue-50');
    expect(pasteTab.className).not.toContain('bg-blue-50');
  });

  it('shows the empty-state footer hint and a disabled import button before any CSV is loaded', () => {
    renderModal();

    expect(screen.getByText('Wgraj plik lub wklej treść CSV, aby zobaczyć podgląd.')).toBeTruthy();

    const importBtn = screen.getByRole('button', { name: /Zaimportuj/ }) as HTMLButtonElement;
    expect(importBtn).toBeTruthy();
    expect(importBtn.disabled).toBe(true);
    expect(importBtn.getAttribute('type')).toBe('button');

    // No configuration controls yet (no raw CSV text)
    expect(screen.queryByText('Separator kolumn')).toBeNull();
  });

  it('calls onClose when the footer "Anuluj" button is clicked', () => {
    renderModal();

    fireEvent.click(screen.getByRole('button', { name: 'Anuluj' }));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
    expect(mockOnImport).not.toHaveBeenCalled();
  });

  it('calls onClose from the header close (X) button', () => {
    const { container } = renderModal();

    const header = container.querySelector('.border-b') as HTMLElement;
    const closeBtn = header.querySelector('button:last-child') as HTMLButtonElement;
    // The X button is the only header control rendered without a text label
    expect(closeBtn.textContent).toBe('');
    fireEvent.click(closeBtn);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('parses pasted CSV text and enables the import button', async () => {
    renderModal();

    fireEvent.click(screen.getByRole('button', { name: /Wklej treść CSV/ }));
    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;
    expect(textarea.value).toBe('');

    fireEvent.change(textarea, {
      target: { value: 'Stanowisko;Firma;Portal\nQA Engineer;Acme;LinkedIn' },
    });

    await waitFor(() => expect(screen.getByText('Separator kolumn')).toBeTruthy());
    expect(screen.getByText('QA Engineer')).toBeTruthy();
    expect(screen.getByText('Acme')).toBeTruthy();
    expect(screen.getByText('LinkedIn')).toBeTruthy();

    const importBtn = screen.getByRole('button', {
      name: /Zaimportuj \(1\)/,
    }) as HTMLButtonElement;
    expect(importBtn.disabled).toBe(false);
  });

  it('loads sample data, shows the detected delimiter and a filled preview', async () => {
    renderModal();

    fireEvent.click(screen.getByText('Załaduj przykładowe dane CSV'));

    await waitFor(() => expect(screen.getByText('Separator kolumn')).toBeTruthy());

    // Delimiter combobox defaults to "auto" and reports the detected separator
    const delimiterSelect = (screen.getAllByRole('combobox') as HTMLSelectElement[]).find(
      (s) => s.value === 'auto'
    )!;
    expect(delimiterSelect).toBeTruthy();
    const autoOption = delimiterSelect.querySelector('option[value="auto"]') as HTMLOptionElement;
    expect(autoOption.textContent).toContain('wykryto: ";"');

    // Preview rendered with the three sample rows
    expect(screen.getByRole('button', { name: /Wszystkie \(3\)/ })).toBeTruthy();
    expect(screen.getByText('Senior Software Engineer')).toBeTruthy();
    expect(screen.getByText('Allegro')).toBeTruthy();
    expect(screen.getByText('Domyślny status (dla pustych)')).toBeTruthy();
    expect(screen.getByText(/Zaznaczono do importu:/)).toBeTruthy();

    // Import button is enabled because valid rows are auto-selected
    const importBtn = screen.getByRole('button', {
      name: /Zaimportuj \(3\)/,
    }) as HTMLButtonElement;
    expect(importBtn.disabled).toBe(false);
  });

  it('re-parses when the delimiter changes (preview content changes)', async () => {
    renderModal();
    fireEvent.click(screen.getByText('Załaduj przykładowe dane CSV'));

    await waitFor(() => expect(screen.getByText('Separator kolumn')).toBeTruthy());

    // With the auto-detected ';' the first row splits into clean, separate cells
    expect(screen.getByText('Senior Software Engineer')).toBeTruthy();
    expect(screen.getByText('Allegro')).toBeTruthy();

    const delimiterSelect = (screen.getAllByRole('combobox') as HTMLSelectElement[]).find(
      (s) => s.value === 'auto'
    )!;
    fireEvent.change(delimiterSelect, { target: { value: ',' } });

    await waitFor(() => {
      expect(
        (screen.getAllByRole('combobox') as HTMLSelectElement[]).some((s) => s.value === ',')
      ).toBe(true);
    });

    // ',' no longer matches the ';' data: the whole line collapses into one field, so the
    // clean "Senior Software Engineer" / company cells disappear and the merged row shows.
    // Scope to the role cell (<span>) — the paste textarea holds the same raw CSV text.
    await waitFor(() => expect(screen.queryByText('Senior Software Engineer')).toBeNull());
    const mergedRoleCell = screen
      .getAllByText(/Senior Software Engineer;Allegro;Pracuj\.pl/)
      .find((el) => el.tagName === 'SPAN') as HTMLElement;
    expect(mergedRoleCell).toBeTruthy();
    expect(mergedRoleCell.textContent).toContain('TypeScript');
  });

  it('reveals the column mapping grid and applying a mapping changes the parsed rows', async () => {
    renderModal();
    fireEvent.click(screen.getByText('Załaduj przykładowe dane CSV'));

    await waitFor(() => expect(screen.getByText('Separator kolumn')).toBeTruthy());

    expect(screen.queryByText('Mapowanie kolumn z pliku CSV na pola aplikacji')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Dopasuj kolumny/ }));
    await waitFor(() =>
      expect(screen.getByText('Mapowanie kolumn z pliku CSV na pola aplikacji')).toBeTruthy()
    );

    expect(screen.getByText('Allegro')).toBeTruthy();

    // Remap the "Firma" column to "ignore" -> company falls back to the default value
    const firmaSelect = screen
      .getByText('"Firma"')
      .closest('div')!
      .parentElement!.querySelector('select') as HTMLSelectElement;
    expect(firmaSelect.value).toBe('company');

    fireEvent.change(firmaSelect, { target: { value: 'ignore' } });

    await waitFor(() => expect(screen.queryByText('Allegro')).toBeNull());
    // Every one of the three rows now falls back to the default company name
    expect(screen.getAllByText('Nieokreślona firma')).toHaveLength(3);
    expect(screen.getByText('Senior Software Engineer')).toBeTruthy();
  });

  // Regression guard for the selection desync: the first parse pass auto-populates
  // `customMappings`, which recomputes the memo and regenerates every row id. The
  // selection-sync effect used to watch only `totalRows`, so it kept ids from the
  // previous parse and this import delivered an empty array to the caller.
  it('imports selected rows through onImportApplications and closes the modal', async () => {
    renderModal();
    fireEvent.click(screen.getByText('Załaduj przykładowe dane CSV'));

    await waitFor(() =>
      expect(screen.getByRole('button', { name: /Zaimportuj \(3\)/ })).toBeTruthy()
    );

    fireEvent.click(screen.getByRole('button', { name: /Zaimportuj \(3\)/ }));

    expect(mockOnImport).toHaveBeenCalledTimes(1);
    const [apps, skipped] = mockOnImport.mock.calls[0];
    expect(apps).toHaveLength(3);
    expect(apps[0]).toMatchObject({
      role: 'Senior Software Engineer',
      company: 'Allegro',
      portal: 'Pracuj.pl',
      status: 'Rozmowa HR',
      appliedDate: '2026-03-10',
      url: 'https://allegro.pl/praca/software-engineer',
    });
    expect(skipped).toBe(0);
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });
});
