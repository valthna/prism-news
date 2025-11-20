
import React, { useMemo, useState } from 'react';
import { BiasAnalysis, Source } from '../types';

interface BiasAnalysisDisplayProps {
    analysis: BiasAnalysis;
    sources: Source[];
    onSourceSelect: (source: Source) => void;
    onShowSources: () => void;
    className?: string;
}

const BiasAnalysisDisplay: React.FC<BiasAnalysisDisplayProps> = ({ analysis, sources, onSourceSelect, onShowSources, className = "" }) => {
    const [hoveredSourceId, setHoveredSourceId] = useState<string | null>(null);

    // Logic to prevent bubble overlap
    const positionedSources = useMemo(() => {
        let items = sources.map(s => ({
            ...s,
            displayPosition: s.position,
        }));

        const BUBBLE_DIAMETER = 10; // approx % width
        items.sort((a, b) => a.displayPosition - b.displayPosition);

        // Simple force-directed layout
        for (let i = 0; i < 5; i++) {
            for (let j = 0; j < items.length - 1; j++) {
                if (items[j + 1].displayPosition - items[j].displayPosition < BUBBLE_DIAMETER) {
                    const overlap = BUBBLE_DIAMETER - (items[j + 1].displayPosition - items[j].displayPosition);
                    items[j].displayPosition -= overlap / 2;
                    items[j + 1].displayPosition += overlap / 2;
                }
            }
        }
        // Clamp
        return items.map(i => ({
            ...i,
            displayPosition: Math.max(5, Math.min(95, i.displayPosition))
        }));
    }, [sources]);

    return (
        <div className={`flex flex-col h-full justify-between ${className}`}>

            {/* Header: Minimalist alignment */}
            <div className="flex justify-between items-start mb-1">

                {/* Left: Sources Count */}
                <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2 text-gray-400">
                        <div className="flex -space-x-2">
                            {sources.slice(0, 3).map((s, i) => (
                                <div key={i} className="w-5 h-5 rounded-full bg-gray-800 border border-black overflow-hidden shadow-sm">
                                    <img src={s.logoUrl} className="w-full h-full object-cover opacity-80" alt="" />
                                </div>
                            ))}
                        </div>
                        <button onClick={onShowSources} className="text-[10px] font-bold uppercase tracking-widest hover:text-white transition-colors ml-1">
                            {sources.length} Sources
                        </button>
                    </div>

                    {/* Reference Indicator */}
                    <div className="group relative flex items-center gap-1 cursor-help w-fit">
                        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 text-green-400/60 group-hover:text-green-400 transition-colors">
                            <path fillRule="evenodd" d="M16.403 12.652a3 3 0 000-5.304 3 3 0 00-3.75-3.751 3 3 0 00-5.305 0 3 3 0 00-3.751 3.75 3 3 0 000 5.305 3 3 0 003.75 3.751 3 3 0 005.305 0 3 3 0 003.751-3.75zm-2.546-4.46a.75.75 0 00-1.214-.883l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                        </svg>
                        <span className="text-[8px] text-gray-500 group-hover:text-gray-300 transition-colors">Vérifié</span>

                        {/* Mini Tooltip */}
                        <div className="absolute bottom-full left-0 mb-2 w-48 p-2.5 bg-black/95 backdrop-blur-xl border border-white/20 rounded-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none z-50 shadow-xl">
                            <p className="text-[9px] text-gray-300 leading-relaxed">
                                Positionnement vérifié via <span className="text-white font-bold">Media Bias/Fact Check</span>, <span className="text-white font-bold">AllSides</span> & <span className="text-white font-bold">Décodex</span>
                            </p>
                        </div>
                    </div>
                </div>

                {/* Right: Reliability Score */}
                <div className="flex flex-col items-end">
                    <span className="text-[8px] font-bold text-gray-500 uppercase tracking-widest mb-0.5">Fiabilité</span>
                    <div className="flex items-baseline gap-0.5">
                        <span className={`text-2xl font-black tracking-tighter font-mono ${analysis.reliabilityScore >= 80 ? 'text-green-400' :
                            analysis.reliabilityScore >= 50 ? 'text-yellow-400' : 'text-red-500'
                            }`}>
                            {analysis.reliabilityScore}
                        </span>
                        <span className="text-[10px] text-gray-600 font-bold">%</span>
                    </div>
                </div>

            </div>

            {/* Spectrum Section */}
            <div className="flex flex-col justify-end flex-1 min-h-0">
                {/* Divider */}
                <div className="h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mb-4 w-full"></div>

                {/* Spectrum Visualizer */}
                <div className="relative h-10 w-full select-none mb-1">
                    {/* Spectrum Gradient Bar */}
                    <div className="absolute top-1/2 left-0 right-0 h-1.5 bg-gradient-to-r from-bias-left via-bias-center to-bias-right rounded-full opacity-80 -translate-y-1/2 shadow-inner"></div>

                    {/* Center Marker */}
                    <div className="absolute top-1/2 left-1/2 w-0.5 h-4 bg-white/80 -translate-y-1/2 -translate-x-1/2 z-0 shadow-[0_0_10px_rgba(255,255,255,0.5)]"></div>

                    {/* Source Bubbles */}
                    {positionedSources.map((source) => {
                        const domainName = source.name.toLowerCase().replace(/\s+/g, '');
                        const googleFavicon = `https://www.google.com/s2/favicons?domain=${domainName}.com&sz=64`;
                        const isHovered = hoveredSourceId === source.name;

                        return (
                            <div
                                key={source.name}
                                className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10"
                                style={{ left: `${source.displayPosition}%`, transition: 'left 0.5s cubic-bezier(0.17, 0.67, 0.83, 0.67)' }}
                                onMouseEnter={() => setHoveredSourceId(source.name)}
                                onMouseLeave={() => setHoveredSourceId(null)}
                            >
                                <button
                                    onClick={() => onSourceSelect(source)}
                                    className={`relative w-7 h-7 rounded-full bg-[#1c1c1e] border-2 flex items-center justify-center overflow-hidden shadow-lg transition-all duration-200 hover:scale-125 hover:z-20 ${source.bias === 'left' ? 'border-bias-left' :
                                        source.bias === 'right' ? 'border-bias-right' : 'border-bias-center'
                                        }`}
                                >
                                    <img
                                        src={source.logoUrl}
                                        alt=""
                                        className="w-full h-full object-cover"
                                        onError={(e) => { (e.target as HTMLImageElement).src = googleFavicon; }}
                                    />
                                </button>

                                {/* Popover Label */}
                                <div className={`absolute bottom-full mb-2 left-1/2 -translate-x-1/2 bg-black/90 backdrop-blur border border-white/10 px-2 py-1 rounded text-[9px] font-bold text-white whitespace-nowrap transition-all duration-200 pointer-events-none z-50 ${isHovered ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}>
                                    {source.name}
                                </div>
                            </div>
                        );
                    })}

                    {/* Labels */}
                    <div className="absolute -bottom-3 w-full flex justify-between px-1 opacity-50 text-[8px] font-black uppercase tracking-widest text-gray-400">
                        <span>Gauche</span>
                        <span>Droite</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default BiasAnalysisDisplay;
