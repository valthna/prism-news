/**
 * LEGACY COMPATIBILITY WRAPPER
 *
 * Ce fichier maintient la rétrocompatibilité avec l'ancien reactionsService.
 * Pour les nouveaux développements, utilisez directement les repositories.
 *
 * Mapping:
 * - All functions → services/repositories/ReactionsRepository.ts
 */

// Re-export everything from the new architecture
export {
  getUserReactions,
  saveUserReaction,
  getUserReactionForArticle,
  getArticleReactions,
  getMultipleArticlesReactions,
  incrementReaction,
  decrementReaction,
  toggleReaction,
} from './repositories/ReactionsRepository';

export type { ReactionType, ReactionCounts } from './repositories/ReactionsRepository';

console.log('[PRISM] reactionsService.ts is deprecated. Use services/repositories/ReactionsRepository.ts instead.');

