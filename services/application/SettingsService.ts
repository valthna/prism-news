/**
 * Service de gestion des réglages utilisateur
 */

import { readFromLocalStorage, writeToLocalStorage, getLocalStorageSize, formatBytes } from '../core/utils/storage';

// ============================================================================
// TYPES
// ============================================================================

export interface UserSettings {
  // Préférences IA
  language: string;
  debateMode: 'calm' | 'moderate' | 'intense';
  sourcePriority: 'balanced' | 'mainstream' | 'alternative';

  // Affichage
  highContrast: boolean;
  autoPlay: boolean;
  textSize: number; // 80-120 en pourcentage

  // Notifications
  pushNotifications: boolean;
  morningBrief: boolean;
  weekendDigest: boolean;

  // Données
  dataSaver: boolean;
  preloadInsights: boolean;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const SETTINGS_KEY = 'prism_user_settings';

const DEFAULT_SETTINGS: UserSettings = {
  language: 'Français',
  debateMode: 'moderate',
  sourcePriority: 'balanced',
  highContrast: false,
  autoPlay: true,
  textSize: 100,
  pushNotifications: true,
  morningBrief: true,
  weekendDigest: false,
  dataSaver: false,
  preloadInsights: true,
};

// ============================================================================
// SETTINGS OPERATIONS
// ============================================================================

/**
 * Charge les réglages depuis localStorage
 */
export const loadSettings = (): UserSettings => {
  const stored = readFromLocalStorage<Partial<UserSettings>>(SETTINGS_KEY);
  if (stored) {
    return { ...DEFAULT_SETTINGS, ...stored };
  }
  return { ...DEFAULT_SETTINGS };
};

/**
 * Sauvegarde les réglages dans localStorage
 */
export const saveSettings = (settings: UserSettings): void => {
  writeToLocalStorage(SETTINGS_KEY, settings);
};

/**
 * Met à jour un réglage spécifique
 */
export const updateSetting = <K extends keyof UserSettings>(
  key: K,
  value: UserSettings[K]
): UserSettings => {
  const current = loadSettings();
  const updated = { ...current, [key]: value };
  saveSettings(updated);
  return updated;
};

/**
 * Réinitialise tous les réglages aux valeurs par défaut
 */
export const resetSettings = (): UserSettings => {
  saveSettings(DEFAULT_SETTINGS);
  return { ...DEFAULT_SETTINGS };
};

// ============================================================================
// CACHE OPERATIONS
// ============================================================================

/**
 * Calcule et formate la taille du cache
 */
export const getCacheSize = (): string => {
  return formatBytes(getLocalStorageSize());
};

/**
 * Vide le cache (conserve les réglages utilisateur)
 */
export const clearCache = (): void => {
  const settings = loadSettings();
  const keysToKeep = [SETTINGS_KEY];

  try {
    const storage = typeof window !== 'undefined' ? window.localStorage : null;
    if (!storage) return;

    const allKeys = Object.keys(storage);
    for (const key of allKeys) {
      if (!keysToKeep.includes(key)) {
        storage.removeItem(key);
      }
    }
  } catch (error) {
    console.warn('[SettingsService] Erreur vidage cache:', error);
  }
};

// ============================================================================
// LABELS
// ============================================================================

export const DEBATE_MODE_LABELS: Record<UserSettings['debateMode'], string> = {
  calm: 'Calme',
  moderate: 'Modéré',
  intense: 'Intense',
};

export const SOURCE_PRIORITY_LABELS: Record<UserSettings['sourcePriority'], string> = {
  balanced: 'Équilibré',
  mainstream: 'Médias majeurs',
  alternative: 'Sources alternatives',
};

export const TEXT_SIZE_OPTIONS = [
  { value: 80, label: '80%' },
  { value: 90, label: '90%' },
  { value: 100, label: '100%' },
  { value: 110, label: '110%' },
  { value: 120, label: '120%' },
];

