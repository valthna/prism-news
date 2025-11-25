import React, { useState } from 'react';
import { Source } from '../types';
import { CloseIcon } from './icons/CloseIcon';

interface SourceDetailModalProps {
  source: Source;
  onClose: () => void;
}

const SourceDetailModal: React.FC<SourceDetailModalProps> = ({ source, onClose }) => {
  const [imgError, setImgError] = useState(false);

  // Extraire le domaine de l'URL pour affichage
  const getDomain = (url?: string): string => {
    if (!url) return '';
    try {
      return new URL(url).hostname.replace('www.', '');
    } catch {
      return url.split('/')[0] || '';
    }
  };

  // Vérifier si l'URL est un lien direct vers un article (pas juste la homepage)
  const isDirectArticleLink = (url?: string): boolean => {
    if (!url) return false;
    try {
      const parsedUrl = new URL(url);
      // Un article a généralement un path plus long que juste "/"
      return parsedUrl.pathname.length > 1 && !parsedUrl.pathname.endsWith('/');
    } catch {
      return false;
    }
  };

  const domain = getDomain(source.url);
  const hasDirectLink = isDirectArticleLink(source.url);

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-xl z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-[#0D0D0F] border border-white/10 rounded-3xl w-full max-w-md relative text-white shadow-2xl animate-slide-up overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header avec logo et nom */}
        <div className="relative p-6 pb-4 border-b border-white/5">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 bg-white/5 hover:bg-white/10 rounded-full flex items-center justify-center transition-colors z-20"
            aria-label="Fermer"
          >
            <CloseIcon className="w-4 h-4 text-gray-400" />
          </button>

          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white rounded-xl p-2 shadow-lg flex items-center justify-center ring-1 ring-white/10 overflow-hidden shrink-0">
              {!imgError ? (
                <img
                  src={source.logoUrl}
                  alt={`Logo de ${source.name}`}
                  className="w-full h-full object-contain"
                  onError={() => setImgError(true)}
                />
              ) : (
                <div className="w-full h-full bg-gray-100 flex items-center justify-center text-gray-500 font-black text-xl uppercase">
                  {source.name.substring(0, 2)}
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl font-bold tracking-tight truncate">{source.name}</h2>
              {domain && (
                <p className="text-xs text-gray-500 mt-0.5 truncate">{domain}</p>
              )}
            </div>
          </div>
        </div>

        {/* Contenu principal */}
        <div className="p-6 space-y-5">
          
          {/* Section: Ce que dit cette source */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-blue-400">
                <path fillRule="evenodd" d="M4.5 2A1.5 1.5 0 003 3.5v13A1.5 1.5 0 004.5 18h11a1.5 1.5 0 001.5-1.5V7.621a1.5 1.5 0 00-.44-1.06l-4.12-4.122A1.5 1.5 0 0011.378 2H4.5zm2.25 8.5a.75.75 0 000 1.5h6.5a.75.75 0 000-1.5h-6.5zm0 3a.75.75 0 000 1.5h6.5a.75.75 0 000-1.5h-6.5z" clipRule="evenodd" />
              </svg>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                Couverture de ce sujet
              </h3>
            </div>
            <div className="bg-white/[0.03] rounded-xl p-4 border border-white/5">
              <p className="text-gray-300 leading-relaxed text-sm">
                {source.coverageSummary || "Cette source a couvert ce sujet dans son actualité récente."}
              </p>
            </div>
          </div>

          {/* Section: Positionnement éditorial */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-purple-400">
                  <path d="M12.5 4.5a2.5 2.5 0 00-5 0V7H6a3 3 0 00-3 3v5.5a3 3 0 003 3h8a3 3 0 003-3V10a3 3 0 00-3-3h-1.5V4.5z" />
                </svg>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Ligne éditoriale
                </h3>
              </div>
              <div className="flex items-center gap-1.5 px-2 py-1 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3 text-emerald-400">
                  <path fillRule="evenodd" d="M12.416 3.376a.75.75 0 0 1 .208 1.04l-5 7.5a.75.75 0 0 1-1.154.114l-3-3a.75.75 0 0 1 1.06-1.06l2.353 2.353 4.493-6.74a.75.75 0 0 1 1.04-.207Z" clipRule="evenodd" />
                </svg>
                <span className="text-[9px] font-semibold text-emerald-400 uppercase">Référencé</span>
              </div>
            </div>

            {/* Barre de positionnement simplifiée */}
            <div className="relative">
              <div className="h-2 w-full bg-gradient-to-r from-blue-500/30 via-gray-500/30 to-red-500/30 rounded-full">
                <div
                  className="absolute top-1/2 -translate-y-1/2 w-3 h-3 bg-white rounded-full shadow-lg border-2 border-gray-900 transform -translate-x-1/2"
                  style={{ left: `${source.position}%` }}
                />
              </div>
              <div className="flex justify-between mt-1.5 text-[9px] font-medium text-gray-600">
                <span>Gauche</span>
                <span>Centre</span>
                <span>Droite</span>
              </div>
            </div>

            <p className="text-[11px] text-gray-500 leading-relaxed">
              Positionnement basé sur Media Bias/Fact Check, AllSides et Décodex.
            </p>
          </div>

          {/* Indicateurs de confiance */}
          <div className="flex items-center gap-3 py-3 border-t border-white/5">
            <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5 text-green-500">
                <path fillRule="evenodd" d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14Zm3.844-8.791a.75.75 0 0 0-1.188-.918l-3.7 4.79-1.649-1.833a.75.75 0 1 0-1.114 1.004l2.25 2.5a.75.75 0 0 0 1.151-.043l4.25-5.5Z" clipRule="evenodd" />
              </svg>
              <span>Source vérifiée</span>
            </div>
            {hasDirectLink && (
              <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5 text-blue-500">
                  <path fillRule="evenodd" d="M8.914 6.025a.75.75 0 0 1 1.06 0 3.5 3.5 0 0 1 0 4.95l-2 2a3.5 3.5 0 0 1-5.396-4.402.75.75 0 0 1 1.251.827 2 2 0 0 0 3.085 2.514l2-2a2 2 0 0 0 0-2.828.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                  <path fillRule="evenodd" d="M7.086 9.975a.75.75 0 0 1-1.06 0 3.5 3.5 0 0 1 0-4.95l2-2a3.5 3.5 0 0 1 5.396 4.402.75.75 0 0 1-1.251-.827 2 2 0 0 0-3.085-2.514l-2 2a2 2 0 0 0 0 2.828.75.75 0 0 1 0 1.06Z" clipRule="evenodd" />
                </svg>
                <span>Lien direct</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer avec CTA */}
        {source.url && (
          <div className="p-4 pt-0">
            <a
              href={source.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex w-full items-center justify-center py-3.5 px-4 rounded-xl bg-white text-black font-bold text-sm tracking-wide hover:bg-gray-100 active:scale-[0.98] transition-all gap-2"
            >
              <span>Lire sur {domain || source.name}</span>
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M4.25 5.5a.75.75 0 00-.75.75v8.5c0 .414.336.75.75.75h8.5a.75.75 0 00.75-.75v-4a.75.75 0 011.5 0v4A2.25 2.25 0 0112.75 17h-8.5A2.25 2.25 0 012 14.75v-8.5A2.25 2.25 0 014.25 4h5a.75.75 0 010 1.5h-5z" clipRule="evenodd" />
                <path fillRule="evenodd" d="M6.194 12.753a.75.75 0 001.06.053L16.5 4.44v2.81a.75.75 0 001.5 0v-4.5a.75.75 0 00-.75-.75h-4.5a.75.75 0 000 1.5h2.553l-9.056 8.194a.75.75 0 00-.053 1.06z" clipRule="evenodd" />
              </svg>
            </a>
            {!hasDirectLink && source.url && (
              <p className="text-[10px] text-gray-600 text-center mt-2">
                Lien vers la page principale du média
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default SourceDetailModal;
