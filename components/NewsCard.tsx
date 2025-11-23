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
  '--safe-area-x': '1.5rem' // Increased from 1.375rem for more breathing room
};

const cardContentSafeArea: React.CSSProperties = {
  '--safe-area-top': 'var(--card-content-safe-area-top, clamp(4.75rem, 7vw, 6.5rem))',
  '--safe-area-bottom': 'clamp(2rem, 4vw, 3rem)'
};

const mobileSpectreOffset = 'calc(env(safe-area-inset-bottom, 0px) + 1.5rem)';

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

  return (
    <>
      <div
        ref={cardRef}
        className="h-[100dvh] w-full flex-shrink-0 snap-start relative overflow-hidden bg-black flex flex-col"
      >
        {/* BACKGROUND (Unified logic) */}
        <div className="absolute inset-0 z-0">
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
            className={`absolute inset-0 w-full h-full object-cover lg:blur-[120px] lg:opacity-20 lg:scale-110 transition-opacity duration-[1500ms] ease-out ${imageLoaded ? 'opacity-100 lg:opacity-20' : 'opacity-0'}`}
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-transparent to-black/90 lg:bg-black/40 lg:backdrop-blur-[2px]" />
        </div>

        {/* MAIN CONTENT CONTAINER */}
        <div
          className={`absolute inset-0 z-30 flex flex-col pointer-events-none transition-opacity duration-300 ${isInterfaceHidden ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
          style={cardContentSafeArea}
        >
          <div className="flex-1 w-full h-full max-w-[1800px] mx-auto flex md:items-center md:px-12">
            
            <div className="w-full h-full md:h-auto grid grid-cols-1 md:grid-cols-12 gap-0 md:gap-12 items-stretch pb-safe-bottom md:pb-0 px-6 md:px-0">
                
                {/* CARD COLUMN (Mobile: Full width bottom / Desktop: Left col) */}
                <div className="col-span-1 md:col-span-5 pointer-events-auto flex flex-col justify-center z-50 w-full py-8 md:py-0">
                    
                    {/* THE UNIVERSAL CARD */}
                    <div className="flex flex-col gap-4 overflow-visible relative">
                        
                        {/* HEADER METADATA (Category & Reliability) */}
                        <div className="flex items-center justify-between w-full px-2 relative z-[70]">
                            <div className="relative" ref={mobileCategoryMenuRef}>
                  <button
                    onClick={() => setIsMobileCategoryMenuOpen(prev => !prev)}
                                    className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-black/40 border border-white/10 backdrop-blur-md active:scale-95 transition-all shadow-lg group hover:bg-black/60"
                                    aria-label="Changer de catégorie"
                                >
                                    <span className="text-lg leading-none filter drop-shadow-sm group-hover:scale-110 transition-transform">{article.emoji}</span>
                                    <div className="h-3 w-px bg-white/20"></div>
                                    <span className="text-[10px] font-bold uppercase tracking-[0.15em] text-white shadow-black/50 drop-shadow-md">
                        {activeFilterCategory.value}
                      </span>
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 text-white/70 group-hover:text-white transition-colors">
                                    <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                                    </svg>
                  </button>

                  <div
                                    className={`absolute left-0 top-full mt-2 w-64 rounded-2xl border border-white/15 bg-black/95 backdrop-blur-2xl shadow-[0_20px_50px_rgba(0,0,0,0.9)] transition-all duration-200 origin-top-left overflow-hidden z-[90] ${isMobileCategoryMenuOpen ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-2 pointer-events-none'
                      }`}
                  >
                                    <ul role="listbox" aria-label="Catégories" className="max-h-64 overflow-y-auto p-1.5 space-y-1">
                      {CATEGORY_OPTIONS.map((option) => (
                        <li key={option.value}>
                          <button
                            type="button"
                            onClick={() => {
                              onCategoryFilterChange(option.value);
                              setIsMobileCategoryMenuOpen(false);
                            }}
                                            className={`w-full flex items-center gap-3 px-3 py-3 rounded-xl text-left transition-all ${selectedCategory === option.value ? 'bg-white/15 shadow-inner' : 'hover:bg-white/10 active:bg-white/5'
                                            }`}
                                        >
                                            <span className="text-xl leading-none w-8 text-center">{option.emoji}</span>
                                            <span className="text-xs font-bold uppercase tracking-wider text-white/90">{option.value}</span>
                                            {selectedCategory === option.value && (
                                            <div className="ml-auto w-1.5 h-1.5 rounded-full bg-neon-accent shadow-[0_0_8px_theme(colors.neon-accent)]"></div>
                                            )}
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
                            
                            {/* RELIABILITY INDICATOR */}
                            <div className="relative">
                                <div 
                                    ref={mobileReliabilityTriggerRef}
                                    className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-black/40 border border-white/10 backdrop-blur-md cursor-help active:scale-95 transition-all shadow-lg hover:bg-black/60 group"
                                    onClick={(e) => { e.stopPropagation(); toggleMobileReliabilityInfo(); }}
                                >
                                    <div className="flex flex-col items-end leading-none">
                                        <span className="text-[7px] font-bold uppercase tracking-wider text-white/70 mb-0.5 group-hover:text-white transition-colors">Fiabilité</span>
                                        <span className={`font-mono font-bold text-xs ${reliabilityScore >= 80 ? 'text-green-400' : reliabilityScore >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                                            {reliabilityScore}%
                                        </span>
                                    </div>
                                    <div className={`w-2 h-2 rounded-full ${reliabilityScore >= 80 ? 'bg-green-500' : reliabilityScore >= 50 ? 'bg-yellow-500' : 'bg-red-500'} shadow-[0_0_10px_currentColor]`}></div>
                                </div>

                                {/* Mobile Reliability Popover */}
                                <div
                                    ref={mobileReliabilityInfoRef}
                                    className={`absolute right-0 top-full mt-3 w-[85vw] max-w-[280px] rounded-2xl bg-black/90 border border-white/15 backdrop-blur-2xl p-5 shadow-[0_20px_50px_rgba(0,0,0,0.9)] text-left space-y-4 transition-all duration-300 z-[80] ${isMobileReliabilityInfoVisible ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-2 pointer-events-none'}`}
                                >
                                    <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-gray-400 border-b border-white/10 pb-2 mb-2 flex justify-between items-center">
                                        <span>Score de fiabilité</span>
                                        <span className={`text-xs font-mono ${reliabilityScore >= 80 ? 'text-green-400' : 'text-yellow-400'}`}>{reliabilityScore}%</span>
                                    </div>
                                    <div className="space-y-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs text-gray-300">Diversité des sources</span>
                                        <div className="h-1 w-16 bg-gray-800 rounded-full overflow-hidden">
                                            <div className="h-full bg-blue-500 w-[40%]"></div>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs text-gray-300">Fact-checking</span>
                                        <div className="h-1 w-16 bg-gray-800 rounded-full overflow-hidden">
                                            <div className="h-full bg-purple-500 w-[35%]"></div>
                                        </div>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-xs text-gray-300">Historique</span>
                                        <div className="h-1 w-16 bg-gray-800 rounded-full overflow-hidden">
                                            <div className="h-full bg-green-500 w-[25%]"></div>
                                        </div>
                                    </div>
                                    </div>
                                </div>
                            </div>
              </div>

                        {/* HEADLINE */}
                        <h1 className="text-3xl sm:text-4xl lg:text-6xl font-serif font-bold leading-[0.95] text-white tracking-tight break-words drop-shadow-lg px-2 mt-2 lg:mt-4">
                            {article.headline.replace(/[\u{1F300}-\u{1F9FF}]/gu, '')}
              </h1>

                        {/* CONTENT CARD */}
                        <div className="glass-panel rounded-[24px] p-6 md:p-8 relative flex flex-col gap-6 shadow-[0_20px_40px_rgba(0,0,0,0.6)] bg-black/30 backdrop-blur-3xl border border-white/10">
                            <div className="relative pr-2">
                <p
                  onClick={() => setIsDetailModalOpen(true)}
                                    className="text-[17px] text-white/90 font-sans leading-relaxed line-clamp-4 break-words cursor-pointer hover:text-white transition-colors font-medium tracking-wide antialiased"
                >
                  {article.summary}
                </p>
                <button
                  type="button"
                  onClick={() => setIsDetailModalOpen(true)}
                                    className="absolute -bottom-2 right-0 w-7 h-7 flex items-center justify-center rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md text-white transition-all active:scale-90 border border-white/5 group"
                                    aria-label="Lire la suite"
                >
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-3.5 h-3.5 ml-0.5 group-hover:translate-x-0.5 transition-transform">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                                    </svg>
                </button>
                            </div>
                            
                            {/* SOURCES INTEGRATION */}
                            <div className="py-2 border-t border-white/5 relative z-10">
                                <BiasAnalysisDisplay
                                analysis={article.biasAnalysis}
                                sources={article.sources}
                                onSourceSelect={setSelectedSource}
                                onShowSources={() => setIsSourceListOpen(true)}
                                className="w-full"
                                />
                            </div>
                            
                            {/* FOOTER ACTION BAR */}
                            <div className="flex items-center justify-between pt-4 border-t border-white/10 mt-1">
                                <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-gray-400/80">
                                {isLive ? (
                                    <div className="flex items-center gap-1.5 text-red-400">
                                        <span className="relative flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                                        </span>
                                        <span>Direct</span>
                                    </div>
                                ) : (
                    <span>{displayDate}</span>
                                )}
                  </div>
                                
                                <div className="flex items-center gap-5">
                    <div className="flex flex-col items-center gap-1 group relative">
                      <button
                        onClick={handleShareArticle}
                        className="flex items-center justify-center w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 backdrop-blur-md border border-white/5 transition-all duration-300 active:scale-90 text-gray-300 hover:text-white hover:scale-110"
                        aria-label="Partager"
                      >
                        <ShareIcon className="w-4 h-4" strokeWidth={2} />
                      </button>
                      <span className="text-[8px] font-bold uppercase tracking-wider text-gray-400 group-hover:text-white transition-colors duration-200 opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 absolute top-full mt-1 whitespace-nowrap">
                        Partager
                      </span>
                    </div>

                    <div className="flex flex-col items-center gap-1 group relative">
                      <button
                        onClick={(e) => { e.stopPropagation(); onChatOpen(); }}
                        className="flex items-center justify-center w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 backdrop-blur-md border border-white/5 transition-all duration-300 active:scale-90 text-gray-300 hover:text-white hover:scale-110"
                        aria-label="Comprendre"
                      >
                        <SparklesIcon className="w-4 h-4" />
                      </button>
                      <span className="text-[8px] font-bold uppercase tracking-wider text-gray-400 group-hover:text-white transition-colors duration-200 opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 absolute top-full mt-1 whitespace-nowrap">
                        Comprendre
                      </span>
                    </div>

                    <div className="h-8 w-px bg-white/10 mx-1"></div>

                    <ActionButtons
                      article={article}
                      onShowSentiment={() => setIsSentimentModalOpen(true)}
                      className="gap-5"
                      communityStats={communityStats}
                      minimal={true}
                    />
                  </div>
                </div>

                {shareFeedback && (
                                <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-black/90 px-4 py-1.5 rounded-full border border-white/10 shadow-xl animate-fade-in">
                                    <p className="text-[9px] uppercase tracking-[0.2em] text-white font-bold whitespace-nowrap">
                    {shareFeedback}
                  </p>
                                </div>
                )}
                        </div>
              </div>
            </div>

                {/* IMAGE COLUMN (Desktop Only - Right side) */}
                <div className="hidden md:flex col-span-7 h-full relative items-center justify-center pl-12 pointer-events-auto py-8 md:py-0">
                    <div className="relative w-full h-full rounded-[32px] overflow-hidden shadow-[0_50px_100px_-20px_rgba(0,0,0,0.7)] border border-white/10 group transform transition-all duration-700 hover:scale-[1.005]">
                        <img
                            src={imageSrc}
                            alt="Article Poster"
                            className="absolute inset-0 w-full h-full object-cover object-top transition-transform duration-1000 group-hover:scale-105"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-40"></div>
                    </div>
                </div>

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