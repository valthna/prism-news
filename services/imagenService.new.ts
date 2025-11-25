/**
 * LEGACY COMPATIBILITY WRAPPER
 *
 * Ce fichier maintient la rétrocompatibilité avec l'ancien imagenService.
 * Pour les nouveaux développements, utilisez directement les services de l'architecture refactorisée.
 *
 * Mapping:
 * - ImagenService → services/application/ImageService.ts
 * - getImagenService → services/application/ImageService.ts
 * - isImagenServiceEnabled → services/application/ImageService.ts
 */

import { generateArticleImage, isImageServiceEnabled, ImageGenerationOptions } from './application/ImageService';

export const SUPABASE_IMAGE_BUCKET = 'news-images';

export const isImagenServiceEnabled = isImageServiceEnabled;

// Legacy class wrapper
export class ImagenService {
  async generateCaricature(options: ImageGenerationOptions): Promise<string> {
    const result = await generateArticleImage(options);
    return result.imageUrl;
  }

  async batchGenerate(imagePrompts: string[]): Promise<Map<string, string>> {
    const results = new Map<string, string>();
    for (const prompt of imagePrompts) {
      try {
        const result = await generateArticleImage({ prompt });
        if (result.imageUrl) {
          results.set(prompt, result.imageUrl);
        }
      } catch (error) {
        console.warn(`[ImagenService Legacy] Erreur pour prompt:`, error);
      }
    }
    return results;
  }
}

let instance: ImagenService | null = null;

export const getImagenService = () => {
  if (!instance) {
    instance = new ImagenService();
  }
  return instance;
};

console.log('[PRISM] imagenService.ts is deprecated. Use services/application/ImageService.ts instead.');

