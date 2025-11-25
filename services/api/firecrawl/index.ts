/**
 * Firecrawl API module - Export principal
 */

export {
  executeSearch,
  executeVectorSearch,
  performMassiveDiscovery,
  buildSearchVectors,
  isFirecrawlConfigured,
} from './client';

export type {
  FirecrawlSearchResult,
  FirecrawlSearchResponse,
  SearchVector,
  VectorSearchResult,
} from './client';

