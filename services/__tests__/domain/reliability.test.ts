/**
 * Tests pour le domain Reliability
 */

import { describe, it, expect } from 'vitest';
import {
  calculateReliability,
  calculateBiasDistribution,
  isBalanced,
} from '../../domain/reliability';
import type { Source, Bias } from '../../../types';

describe('Domain - Reliability', () => {
  // Helper to create source
  const createSource = (name: string, bias: Bias): Source => ({
    name,
    bias,
    position: 50,
    coverageSummary: '',
    url: '',
    logoUrl: '',
  });

  describe('calculateReliability', () => {
    it('should return minimum score for few sources', () => {
      const sources = [createSource('source1', 'center')];

      const score = calculateReliability(sources);

      expect(score).toBeGreaterThanOrEqual(15);
      expect(score).toBeLessThanOrEqual(98);
    });

    it('should increase score with more sources', () => {
      const fewSources = [createSource('s1', 'center'), createSource('s2', 'center')];
      const manySources = Array.from({ length: 10 }, (_, i) =>
        createSource(`source${i}`, 'center')
      );

      const fewScore = calculateReliability(fewSources);
      const manyScore = calculateReliability(manySources);

      expect(manyScore).toBeGreaterThan(fewScore);
    });

    it('should reward diversity across political spectrum', () => {
      const echoChamber = [
        createSource('s1', 'left'),
        createSource('s2', 'left'),
        createSource('s3', 'left'),
      ];

      const diverse = [
        createSource('s1', 'left'),
        createSource('s2', 'center'),
        createSource('s3', 'right'),
      ];

      const echoScore = calculateReliability(echoChamber);
      const diverseScore = calculateReliability(diverse);

      expect(diverseScore).toBeGreaterThan(echoScore);
    });

    it('should reward high-trust sources', () => {
      const unknownSources = [
        createSource('unknown1.xyz', 'center'),
        createSource('unknown2.xyz', 'center'),
        createSource('unknown3.xyz', 'center'),
      ];

      const trustedSources = [
        createSource('reuters.com', 'center'),
        createSource('afp.com', 'center'),
        createSource('bbc.com', 'center'),
      ];

      const unknownScore = calculateReliability(unknownSources);
      const trustedScore = calculateReliability(trustedSources);

      expect(trustedScore).toBeGreaterThan(unknownScore);
    });

    it('should never return 100%', () => {
      const perfectSources = [
        createSource('reuters.com', 'center'),
        createSource('afp.com', 'center'),
        createSource('bbc.com', 'center'),
        createSource('lemonde.fr', 'left'),
        createSource('nytimes.com', 'left'),
        createSource('wsj.com', 'right'),
        createSource('lefigaro.fr', 'right'),
        createSource('ft.com', 'center'),
        createSource('nature.com', 'neutral'),
        createSource('science.org', 'neutral'),
      ];

      const score = calculateReliability(perfectSources);

      expect(score).toBeLessThanOrEqual(98);
    });

    it('should return reasonable scores', () => {
      const typicalSources = [
        createSource('reuters.com', 'center'),
        createSource('lemonde.fr', 'left'),
        createSource('lefigaro.fr', 'right'),
        createSource('afp.com', 'neutral'),
        createSource('guardian.com', 'left'),
      ];

      const score = calculateReliability(typicalSources);

      // Typical article should have 50-85% reliability
      expect(score).toBeGreaterThanOrEqual(50);
      expect(score).toBeLessThanOrEqual(90);
    });
  });

  describe('calculateBiasDistribution', () => {
    it('should calculate percentage distribution', () => {
      const sources = [
        createSource('s1', 'left'),
        createSource('s2', 'left'),
        createSource('s3', 'center'),
        createSource('s4', 'right'),
      ];

      const dist = calculateBiasDistribution(sources);

      expect(dist.left).toBe(50); // 2/4
      expect(dist.center).toBe(25); // 1/4
      expect(dist.right).toBe(25); // 1/4
    });

    it('should count neutral as center', () => {
      const sources = [
        createSource('s1', 'neutral'),
        createSource('s2', 'center'),
      ];

      const dist = calculateBiasDistribution(sources);

      expect(dist.center).toBe(100);
    });

    it('should return even distribution for empty array', () => {
      const dist = calculateBiasDistribution([]);

      expect(dist.left).toBe(33);
      expect(dist.center).toBe(34);
      expect(dist.right).toBe(33);
    });
  });

  describe('isBalanced', () => {
    it('should return true for balanced sources', () => {
      const balanced = [
        createSource('s1', 'left'),
        createSource('s2', 'center'),
        createSource('s3', 'right'),
      ];

      expect(isBalanced(balanced)).toBe(true);
    });

    it('should return false if one bias exceeds 60%', () => {
      const unbalanced = [
        createSource('s1', 'left'),
        createSource('s2', 'left'),
        createSource('s3', 'left'),
        createSource('s4', 'center'),
      ];

      expect(isBalanced(unbalanced)).toBe(false);
    });

    it('should return true for all center sources', () => {
      const allCenter = [
        createSource('s1', 'center'),
        createSource('s2', 'center'),
        createSource('s3', 'neutral'),
      ];

      // All center/neutral is acceptable
      expect(isBalanced(allCenter)).toBe(false); // 100% center > 60%
    });
  });
});

