/**
 * LEGACY COMPATIBILITY WRAPPER
 *
 * Ce fichier maintient la rétrocompatibilité avec l'ancien geminiService.
 * Pour les nouveaux développements, utilisez directement les services de l'architecture refactorisée.
 *
 * Mapping:
 * - fetchNewsArticles → services/application/NewsService.ts
 * - Image generation → services/application/ImageService.ts
 * - Source enrichment → services/domain/sources/SourceEnricher.ts
 * - Reliability calculation → services/domain/reliability/calculator.ts
 */

// Re-export the main function from the new architecture
export { fetchNewsArticles } from './application/NewsService';

// For any code that still imports directly from geminiService
console.log('[PRISM] geminiService.ts is deprecated. Use services/application/NewsService.ts instead.');

