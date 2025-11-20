import React, { useState } from 'react';
import { Source } from '../types';
import { CloseIcon } from './icons/CloseIcon';

interface SourceDetailModalProps {
  source: Source;
  onClose: () => void;
}

const SourceDetailModal: React.FC<SourceDetailModalProps> = ({ source, onClose }) => {
  const [imgError, setImgError] = useState(false);



  const translateBias = (bias: string) => {
    switch (bias) {
      case 'left': return 'GAUCHE';
      case 'right': return 'DROITE';
      case 'center': return 'CENTRE';
      default: return 'NEUTRE';
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-xl z-50 flex items-center justify-center p-6 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-[#1C1C1E] border border-white/10 rounded-3xl p-8 w-full max-w-md relative text-white shadow-2xl animate-slide-up overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Background Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-white/5 rounded-full blur-3xl pointer-events-none"></div>

        <button
          onClick={onClose}
          className="absolute top-4 right-4 w-8 h-8 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center transition-colors z-20"
          aria-label="Fermer"
        >
          <CloseIcon className="w-5 h-5 text-gray-300" />
        </button>

        <div className="flex flex-col items-center text-center mb-6 relative z-10">
          <div className="w-24 h-24 bg-white rounded-2xl p-2 shadow-lg mb-5 flex items-center justify-center ring-1 ring-white/10 overflow-hidden relative">
            {!imgError ? (
              <img
                src={source.logoUrl}
                alt={`Logo de ${source.name}`}
                className="w-full h-full object-contain rounded-xl"
                onError={() => setImgError(true)}
              />
            ) : (
              <div className="w-full h-full bg-gray-200 flex items-center justify-center text-gray-400 font-black text-3xl uppercase">
                {source.name.substring(0, 2)}
              </div>
            )}
          </div>
          <h2 className="text-3xl font-bold tracking-tight mb-2">{source.name}</h2>
        </div>

        {/* Spectrum Visualization */}
        <div className="w-full mb-8 relative z-10">
          <div className="flex justify-between items-start mb-3">
            <div>
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-widest block mb-1">Positionnement Vérifié</span>
              <span className="text-xs text-gray-400">Vérifiez la cohérence du placement</span>
            </div>
            {/* Reference Badge */}
            <div className="group relative">
              <div className="flex items-center gap-1.5 px-2.5 py-1 bg-green-500/10 border border-green-500/30 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 text-green-400">
                  <path fillRule="evenodd" d="M16.403 12.652a3 3 0 000-5.304 3 3 0 00-3.75-3.751 3 3 0 00-5.305 0 3 3 0 00-3.751 3.75 3 3 0 000 5.305 3 3 0 003.75 3.751 3 3 0 005.305 0 3 3 0 003.751-3.75zm-2.546-4.46a.75.75 0 00-1.214-.883l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
                </svg>
                <span className="text-[8px] font-bold text-green-400 uppercase tracking-widest">Référencé</span>
              </div>
              {/* Tooltip */}
              <div className="absolute bottom-full right-0 mb-2 w-56 p-3 bg-black/95 backdrop-blur-xl border border-white/20 rounded-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 pointer-events-none z-50">
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

          <div className="relative h-2 w-full bg-white/10 rounded-full overflow-visible">
            {/* Gradient Background */}
            <div className="absolute inset-0 rounded-full bg-gradient-to-r from-bias-left via-bias-center to-bias-right opacity-50"></div>

            {/* Markers */}
            <div className="absolute top-0 bottom-0 left-0 w-px bg-white/20"></div>
            <div className="absolute top-0 bottom-0 left-1/2 w-px bg-white/50 -translate-x-1/2"></div>
            <div className="absolute top-0 bottom-0 right-0 w-px bg-white/20"></div>

            {/* Position Indicator */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full shadow-[0_0_10px_rgba(255,255,255,0.5)] border-2 border-black transform -translate-x-1/2 transition-all duration-500"
              style={{ left: `${source.position}%` }}
            >
              {/* Tooltip/Label above */}
              <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-black/80 border border-white/20 rounded text-[8px] font-bold uppercase tracking-widest whitespace-nowrap">
                {translateBias(source.bias)}
              </div>
            </div>
          </div>
          <div className="flex justify-between mt-2 text-[8px] font-bold text-gray-600 uppercase tracking-widest">
            <span>Gauche</span>
            <span>Centre</span>
            <span>Droite</span>
          </div>
        </div>

        <div className="bg-white/5 rounded-2xl p-6 border border-white/5 mb-6 relative z-10">
          <h3 className="text-xs font-bold text-gray-500 uppercase mb-3 tracking-wider">
            Couverture Médiatique
          </h3>
          <p className="text-gray-200 leading-relaxed text-sm">
            {source.coverageSummary}
          </p>
        </div>

        {source.url && (
          <a
            href={source.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex w-full items-center justify-center py-3.5 px-4 rounded-xl bg-gradient-to-r from-neon-accent to-blue-600 text-white font-bold text-sm uppercase tracking-wide shadow-lg shadow-blue-900/20 hover:scale-[1.02] active:scale-95 transition-all relative z-10"
          >
            Lire l'article complet
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4 ml-2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
            </svg>
          </a>
        )}
      </div>
    </div>
  );
};

export default SourceDetailModal;