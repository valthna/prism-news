import React, { useState, useEffect, useRef } from 'react';
import { Sentiment, UserComment } from '../types';
import { CloseIcon } from './icons/CloseIcon';
import { SendIcon } from './icons/SendIcon';

interface SentimentModalProps {
  sentiment: Sentiment;
  comments: UserComment[];
  onAddComment: (comment: UserComment) => void;
  onClose: () => void;
}

const POSITIVE_SUGGESTIONS = [
  "Je partage cette analyse, car elle recoupe d'autres sources fiables.",
  "C'est cohérent avec les faits établis, notamment sur l'aspect économique.",
  "Bonne synthèse, surtout sur l'équilibre des points de vue."
];

const NEGATIVE_SUGGESTIONS = [
  "Analyse incomplète : aucune mention des contre-arguments principaux.",
  "Sources trop homogènes, il manque un regard extérieur.",
  "Attention aux chiffres avancés, ils datent d'avant la mise à jour."
];

const SentimentModal: React.FC<SentimentModalProps> = ({ sentiment, comments, onAddComment, onClose }) => {
  const [inputMode, setInputMode] = useState<'neutral' | 'positive' | 'negative'>('neutral');
  const [text, setText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const dialogTitleId = "sentiment-dialog-title";

  const totalComments = comments.length;
  const positiveCount = comments.filter(c => c.sentiment === 'positive').length;
  const negativeCount = comments.filter(c => c.sentiment === 'negative').length;
  
  const posPercent = totalComments > 0 ? Math.round((positiveCount / totalComments) * 100) : 50;
  const negPercent = totalComments > 0 ? 100 - posPercent : 50;

  const handleSuggestionClick = (value: string) => {
      setText(value);
      setTimeout(() => inputRef.current?.focus(), 50);
  };
  useEffect(() => {
      const handleKeyDown = (event: KeyboardEvent) => {
          if (event.key === 'Escape') {
              onClose();
          }
      };
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

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
      
      setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
      }, 100);
  };

  return (
    <div 
      className="fixed inset-0 bg-black/80 backdrop-blur-lg z-50 flex items-center justify-center p-0 sm:p-4 animate-fade-in"
      onClick={onClose}
    >
      <div 
        className="bg-[#121212] border border-white/10 sm:rounded-3xl w-full max-w-2xl h-full sm:h-[85vh] relative text-white shadow-2xl animate-slide-up overflow-hidden flex flex-col"
        role="dialog"
        aria-modal="true"
        aria-labelledby={dialogTitleId}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex-shrink-0 p-5 border-b border-white/10 bg-[#121212] z-10 relative">
             <div className="flex justify-between items-center mb-4">
                <div>
                    <h2 id={dialogTitleId} className="text-2xl font-black uppercase tracking-tighter bg-clip-text text-transparent bg-gradient-to-r from-gray-100 to-gray-400">Débat Public</h2>
                    <p className="text-xs text-gray-400 font-medium">Tendance basée sur {totalComments} avis</p>
                </div>
                <button 
                    onClick={onClose} 
                    className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors"
                >
                    <CloseIcon className="w-5 h-5 text-gray-300" />
                </button>
            </div>

            <div className="relative h-4 bg-gray-800 rounded-full overflow-hidden flex shadow-inner ring-1 ring-white/10">
                <div 
                    className="bg-gradient-to-r from-green-600 to-green-500 transition-all duration-500 flex items-center justify-start pl-2" 
                    style={{ width: `${posPercent}%` }}
                >
                    {posPercent > 10 && <span className="text-[9px] font-black text-green-950">{posPercent}%</span>}
                </div>
                <div 
                    className="bg-gradient-to-l from-red-600 to-red-500 transition-all duration-500 flex items=center justify-end pr-2" 
                    style={{ width: `${negPercent}%` }}
                >
                     {negPercent > 10 && <span className="text-[9px] font-black text-red-950">{negPercent}%</span>}
                </div>
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 bg-[#121212] rounded-full flex items-center justify-center border border-white/20 shadow-lg">
                    <span className="text-[10px]">VS</span>
                </div>
            </div>
             <div className="flex justify-between text-[10px] uppercase font-bold mt-1.5 px-1">
                <span className="text-green-400">En Accord</span>
                <span className="text-red-400">En Désaccord</span>
            </div>
        </div>

        <div className="flex-grow overflow-y-auto p-4 space-y-6 bg-[#0a0a0a]">
            <div className="grid grid-cols-2 gap-3 mb-6">
                <div className="bg-green-500/5 border border-green-500/20 rounded-xl p-3">
                    <div className="text-[10px] font-bold text-green-400 uppercase mb-1">Top Positif</div>
                    <p className="text-xs text-gray-300 leading-snug">"{sentiment.positive}"</p>
                </div>
                 <div className="bg-red-500/5 border border-red-500/20 rounded-xl p-3">
                    <div className="text-[10px] font-bold text-red-400 uppercase mb-1">Top Critique</div>
                    <p className="text-xs text-gray-300 leading-snug">"{sentiment.negative}"</p>
                </div>
            </div>

            <div className="border-t border-white/5 pt-2">
                <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-4">Fil de discussion</h3>
                
                <div className="space-y-4">
                    {comments.map((comment) => (
                        <div key={comment.id} className="flex gap-3 group animate-fade-in">
                            <div className={`w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center font-bold text-xs ${comment.sentiment === 'positive' ? 'bg-green-900/50 text-green-400 ring-1 ring-green-500/30' : 'bg-red-900/50 text-red-400 ring-1 ring-red-500/30'}`}>
                                {comment.author.charAt(0)}
                            </div>
                            <div className="flex-grow">
                                <div className="flex items-baseline gap-2 mb-0.5">
                                    <span className="text-xs font-bold text-gray-300">{comment.author}</span>
                                    <span className="text-[10px] text-gray-600">{new Date(comment.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                </div>
                                <div className={`p-3 rounded-2xl text-sm leading-relaxed inline-block max-w-[90%] ${comment.sentiment === 'positive' ? 'bg-green-500/10 text-green-100 rounded-tl-none border border-green-500/10' : 'bg-red-500/10 text-red-100 rounded-tl-none border border-red-500/10'}`}>
                                    {comment.text}
                                </div>
                                <div className="mt-1 ml-1 flex items-center gap-3">
                                     <button className="text-[10px] text-gray-500 hover:text-white font-bold">J'aime ({comment.likes})</button>
                                     <button className="text-[10px] text-gray-500 hover=text-white font-bold">Répondre</button>
                                </div>
                            </div>
                        </div>
                    ))}
                    <div ref={messagesEndRef} />
                </div>
            </div>
        </div>

        <div className="flex-shrink-0 p-4 bg-[#121212] border-t border-white/10">
            {!text && inputMode === 'neutral' ? (
                <div className="grid grid-cols-2 gap-3">
                    <button 
                        onClick={() => setInputMode('positive')}
                        className="flex flex-col items-center justify-center p-3 rounded-xl bg-green-900/20 border border-green-500/20 hover:bg-green-500/20 hover:border-green-500/50 transition-all group"
                    >
                        <span className="text-xl mb-1 group-hover:scale-110 transition-transform">👍</span>
                        <span className="text-xs font-bold text-green-400 uppercase">Je soutiens</span>
                    </button>
                    <button 
                        onClick={() => setInputMode('negative')}
                        className="flex flex-col items-center justify-center p-3 rounded-xl bg-red-900/20 border border-red-500/20 hover:bg-red-500/20 hover:border-red-500/50 transition-all group"
                    >
                         <span className="text-xl mb-1 group-hover:scale-110 transition-transform">👎</span>
                        <span className="text-xs font-bold text-red-400 uppercase">Je critique</span>
                    </button>
                </div>
            ) : (
                <form onSubmit={handleSubmit} className="relative animate-slide-up">
                    <div className={`absolute -top-8 left-0 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-t-md flex items-center gap-2 ${inputMode === 'positive' ? 'bg-green-900/40 text-green-400' : 'bg-red-900/40 text-red-400'}`}>
                        {inputMode === 'positive' ? 'Votre avis positif' : 'Votre critique'}
                        <button type="button" onClick={() => { setInputMode('neutral'); setText(''); }} className="hover:text-white underline ml-2">Annuler</button>
                    </div>
                    <div className="mb-3 flex flex-wrap gap-2">
                        {(inputMode === 'positive' ? POSITIVE_SUGGESTIONS : NEGATIVE_SUGGESTIONS).map((suggestion) => (
                            <button
                                key={suggestion}
                                type="button"
                                onClick={() => handleSuggestionClick(suggestion)}
                                className={`text-[10px] px-2 py-1 rounded-full border ${
                                    inputMode === 'positive'
                                        ? 'border-green-500/40 text-green-300 hover:bg-green-500/10'
                                        : 'border-red-500/40 text-red-300 hover:bg-red-500/10'
                                } transition-colors`}
                            >
                                {suggestion}
                            </button>
                        ))}
                    </div>
                    <div className={`flex items-center bg-gray-900 rounded-xl border focus-within:ring-1 transition-all ${inputMode === 'positive' ? 'border-green-500/30 focus-within:ring-green-500' : 'border-red-500/30 focus-within:ring-red-500'}`}>
                        <input
                            type="text"
                            ref={inputRef}
                            value={text}
                            onChange={(e) => setText(e.target.value)}
                            placeholder={inputMode === 'positive' ? "Pourquoi êtes-vous d'accord ?" : "Pourquoi n'êtes-vous pas d'accord ?"}
                            className="w-full bg-transparent px-4 py-3 text-white placeholder-gray-500 focus:outline-none text-sm"
                            autoFocus
                        />
                        <button 
                            type="submit" 
                            disabled={!text.trim()} 
                            className={`p-2 mr-1 transition-colors ${inputMode === 'positive' ? 'text-green-500 hover:text-green-400' : 'text-red-500 hover:text-red-400'} disabled:opacity-30 disabled:cursor-not-allowed`}
                        >
                            <SendIcon className="w-5 h-5" />
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
