/**
 * Repository pour le stockage des images
 */

import { SUPABASE } from '../config/constants';
import { getSupabaseClient, withSupabaseErrorHandling, getSupabaseUrl } from '../api/supabase';
import { dataUrlToBlob, buildBucketPublicUrl } from '../core/utils/url';
import { sanitizeFilename, generateId } from '../core/utils/text';
import { isNetworkError } from '../core/errors';

// ============================================================================
// STATE
// ============================================================================

let bucketMissing = false;
let uploadsBlocked = false;

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Retourne l'URL de base publique du bucket
 */
export const getBucketPublicUrl = (): string | null => {
  return buildBucketPublicUrl(getSupabaseUrl(), SUPABASE.IMAGE_BUCKET);
};

// ============================================================================
// UPLOAD
// ============================================================================

/**
 * Upload une image (data URL) vers Supabase Storage
 * @returns URL publique de l'image ou null en cas d'échec
 */
export const uploadImage = async (
  dataUrl: string,
  identifier?: string
): Promise<string | null> => {
  // Early exit si le bucket est manquant ou les uploads sont bloqués
  if (bucketMissing || uploadsBlocked) {
    return null;
  }

  const result = await withSupabaseErrorHandling('image-upload', async (client) => {
    const { blob, contentType } = dataUrlToBlob(dataUrl);
    const safeId = sanitizeFilename(identifier ?? 'prism-image');
    const randomSuffix = generateId('').split('-').pop();
    const filePath = `articles/${safeId}-${randomSuffix}.png`;

    const { error: uploadError } = await client.storage
      .from(SUPABASE.IMAGE_BUCKET)
      .upload(filePath, blob, {
        cacheControl: '3600',
        upsert: true,
        contentType,
      });

    if (uploadError) {
      const message = uploadError.message || '';

      // Bucket non trouvé → désactiver les uploads
      if (/bucket not found/i.test(message)) {
        bucketMissing = true;
        console.warn('[ImageRepository] Bucket non trouvé, uploads désactivés');
      }

      // Erreur réseau → bloquer temporairement
      if (isNetworkError(uploadError)) {
        uploadsBlocked = true;
      }

      console.warn('[ImageRepository] Erreur upload:', message || uploadError);
      return null;
    }

    // Récupérer l'URL publique
    const { data } = client.storage
      .from(SUPABASE.IMAGE_BUCKET)
      .getPublicUrl(filePath);

    console.log('[ImageRepository] Image uploadée:', filePath);
    return data?.publicUrl ?? null;
  });

  return result ?? null;
};

/**
 * Supprime une image du storage
 */
export const deleteImage = async (storagePath: string): Promise<boolean> => {
  const result = await withSupabaseErrorHandling('image-delete', async (client) => {
    const { error } = await client.storage
      .from(SUPABASE.IMAGE_BUCKET)
      .remove([storagePath]);

    if (error) {
      console.warn('[ImageRepository] Erreur suppression:', error);
      return false;
    }

    return true;
  });

  return result ?? false;
};

/**
 * Supprime plusieurs images du storage
 */
export const deleteImages = async (storagePaths: string[]): Promise<number> => {
  if (storagePaths.length === 0) return 0;

  const result = await withSupabaseErrorHandling('images-delete', async (client) => {
    const uniquePaths = Array.from(new Set(storagePaths));

    const { error } = await client.storage
      .from(SUPABASE.IMAGE_BUCKET)
      .remove(uniquePaths);

    if (error) {
      console.warn('[ImageRepository] Erreur suppression batch:', error);
      return 0;
    }

    return uniquePaths.length;
  });

  return result ?? 0;
};

// ============================================================================
// STATUS
// ============================================================================

/**
 * Vérifie si les uploads sont disponibles
 */
export const isUploadAvailable = (): boolean => {
  return !bucketMissing && !uploadsBlocked;
};

/**
 * Réactive les uploads (pour les tests)
 */
export const resetUploadState = (): void => {
  bucketMissing = false;
  uploadsBlocked = false;
};

