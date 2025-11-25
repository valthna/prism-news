/**
 * Constantes de l'application
 * Toutes les valeurs magiques centralisées ici
 */

// ============================================================================
// CACHE & RETENTION
// ============================================================================

export const CACHE = {
  /** TTL du cache Supabase (24 heures) */
  SUPABASE_TTL_MS: 24 * 60 * 60 * 1000,

  /** TTL du cache local (30 minutes) */
  LOCAL_TTL_MS: 30 * 60 * 1000,

  /** Préfixe pour les clés localStorage */
  LOCAL_PREFIX: 'prism-cache:',

  /** Durée de rétention des tuiles (2 jours) */
  TILE_RETENTION_MS: 2 * 24 * 60 * 60 * 1000,

  /** Nombre minimum de tuiles réutilisables */
  MINIMUM_REUSABLE_TILES: 4,

  /** Version du pipeline de génération */
  TILE_PIPELINE_VERSION: 'g3-image-preview-v1',
} as const;

// ============================================================================
// TIMEOUTS
// ============================================================================

export const TIMEOUTS = {
  /** Timeout standard pour Gemini (3 min) */
  GEMINI_STANDARD_MS: 180 * 1000,

  /** Timeout étendu pour Gemini 3 avec thinking (5 min) */
  GEMINI_THINKING_MS: 300 * 1000,

  /** Cooldown après rate limit (10 min) */
  RATE_LIMIT_COOLDOWN_MS: 10 * 60 * 1000,

  /** Timeout pour les vecteurs Firecrawl (30s) */
  FIRECRAWL_VECTOR_MS: 30 * 1000,

  /** Timeout pour le check cache Supabase (5s) */
  SUPABASE_CACHE_CHECK_MS: 5000,
} as const;

// ============================================================================
// ARTICLES & SOURCES
// ============================================================================

export const ARTICLES = {
  /** Nombre minimum d'articles à générer */
  MIN_COUNT: 10,

  /** Nombre minimum de sources par article */
  MIN_SOURCES_PER_ARTICLE: 5,

  /** Nombre cible de sources par article */
  TARGET_SOURCES_PER_ARTICLE: 8,
} as const;

// ============================================================================
// GEMINI MODELS (ordre de priorité)
// ============================================================================

export const GEMINI_MODELS = {
  /** Modèles LLM par ordre de priorité */
  LLM: [
    'gemini-3-pro-preview',
    'gemini-2.5-pro',
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite',
    'gemini-2.0-flash',
  ],

  /** Modèles Image par ordre de priorité */
  IMAGE: [
    'gemini-3-pro-image-preview',
    'gemini-2.5-flash-image',
  ],
} as const;

// ============================================================================
// SUPABASE
// ============================================================================

export const SUPABASE = {
  /** Bucket pour les images */
  IMAGE_BUCKET: 'news-images',

  /** Tables */
  TABLES: {
    NEWS_CACHE: 'news_cache',
    NEWS_TILES: 'news_tiles',
    REACTIONS: 'article_reactions',
    AI_USAGE: 'ai_usage_events',
  },
} as const;

// ============================================================================
// BIAS POSITIONS (échelle 0-100)
// ============================================================================

export const BIAS_POSITIONS = {
  /** Positions par défaut par biais */
  DEFAULT: {
    left: 30,
    center: 50,
    right: 70,
    neutral: 50,
  },

  /** Ordre de rotation pour l'équilibrage */
  ROTATION_ORDER: ['left', 'right', 'center', 'neutral'] as const,
} as const;

// ============================================================================
// API ENDPOINTS
// ============================================================================

export const API_ENDPOINTS = {
  FIRECRAWL_SEARCH: 'https://api.firecrawl.dev/v1/search',
  GOOGLE_FAVICON: 'https://www.google.com/s2/favicons',
  GOOGLE_SEARCH: 'https://www.google.com/search',
} as const;

// ============================================================================
// RETRY CONFIGURATION
// ============================================================================

export const RETRY = {
  /** Nombre max de tentatives pour les appels API */
  MAX_ATTEMPTS: 3,

  /** Délai de base entre les tentatives (ms) */
  BASE_DELAY_MS: 1000,

  /** Délai entre les générations d'images (ms) */
  IMAGE_GENERATION_DELAY_MS: 2000,
} as const;

