/**
 * Gestion centralisée des variables d'environnement
 * Single source of truth pour toute la configuration
 */

type EnvRecord = Record<string, string | boolean | undefined>;

// ============================================================================
// ENV READERS
// ============================================================================

const getBrowserEnv = (): EnvRecord => {
  try {
    if (typeof import.meta !== 'undefined' && (import.meta as any)?.env) {
      return (import.meta as any).env as EnvRecord;
    }
  } catch {
    // ignore
  }
  return {};
};

const getNodeEnv = (): EnvRecord => {
  if (typeof process !== 'undefined' && process.env) {
    return process.env as EnvRecord;
  }
  return {};
};

// ============================================================================
// VALUE PICKERS
// ============================================================================

const pickString = (...candidates: Array<string | undefined | null>): string | undefined => {
  for (const value of candidates) {
    if (typeof value === 'string' && value.trim().length > 0) {
      return value.trim();
    }
  }
  return undefined;
};

const TRUTHY_VALUES = new Set(['1', 'true', 'yes', 'on']);

const parseBoolean = (value?: string | boolean | null): boolean => {
  if (typeof value === 'boolean') return value;
  if (typeof value === 'string') return TRUTHY_VALUES.has(value.trim().toLowerCase());
  return false;
};

const parseNumber = (value: string | undefined, fallback: number): number => {
  if (!value) return fallback;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

// ============================================================================
// ENV SINGLETON
// ============================================================================

class Environment {
  private browserEnv: EnvRecord;
  private nodeEnv: EnvRecord;
  private cache = new Map<string, unknown>();

  constructor() {
    this.browserEnv = getBrowserEnv();
    this.nodeEnv = getNodeEnv();
  }

  // --------------------------------------------------------------------------
  // SUPABASE
  // --------------------------------------------------------------------------

  get supabaseUrl(): string | undefined {
    if (!this.cache.has('supabaseUrl')) {
      this.cache.set('supabaseUrl', pickString(
        this.browserEnv.VITE_SUPABASE_URL as string,
        this.browserEnv.SUPABASE_URL as string,
        this.browserEnv.PUBLIC_SUPABASE_URL as string,
        this.nodeEnv.SUPABASE_URL as string,
        this.nodeEnv.VITE_SUPABASE_URL as string
      ));
    }
    return this.cache.get('supabaseUrl') as string | undefined;
  }

  get supabaseKey(): string | undefined {
    if (!this.cache.has('supabaseKey')) {
      this.cache.set('supabaseKey', pickString(
        this.browserEnv.VITE_SUPABASE_KEY as string,
        this.browserEnv.SUPABASE_KEY as string,
        this.browserEnv.SUPABASE_ANON_KEY as string,
        this.browserEnv.PUBLIC_SUPABASE_KEY as string,
        this.nodeEnv.SUPABASE_KEY as string,
        this.nodeEnv.SUPABASE_ANON_KEY as string,
        this.nodeEnv.VITE_SUPABASE_KEY as string
      ));
    }
    return this.cache.get('supabaseKey') as string | undefined;
  }

  get isSupabaseConfigured(): boolean {
    return Boolean(this.supabaseUrl && this.supabaseKey);
  }

  // --------------------------------------------------------------------------
  // GEMINI / API
  // --------------------------------------------------------------------------

  get geminiApiKey(): string | undefined {
    if (!this.cache.has('geminiApiKey')) {
      const nodeKey = pickString(
        this.nodeEnv.API_KEY as string,
        this.nodeEnv.GEMINI_API_KEY as string,
        this.nodeEnv.VITE_API_KEY as string
      );
      const browserKey = pickString(
        this.browserEnv.VITE_API_KEY as string,
        this.browserEnv.GEMINI_API_KEY as string,
        this.browserEnv.VITE_GEMINI_API_KEY as string,
        this.browserEnv.PUBLIC_GEMINI_API_KEY as string,
        this.browserEnv.API_KEY as string
      );
      this.cache.set('geminiApiKey', browserKey ?? nodeKey);
    }
    return this.cache.get('geminiApiKey') as string | undefined;
  }

  get isGeminiConfigured(): boolean {
    return Boolean(this.geminiApiKey);
  }

  // --------------------------------------------------------------------------
  // FIRECRAWL
  // --------------------------------------------------------------------------

  get firecrawlApiKey(): string | undefined {
    if (!this.cache.has('firecrawlApiKey')) {
      this.cache.set('firecrawlApiKey', pickString(
        this.browserEnv.VITE_FIRECRAWL_API_KEY as string,
        this.nodeEnv.FIRECRAWL_API_KEY as string
      ));
    }
    return this.cache.get('firecrawlApiKey') as string | undefined;
  }

  get isFirecrawlConfigured(): boolean {
    return Boolean(this.firecrawlApiKey);
  }

  // --------------------------------------------------------------------------
  // FEATURE FLAGS
  // --------------------------------------------------------------------------

  get forceMockData(): boolean {
    if (!this.cache.has('forceMockData')) {
      try {
        const globalFlag = (globalThis as any)?.__PRISM_FORCE_MOCK__;
        if (parseBoolean(globalFlag)) {
          this.cache.set('forceMockData', true);
          return true;
        }
      } catch {
        // ignore
      }

      const result = parseBoolean(this.nodeEnv.FORCE_MOCK_DATA) ||
        parseBoolean(this.nodeEnv.USE_MOCK_DATA) ||
        parseBoolean(this.browserEnv.VITE_FORCE_MOCK_DATA) ||
        parseBoolean(this.browserEnv.VITE_USE_MOCK_DATA);

      this.cache.set('forceMockData', result);
    }
    return this.cache.get('forceMockData') as boolean;
  }

  get disableImageGeneration(): boolean {
    if (!this.cache.has('disableImageGeneration')) {
      try {
        const globalFlag = (globalThis as any)?.__PRISM_DISABLE_IMAGES;
        if (parseBoolean(globalFlag)) {
          this.cache.set('disableImageGeneration', true);
          return true;
        }
      } catch {
        // ignore
      }

      const result = parseBoolean(this.nodeEnv.DISABLE_IMAGE_GENERATION) ||
        parseBoolean(this.nodeEnv.DISABLE_IMAGEN_SERVICE) ||
        parseBoolean(this.browserEnv.VITE_DISABLE_IMAGE_GENERATION) ||
        parseBoolean(this.browserEnv.VITE_DISABLE_IMAGES) ||
        parseBoolean(this.browserEnv.VITE_DISABLE_IMAGEN_SERVICE);

      this.cache.set('disableImageGeneration', result);
    }
    return this.cache.get('disableImageGeneration') as boolean;
  }

  get disableAiUsageLogs(): boolean {
    if (!this.cache.has('disableAiUsageLogs')) {
      this.cache.set('disableAiUsageLogs', parseBoolean(this.nodeEnv.PRISM_DISABLE_AI_LOGS));
    }
    return this.cache.get('disableAiUsageLogs') as boolean;
  }

  // --------------------------------------------------------------------------
  // PRICING (for AI usage logging)
  // --------------------------------------------------------------------------

  getPricingOverride(key: string, fallback: number): number {
    const envKey = `PRISM_PRICE_${key}`;
    return parseNumber(this.nodeEnv[envKey] as string, fallback);
  }

  // --------------------------------------------------------------------------
  // RUNTIME INFO
  // --------------------------------------------------------------------------

  get isBrowser(): boolean {
    return typeof window !== 'undefined';
  }

  get isServer(): boolean {
    return !this.isBrowser;
  }
}

// Singleton export
export const env = new Environment();

// Re-export utility functions for external use
export { parseBoolean, parseNumber, pickString };

