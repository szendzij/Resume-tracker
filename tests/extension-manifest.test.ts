import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';

describe('Extension Manifest & Assets', () => {
  const extensionDir = path.resolve(__dirname, '..', 'extension');
  const manifestPath = path.join(extensionDir, 'manifest.json');

  it('extension/manifest.json exists and is valid JSON', () => {
    expect(fs.existsSync(manifestPath)).toBe(true);
    const content = fs.readFileSync(manifestPath, 'utf-8');
    expect(() => JSON.parse(content)).not.toThrow();
  });

  it('manifest_version is 3', () => {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    expect(manifest.manifest_version).toBe(3);
  });

  it('contains required permissions: activeTab, scripting, storage', () => {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    expect(Array.isArray(manifest.permissions)).toBe(true);
    expect(manifest.permissions).toContain('activeTab');
    expect(manifest.permissions).toContain('scripting');
    expect(manifest.permissions).toContain('storage');
  });

  it('contains required host_permissions: http://*/* and https://*/*', () => {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    expect(Array.isArray(manifest.host_permissions)).toBe(true);
    expect(manifest.host_permissions).toContain('http://*/*');
    expect(manifest.host_permissions).toContain('https://*/*');
  });

  it('defines popup.html as action.default_popup', () => {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    expect(manifest.action).toBeDefined();
    expect(manifest.action.default_popup).toBe('popup.html');
  });

  it('defines commands._execute_action with default shortcut Alt+Shift+J and description', () => {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    expect(manifest.commands).toBeDefined();
    expect(manifest.commands._execute_action).toBeDefined();
    expect(manifest.commands._execute_action.suggested_key).toBeDefined();
    expect(manifest.commands._execute_action.suggested_key.default).toBe('Alt+Shift+J');
    expect(manifest.commands._execute_action.description).toBeTruthy();
  });

  it('references existing icon files that have non-zero size on disk', () => {
    const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));
    const icons = manifest.icons || {};
    const actionIcons = manifest.action?.default_icon || {};

    const sizes = ['16', '48', '128'];

    for (const size of sizes) {
      const iconRelPath = icons[size] || actionIcons[size];
      expect(iconRelPath, `Icon path for ${size} should be defined in manifest`).toBeDefined();

      const fullIconPath = path.join(extensionDir, iconRelPath);
      expect(fs.existsSync(fullIconPath), `Icon file ${fullIconPath} must exist`).toBe(true);

      const stats = fs.statSync(fullIconPath);
      expect(stats.size, `Icon file ${fullIconPath} must have non-zero size`).toBeGreaterThan(0);
    }
  });
});
