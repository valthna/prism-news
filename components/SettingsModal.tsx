import React, { useState, useEffect } from 'react';
import { CloseIcon } from './icons/CloseIcon';
import { ChevronRightIcon } from './icons/ChevronRightIcon';

interface SettingsModalProps {
  onClose: () => void;
}

const Toggle: React.FC<{ checked: boolean; onChange: (val: boolean) => void }> = ({ checked, onChange }) => (
  <button 
    onClick={() => onChange(!checked)}
    className={`w-[51px] h-[31px] rounded-full p-[2px] transition-colors duration-300 focus:outline-none relative ${checked ? 'bg-green-500' : 'bg-[#39393D]'}`}
  >
    <div className={`w-[27px] h-[27px] bg-white rounded-full shadow-sm transform transition-transform duration-300 ${checked ? 'translate-x-[20px]' : 'translate-x-0'}`} />
  </button>
);

const SectionHeader: React.FC<{ title: string }> = ({ title }) => (
    <h3 className="text-[13px] font-medium text-[#8E8E93] uppercase mb-2 pl-4 mt-8">{title}</h3>
);

const SettingRow: React.FC<{ 
    icon?: React.ReactNode; 
    label: string; 
    subLabel?: string;
    children?: React.ReactNode;
    isDestructive?: boolean;
    onClick?: () => void;
    hasChevron?: boolean;
    value?: string;
}> = ({ icon, label, subLabel, children, isDestructive, onClick, hasChevron, value }) => (
    <div 
        onClick={onClick}
        className={`flex items-center justify-between p-4 bg-[#1C1C1E] active:bg-[#2C2C2E] transition-colors min-h-[44px] ${onClick ? 'cursor-pointer' : ''}`}
    >
        <div className="flex items-center gap-3 flex-1 min-w-0">
            {icon && <div className="text-gray-400 shrink-0">{icon}</div>}
            <div className="flex-1 min-w-0">
                <div className={`text-[17px] leading-snug truncate ${isDestructive ? 'text-[#FF453A]' : 'text-white'}`}>{label}</div>
                {subLabel && <div className="text-[13px] text-[#8E8E93] mt-0.5 truncate">{subLabel}</div>}
            </div>
        </div>
        <div className="flex items-center gap-2 pl-4 shrink-0">
            {value && <span className="text-[17px] text-[#8E8E93]">{value}</span>}
            {children}
            {(onClick || hasChevron) && <ChevronRightIcon className="w-[14px] h-[14px] text-[#5C5C5E]" strokeWidth={2.5} />}
        </div>
    </div>
);

const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const [notifications, setNotifications] = useState(true);
  const [dataSaver, setDataSaver] = useState(false);
  const [autoPlay, setAutoPlay] = useState(true);
  const [highContrast, setHighContrast] = useState(false);
  const [morningBrief, setMorningBrief] = useState(true);
  const [weekendDigest, setWeekendDigest] = useState(false);
  const [preloadInsights, setPreloadInsights] = useState(true);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[60] bg-black flex flex-col animate-fade-in">
        {/* Navigation Bar */}
        <div className="h-[52px] bg-[#1C1C1E] border-b border-[#38383A] flex items-center justify-between px-4 shrink-0 pt-safe-top">
            <button 
                onClick={onClose}
                className="flex items-center gap-1 text-neon-accent active:opacity-60 transition-opacity"
            >
                <span className="text-[17px]">Fermer</span>
            </button>
            <h2 className="text-[17px] font-semibold text-white absolute left-1/2 -translate-x-1/2">Réglages</h2>
            <div className="w-[60px]" /> {/* Spacer for alignment */}
        </div>

        {/* Scrollable List */}
        <div className="flex-1 overflow-y-auto bg-black pb-20">
            
            {/* Profile Header */}
            <div className="mt-8 mb-8 flex flex-col items-center">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-neon-accent to-blue-600 p-[2px] shadow-xl mb-4">
                    <div className="w-full h-full rounded-full bg-black flex items-center justify-center overflow-hidden relative">
                        <span className="text-4xl font-serif italic font-bold text-white z-10">A</span>
                        <div className="absolute inset-0 bg-white/10" />
                    </div>
                </div>
                <h3 className="text-2xl font-bold text-white mb-1">Alpha User</h3>
                <p className="text-[15px] text-[#8E8E93]">Membre PRISM Pro</p>
                <button className="mt-4 px-5 py-1.5 bg-[#1C1C1E] rounded-full text-[13px] font-bold text-neon-accent border border-neon-accent/30 active:bg-neon-accent/10 transition-colors">
                    Gérer le compte
                </button>
            </div>

            <div className="px-4 max-w-3xl mx-auto w-full space-y-6">
                
                <div>
                    <SectionHeader title="Préférences IA" />
                    <div className="rounded-[10px] overflow-hidden bg-[#1C1C1E] divide-y divide-[#38383A]">
                        <SettingRow label="Langue et Région" value="Français" hasChevron onClick={() => {}} />
                        <SettingRow label="Mode de Débat" value="Intense" hasChevron onClick={() => {}} />
                        <SettingRow label="Sources Prioritaires" value="Équilibré" hasChevron onClick={() => {}} />
                    </div>
                    <p className="text-[12px] text-[#8E8E93] px-4 mt-2">Ajuste la personnalité de l'IA et le type de sources agrégées.</p>
                </div>

                <div>
                    <SectionHeader title="Affichage" />
                    <div className="rounded-[10px] overflow-hidden bg-[#1C1C1E] divide-y divide-[#38383A]">
                         <SettingRow label="Contraste Élevé">
                            <Toggle checked={highContrast} onChange={setHighContrast} />
                        </SettingRow>
                        <SettingRow label="Lecture Automatique">
                            <Toggle checked={autoPlay} onChange={setAutoPlay} />
                        </SettingRow>
                        <SettingRow label="Taille du texte" hasChevron onClick={() => {}} value="100%" />
                    </div>
                </div>

                <div>
                    <SectionHeader title="Notifications" />
                    <div className="rounded-[10px] overflow-hidden bg-[#1C1C1E] divide-y divide-[#38383A]">
                        <SettingRow label="Alertes Info (Push)">
                            <Toggle checked={notifications} onChange={setNotifications} />
                        </SettingRow>
                        <SettingRow label="Résumé Matinal (08:00)">
                            <Toggle checked={morningBrief} onChange={setMorningBrief} />
                        </SettingRow>
                        <SettingRow label="Digest Week-end">
                            <Toggle checked={weekendDigest} onChange={setWeekendDigest} />
                        </SettingRow>
                    </div>
                </div>

                <div>
                    <SectionHeader title="Données" />
                    <div className="rounded-[10px] overflow-hidden bg-[#1C1C1E] divide-y divide-[#38383A]">
                        <SettingRow label="Économiseur de données">
                            <Toggle checked={dataSaver} onChange={setDataSaver} />
                        </SettingRow>
                        <SettingRow label="Pré-chargement IA">
                            <Toggle checked={preloadInsights} onChange={setPreloadInsights} />
                        </SettingRow>
                        <SettingRow label="Vider le cache" value="24 MB" onClick={() => alert('Cache vidé')} />
                    </div>
                </div>

                <div className="rounded-[10px] overflow-hidden bg-[#1C1C1E] divide-y divide-[#38383A] mt-8">
                    <SettingRow label="Aide et Support" hasChevron onClick={() => {}} />
                    <SettingRow label="Mentions Légales" hasChevron onClick={() => {}} />
                </div>

                <div className="rounded-[10px] overflow-hidden bg-[#1C1C1E] mt-6">
                     <SettingRow label="Se déconnecter" isDestructive onClick={() => {}} />
                </div>

                <div className="py-8 text-center">
                    <p className="text-[12px] text-[#8E8E93]">PRISM v1.2 (Build 892)</p>
                </div>
            </div>
        </div>
    </div>
  );
};

export default SettingsModal;
