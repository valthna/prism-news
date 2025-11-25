import React, { useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { BiasAnalysis, Source } from '../types';
import { getMediaOwner, getAllOwnerGroups, type MediaOwnerInfo } from '../constants/mediaOwners';

const getDomainFromUrl = (rawUrl?: string): string | undefined => {
    if (!rawUrl) {
        return undefined;
    }

    const trimmed = rawUrl.trim();
    if (!trimmed) {
        return undefined;
    }

    try {
        const normalized = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
        return new URL(normalized).hostname;
    } catch {
        const sanitized = trimmed.replace(/^[a-z]+:\/\//i, '').split('/')[0];
        return sanitized || undefined;
    }
};

const getFallbackDomain = (source: Source): string => {
    const fromUrl = getDomainFromUrl(source.url);
    if (fromUrl) {
        return fromUrl;
    }

    const fromName = source.name
        ?.toLowerCase()
        .replace(/[^a-z0-9.-]/g, '')
        .replace(/\s+/g, '');

    if (fromName) {
        return fromName.includes('.') ? fromName : `${fromName}.com`;
    }

    return 'news.google.com';
};

interface BiasAnalysisDisplayProps {
    analysis: BiasAnalysis;
    sources: Source[];
    onSourceSelect: (source: Source) => void;
    onShowSources: () => void;
    className?: string;
    mobileReliabilitySlot?: ReactNode;
}

const BiasAnalysisDisplay: React.FC<BiasAnalysisDisplayProps> = ({ analysis, sources, onSourceSelect, onShowSources, className = "", mobileReliabilitySlot }) => {
    const [hoveredSourceId, setHoveredSourceId] = useState<string | null>(null);

    // Filtrer pour n'afficher que les sources vérifiées (qui ont réellement traité le sujet)
    // Détecte aussi les sources "amplifiées" par leurs coverageSummary génériques
    const verifiedSources = useMemo(() => {
        // Patterns typiques des sources amplifiées (générées automatiquement)
        const genericPatterns = [
            /^(décryptage|perspective|contre-enquête|couverture|synthèse|fil d'actualité|lecture|traitement|données|étude|position)/i,
            /\b(par le monde|du guardian|de mediapart|de libération|de l'humanité|de vox|de reuters|associated press|de l'afp|bbc de|de politico|d'axios|par le figaro|du wall street journal|de les échos|the economist|de fox news|new york post|de l'oms|de la banque mondiale|de l'ocde|de l'onu)\b/i,
            / (sur|autour de|concernant|appliquée? à|liée? à|au sujet de|portant sur|consacrée? à) .{5,}\.$/i
        ];
        
        return sources.filter(s => {
            // Si explicitement marqué comme non vérifié, filtrer
            if (s.isVerified === false) return false;
            // Si explicitement marqué comme vérifié, garder
            if (s.isVerified === true) return true;
            // Pour les anciennes données sans le champ, détecter les patterns génériques
            const summary = s.coverageSummary || '';
            const isGeneric = genericPatterns.some(pattern => pattern.test(summary));
            return !isGeneric;
        });
    }, [sources]);

    const positionedSources = useMemo(() => {
        let items = verifiedSources.map(s => ({
            ...s,
            displayPosition: s.position,
        }));

        const BUBBLE_DIAMETER = 12;
        items.sort((a, b) => a.displayPosition - b.displayPosition);

        for (let i = 0; i < 5; i++) {
            for (let j = 0; j < items.length - 1; j++) {
                if (items[j + 1].displayPosition - items[j].displayPosition < BUBBLE_DIAMETER) {
                    const overlap = BUBBLE_DIAMETER - (items[j + 1].displayPosition - items[j].displayPosition);
                    items[j].displayPosition -= overlap / 2;
                    items[j + 1].displayPosition += overlap / 2;
                }
            }
        }
        return items.map(i => ({
            ...i,
            displayPosition: Math.max(5, Math.min(95, i.displayPosition))
        }));
    }, [verifiedSources]);

    return (
        <div className={`flex flex-col h-full justify-center ${className}`}>
            <div className="flex items-center justify-between gap-3 w-full">
                {/* Left side: Source count & Verification badge */}
                <div className="flex flex-col gap-0.5 shrink-0">
                    <button onClick={onShowSources} className="text-[9px] font-bold uppercase tracking-widest text-gray-300 hover:text-white transition-colors text-left">
                        {verifiedSources.length} Sources
                    </button>
                    <div className="group relative flex items-center gap-1 cursor-help w-fit">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 text-green-400/80 group-hover:text-green-400 transition-colors">
                            <path fillRule="evenodd" d="M16.403 12.652a3 3 0 000-5.304 3 3 0 00-3.75-3.751 3 3 0 00-5.305 0 3 3 0 00-3.751 3.75 3 3 0 000 5.305 3 3 0 003.75 3.751 3 3 0 005.305 0 3 3 0 003.751-3.75zm-2.546-4.46a.75.75 0 00-1.214-.883l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                        </svg>
                        <span className="text-[7px] font-bold text-gray-500 group-hover:text-gray-300 transition-colors uppercase tracking-wider">Vérifié</span>
                    </div>
                </div>

                {/* Right side: Spectrum Analysis */}
                <div className="flex-1 relative h-10 select-none mt-1">
                    <div className="absolute top-1/2 left-0 right-0 h-2.5 bg-gradient-to-r from-blue-500/40 via-purple-500/30 to-red-500/40 rounded-full opacity-90 -translate-y-1/2 shadow-inner flex justify-between items-center px-2 border border-white/10">
                        <span className="text-[7px] font-black text-white/70 uppercase tracking-widest z-0">Gauche</span>
                        <span className="text-[7px] font-black text-white/70 uppercase tracking-widest z-0">Droite</span>
                    </div>
                    <div className="absolute top-1/2 left-1/2 w-px h-3.5 bg-white/50 -translate-y-1/2 -translate-x-1/2 z-0"></div>

                    {positionedSources.map((source) => {
                        const fallbackDomain = getFallbackDomain(source);
                        const googleFavicon = `https://www.google.com/s2/favicons?domain=${fallbackDomain}&sz=64`;
                        const isHovered = hoveredSourceId === source.name;
                        const ownerInfo = getMediaOwner(source.name);

                        return (
                            <div
                                key={source.name}
                                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10"
                                style={{ left: `${source.displayPosition}%`, transition: 'left 0.5s cubic-bezier(0.17, 0.67, 0.83, 0.67)' }}
                                onMouseEnter={() => setHoveredSourceId(source.name)}
                                onMouseLeave={() => setHoveredSourceId(null)}
                                onClick={() => setHoveredSourceId(source.name)}
                            >
                                <button
                                    onClick={(e) => { e.stopPropagation(); onSourceSelect(source); }}
                                    className="relative w-8 h-8 rounded-full bg-[#1c1c1e] flex items-center justify-center overflow-hidden shadow-lg transition-all duration-300 hover:scale-125 hover:z-30"
                                    style={{ 
                                        border: `2.5px solid ${ownerInfo.color}`,
                                        boxShadow: `0 0 12px ${ownerInfo.color}50`
                                    }}
                                >
                                    <img
                                        src={source.logoUrl}
                                        alt={source.name}
                                        className="w-full h-full object-cover"
                                        onError={(event) => {
                                            const img = event.currentTarget;
                                            if (img.dataset.fallbackApplied === 'true') {
                                                img.onerror = null;
                                                img.src = '/favicon.ico';
                                                return;
                                            }
                                            img.dataset.fallbackApplied = 'true';
                                            img.src = googleFavicon;
                                        }}
                                    />
                                </button>

                                {/* Tooltip avec info propriétaire */}
                                <div className={`
                                    absolute bottom-full mb-2 left-1/2 -translate-x-1/2 
                                    bg-black/90 backdrop-blur-md border border-white/10 
                                    px-2.5 py-1.5 rounded-lg shadow-xl
                                    text-[9px] font-bold text-white whitespace-nowrap 
                                    transition-all duration-200 pointer-events-none z-40
                                    ${isHovered ? 'opacity-100 translate-y-0 scale-100' : 'opacity-0 translate-y-2 scale-95'}
                                `}>
                                    <div className="flex flex-col gap-0.5">
                                        <span>{source.name}</span>
                                        <span 
                                            className="text-[7px] font-medium opacity-80"
                                            style={{ color: ownerInfo.color }}
                                        >
                                            {ownerInfo.label}
                                        </span>
                                    </div>
                                    <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-2 h-2 bg-black/90 border-r border-b border-white/10 transform rotate-45"></div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default BiasAnalysisDisplay;
