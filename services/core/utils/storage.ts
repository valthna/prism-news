/**
 * Utilitaires pour le localStorage
 */

/**
 * Obtient localStorage de manière safe
 */
export const getLocalStorage = (): Storage | null => {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    // Test d'accès
    window.localStorage.getItem('__test__');
    return window.localStorage;
  } catch {
    return null;
  }
};

/**
 * Lit une valeur JSON du localStorage
 */
export const readFromLocalStorage = <T>(key: string): T | null => {
  const storage = getLocalStorage();
  if (!storage) return null;

  try {
    const raw = storage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as T;
  } catch {
    return null;
  }
};

/**
 * Écrit une valeur JSON dans le localStorage
 */
export const writeToLocalStorage = <T>(key: string, value: T): boolean => {
  const storage = getLocalStorage();
  if (!storage) return false;

  try {
    storage.setItem(key, JSON.stringify(value));
    return true;
  } catch (error) {
    console.warn(`[Storage] Échec écriture localStorage pour "${key}":`, error);
    return false;
  }
};

/**
 * Supprime une clé du localStorage
 */
export const removeFromLocalStorage = (key: string): boolean => {
  const storage = getLocalStorage();
  if (!storage) return false;

  try {
    storage.removeItem(key);
    return true;
  } catch {
    return false;
  }
};

/**
 * Calcule la taille totale du localStorage en bytes
 */
export const getLocalStorageSize = (): number => {
  const storage = getLocalStorage();
  if (!storage) return 0;

  let totalSize = 0;
  try {
    for (const key of Object.keys(storage)) {
      const value = storage.getItem(key);
      if (value) {
        totalSize += key.length + value.length;
      }
    }
  } catch {
    // ignore
  }
  return totalSize;
};

/**
 * Formate une taille en bytes pour l'affichage
 */
export const formatBytes = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

