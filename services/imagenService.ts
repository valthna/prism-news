import { GoogleGenAI } from "@google/genai";

interface ImageGenerationOptions {
    prompt: string;
    aspectRatio?: "1:1" | "3:4" | "4:3" | "9:16" | "16:9";
}

/**
 * Service pour générer des caricatures satiriques avec Gemini 2.5 Flash Image (Nano Banana)
 * Modèle rapide et optimisé pour la génération d'images
 */
export class ImagenService {
    private ai: GoogleGenAI;

    constructor(apiKey: string) {
        this.ai = new GoogleGenAI({ apiKey });
    }

    /**
     * Génère une caricature satirique style presse politique
     * @param options Options de génération
     * @returns URL de l'image générée (base64 data URL)
     */
    async generateCaricature(options: ImageGenerationOptions): Promise<string> {
        const {
            prompt,
            aspectRatio = "16:9",
        } = options;

        // Enrichissement du prompt pour le style caricature
        const caricatureStylePrompt = "Political satire cartoon in the style of French press illustrators (Plantu, Cabu, Wolinski). Black ink drawing, editorial cartoon, satirical illustration.";
        const styleDetails = "Style: bold lines, exaggerated features, minimalist, newspaper editorial style, high contrast black and white with selective color accents.";
        const enhancedPrompt = `${caricatureStylePrompt} Subject: ${prompt}. ${styleDetails}`;

        try {
            const response = await this.ai.models.generateContent({
                model: "gemini-2.5-flash-image", // Nano Banana 🍌
                contents: enhancedPrompt,
                config: {
                    responseModalities: ['Image'], // Seulement l'image, pas de texte
                    imageConfig: {
                        aspectRatio,
                    },
                },
            });

            // Extraire l'image de la réponse
            if (response.candidates && response.candidates.length > 0) {
                const parts = response.candidates[0].content.parts;
                for (const part of parts) {
                    if (part.inlineData) {
                        const imageData = part.inlineData.data;
                        // Convertir en data URL utilisable dans le DOM
                        return `data:image/png;base64,${imageData}`;
                    }
                }
            }

            throw new Error("Aucune image générée dans la réponse");
        } catch (error) {
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

export const getImagenService = (): ImagenService => {
    if (!imagenServiceInstance) {
        const apiKey = process.env.API_KEY;
        if (!apiKey) {
            throw new Error("API_KEY non définie");
        }
        imagenServiceInstance = new ImagenService(apiKey);
    }
    return imagenServiceInstance;
};
