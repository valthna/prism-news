/**
 * Repository pour les articles de news (news_tiles table)
 */

import { NewsArticle } from '../../types';
import { CACHE, SUPABASE } from '../config/constants';
import {
  getSupabaseClient,
  isSupabaseActive,
  withSupabaseErrorHandling,
  getSupabaseUrl,
} from '../api/supabase';
import { buildBucketPublicUrl, getStoragePathFromUrl } from '../core/utils/url';
import { parseRelativeTimeToMinutes } from '../core/utils/text';

// ============================================================================
// HELPERS
// ============================================================================

const bucketPublicBaseUrl = buildBucketPublicUrl(
  getSupabaseUrl(),
  SUPABASE.IMAGE_BUCKET
);

/**
 * Trie les articles par fraîcheur (publishedAt)
 */
const sortByRecency = (articles: NewsArticle[]): NewsArticle[] => {
  return [...articles].sort((a, b) => {
    const aMinutes = parseRelativeTimeToMinutes(a.publishedAt);
    const bMinutes = parseRelativeTimeToMinutes(b.publishedAt);
    return aMinutes - bMinutes;
  });
};

/**
 * Trie les articles par richesse de sources
 */
const sortBySourceRichness = (articles: NewsArticle[]): NewsArticle[] => {
  return [...articles].sort((a, b) => {
    const diff = (b.sources?.length || 0) - (a.sources?.length || 0);
    if (diff !== 0) return diff;
    return (a.headline || '').localeCompare(b.headline || '');
  });
};

// ============================================================================
// READ OPERATIONS
// ============================================================================

/**
 * Récupère les tuiles depuis le repository (news_tiles)
 */
export const getTiles = async (
  cacheKey: string,
  minCount: number = CACHE.MINIMUM_REUSABLE_TILES
): Promise<NewsArticle[] | null> => {
  return withSupabaseErrorHandling('tiles-read', async (client) => {
    const cutoffIso = new Date(Date.now() - CACHE.TILE_RETENTION_MS).toISOString();

    const { data, error } = await client
      .from(SUPABASE.TABLES.NEWS_TILES)
      .select('article')
      .eq('search_key', cacheKey)
      .gt('created_at', cutoffIso)
      .order('created_at', { ascending: false })
      .limit(minCount);

    if (error) {
      console.warn('[NewsRepository] Erreur lecture tiles:', error);
      return null;
    }

    if (!data || data.length < minCount) {
      return null;
    }

    const articles = data.map((row) => row.article as NewsArticle);
    console.log(`[NewsRepository] ${articles.length} tiles récupérées pour: ${cacheKey}`);
    return articles;
  });
};

/**
 * Récupère tous les articles avec images de la base
 */
export const getAllArticlesWithImages = async (): Promise<NewsArticle[] | null> => {
  return withSupabaseErrorHandling('fallback-read', async (client) => {
    console.log('[NewsRepository] Récupération articles avec images...');

    const { data, error } = await client
      .from(SUPABASE.TABLES.NEWS_TILES)
      .select('article')
      .not('article->imageUrl', 'is', null)
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('[NewsRepository] Erreur récupération articles:', error);
      return null;
    }

    if (!data || data.length === 0) {
      console.log('[NewsRepository] Aucun article avec image trouvé');
      return null;
    }

    // Filtrer côté client pour s'assurer que imageUrl est valide
    const articles = data
      .map((row) => row.article as NewsArticle)
      .filter((a) => a.imageUrl && a.imageUrl.trim() !== '');

    // Trier par fraîcheur
    const sortedArticles = sortByRecency(articles);
    console.log(`[NewsRepository] ${sortedArticles.length} articles avec images récupérés`);

    return sortedArticles;
  });
};

// ============================================================================
// WRITE OPERATIONS
// ============================================================================

/**
 * Persiste les tuiles dans le repository
 */
export const persistTiles = async (
  articles: NewsArticle[],
  cacheKey: string
): Promise<boolean> => {
  if (articles.length === 0) {
    console.warn('[NewsRepository] Aucun article à persister');
    return false;
  }

  const result = await withSupabaseErrorHandling('tiles-write', async (client) => {
    // Batching pour éviter le timeout sur payload trop lourd (Base64)
    const BATCH_SIZE = 2;

    for (let i = 0; i < articles.length; i += BATCH_SIZE) {
      const batch = articles.slice(i, i + BATCH_SIZE);
      const payload = batch.map((article) => ({
        article_id: article.id,
        search_key: cacheKey,
        article,
        image_storage_path: getStoragePathFromUrl(article.imageUrl, bucketPublicBaseUrl),
      }));

      const { error } = await client
        .from(SUPABASE.TABLES.NEWS_TILES)
        .upsert(payload, { onConflict: 'article_id' });

      if (error) {
        console.warn(`[NewsRepository] Erreur upsert batch ${i}:`, error);
        return false;
      }
    }

    console.log(`[NewsRepository] ${articles.length} tiles persistées pour: ${cacheKey}`);
    return true;
  });

  return result ?? false;
};

// ============================================================================
// CLEANUP OPERATIONS
// ============================================================================

/**
 * Nettoie les tuiles expirées et leurs images
 */
export const cleanupExpiredTiles = async (): Promise<void> => {
  await withSupabaseErrorHandling('cleanup', async (client) => {
    const cutoffIso = new Date(Date.now() - CACHE.TILE_RETENTION_MS).toISOString();

    // 1. Récupérer les tuiles expirées
    const { data, error } = await client
      .from(SUPABASE.TABLES.NEWS_TILES)
      .select('article_id, image_storage_path, article')
      .lt('created_at', cutoffIso);

    if (error) {
      console.warn('[NewsRepository] Erreur fetch tuiles expirées:', error);
      return;
    }

    if (!data || data.length === 0) {
      return;
    }

    // 2. Supprimer les tuiles
    const articleIds = data.map((row) => row.article_id).filter(Boolean);
    if (articleIds.length > 0) {
      const { error: deleteError } = await client
        .from(SUPABASE.TABLES.NEWS_TILES)
        .delete()
        .in('article_id', articleIds);

      if (deleteError) {
        console.warn('[NewsRepository] Erreur suppression tuiles:', deleteError);
      }
    }

    // 3. Supprimer les images associées
    const storagePaths = data
      .map((row) => {
        if (row.image_storage_path) return row.image_storage_path;
        const article = row.article as NewsArticle | undefined;
        return getStoragePathFromUrl(article?.imageUrl, bucketPublicBaseUrl);
      })
      .filter((path): path is string => Boolean(path));

    if (storagePaths.length > 0) {
      const uniquePaths = Array.from(new Set(storagePaths));
      const { error: storageError } = await client.storage
        .from(SUPABASE.IMAGE_BUCKET)
        .remove(uniquePaths);

      if (storageError) {
        console.warn('[NewsRepository] Erreur nettoyage storage:', storageError);
      }
    }

    console.log(`[NewsRepository] Cleanup: ${articleIds.length} tuiles, ${storagePaths.length} images`);
  });
};

// ============================================================================
// EXPORTS
// ============================================================================

export { sortByRecency, sortBySourceRichness };

