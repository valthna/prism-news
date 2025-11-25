import React from 'react';

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
  variant?: 'text' | 'circular' | 'rectangular' | 'rounded';
  animation?: 'pulse' | 'wave' | 'none';
}

/**
 * Composant Skeleton pour les états de chargement
 * Inspiré du Material Design mais adapté au style PRISM
 */
export const Skeleton: React.FC<SkeletonProps> = ({
  className = '',
  width,
  height,
  variant = 'text',
  animation = 'wave',
}) => {
  const baseClasses = 'bg-white/5';
  
  const variantClasses = {
    text: 'rounded h-4',
    circular: 'rounded-full',
    rectangular: 'rounded-none',
    rounded: 'rounded-xl',
  };

  const animationClasses = {
    pulse: 'animate-pulse',
    wave: 'skeleton',
    none: '',
  };

  const style: React.CSSProperties = {
    width: typeof width === 'number' ? `${width}px` : width,
    height: typeof height === 'number' ? `${height}px` : height,
  };

  return (
    <div
      className={`${baseClasses} ${variantClasses[variant]} ${animationClasses[animation]} ${className}`}
      style={style}
      aria-hidden="true"
      role="presentation"
    />
  );
};

/**
 * Skeleton pour une carte d'article complet
 */
export const ArticleCardSkeleton: React.FC = () => (
  <div className="h-[100dvh] w-full flex-shrink-0 snap-start relative overflow-hidden bg-black flex flex-col">
    {/* Background gradient */}
    <div className="absolute inset-0 bg-gradient-to-br from-gray-900 via-black to-gray-900" />
    
    {/* Content overlay */}
    <div className="absolute inset-0 z-30 flex flex-col justify-end p-5 md:p-12 pb-safe-bottom">
      <div className="w-full max-w-7xl mx-auto">
        {/* Category badge skeleton */}
        <div className="flex items-center gap-4 mb-4">
          <Skeleton width={120} height={32} variant="rounded" />
          <Skeleton width={80} height={32} variant="rounded" />
        </div>
        
        {/* Headline skeleton */}
        <div className="space-y-3 mb-6">
          <Skeleton height={40} className="w-full" variant="rounded" />
          <Skeleton height={40} className="w-4/5" variant="rounded" />
          <Skeleton height={40} className="w-2/3" variant="rounded" />
        </div>
        
        {/* Card skeleton */}
        <div className="glass-panel rounded-[24px] p-6 space-y-4">
          {/* Summary */}
          <div className="space-y-2">
            <Skeleton height={20} className="w-full" />
            <Skeleton height={20} className="w-full" />
            <Skeleton height={20} className="w-3/4" />
          </div>
          
          {/* Sources bar */}
          <div className="flex items-center justify-between pt-4">
            <Skeleton width={80} height={24} variant="rounded" />
            <div className="flex-1 mx-4">
              <Skeleton height={10} variant="rounded" />
              <div className="flex justify-between mt-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} width={32} height={32} variant="circular" />
                ))}
              </div>
            </div>
          </div>
          
          {/* Footer */}
          <div className="flex items-center justify-between pt-4 border-t border-white/10">
            <Skeleton width={60} height={16} />
            <div className="flex gap-2">
              <Skeleton width={32} height={32} variant="circular" />
              <Skeleton width={32} height={32} variant="circular" />
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
);

/**
 * Skeleton pour la barre de sources
 */
export const SourcesBarSkeleton: React.FC = () => (
  <div className="flex items-center gap-3">
    <Skeleton width={80} height={24} variant="rounded" />
    <div className="flex-1 relative h-10">
      <Skeleton height={10} className="absolute top-1/2 -translate-y-1/2 w-full" variant="rounded" />
      <div className="absolute top-1/2 -translate-y-1/2 flex justify-around w-full">
        {[...Array(6)].map((_, i) => (
          <Skeleton key={i} width={32} height={32} variant="circular" />
        ))}
      </div>
    </div>
  </div>
);

/**
 * Skeleton pour un message de chat
 */
export const ChatMessageSkeleton: React.FC<{ isUser?: boolean }> = ({ isUser = false }) => (
  <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
    <div className={`max-w-[85%] p-4 rounded-2xl ${isUser ? 'bg-neon-accent/20 rounded-br-md' : 'bg-white/5 rounded-bl-md'}`}>
      <div className="space-y-2">
        <Skeleton height={14} className={isUser ? 'w-32' : 'w-48'} />
        <Skeleton height={14} className={isUser ? 'w-24' : 'w-40'} />
        {!isUser && <Skeleton height={14} className="w-32" />}
      </div>
    </div>
  </div>
);

/**
 * Skeleton pour la liste de recherche
 */
export const SearchResultSkeleton: React.FC = () => (
  <div className="space-y-4 p-4">
    {[...Array(4)].map((_, i) => (
      <div key={i} className="flex items-start gap-4 p-4 rounded-2xl bg-white/5">
        <Skeleton width={24} height={24} variant="circular" />
        <div className="flex-1 space-y-2">
          <Skeleton height={18} className="w-3/4" />
          <Skeleton height={14} className="w-1/4" />
        </div>
      </div>
    ))}
  </div>
);

export default Skeleton;

