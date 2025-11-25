/**
 * Application services - Export principal
 */

// News Service
export { fetchNewsArticles, buildCacheKey } from './NewsService';

// Image Service
export {
  generateArticleImage,
  generateArticleImages,
  isImageServiceEnabled,
  canHostImages,
} from './ImageService';
export type { ImageGenerationOptions, ImageGenerationResult } from './ImageService';

// Settings Service
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
} from './SettingsService';
export type { UserSettings } from './SettingsService';

