/**
 * Repository pour les réactions utilisateur
 */

import { getSupabaseClient, withSupabaseErrorHandling } from '../api/supabase';
import { readFromLocalStorage, writeToLocalStorage } from '../core/utils/storage';

// ============================================================================
// TYPES
// ============================================================================

export type ReactionType = 'fire' | 'shock' | 'doubt' | 'angry' | 'clap';

export interface ReactionCounts {
  fire: number;
  shock: number;
  doubt: number;
  angry: number;
  clap: number;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const USER_REACTIONS_KEY = 'prism_user_reactions';

const DEFAULT_COUNTS: ReactionCounts = {
  fire: 0,
  shock: 0,
  doubt: 0,
  angry: 0,
  clap: 0,
};

// ============================================================================
// LOCAL STORAGE (user's own reactions)
// ============================================================================

/**
 * Récupère les réactions de l'utilisateur depuis localStorage
 */
export const getUserReactions = (): Record<string, ReactionType | null> => {
  return readFromLocalStorage<Record<string, ReactionType | null>>(USER_REACTIONS_KEY) ?? {};
};

/**
 * Sauvegarde la réaction de l'utilisateur
 */
export const saveUserReaction = (
  articleId: string,
  reactionType: ReactionType | null
): void => {
  const current = getUserReactions();

  if (reactionType === null) {
    delete current[articleId];
  } else {
    current[articleId] = reactionType;
  }

  writeToLocalStorage(USER_REACTIONS_KEY, current);
};

/**
 * Récupère la réaction de l'utilisateur pour un article
 */
export const getUserReactionForArticle = (articleId: string): ReactionType | null => {
  const reactions = getUserReactions();
  return reactions[articleId] ?? null;
};

// ============================================================================
// SUPABASE (aggregated counts)
// ============================================================================

/**
 * Récupère les compteurs de réactions pour un article
 */
export const getArticleReactions = async (
  articleId: string
): Promise<ReactionCounts> => {
  const result = await withSupabaseErrorHandling('reactions-read', async (client) => {
    const { data, error } = await client.rpc('get_article_reactions', {
      p_article_id: articleId,
    });

    if (error) {
      console.warn('[ReactionsRepository] Erreur lecture réactions:', error);
      return null;
    }

    const counts = { ...DEFAULT_COUNTS };
    if (data && Array.isArray(data)) {
      data.forEach((row: { reaction_type: ReactionType; count: number }) => {
        if (row.reaction_type in counts) {
          counts[row.reaction_type] = row.count;
        }
      });
    }
    return counts;
  });

  return result ?? { ...DEFAULT_COUNTS };
};

/**
 * Récupère les compteurs pour plusieurs articles
 */
export const getMultipleArticlesReactions = async (
  articleIds: string[]
): Promise<Record<string, ReactionCounts>> => {
  if (articleIds.length === 0) return {};

  const result = await withSupabaseErrorHandling('reactions-batch-read', async (client) => {
    const { data, error } = await client.rpc('get_multiple_articles_reactions', {
      p_article_ids: articleIds,
    });

    if (error) {
      console.warn('[ReactionsRepository] Erreur lecture batch réactions:', error);
      return null;
    }

    const result: Record<string, ReactionCounts> = {};

    // Initialiser avec valeurs par défaut
    articleIds.forEach((id) => {
      result[id] = { ...DEFAULT_COUNTS };
    });

    // Remplir avec les vraies valeurs
    if (data && Array.isArray(data)) {
      data.forEach((row: { article_id: string; reaction_type: ReactionType; count: number }) => {
        if (result[row.article_id] && row.reaction_type in result[row.article_id]) {
          result[row.article_id][row.reaction_type] = row.count;
        }
      });
    }

    return result;
  });

  return result ?? {};
};

/**
 * Incrémente une réaction
 */
export const incrementReaction = async (
  articleId: string,
  reactionType: ReactionType
): Promise<number> => {
  const result = await withSupabaseErrorHandling('reaction-increment', async (client) => {
    const { data, error } = await client.rpc('increment_reaction', {
      p_article_id: articleId,
      p_reaction_type: reactionType,
    });

    if (error) {
      console.warn('[ReactionsRepository] Erreur incrémentation:', error);
      return 0;
    }

    // Sauvegarder dans localStorage
    saveUserReaction(articleId, reactionType);

    return data ?? 0;
  });

  return result ?? 0;
};

/**
 * Décrémente une réaction
 */
export const decrementReaction = async (
  articleId: string,
  reactionType: ReactionType
): Promise<number> => {
  const result = await withSupabaseErrorHandling('reaction-decrement', async (client) => {
    const { data, error } = await client.rpc('decrement_reaction', {
      p_article_id: articleId,
      p_reaction_type: reactionType,
    });

    if (error) {
      console.warn('[ReactionsRepository] Erreur décrémentation:', error);
      return 0;
    }

    return data ?? 0;
  });

  return result ?? 0;
};

/**
 * Toggle une réaction (change ou supprime)
 */
export const toggleReaction = async (
  articleId: string,
  newReaction: ReactionType | null,
  previousReaction: ReactionType | null
): Promise<{ success: boolean; counts?: Partial<ReactionCounts> }> => {
  const updates: Partial<ReactionCounts> = {};

  try {
    // Décrémente l'ancienne réaction si elle existe
    if (previousReaction) {
      const newCount = await decrementReaction(articleId, previousReaction);
      updates[previousReaction] = newCount;
    }

    // Incrémente la nouvelle réaction si elle existe
    if (newReaction) {
      const newCount = await incrementReaction(articleId, newReaction);
      updates[newReaction] = newCount;
    } else {
      // L'utilisateur supprime sa réaction
      saveUserReaction(articleId, null);
    }

    return { success: true, counts: updates };
  } catch (error) {
    console.error('[ReactionsRepository] Erreur toggle:', error);
    return { success: false };
  }
};

