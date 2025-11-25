/**
 * Repository pour la gestion du cache (localStorage + Supabase)
 */

import { NewsArticle } from '../../types';
import { CACHE, SUPABASE } from '../config/constants';
import { getSupabaseClient, isSupabaseActive, withSupabaseErrorHandling } from '../api/supabase';
import { readFromLocalStorage, writeToLocalStorage, removeFromLocalStorage } from '../core/utils/storage';

// ============================================================================
// TYPES
// ============================================================================

interface LocalCachePayload {
  timestamp: number;
  articles: NewsArticle[];
}

// ============================================================================
// LOCAL CACHE
// ============================================================================

const buildLocalCacheKey = (key: string): string =>
  `${CACHE.LOCAL_PREFIX}${key}`;

/**
 * Lit le cache local
 */
export const getLocalCache = (
  cacheKey: string,
  options: { allowStale?: boolean } = {}
): NewsArticle[] | null => {
  const fullKey = buildLocalCacheKey(cacheKey);
  const payload = readFromLocalStorage<LocalCachePayload>(fullKey);

  if (!payload || !Array.isArray(payload.articles)) {
    return null;
  }

  // Vérifier expiration
  if (!options.allowStale && Date.now() - payload.timestamp > CACHE.LOCAL_TTL_MS) {
    return null;
  }

  return payload.articles;
};

/**
 * Sauvegarde dans le cache local
 */
export const saveLocalCache = (cacheKey: string, articles: NewsArticle[]): void => {
  const fullKey = buildLocalCacheKey(cacheKey);

  // Strip base64 images pour éviter les erreurs de quota localStorage
  const safeArticles = articles.map((a) => {
    if (a.imageUrl && a.imageUrl.startsWith('data:')) {
      return { ...a, imageUrl: '' };
    }
    return a;
  });

  const payload: LocalCachePayload = {
    timestamp: Date.now(),
    articles: safeArticles,
  };

  writeToLocalStorage(fullKey, payload);
};

/**
 * Supprime une entrée du cache local
 */
export const clearLocalCache = (cacheKey: string): void => {
  removeFromLocalStorage(buildLocalCacheKey(cacheKey));
};

// ============================================================================
// SUPABASE CACHE (news_cache table)
// ============================================================================

/**
 * Récupère le cache Supabase
 */
export const getSupabaseCache = async (
  cacheKey: string,
  maxAgeMs: number = CACHE.SUPABASE_TTL_MS
): Promise<NewsArticle[] | null> => {
  return withSupabaseErrorHandling('cache-read', async (client) => {
    const cutoff = new Date(Date.now() - maxAgeMs).toISOString();

    const { data, error } = await client
      .from(SUPABASE.TABLES.NEWS_CACHE)
      .select('articles, created_at')
      .eq('search_key', cacheKey)
      .gt('created_at', cutoff)
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      console.warn('[CacheRepository] Erreur lecture cache Supabase:', error);
      return null;
    }

    if (data && data.length > 0) {
      console.log(`[CacheRepository] Cache Supabase hit: ${cacheKey}`);
      return data[0].articles as NewsArticle[];
    }

    return null;
  });
};

/**
 * Sauvegarde dans le cache Supabase
 */
export const saveSupabaseCache = async (
  cacheKey: string,
  articles: NewsArticle[]
): Promise<boolean> => {
  const result = await withSupabaseErrorHandling('cache-write', async (client) => {
    const { error } = await client
      .from(SUPABASE.TABLES.NEWS_CACHE)
      .insert({
        search_key: cacheKey,
        articles,
      });

    if (error) {
      console.warn('[CacheRepository] Erreur écriture cache Supabase:', error);
      return false;
    }

    console.log(`[CacheRepository] Cache Supabase sauvegardé: ${cacheKey}`);
    return true;
  });

  return result ?? false;
};

// ============================================================================
// UNIFIED CACHE API
// ============================================================================

/**
 * Récupère depuis le cache (local d'abord, puis Supabase)
 */
export const getCachedArticles = async (
  cacheKey: string,
  options: { allowStale?: boolean } = {}
): Promise<NewsArticle[] | null> => {
  // 1. Try local cache first
  const localCached = getLocalCache(cacheKey, options);
  if (localCached) {
    return localCached;
  }

  // 2. Try Supabase cache
  const supabaseCached = await getSupabaseCache(cacheKey);
  if (supabaseCached) {
    // Populate local cache
    saveLocalCache(cacheKey, supabaseCached);
    return supabaseCached;
  }

  return null;
};

/**
 * Sauvegarde dans tous les caches
 */
export const cacheArticles = async (
  cacheKey: string,
  articles: NewsArticle[]
): Promise<void> => {
  // Save to local
  saveLocalCache(cacheKey, articles);

  // Save to Supabase (async, non-blocking)
  saveSupabaseCache(cacheKey, articles).catch((err) =>
    console.warn('[CacheRepository] Erreur sauvegarde Supabase:', err)
  );
};

