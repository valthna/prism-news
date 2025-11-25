/**
 * Système de gestion de la progression du chargement
 * Permet de communiquer l'état réel de la génération à l'UI
 * 
 * DURÉES ESTIMÉES (basées sur les timeouts réels):
 * - Init: ~2s
 * - Firecrawl (si actif): ~30-60s
 * - Gemini génération: 180-300s (3-5 min) ← PHASE LONGUE
 * - Parsing: ~2-3s
 * - Images (si actif): ~30-60s
 * - Complete: ~1s
 */

export type LoadingPhase =
    | 'init'
    | 'firecrawl_start'
    | 'firecrawl_vector'
    | 'firecrawl_complete'
    | 'gemini_start'
    | 'gemini_generating'
    | 'gemini_thinking'    // Sous-phase pour le "thinking" de Gemini
    | 'gemini_parsing'
    | 'image_generation'
    | 'complete';

/**
 * Configuration des phases avec durées estimées (en ms) et pourcentages
 * Ces valeurs permettent à l'UI de calculer une progression réaliste
 */
export const PHASE_CONFIG: Record<LoadingPhase, {
    startPercent: number;
    endPercent: number;
    estimatedDurationMs: number;
    label: string;
}> = {
    init: {
        startPercent: 0,
        endPercent: 5,
        estimatedDurationMs: 2000,
        label: 'Initialisation Système'
    },
    firecrawl_start: {
        startPercent: 5,
        endPercent: 10,
        estimatedDurationMs: 3000,
        label: 'Scan Sources Mondiales'
    },
    firecrawl_vector: {
        startPercent: 10,
        endPercent: 35,
        estimatedDurationMs: 45000,
        label: 'Scan Sources Mondiales'
    },
    firecrawl_complete: {
        startPercent: 35,
        endPercent: 40,
        estimatedDurationMs: 2000,
        label: 'Agrégation Données'
    },
    gemini_start: {
        startPercent: 40,
        endPercent: 45,
        estimatedDurationMs: 2000,
        label: 'Connexion IA'
    },
    gemini_generating: {
        startPercent: 45,
        endPercent: 75,
        estimatedDurationMs: 120000, // 2 minutes - progression lente
        label: 'Détection Biais'
    },
    gemini_thinking: {
        startPercent: 75,
        endPercent: 85,
        estimatedDurationMs: 90000, // 1.5 minutes additionnelles pour le thinking
        label: 'Analyse Approfondie'
    },
    gemini_parsing: {
        startPercent: 85,
        endPercent: 88,
        estimatedDurationMs: 3000,
        label: 'Génération Synthèse'
    },
    image_generation: {
        startPercent: 88,
        endPercent: 97,
        estimatedDurationMs: 45000,
        label: 'Création Visuels'
    },
    complete: {
        startPercent: 97,
        endPercent: 100,
        estimatedDurationMs: 1000,
        label: 'Système Prêt'
    }
};

export interface ProgressUpdate {
    phase: LoadingPhase;
    progress: number; // 0-100
    message: string;
    detail?: string;
    /** Timestamp du début de la phase actuelle */
    phaseStartTime?: number;
    /** Durée estimée restante pour la phase en cours (ms) */
    estimatedRemainingMs?: number;
    metadata?: {
        vectorName?: string;
        sourcesFound?: number;
        articlesGenerated?: number;
        currentModel?: string;
        imagesGenerated?: number;
        totalImages?: number;
        attemptNumber?: number;
        totalAttempts?: number;
    };
}

type ProgressCallback = (update: ProgressUpdate) => void;

class ProgressTracker {
    private callbacks: ProgressCallback[] = [];
    private currentPhase: LoadingPhase = 'init';
    private phaseStartTime: number = 0;
    private heartbeatInterval: ReturnType<typeof setInterval> | null = null;

    subscribe(callback: ProgressCallback): () => void {
        this.callbacks.push(callback);
        return () => {
            this.callbacks = this.callbacks.filter(cb => cb !== callback);
        };
    }

    emit(update: ProgressUpdate): void {
        // Mettre à jour le tracking de phase
        if (update.phase !== this.currentPhase) {
            this.currentPhase = update.phase;
            this.phaseStartTime = Date.now();
        }

        // Enrichir avec les infos de timing
        const enrichedUpdate: ProgressUpdate = {
            ...update,
            phaseStartTime: this.phaseStartTime,
            estimatedRemainingMs: this.getEstimatedRemaining(update.phase, update.progress)
        };

        this.callbacks.forEach(callback => {
            try {
                callback(enrichedUpdate);
            } catch (error) {
                console.error('[ProgressTracker] Callback error:', error);
            }
        });
    }

    /**
     * Démarre un heartbeat pour les phases longues (Gemini)
     * Émet des mises à jour périodiques pour montrer que le système est actif
     */
    startHeartbeat(phase: LoadingPhase, options: {
        intervalMs?: number;
        baseProgress: number;
        maxProgress: number;
        message: string;
        detail: string;
        metadata?: ProgressUpdate['metadata'];
    }): void {
        this.stopHeartbeat();
        
        const { intervalMs = 5000, baseProgress, maxProgress, message, detail, metadata } = options;
        const config = PHASE_CONFIG[phase];
        const phaseDuration = config.estimatedDurationMs;
        const startTime = Date.now();

        this.heartbeatInterval = setInterval(() => {
            const elapsed = Date.now() - startTime;
            // Progression logarithmique lente - ne dépasse jamais maxProgress
            const progressRatio = Math.min(elapsed / phaseDuration, 0.95);
            const easedRatio = 1 - Math.pow(1 - progressRatio, 0.3); // Ease-out très lent
            const currentProgress = baseProgress + (maxProgress - baseProgress) * easedRatio;

            this.emit({
                phase,
                progress: Math.min(currentProgress, maxProgress),
                message,
                detail: `${detail} (${Math.round(elapsed / 1000)}s)`,
                metadata
            });
        }, intervalMs);
    }

    stopHeartbeat(): void {
        if (this.heartbeatInterval) {
            clearInterval(this.heartbeatInterval);
            this.heartbeatInterval = null;
        }
    }

    private getEstimatedRemaining(phase: LoadingPhase, currentProgress: number): number {
        const config = PHASE_CONFIG[phase];
        if (!config) return 0;

        const phaseProgress = (currentProgress - config.startPercent) / (config.endPercent - config.startPercent);
        const remaining = config.estimatedDurationMs * (1 - Math.max(0, Math.min(1, phaseProgress)));
        return Math.round(remaining);
    }

    getCurrentPhase(): LoadingPhase {
        return this.currentPhase;
    }

    reset(): void {
        this.stopHeartbeat();
        this.currentPhase = 'init';
        this.phaseStartTime = 0;
        this.callbacks = [];
    }
}

export const progressTracker = new ProgressTracker();
