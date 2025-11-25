import React, { useState, useEffect, useCallback } from 'react';
import { CloseIcon } from './icons/CloseIcon';
import { ChevronRightIcon } from './icons/ChevronRightIcon';
import { useSettings } from '../contexts/SettingsContext';
import {
  DEBATE_MODE_LABELS,
  SOURCE_PRIORITY_LABELS,
  TEXT_SIZE_OPTIONS,
  UserSettings,
} from '../services/settingsService';

interface SettingsModalProps {
  onClose: () => void;
}

// Toast notification component
const Toast: React.FC<{ message: string; visible: boolean }> = ({ message, visible }) => (
  <div
    className={`fixed bottom-24 left-1/2 -translate-x-1/2 px-6 py-3 bg-[#2C2C2E] border border-white/10 rounded-full text-white text-sm font-medium shadow-xl z-[100] transition-all duration-300 ${
      visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4 pointer-events-none'
    }`}
  >
    <div className="flex items-center gap-2">
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-neon-accent">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.857-9.809a.75.75 0 00-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 10-1.06 1.061l2.5 2.5a.75.75 0 001.137-.089l4-5.5z" clipRule="evenodd" />
      </svg>
      {message}
    </div>
  </div>
);

// Toggle switch with brand color
const Toggle: React.FC<{ checked: boolean; onChange: (val: boolean) => void }> = ({ checked, onChange }) => (
  <button
    onClick={() => onChange(!checked)}
    className={`w-[51px] h-[31px] rounded-full p-[2px] transition-colors duration-300 focus:outline-none relative ${
      checked ? 'bg-neon-accent' : 'bg-[#39393D]'
    }`}
    role="switch"
    aria-checked={checked}
  >
    <div
      className={`w-[27px] h-[27px] bg-white rounded-full shadow-sm transform transition-transform duration-300 ${
        checked ? 'translate-x-[20px]' : 'translate-x-0'
      }`}
    />
  </button>
);

const SectionHeader: React.FC<{ title: string }> = ({ title }) => (
  <h3 className="text-[13px] font-medium text-[#8E8E93] uppercase mb-2 pl-4 mt-8">{title}</h3>
);

interface SettingRowProps {
  icon?: React.ReactNode;
  label: string;
  subLabel?: string;
  children?: React.ReactNode;
  isDestructive?: boolean;
  onClick?: () => void;
  hasChevron?: boolean;
  value?: string;
}

const SettingRow: React.FC<SettingRowProps> = ({
  icon,
  label,
  subLabel,
  children,
  isDestructive,
  onClick,
  hasChevron,
  value,
}) => (
  <div
    onClick={onClick}
    className={`flex items-center justify-between p-4 bg-[#1C1C1E] active:bg-[#2C2C2E] transition-colors min-h-[44px] ${
      onClick ? 'cursor-pointer' : ''
    }`}
    role={onClick ? 'button' : undefined}
    tabIndex={onClick ? 0 : undefined}
  >
    <div className="flex items-center gap-3 flex-1 min-w-0">
      {icon && <div className="text-gray-400 shrink-0">{icon}</div>}
      <div className="flex-1 min-w-0">
        <div className={`text-[17px] leading-snug truncate ${isDestructive ? 'text-[#FF453A]' : 'text-white'}`}>
          {label}
        </div>
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

// Sub-modal for selection options
interface SelectionModalProps {
  title: string;
  options: { value: string; label: string }[];
  currentValue: string;
  onSelect: (value: string) => void;
  onClose: () => void;
}

const SelectionModal: React.FC<SelectionModalProps> = ({ title, options, currentValue, onSelect, onClose }) => (
  <div className="fixed inset-0 z-[70] bg-black/80 flex items-end justify-center animate-fade-in" onClick={onClose}>
    <div
      className="w-full max-w-lg bg-[#1C1C1E] rounded-t-3xl pb-8 animate-slide-up"
      onClick={(e) => e.stopPropagation()}
    >
      <div className="flex items-center justify-between p-4 border-b border-[#38383A]">
        <button onClick={onClose} className="text-neon-accent text-[17px]">
          Annuler
        </button>
        <h3 className="text-[17px] font-semibold text-white">{title}</h3>
        <div className="w-16" />
      </div>
      <div className="divide-y divide-[#38383A]">
        {options.map((option) => (
          <button
            key={option.value}
            onClick={() => {
              onSelect(option.value);
              onClose();
            }}
            className="w-full flex items-center justify-between p-4 active:bg-[#2C2C2E] transition-colors"
          >
            <span className="text-[17px] text-white">{option.label}</span>
            {currentValue === option.value && (
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-neon-accent">
                <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
              </svg>
            )}
          </button>
        ))}
      </div>
    </div>
  </div>
);

type ModalType = 'debateMode' | 'sourcePriority' | 'textSize' | 'language' | null;

const SettingsModal: React.FC<SettingsModalProps> = ({ onClose }) => {
  const { settings, updateSettings, clearCache, cacheSize, refreshCacheSize } = useSettings();
  const [activeModal, setActiveModal] = useState<ModalType>(null);
  const [toast, setToast] = useState<{ message: string; visible: boolean }>({ message: '', visible: false });

  // Refresh cache size on mount
  useEffect(() => {
    refreshCacheSize();
  }, [refreshCacheSize]);

  const showToast = useCallback((message: string) => {
    setToast({ message, visible: true });
    setTimeout(() => setToast((t) => ({ ...t, visible: false })), 2500);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (activeModal) {
          setActiveModal(null);
        } else {
          onClose();
        }
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose, activeModal]);

  const handleClearCache = () => {
    clearCache();
    showToast('Cache vidé avec succès');
  };

  const handleLogout = () => {
    // Clear all user data
    localStorage.clear();
    showToast('Déconnexion réussie');
    setTimeout(() => {
      window.location.reload();
    }, 1500);
  };

  const debateModeOptions = Object.entries(DEBATE_MODE_LABELS).map(([value, label]) => ({ value, label }));
  const sourcePriorityOptions = Object.entries(SOURCE_PRIORITY_LABELS).map(([value, label]) => ({ value, label }));
  const textSizeOptions = TEXT_SIZE_OPTIONS.map((opt) => ({ value: String(opt.value), label: opt.label }));
  const languageOptions = [
    { value: 'Français', label: 'Français' },
    { value: 'English', label: 'English' },
    { value: 'Español', label: 'Español' },
    { value: 'Deutsch', label: 'Deutsch' },
  ];

  return (
    <div className="fixed inset-0 z-[60] bg-black flex flex-col animate-fade-in">
      {/* Navigation Bar */}
      <div className="h-[52px] bg-[#1C1C1E] border-b border-[#38383A] flex items-center justify-between px-4 shrink-0 pt-safe-top">
        <button onClick={onClose} className="flex items-center gap-1 text-neon-accent active:opacity-60 transition-opacity">
          <span className="text-[17px]">Fermer</span>
        </button>
        <h2 className="text-[17px] font-semibold text-white absolute left-1/2 -translate-x-1/2">Réglages</h2>
        <div className="w-[60px]" />
      </div>

      {/* Scrollable List */}
      <div className="flex-1 overflow-y-auto bg-black pb-20">
        {/* Profile Header */}
        <div className="mt-8 mb-8 flex flex-col items-center">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-neon-accent to-blue-600 p-[2px] shadow-xl mb-4">
            <div className="w-full h-full rounded-full bg-black flex items-center justify-center overflow-hidden relative">
              <span className="text-4xl font-serif italic font-bold text-white z-10">U</span>
              <div className="absolute inset-0 bg-white/10" />
            </div>
          </div>
          <h3 className="text-2xl font-bold text-white mb-1">Utilisateur</h3>
          <p className="text-[15px] text-[#8E8E93]">Membre PRISM</p>
        </div>

        <div className="px-4 max-w-3xl mx-auto w-full space-y-6">
          {/* Préférences IA */}
          <div>
            <SectionHeader title="Préférences IA" />
            <div className="rounded-[10px] overflow-hidden bg-[#1C1C1E] divide-y divide-[#38383A]">
              <SettingRow
                label="Langue et Région"
                value={settings.language}
                hasChevron
                onClick={() => setActiveModal('language')}
              />
              <SettingRow
                label="Mode de Débat"
                value={DEBATE_MODE_LABELS[settings.debateMode]}
                hasChevron
                onClick={() => setActiveModal('debateMode')}
              />
              <SettingRow
                label="Sources Prioritaires"
                value={SOURCE_PRIORITY_LABELS[settings.sourcePriority]}
                hasChevron
                onClick={() => setActiveModal('sourcePriority')}
              />
            </div>
            <p className="text-[12px] text-[#8E8E93] px-4 mt-2">
              Ajuste la personnalité de l'IA et le type de sources agrégées.
            </p>
          </div>

          {/* Affichage */}
          <div>
            <SectionHeader title="Affichage" />
            <div className="rounded-[10px] overflow-hidden bg-[#1C1C1E] divide-y divide-[#38383A]">
              <SettingRow label="Contraste Élevé" subLabel="Améliore la lisibilité">
                <Toggle
                  checked={settings.highContrast}
                  onChange={(val) => {
                    updateSettings({ highContrast: val });
                    showToast(val ? 'Contraste élevé activé' : 'Contraste élevé désactivé');
                  }}
                />
              </SettingRow>
              <SettingRow label="Lecture Automatique" subLabel="Vidéos et animations">
                <Toggle
                  checked={settings.autoPlay}
                  onChange={(val) => updateSettings({ autoPlay: val })}
                />
              </SettingRow>
              <SettingRow
                label="Taille du texte"
                hasChevron
                onClick={() => setActiveModal('textSize')}
                value={`${settings.textSize}%`}
              />
            </div>
          </div>

          {/* Notifications */}
          <div>
            <SectionHeader title="Notifications" />
            <div className="rounded-[10px] overflow-hidden bg-[#1C1C1E] divide-y divide-[#38383A]">
              <SettingRow label="Alertes Info (Push)" subLabel="Actualités urgentes">
                <Toggle
                  checked={settings.pushNotifications}
                  onChange={(val) => updateSettings({ pushNotifications: val })}
                />
              </SettingRow>
              <SettingRow label="Résumé Matinal" subLabel="Tous les jours à 08:00">
                <Toggle
                  checked={settings.morningBrief}
                  onChange={(val) => updateSettings({ morningBrief: val })}
                />
              </SettingRow>
              <SettingRow label="Digest Week-end" subLabel="Récap hebdomadaire">
                <Toggle
                  checked={settings.weekendDigest}
                  onChange={(val) => updateSettings({ weekendDigest: val })}
                />
              </SettingRow>
            </div>
          </div>

          {/* Données */}
          <div>
            <SectionHeader title="Données" />
            <div className="rounded-[10px] overflow-hidden bg-[#1C1C1E] divide-y divide-[#38383A]">
              <SettingRow label="Économiseur de données" subLabel="Réduit la consommation mobile">
                <Toggle
                  checked={settings.dataSaver}
                  onChange={(val) => {
                    updateSettings({ dataSaver: val });
                    showToast(val ? 'Économiseur de données activé' : 'Économiseur de données désactivé');
                  }}
                />
              </SettingRow>
              <SettingRow label="Pré-chargement IA" subLabel="Anticipe vos lectures">
                <Toggle
                  checked={settings.preloadInsights}
                  onChange={(val) => updateSettings({ preloadInsights: val })}
                />
              </SettingRow>
              <SettingRow label="Vider le cache" value={cacheSize} onClick={handleClearCache} />
            </div>
          </div>

          {/* Support */}
          <div className="rounded-[10px] overflow-hidden bg-[#1C1C1E] divide-y divide-[#38383A] mt-8">
            <SettingRow
              label="Aide et Support"
              hasChevron
              onClick={() => {
                showToast('Centre d\'aide bientôt disponible');
              }}
            />
            <SettingRow
              label="Mentions Légales"
              hasChevron
              onClick={() => {
                showToast('Mentions légales bientôt disponibles');
              }}
            />
          </div>

          {/* Logout */}
          <div className="rounded-[10px] overflow-hidden bg-[#1C1C1E] mt-6">
            <SettingRow label="Se déconnecter" isDestructive onClick={handleLogout} />
          </div>

          {/* Version */}
          <div className="py-8 text-center">
            <p className="text-[12px] text-[#8E8E93]">PRISM v1.2 (Build 892)</p>
          </div>
        </div>
      </div>

      {/* Selection Modals */}
      {activeModal === 'debateMode' && (
        <SelectionModal
          title="Mode de Débat"
          options={debateModeOptions}
          currentValue={settings.debateMode}
          onSelect={(value) => updateSettings({ debateMode: value as UserSettings['debateMode'] })}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'sourcePriority' && (
        <SelectionModal
          title="Sources Prioritaires"
          options={sourcePriorityOptions}
          currentValue={settings.sourcePriority}
          onSelect={(value) => updateSettings({ sourcePriority: value as UserSettings['sourcePriority'] })}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'textSize' && (
        <SelectionModal
          title="Taille du texte"
          options={textSizeOptions}
          currentValue={String(settings.textSize)}
          onSelect={(value) => updateSettings({ textSize: Number(value) })}
          onClose={() => setActiveModal(null)}
        />
      )}

      {activeModal === 'language' && (
        <SelectionModal
          title="Langue et Région"
          options={languageOptions}
          currentValue={settings.language}
          onSelect={(value) => updateSettings({ language: value })}
          onClose={() => setActiveModal(null)}
        />
      )}

      {/* Toast */}
      <Toast message={toast.message} visible={toast.visible} />
    </div>
  );
};

export default SettingsModal;
