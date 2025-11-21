
import React, { useState, useEffect } from 'react';
import { CloseIcon } from './icons/CloseIcon';
import { ChevronRightIcon } from './icons/ChevronRightIcon';

interface SettingsModalProps {
  onClose: () => void;
}

const Toggle: React.FC<{ checked: boolean; onChange: (val: boolean) => void }> = ({ checked, onChange }) => (
  <button 
    onClick={() => onChange(!checked)}
    className={`w-12 h-7 rounded-full p-1 transition-colors duration-300 focus:outline-none ${checked ? 'bg-neon-accent' : 'bg-white/10'}`}
  >
    <div className={`w-5 h-5 bg-white rounded-full shadow-md transform transition-transform duration-300 ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
  </button>
);

const SectionHeader: React.FC<{ title: string }> = ({ title }) => (
    <h3 className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3 px-1 mt-6">{title}</h3>
);

const SettingRow: React.FC<{ 
    icon?: React.ReactNode; 
    label: string; 
    subLabel?: string;
    children: React.ReactNode;
    isDestructive?: boolean;
    onClick?: () => void;
}> = ({ icon, label, subLabel, children, isDestructive, onClick }) => (
    <div 
        onClick={onClick}
        className={`flex items-center justify-between p-4 bg-white/5 hover:bg-white/10 transition-colors border-b border-white/5 first:rounded-t-2xl last:rounded-b-2xl last:border-0 ${onClick ? 'cursor-pointer group' : ''}`}
    >
        <div className="flex items-center gap-3">
            {icon && <div className="text-gray-400">{icon}</div>}
            <div>
                <div className={`text-sm font-medium ${isDestructive ? 'text-red-500' : 'text-white'}`}>{label}</div>
                {subLabel && <div className="text-[11px] text-gray-500 mt-0.5">{subLabel}</div>}
            </div>
        </div>
        <div className="flex items-center gap-2 text-gray-400">
            {children}
            {onClick && <ChevronRightIcon className="w-4 h-4 opacity-50 group-hover:opacity-100 transition-opacity" />}
        </div>
    </div>
);

const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const [notifications, setNotifications] = useState(true);
  const [dataSaver, setDataSaver] = useState(false);
  const [autoPlay, setAutoPlay] = useState(true);
  const [highContrast, setHighContrast] = useState(false);
  const [textSize, setTextSize] = useState(100); // Percentage
  const [morningBrief, setMorningBrief] = useState(true);
  const [weekendDigest, setWeekendDigest] = useState(false);
  const [preloadInsights, setPreloadInsights] = useState(true);
  const preferenceSummary = [
    { label: 'Langue', value: 'FR · Français' },
    { label: 'Alertes', value: notifications ? 'Actives' : 'Coupées' },
    { label: 'Accessibilité', value: highContrast ? 'Contraste +' : 'Standard' },
  ];
  const titleId = "settings-modal-title";

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center sm:items-end sm:justify-center pointer-events-none">
        {/* Backdrop */}
        <div 
            className="absolute inset-0 bg-black/80 backdrop-blur-md pointer-events-auto animate-fade-in"
            onClick={onClose}
        />

        {/* Modal Container */}
        <div
            className="pointer-events-auto w-full sm:max-w-md h-full sm:h-[85vh] bg-[#121212] sm:rounded-t-3xl flex flex-col shadow-2xl animate-slide-up overflow-hidden ring-1 ring-white/10"
            role="dialog"
            aria-modal="true"
            aria-labelledby={titleId}
        >
            
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b border-white/10 bg-[#121212]/80 backdrop-blur-md z-10">
                <h2 id={titleId} className="text-xl font-black tracking-tight text-white">Réglages</h2>
                <button 
                    onClick={onClose}
                    className="p-2 bg-white/5 hover:bg-white/10 rounded-full transition-colors"
                >
                    <CloseIcon className="w-5 h-5 text-gray-300" />
                </button>
            </div>

            {/* Scrollable Content */}
            <div className="flex-1 overflow-y-auto p-5 pb-20 custom-scrollbar">
                
                {/* Profile + Résumé */}
                <div className="rounded-3xl border border-white/10 bg-gradient-to-r from-white/5 to-white/10 p-5 mb-6 space-y-5 shadow-lg shadow-black/30">
                    <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-full bg-neon-accent flex items-center justify-center text-black font-black text-xl shadow-lg shadow-neon-accent/20">
                            A
                        </div>
                        <div className="flex-1">
                            <div className="text-base font-bold text-white">Alpha User</div>
                            <div className="text-xs text-gray-400">Membre PRISM Pro</div>
                        </div>
                        <button className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs font-bold text-white transition-colors">
                            Éditer
                        </button>
                    </div>
                    <div className="grid grid-cols-3 gap-3">
                        {preferenceSummary.map(item => (
                            <div key={item.label} className="bg-black/30 rounded-2xl border border-white/5 px-3 py-2">
                                <p className="text-[9px] font-bold uppercase tracking-[0.3em] text-gray-500">{item.label}</p>
                                <p className="text-sm text-white">{item.value}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Section: Préférences de Contenu */}
                <SectionHeader title="Contenu & IA" />
                <div className="flex flex-col rounded-2xl overflow-hidden bg-white/5 border border-white/5">
                    <SettingRow label="Région et Langue" subLabel="France (Français)">
                        <span className="text-xs font-mono text-gray-500">FR-fr</span>
                    </SettingRow>
                    <SettingRow label="Sources Prioritaires">
                        <span className="text-xs text-gray-500">Équilibré</span>
                    </SettingRow>
                    <SettingRow label="Mode Débat IA" subLabel="Niveau de contradiction des analyses">
                         <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold px-2 py-1 bg-neon-accent/20 text-neon-accent rounded">INTENSE</span>
                         </div>
                    </SettingRow>
                </div>

                {/* Section: Apparence */}
                <SectionHeader title="Apparence & Lecture" />
                <div className="flex flex-col rounded-2xl overflow-hidden bg-white/5 border border-white/5">
                    <div className="p-4 border-b border-white/5">
                        <div className="flex justify-between mb-2">
                            <span className="text-sm font-medium text-white">Taille du texte</span>
                            <span className="text-xs font-mono text-gray-500">{textSize}%</span>
                        </div>
                        <input 
                            type="range" 
                            min="80" 
                            max="140" 
                            value={textSize} 
                            onChange={(e) => setTextSize(parseInt(e.target.value))}
                            className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer accent-neon-accent"
                        />
                        <div className="flex justify-between mt-1 text-[10px] text-gray-500 font-bold">
                            <span>Aa</span>
                            <span>Aa</span>
                        </div>
                    </div>
                     <SettingRow label="Contraste Élevé" subLabel="Améliore la lisibilité du texte">
                        <Toggle checked={highContrast} onChange={setHighContrast} />
                    </SettingRow>
                    <SettingRow label="Lecture Automatique" subLabel="Vidéos et animations">
                        <Toggle checked={autoPlay} onChange={setAutoPlay} />
                    </SettingRow>
                </div>

                {/* Section: Alertes */}
                <SectionHeader title="Alertes & Diffusion" />
                <div className="flex flex-col rounded-2xl overflow-hidden bg-white/5 border border-white/5">
                    <SettingRow label="Alertes info (push)" subLabel="Signaux breaking news vérifiés">
                        <Toggle checked={notifications} onChange={setNotifications} />
                    </SettingRow>
                    <SettingRow label="Résumé matinal" subLabel="Synthèse IA envoyée à 08:00">
                        <Toggle checked={morningBrief} onChange={setMorningBrief} />
                    </SettingRow>
                    <SettingRow label="Digest week-end" subLabel="Curations longues, samedi 10:00">
                        <Toggle checked={weekendDigest} onChange={setWeekendDigest} />
                    </SettingRow>
                </div>

                {/* Section: Système */}
                <SectionHeader title="Système" />
                <div className="flex flex-col rounded-2xl overflow-hidden bg-white/5 border border-white/5">
                    <SettingRow label="Vider le cache" onClick={() => alert('Cache vidé')}>
                        <span className="text-xs text-gray-500">24 MB</span>
                    </SettingRow>
                    <SettingRow label="Aide & Support" onClick={() => {}} >
                        {null}
                    </SettingRow>
                    <SettingRow label="Mentions Légales" onClick={() => {}} >
                         {null}
                    </SettingRow>
                     <SettingRow label="Se déconnecter" isDestructive onClick={() => {}} >
                        {null}
                    </SettingRow>
                </div>

                {/* Section: Données & Performances */}
                <SectionHeader title="Données & Performances" />
                <div className="flex flex-col rounded-2xl overflow-hidden bg-white/5 border border-white/5">
                    <SettingRow label="Économiseur de données" subLabel="Réduit la qualité des images sur réseau cellulaire">
                        <Toggle checked={dataSaver} onChange={setDataSaver} />
                    </SettingRow>
                    <SettingRow label="Pré-chargement des analyses" subLabel="Télécharge les résumés IA avant ouverture">
                        <Toggle checked={preloadInsights} onChange={setPreloadInsights} />
                    </SettingRow>
                </div>

                <div className="mt-8 text-center">
                    <p className="text-[10px] text-gray-600 font-mono">PRISM v1.2.0 (Build 892)</p>
                    <p className="text-[10px] text-gray-700 mt-1">Designed with AI</p>
                </div>

            </div>
        </div>

        <style>{`
            input[type=range]::-webkit-slider-thumb {
                -webkit-appearance: none;
                height: 16px;
                width: 16px;
                border-radius: 50%;
                background: #ffffff;
                cursor: pointer;
                margin-top: -6px;
                box-shadow: 0 0 10px rgba(0,0,0,0.5);
            }
            input[type=range]::-webkit-slider-runnable-track {
                width: 100%;
                height: 4px;
                cursor: pointer;
                background: rgba(255,255,255,0.2);
                border-radius: 2px;
            }
        `}</style>
    </div>
  );
};

export default SettingsModal;
