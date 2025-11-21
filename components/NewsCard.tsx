import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { NewsArticle, Source, UserComment } from '../types';
import BiasAnalysisDisplay from './BiasAnalysisDisplay';
import ActionButtons from './ActionButtons';
import SourceDetailModal from './SourceDetailModal';
import SourceListModal from './SourceListModal';
import SentimentModal from './SentimentModal';
import HideInterfaceButton from './HideInterfaceButton';
import ArticleDetailModal from './ArticleDetailModal';
import { ChatIcon } from './icons/ChatIcon';
import { ShareIcon } from './icons/ShareIcon';
import CategorySelect from './CategorySelect';
import { CATEGORY_OPTIONS, getCategoryOption } from '../constants/categories';

const desktopHorizontalSafeArea: React.CSSProperties = {
  '--safe-area-x': 'clamp(3.5rem, 5vw, 7rem)'
};

const mobileHorizontalSafeArea: React.CSSProperties = {
  '--safe-area-x': '1.375rem'
};

const cardContentSafeArea: React.CSSProperties = {
  '--safe-area-top': 'clamp(4.75rem, 7vw, 6.5rem)',
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
  minHeight: '300px' // Sécurité pour éviter une image trop petite
};

interface NewsCardProps {
  article: NewsArticle;
  onVisible: (articleId: string) => void;
  onChatOpen: () => void;
  isInterfaceHidden: boolean;
  selectedCategory: string;
  onCategoryFilterChange: (category: string) => void;
}

const NewsCard: React.FC<NewsCardProps> = ({
  article,
  onVisible,
  onChatOpen,
  isInterfaceHidden,
  selectedCategory,
  onCategoryFilterChange
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

  const caricatureStyle = ", premium french newspaper editorial caricature background, prism news tile, expressive ink linework, selective watercolor washes, muted newsprint paper with bold accent colors, elegant 3:4 portrait framing, clean negative space, no text, no typography, no logos, no photorealism, no 3d renders";
  const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(article.imagePrompt + caricatureStyle)}?width=1080&height=1440&nologo=true&model=flux-pro&enhance=true&safe=true&seed=${article.id}`;

  const initialSrc = (article.imageUrl && (article.imageUrl.startsWith('http') || article.imageUrl.startsWith('data:')))
    ? article.imageUrl
    : pollinationsUrl;
  const [imageSrc, setImageSrc] = useState<string>(initialSrc);
  const [imageLoaded, setImageLoaded] = useState(false);

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
        <span className="w-6 h-6 rounded-full border border-white/20 text-[11px] font-black text-gray-200 flex items-center justify-center bg-black/40">
          i
        </span>
      </button>
      <div
        ref={mobileReliabilityInfoRef}
        className={`absolute right-0 mt-3 w-[85vw] max-w-sm rounded-2xl bg-black/90 border border-white/15 backdrop-blur-2xl px-4 py-4 shadow-[0_20px_45px_rgba(0,0,0,0.5)] text-left space-y-3 transition-all duration-300 z-[70] ${
          isMobileReliabilityInfoVisible ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-2 pointer-events-none'
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
        className="h-screen w-full flex-shrink-0 snap-start relative overflow-hidden bg-black flex flex-col"
      >
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
            className={`absolute inset-0 w-full h-full object-cover blur-3xl opacity-40 scale-125 transition-opacity duration-1000 ${imageLoaded ? 'opacity-40' : 'opacity-0'}`}
          />
          <div className="absolute inset-0 bg-black/20 backdrop-blur-[2px]" />
        </div>

        <div className="absolute inset-0 z-0 lg:hidden">
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
            className={`w-full h-full object-cover transition-all duration-1000 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
            style={{
              filter: isIntersecting ? 'contrast(1.1) saturate(1.1)' : 'grayscale(100%)',
            }}
          />
          <div className="absolute inset-x-0 top-0 h-3/4 bg-gradient-to-b from-black/80 via-black/40 to-transparent opacity-90 z-10 pointer-events-none"></div>
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black via-black/90 to-transparent z-10"></div>
        </div>

        <div
          className={`absolute inset-0 z-30 flex flex-col pb-safe-bottom pointer-events-none transition-opacity duration-300 safe-area-top safe-area-bottom ${isInterfaceHidden ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
          style={cardContentSafeArea}
        >
          <div
            className="hidden lg:flex flex-col h-full pointer-events-auto max-w-[1920px] mx-auto w-full safe-area-x"
            style={desktopHorizontalSafeArea}
          >
            <div className="flex items-center justify-between gap-6 py-10 pr-6 flex-wrap">
              <div className="flex items-center gap-4 min-w-[260px]">
                <div className="center-perfect w-11 h-11 rounded-full bg-white/5 border border-white/10 shadow-[0_0_20px_rgba(255,255,255,0.05)] text-2xl">
                  {article.emoji}
                </div>
                <div className="flex flex-col">
                  <span className="text-[10px] font-bold uppercase tracking-[0.3em] text-neon-accent mb-1">Synthèse Prism</span>
                  <div className="inline-flex items-center gap-2">
                    {isLive && <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></div>}
                    <span className="text-[11px] font-mono text-gray-400 uppercase tracking-[0.5em]">{displayDate}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-6 ml-auto flex-wrap justify-end">
                <div className="min-w-[220px] w-full sm:w-auto">
                  <CategorySelect
                    value={selectedCategory}
                    onChange={onCategoryFilterChange}
                    hideDescription
                    className="w-full"
                  />
                </div>

                <div ref={reliabilityTriggerRef} className="relative flex flex-col items-end text-right gap-3 max-w-sm">
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
                      <span className="text-[10px] font-bold uppercase tracking-[0.4em] text-gray-400">Fiabilité</span>
                      <span className="text-3xl font-mono text-neon-accent">
                        {reliabilityScore}%
                      </span>
                    </div>
                    <span className="w-6 h-6 rounded-full border border-white/20 text-[11px] font-black text-gray-200 flex items-center justify-center bg-black/40">
                      i
                    </span>
                  </button>
                  <div
                    ref={reliabilityInfoRef}
                    className={`absolute top-full right-0 mt-4 w-[18rem] rounded-2xl bg-black/85 border border-white/15 backdrop-blur-2xl px-5 py-4 shadow-[0_20px_45px_rgba(0,0,0,0.45)] text-left space-y-3 transition-all duration-300 z-[60] ${
                      isReliabilityInfoVisible ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-2 pointer-events-none'
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
            </div>

            <div className="pb-4">
              <h1 className="text-5xl xl:text-6xl 2xl:text-[4.5rem] font-serif font-bold leading-[1.08] text-white drop-shadow-2xl tracking-tight">
                {article.headline}
              </h1>
            </div>

            <div className="flex-1 w-full grid grid-cols-12 gap-10 items-stretch content-start" style={desktopGridGutter}>
              <div
                className="col-span-6 flex flex-col justify-between pt-6 pb-6"
                style={{ paddingRight: 'var(--desktop-column-gutter)' } as React.CSSProperties}
              >
                <div
                  className="border-l-2 border-neon-accent/50 mb-10 space-y-4"
                  style={{ paddingLeft: 'clamp(1.5rem, 2vw, 2.25rem)' }}
                >
                  <p className="text-lg xl:text-xl text-gray-200 font-light leading-relaxed font-serif line-clamp-4">
                    {article.summary}
                  </p>
                  <div className="flex items-center gap-4">
                    <button
                      type="button"
                      onClick={() => setIsDetailModalOpen(true)}
                      className="text-[11px] font-bold uppercase tracking-[0.3em] text-neon-accent hover:text-white transition-colors flex items-center gap-2 group"
                    >
                      <span>Voir l'analyse complète</span>
                      <span className="group-hover:translate-x-1 transition-transform">→</span>
                    </button>
                  </div>
                </div>

                <div className="mt-8 flex flex-col gap-6">
                  <BiasAnalysisDisplay
                    analysis={article.biasAnalysis}
                    sources={article.sources}
                    onSourceSelect={setSelectedSource}
                    onShowSources={() => setIsSourceListOpen(true)}
                    className="w-full bg-transparent border-0 shadow-none p-0"
                  />

                  <div className="flex items-center gap-6 pt-6 border-t border-white/10 mt-auto">
                    <button onClick={onChatOpen} className="glass-button no-shimmer px-6 py-3 rounded-full flex items-center gap-3 group/ai hover:bg-neon-accent/10 hover:border-neon-accent/30 transition-all">
                      <ChatIcon className="w-4 h-4 text-neon-accent group-hover/ai:scale-110 transition-transform" />
                      <span className="text-[10px] font-bold uppercase tracking-widest text-white group-hover/ai:text-neon-accent transition-colors">Comprendre</span>
                    </button>

                    <div className="h-8 w-px bg-white/10"></div>

                    <ActionButtons
                      article={article}
                      onShowSentiment={() => setIsSentimentModalOpen(true)}
                    className="flex-row gap-4"
                    communityStats={communityStats}
                    />
                  </div>
                </div>
              </div>

              <div
                className="col-span-6 flex items-center justify-center py-6"
                style={{ paddingLeft: 'var(--desktop-column-gutter)' } as React.CSSProperties}
              >
                <div
                  className="relative rounded-[24px] overflow-hidden shadow-[0_30px_60px_-15px_rgba(0,0,0,0.8)] border border-white/10 bg-gray-900 transform transition-transform duration-500 group hover:scale-[1.01] w-full"
                  style={{ ...heroFrameStyle, ...heroMediaDimensions }}
                >
                  <div className="absolute -inset-4 bg-gradient-to-tr from-neon-accent/20 to-purple-500/20 rounded-[3rem] blur-3xl opacity-40 group-hover:opacity-80 transition-opacity duration-700"></div>
                  <img
                    src={imageSrc}
                    alt="Article Poster"
                    className="absolute inset-0 w-full h-full object-cover z-10"
                  />
                  <div className="absolute inset-0 bg-noise opacity-20 mix-blend-overlay z-20"></div>
                  <div className="absolute inset-0 shadow-[inset_0_0_150px_rgba(0,0,0,0.6)] z-20"></div>
                </div>
              </div>
            </div>
          </div>

          <div
            className="lg:hidden flex-1 flex flex-col justify-between pb-36 pointer-events-auto z-40 safe-area-x"
            style={mobileHorizontalSafeArea}
          >
            <div className="flex flex-col gap-5 overflow-visible">
              <div className="flex items-start justify-between gap-3">
                <div className="relative flex-1 z-[70]" ref={mobileCategoryMenuRef}>
                  <button
                    type="button"
                    onClick={() => setIsMobileCategoryMenuOpen(prev => !prev)}
                    aria-haspopup="listbox"
                    aria-expanded={isMobileCategoryMenuOpen}
                    className="w-full inline-flex items-center gap-3 px-3 py-2 rounded-2xl bg-black/35 backdrop-blur-md border border-white/10 shadow-lg focus:outline-none focus-visible:ring-2 focus-visible:ring-white/30 transition-colors"
                  >
                    <span className="text-2xl leading-none">{article.emoji}</span>
                    <div className="flex flex-col leading-tight flex-1 min-w-0 text-left">
                      <span className="text-[8px] font-bold uppercase tracking-[0.5em] text-gray-400">Synthèse PRISM</span>
                      <span className="text-sm font-semibold uppercase tracking-[0.2em] text-white flex items-center gap-1 truncate">
                        {activeFilterCategory.emoji} {activeFilterCategory.value}
                      </span>
                    </div>
                    <span className="text-xs text-gray-400">▾</span>
                  </button>
                  <div
                    className={`absolute left-0 right-0 top-full mt-2 rounded-2xl border border-white/15 bg-black/90 backdrop-blur-2xl shadow-[0_20px_35px_rgba(0,0,0,0.6)] transition-all duration-200 origin-top z-[80] ${
                      isMobileCategoryMenuOpen ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-2 pointer-events-none'
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
                            className={`w-full flex items-start gap-3 px-4 py-3 rounded-2xl text-left transition-colors ${
                              selectedCategory === option.value ? 'bg-white/10 border border-white/20' : 'bg-transparent hover:bg-white/10'
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

              <h1 className="text-[2rem] sm:text-4xl font-serif font-bold leading-[1.1] text-white drop-shadow-2xl line-clamp-3 prism-title-effect">
                {article.headline}
              </h1>

              <div className="glass-panel rounded-2xl p-5 relative flex flex-col gap-5 shadow-2xl bg-black/70 backdrop-blur-2xl border-white/15">
                <p className="text-[15px] text-gray-100 font-serif leading-[1.6] line-clamp-4">
                  {article.summary}
                </p>
                <button
                  type="button"
                  onClick={() => setIsDetailModalOpen(true)}
                  className="inline-flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.25em] text-neon-accent hover:text-white transition-colors self-start"
                >
                  <span>Voir le détail</span>
                  <span className="text-base">→</span>
                </button>
                <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-white/10">
                  <div className="flex items-center gap-2 text-[11px] font-mono uppercase tracking-[0.3em] text-gray-300">
                    {isLive && <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.7)]"></span>}
                    <span>{displayDate}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleShareArticle}
                      className="glass-button no-shimmer px-4 py-3 rounded-full flex items-center gap-2.5 min-h-[44px] active:scale-95 transition-transform"
                    >
                      <ShareIcon className="w-4 h-4 text-neon-accent" />
                      <span className="text-[10px] font-bold uppercase text-white tracking-wider">Partager</span>
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onChatOpen();
                      }}
                      className="glass-button no-shimmer px-4 py-3 rounded-full flex items-center gap-2.5 min-h-[44px] active:scale-95 transition-transform"
                    >
                      <ChatIcon className="w-4 h-4 text-neon-accent" />
                      <span className="text-[10px] font-bold uppercase text-white tracking-wider">Comprendre</span>
                    </button>
                  </div>
                </div>
                {shareFeedback && (
                  <p className="text-[9px] uppercase tracking-[0.35em] text-center text-neon-accent">
                    {shareFeedback}
                  </p>
                )}
              </div>
            </div>

            <div className="mt-10 flex flex-row items-stretch justify-end gap-3 h-full max-h-[160px]">
              <BiasAnalysisDisplay
                analysis={article.biasAnalysis}
                sources={article.sources}
                onSourceSelect={setSelectedSource}
                onShowSources={() => setIsSourceListOpen(true)}
                className="flex-1 bg-black/40 backdrop-blur-xl border border-white/15 rounded-2xl p-3 shadow-lg"
              />
              <ActionButtons
                article={article}
                onShowSentiment={() => setIsSentimentModalOpen(true)}
                className="flex-shrink-0"
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
