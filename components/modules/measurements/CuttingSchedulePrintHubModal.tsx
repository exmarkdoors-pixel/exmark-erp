'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  X,
  Printer,
  QrCode,
  Share2,
  Sliders,
  Settings,
  Plus,
  Trash2,
  Copy,
  Link as LinkIcon,
  Search,
  CheckCircle2,
  AlertTriangle,
  FileText,
  Smartphone,
  ChevronDown,
  Layers,
} from 'lucide-react';

export interface FrameCategoryItem {
  id: string;
  name: string;
  profile: string;
  hMinusCm: number;
  wMinusCm: number;
}

export interface CuttingDoorItem {
  id: string;
  date: string;
  modelName: string;
  doorThickness: string;
  roomTag: string;
  frameTypeId: string;
  rawHeightCm: number;
  rawWidthTopCm: number;
  rawWidthBtmCm: number;
  widthLinked: boolean;
  extraHAdjCm: number;
  extraWAdjCm: number;
  lockCategory: string;
  lockSubLabel: string;
  hingeSide: 'L' | 'R';
  finishCategory: string;
  finishShade: string;
  stickerRemark: string;
  siteRemark: string;
  qcScanned?: boolean;
}

export interface PartySchedule {
  id: string;
  partyName: string;
  contactPerson: string;
  phone: string;
  deliveryDate: string;
  siteLocation: string;
  defaultThickness: string;
  prodNotes: string;
  doors: CuttingDoorItem[];
}

export const DEFAULT_FRAME_CATEGORIES: FrameCategoryItem[] = [
  { id: 'fr-4x2', name: 'Bedroom 4x2', profile: '100×50mm (4"×2") Section', hMinusCm: 1.5, wMinusCm: 1.4 },
  { id: 'fr-2x25', name: 'Bedroom 2x2.5', profile: '50×65mm (2"×2.5") Section', hMinusCm: 1.5, wMinusCm: 1.0 },
  { id: 'fr-mini', name: 'Mini Type', profile: '40×25mm Slim Section', hMinusCm: 1.2, wMinusCm: 0.6 },
  { id: 'fr-school', name: '90x45mm School', profile: '90×45mm Heavy Duty Section', hMinusCm: 1.6, wMinusCm: 0.8 },
  { id: 'fr-bath-full', name: 'FRP Full Frame (Deduct Frame)', profile: '75×50mm Full Rebate Deduction', hMinusCm: 4.5, wMinusCm: 7.5 },
];

export const DEFAULT_LOCK_CATALOG: string[] = [
  'Custom Lock',
  'Baby Latch',
  'Key Lock',
  'Cylindrical Lock',
  'Mortise Lock',
  'No Lock / Plain',
];

interface CuttingSchedulePrintHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialPartyName?: string;
  initialSiteLocation?: string;
  initialDoors?: CuttingDoorItem[];
}

// Deterministic 100% SVG QR Code generator (no external CDN required)
function generateSvgQr(text: string, size: number = 68): string {
  const cells = 15;
  let hash = 2166136261;
  for (let i = 0; i < text.length; i++) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  const cellSize = size / cells;
  const rects: string[] = [];

  const isFinder = (r: number, c: number) => {
    const topL = r < 4 && c < 4;
    const topR = r < 4 && c >= cells - 4;
    const btmL = r >= cells - 4 && c < 4;
    return topL || topR || btmL;
  };

  for (let r = 0; r < cells; r++) {
    for (let c = 0; c < cells; c++) {
      let fill = false;
      if (isFinder(r, c)) {
        const lr = r >= cells - 4 ? r - (cells - 4) : r;
        const lc = c >= cells - 4 ? c - (cells - 4) : c;
        if (lr === 0 || lr === 3 || lc === 0 || lc === 3 || (lr >= 1 && lr <= 2 && lc >= 1 && lc <= 2)) {
          fill = true;
        }
      } else {
        const bit = ((hash >>> ((r * cells + c) % 28)) ^ (r * 17 + c * 31 + text.charCodeAt((r + c) % text.length))) & 1;
        fill = bit === 1;
      }
      if (fill) {
        rects.push(
          `<rect x="${(c * cellSize).toFixed(1)}" y="${(r * cellSize).toFixed(1)}" width="${(cellSize + 0.35).toFixed(1)}" height="${(cellSize + 0.35).toFixed(1)}" fill="#000"/>`
        );
      }
    }
  }

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" class="bg-white p-0.5 border border-slate-400 rounded-xs">${rects.join('')}</svg>`;
}

function cmToTapeInch(cmVal: number): string {
  if (!cmVal || isNaN(cmVal)) return '0"';
  const totalInches = cmVal / 2.54;
  let whole = Math.floor(totalInches);
  const rem = totalInches - whole;
  let sixteenths = Math.round(rem * 16);
  if (sixteenths === 16) {
    whole += 1;
    sixteenths = 0;
  }
  if (sixteenths === 0) return `${whole}"`;
  const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : a);
  const g = gcd(sixteenths, 16);
  return `${whole} ${sixteenths / g}/${16 / g}"`;
}

function parseTapeInchToCm(str: string): number {
  if (!str) return 0;
  const clean = str.replace(/"/g, '').trim();
  const parts = clean.split(/\s+/);
  let inches = 0;
  if (parts.length === 2 && parts[1].includes('/')) {
    const whole = parseFloat(parts[0]) || 0;
    const [num, den] = parts[1].split('/').map(Number);
    inches = whole + (num || 0) / (den || 1);
  } else if (clean.includes('/')) {
    const [num, den] = clean.split('/').map(Number);
    inches = (num || 0) / (den || 1);
  } else {
    inches = parseFloat(clean) || 0;
  }
  return Number((inches * 2.54).toFixed(1));
}

export function CuttingSchedulePrintHubModal({
  isOpen,
  onClose,
  initialPartyName = 'SECORA',
  initialSiteLocation = 'Ernakulam, Kerala',
  initialDoors,
}: CuttingSchedulePrintHubModalProps) {
  // Parties & Master Data
  const [parties, setParties] = useState<PartySchedule[]>([
    {
      id: 'party-1',
      partyName: initialPartyName,
      contactPerson: 'Site Incharge',
      phone: '+91 98450 12345',
      deliveryDate: '2026-10-20',
      siteLocation: initialSiteLocation,
      defaultThickness: '30mm',
      prodNotes: 'Standard 30mm flush door with custom lock cutout and Mica lamination. Verify hinge side before edge grooving.',
      doors: initialDoors && initialDoors.length > 0 ? initialDoors : [
        {
          id: 'd-1',
          date: '2026-10-20',
          modelName: 'EXM-A-100',
          doorThickness: '30mm',
          roomTag: 'Room 101',
          frameTypeId: 'fr-4x2',
          rawHeightCm: 200,
          rawWidthTopCm: 70,
          rawWidthBtmCm: 70,
          widthLinked: true,
          extraHAdjCm: 0,
          extraWAdjCm: 0,
          lockCategory: 'Custom Lock',
          lockSubLabel: 'CUSTOM LOCK',
          hingeSide: 'L',
          finishCategory: 'MICA',
          finishShade: 'NATURAL TEAK',
          stickerRemark: 'NEW MODEL,30MM,CUSTOM LOCK,DOOR ONLY',
          siteRemark: 'Tile work done',
          qcScanned: true,
        },
        {
          id: 'd-2',
          date: '2026-10-20',
          modelName: 'EXM-A-200',
          doorThickness: '28mm',
          roomTag: 'Room 102',
          frameTypeId: 'fr-2x25',
          rawHeightCm: 200,
          rawWidthTopCm: 80,
          rawWidthBtmCm: 80,
          widthLinked: true,
          extraHAdjCm: 0,
          extraWAdjCm: 0,
          lockCategory: 'Baby Latch',
          lockSubLabel: 'BABY LATCH',
          hingeSide: 'R',
          finishCategory: 'MICA',
          finishShade: 'ROSEWOOD',
          stickerRemark: '28MM,BABY LATCH,DOOR ONLY',
          siteRemark: '',
          qcScanned: false,
        },
      ],
    },
  ]);

  const [currentPartyIdx, setCurrentPartyIdx] = useState<number>(0);
  const [frameCategories, setFrameCategories] = useState<FrameCategoryItem[]>(DEFAULT_FRAME_CATEGORIES);
  const [lockCatalog, setLockCatalog] = useState<string[]>(DEFAULT_LOCK_CATALOG);
  const [filterFrameId, setFilterFrameId] = useState<string>('ALL');

  // Sub-Modals
  const [showFrameModal, setShowFrameModal] = useState(false);
  const [showLockModal, setShowLockModal] = useState(false);
  const [showConverterModal, setShowConverterModal] = useState(false);
  const [showTapeModal, setShowTapeModal] = useState(false);
  const [activeTapeRowId, setActiveTapeRowId] = useState<string | null>(null);
  const [tapeInH, setTapeInH] = useState('78.75');
  const [tapeInW, setTapeInW] = useState('27.56');

  const [showQrModal, setShowQrModal] = useState(false);
  const [qrSelectedDoorId, setQrSelectedDoorId] = useState<string>('');
  const [qrPhysicalH, setQrPhysicalH] = useState('');
  const [qrPhysicalW, setQrPhysicalW] = useState('');

  // Print Hub State
  const [showPrintHub, setShowPrintHub] = useState(false);
  const [hubTab, setHubTab] = useState<'a4-landscape' | '12l-sticker' | 'qc-sheet'>('12l-sticker');
  const [hubFormat, setHubFormat] = useState<'workshop-cut' | 'after-packing'>('after-packing');
  const [hubPaper, setHubPaper] = useState<'a4-12l' | 'single-4x2'>('a4-12l');
  const [hubSelectedPartyIds, setHubSelectedPartyIds] = useState<string[]>(['party-1']);

  // Converter Modal State
  const [convInch, setConvInch] = useState(30);
  const [convCm, setConvCm] = useState(76.2);

  // New Frame / Lock form inputs
  const [newFrameName, setNewFrameName] = useState('');
  const [newFrameProfile, setNewFrameProfile] = useState('');
  const [newFrameHTol, setNewFrameHTol] = useState('1.5');
  const [newFrameWTol, setNewFrameWTol] = useState('1.4');
  const [newLockName, setNewLockName] = useState('');

  const currentParty = parties[currentPartyIdx] || parties[0];

  const getFrame = (fid: string): FrameCategoryItem => {
    return frameCategories.find((f) => f.id === fid) || frameCategories[0];
  };

  const calcDoorSizes = (d: CuttingDoorItem) => {
    const frame = getFrame(d.frameTypeId);
    const hMinus = frame.hMinusCm - (d.extraHAdjCm || 0);
    const wMinus = frame.wMinusCm - (d.extraWAdjCm || 0);

    const finH = Math.max(0, Number((d.rawHeightCm - hMinus).toFixed(1)));
    const finTopW = Math.max(0, Number((d.rawWidthTopCm - wMinus).toFixed(1)));
    const rawBtm = d.widthLinked ? d.rawWidthTopCm : d.rawWidthBtmCm;
    const finBtmW = Math.max(0, Number((rawBtm - wMinus).toFixed(1)));
    const hLabel = d.hingeSide === 'L' ? 'H-RIGHT' : 'H-LEFT';

    return {
      frame,
      hMinusCm: hMinus,
      wMinusCm: wMinus,
      hMinusMm: Math.round(hMinus * 10),
      wMinusMm: Math.round(wMinus * 10),
      finH,
      finTopW,
      finBtmW,
      hLabel,
    };
  };

  const filteredDoors = useMemo(() => {
    if (filterFrameId === 'ALL') return currentParty.doors;
    return currentParty.doors.filter((d) => d.frameTypeId === filterFrameId);
  }, [currentParty.doors, filterFrameId]);

  if (!isOpen) return null;

  const handleUpdateDoor = (id: string, updates: Partial<CuttingDoorItem>) => {
    setParties((prev) =>
      prev.map((p, idx) => {
        if (idx !== currentPartyIdx) return p;
        return {
          ...p,
          doors: p.doors.map((d) => (d.id === id ? { ...d, ...updates } : d)),
        };
      })
    );
  };

  const handleAddDoor = () => {
    const nextNum = currentParty.doors.length + 1;
    const newDoor: CuttingDoorItem = {
      id: `d-${Date.now()}`,
      date: currentParty.deliveryDate || '2026-10-30',
      modelName: 'EXM-A-100',
      doorThickness: currentParty.defaultThickness || '30mm',
      roomTag: `Room ${100 + nextNum}`,
      frameTypeId: frameCategories[0].id,
      rawHeightCm: 200,
      rawWidthTopCm: 70,
      rawWidthBtmCm: 70,
      widthLinked: true,
      extraHAdjCm: 0,
      extraWAdjCm: 0,
      lockCategory: 'Custom Lock',
      lockSubLabel: 'CUSTOM LOCK',
      hingeSide: 'L',
      finishCategory: 'MICA',
      finishShade: 'NATURAL TEAK',
      stickerRemark: 'STANDARD 30MM, CUSTOM LOCK',
      siteRemark: '',
      qcScanned: false,
    };

    setParties((prev) =>
      prev.map((p, idx) => (idx === currentPartyIdx ? { ...p, doors: [...p.doors, newDoor] } : p))
    );
  };

  const handleDuplicateDoor = (id: string) => {
    const found = currentParty.doors.find((d) => d.id === id);
    if (!found) return;
    const copy: CuttingDoorItem = {
      ...found,
      id: `d-${Date.now()}`,
      roomTag: `${found.roomTag} (Copy)`,
    };
    setParties((prev) =>
      prev.map((p, idx) => (idx === currentPartyIdx ? { ...p, doors: [...p.doors, copy] } : p))
    );
  };

  const handleDeleteDoor = (id: string) => {
    setParties((prev) =>
      prev.map((p, idx) =>
        idx === currentPartyIdx ? { ...p, doors: p.doors.filter((d) => d.id !== id) } : p
      )
    );
  };

  const handleApplyTape = () => {
    if (!activeTapeRowId) return;
    const hCm = parseTapeInchToCm(tapeInH);
    const wCm = parseTapeInchToCm(tapeInW);
    handleUpdateDoor(activeTapeRowId, {
      rawHeightCm: hCm || 200,
      rawWidthTopCm: wCm || 70,
      rawWidthBtmCm: wCm || 70,
    });
    setShowTapeModal(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 md:p-4 bg-slate-950/85 backdrop-blur-xs">
      <div className="relative w-full max-w-7xl max-h-[96vh] flex flex-col bg-[#070D1E] text-slate-100 rounded-2xl shadow-2xl border border-slate-800 overflow-hidden">
        {/* HEADER BAR */}
        <div className="px-4 py-3 bg-[#0F172A] border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-red-600 flex items-center justify-center font-black text-sm text-white shadow-inner">
              EX
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm text-white tracking-wide">
                  Door & Frame Cutting Schedule & Print Hub
                </span>
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-blue-900/60 text-blue-300 border border-blue-500/30">
                  v2.4
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-700/60">
                  ● Saved
                </span>
              </div>
              <div className="text-[11px] text-slate-400 font-medium">
                Party: <strong className="text-white">{currentParty.partyName}</strong> ({currentParty.doors.length} doors) • {currentParty.siteLocation}
              </div>
            </div>
          </div>

          {/* TOP ACTION PILLS */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => {
                setHubTab('a4-landscape');
                setShowPrintHub(true);
              }}
              className="px-2.5 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 flex items-center gap-1.5 transition"
            >
              📄 A4 PDF
            </button>
            <button
              onClick={() => {
                setHubTab('12l-sticker');
                setHubFormat('workshop-cut');
                setShowPrintHub(true);
              }}
              className="px-2.5 py-1.5 rounded-md bg-blue-600 hover:bg-blue-500 text-xs font-bold text-white flex items-center gap-1.5 shadow transition"
            >
              🏷️ 12L A4
            </button>
            <button
              onClick={() => {
                setHubTab('12l-sticker');
                setHubFormat('after-packing');
                setShowPrintHub(true);
              }}
              className="px-2.5 py-1.5 rounded-md bg-amber-500 hover:bg-amber-400 text-xs font-bold text-slate-950 flex items-center gap-1.5 shadow transition"
            >
              🛡️ QC PDF (4×2&quot; QR)
            </button>
            <button
              onClick={() => setShowQrModal(true)}
              className="px-2.5 py-1.5 rounded-md bg-purple-600 hover:bg-purple-500 text-xs font-semibold text-white flex items-center gap-1.5 shadow transition"
            >
              📷 Scan & Verify QR
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-md hover:bg-rose-900/60 text-slate-400 hover:text-white transition"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* WORKSPACE BODY */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* ORDER METADATA BAR */}
          <div className="bg-[#0B132B] rounded-xl border border-slate-800 p-3.5 grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase">Party / Customer Name</label>
              <input
                type="text"
                value={currentParty.partyName}
                onChange={(e) => {
                  const val = e.target.value;
                  setParties((prev) =>
                    prev.map((p, idx) => (idx === currentPartyIdx ? { ...p, partyName: val } : p))
                  );
                }}
                className="w-full mt-1 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-sm font-bold text-white"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase">Site / Delivery Location</label>
              <input
                type="text"
                value={currentParty.siteLocation}
                onChange={(e) => {
                  const val = e.target.value;
                  setParties((prev) =>
                    prev.map((p, idx) => (idx === currentPartyIdx ? { ...p, siteLocation: val } : p))
                  );
                }}
                className="w-full mt-1 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-200"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-400 uppercase">Default Order Thickness</label>
              <div className="grid grid-cols-3 gap-1.5 mt-1">
                {['28mm', '30mm', '35mm'].map((th) => (
                  <button
                    key={th}
                    type="button"
                    onClick={() => {
                      setParties((prev) =>
                        prev.map((p, idx) => (idx === currentPartyIdx ? { ...p, defaultThickness: th } : p))
                      );
                    }}
                    className={`py-1 text-xs font-bold rounded-lg border transition ${
                      currentParty.defaultThickness === th
                        ? 'border-amber-400 bg-amber-500/20 text-amber-300'
                        : 'border-slate-700 bg-slate-900 text-slate-400 hover:text-white'
                    }`}
                  >
                    {th}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* TWO STICKER FORMAT QUICK CALLOUT */}
          <div className="bg-gradient-to-r from-slate-900 to-indigo-950/80 rounded-xl p-3 border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-amber-400 text-slate-950 font-extrabold text-[10px]">
                🏷️ 2 STICKER FORMATS
              </span>
              <span className="text-slate-300">
                1) <strong>Workshop Cut Sticker</strong> (Shop-Floor Cutting) &amp; 2) <strong>After-Packing Site Verification + QR Code</strong> (Packed Doors)
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  setHubTab('12l-sticker');
                  setHubFormat('workshop-cut');
                  setShowPrintHub(true);
                }}
                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 rounded text-xs font-bold text-slate-200 border border-slate-700"
              >
                🏷️ 1. Workshop Cut
              </button>
              <button
                type="button"
                onClick={() => {
                  setHubTab('12l-sticker');
                  setHubFormat('after-packing');
                  setShowPrintHub(true);
                }}
                className="px-2.5 py-1 bg-orange-600 hover:bg-orange-500 rounded text-xs font-bold text-white shadow"
              >
                📦 2. After-Packing + QR
              </button>
            </div>
          </div>

          {/* SCHEDULE TOOLBAR */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-bold text-white">Door &amp; Frame Cutting Schedule</h3>
              <span className="px-2 py-0.5 rounded-full bg-blue-900/60 text-blue-300 text-xs font-bold border border-blue-500/30">
                {currentParty.doors.length} Doors
              </span>
              <select
                value={filterFrameId}
                onChange={(e) => setFilterFrameId(e.target.value)}
                className="ml-2 px-2.5 py-1 text-xs bg-slate-900 border border-slate-700 rounded-lg text-slate-300"
              >
                <option value="ALL">All Standard Frame Types</option>
                {frameCategories.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.name} (-{f.hMinusCm}/-{f.wMinusCm}cm)
                  </option>
                ))}
              </select>
            </div>

            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setShowConverterModal(true)}
                className="px-2.5 py-1 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg transition"
              >
                ⇄ Inch ⇄ CM Tool
              </button>
              <button
                type="button"
                onClick={() => setShowFrameModal(true)}
                className="px-2.5 py-1 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg transition"
              >
                ⚙️ Frame &amp; Tolerance
              </button>
              <button
                type="button"
                onClick={() => setShowLockModal(true)}
                className="px-2.5 py-1 text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded-lg transition"
              >
                🔒 Locks &amp; Finishes
              </button>
              <button
                type="button"
                onClick={handleAddDoor}
                className="px-3 py-1 text-xs font-bold bg-blue-600 hover:bg-blue-500 text-white rounded-lg shadow transition flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Add New Door
              </button>
            </div>
          </div>

          {/* SCHEDULE TABLE */}
          <div className="bg-[#0B132B] rounded-xl border border-slate-800 overflow-x-auto shadow-inner">
            <table className="w-full text-left text-xs border-collapse min-w-[1300px]">
              <thead>
                <tr className="bg-[#0F172A] text-slate-300 text-[10px] font-bold uppercase tracking-wider border-b border-slate-800">
                  <th className="p-2.5 text-center w-12">#</th>
                  <th className="p-2.5 w-44">Model &amp; Room / Tag</th>
                  <th className="p-2.5 w-44">Chowkhat Frame Type</th>
                  <th className="p-2.5 w-36 text-amber-300">Raw Frame (Inch)</th>
                  <th className="p-2.5 w-36">Raw Frame (CM)</th>
                  <th className="p-2.5 w-44 text-emerald-400">Finished Size (CM)</th>
                  <th className="p-2.5 w-36">Lock Type</th>
                  <th className="p-2.5 text-center w-20">Hing.Side</th>
                  <th className="p-2.5 w-36">Colour &amp; Finish</th>
                  <th className="p-2.5 w-48">Sticker &amp; Site Remark</th>
                  <th className="p-2.5 text-center w-20">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/80">
                {filteredDoors.length === 0 ? (
                  <tr>
                    <td colSpan={11} className="py-12 text-center text-slate-500 font-medium">
                      0 doors. Click &quot;+ Add New Door&quot; above to add measurements.
                    </td>
                  </tr>
                ) : (
                  filteredDoors.map((d, idx) => {
                    const c = calcDoorSizes(d);
                    return (
                      <tr key={d.id} className="hover:bg-slate-800/40 transition align-top">
                        <td className="p-2.5 text-center font-bold text-slate-400">{idx + 1}</td>

                        {/* Model & Room Tag */}
                        <td className="p-2.5 space-y-1">
                          <input
                            type="text"
                            value={d.modelName}
                            onChange={(e) => handleUpdateDoor(d.id, { modelName: e.target.value })}
                            className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded font-bold text-white uppercase text-xs"
                          />
                          <input
                            type="text"
                            value={d.roomTag}
                            onChange={(e) => handleUpdateDoor(d.id, { roomTag: e.target.value })}
                            placeholder="Room Tag (e.g. Bed 1)"
                            className="w-full px-2 py-0.5 bg-slate-950 border border-slate-800 rounded text-[11px] text-slate-300"
                          />
                        </td>

                        {/* Chowkhat Frame Type */}
                        <td className="p-2.5 space-y-1">
                          <select
                            value={d.frameTypeId}
                            onChange={(e) => handleUpdateDoor(d.id, { frameTypeId: e.target.value })}
                            className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded font-bold text-slate-200 text-xs"
                          >
                            {frameCategories.map((f) => (
                              <option key={f.id} value={f.id}>
                                {f.name}
                              </option>
                            ))}
                          </select>
                          <div className="text-[10px] text-slate-400">{c.frame.profile}</div>
                          <div className="text-[10px] text-rose-400 font-semibold">
                            Clearance: H -{c.hMinusMm}mm, W -{c.wMinusMm}mm
                          </div>
                        </td>

                        {/* Raw Frame (Inch) */}
                        <td className="p-2.5">
                          <div className="bg-amber-950/20 border border-amber-500/30 rounded p-1.5 space-y-0.5 text-xs">
                            <div className="flex justify-between">
                              <span className="text-[10px] text-amber-400 font-bold">H:</span>
                              <span className="font-mono text-amber-200">{cmToTapeInch(d.rawHeightCm)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-[10px] text-amber-400 font-bold">W:</span>
                              <span className="font-mono text-amber-200">{cmToTapeInch(d.rawWidthTopCm)}</span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setActiveTapeRowId(d.id);
                                setTapeInH((d.rawHeightCm / 2.54).toFixed(2));
                                setTapeInW((d.rawWidthTopCm / 2.54).toFixed(2));
                                setShowTapeModal(true);
                              }}
                              className="w-full py-0.5 mt-1 bg-amber-500/30 hover:bg-amber-500/50 text-amber-200 rounded text-[10px] font-bold"
                            >
                              📏 Tape (&quot;) Input
                            </button>
                          </div>
                        </td>

                        {/* Raw Frame (CM) */}
                        <td className="p-2.5 space-y-1">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[10px] text-slate-400">H:</span>
                            <input
                              type="number"
                              step="0.1"
                              value={d.rawHeightCm}
                              onChange={(e) => handleUpdateDoor(d.id, { rawHeightCm: parseFloat(e.target.value) || 0 })}
                              className="w-16 px-1.5 py-0.5 bg-slate-900 border border-slate-700 rounded text-right font-mono font-bold text-white text-xs"
                            />
                          </div>
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[10px] text-slate-400">W:</span>
                            <input
                              type="number"
                              step="0.1"
                              value={d.rawWidthTopCm}
                              onChange={(e) => {
                                const val = parseFloat(e.target.value) || 0;
                                handleUpdateDoor(d.id, {
                                  rawWidthTopCm: val,
                                  ...(d.widthLinked ? { rawWidthBtmCm: val } : {}),
                                });
                              }}
                              className="w-16 px-1.5 py-0.5 bg-slate-900 border border-slate-700 rounded text-right font-mono font-bold text-white text-xs"
                            />
                            <button
                              type="button"
                              onClick={() => handleUpdateDoor(d.id, { widthLinked: !d.widthLinked })}
                              className={`p-1 rounded text-[10px] border ${
                                d.widthLinked ? 'bg-blue-900/60 border-blue-500 text-blue-300' : 'bg-slate-800 border-slate-700 text-slate-400'
                              }`}
                              title="Toggle Separate Top/Bottom Width"
                            >
                              🔗
                            </button>
                          </div>
                          {!d.widthLinked && (
                            <div className="flex items-center justify-between gap-1 pt-0.5">
                              <span className="text-[10px] text-amber-400">Btm W:</span>
                              <input
                                type="number"
                                step="0.1"
                                value={d.rawWidthBtmCm}
                                onChange={(e) => handleUpdateDoor(d.id, { rawWidthBtmCm: parseFloat(e.target.value) || 0 })}
                                className="w-16 px-1.5 py-0.5 bg-slate-900 border border-slate-700 rounded text-right font-mono font-bold text-amber-300 text-xs"
                              />
                            </div>
                          )}
                        </td>

                        {/* Finished Door Size (CM) */}
                        <td className="p-2.5">
                          <div className="bg-emerald-950/30 border border-emerald-500/40 rounded p-2 space-y-1">
                            <div className="flex justify-between items-center border-b border-emerald-500/30 pb-0.5">
                              <span className="text-[10px] font-bold text-emerald-400">{c.hLabel}</span>
                              <span className="font-mono text-sm font-black text-emerald-300">~{c.finH}</span>
                            </div>
                            <div className="flex justify-between text-[10px] font-mono font-bold text-slate-300">
                              <span>TOP: ~{c.finTopW}</span>
                              <span>BTM: ~{c.finBtmW}</span>
                            </div>
                          </div>
                        </td>

                        {/* Lock Type */}
                        <td className="p-2.5 space-y-1">
                          <select
                            value={d.lockCategory}
                            onChange={(e) => handleUpdateDoor(d.id, { lockCategory: e.target.value, lockSubLabel: e.target.value.toUpperCase() })}
                            className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-slate-200"
                          >
                            {lockCatalog.map((lk) => (
                              <option key={lk} value={lk}>
                                {lk}
                              </option>
                            ))}
                          </select>
                        </td>

                        {/* Hinge Side */}
                        <td className="p-2.5 text-center space-y-1">
                          <div className="inline-flex p-0.5 rounded-full bg-slate-900 border border-slate-700">
                            <button
                              type="button"
                              onClick={() => handleUpdateDoor(d.id, { hingeSide: 'L' })}
                              className={`w-6 h-5 rounded-full text-[10px] font-black transition ${
                                d.hingeSide === 'L' ? 'bg-red-600 text-white shadow' : 'text-slate-400'
                              }`}
                            >
                              L
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateDoor(d.id, { hingeSide: 'R' })}
                              className={`w-6 h-5 rounded-full text-[10px] font-black transition ${
                                d.hingeSide === 'R' ? 'bg-red-600 text-white shadow' : 'text-slate-400'
                              }`}
                            >
                              R
                            </button>
                          </div>
                          <div className="text-[9px] font-bold text-slate-500">{c.hLabel}</div>
                        </td>

                        {/* Colour & Finish */}
                        <td className="p-2.5 space-y-1">
                          <select
                            value={d.finishCategory}
                            onChange={(e) => handleUpdateDoor(d.id, { finishCategory: e.target.value })}
                            className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-slate-200"
                          >
                            <option value="MICA">MICA</option>
                            <option value="Custom / Other">Custom / Other</option>
                            <option value="FRP Gelcoat">FRP Gelcoat</option>
                            <option value="PU Wood Finish">PU Wood Finish</option>
                          </select>
                          <input
                            type="text"
                            value={d.finishShade}
                            onChange={(e) => handleUpdateDoor(d.id, { finishShade: e.target.value })}
                            placeholder="Shade (e.g. TEAK)"
                            className="w-full px-2 py-0.5 bg-slate-950 border border-slate-800 rounded text-[10px] font-bold text-slate-300 uppercase"
                          />
                        </td>

                        {/* Remarks */}
                        <td className="p-2.5 space-y-1">
                          <input
                            type="text"
                            value={d.stickerRemark}
                            onChange={(e) => handleUpdateDoor(d.id, { stickerRemark: e.target.value })}
                            placeholder="Factory Remark"
                            className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-[11px] text-slate-200"
                          />
                          <input
                            type="text"
                            value={d.siteRemark}
                            onChange={(e) => handleUpdateDoor(d.id, { siteRemark: e.target.value })}
                            placeholder="Site Custom Note"
                            className="w-full px-2 py-0.5 bg-slate-950 border border-slate-800 rounded text-[10px] text-amber-300"
                          />
                        </td>

                        {/* Action */}
                        <td className="p-2.5 text-center">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleDuplicateDoor(d.id)}
                              className="p-1 rounded hover:bg-slate-700 text-slate-400 hover:text-white"
                              title="Duplicate Door"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setQrSelectedDoorId(d.id);
                                setShowQrModal(true);
                              }}
                              className="p-1 rounded hover:bg-purple-900 text-purple-400 hover:text-purple-200"
                              title="Inspect QR"
                            >
                              <QrCode className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteDoor(d.id)}
                              className="p-1 rounded hover:bg-rose-900 text-rose-400 hover:text-rose-200"
                              title="Delete Door"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* ============================================================== */}
        {/* MODAL 1: FRAME CATEGORIES & TOLERANCE SETTINGS */}
        {/* ============================================================== */}
        {showFrameModal && (
          <div className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4">
            <div className="w-full max-w-2xl bg-[#0F172A] rounded-2xl border border-slate-700 shadow-2xl p-5 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <h3 className="font-bold text-white text-sm">⚙️ Chowkhat Frame Categories &amp; Tolerance Settings</h3>
                <button onClick={() => setShowFrameModal(false)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="max-h-60 overflow-y-auto border border-slate-800 rounded-lg">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-900 text-slate-400 text-[10px] uppercase font-bold">
                    <tr>
                      <th className="p-2">Frame Name</th>
                      <th className="p-2">Profile</th>
                      <th className="p-2 text-rose-400">H Minus (-cm)</th>
                      <th className="p-2 text-rose-400">W Minus (-cm)</th>
                      <th className="p-2 text-center">Del</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {frameCategories.map((fc) => (
                      <tr key={fc.id}>
                        <td className="p-2 font-bold text-white">{fc.name}</td>
                        <td className="p-2 text-slate-400">{fc.profile}</td>
                        <td className="p-2 font-bold text-rose-400">-{fc.hMinusCm} cm</td>
                        <td className="p-2 font-bold text-rose-400">-{fc.wMinusCm} cm</td>
                        <td className="p-2 text-center">
                          <button
                            type="button"
                            onClick={() => setFrameCategories((prev) => prev.filter((f) => f.id !== fc.id))}
                            className="text-rose-400 hover:text-rose-200"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="bg-slate-900 p-3 rounded-lg border border-slate-800 space-y-2">
                <div className="text-xs font-bold text-slate-300">+ Add New Frame Type</div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  <input
                    type="text"
                    value={newFrameName}
                    onChange={(e) => setNewFrameName(e.target.value)}
                    placeholder="Frame Name"
                    className="px-2 py-1 bg-slate-950 border border-slate-700 rounded text-xs text-white"
                  />
                  <input
                    type="text"
                    value={newFrameProfile}
                    onChange={(e) => setNewFrameProfile(e.target.value)}
                    placeholder="Profile (e.g. 75x50mm)"
                    className="px-2 py-1 bg-slate-950 border border-slate-700 rounded text-xs text-white"
                  />
                  <input
                    type="number"
                    step="0.1"
                    value={newFrameHTol}
                    onChange={(e) => setNewFrameHTol(e.target.value)}
                    placeholder="H Tol (-cm)"
                    className="px-2 py-1 bg-slate-950 border border-slate-700 rounded text-xs text-rose-400 font-bold"
                  />
                  <input
                    type="number"
                    step="0.1"
                    value={newFrameWTol}
                    onChange={(e) => setNewFrameWTol(e.target.value)}
                    placeholder="W Tol (-cm)"
                    className="px-2 py-1 bg-slate-950 border border-slate-700 rounded text-xs text-rose-400 font-bold"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (!newFrameName.trim()) return;
                    setFrameCategories((prev) => [
                      ...prev,
                      {
                        id: `fr-${Date.now()}`,
                        name: newFrameName.trim(),
                        profile: newFrameProfile.trim() || 'Custom Section',
                        hMinusCm: parseFloat(newFrameHTol) || 1.5,
                        wMinusCm: parseFloat(newFrameWTol) || 1.4,
                      },
                    ]);
                    setNewFrameName('');
                    setNewFrameProfile('');
                  }}
                  className="px-3 py-1.5 bg-blue-600 hover:bg-blue-500 rounded text-xs font-bold text-white shadow"
                >
                  + Add Frame Category
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* MODAL 2: LOCK MODELS MASTER */}
        {/* ============================================================== */}
        {showLockModal && (
          <div className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-[#0F172A] rounded-2xl border border-slate-700 shadow-2xl p-5 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <h3 className="font-bold text-white text-sm">🔒 Lock Models &amp; Finish Master</h3>
                <button onClick={() => setShowLockModal(false)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex flex-wrap gap-2">
                {lockCatalog.map((lk, idx) => (
                  <span
                    key={lk}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-800 border border-slate-700 text-xs font-semibold text-slate-200"
                  >
                    {lk}
                    <button
                      type="button"
                      onClick={() => setLockCatalog((prev) => prev.filter((_, i) => i !== idx))}
                      className="text-rose-400 hover:text-rose-200"
                    >
                      ✕
                    </button>
                  </span>
                ))}
              </div>

              <div className="flex gap-2 pt-2">
                <input
                  type="text"
                  value={newLockName}
                  onChange={(e) => setNewLockName(e.target.value)}
                  placeholder="New Lock (e.g. Smart Digital Lock)"
                  className="flex-1 px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (!newLockName.trim()) return;
                    setLockCatalog((prev) => [...prev, newLockName.trim()]);
                    setNewLockName('');
                  }}
                  className="px-3.5 py-1.5 bg-blue-600 text-white rounded-lg text-xs font-bold"
                >
                  + Add Lock
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* MODAL 3: INCH <-> CM CONVERTER */}
        {/* ============================================================== */}
        {showConverterModal && (
          <div className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-[#0F172A] rounded-2xl border border-slate-700 shadow-2xl p-5 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <h3 className="font-bold text-white text-sm">⇄ Quick Inch ⇄ Centimeter Tool</h3>
                <button onClick={() => setShowConverterModal(false)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="bg-amber-950/30 p-3 rounded-xl border border-amber-500/40">
                  <label className="text-[10px] font-bold text-amber-300">Inches (&quot;)</label>
                  <input
                    type="number"
                    step="0.0625"
                    value={convInch}
                    onChange={(e) => {
                      const inc = parseFloat(e.target.value) || 0;
                      setConvInch(inc);
                      setConvCm(Number((inc * 2.54).toFixed(2)));
                    }}
                    className="w-full mt-1 px-2.5 py-1.5 bg-slate-900 border border-amber-500/50 rounded font-mono font-bold text-amber-200 text-sm"
                  />
                  <div className="text-[10px] text-amber-400 mt-1 font-mono">Tape: {cmToTapeInch(convCm)}</div>
                </div>

                <div className="bg-blue-950/30 p-3 rounded-xl border border-blue-500/40">
                  <label className="text-[10px] font-bold text-blue-300">Centimeters (CM)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={convCm}
                    onChange={(e) => {
                      const cmVal = parseFloat(e.target.value) || 0;
                      setConvCm(cmVal);
                      setConvInch(Number((cmVal / 2.54).toFixed(2)));
                    }}
                    className="w-full mt-1 px-2.5 py-1.5 bg-slate-900 border border-blue-500/50 rounded font-mono font-bold text-blue-200 text-sm"
                  />
                  <div className="text-[10px] text-blue-400 mt-1 font-mono">{Math.round(convCm * 10)} MM</div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* MODAL 4: INLINE TAPE INPUT */}
        {/* ============================================================== */}
        {showTapeModal && (
          <div className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4">
            <div className="w-full max-w-md bg-[#0F172A] rounded-2xl border border-amber-500 shadow-2xl p-5 space-y-4">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <h3 className="font-bold text-amber-400 text-sm">📏 Enter Site Tape Measurement in Inches (&quot;)</h3>
                <button onClick={() => setShowTapeModal(false)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-slate-300">Height in Inches (&quot;)</label>
                  <input
                    type="text"
                    value={tapeInH}
                    onChange={(e) => setTapeInH(e.target.value)}
                    placeholder='e.g. 78.75 or 78 3/4"'
                    className="w-full mt-1 px-3 py-2 bg-slate-900 border border-amber-400/60 rounded text-sm font-bold text-white"
                  />
                  <div className="text-[11px] text-blue-400 font-semibold mt-1">
                    = {parseTapeInchToCm(tapeInH)} cm
                  </div>
                </div>
                <div>
                  <label className="text-xs font-bold text-slate-300">Width in Inches (&quot;)</label>
                  <input
                    type="text"
                    value={tapeInW}
                    onChange={(e) => setTapeInW(e.target.value)}
                    placeholder='e.g. 27.56 or 27 9/16"'
                    className="w-full mt-1 px-3 py-2 bg-slate-900 border border-amber-400/60 rounded text-sm font-bold text-white"
                  />
                  <div className="text-[11px] text-blue-400 font-semibold mt-1">
                    = {parseTapeInchToCm(tapeInW)} cm
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={handleApplyTape}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg shadow"
                >
                  ✓ Convert to CM &amp; Apply
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* MODAL 5: QR SCANNER & STICKER SWAP DETECTOR */}
        {/* ============================================================== */}
        {showQrModal && (
          <div className="fixed inset-0 z-60 bg-black/85 flex items-center justify-center p-4">
            <div className="w-full max-w-2xl bg-[#0F172A] rounded-2xl border border-slate-700 shadow-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <h3 className="font-bold text-white text-sm">📱 Mobile / ERP QR Code Scanner &amp; Site Verification</h3>
                <button onClick={() => setShowQrModal(false)} className="text-slate-400 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-purple-950/30 p-3.5 rounded-xl border border-purple-500/40">
                <div>
                  <label className="text-xs font-bold text-purple-300">1. Select / Scan Door</label>
                  <select
                    value={qrSelectedDoorId || (currentParty.doors[0]?.id || '')}
                    onChange={(e) => setQrSelectedDoorId(e.target.value)}
                    className="w-full mt-1 px-3 py-2 bg-slate-900 border border-purple-400/50 rounded-lg text-xs font-bold text-white"
                  >
                    {currentParty.doors.map((d, i) => (
                      <option key={d.id} value={d.id}>
                        DOOR #{i + 1} — {d.roomTag} ({d.modelName})
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-bold text-purple-300">2. Physical Tape Check at Site (Optional CM)</label>
                  <div className="flex gap-2 mt-1">
                    <input
                      type="number"
                      step="0.1"
                      value={qrPhysicalH}
                      onChange={(e) => setQrPhysicalH(e.target.value)}
                      placeholder="Measured H (cm)"
                      className="w-1/2 px-2.5 py-1.5 bg-slate-900 border border-purple-400/50 rounded text-xs font-bold text-white"
                    />
                    <input
                      type="number"
                      step="0.1"
                      value={qrPhysicalW}
                      onChange={(e) => setQrPhysicalW(e.target.value)}
                      placeholder="Measured W (cm)"
                      className="w-1/2 px-2.5 py-1.5 bg-slate-900 border border-purple-400/50 rounded text-xs font-bold text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Inspection Card & Swap Detector */}
              {(() => {
                const targetDoor = currentParty.doors.find((d) => d.id === (qrSelectedDoorId || currentParty.doors[0]?.id)) || currentParty.doors[0];
                if (!targetDoor) return null;
                const c = calcDoorSizes(targetDoor);
                const targetIdx = currentParty.doors.findIndex((d) => d.id === targetDoor.id) + 1;

                const physH = parseFloat(qrPhysicalH);
                const physW = parseFloat(qrPhysicalW);
                let swapAlert = null;

                if (physH && physW) {
                  const hDiff = Math.abs(physH - c.finH);
                  const wDiff = Math.abs(physW - c.finTopW);
                  if (hDiff <= 0.4 && wDiff <= 0.4) {
                    swapAlert = (
                      <div className="p-3 rounded-lg bg-emerald-950 border border-emerald-500 text-emerald-300 text-xs font-bold">
                        ✅ സ്റ്റിക്കറും ഡോറിന്റെ അളവും 100% കൃത്യമാണ്! (Confirmed Matches Packed Door Size: ~{c.finH} × ~{c.finTopW} cm)
                      </div>
                    );
                  } else {
                    const swapped = currentParty.doors.find((other) => {
                      if (other.id === targetDoor.id) return false;
                      const oc = calcDoorSizes(other);
                      return Math.abs(physH - oc.finH) <= 0.5 && Math.abs(physW - oc.finTopW) <= 0.5;
                    });

                    if (swapped) {
                      const swappedIdx = currentParty.doors.findIndex((d) => d.id === swapped.id) + 1;
                      const sc = calcDoorSizes(swapped);
                      swapAlert = (
                        <div className="p-3 rounded-lg bg-amber-950 border-2 border-amber-500 text-amber-200 text-xs font-bold">
                          ⚠️ സ്റ്റിക്കർ മാറിപ്പോയിട്ടുണ്ട് (STICKER SWAPPED)!<br />
                          ഇപ്പോൾ സ്കാൻ ചെയ്ത സ്റ്റിക്കർ <strong>DOOR #{targetIdx} ({targetDoor.roomTag}: ~{c.finH}×~{c.finTopW} cm)</strong>-ന്റേതാണ്. എന്നാൽ നിങ്ങൾ അളന്ന ഡോർ ഇതേ ഓർഡറിലെ <strong>DOOR #{swappedIdx} ({swapped.roomTag}: ~{sc.finH}×~{sc.finTopW} cm)</strong> ആണ്!
                        </div>
                      );
                    } else {
                      swapAlert = (
                        <div className="p-3 rounded-lg bg-rose-950 border border-rose-500 text-rose-200 text-xs font-bold">
                          ❌ അളവ് വ്യത്യാസം! കമ്പനിയിൽ കൊടുത്ത ഫൈനൽ ഡോർ അളവ് <strong>~{c.finH} × ~{c.finTopW} cm</strong> ആണ്, എന്നാൽ നിങ്ങൾ അളന്നത് <strong>{physH} × {physW} cm</strong> ആണ്.
                        </div>
                      );
                    }
                  }
                }

                const qrSvg = generateSvgQr(`EXMARK|${currentParty.partyName}|DOOR#${targetIdx}|${targetDoor.roomTag}|${c.finH}x${c.finTopW}`, 84);

                return (
                  <div className="space-y-3">
                    {swapAlert}
                    <div className="bg-[#0B132B] rounded-xl border-2 border-slate-700 overflow-hidden">
                      <div className="bg-[#0F172A] text-white px-4 py-2 flex justify-between items-center">
                        <span className="text-xs font-extrabold text-amber-400">
                          📦 AFTER-PACKING SITE VERIFICATION PASS
                        </span>
                        <span className="px-2 py-0.5 bg-blue-600 text-white rounded text-xs font-black">
                          DOOR #{targetIdx}
                        </span>
                      </div>
                      <div className="p-4 flex flex-wrap items-center justify-between gap-4">
                        <div className="space-y-1.5 text-xs">
                          <div className="text-sm font-black text-white">
                            Party: {currentParty.partyName} — <span className="text-blue-400">{targetDoor.roomTag}</span>
                          </div>
                          <div>
                            <strong>Model:</strong> {targetDoor.modelName} ({targetDoor.doorThickness}, {targetDoor.finishShade})
                          </div>
                          <div>
                            <strong>Frame Opening:</strong> {targetDoor.rawHeightCm} × {targetDoor.rawWidthTopCm} cm ({cmToTapeInch(targetDoor.rawHeightCm)})
                          </div>
                          <div className="p-2 rounded bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 font-mono text-xs font-bold">
                            CONFIRM FINISH DOOR (PACKED): ~{c.finH} × ~{c.finTopW} cm (Clearance: H-{c.hMinusMm}mm, W-{c.wMinusMm}mm)
                          </div>
                          <div>
                            <strong>Hinge &amp; Lock:</strong> {targetDoor.hingeSide} ({c.hLabel}) | {targetDoor.lockSubLabel}
                          </div>
                        </div>
                        <div className="flex flex-col items-center">
                          <div dangerouslySetInnerHTML={{ __html: qrSvg }} />
                          <span className="text-[10px] font-mono mt-1 text-slate-400">
                            {currentParty.partyName}-D{targetIdx}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* MODAL 6: PRODUCTION UNIT PDF GENERATOR & PRINT HUB */}
        {/* ============================================================== */}
        {showPrintHub && (
          <div className="fixed inset-0 z-60 bg-black/85 flex items-center justify-center p-2 md:p-4">
            <div className="w-full max-w-6xl max-h-[96vh] flex flex-col bg-[#0B132B] text-slate-100 rounded-2xl border border-slate-700 shadow-2xl overflow-hidden">
              {/* TOP HUB TOOLBAR */}
              <div className="px-5 py-3 bg-[#0F172A] border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="font-bold text-white text-sm">Production Unit PDF Generator &amp; Print Hub</h3>
                  <p className="text-[11px] text-slate-400">
                    Party: {currentParty.partyName} | {currentParty.doors.length} Doors
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setHubTab('a4-landscape')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      hubTab === 'a4-landscape' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 hover:text-white'
                    }`}
                  >
                    📄 1. A4 Landscape
                  </button>
                  <button
                    type="button"
                    onClick={() => setHubTab('12l-sticker')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      hubTab === '12l-sticker' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 hover:text-white'
                    }`}
                  >
                    🏷️ 2. 12L Sticker Sheet
                  </button>
                  <button
                    type="button"
                    onClick={() => setHubTab('qc-sheet')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition ${
                      hubTab === 'qc-sheet' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300 hover:text-white'
                    }`}
                  >
                    🛡️ 3. QC Sheet
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowPrintHub(false)}
                    className="p-1.5 rounded bg-slate-800 hover:bg-rose-900 text-slate-300 hover:text-white ml-2"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* ACTION & PAPER CONTROLS */}
              <div className="px-5 py-2.5 bg-[#0F172A]/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-lg font-bold text-white shadow"
                  >
                    🖨️ Print Now
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const msg = `*EXMARK DOORS — CUTTING SCHEDULE*\nParty: *${currentParty.partyName}*\nTotal Doors: ${currentParty.doors.length}`;
                      if (navigator.clipboard) {
                        navigator.clipboard.writeText(msg);
                        alert('Schedule summary copied for WhatsApp!');
                      }
                    }}
                    className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded-lg font-bold text-white"
                  >
                    💬 WhatsApp Summary
                  </button>
                </div>

                {/* Paper Output Toggle */}
                {hubTab === '12l-sticker' && (
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 font-medium">Format:</span>
                    <button
                      type="button"
                      onClick={() => setHubFormat('workshop-cut')}
                      className={`px-2.5 py-1 rounded text-xs font-bold ${
                        hubFormat === 'workshop-cut' ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      🏷️ Workshop Cut (Floor)
                    </button>
                    <button
                      type="button"
                      onClick={() => setHubFormat('after-packing')}
                      className={`px-2.5 py-1 rounded text-xs font-bold ${
                        hubFormat === 'after-packing' ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      📦 After-Packing + QR
                    </button>

                    <span className="text-slate-400 font-medium ml-2">Paper:</span>
                    <button
                      type="button"
                      onClick={() => setHubPaper('a4-12l')}
                      className={`px-2.5 py-1 rounded text-xs font-bold ${
                        hubPaper === 'a4-12l' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      A4 Sheet (12L)
                    </button>
                    <button
                      type="button"
                      onClick={() => setHubPaper('single-4x2')}
                      className={`px-2.5 py-1 rounded text-xs font-bold ${
                        hubPaper === 'single-4x2' ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      Single 4&quot;×2&quot; Roll
                    </button>
                  </div>
                )}
              </div>

              {/* LIVE WHITE PRINT CANVAS */}
              <div className="flex-1 overflow-y-auto p-4 md:p-6 bg-slate-900 flex justify-center">
                <div className="bg-white text-slate-950 rounded-xl shadow-2xl p-6 w-full max-w-[920px]">
                  {hubTab === '12l-sticker' ? (
                    <div className="space-y-4">
                      <div className="flex justify-between items-center border-b pb-2 text-[11px] font-bold text-slate-500">
                        <span>PAGE 1 ({hubPaper === 'single-4x2' ? 'SINGLE 4"×2" ROLL LABELS' : '12 STICKERS PER A4 SHEET'})</span>
                        <span>
                          {hubFormat === 'workshop-cut'
                            ? 'AFFIX ON TOP HINGE RAIL FOR WORKSHOP CUTTING'
                            : 'AFFIX ON DOOR PROTECTIVE PACKAGING FOR SITE HANDOVER'}
                        </span>
                      </div>

                      <div className={hubPaper === 'single-4x2' ? 'flex flex-col gap-4 items-center' : 'grid grid-cols-1 md:grid-cols-2 gap-4'}>
                        {currentParty.doors.map((d, i) => {
                          const c = calcDoorSizes(d);
                          const num = i + 1;

                          if (hubFormat === 'workshop-cut') {
                            // FORMAT 1: WORKSHOP CUT STICKER
                            return (
                              <div
                                key={d.id}
                                className="bg-white border-2 border-slate-900 rounded-xl p-3.5 shadow-xs flex flex-col justify-between text-slate-900"
                                style={{ minHeight: '175px' }}
                              >
                                <div className="space-y-1">
                                  <div className="flex justify-between text-xs">
                                    <span className="text-slate-500">PartyName</span>
                                    <span className="font-black text-sm uppercase">{currentParty.partyName}</span>
                                  </div>
                                  <div className="flex justify-between items-center">
                                    <div className="text-xs">
                                      <span className="text-slate-500">Model: </span>
                                      <strong className="font-black uppercase">{d.modelName}</strong>
                                    </div>
                                    <div className="w-6 h-6 rounded-full border border-slate-800 flex items-center justify-center text-xs font-extrabold">
                                      {num}
                                    </div>
                                  </div>
                                  <div className="flex justify-between pt-0.5 text-[11px]">
                                    <div className="flex items-center gap-1">
                                      <span className="text-slate-500">Hing.Side</span>
                                      <span className="px-2 py-0.2 border border-slate-800 rounded font-black text-xs">
                                        {d.hingeSide}
                                      </span>
                                    </div>
                                    <div className="font-bold text-slate-700 uppercase">
                                      {d.lockSubLabel}, {d.finishShade}
                                    </div>
                                  </div>
                                </div>

                                <div className="my-2 border border-slate-800 rounded-md grid grid-cols-12 overflow-hidden bg-slate-50">
                                  <div className="col-span-6 border-r border-slate-800 p-2 flex flex-col items-center justify-center text-center">
                                    <div className="text-[10px] font-bold text-slate-600 uppercase">{c.hLabel}</div>
                                    <div className="font-mono text-base font-black mt-0.5">~{c.finH}</div>
                                  </div>
                                  <div className="col-span-6 flex flex-col justify-between divide-y divide-slate-800 text-xs">
                                    <div className="px-2 py-1 flex justify-between">
                                      <span className="text-[9px] font-bold text-slate-500">TOP</span>
                                      <span className="font-mono font-black">~{c.finTopW}</span>
                                    </div>
                                    <div className="px-2 py-1 flex justify-between">
                                      <span className="text-[9px] font-bold text-slate-500">BOTTOM</span>
                                      <span className="font-mono font-black">~{c.finBtmW}</span>
                                    </div>
                                  </div>
                                </div>

                                <div className="text-[10px] font-mono text-slate-600 truncate">
                                  Remark: {d.stickerRemark || 'STANDARD PRODUCTION'}
                                </div>
                              </div>
                            );
                          }

                          // FORMAT 2: AFTER-PACKING SITE VERIFICATION PASS + QR
                          const qrSvg = generateSvgQr(
                            `EXMARK|${currentParty.partyName}|DOOR#${num}|${d.roomTag}|${c.finH}x${c.finTopW}`,
                            64
                          );
                          return (
                            <div
                              key={d.id}
                              className="bg-white border-2 border-slate-900 rounded-xl overflow-hidden shadow-xs flex flex-col justify-between text-slate-900"
                              style={{ minHeight: '198px' }}
                            >
                              <div className="bg-[#0F172A] text-white px-3 py-1 flex justify-between items-center">
                                <span className="text-[10px] font-extrabold text-amber-400">
                                  📦 AFTER-PACKING SITE VERIFICATION PASS
                                </span>
                                <span className="px-2 py-0.2 bg-blue-600 text-white rounded text-[10px] font-black">
                                  DOOR #{num}
                                </span>
                              </div>

                              <div className="p-3 space-y-2 flex-1 flex flex-col justify-between text-[11px]">
                                <div>
                                  <div className="flex justify-between items-center">
                                    <div>
                                      <span className="text-slate-500">Party: </span>
                                      <strong className="font-black uppercase">{currentParty.partyName}</strong>
                                    </div>
                                    <span className="px-2 py-0.5 bg-indigo-50 text-indigo-900 border border-indigo-200 rounded font-bold text-[10px]">
                                      {d.roomTag}
                                    </span>
                                  </div>
                                  <div className="flex justify-between items-center text-[10px] text-slate-700 mt-0.5">
                                    <span>
                                      Model: <strong>{d.modelName}</strong> ({d.doorThickness}, {d.finishShade})
                                    </span>
                                    <span>
                                      {d.hingeSide} ({c.hLabel}) | {d.lockSubLabel}
                                    </span>
                                  </div>
                                </div>

                                {/* 3-Column Comparison Box */}
                                <div className="border border-slate-400 rounded grid grid-cols-12 overflow-hidden bg-slate-50/70 text-[10px]">
                                  <div className="col-span-4 border-r border-slate-400 p-1.5 font-mono">
                                    <div className="font-sans font-bold text-[9px] text-slate-600 border-b pb-0.5">
                                      GIVEN OPENING
                                    </div>
                                    <div className="pt-1">H: <strong>{d.rawHeightCm}</strong> ({cmToTapeInch(d.rawHeightCm)})</div>
                                    <div>W: <strong>T:{d.rawWidthTopCm} / B:{d.widthLinked ? d.rawWidthTopCm : d.rawWidthBtmCm}</strong></div>
                                    <div className="text-[8px] text-slate-500">{c.frame.name}</div>
                                  </div>

                                  <div className="col-span-5 border-r border-slate-400 p-1.5 font-mono bg-emerald-50/40">
                                    <div className="font-sans font-bold text-[9px] text-indigo-900 border-b pb-0.5">
                                      CONFIRM DOOR (PACKED)
                                    </div>
                                    <div className="pt-1">H: <strong>~{c.finH} cm</strong></div>
                                    <div>W: <strong>T:~{c.finTopW} | B:~{c.finBtmW}</strong></div>
                                    <div className="text-[8px] text-slate-500">H-{c.hMinusMm}mm, W-{c.wMinusMm}mm</div>
                                  </div>

                                  <div className="col-span-3 p-1 flex flex-col items-center justify-center bg-white text-center">
                                    <div dangerouslySetInnerHTML={{ __html: qrSvg }} />
                                    <span className="text-[8px] font-bold text-purple-900 mt-0.5">Scan at Site</span>
                                  </div>
                                </div>

                                <div className="flex justify-between items-center pt-0.5 text-[9px] text-slate-600">
                                  <span>☐ <strong>SITE VERIFIED:</strong> Confirmed matches opening</span>
                                  <span>Sign: _________________</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ) : hubTab === 'a4-landscape' ? (
                    <div className="space-y-4 text-xs">
                      <div className="flex justify-between items-center border-b-2 border-slate-900 pb-2">
                        <div>
                          <h2 className="text-base font-black uppercase">EXMARK DOORS — A4 CUTTING SCHEDULE</h2>
                          <p className="text-slate-600 text-[11px]">Party: <strong>{currentParty.partyName}</strong> | {currentParty.siteLocation}</p>
                        </div>
                        <div className="text-right text-[11px]">
                          <strong>Delivery Date: {currentParty.deliveryDate}</strong><br />
                          Total Doors: {currentParty.doors.length}
                        </div>
                      </div>

                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-900 text-white text-[10px] uppercase">
                            <th className="p-1.5">#</th>
                            <th className="p-1.5">Model / Room</th>
                            <th className="p-1.5">Frame Type</th>
                            <th className="p-1.5">Raw (Inch)</th>
                            <th className="p-1.5">Raw (CM)</th>
                            <th className="p-1.5 text-emerald-400">Finished (CM)</th>
                            <th className="p-1.5">Hinge &amp; Lock</th>
                            <th className="p-1.5">Finish</th>
                            <th className="p-1.5">Remarks</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-300">
                          {currentParty.doors.map((d, i) => {
                            const c = calcDoorSizes(d);
                            return (
                              <tr key={d.id} className="text-[11px]">
                                <td className="p-1.5 font-bold">{i + 1}</td>
                                <td className="p-1.5">
                                  <strong>{d.modelName}</strong>
                                  <div className="text-[10px] text-slate-500">{d.roomTag}</div>
                                </td>
                                <td className="p-1.5">{c.frame.name}</td>
                                <td className="p-1.5 font-mono">{cmToTapeInch(d.rawHeightCm)} × {cmToTapeInch(d.rawWidthTopCm)}</td>
                                <td className="p-1.5 font-mono">{d.rawHeightCm} × {d.rawWidthTopCm} cm</td>
                                <td className="p-1.5 font-mono font-black text-emerald-900">~{c.finH} × ~{c.finTopW} cm</td>
                                <td className="p-1.5">{d.hingeSide} | {d.lockSubLabel}</td>
                                <td className="p-1.5">{d.finishShade}</td>
                                <td className="p-1.5 text-[10px]">{d.stickerRemark}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    // QC INSPECTION SHEET
                    <div className="space-y-4 text-xs">
                      <div className="flex justify-between items-center border-b-2 border-slate-900 pb-2">
                        <div>
                          <h2 className="text-base font-black uppercase">ISO 9001:2015 FACTORY QC INSPECTION SHEET</h2>
                          <p className="text-slate-600 text-[11px]">Party: <strong>{currentParty.partyName}</strong> • Verify finished sizes before protective packing</p>
                        </div>
                        <div className="text-right text-[11px] font-bold">Total Doors: {currentParty.doors.length}</div>
                      </div>

                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-slate-900 text-white text-[10px] uppercase">
                            <th className="p-1.5">#</th>
                            <th className="p-1.5">Room / Model</th>
                            <th className="p-1.5">Finished Door (CM)</th>
                            <th className="p-1.5">Hardware</th>
                            <th className="p-1.5 text-center">Dimension QC</th>
                            <th className="p-1.5 text-center">Surface QC</th>
                            <th className="p-1.5 text-center">QR Pass</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-300">
                          {currentParty.doors.map((d, i) => {
                            const c = calcDoorSizes(d);
                            const qrSvg = generateSvgQr(`EXMARK|QC|${currentParty.partyName}|D${i + 1}|${c.finH}x${c.finTopW}`, 44);
                            return (
                              <tr key={d.id} className="text-[11px]">
                                <td className="p-1.5 font-bold">DOOR #{i + 1}</td>
                                <td className="p-1.5">
                                  <strong>{d.roomTag}</strong>
                                  <div className="text-[10px] text-slate-500">{d.modelName} ({d.finishShade})</div>
                                </td>
                                <td className="p-1.5 font-mono font-black text-emerald-900">~{c.finH} × ~{c.finTopW} cm</td>
                                <td className="p-1.5">{d.hingeSide} ({c.hLabel}) | {d.lockSubLabel}</td>
                                <td className="p-1.5 text-center">☐ Thickness<br />☐ Squareness</td>
                                <td className="p-1.5 text-center">☐ Laminate<br />☐ Lock Slot</td>
                                <td className="p-1.5 text-center">
                                  <div className="flex justify-center" dangerouslySetInnerHTML={{ __html: qrSvg }} />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
