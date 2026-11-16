'use client';

import React from 'react';
import {
  useDisplayPreferences,
  THEME_OPTIONS,
  ACCENT_PRESETS,
  FONT_SCALE_PRESETS,
  SCREEN_FIT_OPTIONS,
  StandardUiTheme,
  ScreenResolutionFit,
} from '@/lib/context/DisplayPreferencesContext';
import {
  Sun,
  Moon,
  Monitor,
  Type,
  Palette,
  Maximize2,
  RotateCcw,
  Check,
  Sparkles,
  Layers,
  Laptop,
  Tv,
} from 'lucide-react';

export function DisplayAppearanceSettings() {
  const {
    preferences,
    setTheme,
    setAccentColor,
    setFontScale,
    setScreenFit,
    resetToDefaults,
  } = useDisplayPreferences();

  return (
    <div className="space-y-8 max-w-5xl">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border border-slate-800 rounded-2xl p-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-3">
              <span className="p-2.5 bg-blue-600/20 text-blue-400 border border-blue-500/30 rounded-xl">
                <Monitor className="w-5 h-5" />
              </span>
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                  Display, Theme & Screen Fit
                  <span className="text-[11px] px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 font-medium">
                    Personalized ERP
                  </span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  Configure UI themes, typography scale, accent branding, and screen resolution optimizations for your workstation.
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={resetToDefaults}
            className="flex items-center gap-2 px-3.5 py-2 text-xs font-semibold text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-all shadow-sm"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset Defaults
          </button>
        </div>
      </div>

      {/* 1. Standard UI Themes */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2.5">
          <Palette className="w-4 h-4 text-amber-400" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
            Standard UI Theme Selection
          </h3>
        </div>
        <p className="text-xs text-slate-400">
          Choose a visual style tailored to your environment — factory floor dark mode, office client-facing light mode, or high-contrast Tally monochrome.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
          {THEME_OPTIONS.map((theme) => {
            const isSelected = preferences.theme === theme.id;
            return (
              <button
                key={theme.id}
                type="button"
                onClick={() => setTheme(theme.id)}
                className={`text-left p-4 rounded-xl border-2 transition-all relative flex flex-col justify-between ${
                  isSelected
                    ? 'border-blue-500 bg-blue-500/10 shadow-lg shadow-blue-500/10'
                    : 'border-slate-800 bg-slate-950/60 hover:border-slate-700 hover:bg-slate-950'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-xs font-bold text-white flex items-center gap-2">
                      {theme.id === 'light-corporate' ? (
                        <Sun className="w-4 h-4 text-amber-400" />
                      ) : theme.id === 'tally-monochrome' ? (
                        <Layers className="w-4 h-4 text-emerald-400" />
                      ) : (
                        <Moon className="w-4 h-4 text-blue-400" />
                      )}
                      {theme.label}
                    </span>
                    {isSelected && (
                      <span className="w-5 h-5 rounded-full bg-blue-500 text-white flex items-center justify-center text-xs">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </span>
                    )}
                  </div>
                  {/* Theme Mockup Preview Box */}
                  <div className={`p-3 rounded-lg border text-[11px] mb-3 space-y-1.5 ${theme.previewBg}`}>
                    <div className="flex justify-between items-center pb-1 border-b border-inherit font-semibold">
                      <span>EXMARK ERP</span>
                      <span
                        className="w-2 h-2 rounded-full"
                        style={{ backgroundColor: theme.previewAccent }}
                      />
                    </div>
                    <div className="text-[10px] opacity-80">Quote #Q-8492 • FRP Model</div>
                    <div className="h-2 rounded bg-current opacity-20 w-3/4" />
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    {theme.desc}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Font Size Adjustment */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <Type className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
              Font Size & Typography Scale
            </h3>
          </div>
          <span className="text-xs font-bold px-2.5 py-1 rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
            {Math.round(preferences.fontScale * 100)}% Scale
          </span>
        </div>
        <p className="text-xs text-slate-400">
          Scale up text across all Quotation tables, Daybook, Production boards, and forms for maximum readability across various desk distances.
        </p>

        {/* Quick Presets */}
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
          {FONT_SCALE_PRESETS.map((preset) => {
            const isSelected = Math.abs(preferences.fontScale - preset.scale) < 0.01;
            return (
              <button
                key={preset.scale}
                type="button"
                onClick={() => setFontScale(preset.scale)}
                className={`p-3 rounded-xl border text-left transition-all ${
                  isSelected
                    ? 'border-cyan-500 bg-cyan-500/10 shadow-md'
                    : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                }`}
              >
                <div className="text-xs font-bold text-white flex items-center justify-between">
                  <span>{preset.label}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-cyan-400 stroke-[3]" />}
                </div>
                <div className="text-[10px] text-slate-400 mt-1">{preset.desc}</div>
              </button>
            );
          })}
        </div>

        {/* Continuous Slider */}
        <div className="pt-2">
          <div className="flex items-center gap-4">
            <span className="text-xs text-slate-400">90%</span>
            <input
              type="range"
              min="0.90"
              max="1.30"
              step="0.02"
              value={preferences.fontScale}
              onChange={(e) => setFontScale(parseFloat(e.target.value))}
              className="w-full accent-cyan-500 cursor-pointer h-2 bg-slate-800 rounded-lg appearance-none"
            />
            <span className="text-xs text-slate-400">130%</span>
          </div>
        </div>
      </div>

      {/* 3. Theme Accent Colour Adjustment */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2.5">
          <Sparkles className="w-4 h-4 text-rose-400" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
            Brand Accent Colour
          </h3>
        </div>
        <p className="text-xs text-slate-400">
          Personalize active highlights, focus rings, and primary action buttons across the interface.
        </p>

        <div className="flex flex-wrap items-center gap-3 pt-1">
          {ACCENT_PRESETS.map((preset) => {
            const isSelected = preferences.accentColor.toLowerCase() === preset.hex.toLowerCase();
            return (
              <button
                key={preset.hex}
                type="button"
                onClick={() => setAccentColor(preset.hex)}
                className={`flex items-center gap-2 px-3 py-2 rounded-xl border transition-all ${
                  isSelected
                    ? 'border-white bg-slate-800 shadow-md ring-2 ring-blue-500/50'
                    : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                }`}
              >
                <span
                  className="w-4 h-4 rounded-full shadow-inner flex items-center justify-center text-white"
                  style={{ backgroundColor: preset.hex }}
                >
                  {isSelected && <Check className="w-2.5 h-2.5 stroke-[3]" />}
                </span>
                <span className="text-xs font-semibold text-slate-200">{preset.label}</span>
              </button>
            );
          })}

          {/* Custom Hex Color Picker */}
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border border-slate-800 bg-slate-950/60">
            <input
              type="color"
              value={preferences.accentColor}
              onChange={(e) => setAccentColor(e.target.value)}
              className="w-7 h-7 rounded cursor-pointer border-0 bg-transparent"
              title="Custom Hex Picker"
            />
            <span className="text-xs font-mono text-slate-300 uppercase">
              {preferences.accentColor}
            </span>
          </div>
        </div>
      </div>

      {/* 4. Optimum Screen Resolution Fit */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-4">
        <div className="flex items-center gap-2.5">
          <Maximize2 className="w-4 h-4 text-emerald-400" />
          <h3 className="text-sm font-bold uppercase tracking-wider text-slate-200">
            Optimum Screen Resolution Fit
          </h3>
        </div>
        <p className="text-xs text-slate-400">
          Lock container framing to match your primary hardware screen for maximum ergonomics without unnecessary eye panning.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 pt-1">
          {SCREEN_FIT_OPTIONS.map((fit) => {
            const isSelected = preferences.screenFit === fit.id;
            return (
              <button
                key={fit.id}
                type="button"
                onClick={() => setScreenFit(fit.id)}
                className={`p-4 rounded-xl border text-left transition-all ${
                  isSelected
                    ? 'border-emerald-500 bg-emerald-500/10 shadow-md'
                    : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {fit.id === 'laptop-1366' ? (
                      <Laptop className="w-4 h-4 text-emerald-400" />
                    ) : fit.id === 'auto' ? (
                      <Maximize2 className="w-4 h-4 text-blue-400" />
                    ) : (
                      <Tv className="w-4 h-4 text-amber-400" />
                    )}
                    <span className="text-xs font-bold text-white">{fit.label}</span>
                  </div>
                  {isSelected && <Check className="w-4 h-4 text-emerald-400 stroke-[3]" />}
                </div>
                <div className="text-[11px] font-mono text-emerald-400 mb-1">{fit.resolution}</div>
                <div className="text-[10px] text-slate-400 leading-normal">{fit.desc}</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. Live Component Preview */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
          Live Real-Time UI Preview
        </h3>
        <div className="p-4 rounded-xl border border-slate-800 bg-slate-950/80 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span
                className="text-xs font-bold px-2 py-0.5 rounded text-white"
                style={{ backgroundColor: preferences.accentColor }}
              >
                PREVIEW
              </span>
              <span className="text-sm font-bold text-white">
                EXMARK FRP Door Quotation Row
              </span>
            </div>
            <div className="text-xs text-slate-400">
              Sample Model: EX-201 Heritage Woodgrain • Rate: ₹7,850 • Width: 32&quot; × Height: 81&quot;
            </div>
          </div>
          <button
            type="button"
            className="px-4 py-2 rounded-xl text-xs font-bold text-white shadow transition-transform active:scale-95"
            style={{ backgroundColor: preferences.accentColor }}
          >
            Sample Action Button
          </button>
        </div>
      </div>
    </div>
  );
}
