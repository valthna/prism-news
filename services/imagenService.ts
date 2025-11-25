import { GoogleGenAI } from "@google/genai";
import { supabase } from './supabaseClient';
import { recordImagenUsage } from './aiUsageLogger';

export const SUPABASE_IMAGE_BUCKET = 'news-images';

type BrowserEnv = Record<string, string | boolean | undefined>;

const readBrowserEnv = (): BrowserEnv => {
    try {
        if (typeof import.meta !== 'undefined' && (import.meta as any)?.env) {
            return (import.meta as any).env as BrowserEnv;
        }
    } catch {
        // ignore
    }
    return {};
};

const pickString = (...candidates: Array<string | undefined | null>): string | undefined => {
    for (const value of candidates) {
        if (typeof value === 'string' && value.trim().length > 0) {
            return value;
        }
    }
    return undefined;
};

const browserEnv = readBrowserEnv();

interface ImageGenerationOptions {
    prompt: string;
    aspectRatio?: "1:1" | "3:4" | "4:3" | "9:16" | "16:9";
    id?: string;
    requireHostedImage?: boolean;
}

const truthyEnvValues = new Set(['1', 'true', 'yes', 'on']);

const isNetworkFailure = (error: unknown): boolean => {
    if (!error) return false;
    if (error instanceof TypeError) return true;
    const message =
        typeof error === 'string'
            ? error
            : error instanceof Error
                ? error.message
                : typeof (error as any)?.message === 'string'
                    ? (error as any).message
                    : typeof (error as any)?.details === 'string'
                        ? (error as any).details
                        : undefined;
    return typeof message === 'string' && /failed to fetch|network\s?error|TypeError/i.test(message);
};

const parseBooleanFlag = (value?: string | boolean | null): boolean => {
    if (typeof value === 'boolean') return value;
    if (typeof value === 'string') return truthyEnvValues.has(value.trim().toLowerCase());
    return false;
};

const resolveApiKey = (): string | undefined => {
    const nodeKey = (() => {
        if (typeof process === 'undefined' || !process.env) {
            return undefined;
        }
        return pickString(
            process.env.API_KEY,
            process.env.GEMINI_API_KEY,
            process.env.VITE_API_KEY
        );
    })();

    const browserKey = pickString(
        browserEnv.VITE_API_KEY as string | undefined,
        browserEnv.GEMINI_API_KEY as string | undefined,
        browserEnv.VITE_GEMINI_API_KEY as string | undefined,
        browserEnv.PUBLIC_GEMINI_API_KEY as string | undefined,
        browserEnv.API_KEY as string | undefined
    );

    return browserKey ?? nodeKey;
};

const detectImageGenerationDisabled = (): boolean => {
    // Réactivation du service d'image
    try {
        const globalFlag = (globalThis as any)?.__PRISM_DISABLE_IMAGES;
        if (parseBooleanFlag(globalFlag)) {
            return true;
        }
    } catch {
        // ignore
    }
    if (typeof process !== 'undefined') {
        if (parseBooleanFlag(process.env?.DISABLE_IMAGE_GENERATION)) return true;
        if (parseBooleanFlag(process.env?.DISABLE_IMAGEN_SERVICE)) return true;
    }
    if (parseBooleanFlag(browserEnv?.VITE_DISABLE_IMAGE_GENERATION)) return true;
    if (parseBooleanFlag(browserEnv?.VITE_DISABLE_IMAGES)) return true;
    if (parseBooleanFlag(browserEnv?.VITE_DISABLE_IMAGEN_SERVICE)) return true;
    return false;
};

const resolvedImageApiKey = resolveApiKey();
const imageServiceEnvDisabled = detectImageGenerationDisabled();
const IMAGE_SERVICE_DISABLED = imageServiceEnvDisabled || !resolvedImageApiKey;

if (IMAGE_SERVICE_DISABLED) {
    console.warn("[PRISM] Génération d'images désactivée (ajustez VITE_DISABLE_IMAGE_GENERATION ou configurez API_KEY pour la réactiver).");
}

const sanitizeFilename = (input: string) =>
    input
        .toLowerCase()
        .replace(/[^a-z0-9]+/gi, '-')
        .replace(/^-+|-+$/g, '') || 'prism-image';

const dataUrlToBlob = (dataUrl: string) => {
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

let supabaseBucketMissing = false;

let supabaseUploadsBlocked = false;

const uploadImageToSupabase = async (dataUrl: string, identifier?: string): Promise<string | null> => {
    if (!supabase || supabaseBucketMissing || supabaseUploadsBlocked) {
        return null;
    }

    try {
        const { blob, contentType } = dataUrlToBlob(dataUrl);
        const safeId = sanitizeFilename(identifier ?? 'prism-image');
        const randomSuffix = typeof crypto !== 'undefined' && 'randomUUID' in crypto
            ? crypto.randomUUID()
            : `${Date.now()}`;
        const filePath = `articles/${safeId}-${randomSuffix}.png`;

        const { error: uploadError } = await supabase
            .storage
            .from(SUPABASE_IMAGE_BUCKET)
            .upload(filePath, blob, {
                cacheControl: '3600',
                upsert: true,
                contentType,
            });

        if (uploadError) {
            const message = uploadError.message || '';
            if (/bucket not found/i.test(message)) {
                supabaseBucketMissing = true;
            }
            console.warn("[PRISM] Échec upload Supabase:", message || uploadError);
            if (isNetworkFailure(uploadError)) {
                supabaseUploadsBlocked = true;
            }
            return null;
        }

        const { data } = supabase
            .storage
            .from(SUPABASE_IMAGE_BUCKET)
            .getPublicUrl(filePath);

        return data?.publicUrl ?? null;
    } catch (error) {
        console.warn("[PRISM] Upload Supabase impossible:", error);
        if (isNetworkFailure(error)) {
            supabaseUploadsBlocked = true;
        }
        return null;
    }
};

/**
 * Service pour générer des caricatures satiriques avec Gemini 3 Pro Image Preview
 * Modèle multimodal officiel optimisé pour la génération d'images haute qualité
 *
 * Référence officielle Google AI :
 * https://ai.google.dev/gemini-api/docs/models#gemini-3-pro-image-preview
 */
export class ImagenService {
    private ai: GoogleGenAI;

    constructor(apiKey: string) {
        this.ai = new GoogleGenAI({ apiKey });
    }

    private async requestImage(enhancedPrompt: string, aspectRatio: ImageGenerationOptions['aspectRatio'], enableHighResolution: boolean, articleId?: string) {
        // Stratégie validée sur https://ai.google.dev/gemini-api/docs/models (maj 22 nov. 2025)
        // On privilégie l'aperçu Gemini 3 Pro Image puis le modèle stable Gemini 2.5 Flash Image
        const modelsToTry = [
            "gemini-3-pro-image-preview",
            "gemini-2.5-flash-image"
        ];
        
        let lastError: any = null;

        for (const modelName of modelsToTry) {
            const maxRetries = 1; // Pas de retry sur les erreurs 4xx, 1 retry max sur les 5xx
            let attempt = 0;
    
            while (attempt < maxRetries) {
                attempt++;
                
                console.log(`[ImagenService] 🎨 Starting image generation with ${modelName} (Attempt ${attempt}/${maxRetries})...`);
                if (attempt === 1) {
                    console.log('[ImagenService] Prompt:', enhancedPrompt.substring(0, 100) + '...');
                }
    
                try {
                    // Configuration adaptée selon le modèle
                    const isFlashFamily = modelName.includes('flash');
                    const generationConfig: any = {
                        responseModalities: isFlashFamily ? ["IMAGE", "TEXT"] : ["IMAGE"],
                        temperature: 0.9,
                        imageConfig: {
                            // Flash est moins strict sur le 4K, on garde la config aspectRatio
                            aspectRatio: aspectRatio || "3:4"
                        }
                    };

                    // Seul Gemini 3 Pro Image Preview expose officiellement le flag 4K
                    if (modelName === "gemini-3-pro-image-preview" && enableHighResolution) {
                        generationConfig.imageConfig.imageSize = "4K";
                    }

                    const requestPayload = {
                        model: modelName,
                        contents: [
                            {
                                role: "user",
                                parts: [
                                    { text: enhancedPrompt }
                                ]
                            }
                        ],
                        config: generationConfig
                    };
    
                    console.log(`[ImagenService] 📡 Sending request to Gemini (${modelName})...`);
                    const startTime = Date.now();
    
                    const response = await this.ai.models.generateContent(requestPayload);
    
                    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
                    console.log(`[ImagenService] ✅ Response received from ${modelName} in ${duration}s`);

                    const logUsage = () => Promise.resolve(recordImagenUsage({
                        model: modelName,
                        operation: 'news_tile_image',
                        metadata: {
                            articleId: articleId ?? null,
                            aspectRatio: aspectRatio ?? "3:4",
                            highResolution: enableHighResolution,
                        },
                        highResolution: enableHighResolution && modelName === "gemini-3-pro-image-preview",
                    })).catch(err => console.warn('[ImagenService] Usage logging failed:', err));
    
                    // Parcourir les parts pour trouver l'image
                    const candidates = response.candidates;
                    if (candidates && candidates.length > 0 && candidates[0].content && candidates[0].content.parts) {
                        const parts = candidates[0].content.parts;
    
                        for (const part of parts) {
                            // Vérifier inline_data (format base64)
                            if (part.inlineData && part.inlineData.data) {
                                console.log(`[ImagenService] 🖼️ Image data found (inline_data) via ${modelName}`);
                                const mimeType = part.inlineData.mimeType || 'image/png';
                                const data = `data:${mimeType};base64,${part.inlineData.data}`;
                                logUsage();
                                return data;
                            }
    
                            // Vérifier aussi inline_data sans underscore (variantes d'API)
                            if ((part as any).inline_data && (part as any).inline_data.data) {
                                console.log(`[ImagenService] 🖼️ Image data found (inline-data) via ${modelName}`);
                                const mimeType = (part as any).inline_data.mime_type || 'image/png';
                                const data = `data:${mimeType};base64,${(part as any).inline_data.data}`;
                                logUsage();
                                return data;
                            }
                        }
                        
                        console.warn(`[ImagenService] ⚠️ Response from ${modelName} valid but no image data found.`);
                    }
                    
                    throw new Error(`Aucune image générée par ${modelName}`);
    
                } catch (error: any) {
                    lastError = error;
                    const errorMsg = error?.message || String(error);
                    const status = error?.status || error?.code;
                    
                    console.error(`[ImagenService] 💥 ${modelName} failed (Attempt ${attempt})`);
                    
                    // Si c'est un problème de Quota (429) ou Modèle introuvable (404), on passe DIRECTEMENT au modèle suivant
                    // Inutile de retenter le même modèle qui vient de dire "Stop"
                    if (status === 429 || errorMsg.includes('quota') || status === 404 || errorMsg.includes('not found')) {
                        console.warn(`[ImagenService] 🛑 ${modelName} unavailable (Quota/Not Found). Switching to next model...`);
                        break; // Sort du while(retry) pour passer au for(model) suivant
                    }

                    // Autres erreurs techniques (500, timeout) : on peut retenter ce modèle
                    const isRetryable = status === 500 || status === 503 || errorMsg.includes('timeout');
    
                    if (attempt < maxRetries && isRetryable) {
                        const waitTime = 2000 * attempt;
                        await new Promise(resolve => setTimeout(resolve, waitTime));
                        continue;
                    }
                    
                    // Si on arrive ici, c'est un échec définitif pour ce modèle (ou non-retryable)
                    break;
                }
            }
        }

        // Si on a épuisé tous les modèles
        if (lastError) {
            const msg = lastError?.message || String(lastError);
            if (msg.includes('quota') || lastError?.status === 429) {
                console.warn("[ImagenService] 🛑 All models exhausted (Quota). Returning empty.");
                throw new Error("IMAGEN_QUOTA_EXCEEDED");
            }
            throw lastError;
        }
        
        throw new Error("Image generation failed on all available models.");
    }

    private isMediaResolutionDisabledError(error: unknown): boolean {
        if (!error) return false;
        const message = error instanceof Error ? error.message : typeof error === 'string' ? error : JSON.stringify(error);
        return /media resolution is not enabled/i.test(message || '');
    }

    /**
     * Génère une caricature satirique style presse politique
     * @param options Options de génération
     * @returns URL de l'image générée (base64 data URL)
     */
    async generateCaricature(options: ImageGenerationOptions): Promise<string> {
        const {
            prompt,
            aspectRatio = "3:4",
            id,
            requireHostedImage = false,
        } = options;

        // Le prompt est supposé être déjà enrichi via PRISM_PROMPTS.IMAGE_GENERATION.buildPrompt
        // ou contenir les instructions de style nécessaires.
        const enhancedPrompt = prompt;

        try {
            const dataUrl = await this.requestImage(enhancedPrompt, aspectRatio, true, id);

            const hostedUrl = await uploadImageToSupabase(dataUrl, id ?? prompt);
            
            if (hostedUrl) {
                console.log('[ImagenService] ✅ Image generated & uploaded to Supabase');
                return hostedUrl;
            }

            if (requireHostedImage) {
                throw new Error("IMAGEN_UPLOAD_REQUIRED");
            }

            console.log('[ImagenService] ⚠️ Upload failed/disabled, using base64 fallback');
            return dataUrl;

        } catch (error: any) {
            if (this.isMediaResolutionDisabledError(error)) {
                console.warn("[PRISM] Gemini ne permet pas la haute résolution sur ce modèle. Tentative avec la résolution standard.");
                const dataUrl = await this.requestImage(enhancedPrompt, aspectRatio, false, id);
                const hostedUrl = await uploadImageToSupabase(dataUrl, id ?? prompt);
                if (hostedUrl) {
                    console.log('[ImagenService] ✅ Image generated (standard res) & uploaded to Supabase');
                    return hostedUrl;
                }
                if (requireHostedImage) {
                    throw new Error("IMAGEN_UPLOAD_REQUIRED");
                }
                console.log('[ImagenService] ✅ Image generated (standard res), using base64');
                return dataUrl;
            }
            
            // Si c'est une erreur de Quota explicite qu'on a levée plus haut
            if (error.message === "IMAGEN_QUOTA_EXCEEDED") {
                // On retourne une chaine vide ou une URL d'image par défaut
                // Le composant NewsCard gérera l'absence d'imageUrl proprement
                return ""; 
            }

            console.error("Erreur lors de la génération avec Gemini Image:", error);
            throw error;
        }
    }

    /**
     * Pré-génère toutes les images d'un article
     * @param imagePrompts Liste des prompts à générer
     * @returns Map des prompts vers leurs URLs
     */
    async batchGenerate(imagePrompts: string[]): Promise<Map<string, string>> {
        const results = new Map<string, string>();

        // Génération séquentielle pour éviter les limites de rate
        for (const prompt of imagePrompts) {
            try {
                const imageUrl = await this.generateCaricature({ prompt });
                results.set(prompt, imageUrl);
            } catch (error) {
                console.error(`Erreur pour le prompt "${prompt}":`, error);
                // Continue avec les autres images même si une échoue
            }
        }

        return results;
    }
}

type ImagenServiceAdapter = {
    generateCaricature(options: ImageGenerationOptions): Promise<string>;
    batchGenerate(imagePrompts: string[]): Promise<Map<string, string>>;
};

// Instance singleton avec la clé API
let imagenServiceInstance: ImagenServiceAdapter | null = null;

class DisabledImagenService implements ImagenServiceAdapter {
    async generateCaricature(): Promise<string> {
        throw new Error("IMAGEN_SERVICE_DISABLED");
    }
    async batchGenerate(): Promise<Map<string, string>> {
        return new Map();
    }
}

export const isImagenServiceEnabled = (): boolean => !IMAGE_SERVICE_DISABLED;

export const getImagenService = (): ImagenServiceAdapter => {
    if (!imagenServiceInstance) {
        if (IMAGE_SERVICE_DISABLED || !resolvedImageApiKey) {
            imagenServiceInstance = new DisabledImagenService();
        } else {
            imagenServiceInstance = new ImagenService(resolvedImageApiKey);
        }
    }
    return imagenServiceInstance;
};
