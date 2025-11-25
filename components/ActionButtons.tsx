import React, { useMemo, useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ThumbsUpIcon } from './icons/ThumbsUpIcon';
import { ShareIcon } from './icons/ShareIcon';
import { NewsArticle } from '../types';
import { 
    ReactionType, 
    ReactionCounts,
    getArticleReactions, 
    toggleReaction, 
    getUserReactionForArticle 
} from '../services/reactionsService';

const ActionButton: React.FC<{
    children: React.ReactNode,
    label: string,
    onClick?: () => void,
    extraClass?: string,
    activeColor?: string,
    counter?: number,
    minimal?: boolean
}> = ({ children, label, onClick, extraClass = "", activeColor, counter, minimal }) => {
    const glowStyles: React.CSSProperties | undefined = activeColor
        ? {
            boxShadow: `0 0 2px ${activeColor}50`,
            borderColor: `${activeColor}40`,
        }
        : undefined;

    const ButtonContent = (
        <div className="relative inline-flex items-center gap-0.5">
            <button
                onClick={onClick}
                className={`flex items-center justify-center w-8 h-8 rounded-full hover:bg-white/5 transition-all duration-300 active:scale-90`}
                disabled={!onClick}
                style={glowStyles}
                title={label}
            >
                {/* Content */}
                <div className={`relative z-10 transition-all duration-300 flex items-center justify-center ${activeColor ? 'text-white scale-105' : 'text-white/40 group-hover:text-white group-hover:scale-110'}`}>
                    {React.isValidElement(children)
                        ? React.cloneElement(children as React.ReactElement, {
                            // @ts-ignore
                            className: `${(children.props as any).className || ''} ${children.type === 'svg' || (children.type as any).displayName?.includes('Icon') ? 'w-4 h-4' : 'w-full h-full flex items-center justify-center'}`,
                            strokeWidth: 2
                        })
                        : children
                    }
                </div>
            </button>
            {/* Counter - inline next to button */}
            {counter !== undefined && (
                <span className="text-[10px] font-bold text-white/40 tabular-nums">
                    {counter}
                </span>
            )}
        </div>
    );

    if (minimal) {
        return <div className={`group relative flex flex-col items-center ${extraClass}`}>{ButtonContent}</div>;
    }

    return (
        <div className={`flex flex-col items-center gap-2 group relative ${extraClass}`}>
            {ButtonContent}
        </div>
    );
};

interface ActionButtonsProps {
    article: Pick<NewsArticle, 'id' | 'headline' | 'summary'>;
    className?: string;
    minimal?: boolean;
}

type ReactionConfig = { emoji: string; label: string; id: ReactionType; color: string; glowColor: string };

const REACTION_CONFIGS: ReactionConfig[] = [
    { emoji: '🔥', label: 'Top', id: 'fire', color: 'text-orange-500', glowColor: '#f97316' },
    { emoji: '🤯', label: 'Choc', id: 'shock', color: 'text-purple-400', glowColor: '#a855f7' },
    { emoji: '🤔', label: 'Doute', id: 'doubt', color: 'text-yellow-400', glowColor: '#eab308' },
    { emoji: '😡', label: 'Colère', id: 'angry', color: 'text-red-500', glowColor: '#ef4444' },
    { emoji: '👏', label: 'Bravo', id: 'clap', color: 'text-green-400', glowColor: '#22c55e' },
];

const ActionButtons: React.FC<ActionButtonsProps> = ({ article, className = "", minimal }) => {
    const reactions = useMemo(() => REACTION_CONFIGS, []);

    const [showReactions, setShowReactions] = useState(false);
    const [selectedReaction, setSelectedReaction] = useState<ReactionConfig | null>(null);
    const [animateReaction, setAnimateReaction] = useState(false);
    const [communityReactionCounts, setCommunityReactionCounts] = useState<ReactionCounts>({
        fire: 0,
        shock: 0,
        doubt: 0,
        angry: 0,
        clap: 0
    });
    const [isLoading, setIsLoading] = useState(true);
    const [isShaking, setIsShaking] = useState(false);
    const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const triggerRef = useRef<HTMLDivElement>(null);
    const popoverRef = useRef<HTMLDivElement>(null);
    const [popoverCoords, setPopoverCoords] = useState<{ top: number; left: number } | null>(null);
    const [popoverPlacement, setPopoverPlacement] = useState<'top' | 'bottom'>('top');

    const isRow = className.includes('flex-row');

    // Load reactions from database on mount
    useEffect(() => {
        const loadReactions = async () => {
            setIsLoading(true);
            try {
                // Load community counts from database
                const counts = await getArticleReactions(article.id);
                setCommunityReactionCounts(counts);
                
                // Restore user's previous reaction from localStorage
                const userReaction = getUserReactionForArticle(article.id);
                if (userReaction) {
                    const reactionConfig = reactions.find(r => r.id === userReaction);
                    if (reactionConfig) {
                        setSelectedReaction(reactionConfig);
                    }
                }
            } catch (error) {
                console.error('Failed to load reactions:', error);
            } finally {
                setIsLoading(false);
            }
        };
        
        loadReactions();
    }, [article.id, reactions]);

    const totalCommunityReactions = useMemo(
        () => Object.values(communityReactionCounts).reduce((total, value) => total + value, 0),
        [communityReactionCounts]
    );

    const showReactionCounts = Boolean(selectedReaction);

    const handleReaction = async (r: ReactionConfig) => {
        const previousReaction = selectedReaction;
        const previousReactionType = previousReaction?.id || null;
        const newReactionType = previousReaction?.id === r.id ? null : r.id;

        // Optimistic UI update
        if (previousReaction?.id === r.id) {
            // Removing reaction
            setSelectedReaction(null);
            setCommunityReactionCounts(prevCounts => ({
                ...prevCounts,
                [r.id]: Math.max(0, (prevCounts[r.id] ?? 0) - 1)
            }));
        } else {
            // Adding/changing reaction
            setSelectedReaction(r);
            setAnimateReaction(true);
            setIsShaking(true);
            setTimeout(() => setAnimateReaction(false), 1000);
            setTimeout(() => setIsShaking(false), 300);
            setCommunityReactionCounts(prevCounts => {
                const updated = { ...prevCounts };
                if (previousReaction) {
                    updated[previousReaction.id] = Math.max(0, (updated[previousReaction.id] ?? 0) - 1);
                }
                updated[r.id] = (updated[r.id] ?? 0) + 1;
                return updated;
            });
        }

        // Persist to database
        try {
            const result = await toggleReaction(article.id, newReactionType, previousReactionType);
            if (result.success && result.counts) {
                // Update with actual counts from server
                setCommunityReactionCounts(prevCounts => ({
                    ...prevCounts,
                    ...result.counts
                }));
            }
        } catch (error) {
            console.error('Failed to save reaction:', error);
            // Rollback on error
            setSelectedReaction(previousReaction);
            // Reload counts
            const counts = await getArticleReactions(article.id);
            setCommunityReactionCounts(counts);
        }
    };

    const handleMouseEnter = () => {
        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
        setShowReactions(true);
    };

    const handleMouseLeave = () => {
        if (hoverTimeoutRef.current) clearTimeout(hoverTimeoutRef.current);
        hoverTimeoutRef.current = setTimeout(() => {
            setShowReactions(false);
        }, 220);
    };

    const updatePopoverPosition = useCallback(() => {
        if (!showReactions) return;
        if (typeof window === 'undefined') return;
        const triggerEl = triggerRef.current;
        const popoverEl = popoverRef.current;
        if (!triggerEl || !popoverEl) return;

        const triggerRect = triggerEl.getBoundingClientRect();
        const popoverWidth = popoverEl.offsetWidth || popoverEl.getBoundingClientRect().width;
        const popoverHeight = popoverEl.offsetHeight || popoverEl.getBoundingClientRect().height;
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;
        const gap = 16;
        const horizontalPadding = 12;

        const preferredLeft = triggerRect.left + (triggerRect.width / 2) - (popoverWidth / 2);
        const clampedLeft = Math.min(
            viewportWidth - horizontalPadding - popoverWidth,
            Math.max(horizontalPadding, preferredLeft)
        );

        const spaceAbove = triggerRect.top - gap;
        const spaceBelow = viewportHeight - triggerRect.bottom - gap;
        const canOpenAbove = spaceAbove >= popoverHeight;
        const canOpenBelow = spaceBelow >= popoverHeight;
        const openOnTop = canOpenAbove || !canOpenBelow;

        const top = openOnTop
            ? Math.max(gap, triggerRect.top - popoverHeight - gap)
            : Math.min(viewportHeight - gap - popoverHeight, triggerRect.bottom + gap);

        setPopoverCoords({ top, left: clampedLeft });
        setPopoverPlacement(openOnTop ? 'top' : 'bottom');
    }, [showReactions]);

    useLayoutEffect(() => {
        if (!showReactions) return;
        updatePopoverPosition();
        const handleWindowChange = () => updatePopoverPosition();

        window.addEventListener('resize', handleWindowChange);
        window.addEventListener('scroll', handleWindowChange, true);
        return () => {
            window.removeEventListener('resize', handleWindowChange);
            window.removeEventListener('scroll', handleWindowChange, true);
        };
    }, [showReactions, updatePopoverPosition]);

    useEffect(() => {
        return () => {
            if (hoverTimeoutRef.current) {
                clearTimeout(hoverTimeoutRef.current);
            }
        };
    }, []);

    useEffect(() => {
        if (!showReactions) {
            setPopoverCoords(null);
            return;
        }

        const handlePointerDown = (event: PointerEvent) => {
            const target = event.target as Node;
            if (popoverRef.current?.contains(target)) return;
            if (triggerRef.current?.contains(target)) return;
            setShowReactions(false);
        };

        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                setShowReactions(false);
            }
        };

        document.addEventListener('pointerdown', handlePointerDown);
        document.addEventListener('keydown', handleKeyDown);

        return () => {
            document.removeEventListener('pointerdown', handlePointerDown);
            document.removeEventListener('keydown', handleKeyDown);
        };
    }, [showReactions]);

    const portalTarget = typeof document !== 'undefined' ? document.body : null;

    const reactionPopover = portalTarget && showReactions
        ? createPortal(
            <div
                ref={popoverRef}
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
                className={`
                    fixed z-[1200] flex items-center gap-1.5 p-1.5 pr-2.5 pl-2.5
                    bg-black/85 backdrop-blur-xl rounded-full border border-white/15
                    shadow-[0_12px_40px_rgba(0,0,0,0.6)]
                    transition-transform transition-opacity duration-200
                    ${popoverPlacement === 'top' ? 'origin-bottom' : 'origin-top'}
                `}
                style={{
                    top: popoverCoords?.top ?? -9999,
                    left: popoverCoords?.left ?? -9999,
                    visibility: popoverCoords ? 'visible' : 'hidden'
                }}
            >
                {reactions.map((r) => {
                    const count = communityReactionCounts[r.id] ?? 0;
                    const isSelected = selectedReaction?.id === r.id;
                    return (
                        <button
                            key={r.id}
                            onClick={(e) => {
                                e.stopPropagation();
                                handleReaction(r);
                                updatePopoverPosition();
                            }}
                            className="group/emoji relative p-1.5 rounded-full hover:bg-white/10 transition-all duration-200 flex flex-col items-center"
                        >
                            <span className={`
                                block text-2xl transform transition-transform duration-300 cubic-bezier(0.34, 1.56, 0.64, 1)
                                group-hover/emoji:scale-125 group-hover/emoji:-translate-y-1 group-active/emoji:scale-95
                                ${isSelected ? 'scale-110 drop-shadow-glow' : 'scale-100 grayscale-[0.3] hover:grayscale-0'}
                            `}>
                                {r.emoji}
                            </span>

                            <span className="text-[9px] font-bold text-white/50 mt-0.5 tabular-nums group-hover/emoji:text-white transition-colors min-h-[14px]">
                                {selectedReaction && count > 0 ? count : ''}
                            </span>

                            {/* Label au survol */}
                            <span className={`
                                absolute -top-8 left-1/2 -translate-x-1/2 
                                text-[9px] font-bold uppercase tracking-widest 
                                bg-black/90 px-2 py-1 rounded text-white border border-white/10
                                opacity-0 group-hover/emoji:opacity-100 
                                transition-all duration-200 pointer-events-none
                                whitespace-nowrap transform translate-y-1 group-hover/emoji:translate-y-0
                            `}>
                                {r.label}
                            </span>
                        </button>
                    );
                })}
            </div>,
            portalTarget
        )
        : null;

    return (
        <>
            <div className={`flex ${minimal ? 'flex-row' : (isRow ? 'flex-row' : 'flex-col')} items-center gap-4 relative z-40 ${className}`}>
                {animateReaction && selectedReaction && (
                    <div className="absolute bottom-16 right-0 z-50 pointer-events-none w-full flex justify-center">
                        <div className="relative">
                            <span className="absolute text-4xl animate-float-main filter drop-shadow-lg">
                                {selectedReaction.emoji}
                            </span>
                            <span className="absolute text-2xl animate-float-left opacity-0 delay-75">
                                {selectedReaction.emoji}
                            </span>
                            <span className="absolute text-2xl animate-float-right opacity-0 delay-100">
                                {selectedReaction.emoji}
                            </span>
                        </div>
                    </div>
                )}

                <div
                    className="relative"
                    ref={triggerRef}
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                >
                    <div className={`${isShaking ? 'animate-shake' : ''}`}>
                        <ActionButton
                            label={selectedReaction ? "VOTÉ" : "RÉAGIR"}
                            onClick={() => setShowReactions(!showReactions)}
                            activeColor={selectedReaction?.glowColor}
                            counter={totalCommunityReactions}
                            minimal={minimal}
                        >
                            <div className={`flex items-center justify-center transform transition-transform duration-300 ${animateReaction ? 'scale-125' : ''}`}>
                                {selectedReaction ? (
                                    <span className="text-[1.35rem] leading-none filter drop-shadow-glow animate-pop-in pt-[1px]">
                                        {selectedReaction.emoji}
                                    </span>
                                ) : (
                                    <ThumbsUpIcon className="w-5 h-5" strokeWidth={2} />
                                )}
                            </div>
                        </ActionButton>
                    </div>
                </div>
                {reactionPopover}

                <style>{`
                @keyframes float-main {
                    0% { transform: translateY(0) scale(0.5); opacity: 0; }
                    20% { transform: translateY(-40px) scale(1.5); opacity: 1; }
                    100% { transform: translateY(-100px) scale(1); opacity: 0; }
                }
                @keyframes float-left {
                    0% { transform: translate(0, 0) scale(0.5); opacity: 0; }
                    30% { transform: translate(-20px, -30px) scale(1); opacity: 0.8; }
                    100% { transform: translate(-40px, -80px) scale(0.5); opacity: 0; }
                }
                @keyframes float-right {
                    0% { transform: translate(0, 0) scale(0.5); opacity: 0; }
                    30% { transform: translate(20px, -30px) scale(1); opacity: 0.8; }
                    100% { transform: translate(40px, -80px) scale(0.5); opacity: 0; }
                }
                @keyframes pop-in {
                    0% { transform: scale(0); }
                    50% { transform: scale(1.5); }
                    100% { transform: scale(1); }
                }
                @keyframes shake {
                    0%, 100% { transform: translateX(0); }
                    25% { transform: translateX(-4px) rotate(-4deg); }
                    75% { transform: translateX(4px) rotate(4deg); }
                }
                .animate-float-main { animation: float-main 1s cubic-bezier(0.23, 1, 0.32, 1) forwards; }
                .animate-float-left { animation: float-left 1s cubic-bezier(0.23, 1, 0.32, 1) forwards; }
                .animate-float-right { animation: float-right 1s cubic-bezier(0.23, 1, 0.32, 1) forwards; }
                .animate-pop-in { animation: pop-in 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) forwards; }
                .animate-shake { animation: shake 0.3s cubic-bezier(.36,.07,.19,.97) both; }
            `}</style>
            </div>
        </>
    );
};

export default ActionButtons;
