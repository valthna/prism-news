import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import {
  UserSettings,
  loadSettings,
  saveSettings,
  clearCache as clearCacheService,
  formatCacheSize,
} from '../services/settingsService';

interface SettingsContextValue {
  settings: UserSettings;
  updateSettings: (updates: Partial<UserSettings>) => void;
  clearCache: () => void;
  cacheSize: string;
  refreshCacheSize: () => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function useSettings(): SettingsContextValue {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}

interface SettingsProviderProps {
  children: ReactNode;
}

export function SettingsProvider({ children }: SettingsProviderProps) {
  const [settings, setSettings] = useState<UserSettings>(loadSettings);
  const [cacheSize, setCacheSize] = useState<string>('');

  // Refresh cache size on mount
  useEffect(() => {
    setCacheSize(formatCacheSize());
  }, []);

  const refreshCacheSize = useCallback(() => {
    setCacheSize(formatCacheSize());
  }, []);

  const updateSettings = useCallback((updates: Partial<UserSettings>) => {
    setSettings(current => {
      const updated = { ...current, ...updates };
      saveSettings(updated);
      return updated;
    });
  }, []);

  const clearCache = useCallback(() => {
    clearCacheService();
    setCacheSize(formatCacheSize());
  }, []);

  // Appliquer les effets des réglages sur le document
  useEffect(() => {
    // Contraste élevé
    if (settings.highContrast) {
      document.documentElement.classList.add('high-contrast');
    } else {
      document.documentElement.classList.remove('high-contrast');
    }

    // Taille du texte
    document.documentElement.style.setProperty('--user-text-scale', `${settings.textSize / 100}`);

    // Data saver
    if (settings.dataSaver) {
      document.documentElement.classList.add('data-saver');
    } else {
      document.documentElement.classList.remove('data-saver');
    }
  }, [settings.highContrast, settings.textSize, settings.dataSaver]);

  const value: SettingsContextValue = {
    settings,
    updateSettings,
    clearCache,
    cacheSize,
    refreshCacheSize,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
}

