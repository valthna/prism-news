/**
 * Enrichissement et hydratation des sources
 */

import { Bias, Source } from '../../../types';
import { ARTICLES } from '../../config/constants';
import { createLogoUrl, createGoogleSearchUrl } from '../../core/utils/url';
import { collapseWhitespace, normalizeSourceName } from '../../core/utils/text';
import {
  CURATED_SOURCE_POOL,
  DEFAULT_POSITION_BY_BIAS,
  BIAS_ROTATION_ORDER,
  findKnownSourceProfile,
  CuratedSourceProfile,
} from './SourcePool';

// ============================================================================
// BIAS UTILITIES
// ============================================================================

/**
 * Normalise un biais brut vers une valeur Bias valide
 */
export const sanitizeBias = (bias?: string): Bias => {
  if (!bias) return 'neutral';
  const lower = bias.toLowerCase();

  if (lower.includes('left') || lower.includes('gauche')) return 'left';
  if (lower.includes('right') || lower.includes('droite')) return 'right';
  if (lower.includes('center') || lower.includes('centre') || lower.includes('neutral'))
    return 'center';

  return 'neutral';
};

// ============================================================================
// SOURCE ENRICHMENT
// ============================================================================

/**
 * Enrichit un résumé de couverture avec un fallback intelligent
 */
export const enrichCoverageSummary = (
  summary: string | undefined,
  sourceName: string,
  headline: string,
  fallbackSummary: string
): string => {
  if (summary && summary.trim().length > 0) {
    return summary.trim();
  }
  const topic = fallbackSummary || headline;
  return `Analyse complémentaire proposée par ${sourceName} sur ${topic}.`;
};

/**
 * Hydrate une source brute avec toutes les métadonnées nécessaires
 */
export const hydrateRawSource = (
  rawSource: any,
  headline: string,
  summary: string
): Source => {
  const rawName = collapseWhitespace(rawSource?.name) || 'Source non identifiée';

  // Recherche de profil connu pour forcer position et biais corrects
  const knownProfile = findKnownSourceProfile(rawName);

  const bias = knownProfile ? knownProfile.bias : sanitizeBias(rawSource?.bias);
  const position = knownProfile
    ? knownProfile.position
    : typeof rawSource?.position === 'number'
    ? rawSource.position
    : DEFAULT_POSITION_BY_BIAS[bias];

  const coverageSummary = enrichCoverageSummary(
    rawSource?.coverageSummary,
    rawName,
    headline,
    summary
  );

  const url =
    typeof rawSource?.url === 'string' && rawSource.url.trim().length > 0
      ? rawSource.url
      : createGoogleSearchUrl(headline, rawName);

  return {
    name: rawName,
    bias,
    position,
    coverageSummary,
    url,
    logoUrl: rawSource?.logoUrl || createLogoUrl(rawName),
    isVerified: true, // Source réelle fournie par l'IA
  };
};

// ============================================================================
// SOURCE DEDUPLICATION
// ============================================================================

/**
 * Déduplique les sources par nom
 */
export const dedupeSources = (sources: Source[]): Source[] => {
  const seen = new Set<string>();
  return sources.filter((source) => {
    const key = normalizeSourceName(source.name);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

// ============================================================================
// SOURCE AMPLIFICATION
// ============================================================================

/**
 * Construit une queue de priorité de biais pour l'équilibrage
 */
const buildBiasPriorityQueue = (sources: Source[]): Bias[] => {
  const presence: Record<Bias, boolean> = {
    left: false,
    right: false,
    center: false,
    neutral: false,
  };

  sources.forEach((source) => {
    presence[source.bias] = true;
  });

  // Prioriser les biais manquants
  const queue: Bias[] = [];
  (['left', 'right', 'center'] as Bias[]).forEach((bias) => {
    if (!presence[bias]) {
      queue.push(bias);
    }
  });

  return queue.concat(BIAS_ROTATION_ORDER);
};

/**
 * Crée une source amplifiée (générique) à partir d'un profil
 */
const createAmplifiedSource = (
  profile: CuratedSourceProfile,
  headline: string,
  summary: string
): Source => ({
  name: profile.name,
  bias: profile.bias,
  position: profile.position,
  logoUrl: createLogoUrl(profile.name),
  coverageSummary: profile.defaultSummary.replace('{topic}', summary || headline),
  url: createGoogleSearchUrl(headline, profile.name),
  isVerified: false, // Source amplifiée - n'a pas forcément couvert ce sujet
});

/**
 * Garantit un nombre minimum de sources diversifiées
 * Amplifie avec des sources curées si nécessaire
 */
export const ensureSourceFloor = (
  headline: string,
  summary: string,
  initialSources: Source[]
): Source[] => {
  // Hydrater et marquer comme vérifiées
  const deduped = dedupeSources(
    initialSources.map((source) => ({
      ...source,
      bias: sanitizeBias(source.bias),
      position:
        typeof source.position === 'number'
          ? source.position
          : DEFAULT_POSITION_BY_BIAS[sanitizeBias(source.bias)],
      coverageSummary: enrichCoverageSummary(
        source.coverageSummary,
        source.name,
        headline,
        summary
      ),
      logoUrl: source.logoUrl || createLogoUrl(source.name),
      url: source.url || createGoogleSearchUrl(headline, source.name),
      isVerified: true,
    }))
  );

  const usedNames = new Set(deduped.map((s) => normalizeSourceName(s.name)));
  const baselineTarget =
    deduped.length >= ARTICLES.TARGET_SOURCES_PER_ARTICLE
      ? deduped.length
      : ARTICLES.TARGET_SOURCES_PER_ARTICLE;
  const target = Math.max(ARTICLES.MIN_SOURCES_PER_ARTICLE, baselineTarget);

  const biasQueue = buildBiasPriorityQueue(deduped);
  let attempts = 0;

  // Amplification avec sources curées
  while (deduped.length < target && attempts < 40) {
    const bias = biasQueue[attempts % biasQueue.length];
    const candidates = CURATED_SOURCE_POOL[bias] || [];
    const candidate = candidates.find(
      (profile) => !usedNames.has(normalizeSourceName(profile.name))
    );

    if (candidate) {
      deduped.push(createAmplifiedSource(candidate, headline, summary));
      usedNames.add(normalizeSourceName(candidate.name));
    }
    attempts++;
  }

  // Fallback final si on n'a toujours pas assez
  if (deduped.length < ARTICLES.MIN_SOURCES_PER_ARTICLE) {
    for (const bias of BIAS_ROTATION_ORDER) {
      const candidates = CURATED_SOURCE_POOL[bias] || [];
      for (const candidate of candidates) {
        if (deduped.length >= ARTICLES.MIN_SOURCES_PER_ARTICLE) break;
        if (usedNames.has(normalizeSourceName(candidate.name))) continue;

        deduped.push(createAmplifiedSource(candidate, headline, summary));
        usedNames.add(normalizeSourceName(candidate.name));
      }
      if (deduped.length >= ARTICLES.MIN_SOURCES_PER_ARTICLE) break;
    }
  }

  return deduped;
};

