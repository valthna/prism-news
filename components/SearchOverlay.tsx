
import React, { useState, useEffect } from 'react';
import { SearchIcon } from './icons/SearchIcon';
import { CloseIcon } from './icons/CloseIcon';

interface SearchOverlayProps {
    isOpen: boolean;
    onClose: () => void;
    onSearch: (query: string, category: string) => void;
    currentCategory: string;
}

const CATEGORIES = [
    "Général",
    "Politique",
    "Technologie",
    "Économie",
    "International",
    "Culture",
    "Sciences",
    "Sport",
    "Environnement"
];

const SearchOverlay: React.FC<SearchOverlayProps> = ({ isOpen, onClose, onSearch, currentCategory }) => {
    const [query, setQuery] = useState("");
    const [selectedCategory, setSelectedCategory] = useState(currentCategory);
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setIsVisible(true);
            setSelectedCategory(currentCategory);
        } else {
            setTimeout(() => setIsVisible(false), 300);
        }
    }, [isOpen, currentCategory]);

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        onSearch(query, selectedCategory);
        onClose();
    };

    if (!isOpen && !isVisible) return null;

    return (
        <div className={`fixed inset-0 z-[60] flex items-start justify-center pt-[15vh] px-4 transition-all duration-500 ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>

            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-500"
                onClick={onClose}
            ></div>

            {/* Modal Content (Command Palette Style) */}
            <div className={`relative w-full max-w-2xl glass-panel rounded-3xl shadow-[0_0_50px_rgba(0,0,0,0.5)] overflow-hidden transform transition-all duration-500 cubic-bezier(0.16, 1, 0.3, 1) ${isOpen ? 'scale-100 translate-y-0' : 'scale-95 translate-y-4'}`}>

                {/* Header / Close */}
                <div className="absolute top-4 right-4 z-10">
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-white/10 transition-colors group">
                        <CloseIcon className="w-5 h-5 text-gray-400 group-hover:text-white transition-colors" />
                    </button>
                </div>

                <div className="p-8 space-y-8">

                    {/* Search Input (Massive & Clean) */}
                    <form onSubmit={handleSubmit} className="relative group">
                        <div className="absolute inset-y-0 left-0 flex items-center pointer-events-none">
                            <SearchIcon className="h-8 w-8 text-gray-500 group-focus-within:text-neon-accent transition-colors duration-300" />
                        </div>
                        <input
                            type="text"
                            className="block w-full pl-14 pr-4 py-2 bg-transparent border-b-2 border-white/10 text-3xl font-light text-white placeholder-gray-600 focus:outline-none focus:border-neon-accent transition-all duration-300 font-sans tracking-tight"
                            placeholder="Rechercher un sujet..."
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            autoFocus
                        />
                    </form>

                    {/* Categories */}
                    <div className="space-y-4">
                        <label className="text-[10px] font-bold text-gray-500 uppercase tracking-[0.2em]">Explorer par catégorie</label>
                        <div className="flex flex-wrap gap-2">
                            {CATEGORIES.map((cat) => (
                                <button
                                    key={cat}
                                    onClick={() => setSelectedCategory(cat)}
                                    className={`px-4 py-2 rounded-full text-xs font-bold uppercase tracking-wider transition-all duration-300 border ${selectedCategory === cat
                                            ? 'bg-neon-accent text-black border-neon-accent shadow-[0_0_20px_rgba(50,173,230,0.4)] scale-105'
                                            : 'bg-white/5 text-gray-400 border-white/5 hover:bg-white/10 hover:border-white/10 hover:text-white'
                                        }`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Action Button */}
                    <div className="flex justify-end pt-4">
                        <button
                            onClick={handleSubmit}
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
