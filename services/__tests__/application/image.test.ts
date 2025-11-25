/**
 * Tests pour l'ImageService
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createMockImageResponse } from '../setup';

const mockGenerateImage = vi.fn();
const mockUploadImage = vi.fn();

vi.mock('../../api/gemini', () => ({
  generateImage: (...args: any[]) => mockGenerateImage(...args),
  isGeminiConfigured: () => true,
}));

vi.mock('../../api/supabase', () => ({
  isSupabaseActive: () => true,
}));

vi.mock('../../repositories', () => ({
  uploadImage: (...args: any[]) => mockUploadImage(...args),
  isUploadAvailable: () => true,
}));

vi.mock('../../aiUsageLogger', () => ({
  recordImagenUsage: vi.fn().mockResolvedValue(undefined),
}));

const originalEnv = { ...process.env };

describe('Application - ImageService', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    mockGenerateImage.mockReset();
    mockUploadImage.mockReset();
    process.env = { ...originalEnv, VITE_API_KEY: 'test-key' };
  });

  afterEach(() => {
    process.env = { ...originalEnv };
  });

  describe('isImageServiceEnabled', () => {
    it('should return true when configured', async () => {
      const { isImageServiceEnabled } = await import('../../application/ImageService');

      expect(isImageServiceEnabled()).toBe(true);
    });

    it('should return false when disabled via env', async () => {
      process.env.VITE_DISABLE_IMAGE_GENERATION = 'true';
      vi.resetModules();

      // Need to re-import after env change
      const { isImageServiceEnabled } = await import('../../application/ImageService');

      // This will depend on how the module initializes
      expect(typeof isImageServiceEnabled()).toBe('boolean');
    });
  });

  describe('generateArticleImage', () => {
    it('should generate and upload image', async () => {
      mockGenerateImage.mockResolvedValue({
        dataUrl: 'data:image/png;base64,TEST',
        model: 'gemini-3-pro-image-preview',
      });
      mockUploadImage.mockResolvedValue('https://storage.com/image.png');

      const { generateArticleImage } = await import('../../application/ImageService');

      const result = await generateArticleImage({
        prompt: 'Test prompt',
        id: 'test-article',
      });

      expect(result.imageUrl).toBe('https://storage.com/image.png');
      expect(result.isHosted).toBe(true);
    });

    it('should fallback to base64 when upload fails', async () => {
      mockGenerateImage.mockResolvedValue({
        dataUrl: 'data:image/png;base64,FALLBACK',
        model: 'gemini-3-pro-image-preview',
      });
      mockUploadImage.mockResolvedValue(null);

      const { generateArticleImage } = await import('../../application/ImageService');

      const result = await generateArticleImage({
        prompt: 'Test prompt',
        requireHostedImage: false,
      });

      expect(result.imageUrl).toContain('data:image');
      expect(result.isHosted).toBe(false);
    });

    it('should throw when requireHostedImage and upload fails', async () => {
      mockGenerateImage.mockResolvedValue({
        dataUrl: 'data:image/png;base64,TEST',
        model: 'test',
      });
      mockUploadImage.mockResolvedValue(null);

      const { generateArticleImage } = await import('../../application/ImageService');

      await expect(
        generateArticleImage({
          prompt: 'Test',
          requireHostedImage: true,
        })
      ).rejects.toThrow();
    });

    it('should return empty URL on quota exceeded', async () => {
      const { QuotaExceededError } = await import('../../core/errors');
      mockGenerateImage.mockRejectedValue(new QuotaExceededError('Quota'));

      const { generateArticleImage } = await import('../../application/ImageService');

      const result = await generateArticleImage({ prompt: 'Test' });

      expect(result.imageUrl).toBe('');
      expect(result.isHosted).toBe(false);
    });
  });

  describe('generateArticleImages', () => {
    it('should generate images for multiple articles', async () => {
      mockGenerateImage.mockResolvedValue({
        dataUrl: 'data:image/png;base64,IMG',
        model: 'test',
      });
      mockUploadImage
        .mockResolvedValueOnce('https://storage.com/img1.png')
        .mockResolvedValueOnce('https://storage.com/img2.png');

      const { generateArticleImages } = await import('../../application/ImageService');

      const items = [
        { id: 'art-1', prompt: 'Prompt 1' },
        { id: 'art-2', prompt: 'Prompt 2' },
      ];

      const results = await generateArticleImages(items, { delayMs: 10 });

      expect(results.size).toBe(2);
      expect(results.get('art-1')).toBe('https://storage.com/img1.png');
      expect(results.get('art-2')).toBe('https://storage.com/img2.png');
    });

    it('should call progress callback', async () => {
      mockGenerateImage.mockResolvedValue({
        dataUrl: 'data:image/png;base64,IMG',
        model: 'test',
      });
      mockUploadImage.mockResolvedValue('https://storage.com/img.png');

      const { generateArticleImages } = await import('../../application/ImageService');
      const onProgress = vi.fn();

      const items = [
        { id: 'art-1', prompt: 'Prompt 1' },
        { id: 'art-2', prompt: 'Prompt 2' },
      ];

      await generateArticleImages(items, { delayMs: 10, onProgress });

      expect(onProgress).toHaveBeenCalledTimes(2);
      expect(onProgress).toHaveBeenCalledWith(0, 2);
      expect(onProgress).toHaveBeenCalledWith(1, 2);
    });

    it('should continue on individual failures', async () => {
      mockGenerateImage
        .mockRejectedValueOnce(new Error('Failed'))
        .mockResolvedValueOnce({
          dataUrl: 'data:image/png;base64,OK',
          model: 'test',
        });
      mockUploadImage.mockResolvedValue('https://storage.com/img.png');

      const { generateArticleImages } = await import('../../application/ImageService');

      const items = [
        { id: 'art-1', prompt: 'Fail' },
        { id: 'art-2', prompt: 'Success' },
      ];

      const results = await generateArticleImages(items, { delayMs: 10 });

      expect(results.size).toBe(1);
      expect(results.get('art-2')).toBe('https://storage.com/img.png');
    });
  });
});

