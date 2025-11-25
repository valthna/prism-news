/**
 * PRISM Services - Export Principal
 *
 * Architecture en couches :
 *
 * ┌─────────────────────────────────────────────────────────────┐
 * │                     APPLICATION LAYER                        │
 * │  (NewsService, ImageService, SettingsService)                │
 * │  → Orchestration, business workflows                         │
 * ├─────────────────────────────────────────────────────────────┤
 * │                      DOMAIN LAYER                            │
 * │  (Sources, Articles, Reliability)                            │
 * │  → Logique métier pure, règles business                      │
 * ├─────────────────────────────────────────────────────────────┤
 * │                   REPOSITORY LAYER                           │
 * │  (NewsRepository, CacheRepository, ReactionsRepository)      │
 * │  → Accès aux données, persistance                            │
 * ├─────────────────────────────────────────────────────────────┤
 * │                       API LAYER                              │
 * │  (GeminiClient, FirecrawlClient, SupabaseClient)             │
 * │  → Communication avec services externes                      │
 * ├─────────────────────────────────────────────────────────────┤
 * │                      CORE LAYER                              │
 * │  (Errors, Utils, Config)                                     │
 * │  → Infrastructure transversale                               │
 * └─────────────────────────────────────────────────────────────┘
 */

// =============================================================================
// PUBLIC API - Application Services
// =============================================================================

export {
  // News
  fetchNewsArticles,
  buildCacheKey,

  // Images
  generateArticleImage,
  generateArticleImages,
  isImageServiceEnabled,
  canHostImages,

  // Settings
  loadSettings,
  saveSettings,
  updateSetting,
  resetSettings,
  getCacheSize,
  clearCache,
  DEBATE_MODE_LABELS,
  SOURCE_PRIORITY_LABELS,
  TEXT_SIZE_OPTIONS,
} from './application';

export type { UserSettings, ImageGenerationOptions, ImageGenerationResult } from './application';

// =============================================================================
// PUBLIC API - Reactions (used directly by components)
// =============================================================================

export {
  getUserReactions,
  saveUserReaction,
  getUserReactionForArticle,
  getArticleReactions,
  getMultipleArticlesReactions,
  incrementReaction,
  decrementReaction,
  toggleReaction,
} from './repositories';

export type { ReactionType, ReactionCounts } from './repositories';

// =============================================================================
// PUBLIC API - Reliability Calculator (used by components)
// =============================================================================

export {
  calculateReliability,
  calculateBiasDistribution,
  isBalanced,
} from './domain/reliability';

// =============================================================================
// PUBLIC API - Progress Tracker (used by UI)
// =============================================================================

export { progressTracker } from './progressTracker';
export type { LoadingPhase, ProgressUpdate } from './progressTracker';

// =============================================================================
// PUBLIC API - Prompts (used by Chatbot)
// =============================================================================

export { PRISM_PROMPTS } from './prompts';

// =============================================================================
// LEGACY EXPORTS (for backward compatibility)
// =============================================================================

// Re-export the old supabase client for components that still use it directly
export { getSupabaseClient as supabase } from './api/supabase';
export { getSupabaseUrl as SUPABASE_URL } from './api/supabase';

// Re-export image service functions with old names
export { generateArticleImage as getImagenService } from './application/ImageService';
export { isImageServiceEnabled as isImagenServiceEnabled } from './application/ImageService';
export { SUPABASE } from './config/constants';
export const SUPABASE_IMAGE_BUCKET = 'news-images';

