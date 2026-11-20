'use client';

import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';

export type StandardUiTheme = 'dark-navy' | 'light-corporate' | 'tally-monochrome';
export type ScreenResolutionFit = 'auto' | 'laptop-1366' | 'hd-1600' | 'fhd-1920';
export type FontWeightPreference = 'normal' | 'bold' | 'extra-bold';

export interface DisplayPreferences {
  theme: StandardUiTheme;
  accentColor: string;
  fontScale: number; // e.g. 0.90, 1.0, 1.10, 1.25, 1.40
  screenFit: ScreenResolutionFit;
  fontWeight: FontWeightPreference;
}

export const THEME_OPTIONS: Array<{ id: StandardUiTheme; label: string; desc: string; previewBg: string; previewAccent: string }> = [
  {
    id: 'dark-navy',
    label: 'Dark Navy ERP (Default)',
    desc: 'Deep slate blue-black optimized for factory floor and all-day low-eye-strain usage.',
    previewBg: 'bg-slate-950 text-slate-100 border-slate-800',
    previewAccent: '#3b82f6',
  },
  {
    id: 'light-corporate',
    label: 'Clean White & Black (Office Light Mode) / ലളിതമായ വൈറ്റ് തീം',
    desc: 'High-contrast 100% pure white background with sharp black letters, black borders, and zero glare for office desks and daytime operations.',
    previewBg: 'bg-white text-black border-black',
    previewAccent: '#2563eb',
  },
  {
    id: 'tally-monochrome',
    label: 'Compact Tally Classic Monochrome',
    desc: 'High-contrast monochrome theme inspired by classic Indian business software with crisp borders and zero glare.',
    previewBg: 'bg-zinc-900 text-zinc-100 border-zinc-700',
    previewAccent: '#f59e0b',
  },
];

export const ACCENT_PRESETS = [
  { label: 'Exmark Sky Blue', hex: '#3b82f6' },
  { label: 'Emerald Factory Green', hex: '#10b981' },
  { label: 'Amber Industrial Gold', hex: '#f59e0b' },
  { label: 'Indigo Executive', hex: '#6366f1' },
  { label: 'Rose Accent', hex: '#ec4899' },
  { label: 'Teal Modern', hex: '#06b6d4' },
];

export const FONT_SCALE_PRESETS = [
  { scale: 0.90, label: 'Compact (90%)', desc: 'Fits maximum rows per screen' },
  { scale: 1.0, label: 'Standard (100%)', desc: 'Default EXMARK ERP balance' },
  { scale: 1.10, label: 'Medium (110%)', desc: 'Recommended for Quotations & Orders' },
  { scale: 1.25, label: 'Large (125%)', desc: 'Clear visibility across desk distance' },
  { scale: 1.40, label: 'Extra Large (140%)', desc: 'High legibility for touchscreens / wall displays' },
];

export const FONT_WEIGHT_PRESETS: Array<{ id: FontWeightPreference; label: string; desc: string }> = [
  { id: 'normal', label: 'Normal (സാധാരണ)', desc: 'Standard crisp black letters' },
  { id: 'bold', label: 'Bold (ബോൾഡ്)', desc: 'Sharper, thicker high-contrast letters' },
  { id: 'extra-bold', label: 'Extra Bold (കടും കറുപ്പ്)', desc: 'Maximum darkness & heavy solid black' },
];

export const SCREEN_FIT_OPTIONS: Array<{ id: ScreenResolutionFit; label: string; resolution: string; desc: string }> = [
  { id: 'auto', label: 'Auto Full Width', resolution: 'Fluid 100%', desc: 'Expands naturally to use 100% of available browser width.' },
  { id: 'laptop-1366', label: 'Standard Laptop', resolution: '1366 × 768 px', desc: 'Locks optimal desktop width for 14" office laptop displays without horizontal sprawl.' },
  { id: 'hd-1600', label: 'HD Desktop', resolution: '1600 × 900 px', desc: 'Balanced comfortable layout for standard 19–21" office LED screens.' },
  { id: 'fhd-1920', label: 'Full HD / Widescreen', resolution: '1920 × 1080 px', desc: 'Crisp centered layout for 24–27" 1080p monitors.' },
];

const DEFAULT_PREFERENCES: DisplayPreferences = {
  theme: 'dark-navy',
  accentColor: '#3b82f6',
  fontScale: 1.0,
  screenFit: 'auto',
  fontWeight: 'normal',
};

const STORAGE_KEY = 'exmark_display_preferences_v1';

function hexToRgb(hex: string): string {
  const clean = hex.replace('#', '');
  if (clean.length === 3) {
    const r = parseInt(clean[0] + clean[0], 16);
    const g = parseInt(clean[1] + clean[1], 16);
    const b = parseInt(clean[2] + clean[2], 16);
    return `${r}, ${g}, ${b}`;
  }
  if (clean.length === 6) {
    const r = parseInt(clean.substring(0, 2), 16);
    const g = parseInt(clean.substring(2, 4), 16);
    const b = parseInt(clean.substring(4, 6), 16);
    return `${r}, ${g}, ${b}`;
  }
  return '59, 130, 246';
}

interface DisplayPreferencesContextType {
  preferences: DisplayPreferences;
  setTheme: (theme: StandardUiTheme) => void;
  setAccentColor: (color: string) => void;
  setFontScale: (scale: number) => void;
  setFontWeight: (weight: FontWeightPreference) => void;
  setScreenFit: (fit: ScreenResolutionFit) => void;
  resetToDefaults: () => void;
  screenFitContainerClass: string;
}

const DisplayPreferencesContext = createContext<DisplayPreferencesContextType | undefined>(undefined);

export function DisplayPreferencesProvider({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferences] = useState<DisplayPreferences>(DEFAULT_PREFERENCES);
  const [isHydrated, setIsHydrated] = useState(false);

  // Load initial settings from localStorage on client mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        setPreferences({
          theme: parsed.theme || DEFAULT_PREFERENCES.theme,
          accentColor: parsed.accentColor || DEFAULT_PREFERENCES.accentColor,
          fontScale: typeof parsed.fontScale === 'number' ? parsed.fontScale : DEFAULT_PREFERENCES.fontScale,
          screenFit: parsed.screenFit || DEFAULT_PREFERENCES.screenFit,
          fontWeight: parsed.fontWeight || DEFAULT_PREFERENCES.fontWeight,
        });
      }
    } catch {
      // Fallback to default
    } finally {
      setIsHydrated(true);
    }
  }, []);

  // Sync to localStorage and HTML root element attributes & CSS vars whenever preferences change
  useEffect(() => {
    if (!isHydrated || typeof document === 'undefined') return;

    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
    } catch {
      // Storage quota or sandboxed
    }

    const root = document.documentElement;
    root.setAttribute('data-theme', preferences.theme);
    root.setAttribute('data-screen-fit', preferences.screenFit);
    root.setAttribute('data-font-weight', preferences.fontWeight || 'normal');
    root.style.setProperty('--erp-accent', preferences.accentColor);
    root.style.setProperty('--erp-accent-rgb', hexToRgb(preferences.accentColor));
    root.style.setProperty('--erp-font-scale', `${preferences.fontScale}`);

    // Live reactive font scaling across both rem-based and pixel-based elements
    root.style.fontSize = `${preferences.fontScale * 16}px`;
    if (document.body) {
      document.body.style.zoom = `${preferences.fontScale}`;
    }

    // Update body class list for smooth theme switching
    document.body.classList.remove('theme-dark-navy', 'theme-light-corporate', 'theme-tally-monochrome');
    document.body.classList.add(`theme-${preferences.theme}`);
  }, [preferences, isHydrated]);

  const setTheme = (theme: StandardUiTheme) => {
    setPreferences(prev => ({ ...prev, theme }));
  };

  const setAccentColor = (accentColor: string) => {
    setPreferences(prev => ({ ...prev, accentColor }));
  };

  const setFontScale = (fontScale: number) => {
    setPreferences(prev => ({ ...prev, fontScale }));
  };

  const setFontWeight = (fontWeight: FontWeightPreference) => {
    setPreferences(prev => ({ ...prev, fontWeight }));
  };

  const setScreenFit = (screenFit: ScreenResolutionFit) => {
    setPreferences(prev => ({ ...prev, screenFit }));
  };

  const resetToDefaults = () => {
    setPreferences(DEFAULT_PREFERENCES);
  };

  const screenFitContainerClass = useMemo(() => {
    switch (preferences.screenFit) {
      case 'laptop-1366':
        return 'max-w-[1366px] mx-auto w-full';
      case 'hd-1600':
        return 'max-w-[1600px] mx-auto w-full';
      case 'fhd-1920':
        return 'max-w-[1920px] mx-auto w-full';
      case 'auto':
      default:
        return 'w-full';
    }
  }, [preferences.screenFit]);

  return (
    <DisplayPreferencesContext.Provider
      value={{
        preferences,
        setTheme,
        setAccentColor,
        setFontScale,
        setFontWeight,
        setScreenFit,
        resetToDefaults,
        screenFitContainerClass,
      }}
    >
      <div
        id="exmark-screen-fit-wrapper"
        className={screenFitContainerClass}
        style={{
          fontSize: `calc(1rem * var(--erp-font-scale, 1))`,
          transition: 'font-size 0.15s ease-out',
        }}
      >
        {children}
      </div>
    </DisplayPreferencesContext.Provider>
  );
}

export function useDisplayPreferences() {
  const context = useContext(DisplayPreferencesContext);
  if (!context) {
    // Return safe fallback if used outside provider
    return {
      preferences: DEFAULT_PREFERENCES,
      setTheme: () => {},
      setAccentColor: () => {},
      setFontScale: () => {},
      setFontWeight: () => {},
      setScreenFit: () => {},
      resetToDefaults: () => {},
      screenFitContainerClass: 'w-full',
    };
  }
  return context;
}
