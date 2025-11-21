import React, { useEffect, useState } from 'react';
import { NewsArticle } from '../types';

interface ArticleDetailModalProps {
    article: NewsArticle;
    onClose: () => void;
}

const ArticleDetailModal: React.FC<ArticleDetailModalProps> = ({ article, onClose }) => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        setIsVisible(true);
        document.body.style.overflow = 'hidden';
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, []);

    const handleClose = () => {
        setIsVisible(false);
        setTimeout(onClose, 300);
    };

    return (
        <div className={`fixed inset-0 z-[100] flex items=end justify-center sm:items-center pointer-events-none`}>
            <div
                className={`absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity duration-300 pointer-events-auto ${isVisible ? 'opacity-100' : 'opacity-0'}`}
                onClick={handleClose}
            ></div>

            <div
                className={`
                    relative w-full max-w-2xl max-h-[90vh] 
                    bg-gray-900/95 backdrop-blur-xl 
                    border-t border-x border-white/10 sm:border sm:rounded-2xl
                    flex flex-col overflow-hidden
                    shadow-2xl
                    transform transition-transform duration-300 cubic-bezier(0.16, 1, 0.3, 1)
                    pointer-events-auto
                    ${isVisible ? 'translate-y-0 scale-100' : 'translate-y-full sm:translate-y-10 sm:scale-95'}
                `}
            >
                <div className="w-full flex justify-center pt-3 pb-1 sm:hidden" onClick={handleClose}>
                    <div className="w-12 h-1.5 bg-white/20 rounded-full"></div>
                </div>

                <div className="px-6 py-4 border-b border-white/10 flex justify-between items-start gap-4 bg-gradient-to-b from-white/5 to-transparent">
                    <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                            <span className="text-2xl">{article.emoji}</span>
                            <span className="text-[10px] font-bold uppercase tracking-widest text-neon-accent">Analyse détaillée</span>
                        </div>
                        <h2 className="text-xl sm:text-2xl font-serif font-bold text-white leading-tight">
                            {article.headline}
                        </h2>
                    </div>
                    <button
                        onClick={handleClose}
                        className="p-2 rounded-full bg-white/5 hover:bg-white/10 transition-colors border border-white/10 touch-target"
                        aria-label="Fermer"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 text-gray-400">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
                    <section>
                        <h3 className="text-sm font-bold uppercase tracking-widest text-gray-400 mb-3 flex items-center gap-2">
                            <span className="w-1 h-4 bg-neon-accent rounded-full"></span>
                            L'Essentiel
                        </h3>
                        <p className="text-lg text-gray-200 leading-relaxed font-serif">
                            {article.summary}
                        </p>
                    </section>

                    <section className="bg-white/5 rounded-xl p-5 border border-white/5">
                        <h3 className="text-sm font-bold uppercase tracking-widest text-blue-400 mb-3 flex items-center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                            </svg>
                            Dans le détail
                        </h3>
                        <p className="text-base text-gray-300 leading-relaxed">
                            {article.detailedSummary || "Analyse détaillée en cours de génération..."}
                        </p>
                    </section>

                    <section className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 rounded-xl p-5 border border-purple-500/20">
                        <h3 className="text-sm font-bold uppercase tracking-widest text-purple-400 mb-3 flex items=center gap-2">
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 18v-5.25m0 0a6.01 6.01 0 001.5-.189m-1.5.189a6.01 6.01 0 01-1.5-.189m3.75 7.478a12.06 12.06 0 01-4.5 0m3.75 2.383a14.406 14.406 0 01-3 0M14.25 18v-.192c0-.983.658-1.823 1.508-2.316a7.5 7.5 0 10-7.517 0c.85.493 1.509 1.333 1.509 2.316V18" />
                            </svg>
                            Pourquoi c'est important
                        </h3>
                        <p className="text-base text-gray-300 leading-relaxed italic">
                            {article.importance || "Impact majeur à surveiller."}
                        </p>
                    </section>
                </div>

                <div className="p-4 border-t border-white/10 bg-black/20 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 rounded-lg bg-white/10 hover:bg-white/20 text-white font-bold text-sm uppercase tracking-wider transition-colors"
                    >
                        Fermer
                    </button>
                </div>
            </div>
        </div>
    );
};

export default ArticleDetailModal;
