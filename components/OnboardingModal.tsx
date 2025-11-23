import React, { useState } from 'react';
import { ChevronRightIcon } from './icons/ChevronRightIcon';

interface OnboardingModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onClose }) => {
    const [currentSlide, setCurrentSlide] = useState(0);

    if (!isOpen) return null;

    const slides = [
        {
            title: "Bienvenue sur PRISM",
            description: "Une nouvelle façon d'explorer l'actualité, propulsée par l'intelligence artificielle.",
            icon: (
                <div className="w-24 h-24 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shadow-[0_0_30px_rgba(255,255,255,0.1)]">
                    <span className="font-black italic text-4xl tracking-tighter text-white chromatic-aberration" data-text="PRISM">
                        PRISM
                    </span>
                </div>
            )
        },
        {
            title: "Navigation Intuitive",
            description: "Faites défiler verticalement pour passer d'un sujet à l'autre. Une expérience fluide et immersive, sans distraction.",
            icon: (
                <div className="w-24 h-24 rounded-2xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center relative overflow-hidden">
                    <div className="absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-blue-500/20 to-transparent animate-pulse"></div>
                    <div className="w-12 h-16 border-2 border-blue-400/50 rounded-lg flex flex-col items-center justify-start pt-2">
                        <div className="w-1 h-2 bg-blue-400 rounded-full animate-bounce"></div>
                    </div>
                </div>
            )
        },
        {
            title: "Intelligence Artificielle",
            description: "Chaque article est analysé en temps réel. Détection de biais, analyse de sentiment et contexte géopolitique instantanés.",
            icon: (
                <div className="w-24 h-24 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center relative">
                    <div className="absolute inset-0 rounded-full border border-purple-500/30 animate-spin-slow"></div>
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-10 h-10 text-purple-400">
                        <path d="M12 2.25a.75.75 0 01.75.75v2.25a.75.75 0 01-1.5 0V3a.75.75 0 01.75-.75zM7.5 12a4.5 4.5 0 119 0 4.5 4.5 0 01-9 0zM18.894 6.166a.75.75 0 00-1.06-1.06l-1.591 1.59a.75.75 0 101.06 1.061l1.591-1.59zM21.75 12a.75.75 0 01-.75.75h-2.25a.75.75 0 010-1.5H21a.75.75 0 01.75.75zM17.834 18.894a.75.75 0 001.06-1.06l-1.59-1.591a.75.75 0 10-1.061 1.06l1.59 1.591zM12 18a4.5 4.5 0 01-4.5-4.5.75.75 0 00-1.5 0 6 6 0 1012 0 .75.75 0 00-1.5 0 4.5 4.5 0 01-4.5 4.5z" />
                        <path d="M3.75 12a.75.75 0 01-.75.75H.75a.75.75 0 010-1.5H3a.75.75 0 01.75.75zM6.166 17.834a.75.75 0 00-1.06 1.06l1.591 1.59a.75.75 0 101.06-1.061l-1.591-1.59z" />
                    </svg>
                </div>
            )
        },
        {
            title: "Sources Mondiales",
            description: "Nous agrégeons et comparons des milliers de sources pour vous offrir une vision plurielle et objective de l'information.",
            icon: (
                <div className="w-24 h-24 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-10 h-10 text-green-400">
                        <path fillRule="evenodd" d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM8.547 4.505a8.25 8.25 0 013.453-1.002V9.75H8.547V4.505zm-1.794.628A8.252 8.252 0 004.5 9.75h2.253V5.133zM12 3.503v6.247h3.453V4.505A8.25 8.25 0 0012 3.503zm4.953 1.63v4.617H19.5a8.252 8.252 0 00-2.547-4.617zM19.5 11.25h-2.547v4.617A8.252 8.252 0 0019.5 11.25zm-4.047 6.12V12.75H12v6.247a8.25 8.25 0 003.453-1.002v.625zm-4.953.625V12.75H6.753v4.617a8.252 8.252 0 001.794.628zm-2.253-6.12H4.5a8.252 8.252 0 002.253 4.617V11.25z" clipRule="evenodd" />
                    </svg>
                </div>
            )
        }
    ];

    const nextSlide = () => {
        if (currentSlide < slides.length - 1) {
            setCurrentSlide(curr => curr + 1);
        } else {
            onClose();
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-lg p-6">
            <div className="w-full max-w-md bg-[#111] border border-white/10 rounded-3xl p-8 relative overflow-hidden shadow-2xl flex flex-col min-h-[500px]">
                {/* Background Effects */}
                <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/5 to-transparent pointer-events-none"></div>
                
                {/* Close Button */}
                <button 
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 text-gray-500 hover:text-white transition-colors"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                {/* Content */}
                <div className="flex-1 flex flex-col items-center justify-center text-center space-y-8 pt-8">
                    <div className="transform transition-all duration-500 hover:scale-105">
                        {slides[currentSlide].icon}
                    </div>
                    
                    <div className="space-y-4">
                        <h2 className="text-2xl font-bold text-white tracking-tight">
                            {slides[currentSlide].title}
                        </h2>
                        <p className="text-gray-400 leading-relaxed">
                            {slides[currentSlide].description}
                        </p>
                    </div>
                </div>

                {/* Footer Navigation */}
                <div className="mt-12 flex flex-col items-center space-y-6">
                    {/* Dots */}
                    <div className="flex gap-2">
                        {slides.map((_, idx) => (
                            <div 
                                key={idx}
                                className={`h-1.5 rounded-full transition-all duration-300 ${
                                    idx === currentSlide ? 'w-8 bg-white' : 'w-1.5 bg-white/20'
                                }`}
                            />
                        ))}
                    </div>

                    {/* Action Button */}
                    <button
                        onClick={nextSlide}
                        className="w-full py-4 bg-white text-black font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-gray-100 active:scale-95 transition-all group"
                    >
                        {currentSlide === slides.length - 1 ? "Commencer l'expérience" : "Suivant"}
                        <ChevronRightIcon className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default OnboardingModal;

