/**
 * Calculateur de fiabilité quantifié
 *
 * Le score est strictement mathématique, basé sur des métriques observables.
 * Il n'est plus "généré" par l'IA mais calculé a posteriori.
 *
 * Score Max : 100
 *
 * Piliers :
 * 1. Volume de sources (30pts) : Plus on a de sources, plus c'est fiable.
 * 2. Diversité politique (30pts) : Présence de sources de bords opposés.
 * 3. Qualité des sources (40pts) : Bonus pour les agences de presse et médias de référence.
 */

import { Source, Bias } from '../../../types';

// ============================================================================
// TRUST KEYWORDS
// ============================================================================

/**
 * Sources de haute confiance (agences, médias de référence)
 */
const HIGH_TRUST_KEYWORDS = [
  'reuters',
  'afp',
  'apnews',
  'bbc',
  'ft.com',
  'lemonde',
  'nytimes',
  'wsj',
  'nature.com',
  'science.org',
];

/**
 * Sources de confiance moyenne
 */
const MEDIUM_TRUST_KEYWORDS = [
  'cnn',
  'fox',
  'liberation',
  'figaro',
  'guardian',
  'politico',
  'lesechos',
];

// ============================================================================
// CALCULATOR
// ============================================================================

/**
 * Calcule le score de fiabilité basé sur les sources
 */
export const calculateReliability = (sources: Source[]): number => {
  let score = 0;

  // --- 1. VOLUME (30 points) ---
  // 5 sources = 12 pts (le minimum utile)
  // 10+ sources = 30 pts (le plafond)
  const count = sources.length;
  const volumeScore = Math.min(30, Math.max(0, (count - 2) * 4));
  score += volumeScore;

  // --- 2. DIVERSITÉ (30 points) ---
  const biasSet = new Set<Bias>(sources.map((s) => s.bias));
  const hasLeft = biasSet.has('left');
  const hasRight = biasSet.has('right');
  const hasCenter = biasSet.has('center') || biasSet.has('neutral');

  if (hasLeft && hasRight && hasCenter) {
    score += 30; // Full spectrum
  } else if ((hasLeft && hasRight) || (hasLeft && hasCenter) || (hasRight && hasCenter)) {
    score += 20; // Partial balance
  } else {
    score += 5; // Echo chamber penalty
  }

  // --- 3. QUALITÉ & RÉPUTATION (40 points) ---
  let qualityScore = 0;

  sources.forEach((source) => {
    const name = source.name.toLowerCase();

    if (HIGH_TRUST_KEYWORDS.some((k) => name.includes(k))) {
      qualityScore += 8; // 5 sources top tier = 40 pts
    } else if (MEDIUM_TRUST_KEYWORDS.some((k) => name.includes(k))) {
      qualityScore += 4;
    } else {
      qualityScore += 1; // Source inconnue = 1pt
    }
  });

  score += Math.min(40, qualityScore);

  // Normalisation finale (pas de 100% absolu par principe de précaution)
  return Math.min(98, Math.max(15, Math.round(score)));
};

// ============================================================================
// BIAS ANALYSIS
// ============================================================================

/**
 * Calcule la répartition des biais dans un ensemble de sources
 */
export const calculateBiasDistribution = (
  sources: Source[]
): { left: number; center: number; right: number } => {
  if (sources.length === 0) {
    return { left: 33, center: 34, right: 33 };
  }

  let leftCount = 0;
  let centerCount = 0;
  let rightCount = 0;

  sources.forEach((source) => {
    switch (source.bias) {
      case 'left':
        leftCount++;
        break;
      case 'right':
        rightCount++;
        break;
      case 'center':
      case 'neutral':
        centerCount++;
        break;
    }
  });

  const total = sources.length;
  return {
    left: Math.round((leftCount / total) * 100),
    center: Math.round((centerCount / total) * 100),
    right: Math.round((rightCount / total) * 100),
  };
};

/**
 * Évalue si les sources sont bien équilibrées
 */
export const isBalanced = (sources: Source[]): boolean => {
  const distribution = calculateBiasDistribution(sources);

  // Un ensemble est équilibré si aucun biais ne dépasse 60%
  return (
    distribution.left <= 60 &&
    distribution.center <= 60 &&
    distribution.right <= 60
  );
};

