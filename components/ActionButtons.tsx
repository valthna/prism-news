import React, { useMemo, useState } from 'react';
import { ThumbsUpIcon } from './icons/ThumbsUpIcon';
import { ShareIcon } from './icons/ShareIcon';
import { NewsArticle } from '../types';

// Icône "Avis/Debate"
const OpinionIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.8} stroke="currentColor" {...props}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
    </svg>
);

const ActionButton: React.FC<{
    children: React.ReactNode,
    label: string,
    onClick?: () => void,
    extraClass?: string,
    activeColor?: string,
    counter?: number
}> = ({ children, label, onClick, extraClass = "", activeColor, counter }) => {
    const glowStyles: React.CSSProperties | undefined = activeColor
        ? {
            boxShadow: `0 0 24px ${activeColor}`,
            borderColor: activeColor,
        }
        : undefined;

    const glowOverlayStyle: React.CSSProperties | undefined = activeColor
        ? { backgroundColor: activeColor }
        : undefined;

    return (
        <button
            onClick={onClick}
            className={`flex flex-col items-center text-white space-y-2 group disabled:opacity-50 relative ${extraClass}`}
            disabled={!onClick}
        >
            <div className="relative">
                <div className={`
                center-perfect 
                relative p-3.5 rounded-2xl 
                min-w-[48px] min-h-[48px]
                bg-white/10 backdrop-blur-xl 
                border border-white/20 
                shadow-[0_8px_24px_rgba(0,0,0,0.4)] 
                group-hover:bg-white/20 group-hover:border-white/40 
                group-hover:shadow-[0_12px_32px_rgba(0,0,0,0.5)]
                group-active:scale-[0.92]
                transition-all duration-500 cubic-bezier(0.175, 0.885, 0.32, 1.275) /* Spring physics */
                overflow-hidden
            `} style={glowStyles}>
                {/* Inner Shine */}
                <div className="absolute inset-0 bg-gradient-to-br from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>

                {/* Active Glow Background */}
                {activeColor && (
                    <div className="absolute inset-0 opacity-25 blur-md" style={glowOverlayStyle}></div>
                )}

                {/* Content */}
                <div className={`relative z-10 transition-all duration-300 ${activeColor ? 'text-white scale-105' : 'group-hover:text-neon-accent group-hover:scale-105'}`}>
                    {children}
                </div>
            </div>

            {/* Counter Badge - Absolute Positioned for Alignment */}
            {counter !== undefined && (
                <div className="absolute -top-2 -right-2 bg-white text-black text-[10px] font-bold px-2 py-1 rounded-full shadow-xl border border-black/10 transform scale-0 group-hover:scale-100 transition-transform duration-200 z-20 min-w-[20px] text-center">
                    {counter}
                </div>
            )}
            </div>

            <div className="flex flex-col items-center">
                <span className="text-[10px] font-black uppercase tracking-[0.15em] text-gray-300 group-hover:text-white transition-colors duration-200">
                    {label}
                </span>
            </div>
        </button>
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

const ActionButtons: React.FC<ActionButtonsProps> = ({ article, onShowSentiment, className = "", communityStats }) => {
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
    const hoverTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

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
        hoverTimeoutRef.current = setTimeout(() => {
            setShowReactions(false);
        }, 300);
    };

    return (
        <div className={`flex ${isRow ? 'flex-row' : 'flex-col'} items-center gap-4 relative z-40 ${className}`}>
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

            <div className="flex flex-col items-center gap-2">
                <ActionButton label="DÉBAT" onClick={onShowSentiment}>
                    <OpinionIcon className="w-6 h-6" />
                </ActionButton>
            </div>

            <div className="relative flex flex-col items-center"
                onMouseEnter={handleMouseEnter}
                onMouseLeave={handleMouseLeave}
            >
                <div className={`
                    absolute bottom-full mb-2 
                    ${isRow ? 'left-1/2 -translate-x-1/2' : 'right-0 origin-bottom-right'}
                    flex items-center gap-1 p-2 
                    bg-black/60 backdrop-blur-2xl 
                    rounded-full border border-white/10 
                    shadow-[0_8px_32px_rgba(0,0,0,0.5)] 
                    transition-all duration-300 origin-bottom
                    ${showReactions ? 'opacity-100 scale-100 translate-y-0' : 'opacity-0 scale-75 translate-y-4 pointer-events-none'}
                    z-50
                `}>
                    <div className="absolute top-full left-0 w-full h-4 bg-transparent"></div>

                    {reactions.map((r) => {
                        const count = communityReactionCounts[r.id] ?? 0;
                        return (
                            <button
                                key={r.id}
                                onClick={() => handleReaction(r)}
                                className="group/emoji relative p-2 rounded-full hover:bg-white/10 transition-all duration-200"
                            >
                                <span className={`
                                    block text-2xl transform transition-transform duration-200 cubic-bezier(0.34, 1.56, 0.64, 1)
                                    group-hover/emoji:scale-150 group-hover/emoji:-translate-y-1
                                    ${selectedReaction?.id === r.id ? 'scale-125' : ''}
                                `}>
                                    {r.emoji}
                                </span>
                                <span className={`
                                    absolute -top-8 left-1/2 -translate-x-1/2 
                                    text-[10px] font-bold uppercase tracking-wider 
                                    bg-black px-2 py-1 rounded text-white 
                                    opacity-0 group-hover/emoji:opacity-100 
                                    transition-opacity duration-200 pointer-events-none
                                    whitespace-nowrap
                                `}>
                                    {r.label}
                                </span>
                                {showReactionCounts && (
                                    <span className="absolute -bottom-2 right-0 bg-white text-black text-[9px] font-bold px-1.5 py-0.5 rounded-full shadow-lg border border-black/10 pointer-events-none">
                                        {count.toLocaleString('fr-FR')}
                                    </span>
                                )}
                            </button>
                        );
                    })}
                </div>

                <div className={`${isShaking ? 'animate-shake' : ''}`}>
                    <ActionButton
                        label={selectedReaction ? "VOTÉ" : "RÉAGIR"}
                        onClick={() => setShowReactions(!showReactions)}
                        activeColor={selectedReaction?.glowColor}
                        counter={totalCommunityReactions}
                    >
                        <div className={`transform transition-transform duration-300 ${animateReaction ? 'scale-125' : ''}`}>
                            {selectedReaction ? (
                                <span className="text-xl leading-none filter drop-shadow-glow animate-pop-in">
                                    {selectedReaction.emoji}
                                </span>
                            ) : (
                                <ThumbsUpIcon className="w-6 h-6" />
                            )}
                        </div>
                    </ActionButton>
                </div>

            </div>

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
        </div >
    );
};

export default ActionButtons;
