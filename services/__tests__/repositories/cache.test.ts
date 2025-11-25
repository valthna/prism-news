/**
 * Tests pour le CacheRepository
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createMockSupabaseClient, fixtures } from '../setup';

const mockSupabase = createMockSupabaseClient();

vi.mock('../../api/supabase', () => ({
  getSupabaseClient: () => mockSupabase,
  isSupabaseActive: () => true,
  withSupabaseErrorHandling: async (
    _op: string,
    fn: (client: any) => Promise<any>
  ) => fn(mockSupabase),
}));

describe('Repositories - CacheRepository', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();

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
    });
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('Local Cache', () => {
    describe('getLocalCache', () => {
      it('should return null for non-existent key', async () => {
        const { getLocalCache } = await import('../../repositories/CacheRepository');

        const result = getLocalCache('non-existent');

        expect(result).toBeNull();
      });

      it('should return cached articles', async () => {
        const { getLocalCache, saveLocalCache } = await import(
          '../../repositories/CacheRepository'
        );

        const articles = [fixtures.article];
        saveLocalCache('test-key', articles);

        const result = getLocalCache('test-key');

        expect(result).toHaveLength(1);
        expect(result![0].headline).toBe(fixtures.article.headline);
      });

      it('should return null for expired cache', async () => {
        const { getLocalCache } = await import('../../repositories/CacheRepository');

        // Manually set expired cache
        const expiredPayload = {
          timestamp: Date.now() - 60 * 60 * 1000, // 1 hour ago
          articles: [fixtures.article],
        };
        (localStorage.getItem as any).mockReturnValue(
          JSON.stringify(expiredPayload)
        );

        const result = getLocalCache('expired-key');

        expect(result).toBeNull();
      });

      it('should return stale cache when allowStale is true', async () => {
        const { getLocalCache } = await import('../../repositories/CacheRepository');

        const expiredPayload = {
          timestamp: Date.now() - 60 * 60 * 1000,
          articles: [fixtures.article],
        };
        (localStorage.getItem as any).mockReturnValue(
          JSON.stringify(expiredPayload)
        );

        const result = getLocalCache('expired-key', { allowStale: true });

        expect(result).toHaveLength(1);
      });
    });

    describe('saveLocalCache', () => {
      it('should save articles to localStorage', async () => {
        const { saveLocalCache } = await import('../../repositories/CacheRepository');

        saveLocalCache('save-test', [fixtures.article]);

        expect(localStorage.setItem).toHaveBeenCalled();
      });

      it('should strip base64 images to avoid quota issues', async () => {
        const { saveLocalCache } = await import('../../repositories/CacheRepository');

        const articleWithBase64 = {
          ...fixtures.article,
          imageUrl: 'data:image/png;base64,VERYLONGBASE64STRING',
        };

        saveLocalCache('base64-test', [articleWithBase64]);

        const savedCall = (localStorage.setItem as any).mock.calls[0];
        const savedData = JSON.parse(savedCall[1]);

        expect(savedData.articles[0].imageUrl).toBe('');
      });
    });

    describe('clearLocalCache', () => {
      it('should remove cache entry', async () => {
        const { clearLocalCache } = await import('../../repositories/CacheRepository');

        clearLocalCache('test-key');

        expect(localStorage.removeItem).toHaveBeenCalled();
      });
    });
  });

  describe('Supabase Cache', () => {
    describe('getSupabaseCache', () => {
      it('should return cached articles from Supabase', async () => {
        mockSupabase._mocks.newsCache.limit.mockResolvedValue({
          data: [{ articles: [fixtures.article], created_at: new Date().toISOString() }],
          error: null,
        });

        const { getSupabaseCache } = await import('../../repositories/CacheRepository');

        const result = await getSupabaseCache('supabase-key');

        expect(result).toHaveLength(1);
        expect(result![0].headline).toBe(fixtures.article.headline);
      });

      it('should return null when no cache found', async () => {
        mockSupabase._mocks.newsCache.limit.mockResolvedValue({
          data: [],
          error: null,
        });

        const { getSupabaseCache } = await import('../../repositories/CacheRepository');

        const result = await getSupabaseCache('missing-key');

        expect(result).toBeNull();
      });
    });

    describe('saveSupabaseCache', () => {
      it('should insert cache entry', async () => {
        mockSupabase._mocks.newsCache.insert.mockResolvedValue({ error: null });

        const { saveSupabaseCache } = await import('../../repositories/CacheRepository');

        const result = await saveSupabaseCache('new-key', [fixtures.article]);

        expect(result).toBe(true);
        expect(mockSupabase._mocks.newsCache.insert).toHaveBeenCalled();
      });
    });
  });

  describe('Unified Cache', () => {
    describe('getCachedArticles', () => {
      it('should try local cache first', async () => {
        const { getCachedArticles, saveLocalCache } = await import(
          '../../repositories/CacheRepository'
        );

        saveLocalCache('unified-key', [fixtures.article]);

        const result = await getCachedArticles('unified-key');

        expect(result).toHaveLength(1);
        // Should not hit Supabase
        expect(mockSupabase._mocks.newsCache.limit).not.toHaveBeenCalled();
      });

      it('should fallback to Supabase when local cache empty', async () => {
        mockSupabase._mocks.newsCache.limit.mockResolvedValue({
          data: [{ articles: [fixtures.article], created_at: new Date().toISOString() }],
          error: null,
        });

        const { getCachedArticles } = await import('../../repositories/CacheRepository');

        const result = await getCachedArticles('supabase-only');

        expect(result).toHaveLength(1);
      });
    });

    describe('cacheArticles', () => {
      it('should save to both local and Supabase', async () => {
        mockSupabase._mocks.newsCache.insert.mockResolvedValue({ error: null });

        const { cacheArticles } = await import('../../repositories/CacheRepository');

        await cacheArticles('dual-cache', [fixtures.article]);

        expect(localStorage.setItem).toHaveBeenCalled();
        // Supabase save is async/non-blocking, give it a tick
        await new Promise((r) => setTimeout(r, 10));
        expect(mockSupabase._mocks.newsCache.insert).toHaveBeenCalled();
      });
    });
  });
});

