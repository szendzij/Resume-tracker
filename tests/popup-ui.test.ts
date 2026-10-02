import { describe, it, expect, beforeEach } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Extension Popup UI Markup & CSS', () => {
  const extensionDir = path.resolve(__dirname, '..', 'extension');
  const popupHtmlPath = path.join(extensionDir, 'popup.html');
  const popupCssPath = path.join(extensionDir, 'popup.css');

  describe('File existence', () => {
    it('extension/popup.html exists', () => {
      expect(fs.existsSync(popupHtmlPath)).toBe(true);
    });

    it('extension/popup.css exists', () => {
      expect(fs.existsSync(popupCssPath)).toBe(true);
    });
  });

  describe('Markup Structure and Security', () => {
    let document: Document;

    beforeEach(() => {
      if (!fs.existsSync(popupHtmlPath)) {
        throw new Error('popup.html does not exist');
      }
      const htmlContent = fs.readFileSync(popupHtmlPath, 'utf-8');
      const parser = new DOMParser();
      document = parser.parseFromString(htmlContent, 'text/html');
    });

    it('links external popup.css and popup.js with no inline scripts or inline event handlers', () => {
      const cssLink = document.querySelector('link[rel="stylesheet"]');
      expect(cssLink).not.toBeNull();
      expect(cssLink?.getAttribute('href')).toBe('popup.css');

      const scripts = Array.from(document.querySelectorAll('script'));
      expect(scripts.length).toBeGreaterThanOrEqual(1);

      // Verify popup.js script tag
      const popupScript = scripts.find(s => s.getAttribute('src') === 'popup.js');
      expect(popupScript).toBeDefined();

      // Zero inline script tags (no textContent inside script tags)
      for (const script of scripts) {
        expect(script.textContent?.trim()).toBe('');
      }

      // Zero inline event handlers (onclick, onload, onchange, onsubmit, etc.)
      const allElements = Array.from(document.querySelectorAll('*'));
      for (const el of allElements) {
        for (const attr of Array.from(el.attributes)) {
          expect(
            attr.name.toLowerCase().startsWith('on'),
            `Element <${el.tagName.toLowerCase()}> has disallowed inline event handler: ${attr.name}`
          ).toBe(false);
        }
      }
    });

    it('contains the header with title, server status dot and settings button', () => {
      const header = document.querySelector('header');
      expect(header).not.toBeNull();
      expect(header?.textContent).toContain('Resume Tracker');

      const statusDot = document.getElementById('server-status-dot');
      expect(statusDot).not.toBeNull();

      const btnSettings = document.getElementById('btn-settings');
      expect(btnSettings).not.toBeNull();
    });

    it('contains all 5 view containers', () => {
      const viewLoading = document.getElementById('view-loading');
      const viewForm = document.getElementById('view-form');
      const viewSuccess = document.getElementById('view-success');
      const viewSettings = document.getElementById('view-settings');
      const viewError = document.getElementById('view-error');

      expect(viewLoading).not.toBeNull();
      expect(viewForm).not.toBeNull();
      expect(viewSuccess).not.toBeNull();
      expect(viewSettings).not.toBeNull();
      expect(viewError).not.toBeNull();
    });

    it('contains required elements in #view-loading', () => {
      const pill = document.getElementById('loading-portal-pill');
      expect(pill).not.toBeNull();
      const spinner = document.querySelector('#view-loading .spinner, #view-loading .loading-spinner');
      expect(spinner).not.toBeNull();
    });

    it('contains duplicate banner with message and update/save-new buttons in #view-form', () => {
      const banner = document.getElementById('duplicate-banner');
      expect(banner).not.toBeNull();
      expect(banner?.classList.contains('hidden')).toBe(true);

      const duplicateText = document.getElementById('duplicate-text');
      expect(duplicateText).not.toBeNull();

      const btnUpdate = document.getElementById('btn-update');
      expect(btnUpdate).not.toBeNull();

      const btnSaveNew = document.getElementById('btn-save-new');
      expect(btnSaveNew).not.toBeNull();
    });

    it('contains all required job form fields in #view-form', () => {
      expect(document.getElementById('field-role')).not.toBeNull();
      expect(document.getElementById('field-company')).not.toBeNull();
      expect(document.getElementById('field-location')).not.toBeNull();
      expect(document.getElementById('field-salary')).not.toBeNull();
      expect(document.getElementById('field-portal')).not.toBeNull();
      expect(document.getElementById('field-status')).not.toBeNull();
      expect(document.getElementById('field-notes')).not.toBeNull();

      // Work type container and options
      const workTypeGroup = document.getElementById('work-type-group');
      expect(workTypeGroup).not.toBeNull();
      expect(workTypeGroup?.textContent).toMatch(/Zdalnie/i);
      expect(workTypeGroup?.textContent).toMatch(/Hybrydowo/i);
      expect(workTypeGroup?.textContent).toMatch(/Biuro/i);

      // Status selector options
      const statusSelect = document.getElementById('field-status') as HTMLSelectElement;
      expect(statusSelect).not.toBeNull();
      const options = Array.from(statusSelect.options).map(opt => opt.value);
      expect(options).toContain('Do zaaplikowania');
      expect(options).toContain('Wysłana');

      // 'Do zaaplikowania' is selected by default
      const defaultOption = Array.from(statusSelect.options).find(opt => opt.value === 'Do zaaplikowania');
      expect(defaultOption?.selected).toBe(true);

      // Skills management
      expect(document.getElementById('skills-container')).not.toBeNull();
      expect(document.getElementById('input-new-skill')).not.toBeNull();
      expect(document.getElementById('btn-add-skill')).not.toBeNull();

      // Full text checkbox
      const chkFullText = document.getElementById('chk-include-full-text') as HTMLInputElement;
      expect(chkFullText).not.toBeNull();
      expect(chkFullText.type).toBe('checkbox');

      // Action buttons
      expect(document.getElementById('btn-cancel')).not.toBeNull();
      const btnSave = document.getElementById('btn-save');
      expect(btnSave).not.toBeNull();
      expect(btnSave?.textContent).toContain('Zapisz');
    });

    it('contains required elements in #view-success', () => {
      const btnOpenApp = document.getElementById('btn-open-app');
      expect(btnOpenApp).not.toBeNull();

      const btnCloseSuccess = document.getElementById('btn-close-success');
      expect(btnCloseSuccess).not.toBeNull();
    });

    it('contains required elements in #view-settings', () => {
      expect(document.getElementById('input-server-url')).not.toBeNull();
      expect(document.getElementById('btn-test-connection')).not.toBeNull();
      expect(document.getElementById('test-connection-status')).not.toBeNull();
      expect(document.getElementById('input-custom-api-key')).not.toBeNull();
      expect(document.getElementById('btn-save-settings')).not.toBeNull();
      expect(document.getElementById('btn-back-from-settings')).not.toBeNull();
    });

    it('contains required elements in #view-error', () => {
      expect(document.getElementById('error-message')).not.toBeNull();
      expect(document.getElementById('btn-retry')).not.toBeNull();
      expect(document.getElementById('btn-goto-settings')).not.toBeNull();
    });
  });

  describe('CSS Stylesheet', () => {
    it('defines dark theme palette (#0f172a, #1e293b), indigo accent (#6366f1) and popup width around 400px', () => {
      expect(fs.existsSync(popupCssPath)).toBe(true);
      const css = fs.readFileSync(popupCssPath, 'utf-8').toLowerCase();

      // Palette check
      expect(css.includes('#0f172a') || css.includes('rgb(15, 23, 42)')).toBe(true);
      expect(css.includes('#1e293b') || css.includes('rgb(30, 41, 59)')).toBe(true);
      expect(css.includes('#6366f1') || css.includes('rgb(99, 102, 241)')).toBe(true);

      // Width check (around 400px)
      expect(css.match(/width:\s*400px/) || css.match(/max-width:\s*400px/) || css.match(/width:\s*390px/)).toBeTruthy();

      // Hidden utility class
      expect(css.includes('.hidden')).toBe(true);
    });
  });
});
