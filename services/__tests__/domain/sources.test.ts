/**
 * Tests pour le domain Sources
 */

import { describe, it, expect } from 'vitest';
import {
  CURATED_SOURCE_POOL,
  DEFAULT_POSITION_BY_BIAS,
  findKnownSourceProfile,
  getSourcesByBias,
  sanitizeBias,
  enrichCoverageSummary,
  hydrateRawSource,
  dedupeSources,
  ensureSourceFloor,
} from '../../domain/sources';
import type { Source, Bias } from '../../../types';

describe('Domain - Sources', () => {
  describe('SourcePool', () => {
    describe('CURATED_SOURCE_POOL', () => {
      it('should have sources for each bias', () => {
        expect(CURATED_SOURCE_POOL.left.length).toBeGreaterThan(0);
        expect(CURATED_SOURCE_POOL.center.length).toBeGreaterThan(0);
        expect(CURATED_SOURCE_POOL.right.length).toBeGreaterThan(0);
        expect(CURATED_SOURCE_POOL.neutral.length).toBeGreaterThan(0);
      });

      it('should have proper structure for each source', () => {
        const source = CURATED_SOURCE_POOL.left[0];

        expect(source).toHaveProperty('name');
        expect(source).toHaveProperty('bias');
        expect(source).toHaveProperty('position');
        expect(source).toHaveProperty('defaultSummary');
      });

      it('should have positions in valid range', () => {
        Object.values(CURATED_SOURCE_POOL).flat().forEach((source) => {
          expect(source.position).toBeGreaterThanOrEqual(0);
          expect(source.position).toBeLessThanOrEqual(100);
        });
      });
    });

    describe('findKnownSourceProfile', () => {
      it('should find exact matches', () => {
        const profile = findKnownSourceProfile('lemonde.fr');

        expect(profile).toBeDefined();
        expect(profile?.name).toBe('lemonde.fr');
        expect(profile?.bias).toBe('left');
      });

      it('should find partial matches', () => {
        const profile = findKnownSourceProfile('www.lemonde.fr');

        expect(profile).toBeDefined();
        expect(profile?.name).toBe('lemonde.fr');
      });

      it('should be case insensitive', () => {
        const profile = findKnownSourceProfile('REUTERS.COM');

        expect(profile).toBeDefined();
        expect(profile?.name).toBe('reuters.com');
      });

      it('should return undefined for unknown sources', () => {
        const profile = findKnownSourceProfile('unknown-source.xyz');

        expect(profile).toBeUndefined();
      });
    });

    describe('getSourcesByBias', () => {
      it('should return sources for given bias', () => {
        const leftSources = getSourcesByBias('left');

        expect(leftSources.length).toBeGreaterThan(0);
        leftSources.forEach((s) => expect(s.bias).toBe('left'));
      });
    });
  });

  describe('SourceEnricher', () => {
    describe('sanitizeBias', () => {
      it('should normalize bias strings', () => {
        expect(sanitizeBias('left')).toBe('left');
        expect(sanitizeBias('LEFT')).toBe('left');
        expect(sanitizeBias('gauche')).toBe('left');
        expect(sanitizeBias('right')).toBe('right');
        expect(sanitizeBias('droite')).toBe('right');
        expect(sanitizeBias('center')).toBe('center');
        expect(sanitizeBias('centre')).toBe('center');
        expect(sanitizeBias('neutral')).toBe('center');
      });

      it('should default to neutral for unknown', () => {
        expect(sanitizeBias(undefined)).toBe('neutral');
        expect(sanitizeBias('')).toBe('neutral');
        expect(sanitizeBias('unknown')).toBe('neutral');
      });
    });

    describe('enrichCoverageSummary', () => {
      it('should return existing summary if valid', () => {
        const result = enrichCoverageSummary(
          'Existing summary',
          'Source',
          'Headline',
          'Fallback'
        );

        expect(result).toBe('Existing summary');
      });

      it('should generate fallback if summary empty', () => {
        const result = enrichCoverageSummary(
          '',
          'Reuters',
          'Breaking News',
          'Topic summary'
        );

        expect(result).toContain('Reuters');
        expect(result).toContain('Topic summary');
      });
    });

    describe('hydrateRawSource', () => {
      it('should hydrate raw source with all fields', () => {
        const raw = {
          name: 'lemonde.fr',
          bias: 'left',
          coverageSummary: 'Coverage text',
          url: 'https://lemonde.fr/article',
        };

        const hydrated = hydrateRawSource(raw, 'Test Headline', 'Test Summary');

        expect(hydrated.name).toBe('lemonde.fr');
        expect(hydrated.bias).toBe('left');
        expect(hydrated.position).toBe(35); // Known source position
        expect(hydrated.coverageSummary).toBe('Coverage text');
        expect(hydrated.url).toBe('https://lemonde.fr/article');
        expect(hydrated.logoUrl).toContain('lemonde.fr');
        expect(hydrated.isVerified).toBe(true);
      });

      it('should use defaults for missing fields', () => {
        const raw = { name: 'unknown-source.xyz' };

        const hydrated = hydrateRawSource(raw, 'Headline', 'Summary');

        expect(hydrated.bias).toBe('neutral');
        expect(hydrated.position).toBe(DEFAULT_POSITION_BY_BIAS.neutral);
        expect(hydrated.url).toContain('google.com/search');
      });

      it('should override bias/position for known sources', () => {
        const raw = {
          name: 'reuters.com',
          bias: 'left', // Wrong bias
          position: 10, // Wrong position
        };

        const hydrated = hydrateRawSource(raw, 'Headline', 'Summary');

        // Should use known profile values
        expect(hydrated.bias).toBe('center');
        expect(hydrated.position).toBe(50);
      });
    });

    describe('dedupeSources', () => {
      it('should remove duplicate sources by name', () => {
        const sources: Source[] = [
          { name: 'Reuters', bias: 'center', position: 50, coverageSummary: '', url: '', logoUrl: '' },
          { name: 'reuters', bias: 'center', position: 50, coverageSummary: '', url: '', logoUrl: '' },
          { name: 'AFP', bias: 'center', position: 50, coverageSummary: '', url: '', logoUrl: '' },
        ];

        const deduped = dedupeSources(sources);

        expect(deduped.length).toBe(2);
        expect(deduped.map((s) => s.name.toLowerCase())).toContain('reuters');
        expect(deduped.map((s) => s.name.toLowerCase())).toContain('afp');
      });
    });

    describe('ensureSourceFloor', () => {
      it('should amplify sources to minimum count', () => {
        const sources: Source[] = [
          { name: 'Reuters', bias: 'center', position: 50, coverageSummary: '', url: '', logoUrl: '' },
        ];

        const result = ensureSourceFloor('Headline', 'Summary', sources);

        // Should have at least MIN_SOURCES_PER_ARTICLE (5)
        expect(result.length).toBeGreaterThanOrEqual(5);
      });

      it('should prioritize missing biases', () => {
        const sources: Source[] = [
          { name: 'LeMonde', bias: 'left', position: 35, coverageSummary: '', url: '', logoUrl: '' },
        ];

        const result = ensureSourceFloor('Headline', 'Summary', sources);

        // Should add right and center sources
        const biases = result.map((s) => s.bias);
        expect(biases).toContain('right');
        expect(biases.includes('center') || biases.includes('neutral')).toBe(true);
      });

      it('should mark original sources as verified', () => {
        const sources: Source[] = [
          { name: 'Reuters', bias: 'center', position: 50, coverageSummary: '', url: '', logoUrl: '' },
        ];

        const result = ensureSourceFloor('Headline', 'Summary', sources);

        const original = result.find((s) => s.name.toLowerCase().includes('reuters'));
        expect(original?.isVerified).toBe(true);
      });

      it('should mark amplified sources as not verified', () => {
        const sources: Source[] = [
          { name: 'Reuters', bias: 'center', position: 50, coverageSummary: '', url: '', logoUrl: '' },
        ];

        const result = ensureSourceFloor('Headline', 'Summary', sources);

        const amplified = result.filter((s) => !s.name.toLowerCase().includes('reuters'));
        amplified.forEach((s) => {
          expect(s.isVerified).toBe(false);
        });
      });
    });
  });
});

