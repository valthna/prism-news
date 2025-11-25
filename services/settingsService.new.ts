/**
 * LEGACY COMPATIBILITY WRAPPER
 *
 * Ce fichier maintient la rétrocompatibilité avec l'ancien settingsService.
 * Pour les nouveaux développements, utilisez directement les application services.
 *
 * Mapping:
 * - All functions → services/application/SettingsService.ts
 */

// Re-export everything from the new architecture
export {
  loadSettings,
  saveSettings,
  updateSetting,
  resetSettings,
  getCacheSize,
  clearCache,
  DEBATE_MODE_LABELS,
  SOURCE_PRIORITY_LABELS,
  TEXT_SIZE_OPTIONS,
} from './application/SettingsService';

export type { UserSettings } from './application/SettingsService';

// Legacy function for cache size formatting
import { getCacheSize as _getCacheSize } from './application/SettingsService';
export const formatCacheSize = (): string => {
  return _getCacheSize();
};

console.log('[PRISM] settingsService.ts is deprecated. Use services/application/SettingsService.ts instead.');

