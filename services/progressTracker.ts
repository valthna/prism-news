/**
 * Système de gestion de la progression du chargement
 * Permet de communiquer l'état réel de la génération à l'UI
 */

export type LoadingPhase =
    | 'init'
    | 'firecrawl_start'
    | 'firecrawl_vector'
    | 'firecrawl_complete'
    | 'gemini_start'
    | 'gemini_generating'
    | 'gemini_parsing'
    | 'image_generation'
    | 'complete';

export interface ProgressUpdate {
    phase: LoadingPhase;
    progress: number; // 0-100
    message: string;
    detail?: string;
    metadata?: {
        vectorName?: string;
        sourcesFound?: number;
        articlesGenerated?: number;
        currentModel?: string;
        imagesGenerated?: number;
    };
}

type ProgressCallback = (update: ProgressUpdate) => void;

class ProgressTracker {
    private callbacks: ProgressCallback[] = [];

    subscribe(callback: ProgressCallback): () => void {
        this.callbacks.push(callback);
        return () => {
            this.callbacks = this.callbacks.filter(cb => cb !== callback);
        };
    }

    emit(update: ProgressUpdate): void {
        this.callbacks.forEach(callback => {
            try {
                callback(update);
            } catch (error) {
                console.error('[ProgressTracker] Callback error:', error);
            }
        });
    }

    reset(): void {
        this.callbacks = [];
    }
}

export const progressTracker = new ProgressTracker();
