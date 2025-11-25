/**
 * Service de gestion des réglages utilisateur avec persistance localStorage
 */

const SETTINGS_KEY = 'prism_user_settings';

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

/**
 * Charge les réglages depuis localStorage
 */
export function loadSettings(): UserSettings {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      // Fusionner avec les valeurs par défaut pour gérer les nouveaux champs
      return { ...DEFAULT_SETTINGS, ...parsed };
    }
  } catch (error) {
    console.warn('Erreur lors du chargement des réglages:', error);
  }
  return { ...DEFAULT_SETTINGS };
}

/**
 * Sauvegarde les réglages dans localStorage
 */
export function saveSettings(settings: UserSettings): void {
  try {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch (error) {
    console.warn('Erreur lors de la sauvegarde des réglages:', error);
  }
}

/**
 * Met à jour un réglage spécifique
 */
export function updateSetting<K extends keyof UserSettings>(
  key: K,
  value: UserSettings[K]
): UserSettings {
  const current = loadSettings();
  const updated = { ...current, [key]: value };
  saveSettings(updated);
  return updated;
}

/**
 * Réinitialise tous les réglages aux valeurs par défaut
 */
export function resetSettings(): UserSettings {
  saveSettings(DEFAULT_SETTINGS);
  return { ...DEFAULT_SETTINGS };
}

/**
 * Calcule la taille du cache simulée (en bytes)
 */
export function getCacheSize(): number {
  let totalSize = 0;
  try {
    for (const key of Object.keys(localStorage)) {
      const value = localStorage.getItem(key);
      if (value) {
        totalSize += key.length + value.length;
      }
    }
  } catch (error) {
    console.warn('Erreur lors du calcul de la taille du cache:', error);
  }
  return totalSize;
}

/**
 * Formate la taille du cache pour l'affichage
 */
export function formatCacheSize(): string {
  const bytes = getCacheSize();
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Vide le cache (conserve les réglages utilisateur)
 */
export function clearCache(): void {
  const settings = loadSettings();
  const keysToKeep = [SETTINGS_KEY];
  
  try {
    const allKeys = Object.keys(localStorage);
    for (const key of allKeys) {
      if (!keysToKeep.includes(key)) {
        localStorage.removeItem(key);
      }
    }
  } catch (error) {
    console.warn('Erreur lors du vidage du cache:', error);
  }
}

/**
 * Labels pour l'affichage
 */
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

