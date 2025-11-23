import React, { useState, useEffect, useRef } from 'react';
import { Sentiment, UserComment } from '../types';
import { CloseIcon } from './icons/CloseIcon';
import { SendIcon } from './icons/SendIcon';
import { ThumbsUpIcon } from './icons/ThumbsUpIcon';

interface SentimentModalProps {
  sentiment: Sentiment;
  comments: UserComment[];
  onAddComment: (comment: UserComment) => void;
  onClose: () => void;
}

const SentimentModal: React.FC<SentimentModalProps> = ({ sentiment, comments, onAddComment, onClose }) => {
  const [inputMode, setInputMode] = useState<'neutral' | 'positive' | 'negative'>('neutral');
  const [text, setText] = useState('');
  const [isInputFocused, setIsInputFocused] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const totalComments = comments.length;
  const positiveCount = comments.filter(c => c.sentiment === 'positive').length;
  const negativeCount = comments.filter(c => c.sentiment === 'negative').length;
  
  const posPercent = totalComments > 0 ? Math.round((positiveCount / totalComments) * 100) : 50;
  const negPercent = totalComments > 0 ? 100 - posPercent : 50;

  useEffect(() => {
      const handleKeyDown = (event: KeyboardEvent) => {
          if (event.key === 'Escape') onClose();
      };
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  useEffect(() => {
      if (inputMode !== 'neutral' && inputRef.current) {
          inputRef.current.focus();
      }
  }, [inputMode]);

  const handleSubmit = (e: React.FormEvent) => {
      e.preventDefault();
      if (!text.trim() || inputMode === 'neutral') return;

      const newComment: UserComment = {
          id: Date.now().toString(),
          author: 'Moi',
          text: text.trim(),
          sentiment: inputMode,
          timestamp: Date.now(),
          likes: 0
      };

      onAddComment(newComment);
      setText('');
      setInputMode('neutral');
      setIsInputFocused(false);
      
      setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-end sm:items-center justify-center sm:p-6">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity duration-300"
        onClick={onClose}
      />

      {/* Modal Sheet */}
      <div 
        className="relative w-full sm:max-w-md bg-[#121212] rounded-t-[32px] sm:rounded-[32px] shadow-[0_0_50px_rgba(0,0,0,0.8)] border border-white/10 flex flex-col max-h-[92vh] sm:max-h-[85vh] animate-slide-up overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Drag Handle (Mobile Visual Cue) */}
        <div className="w-full flex justify-center pt-3 pb-1 sm:hidden" onClick={onClose}>
            <div className="w-12 h-1.5 rounded-full bg-white/20" />
        </div>

        {/* Header */}
        <div className="px-6 pt-2 pb-4 border-b border-white/5 shrink-0">
             <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-2xl font-black uppercase tracking-tighter text-white">Débat Public</h2>
                    <p className="text-xs text-gray-400 font-medium mt-0.5">{totalComments} avis vérifiés</p>
                </div>
                <button 
                    onClick={onClose} 
                    className="w-8 h-8 bg-white/5 hover:bg-white/10 rounded-full flex items-center justify-center transition-colors"
                >
                    <CloseIcon className="w-4 h-4 text-white" />
                </button>
            </div>

            {/* Modern Gauge */}
            <div className="relative h-12 bg-black/40 rounded-2xl border border-white/5 overflow-hidden flex items-center px-4 justify-between">
                 {/* Background Meter */}
                 <div className="absolute inset-0 flex opacity-20">
                    <div style={{ width: `${posPercent}%` }} className="h-full bg-green-500 transition-all duration-700" />
                    <div style={{ width: `${negPercent}%` }} className="h-full bg-red-500 transition-all duration-700" />
                 </div>
                 
                 <div className="relative z-10 flex flex-col items-start">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-green-400">Accord</span>
                    <span className="text-lg font-mono font-bold text-white">{posPercent}%</span>
                 </div>

                 <div className="relative z-10 w-px h-8 bg-white/10 mx-2" />

                 <div className="relative z-10 flex flex-col items-end">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-red-400">Désaccord</span>
                    <span className="text-lg font-mono font-bold text-white">{negPercent}%</span>
                 </div>
            </div>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-4 bg-[#0a0a0a]" ref={containerRef}>
            
            {/* Top Opinions Cards */}
            <div className="grid grid-cols-2 gap-3 shrink-0">
                <div className="bg-green-500/5 border border-green-500/10 rounded-2xl p-4">
                    <div className="text-[9px] font-black text-green-500 uppercase tracking-widest mb-2">Top Accord</div>
                    <p className="text-xs text-gray-300 leading-relaxed line-clamp-3">"{sentiment.positive}"</p>
                </div>
                 <div className="bg-red-500/5 border border-red-500/10 rounded-2xl p-4">
                    <div className="text-[9px] font-black text-red-500 uppercase tracking-widest mb-2">Top Critique</div>
                    <p className="text-xs text-gray-300 leading-relaxed line-clamp-3">"{sentiment.negative}"</p>
                </div>
            </div>

            <div className="h-px w-full bg-white/5 my-2" />

            {/* Comments List */}
            <div className="space-y-4 pb-20">
                {comments.map((comment) => (
                    <div key={comment.id} className="flex gap-3 animate-fade-in">
                        <div className={`w-8 h-8 rounded-full shrink-0 flex items-center justify-center font-bold text-xs mt-1 ${comment.sentiment === 'positive' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                            {comment.author.charAt(0)}
                        </div>
                        <div className="flex-1 min-w-0">
                            <div className="flex items-baseline gap-2 mb-1">
                                <span className="text-xs font-bold text-white">{comment.author}</span>
                                <span className="text-[10px] text-gray-600">{new Date(comment.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                            </div>
                            <p className="text-sm text-gray-300 leading-relaxed break-words">{comment.text}</p>
                            
                            <div className="flex items-center gap-4 mt-2">
                                <button className="flex items-center gap-1.5 text-[10px] font-bold text-gray-500 hover:text-white transition-colors">
                                    <ThumbsUpIcon className="w-3 h-3" />
                                    <span>{comment.likes}</span>
                                </button>
                                <button className="text-[10px] font-bold text-gray-500 hover:text-white transition-colors">Répondre</button>
                            </div>
                        </div>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>
        </div>

        {/* Input Area (Sticky Bottom) */}
        <div className={`shrink-0 border-t border-white/10 bg-[#121212] p-4 pb-safe-bottom transition-all duration-300 ${isInputFocused ? 'pb-0' : ''}`}>
            {inputMode === 'neutral' ? (
                <div className="grid grid-cols-2 gap-3">
                    <button 
                        onClick={() => setInputMode('positive')}
                        className="h-12 rounded-xl bg-green-500/10 border border-green-500/20 hover:bg-green-500/20 flex items-center justify-center gap-2 transition-all active:scale-95"
                    >
                        <span className="text-lg">👍</span>
                        <span className="text-xs font-bold text-green-400 uppercase tracking-wide">D'accord</span>
                    </button>
                    <button 
                        onClick={() => setInputMode('negative')}
                        className="h-12 rounded-xl bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 flex items-center justify-center gap-2 transition-all active:scale-95"
                    >
                        <span className="text-lg">👎</span>
                        <span className="text-xs font-bold text-red-400 uppercase tracking-wide">Pas d'accord</span>
                    </button>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="flex flex-col gap-3 animate-slide-up">
                    <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest">
                        <span className={inputMode === 'positive' ? 'text-green-400' : 'text-red-400'}>
                            {inputMode === 'positive' ? 'Votre avis positif' : 'Votre critique'}
                        </span>
                        <button 
                            type="button" 
                            onClick={() => { setInputMode('neutral'); setText(''); }}
                            className="text-gray-500 hover:text-white p-2 -mr-2"
                        >
                            ANNULER
                        </button>
                    </div>
                    
                    <div className={`flex items-center bg-black/50 rounded-2xl border transition-colors ${inputMode === 'positive' ? 'border-green-500/30 focus-within:border-green-500/60' : 'border-red-500/30 focus-within:border-red-500/60'}`}>
                        <input
                            ref={inputRef}
                            type="text"
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            onFocus={() => setIsInputFocused(true)}
                            onBlur={() => setIsInputFocused(false)}
                            placeholder={inputMode === 'positive' ? "Dites pourquoi..." : "Qu'est-ce qui ne va pas ?"}
                            className="flex-1 bg-transparent px-4 py-3.5 text-white placeholder-white/30 focus:outline-none text-sm"
                        />
                        <button 
                            type="submit" 
                            disabled={!text.trim()} 
                            className={`p-3 m-1 rounded-xl transition-all ${
                                text.trim() 
                                    ? (inputMode === 'positive' ? 'bg-green-500 text-black hover:bg-green-400' : 'bg-red-500 text-white hover:bg-red-400')
                                    : 'bg-white/5 text-gray-500 cursor-not-allowed'
                            }`}
                        >
                            <SendIcon className="w-4 h-4" />
                        </button>
                    </div>
                </form>
            )}
        </div>
      </div>
    </div>
  );
};

export default SentimentModal;
