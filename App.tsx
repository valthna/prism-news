import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { NewsArticle } from './types';
import { fetchNewsArticles } from './services/geminiService';
import NewsCard from './components/NewsCard';
import Chatbot from './components/Chatbot';
import ProgressBar from './components/ProgressBar';
import SettingsModal from './components/SettingsModal';
import SearchOverlay from './components/SearchOverlay';
import { SettingsIcon } from './components/icons/SettingsIcon';
import { SearchIcon } from './components/icons/SearchIcon';
import { ShareIcon } from './components/icons/ShareIcon';
import HideInterfaceButton from './components/HideInterfaceButton';

// --- PRODUCTION GRADE LOADING SCREEN WITH VORTEX ---

const LoadingScreen: React.FC<{ status: string, count: number }> = ({ status, count }) => {
    // Create random particles for vortex effect
    const particles = useMemo(() => {
        const types = ['article', 'video', 'image', 'audio', 'data', 'news'];
        return Array.from({ length: 40 }).map((_, i) => {
            const angle = (i / 40) * 2 * Math.PI;
            const distance = 60 + Math.random() * 40; // Start further out
            return {
                id: i,
                type: types[Math.floor(Math.random() * types.length)],
                initialX: Math.cos(angle) * distance,
                initialY: Math.sin(angle) * distance,
                delay: Math.random() * 2,
                duration: 3 + Math.random() * 2,
                rotation: Math.random() * 360,
                scale: 0.8 + Math.random() * 0.4,
                color: Math.random() > 0.5 ? 'bg-blue-500' : 'bg-white'
            };
        });
    }, []);

    const percentage = Math.min(100, Math.floor((count / 2500) * 100));

    const getParticleContent = (type: string) => {
        const iconClass = "w-3 h-3 text-white/80";
        switch (type) {
            case 'video': return (
                <div className="w-8 h-6 rounded bg-red-500/20 border border-red-500/30 backdrop-blur-sm flex items-center justify-center shadow-[0_0_10px_rgba(239,68,68,0.2)]">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 text-red-400">
                        <path d="M4.5 4.5a3 3 0 00-3 3v9a3 3 0 003 3h8.25a3 3 0 003-3v-9a3 3 0 00-3-3H4.5zM19.94 18.75l-2.69-2.69V7.94l2.69-2.69c.944-.945 2.56-.276 2.56 1.06v11.38c0 1.336-1.616 2.005-2.56 1.06z" />
                    </svg>
                </div>
            );
            case 'image': return (
                <div className="w-6 h-8 rounded bg-purple-500/20 border border-purple-500/30 backdrop-blur-sm flex items-center justify-center shadow-[0_0_10px_rgba(168,85,247,0.2)]">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 text-purple-400">
                        <path fillRule="evenodd" d="M1.5 6a2.25 2.25 0 012.25-2.25h16.5A2.25 2.25 0 0122.5 6v12a2.25 2.25 0 01-2.25 2.25H3.75A2.25 2.25 0 011.5 18V6zM3 16.06V18c0 .414.336.75.75.75h16.5A.75.75 0 0021 18v-1.94l-2.69-2.689a1.5 1.5 0 00-2.12 0l-.88.879.97.97a.75.75 0 11-1.06 1.06l-5.16-5.159a1.5 1.5 0 00-2.12 0L3 16.061zm10.125-7.81a1.125 1.125 0 112.25 0 1.125 1.125 0 01-2.25 0z" clipRule="evenodd" />
                    </svg>
                </div>
            );
            case 'news': return (
                <div className="w-7 h-7 rounded-full bg-white/10 border border-white/20 backdrop-blur-sm flex items-center justify-center">
                    <span className="text-lg">📰</span>
                </div>
            );
            case 'data': return (
                <div className="w-8 h-5 rounded bg-green-500/20 border border-green-500/30 backdrop-blur-sm flex items-center justify-center">
                    <span className="text-[8px] font-mono text-green-400">1010</span>
                </div>
            );
            default: return (
                <div className="w-6 h-6 rounded bg-blue-500/20 border border-blue-500/30 backdrop-blur-sm flex items-center justify-center shadow-[0_0_10px_rgba(59,130,246,0.2)]">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-3 h-3 text-blue-400">
                        <path fillRule="evenodd" d="M4.125 3C3.089 3 2.25 3.84 2.25 4.875V18a3 3 0 003 3h15a3 3 0 01-3-3V4.875C17.25 3.839 16.41 3 15.375 3H4.125zM12 9.75a.75.75 0 000 1.5h1.5a.75.75 0 000-1.5H12zm-.75-2.25a.75.75 0 01.75-.75h1.5a.75.75 0 010 1.5H12a.75.75 0 01-.75-.75zM6 12.75a.75.75 0 000 1.5h7.5a.75.75 0 000-1.5H6zm-.75 3.75a.75.75 0 01.75-.75h7.5a.75.75 0 010 1.5H6a.75.75 0 01-.75-.75zM6 6.75a.75.75 0 000 1.5h3a.75.75 0 000-1.5H6z" clipRule="evenodd" />
                    </svg>
                </div>
            );
        }
    };

... (truncated for brevity)