/**
 * Client Firecrawl pour le scraping web
 */

import { env } from '../../config';
import { API_ENDPOINTS, TIMEOUTS } from '../../config/constants';
import { AppError, NetworkError, extractErrorMessage } from '../../core/errors';
import { extractDomain } from '../../core/utils';

// ============================================================================
// TYPES
// ============================================================================

export interface FirecrawlSearchResult {
  title: string;
  url: string;
  markdown?: string;
}

export interface FirecrawlSearchResponse {
  success: boolean;
  data?: FirecrawlSearchResult[];
  error?: string;
}

export interface SearchVector {
  name: string;
  query: string;
  emoji: string;
}

export interface VectorSearchResult {
  vector: string;
  data: FirecrawlSearchResult[];
}

// ============================================================================
// SEARCH VECTORS
// ============================================================================

/**
 * Construit les vecteurs de recherche pour une requête/catégorie
 */
export const buildSearchVectors = (query?: string, category?: string): SearchVector[] => {
  const baseQuery = query || '';
  const context = category && category !== 'Général' ? `in ${category}` : 'world news';

  return [
    {
      name: 'HEADLINES',
      query: query ? `${baseQuery} news facts` : `breaking news headlines ${context} today`,
      emoji: '📰',
    },
    {
      name: 'POLITICS',
      query: query ? `${baseQuery} political analysis` : `political analysis opinion editorials ${context}`,
      emoji: '🏛️',
    },
    {
      name: 'ECONOMY',
      query: query ? `${baseQuery} market trends` : `financial markets business economy ${context}`,
      emoji: '💹',
    },
    {
      name: 'TECH_SCI',
      query: query ? `${baseQuery} technology science` : `technology science innovation ${context}`,
      emoji: '🔬',
    },
    {
      name: 'SOCIETY',
      query: query ? `${baseQuery} social issues` : `social issues environment culture ${context}`,
      emoji: '🌍',
    },
  ];
};

// ============================================================================
// API CALLS
// ============================================================================

/**
 * Exécute une recherche Firecrawl
 */
export const executeSearch = async (
  searchQuery: string,
  options: {
    limit?: number;
    timeoutMs?: number;
  } = {}
): Promise<FirecrawlSearchResult[]> => {
  const apiKey = env.firecrawlApiKey;
  if (!apiKey) {
    throw new AppError('API_KEY_MISSING', 'Firecrawl API Key non configurée');
  }

  const { limit = 20, timeoutMs = TIMEOUTS.FIRECRAWL_VECTOR_MS } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch(API_ENDPOINTS.FIRECRAWL_SEARCH, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        query: searchQuery,
        limit,
        scrapeOptions: {
          formats: ['markdown'],
          onlyMainContent: true,
        },
      }),
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      throw new AppError(
        'UNKNOWN_ERROR',
        `Firecrawl API error ${response.status}: ${errorText}`,
        { context: { status: response.status } }
      );
    }

    const json: FirecrawlSearchResponse = await response.json();
    if (!json.success) {
      throw new AppError('UNKNOWN_ERROR', json.error || 'Firecrawl error');
    }

    return json.data || [];

  } catch (error: any) {
    clearTimeout(timeoutId);

    if (error.name === 'AbortError') {
      throw new AppError('TIMEOUT', `Firecrawl timeout après ${timeoutMs}ms`);
    }

    if (error instanceof AppError) throw error;

    throw new NetworkError(
      extractErrorMessage(error),
      { service: 'firecrawl' },
      error instanceof Error ? error : undefined
    );
  }
};

/**
 * Exécute une recherche sur un vecteur spécifique
 */
export const executeVectorSearch = async (
  vector: SearchVector,
  options: { limit?: number; timeoutMs?: number } = {}
): Promise<VectorSearchResult> => {
  try {
    const data = await executeSearch(vector.query, options);
    return { vector: vector.name, data };
  } catch (error) {
    console.warn(`[Firecrawl] Vecteur ${vector.name} échoué:`, error);
    return { vector: vector.name, data: [] };
  }
};

/**
 * Exécute une découverte massive en parallèle sur tous les vecteurs
 */
export const performMassiveDiscovery = async (
  query?: string,
  category?: string,
  options: {
    onVectorProgress?: (vectorName: string, index: number, total: number) => void;
  } = {}
): Promise<string | null> => {
  if (!env.isFirecrawlConfigured) {
    console.warn('[Firecrawl] API Key non configurée');
    return null;
  }

  const vectors = buildSearchVectors(query, category);
  const { onVectorProgress } = options;

  console.log('[Firecrawl] Lancement découverte massive...');

  // Exécution parallèle
  const results = await Promise.all(
    vectors.map(async (vector, index) => {
      onVectorProgress?.(vector.name, index, vectors.length);
      return executeVectorSearch(vector);
    })
  );

  // Consolidation des résultats
  let totalSources = 0;
  const consolidatedContext = results
    .filter((r) => r.data.length > 0)
    .map((r) => {
      totalSources += r.data.length;

      const vectorContent = r.data
        .map((item, idx) => {
          const domain = extractDomain(item.url);
          const snippet = item.markdown
            ? item.markdown.slice(0, 1200).replace(/\n+/g, ' ')
            : 'No content.';

          return `
[SOURCE_REF: ${r.vector}_${idx + 1}]
TITLE: ${item.title}
URL: ${item.url}
SOURCE: ${domain}
CONTENT_SNIPPET:
${snippet}
`;
        })
        .join('\n');

      return `### SECTEUR ${r.vector} ###\n${vectorContent}`;
    })
    .join('\n\n');

  if (totalSources === 0) {
    console.warn('[Firecrawl] Aucun résultat trouvé');
    return null;
  }

  console.log(`[Firecrawl] ${totalSources} sources collectées`);
  return consolidatedContext;
};

// ============================================================================
// CONVENIENCE EXPORTS
// ============================================================================

export const isFirecrawlConfigured = (): boolean => env.isFirecrawlConfigured;

