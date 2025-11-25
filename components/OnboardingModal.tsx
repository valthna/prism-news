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

    // Slides data - defined before hooks that use it
    const slides = [
        {
            title: "L'info. Décryptée.",
            subtitle: "PRISM",
            description: "Fini les titres clickbait. Fini les opinions déguisées en faits. Découvrez l'actualité comme vous ne l'avez jamais vue.",
            icon: (
                <div className="relative w-52 h-40 flex items-center justify-center">
                    {/* SVG Prism composition */}
                    <svg viewBox="0 0 200 120" className="w-full h-full" style={{ filter: 'drop-shadow(0 0 20px rgba(255,255,255,0.15))' }}>
                        <defs>
                            {/* Glass prism gradient */}
                            <linearGradient id="glassGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="rgba(255,255,255,0.25)" />
                                <stop offset="50%" stopColor="rgba(255,255,255,0.1)" />
                                <stop offset="100%" stopColor="rgba(255,255,255,0.05)" />
                            </linearGradient>
                            
                            {/* Glow filter */}
                            <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
                                <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                                <feMerge>
                                    <feMergeNode in="coloredBlur"/>
                                    <feMergeNode in="SourceGraphic"/>
                                </feMerge>
                            </filter>
                            
                            {/* Rainbow gradients for each beam */}
                            <linearGradient id="beamRed" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#ef4444" stopOpacity="1"/>
                                <stop offset="100%" stopColor="#ef4444" stopOpacity="0.6"/>
                            </linearGradient>
                            <linearGradient id="beamOrange" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#f97316" stopOpacity="1"/>
                                <stop offset="100%" stopColor="#f97316" stopOpacity="0.6"/>
                            </linearGradient>
                            <linearGradient id="beamYellow" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#eab308" stopOpacity="1"/>
                                <stop offset="100%" stopColor="#eab308" stopOpacity="0.6"/>
                            </linearGradient>
                            <linearGradient id="beamGreen" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#22c55e" stopOpacity="1"/>
                                <stop offset="100%" stopColor="#22c55e" stopOpacity="0.6"/>
                            </linearGradient>
                            <linearGradient id="beamBlue" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#3b82f6" stopOpacity="1"/>
                                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.6"/>
                            </linearGradient>
                            <linearGradient id="beamViolet" x1="0%" y1="0%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#8b5cf6" stopOpacity="1"/>
                                <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0.6"/>
                            </linearGradient>
                        </defs>
                        
                        {/* Background rainbow glow */}
                        <ellipse cx="160" cy="60" rx="35" ry="50" fill="url(#glassGradient)" opacity="0.3" style={{ filter: 'blur(15px)' }}/>
                        
                        {/* White light beam entering */}
                        <line x1="5" y1="60" x2="70" y2="60" stroke="white" strokeWidth="4" opacity="0.9" filter="url(#glow)">
                            <animate attributeName="opacity" values="0.7;1;0.7" dur="3s" repeatCount="indefinite"/>
                        </line>
                        
                        {/* Glass Prism - equilateral triangle */}
                        <polygon 
                            points="75,20 115,90 35,90" 
                            fill="url(#glassGradient)" 
                            stroke="rgba(255,255,255,0.4)" 
                            strokeWidth="1.5"
                        />
                        {/* Prism inner reflection */}
                        <polygon 
                            points="75,32 100,78 50,78" 
                            fill="rgba(255,255,255,0.03)"
                        />
                        {/* Prism highlight edge */}
                        <line x1="75" y1="20" x2="35" y2="90" stroke="rgba(255,255,255,0.5)" strokeWidth="1"/>
                        
                        {/* Rainbow beams dispersing from prism */}
                        <g filter="url(#glow)">
                            {/* Red - top beam */}
                            <line x1="95" y1="52" x2="195" y2="15" stroke="url(#beamRed)" strokeWidth="3.5" strokeLinecap="round">
                                <animate attributeName="opacity" values="0.8;1;0.8" dur="2s" repeatCount="indefinite"/>
                            </line>
                            {/* Orange */}
                            <line x1="98" y1="55" x2="195" y2="30" stroke="url(#beamOrange)" strokeWidth="3.5" strokeLinecap="round">
                                <animate attributeName="opacity" values="0.8;1;0.8" dur="2s" begin="0.15s" repeatCount="indefinite"/>
                            </line>
                            {/* Yellow */}
                            <line x1="100" y1="58" x2="195" y2="48" stroke="url(#beamYellow)" strokeWidth="3.5" strokeLinecap="round">
                                <animate attributeName="opacity" values="0.8;1;0.8" dur="2s" begin="0.3s" repeatCount="indefinite"/>
                            </line>
                            {/* Green */}
                            <line x1="100" y1="62" x2="195" y2="68" stroke="url(#beamGreen)" strokeWidth="3.5" strokeLinecap="round">
                                <animate attributeName="opacity" values="0.8;1;0.8" dur="2s" begin="0.45s" repeatCount="indefinite"/>
                            </line>
                            {/* Blue */}
                            <line x1="98" y1="66" x2="195" y2="88" stroke="url(#beamBlue)" strokeWidth="3.5" strokeLinecap="round">
                                <animate attributeName="opacity" values="0.8;1;0.8" dur="2s" begin="0.6s" repeatCount="indefinite"/>
                            </line>
                            {/* Violet - bottom beam */}
                            <line x1="95" y1="70" x2="195" y2="108" stroke="url(#beamViolet)" strokeWidth="3.5" strokeLinecap="round">
                                <animate attributeName="opacity" values="0.8;1;0.8" dur="2s" begin="0.75s" repeatCount="indefinite"/>
                            </line>
                        </g>
                        
                        {/* Light refraction point glow inside prism */}
                        <circle cx="95" cy="60" r="4" fill="white" opacity="0.6">
                            <animate attributeName="opacity" values="0.4;0.8;0.4" dur="2s" repeatCount="indefinite"/>
                        </circle>
                    </svg>
                </div>
            )
        },
        {
            title: "Swipez. C'est tout.",
            subtitle: "Navigation naturelle",
            description: "Un geste vers le haut = une nouvelle actu. Pas de menus, pas de pubs, pas de distractions. L'essentiel, rien d'autre.",
            icon: (
                <div className="relative w-40 h-40 flex items-center justify-center">
                    {/* Phone mockup - larger */}
                    <div className="relative w-24 h-44 bg-gradient-to-b from-gray-800 to-gray-900 rounded-[2rem] border-4 border-gray-700 overflow-hidden shadow-[0_0_40px_rgba(255,255,255,0.1)]">
                        {/* Phone frame highlights */}
                        <div className="absolute inset-0 rounded-[1.75rem] border border-white/10"></div>
                        {/* Dynamic Island */}
                        <div className="absolute top-2 left-1/2 -translate-x-1/2 w-12 h-4 bg-black rounded-full"></div>
                        {/* Screen content */}
                        <div className="absolute inset-2 top-8 rounded-xl overflow-hidden">
                            {/* Article cards sliding with better visibility */}
                            <div className="absolute inset-x-1 h-10 bg-gradient-to-r from-purple-500/30 to-pink-500/30 rounded-lg top-1 animate-slide-up-1 border border-white/10">
                                <div className="h-2 w-3/4 bg-white/40 rounded m-2"></div>
                                <div className="h-1.5 w-1/2 bg-white/20 rounded mx-2"></div>
                            </div>
                            <div className="absolute inset-x-1 h-10 bg-gradient-to-r from-cyan-500/40 to-blue-500/40 rounded-lg top-14 animate-slide-up-2 border border-white/20">
                                <div className="h-2 w-3/4 bg-white/50 rounded m-2"></div>
                                <div className="h-1.5 w-1/2 bg-white/30 rounded mx-2"></div>
                            </div>
                            <div className="absolute inset-x-1 h-10 bg-gradient-to-r from-green-500/30 to-emerald-500/30 rounded-lg top-[6.5rem] animate-slide-up-3 border border-white/10">
                                <div className="h-2 w-3/4 bg-white/40 rounded m-2"></div>
                                <div className="h-1.5 w-1/2 bg-white/20 rounded mx-2"></div>
                            </div>
                        </div>
                        {/* Home indicator */}
                        <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 w-10 h-1 bg-white/30 rounded-full"></div>
                    </div>
                    {/* Swipe gesture - positioned below phone */}
                    <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 flex flex-col items-center">
                        <div className="w-8 h-8 rounded-full bg-white/10 border-2 border-white/30 flex items-center justify-center animate-bounce-up">
                            <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <path d="M12 19V5M5 12l7-7 7 7" />
                            </svg>
                        </div>
                    </div>
                </div>
            )
        },
        {
            title: "Voyez ce qu'on vous cache",
            subtitle: "Analyse IA des biais",
            description: "Notre IA décortique chaque article en temps réel : biais politique, tonalité émotionnelle, sources utilisées. Formez votre propre opinion.",
            icon: (
                <div className="relative w-40 h-40 flex items-center justify-center">
                    {/* Glow background */}
                    <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/20 via-purple-500/20 to-pink-500/20 rounded-full blur-2xl"></div>
                    
                    {/* Central AI scanner */}
                    <div className="relative">
                        {/* Orbiting rings - larger and more visible */}
                        <div className="absolute -inset-6">
                            <div className="absolute inset-0 border-2 border-cyan-500/40 rounded-full animate-spin-slow"></div>
                            <div className="absolute inset-3 border-2 border-purple-500/40 rounded-full animate-spin-reverse"></div>
                            <div className="absolute inset-6 border border-pink-500/40 rounded-full animate-spin-slow" style={{ animationDuration: '6s' }}></div>
                        </div>
                        
                        {/* Neural network nodes - bigger */}
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 w-3 h-3 bg-cyan-400 rounded-full animate-pulse shadow-[0_0_15px_rgba(34,211,238,1)]"></div>
                        <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-3 h-3 bg-pink-400 rounded-full animate-pulse shadow-[0_0_15px_rgba(244,114,182,1)]" style={{ animationDelay: '0.3s' }}></div>
                        <div className="absolute top-1/2 -left-8 -translate-y-1/2 w-3 h-3 bg-purple-400 rounded-full animate-pulse shadow-[0_0_15px_rgba(192,132,252,1)]" style={{ animationDelay: '0.6s' }}></div>
                        <div className="absolute top-1/2 -right-8 -translate-y-1/2 w-3 h-3 bg-yellow-400 rounded-full animate-pulse shadow-[0_0_15px_rgba(250,204,21,1)]" style={{ animationDelay: '0.9s' }}></div>
                        
                        {/* Central eye/scanner - larger */}
                        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border-2 border-white/20 flex items-center justify-center shadow-[inset_0_0_30px_rgba(0,0,0,0.5)]">
                            <div className="relative w-14 h-14">
                                <svg viewBox="0 0 24 24" fill="none" className="w-14 h-14 text-white">
                                    <path d="M2.42 12.713c-.136-.215-.204-.322-.242-.49a1.173 1.173 0 0 1 0-.446c.038-.168.106-.275.242-.49C3.546 9.505 6.895 5 12 5s8.455 4.505 9.58 6.287c.137.215.205.322.243.49.029.13.029.316 0 .446-.038.168-.106.275-.242.49C20.455 14.495 17.105 19 12 19c-5.106 0-8.455-4.505-9.58-6.287z" stroke="currentColor" strokeWidth="1.5" />
                                    <circle cx="12" cy="12" r="3.5" fill="currentColor" />
                                </svg>
                                {/* Scanning line - more visible */}
                                <div className="absolute inset-x-0 top-0 h-full overflow-hidden">
                                    <div className="w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent shadow-[0_0_10px_rgba(34,211,238,0.8)] animate-scan-line"></div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )
        },
        {
            title: "100+ sources. 0 bulle.",
            subtitle: "Vision panoramique",
            description: "Le Monde, CNN, BBC, Al Jazeera, Mediapart... Comparez comment chaque média traite le même sujet. Sortez de votre bulle d'info.",
            icon: (
                <div className="relative w-44 h-44 flex items-center justify-center">
                    {/* Glow effect */}
                    <div className="absolute inset-4 bg-blue-500/10 rounded-full blur-xl"></div>
                    
                    {/* Globe */}
                    <div className="relative w-28 h-28">
                        {/* Globe base with gradient */}
                        <div className="absolute inset-0 rounded-full bg-gradient-to-br from-blue-900/50 via-gray-900 to-gray-900 border-2 border-white/20 shadow-[inset_0_-10px_30px_rgba(59,130,246,0.2),0_0_30px_rgba(59,130,246,0.1)]">
                            {/* Continents simplified */}
                            <div className="absolute top-[20%] left-[25%] w-[30%] h-[20%] bg-green-600/30 rounded-full blur-[2px]"></div>
                            <div className="absolute top-[35%] left-[50%] w-[25%] h-[30%] bg-green-600/30 rounded-full blur-[2px]"></div>
                            <div className="absolute top-[60%] left-[20%] w-[20%] h-[15%] bg-green-600/30 rounded-full blur-[2px]"></div>
                            
                            {/* Latitude lines */}
                            <div className="absolute top-[30%] left-0 right-0 border-t border-white/10"></div>
                            <div className="absolute top-1/2 left-0 right-0 border-t border-white/15"></div>
                            <div className="absolute top-[70%] left-0 right-0 border-t border-white/10"></div>
                            
                            {/* Longitude curve */}
                            <div className="absolute inset-[15%] border-l border-r border-white/10 rounded-full"></div>
                            <div className="absolute inset-[35%] border-l border-r border-white/10 rounded-full"></div>
                        </div>
                        
                        {/* Center pulse */}
                        <div className="absolute inset-0 flex items-center justify-center">
                            <div className="w-3 h-3 bg-white rounded-full animate-ping opacity-75"></div>
                            <div className="absolute w-2 h-2 bg-white rounded-full"></div>
                        </div>
                    </div>
                    
                    {/* Source nodes - larger and more positioned */}
                    <div className="absolute top-0 left-4 w-7 h-7 bg-gradient-to-br from-red-400 to-red-600 rounded-full flex items-center justify-center text-[9px] font-bold text-white animate-float shadow-[0_0_15px_rgba(239,68,68,0.5)]">FR</div>
                    <div className="absolute top-0 right-4 w-7 h-7 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-[9px] font-bold text-white animate-float shadow-[0_0_15px_rgba(59,130,246,0.5)]" style={{ animationDelay: '0.5s' }}>UK</div>
                    <div className="absolute bottom-0 left-4 w-7 h-7 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center text-[9px] font-bold text-white animate-float shadow-[0_0_15px_rgba(34,197,94,0.5)]" style={{ animationDelay: '1s' }}>US</div>
                    <div className="absolute bottom-0 right-4 w-7 h-7 bg-gradient-to-br from-amber-400 to-amber-600 rounded-full flex items-center justify-center text-[9px] font-bold text-white animate-float shadow-[0_0_15px_rgba(245,158,11,0.5)]" style={{ animationDelay: '1.5s' }}>ME</div>
                    
                    {/* Connecting lines - using SVG overlay */}
                    <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox="0 0 176 176">
                        {/* Lines from nodes to center */}
                        <line x1="30" y1="14" x2="88" y2="88" stroke="url(#lineGradientRed)" strokeWidth="2" strokeDasharray="4 4" className="animate-dash" opacity="0.6" />
                        <line x1="146" y1="14" x2="88" y2="88" stroke="url(#lineGradientBlue)" strokeWidth="2" strokeDasharray="4 4" className="animate-dash" opacity="0.6" />
                        <line x1="30" y1="162" x2="88" y2="88" stroke="url(#lineGradientGreen)" strokeWidth="2" strokeDasharray="4 4" className="animate-dash" opacity="0.6" />
                        <line x1="146" y1="162" x2="88" y2="88" stroke="url(#lineGradientAmber)" strokeWidth="2" strokeDasharray="4 4" className="animate-dash" opacity="0.6" />
                        
                        {/* Gradients */}
                        <defs>
                            <linearGradient id="lineGradientRed" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="#ef4444" />
                                <stop offset="100%" stopColor="white" />
                            </linearGradient>
                            <linearGradient id="lineGradientBlue" x1="100%" y1="0%" x2="0%" y2="100%">
                                <stop offset="0%" stopColor="#3b82f6" />
                                <stop offset="100%" stopColor="white" />
                            </linearGradient>
                            <linearGradient id="lineGradientGreen" x1="0%" y1="100%" x2="100%" y2="0%">
                                <stop offset="0%" stopColor="#22c55e" />
                                <stop offset="100%" stopColor="white" />
                            </linearGradient>
                            <linearGradient id="lineGradientAmber" x1="100%" y1="100%" x2="0%" y2="0%">
                                <stop offset="0%" stopColor="#f59e0b" />
                                <stop offset="100%" stopColor="white" />
                            </linearGradient>
                        </defs>
                    </svg>
                </div>
            )
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
            <div className="w-full max-w-md bg-[#0a0a0a] border border-white/10 rounded-3xl p-8 relative overflow-hidden shadow-2xl flex flex-col min-h-[520px]">
                {/* Background Effects */}
                <div className="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
                    {/* Gradient glow */}
                    <div className="absolute -top-24 -left-24 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl"></div>
                    <div className="absolute -bottom-24 -right-24 w-64 h-64 bg-cyan-500/20 rounded-full blur-3xl"></div>
                    {/* Grid pattern */}
                    <div className="absolute inset-0 opacity-[0.03]" style={{
                        backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
                                          linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
                        backgroundSize: '32px 32px'
                    }}></div>
                    {/* Top gradient */}
                    <div className="absolute top-0 left-0 w-full h-1/2 bg-gradient-to-b from-white/5 to-transparent"></div>
                </div>
                
                {/* Close Button */}
                <button 
                    onClick={handleClose}
                    className="absolute top-4 right-4 p-2 text-gray-500 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-neon-accent focus:ring-offset-2 focus:ring-offset-black rounded-full"
                    aria-label="Passer l'introduction"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6" aria-hidden="true">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>

                {/* Content */}
                <div className="flex-1 flex flex-col items-center justify-center text-center space-y-8 pt-8">
                    <div 
                        className={`transform transition-all duration-500 hover:scale-105 ${isAnimating ? 'scale-95 opacity-50' : 'scale-100 opacity-100'}`}
                        aria-hidden="true"
                    >
                        {slides[currentSlide].icon}
                    </div>
                    
                    <div className={`space-y-4 transition-opacity duration-300 ${isAnimating ? 'opacity-0' : 'opacity-100'}`}>
                        {slides[currentSlide].subtitle && (
                            <span className="inline-block px-3 py-1 text-xs font-semibold uppercase tracking-widest text-white/60 bg-white/5 rounded-full border border-white/10">
                                {slides[currentSlide].subtitle}
                            </span>
                        )}
                        <h2 id="onboarding-title" className="text-2xl sm:text-3xl font-black text-white tracking-tight leading-tight">
                            {slides[currentSlide].title}
                        </h2>
                        <p className="text-gray-400 leading-relaxed text-sm sm:text-base max-w-sm mx-auto">
                            {slides[currentSlide].description}
                        </p>
                    </div>
                </div>

                {/* Footer Navigation */}
                <div className="mt-12 flex flex-col items-center space-y-6">
                    {/* Dots - Navigation indicators */}
                    <div className="flex gap-2" role="tablist" aria-label="Étapes de l'introduction">
                        {slides.map((slide, idx) => (
                            <button
                                key={idx}
                                onClick={() => {
                                    if (!isAnimating) {
                                        hapticTap();
                                        setCurrentSlide(idx);
                                    }
                                }}
                                role="tab"
                                aria-selected={idx === currentSlide}
                                aria-label={`Étape ${idx + 1}: ${slide.title}`}
                                className={`h-1.5 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-neon-accent focus:ring-offset-2 focus:ring-offset-[#111] ${
                                    idx === currentSlide ? 'w-8 bg-white' : 'w-1.5 bg-white/20 hover:bg-white/40'
                                }`}
                            />
                        ))}
                    </div>

                    {/* Navigation Buttons */}
                    <div className="flex gap-3 w-full">
                        {currentSlide > 0 && (
                            <button
                                onClick={prevSlide}
                                disabled={isAnimating}
                                className="px-6 py-4 bg-white/10 text-white font-bold rounded-xl flex items-center justify-center gap-2 hover:bg-white/20 active:scale-95 transition-all disabled:opacity-50"
                                aria-label="Étape précédente"
                            >
                                <ChevronRightIcon className="w-4 h-4 rotate-180" />
                            </button>
                        )}
                    <button
                        onClick={nextSlide}
                            disabled={isAnimating}
                            className={`flex-1 py-4 font-bold rounded-xl flex items-center justify-center gap-2 active:scale-95 transition-all group disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-[#111] ${
                                currentSlide === slides.length - 1 
                                    ? 'bg-gradient-to-r from-cyan-500 via-purple-500 to-pink-500 text-white shadow-[0_0_20px_rgba(168,85,247,0.4)] hover:shadow-[0_0_30px_rgba(168,85,247,0.6)] focus:ring-purple-500' 
                                    : 'bg-white text-black hover:bg-gray-100 focus:ring-white'
                            }`}
                        >
                            {currentSlide === slides.length - 1 ? "🚀 Découvrir PRISM" : "Continuer"}
                            <ChevronRightIcon className="w-4 h-4 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
                        </button>
                    </div>
                    
                    {/* Skip link */}
                    {currentSlide < slides.length - 1 && (
                        <button
                            onClick={handleClose}
                            className="text-sm text-gray-500 hover:text-white transition-colors"
                        >
                            Passer l'introduction
                    </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default OnboardingModal;

