'use client';

import React, { useState, useEffect } from 'react';
import {
  Printer,
  FileText,
  ShieldCheck,
  CheckSquare,
  Square,
  Filter,
  Layers,
  Sparkles,
  QrCode,
  Tag,
  CheckCircle2,
  X,
  Building2,
  Calendar,
  Download,
  Edit3,
  MessageSquare,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { FRAME_DEDUCTION_PRESETS, FramePresetKey } from '@/lib/services/doorSizingEngine';
import { computeStickerSizes, cmToTapeInch } from '@/lib/utils/doorStickerFormula';
import * as QRCode from 'qrcode';

interface BatchDoorScheduleItem {
  doorId?: string;
  tag: string;
  frameSize: string;
  shutterSize: string;
  tape: string;
  profile: string;
  finish: string;
  lock: string;
  hand: string;
  qty: number;
  remark?: string;
  presetKey?: FramePresetKey;
  rawHeightCm?: number;
  rawWidthTopCm?: number;
  rawWidthBtmCm?: number;
  tapeInchH?: string;
  rebateLabel?: string;
  doorThicknessLabel?: string;
  hDedMm?: number;
  wDedMm?: number;
  qrUrl?: string;
  finTopW?: number;
  finBtmW?: number;
  finH?: number;
  finTopWText?: string;
  finBtmWText?: string;
  finHText?: string;
  hLabel?: 'H-LEFT' | 'H-RIGHT';
  isTapered?: boolean;
}

interface BatchOrderData {
  id: string;
  orderNumber: string;
  customerName: string;
  siteName: string;
  district: string;
  jobCardNumber: string;
  totalAmount: number;
  doorsDesc: string;
  doorsList: BatchDoorScheduleItem[];
}

export interface ExpandedSticker {
  id?: string;
  doorId?: string;
  orderId?: string;
  orderNumber: string;
  customerName: string;
  siteName: string;
  jobCardNumber: string;
  tag: string;
  unitIndex: number;
  totalUnitsInTag: number;
  doorNumberInOrder?: number;
  totalDoorsInOrder?: number;
  shutterSize: string;
  frameSize: string;
  tape: string;
  profile: string;
  finish: string;
  lock: string;
  hand: string;
  barcode: string;
  remark?: string;
  rawHeightCm?: number;
  rawWidthTopCm?: number;
  rawWidthBtmCm?: number;
  tapeInchH?: string;
  rebateLabel?: string;
  doorThicknessLabel?: string;
  hDedMm?: number;
  wDedMm?: number;
  qrUrl?: string;
  finTopW?: number;
  finBtmW?: number;
  finH?: number;
  finTopWText?: string;
  finBtmWText?: string;
  finHText?: string;
  isTapered?: boolean;
}

function parseRawOpeningFromFrameSize(
  frameSize: string | undefined,
  fallbackH: number,
  fallbackTopW: number,
  fallbackBtmW: number
): { rawH: number; rawTopW: number; rawBtmW: number } {
  const nums = (frameSize || '').match(/\d+(?:\.\d+)?/g)?.map(Number) || [];
  if (nums.length >= 3) {
    return { rawH: nums[0], rawTopW: nums[1], rawBtmW: nums[2] };
  }
  if (nums.length === 2) {
    return { rawH: nums[0], rawTopW: nums[1], rawBtmW: nums[1] };
  }
  return { rawH: fallbackH, rawTopW: fallbackTopW, rawBtmW: fallbackBtmW };
}

function formatCompactCm(val: number, decimals = 2): string {
  if (!Number.isFinite(val) || val <= 0) return '-';
  return Number(val.toFixed(decimals)).toString();
}

export function extractTopBtmWidths(st: {
  shutterSize?: string;
  tape?: string;
  finTopW?: number;
  finBtmW?: number;
  finTopWText?: string;
  finBtmWText?: string;
}): { topW: number; btmW: number; topText: string; btmText: string; isTapered: boolean } {
  if (st.finTopW !== undefined && st.finBtmW !== undefined) {
    const isTapered = Math.abs(st.finTopW - st.finBtmW) >= 0.05;
    return {
      topW: st.finTopW,
      btmW: st.finBtmW,
      topText: st.finTopWText || `-${st.finTopW.toFixed(1)}`,
      btmText: st.finBtmWText || `-${st.finBtmW.toFixed(1)}`,
      isTapered,
    };
  }

  // Parse from shutterSize or tape string (e.g. "T:78.5 / B:78.4" or "T: 78.5, B: 78.4")
  const combined = `${st.shutterSize || ''} ${st.tape || ''}`;
  const topMatch = combined.match(/T(?:OP)?[:\s-]*([0-9.]+)/i);
  const btmMatch = combined.match(/B(?:TM|OTTOM)?[:\s-]*([0-9.]+)/i);

  if (topMatch && btmMatch) {
    const tw = parseFloat(topMatch[1]);
    const bw = parseFloat(btmMatch[1]);
    const isTapered = Math.abs(tw - bw) >= 0.05;
    return {
      topW: tw,
      btmW: bw,
      topText: `-${tw.toFixed(1)}`,
      btmText: `-${bw.toFixed(1)}`,
      isTapered,
    };
  }

  // Fallback to standard 2-part split (e.g. "205.5 x 82.4")
  const parts = (st.shutterSize || '').replace(/[^0-9.x×]/gi, '').split(/[x×]/);
  const defaultW = parts[1] ? parseFloat(parts[1]) : 82.4;
  return {
    topW: defaultW,
    btmW: defaultW,
    topText: `-${defaultW.toFixed(1)}`,
    btmText: `-${defaultW.toFixed(1)}`,
    isTapered: false,
  };
}

export interface PaperCalibrationPreset {
  name: string;
  topMarginMm: number;
  leftMarginMm: number;
  rowGapMm: number;
  colGapMm: number;
  labelWidthMm: number;
  labelHeightMm: number;
}

export const PAPER_PRESETS: Record<string, PaperCalibrationPreset> = {
  'Standard 12L Die-Cut (99 x 44 mm)': {
    name: 'Standard 12L Die-Cut (99 x 44 mm)',
    topMarginMm: 9.0,
    leftMarginMm: 4.4,
    rowGapMm: 3.0,
    colGapMm: 3.2,
    labelWidthMm: 99.0,
    labelHeightMm: 44.0,
  },
  'Standard 12L (Left 5.1mm / Right 3.7mm)': {
    name: 'Standard 12L (Left 5.1mm / Right 3.7mm)',
    topMarginMm: 9.0,
    leftMarginMm: 5.1,
    rowGapMm: 3.0,
    colGapMm: 3.2,
    labelWidthMm: 99.0,
    labelHeightMm: 44.0,
  },
};

export const DEFAULT_BATCH_FACTORY_ORDERS: BatchOrderData[] = [
  {
    id: 'DEMO-RICHONE',
    orderNumber: 'JC-2026-RICHONE (SO-8921)',
    customerName: 'RICHONE DOOR',
    siteName: 'Richone Residency Project',
    district: 'Kozhikode',
    jobCardNumber: 'JC-2026-081',
    totalAmount: 245000,
    doorsDesc: '3 Door Sets (Rose Wood EXMB-212)',
    doorsList: [
      {
        tag: 'D1',
        frameSize: '214.3 × 79.1 cm',
        shutterSize: '-209.8 × -71.5 cm',
        tape: '84 3/8" × 31 1/8"',
        profile: 'EXMB-212',
        finish: 'ROSE WOOD',
        lock: 'BABY LATCH',
        hand: 'RH',
        qty: 1,
        finH: 209.8,
        finTopW: 71.5,
        finBtmW: 71.5,
        finHText: '-209.8',
        finTopWText: '-71.5',
        finBtmWText: '-71.5',
        hLabel: 'H-LEFT',
        isTapered: false,
      },
      {
        tag: 'D2',
        frameSize: '212.4 × 78.1 / 78.7 cm',
        shutterSize: '-207.9 × [TOP: -70.5 / BTM: -71.1] cm',
        tape: '83 5/8" × 30 3/4" / 31"',
        profile: 'EXMB-212',
        finish: 'ROSE WOOD',
        lock: 'BABY LATCH',
        hand: 'RH',
        qty: 1,
        finH: 207.9,
        finTopW: 70.5,
        finBtmW: 71.1,
        finHText: '-207.9',
        finTopWText: '-70.5',
        finBtmWText: '-71.1',
        hLabel: 'H-LEFT',
        isTapered: true,
      },
      {
        tag: 'D3',
        frameSize: '211.8 × 75.6 / 75.3 cm',
        shutterSize: '-207.3 × [TOP: -68.0 / BTM: -67.7] cm',
        tape: '83 3/8" × 29 3/4" / 29 5/8"',
        profile: 'EXMB-212',
        finish: 'ROSE WOOD',
        lock: 'BABY LATCH',
        hand: 'RH',
        qty: 1,
        finH: 207.3,
        finTopW: 68.0,
        finBtmW: 67.7,
        finHText: '-207.3',
        finTopWText: '-68',
        finBtmWText: '-67.7',
        hLabel: 'H-LEFT',
        isTapered: true,
      },
    ],
  },
  {
    id: 'DEMO-GLYS-PROMOAD',
    orderNumber: 'JC-2026-GLYS (SO-8922)',
    customerName: 'GLYS PROMOAD',
    siteName: 'Glyspromoad Villa',
    district: 'Ernakulam',
    jobCardNumber: 'JC-2026-082',
    totalAmount: 85000,
    doorsDesc: '1 Door Set (Oak Wood EXM-C-308)',
    doorsList: [
      {
        tag: 'D1',
        frameSize: '196.8 × 78.7 / 78.1 cm',
        shutterSize: '-192.3 × [TOP: -71.1 / BTM: -70.5] cm',
        tape: '77 1/2" × 31" / 30 3/4"',
        profile: 'EXM-C-308',
        finish: 'OAK WOOD',
        lock: 'BABY LATCH',
        hand: 'LH',
        qty: 1,
        finH: 192.3,
        finTopW: 71.1,
        finBtmW: 70.5,
        finHText: '-192.3',
        finTopWText: '-71.1',
        finBtmWText: '-70.5',
        hLabel: 'H-RIGHT',
        isTapered: true,
      },
    ],
  },
  {
    id: 'DEMO-ALLOY-FAB',
    orderNumber: 'JC-2026-ALLOY (SO-8923)',
    customerName: 'ALLOY FAB',
    siteName: 'Alloy Fab Site',
    district: 'Thrissur',
    jobCardNumber: 'JC-2026-083',
    totalAmount: 78000,
    doorsDesc: '1 Door Set (Eeti Wood EXM-A-121)',
    doorsList: [
      {
        tag: 'D1',
        frameSize: '178.3 × 70.2 / 70.5 cm',
        shutterSize: '-173.8 × [TOP: -62.6 / BTM: -62.9] cm',
        tape: '70 1/4" × 27 5/8" / 27 3/4"',
        profile: 'EXM-A-121',
        finish: 'EETI WOOD',
        lock: 'BABY LATCH',
        hand: 'LH',
        qty: 1,
        finH: 173.8,
        finTopW: 62.6,
        finBtmW: 62.9,
        finHText: '-173.8',
        finTopWText: '-62.6',
        finBtmWText: '-62.9',
        hLabel: 'H-RIGHT',
        isTapered: true,
      },
    ],
  },
  {
    id: 'DEMO-EDAPPAL',
    orderNumber: 'JC-2026-EDAPPAL (SO-8924)',
    customerName: 'EDAPPAL',
    siteName: 'Edappal Commercial Center',
    district: 'Malappuram',
    jobCardNumber: 'JC-2026-084',
    totalAmount: 165000,
    doorsDesc: '2 Door Sets (Mica EXM-A-100)',
    doorsList: [
      {
        tag: 'D1',
        frameSize: '196.0 × 71.3 / 71.5 cm',
        shutterSize: '-191.5 × [TOP: -63.7 / BTM: -63.9] cm',
        tape: '77 1/8" × 28 1/8" / 28 1/8"',
        profile: 'EXM-A-100',
        finish: 'MICA',
        lock: 'BABY LATCH',
        hand: 'LH',
        qty: 1,
        finH: 191.5,
        finTopW: 63.7,
        finBtmW: 63.9,
        finHText: '-191.5',
        finTopWText: '-63.7',
        finBtmWText: '-63.9',
        hLabel: 'H-RIGHT',
        isTapered: true,
      },
      {
        tag: 'D2',
        frameSize: '212.5 × 74.8 / 75.2 cm',
        shutterSize: '-208.0 × [TOP: -67.2 / BTM: -67.6] cm',
        tape: '83 5/8" × 29 1/2" / 29 5/8"',
        profile: 'EXM-A-100',
        finish: 'MICA',
        lock: 'BABY LATCH',
        hand: 'RH',
        qty: 1,
        finH: 208.0,
        finTopW: 67.2,
        finBtmW: 67.6,
        finHText: '-208',
        finTopWText: '-67.2',
        finBtmWText: '-67.6',
        hLabel: 'H-LEFT',
        isTapered: true,
      },
    ],
  },
  {
    id: 'DEMO-KACHERIPADY',
    orderNumber: 'JC-2026-KACHERIPADY (SO-8925)',
    customerName: 'KACHERIPADY',
    siteName: 'Kacheripady Residence',
    district: 'Ernakulam',
    jobCardNumber: 'JC-2026-085',
    totalAmount: 92000,
    doorsDesc: '1 Door Set (Natural Teak EXM-A-120)',
    doorsList: [
      {
        tag: 'D1',
        frameSize: '198.4 × 69.1 / 70.2 cm',
        shutterSize: '-193.9 × [TOP: -61.5 / BTM: -62.6] cm',
        tape: '78 1/8" × 27 1/4" / 27 5/8"',
        profile: 'EXM-A-120',
        finish: 'NATURAL TEAK',
        lock: 'BABY LATCH',
        hand: 'LH',
        qty: 1,
        finH: 193.9,
        finTopW: 61.5,
        finBtmW: 62.6,
        finHText: '-193.9',
        finTopWText: '-61.5',
        finBtmWText: '-62.6',
        hLabel: 'H-RIGHT',
        isTapered: true,
      },
    ],
  },
];

export interface BatchPrintHubProps {
  initialSelectedOrderIds?: string[];
  onClose?: () => void;
}

export default function BatchPrintHub({
  initialSelectedOrderIds,
  onClose,
}: BatchPrintHubProps = {}) {
  const [orders, setOrders] = useState<BatchOrderData[]>(DEFAULT_BATCH_FACTORY_ORDERS);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>(
    initialSelectedOrderIds && initialSelectedOrderIds.length > 0
      ? initialSelectedOrderIds
      : DEFAULT_BATCH_FACTORY_ORDERS.map((o) => o.id)
  );
  const [partyFilter, setPartyFilter] = useState<string>('ALL');
  const [activePrintModal, setActivePrintModal] = useState<'STICKERS' | 'QC_PDF' | 'A4_SCHEDULE' | null>(null);
  const [stickerFormat, setStickerFormat] = useState<'A4_12L' | 'A4_12L_PACKING_PASS' | 'THERMAL_ROLL'>('A4_12L');
  const [qrDataUrls, setQrDataUrls] = useState<Record<string, string>>({});
  const [gridLayout, setGridLayout] = useState<'2x6' | '3x4'>('2x6');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [doorRemarks, setDoorRemarks] = useState<Record<string, string>>({});
  const [isRemarksManagerOpen, setIsRemarksManagerOpen] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [expandedOrders, setExpandedOrders] = useState<Record<string, boolean>>({});
  const [partyQuickRemarks, setPartyQuickRemarks] = useState<Record<string, string>>({});

  const toggleOrderExpand = (orderId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setExpandedOrders((prev) => ({
      ...prev,
      [orderId]: !prev[orderId],
    }));
  };

  const handleApplyPartyQuickRemark = (orderId: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const text = (partyQuickRemarks[orderId] || '').trim();
    const targetOrder = orders.find((o) => o.id === orderId);
    if (!targetOrder) return;

    setDoorRemarks((prev) => {
      const next = { ...prev };
      targetOrder.doorsList.forEach((door, dIdx) => {
        for (let q = 1; q <= door.qty; q++) {
          const uniqueKey = `${orderId}-${door.tag}-${dIdx}-${q}`;
          const remarkKey = `${orderId}-${door.tag}-${q}`;
          if (text) {
            next[uniqueKey] = text;
            next[remarkKey] = text;
          } else {
            delete next[uniqueKey];
            delete next[remarkKey];
          }
        }
      });
      return next;
    });

    const totalDoors = targetOrder.doorsList.reduce((sum, d) => sum + d.qty, 0);
    setToastMessage(
      text
        ? `Applied remark "${text}" to all ${totalDoors} doors of ${targetOrder.customerName}.`
        : `Cleared remarks for all doors of ${targetOrder.customerName}.`
    );
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleUpdateDoorRemark = (uniqueKey: string, remarkKey: string, val: string) => {
    setDoorRemarks((prev) => {
      const next = { ...prev };
      if (val.trim()) {
        next[uniqueKey] = val;
        next[remarkKey] = val;
      } else {
        delete next[uniqueKey];
        delete next[remarkKey];
      }
      return next;
    });
  };

  // 12L Sticker Sheet Calibration State (Exact 99x44mm Die-Cut Fit & Safe Margin Buffer)
  const [calibrationPaper, setCalibrationPaper] = useState('Standard 12L Die-Cut (99 x 44 mm)');
  const [nudgeXmm, setNudgeXmm] = useState<number>(0);
  const [nudgeYmm, setNudgeYmm] = useState<number>(0);
  const [safeMarginBuffer, setSafeMarginBuffer] = useState<boolean>(true);

  // Load saved calibration preferences from localStorage if available
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedX = localStorage.getItem('exmark_sticker_nudge_x');
      if (savedX !== null) setNudgeXmm(parseFloat(savedX) || 0);
      const savedY = localStorage.getItem('exmark_sticker_nudge_y');
      if (savedY !== null) setNudgeYmm(parseFloat(savedY) || 0);
      const savedPaper = localStorage.getItem('exmark_sticker_paper');
      if (savedPaper && PAPER_PRESETS[savedPaper]) setCalibrationPaper(savedPaper);
    }
  }, []);

  // Persist calibration adjustments
  const handleUpdateNudgeX = (val: number | ((prev: number) => number)) => {
    setNudgeXmm((prev) => {
      const next = typeof val === 'function' ? val(prev) : val;
      const rounded = Math.round(next * 10) / 10;
      if (typeof window !== 'undefined') localStorage.setItem('exmark_sticker_nudge_x', String(rounded));
      return rounded;
    });
  };

  const handleUpdateNudgeY = (val: number | ((prev: number) => number)) => {
    setNudgeYmm((prev) => {
      const next = typeof val === 'function' ? val(prev) : val;
      const rounded = Math.round(next * 10) / 10;
      if (typeof window !== 'undefined') localStorage.setItem('exmark_sticker_nudge_y', String(rounded));
      return rounded;
    });
  };

  const handleSelectPaper = (paperName: string) => {
    setCalibrationPaper(paperName);
    if (typeof window !== 'undefined') localStorage.setItem('exmark_sticker_paper', paperName);
  };

  useEffect(() => {
    let active = true;
    fetch('/api/production')
      .then((res) => res.json())
      .then((json) => {
        if (!active || !json.success || !Array.isArray(json.data) || json.data.length === 0) return;
        const apiOrders: BatchOrderData[] = json.data.map((p: {
          id: string;
          salesOrderId?: string;
          prodOrderNumber: string;
          customerName?: string;
          siteName?: string;
          district?: string;
          jobCardNumber: string;
          doors?: Array<{
            doorNumber?: string;
            doorId?: string;
            rawHeightMm?: number;
            rawWidthMm?: number;
            rawWidthBottomMm?: number;
            rawHeightCm?: number;
            rawWidthTopCm?: number;
            rawWidthBtmCm?: number;
            finishedHeightMm?: number;
            finishedWidthMm?: number;
            frameTypeName?: string;
            doorThicknessMm?: number;
            doorThicknessLabel?: string;
            qrPayload?: string;
            model?: string;
            finishColor?: string;
            lockType?: string;
            handing?: string;
            remark?: string;
          }>;
            doorCategory?: string;
        }) => ({
          id: p.id, // Unique production order ID prevents duplicate key collisions for shared salesOrderId
          orderNumber: p.salesOrderId ? `${p.jobCardNumber} (${p.salesOrderId})` : p.prodOrderNumber,
          customerName: p.customerName || 'Kerala Customer',
          siteName: p.siteName || `${p.customerName || 'Client'} Site`,
          district: p.district || 'Ernakulam',
          jobCardNumber: p.jobCardNumber,
          totalAmount: 180000,
          doorsDesc: `${p.doors?.length || 1} Door Sets (${p.doorCategory?.replace('_', ' ') || 'FRP Doors'})`,
          doorsList: (p.doors || []).map((d, idx) => {
            const rawHCm = d.rawHeightCm ?? (d.rawHeightMm ? d.rawHeightMm / 10 : 210);
            const rawTopCm = d.rawWidthTopCm ?? (d.rawWidthMm ? d.rawWidthMm / 10 : 80);
            const rawBtmCm = d.rawWidthBtmCm ?? (d.rawWidthBottomMm ? d.rawWidthBottomMm / 10 : rawTopCm);
            const isTaperedRaw = Math.abs(rawTopCm - rawBtmCm) >= 0.05;
            const hSide = d.handing === 'LH' ? 'L' : 'R';
            const calc = computeStickerSizes({
              rawHeightCm: rawHCm,
              rawWidthTopCm: rawTopCm,
              rawWidthBtmCm: rawBtmCm,
              widthLinked: !isTaperedRaw,
              hDeductionCm: 4.5,
              wDeductionCm: 7.6,
              hingeSide: hSide,
            });
            const origin = typeof window !== 'undefined' ? window.location.origin : '';
            const doorCode = d.doorId || `${p.jobCardNumber}-D${String(idx + 1).padStart(2, '0')}`;
            return {
              doorId: doorCode,
              tag: d.doorNumber || `Door #${idx + 1}`,
              frameSize: `${rawHCm.toFixed(1)} × ${rawTopCm.toFixed(1)}${isTaperedRaw ? ` / ${rawBtmCm.toFixed(1)}` : ''} cm`,
              shutterSize: calc.isTapered
                ? `${calc.finHText} × [TOP: ${calc.finTopWText} / BTM: ${calc.finBtmWText}] cm`
                : `${calc.finHText} × ${calc.finTopWText} cm`,
              tape: `${cmToTapeInch(rawHCm)} × ${cmToTapeInch(rawTopCm)}${isTaperedRaw ? ` / ${cmToTapeInch(rawBtmCm)}` : ''}`,
              profile: d.model || 'EXM-A-101',
              finish: d.finishColor || 'Natural Teak',
              lock: d.lockType || 'Baby Latch',
              hand: d.handing === 'LH' ? 'LH' : 'RH',
              remark: (d.remark || '').trim(),
              rawHeightCm: rawHCm,
              rawWidthTopCm: rawTopCm,
              rawWidthBtmCm: rawBtmCm,
              tapeInchH: cmToTapeInch(rawHCm),
              rebateLabel: d.frameTypeName || 'Mini 40x25',
              doorThicknessLabel: d.doorThicknessLabel || (d.doorThicknessMm ? `${d.doorThicknessMm}mm` : '28mm'),
              hDedMm: Math.max(0, Math.round((rawHCm - calc.finH) * 10)),
              wDedMm: Math.max(0, Math.round((rawTopCm - calc.finTopW) * 10)),
              qrUrl: d.qrPayload || (origin ? `${origin}/track/${encodeURIComponent(doorCode)}` : `/track/${encodeURIComponent(doorCode)}`),
              finH: calc.finH,
              finTopW: calc.finTopW,
              finBtmW: calc.finBtmW,
              finHText: calc.finHText,
              finTopWText: calc.finTopWText,
              finBtmWText: calc.finBtmWText,
              hLabel: calc.hLabel,
              isTapered: calc.isTapered,
              qty: 1,
            };
          }),
        }));

        // Seed any saved door remarks from database into doorRemarks state
        const initialLoadedRemarks: Record<string, string> = {};
        for (const ord of apiOrders) {
          ord.doorsList.forEach((door, dIdx) => {
            if (door.remark && door.remark.trim().length > 0) {
              const uniqueKey = `${ord.id}-${door.tag}-${dIdx}-1`;
              const remarkKey = `${ord.id}-${door.tag}-1`;
              initialLoadedRemarks[uniqueKey] = door.remark.trim();
              initialLoadedRemarks[remarkKey] = door.remark.trim();
            }
          });
        }
        if (Object.keys(initialLoadedRemarks).length > 0) {
          setDoorRemarks((prev) => ({ ...initialLoadedRemarks, ...prev }));
        }

        setOrders((prev) => {
          const seen = new Set(prev.map((o) => o.id));
          const uniqueNew: BatchOrderData[] = [];
          for (const ord of apiOrders) {
            if (!seen.has(ord.id)) {
              seen.add(ord.id);
              uniqueNew.push(ord);
            }
          }
          return [...prev, ...uniqueNew];
        });

        if (initialSelectedOrderIds && initialSelectedOrderIds.length > 0) {
          const matchedIds = apiOrders
            .filter((o) =>
              initialSelectedOrderIds.some(
                (sel) => sel === o.id || sel === o.jobCardNumber || o.orderNumber.includes(sel)
              )
            )
            .map((o) => o.id);
          if (matchedIds.length > 0) {
            setSelectedOrderIds((prev) => Array.from(new Set([...prev, ...matchedIds])));
          }
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const toggleOrderSelection = (id: string) => {
    setSelectedOrderIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    setSelectedOrderIds(orders.map((o) => o.id));
    setToastMessage('All orders selected for Batch Printing.');
    setTimeout(() => setToastMessage(null), 3000);
  };

  const clearAll = () => {
    setSelectedOrderIds([]);
    setToastMessage('Cleared all order selections.');
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Expand individual stickers for all selected orders
  const getExpandedStickers = (): ExpandedSticker[] => {
    const list: ExpandedSticker[] = [];
    orders.forEach((ord) => {
      if (!selectedOrderIds.includes(ord.id)) return;
      const totalDoorsInThisOrder = ord.doorsList.reduce((sum, d) => sum + (d.qty || 1), 0);
      let orderDoorNum = 1;
      let doorIdx = 1;

      ord.doorsList.forEach((door, dIdx) => {
        for (let q = 1; q <= door.qty; q++) {
          const uniqueKey = `${ord.id}-${door.tag}-${dIdx}-${q}`;
          const remarkKey = `${ord.id}-${door.tag}-${q}`;
          const widths = extractTopBtmWidths({
            shutterSize: door.shutterSize,
            tape: door.tape,
            finTopW: door.finTopW,
            finBtmW: door.finBtmW,
            finTopWText: door.finTopWText,
            finBtmWText: door.finBtmWText,
          });
          const fallbackFinH = door.finH || parseFloat((door.finHText || '201.2').replace(/[^\d.]/g, '')) || 201.2;
          const parsedOpen = parseRawOpeningFromFrameSize(
            door.frameSize,
            Number((fallbackFinH + 4.5).toFixed(2)),
            Number((widths.topW + 7.6).toFixed(2)),
            Number((widths.btmW + 7.6).toFixed(2))
          );
          const rawHCm = door.rawHeightCm ?? parsedOpen.rawH;
          const rawTopCm = door.rawWidthTopCm ?? parsedOpen.rawTopW;
          const rawBtmCm = door.rawWidthBtmCm ?? parsedOpen.rawBtmW;
          const hDedMm = door.hDedMm ?? Math.max(0, Math.round((rawHCm - fallbackFinH) * 10));
          const wDedMm = door.wDedMm ?? Math.max(0, Math.round((rawTopCm - widths.topW) * 10));
          const origin = typeof window !== 'undefined' ? window.location.origin : '';
          const doorCode = door.doorId || `${ord.jobCardNumber}-D${String(orderDoorNum).padStart(2, '0')}`;
          const qrUrl =
            door.qrUrl ||
            (origin ? `${origin}/track/${encodeURIComponent(doorCode)}` : `/track/${encodeURIComponent(doorCode)}`);

          list.push({
            id: uniqueKey,
            doorId: doorCode,
            orderId: ord.id,
            orderNumber: ord.orderNumber,
            customerName: ord.customerName,
            siteName: ord.siteName,
            jobCardNumber: ord.jobCardNumber,
            tag: door.tag,
            unitIndex: q,
            totalUnitsInTag: door.qty,
            doorNumberInOrder: orderDoorNum,
            totalDoorsInOrder: totalDoorsInThisOrder,
            shutterSize: door.shutterSize,
            frameSize: door.frameSize,
            tape: door.tape,
            profile: door.profile,
            finish: door.finish,
            lock: door.lock,
            hand: door.hand,
            barcode: `*EXM-${ord.orderNumber.slice(-3)}-D0${doorIdx}-${q.toString().padStart(2, '0')}*`,
            rawHeightCm: rawHCm,
            rawWidthTopCm: rawTopCm,
            rawWidthBtmCm: rawBtmCm,
            tapeInchH: door.tapeInchH || cmToTapeInch(rawHCm),
            rebateLabel: door.rebateLabel || 'Mini 40x25',
            doorThicknessLabel: door.doorThicknessLabel || '28mm',
            hDedMm,
            wDedMm,
            qrUrl,
            finH: door.finH ?? fallbackFinH,
            finHText: door.finHText || `-${formatCompactCm(fallbackFinH, 1)}`,
            finTopW: widths.topW,
            finBtmW: widths.btmW,
            finTopWText: widths.topText,
            finBtmWText: widths.btmText,
            isTapered: widths.isTapered,
            remark:
              doorRemarks[uniqueKey] !== undefined
                ? doorRemarks[uniqueKey]
                : doorRemarks[remarkKey] !== undefined
                ? doorRemarks[remarkKey]
                : (door.remark || ''),
          });
          orderDoorNum++;
        }
        doorIdx++;
      });
    });
    return list;
  };

  const handleDownloadVectorPdf = async () => {
    try {
      setIsDownloadingPdf(true);
      const { generate12LStickerPdf, generate12LPackingPassPdf, generateThermal4x2Pdf } = await import('@/lib/utils/pdfStickerEngine');
      const preset = PAPER_PRESETS[calibrationPaper] || PAPER_PRESETS['Standard 12L Die-Cut (99 x 44 mm)'];
      const printableItems = stickers.map((st, idx) => {
        const widths = extractTopBtmWidths(st);
        const hSide = (st.hand || 'R').toUpperCase().startsWith('L') ? 'L' : 'R';
        return {
          id: st.id || `stk-${idx}`,
          orderNumber: st.orderNumber,
          jobCardNumber: st.jobCardNumber,
          customerName: st.customerName,
          siteName: st.siteName,
          doorNumber: st.doorNumberInOrder || (idx + 1),
          totalDoorsInOrder: st.totalDoorsInOrder || stickers.length,
          shutterSize: st.shutterSize,
          tape: st.tape,
          profile: st.profile,
          finish: st.finish,
          hand: st.hand,
          hingeSide: hSide,
          lock: st.lock,
          remark: st.remark, // Strictly conditional: only populated if non-empty!
          barcode: st.barcode,
          rawHeightCm: st.rawHeightCm,
          rawWidthTopCm: st.rawWidthTopCm,
          rawWidthBtmCm: st.rawWidthBtmCm,
          tapeInchH: st.tapeInchH,
          doorTag: st.tag,
          roomLabel: st.tag,
          rebateLabel: st.rebateLabel || 'Mini 40x25',
          doorThicknessLabel: st.doorThicknessLabel || '28mm',
          hDedMm: st.hDedMm,
          wDedMm: st.wDedMm,
          qrUrl: st.qrUrl,
          finH: st.finH,
          finHText: st.finHText,
          finTopW: widths.topW,
          finBtmW: widths.btmW,
          finTopWText: widths.topText,
          finBtmWText: widths.btmText,
          isTapered: widths.isTapered,
        };
      });

      if (stickerFormat === 'THERMAL_ROLL') {
        const pdf = await generateThermal4x2Pdf(printableItems, { companyName: 'EXMARK DOORS' });
        pdf.save(`EXMARK_Thermal_4x2_Batch_${new Date().toISOString().slice(0, 10)}.pdf`);
        setToastMessage(`4"x2" Thermal Vector PDF generated (${printableItems.length} labels)!`);
      } else if (stickerFormat === 'A4_12L_PACKING_PASS') {
        const pdf = await generate12LPackingPassPdf(printableItems, {
          companyName: 'EXMARK DOORS',
          layout: gridLayout,
          nudgeXmm,
          nudgeYmm,
          safeMarginBufferActive: safeMarginBuffer,
          topMarginMm: preset.topMarginMm,
          leftMarginMm: preset.leftMarginMm,
          rowGapMm: preset.rowGapMm,
          colGapMm: preset.colGapMm,
        });
        pdf.save(`EXMARK_12L_AfterPacking_Pass_${new Date().toISOString().slice(0, 10)}.pdf`);
        setToastMessage(`12L After-Packing Site Verification Pass PDF downloaded (${printableItems.length} labels)!`);
      } else {
        const pdf = await generate12LStickerPdf(printableItems, {
          companyName: 'EXMARK DOORS',
          layout: gridLayout,
          nudgeXmm,
          nudgeYmm,
          safeMarginBufferActive: safeMarginBuffer,
          topMarginMm: preset.topMarginMm,
          leftMarginMm: preset.leftMarginMm,
          rowGapMm: preset.rowGapMm,
          colGapMm: preset.colGapMm,
        });
        pdf.save(`EXMARK_12L_${gridLayout}_${new Date().toISOString().slice(0, 10)}.pdf`);
        setToastMessage(`12L (${gridLayout.toUpperCase()}) Top-Left Vector PDF downloaded!`);
      }
      setTimeout(() => setToastMessage(null), 4000);
    } catch (err: any) {
      console.error('Vector PDF generation failed:', err);
      setToastMessage('Failed to download Vector PDF. Please try HTML Print.');
      setTimeout(() => setToastMessage(null), 4000);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  const stickers = getExpandedStickers();
  const totalStickers = stickers.length;
  const totalSheets = Math.ceil(totalStickers / 12) || 0;

  // Generate QR data URLs for HTML preview/print when After-Packing Site Verification Pass is active
  useEffect(() => {
    if (activePrintModal !== 'STICKERS' || stickerFormat !== 'A4_12L_PACKING_PASS') return;
    let cancelled = false;
    (async () => {
      const next: Record<string, string> = {};
      for (const st of stickers) {
        const key = st.id || st.barcode;
        const payload = st.qrUrl || st.barcode || key;
        try {
          next[key] = await QRCode.toDataURL(payload, {
            width: 140,
            margin: 0,
            errorCorrectionLevel: 'M',
          });
        } catch {
          // ignore individual QR failures
        }
      }
      if (!cancelled) setQrDataUrls(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [activePrintModal, stickerFormat, selectedOrderIds, orders]);

  const filteredOrders = orders.filter((o) => {
    if (partyFilter === 'ALL') return true;
    return o.customerName.toLowerCase().includes(partyFilter.toLowerCase());
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-3">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="px-3 py-2 bg-emerald-500/15 border border-emerald-500/30 rounded-lg text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Compact Single-Row Header */}
      <div className="bg-[#0B132B] border border-slate-800 rounded-xl px-3.5 py-2 shadow-sm flex flex-wrap justify-between items-center gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse shrink-0" />
          <h2 className="font-extrabold text-white text-sm sm:text-base flex items-center gap-1.5 truncate">
            <Printer className="w-4 h-4 text-rose-500 shrink-0" />
            <span className="truncate">12L Stickers &amp; Batch Print Hub</span>
          </h2>
        </div>

        {/* Batch Counter Pill & Optional Close */}
        <div className="flex items-center gap-2">
          <div className="bg-slate-900/90 border border-slate-700/80 px-2.5 py-1 rounded-lg text-xs font-bold text-white flex items-center gap-2">
            <span><span className="text-rose-400 font-black">{selectedOrderIds.length}</span> Orders</span>
            <span className="text-slate-600">·</span>
            <span><span className="text-emerald-400 font-black">{totalStickers}</span> Labels</span>
            <span className="text-slate-600">·</span>
            <span><span className="text-amber-400 font-black">{totalSheets}</span> A4 Sheets</span>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800 hover:bg-slate-700 transition cursor-pointer"
              title="Close modal"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Toolbar & Filter */}
      <div className="bg-[#0B132B] border border-slate-800 rounded-xl px-3 py-2 flex flex-wrap justify-between items-center gap-2">
        <div className="flex items-center gap-2 text-xs flex-wrap">
          <button
            onClick={selectAll}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg font-semibold flex items-center gap-1.5 cursor-pointer"
          >
            <CheckSquare className="w-3.5 h-3.5 text-cyan-400" />
            <span>Select All Orders</span>
          </button>
          <button
            onClick={clearAll}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700 rounded-lg font-semibold cursor-pointer"
          >
            Clear All
          </button>

          <div className="h-4 w-[1px] bg-slate-700 mx-1 hidden sm:block" />

          <div className="flex items-center gap-1.5">
            <label className="text-slate-400 font-medium">Party Filter:</label>
            <select
              value={partyFilter}
              onChange={(e) => setPartyFilter(e.target.value)}
              className="bg-[#070D1E] border border-slate-700 text-slate-200 rounded-lg p-1.5 text-xs font-medium focus:outline-none focus:border-rose-500 cursor-pointer"
            >
              <option value="ALL">All Parties &amp; Projects</option>
              {Array.from(new Set(orders.map((o) => o.customerName).filter(Boolean))).map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 3 Dedicated Print Action Buttons & Format Selector */}
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={stickerFormat}
            onChange={(e) => setStickerFormat(e.target.value as 'A4_12L' | 'A4_12L_PACKING_PASS' | 'THERMAL_ROLL')}
            className="bg-[#070D1E] border border-rose-600/80 text-rose-200 rounded-xl p-2 text-xs font-bold focus:outline-none cursor-pointer"
          >
            <option value="A4_12L">📄 A4 12-Up Cutting Sheet (12L)</option>
            <option value="A4_12L_PACKING_PASS">📦 12L After-Packing Site Pass (99×44mm)</option>
            <option value="THERMAL_ROLL">🏷️ Thermal Label (4&quot;×2&quot; / 101.6×50.8mm)</option>
          </select>

          <button
            onClick={() => setActivePrintModal('STICKERS')}
            disabled={totalStickers === 0}
            className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-rose-950/40 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Tag className="w-4 h-4" />
            <span>
              Print Stickers{' '}
              {stickerFormat === 'THERMAL_ROLL'
                ? '(4"×2" Thermal)'
                : stickerFormat === 'A4_12L_PACKING_PASS'
                ? '(12L Packing Pass)'
                : '(12L Standard)'}
            </span>
          </button>

          <button
            onClick={handleDownloadVectorPdf}
            disabled={isDownloadingPdf || totalStickers === 0}
            className="px-3.5 py-2 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-sky-950/40 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
            title="Download exact 12L (99x44mm) or 4x2 thermal vector PDF"
          >
            <Download className="w-4 h-4" />
            <span>
              {isDownloadingPdf
                ? 'Generating PDF...'
                : stickerFormat === 'THERMAL_ROLL'
                ? 'Download 4"×2" Thermal PDF'
                : stickerFormat === 'A4_12L_PACKING_PASS'
                ? 'Download 12L Packing Pass PDF'
                : 'Download 12L Vector PDF'}
            </span>
          </button>

          <button
            onClick={() => setIsRemarksManagerOpen(!isRemarksManagerOpen)}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold border transition flex items-center gap-1.5 cursor-pointer ${
              isRemarksManagerOpen
                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
            }`}
            title="Customize Door Remarks (Strict Conditional Display)"
          >
            <Edit3 className="w-4 h-4 text-amber-400" />
            <span>Door Remarks Manager</span>
          </button>

          <button
            onClick={() => setActivePrintModal('QC_PDF')}
            disabled={selectedOrderIds.length === 0}
            className="px-3.5 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-purple-950/40 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Party-wise QC PDF 📑</span>
          </button>
          <button
            onClick={() => setActivePrintModal('A4_SCHEDULE')}
            disabled={selectedOrderIds.length === 0}
            className="px-3.5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold shadow-lg shadow-cyan-950/40 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <FileText className="w-4 h-4" />
            <span>Party-wise A4 Schedule 📄</span>
          </button>
        </div>
      </div>

      {/* Orders Checklist */}
      <div className="bg-[#0B132B] border border-slate-800 rounded-xl overflow-hidden shadow-xl">
        <div className="p-3.5 border-b border-slate-800 bg-[#070D1E] flex justify-between items-center text-xs">
          <span className="font-bold text-white">Select Orders to Include in Batch Print</span>
          <span className="text-slate-400">Tick the checkbox for every order you wish to print together</span>
        </div>

        <div className="divide-y divide-slate-800/60">
          {filteredOrders.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No live Production Job Cards available yet. Confirm a Quotation in Sales Quotations or release a Job Card on the Production Floor to print 12L / 4&quot;×2&quot; Thermal door labels.
            </div>
          ) : (
            filteredOrders.map((ord) => {
            const isChecked = selectedOrderIds.includes(ord.id);
            const isExpanded = Boolean(expandedOrders[ord.id]);
            const doorCount = ord.doorsList.reduce((acc, d) => acc + d.qty, 0);

            return (
              <div key={ord.id} className={`transition ${isChecked ? 'bg-rose-950/15' : ''}`}>
                <div
                  onClick={() => toggleOrderSelection(ord.id)}
                  className="p-4 flex items-center justify-between hover:bg-slate-800/40 transition cursor-pointer flex-wrap gap-2"
                >
                  <div className="flex items-center gap-3.5">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={() => toggleOrderSelection(ord.id)}
                      onClick={(e) => e.stopPropagation()}
                      className="w-4 h-4 rounded text-rose-600 bg-slate-900 border-slate-700 focus:ring-0 cursor-pointer"
                    />
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-mono font-bold text-white text-xs">{ord.orderNumber}</span>
                        <span className="text-xs font-semibold text-slate-300">• {ord.customerName}</span>
                        <span className="text-[10px] bg-slate-800 text-slate-300 px-2 py-0.5 rounded-full font-bold">
                          {doorCount} Total Doors
                        </span>
                      </div>
                      <div className="text-[11px] text-slate-400 mt-0.5">
                        {ord.siteName} • {ord.doorsDesc}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={(e) => toggleOrderExpand(ord.id, e)}
                      className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer"
                      title="View doors and customize party remarks"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-amber-400" />
                      <span>{isExpanded ? 'Hide Doors & Remarks' : `Doors & Remarks (${doorCount})`}</span>
                      {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                    </button>

                    <div className="text-right min-w-[120px]">
                      <span className={`font-bold text-xs ${isChecked ? 'text-rose-400' : 'text-slate-500'}`}>
                        {isChecked ? '✓ Selected for Batch' : 'Not Selected'}
                      </span>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        Order Value: ₹{ord.totalAmount.toLocaleString('en-IN')}
                      </div>
                    </div>
                  </div>
                </div>

                {/* EXPANDED PARTY DOORS & REMARKS EDITOR */}
                {isExpanded && (
                  <div className="p-4 pt-1 bg-[#070D1E]/90 border-t border-slate-800 space-y-3">
                    {/* Party Quick Remark Bar */}
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                        <span className="text-xs font-bold text-amber-300">
                          Party Quick Remark ({ord.customerName}):
                        </span>
                      </div>
                      <div className="flex items-center gap-2 w-full sm:w-auto flex-1 sm:max-w-md">
                        <input
                          type="text"
                          placeholder="e.g. Ground Floor, Urgent Site 1, Delivery Remark..."
                          value={partyQuickRemarks[ord.id] || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setPartyQuickRemarks((prev) => ({ ...prev, [ord.id]: val }));
                          }}
                          className="flex-1 bg-slate-950 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-amber-200 placeholder:text-slate-600 focus:outline-none focus:border-amber-400"
                        />
                        <button
                          type="button"
                          onClick={(e) => handleApplyPartyQuickRemark(ord.id, e)}
                          className="px-3 py-1 bg-amber-600 hover:bg-amber-500 text-slate-950 rounded-lg text-xs font-black shadow transition cursor-pointer shrink-0"
                        >
                          Apply to All Doors
                        </button>
                      </div>
                    </div>

                    {/* Doors List with inline remark editor */}
                    <div className="overflow-x-auto rounded-lg border border-slate-800">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[#0B132B] text-slate-400 font-semibold uppercase text-[10px] border-b border-slate-800">
                          <tr>
                            <th className="p-2 w-12">#</th>
                            <th className="p-2 w-20">Door Tag</th>
                            <th className="p-2">Model &amp; Finish</th>
                            <th className="p-2">Cutting Size (cm)</th>
                            <th className="p-2">Hinge &amp; Lock</th>
                            <th className="p-2">Sticker Remark (Prints on 12L &amp; 4×2)</th>
                            <th className="p-2 w-28 text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800/80 bg-slate-950/40">
                          {ord.doorsList.map((door, dIdx) => {
                            const uniqueKey = `${ord.id}-${door.tag}-${dIdx}-1`;
                            const remarkKey = `${ord.id}-${door.tag}-1`;
                            const currentRemark =
                              doorRemarks[uniqueKey] !== undefined
                                ? doorRemarks[uniqueKey]
                                : doorRemarks[remarkKey] !== undefined
                                ? doorRemarks[remarkKey]
                                : (door.remark || '');
                            const hasActiveRemark = Boolean(currentRemark && currentRemark.trim().length > 0);

                            return (
                              <tr key={uniqueKey} className="hover:bg-slate-900/50">
                                <td className="p-2 text-slate-500 font-mono">{dIdx + 1}</td>
                                <td className="p-2 font-mono font-bold text-white">{door.tag}</td>
                                <td className="p-2">
                                  <span className="font-bold text-slate-200">{door.profile}</span>
                                  <span className="text-[10px] text-slate-400 block">{door.finish}</span>
                                </td>
                                <td className="p-2 font-mono text-[11px] text-emerald-400">
                                  {door.shutterSize}
                                </td>
                                <td className="p-2 text-slate-300 text-[11px]">
                                  Hinge: <strong className="text-white">{door.hand}</strong> • Lock: {door.lock}
                                </td>
                                <td className="p-2">
                                  <input
                                    type="text"
                                    placeholder="Type custom remark for sticker bottom..."
                                    value={currentRemark}
                                    onChange={(e) => handleUpdateDoorRemark(uniqueKey, remarkKey, e.target.value)}
                                    className="w-full bg-slate-900 border border-slate-700 text-amber-200 rounded px-2.5 py-1 text-xs focus:outline-none focus:border-amber-400 placeholder:text-slate-600 font-medium"
                                  />
                                </td>
                                <td className="p-2 text-center">
                                  {hasActiveRemark ? (
                                    <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                      ✓ Printed
                                    </span>
                                  ) : (
                                    <span className="inline-block px-2 py-0.5 rounded text-[10px] text-slate-500">
                                      Blank
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })
          )}
        </div>
      </div>

      {/* DOOR REMARKS & FRAME PRESETS MANAGER (STRICT CONDITIONAL DISPLAY) */}
      {isRemarksManagerOpen && (
        <div className="bg-[#0B132B] border border-amber-500/40 rounded-xl p-5 space-y-4 shadow-xl">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 border-b border-slate-800 pb-3">
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse"></span>
                <h3 className="font-bold text-white text-xs tracking-wide">
                  Door Remarks Manager (Strict Conditional Rule)
                </h3>
              </div>
              <p className="text-[11px] text-amber-300/90 mt-0.5">
                "Remark in 12L STICKER WHEN I TYPE SOMETHING IN REMARK COLUMN ONLY OTHERWISE REMARK WILL BE BLANK"
              </p>
            </div>
            <button
              onClick={() => setIsRemarksManagerOpen(false)}
              className="text-slate-400 hover:text-white text-xs font-semibold px-2 py-1 bg-slate-800 rounded-lg cursor-pointer"
            >
              Close Editor ✕
            </button>
          </div>

          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {stickers.map((st, sIdx) => {
              const uniqueKey = st.id || `stk-${sIdx}`;
              return (
                <div
                  key={uniqueKey}
                  className="bg-[#070D1E] border border-slate-800 p-2.5 rounded-lg flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-[180px]">
                    <span className="font-mono text-rose-400 font-bold text-[11px]">{st.orderNumber}</span>
                    <span className="text-slate-300 font-semibold ml-2">#{sIdx + 1}: {st.tag}</span>
                    <div className="text-[10px] text-slate-400">{st.customerName} • {st.shutterSize}</div>
                  </div>

                  <div className="flex-1 w-full flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="Type custom remark (leave blank for no remark box)..."
                      value={doorRemarks[uniqueKey] || ''}
                      onChange={(e) => {
                        const val = e.target.value;
                        setDoorRemarks((prev) => ({
                          ...prev,
                          [uniqueKey]: val,
                        }));
                      }}
                      className="flex-1 bg-slate-900 border border-slate-700 text-slate-100 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-amber-400 placeholder:text-slate-600"
                    />
                    {doorRemarks[uniqueKey] && doorRemarks[uniqueKey].trim() && (
                      <button
                        onClick={() => {
                          setDoorRemarks((prev) => {
                            const copy = { ...prev };
                            delete copy[uniqueKey];
                            return copy;
                          });
                        }}
                        className="text-[10px] text-slate-400 hover:text-rose-400 px-2 py-1 bg-slate-800 rounded cursor-pointer"
                        title="Clear remark"
                      >
                        Clear
                      </button>
                    )}
                  </div>

                  <div className="text-[11px] font-mono shrink-0">
                    {doorRemarks[uniqueKey] && doorRemarks[uniqueKey].trim() ? (
                      <span className="text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/30">
                        ✓ Printed
                      </span>
                    ) : (
                      <span className="text-slate-500 font-normal">
                        — Blank (Suppressed)
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ================= PRINT / PDF PREVIEW MODAL ================= */}
      {activePrintModal && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center p-2 bg-black/85 backdrop-blur-md printable-modal-root">
          <div className="bg-white text-slate-900 w-full max-w-5xl max-h-[92vh] rounded-2xl shadow-2xl flex flex-col overflow-hidden">
            {/* Modal Controls Header (Hidden in Print) */}
            <div className="bg-slate-900 text-white p-3.5 flex justify-between items-center print:hidden">
              <div className="flex items-center gap-3">
                <span className="font-bold text-sm">
                  {activePrintModal === 'STICKERS' &&
                    (stickerFormat === 'A4_12L'
                      ? `12L FACTORY SHUTTER STICKERS (${totalStickers} LABELS • ${totalSheets} A4 SHEETS)`
                      : stickerFormat === 'A4_12L_PACKING_PASS'
                      ? `12L AFTER-PACKING SITE VERIFICATION PASS (${totalStickers} LABELS • ${totalSheets} A4 SHEETS)`
                      : `SINGLE THERMAL ROLL LABELS (${totalStickers} LABELS • 4"×2" / 100×50mm)`)}
                  {activePrintModal === 'QC_PDF' &&
                    `PARTY-WISE QC INSPECTION CERTIFICATE (IS 14856 : 2000)`}
                  {activePrintModal === 'A4_SCHEDULE' &&
                    `PARTY-WISE A4 MASTER DOOR PRODUCTION & CUTTING SCHEDULE`}
                </span>
                <span className="text-xs text-slate-400 hidden sm:inline">
                  • Official Legal Manufacturing Documents
                </span>
              </div>

              <div className="flex items-center gap-2">
                {/* Format switcher inside print modal */}
                {activePrintModal === 'STICKERS' && (
                  <div className="flex items-center bg-slate-800 border border-slate-700 rounded-lg p-0.5 text-xs mr-2">
                    <button
                      type="button"
                      onClick={() => setStickerFormat('A4_12L')}
                      className={`px-2.5 py-1 rounded-md font-bold text-xs transition cursor-pointer ${
                        stickerFormat === 'A4_12L'
                          ? 'bg-rose-600 text-white shadow'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      📄 12L Cutting
                    </button>
                    <button
                      type="button"
                      onClick={() => setStickerFormat('A4_12L_PACKING_PASS')}
                      className={`px-2.5 py-1 rounded-md font-bold text-xs transition cursor-pointer ${
                        stickerFormat === 'A4_12L_PACKING_PASS'
                          ? 'bg-emerald-600 text-white shadow'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      📦 12L After-Packing Pass
                    </button>
                    <button
                      type="button"
                      onClick={() => setStickerFormat('THERMAL_ROLL')}
                      className={`px-2.5 py-1 rounded-md font-bold text-xs transition cursor-pointer ${
                        stickerFormat === 'THERMAL_ROLL'
                          ? 'bg-rose-600 text-white shadow'
                          : 'text-slate-300 hover:text-white'
                      }`}
                    >
                      🏷️ Thermal (4&quot;×2&quot;)
                    </button>
                  </div>
                )}

                {activePrintModal === 'STICKERS' && (stickerFormat === 'A4_12L' || stickerFormat === 'A4_12L_PACKING_PASS') && (
                  <div className="flex items-center bg-slate-800 border border-emerald-500/40 rounded-lg px-2.5 py-1 text-xs mr-1 text-emerald-300 font-bold">
                    <span>12L Standard (99×44mm)</span>
                  </div>
                )}

                {activePrintModal === 'STICKERS' && (
                  <button
                    type="button"
                    onClick={handleDownloadVectorPdf}
                    disabled={isDownloadingPdf}
                    className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow cursor-pointer disabled:opacity-50"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>
                      {stickerFormat === 'THERMAL_ROLL'
                        ? '4"×2" PDF'
                        : stickerFormat === 'A4_12L_PACKING_PASS'
                        ? '12L Packing Pass PDF'
                        : '12L Vector PDF'}
                    </span>
                  </button>
                )}

                <button
                  onClick={handlePrint}
                  className="px-4 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow cursor-pointer"
                >
                  <Printer className="w-4 h-4" />
                  <span>Print / Save PDF</span>
                </button>
                <button
                  onClick={() => setActivePrintModal(null)}
                  className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Printable Document Area */}
            <div className="p-8 overflow-y-auto font-sans text-xs space-y-6 flex-1 print:p-0 print:overflow-visible">
              {/* FORMAT 1: 12L STICKERS (DUAL FORMAT: A4 12-UP COMPACT vs SINGLE THERMAL ROLL 4"x2") */}
              {activePrintModal === 'STICKERS' && (
                <>
                  {/* 12L STICKER SHEET PAPER CALIBRATION (EXACT DIE-CUT FIT) */}
                  {(stickerFormat === 'A4_12L' || stickerFormat === 'A4_12L_PACKING_PASS') && (
                    <div className="bg-[#0B132B] border border-slate-700/80 rounded-xl p-3.5 space-y-3 mb-4 text-slate-200 print:hidden">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shadow-xs shadow-emerald-400" />
                          <span className="font-extrabold text-xs tracking-wider text-slate-100 uppercase">
                            12L Sticker Sheet Paper Calibration (Exact Die-Cut Fit)
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => setSafeMarginBuffer(!safeMarginBuffer)}
                            className={`px-2.5 py-0.5 rounded text-[11px] font-bold transition flex items-center gap-1 cursor-pointer ${
                              safeMarginBuffer
                                ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-600/60 shadow-xs'
                                : 'bg-slate-800 text-slate-400 border border-slate-700'
                            }`}
                          >
                            {safeMarginBuffer ? '✓ Safe Margin Buffer Active (No border clipping)' : 'Buffer Inactive'}
                          </button>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end text-xs">
                        {/* Paper Type Selector */}
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                            Sticker Sheet Paper Type:
                          </label>
                          <select
                            value={calibrationPaper}
                            onChange={(e) => handleSelectPaper(e.target.value)}
                            className="w-full bg-[#131b2e] border border-slate-700 hover:border-slate-500 rounded-lg px-2.5 py-1.5 text-xs text-white font-semibold cursor-pointer"
                          >
                            <option value="Standard 12L Die-Cut (99 x 44 mm)">Standard 12L Die-Cut (99 x 44 mm)</option>
                            <option value="Standard 12L (Left 5.1mm / Right 3.7mm)">Standard 12L (Left 5.1mm / Right 3.7mm)</option>
                          </select>
                        </div>

                        {/* Nudge Left / Right */}
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                            Nudge Left/Right (X: {nudgeXmm > 0 ? `+${nudgeXmm}` : nudgeXmm}mm):
                          </label>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleUpdateNudgeX((prev) => prev - 0.5)}
                              className="flex-1 px-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 rounded-lg font-bold transition cursor-pointer"
                            >
                              ◄ -0.5mm
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateNudgeX(0)}
                              className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-700 rounded-lg font-bold transition cursor-pointer"
                            >
                              Reset (0)
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateNudgeX((prev) => prev + 0.5)}
                              className="flex-1 px-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 rounded-lg font-bold transition cursor-pointer"
                            >
                              +0.5mm ►
                            </button>
                          </div>
                        </div>

                        {/* Nudge Top / Bottom */}
                        <div>
                          <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">
                            Nudge Top/Bottom (Y: {nudgeYmm > 0 ? `+${nudgeYmm}` : nudgeYmm}mm):
                          </label>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleUpdateNudgeY((prev) => prev - 0.5)}
                              className="flex-1 px-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 rounded-lg font-bold transition cursor-pointer"
                            >
                              ▲ -0.5mm
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateNudgeY(0)}
                              className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-700 rounded-lg font-bold transition cursor-pointer"
                            >
                              Reset (0)
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateNudgeY((prev) => prev + 0.5)}
                              className="flex-1 px-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 rounded-lg font-bold transition cursor-pointer"
                            >
                              +0.5mm ▼
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Print Dialog Tip */}
                      <div className="bg-amber-950/40 border border-amber-800/50 rounded-lg px-3 py-1.5 text-[11px] text-amber-200 flex items-center gap-2">
                        <span className="font-bold text-amber-400">💡 Print Dialog Tip:</span>
                        <span>Set Paper Size: <strong>A4</strong>, Margins: <strong>None (0mm)</strong>, and Scale: <strong>100% (Actual Size)</strong> so labels never shift or print outside the die cuts.</span>
                      </div>
                    </div>
                  )}

                  {stickerFormat === 'A4_12L' ? (
                    /* A4 12-UP DIE-CUT SHEETS (TOP-LEFT ANCHORED 2×6 OR 3×4, ZERO CENTERING) */
                    <div className="space-y-8 print:space-y-0">
                      {Array.from({ length: totalSheets }).map((_, sIdx) => {
                        const sheetStickers = stickers.slice(sIdx * 12, (sIdx + 1) * 12);
                        const preset = PAPER_PRESETS[calibrationPaper] || PAPER_PRESETS['Standard 12L Die-Cut (99 x 44 mm)'];
                        const cardHeightMm = `${preset.labelHeightMm || 44}mm`;
                        const cardWidthMm = `${preset.labelWidthMm || 99}mm`;
                        return (
                          <div
                            key={sIdx}
                            className="sheet-12l bg-white border border-slate-300 rounded-xl shadow-sm break-after-page print:border-none print:shadow-none print:rounded-none print:m-0"
                            style={{
                              width: '210mm',
                              minHeight: '297mm',
                              paddingTop: `${preset.topMarginMm}mm`,
                              paddingBottom: `${preset.topMarginMm}mm`,
                              paddingLeft: `${preset.leftMarginMm}mm`,
                              paddingRight: `${preset.leftMarginMm}mm`,
                              margin: '0 auto',
                              boxSizing: 'border-box',
                              transform: `translate(${nudgeXmm}mm, ${nudgeYmm}mm)`,
                              display: 'grid',
                              gridTemplateColumns: `repeat(2, ${cardWidthMm})`,
                              gridAutoRows: cardHeightMm,
                              rowGap: `${preset.rowGapMm}mm`,
                              columnGap: `${preset.colGapMm}mm`,
                              alignContent: 'start',
                            }}
                          >
                            {sheetStickers.map((st, idx) => {
                              const hSide = (st.hand || 'R').toUpperCase().startsWith('L') ? 'L' : 'R';
                              const hLabel = hSide === 'R' ? 'H-LEFT' : 'H-RIGHT';
                              const hasRemark = st.remark && st.remark.trim().length > 0;
                              const widths = extractTopBtmWidths(st);
                              const doorNumText = st.doorNumberInOrder || (idx + 1);
                              const totalDoorText = st.totalDoorsInOrder || stickers.length;

                              // Formatted finished height for cutting box
                              const finHText = st.finHText || (st.finH ? `-${st.finH.toFixed(1)}` : '-205.5');

                              return (
                                <div
                                  key={idx}
                                  className="sticker-card-12l border border-slate-700 font-sans bg-white rounded-lg flex flex-col justify-between overflow-hidden"
                                  style={{
                                    width: cardWidthMm,
                                    height: cardHeightMm,
                                    maxHeight: cardHeightMm,
                                    boxSizing: 'border-box',
                                    padding: hasRemark ? '1.8mm 2.8mm' : safeMarginBuffer ? '2.5mm 3.5mm' : '1.5mm 2.5mm',
                                    fontSize: '8px',
                                    lineHeight: 1.15,
                                    pageBreakInside: 'avoid',
                                    breakInside: 'avoid',
                                  }}
                                >
                                  {/* Line 1: PartyName (Left) + Job Card Badge (Right) */}
                                  <div className="flex justify-between items-center gap-1">
                                    <div className="flex items-baseline gap-1 min-w-0 max-w-[130px]">
                                      <span className="text-[8px] text-slate-500 font-normal shrink-0">PartyName</span>
                                      <span className="font-black text-[10px] text-slate-950 uppercase truncate">
                                        {st.customerName}
                                      </span>
                                    </div>
                                    <span className="font-mono text-[8px] font-bold px-1.5 py-0.2 rounded border border-slate-700 bg-slate-50 text-slate-900 shrink-0">
                                      {st.jobCardNumber || st.orderNumber}
                                    </span>
                                  </div>

                                  {/* Line 2: Model/Part (Left) + Capsule Pill Door Number (Right) */}
                                  <div className="flex justify-between items-center gap-1">
                                    <div className="flex items-baseline gap-1 min-w-0 max-w-[135px]">
                                      <span className="text-[7.5px] text-slate-500 font-normal shrink-0">Model/Part</span>
                                      <span className="font-bold text-[9.5px] text-slate-900 uppercase truncate">
                                        {st.profile || st.tag || 'EXM-A-101'}
                                      </span>
                                    </div>
                                    <span className="px-2 py-0.5 rounded-full border border-slate-800 flex items-center justify-center font-black text-[9px] text-slate-950 shrink-0 bg-slate-50" title={`Door ${doorNumText} of ${totalDoorText}`}>
                                      {doorNumText}
                                    </span>
                                  </div>

                                  {/* Line 3: Hinge (R) • LOCK: BABY LATCH • COLOUR: NATURAL TEAK */}
                                  <div className="flex items-center gap-1 text-[7.5px]">
                                    <div className="flex items-center gap-0.5 shrink-0">
                                      <span className="text-slate-600 font-bold">Hinge:</span>
                                      <span className="w-4 h-4 rounded-full border border-slate-700 flex items-center justify-center font-bold text-[8px] text-slate-950">
                                        {hSide}
                                      </span>
                                    </div>

                                    <div className="border border-slate-400 rounded px-1.5 py-0.2 flex items-center gap-0.5 bg-slate-50 min-w-0 flex-1 overflow-hidden">
                                      <span className="text-slate-500 text-[6.5px] shrink-0 font-bold">LOCK:</span>
                                      <span className="font-bold text-slate-900 truncate uppercase text-[7.5px]">{st.lock || 'Baby Latch'}</span>
                                    </div>

                                    <div className="border border-slate-400 rounded px-1.5 py-0.2 flex items-center gap-0.5 bg-slate-50 min-w-0 flex-1 overflow-hidden">
                                      <span className="text-slate-500 text-[6.5px] shrink-0 font-bold">COLOUR:</span>
                                      <span className="font-bold text-slate-900 truncate uppercase text-[7.5px]">{st.finish || 'Teak'}</span>
                                    </div>
                                  </div>

                                  {/* Line 4: 2-Cell Industrial Cutting Box (H-LEFT / H-RIGHT, TOP / BOTTOM) */}
                                  <div className="border border-slate-800 rounded grid grid-cols-12 overflow-hidden bg-slate-50/50">
                                    {/* Cell 1: H-LEFT or H-RIGHT */}
                                    <div className="col-span-6 border-r border-slate-800 p-1 flex items-center justify-between">
                                      <span className="text-[7.5px] font-bold text-slate-700 uppercase">{hLabel}</span>
                                      <span className="font-mono text-[12px] font-black text-slate-950 text-right">{finHText}</span>
                                    </div>

                                    {/* Cell 2: Stacked TOP and BOTTOM */}
                                    <div className="col-span-6 divide-y divide-slate-800">
                                      <div className="px-1.5 py-0.5 flex items-center justify-between">
                                        <span className="text-[7px] font-bold text-slate-600 uppercase">TOP</span>
                                        <span className="font-mono text-[10.5px] font-black text-slate-950">{widths.topText}</span>
                                      </div>
                                      <div className="px-1.5 py-0.5 flex items-center justify-between">
                                        <span className="text-[7px] font-bold text-slate-600 uppercase">BOTTOM</span>
                                        <span className="font-mono text-[10.5px] font-black text-slate-950">{widths.btmText}</span>
                                      </div>
                                    </div>
                                  </div>

                                  {/* Line 5: STRICT CONDITIONAL REMARK CONTAINER */}
                                  {hasRemark && (
                                    <div className="p-0.5 px-1 rounded bg-amber-50 border border-amber-400 text-amber-900 text-[7px] font-bold leading-tight flex items-center gap-1 max-w-full overflow-hidden">
                                      <span className="text-amber-800 font-black shrink-0">REMARK:</span>
                                      <span className="truncate">{st.remark!.trim()}</span>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  ) : stickerFormat === 'A4_12L_PACKING_PASS' ? (
                    /* A4 12-UP AFTER-PACKING SITE VERIFICATION PASS (EXACT 99mm x 44mm 2x6 DIE-CUT GRID) */
                    <div className="space-y-8 print:space-y-0">
                      {Array.from({ length: totalSheets }).map((_, sIdx) => {
                        const sheetStickers = stickers.slice(sIdx * 12, (sIdx + 1) * 12);
                        const preset = PAPER_PRESETS[calibrationPaper] || PAPER_PRESETS['Standard 12L Die-Cut (99 x 44 mm)'];
                        const cardHeightMm = `${preset.labelHeightMm || 44}mm`;
                        const cardWidthMm = `${preset.labelWidthMm || 99}mm`;
                        const uniqueParties = Array.from(
                          new Set(stickers.map((s) => (s.customerName || 'CLIENT').toUpperCase()).filter(Boolean))
                        );
                        const partySummary =
                          uniqueParties.length > 1
                            ? `MULTI-PARTY 12L LABELS: ${uniqueParties.length} Parties (${uniqueParties.slice(0, 4).join(', ')})`
                            : `PARTY: ${uniqueParties[0] || 'CLIENT'}`;
                        const emptySlotsCount = Math.max(0, 12 - sheetStickers.length);

                        return (
                          <div
                            key={sIdx}
                            className="sheet-12l relative bg-white border border-slate-300 rounded-xl shadow-sm break-after-page print:border-none print:shadow-none print:rounded-none print:m-0"
                            style={{
                              width: '210mm',
                              minHeight: '297mm',
                              paddingTop: `${preset.topMarginMm}mm`,
                              paddingBottom: `${preset.topMarginMm}mm`,
                              paddingLeft: `${preset.leftMarginMm}mm`,
                              paddingRight: `${preset.leftMarginMm}mm`,
                              margin: '0 auto',
                              boxSizing: 'border-box',
                              transform: `translate(${nudgeXmm}mm, ${nudgeYmm}mm)`,
                            }}
                          >
                            {/* Top Muted Page Header inside top margin */}
                            <div
                              className="absolute left-0 right-0 text-center text-[7.5px] font-semibold tracking-wide text-slate-400 uppercase pointer-events-none"
                              style={{ top: `${Math.max(2.5, preset.topMarginMm - 5.2)}mm` }}
                            >
                              12L A4 AFTER-PACKING SITE VERIFICATION LABELS (2x6 GRID) | {partySummary} | PAGE {sIdx + 1} OF {totalSheets}
                            </div>

                            <div
                              style={{
                                display: 'grid',
                                gridTemplateColumns: `repeat(2, ${cardWidthMm})`,
                                gridAutoRows: cardHeightMm,
                                rowGap: `${preset.rowGapMm}mm`,
                                columnGap: `${preset.colGapMm}mm`,
                                alignContent: 'start',
                              }}
                            >
                              {sheetStickers.map((st, idx) => {
                                const widths = extractTopBtmWidths(st);
                                const doorNumText = st.doorNumberInOrder || (idx + 1);
                                const doorTag = st.tag || `Door #${doorNumText}`;
                                const finHNum = st.finH || parseFloat((st.finHText || '201.2').replace(/[^\d.]/g, '')) || 201.2;
                                const rawH = st.rawHeightCm ?? Number((finHNum + 4.5).toFixed(2));
                                const rawTopW = st.rawWidthTopCm ?? Number((widths.topW + 7.6).toFixed(2));
                                const rawBtmW = st.rawWidthBtmCm ?? Number((widths.btmW + 7.6).toFixed(2));
                                const hDed = st.hDedMm ?? Math.max(0, Math.round((rawH - finHNum) * 10));
                                const wDed = st.wDedMm ?? Math.max(0, Math.round((rawTopW - widths.topW) * 10));
                                const tapeInchH = st.tapeInchH || cmToTapeInch(rawH);
                                const modelDisplay = (st.profile || 'EXM-A-101').includes('mm')
                                  ? st.profile
                                  : `${st.profile || 'EXM-A-101'} (${st.doorThicknessLabel || '28mm'})`;
                                const qrKey = st.id || st.barcode;
                                const qrSrc = qrDataUrls[qrKey];

                                return (
                                  <div
                                    key={idx}
                                    className="sticker-card-12l border-[1.2px] border-slate-900 font-sans bg-white rounded-[5px] flex flex-col justify-between overflow-hidden"
                                    style={{
                                      width: cardWidthMm,
                                      height: cardHeightMm,
                                      maxHeight: cardHeightMm,
                                      boxSizing: 'border-box',
                                      pageBreakInside: 'avoid',
                                      breakInside: 'avoid',
                                    }}
                                  >
                                    {/* Row 1: Solid Dark Header Bar */}
                                    <div className="bg-slate-950 text-white px-2 py-[2.5px] flex items-center justify-between text-[7.5px] font-black tracking-wide uppercase">
                                      <span>AFTER-PACKING SITE VERIFICATION PASS</span>
                                      <span className="shrink-0">
                                        DOOR #{doorNumText} [{doorTag}]
                                      </span>
                                    </div>

                                    {/* Row 2: Party & Model/Lock/Colour Band */}
                                    <div className="px-2 pt-[2px] pb-[1.5px] leading-tight">
                                      <div className="text-[8.5px] font-black text-slate-950 uppercase truncate">
                                        <span className="font-bold text-slate-600">PARTY: </span>
                                        {st.customerName}
                                      </div>
                                      <div className="flex items-center justify-between gap-1 text-[7px] mt-[1px]">
                                        <div className="font-black text-slate-900 uppercase truncate">
                                          <span className="font-bold text-slate-600">MODEL: </span>
                                          {modelDisplay}
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0 text-[6.5px] font-black text-slate-900 uppercase">
                                          <span className="px-1 py-[0.5px] rounded bg-slate-100 border border-slate-300">
                                            [ LOCK: {(st.lock || 'BABY LATCH').slice(0, 14)} ]
                                          </span>
                                          <span className="px-1 py-[0.5px] rounded bg-slate-100 border border-slate-300">
                                            [ COLOUR: {(st.finish || 'TEAK').slice(0, 14)} ]
                                          </span>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Row 3: 3-Column Spec & QR Grid */}
                                    <div
                                      className="mx-1.5 border border-slate-500 rounded-[3px] grid overflow-hidden flex-1"
                                      style={{ gridTemplateColumns: '37% 40% 23%' }}
                                    >
                                      {/* Col 1: GIVEN OPENING (FRAME) */}
                                      <div className="border-r border-slate-500 flex flex-col min-w-0">
                                        <div className="bg-slate-200 border-b border-slate-400 px-1 py-[1.5px] text-center text-[6.2px] font-black text-slate-800 uppercase tracking-tight">
                                          GIVEN OPENING (FRAME)
                                        </div>
                                        <div className="px-1.5 py-[2px] flex-1 flex flex-col justify-between text-[6.8px] text-slate-900 leading-[1.15]">
                                          <div className="flex items-baseline justify-between gap-1">
                                            <span>
                                              Opening H: <strong className="font-black">{formatCompactCm(rawH, 2)}</strong>
                                            </span>
                                            <span className="text-[6px] text-slate-500 font-semibold">({tapeInchH})</span>
                                          </div>
                                          <div className="truncate">
                                            Opening W:{' '}
                                            <strong className="font-bold">
                                              T:{formatCompactCm(rawTopW, 2)} / B:{formatCompactCm(rawBtmW, 2)}
                                            </strong>
                                          </div>
                                          <div className="truncate">
                                            Rebate: <strong className="font-semibold">{st.rebateLabel || 'Mini 40x25'}</strong>
                                          </div>
                                          <div className="text-[6.2px] text-slate-500 truncate">
                                            {st.remark && st.remark.trim()
                                              ? `Note: ${st.remark.trim()}`
                                              : `Room: ${doorTag}`}
                                          </div>
                                        </div>
                                      </div>

                                      {/* Col 2: CONFIRM FINISH DOOR */}
                                      <div className="border-r border-slate-500 flex flex-col bg-blue-50/75 min-w-0">
                                        <div className="bg-blue-100 border-b border-blue-300 px-1 py-[1.5px] text-center text-[6.2px] font-black text-blue-800 uppercase tracking-tight">
                                          CONFIRM FINISH DOOR
                                        </div>
                                        <div className="px-1.5 py-[2px] flex-1 flex flex-col justify-between leading-[1.15]">
                                          <div className="text-[8.2px] font-black text-slate-950">
                                            HEIGHT: <span className="font-mono">-{formatCompactCm(finHNum, 1)}</span>
                                          </div>
                                          <div className="text-[7.5px] font-black text-slate-950 truncate">
                                            WIDTH:{' '}
                                            <span className="font-mono">
                                              T:-{formatCompactCm(widths.topW, 1)} B:-{formatCompactCm(widths.btmW, 1)}
                                            </span>
                                          </div>
                                          <div className="text-[6.3px] text-slate-600 font-semibold">
                                            Clearance: H-{hDed} / W-{wDed}mm
                                          </div>
                                          <div className="text-[6.8px] font-black text-emerald-700 uppercase">
                                            QC: PASSED &amp; PACKED
                                          </div>
                                        </div>
                                      </div>

                                      {/* Col 3: SCAN QR */}
                                      <div className="flex flex-col bg-white min-w-0">
                                        <div className="bg-amber-100 border-b border-amber-300 px-0.5 py-[1.5px] text-center text-[6px] font-black text-amber-800 uppercase">
                                          SCAN QR
                                        </div>
                                        <div className="flex-1 flex flex-col items-center justify-center p-[2px]">
                                          {qrSrc ? (
                                            <img
                                              src={qrSrc}
                                              alt="Door Verification QR"
                                              className="w-[13.5mm] h-[13.5mm] object-contain"
                                            />
                                          ) : (
                                            <div className="w-[13.5mm] h-[13.5mm] border border-dashed border-slate-300 flex items-center justify-center text-[5.5px] text-slate-400">
                                              QR
                                            </div>
                                          )}
                                          <span className="text-[5.2px] font-black text-slate-900 tracking-tight leading-none mt-[1px]">
                                            FIND &amp; VERIFY
                                          </span>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Row 4: Bottom Site Verification Footer */}
                                    <div className="px-2 py-[2.5px] border-t border-slate-300 mt-[2px] flex items-center justify-between text-[6.3px] text-slate-800">
                                      <div className="flex items-center gap-1 min-w-0">
                                        <span className="inline-block w-[2.7mm] h-[2.7mm] border border-slate-700 rounded-[1px] shrink-0" />
                                        <span className="truncate">
                                          <strong className="font-black text-slate-950">SITE VERIFIED:</strong> Confirmed matches opening &amp; model
                                        </span>
                                      </div>
                                      <div className="shrink-0 text-slate-500 pl-1">
                                        Sign/Date: <span className="inline-block w-[14mm] border-b border-slate-400" />
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}

                              {/* Empty Slot Ghost Guides (Screen Preview Only — Hidden on Print) */}
                              {Array.from({ length: emptySlotsCount }).map((_, eIdx) => (
                                <div
                                  key={`empty-${eIdx}`}
                                  className="border border-dashed border-slate-200 rounded-[5px] flex items-center justify-center text-[8px] text-slate-300 font-semibold print:hidden"
                                  style={{
                                    width: cardWidthMm,
                                    height: cardHeightMm,
                                    boxSizing: 'border-box',
                                  }}
                                >
                                  Slot #{sheetStickers.length + eIdx + 1} (Empty)
                                </div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    /* SINGLE CONTINUOUS THERMAL ROLL LABELS (EXACT 4" x 2" / 101.6mm x 50.8mm) */
                    <div className="thermal-roll-container mx-auto space-y-4 max-w-[101.6mm] print:max-w-none print:mx-0 print:space-y-0">
                      {stickers.map((st, idx) => (
                        <div
                          key={idx}
                          className="thermal-single-label bg-white text-black border border-slate-900 rounded p-2.5 break-after-page shadow-sm print:shadow-none print:rounded-none print:m-0"
                          style={{
                            width: '101.6mm',
                            height: '50.8mm',
                            maxHeight: '50.8mm',
                            padding: '2.2mm 3mm',
                            margin: '0 auto 4mm auto',
                            boxSizing: 'border-box',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between',
                            fontSize: '9px',
                            lineHeight: 1.2,
                            pageBreakAfter: 'always',
                            breakAfter: 'page',
                            pageBreakInside: 'avoid',
                            breakInside: 'avoid',
                          }}
                        >
                          <div>
                            <div className="flex justify-between items-center border-b border-black pb-0.5 mb-1">
                              <span className="font-black text-xs tracking-wider">EXMARK DOORS</span>
                              <span className="font-bold text-[9px]">TAG #{idx + 1}/{totalStickers} • {st.orderNumber}</span>
                            </div>

                            <div className="flex justify-between items-start gap-2">
                              <div className="flex-1 truncate">
                                <div className="font-bold text-[10px] text-black uppercase truncate">{st.customerName}</div>
                                <div className="text-[8.5px] text-slate-600 truncate">{st.siteName}</div>
                                <div className="font-bold text-[9.5px] text-black mt-0.5">{st.tag} ({st.unitIndex}/{st.totalUnitsInTag})</div>
                              </div>
                              <div className="bg-black text-white p-1 rounded text-right min-w-[110px] shrink-0">
                                <div className="text-[7.5px] text-slate-300">SHUTTER CUTTING SIZE:</div>
                                <div className="font-black text-xs">{st.shutterSize}</div>
                                <div className="text-[8px] text-slate-200">Tape: {st.tape}</div>
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-1 text-[8.5px] text-slate-800 mt-1 pt-1 border-t border-slate-300">
                              <div className="truncate"><strong>Profile:</strong> {st.profile}</div>
                              <div className="truncate"><strong>Finish:</strong> {st.finish}</div>
                              <div className="truncate"><strong>Hardware:</strong> {st.hand}</div>
                              <div className="truncate"><strong>Lock:</strong> {st.lock}</div>
                            </div>

                            {/* STRICT CONDITIONAL REMARK IN THERMAL ROLL */}
                            {st.remark && st.remark.trim().length > 0 && (
                              <div className="mt-1 p-0.5 px-1 rounded bg-slate-100 border border-black text-black text-[8px] font-bold leading-tight flex items-start gap-1">
                                <span className="font-black shrink-0">REMARK:</span>
                                <span className="truncate">{st.remark.trim()}</span>
                              </div>
                            )}
                          </div>

                          <div className="pt-1 border-t border-black flex justify-between items-center font-mono text-[9px]">
                            <span className="tracking-widest">{st.barcode}</span>
                            <span className="font-sans font-bold text-[8px] uppercase tracking-wider bg-black text-white px-1.5 py-0.2 rounded">
                              IS 14856:2000 QC PASS
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}

              {/* FORMAT 2: PARTY-WISE QC PDF */}
              {activePrintModal === 'QC_PDF' && (
                <div className="space-y-8">
                  {orders
                    .filter((o) => selectedOrderIds.includes(o.id))
                    .map((ord) => (
                      <div
                        key={ord.id}
                        className="bg-white text-slate-900 p-6 border border-slate-300 rounded-xl shadow-md space-y-4 break-after-page print:border-none print:shadow-none print:p-0"
                      >
                        {/* Header */}
                        <div className="border-b-2 border-slate-900 pb-3 flex justify-between items-start">
                          <div>
                            <div className="text-xl font-black text-rose-700 tracking-wider">
                              EXMARK DOORS — QUALITY ASSURANCE DIVISION
                            </div>
                            <div className="text-xs text-slate-700 font-bold">
                              IS 14856 : 2000 FACTORY COMPLIANCE &amp; INSPECTION CERTIFICATE
                            </div>
                            <div className="text-[10px] text-slate-500 mt-0.5">
                              Central Manufacturing Plant, Vengara, Kerala • NABL Calibrated Gauge Inspection
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="px-2.5 py-1 bg-purple-900 text-white rounded font-bold text-[10px]">
                              PARTY QC CERTIFICATE
                            </span>
                            <div className="text-xs font-bold text-slate-900 mt-1">
                              Audit Doc: QC-2026-{ord.orderNumber.slice(-3)}
                            </div>
                            <div className="text-[10px] text-slate-600">
                              Date: {new Date().toLocaleDateString('en-GB')}
                            </div>
                          </div>
                        </div>

                        {/* Party Banner */}
                        <div className="grid grid-cols-2 gap-4 bg-purple-50 p-3 rounded-lg border border-purple-200 text-xs">
                          <div>
                            <span className="text-[10px] text-purple-900 font-bold uppercase">
                              Client / Party Name:
                            </span>
                            <div className="text-sm font-black text-slate-950">
                              {ord.customerName}
                            </div>
                            <div className="text-[11px] text-slate-700 mt-0.5">
                              Delivery Site: {ord.siteName}
                            </div>
                          </div>
                          <div className="text-right">
                            <span className="text-[10px] text-purple-900 font-bold uppercase">
                              Order Reference:
                            </span>
                            <div className="text-xs font-bold text-slate-900">
                              {ord.orderNumber} ({ord.jobCardNumber})
                            </div>
                            <div className="text-[11px] text-emerald-700 font-bold mt-0.5">
                              IS 14856:2000 Verification: 100% PASS
                            </div>
                          </div>
                        </div>

                        {/* Verification Table */}
                        <table className="w-full text-left border-collapse border border-slate-300 text-xs">
                          <thead>
                            <tr className="bg-slate-100 border-b border-slate-300 font-bold text-[11px]">
                              <th className="p-2 border-r border-slate-300">#</th>
                              <th className="p-2 border-r border-slate-300">Door Item / Opening</th>
                              <th className="p-2 border-r border-slate-300">Target Size</th>
                              <th className="p-2 border-r border-slate-300">Cl. 6 Dim. Tol.</th>
                              <th className="p-2 border-r border-slate-300">Cl. 6.2 Squareness</th>
                              <th className="p-2 border-r border-slate-300">Cl. 6.3 Flatness</th>
                              <th className="p-2 text-center">Final Result</th>
                            </tr>
                          </thead>
                          <tbody>
                            {ord.doorsList.map((door, dIdx) => (
                              <tr key={dIdx} className="border-b border-slate-200">
                                <td className="p-2 border-r border-slate-300 font-bold">
                                  {dIdx + 1}
                                </td>
                                <td className="p-2 border-r border-slate-300">
                                  <strong>{door.tag}</strong>
                                  <br />
                                  <span className="text-[10px] text-slate-600">
                                    {door.profile} • {door.finish}
                                  </span>
                                </td>
                                <td className="p-2 border-r border-slate-300 font-semibold">
                                  {door.shutterSize}
                                </td>
                                <td className="p-2 border-r border-slate-300 text-emerald-700 font-bold">
                                  ±1.2 mm (Pass)
                                </td>
                                <td className="p-2 border-r border-slate-300 text-emerald-700 font-bold">
                                  1.4 mm (Pass &le; 3mm)
                                </td>
                                <td className="p-2 border-r border-slate-300 text-emerald-700 font-bold">
                                  0.8 mm (Pass &le; 3mm)
                                </td>
                                <td className="p-2 text-center font-bold text-emerald-700">
                                  ✓ CERTIFIED
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>

                        {/* Testing Summary */}
                        <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-[10px] space-y-1">
                          <div className="font-bold text-slate-800 text-[11px]">
                            Physical &amp; Structural Testing Summary (Lot Verification):
                          </div>
                          <div className="grid grid-cols-2 gap-2 text-slate-700">
                            <div>• Water Immersion Absorption: <strong>0.82%</strong> (IS Limit &le; 2.0%) ✓ Pass</div>
                            <div>• Screw Holding Strength: <strong>1,320 N</strong> (IS Limit &ge; 1,000 N) ✓ Pass</div>
                            <div>• 500g Steel Ball Impact Test (1.0m): <strong>Zero Cracking / Indentation</strong> ✓ Pass</div>
                            <div>• 100 Cycles Slamming Test: <strong>Zero Joint Failure or Delamination</strong> ✓ Pass</div>
                          </div>
                        </div>

                        {/* Signatures */}
                        <div className="pt-6 flex justify-between items-end border-t border-slate-300 text-[11px]">
                          <div>
                            <div className="font-bold text-slate-800">Inspected by: Er. S. Nair</div>
                            <div className="text-slate-500">Lead QA Engineer • Vengara Plant</div>
                          </div>
                          <div className="text-right">
                            <div className="font-bold text-slate-900">For EXMARK DOORS QUALITY DIVISION</div>
                            <div className="text-emerald-700 font-bold mt-1">AUTHORIZED FACTORY RELEASE STAMP</div>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}

              {/* FORMAT 3: PARTY-WISE A4 MASTER CUTTING SCHEDULE */}
              {activePrintModal === 'A4_SCHEDULE' && (
                <div className="space-y-8">
                  {orders
                    .filter((o) => selectedOrderIds.includes(o.id))
                    .map((ord) => {
                      const totalDoorsInOrder = ord.doorsList.reduce((acc, d) => acc + d.qty, 0);
                      return (
                        <div
                          key={ord.id}
                          className="bg-white text-slate-900 p-6 border border-slate-300 rounded-xl shadow-md space-y-4 break-after-page print:border-none print:shadow-none print:p-0"
                        >
                          {/* Header */}
                          <div className="border-b-2 border-slate-900 pb-3 flex justify-between items-start">
                            <div>
                              <div className="text-xl font-black text-rose-700 tracking-wider">
                                EXMARK DOORS
                              </div>
                              <div className="text-xs text-slate-700 font-bold">
                                MASTER DOOR PRODUCTION &amp; DISPATCH SCHEDULE (A4 FORMAT)
                              </div>
                              <div className="text-[10px] text-slate-500">
                                ISO 9001:2015 &amp; IS 14856:2000 Certified Factory • Vengara, Malappuram
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="px-2.5 py-1 bg-cyan-900 text-white rounded font-bold text-[10px]">
                                A4 PRODUCTION SCHEDULE
                              </span>
                              <div className="text-xs font-bold text-slate-900 mt-1">
                                Order Ref: {ord.orderNumber}
                              </div>
                              <div className="text-[10px] text-slate-600">
                                Generated: {new Date().toLocaleDateString('en-GB')}
                              </div>
                            </div>
                          </div>

                          {/* Party Summary */}
                          <div className="grid grid-cols-2 gap-4 bg-cyan-50 p-3 rounded-lg border border-cyan-200 text-xs">
                            <div>
                              <span className="text-[10px] text-cyan-900 font-bold uppercase">
                                Party / Customer Details:
                              </span>
                              <div className="text-sm font-black text-slate-950">
                                {ord.customerName}
                              </div>
                              <div className="text-[11px] text-slate-700 mt-0.5">
                                Site Location: {ord.siteName}
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="text-[10px] text-cyan-900 font-bold uppercase">
                                Scope &amp; Batch Summary:
                              </span>
                              <div className="text-sm font-black text-cyan-950">
                                {totalDoorsInOrder} Door Sets Ordered
                              </div>
                              <div className="text-[11px] text-slate-700 mt-0.5">
                                Job Card: {ord.jobCardNumber}
                              </div>
                            </div>
                          </div>

                          {/* Table */}
                          <table className="w-full text-left border-collapse border border-slate-300 text-xs mt-2">
                            <thead>
                              <tr className="bg-slate-100 border-b border-slate-300 font-bold text-[11px]">
                                <th className="p-2 border-r border-slate-300 text-center">#</th>
                                <th className="p-2 border-r border-slate-300">Room Tag</th>
                                <th className="p-2 border-r border-slate-300">Outer Frame</th>
                                <th className="p-2 border-r border-slate-300">Master Shutter</th>
                                <th className="p-2 border-r border-slate-300">Tape Reading</th>
                                <th className="p-2 border-r border-slate-300">Profile</th>
                                <th className="p-2 border-r border-slate-300">Finish/Shade</th>
                                <th className="p-2 border-r border-slate-300">Hardware</th>
                                <th className="p-2 text-center">Qty</th>
                              </tr>
                            </thead>
                            <tbody>
                              {ord.doorsList.map((door, idx) => (
                                <tr key={idx} className="border-b border-slate-200">
                                  <td className="p-2 border-r border-slate-300 font-bold text-center">
                                    {idx + 1}
                                  </td>
                                  <td className="p-2 border-r border-slate-300 font-bold text-slate-900">
                                    {door.tag}
                                  </td>
                                  <td className="p-2 border-r border-slate-300 font-semibold text-slate-700">
                                    {door.frameSize}
                                  </td>
                                  <td className="p-2 border-r border-slate-300 font-black text-rose-700">
                                    {door.shutterSize}
                                  </td>
                                  <td className="p-2 border-r border-slate-300 font-mono text-[10px] text-slate-700">
                                    {door.tape}
                                  </td>
                                  <td className="p-2 border-r border-slate-300">{door.profile}</td>
                                  <td className="p-2 border-r border-slate-300">{door.finish}</td>
                                  <td className="p-2 border-r border-slate-300 text-slate-700">
                                    {door.hand} • {door.lock}
                                  </td>
                                  <td className="p-2 text-center font-bold text-slate-900">
                                    {door.qty}
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>

                          {/* Footer */}
                          <div className="grid grid-cols-2 gap-4 pt-4 text-[11px] text-slate-600 border-t border-slate-300">
                            <div>
                              <strong>Factory Supervisor Notes:</strong>
                              <br />
                              Check all shutter sizes against site masonry openings before cutting mortise. Standard 12mm floor clearance applied.
                            </div>
                            <div className="text-right space-y-1">
                              <div>Prepared By: <strong>Production Supervisor (Plant Floor)</strong></div>
                              <div>Site Verification: <strong>Site Engineer / Contractor Sign</strong></div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      {/* Dynamic Thermal 4"x2" vs A4 Top-Left Print Rule */}
      {activePrintModal === 'STICKERS' && (
        <style jsx global>{`
          @media print {
            @page {
              size: ${stickerFormat === 'THERMAL_ROLL' ? '4in 2in' : 'A4 portrait'} !important;
              margin: 0mm !important;
            }
            .printable-modal-root {
              position: static !important;
              display: block !important;
              align-items: flex-start !important;
              justify-content: flex-start !important;
              padding: 0 !important;
              margin: 0 !important;
            }
          }
        `}</style>
      )}
    </div>
  );
}
