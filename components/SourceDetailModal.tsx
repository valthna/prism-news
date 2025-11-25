import React, { useState, useMemo, useEffect } from 'react';
import { Source } from '../types';
import { CloseIcon } from './icons/CloseIcon';
import { getMediaOwner, MediaOwnerInfo, getSiblingMedias, getMediaDetails, MediaDetails } from '../constants/mediaOwners';

interface SourceDetailModalProps {
  source: Source;
  onClose: () => void;
}

// Composant pour afficher un score sous forme de jauge
const ScoreGauge: React.FC<{ score: number; label: string; color: string }> = ({ score, label, color }) => (
  <div className="flex-1 space-y-1.5">
    <div className="flex items-center justify-between">
      <span className="text-[10px] text-gray-500 uppercase tracking-wider font-medium">{label}</span>
      <span className="text-[11px] font-bold" style={{ color }}>{score}%</span>
    </div>
    <div className="h-1.5 bg-white/5 rounded-full overflow-hidden">
      <div 
        className="h-full rounded-full transition-all duration-700 ease-out"
        style={{ 
          width: `${score}%`, 
          backgroundColor: color,
          boxShadow: `0 0 8px ${color}50`
        }}
      />
    </div>
  </div>
);

const SourceDetailModal: React.FC<SourceDetailModalProps> = ({ source, onClose }) => {
  const [imgFallbackLevel, setImgFallbackLevel] = useState(0); // 0: original, 1: google favicon, 2: initiales

  // Reset le niveau de fallback quand la source change
  useEffect(() => {
    setImgFallbackLevel(0);
  }, [source.logoUrl]);

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
  
  // Récupérer les informations sur le propriétaire du média
  const ownerInfo: MediaOwnerInfo = useMemo(() => getMediaOwner(source.name), [source.name]);
  const isKnownOwner = ownerInfo.group !== 'independent';
  
  // Récupérer les médias du même groupe
  const siblingMedias = useMemo(() => getSiblingMedias(source.name), [source.name]);
  
  // Récupérer les détails du média (année, type, scores)
  const mediaDetails: MediaDetails | null = useMemo(() => getMediaDetails(source.name), [source.name]);
  
  // Couleur pour les scores basée sur la valeur
  const getScoreColor = (score: number): string => {
    if (score >= 80) return '#10B981'; // emerald
    if (score >= 60) return '#F59E0B'; // amber
    return '#EF4444'; // red
  };

  // URL du logo avec système de fallback
  const getLogoUrl = (): string | null => {
    if (imgFallbackLevel === 0) {
      return source.logoUrl;
    }
    if (imgFallbackLevel === 1) {
      // Google Favicon comme fallback
      const fallbackDomain = domain || source.name.toLowerCase().replace(/[^a-z0-9]/g, '') + '.com';
      return `https://www.google.com/s2/favicons?domain=${fallbackDomain}&sz=128`;
    }
    return null; // Niveau 2 = afficher les initiales
  };

  const handleImageError = () => {
    setImgFallbackLevel(prev => Math.min(prev + 1, 2));
  };

  const logoUrl = getLogoUrl();

  return (
    <div
      className="fixed inset-0 bg-black/70 backdrop-blur-xl z-50 flex items-center justify-center p-4 animate-fade-in"
      onClick={onClose}
    >
      <div
        className="bg-[#0D0D0F] border border-white/10 rounded-3xl w-full max-w-md relative text-white shadow-2xl animate-slide-up overflow-hidden max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header avec logo et nom - Design premium */}
        <div className="relative overflow-hidden">
          {/* Background gradient basé sur la couleur du propriétaire */}
          <div 
            className="absolute inset-0 opacity-20"
            style={{ 
              background: `linear-gradient(135deg, ${ownerInfo.color}40 0%, transparent 50%, transparent 100%)`
            }}
          />
          
          <div className="relative p-6 pb-4 border-b border-white/5">
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-8 h-8 bg-black/30 hover:bg-black/50 backdrop-blur-sm rounded-full flex items-center justify-center transition-all z-20 hover:scale-110"
              aria-label="Fermer"
            >
              <CloseIcon className="w-4 h-4 text-white/80" />
            </button>

            <div className="flex items-center gap-4">
              {/* Logo avec fallback stylisé (3 niveaux: original → Google Favicon → initiales) */}
              <div 
                className="w-16 h-16 rounded-xl shrink-0 flex items-center justify-center overflow-hidden"
                style={{ 
                  boxShadow: `0 4px 20px ${ownerInfo.color}30`,
                  border: `2px solid ${ownerInfo.color}40`,
                  backgroundColor: logoUrl ? 'white' : ownerInfo.color
                }}
              >
                {logoUrl ? (
                  <img
                    src={logoUrl}
                    alt={`Logo de ${source.name}`}
                    className="w-full h-full object-contain p-1.5"
                    onError={handleImageError}
                  />
                ) : (
                  <span 
                    className="font-black text-xl uppercase text-white drop-shadow-md"
                    style={{ textShadow: '0 1px 2px rgba(0,0,0,0.3)' }}
                  >
                    {source.name.substring(0, 2)}
                  </span>
                )}
              </div>
              
              <div className="flex-1 min-w-0">
                <h2 className="text-xl font-bold tracking-tight truncate">{source.name}</h2>
                <div className="flex items-center gap-2 mt-1">
                  {domain && (
                    <span className="text-xs text-gray-500 truncate">{domain}</span>
                  )}
                  {mediaDetails && (
                    <>
                      <span className="text-gray-600">•</span>
                      <span 
                        className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                        style={{ 
                          backgroundColor: `${ownerInfo.color}15`,
                          color: ownerInfo.color
                        }}
                      >
                        {mediaDetails.typeLabel}
                      </span>
                    </>
                  )}
                </div>
                {mediaDetails?.founded && (
                  <p className="text-[10px] text-gray-600 mt-1">
                    Fondé en {mediaDetails.founded} • {new Date().getFullYear() - mediaDetails.founded} ans d'existence
                  </p>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Contenu principal */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1">
          
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

          {/* Section: Propriétaire du média */}
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-amber-400">
                <path fillRule="evenodd" d="M9.674 2.075a.75.75 0 0 1 .652 0l7.25 3.5A.75.75 0 0 1 17 6.957V16.5h.25a.75.75 0 0 1 0 1.5H2.75a.75.75 0 0 1 0-1.5H3V6.957a.75.75 0 0 1-.576-1.382l7.25-3.5ZM11 6a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM7.5 9.75a.75.75 0 0 0-1.5 0v5.5a.75.75 0 0 0 1.5 0v-5.5Zm3.25 0a.75.75 0 0 0-1.5 0v5.5a.75.75 0 0 0 1.5 0v-5.5Zm3.25 0a.75.75 0 0 0-1.5 0v5.5a.75.75 0 0 0 1.5 0v-5.5Z" clipRule="evenodd" />
              </svg>
              <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                Propriétaire
              </h3>
            </div>
            
            <div 
              className="relative overflow-hidden rounded-xl border transition-all"
              style={{ 
                borderColor: `${ownerInfo.color}30`,
                background: `linear-gradient(135deg, ${ownerInfo.color}08 0%, transparent 60%)`
              }}
            >
              {/* Accent bar */}
              <div 
                className="absolute left-0 top-0 bottom-0 w-1"
                style={{ backgroundColor: ownerInfo.color }}
              />
              
              <div className="p-4 pl-5">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2.5">
                    {/* Owner badge */}
                    <div 
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-white font-bold text-sm shadow-lg"
                      style={{ backgroundColor: ownerInfo.color }}
                    >
                      {ownerInfo.label.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <span className="text-white font-semibold text-sm">
                        {ownerInfo.label}
                      </span>
                      {isKnownOwner && (
                        <span 
                          className="ml-2 text-[9px] font-bold uppercase px-1.5 py-0.5 rounded-full"
                          style={{ 
                            backgroundColor: `${ownerInfo.color}20`,
                            color: ownerInfo.color
                          }}
                        >
                          {ownerInfo.group === 'public' ? 'Service public' : 'Groupe média'}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  {ownerInfo.description}
                </p>
                
                {/* Info supplémentaire pour les groupes connus */}
                {isKnownOwner && ownerInfo.group !== 'public' && (
                  <div className="mt-3 pt-3 border-t border-white/5 flex items-start gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5 text-gray-500 mt-0.5 shrink-0">
                      <path fillRule="evenodd" d="M15 8A7 7 0 1 1 1 8a7 7 0 0 1 14 0ZM9 5a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM6.75 8a.75.75 0 0 0 0 1.5h.75v1.75a.75.75 0 0 0 1.5 0v-2.5A.75.75 0 0 0 8.25 8h-1.5Z" clipRule="evenodd" />
                    </svg>
                    <p className="text-[10px] text-gray-500 leading-relaxed">
                      La ligne éditoriale peut être influencée par les intérêts économiques ou politiques du groupe propriétaire.
                    </p>
                  </div>
                )}
                
                {ownerInfo.group === 'public' && (
                  <div className="mt-3 pt-3 border-t border-white/5 flex items-start gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5 text-gray-500 mt-0.5 shrink-0">
                      <path fillRule="evenodd" d="M15 8A7 7 0 1 1 1 8a7 7 0 0 1 14 0ZM9 5a1 1 0 1 1-2 0 1 1 0 0 1 2 0ZM6.75 8a.75.75 0 0 0 0 1.5h.75v1.75a.75.75 0 0 0 1.5 0v-2.5A.75.75 0 0 0 8.25 8h-1.5Z" clipRule="evenodd" />
                    </svg>
                    <p className="text-[10px] text-gray-500 leading-relaxed">
                      Financé par la redevance audiovisuelle et l'État français. Mission de service public.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section: Scores de fiabilité (si disponibles) */}
          {mediaDetails && (mediaDetails.factualityScore || mediaDetails.transparencyScore) && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-cyan-400">
                  <path fillRule="evenodd" d="M10 1a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5A.75.75 0 0110 1zM5.05 3.05a.75.75 0 011.06 0l1.062 1.06A.75.75 0 116.11 5.173L5.05 4.11a.75.75 0 010-1.06zm9.9 0a.75.75 0 010 1.06l-1.06 1.062a.75.75 0 01-1.062-1.061l1.061-1.06a.75.75 0 011.06 0zM3 8a.75.75 0 01.75-.75h1.5a.75.75 0 010 1.5h-1.5A.75.75 0 013 8zm11 0a.75.75 0 01.75-.75h1.5a.75.75 0 010 1.5h-1.5A.75.75 0 0114 8zm-6.828 2.828a.75.75 0 010 1.061L6.11 12.95a.75.75 0 01-1.06-1.06l1.06-1.06a.75.75 0 011.061 0zm6.594-1.06a.75.75 0 011.06 0l1.06 1.06a.75.75 0 11-1.06 1.06l-1.06-1.06a.75.75 0 010-1.06zM10 11.75a.75.75 0 01.75.75v1.5a.75.75 0 01-1.5 0v-1.5a.75.75 0 01.75-.75z" clipRule="evenodd" />
                  <path d="M10 14a4 4 0 100-8 4 4 0 000 8z" />
                </svg>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Indicateurs de fiabilité
                </h3>
              </div>
              
              <div className="bg-white/[0.03] rounded-xl p-4 border border-white/5 space-y-4">
                <div className="flex gap-4">
                  {mediaDetails.factualityScore && (
                    <ScoreGauge 
                      score={mediaDetails.factualityScore} 
                      label="Factualité" 
                      color={getScoreColor(mediaDetails.factualityScore)}
                    />
                  )}
                  {mediaDetails.transparencyScore && (
                    <ScoreGauge 
                      score={mediaDetails.transparencyScore} 
                      label="Transparence" 
                      color={getScoreColor(mediaDetails.transparencyScore)}
                    />
                  )}
                </div>
                <p className="text-[10px] text-gray-600 leading-relaxed">
                  Scores basés sur des évaluations indépendantes (Media Bias/Fact Check, NewsGuard, Décodex).
                </p>
              </div>
            </div>
          )}

          {/* Section: Autres médias du groupe */}
          {siblingMedias.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-indigo-400">
                  <path d="M7 3.5A1.5 1.5 0 018.5 2h3.879a1.5 1.5 0 011.06.44l3.122 3.12A1.5 1.5 0 0117 6.622V12.5a1.5 1.5 0 01-1.5 1.5h-1v-3.379a3 3 0 00-.879-2.121L10.5 5.379A3 3 0 008.379 4.5H7v-1z" />
                  <path d="M4.5 6A1.5 1.5 0 003 7.5v9A1.5 1.5 0 004.5 18h7a1.5 1.5 0 001.5-1.5v-5.879a1.5 1.5 0 00-.44-1.06L9.44 6.439A1.5 1.5 0 008.378 6H4.5z" />
                </svg>
                <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                  Même groupe ({ownerInfo.label})
                </h3>
              </div>
              
              <div className="flex flex-wrap gap-2">
                {siblingMedias.map((media, idx) => (
                  <span 
                    key={idx}
                    className="text-[11px] px-2.5 py-1.5 rounded-lg border transition-all hover:scale-105"
                    style={{ 
                      backgroundColor: `${ownerInfo.color}08`,
                      borderColor: `${ownerInfo.color}20`,
                      color: 'rgba(255,255,255,0.7)'
                    }}
                  >
                    {media}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Indicateurs de confiance */}
          <div className="flex flex-wrap items-center gap-2 py-3 border-t border-white/5">
            <div className="flex items-center gap-1.5 text-[10px] text-gray-500 px-2 py-1 rounded-full bg-white/5">
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5 text-green-500">
                <path fillRule="evenodd" d="M8 15A7 7 0 1 0 8 1a7 7 0 0 0 0 14Zm3.844-8.791a.75.75 0 0 0-1.188-.918l-3.7 4.79-1.649-1.833a.75.75 0 1 0-1.114 1.004l2.25 2.5a.75.75 0 0 0 1.151-.043l4.25-5.5Z" clipRule="evenodd" />
              </svg>
              <span>Source vérifiée</span>
            </div>
            {hasDirectLink && (
              <div className="flex items-center gap-1.5 text-[10px] text-gray-500 px-2 py-1 rounded-full bg-white/5">
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5 text-blue-500">
                  <path fillRule="evenodd" d="M8.914 6.025a.75.75 0 0 1 1.06 0 3.5 3.5 0 0 1 0 4.95l-2 2a3.5 3.5 0 0 1-5.396-4.402.75.75 0 0 1 1.251.827 2 2 0 0 0 3.085 2.514l2-2a2 2 0 0 0 0-2.828.75.75 0 0 1 0-1.06Z" clipRule="evenodd" />
                  <path fillRule="evenodd" d="M7.086 9.975a.75.75 0 0 1-1.06 0 3.5 3.5 0 0 1 0-4.95l2-2a3.5 3.5 0 0 1 5.396 4.402.75.75 0 0 1-1.251-.827 2 2 0 0 0-3.085-2.514l-2 2a2 2 0 0 0 0 2.828.75.75 0 0 1 0 1.06Z" clipRule="evenodd" />
                </svg>
                <span>Lien direct</span>
              </div>
            )}
            {isKnownOwner && (
              <div 
                className="flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-full"
                style={{ 
                  backgroundColor: `${ownerInfo.color}15`,
                  color: ownerInfo.color
                }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                  <path fillRule="evenodd" d="M1 2.75A.75.75 0 0 1 1.75 2h10.5a.75.75 0 0 1 0 1.5H2.5v12h6.25a.75.75 0 0 1 0 1.5H1.75a.75.75 0 0 1-.75-.75V2.75Zm5.5 5.5a.75.75 0 0 1 .75-.75h6a.75.75 0 0 1 0 1.5h-6a.75.75 0 0 1-.75-.75Zm.75 2.25a.75.75 0 0 0 0 1.5h6a.75.75 0 0 0 0-1.5h-6Z" clipRule="evenodd" />
                </svg>
                <span className="font-medium">{ownerInfo.label}</span>
              </div>
            )}
            {mediaDetails?.type && (
              <div className="flex items-center gap-1.5 text-[10px] text-gray-500 px-2 py-1 rounded-full bg-white/5">
                {mediaDetails.type === 'tv' && (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5 text-purple-400">
                    <path d="M1 4.75A.75.75 0 011.75 4h12.5a.75.75 0 010 1.5H1.75A.75.75 0 011 4.75zM1 10.75A.75.75 0 011.75 10h12.5a.75.75 0 010 1.5H1.75a.75.75 0 01-.75-.75z" />
                  </svg>
                )}
                {mediaDetails.type === 'radio' && (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5 text-orange-400">
                    <path d="M4.5 7.25a.75.75 0 000 1.5h7a.75.75 0 000-1.5h-7z" />
                    <path fillRule="evenodd" d="M2 3.5A1.5 1.5 0 013.5 2h9A1.5 1.5 0 0114 3.5v9a1.5 1.5 0 01-1.5 1.5h-9A1.5 1.5 0 012 12.5v-9zM3.5 3a.5.5 0 00-.5.5v9a.5.5 0 00.5.5h9a.5.5 0 00.5-.5v-9a.5.5 0 00-.5-.5h-9z" clipRule="evenodd" />
                  </svg>
                )}
                {(mediaDetails.type === 'press' || mediaDetails.type === 'digital') && (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5 text-blue-400">
                    <path fillRule="evenodd" d="M4 1.75a.75.75 0 01.75.75V3h8.5a.75.75 0 010 1.5h-8.5v8.75a.75.75 0 01-1.5 0V2.5A.75.75 0 014 1.75z" clipRule="evenodd" />
                    <path fillRule="evenodd" d="M6 4.75A.75.75 0 016.75 4h6.5a.75.75 0 01.75.75v8.5a.75.75 0 01-.75.75h-6.5a.75.75 0 01-.75-.75v-8.5zm1.5 6.75v-6h5.5v6h-5.5z" clipRule="evenodd" />
                  </svg>
                )}
                {mediaDetails.type === 'agency' && (
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5 text-emerald-400">
                    <path fillRule="evenodd" d="M8 1.75a.75.75 0 01.692.462l1.41 3.393 3.664.293a.75.75 0 01.428 1.317l-2.791 2.39.853 3.574a.75.75 0 01-1.12.814L8 11.86l-3.136 1.983a.75.75 0 01-1.12-.814l.852-3.574-2.79-2.39a.75.75 0 01.427-1.317l3.664-.293 1.41-3.393A.75.75 0 018 1.75z" clipRule="evenodd" />
                  </svg>
                )}
                <span>{mediaDetails.typeLabel}</span>
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
