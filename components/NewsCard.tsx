import React, { useState, useEffect, useRef, useMemo, useCallback, ReactNode } from 'react';
import { NewsArticle, Source } from '../types';
import BiasAnalysisDisplay from './BiasAnalysisDisplay';
import ActionButtons from './ActionButtons';
import SourceDetailModal from './SourceDetailModal';
import SourceListModal from './SourceListModal';
import ArticleDetailModal from './ArticleDetailModal';
import { SparklesIcon } from './icons/SparklesIcon';
import { ShareIcon } from './icons/ShareIcon';
import CategorySelect from './CategorySelect';
import { CATEGORY_OPTIONS, getCategoryOption } from '../constants/categories';

/**
 * Enhanced Headline - Better readability with text shadows only
 */
const EnhancedHeadline: React.FC<{ children: string; className?: string }> = ({ children, className = '' }) => {
  return (
    <h1 
      className={className}
      style={{
        textShadow: `
          0 2px 4px rgba(0,0,0,0.9),
          0 4px 12px rgba(0,0,0,0.7),
          0 8px 24px rgba(0,0,0,0.5)
        `
      }}
    >
      {children}
    </h1>
  );
};

/**
 * Parse text with **bold** markers and render as React elements
 * Supports: **bold text** format
 */
const renderFormattedText = (text: string): ReactNode => {
  if (!text) return null;
  
  // Split by **text** pattern
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  
  return parts.map((part, index) => {
    // Check if this part is a bold marker
    if (part.startsWith('**') && part.endsWith('**')) {
      const boldText = part.slice(2, -2);
      return (
        <strong key={index} className="font-bold text-white">
          {boldText}
        </strong>
      );
    }
    return part;
  });
};

/**
 * Calcule le score de consensus basé sur les sources disponibles.
 * Utilisé comme fallback quand le score n'est pas disponible dans les données.
 */
const calculateConsensusScore = (sources: Source[]): number => {
  if (!sources || sources.length === 0) return 15; // Score minimum

  let score = 0;

  // 1. VOLUME (30 points max)
  const count = sources.length;
  const volumeScore = Math.min(30, Math.max(0, (count - 2) * 4));
  score += volumeScore;

  // 2. DIVERSITÉ POLITIQUE (30 points max)
  const biasSet = new Set(sources.map(s => s.bias));
  const hasLeft = biasSet.has('left');
  const hasRight = biasSet.has('right');
  const hasCenter = biasSet.has('center') || biasSet.has('neutral');

  if (hasLeft && hasRight && hasCenter) {
    score += 30; // Spectre complet
  } else if ((hasLeft && hasRight) || (hasLeft && hasCenter) || (hasRight && hasCenter)) {
    score += 20; // Équilibre partiel
  } else {
    score += 5; // Sources homogènes
  }

  // 3. QUALITÉ DES SOURCES (40 points max)
  const trustKeywords = ['reuters', 'afp', 'apnews', 'bbc', 'ft.com', 'lemonde', 'nytimes', 'wsj', 'nature.com', 'science.org'];
  const mediumTrustKeywords = ['cnn', 'fox', 'liberation', 'figaro', 'guardian', 'politico', 'lesechos', 'businessinsider', 'cnbc'];

  let qualityScore = 0;
  sources.forEach(source => {
    const name = source.name.toLowerCase();
    if (trustKeywords.some(k => name.includes(k))) {
      qualityScore += 8;
    } else if (mediumTrustKeywords.some(k => name.includes(k))) {
      qualityScore += 4;
    } else {
      qualityScore += 1;
    }
  });
  score += Math.min(40, qualityScore);

  // Normalisation (15-98%)
  return Math.min(98, Math.max(15, Math.round(score)));
};

const cardContentSafeArea: React.CSSProperties = {
  '--safe-area-top': 'var(--card-content-safe-area-top, clamp(5.5rem, 8vw, 7.5rem))',
  '--safe-area-bottom': 'clamp(2rem, 4vw, 3rem)'
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
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [isReliabilityInfoVisible, setIsReliabilityInfoVisible] = useState(false);
  const [isMobileReliabilityInfoVisible, setIsMobileReliabilityInfoVisible] = useState(false);
  const [isMobileCategoryMenuOpen, setIsMobileCategoryMenuOpen] = useState(false);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  const activeFilterCategory = useMemo(
    () => getCategoryOption(selectedCategory),
    [selectedCategory]
  );

  // Image URL - Images générées par Gemini 3 Pro Image Preview et stockées dans Supabase Storage
  // Fallback : mosaïque des logos des sources
  
  const hasValidImage = article.imageUrl && (
    article.imageUrl.startsWith('http') || 
    article.imageUrl.startsWith('data:')
  );
  
  // Extraire les logos des sources pour le fallback visuel
  const sourceLogos = useMemo(() => {
    if (!article.sources) return [];
    return article.sources
      .filter(s => s.logoUrl && s.logoUrl.startsWith('http'))
      .map(s => s.logoUrl)
      .slice(0, 6); // Max 6 logos pour la mosaïque
  }, [article.sources]);
  
  const [imageSrc, setImageSrc] = useState<string>(hasValidImage ? article.imageUrl! : '');
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    setImageLoaded(false);
    setImageError(false);
    if (hasValidImage) {
      setImageSrc(article.imageUrl!);
    } else {
      setImageSrc('');
    }
  }, [article.imageUrl, hasValidImage]);

  useEffect(() => {
    if (imgRef.current && imgRef.current.complete) {
      setImageLoaded(true);
    }
  }, [imageSrc]);

  const cardRef = useRef<HTMLDivElement>(null);
  const reliabilityInfoRef = useRef<HTMLDivElement>(null);
  const reliabilityTriggerRef = useRef<HTMLDivElement>(null);
  const mobileReliabilityInfoRef = useRef<HTMLDivElement>(null);
  const mobileReliabilityTriggerRef = useRef<HTMLDivElement>(null);
  const mobileCategoryMenuRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);
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
  
  const handleImageError = () => {
    // Mark image as failed - no external fallbacks
    setImageError(true);
    setImageLoaded(false);
  };

  const handleShareArticle = useCallback(async () => {
    if (typeof window === 'undefined') {
      return;
    }

    // Construire l'URL avec l'ID de l'article pour un lien direct
    const shareUrl = new URL(window.location.href);
    shareUrl.searchParams.set('article', article.id);
    
    const sharePayload = {
      title: article.headline,
      text: `${article.headline}\n\n${article.summary}`,
      url: shareUrl.toString()
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
  
  // Sources vérifiées - on garde toutes les sources sauf si explicitement non vérifiées
  // Un article doit TOUJOURS avoir des sources affichées
  const verifiedSources = useMemo(() => {
    const sources = article.sources || [];
    
    // Si pas de sources, retourner vide (ne devrait pas arriver)
    if (sources.length === 0) return [];
    
    // Filtrer uniquement les sources explicitement non vérifiées
    const filtered = sources.filter(s => s.isVerified !== false);
    
    // IMPORTANT: Ne jamais retourner 0 sources - garder les originales si tout filtré
    return filtered.length > 0 ? filtered : sources;
  }, [article.sources]);
  
  // Calcul du consensus avec fallback si score invalide ou absent
  const consensusScore = useMemo(() => {
    const storedScore = article.biasAnalysis?.consensusScore;
    // Si le score existe et est valide (> 0), l'utiliser
    if (typeof storedScore === 'number' && storedScore > 0) {
      return Math.round(storedScore);
    }
    // Sinon, recalculer à partir des sources vérifiées uniquement
    return calculateConsensusScore(verifiedSources);
  }, [article.biasAnalysis?.consensusScore, verifiedSources]);

  // Analyse des sources qui se démarquent (dissidentes)
  const dissidentAnalysis = useMemo(() => {
    if (verifiedSources.length < 2) return null;
    
    // Calculer la position moyenne
    const avgPosition = verifiedSources.reduce((sum, s) => sum + s.position, 0) / verifiedSources.length;
    
    // Compter les sources par biais
    const biasCounts: Record<string, Source[]> = {};
    verifiedSources.forEach(s => {
      const bias = s.bias || 'neutral';
      if (!biasCounts[bias]) biasCounts[bias] = [];
      biasCounts[bias].push(s);
    });
    
    // Trouver le biais majoritaire
    let majorityBias = 'center';
    let maxCount = 0;
    Object.entries(biasCounts).forEach(([bias, sources]) => {
      if (sources.length > maxCount) {
        maxCount = sources.length;
        majorityBias = bias;
      }
    });
    
    // Identifier les sources dissidentes (biais minoritaire OU position éloignée de >30 pts)
    const dissidents: Source[] = [];
    verifiedSources.forEach(s => {
      const positionDiff = Math.abs(s.position - avgPosition);
      const isMinorityBias = biasCounts[s.bias]?.length === 1 && verifiedSources.length > 2;
      const isExtreme = positionDiff > 30;
      
      if (isMinorityBias || isExtreme) {
        dissidents.push(s);
      }
    });
    
    // Déterminer la tendance générale
    let trend: 'left' | 'right' | 'balanced' = 'balanced';
    if (avgPosition < 40) trend = 'left';
    else if (avgPosition > 60) trend = 'right';
    
    return {
      dissidents,
      majorityBias,
      avgPosition,
      trend,
      biasCounts
    };
  }, [verifiedSources]);

  return (
    <>
      <div
        ref={cardRef}
        className="h-[100dvh] w-full flex-shrink-0 snap-start relative overflow-hidden bg-black flex flex-col"
      >
        {/* BACKGROUND (Unified logic) */}
        <div className="absolute inset-0 z-0">
          {/* Loading shimmer */}
          {imageSrc && !imageLoaded && !imageError && (
            <div className="absolute inset-0 bg-gray-800 animate-pulse z-10">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]"></div>
            </div>
          )}
          
          {/* Image de fond si disponible */}
          {imageSrc && !imageError && (
            <img
              ref={imgRef}
              src={imageSrc}
              alt="Background Atmosphere"
              aria-hidden="true"
              onLoad={() => setImageLoaded(true)}
              onError={handleImageError}
              className={`absolute inset-0 w-full h-full object-cover lg:blur-[120px] lg:opacity-20 lg:scale-110 transition-opacity duration-[1500ms] ease-out ${imageLoaded ? 'opacity-100 lg:opacity-20' : 'opacity-0'}`}
            />
          )}
          
          {/* Fond de substitution si pas d'image */}
          {(!imageSrc || imageError) && (
            <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-black to-gray-900">
              <div className="absolute inset-0 opacity-10" style={{
                backgroundImage: `radial-gradient(circle at 25% 25%, rgba(255,255,255,0.1) 0%, transparent 50%),
                                  radial-gradient(circle at 75% 75%, rgba(255,255,255,0.05) 0%, transparent 50%)`
              }}></div>
            </div>
          )}
        </div>

        {/* MAIN CONTENT CONTAINER */}
        <div
          className={`absolute inset-0 z-30 flex flex-col pointer-events-none transition-opacity duration-300 ${isInterfaceHidden ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}
          style={cardContentSafeArea}
        >
          <div className="flex-1 w-full h-full max-w-[1800px] mx-auto flex flex-col justify-end lg:justify-center px-5 md:px-12 pt-20 md:pt-24 pb-safe-bottom">

            <div className="w-full max-w-7xl mx-auto flex flex-col lg:flex-row gap-4 lg:gap-8 items-stretch h-auto lg:h-full max-h-[80vh]">

              {/* LEFT COLUMN (Header + Content) */}
              <div className="flex-1 flex flex-col gap-2 lg:gap-4 relative z-50 min-h-0 justify-end lg:justify-center">

                {/* HEADER GROUP (Badges + Headline) */}
                <div className="w-full relative z-[70] shrink-0">
                  {/* Badges Row */}
                  <div className="flex items-center justify-between w-full mb-2 lg:mb-4">
                    {/* Category Badge */}
                    <div className="relative pointer-events-auto" ref={mobileCategoryMenuRef}>
                      <button
                        onClick={() => setIsMobileCategoryMenuOpen(prev => !prev)}
                        className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-[rgba(25,25,28,0.92)] border border-white/10 active:scale-95 transition-all group hover:bg-[rgba(35,35,38,0.95)]"
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

                    {/* Reliability Badge */}
                    <div className="relative pointer-events-auto">
                      <div
                        ref={mobileReliabilityTriggerRef}
                        className="flex items-center gap-2.5 px-3 py-1.5 rounded-full bg-[rgba(25,25,28,0.92)] border border-white/10 cursor-help active:scale-95 transition-all hover:bg-[rgba(35,35,38,0.95)] group"
                        onClick={(e) => { e.stopPropagation(); toggleMobileReliabilityInfo(); }}
                      >
                        <div className="flex flex-col items-end leading-none">
                          <span className="text-[7px] font-bold uppercase tracking-wider text-white/50 mb-0.5 group-hover:text-white transition-colors">Consensus</span>
                          <span className={`font-mono font-bold text-xs ${consensusScore >= 80 ? 'text-emerald-400' : consensusScore >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>
                            {consensusScore}%
                          </span>
                        </div>
                        <div className={`w-2 h-2 rounded-full ${consensusScore >= 80 ? 'bg-emerald-500' : consensusScore >= 50 ? 'bg-yellow-500' : 'bg-red-500'} shadow-[0_0_10px_currentColor]`}></div>
                      </div>

                      {/* Mobile Reliability Popover */}
                      <div
                        ref={mobileReliabilityInfoRef}
                        className={`absolute right-0 top-full mt-3 w-[85vw] max-w-[320px] rounded-2xl bg-black/90 border border-white/15 backdrop-blur-2xl p-5 shadow-[0_20px_50px_rgba(0,0,0,0.9)] text-left space-y-3 transition-all duration-300 z-[80] ${isMobileReliabilityInfoVisible ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 -translate-y-2 pointer-events-none'}`}
                      >
                        <div className="text-[9px] font-bold uppercase tracking-[0.2em] text-gray-400 border-b border-white/10 pb-2 mb-2 flex justify-between items-center">
                          <span>Niveau de consensus</span>
                          <span className={`text-xs font-mono ${consensusScore >= 80 ? 'text-green-400' : consensusScore >= 50 ? 'text-yellow-400' : 'text-red-400'}`}>{consensusScore}%</span>
                        </div>
                        <p className="text-[11px] text-gray-400 leading-relaxed">
                          Mesure l'accord entre les différentes sources sur les faits principaux de cette actualité.
                        </p>
                        
                        {/* Répartition des sources */}
                        {dissidentAnalysis && (
                          <div className="pt-2 border-t border-white/5 space-y-2">
                            <div className="text-[9px] font-bold uppercase tracking-wider text-gray-500">Répartition</div>
                            <div className="flex gap-1 items-center">
                              {dissidentAnalysis.biasCounts['left']?.length > 0 && (
                                <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-blue-500/20 border border-blue-500/30">
                                  <span className="text-[9px] text-blue-400 font-medium">{dissidentAnalysis.biasCounts['left'].length} gauche</span>
                                </div>
                              )}
                              {(dissidentAnalysis.biasCounts['center']?.length > 0 || dissidentAnalysis.biasCounts['neutral']?.length > 0) && (
                                <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-gray-500/20 border border-gray-500/30">
                                  <span className="text-[9px] text-gray-400 font-medium">{(dissidentAnalysis.biasCounts['center']?.length || 0) + (dissidentAnalysis.biasCounts['neutral']?.length || 0)} centre</span>
                                </div>
                              )}
                              {dissidentAnalysis.biasCounts['right']?.length > 0 && (
                                <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-red-500/20 border border-red-500/30">
                                  <span className="text-[9px] text-red-400 font-medium">{dissidentAnalysis.biasCounts['right'].length} droite</span>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {/* Sources dissidentes */}
                        {dissidentAnalysis && dissidentAnalysis.dissidents.length > 0 && consensusScore < 85 && (
                          <div className="pt-2 border-t border-white/5 space-y-2">
                            <div className="text-[9px] font-bold uppercase tracking-wider text-amber-500/80 flex items-center gap-1.5">
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                                <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                              </svg>
                              {dissidentAnalysis.dissidents.length === 1 ? 'Source qui se démarque' : 'Sources qui se démarquent'}
                            </div>
                            <div className="space-y-1.5">
                              {dissidentAnalysis.dissidents.slice(0, 3).map((source, idx) => (
                                <div key={idx} className="flex items-center gap-2 p-2 rounded-lg bg-white/5">
                                  <img src={source.logoUrl} alt={source.name} className="w-5 h-5 rounded-full object-cover bg-white/10" />
                                  <div className="flex-1 min-w-0">
                                    <div className="text-[10px] text-white/90 font-medium truncate">{source.name}</div>
                                    <div className={`text-[8px] uppercase tracking-wider ${source.bias === 'left' ? 'text-blue-400' : source.bias === 'right' ? 'text-red-400' : 'text-gray-400'}`}>
                                      {source.bias === 'left' ? 'Gauche' : source.bias === 'right' ? 'Droite' : 'Centre'}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        {/* Consensus fort */}
                        {consensusScore >= 85 && (
                          <div className="pt-2 border-t border-white/5">
                            <div className="flex items-center gap-2 text-[10px] text-emerald-400">
                              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                              </svg>
                              <span className="font-medium">Fort accord entre les sources</span>
                            </div>
                          </div>
                        )}
                        
                        <div className="pt-2 border-t border-white/5">
                          <div className="flex items-center justify-between text-[10px]">
                            <span className="text-gray-500">Sources analysées</span>
                            <span className="text-white/80 font-medium">{verifiedSources.length}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Headline with Enhanced Readability */}
                  <EnhancedHeadline className="text-3xl sm:text-4xl lg:text-5xl font-serif font-black leading-[1.1] text-white tracking-tight break-words px-2 text-balance line-clamp-3 md:line-clamp-4">
                    {article.headline.replace(/[\u{1F300}-\u{1F9FF}]/gu, '')}
                  </EnhancedHeadline>
                </div>

                {/* TEXT CARD */}
                <div className="glass-panel rounded-[24px] lg:rounded-[32px] px-6 pt-6 pb-4 lg:px-8 lg:pt-8 lg:pb-6 relative flex flex-col gap-2 overflow-hidden pointer-events-auto shrink-0">
                  
                  {/* Share Button - Top Right */}
                  <button
                    onClick={handleShareArticle}
                    className="absolute top-4 right-4 flex items-center justify-center w-8 h-8 rounded-full hover:bg-white/5 transition-all duration-300 active:scale-90 text-white/40 hover:text-white z-20"
                    aria-label="Partager"
                  >
                    <ShareIcon className="w-4 h-4" strokeWidth={2} />
                  </button>

                  <div className="relative flex flex-col pr-10">
                    <p
                      onClick={() => setIsDetailModalOpen(true)}
                      className="text-[16px] lg:text-[18px] text-white/85 font-sans leading-relaxed break-words cursor-pointer hover:text-white transition-colors font-normal tracking-wide antialiased line-clamp-4 sm:line-clamp-5 lg:line-clamp-6"
                    >
                      {renderFormattedText(article.summary)}
                    </p>
                  </div>
                  <div className="flex justify-end mt-1">
                    <button
                      type="button"
                      onClick={() => setIsDetailModalOpen(true)}
                      className="flex items-center gap-1.5 text-[9px] font-bold uppercase tracking-widest text-white/35 hover:text-white/70 transition-all group"
                      aria-label="Voir le détail"
                    >
                      <span>Voir le détail</span>
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2.5} stroke="currentColor" className="w-2.5 h-2.5 group-hover:translate-x-0.5 transition-transform">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                      </svg>
                    </button>
                  </div>

                  {/* SOURCES INTEGRATION */}
                  <div className="pt-3 pb-1 relative z-10">
                    <BiasAnalysisDisplay
                      analysis={article.biasAnalysis}
                      sources={article.sources}
                      onSourceSelect={setSelectedSource}
                      onShowSources={() => setIsSourceListOpen(true)}
                      className="w-full"
                    />
                  </div>

                  {/* FOOTER ACTION BAR */}
                  <div className="flex items-center justify-between pt-2">
                    {/* Left: Date/Live */}
                    <div className="flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.2em] text-white/30">
                      {isLive ? (
                        <div className="flex items-center gap-2 text-red-500">
                          <span className="relative flex h-1.5 w-1.5">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-red-500"></span>
                          </span>
                          <span>En Direct</span>
                        </div>
                      ) : (
                        <span>{displayDate}</span>
                      )}
                    </div>

                    {/* Right: All action buttons grouped */}
                    <div className="flex items-center gap-1">
                      {/* AI/Sparkles Button */}
                      <button
                        onClick={(e) => { e.stopPropagation(); onChatOpen(); }}
                        className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-white/5 transition-all duration-300 active:scale-90 text-white/40 hover:text-white"
                        aria-label="Comprendre avec l'IA"
                      >
                        <SparklesIcon className="w-4 h-4" />
                      </button>

                      {/* ActionButtons (Reactions) */}
                      <ActionButtons
                        article={article}
                        className="gap-1"
                        minimal={true}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* RIGHT COLUMN (IMAGE CARD) - Desktop only */}
              <div className="hidden lg:flex w-[400px] lg:w-[480px] shrink-0 rounded-[32px] overflow-hidden shadow-[0_50px_100px_-20px_rgba(0,0,0,0.7)] border border-white/10 group transform transition-all duration-700 hover:scale-[1.01] relative aspect-[3/4] min-h-[400px]">
                {/* Image générée par Gemini */}
                {imageSrc && !imageError && (
                  <img
                    src={imageSrc}
                    alt="Article Poster"
                    onLoad={() => setImageLoaded(true)}
                    onError={handleImageError}
                    className={`absolute inset-0 w-full h-full object-cover object-top transition-all duration-1000 group-hover:scale-105 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                  />
                )}
                
                {/* Fallback : Mosaïque des logos des sources */}
                {(!imageSrc || imageError) && sourceLogos.length > 0 && (
                  <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center p-8">
                    <div className="grid grid-cols-3 gap-4 max-w-[280px]">
                      {sourceLogos.map((logo, i) => (
                        <div 
                          key={i} 
                          className="aspect-square bg-white/10 rounded-xl p-3 flex items-center justify-center backdrop-blur-sm border border-white/5 hover:border-white/20 transition-all"
                        >
                          <img 
                            src={logo} 
                            alt="" 
                            className="w-full h-full object-contain opacity-80 grayscale hover:grayscale-0 hover:opacity-100 transition-all"
                            onError={(e) => (e.currentTarget.style.display = 'none')}
                          />
                        </div>
                      ))}
                    </div>
                    <div className="absolute bottom-6 left-0 right-0 text-center">
                      <span className="text-xs text-white/40 font-light tracking-wider uppercase">Sources vérifiées</span>
                    </div>
                  </div>
                )}
                
                {/* Fallback ultime : Emoji de la catégorie */}
                {(!imageSrc || imageError) && sourceLogos.length === 0 && (
                  <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-gray-800 to-black flex items-center justify-center">
                    <span className="text-[120px] opacity-30">{article.emoji || '📰'}</span>
                  </div>
                )}
                
                {/* Loading shimmer */}
                {imageSrc && !imageLoaded && !imageError && (
                  <div className="absolute inset-0 bg-gray-800 animate-pulse">
                    <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent -translate-x-full animate-[shimmer_1.5s_infinite]"></div>
                  </div>
                )}
                
                <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-40 pointer-events-none"></div>
              </div>

            </div>

            {shareFeedback && (
              <div className="absolute top-3 left-1/2 -translate-x-1/2 bg-black/90 px-4 py-1.5 rounded-full border border-white/10 shadow-xl animate-fade-in z-[100]">
                <p className="text-[9px] uppercase tracking-[0.2em] text-white font-bold whitespace-nowrap">
                  {shareFeedback}
                </p>
              </div>
            )}
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
