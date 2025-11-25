/**
 * Tests pour la configuration d'environnement
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

describe('Config - Environment', () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe('parseBoolean', () => {
    it('should return true for truthy string values', async () => {
      const { parseBoolean } = await import('../../config/env');
      
      expect(parseBoolean('1')).toBe(true);
      expect(parseBoolean('true')).toBe(true);
      expect(parseBoolean('yes')).toBe(true);
      expect(parseBoolean('on')).toBe(true);
      expect(parseBoolean('TRUE')).toBe(true);
      expect(parseBoolean('  true  ')).toBe(true);
    });

    it('should return false for falsy values', async () => {
      const { parseBoolean } = await import('../../config/env');
      
      expect(parseBoolean('0')).toBe(false);
      expect(parseBoolean('false')).toBe(false);
      expect(parseBoolean('')).toBe(false);
      expect(parseBoolean(null as any)).toBe(false);
      expect(parseBoolean(undefined)).toBe(false);
    });

    it('should handle boolean inputs', async () => {
      const { parseBoolean } = await import('../../config/env');
      
      expect(parseBoolean(true)).toBe(true);
      expect(parseBoolean(false)).toBe(false);
    });
  });

  describe('parseNumber', () => {
    it('should parse valid numbers', async () => {
      const { parseNumber } = await import('../../config/env');
      
      expect(parseNumber('42', 0)).toBe(42);
      expect(parseNumber('3.14', 0)).toBe(3.14);
      expect(parseNumber('-10', 0)).toBe(-10);
    });

    it('should return fallback for invalid inputs', async () => {
      const { parseNumber } = await import('../../config/env');
      
      expect(parseNumber('not a number', 99)).toBe(99);
      expect(parseNumber('', 99)).toBe(99);
      expect(parseNumber(undefined, 99)).toBe(99);
    });
  });

  describe('pickString', () => {
    it('should return first non-empty string', async () => {
      const { pickString } = await import('../../config/env');
      
      expect(pickString(undefined, '', 'valid')).toBe('valid');
      expect(pickString('first', 'second')).toBe('first');
      expect(pickString('  trimmed  ')).toBe('trimmed');
    });

    it('should return undefined if no valid string', async () => {
      const { pickString } = await import('../../config/env');
      
      expect(pickString(undefined, null as any, '')).toBeUndefined();
    });
  });

  describe('Environment singleton', () => {
    it('should detect configured state correctly', async () => {
      process.env.VITE_SUPABASE_URL = 'https://test.supabase.co';
      process.env.VITE_SUPABASE_KEY = 'test-key';
      process.env.VITE_API_KEY = 'gemini-key';

      vi.resetModules();
      const { env } = await import('../../config/env');

      expect(env.isSupabaseConfigured).toBe(true);
      expect(env.isGeminiConfigured).toBe(true);
    });

    it('should detect browser/server environment', async () => {
      const { env } = await import('../../config/env');

      // En environnement JSDOM (vitest), window existe donc c'est détecté comme browser
      // Vérifions juste que les valeurs sont cohérentes (mutuellement exclusives)
      expect(env.isServer).toBe(!env.isBrowser);
      expect(typeof env.isServer).toBe('boolean');
      expect(typeof env.isBrowser).toBe('boolean');
    });

    it('should detect mock mode from env', async () => {
      process.env.FORCE_MOCK_DATA = 'true';

      vi.resetModules();
      const { env } = await import('../../config/env');

      expect(env.forceMockData).toBe(true);
    });
  });
});

