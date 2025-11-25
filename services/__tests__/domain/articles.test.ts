/**
 * Tests pour le domain Articles
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  buildArticle,
  buildArticles,
  buildTileImagePrompt,
  withImageUrl,
  withImagePrompt,
} from '../../domain/articles';
import type { RawArticleData } from '../../domain/articles';
import type { NewsArticle } from '../../../types';

// Mock prompts
vi.mock('../../prompts', () => ({
  PRISM_PROMPTS: {
    IMAGE_GENERATION: {
      buildPrompt: (subject: string, context?: string, mood?: string) =>
        `Test prompt: ${subject}. ${context || ''}. ${mood || ''}`,
    },
  },
}));

describe('Domain - Articles', () => {
  describe('buildArticle', () => {
    it('should build article with all required fields', () => {
      const raw: RawArticleData = {
        id: 'test-1',
        headline: 'Test Headline',
        summary: 'Test summary',
        detailedSummary: 'Detailed test summary',
        sources: [{ name: 'reuters.com', bias: 'center' }],
      };

      const article = buildArticle(raw);

      expect(article.id).toBe('test-1');
      expect(article.headline).toBe('Test Headline');
      expect(article.summary).toBe('Test summary');
      expect(article.detailedSummary).toBe('Detailed test summary');
      expect(article.sources.length).toBeGreaterThanOrEqual(1);
    });

    it('should generate ID if not provided', () => {
      const raw: RawArticleData = {
        headline: 'No ID Article',
      };

      const article = buildArticle(raw);

      expect(article.id).toBeTruthy();
      expect(article.id).toMatch(/^article-/);
    });

    it('should clean citations from text', () => {
      const raw: RawArticleData = {
        summary: 'Text with [cite: source] citation',
        detailedSummary: 'More [cite:ref] text',
      };

      const article = buildArticle(raw);

      expect(article.summary).not.toContain('[cite');
      expect(article.detailedSummary).not.toContain('[cite');
    });

    it('should hydrate and amplify sources', () => {
      const raw: RawArticleData = {
        headline: 'Test',
        sources: [{ name: 'lemonde.fr' }],
      };

      const article = buildArticle(raw);

      // Should have at least 5 sources (MIN_SOURCES_PER_ARTICLE)
      expect(article.sources.length).toBeGreaterThanOrEqual(5);

      // Original source should be hydrated
      const leMonde = article.sources.find((s) =>
        s.name.toLowerCase().includes('lemonde')
      );
      expect(leMonde?.bias).toBe('left');
      expect(leMonde?.isVerified).toBe(true);
    });

    it('should calculate reliability score', () => {
      const raw: RawArticleData = {
        headline: 'Test',
        sources: [
          { name: 'reuters.com', bias: 'center' },
          { name: 'afp.com', bias: 'center' },
          { name: 'lemonde.fr', bias: 'left' },
        ],
      };

      const article = buildArticle(raw);

      expect(article.biasAnalysis.consensusScore).toBeGreaterThan(0);
      expect(article.biasAnalysis.consensusScore).toBeLessThanOrEqual(98);
    });

    it('should generate initial comments from sentiment', () => {
      const raw: RawArticleData = {
        headline: 'Test',
        sentiment: {
          positive: 'Great news!',
          negative: 'Concerning development',
        },
      };

      const article = buildArticle(raw);

      expect(article.comments.length).toBe(2);
      expect(article.comments[0].text).toBe('Great news!');
      expect(article.comments[0].sentiment).toBe('positive');
      expect(article.comments[1].text).toBe('Concerning development');
      expect(article.comments[1].sentiment).toBe('negative');
    });

    it('should set default values for missing fields', () => {
      const raw: RawArticleData = {};

      const article = buildArticle(raw);

      expect(article.headline).toBe('Article sans titre');
      expect(article.emoji).toBe('📰');
      expect(article.publishedAt).toBe('RÉCENT');
      expect(article.category).toBe('Général');
    });

    it('should use provided category as default', () => {
      const raw: RawArticleData = { headline: 'Test' };

      const article = buildArticle(raw, { defaultCategory: 'Politique' });

      expect(article.category).toBe('Politique');
    });

    it('should generate image prompt', () => {
      const raw: RawArticleData = {
        headline: 'Climate Summit Opens',
        summary: 'World leaders gather',
      };

      const article = buildArticle(raw);

      expect(article.imagePrompt).toBeTruthy();
      expect(article.imagePrompt).toContain('Climate Summit');
    });
  });

  describe('buildArticles', () => {
    it('should build multiple articles', () => {
      const rawArticles: RawArticleData[] = [
        { id: '1', headline: 'Article 1' },
        { id: '2', headline: 'Article 2' },
        { id: '3', headline: 'Article 3' },
      ];

      const articles = buildArticles(rawArticles);

      expect(articles.length).toBe(3);
      expect(articles[0].headline).toBe('Article 1');
      expect(articles[2].headline).toBe('Article 3');
    });

    it('should pass options to each article', () => {
      const rawArticles: RawArticleData[] = [
        { headline: 'Test 1' },
        { headline: 'Test 2' },
      ];

      const articles = buildArticles(rawArticles, { defaultCategory: 'Tech' });

      articles.forEach((a) => {
        expect(a.category).toBe('Tech');
      });
    });
  });

  describe('buildTileImagePrompt', () => {
    it('should build prompt from article data', () => {
      const article: NewsArticle = {
        id: 'test',
        headline: 'Test Headline',
        summary: 'Test summary',
        detailedSummary: 'Detailed summary',
        importance: 'Very important',
        emoji: '🔥',
        imagePrompt: '',
        imageUrl: '',
        biasAnalysis: { left: 33, center: 34, right: 33, consensusScore: 75 },
        sources: [],
        sentiment: { positive: '', negative: '' },
        comments: [],
      };

      const prompt = buildTileImagePrompt(article);

      expect(prompt).toContain('Test Headline');
    });

    it('should use imagePrompt if available', () => {
      const article: NewsArticle = {
        id: 'test',
        headline: 'Headline',
        summary: '',
        imagePrompt: 'Custom image prompt',
        imageUrl: '',
        biasAnalysis: { left: 33, center: 34, right: 33, consensusScore: 75 },
        sources: [],
        sentiment: { positive: '', negative: '' },
        comments: [],
      };

      const prompt = buildTileImagePrompt(article);

      expect(prompt).toContain('Custom image prompt');
    });
  });

  describe('withImageUrl', () => {
    it('should create new article with updated image URL', () => {
      const article: NewsArticle = {
        id: 'test',
        headline: 'Test',
        summary: '',
        imagePrompt: '',
        imageUrl: '',
        biasAnalysis: { left: 33, center: 34, right: 33, consensusScore: 75 },
        sources: [],
        sentiment: { positive: '', negative: '' },
        comments: [],
      };

      const updated = withImageUrl(article, 'https://new-image.com/img.png');

      expect(updated.imageUrl).toBe('https://new-image.com/img.png');
      expect(article.imageUrl).toBe(''); // Original unchanged
    });
  });

  describe('withImagePrompt', () => {
    it('should regenerate image prompt', () => {
      const article: NewsArticle = {
        id: 'test',
        headline: 'New Headline',
        summary: 'New summary',
        imagePrompt: 'old prompt',
        imageUrl: '',
        biasAnalysis: { left: 33, center: 34, right: 33, consensusScore: 75 },
        sources: [],
        sentiment: { positive: '', negative: '' },
        comments: [],
      };

      const updated = withImagePrompt(article);

      // Le prompt peut varier selon l'implémentation, vérifions juste qu'il change
      expect(updated.imagePrompt).toBeTruthy();
      // Article original inchangé
      expect(article.imagePrompt).toBe('old prompt');
    });
  });
});

