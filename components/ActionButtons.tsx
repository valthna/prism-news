import React, { useMemo, useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { ThumbsUpIcon } from './icons/ThumbsUpIcon';
import { ShareIcon } from './icons/ShareIcon';
import { NewsArticle } from '../types';

// Icône "Avis/Debate"
const OpinionIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
    </svg>
);
OpinionIcon.displayName = 'OpinionIcon';

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
            boxShadow: `0 0 24px ${activeColor}`,
            borderColor: activeColor,
        }
        : undefined;

    const ButtonContent = (
        <div className="relative inline-flex flex-col items-center gap-1">
            <button
                onClick={onClick}
                className={`flex items-center justify-center w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 backdrop-blur-md border border-white/5 relative disabled:opacity-50 transition-all duration-300 active:scale-90`}
                disabled={!onClick}
                style={glowStyles}
                title={label}
            >
                {/* Content */}
                <div className={`relative z-10 transition-all duration-300 flex items-center justify-center ${activeColor ? 'text-white scale-105' : 'text-gray-300 group-hover:text-white group-hover:scale-110'}`}>
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
             <span className="text-[8px] font-bold uppercase tracking-wider text-gray-400 group-hover:text-white transition-colors duration-200 opacity-0 group-hover:opacity-100 translate-y-1 group-hover:translate-y-0 absolute top-full mt-1 whitespace-nowrap">
                {label}
            </span>

            {/* Counter Badge */}
            {counter !== undefined && (
                <div className="pointer-events-none absolute -top-1 -right-1 bg-white text-black text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-xl border border-black/10 transform scale-100 transition-transform duration-200 z-20 min-w-[18px] text-center">
                    {counter}
                </div>
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

interface CommunityStats {
    positive: number;
    negative: number;
}

interface ActionButtonsProps {
    article: Pick<NewsArticle, 'headline' | 'summary'>;
    onShowSentiment: () => void;
    className?: string;
    communityStats?: CommunityStats;
}

const ActionButtons: React.FC<ActionButtonsProps> = ({ article, onShowSentiment, className = "", communityStats, minimal }) => {
    const reactions = useMemo(() => ([
        { emoji: '🔥', label: 'Top', id: 'fire', color: 'text-orange-500', glowColor: '#f97316' },
        { emoji: '🤯', label: 'Choc', id: 'shock', color: 'text-purple-400', glowColor: '#a855f7' },
        { emoji: '🤔', label: 'Doute', id: 'doubt', color: 'text-yellow-400', glowColor: '#eab308' },
        { emoji: '😡', label: 'Colère', id: 'angry', color: 'text-red-500', glowColor: '#ef4444' },
        { emoji: '👏', label: 'Bravo', id: 'clap', color: 'text-green-400', glowColor: '#22c55e' },
    ]), []);

    const [showReactions, setShowReactions] = useState(false);
    const [selectedReaction, setSelectedReaction] = useState<{ emoji: string, label: string, color: string, id: string, glowColor: string } | null>(null);
    const [animateReaction, setAnimateReaction] = useState(false);
    const [communityReactionCounts, setCommunityReactionCounts] = useState<Record<string, number>>(() => {
        const counts: Record<string, number> = {};
        reactions.forEach((reaction) => {
            counts[reaction.id] = Math.floor(Math.random() * 160) + 40;
        });
        return counts;
    });
    const [isShaking, setIsShaking] = useState(false);
    const hoverTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const triggerRef = useRef<HTMLDivElement>(null);
    const popoverRef = useRef<HTMLDivElement>(null);
    const [popoverCoords, setPopoverCoords] = useState<{ top: number; left: number } | null>(null);
    const [popoverPlacement, setPopoverPlacement] = useState<'top' | 'bottom'>('top');

    const isRow = className.includes('flex-row');

    const totalCommunityReactions = useMemo(
        () => Object.values(communityReactionCounts).reduce((total, value) => total + value, 0),
        [communityReactionCounts]
    );

    const showReactionCounts = Boolean(selectedReaction);

    const handleReaction = (r: typeof reactions[0]) => {
        const previousReaction = selectedReaction;

        if (previousReaction?.id === r.id) {
            setSelectedReaction(null);
            setCommunityReactionCounts(prevCounts => {
                const updated = { ...prevCounts };
                updated[r.id] = Math.max(0, (updated[r.id] ?? 0) - 1);
                return updated;
            });
        } else {
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

                <ActionButton label="DÉBAT" onClick={onShowSentiment} minimal={minimal}>
                    <OpinionIcon className="w-4 h-4" strokeWidth={2} />
                </ActionButton>

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
