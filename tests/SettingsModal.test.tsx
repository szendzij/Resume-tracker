import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SettingsModal } from '../src/components/SettingsModal';
import { JobApplication } from '../src/types';

const CUSTOM_GEMINI_KEY_STORAGE = 'job_tracker_gemini_custom_key_v1';

describe('SettingsModal Component (characterization)', () => {
  const mockOnClose = vi.fn();
  const mockOnSetTheme = vi.fn();
  const mockOnOpenCsvImport = vi.fn();
  const mockOnOpenInboxSync = vi.fn();
  const mockOnImportJson = vi.fn();
  const mockShowToast = vi.fn();

  const applications: JobApplication[] = [
    {
      id: 'app-1',
      role: 'QA Engineer',
      company: 'Acme',
      portal: 'LinkedIn',
      url: 'https://example.com/1',
      appliedDate: '2026-10-01',
      status: 'Wysłana',
    },
    {
      id: 'app-2',
      role: 'SDET',
      company: 'Globex',
      portal: 'NoFluffJobs',
      url: 'https://example.com/2',
      appliedDate: '2026-10-03',
      status: 'Rozmowa HR',
    },
  ];

  const renderModal = (overrides: Partial<React.ComponentProps<typeof SettingsModal>> = {}) =>
    render(
      <SettingsModal
        isOpen={true}
        onClose={mockOnClose}
        isDark={false}
        onSetTheme={mockOnSetTheme}
        applications={applications}
        onOpenCsvImport={mockOnOpenCsvImport}
        onOpenInboxSync={mockOnOpenInboxSync}
        onImportJson={mockOnImportJson}
        showToast={mockShowToast}
        {...overrides}
      />
    );

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.stubGlobal(
      'fetch',
      vi.fn(() => Promise.resolve({ ok: false } as Response))
    );
  });

  it('renders nothing when isOpen is false', () => {
    const { container } = renderModal({ isOpen: false });
    expect(container.firstChild).toBeNull();
  });

  it('renders the modal shell with title, subtitle and all four tab buttons', () => {
    renderModal();

    expect(screen.getByText('Ustawienia aplikacji')).toBeTruthy();
    expect(
      screen.getByText(
        'Zarządzaj motywem, importem/eksportem danych, pocztą oraz modelem Gemini AI'
      )
    ).toBeTruthy();

    expect(screen.getByText('Wygląd i motyw')).toBeTruthy();
    expect(screen.getByText('Import i eksport danych')).toBeTruthy();
    expect(screen.getByText('Sync poczty')).toBeTruthy();
    expect(screen.getByText('Klucz Gemini AI')).toBeTruthy();

    // Footer
    expect(screen.getByText('Zamknij')).toBeTruthy();
  });

  it('shows theme tab by default and lets the user pick light/dark via onSetTheme', () => {
    renderModal({ isDark: false });

    expect(screen.getByText('Wybierz motyw interfejsu')).toBeTruthy();
    expect(screen.getByText('Tryb jasny')).toBeTruthy();
    expect(screen.getByText('Tryb ciemny')).toBeTruthy();

    fireEvent.click(screen.getByText('Tryb ciemny'));
    expect(mockOnSetTheme).toHaveBeenCalledWith('dark');

    fireEvent.click(screen.getByText('Tryb jasny'));
    expect(mockOnSetTheme).toHaveBeenCalledWith('light');
  });

  it('renders the data tab with application count and triggers CSV import', () => {
    renderModal({ initialTab: 'data' });

    expect(screen.getByText('Import i eksport danych')).toBeTruthy();
    // count of applications rendered
    expect(screen.getByText('pozycji')).toBeTruthy();
    const bodyText = document.body.textContent || '';
    expect(bodyText).toContain('Liczba zapisanych aplikacji w bazie:');

    expect(screen.getByText('Eksportuj do CSV')).toBeTruthy();
    expect(screen.getByText('Pobierz kopię JSON')).toBeTruthy();
    expect(screen.getByText('Wybierz plik JSON')).toBeTruthy();

    fireEvent.click(screen.getByText('Otwórz kreator CSV'));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
    expect(mockOnOpenCsvImport).toHaveBeenCalledTimes(1);
  });

  it('renders the email tab with Outlook and Gmail cards and opens inbox sync', () => {
    renderModal({ initialTab: 'email' });

    expect(screen.getByText('Synchronizacja poczty rekrutacyjnej')).toBeTruthy();
    expect(screen.getByText('Microsoft Outlook')).toBeTruthy();
    expect(screen.getByText('Google Gmail')).toBeTruthy();

    fireEvent.click(screen.getByText('Połącz Outlook'));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
    expect(mockOnOpenInboxSync).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByText('Połącz Gmail'));
    expect(mockOnClose).toHaveBeenCalledTimes(2);
    expect(mockOnOpenInboxSync).toHaveBeenCalledTimes(2);
  });

  it('saves a Gemini key to localStorage and clears it via the clear button', async () => {
    renderModal({ initialTab: 'gemini' });

    const input = document.getElementById('gemini-key-input') as HTMLInputElement;
    expect(input).not.toBeNull();

    fireEvent.change(input, { target: { value: '  AIzaSyTESTKEY123  ' } });
    expect(input.value).toBe('  AIzaSyTESTKEY123  ');

    fireEvent.click(screen.getByText('Zapisz ustawienia klucza'));

    await waitFor(() => {
      // setCustomGeminiKey trims before persisting
      expect(localStorage.getItem(CUSTOM_GEMINI_KEY_STORAGE)).toBe('AIzaSyTESTKEY123');
    });
    expect(mockShowToast).toHaveBeenCalledWith('Zapisano własny klucz Gemini API!');

    // Clear button becomes available once a key value is present
    fireEvent.click(screen.getByText('Wyczyść klucz'));
    expect(localStorage.getItem(CUSTOM_GEMINI_KEY_STORAGE)).toBeNull();
    expect(mockShowToast).toHaveBeenCalledWith(
      'Wyczyszczono własny klucz. Aplikacja korzysta z klucza systemowego.'
    );
  });

  it('invokes onClose when the footer close button is clicked', () => {
    renderModal();
    fireEvent.click(screen.getByText('Zamknij'));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('renders connected e-mail tabs from localStorage tokens on open', async () => {
    localStorage.setItem('outlook_access_token', 'token-123');
    renderModal();

    await waitFor(() => {
      // green connection dot rendered inside the email tab button
      const emailTab = screen.getByText('Sync poczty').closest('button');
      expect(emailTab?.querySelector('.bg-emerald-500')).not.toBeNull();
    });
  });
});
