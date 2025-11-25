/**
 * Service principal de news
 * Orchestre la récupération, génération et mise en cache des articles
 */

import { NewsArticle } from '../../types';
import { env, CACHE, TIMEOUTS, ARTICLES } from '../config';
import { generateText, isGeminiConfigured } from '../api/gemini';
import { performMassiveDiscovery, isFirecrawlConfigured } from '../api/firecrawl';
import { isSupabaseActive } from '../api/supabase';
import {
  getCachedArticles,
  cacheArticles,
  saveLocalCache,
  getTiles,
  getAllArticlesWithImages,
  persistTiles,
  cleanupExpiredTiles,
} from '../repositories';
import { buildArticles, withImageUrl, RawArticleData } from '../domain/articles';
import { sortBySourceRichness, sortByRecency } from '../repositories/NewsRepository';
import { ParseError, RateLimitError, isRateLimitError } from '../core/errors';
import { withTimeout, withRetry } from '../core/utils';
import { PRISM_PROMPTS } from '../prompts';
import { progressTracker } from '../progressTracker';
import { recordGeminiUsage } from '../aiUsageLogger';
import { generateArticleImages, isImageServiceEnabled, canHostImages } from './ImageService';

// ============================================================================
// RATE LIMIT STATE
// ============================================================================

let lastRateLimitHit = 0;

const isInRateLimitCooldown = (): boolean =>
  Date.now() - lastRateLimitHit < TIMEOUTS.RATE_LIMIT_COOLDOWN_MS;

// ============================================================================
// CACHE KEY BUILDER
// ============================================================================

const buildCacheKey = (query?: string, category?: string): string => {
  const baseCacheKey = query
    ? `query:${query.toLowerCase().trim()}`
    : category
    ? `category:${category.toLowerCase().trim()}`
    : 'general';

  return `${baseCacheKey}|${CACHE.TILE_PIPELINE_VERSION}`;
};

// ============================================================================
// PROMPT BUILDER
// ============================================================================

const buildNewsPrompt = (
  firecrawlContext: string | null,
  taskDescription: string,
  today: string,
  now: string
): string => {
  let prompt = '';

  if (firecrawlContext) {
    prompt = `
    ${PRISM_PROMPTS.NEWS_ANALYSIS.SYSTEM_INSTRUCTIONS(today, now)}
    
    ${PRISM_PROMPTS.NEWS_ANALYSIS.FIRECRAWL_CONTEXT_PREFIX(firecrawlContext)}
    
    ${PRISM_PROMPTS.NEWS_ANALYSIS.TASK_SYNTHESIS_INSTRUCTIONS}
    `;
  } else {
    prompt = `
    ${PRISM_PROMPTS.NEWS_ANALYSIS.SYSTEM_INSTRUCTIONS(today, now)}
    
    ${PRISM_PROMPTS.NEWS_ANALYSIS.TASK_FALLBACK_INSTRUCTIONS(taskDescription)}
    `;
  }

  prompt += PRISM_PROMPTS.NEWS_ANALYSIS.OUTPUT_FORMAT(ARTICLES.MIN_COUNT);

  prompt += `
  IMPORTANT:
  0. LANGUAGE: Generate ALL content in FRENCH (français). Headlines, summaries, and analyses MUST be in French.
  1. Return ONLY the JSON array. NO introduction, NO markdown, NO ending comments.
  2. ESCAPE all control characters. Newlines in strings must be written as "\\n", not actual line breaks.
  3. Output MINIFIED JSON (single line) to avoid formatting errors.
  `;

  return prompt;
};

// ============================================================================
// RESPONSE PARSER
// ============================================================================

const parseGeminiResponse = (textResponse: string): RawArticleData[] => {
  // Nettoyage agressif du JSON
  let jsonString = textResponse.replace(/```json/g, '').replace(/```/g, '').trim();

  // Extraire le tableau JSON
  const firstBracket = jsonString.indexOf('[');
  const lastBracket = jsonString.lastIndexOf(']');
  if (firstBracket !== -1 && lastBracket !== -1) {
    jsonString = jsonString.substring(firstBracket, lastBracket + 1);
  }

  try {
    return JSON.parse(jsonString);
  } catch {
    // Tentative de sauvetage: nettoyer les caractères de contrôle
    try {
      const sanitized = jsonString.replace(/[\u0000-\u001F]+/g, (match) => {
        if (match === '\n') return '\\n';
        if (match === '\r') return '';
        if (match === '\t') return '\\t';
        return '';
      });
      return JSON.parse(sanitized);
    } catch {
      throw new ParseError('Impossible de parser la réponse Gemini');
    }
  }
};

// ============================================================================
// DEEP HARVEST (génération complète)
// ============================================================================

const performDeepHarvest = async (
  query?: string,
  category?: string,
  cacheKey?: string
): Promise<NewsArticle[]> => {
  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
  const now = new Date().toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });

  // Description de la tâche
  let taskDescription = `Identifie les ${ARTICLES.MIN_COUNT} actualités les plus importantes du moment via Google Search.`;
  if (query) {
    taskDescription = `Identifie les ${ARTICLES.MIN_COUNT} actualités les plus pertinentes liées à la recherche : "${query}".`;
  } else if (category && category !== 'Général') {
    taskDescription = `Identifie les ${ARTICLES.MIN_COUNT} actualités les plus importantes dans la catégorie : "${category}".`;
  }

  progressTracker.emit({
    phase: 'init',
    progress: 2,
    message: 'Initialisation Système',
    detail: 'Préparation du protocole Deep Harvest...',
  });

  // Phase 1: Firecrawl discovery
  const firecrawlContext = await performMassiveDiscovery(query, category, {
    onVectorProgress: (vectorName, index, total) => {
      progressTracker.emit({
        phase: 'firecrawl_vector',
        progress: 10 + index * 10,
        message: 'Scan Sources Mondiales',
        detail: `Vecteur ${vectorName} en cours...`,
        metadata: { vectorName },
      });
    },
  });

  if (firecrawlContext) {
    console.log(`[NewsService] Context Firecrawl: ${firecrawlContext.length} caractères`);
    progressTracker.emit({
      phase: 'firecrawl_complete',
      progress: 60,
      message: 'Agrégation Données',
      detail: 'Sources collectées et consolidées',
    });
  }

  // Phase 2: Gemini generation
  progressTracker.emit({
    phase: 'gemini_generating',
    progress: 65,
    message: 'Détection Biais',
    detail: 'IA Gemini analyse les sources...',
  });

  const prompt = buildNewsPrompt(firecrawlContext, taskDescription, today, now);
  const tools = { tools: [{ googleSearch: {} }] };

  const { text, model, response } = await withRetry(
    () => generateText({ prompt, config: tools }),
    {
      maxAttempts: 3,
      shouldRetry: (error) => !isRateLimitError(error),
      onRetry: (error, attempt) => {
        console.log(`[NewsService] Tentative ${attempt}...`);
      },
    }
  );

  // Log usage
  recordGeminiUsage({
    model,
    operation: 'news_deep_harvest',
    usageMetadata: (response as any)?.usageMetadata,
    metadata: {
      cacheKey,
      query: query ?? null,
      category: category ?? null,
      firecrawlContextPresent: Boolean(firecrawlContext),
    },
  }).catch((err) => console.warn('[NewsService] AI usage logging failed:', err));

  progressTracker.emit({
    phase: 'gemini_parsing',
    progress: 82,
    message: 'Génération Synthèse',
    detail: 'Analyse terminée, traitement des données...',
  });

  // Parse response
  const rawArticles = parseGeminiResponse(text);
  if (!Array.isArray(rawArticles)) {
    throw new ParseError('Structure de données invalide');
  }

  // Build articles
  const articles = buildArticles(rawArticles, { defaultCategory: category });
  const rankedArticles = sortBySourceRichness(articles);

  // Phase 3: Image generation (if enabled)
  let finalArticles = rankedArticles;

  if (canHostImages()) {
    progressTracker.emit({
      phase: 'image_generation',
      progress: 85,
      message: 'Génération Images',
      detail: 'Création des illustrations...',
    });

    const imagePrompts = rankedArticles.map((a) => ({
      id: a.id,
      prompt: a.imagePrompt,
    }));

    const imageResults = await generateArticleImages(imagePrompts, {
      onProgress: (index, total) => {
        progressTracker.emit({
          phase: 'image_generation',
          progress: 85 + (index / total) * 10,
          message: 'Génération Images',
          detail: `Image ${index + 1}/${total}...`,
          metadata: { imagesGenerated: index + 1 },
        });
      },
    });

    finalArticles = rankedArticles.map((article) => {
      const imageUrl = imageResults.get(article.id);
      return imageUrl ? withImageUrl(article, imageUrl) : article;
    });
  }

  // Phase 4: Persist
  if (cacheKey && isSupabaseActive()) {
    await persistTiles(finalArticles, cacheKey);
  }

  progressTracker.emit({
    phase: 'complete',
    progress: 100,
    message: 'Terminé',
    detail: `${finalArticles.length} articles générés`,
    metadata: { articlesGenerated: finalArticles.length },
  });

  return finalArticles;
};

// ============================================================================
// MAIN SERVICE FUNCTION
// ============================================================================

/**
 * Récupère les articles de news
 */
export const fetchNewsArticles = async (
  query?: string,
  category?: string,
  forceRefresh = false
): Promise<NewsArticle[]> => {
  console.log('[NewsService] fetchNewsArticles', { query, category, forceRefresh });

  const cacheKey = buildCacheKey(query, category);

  // Mode mock forcé
  if (env.forceMockData) {
    console.warn('[NewsService] Mode mock activé');
    const dbFallback = await getAllArticlesWithImages();
    return dbFallback ?? [];
  }

  // 1. Vérifier le cache local (si suffisant)
  if (!forceRefresh) {
    const cached = await getCachedArticles(cacheKey);
    if (cached && cached.length >= 10) {
      console.log(`[NewsService] Cache hit: ${cached.length} articles`);
      return cached;
    }

    // Cache insuffisant → chercher en base
    console.log('[NewsService] Cache insuffisant, récupération depuis la base...');
    const allWithImages = await getAllArticlesWithImages();
    if (allWithImages && allWithImages.length > 0) {
      console.log(`[NewsService] ${allWithImages.length} articles depuis la base`);
      saveLocalCache(cacheKey, allWithImages);
      return allWithImages;
    }
  }

  // Cleanup en arrière-plan
  cleanupExpiredTiles().catch((e) =>
    console.warn('[NewsService] Background cleanup warning:', e)
  );

  // 2. Vérifier la clé API
  if (!isGeminiConfigured()) {
    console.warn('[NewsService] API Key manquante, fallback base de données');
    return (await getAllArticlesWithImages()) ?? [];
  }

  // 3. Vérifier le rate limit cooldown
  if (isInRateLimitCooldown()) {
    console.warn('[NewsService] Cooldown actif, retour cache périmé');
    const stale = await getCachedArticles(cacheKey, { allowStale: true });
    if (stale) return stale;
    return (await getAllArticlesWithImages()) ?? [];
  }

  // 4. Si pas de forceRefresh, retourner la base de données
  if (!forceRefresh) {
    console.log('[NewsService] Pas de forceRefresh, retour base de données');
    const latestFromDb = await getAllArticlesWithImages();
    if (latestFromDb && latestFromDb.length > 0) {
      saveLocalCache(cacheKey, latestFromDb);
      return latestFromDb;
    }
    return [];
  }

  // 5. Deep Harvest (génération complète)
  console.log('[NewsService] Lancement Deep Harvest...');

  try {
    const articles = await performDeepHarvest(query, category, cacheKey);

    // Sauvegarder dans les caches
    await cacheArticles(cacheKey, articles);

    return articles;
  } catch (error) {
    console.error('[NewsService] Erreur Deep Harvest:', error);

    if (isRateLimitError(error)) {
      lastRateLimitHit = Date.now();
    }

    // Fallbacks
    const staleCache = await getCachedArticles(cacheKey, { allowStale: true });
    if (staleCache) return staleCache;

    const tiles = await getTiles(cacheKey);
    if (tiles) {
      saveLocalCache(cacheKey, tiles);
      return tiles;
    }

    const latestFromDb = await getAllArticlesWithImages();
    if (latestFromDb && latestFromDb.length > 0) {
      return latestFromDb;
    }

    return [];
  }
};

// ============================================================================
// EXPORTS
// ============================================================================

export { buildCacheKey };

