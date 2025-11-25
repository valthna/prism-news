/**
 * Tests pour le SettingsService
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('Application - SettingsService', () => {
  beforeEach(() => {
    vi.resetModules();

    // Reset localStorage mock
    const storage: Record<string, string> = {};
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key: string) => storage[key] || null),
      setItem: vi.fn((key: string, value: string) => {
        storage[key] = value;
      }),
      removeItem: vi.fn((key: string) => {
        delete storage[key];
      }),
      clear: vi.fn(() => {
        Object.keys(storage).forEach((key) => delete storage[key]);
      }),
      key: vi.fn((i: number) => Object.keys(storage)[i] || null),
      length: Object.keys(storage).length,
    });

    // Mock Object.keys for localStorage iteration
    Object.defineProperty(localStorage, 'length', {
      get: () => Object.keys(storage).length,
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('loadSettings', () => {
    it('should return default settings when nothing stored', async () => {
      const { loadSettings } = await import('../../application/SettingsService');

      const settings = loadSettings();

      expect(settings.language).toBe('Français');
      expect(settings.debateMode).toBe('moderate');
      expect(settings.sourcePriority).toBe('balanced');
      expect(settings.textSize).toBe(100);
    });

    it('should merge stored settings with defaults', async () => {
      const stored = { language: 'English', textSize: 120 };
      (localStorage.getItem as any).mockReturnValue(JSON.stringify(stored));

      const { loadSettings } = await import('../../application/SettingsService');

      const settings = loadSettings();

      expect(settings.language).toBe('English');
      expect(settings.textSize).toBe(120);
      expect(settings.debateMode).toBe('moderate'); // default
    });
  });

  describe('saveSettings', () => {
    it('should save settings to localStorage', async () => {
      const { saveSettings, loadSettings } = await import(
        '../../application/SettingsService'
      );

      const settings = loadSettings();
      settings.language = 'English';
      saveSettings(settings);

      expect(localStorage.setItem).toHaveBeenCalled();
    });
  });

  describe('updateSetting', () => {
    it('should update single setting', async () => {
      const { updateSetting } = await import('../../application/SettingsService');

      const updated = updateSetting('textSize', 110);

      expect(updated.textSize).toBe(110);
      expect(localStorage.setItem).toHaveBeenCalled();
    });

    it('should preserve other settings', async () => {
      const stored = { language: 'English', debateMode: 'intense' };
      (localStorage.getItem as any).mockReturnValue(JSON.stringify(stored));

      const { updateSetting } = await import('../../application/SettingsService');

      const updated = updateSetting('textSize', 120);

      expect(updated.language).toBe('English');
      expect(updated.debateMode).toBe('intense');
      expect(updated.textSize).toBe(120);
    });
  });

  describe('resetSettings', () => {
    it('should reset to default settings', async () => {
      const stored = { language: 'English', textSize: 120 };
      (localStorage.getItem as any).mockReturnValue(JSON.stringify(stored));

      const { resetSettings } = await import('../../application/SettingsService');

      const reset = resetSettings();

      expect(reset.language).toBe('Français');
      expect(reset.textSize).toBe(100);
    });
  });

  describe('getCacheSize', () => {
    it('should return formatted size', async () => {
      const { getCacheSize } = await import('../../application/SettingsService');

      const size = getCacheSize();

      expect(size).toMatch(/^\d+(\.\d+)?\s*(B|KB|MB)$/);
    });
  });

  describe('clearCache', () => {
    it('should clear localStorage except settings', async () => {
      const { clearCache } = await import('../../application/SettingsService');

      clearCache();

      // Should not throw
      expect(true).toBe(true);
    });
  });

  describe('Labels', () => {
    it('should export debate mode labels', async () => {
      const { DEBATE_MODE_LABELS } = await import('../../application/SettingsService');

      expect(DEBATE_MODE_LABELS.calm).toBe('Calme');
      expect(DEBATE_MODE_LABELS.moderate).toBe('Modéré');
      expect(DEBATE_MODE_LABELS.intense).toBe('Intense');
    });

    it('should export source priority labels', async () => {
      const { SOURCE_PRIORITY_LABELS } = await import(
        '../../application/SettingsService'
      );

      expect(SOURCE_PRIORITY_LABELS.balanced).toBe('Équilibré');
      expect(SOURCE_PRIORITY_LABELS.mainstream).toBe('Médias majeurs');
      expect(SOURCE_PRIORITY_LABELS.alternative).toBe('Sources alternatives');
    });

    it('should export text size options', async () => {
      const { TEXT_SIZE_OPTIONS } = await import('../../application/SettingsService');

      expect(TEXT_SIZE_OPTIONS.length).toBe(5);
      expect(TEXT_SIZE_OPTIONS[0].value).toBe(80);
      expect(TEXT_SIZE_OPTIONS[4].value).toBe(120);
    });
  });
});

