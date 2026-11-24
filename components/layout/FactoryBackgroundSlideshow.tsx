'use client';

import React, { useState, useEffect } from 'react';
import { useDisplayPreferences } from '@/lib/context/DisplayPreferencesContext';
import { Factory, Sparkles, Printer, Paintbrush, Wrench, ChevronRight, ChevronLeft } from 'lucide-react';

interface FactoryScene {
  id: string;
  title: string;
  badge: string;
  subtitle: string;
  icon: React.ElementType;
  accentColor: string;
  svgContent: React.ReactNode;
}

export function FactoryBackgroundSlideshow() {
  const { preferences } = useDisplayPreferences();
  const [currentSceneIndex, setCurrentSceneIndex] = useState(0);

  const isEnabled = preferences.backgroundSlideshowEnabled ?? true;
  // Default opacity 0.40 = 60% transparency
  const opacity = preferences.backgroundOpacity ?? 0.40;

  const scenes: FactoryScene[] = [
    // 1. FRP Hand Layup & 300-Ton Compression Press Floor
    {
      id: 'frp-layup-press',
      title: 'FRP Door Manufacturing Hand Layup & 300T Compression Press',
      badge: 'Plant Floor Stage 1',
      subtitle: 'Resin impregnation, woven roving fiberglass layup & automated platen compression cycle',
      icon: Factory,
      accentColor: '#38bdf8', // sky blue
      svgContent: (
        <svg viewBox="0 0 1920 1080" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full object-cover">
          <defs>
            <linearGradient id="pressGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0B132B" stopOpacity="0.85" />
              <stop offset="50%" stopColor="#070D1E" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#030712" stopOpacity="0.98" />
            </linearGradient>
            <linearGradient id="hydrGlow" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#0284c7" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#0284c7" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="steelGlow" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#38bdf8" stopOpacity="0.1" />
              <stop offset="50%" stopColor="#38bdf8" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#38bdf8" stopOpacity="0.05" />
            </linearGradient>
          </defs>
          <rect width="1920" height="1080" fill="url(#pressGrad)" />

          {/* Perspective Factory Floor Grid Lines */}
          <path d="M 0 1080 L 760 540 M 1920 1080 L 1160 540 M 300 1080 L 830 540 M 1620 1080 L 1090 540 M 600 1080 L 900 540 M 1320 1080 L 1020 540 M 960 1080 L 960 540" stroke="#0284c7" strokeWidth="1" strokeOpacity="0.15" />
          <line x1="760" y1="540" x2="1160" y2="540" stroke="#0284c7" strokeWidth="1" strokeOpacity="0.2" />
          <line x1="680" y1="620" x2="1240" y2="620" stroke="#0284c7" strokeWidth="1" strokeOpacity="0.2" />
          <line x1="560" y1="720" x2="1360" y2="720" stroke="#0284c7" strokeWidth="1" strokeOpacity="0.2" />
          <line x1="400" y1="840" x2="1520" y2="840" stroke="#0284c7" strokeWidth="1" strokeOpacity="0.2" />

          {/* 300-Ton Hydraulic Compression Press Structure Silhouette */}
          <g transform="translate(680, 220)" opacity="0.35">
            {/* Press Frame Uprights */}
            <rect x="40" y="80" width="60" height="480" rx="8" fill="#1e293b" stroke="#38bdf8" strokeWidth="2" strokeOpacity="0.5" />
            <rect x="460" y="80" width="60" height="480" rx="8" fill="#1e293b" stroke="#38bdf8" strokeWidth="2" strokeOpacity="0.5" />
            {/* Top Crown & Hydraulic Cylinders */}
            <rect x="20" y="20" width="520" height="90" rx="10" fill="#0f172a" stroke="#38bdf8" strokeWidth="2" strokeOpacity="0.6" />
            <rect x="180" y="110" width="70" height="130" rx="6" fill="#334155" />
            <rect x="310" y="110" width="70" height="130" rx="6" fill="#334155" />
            {/* Upper Moving Platen (Press Head) */}
            <rect x="80" y="240" width="400" height="50" rx="6" fill="#1e293b" stroke="#38bdf8" strokeWidth="2" strokeOpacity="0.7" />
            {/* Door Mold in Press (FRP Door Leaf) */}
            <rect x="120" y="320" width="320" height="70" rx="4" fill="url(#steelGlow)" stroke="#38bdf8" strokeWidth="3" />
            {/* Lower Bed Platen */}
            <rect x="60" y="400" width="440" height="70" rx="8" fill="#0f172a" stroke="#38bdf8" strokeWidth="2" strokeOpacity="0.5" />
            {/* Heavy Foundation Base */}
            <rect x="0" y="470" width="560" height="70" rx="6" fill="#090d16" />
            {/* Pressure Gauges & Status LEDs */}
            <circle cx="90" cy="65" r="14" fill="#0284c7" fillOpacity="0.5" stroke="#38bdf8" strokeWidth="2" />
            <circle cx="470" cy="65" r="14" fill="#10b981" fillOpacity="0.6" stroke="#34d399" strokeWidth="2" />
            <circle cx="280" cy="50" r="4" fill="#38bdf8" />
          </g>

          {/* Hand Layup Bench with FRP Mat & Resin Rollers (Left Side) */}
          <g transform="translate(140, 560)" opacity="0.3">
            <rect x="0" y="60" width="420" height="140" rx="8" fill="#0f172a" stroke="#0284c7" strokeWidth="1.5" />
            <rect x="40" y="30" width="340" height="40" rx="4" fill="#1e293b" stroke="#38bdf8" strokeWidth="1.5" strokeDasharray="4 4" />
            {/* CSM Fiberglass Mat pattern */}
            <line x1="60" y1="40" x2="360" y2="60" stroke="#94a3b8" strokeWidth="1" strokeOpacity="0.4" />
            <line x1="70" y1="60" x2="350" y2="40" stroke="#94a3b8" strokeWidth="1" strokeOpacity="0.4" />
            {/* Table Legs */}
            <rect x="30" y="200" width="20" height="120" fill="#1e293b" />
            <rect x="370" y="200" width="20" height="120" fill="#1e293b" />
          </g>

          {/* Resin Barrels & Storage Pallets (Right Side) */}
          <g transform="translate(1500, 580)" opacity="0.3">
            <ellipse cx="60" cy="40" rx="35" ry="15" fill="#1e293b" stroke="#38bdf8" strokeWidth="1.5" />
            <rect x="25" y="40" width="70" height="100" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.5" />
            <ellipse cx="60" cy="140" rx="35" ry="15" fill="#1e293b" stroke="#38bdf8" strokeWidth="1.5" />
            <ellipse cx="150" cy="40" rx="35" ry="15" fill="#1e293b" stroke="#38bdf8" strokeWidth="1.5" />
            <rect x="115" y="40" width="70" height="100" fill="#0f172a" stroke="#38bdf8" strokeWidth="1.5" />
            <ellipse cx="150" cy="140" rx="35" ry="15" fill="#1e293b" stroke="#38bdf8" strokeWidth="1.5" />
          </g>
        </svg>
      ),
    },

    // 2. High-Precision UV Flatbed Door Printing & Texturing
    {
      id: 'uv-flatbed-printing',
      title: 'Industrial UV Flatbed Door Printing & High-Definition Woodgrain Texturing',
      badge: 'Plant Floor Stage 2',
      subtitle: 'Multi-pass CMYK + White + Varnish UV digital printing for architectural Teak and Walnut finishes',
      icon: Printer,
      accentColor: '#a855f7', // purple
      svgContent: (
        <svg viewBox="0 0 1920 1080" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full object-cover">
          <defs>
            <linearGradient id="uvBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0B132B" stopOpacity="0.88" />
              <stop offset="50%" stopColor="#110e24" stopOpacity="0.94" />
              <stop offset="100%" stopColor="#060312" stopOpacity="0.98" />
            </linearGradient>
            <linearGradient id="uvBeam" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#c084fc" stopOpacity="0.8" />
              <stop offset="40%" stopColor="#a855f7" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#6b21a8" stopOpacity="0" />
            </linearGradient>
            <linearGradient id="woodgrainGlow" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#d97706" stopOpacity="0.2" />
              <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#b45309" stopOpacity="0.2" />
            </linearGradient>
          </defs>
          <rect width="1920" height="1080" fill="url(#uvBg)" />

          {/* Perspective UV Bed Guide Rails */}
          <path d="M 320 880 L 780 480 M 1600 880 L 1140 480" stroke="#a855f7" strokeWidth="2" strokeOpacity="0.25" />
          <polygon points="320,880 1600,880 1140,480 780,480" fill="#0f172a" fillOpacity="0.4" stroke="#a855f7" strokeWidth="1" strokeOpacity="0.3" />

          {/* Vacuum Suction Bed Holes Grid on Printer Table */}
          <g opacity="0.15" stroke="#c084fc" strokeWidth="1">
            <line x1="420" y1="800" x2="1500" y2="800" />
            <line x1="500" y1="720" x2="1420" y2="720" />
            <line x1="580" y1="640" x2="1340" y2="640" />
            <line x1="680" y1="560" x2="1240" y2="560" />
          </g>

          {/* Full-Sized FRP Door Blank on Bed Receiving UV Woodgrain Print */}
          <g transform="translate(600, 520)" opacity="0.45">
            <rect x="0" y="0" width="720" height="320" rx="8" fill="url(#woodgrainGlow)" stroke="#f59e0b" strokeWidth="2" />
            {/* Woodgrain Panels Simulation */}
            <rect x="40" y="30" width="280" height="260" rx="4" fill="#78350f" fillOpacity="0.3" stroke="#d97706" strokeWidth="1.5" />
            <rect x="400" y="30" width="280" height="260" rx="4" fill="#78350f" fillOpacity="0.3" stroke="#d97706" strokeWidth="1.5" />
            {/* Printed Architectural Groove Lines */}
            <line x1="60" y1="60" x2="300" y2="60" stroke="#fbbf24" strokeWidth="1" strokeOpacity="0.5" />
            <line x1="60" y1="120" x2="300" y2="120" stroke="#fbbf24" strokeWidth="1" strokeOpacity="0.5" />
            <line x1="420" y1="60" x2="660" y2="60" stroke="#fbbf24" strokeWidth="1" strokeOpacity="0.5" />
          </g>

          {/* Moving UV Printer Gantry Crane Overhead */}
          <g transform="translate(500, 360)" opacity="0.5">
            {/* Gantry Crossbeam */}
            <rect x="0" y="0" width="920" height="60" rx="6" fill="#1e1b4b" stroke="#c084fc" strokeWidth="2" />
            {/* Print Carriage Housing */}
            <rect x="380" y="20" width="160" height="110" rx="8" fill="#312e81" stroke="#a855f7" strokeWidth="2.5" />
            {/* UV Curing Lamp Arrays (Left & Right of Printhead) */}
            <rect x="350" y="50" width="30" height="70" rx="4" fill="#581c87" stroke="#c084fc" strokeWidth="1.5" />
            <rect x="540" y="50" width="30" height="70" rx="4" fill="#581c87" stroke="#c084fc" strokeWidth="1.5" />
            {/* Active Ultraviolet Curing Light Cone */}
            <polygon points="350,120 570,120 660,260 260,260" fill="url(#uvBeam)" />
          </g>
        </svg>
      ),
    },

    // 3. Automated Spray Paint Booth & PU Coating Bay
    {
      id: 'paint-booth-pu',
      title: 'Automated Spray Paint Booth & Dust-Free Polyurethane (PU) Coating Bay',
      badge: 'Plant Floor Stage 3',
      subtitle: 'Pressurized positive-pressure spray chamber, automotive PU clear finish & infrared curing',
      icon: Paintbrush,
      accentColor: '#10b981', // emerald
      svgContent: (
        <svg viewBox="0 0 1920 1080" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full object-cover">
          <defs>
            <linearGradient id="boothBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0B132B" stopOpacity="0.9" />
              <stop offset="50%" stopColor="#052e16" stopOpacity="0.92" />
              <stop offset="100%" stopColor="#021a0d" stopOpacity="0.98" />
            </linearGradient>
            <linearGradient id="sprayCone" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#34d399" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
            </linearGradient>
          </defs>
          <rect width="1920" height="1080" fill="url(#boothBg)" />

          {/* Clean Room Wall Paneling Lines */}
          <line x1="380" y1="0" x2="380" y2="1080" stroke="#10b981" strokeWidth="1" strokeOpacity="0.12" />
          <line x1="1540" y1="0" x2="1540" y2="1080" stroke="#10b981" strokeWidth="1" strokeOpacity="0.12" />
          <line x1="0" y1="280" x2="1920" y2="280" stroke="#10b981" strokeWidth="1" strokeOpacity="0.1" />
          <line x1="0" y1="760" x2="1920" y2="760" stroke="#10b981" strokeWidth="1" strokeOpacity="0.1" />

          {/* Overhead Ventilation & Exhaust Filter Plenum */}
          <g transform="translate(480, 80)" opacity="0.3">
            <rect x="0" y="0" width="960" height="100" rx="8" fill="#064e3b" stroke="#34d399" strokeWidth="2" />
            {/* Filter Grilles */}
            <rect x="40" y="20" width="160" height="60" rx="4" fill="#022c22" stroke="#10b981" strokeWidth="1" />
            <rect x="240" y="20" width="160" height="60" rx="4" fill="#022c22" stroke="#10b981" strokeWidth="1" />
            <rect x="440" y="20" width="160" height="60" rx="4" fill="#022c22" stroke="#10b981" strokeWidth="1" />
            <rect x="640" y="20" width="160" height="60" rx="4" fill="#022c22" stroke="#10b981" strokeWidth="1" />
            <rect x="840" y="20" width="80" height="60" rx="4" fill="#022c22" stroke="#10b981" strokeWidth="1" />
          </g>

          {/* Vertically Suspended FRP Door on Overhead Conveyor Track */}
          <g transform="translate(800, 320)" opacity="0.45">
            {/* Overhead Conveyor Trolley & Hook */}
            <circle cx="160" cy="-30" r="14" fill="#065f46" stroke="#34d399" strokeWidth="2" />
            <path d="M 160 -16 L 160 0 L 150 15 L 170 15" stroke="#34d399" strokeWidth="3" fill="none" />
            {/* Full Height Door Leaf */}
            <rect x="0" y="20" width="320" height="580" rx="8" fill="#064e3b" stroke="#34d399" strokeWidth="2.5" />
            {/* High Gloss PU Coat Sheen */}
            <polygon points="40,20 180,20 120,600 0,600" fill="#34d399" fillOpacity="0.08" />
            {/* Door Panel Recesses */}
            <rect x="30" y="50" width="260" height="230" rx="6" fill="#022c22" stroke="#10b981" strokeWidth="1.5" />
            <rect x="30" y="320" width="260" height="240" rx="6" fill="#022c22" stroke="#10b981" strokeWidth="1.5" />
          </g>

          {/* Automated Dual-Nozzle Spray Gun Arm */}
          <g transform="translate(560, 420)" opacity="0.5">
            <rect x="-80" y="20" width="160" height="24" rx="4" fill="#047857" stroke="#34d399" strokeWidth="1.5" />
            <circle cx="80" cy="32" r="12" fill="#065f46" stroke="#34d399" strokeWidth="2" />
            {/* Spray Mist Cone directed towards Door Leaf */}
            <polygon points="90,32 300, -60 300, 180" fill="url(#sprayCone)" />
          </g>
        </svg>
      ),
    },

    // 4. Kerala Site Door Installation & Architectural Fitting
    {
      id: 'site-installation',
      title: 'Architectural Door Installation, Laser Alignment & Handover Readiness',
      badge: 'Field Ops Stage 4',
      subtitle: 'Plumb laser verified, SS 304 ball-bearing hinges, mortise lock alignment & QR inspection sign-off',
      icon: Wrench,
      accentColor: '#f59e0b', // amber
      svgContent: (
        <svg viewBox="0 0 1920 1080" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full object-cover">
          <defs>
            <linearGradient id="villaBg" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0B132B" stopOpacity="0.88" />
              <stop offset="50%" stopColor="#1c1917" stopOpacity="0.94" />
              <stop offset="100%" stopColor="#0c0a09" stopOpacity="0.98" />
            </linearGradient>
            <linearGradient id="laserLine" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#ef4444" stopOpacity="0.5" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0.8" />
            </linearGradient>
          </defs>
          <rect width="1920" height="1080" fill="url(#villaBg)" />

          {/* Luxury Kerala Villa Masonry Opening Silhouette */}
          <g transform="translate(640, 160)" opacity="0.45">
            {/* Wall Cutout Opening (2100mm x 900mm) */}
            <rect x="-80" y="-40" width="760" height="840" rx="4" fill="#1c1917" stroke="#78716c" strokeWidth="2" />
            <rect x="0" y="20" width="600" height="780" fill="#0B132B" />

            {/* WPC / Teak Heavy Extruded Frame Structure */}
            <rect x="0" y="20" width="600" height="780" rx="6" fill="none" stroke="#d97706" strokeWidth="28" strokeLinecap="round" />
            {/* Double Rebate Step Line */}
            <rect x="18" y="38" width="564" height="762" rx="4" fill="none" stroke="#f59e0b" strokeWidth="2" strokeOpacity="0.5" />

            {/* Installed EXMARK FRP Architectural Door Leaf (Slightly Open 15 degrees) */}
            <rect x="36" y="44" width="528" height="756" rx="4" fill="#292524" stroke="#f59e0b" strokeWidth="3" />
            {/* Modern Grooves / Inlays */}
            <rect x="76" y="80" width="448" height="300" rx="4" fill="#1c1917" stroke="#b45309" strokeWidth="1.5" />
            <rect x="76" y="420" width="448" height="340" rx="4" fill="#1c1917" stroke="#b45309" strokeWidth="1.5" />

            {/* 3x Heavy Duty SS 304 Ball-Bearing Hinges */}
            <rect x="22" y="100" width="16" height="50" rx="2" fill="#cbd5e1" stroke="#f59e0b" strokeWidth="1.5" />
            <rect x="22" y="380" width="16" height="50" rx="2" fill="#cbd5e1" stroke="#f59e0b" strokeWidth="1.5" />
            <rect x="22" y="680" width="16" height="50" rx="2" fill="#cbd5e1" stroke="#f59e0b" strokeWidth="1.5" />

            {/* Lever Handle & Mortise Lock Cylinder */}
            <rect x="500" y="380" width="16" height="70" rx="3" fill="#cbd5e1" stroke="#f59e0b" strokeWidth="1.5" />
            <rect x="460" y="400" width="55" height="12" rx="2" fill="#f8fafc" />

            {/* Verified Handover QR Seal Sticker on top corner */}
            <rect x="470" y="65" width="40" height="40" rx="4" fill="#0284c7" stroke="#38bdf8" strokeWidth="1.5" />
          </g>

          {/* Surveyor Red Laser Level Plumb Line Alignment */}
          <line x1="676" y1="120" x2="676" y2="1020" stroke="url(#laserLine)" strokeWidth="2" strokeDasharray="6 4" opacity="0.6" />
          <circle cx="676" cy="980" r="10" fill="#ef4444" fillOpacity="0.5" stroke="#f87171" strokeWidth="2" />
        </svg>
      ),
    },
  ];

  // Automatic cycle every 14 seconds
  useEffect(() => {
    if (!isEnabled) return;
    const interval = setInterval(() => {
      setCurrentSceneIndex((prev) => (prev + 1) % scenes.length);
    }, 14000);
    return () => clearInterval(interval);
  }, [isEnabled, scenes.length]);

  if (!isEnabled) return null;

  const currentScene = scenes[currentSceneIndex] || scenes[0];
  const SceneIcon = currentScene.icon;

  return (
    <div
      aria-hidden="true"
      className="fixed inset-0 z-0 pointer-events-none overflow-hidden select-none print:hidden transition-opacity duration-1000 ease-in-out"
      style={{ opacity }}
    >
      {/* Active Scene SVG Render with smooth cross-fade */}
      <div className="absolute inset-0 w-full h-full transition-all duration-1000 ease-in-out">
        {currentScene.svgContent}
      </div>

      {/* Dark Ambient Gradient Scrim to ensure crisp contrast on foreground cards */}
      <div className="absolute inset-0 bg-gradient-to-t from-[#070D1E]/95 via-transparent to-[#070D1E]/80" />

      {/* Unobtrusive Bottom-Right Factory Ambient Indicator Badge */}
      <div className="absolute bottom-3 right-3 z-10 pointer-events-auto flex items-center gap-2 bg-[#0B132B]/80 hover:bg-[#0B132B] backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800 text-xs shadow-xl transition-all">
        <div className="flex items-center gap-2">
          <span
            className="w-2 h-2 rounded-full animate-pulse"
            style={{ backgroundColor: currentScene.accentColor }}
          />
          <SceneIcon className="w-3.5 h-3.5" style={{ color: currentScene.accentColor }} />
          <div className="flex flex-col text-left">
            <span className="text-[10px] font-bold text-white leading-tight">
              {currentScene.badge}
            </span>
            <span className="text-[9px] text-slate-400 truncate max-w-[200px]">
              {currentScene.title}
            </span>
          </div>
        </div>

        {/* Manual Scene Stepper Controls */}
        <div className="flex items-center gap-0.5 ml-2 border-l border-slate-700/80 pl-2">
          <button
            type="button"
            onClick={() => setCurrentSceneIndex((prev) => (prev - 1 + scenes.length) % scenes.length)}
            className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition cursor-pointer"
            title="Previous Factory Scene"
          >
            <ChevronLeft className="w-3 h-3" />
          </button>
          <span className="text-[9px] font-mono text-slate-400 px-1">
            {currentSceneIndex + 1}/{scenes.length}
          </span>
          <button
            type="button"
            onClick={() => setCurrentSceneIndex((prev) => (prev + 1) % scenes.length)}
            className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded transition cursor-pointer"
            title="Next Factory Scene"
          >
            <ChevronRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}
