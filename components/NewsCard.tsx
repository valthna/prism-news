
import React, { useState, useEffect, useRef } from 'react';
import { NewsArticle, Source, UserComment } from '../types';
import BiasAnalysisDisplay from './BiasAnalysisDisplay';
import ActionButtons from './ActionButtons';
import SourceDetailModal from './SourceDetailModal';
import SourceListModal from './SourceListModal';
import SentimentModal from './SentimentModal';
import HideInterfaceButton from './HideInterfaceButton';
import ArticleDetailModal from './ArticleDetailModal';
import { ChatIcon } from './icons/ChatIcon';

interface NewsCardProps {
  article: NewsArticle;
  onVisible: (articleId: string) => void;
  onChatOpen: () => void;
  isInterfaceHidden: boolean;
}

const NewsCard: React.FC<NewsCardProps> = ({ article, onVisible, onChatOpen, isInterfaceHidden }) => {
  const [selectedSource, setSelectedSource] = useState<Source | null>(null);
  const [isSourceListOpen, setIsSourceListOpen] = useState(false);
  const [isSentimentModalOpen, setIsSentimentModalOpen] = useState(false);
  const [isDetailModalOpen, setIsDetailModalOpen] = useState(false);
  const [localComments, setLocalComments] = useState<UserComment[]>(article.comments || []);

  // Style spécifique pour les caricatures satiriques
  const caricatureStyle = ", political satire cartoon, editorial illustration, black ink drawing style, caricature, bold lines, French press cartoon style (Plantu, Cabu), high contrast, minimalist, newspaper editorial";

  // URL de secours avec Pollinations (rapide et fiable)
  const pollinationsUrl = `https://image.pollinations.ai/prompt/${encodeURIComponent(article.imagePrompt + caricatureStyle)}?width=1920&height=1080&nologo=true&model=flux-pro&enhance=true&safe=true&seed=${article.id}`;

  // Utiliser imageUrl si elle existe (http:// ou data:// pour Gemini), sinon Pollinations
  const initialSrc = (article.imageUrl && (article.imageUrl.startsWith('http') || article.imageUrl.startsWith('data:')))
    ? article.imageUrl
    : pollinationsUrl;
  const [imageSrc, setImageSrc] = useState<string>(initialSrc);
  const [imageLoaded, setImageLoaded] = useState(false);

  const cardRef = useRef<HTMLDivElement>(null);
  const [isIntersecting, setIsIntersecting] = useState(false);

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

  const isLive = article.publishedAt?.toUpperCase().includes('DIRECT') || article.publishedAt?.toUpperCase().includes('LIVE');
  const displayDate = article.publishedAt || "RÉCENT";

  return (
    <>
      <div
        ref={cardRef}
        className="h-screen w-full flex-shrink-0 snap-start relative overflow-hidden bg-black flex flex-col"
      >
        {/* --- BACKGROUND LAYERS --- */}
        <div className="absolute inset-0 z-0">
          <div className="absolute inset-0 bg-gray-900" />
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

        {/* Mobile-Only Immersive Background */}
        <div className="absolute inset-0 z-0 lg:hidden">
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
          <div className="absolute inset-x-0 top-0 h-3/4 bg-gradient-to-b from-black via-black/60 to-transparent opacity-90 z-10"></div>
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black via-black/80 to-transparent z-10"></div>
        </div>


        {/* --- MAIN CONTENT CONTAINER --- */}
        <div className={`absolute inset-0 z-30 flex flex-col pt-20 lg:pt-16 pb-safe-bottom pointer-events-none transition-opacity duration-300 ${isInterfaceHidden ? 'opacity-0 pointer-events-none' : 'opacity-100'}`}>

          {/* 1. HEADLINE SECTION (Mobile Only: Top Left - Now moved to bottom for better UX, so hidden here) */}
          {/* We keep the container for structure but move content to specific mobile/desktop sections */}


          {/* 2. DESKTOP SPLIT CONTENT (Hidden on Mobile) */}
          <div className="hidden lg:grid grid-cols-12 gap-12 px-16 h-full items-center pointer-events-auto max-w-[1920px] mx-auto w-full">

            {/* LEFT COL: Editorial Content (5 Cols) */}
            <div className="col-span-5 flex flex-col justify-center h-full max-h-[85vh] py-12 relative z-20">

              {/* Header / Metadata */}
              <div className="flex items-center gap-4 mb-8">
                <div className="center-perfect w-10 h-10 rounded-full bg-white/5 border border-white/10 shadow-[0_0_20px_rgba(255,255,255,0.05)] text-xl">
                  {article.emoji}
                </div>
                <div className="flex flex-col">
                  <span className="text-[9px] font-bold uppercase tracking-[0.25em] text-neon-accent mb-1">Synthèse Prism</span>
                  <div className={`inline-flex items-center gap-2`}>
                    {isLive && <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse"></div>}
                    <span className="text-[10px] font-mono text-gray-400 uppercase tracking-widest">{displayDate}</span>
                  </div>
                </div>
              </div>

              {/* Headline (Desktop) */}
              <h1 className="text-5xl xl:text-6xl 2xl:text-7xl font-serif font-bold leading-[1.05] text-white mb-8 drop-shadow-2xl tracking-tight">
                {article.headline}
              </h1>

              {/* Summary - Clean Text */}
              <div className="mb-10 pl-6 border-l-2 border-neon-accent/50">
                <p className="text-lg xl:text-xl text-gray-300 font-light leading-relaxed font-serif">
                  {article.summary}
                </p>
              </div>

              {/* Integrated Actions & Bias */}
              <div className="mt-auto flex flex-col gap-6">
                {/* Bias Analysis - Compact Bar */}
                <div className="w-full">
                  <BiasAnalysisDisplay
                    analysis={article.biasAnalysis}
                    sources={article.sources}
                    onSourceSelect={setSelectedSource}
                    onShowSources={() => setIsSourceListOpen(true)}
                    className="w-full bg-transparent border-0 shadow-none p-0"
                  />
                </div>

                {/* Action Row */}
                <div className="flex items-center gap-6 pt-6 border-t border-white/10">
                  <button onClick={onChatOpen} className="glass-button px-6 py-3 rounded-full flex items-center gap-3 group/ai hover:bg-neon-accent/10 hover:border-neon-accent/30 transition-all">
                    <ChatIcon className="w-4 h-4 text-neon-accent group-hover/ai:scale-110 transition-transform" />
                    <span className="text-[10px] font-bold uppercase tracking-widest text-white group-hover/ai:text-neon-accent transition-colors">Discuter avec l'IA</span>
                  </button>

                  <div className="h-8 w-px bg-white/10"></div>

                  <ActionButtons
                    article={article}
                    onShowSentiment={() => setIsSentimentModalOpen(true)}
                    className="flex-row gap-4"
                  />
                </div>
              </div>
            </div>

            {/* RIGHT COL: Poster Image (7 Cols) */}
            <div className="col-span-7 h-full max-h-[85vh] py-8 flex items-center justify-center perspective-[2000px] group animate-float min-h-0">
              <div className="relative w-full h-full rounded-[24px] overflow-hidden shadow-[0_30px_60px_-15px_rgba(0,0,0,0.8)] border border-white/10 bg-gray-900 transform transition-transform duration-500 group-hover:scale-[1.01] group-hover:-rotate-1">
                {/* Glowing Backlight */}
                <div className="absolute -inset-4 bg-gradient-to-tr from-neon-accent/20 to-purple-500/20 rounded-[3rem] blur-3xl opacity-40 group-hover:opacity-80 transition-opacity duration-700"></div>

                <img
                  src={imageSrc}
                  alt="Article Poster"
                  className="absolute inset-0 w-full h-full object-cover z-10"
                />

                {/* Overlays */}
                <div className="absolute inset-0 bg-noise opacity-20 mix-blend-overlay z-20"></div>
                <div className="absolute inset-0 shadow-[inset_0_0_150px_rgba(0,0,0,0.6)] z-20"></div>

                {/* Caption */}
                <div className="absolute bottom-8 right-8 z-30">
                  <div className="inline-block px-4 py-2 bg-black/60 backdrop-blur-xl border border-white/10 rounded-xl max-w-full">
                    <span className="text-xs font-mono text-gray-300 uppercase tracking-widest truncate block">Fig. 01 — {article.sources[0]?.name}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 3. MOBILE CONTENT (Hidden on Desktop) */}
          <div className="lg:hidden flex-1 px-5 flex flex-col justify-end pb-32 pointer-events-auto z-40">

            {/* Mobile Headline (Bottom) */}
            <div className="mb-5">
              <div className="inline-flex items-center gap-2 mb-3 px-2.5 py-1 rounded-md bg-black/30 backdrop-blur-sm border border-white/10">
                <span className="text-base">{article.emoji}</span>
                <span className="text-[9px] font-bold uppercase tracking-[0.15em] text-gray-400">Prism</span>
              </div>
              <h1 className="text-[2rem] sm:text-4xl font-serif font-bold leading-[1.1] text-white drop-shadow-2xl line-clamp-3 prism-title-effect">
                {article.headline}
              </h1>
            </div>

            <div
              onClick={() => setIsDetailModalOpen(true)}
              className="glass-panel rounded-2xl p-5 relative flex flex-col gap-4 shadow-2xl mb-4 bg-black/70 backdrop-blur-2xl border-white/15 cursor-pointer hover:bg-black/60 transition-all active:scale-[0.99]"
            >
              <p className="text-[15px] text-gray-100 font-serif leading-[1.6] line-clamp-4">
                {article.summary}
              </p>
              <div className="flex justify-between items-center pt-3 border-t border-white/10">
                <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-gray-300 font-mono">{displayDate}</span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onChatOpen();
                  }}
                  className="glass-button px-5 py-2.5 rounded-full flex items-center gap-2.5 min-h-[44px] active:scale-95 transition-transform"
                >
                  <ChatIcon className="w-4 h-4 text-neon-accent" />
                  <span className="text-[10px] font-bold uppercase text-white tracking-wider">Comprendre</span>
                </button>
              </div>
            </div>

            <div className="flex flex-row items-stretch justify-end gap-3 h-full max-h-[160px]">
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
              />
            </div>
          </div>

          {/* 4. DESKTOP ACTIONS (Now Integrated in Left Col, so hidden here) */}
          {/* Removed to avoid duplication */}

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
