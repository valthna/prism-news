/**
 * Utilitaires pour la construction d'URLs
 */

import { API_ENDPOINTS } from '../../config';

/**
 * Crée une URL de logo via Google Favicons
 */
export const createLogoUrl = (rawName: string): string => {
  const normalized = rawName.toLowerCase().replace(/\s+/g, '');
  if (!normalized) {
    return `${API_ENDPOINTS.GOOGLE_FAVICON}?domain=reuters.com&sz=128`;
  }
  const domain = normalized.includes('.') ? normalized : `${normalized}.com`;
  return `${API_ENDPOINTS.GOOGLE_FAVICON}?domain=${domain}&sz=128`;
};

/**
 * Crée une URL de recherche Google
 */
export const createGoogleSearchUrl = (headline: string, sourceName: string): string =>
  `${API_ENDPOINTS.GOOGLE_SEARCH}?q=${encodeURIComponent(`${headline} ${sourceName}`)}`;

/**
 * Construit l'URL publique d'un bucket Supabase
 */
export const buildBucketPublicUrl = (
  supabaseUrl: string | undefined,
  bucketName: string
): string | null => {
  if (!supabaseUrl) return null;
  return `${supabaseUrl}/storage/v1/object/public/${bucketName}/`;
};

/**
 * Extrait le chemin de stockage depuis une URL publique Supabase
 */
export const getStoragePathFromUrl = (
  imageUrl: string | undefined | null,
  bucketPublicBaseUrl: string | null
): string | null => {
  if (!imageUrl || !bucketPublicBaseUrl) {
    return null;
  }
  if (!imageUrl.startsWith(bucketPublicBaseUrl)) {
    return null;
  }
  const withoutBase = imageUrl.slice(bucketPublicBaseUrl.length);
  return withoutBase.split('?')[0] || null;
};

/**
 * Vérifie si une URL est une data URL (base64)
 */
export const isDataUrl = (url: string): boolean =>
  url.startsWith('data:');

/**
 * Convertit une data URL en Blob
 */
export const dataUrlToBlob = (dataUrl: string): { blob: Blob; contentType: string } => {
  const [metadata, base64] = dataUrl.split(',');
  const mimeMatch = metadata.match(/data:(.*?);base64/);
  const contentType = mimeMatch ? mimeMatch[1] : 'image/png';

  const binary =
    typeof atob === 'function'
      ? atob(base64)
      : typeof Buffer !== 'undefined'
        ? Buffer.from(base64, 'base64').toString('binary')
        : '';

  const len = binary.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binary.charCodeAt(i);
  }

  return { blob: new Blob([bytes], { type: contentType }), contentType };
};

