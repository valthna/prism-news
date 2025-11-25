/**
 * Configuration globale des tests
 */

import { vi } from 'vitest';

// ============================================================================
// GLOBAL MOCKS
// ============================================================================

// Mock crypto.randomUUID
if (typeof globalThis.crypto === 'undefined') {
  vi.stubGlobal('crypto', {
    randomUUID: () => 'test-uuid-1234',
  });
}

// ============================================================================
// ENV HELPERS
// ============================================================================

export const originalEnv = { ...process.env };

export const resetEnv = () => {
  process.env = { ...originalEnv };
};

export const setEnv = (overrides: Record<string, string | undefined>) => {
  process.env = { ...originalEnv, ...overrides };
};

export const clearEnv = (...keys: string[]) => {
  keys.forEach((key) => delete process.env[key]);
};

// ============================================================================
// MOCK FACTORIES
// ============================================================================

export const createMockSupabaseClient = () => {
  const createQueryChain = () => {
    const chain: any = {};
    chain.select = vi.fn(() => chain);
    chain.eq = vi.fn(() => chain);
    chain.gt = vi.fn(() => chain);
    chain.lt = vi.fn(() => chain);
    chain.not = vi.fn(() => chain);
    chain.order = vi.fn(() => chain);
    chain.limit = vi.fn(async () => ({ data: [], error: null }));
    chain.delete = vi.fn(() => chain);
    chain.in = vi.fn(async () => ({ error: null }));
    chain.upsert = vi.fn(async () => ({ error: null }));
    chain.insert = vi.fn(async () => ({ error: null }));
    chain.rpc = vi.fn(async () => ({ data: null, error: null }));
    return chain;
  };

  const newsCache = createQueryChain();
  const newsTiles = createQueryChain();
  const reactions = createQueryChain();
  const aiUsage = createQueryChain();

  const storage = {
    from: vi.fn(() => ({
      upload: vi.fn(async () => ({ error: null })),
      getPublicUrl: vi.fn(() => ({ data: { publicUrl: 'https://mock.storage/image.png' } })),
      remove: vi.fn(async () => ({ error: null })),
    })),
  };

  return {
    from: vi.fn((table: string) => {
      switch (table) {
        case 'news_cache':
          return newsCache;
        case 'news_tiles':
          return newsTiles;
        case 'article_reactions':
          return reactions;
        case 'ai_usage_events':
          return aiUsage;
        default:
          return createQueryChain();
      }
    }),
    storage,
    rpc: vi.fn(async () => ({ data: null, error: null })),
    // Expose pour les assertions
    _mocks: { newsCache, newsTiles, reactions, aiUsage, storage },
  };
};

export const createMockGeminiResponse = (text: string) => ({
  text: () => text,
  candidates: [
    {
      content: {
        parts: [{ text }],
      },
    },
  ],
  usageMetadata: {
    promptTokenCount: 100,
    candidatesTokenCount: 200,
    totalTokenCount: 300,
  },
});

export const createMockImageResponse = (base64 = 'AAAABBBB') => ({
  candidates: [
    {
      content: {
        parts: [
          {
            inlineData: {
              data: base64,
              mimeType: 'image/png',
            },
          },
        ],
      },
    },
  ],
});

// ============================================================================
// TEST FIXTURES
// ============================================================================

export const fixtures = {
  article: {
    id: 'test-article-1',
    headline: 'Test Article Headline',
    summary: 'Test summary of the article',
    detailedSummary: 'Detailed test summary with more information',
    importance: 'This is why it matters',
    emoji: '📰',
    publishedAt: 'Il y a 2H',
    imagePrompt: 'Test image prompt',
    imageUrl: 'https://test.com/image.png',
    category: 'Test',
    biasAnalysis: {
      left: 33,
      center: 34,
      right: 33,
      consensusScore: 75,
    },
    sources: [
      {
        name: 'reuters.com',
        bias: 'center' as const,
        position: 50,
        coverageSummary: 'Coverage from Reuters',
        url: 'https://reuters.com/article',
        logoUrl: 'https://google.com/favicon?domain=reuters.com',
        isVerified: true,
      },
    ],
    sentiment: {
      positive: 'Good perspective',
      negative: 'Critical view',
    },
    comments: [],
  },

  rawArticle: {
    id: 'raw-1',
    headline: 'Raw Article',
    summary: 'Raw summary',
    sources: [
      { name: 'lemonde.fr', bias: 'left' },
      { name: 'lefigaro.fr', bias: 'right' },
    ],
  },

  source: {
    name: 'reuters.com',
    bias: 'center' as const,
    position: 50,
    coverageSummary: 'Neutral coverage',
    url: 'https://reuters.com',
    logoUrl: 'https://google.com/favicon?domain=reuters.com',
  },
};

