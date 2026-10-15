import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { SettingsModal } from '../src/components/SettingsModal';
import { api } from '../src/services/api';
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

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('renders nothing when isOpen is false', () => {
    const { container } = renderModal({ isOpen: false });
    expect(container.firstChild).toBeNull();
    // No modal chrome leaked into the document
    expect(screen.queryByText('Ustawienia aplikacji')).toBeNull();
  });

  it('renders the modal shell with title, subtitle and all four tab buttons', () => {
    renderModal();

    expect(screen.getByText('Ustawienia aplikacji')).toBeTruthy();
    expect(
      screen.getByText(
        'Zarządzaj motywem, importem/eksportem danych, pocztą oraz modelem Gemini AI'
      )
    ).toBeTruthy();

    // The four navigation entries are real buttons, not just text nodes
    for (const label of [
      'Wygląd i motyw',
      'Import i eksport danych',
      'Sync poczty',
      'Klucz Gemini AI',
    ]) {
      const tab = screen.getByRole('button', { name: new RegExp(label) });
      expect(tab.getAttribute('type')).toBe('button');
    }

    // Footer
    const footerClose = screen.getByRole('button', { name: 'Zamknij' });
    expect(footerClose.getAttribute('type')).toBe('button');
  });

  it('switches the visible section when another tab is clicked', () => {
    renderModal(); // defaults to the theme tab

    expect(screen.getByText('Wybierz motyw interfejsu')).toBeTruthy();

    fireEvent.click(screen.getByText('Import i eksport danych'));
    expect(screen.queryByText('Wybierz motyw interfejsu')).toBeNull();
    expect(screen.getByText('Eksport danych')).toBeTruthy();

    fireEvent.click(screen.getByText('Klucz Gemini AI'));
    expect(screen.queryByText('Eksport danych')).toBeNull();
    expect(screen.getByText('Konfiguracja Google Gemini AI')).toBeTruthy();

    fireEvent.click(screen.getByText('Sync poczty'));
    expect(screen.queryByText('Konfiguracja Google Gemini AI')).toBeNull();
    expect(screen.getByText('Synchronizacja poczty rekrutacyjnej')).toBeTruthy();

    fireEvent.click(screen.getByText('Wygląd i motyw'));
    expect(screen.getByText('Wybierz motyw interfejsu')).toBeTruthy();
    expect(screen.queryByText('Synchronizacja poczty rekrutacyjnej')).toBeNull();
  });

  it('shows theme tab by default, lets the user pick light/dark and marks the active card', () => {
    renderModal({ isDark: false });

    expect(screen.getByText('Wybierz motyw interfejsu')).toBeTruthy();
    expect(screen.getByText('Tryb jasny')).toBeTruthy();
    expect(screen.getByText('Tryb ciemny')).toBeTruthy();

    // The currently active theme card carries the "ring-2" highlight; the other does not
    const lightCard = screen.getByText('Tryb jasny').closest('button') as HTMLButtonElement;
    const darkCard = screen.getByText('Tryb ciemny').closest('button') as HTMLButtonElement;
    expect(lightCard.className).toContain('ring-2');
    expect(darkCard.className).not.toContain('ring-2');

    fireEvent.click(darkCard);
    expect(mockOnSetTheme).toHaveBeenCalledWith('dark');

    fireEvent.click(lightCard);
    expect(mockOnSetTheme).toHaveBeenCalledWith('light');
  });

  it('renders the data tab with the exact application count and triggers CSV import', () => {
    renderModal({ initialTab: 'data' });

    const summaryLabel = screen.getByText('Liczba zapisanych aplikacji w bazie:');
    const summaryValue = summaryLabel.parentElement!.querySelector('p')!;
    expect(summaryValue.textContent).toContain('2');
    expect(summaryValue.textContent).toContain('pozycji');

    expect(screen.getByText('Eksportuj do CSV')).toBeTruthy();
    expect(screen.getByText('Pobierz kopię JSON')).toBeTruthy();
    expect(screen.getByText('Wybierz plik JSON')).toBeTruthy();

    fireEvent.click(screen.getByText('Otwórz kreator CSV'));
    // Closing settings must happen before opening the CSV wizard
    expect(mockOnClose).toHaveBeenCalledTimes(1);
    expect(mockOnOpenCsvImport).toHaveBeenCalledTimes(1);
    expect(mockOnClose.mock.invocationCallOrder[0]).toBeLessThan(
      mockOnOpenCsvImport.mock.invocationCallOrder[0]
    );
  });

  it('previews a JSON backup file and imports it with the selected mode', async () => {
    renderModal({ initialTab: 'data' });

    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).not.toBeNull();
    expect(fileInput.getAttribute('accept')).toContain('.json');

    const file = new File([JSON.stringify(applications)], 'backup.json', {
      type: 'application/json',
    });
    fireEvent.change(fileInput, { target: { files: [file] } });

    await waitFor(() => expect(screen.getByText(/Odczytano plik:.*backup\.json/)).toBeTruthy());
    expect(screen.getByText('2 ofert pracy')).toBeTruthy();

    // Default mode is merge; switch to overwrite and confirm
    fireEvent.click(screen.getByLabelText('Zastąp obecne dane (Overwrite)'));
    fireEvent.click(screen.getByText('Zatwierdź import'));

    expect(mockOnImportJson).toHaveBeenCalledTimes(1);
    expect(mockOnImportJson).toHaveBeenCalledWith(applications, 'overwrite');
    // Preview is dismissed after the confirmed import
    expect(screen.queryByText(/Odczytano plik:/)).toBeNull();
  });

  it('renders the email tab with Outlook and Gmail cards and opens inbox sync', () => {
    renderModal({ initialTab: 'email' });

    expect(screen.getByText('Synchronizacja poczty rekrutacyjnej')).toBeTruthy();
    expect(screen.getByText('Microsoft Outlook')).toBeTruthy();
    expect(screen.getByText('Google Gmail')).toBeTruthy();
    // Both accounts start disconnected
    expect(screen.getAllByText('Niepołączono')).toHaveLength(2);

    fireEvent.click(screen.getByText('Połącz Outlook'));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
    expect(mockOnOpenInboxSync).toHaveBeenCalledTimes(1);
    expect(mockOnClose.mock.invocationCallOrder[0]).toBeLessThan(
      mockOnOpenInboxSync.mock.invocationCallOrder[0]
    );

    fireEvent.click(screen.getByText('Połącz Gmail'));
    expect(mockOnClose).toHaveBeenCalledTimes(2);
    expect(mockOnOpenInboxSync).toHaveBeenCalledTimes(2);
  });

  it('disconnects a connected Outlook account, drops its tokens and shows a toast', () => {
    localStorage.setItem('outlook_access_token', 'token-123');
    localStorage.setItem('outlook_account_email', 'qa@example.com');
    renderModal({ initialTab: 'email' });

    expect(screen.getByText('Połączono')).toBeTruthy();

    fireEvent.click(screen.getByText('Rozłącz'));

    expect(localStorage.getItem('outlook_access_token')).toBeNull();
    expect(localStorage.getItem('outlook_account_email')).toBeNull();
    expect(mockShowToast).toHaveBeenCalledWith('Rozłączono konto Microsoft Outlook.');
    // The card flips back to the disconnected state
    expect(screen.getAllByText('Niepołączono')).toHaveLength(2);
  });

  it('saves a Gemini key to localStorage, shows the override badge and clears it again', async () => {
    renderModal({ initialTab: 'gemini' });

    const input = document.getElementById('gemini-key-input') as HTMLInputElement;
    expect(input).not.toBeNull();
    expect(input.getAttribute('type')).toBe('password');

    // No key yet: neither the badge nor the clear button is rendered
    expect(screen.queryByText('Aktywny klucz użytkownika (Override)')).toBeNull();
    expect(screen.queryByText('Wyczyść klucz')).toBeNull();

    fireEvent.change(input, { target: { value: '  AIzaSyTESTKEY123  ' } });
    expect(input.value).toBe('  AIzaSyTESTKEY123  ');

    fireEvent.click(screen.getByText('Zapisz ustawienia klucza'));

    await waitFor(() => {
      // setCustomGeminiKey trims before persisting
      expect(localStorage.getItem(CUSTOM_GEMINI_KEY_STORAGE)).toBe('AIzaSyTESTKEY123');
    });
    expect(mockShowToast).toHaveBeenCalledWith('Zapisano własny klucz Gemini API!');

    // Override badge and the tab-level "Własny" pill appear, clear button becomes available
    expect(screen.getByText('Aktywny klucz użytkownika (Override)')).toBeTruthy();
    expect(screen.getByText('Własny')).toBeTruthy();
    const clearBtn = screen.getByText('Wyczyść klucz');
    expect(clearBtn).toBeTruthy();

    fireEvent.click(clearBtn);
    expect(localStorage.getItem(CUSTOM_GEMINI_KEY_STORAGE)).toBeNull();
    expect(mockShowToast).toHaveBeenCalledWith(
      'Wyczyszczono własny klucz. Aplikacja korzysta z klucza systemowego.'
    );
    // Badge / clear button disappear once the key is gone
    expect(screen.queryByText('Aktywny klucz użytkownika (Override)')).toBeNull();
    expect(screen.queryByText('Wyczyść klucz')).toBeNull();
  });

  it('tests the Gemini key through api.validateGeminiKey and renders the success banner', async () => {
    const validate = vi.spyOn(api, 'validateGeminiKey').mockResolvedValue({
      valid: true,
      model: 'gemini-3.5-flash',
      response: 'pong',
    });

    renderModal({ initialTab: 'gemini' });

    const input = document.getElementById('gemini-key-input') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'AIzaSyTESTKEY' } });

    fireEvent.click(screen.getByText('Testuj połączenie'));

    await waitFor(() => expect(validate).toHaveBeenCalledWith('AIzaSyTESTKEY'));
    await waitFor(() =>
      expect(
        screen.getByText(/Klucz jest poprawny! Odpowiedź modelu gemini-3\.5-flash: "pong"/)
      ).toBeTruthy()
    );
    expect(screen.getByText('Połączenie z Gemini API aktywne!')).toBeTruthy();
    expect(mockShowToast).toHaveBeenCalledWith('Test Gemini API powiódł się!');
  });

  it('surfaces a failed key validation as an error banner', async () => {
    const validate = vi.spyOn(api, 'validateGeminiKey').mockResolvedValue({
      valid: false,
      model: 'gemini-3.5-flash',
      error: 'Nieprawidłowy klucz API',
    });

    renderModal({ initialTab: 'gemini' });
    fireEvent.click(screen.getByText('Testuj połączenie'));

    await waitFor(() => expect(validate).toHaveBeenCalled());
    await waitFor(() => expect(screen.getByText('Błąd połączenia z Gemini API')).toBeTruthy());
    expect(screen.getByText('Nieprawidłowy klucz API')).toBeTruthy();
    // No success toast on failure
    expect(mockShowToast).not.toHaveBeenCalledWith('Test Gemini API powiódł się!');
  });

  it('reflects the server Gemini status banner and model from api.getGeminiStatus', async () => {
    vi.spyOn(api, 'getGeminiStatus').mockResolvedValue({
      hasEnvKey: true,
      model: 'gemini-9-pro',
    });

    renderModal({ initialTab: 'gemini' });

    await waitFor(() => expect(screen.getByText('Aktywny klucz środowiska AI Studio')).toBeTruthy());
    expect(screen.getByText('gemini-9-pro')).toBeTruthy();
  });

  it('invokes onClose when the footer close button is clicked', () => {
    renderModal();
    fireEvent.click(screen.getByRole('button', { name: 'Zamknij' }));
    expect(mockOnClose).toHaveBeenCalledTimes(1);
  });

  it('renders connected e-mail status dots from localStorage tokens on open', async () => {
    localStorage.setItem('outlook_access_token', 'token-123');
    localStorage.setItem('gmail_access_token', 'token-456');
    renderModal();

    await waitFor(() => {
      // green connection dot rendered inside the email tab button
      const emailTab = screen.getByText('Sync poczty').closest('button');
      expect(emailTab?.querySelector('.bg-emerald-500')).not.toBeNull();
    });
  });
});
