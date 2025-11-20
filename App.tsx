
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { NewsArticle } from './types';
import { fetchNewsArticles } from './services/geminiService';
import NewsCard from './components/NewsCard';
import Chatbot from './components/Chatbot';
import ProgressBar from './components/ProgressBar';
import SettingsModal from './components/SettingsModal';
import SearchOverlay from './components/SearchOverlay';
import { SettingsIcon } from './components/icons/SettingsIcon';
import { SearchIcon } from './components/icons/SearchIcon';
import { ShareIcon } from './components/icons/ShareIcon';
import HideInterfaceButton from './components/HideInterfaceButton';

// --- PRODUCTION GRADE LOADING SCREEN WITH VORTEX ---

const LoadingScreen: React.FC<{ status: string, count: number }> = ({ status, count }) => {
    // Create random particles for vortex effect
    const particles = useMemo(() => {
        const types = ['article', 'video', 'image', 'audio', 'data', 'news'];
        return Array.from({ length: 40 }).map((_, i) => {
            const angle = (i / 40) * 2 * Math.PI;
            const distance = 60 + Math.random() * 40; // Start further out
            return {
                id: i,
                type: types[Math.floor(Math.random() * types.length)],
                initialX: Math.cos(angle) * distance,
                initialY: Math.sin(angle) * distance,
                delay: Math.random() * 2,
                duration: 3 + Math.random() * 2,
                rotation: Math.random() * 360,
                scale: 0.8 + Math.random() * 0.4,
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

            <div className="z-10 flex flex-col items-center w-full max-w-xs space-y-20 relative">

                {/* Vortex Animation Container */}
                <div className="relative w-48 h-48 flex items-center justify-center perspective-[1000px]">
                    {/* Central Core (Singularity) */}
                    <div className="absolute z-30 w-14 h-14 rounded-full bg-black border border-white/30 flex items-center justify-center shadow-[0_0_60px_rgba(50,173,230,0.3)] animate-pulse ring-1 ring-white/10">
                        <div className="w-3 h-3 bg-white rounded-full shadow-[0_0_25px_rgba(255,255,255,1)] animate-ping opacity-75"></div>
                        <div className="absolute inset-0 rounded-full border border-white/10 animate-spin-slow"></div>
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
                            <div className="transform -translate-x-1/2 -translate-y-1/2">
                                {getParticleContent(p.type)}
                            </div>
                        </div>
                    ))}
                </div>

                <div className="flex flex-col items-center space-y-3 text-center relative z-30 px-8">
                    <h1
                        className="text-7xl font-black tracking-tighter italic chromatic-aberration"
                        data-text="PRISM"
                    >
                        PRISM
                    </h1>
                    <div className="h-px w-24 bg-gradient-to-r from-transparent via-white/50 to-transparent"></div>
                </div>

                <div className="w-full space-y-3 max-w-[200px]">
                    <div className="flex justify-between text-[9px] font-mono text-gray-400 uppercase tracking-widest">
                        <span className="animate-pulse text-neon-accent">{status}</span>
                        <span>{percentage}%</span>
                    </div>
                    <div className="w-full h-[2px] bg-white/10 rounded-full overflow-hidden">
                        <div
                            className="h-full bg-gradient-to-r from-neon-accent/50 via-white to-neon-accent/50 shadow-[0_0_15px_rgba(255,255,255,0.8)] transition-all duration-300"
                            style={{ width: `${percentage}%` }}
                        ></div>
                    </div>
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
    console.log("App loaded - Version 1.0");
    const [articles, setArticles] = useState<NewsArticle[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [activeArticleIndex, setActiveArticleIndex] = useState<number>(0);
    const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
    const [isSettingsOpen, setIsSettingsOpen] = useState<boolean>(false);
    const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
    const [currentCategory, setCurrentCategory] = useState<string>("Général");
    const [isInterfaceHidden, setIsInterfaceHidden] = useState<boolean>(false);

    // Loading State
    const [loadingStatus, setLoadingStatus] = useState("Initialisation");
    const [processedCount, setProcessedCount] = useState(0);

    const getArticles = useCallback(async (query?: string, category?: string) => {
        try {
            setLoading(true);
            setError(null);
            setArticles([]); // Clear previous articles to show loading screen properly

            const statusInterval = setInterval(() => {
                setProcessedCount(p => {
                    if (p >= 2400) return 2400;
                    return p + Math.floor(Math.random() * 50);
                });
                const steps = ["Scan Sources Mondiales", "Agrégation Données", "Détection Biais", "Génération Synthèse"];
                setLoadingStatus(prev => {
                    if (Math.random() > 0.95) return steps[Math.floor(Math.random() * steps.length)];
                    return prev;
                });
            }, 100);

            const fetchedArticles = await fetchNewsArticles(query, category);

            clearInterval(statusInterval);
            setLoadingStatus("Système Prêt");
            setProcessedCount(2500);

            setTimeout(() => {
                setArticles(fetchedArticles);
                setLoading(false);
            }, 800);

        } catch (err) {
            console.error(err);
            if (err instanceof Error) {
                setError(err.message);
            } else {
                setError('Erreur système inconnue.');
            }
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        getArticles();
    }, [getArticles]);

    const handleSearch = (query: string, category: string) => {
        setCurrentCategory(category);
        getArticles(query, category);
    };

    const handleArticleVisible = useCallback((articleId: string) => {
        const index = articles.findIndex(a => a.id === articleId);
        if (index !== -1) {
            setActiveArticleIndex(index);
        }
    }, [articles]);

    const handleShare = async () => {
        if (!activeArticle) return;

        const shareData = {
            title: activeArticle.headline,
            text: `${activeArticle.headline}\n\n${activeArticle.summary}\n\nvia PRISM AI News`,
            url: window.location.href
        };

        try {
            if (navigator.share) {
                await navigator.share(shareData);
            } else {
                await navigator.clipboard.writeText(`${shareData.title}\n${shareData.text}`);
                // Could add a toast here
            }
        } catch (err) {
            console.error('Error sharing:', err);
        }
    };

    const activeArticle = useMemo(() => articles[activeArticleIndex] || null, [articles, activeArticleIndex]);
    const scrollProgress = articles.length > 0 ? (activeArticleIndex + 1) / articles.length : 0;

    if (loading) return <LoadingScreen status={loadingStatus} count={processedCount} />;
    if (error) return <ErrorScreen message={error} />;

    return (
        <div className="fixed inset-0 bg-black text-white overflow-hidden font-sans selection:bg-neon-accent selection:text-black">
            <ProgressBar progress={scrollProgress} />

            {/* BRANDING HEADER - COMPACT & REMOVED TOP SPACE */}
            <div className="absolute top-0 left-0 w-full px-6 pt-4 pb-1 z-50 pointer-events-none flex justify-between items-center bg-gradient-to-b from-black/90 via-black/60 to-transparent h-16">
                <div className="flex flex-col justify-center h-full">
                    <div className="relative">
                        <span
                            className="font-black italic text-2xl tracking-tighter leading-none drop-shadow-lg chromatic-aberration relative z-10 block"
                            data-text="PRISM"
                        >
                            PRISM
                        </span>
                    </div>
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
                        className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center hover:bg-white/20 transition-colors group shadow-lg"
                    >
                        <SearchIcon className="w-4 h-4 text-gray-300 group-hover:text-white transition-colors" />
                    </button>
                    <button
                        onClick={() => setIsSettingsOpen(true)}
                        className="w-8 h-8 rounded-full bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center hover:bg-white/20 transition-colors group shadow-lg"
                    >
                        <SettingsIcon className="w-4 h-4 text-gray-300 group-hover:text-white transition-colors group-hover:rotate-90 duration-500" />
                    </button>
                </div>
            </div>

            <main className="h-full w-full overflow-y-scroll snap-y snap-mandatory scroll-smooth no-scrollbar" style={{ scrollBehavior: 'smooth' }}>
                {articles.map((article) => (
                    <NewsCard
                        key={article.id}
                        article={article}
                        onVisible={handleArticleVisible}
                        onChatOpen={() => setIsChatOpen(true)}
                        isInterfaceHidden={isInterfaceHidden}
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
        </div>
    );
};

export default App;
