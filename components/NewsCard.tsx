import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { NewsArticle, Source, UserComment } from '../types';
import BiasAnalysisDisplay from './BiasAnalysisDisplay';
import ActionButtons from './ActionButtons';
import SourceDetailModal from './SourceDetailModal';
import SourceListModal from './SourceListModal';
import SentimentModal from './SentimentModal';
import HideInterfaceButton from './HideInterfaceButton';
import ArticleDetailModal from './ArticleDetailModal';
import { SparklesIcon } from './icons/SparklesIcon';
import { ShareIcon } from './icons/ShareIcon';
import CategorySelect from './CategorySelect';
import { CATEGORY_OPTIONS, getCategoryOption } from '../constants/categories';
import { PRISM_PROMPTS } from '../services/prompts';

const desktopHorizontalSafeArea: React.CSSProperties = {
  '--safe-area-x': 'clamp(3.5rem, 5vw, 7rem)'
};

const mobileHorizontalSafeArea: React.CSSProperties = {
  '--safe-area-x': '1.375rem'
};

const cardContentSafeArea: React.CSSProperties = {
  '--safe-area-top': 'var(--card-content-safe-area-top, clamp(4.75rem, 7vw, 6.5rem))',
  '--safe-area-bottom': 'clamp(2rem, 4vw, 3rem)'
};

const desktopGridGutter: React.CSSProperties = {
  '--desktop-column-gutter': 'clamp(2rem, 4vw, 3.75rem)'
};

const heroFrameStyle: React.CSSProperties = {
  clipPath: 'inset(0 round 24px)',
  WebkitMaskImage: 'radial-gradient(circle, #fff 99%, rgba(255,255,255,0.98) 100%)',
  backfaceVisibility: 'hidden',
  willChange: 'transform'
};

const heroMediaDimensions: React.CSSProperties = {
  width: '100%',
  maxWidth: '420px',
  height: '100%',
  maxHeight: '100%',
  minHeight: 'min(300px, 30vh)' // Plus flexible: 300px ou 30% de la hauteur si petit écran
};

interface NewsCardProps {
  article: NewsArticle;
  onVisible: (articleId: string) => void;
  onChatOpen: () => void;
  isInterfaceHidden: boolean;
  selectedCategory: string;
  onCategoryFilterChange: (category: string) => void;
  onDebateVisibilityChange?: (isOpen: boolean) => void;
}

const NewsCard: React.FC<NewsCardProps> = ({
  article,
  onVisible,
  onChatOpen,
  isInterfaceHidden,
  selectedCategory,
  onCategoryFilterChange,
  onDebateVisibilityChange
}) => {
  const [selectedSource, setSelectedSource] = useState<Source | null>(null);
  const [isSourceListOpen, setIsSourceListOpen] = useState(false);
  const [isSentimentModalOpen, setIsSentimentModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [localComments, setLocalComments] = useState<UserComment[]>(article.comments || []);
  const [isReliabilityInfoVisible, setIsReliabilityInfoVisible] = useState(false);
  const [isMobileReliabilityInfoVisible, setIsMobileReliabilityInfoVisible] = useState(false);
  const [isMobileCategoryMenuOpen, setIsMobileCategoryMenuOpen] = useState(false);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  const communityStats = useMemo(() => {
    const positive = localComments.filter(c => c.sentiment === 'positive').length;
    const negative = localComments.filter(c => c.sentiment === 'negative').length;
    return { positive, negative };
  }, [localComments]);
  const activeFilterCategory = useMemo(
    () => getCategoryOption(selectedCategory),
    [selectedCategory]
  );

  const caricatureStyle = PRISM_PROMPTS.IMAGE_GENERATION.SHORT_STYLE;
  const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(article.imagePrompt + caricatureStyle)}?width=1080&height=1440&nologo=true&model=flux-pro&enhance=true&safe=true&seed=${article.id}`;

  const initialSrc = (article.imageUrl && (article.imageUrl.startsWith('http') || article.imageUrl.startsWith('data:')))
    ? article.imageUrl
    : pollinationsUrl;
  const [imageSrc, setImageSrc] = useState<string>(initialSrc);
  const [imageLoaded, setImageLoaded] = useState(false);

  useEffect(() => {
    setImageLoaded(false);
    setImageSrc(initialSrc);
  }, [initialSrc]);

  const cardRef = useRef<HTMLDivElement>(null);
  const reliabilityInfoRef = useRef<HTMLDivElement>(null);
  const reliabilityTriggerRef = useRef<HTMLDivElement>(null);
  const mobileReliabilityInfoRef = useRef<HTMLDivElement>(null);
  const mobileReliabilityTriggerRef = useRef<HTMLDivElement>(null);
  const mobileCategoryMenuRef = useRef<HTMLDivElement>(null);
  const shareTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isIntersecting, setIsIntersecting] = useState(false);
  useEffect(() => {
    if (!isReliabilityInfoVisible) return;
    const handlePointerDown = (event: PointerEvent) => {
      const targetNode = event.target as Node;
      if (
        (reliabilityInfoRef.current && reliabilityInfoRef.current.contains(targetNode)) ||
        (reliabilityTriggerRef.current && reliabilityTriggerRef.current.contains(targetNode))
      ) {
        return;
      }
      setIsReliabilityInfoVisible(false);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [isReliabilityInfoVisible]);

  const openReliabilityInfo = () => setIsReliabilityInfoVisible(true);
  const closeReliabilityInfo = () => setIsReliabilityInfoVisible(false);
  const toggleReliabilityInfo = () => setIsReliabilityInfoVisible(prev => !prev);

  useEffect(() => {
    if (!isMobileReliabilityInfoVisible) return;
    const handlePointerDown = (event: PointerEvent) => {
      const targetNode = event.target as Node;
      if (
        (mobileReliabilityInfoRef.current && mobileReliabilityInfoRef.current.contains(targetNode)) ||
        (mobileReliabilityTriggerRef.current && mobileReliabilityTriggerRef.current.contains(targetNode))
      ) {
        return;
      }
      setIsMobileReliabilityInfoVisible(false);
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [isMobileReliabilityInfoVisible]);

  useEffect(() => {
    if (!isMobileCategoryMenuOpen) return;
    const handlePointerDown = (event: PointerEvent) => {
      const targetNode = event.target as Node;
      if (mobileCategoryMenuRef.current && mobileCategoryMenuRef.current.contains(targetNode)) {
        return;
      }
      setIsMobileCategoryMenuOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsMobileCategoryMenuOpen(false);
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isMobileCategoryMenuOpen]);

  const toggleMobileReliabilityInfo = () => setIsMobileReliabilityInfoVisible(prev => !prev);
  useEffect(() => {
    onDebateVisibilityChange?.(isSentimentModalOpen);
  }, [isSentimentModalOpen, onDebateVisibilityChange]);


  useEffect(() => {
    return () => {
      if (shareTimeoutRef.current) {
        clearTimeout(shareTimeoutRef.current);
      }
    };
  }, []);


  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
        if (entry.isIntersecting) {
          onVisible(article.id);
        }
      },
      { threshold: 0.6 }
    );
    if (cardRef.current) observer.observe(cardRef.current);
    return () => observer.disconnect();
  }, [article.id, onVisible]);

  const handleAddComment = (comment: UserComment) => {
    setLocalComments(prev => [comment, ...prev]);
  };
  const handleImageError = () => {
    if (imageSrc !== pollinationsUrl) {
      setImageSrc(pollinationsUrl);
    }
  };

  const handleShareArticle = useCallback(async () => {
    if (typeof window === 'undefined') {
      return;
    }

    const sharePayload = {
      title: article.headline,
      text: `${article.headline}\n\n${article.summary}`,
      url: window.location.href
    };

    try {
      if (typeof navigator !== 'undefined' && navigator.share) {
        await navigator.share(sharePayload);
        setShareFeedback('Lien partagé');
      } else if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(`${sharePayload.title}\n${sharePayload.text}\n${sharePayload.url}`);
        setShareFeedback('Lien copié');
      } else {
        setShareFeedback('Copiez le lien manuellement');
      }
    } catch (error) {
      console.error('Erreur pendant le partage', error);
      setShareFeedback('Partage annulé');
    } finally {
      if (shareTimeoutRef.current) {
        clearTimeout(shareTimeoutRef.current);
      }
      shareTimeoutRef.current = setTimeout(() => setShareFeedback(null), 2200);
    }
  }, [article]);

  const isLive = article.publishedAt?.toUpperCase().includes('DIRECT') || article.publishedAt?.toUpperCase().includes('LIVE');
  const displayDate = article.publishedAt || "RÉCENT";
  const reliabilityScore = Math.round(article.biasAnalysis?.reliabilityScore ?? 0);
  const categoryLabel = (article.category || 'Général').toUpperCase();
  const mobileReliabilitySlot = (
    <div
      ref={mobileReliabilityTriggerRef}
      className="relative space-y-2 text-right flex flex-col items-end lg:hidden"
    >
      <button
        type="button"
        className="flex items-center gap-2 rounded-full px-4 py-2 text-right focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 touch-target min-h-[44px]"
        aria-label="Voir le détail du modèle de calcul"
        aria-expanded={isMobileReliabilityInfoVisible}
        onClick={(event) => {
          event.stopPropagation();
          toggleMobileReliabilityInfo();
        }}
      >
        <div className="flex flex-col items-end leading-tight">
          <span className="text-[9px] font-bold uppercase tracking-[0.3em] text-gray-300">Fiabilité</span>
          <span className="text-xl font-mono text-neon-accent">{reliabilityScore}%</span>
        </div>
        <span className="glass-button w-6 h-6 rounded-full text-[10px] font-black p-0">
          i
        </span>
      </button>
      <div
        ref={mobileReliabilityInfoRef}
        className={`absolute right-0 mt-3 w-[85vw] max-w-[calc(100vw-2rem)] rounded-2xl bg-black/90 border border-white/15 backdrop-blur-2xl px-4 py-4 shadow-[0_20px_45px_rgba(0,0,0,0.5)] text-left space-y-3 transition-all duration-300 z-[70] ${isMobileReliabilityInfoVisible ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-2 pointer-events-none'
          }`}
      >
        <div className="text-[9px] font-bold uppercase tracking-[0.35em] text-gray-300">Modèle de calcul</div>
        <div className="space-y-2.5">
          <div>
            <div className="flex items-center justify-between text-[11px] text-white font-semibold">
              <span className="text-gray-200 font-normal">Couverture médiatique</span>
              <span>40%</span>
            </div>
            <p className="text-[10px] text-gray-400 leading-snug">Diversité des sources, équilibre gauche/centre/droite et recoupement sur 24h.</p>
          </div>
          <div>
            <div className="flex items-center justify-between text-[11px] text-white font-semibold">
              <span className="text-gray-200 font-normal">Scores organismes indépendants</span>
              <span>35%</span>
            </div>
            <p className="text-[10px] text-gray-400 leading-snug">Agrégation normalisée des notations Media Bias/Fact Check, AllSides & Reporters sans frontières.</p>
          </div>
          <div>
            <div className="flex items-center justify-between text-[11px] text-white font-semibold">
              <span className="text-gray-200 font-normal">Historique de corrections</span>
              <span>15%</span>
            </div>
            <p className="text-[10px] text-gray-400 leading-snug">Pénalités appliquées si les sources citées publient des errata fréquents.</p>
          </div>
          <div>
            <div className="flex items-center justify-between text-[11px] text-white font-semibold">
              <span className="text-gray-200 font-normal">Signal fact-check temps réel</span>
              <span>10%</span>
            </div>
            <p className="text-[10px] text-gray-400 leading-snug">Alignement avec les alertes des réseaux IFCN et AFP Factuel.</p>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div
        ref={cardRef}
        className="h-[100dvh] w-full flex-shrink-0 snap-start relative overflow-hidden bg-black flex flex-col"
      >
        {/* DESKTOP BACKGROUND - Hidden on mobile to prevent interference */}
        <div className="absolute inset-0 z-0 hidden lg:block">
          <div className="absolute inset-0 bg-gray-900" />
          {!imageLoaded && (
            <div className="absolute inset-0 bg-gray-800 animate-pulse z-10">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]"></div>
            </div>
          )}
          <img
            src={imageSrc}
            alt="Background Atmosphere"
            aria-hidden="true"
            onLoad={() => setImageLoaded(true)}
            onError={handleImageError}
            className={`absolute inset-0 w-full h-full object-cover blur-3xl opacity-40 scale-125 transition-opacity duration-1000 ${imageLoaded ? 'opacity-40' : 'opacity-0'}`}
          />
          <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px]" />
        </div>

        {/* MOBILE BACKGROUND - High Z-index to ensure visibility */}
        <div className="absolute inset-0 z-0 lg:hidden bg-gray-900">
          {!imageLoaded && (
            <div className="absolute inset-0 bg-gray-900 animate-pulse z-10">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]"></div>
            </div>
          )}
          <img
            src={imageSrc}
            alt={article.headline}
            onLoad={() => setImageLoaded(true)}
            onError={handleImageError}
            className={`w-full h-full object-cover transition-opacity duration-500 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
            style={{
              filter: 'contrast(1.1) saturate(1.1)',
            }}
          />
          <div className="absolute inset-x-0 top-0 h-[65%] bg-gradient-to-b from-black/80 via-black/40 to-transparent z-10 pointer-events-none"></div>
          <div className="absolute inset-x-0 bottom-0 h-[60%] bg-gradient-to-t from-black/90 via-black/50 to-transparent z-10 pointer-events-none"></div>
        </div>

        <div
          className={`absolute inset-0 z-30 flex flex-col pb-safe-bottom pointer-events-none transition-opacity duration-300 safe-area-top safe-area-bottom card-content-shell ${isInterfaceHidden ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
          style={cardContentSafeArea}
        >
          <div
            className="hidden lg:flex flex-col h-full pointer-events-auto max-w-[1920px] mx-auto w-full safe-area-x"
            style={desktopHorizontalSafeArea}
          >
            <div className="flex-1 w-full grid grid-cols-12 gap-6 lg:gap-8 items-stretch content-center min-h-0" style={desktopGridGutter}>
              <div
                className="col-span-6 flex flex-col justify-center gap-6 lg:gap-10 pt-2 lg:pt-4 pb-2 lg:pb-4 overflow-hidden"
                style={{ paddingRight: 'var(--desktop-column-gutter)' } as React.CSSProperties}
              >
                <div className="flex items-center justify-between w-full mb-2 flex-shrink-0">
                    <div className="flex items-center gap-4">
                        <div className="center-perfect w-10 h-10 lg:w-11 lg:h-11 rounded-full bg-white/5 border border-white/10 shadow-[0_0_20px_rgba(255,255,255,0.05)] text-xl lg:text-2xl">
                          {article.emoji}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[9px] lg:text-[10px] font-bold uppercase tracking-[0.3em] text-neon-accent mb-0.5 lg:mb-1">Synthèse Prism</span>
                          <div className="inline-flex items-center gap-2">
                            {isLive && <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></div>}
                            <span className="text-[10px] lg:text-[11px] font-mono text-gray-400 uppercase tracking-[0.5em]">{displayDate}</span>
                          </div>
                        </div>
                    </div>

                    <div ref={reliabilityTriggerRef} className="relative flex flex-col items-end text-right gap-2 lg:gap-3 max-w-sm">
                      <button
                        type="button"
                        className="flex items-center gap-2 text-right focus:outline-none focus-visible:ring-2 focus-visible:ring-white/40 rounded-lg px-2 py-1 -mx-2"
                        aria-label="Voir le détail du modèle de calcul"
                        aria-expanded={isReliabilityInfoVisible}
                        onMouseEnter={openReliabilityInfo}
                        onMouseLeave={closeReliabilityInfo}
                        onFocus={openReliabilityInfo}
                        onBlur={closeReliabilityInfo}
                        onClick={(event) => {
                          event.stopPropagation();
                          toggleReliabilityInfo();
                        }}
                      >
                        <div className="flex flex-col items-end leading-tight">
                          <span className="text-[9px] lg:text-[10px] font-bold uppercase tracking-[0.4em] text-gray-400">Fiabilité</span>
                          <span className="text-2xl lg:text-3xl font-mono text-neon-accent">
                            {reliabilityScore}%
                          </span>
                        </div>
                        <span className="glass-button w-5 h-5 lg:w-6 lg:h-6 rounded-full text-[10px] lg:text-[11px] font-black p-0">
                          i
                        </span>
                      </button>
                      <div
                        ref={reliabilityInfoRef}
                        className={`absolute top-full right-0 mt-4 w-[18rem] rounded-2xl bg-black/85 border border-white/15 backdrop-blur-2xl px-5 py-4 shadow-[0_20px_45px_rgba(0,0,0,0.45)] text-left space-y-3 transition-all duration-300 z-[60] ${isReliabilityInfoVisible ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-2 pointer-events-none'
                          }`}
                      >
                        <div className="text-[9px] font-bold uppercase tracking-[0.35em] text-gray-300">Modèle de calcul</div>
                        <div className="space-y-2.5">
                          <div>
                            <div className="flex items-center justify-between text-[11px] text-white font-semibold">
                              <span className="text-gray-200 font-normal">Couverture médiatique</span>
                              <span>40%</span>
                            </div>
                            <p className="text-[10px] text-gray-400 leading-snug">Diversité des sources, équilibre gauche/centre/droite et recoupement sur 24h.</p>
                          </div>
                          <div>
                            <div className="flex items-center justify-between text-[11px] text-white font-semibold">
                              <span className="text-gray-200 font-normal">Scores organismes indépendants</span>
                              <span>35%</span>
                            </div>
                            <p className="text-[10px] text-gray-400 leading-snug">Agrégation normalisée des notations Media Bias/Fact Check, AllSides & Reporters sans frontières.</p>
                          </div>
                          <div>
                            <div className="flex items-center justify-between text-[11px] text-white font-semibold">
                              <span className="text-gray-200 font-normal">Historique de corrections</span>
                              <span>15%</span>
                            </div>
                            <p className="text-[10px] text-gray-400 leading-snug">Pénalités appliquées si les sources citées publient des errata fréquents.</p>
                          </div>
                          <div>
                            <div className="flex items-center justify-between text-[11px] text-white font-semibold">
                              <span className="text-gray-200 font-normal">Signal fact-check temps réel</span>
                              <span>10%</span>
                            </div>
                            <p className="text-[10px] text-gray-400 leading-snug">Alignement avec les alertes des réseaux IFCN et AFP Factuel.</p>
                          </div>
                        </div>
                      </div>
                    </div>
                </div>

                <div className="flex-shrink-0">
                  <h1 className="text-2xl lg:text-3xl xl:text-4xl font-serif font-bold leading-tight text-white drop-shadow-2xl tracking-tight break-words line-clamp-3">
                    {article.headline}
                  </h1>
                </div>

                <div
                  className="border-l-2 border-neon-accent/50 space-y-2 lg:space-y-3 flex-shrink-0"
                  style={{ paddingLeft: 'clamp(1rem, 1.5vw, 1.5rem)' }}
                >
                  <div
                    onClick={() => setIsDetailModalOpen(true)}
                    className="group cursor-pointer relative pb-1"
                  >
                    <p
                      className="text-sm lg:text-base text-gray-200 font-light leading-relaxed font-serif line-clamp-4 break-words group-hover:text-white transition-colors duration-300"
                    >
                      {article.summary}
                      <span className="inline-flex items-center ml-1.5 text-neon-accent opacity-70 group-hover:opacity-100 transition-opacity translate-y-0.5">
                        <span className="text-[9px] font-bold uppercase tracking-widest mr-1 hidden group-hover:inline-block">Lire</span>
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform">
                          <path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clipRule="evenodd" />
                        </svg>
                      </span>
                    </p>
                    <div className="absolute bottom-0 left-0 w-0 h-[1px] bg-neon-accent group-hover:w-1/3 transition-all duration-500 ease-out opacity-50"></div>
                  </div>

                  <div className="flex flex-wrap items-center justify-end gap-4 pt-2 w-full">
                    <div className="flex items-center gap-3">
                      <button
                        onClick={handleShareArticle}
                        className="glass-button btn-icon w-9 h-9 relative transition-transform active:scale-95 hover:bg-white/10 group"
                        title="Partager"
                      >
                        <ShareIcon className="w-4 h-4 text-white group-hover:text-neon-accent group-hover:scale-110 transition-all" />
                      </button>
                      <button
                        onClick={onChatOpen}
                        className="glass-button btn-icon w-9 h-9 relative transition-transform active:scale-95 hover:bg-white/10 group"
                        title="Comprendre"
                      >
                        <SparklesIcon className="w-4 h-4 text-white group-hover:text-neon-accent group-hover:scale-110 transition-all" />
                      </button>
                      <ActionButtons
                        article={article}
                        onShowSentiment={() => setIsSentimentModalOpen(true)}
                        className="gap-3"
                        communityStats={communityStats}
                        minimal={true}
                      />
                    </div>
                  </div>
                </div>

                <div className="pt-2 lg:pt-4 flex flex-col gap-2 flex-shrink-0">
                  <BiasAnalysisDisplay
                    analysis={article.biasAnalysis}
                    sources={article.sources}
                    onSourceSelect={setSelectedSource}
                    onShowSources={() => setIsSourceListOpen(true)}
                    className="w-full bg-transparent border-0 shadow-none p-0"
                  />
                </div>
              </div>

              <div
                className="col-span-6 flex flex-col items-center justify-center py-4 gap-4 h-full max-h-[80vh]"
                style={{ paddingLeft: 'var(--desktop-column-gutter)' } as React.CSSProperties}
              >
                <div
                  className="relative rounded-[20px] overflow-hidden shadow-[0_20px_40px_-10px_rgba(0,0,0,0.8)] border border-white/10 bg-gray-900 transform transition-transform duration-500 group hover:scale-[1.01] w-full h-full max-h-[60vh]"
                  style={{ ...heroFrameStyle, width: '100%', height: '100%' }}
                >
                  <div className="absolute -inset-4 bg-gradient-to-tr from-neon-accent/20 to-purple-500/20 rounded-[3rem] blur-3xl opacity-40 group-hover:opacity-80 transition-opacity duration-700"></div>
                  <img
                    src={imageSrc}
                    alt="Article Poster"
                    loading="lazy"
                    decoding="async"
                    onLoad={() => setImageLoaded(true)}
                    onError={handleImageError}
                    className="absolute inset-0 w-full h-full object-cover z-10"
                  />
                  <div className="absolute inset-0 bg-noise opacity-20 mix-blend-overlay z-20"></div>
                  <div className="absolute inset-0 shadow-[inset_0_0_100px_rgba(0,0,0,0.6)] z-20"></div>
                </div>
              </div>
            </div>
          </div>

          <div
            className="lg:hidden flex-1 relative pointer-events-auto z-40 safe-area-x pb-32 flex flex-col justify-center"
            style={mobileHorizontalSafeArea}
          >
            <div className="flex flex-col gap-5 overflow-visible">
              <div className="flex items-start justify-between gap-3">
                <div className="relative max-w-[200px] z-[70]" ref={mobileCategoryMenuRef}>
                  <button
                    type="button"
                    onClick={() => setIsMobileCategoryMenuOpen(prev => !prev)}
                    aria-haspopup="listbox"
                    aria-expanded={isMobileCategoryMenuOpen}
                    className="glass-button w-full justify-start gap-2 px-3 py-2 rounded-xl shadow-lg"
                  >
                    <span className="text-xl leading-none">{article.emoji}</span>
                    <div className="flex flex-col leading-tight flex-1 min-w-0 text-left">
                      <span className="text-[7px] font-bold uppercase tracking-[0.5em] text-gray-400">Synthèse PRISM</span>
                      <span className="text-xs font-semibold uppercase tracking-[0.2em] text-white flex items-center gap-1 truncate">
                        {activeFilterCategory.value}
                      </span>
                    </div>
                    <span className="text-[10px] text-gray-400">▾</span>
                  </button>
                  <div
                    className={`absolute left-0 right-0 top-full mt-2 rounded-2xl border border-white/15 bg-black/90 backdrop-blur-2xl shadow-[0_20px_35px_rgba(0,0,0,0.6)] transition-all duration-200 origin-top z-[80] ${isMobileCategoryMenuOpen ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-2 pointer-events-none'
                      }`}
                  >
                    <ul role="listbox" aria-label="Catégories" className="max-h-64 overflow-y-auto p-2 space-y-2">
                      {CATEGORY_OPTIONS.map((option) => (
                        <li key={option.value}>
                          <button
                            type="button"
                            onClick={() => {
                              onCategoryFilterChange(option.value);
                              setIsMobileCategoryMenuOpen(false);
                            }}
                            className={`w-full flex items-start gap-3 px-4 py-3 rounded-2xl text-left transition-colors ${selectedCategory === option.value ? 'bg-white/10 border border-white/20' : 'bg-transparent hover:bg-white/10'
                              }`}
                            role="option"
                            aria-selected={selectedCategory === option.value}
                          >
                            <span className="text-xl leading-none">{option.emoji}</span>
                            <div className="flex flex-col">
                              <span className="text-sm font-semibold text-white">{option.value}</span>
                              <span className="text-[11px] text-gray-400">{option.description}</span>
                            </div>
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                {mobileReliabilitySlot}
              </div>

              <h1 className="text-2xl sm:text-3xl font-serif font-bold leading-tight text-white line-clamp-3 prism-title-effect break-words" style={{ textShadow: '0 2px 8px rgba(0,0,0,0.9), 0 4px 16px rgba(0,0,0,0.7), 0 0 40px rgba(0,0,0,0.5)' }}>
                {article.headline}
              </h1>

              <div className="glass-panel rounded-xl p-4 relative flex flex-col gap-3 shadow-2xl bg-black/85 backdrop-blur-2xl border-white/20">
                <p
                  onClick={() => setIsDetailModalOpen(true)}
                  className="text-sm text-gray-100 font-serif leading-relaxed line-clamp-4 break-words cursor-pointer active:opacity-80"
                >
                  {article.summary}
                </p>
                <button
                  type="button"
                  onClick={() => setIsDetailModalOpen(true)}
                  className="inline-flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.25em] text-neon-accent hover:text-white transition-colors self-start"
                >
                  <span>Voir le détail</span>
                  <span className="text-sm">→</span>
                </button>
                <div className="flex flex-wrap items-center justify-between gap-2 pt-3 border-t border-white/10">
                  <div className="flex items-center gap-2 text-[10px] font-mono uppercase tracking-[0.3em] text-gray-300">
                    {isLive && <span className="w-1.5 h-1.5 rounded-full bg-red-500 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.7)]"></span>}
                    <span>{displayDate}</span>
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    <button
                      onClick={handleShareArticle}
                      className="glass-button btn-icon w-9 h-9 relative transition-transform active:scale-95 hover:bg-white/10 group"
                      title="Partager"
                    >
                      <ShareIcon className="w-4 h-4 text-white group-hover:text-neon-accent group-hover:scale-110 transition-all" />
                    </button>
                    <button
                      onClick={(e) => { e.stopPropagation(); onChatOpen(); }}
                      className="glass-button btn-icon w-9 h-9 relative transition-transform active:scale-95 hover:bg-white/10 group"
                      title="Comprendre"
                    >
                      <SparklesIcon className="w-4 h-4 text-white group-hover:text-neon-accent group-hover:scale-110 transition-all" />
                    </button>
                    <ActionButtons
                      article={article}
                      onShowSentiment={() => setIsSentimentModalOpen(true)}
                      className="gap-3"
                      communityStats={communityStats}
                      minimal={true}
                    />
                  </div>
                </div>
                {shareFeedback && (
                  <p className="text-[9px] uppercase tracking-[0.35em] text-center text-neon-accent">
                    {shareFeedback}
                  </p>
                )}
              </div>
            </div>

            <div className="absolute bottom-4 left-0 right-0 z-50">
              <BiasAnalysisDisplay
                analysis={article.biasAnalysis}
                sources={article.sources}
                onSourceSelect={setSelectedSource}
                onShowSources={() => setIsSourceListOpen(true)}
                className="glass-panel rounded-xl p-2 shadow-lg mx-auto max-w-md"
              />
              <ActionButtons
                article={article}
                onShowSentiment={() => setIsSentimentModalOpen(true)}
                className="hidden"
                communityStats={communityStats}
              />
            </div>
          </div>
        </div>
      </div>

      {selectedSource && (
        <SourceDetailModal
          source={selectedSource}
          onClose={() => setSelectedSource(null)}
        />
      )}

      {isSourceListOpen && (
        <SourceListModal
          sources={article.sources}
          onClose={() => setIsSourceListOpen(false)}
        />
      )}

      {isSentimentModalOpen && (
        <SentimentModal
          sentiment={article.sentiment}
          comments={localComments}
          onAddComment={handleAddComment}
          onClose={() => setIsSentimentModalOpen(false)}
        />
      )}

      {isDetailModalOpen && (
        <ArticleDetailModal
          article={article}
          onClose={() => setIsDetailModalOpen(false)}
        />
      )}
    </>
  );
};

export default NewsCard;
