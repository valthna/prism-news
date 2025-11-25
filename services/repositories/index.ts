/**
 * Repositories module - Export principal
 */

// Cache Repository
export {
  getLocalCache,
  saveLocalCache,
  clearLocalCache,
  getSupabaseCache,
  saveSupabaseCache,
  getCachedArticles,
  cacheArticles,
} from './CacheRepository';

// News Repository
export {
  getTiles,
  getAllArticlesWithImages,
  persistTiles,
  cleanupExpiredTiles,
  sortByRecency,
  sortBySourceRichness,
} from './NewsRepository';

// Reactions Repository
export {
  getUserReactions,
  saveUserReaction,
  getUserReactionForArticle,
  getArticleReactions,
  getMultipleArticlesReactions,
  incrementReaction,
  decrementReaction,
  toggleReaction,
} from './ReactionsRepository';
export type { ReactionType, ReactionCounts } from './ReactionsRepository';

// Image Repository
export {
  uploadImage,
  deleteImage,
  deleteImages,
  getBucketPublicUrl,
  isUploadAvailable,
  resetUploadState,
} from './ImageRepository';

