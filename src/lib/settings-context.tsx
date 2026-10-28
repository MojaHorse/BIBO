'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';

export type BoardTheme = 'noir' | 'wood' | 'slate';
export type SoundTheme = 'typewriter' | 'wood' | 'silent';

export interface UserSettings {
  boardTheme: BoardTheme;
  soundTheme: SoundTheme;
  soundEnabled: boolean;
  showLegalMoves: boolean;
  autoQueen: boolean;
  showEvalBar: boolean;
}

const DEFAULT_SETTINGS: UserSettings = {
  boardTheme: 'noir',
  soundTheme: 'typewriter',
  soundEnabled: true,
  showLegalMoves: true,
  autoQueen: true,
  showEvalBar: true,
};

interface SettingsContextType {
  settings: UserSettings;
  updateSettings: (partial: Partial<UserSettings>) => void;
  getBoardColors: () => { light: string; dark: string; border: string };
}

const SettingsContext = createContext<SettingsContextType | null>(null);

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);

  useEffect(() => {
    try {
      const saved = localStorage.getItem('obscura_settings');
      if (saved) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSettings((prev) => ({ ...prev, ...JSON.parse(saved) }));
      }
    } catch {
      // ignore
    }
  }, []);

  const updateSettings = (partial: Partial<UserSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...partial };
      try {
        localStorage.setItem('obscura_settings', JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  };

  const getBoardColors = () => {
    switch (settings.boardTheme) {
      case 'wood':
        return {
          light: '#f0d9b5',
          dark: '#b58863',
          border: 'border-[#784d2b]',
        };
      case 'slate':
        return {
          light: '#e2e8f0',
          dark: '#475569',
          border: 'border-[#1e293b]',
        };
      case 'noir':
      default:
        return {
          light: '#f4f1eb',
          dark: '#1e1e1e',
          border: 'border-[#121212]',
        };
    }
  };

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, getBoardColors }}>
      {children}
    </SettingsContext.Provider>
  );
};

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    return {
      settings: DEFAULT_SETTINGS,
      updateSettings: () => {},
      getBoardColors: () => ({
        light: '#f4f1eb',
        dark: '#1e1e1e',
        border: 'border-[#121212]',
      }),
    };
  }
  return context;
}
