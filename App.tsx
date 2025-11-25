import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { NewsArticle } from './types';
import { fetchNewsArticles } from './services/geminiService';
import NewsCard from './components/NewsCard';
import Chatbot from './components/Chatbot';
import ProgressBar from './components/ProgressBar';
import SettingsModal from './components/SettingsModal';
import SearchOverlay from './components/SearchOverlay';
import OnboardingModal from './components/OnboardingModal';
import { SettingsIcon } from './components/icons/SettingsIcon';
import { SearchIcon } from './components/icons/SearchIcon';
import { ShareIcon } from './components/icons/ShareIcon';
import { RefreshIcon } from './components/icons/RefreshIcon';
import HideInterfaceButton from './components/HideInterfaceButton';
import CategorySelect from './components/CategorySelect';
import { DEFAULT_CATEGORY } from './constants/categories';
import { progressTracker, type ProgressUpdate } from './services/progressTracker';
import PrismLogo from './components/PrismLogo';

const PROGRESS_CAP_BEFORE_COMPLETION = 96;
const DEFAULT_LOAD_DURATION_MS = 4500;
const LOADING_PHASES = [
    { until: 6, label: "Initialisation Système" },
    { until: 30, label: "Scan Sources Mondiales" },
    { until: 60, label: "Agrégation Données" },
    { until: 85, label: "Détection Biais" },
    { until: PROGRESS_CAP_BEFORE_COMPLETION + 1, label: "Génération Synthèse" }
];

type FetchMode = 'replace' | 'prepend';
type FetchOptions = {
    mode?: FetchMode;
    prependWith?: NewsArticle[];
    focusOnFirst?: boolean;
    forceRefresh?: boolean;
};

// --- PRODUCTION GRADE LOADING SCREEN WITH REAL-TIME PROGRESS ---

interface DetailedLoadingScreenProps {
    status: string;
    count: number;
    detail?: string;
    metadata?: {
        vectorName?: string;
        sourcesFound?: number;
        currentModel?: string;
    };
}

const LoadingScreen: React.FC<DetailedLoadingScreenProps> = ({ status, count, detail, metadata }) => {
    // Create random particles for vortex effect
    const particles = useMemo(() => {
        const types = ['article', 'video', 'image', 'audio', 'data', 'news'];
        const sizeVariants = [0.35, 0.55, 0.75, 1, 1.35, 1.7, 2.1];
        return Array.from({ length: 40 }).map((_, i) => {
            const angle = (i / 40) * 2 * Math.PI;
            const distance = 60 + Math.random() * 40; // Start further out
            const visualScale = sizeVariants[Math.floor(Math.random() * sizeVariants.length)];
            return {
                id: i,
                type: types[Math.floor(Math.random() * types.length)],
                initialX: Math.cos(angle) * distance,
                initialY: Math.sin(angle) * distance,
                delay: Math.random() * 2,
                duration: 3 + Math.random() * 2,
                rotation: Math.random() * 360,
                scale: 0.7 + Math.random() * 1.1,
                visualScale,
                color: Math.random() > 0.5 ? 'bg-blue-500' : 'bg-white'
            };
        });
    }, []);

    const percentage = Math.min(100, Math.floor((count / 2500) * 100));

    const getParticleContent = (type: string) => {
        const iconClass = "w-3 h-3 text-white/80";
        switch (type) {
            case 'video': return (
                <div className="w-8 h-6 rounded bg-red-500/20 border border-red-500/30 backdrop-blur-sm flex items-center justify-center shadow-[0_0_10px_rgba(239,68,68,0.2)]">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 text-red-400">
                        <path d="M4.5 4.5a3 3 0 00-3 3v9a3 3 0 003 3h8.25a3 3 0 003-3v-9a3 3 0 00-3-3H4.5zM19.94 18.75l-2.69-2.69V7.94l2.69-2.69c.944-.945 2.56-.276 2.56 1.06v11.38c0 1.336-1.616 2.005-2.56 1.06z" />
                    </svg>
                </div>
            );
            case 'image': return (
                <div className="w-6 h-8 rounded bg-purple-500/20 border border-purple-500/30 backdrop-blur-sm flex items-center justify-center shadow-[0_0_10px_rgba(168,85,247,0.2)]">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 text-purple-400">
                        <path fillRule="evenodd" d="M1.5 6a2.25 2.25 0 012.25-2.25h16.5A2.25 2.25 0 0122.5 6v12a2.25 2.25 0 01-2.25 2.25H3.75A2.25 2.25 0 011.5 18V6zM3 16.06V18c0 .414.336.75.75.75h16.5A.75.75 0 0021 18v-1.94l-2.69-2.689a1.5 1.5 0 00-2.12 0l-.88.879.97.97a.75.75 0 11-1.06 1.06l-5.16-5.159a1.5 1.5 0 00-2.12 0L3 16.061zm10.125-7.81a1.125 1.125 0 112.25 0 1.125 1.125 0 01-2.25 0z" clipRule="evenodd" />
                    </svg>
                </div>
            );
            case 'news': return (
                <div className="w-7 h-7 rounded-full bg-white/10 border border-white/20 backdrop-blur-sm flex items-center justify-center">
                    <span className="text-lg">📰</span>
                </div>
            );
            case 'data': return (
                <div className="w-8 h-5 rounded bg-green-500/20 border border-green-500/30 backdrop-blur-sm flex items-center justify-center">
                    <span className="text-[8px] font-mono text-green-400">1010</span>
                </div>
            );
            default: return (
                <div className="w-6 h-6 rounded bg-blue-500/20 border border-blue-500/30 backdrop-blur-sm flex items-center justify-center shadow-[0_0_10px_rgba(59,130,246,0.2)]">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 text-blue-400">
                        <path fillRule="evenodd" d="M4.125 3C3.089 3 2.25 3.84 2.25 4.875V18a3 3 0 003 3h15a3 3 0 01-3-3V4.875C17.25 3.839 16.41 3 15.375 3H4.125zM12 9.75a.75.75 0 000 1.5h1.5a.75.75 0 000-1.5H12zm-.75-2.25a.75.75 0 01.75-.75h1.5a.75.75 0 010 1.5H12a.75.75 0 01-.75-.75zM6 12.75a.75.75 0 000 1.5h7.5a.75.75 0 000-1.5H6zm-.75 3.75a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5H6a.75.75 0 01-.75-.75zM6 6.75a.75.75 0 000 1.5h3a.75.75 0 000-1.5H6z" clipRule="evenodd" />
                    </svg>
                </div>
            );
        }
    };

    return (
        <div className="fixed inset-0 bg-black z-[100] flex flex-col items-center justify-center font-sans overflow-hidden">
            {/* Ambient Background */}
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(20,20,20,1)_0%,rgba(0,0,0,1)_100%)]"></div>

            <div className="z-10 flex flex-col items-center w-full max-w-md space-y-12 relative px-8">

                {/* Vortex Animation Container */}
                <div className="relative w-48 h-48 flex items-center justify-center perspective-[1000px]">
                    {/* Central Core (Singularity) */}

                    <div className="absolute z-30 flex items-center justify-center">
                        <h1
                            className="text-5xl font-black tracking-tighter italic chromatic-aberration drop-shadow-[0_0_30px_rgba(255,255,255,0.5)]"
                            data-text="PRISM"
                        >
                            PRISM
                        </h1>
                    </div>

                    {/* Vortex Particles */}
                    {particles.map((p) => (
                        <div
                            key={p.id}
                            className="absolute z-10 flex items-center justify-center transform-gpu"
                            style={{
                                left: '50%',
                                top: '50%',
                                width: '0px', // Size controlled by child
                                height: '0px',
                                opacity: 0,
                                animation: `vortexIn ${p.duration}s cubic-bezier(0.4, 0, 0.2, 1) infinite`,
                                animationDelay: `${p.delay}s`,
                                '--start-x': `${p.initialX}vw`,
                                '--start-y': `${p.initialY}vh`,
                                '--start-rot': `${p.rotation}deg`,
                                '--scale': p.scale
                            } as React.CSSProperties}
                        >
                            <div
                                className="transform-gpu"
                                style={{ transform: `translate(-50%, -50%) scale(${p.visualScale})` }}
                            >
                                {getParticleContent(p.type)}
                            </div>
                        </div>
                    ))}
                </div>



                <div className="w-full space-y-4 max-w-[340px]">
                    {/* Status principal */}
                    <div className="flex justify-between text-[10px] font-mono text-gray-400 uppercase tracking-widest">
                        <span className="animate-pulse text-neon-accent font-bold">{status}</span>
                        <span className="font-bold">{percentage}%</span>
                    </div>

                    {/* Barre de progression */}
                    <div className="w-full h-[2px] bg-white/10 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-neon-accent/50 via-white to-neon-accent/50 shadow-[0_0_15px_rgba(255,255,255,0.8)] transition-all duration-300"
                            style={{ width: `${percentage}%` }}
                        ></div>
                    </div>

                    {/* Détail en temps réel */}
                    {detail && (
                        <div className="text-center text-xs text-gray-500 leading-relaxed animate-fade-in min-h-[2.5rem] flex items-center justify-center">
                            {detail}
                        </div>
                    )}

                    {/* Métadonnées optionnelles */}
                    {metadata && (
                        <div className="flex flex-wrap gap-2 justify-center">
                            {metadata.sourcesFound !== undefined && (
                                <div className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[9px] font-mono text-gray-400">
                                    {metadata.sourcesFound} sources
                                </div>
                            )}
                            {metadata.currentModel && (
                                <div className="px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-[9px] font-mono text-blue-400">
                                    {metadata.currentModel}
                                </div>
                            )}
                            {metadata.vectorName && (
                                <div className="px-3 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-[9px] font-mono text-purple-400">
                                    {metadata.vectorName}
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>

            <style>{`
            @keyframes vortexIn {
                0% { 
                    opacity: 0; 
                    transform: translate(var(--start-x), var(--start-y)) rotate(var(--start-rot)) scale(var(--scale));
                }
                15% {
                    opacity: 1;
                }
                100% { 
                    opacity: 0; 
                    transform: translate(0, 0) rotate(calc(var(--start-rot) + 720deg)) scale(0.05);
                }
            }
            .animate-spin-slow {
                animation: spin 10s linear infinite;
            }
            @keyframes spin {
                from { transform: rotate(0deg); }
                to { transform: rotate(360deg); }
            }
            @keyframes fade-in {
                from { opacity: 0; transform: translateY(4px); }
                to { opacity: 1; transform: translateY(0); }
            }
            .animate-fade-in {
                animation: fade-in 0.3s ease-out forwards;
            }
        `}</style>
        </div>
    );
};

const ErrorScreen: React.FC<{ message: string }> = ({ message }) => (
    <div className="h-screen w-screen bg-black flex flex-col items-center justify-center p-8 text-center z-[100]">
        <div className="w-16 h-16 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-6 animate-pulse">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 text-red-500">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
        </div>
        <h2 className="text-xl font-bold text-white mb-2">Connexion Interrompue</h2>
        <p className="text-sm text-gray-500 max-w-xs leading-relaxed mb-8">{message}</p>
        <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-white text-black rounded-full font-bold text-xs uppercase tracking-widest hover:scale-105 transition-transform"
        >
            Relancer le système
        </button>
    </div>
);


const App: React.FC = () => {
    useEffect(() => {
        console.log("App loaded - Version 1.0");
    }, []);

    const [articles, setArticles] = useState<NewsArticle[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [activeArticleIndex, setActiveArticleIndex] = useState<number>(0);
    const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
    const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
    const [currentCategory, setCurrentCategory] = useState<string>(DEFAULT_CATEGORY.value);
    const [currentQuery, setCurrentQuery] = useState<string>('');
    const [isInterfaceHidden, setIsInterfaceHidden] = useState<boolean>(false);
    const [isOnboardingOpen, setIsOnboardingOpen] = useState<boolean>(false);
    const [isSearchLoading, setIsSearchLoading] = useState<boolean>(false);
    const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

    // Loading State
    const [loadingStatus, setLoadingStatus] = useState(LOADING_PHASES[0].label);
    const [processedCount, setProcessedCount] = useState(0);
    const [loadingDetail, setLoadingDetail] = useState<string | undefined>(undefined);
    const [loadingMetadata, setLoadingMetadata] = useState<ProgressUpdate['metadata'] | undefined>(undefined);

    const progressIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const completionFrameRef = useRef<number | null>(null);
    const loadingStartRef = useRef<number | null>(null);
    const averageLoadDurationRef = useRef(DEFAULT_LOAD_DURATION_MS);
    const activeLoadDurationRef = useRef(DEFAULT_LOAD_DURATION_MS);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const loaderRunIdRef = useRef(0);

    const updateStatusByProgress = useCallback((progressPercent: number) => {
        const phase = LOADING_PHASES.find((step) => progressPercent < step.until);
        if (!phase) {
            return;
        }
        setLoadingStatus((prev) => (prev === phase.label ? prev : phase.label));
    }, []);

    const cleanupProgressTimer = useCallback(() => {
        if (progressIntervalRef.current) {
            clearInterval(progressIntervalRef.current);
            progressIntervalRef.current = null;
        }
    }, []);

    const cancelCompletionAnimation = useCallback(() => {
        if (completionFrameRef.current) {
            cancelAnimationFrame(completionFrameRef.current);
            completionFrameRef.current = null;
        }
    }, []);

    const updateProgressTowards = useCallback((targetPercent: number) => {
        setProcessedCount((prev) => {
            const prevPercent = prev / 25;
            const desired = Math.max(targetPercent, prevPercent);
            const interpolated = prevPercent + (desired - prevPercent) * 0.2;
            const nextPercent = Math.min(PROGRESS_CAP_BEFORE_COMPLETION, interpolated);
            updateStatusByProgress(nextPercent);
            return Math.round(nextPercent * 25);
        });
    }, [updateStatusByProgress]);

    // Subscribe to real-time progress updates for DETAILS only
    useEffect(() => {
        const unsubscribe = progressTracker.subscribe((update: ProgressUpdate) => {
            console.log('[App] Progress detail update:', update);

            if (update.detail) {
                setLoadingDetail(update.detail);
            }
            if (update.metadata) {
                setLoadingMetadata(update.metadata);
            }
            // Update progress bar if value provided
            if (update.progress > 0) {
                updateProgressTowards(update.progress);
            }
        });

        return () => {
            unsubscribe();
        };
    }, [updateProgressTowards]);

    const startLoadingProgress = useCallback(() => {
        cancelCompletionAnimation();
        loadingStartRef.current = performance.now();
        activeLoadDurationRef.current = averageLoadDurationRef.current;
        setProcessedCount(0);
        updateStatusByProgress(0);
        cleanupProgressTimer();
        progressIntervalRef.current = setInterval(() => {
            if (!loadingStartRef.current) {
                return;
            }
            const elapsed = performance.now() - loadingStartRef.current;
            let expected = activeLoadDurationRef.current;
            if (elapsed > expected * 0.9) {
                expected = elapsed / 0.9;
                activeLoadDurationRef.current = expected;
            }
            const progressRatio = Math.min(elapsed / expected, 1);
            const target = progressRatio * PROGRESS_CAP_BEFORE_COMPLETION;
            updateProgressTowards(target);
        }, 120);
    }, [cancelCompletionAnimation, cleanupProgressTimer, updateProgressTowards, updateStatusByProgress]);

    const animateCompletion = useCallback(() => {
        cleanupProgressTimer();
        cancelCompletionAnimation();
        loadingStartRef.current = null;
        setLoadingStatus("Système Prêt");
        const step = () => {
            let keepGoing = false;
            setProcessedCount((prev) => {
                const prevPercent = prev / 25;
                if (prevPercent >= 100) {
                    return 2500;
                }
                const nextPercent = prevPercent + Math.max(1, (100 - prevPercent) * 0.35);
                keepGoing = nextPercent < 99.5;
                return Math.round(Math.min(nextPercent, 100) * 25);
            });
            if (keepGoing) {
                completionFrameRef.current = requestAnimationFrame(step);
            } else {
                completionFrameRef.current = null;
            }
        };
        step();
    }, [cancelCompletionAnimation, cleanupProgressTimer]);

    useEffect(() => {
        return () => {
            cleanupProgressTimer();
            cancelCompletionAnimation();
        };
    }, [cleanupProgressTimer, cancelCompletionAnimation]);

    const scrollToTop = useCallback(() => {
        if (scrollContainerRef.current) {
            scrollContainerRef.current.scrollTo({ top: 0, behavior: 'smooth' });
        } else {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
    }, []);

    const getArticles = useCallback(async (query?: string, category?: string, options: FetchOptions = {}) => {
        const mode = options.mode ?? 'replace';
        const replaceExisting = mode === 'replace';
        const loaderRunId = ++loaderRunIdRef.current;
        const logPrefix = `[PRISM][Loader#${loaderRunId}]`;

        console.info(`${logPrefix} → start`, {
            query: query ?? 'default',
            category: category ?? 'Général',
            mode,
            prependCount: options.prependWith?.length ?? 0
        });

        const mergeWithExisting = (incoming: NewsArticle[]): NewsArticle[] => {
            if (options.prependWith && options.prependWith.length > 0) {
                const existingIds = new Set(incoming.map(article => article.id));
                const preserved = options.prependWith.filter(article => !existingIds.has(article.id));
                return [...incoming, ...preserved];
            }
            return incoming;
        };
        try {
            if (replaceExisting) {
                setLoading(true);
                setError(null);
                setArticles([]); // Clear previous articles to show loading screen properly
                startLoadingProgress();
                console.info(`${logPrefix} → loading UI engaged`);
            }

            console.info(`${logPrefix} → calling fetchNewsArticles...`, { query, category });
            let fetchedArticles: NewsArticle[];
            try {
                fetchedArticles = await fetchNewsArticles(query, category, options.forceRefresh);
                console.info(`${logPrefix} → fetch resolved`, { articleCount: fetchedArticles.length });
            } catch (fetchError) {
                console.error(`${logPrefix} → fetchNewsArticles FAILED:`, fetchError);
                throw fetchError;
            }

            if (replaceExisting) {
                if (loadingStartRef.current) {
                    const elapsed = performance.now() - loadingStartRef.current;
                    const safeElapsed = Math.max(elapsed, 800);
                    averageLoadDurationRef.current = (averageLoadDurationRef.current * 0.6) + (safeElapsed * 0.4);
                }

                const preparedArticles = mergeWithExisting(fetchedArticles);
                const strategicFallback = preparedArticles.every(article => typeof article.id === 'string' && article.id.startsWith('strategic-'));
                if (strategicFallback) {
                    console.warn(`${logPrefix} → strategic fallback detected`);
                }

                console.info(`${logPrefix} → animate completion`);
                animateCompletion();

                setTimeout(() => {
                    if (loaderRunIdRef.current !== loaderRunId) {
                        console.warn(`${logPrefix} ✕ hydration skipped (superseded by run #${loaderRunIdRef.current})`);
                        return;
                    }
                    console.info(`${logPrefix} → applying ${preparedArticles.length} articles to UI`);
                    setArticles(preparedArticles);
                    if (options.focusOnFirst) {
                        setActiveArticleIndex(0);
                        scrollToTop();
                    }
                    setLoading(false);
                    console.info(`${logPrefix} ✓ UI ready`);
                }, 400);
            } else {
                const searchBatch = fetchedArticles.slice(0, 5);
                setArticles((previous) => {
                    const existingIds = new Set(previous.map((article) => article.id));
                    const uniqueArticles = searchBatch.filter((article) => !existingIds.has(article.id));
                    if (uniqueArticles.length === 0) {
                        return previous;
                    }
                    return [...uniqueArticles, ...previous];
                });
            }

        } catch (err) {
            console.error(`${logPrefix} ✕ failed`, err);
            if (replaceExisting) {
                cleanupProgressTimer();
                cancelCompletionAnimation();
                loadingStartRef.current = null;
                setProcessedCount(0);
                if (err instanceof Error) {
                    setError(err.message);
                } else {
                    setError('Erreur système inconnue.');
                }
                setLoading(false);
                console.info(`${logPrefix} ✕ UI reset after failure`);
            }
        } finally {
            if (!replaceExisting) {
                console.info(`${logPrefix} → append/prepend flow finished`);
            }
        }
    }, [startLoadingProgress, animateCompletion, cleanupProgressTimer, cancelCompletionAnimation, scrollToTop]);

    const hasFetchedRef = useRef(false);
    const pendingScrollToArticleRef = useRef<string | null>(null);

    // Détecter l'ID d'article dans l'URL au chargement
    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const articleId = urlParams.get('article');
        if (articleId) {
            pendingScrollToArticleRef.current = articleId;
        }
    }, []);

    useEffect(() => {
        if (hasFetchedRef.current) {
            return;
        }
        hasFetchedRef.current = true;
        getArticles();
    }, [getArticles]);

    // Défiler vers l'article partagé une fois les articles chargés
    useEffect(() => {
        if (!pendingScrollToArticleRef.current || articles.length === 0 || loading) {
            return;
        }

        const targetArticleId = pendingScrollToArticleRef.current;
        const targetIndex = articles.findIndex(a => a.id === targetArticleId);
        
        if (targetIndex !== -1) {
            // Attendre que le DOM soit prêt avant de défiler
            requestAnimationFrame(() => {
                if (scrollContainerRef.current) {
                    const cardHeight = window.innerHeight;
                    scrollContainerRef.current.scrollTo({
                        top: targetIndex * cardHeight,
                        behavior: 'instant'
                    });
                    setActiveArticleIndex(targetIndex);
                }
            });
            
            // Nettoyer l'URL pour éviter de défiler à nouveau lors d'un refresh
            const newUrl = new URL(window.location.href);
            newUrl.searchParams.delete('article');
            window.history.replaceState({}, '', newUrl.toString());
            
            pendingScrollToArticleRef.current = null;
        }
    }, [articles, loading]);

    const handleSearch = useCallback((query: string, category: string) => {
        const normalizedQuery = query.trim();
        if (!normalizedQuery || isSearchLoading) {
            return;
        }
        setIsSearchLoading(true);
        setCurrentQuery(normalizedQuery);
        setCurrentCategory(category);
        (async () => {
            try {
                await getArticles(normalizedQuery, category, {
                    mode: 'replace',
                    prependWith: articles,
                    focusOnFirst: true
                });
            } finally {
                setIsSearchLoading(false);
            }
        })();
    }, [getArticles, isSearchLoading, articles]);

    const handleCategoryFilterChange = useCallback((category: string) => {
        if (category === currentCategory) {
            return;
        }
        setCurrentCategory(category);
        getArticles(currentQuery || undefined, category);
    }, [currentCategory, currentQuery, getArticles]);

    const handleRefresh = useCallback(async () => {
        if (isRefreshing) return;
        setIsRefreshing(true);
        try {
            await getArticles(currentQuery || undefined, currentCategory || undefined, {
                mode: 'replace',
                focusOnFirst: true,
                forceRefresh: true
            });
        } finally {
            setIsRefreshing(false);
        }
    }, [getArticles, currentQuery, currentCategory, isRefreshing]);

    const handleArticleVisible = useCallback((articleId: string) => {
        const index = articles.findIndex(a => a.id === articleId);
        if (index !== -1) {
            setActiveArticleIndex(index);
        }
    }, [articles]);

    const handleShare = async () => {
        if (!activeArticle) return;

        // Construire l'URL avec l'ID de l'article pour un lien direct
        const shareUrl = new URL(window.location.href);
        shareUrl.searchParams.set('article', activeArticle.id);

        const shareData = {
            title: activeArticle.headline,
            text: `${activeArticle.headline}\n\n${activeArticle.summary}\n\nvia PRISM AI News`,
            url: shareUrl.toString()
        };

        try {
            if (navigator.share) {
                await navigator.share(shareData);
            } else {
                await navigator.clipboard.writeText(`${shareData.title}\n${shareData.text}\n${shareData.url}`);
                // Could add a toast here
            }
        } catch (err) {
            console.error('Error sharing:', err);
        }
    };

    const activeArticle = useMemo(() => articles[activeArticleIndex] || null, [articles, activeArticleIndex]);
    const scrollProgress = articles.length > 0 ? (activeArticleIndex + 1) / articles.length : 0;

    if (loading) return <LoadingScreen status={loadingStatus} count={processedCount} detail={loadingDetail} metadata={loadingMetadata} />;
    if (error) return <ErrorScreen message={error} />;

    const headerPaddingStyle: React.CSSProperties = {
        '--safe-area-x': '1.5rem',
        '--safe-area-top': '1rem',
        '--safe-area-bottom': '0.25rem'
    };

    return (
        <div className="fixed inset-0 bg-black text-white overflow-hidden font-sans selection:bg-neon-accent selection:text-black">
            <ProgressBar progress={scrollProgress} />

            {/* BRANDING HEADER - COMPACT & REMOVED TOP SPACE */}
            <div
                className="absolute top-0 left-0 w-full z-50 pointer-events-none flex justify-between items-center bg-gradient-to-b from-black/60 via-black/20 to-transparent h-auto min-h-16 safe-area-x safe-area-top safe-area-bottom transition-opacity duration-300"
                style={headerPaddingStyle}
            >
                <div className="pointer-events-auto flex items-center h-full gap-6">
                    <button
                        onClick={() => setIsOnboardingOpen(true)}
                        className="h-11 px-5 flex items-center justify-center rounded-full bg-[rgba(25,25,28,0.92)] hover:bg-[rgba(35,35,38,0.95)] border border-white/10 transition-all active:scale-95"
                        aria-label="À propos de PRISM"
                    >
                        <span
                            className="font-black italic text-2xl tracking-tighter leading-none drop-shadow-lg chromatic-aberration relative z-10 block"
                            data-text="PRISM"
                        >
                            PRISM
                        </span>
                    </button>
                </div>

                {/* Header Buttons (Top Right) */}
                <div className="pointer-events-auto flex items-center h-full gap-3">
                    <HideInterfaceButton
                        isHidden={isInterfaceHidden}
                        onPress={() => setIsInterfaceHidden(true)}
                        onRelease={() => setIsInterfaceHidden(false)}
                    />
                    <button
                        onClick={() => setIsSearchOpen(true)}
                        disabled={isSearchLoading}
                        className="flex items-center justify-center w-11 h-11 rounded-full bg-[rgba(25,25,28,0.92)] hover:bg-[rgba(35,35,38,0.95)] border border-white/10 transition-all active:scale-95"
                        aria-label="Rechercher"
                        aria-busy={isSearchLoading}
                    >
                        {isSearchLoading ? (
                            <svg
                                className="w-5 h-5 animate-spin text-neon-accent"
                                viewBox="0 0 24 24"
                                fill="none"
                            >
                                <circle
                                    className="opacity-25"
                                    cx="12"
                                    cy="12"
                                    r="10"
                                    stroke="currentColor"
                                    strokeWidth="4"
                                />
                                <path
                                    className="opacity-75"
                                    fill="currentColor"
                                    d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z"
                                />
                            </svg>
                        ) : (
                            <SearchIcon className="w-5 h-5 text-white/90 group-hover:text-white transition-colors" strokeWidth={2} />
                        )}
                    </button>
                    <button
                        onClick={handleRefresh}
                        disabled={isRefreshing}
                        className="flex items-center justify-center w-11 h-11 rounded-full bg-[rgba(25,25,28,0.92)] hover:bg-[rgba(35,35,38,0.95)] border border-white/10 transition-all active:scale-95"
                        aria-label="Actualiser les sujets"
                    >
                        <RefreshIcon className={`w-5 h-5 text-white/90 group-hover:text-white transition-colors ${isRefreshing ? 'animate-spin text-white' : 'group-hover:animate-spin'}`} strokeWidth={2} />
                    </button>
                    <button
                        onClick={() => setIsSettingsOpen(true)}
                        className="flex items-center justify-center w-11 h-11 rounded-full bg-[rgba(25,25,28,0.92)] hover:bg-[rgba(35,35,38,0.95)] border border-white/10 transition-all active:scale-95 group"
                        aria-label="Paramètres"
                    >
                        <SettingsIcon className="w-5 h-5 text-white/90 group-hover:text-white transition-colors group-hover:rotate-90 duration-500" strokeWidth={2} />
                    </button>
                </div>
            </div>

            <main
                ref={scrollContainerRef}
                className="h-full w-full overflow-y-scroll snap-y snap-mandatory scroll-smooth no-scrollbar"
                style={{ scrollBehavior: 'smooth' }}
            >
                {articles.map((article) => (
                    <NewsCard
                        key={article.id}
                        article={article}
                        onVisible={handleArticleVisible}
                        onChatOpen={() => setIsChatOpen(true)}
                        isInterfaceHidden={isInterfaceHidden}
                        selectedCategory={currentCategory}
                        onCategoryFilterChange={handleCategoryFilterChange}
                    />
                ))}
                {articles.length === 0 && !loading && (
                    <div className="h-screen w-full flex items-center justify-center snap-start">
                        <p className="text-gray-500 font-light text-sm uppercase tracking-widest">Aucun signal détecté</p>
                    </div>
                )}
            </main>

            {articles.length > 0 && (
                <Chatbot
                    isOpen={isChatOpen}
                    onClose={() => setIsChatOpen(false)}
                    article={activeArticle}
                />
            )}

            {isSettingsOpen && (
                <SettingsModal onClose={() => setIsSettingsOpen(false)} />
            )}

            <SearchOverlay
                isOpen={isSearchOpen}
                onClose={() => setIsSearchOpen(false)}
                onSearch={handleSearch}
                currentCategory={currentCategory}
            />

            <OnboardingModal
                isOpen={isOnboardingOpen}
                onClose={() => setIsOnboardingOpen(false)}
            />
        </div>
    );
};

export default App;
