/**
 * Service de génération d'images
 * Orchestre la génération via Gemini et le stockage via Supabase
 */

import { env } from '../config';
import { generateImage, isGeminiConfigured } from '../api/gemini';
import { isSupabaseActive } from '../api/supabase';
import { uploadImage, isUploadAvailable } from '../repositories';
import { QuotaExceededError, ServiceDisabledError } from '../core/errors';
import { recordImagenUsage } from '../aiUsageLogger';

// ============================================================================
// TYPES
// ============================================================================

export interface ImageGenerationOptions {
  prompt: string;
  aspectRatio?: '1:1' | '3:4' | '4:3' | '9:16' | '16:9';
  id?: string;
  requireHostedImage?: boolean;
}

export interface ImageGenerationResult {
  imageUrl: string;
  isHosted: boolean;
  model?: string;
}

// ============================================================================
// SERVICE STATE
// ============================================================================

/**
 * Vérifie si le service d'images est activé
 */
export const isImageServiceEnabled = (): boolean => {
  return !env.disableImageGeneration && isGeminiConfigured();
};

/**
 * Vérifie si les images peuvent être hébergées
 */
export const canHostImages = (): boolean => {
  return isImageServiceEnabled() && isSupabaseActive() && isUploadAvailable();
};

// ============================================================================
// IMAGE GENERATION
// ============================================================================

/**
 * Génère une image pour un article
 */
export const generateArticleImage = async (
  options: ImageGenerationOptions
): Promise<ImageGenerationResult> => {
  const {
    prompt,
    aspectRatio = '3:4',
    id,
    requireHostedImage = false,
  } = options;

  // Vérifier que le service est activé
  if (!isImageServiceEnabled()) {
    throw new ServiceDisabledError('ImageService', 'Génération d\'images désactivée');
  }

  try {
    // Générer l'image
    const { dataUrl, model } = await generateImage({
      prompt,
      aspectRatio,
      highResolution: true,
    });

    // Logger l'utilisation
    recordImagenUsage({
      model,
      operation: 'news_tile_image',
      metadata: {
        articleId: id ?? null,
        aspectRatio,
      },
      highResolution: true,
    }).catch((err) => console.warn('[ImageService] Usage logging failed:', err));

    // Tenter l'upload si possible
    if (canHostImages()) {
      const hostedUrl = await uploadImage(dataUrl, id ?? prompt);

      if (hostedUrl) {
        console.log('[ImageService] Image générée et hébergée');
        return {
          imageUrl: hostedUrl,
          isHosted: true,
          model,
        };
      }
    }

    // Fallback: retourner le base64 si autorisé
    if (requireHostedImage) {
      throw new ServiceDisabledError('ImageService', 'Hébergement requis mais indisponible');
    }

    console.log('[ImageService] Image générée (base64 fallback)');
    return {
      imageUrl: dataUrl,
      isHosted: false,
      model,
    };

  } catch (error) {
    // Quota dépassé → retourner chaîne vide
    if (error instanceof QuotaExceededError) {
      console.warn('[ImageService] Quota dépassé, pas d\'image');
      return {
        imageUrl: '',
        isHosted: false,
      };
    }

    throw error;
  }
};

/**
 * Génère des images pour plusieurs articles
 */
export const generateArticleImages = async (
  items: Array<{ id: string; prompt: string }>,
  options: {
    delayMs?: number;
    onProgress?: (index: number, total: number) => void;
  } = {}
): Promise<Map<string, string>> => {
  const { delayMs = 2000, onProgress } = options;
  const results = new Map<string, string>();

  for (let i = 0; i < items.length; i++) {
    const item = items[i];
    onProgress?.(i, items.length);

    // Délai entre les générations (sauf pour la première)
    if (i > 0 && delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }

    try {
      const result = await generateArticleImage({
        prompt: item.prompt,
        id: item.id,
        requireHostedImage: true,
      });

      if (result.imageUrl) {
        results.set(item.id, result.imageUrl);
      }
    } catch (error) {
      console.warn(`[ImageService] Échec génération image ${item.id}:`, error);
      // Continue avec les autres images
    }
  }

  return results;
};

