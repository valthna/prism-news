/**
 * Utilitaires de manipulation de texte
 */

/**
 * Collapse les espaces multiples en un seul et trim
 */
export const collapseWhitespace = (value?: string): string =>
  value ? value.replace(/\s+/g, ' ').trim() : '';

/**
 * Supprime les citations [cite:...] du texte
 */
export const cleanCitations = (text?: string): string => {
  if (!text) return '';
  return text.replace(/\[cite:\s*[^\]]+\]/gi, '').trim();
};

/**
 * Nettoie un nom de fichier pour le rendre safe
 */
export const sanitizeFilename = (input: string): string =>
  input
    .toLowerCase()
    .replace(/[^a-z0-9]+/gi, '-')
    .replace(/^-+|-+$/g, '') || 'prism-file';

/**
 * Extrait le domaine d'une URL
 */
export const extractDomain = (url: string): string => {
  try {
    const hostname = new URL(url).hostname;
    return hostname.replace(/^www\./, '');
  } catch {
    return url;
  }
};

/**
 * Tronque un texte à une longueur donnée
 */
export const truncate = (text: string, maxLength: number, suffix = '...'): string => {
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength - suffix.length) + suffix;
};

/**
 * Normalise un nom de source (lowercase + trim)
 */
export const normalizeSourceName = (name: string): string =>
  name.toLowerCase().trim();

/**
 * Génère un ID unique
 */
export const generateId = (prefix = 'prism'): string => {
  const timestamp = Date.now();
  const random = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID().split('-')[0]
    : Math.random().toString(36).substring(2, 10);
  return `${prefix}-${timestamp}-${random}`;
};

/**
 * Escape les caractères spéciaux pour les regex
 */
export const escapeRegex = (str: string): string =>
  str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/**
 * Parse un texte "Il y a X min/H/jour" en minutes
 */
export const parseRelativeTimeToMinutes = (publishedAt?: string): number => {
  if (!publishedAt) return Infinity;

  const text = publishedAt.toLowerCase().trim();

  // En direct = le plus récent
  if (text.includes('direct') || text.includes('live')) return 0;

  // Patterns: "il y a X min", "il y a XH", "il y a X jour(s)", "il y a X heure(s)"
  const minuteMatch = text.match(/(\d+)\s*min/);
  if (minuteMatch) return parseInt(minuteMatch[1], 10);

  const hourMatch = text.match(/(\d+)\s*h/);
  if (hourMatch) return parseInt(hourMatch[1], 10) * 60;

  const dayMatch = text.match(/(\d+)\s*jour/);
  if (dayMatch) return parseInt(dayMatch[1], 10) * 60 * 24;

  // "Récent" ou autres = assez récent
  if (text.includes('récent')) return 30;

  return Infinity;
};

