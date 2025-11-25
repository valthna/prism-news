/**
 * Client Gemini unifié
 * Gère les appels LLM et génération d'images
 */

import { GoogleGenAI, HarmCategory, HarmBlockThreshold } from '@google/genai';
import { env } from '../../config';
import { GEMINI_MODELS, TIMEOUTS } from '../../config/constants';
import {
  AppError,
  QuotaExceededError,
  ServiceDisabledError,
  isRateLimitError,
  isModelNotFoundError,
  extractErrorMessage,
} from '../../core/errors';
import { withTimeout, withRetry } from '../../core/utils';
import {
  GeminiResponse,
  TextGenerationOptions,
  ImageGenerationOptions,
  isThinkingModel,
} from './types';

// ============================================================================
// CLIENT SINGLETON
// ============================================================================

let geminiClient: GoogleGenAI | null = null;

const getClient = (): GoogleGenAI => {
  if (!geminiClient) {
    const apiKey = env.geminiApiKey;
    if (!apiKey) {
      throw new ServiceDisabledError('Gemini', 'API_KEY non configurée');
    }
    geminiClient = new GoogleGenAI({ apiKey });
  }
  return geminiClient;
};

// ============================================================================
// DEFAULT SAFETY SETTINGS
// ============================================================================

const DEFAULT_SAFETY_SETTINGS = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
];

// ============================================================================
// TEXT GENERATION
// ============================================================================

/**
 * Génère du texte avec Gemini (avec fallback automatique entre modèles)
 */
export const generateText = async (
  options: TextGenerationOptions
): Promise<{ text: string; model: string; response: GeminiResponse }> => {
  const { prompt, config = {}, timeoutMs } = options;
  const models = options.model ? [options.model] : GEMINI_MODELS.LLM;

  let lastError: unknown;

  for (const modelName of models) {
    const modelTimeoutMs = timeoutMs ??
      (isThinkingModel(modelName) ? TIMEOUTS.GEMINI_THINKING_MS : TIMEOUTS.GEMINI_STANDARD_MS);

    try {
      console.log(`[Gemini] Tentative avec ${modelName}...`);

      const generationConfig: any = {
        temperature: config.temperature ?? 0.3,
        safetySettings: config.safetySettings ?? DEFAULT_SAFETY_SETTINGS,
        ...config,
      };

      // Configuration thinking pour Gemini 3
      if (isThinkingModel(modelName) && !generationConfig.thinkingConfig) {
        generationConfig.thinkingConfig = { thinkingLevel: 'MEDIUM' };
      }

      const response = await withTimeout(
        getClient().models.generateContent({
          model: modelName,
          contents: prompt,
          config: generationConfig,
        }),
        modelTimeoutMs,
        () => console.warn(`[Gemini] Timeout pour ${modelName}`)
      ) as any;

      const textResponse = typeof response.text === 'function'
        ? response.text()
        : response.text;

      if (!textResponse) {
        throw new AppError('PARSE_ERROR', 'Réponse vide de Gemini');
      }

      console.log(`[Gemini] Succès avec ${modelName}`);

      return {
        text: textResponse,
        model: modelName,
        response: response as GeminiResponse,
      };

    } catch (error) {
      lastError = error;

      // Model not found → essayer le suivant
      if (isModelNotFoundError(error)) {
        console.warn(`[Gemini] Modèle ${modelName} non trouvé, essai suivant...`);
        continue;
      }

      // Quota exceeded → essayer le suivant (quotas souvent séparés par modèle)
      if (isRateLimitError(error)) {
        console.warn(`[Gemini] Quota dépassé pour ${modelName}, essai suivant...`);
        continue;
      }

      // Autre erreur → remonter
      throw error;
    }
  }

  // Tous les modèles ont échoué
  if (isRateLimitError(lastError)) {
    throw new QuotaExceededError(
      'Tous les modèles Gemini ont atteint leur quota',
      { service: 'gemini' }
    );
  }

  throw lastError ?? new AppError('UNKNOWN_ERROR', 'Tous les modèles Gemini ont échoué');
};

// ============================================================================
// IMAGE GENERATION
// ============================================================================

/**
 * Génère une image avec Gemini (avec fallback automatique entre modèles)
 */
export const generateImage = async (
  options: ImageGenerationOptions
): Promise<{ dataUrl: string; model: string }> => {
  const {
    prompt,
    aspectRatio = '3:4',
    highResolution = true,
    timeoutMs = TIMEOUTS.GEMINI_STANDARD_MS,
  } = options;

  const models = options.model ? [options.model] : GEMINI_MODELS.IMAGE;
  let lastError: unknown;

  for (const modelName of models) {
    try {
      console.log(`[Gemini Image] Tentative avec ${modelName}...`);

      const isFlashFamily = modelName.includes('flash');
      const generationConfig: any = {
        responseModalities: isFlashFamily ? ['IMAGE', 'TEXT'] : ['IMAGE'],
        temperature: 0.9,
        imageConfig: {
          aspectRatio,
        },
      };

      // Haute résolution uniquement pour Gemini 3 Pro Image Preview
      if (modelName === 'gemini-3-pro-image-preview' && highResolution) {
        generationConfig.imageConfig.imageSize = '4K';
      }

      const response = await withTimeout(
        getClient().models.generateContent({
          model: modelName,
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          config: generationConfig,
        }),
        timeoutMs
      );

      // Extraire l'image de la réponse
      const candidates = response.candidates;
      if (candidates?.[0]?.content?.parts) {
        for (const part of candidates[0].content.parts) {
          // Format inline_data
          if (part.inlineData?.data) {
            const mimeType = part.inlineData.mimeType || 'image/png';
            console.log(`[Gemini Image] Image générée avec ${modelName}`);
            return {
              dataUrl: `data:${mimeType};base64,${part.inlineData.data}`,
              model: modelName,
            };
          }

          // Format alternatif inline-data
          const altPart = part as any;
          if (altPart?.inline_data?.data) {
            const mimeType = altPart.inline_data.mime_type || 'image/png';
            console.log(`[Gemini Image] Image générée avec ${modelName}`);
            return {
              dataUrl: `data:${mimeType};base64,${altPart.inline_data.data}`,
              model: modelName,
            };
          }
        }
      }

      throw new AppError('PARSE_ERROR', `Pas de données image dans la réponse de ${modelName}`);

    } catch (error) {
      lastError = error;
      const errorMsg = extractErrorMessage(error);

      // Model not found ou quota → essayer le suivant
      if (isModelNotFoundError(error) || isRateLimitError(error)) {
        console.warn(`[Gemini Image] ${modelName} indisponible, essai suivant...`);
        continue;
      }

      // Media resolution disabled → retry sans haute résolution
      if (/media resolution is not enabled/i.test(errorMsg)) {
        console.warn(`[Gemini Image] Haute résolution non supportée, retry en standard...`);
        return generateImage({ ...options, highResolution: false });
      }

      throw error;
    }
  }

  // Tous les modèles ont échoué
  if (isRateLimitError(lastError)) {
    throw new QuotaExceededError(
      'Tous les modèles Gemini Image ont atteint leur quota',
      { service: 'gemini_image' }
    );
  }

  throw lastError ?? new AppError('UNKNOWN_ERROR', 'Génération d\'image impossible');
};

// ============================================================================
// CONVENIENCE EXPORTS
// ============================================================================

export const isGeminiConfigured = (): boolean => env.isGeminiConfigured;

