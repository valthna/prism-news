import React, { useState, useEffect, useRef, useMemo } from 'react';
import { SearchIcon } from './icons/SearchIcon';
import { CloseIcon } from './icons/CloseIcon';
import { getCategoryOption } from '../constants/categories';

interface SearchOverlayProps {
    isOpen: boolean;
    onClose: () => void;
    onSearch: (query: string, category: string) => void;
    currentCategory: string;
}

const TRENDING_QUERIES = [
    { label: "COP30 à Belém", query: "COP30 objectifs climatiques Brésil", category: "Environnement" },
    { label: "Tensions commerciales", query: "Guerre commerciale USA Chine UE impact", category: "Économie" },
    { label: "Avancées IA Générative", query: "Dernières avancées IA générative modèles multimodaux", category: "Technologie" },
    { label: "Mission Artemis III", query: "Mission Artemis III retour Lune", category: "Science" }
];

const SearchOverlay: React.FC<SearchOverlayProps> = ({ isOpen, onClose, onSearch, currentCategory }) => {
    const [query, setQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState(currentCategory);
    const [isVisible, setIsVisible] = useState(false);
    const [recentSearches, setRecentSearches] = useState<string[]>([]);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (isOpen) {
            setIsVisible(true);
            setSelectedCategory(currentCategory);
            setTimeout(() => inputRef.current?.focus(), 100);
            const handleKeyDown = (event: KeyboardEvent) => {
                if (event.key === 'Escape') onClose();
            };
            document.addEventListener('keydown', handleKeyDown);
            return () => document.removeEventListener('keydown', handleKeyDown);
        } else {
            setTimeout(() => setIsVisible(false), 300);
        }
    }, [isOpen, currentCategory, onClose]);

    const handleSubmit = (e?: React.FormEvent) => {
        e?.preventDefault();
        const sanitized = query.trim();
        if (!sanitized) return;
        onSearch(sanitized, selectedCategory);
        setRecentSearches(prev => {
            const next = [sanitized, ...prev.filter(item => item !== sanitized)];
            return next.slice(0, 5);
        });
        onClose();
    };

    const activeCategory = useMemo(
        () => getCategoryOption(selectedCategory),
        [selectedCategory]
    );

    const handleTrendingSelect = (topic: typeof TRENDING_QUERIES[number]) => {
        setQuery(topic.query);
        setSelectedCategory(topic.category);
    };

    if (!isOpen && !isVisible) return null;

    return (
        <div
            className={`fixed inset-0 z-[60] flex flex-col bg-black/95 backdrop-blur-2xl transition-opacity duration-300 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
            role="dialog"
            aria-modal="true"
        >
            {/* Header / Close */}
            <div className="flex items-center justify-end p-4 pt-safe-top">
                <button 
                    onClick={onClose} 
                    className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center hover:bg-white/20 active:scale-95 transition-all"
                >
                    <CloseIcon className="w-5 h-5 text-white" />
                </button>
            </div>

            <div className="flex-1 flex flex-col max-w-3xl mx-auto w-full px-6 pt-4 pb-safe-bottom overflow-y-auto no-scrollbar">
                
                {/* Main Search Input */}
                <form onSubmit={handleSubmit} className="w-full relative mb-12">
                    <div className="relative group">
                        <input
                            ref={inputRef}
                            type="text"
                            className="w-full bg-transparent text-4xl md:text-6xl font-serif font-bold text-white placeholder-white/20 focus:outline-none pb-4 border-b border-white/20 focus:border-neon-accent transition-colors rounded-none caret-neon-accent"
                            placeholder="Rechercher..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                        />
                        <button 
                            type="submit"
                            className="absolute right-0 bottom-4 p-2 opacity-50 group-focus-within:opacity-100 transition-opacity"
                        >
                            <SearchIcon className="w-8 h-8 text-white" />
                        </button>
                    </div>
                    
                    <div className="mt-4 flex items-center gap-2 text-xs font-mono text-gray-400 uppercase tracking-wider animate-fade-in">
                        <span>Dans</span>
                        <span className="text-neon-accent bg-neon-accent/10 px-2 py-0.5 rounded border border-neon-accent/20">
                            {activeCategory.emoji} {activeCategory.value}
                        </span>
                    </div>
                </form>

                {/* Recent Searches */}
                {recentSearches.length > 0 && (
                    <div className="mb-10 animate-slide-up" style={{ animationDelay: '0.1s' }}>
                        <h3 className="text-xs font-bold text-gray-500 uppercase tracking-[0.2em] mb-4">Récent</h3>
                        <div className="flex flex-wrap gap-3">
                            {recentSearches.map(item => (
                                <button
                                    key={item}
                                    onClick={() => setQuery(item)}
                                    className="px-4 py-2 rounded-full text-sm bg-white/5 border border-white/10 hover:bg-white/10 active:bg-white/20 transition-colors text-gray-300"
                                >
                                    {item}
                                </button>
                            ))}
                        </div>
                    </div>
                )}

                {/* Trending Grid */}
                <div className="animate-slide-up" style={{ animationDelay: '0.2s' }}>
                    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-[0.2em] mb-4">Suggestions</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        {TRENDING_QUERIES.map((topic, idx) => (
                            <button
                                key={idx}
                                onClick={() => handleTrendingSelect(topic)}
                                className="group flex items-start p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 active:scale-[0.98] transition-all text-left"
                            >
                                <span className="text-xl mr-3 opacity-60 group-hover:scale-110 transition-transform duration-300">
                                    {idx === 0 ? '🔥' : idx === 1 ? '📉' : idx === 2 ? '🤖' : '🚀'}
                                </span>
                                <div>
                                    <div className="font-bold text-white mb-0.5 group-hover:text-neon-accent transition-colors">{topic.label}</div>
                                    <div className="text-xs text-gray-500 font-mono">{topic.category}</div>
                                </div>
                            </button>
                        ))}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default SearchOverlay;
