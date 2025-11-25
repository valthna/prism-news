import React, { useState, useEffect, useCallback } from 'react';
import { ChevronRightIcon } from './icons/ChevronRightIcon';
import { hapticTap, hapticSuccess } from '../services/haptics';

interface OnboardingModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const ONBOARDING_COMPLETED_KEY = 'prism_onboarding_completed';

/**
 * Vérifie si l'onboarding a déjà été complété
 */
export const hasCompletedOnboarding = (): boolean => {
    try {
        return localStorage.getItem(ONBOARDING_COMPLETED_KEY) === 'true';
    } catch {
        return false;
    }
};

/**
 * Marque l'onboarding comme complété
 */
const markOnboardingCompleted = (): void => {
    try {
        localStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true');
    } catch {
        // Silently fail if localStorage is not available
    }
};

const OnboardingModal: React.FC<OnboardingModalProps> = ({ isOpen, onClose }) => {
    const [currentSlide, setCurrentSlide] = useState(0);
    const [isAnimating, setIsAnimating] = useState(false);

    // Slides data - minimal and clean design
    const slides = [
        {
            title: "Bienvenue sur PRISM",
            description: "L'actualité décryptée par l'IA. Sans biais, sans clickbait.",
            emoji: "🔮"
        },
        {
            title: "Swipez pour explorer",
            description: "Glissez vers le haut pour découvrir la prochaine actualité.",
            emoji: "👆"
        },
        {
            title: "Analyse intelligente",
            description: "Chaque article est analysé : biais, sources, fiabilité.",
            emoji: "🧠"
        },
        {
            title: "Sources multiples",
            description: "Comparez les points de vue de 100+ médias mondiaux.",
            emoji: "🌍"
        }
    ];

    const prevSlide = useCallback(() => {
        if (currentSlide > 0 && !isAnimating) {
            hapticTap();
            setIsAnimating(true);
            setCurrentSlide(curr => curr - 1);
            setTimeout(() => setIsAnimating(false), 300);
        }
    }, [currentSlide, isAnimating]);

    const nextSlide = useCallback(() => {
        if (isAnimating) return;
        
        hapticTap();
        setIsAnimating(true);
        
        if (currentSlide < slides.length - 1) {
            setCurrentSlide(curr => curr + 1);
            setTimeout(() => setIsAnimating(false), 300);
        } else {
            hapticSuccess();
            markOnboardingCompleted();
            setTimeout(() => {
                setIsAnimating(false);
                onClose();
            }, 150);
        }
    }, [currentSlide, slides.length, onClose, isAnimating]);

    const handleClose = useCallback(() => {
        hapticTap();
        onClose();
    }, [onClose]);

    // Reset slide on open
    useEffect(() => {
        if (isOpen) {
            setCurrentSlide(0);
        }
    }, [isOpen]);

    // Keyboard navigation
    useEffect(() => {
        if (!isOpen) return;
        
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'ArrowRight' || e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                nextSlide();
            } else if (e.key === 'ArrowLeft' && currentSlide > 0) {
                e.preventDefault();
                prevSlide();
            } else if (e.key === 'Escape') {
                handleClose();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, currentSlide, nextSlide, prevSlide, handleClose]);

    // Early return AFTER all hooks
    if (!isOpen) return null;

    return (
        <div 
            className="fixed inset-0 z-[200] flex items-center justify-center bg-black/90 backdrop-blur-lg p-6"
            role="dialog"
            aria-modal="true"
            aria-labelledby="onboarding-title"
        >
            <div className="w-full max-w-sm bg-[#111] border border-white/10 rounded-2xl p-6 relative overflow-hidden shadow-xl flex flex-col min-h-[400px]">
                
                {/* Close Button */}
                <button 
                    onClick={handleClose}
                    className="absolute top-3 right-3 p-1.5 text-gray-500 hover:text-white transition-colors rounded-full"
                    aria-label="Fermer"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                {/* Content */}
                <div className="flex-1 flex flex-col items-center justify-center text-center space-y-6 py-8">
                    {/* Emoji icon */}
                    <div 
                        className={`text-6xl sm:text-7xl transition-all duration-300 ${isAnimating ? 'scale-90 opacity-50' : 'scale-100 opacity-100'}`}
                        aria-hidden="true"
                    >
                        {slides[currentSlide].emoji}
                    </div>
                    
                    {/* Text */}
                    <div className={`space-y-3 transition-opacity duration-300 ${isAnimating ? 'opacity-0' : 'opacity-100'}`}>
                        <h2 id="onboarding-title" className="text-xl sm:text-2xl font-bold text-white">
                            {slides[currentSlide].title}
                        </h2>
                        <p className="text-gray-400 text-sm sm:text-base max-w-xs mx-auto leading-relaxed">
                            {slides[currentSlide].description}
                        </p>
                    </div>
                </div>

                {/* Footer Navigation */}
                <div className="mt-auto flex flex-col items-center space-y-4">
                    {/* Dots */}
                    <div className="flex gap-2" role="tablist">
                        {slides.map((_, idx) => (
                            <button
                                key={idx}
                                onClick={() => { if (!isAnimating) { hapticTap(); setCurrentSlide(idx); }}}
                                role="tab"
                                aria-selected={idx === currentSlide}
                                className={`w-2 h-2 rounded-full transition-all ${
                                    idx === currentSlide ? 'bg-white w-6' : 'bg-white/30'
                                }`}
                            />
                        ))}
                    </div>

                    {/* Button */}
                    <button
                        onClick={nextSlide}
                        disabled={isAnimating}
                        className="w-full py-3 bg-white text-black font-semibold rounded-xl flex items-center justify-center gap-2 active:scale-[0.98] transition-all disabled:opacity-50"
                    >
                        {currentSlide === slides.length - 1 ? "C'est parti" : "Suivant"}
                        <ChevronRightIcon className="w-4 h-4" />
                    </button>
                    
                    {/* Skip */}
                    {currentSlide < slides.length - 1 && (
                        <button onClick={handleClose} className="text-xs text-gray-500 hover:text-white">
                            Passer
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default OnboardingModal;

