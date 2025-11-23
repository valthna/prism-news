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
    const dialogRef = useRef<HTMLDivElement>(null);
    const titleId = "search-overlay-title";

    useEffect(() => {
        if (isOpen) {
            setIsVisible(true);
            setSelectedCategory(currentCategory);
            const handleKeyDown = (event: KeyboardEvent) => {
                if (event.key === 'Escape') {
                    onClose();
                }
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

    const handleRecentSelect = (value: string) => {
        setQuery(value);
    };

    if (!isOpen && !isVisible) return null;

    return (
        <div
            className={`fixed inset-0 z-[60] flex items-start justify-center pt-[15vh] px-4 transition-all duration-500 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
            ref={dialogRef}
        >
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-500"
                onClick={onClose}
            ></div>

            <div className={`relative w-full max-w-2xl glass-panel rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden transform transition-all duration-500 cubic-bezier(0.16, 1, 0.3, 1) ${isOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}`}>
                <div className="absolute top-4 right-4 z-10">
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 transition-colors group">
                        <CloseIcon className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
                    </button>
                </div>

                <div className="p-8 space-y-8">
                    <h2 id={titleId} className="sr-only">Recherche avancée PRISM</h2>
                    <form onSubmit={handleSubmit} className="space-y-3">
                        <div className="group flex items-center gap-4 rounded-3xl border border-white/10 bg-white/5 px-5 py-4 shadow-[0_15px_35px_rgba(0,0,0,0.35)] focus-within:border-neon-accent/80 focus-within:bg-black/40 transition-all duration-300">
                            <div className="w-12 h-12 rounded-full border border-white/15 bg-black/40 flex items-center justify-center shadow-inner">
                                <SearchIcon className="h-6 w-6 text-gray-400 group-focus-within:text-neon-accent transition-colors duration-300" />
                            </div>
                            <input
                                type="text"
                                className="flex-1 bg-transparent text-3xl font-light text-white placeholder-gray-600 focus:outline-none font-sans tracking-tight"
                                placeholder="Rechercher un sujet..."
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                autoFocus
                            />
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-xs font-mono text-gray-500 gap-2">
                            <span>Catégorie active : <span className="text-white/90">{activeCategory.emoji} {activeCategory.value}</span></span>
                            <span className="text-neon-accent/80">PRISM préparera 5 cartes équilibrées</span>
                        </div>
                        <p className="text-[11px] text-gray-500 font-sans">
                            {activeCategory.description}
                        </p>
                    </form>

                    {recentSearches.length > 0 && (
                        <div className="space-y-2">
                            <label className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">Recherches récentes</label>
                            <div className="flex flex-wrap gap-2">
                                {recentSearches.map(item => (
                                    <button
                                        key={item}
                                        onClick={() => handleRecentSelect(item)}
                                        className="px-3 py-1.5 rounded-full text-[11px] font-semibold bg-white/5 text-gray-400 border border-white/10 hover:bg-white/15 hover:text-white transition-colors"
                                    >
                                        {item}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div className="space-y-4">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">Focus du moment</label>
                        <div className="grid sm:grid-cols-2 gap-3">
                            {TRENDING_QUERIES.map((topic) => (
                                <button
                                    key={topic.label}
                                    onClick={() => handleTrendingSelect(topic)}
                                    className="flex items-start gap-3 text-left px-4 py-3 rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 transition-colors"
                                >
                                    <div className="w-2 h-2 rounded-full bg-neon-accent mt-1"></div>
                                    <div>
                                        <p className="text-sm font-semibold text-white">{topic.label}</p>
                                        <p className="text-[11px] text-gray-400">{topic.category}</p>
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end pt-4">
                        <button
                            onClick={(e) => handleSubmit(e)}
                            className="px-8 py-3 glass-button rounded-full font-bold text-xs uppercase tracking-widest flex items-center gap-3 group hover:bg-white text-white hover:text-black transition-all"
                        >
                            <span>Lancer l'analyse</span>
                            <SearchIcon className="w-4 h-4 group-hover:scale-110 transition-transform" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SearchOverlay;
