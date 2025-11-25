/**
 * Tests pour le NewsService (service principal)
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { fixtures } from '../setup';

// Mocks
const mockGenerateText = vi.fn();
const mockPerformMassiveDiscovery = vi.fn();
const mockCacheArticles = vi.fn();
const mockGetCachedArticles = vi.fn();
const mockGetAllArticlesWithImages = vi.fn();
const mockSaveLocalCache = vi.fn();
const mockPersistTiles = vi.fn();
const mockCleanupExpiredTiles = vi.fn();
const mockGetTiles = vi.fn();
const mockRecordGeminiUsage = vi.fn();

vi.mock('../../api/gemini', () => ({
  generateText: (...args: any[]) => mockGenerateText(...args),
  isGeminiConfigured: () => true,
}));

vi.mock('../../api/firecrawl', () => ({
  performMassiveDiscovery: (...args: any[]) => mockPerformMassiveDiscovery(...args),
  isFirecrawlConfigured: () => true,
}));

vi.mock('../../api/supabase', () => ({
  isSupabaseActive: () => true,
}));

vi.mock('../../repositories', () => ({
  getCachedArticles: (...args: any[]) => mockGetCachedArticles(...args),
  cacheArticles: (...args: any[]) => mockCacheArticles(...args),
  getLocalCache: () => null,
  saveLocalCache: (...args: any[]) => mockSaveLocalCache(...args),
  getAllArticlesWithImages: () => mockGetAllArticlesWithImages(),
  persistTiles: (...args: any[]) => mockPersistTiles(...args),
  cleanupExpiredTiles: () => mockCleanupExpiredTiles(),
  getTiles: (...args: any[]) => mockGetTiles(...args),
}));

vi.mock('../../repositories/NewsRepository', () => ({
  sortByRecency: (articles: any[]) => articles,
  sortBySourceRichness: (articles: any[]) => articles,
}));

vi.mock('../../application/ImageService', () => ({
  isImageServiceEnabled: () => false,
  canHostImages: () => false,
  generateArticleImages: vi.fn().mockResolvedValue(new Map()),
}));

vi.mock('../../aiUsageLogger', () => ({
  recordGeminiUsage: (...args: any[]) => mockRecordGeminiUsage(...args),
}));

vi.mock('../../progressTracker', () => ({
  progressTracker: {
    emit: vi.fn(),
  },
}));

const originalEnv = { ...process.env };

describe('Application - NewsService', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mockGenerateText.mockReset();
    mockPerformMassiveDiscovery.mockReset();
    mockCacheArticles.mockReset();
    mockGetCachedArticles.mockReset();
    mockGetAllArticlesWithImages.mockReset();
    mockSaveLocalCache.mockReset();
    mockPersistTiles.mockReset();
    mockCleanupExpiredTiles.mockResolvedValue(undefined);
    mockGetTiles.mockReset();
    mockRecordGeminiUsage.mockResolvedValue(undefined);

    process.env = {
      ...originalEnv,
      VITE_API_KEY: 'test-key',
      VITE_FIRECRAWL_API_KEY: 'test-fc-key',
    };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe('fetchNewsArticles', () => {
    it('should return cached articles when available and sufficient', async () => {
      // Create 10+ articles for cache hit
      const cachedArticles = Array.from({ length: 12 }, (_, i) => ({
        ...fixtures.article,
        id: `cached-${i}`,
        headline: `Cached Article ${i}`,
      }));
      mockGetCachedArticles.mockResolvedValue(cachedArticles);

      const { fetchNewsArticles } = await import('../../application/NewsService');

      const articles = await fetchNewsArticles();

      expect(articles).toHaveLength(12);
      expect(mockGenerateText).not.toHaveBeenCalled();
    });

    it('should fallback to database when cache insufficient', async () => {
      mockGetCachedArticles.mockResolvedValue(null);
      mockGetAllArticlesWithImages.mockResolvedValue([fixtures.article]);

      const { fetchNewsArticles } = await import('../../application/NewsService');

      const articles = await fetchNewsArticles();

      expect(articles).toHaveLength(1);
      expect(mockGetAllArticlesWithImages).toHaveBeenCalled();
    });

    it('should perform Deep Harvest when forceRefresh is true', async () => {
      mockGetCachedArticles.mockResolvedValue(null);
      mockPerformMassiveDiscovery.mockResolvedValue('discovery content');
      mockGenerateText.mockResolvedValue({
        text: JSON.stringify([{ id: '1', headline: 'Test Article', sources: [] }]),
        model: 'gemini-test',
        response: { usageMetadata: {} },
      });

      const { fetchNewsArticles } = await import('../../application/NewsService');

      await fetchNewsArticles(undefined, undefined, true);

      expect(mockGenerateText).toHaveBeenCalled();
    });

    it('should use Firecrawl context when available', async () => {
      mockGetCachedArticles.mockResolvedValue(null);
      mockPerformMassiveDiscovery.mockResolvedValue('news content from firecrawl');
      mockGenerateText.mockResolvedValue({
        text: JSON.stringify([{ id: '1', headline: 'Article', sources: [] }]),
        model: 'gemini-test',
        response: { usageMetadata: {} },
      });

      const { fetchNewsArticles } = await import('../../application/NewsService');

      await fetchNewsArticles('breaking news', undefined, true);

      expect(mockPerformMassiveDiscovery).toHaveBeenCalled();
    });

    it('should cache results after successful Deep Harvest', async () => {
      mockGetCachedArticles.mockResolvedValue(null);
      mockPerformMassiveDiscovery.mockResolvedValue('content');
      mockGenerateText.mockResolvedValue({
        text: JSON.stringify([{ id: '1', headline: 'Test', sources: [] }]),
        model: 'gemini-test',
        response: { usageMetadata: {} },
      });

      const { fetchNewsArticles } = await import('../../application/NewsService');

      await fetchNewsArticles(undefined, undefined, true);

      expect(mockCacheArticles).toHaveBeenCalled();
    });

    it('should parse dirty JSON responses', async () => {
      mockGetCachedArticles.mockResolvedValue(null);
      mockPerformMassiveDiscovery.mockResolvedValue('content');
      mockGenerateText.mockResolvedValue({
        text: `
          Here is the JSON:
          \`\`\`json
          [{"id": "1", "headline": "Cleaned Article"}]
          \`\`\`
        `,
        model: 'gemini-test',
        response: { usageMetadata: {} },
      });

      const { fetchNewsArticles } = await import('../../application/NewsService');

      const articles = await fetchNewsArticles(undefined, undefined, true);

      expect(articles[0].headline).toBe('Cleaned Article');
    });

    it('should return empty array on complete failure with no fallback', async () => {
      mockGetCachedArticles.mockResolvedValue(null);
      mockGetAllArticlesWithImages.mockResolvedValue(null);
      mockGetTiles.mockResolvedValue(null);
      mockPerformMassiveDiscovery.mockResolvedValue(null);
      mockGenerateText.mockRejectedValue(new Error('All models failed'));

      const { fetchNewsArticles } = await import('../../application/NewsService');

      const articles = await fetchNewsArticles(undefined, undefined, true);

      expect(articles).toEqual([]);
    });

    it('should pass category correctly', async () => {
      mockGetCachedArticles.mockResolvedValue(null);
      mockGetAllArticlesWithImages.mockResolvedValue(null);
      mockPerformMassiveDiscovery.mockResolvedValue('content');
      mockGenerateText.mockResolvedValue({
        text: JSON.stringify([{ id: '1', headline: 'Tech News', sources: [] }]),
        model: 'gemini-test',
        response: { usageMetadata: {} },
      });

      const { fetchNewsArticles } = await import('../../application/NewsService');

      await fetchNewsArticles(undefined, 'Technologie', true);

      expect(mockPerformMassiveDiscovery).toHaveBeenCalledWith(
        undefined,
        'Technologie',
        expect.any(Object)
      );
    });
  });

  describe('buildCacheKey', () => {
    it('should create consistent cache keys', async () => {
      const { buildCacheKey } = await import('../../application/NewsService');

      const key1 = buildCacheKey('test', 'Tech');
      const key2 = buildCacheKey('test', 'Tech');

      expect(key1).toBe(key2);
    });

    it('should differentiate by query', async () => {
      const { buildCacheKey } = await import('../../application/NewsService');

      const key1 = buildCacheKey('query1');
      const key2 = buildCacheKey('query2');

      expect(key1).not.toBe(key2);
    });

    it('should differentiate by category', async () => {
      const { buildCacheKey } = await import('../../application/NewsService');

      const key1 = buildCacheKey(undefined, 'cat1');
      const key2 = buildCacheKey(undefined, 'cat2');

      expect(key1).not.toBe(key2);
    });

    it('should be case insensitive', async () => {
      const { buildCacheKey } = await import('../../application/NewsService');

      const key1 = buildCacheKey('TEST');
      const key2 = buildCacheKey('test');

      expect(key1).toBe(key2);
    });
  });
});
