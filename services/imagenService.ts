import { GoogleGenAI } from "@google/genai";
import { supabase } from './supabaseClient';

export const SUPABASE_IMAGE_BUCKET = 'news-images';

interface ImageGenerationOptions {
    prompt: string;
    aspectRatio?: "1:1" | "3:4" | "4:3" | "9:16" | "16:9";
    id?: string;
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

const uploadImageToSupabase = async (dataUrl: string, identifier?: string): Promise<string | null> => {
    if (!supabase) {
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
            console.warn("[PRISM] Échec upload Supabase:", uploadError.message);
            return null;
        }

        const { data } = supabase
            .storage
            .from(SUPABASE_IMAGE_BUCKET)
            .getPublicUrl(filePath);

        return data?.publicUrl ?? null;
    } catch (error) {
        console.warn("[PRISM] Upload Supabase impossible:", error);
        return null;
    }
};

/**
 * Service pour générer des caricatures satiriques avec Gemini 3 Pro Image Preview
 * Modèle raisonneur optimisé pour les prompts multimodaux
 */
export class ImagenService {
    private ai: GoogleGenAI;

    constructor(apiKey: string) {
        this.ai = new GoogleGenAI({ apiKey });
    }

    private async requestImage(enhancedPrompt: string, aspectRatio: ImageGenerationOptions['aspectRatio'], enableHighResolution: boolean) {
        const requestPayload: Parameters<GoogleGenAI['models']['generateContent']>[0] = {
            model: "gemini-3-pro-image-preview",
            contents: [
                {
                    role: "user",
                    parts: [{ text: enhancedPrompt }],
                },
            ],
            config: {
                responseModalities: ["IMAGE"],
            },
            tools: [{ googleSearch: {} }],
        };

        if (enableHighResolution) {
            (requestPayload.config as any).mediaResolution = "MEDIA_RESOLUTION_HIGH";
        }

        if (aspectRatio) {
            (requestPayload.config as any).imageConfig = {
                aspectRatio,
                imageSize: enableHighResolution ? "4K" : "2K",
            };
        }

        const response = await this.ai.models.generateContent(requestPayload);

        if (response.candidates && response.candidates.length > 0) {
            const parts = response.candidates[0].content.parts;
            for (const part of parts) {
                if (part.inlineData) {
                    const imageData = part.inlineData.data;
                    const dataUrl = `data:image/png;base64,${imageData}`;
                    return dataUrl;
                }
            }
        }

        throw new Error("Aucune image générée dans la réponse");
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
        } = options;

        // Enrichissement du prompt pour le style caricature
        const caricatureStylePrompt = "Premium background for a PRISM news tile inspired by iconic French newspaper caricatures (Plantu, Cabu, Wolinski, Le Canard Enchaîné).";
        const sceneDirection = "Scene direction: elegant 3:4 portrait framing, layered depth, subtle newsprint textures, generous negative space for overlay, dynamic diagonals.";
        const artDirection = "Art direction: expressive black ink linework with selective watercolor washes, bold silhouettes, witty symbolism, satirical yet respectful tone, impactful and highly critical humor, accurate likeness of public figures, intricate detailing, selective accent colors.";
        const qualityAndNegative = "Quality: ultra high resolution, crisp edges, micro-texture detailing, clean gradients, no typography, no UI elements, no logos, no photographic realism. Negative prompt: avoid 3D renders, CGI artifacts, gore, watermarks, offensive caricature tropes.";
        const enhancedPrompt = `Subject: ${prompt}. ${caricatureStylePrompt} ${sceneDirection} ${artDirection} ${qualityAndNegative}`;

        try {
            const dataUrl = await this.requestImage(enhancedPrompt, aspectRatio, true);
            const uploadedUrl = await uploadImageToSupabase(dataUrl, id ?? prompt);
            return uploadedUrl ?? dataUrl;
        } catch (error) {
            if (this.isMediaResolutionDisabledError(error)) {
                console.warn("[PRISM] Gemini ne permet pas la haute résolution sur ce modèle. Tentative avec la résolution standard.");
                const dataUrl = await this.requestImage(enhancedPrompt, aspectRatio, false);
                const uploadedUrl = await uploadImageToSupabase(dataUrl, id ?? prompt);
                return uploadedUrl ?? dataUrl;
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

// Instance singleton avec la clé API
let imagenServiceInstance: ImagenService | null = null;

const resolveApiKey = (): string | undefined => {
    const isBrowser = typeof window !== 'undefined';
    if (!isBrowser && typeof process !== 'undefined' && process.env?.API_KEY) {
        return process.env.API_KEY;
    }
    if (typeof import.meta !== 'undefined' && (import.meta as any)?.env?.VITE_API_KEY) {
        return (import.meta as any).env.VITE_API_KEY as string;
    }
    return undefined;
};

export const getImagenService = (): ImagenService => {
    if (!imagenServiceInstance) {
        const apiKey = resolveApiKey();
        if (!apiKey) {
            throw new Error("API_KEY non définie");
        }
        imagenServiceInstance = new ImagenService(apiKey);
    }
    return imagenServiceInstance;
};
