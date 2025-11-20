import React from 'react';
import { Source } from '../types';
import { CloseIcon } from './icons/CloseIcon';

interface SourceListModalProps {
  sources: Source[];
  onClose: () => void;
}

const SourceListModal: React.FC<SourceListModalProps> = ({ sources, onClose }) => {
  const getBiasColor = (bias: string) => {
    switch (bias) {
      case 'left': return 'text-bias-left border-bias-left/30 bg-bias-left/10';
      case 'right': return 'text-bias-right border-bias-right/30 bg-bias-right/10';
      case 'center': return 'text-gray-300 border-gray-500/30 bg-gray-500/10';
      default: return 'text-bias-neutral border-bias-neutral/30 bg-bias-neutral/10';
    }
  };

  const translateBias = (bias: string) => {
    switch (bias) {
      case 'left': return 'GAUCHE';
      case 'right': return 'DROITE';
      case 'center': return 'CENTRE';
      default: return 'NEUTRE';
    }
  };

  const isSearchLink = (url: string) => {
    return url.includes('google.com/search');
  };

  const getLinkDisplay = (url: string) => {
    if (isSearchLink(url)) {
      return "Trouver via Google";
    }
    try {
      const domain = new URL(url).hostname;
      return domain.replace('www.', '');
    } catch (e) {
      return 'Lien externe';
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-xl z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-[#121212] border border-white/10 rounded-3xl w-full max-w-lg relative text-white flex flex-col shadow-2xl animate-slide-up max-h-[80vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="flex-shrink-0 p-5 border-b border-white/10 flex justify-between items-center bg-white/5 relative z-10">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-bold tracking-tight prism-text">Sources du Spectre</h2>
            {/* Reference Badge */}
            <div className="group relative">
              <div className="flex items-center gap-1.5 px-2 py-0.5 bg-green-500/10 border border-green-500/30 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-2.5 h-2.5 text-green-400">
                  <path fillRule="evenodd" d="M16.403 12.652a3 3 0 000-5.304 3 3 0 00-3.75-3.751 3 3 0 00-5.305 0 3 3 0 00-3.751 3.75 3 3 0 000 5.305 3 3 0 003.75 3.751 3 3 0 005.305 0 3 3 0 003.751-3.75zm-2.546-4.46a.75.75 0 00-1.214-.883l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                </svg>
                <span className="text-[7px] font-bold text-green-400 uppercase tracking-widest">Ref.</span>
              </div>
              {/* Tooltip */}
              <div className="absolute top-full left-0 mt-2 w-56 p-3 bg-black/95 backdrop-blur-xl border border-white/20 rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none z-50">
                <p className="text-[10px] text-gray-300 leading-relaxed mb-2">
                  Positionnement basé sur des sources indépendantes reconnues :
                </p>
                <ul className="text-[9px] text-gray-400 space-y-1">
                  <li>• Media Bias/Fact Check</li>
                  <li>• AllSides</li>
                  <li>• Ad Fontes Media</li>
                  <li>• Décodex (Le Monde)</li>
                </ul>
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors"
            aria-label="Fermer"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </header>

        <div className="flex-grow overflow-y-auto p-5 space-y-4 custom-scrollbar bg-[#0a0a0a]">
          {sources.map((source) => {
            // Helper for fallback URL
            const domainName = source.name.toLowerCase().replace(/\s+/g, '');
            const googleFavicon = `https://www.google.com/s2/favicons?domain=${domainName}.com&sz=128`;

            return (
              <div key={source.name} className="bg-white/5 p-4 rounded-2xl flex items-start gap-4 border border-white/5 hover:border-white/20 transition-all group">
                <div className="w-12 h-12 bg-white rounded-xl p-1 flex-shrink-0 flex items-center justify-center overflow-hidden relative shadow-md">
                  <img
                    src={source.logoUrl}
                    alt={`Logo de ${source.name}`}
                    className="w-full h-full object-contain z-10 relative"
                    onError={(e) => {
                      const target = e.target as HTMLImageElement;
                      if (target.src !== googleFavicon) {
                        target.src = googleFavicon;
                      } else {
                        target.style.display = 'none';
                        target.parentElement!.querySelector('.fallback-text')!.classList.remove('hidden');
                      }
                    }}
                  />
                  <div className="fallback-text hidden absolute inset-0 flex items-center justify-center text-gray-800 font-black text-xs uppercase">
                    {source.name.substring(0, 2)}
                  </div>
                </div>
                <div className="flex-grow min-w-0">
                  <div className="flex justify-between items-center mb-1">
                    <h3 className="font-bold text-base truncate text-white group-hover:text-neon-accent transition-colors">{source.name}</h3>
                    <div className={`flex items-center gap-1.5 px-2 py-0.5 rounded-full border ${getBiasColor(source.bias)}`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current"></span>
                      <span className="text-[9px] font-bold uppercase tracking-widest">{translateBias(source.bias)}</span>
                    </div>
                  </div>
                  <p className="text-gray-400 text-xs leading-relaxed line-clamp-2 mb-2.5">{source.coverageSummary}</p>

                  {source.url && (
                    <div className="flex items-center gap-1.5 text-[10px] text-gray-500 font-medium">
                      <span className={`w-1.5 h-1.5 rounded-full inline-block ${isSearchLink(source.url) ? 'bg-blue-500' : 'bg-green-500'}`}></span>
                      {isSearchLink(source.url) ? 'Recherche Web' : 'Lien Direct'}: {getLinkDisplay(source.url)}
                    </div>
                  )}
                </div>
                {source.url && (
                  <a
                    href={source.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center transition-all border shadow-lg ${isSearchLink(source.url) ? 'bg-blue-500/10 text-blue-400 border-blue-500/30 hover:bg-blue-500 hover:text-white' : 'bg-white/5 text-gray-400 border-white/10 hover:bg-neon-accent hover:text-black hover:border-neon-accent'}`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                      {isSearchLink(source.url) ? (
                        <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.19 8.688a4.5 4.5 0 011.242 7.244l-4.5 4.5a4.5 4.5 0 01-6.364-6.364l1.757-1.757m13.35-.622l1.757-1.757a4.5 4.5 0 00-6.364-6.364l-4.5 4.5a4.5 4.5 0 001.242 7.244" />
                      )}
                    </svg>
                  </a>
                )}
              </div>
            )
          })}
        </div>
      </div>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.2);
          border-radius: 10px;
        }
      `}</style>
    </div>
  );
};

export default SourceListModal;