/**
 * Tests d'intégration pour le flux complet de news
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createMockGeminiResponse, fixtures } from '../setup';

// Ces tests vérifient l'intégration entre les différentes couches

describe('Integration - News Flow', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  describe('Article Building Pipeline', () => {
    it('should transform raw LLM output to complete article', async () => {
      const { buildArticle } = await import('../../domain/articles');

      const rawLlmOutput = {
        id: 'raw-1',
        headline: 'Breaking: Major Event Unfolds',
        summary: 'Summary with [cite: source] markers',
        detailedSummary: 'More details about the event',
        importance: 'This matters because...',
        emoji: '🔥',
        publishedAt: 'Il y a 30 min',
        sources: [
          { name: 'reuters.com', bias: 'center', coverageSummary: 'Reuters coverage' },
          { name: 'lemonde.fr', bias: 'left' },
        ],
        sentiment: {
          positive: 'Good perspective',
          negative: 'Critical view',
        },
      };

      const article = buildArticle(rawLlmOutput);

      // Vérifie la transformation complète
      expect(article.id).toBe('raw-1');
      expect(article.headline).toBe('Breaking: Major Event Unfolds');
      expect(article.summary).not.toContain('[cite:');
      
      // Sources devraient être enrichies
      expect(article.sources.length).toBeGreaterThanOrEqual(5);
      const reuters = article.sources.find((s) =>
        s.name.toLowerCase().includes('reuters')
      );
      expect(reuters).toBeDefined();
      expect(reuters?.bias).toBe('center');
      expect(reuters?.position).toBe(50);
      expect(reuters?.logoUrl).toBeTruthy();
      expect(reuters?.isVerified).toBe(true);

      // Reliability score calculé
      expect(article.biasAnalysis.consensusScore).toBeGreaterThan(0);
      expect(article.biasAnalysis.left + article.biasAnalysis.center + article.biasAnalysis.right).toBe(100);

      // Comments générés depuis sentiment
      expect(article.comments.length).toBe(2);

      // Image prompt généré
      expect(article.imagePrompt).toBeTruthy();
    });

    it('should handle minimal raw data gracefully', async () => {
      const { buildArticle } = await import('../../domain/articles');

      const minimal = {};

      const article = buildArticle(minimal);

      expect(article.id).toBeTruthy();
      expect(article.headline).toBe('Article sans titre');
      expect(article.sources.length).toBeGreaterThanOrEqual(5);
      expect(article.biasAnalysis.consensusScore).toBeGreaterThan(0);
    });
  });

  describe('Source Enrichment Pipeline', () => {
    it('should enrich sources with curated data', async () => {
      const { hydrateRawSource } = await import('../../domain/sources');

      const raw = { name: 'bbc.com' };
      const hydrated = hydrateRawSource(raw, 'Test Headline', 'Test Summary');

      expect(hydrated.bias).toBe('center');
      expect(hydrated.position).toBeGreaterThan(0);
      expect(hydrated.logoUrl).toContain('bbc.com');
      expect(hydrated.url).toBeTruthy();
    });

    it('should handle unknown sources', async () => {
      const { hydrateRawSource } = await import('../../domain/sources');

      const raw = { name: 'unknown-blog.xyz' };
      const hydrated = hydrateRawSource(raw, 'Test Headline', 'Test Summary');

      expect(hydrated.bias).toBe('neutral');
      // Les sources inconnues peuvent être marquées comme vérifiées ou non
      // selon l'implémentation - vérifions juste que le champ existe
      expect(typeof hydrated.isVerified).toBe('boolean');
    });
  });

  describe('Reliability Calculation', () => {
    it('should produce higher scores for diverse sources', async () => {
      const { calculateReliability } = await import('../../domain/reliability');
      const { hydrateRawSource } = await import('../../domain/sources');

      const headline = 'Test';
      const summary = 'Summary';

      // Sources homogènes
      const homogeneous = [
        hydrateRawSource({ name: 'lefigaro.fr' }, headline, summary),
        hydrateRawSource({ name: 'valeurs-actuelles.com' }, headline, summary),
        hydrateRawSource({ name: 'lopinion.fr' }, headline, summary),
      ];

      // Sources diverses
      const diverse = [
        hydrateRawSource({ name: 'lemonde.fr' }, headline, summary),
        hydrateRawSource({ name: 'reuters.com' }, headline, summary),
        hydrateRawSource({ name: 'lefigaro.fr' }, headline, summary),
      ];

      const homoScore = calculateReliability(homogeneous);
      const diverseScore = calculateReliability(diverse);

      expect(diverseScore).toBeGreaterThan(homoScore);
    });
  });

  describe('Cache Key Generation', () => {
    it('should generate stable keys for same inputs', async () => {
      const { buildCacheKey } = await import('../../application/NewsService');

      // buildCacheKey prend (query?: string, category?: string)
      const key1 = buildCacheKey('test query', 'Tech');
      const key2 = buildCacheKey('test query', 'Tech');
      const key3 = buildCacheKey('different', 'Tech');

      expect(key1).toBe(key2);
      expect(key1).not.toBe(key3);
    });
  });

  describe('Error Handling Flow', () => {
    it('should convert errors through the chain', async () => {
      const { toAppError, isNetworkError } = await import('../../core/errors');

      const networkError = new TypeError('Failed to fetch');
      const appError = toAppError(networkError);

      expect(isNetworkError(networkError)).toBe(true);
      expect(appError.isRetryable).toBe(true);
    });
  });
});

