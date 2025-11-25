import { supabase } from './supabaseClient';

export type ReactionType = 'fire' | 'shock' | 'doubt' | 'angry' | 'clap';

export interface ReactionCounts {
    fire: number;
    shock: number;
    doubt: number;
    angry: number;
    clap: number;
}

const DEFAULT_COUNTS: ReactionCounts = {
    fire: 0,
    shock: 0,
    doubt: 0,
    angry: 0,
    clap: 0
};

// LocalStorage keys
const USER_REACTIONS_KEY = 'prism_user_reactions';

/**
 * Get user's reactions from localStorage
 */
export const getUserReactions = (): Record<string, ReactionType | null> => {
    if (typeof window === 'undefined') return {};
    try {
        const stored = localStorage.getItem(USER_REACTIONS_KEY);
        return stored ? JSON.parse(stored) : {};
    } catch {
        return {};
    }
};

/**
 * Save user's reaction to localStorage
 */
export const saveUserReaction = (articleId: string, reactionType: ReactionType | null): void => {
    if (typeof window === 'undefined') return;
    try {
        const current = getUserReactions();
        if (reactionType === null) {
            delete current[articleId];
        } else {
            current[articleId] = reactionType;
        }
        localStorage.setItem(USER_REACTIONS_KEY, JSON.stringify(current));
    } catch {
        console.warn('Failed to save user reaction to localStorage');
    }
};

/**
 * Get user's reaction for a specific article
 */
export const getUserReactionForArticle = (articleId: string): ReactionType | null => {
    const reactions = getUserReactions();
    return reactions[articleId] || null;
};

/**
 * Fetch reactions for a single article
 */
export const getArticleReactions = async (articleId: string): Promise<ReactionCounts> => {
    if (!supabase) {
        console.warn('Supabase not configured, returning default counts');
        return { ...DEFAULT_COUNTS };
    }

    try {
        const { data, error } = await supabase
            .rpc('get_article_reactions', { p_article_id: articleId });

        if (error) {
            console.error('Error fetching reactions:', error);
            return { ...DEFAULT_COUNTS };
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
    } catch (err) {
        console.error('Error fetching reactions:', err);
        return { ...DEFAULT_COUNTS };
    }
};

/**
 * Fetch reactions for multiple articles at once
 */
export const getMultipleArticlesReactions = async (
    articleIds: string[]
): Promise<Record<string, ReactionCounts>> => {
    if (!supabase || articleIds.length === 0) {
        return {};
    }

    try {
        const { data, error } = await supabase
            .rpc('get_multiple_articles_reactions', { p_article_ids: articleIds });

        if (error) {
            console.error('Error fetching multiple reactions:', error);
            return {};
        }

        const result: Record<string, ReactionCounts> = {};
        
        // Initialize all articles with default counts
        articleIds.forEach(id => {
            result[id] = { ...DEFAULT_COUNTS };
        });

        // Fill in actual counts
        if (data && Array.isArray(data)) {
            data.forEach((row: { article_id: string; reaction_type: ReactionType; count: number }) => {
                if (result[row.article_id] && row.reaction_type in result[row.article_id]) {
                    result[row.article_id][row.reaction_type] = row.count;
                }
            });
        }

        return result;
    } catch (err) {
        console.error('Error fetching multiple reactions:', err);
        return {};
    }
};

/**
 * Increment a reaction for an article
 */
export const incrementReaction = async (
    articleId: string,
    reactionType: ReactionType
): Promise<number> => {
    if (!supabase) {
        console.warn('Supabase not configured');
        return 0;
    }

    try {
        const { data, error } = await supabase
            .rpc('increment_reaction', {
                p_article_id: articleId,
                p_reaction_type: reactionType
            });

        if (error) {
            console.error('Error incrementing reaction:', error);
            return 0;
        }

        // Save to localStorage
        saveUserReaction(articleId, reactionType);
        
        return data ?? 0;
    } catch (err) {
        console.error('Error incrementing reaction:', err);
        return 0;
    }
};

/**
 * Decrement a reaction for an article
 */
export const decrementReaction = async (
    articleId: string,
    reactionType: ReactionType
): Promise<number> => {
    if (!supabase) {
        console.warn('Supabase not configured');
        return 0;
    }

    try {
        const { data, error } = await supabase
            .rpc('decrement_reaction', {
                p_article_id: articleId,
                p_reaction_type: reactionType
            });

        if (error) {
            console.error('Error decrementing reaction:', error);
            return 0;
        }

        return data ?? 0;
    } catch (err) {
        console.error('Error decrementing reaction:', err);
        return 0;
    }
};

/**
 * Handle reaction toggle (used when user changes their reaction)
 * Returns the updated counts
 */
export const toggleReaction = async (
    articleId: string,
    newReaction: ReactionType | null,
    previousReaction: ReactionType | null
): Promise<{ success: boolean; counts?: Partial<ReactionCounts> }> => {
    if (!supabase) {
        // Fallback for demo mode
        saveUserReaction(articleId, newReaction);
        return { success: true };
    }

    try {
        const updates: Partial<ReactionCounts> = {};

        // Decrement previous reaction if exists
        if (previousReaction) {
            const newCount = await decrementReaction(articleId, previousReaction);
            updates[previousReaction] = newCount;
        }

        // Increment new reaction if exists
        if (newReaction) {
            const newCount = await incrementReaction(articleId, newReaction);
            updates[newReaction] = newCount;
        } else {
            // User is removing their reaction entirely
            saveUserReaction(articleId, null);
        }

        return { success: true, counts: updates };
    } catch (err) {
        console.error('Error toggling reaction:', err);
        return { success: false };
    }
};

