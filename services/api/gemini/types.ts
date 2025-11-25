/**
 * Types pour le client Gemini
 */

import { HarmCategory, HarmBlockThreshold } from '@google/genai';

// ============================================================================
// GENERATION CONFIG
// ============================================================================

export interface GeminiGenerationConfig {
  temperature?: number;
  maxOutputTokens?: number;
  topP?: number;
  topK?: number;
  tools?: Array<{ googleSearch?: {} }>;
  thinkingConfig?: {
    thinkingLevel: 'LOW' | 'MEDIUM' | 'HIGH';
  };
  safetySettings?: Array<{
    category: HarmCategory;
    threshold: HarmBlockThreshold;
  }>;
}

export interface ImageGenerationConfig {
  responseModalities: string[];
  temperature?: number;
  imageConfig: {
    aspectRatio?: '1:1' | '3:4' | '4:3' | '9:16' | '16:9';
    imageSize?: '4K';
  };
}

// ============================================================================
// RESPONSE TYPES
// ============================================================================

export interface GeminiUsageMetadata {
  promptTokenCount?: number;
  inputTokenCount?: number;
  candidatesTokenCount?: number;
  outputTokenCount?: number;
  totalTokenCount?: number;
}

export interface GeminiResponse {
  text?: string | (() => string);
  candidates?: Array<{
    content?: {
      parts?: Array<{
        text?: string;
        inlineData?: {
          data: string;
          mimeType?: string;
        };
      }>;
    };
  }>;
  usageMetadata?: GeminiUsageMetadata;
}

// ============================================================================
// REQUEST OPTIONS
// ============================================================================

export interface TextGenerationOptions {
  prompt: string;
  model?: string;
  config?: GeminiGenerationConfig;
  timeoutMs?: number;
}

export interface ImageGenerationOptions {
  prompt: string;
  aspectRatio?: '1:1' | '3:4' | '4:3' | '9:16' | '16:9';
  model?: string;
  highResolution?: boolean;
  timeoutMs?: number;
}

// ============================================================================
// MODEL INFO
// ============================================================================

export type GeminiModelFamily = 'pro' | 'flash' | 'flash-lite';

export const getModelFamily = (modelName: string): GeminiModelFamily => {
  const lower = modelName.toLowerCase();
  if (lower.includes('flash-lite')) return 'flash-lite';
  if (lower.includes('flash')) return 'flash';
  return 'pro';
};

export const isThinkingModel = (modelName: string): boolean =>
  modelName.toLowerCase().includes('gemini-3');

export const isImageModel = (modelName: string): boolean =>
  modelName.toLowerCase().includes('image');

