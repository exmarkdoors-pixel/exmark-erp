'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Printer,
  QrCode,
  Sliders,
  Layers,
  Plus,
  Copy,
  Trash2,
  Save,
  Link2,
  Link2Off,
  CheckCircle2,
  FileText,
  Download,
  RotateCcw,
} from 'lucide-react';
import { ProductionOrder, ProductionDoorItem } from '@/lib/services/productionService';
import {
  CustomFrameProfile,
  DEFAULT_FRAME_PROFILES,
  getDefaultFrameProfile,
} from '@/lib/utils/frameDefaults';
import { CustomFrameManagerModal } from './CustomFrameManagerModal';
import { CustomToleranceManagerModal } from './CustomToleranceManagerModal';
import { cmToTapeInch, parseTapeInchToCm, computeStickerSizes } from '@/lib/utils/doorStickerFormula';
import {
  DoorModelOption,
  STANDARD_DOOR_MODELS,
  detectCategoryFromModelCode,
} from '@/lib/types/doorModelCatalog';

interface StickerPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: ProductionOrder | null;
  onOrderUpdated?: (updated: ProductionOrder) => void;
}

interface FloorDoorRow {
  id: string;
  doorId: string;
  modelName: string;
  roomTag: string;
  frameTypeId: string;
  rawHeightCm: number;
  rawWidthTopCm: number;
  rawWidthBtmCm: number;
  widthLinked: boolean;
  lockType: string;
  hingeSide: 'L' | 'R';
  swing: 'INWARD' | 'OUTWARD';
  finishColor: string;
  remark: string;
  qcStatus: 'PENDING' | 'PASSED' | 'REJECTED';
  qrPayload: string;
}

const DEFAULT_LOCK_OPTIONS = [
  'Baby Latch Black',
  'PlusPoint Black',
  'Black Latch Exmark',
  'Antique Exmark',
  'BABY LATCH',
  'Mortise Lock',
  'Mortise Lock 60mm Backset',
  'Cylindrical Knob Lock (Bathroom Privacy)',
  'Cylindrical Lock',
  'Key Lock',
  'Provision Only (No Hardware)',
  'No Lock / Plain',
  'Custom Lock',
];

const DEFAULT_COLOUR_OPTIONS = [
  'Natural Teak',
  'Burma Teak Woodgrain',
  'Rosewood',
  'Mahogany',
  'Royal Walnut',
  'Alpine White Solid',
  'Frost White',
];

const FRACTION_STEPS = [
  { label: '0"', val: 0 },
  { label: '1/16"', val: 1 / 16 },
  { label: '1/8"', val: 1 / 8 },
  { label: '3/16"', val: 3 / 16 },
  { label: '1/4"', val: 1 / 4 },
  { label: '5/16"', val: 5 / 16 },
  { label: '3/8"', val: 3 / 8 },
  { label: '7/16"', val: 7 / 16 },
  { label: '1/2"', val: 1 / 2 },
  { label: '9/16"', val: 9 / 16 },
  { label: '5/8"', val: 5 / 8 },
  { label: '11/16"', val: 11 / 16 },
  { label: '3/4"', val: 3 / 4 },
  { label: '13/16"', val: 13 / 16 },
  { label: '7/8"', val: 7 / 8 },
  { label: '15/16"', val: 15 / 16 },
];

export function StickerPrintModal({ isOpen, onClose, order, onOrderUpdated }: StickerPrintModalProps) {
  const [printFormat, setPrintFormat] = useState<'A4_12L' | 'THERMAL' | 'TEST_PAGE'>('A4_12L');
  const [gridLayout, setGridLayout] = useState<'2x6' | '3x4'>('2x6');
  const [useYellowPaper, setUseYellowPaper] = useState<boolean>(false);
  const [includeQrCode, setIncludeQrCode] = useState<boolean>(true);
  const [showMarginControls, setShowMarginControls] = useState<boolean>(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState<boolean>(false);

  // Editable Floor Door Rows
  const [rows, setRows] = useState<FloorDoorRow[]>([]);
  const [framesList, setFramesList] = useState<CustomFrameProfile[]>(DEFAULT_FRAME_PROFILES);
  const [lockChoices, setLockChoices] = useState<string[]>(DEFAULT_LOCK_OPTIONS);

  // Sub-modals
  const [isFrameManagerOpen, setIsFrameManagerOpen] = useState<boolean>(false);
  const [isToleranceManagerOpen, setIsToleranceManagerOpen] = useState<boolean>(false);

  // Inline Tape Measurement Modal
  const [tapeRowId, setTapeRowId] = useState<string | null>(null);
  const [tapeHText, setTapeHText] = useState<string>('80"');
  const [tapeWTopText, setTapeWTopText] = useState<string>('30"');
  const [tapeWBtmText, setTapeWBtmText] = useState<string>('30"');

  // Calibration Margins in mm (Standard 12L: 99x44mm die-cut standard)
  const [topMarginMm, setTopMarginMm] = useState<number>(9.0);
  const [leftMarginMm, setLeftMarginMm] = useState<number>(4.4);
  const [verticalGapMm, setVerticalGapMm] = useState<number>(3.0);
  const [horizontalGapMm, setHorizontalGapMm] = useState<number>(3.2);

  // Persistence Feedback
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const [doorModels, setDoorModels] = useState<DoorModelOption[]>(STANDARD_DOOR_MODELS);
  const [isSyncingQuotation, setIsSyncingQuotation] = useState<boolean>(false);
  const [isAddModelOpen, setIsAddModelOpen] = useState<boolean>(false);
  const [newModelCode, setNewModelCode] = useState<string>('');
  const [newModelTitle, setNewModelTitle] = useState<string>('');
  const [newModelCategory, setNewModelCategory] = useState<'A' | 'B' | 'C' | 'D' | 'E' | 'CUSTOM'>('A');

  const loadFrames = async () => {
    try {
      const res = await fetch('/api/settings/frames');
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setFramesList(json.data);
      }
    } catch (err) {
      console.error('Error loading frames:', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadFrames();
      fetch('/api/quotations/pricing-rules')
        .then((r) => r.json())
        .then((json) => {
          const locksPayload = json.settings?.locks || json.data?.locks;
          if (json.success && Array.isArray(locksPayload)) {
            const dynamicNames = (locksPayload as Array<{ name?: string }>)
              .map((l) => (l.name || '').trim())
              .filter(Boolean);
            setLockChoices(Array.from(new Set([...dynamicNames, ...DEFAULT_LOCK_OPTIONS])));
          }
        })
        .catch(() => {});

      fetch('/api/door-models')
        .then((r) => r.json())
        .then((json) => {
          if (json && json.success && Array.isArray(json.data) && json.data.length > 0) {
            setDoorModels(json.data);
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  // Populate rows from incoming order
  useEffect(() => {
    if (!order) return;
    const defaultFrame = getDefaultFrameProfile(framesList);
    const mapped: FloorDoorRow[] = order.doors.map((d, idx) => {
      const rawHCm = d.rawHeightCm ?? Number(((d.rawHeightMm || d.finishedHeightMm || 2100) / 10).toFixed(2));
      const rawTopCm = d.rawWidthTopCm ?? Number(((d.rawWidthMm || d.finishedWidthMm || 800) / 10).toFixed(2));
      const rawBtmCm = d.rawWidthBtmCm ?? Number(((d.rawWidthBottomMm || d.rawWidthMm || d.finishedWidthMm || 800) / 10).toFixed(2));

      return {
        id: d.id,
        doorId: d.doorId,
        modelName: d.model || order.doors?.[0]?.model || 'EXM-A-101',
        roomTag: d.doorNumber || `Door #${idx + 1}`,
        frameTypeId: d.frameTypeId || defaultFrame.id,
        rawHeightCm: rawHCm,
        rawWidthTopCm: rawTopCm,
        rawWidthBtmCm: rawBtmCm,
        widthLinked: d.widthLinked !== undefined ? d.widthLinked : Math.abs(rawTopCm - rawBtmCm) < 0.05,
        lockType: d.lockType || 'Baby Latch',
        hingeSide: d.handing === 'LH' ? 'L' : 'R',
        swing: d.swing || 'INWARD',
        finishColor: d.finishColor || 'Natural Teak',
        remark: d.remark || '',
        qcStatus: d.qcStatus,
        qrPayload: d.qrPayload,
      };
    });
    setRows(mapped);
  }, [order]);

  if (!isOpen || !order) return null;

  const getFrameProfile = (frameId: string): CustomFrameProfile => {
    return (
      framesList.find((f) => f.id === frameId || f.name === frameId) ||
      framesList[0] ||
      DEFAULT_FRAME_PROFILES[0]
    );
  };

  const updateRow = (id: string, updates: Partial<FloorDoorRow>) => {
    setRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...updates } : r)));
  };

  const handleSyncFromQuotation = async () => {
    if (!order) return;
    setIsSyncingQuotation(true);
    try {
      let quote: any = null;
      if (order.salesOrderId) {
        const res = await fetch(`/api/quotations/${encodeURIComponent(order.salesOrderId)}`);
        if (res.ok) {
          const json = await res.json();
          quote = json.data;
        }
      }
      if (!quote) {
        const res = await fetch('/api/quotations');
        if (res.ok) {
          const json = await res.json();
          if (json.success && Array.isArray(json.data)) {
            quote = json.data.find(
              (q: any) =>
                q.quoteNumber === order.salesOrderId ||
                q.id === order.salesOrderId ||
                q.jobCardNumber === order.jobCardNumber ||
                (q.customerName && order.customerName && q.customerName.toLowerCase().includes(order.customerName.toLowerCase()))
            );
          }
        }
      }

      if (!quote) {
        setSaveToast('No matching quotation found to sync.');
        setTimeout(() => setSaveToast(null), 3500);
        return;
      }

      const qRows: any[] = quote.itemRows || [];
      const qItems: any[] = quote.items || [];
      if (qRows.length === 0 && qItems.length === 0) {
        setSaveToast('Quotation has no door item rows.');
        setTimeout(() => setSaveToast(null), 3500);
        return;
      }

      setRows((prev) =>
        prev.map((r, i) => {
          const matchedRow = qRows[i] || qRows[0] || {};
          const matchedItem = qItems[i] || qItems[0] || {};
          const modelObj = doorModels.find((m) => m.code === matchedRow.modelId || (m as any).id === matchedRow.modelId || m.name === matchedRow.modelId);
          const resolvedModel =
            matchedRow.modelCode ||
            modelObj?.code ||
            matchedRow.modelTitle ||
            matchedItem.doorModel ||
            r.modelName;

          const factor = matchedRow.unit === 'inch' ? 2.54 : matchedRow.unit === 'cm' ? 1 : 0.1;
          const hCm = matchedRow.height ? Number((matchedRow.height * factor).toFixed(2)) : r.rawHeightCm;
          const wTopCm = matchedRow.widthTop !== undefined && matchedRow.widthTop > 0
            ? Number((matchedRow.widthTop * factor).toFixed(2))
            : matchedRow.width !== undefined && matchedRow.width > 0
            ? Number((matchedRow.width * factor).toFixed(2))
            : r.rawWidthTopCm;

          const hasValidBtm = matchedRow.widthBottom !== undefined && matchedRow.widthBottom > 0;
          const isLinked = matchedRow.widthLinked !== undefined
            ? matchedRow.widthLinked
            : !hasValidBtm || Math.abs((matchedRow.widthTop || matchedRow.width || 0) - matchedRow.widthBottom) < 0.05;

          const wBtmCm = !isLinked && hasValidBtm
            ? Number((matchedRow.widthBottom * factor).toFixed(2))
            : wTopCm;

          return {
            ...r,
            modelName: resolvedModel,
            rawHeightCm: hCm,
            rawWidthTopCm: wTopCm,
            rawWidthBtmCm: wBtmCm,
            widthLinked: isLinked,
            frameTypeId: matchedRow.frameTypeId || r.frameTypeId,
          };
        })
      );

      setSaveToast(`✓ Synced models & measurements from Quotation (${quote.quoteNumber || quote.id})!`);
      setTimeout(() => setSaveToast(null), 4000);
    } catch (err) {
      console.error('Failed to sync from quotation:', err);
      setSaveToast('Failed to sync from quotation.');
      setTimeout(() => setSaveToast(null), 3500);
    } finally {
      setIsSyncingQuotation(false);
    }
  };

  const applyModelToAll = (modelName: string) => {
    setRows((prev) => prev.map((r) => ({ ...r, modelName })));
    setSaveToast(`Applied model "${modelName}" to all ${rows.length} doors.`);
    setTimeout(() => setSaveToast(null), 3000);
  };

  const handleSaveNewModel = async () => {
    const code = newModelCode.trim().toUpperCase();
    const title = newModelTitle.trim() || `${newModelCategory} Series Door`;
    if (!code) return;
    try {
      const res = await fetch('/api/door-models', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          name: title,
          category: `CAT_${newModelCategory}`,
          defaultPrice: 7000,
        }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setDoorModels((prev) => [...prev, json.data]);
        applyModelToAll(code);
      }
      setIsAddModelOpen(false);
      setNewModelCode('');
      setNewModelTitle('');
    } catch {
      setIsAddModelOpen(false);
    }
  };

  const handleAddRow = () => {
    const nextIdx = rows.length + 1;
    const defaultFrame = framesList.find((f) => f.isDefault) || framesList[0];
    const newRow: FloorDoorRow = {
      id: `dr-${Date.now()}-${nextIdx}`,
      doorId: `EXM-DR-2026-${String(nextIdx).padStart(4, '0')}`,
      modelName: rows[rows.length - 1]?.modelName || order.doors?.[0]?.model || 'EXM-A-101',
      roomTag: `Door #${nextIdx}`,
      frameTypeId: defaultFrame?.id || 'FRM-MINI',
      rawHeightCm: 203.2,
      rawWidthTopCm: 78.11,
      rawWidthBtmCm: 78.11,
      widthLinked: true,
      lockType: 'Baby Latch',
      hingeSide: 'R',
      swing: 'INWARD',
      finishColor: 'Natural Teak',
      remark: '',
      qcStatus: 'PENDING',
      qrPayload: `EXM|${order.jobCardNumber}|D${nextIdx}`,
    };
    setRows((prev) => [...prev, newRow]);
  };

  const handleDuplicateRow = (id: string) => {
    const src = rows.find((r) => r.id === id);
    if (!src) return;
    const nextIdx = rows.length + 1;
    setRows((prev) => [
      ...prev,
      {
        ...src,
        id: `dr-${Date.now()}-${nextIdx}`,
        doorId: `EXM-DR-2026-${String(nextIdx).padStart(4, '0')}`,
        roomTag: `Door #${nextIdx}`,
      },
    ]);
  };

  const handleDeleteRow = (id: string) => {
    setRows((prev) => prev.filter((r) => r.id !== id));
  };

  const handleOpenTapeModal = (row: FloorDoorRow) => {
    setTapeRowId(row.id);
    setTapeHText(cmToTapeInch(row.rawHeightCm).replace(/"/g, ''));
    setTapeWTopText(cmToTapeInch(row.rawWidthTopCm).replace(/"/g, ''));
    setTapeWBtmText(cmToTapeInch(row.widthLinked ? row.rawWidthTopCm : row.rawWidthBtmCm).replace(/"/g, ''));
  };

  const handleApplyTape = () => {
    if (!tapeRowId) return;
    const hCm = parseTapeInchToCm(tapeHText);
    const wTopCm = parseTapeInchToCm(tapeWTopText);
    const wBtmCm = parseTapeInchToCm(tapeWBtmText);
    const row = rows.find((r) => r.id === tapeRowId);
    updateRow(tapeRowId, {
      rawHeightCm: hCm || row?.rawHeightCm || 200,
      rawWidthTopCm: wTopCm || row?.rawWidthTopCm || 78,
      rawWidthBtmCm: wBtmCm || wTopCm || row?.rawWidthBtmCm || 78,
      widthLinked: wTopCm === wBtmCm,
    });
    setTapeRowId(null);
  };

  const handleSaveToJobCard = async () => {
    setIsSaving(true);
    try {
      const updatedDoors: ProductionDoorItem[] = rows.map((r) => {
        const frame = getFrameProfile(r.frameTypeId);
        const calc = computeStickerSizes({
          rawHeightCm: r.rawHeightCm,
          rawWidthTopCm: r.rawWidthTopCm,
          rawWidthBtmCm: r.rawWidthBtmCm,
          widthLinked: r.widthLinked,
          hDeductionCm: frame.hDeductionCm ?? 4.5,
          wDeductionCm: frame.wDeductionCm ?? 7.6,
          hingeSide: r.hingeSide,
        });

        return {
          id: r.id,
          doorId: r.doorId,
          doorNumber: r.roomTag,
          model: r.modelName,
          rawHeightMm: Math.round(r.rawHeightCm * 10),
          rawWidthMm: Math.round(r.rawWidthTopCm * 10),
          rawWidthBottomMm: Math.round(r.rawWidthBtmCm * 10),
          rawHeightCm: r.rawHeightCm,
          rawWidthTopCm: r.rawWidthTopCm,
          rawWidthBtmCm: r.rawWidthBtmCm,
          widthLinked: r.widthLinked,
          frameTypeId: frame.id,
          frameTypeName: frame.name,
          swing: r.swing,
          remark: r.remark.trim(),
          finishedHeightMm: Math.round(calc.finH * 10),
          finishedWidthMm: Math.round(calc.finTopW * 10),
          handing: r.hingeSide === 'L' ? 'LH' : 'RH',
          lockType: r.lockType,
          finishColor: r.finishColor,
          qcStatus: r.qcStatus,
          qrPayload: r.qrPayload,
        };
      });

      const res = await fetch(`/api/production/${encodeURIComponent(order.id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ doors: updatedDoors }),
      });

      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data && onOrderUpdated) {
          onOrderUpdated(json.data);
        }
        setSaveToast(`Saved ${updatedDoors.length} door specs & cutting sizes to ${order.jobCardNumber}`);
      } else {
        setSaveToast(`Updated ${updatedDoors.length} door specs in Floor Print Preview`);
      }
      setTimeout(() => setSaveToast(null), 3500);
    } catch {
      setSaveToast('Floor Door changes applied locally for printing.');
      setTimeout(() => setSaveToast(null), 3500);
    } finally {
      setIsSaving(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadVectorPdf = async (mode: 'A4_12L' | 'THERMAL') => {
    if (rows.length === 0) return;
    setIsDownloadingPdf(true);
    try {
      const { generate12LStickerPdf, generateThermal4x2Pdf } = await import('@/lib/utils/pdfStickerEngine');
      const items = rows.map((row, idx) => {
        const frame = getFrameProfile(row.frameTypeId);
        const calc = computeStickerSizes({
          rawHeightCm: row.rawHeightCm,
          rawWidthTopCm: row.rawWidthTopCm,
          rawWidthBtmCm: row.rawWidthBtmCm,
          widthLinked: row.widthLinked,
          hDeductionCm: frame.hDeductionCm ?? 4.5,
          wDeductionCm: frame.wDeductionCm ?? 7.6,
          hingeSide: row.hingeSide,
        });
        const isOnlyDoor =
          frame.material === 'NONE' || frame.name.toLowerCase().includes('only door');
        const isTapered = !row.widthLinked && Math.abs(row.rawWidthTopCm - row.rawWidthBtmCm) > 0.05;
        const doorCode = `${order.jobCardNumber || order.prodOrderNumber}-D${String(idx + 1).padStart(2, '0')}`;
        const hostUrl = typeof window !== 'undefined' ? window.location.origin : 'http://192.168.8.101:4000';
        const qrUrl = row.qrPayload || `${hostUrl}/track/${encodeURIComponent(doorCode)}`;

        return {
          id: row.id,
          orderNumber: order.jobCardNumber || order.prodOrderNumber,
          jobCardNumber: order.jobCardNumber,
          customerName: order.customerName,
          siteName: order.siteName,
          floorZone: row.roomTag,
          doorNumber: idx + 1,
          totalDoorsInOrder: rows.length,
          rawHeightCm: row.rawHeightCm,
          rawWidthTopCm: row.rawWidthTopCm,
          rawWidthBtmCm: row.rawWidthBtmCm,
          finH: calc.finH,
          finTopW: calc.finTopW,
          finBtmW: calc.finBtmW,
          finHText: calc.finHText,
          finTopWText: calc.finTopWText,
          finBtmWText: calc.finBtmWText,
          tapeInchH: cmToTapeInch(row.rawHeightCm),
          tapeInchTopW: cmToTapeInch(row.rawWidthTopCm),
          tapeInchBtmW: cmToTapeInch(row.rawWidthBtmCm),
          isTapered,
          shutterSize: isTapered
            ? `${calc.finHText} x [TOP: ${calc.finTopWText} / BTM: ${calc.finBtmWText}] cm`
            : `${calc.finHText} x ${calc.finTopWText} cm`,
          tape: isTapered
            ? `${cmToTapeInch(row.rawHeightCm)} x [T:${cmToTapeInch(row.rawWidthTopCm)} / B:${cmToTapeInch(row.rawWidthBtmCm)}]`
            : `${cmToTapeInch(row.rawHeightCm)} x ${cmToTapeInch(row.rawWidthTopCm)}`,
          profile: row.modelName,
          modelCode: row.modelName.split(' ')[0],
          finish: row.finishColor,
          hand: row.hingeSide === 'L' ? 'LH' : 'RH',
          hingeSide: row.hingeSide,
          lock: row.lockType,
          remark: row.remark.trim(),
          barcode: `*${doorCode}*`,
          qrUrl,
          isOnlyDoor,
        };
      });

      if (mode === 'THERMAL') {
        const pdf = await generateThermal4x2Pdf(items, { companyName: 'EXMARK DOORS' });
        pdf.save(`EXMARK_Thermal_4x2_${order.jobCardNumber}.pdf`);
        setSaveToast(`Downloaded 4"x2" Thermal PDF (${items.length} labels) for ${order.jobCardNumber}.`);
      } else {
        const pdf = await generate12LStickerPdf(items, {
          companyName: 'EXMARK DOORS',
          layout: gridLayout,
          topMarginMm,
          leftMarginMm,
          rowGapMm: verticalGapMm,
          colGapMm: horizontalGapMm,
        });
        pdf.save(`EXMARK_12L_${gridLayout}_${order.jobCardNumber}.pdf`);
        setSaveToast(`Downloaded Top-Left Aligned ${gridLayout.toUpperCase()} 12L PDF (${items.length} labels).`);
      }
      setTimeout(() => setSaveToast(null), 4000);
    } catch (err) {
      console.error('Sticker PDF generation failed:', err);
      setSaveToast('Failed to generate sticker PDF. Try HTML Print.');
      setTimeout(() => setSaveToast(null), 4000);
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  // Split stickers into 12-per-sheet A4 pages
  const totalPages = Math.max(1, Math.ceil(rows.length / 12));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/85 backdrop-blur-xs printable-modal-root">
      <div className="relative w-full max-w-[1440px] max-h-[94vh] overflow-y-auto bg-[#070D1E] text-slate-100 rounded-2xl shadow-2xl border border-slate-700 p-4 sm:p-5 space-y-4 print:p-0 print:m-0 print:border-none print:shadow-none print:bg-white print:text-black print:max-w-none print:max-h-none print:overflow-visible">
        {/* Toast Notice */}
        {saveToast && (
          <div className="p-2.5 bg-emerald-950/80 border border-emerald-500/50 rounded-xl text-emerald-300 text-xs font-bold flex items-center gap-2 print:hidden">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{saveToast}</span>
          </div>
        )}

        {/* Modal Top Header & Controls (Hidden in Print) */}
        <div className="flex flex-col gap-3 pb-3 border-b border-slate-800 print:hidden">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-red-600 flex items-center justify-center shadow-md shadow-red-950/50">
                <QrCode className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-base font-black text-white flex items-center gap-2">
                  <span>Floor Door QR &amp; 12L Sticker Studio</span>
                  <span className="px-2 py-0.5 rounded bg-red-600/20 border border-red-500/40 font-mono text-xs text-red-400">
                    {order.jobCardNumber}
                  </span>
                </h2>
                <p className="text-[11px] text-slate-400">
                  Party: <strong className="text-white uppercase">{order.customerName}</strong> &bull; {order.siteName} &bull; {rows.length} Doors
                </p>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleSyncFromQuotation}
                disabled={isSyncingQuotation}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-950/80 hover:bg-indigo-900 text-indigo-300 border border-indigo-500/50 rounded-lg text-xs font-bold transition cursor-pointer"
                title="Re-sync model names, dimensions & hardware from the originating Quotation"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${isSyncingQuotation ? 'animate-spin' : ''}`} />
                <span>{isSyncingQuotation ? 'Syncing...' : '🔄 Sync from Quotation'}</span>
              </button>

              <button
                type="button"
                onClick={handleAddRow}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-300 border border-emerald-500/30 rounded-lg text-xs font-bold transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Door</span>
              </button>

              <button
                type="button"
                onClick={() => setIsFrameManagerOpen(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 rounded-lg text-xs font-bold transition cursor-pointer"
                title="Add, Edit & Delete Chowkhat Frame Profiles & CM Formulas"
              >
                <Layers className="w-3.5 h-3.5" />
                <span>+ SYNC Frames</span>
              </button>

              <button
                type="button"
                onClick={() => setIsToleranceManagerOpen(true)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 border border-cyan-500/30 rounded-lg text-xs font-bold transition cursor-pointer"
                title="Manage Custom Tolerance Presets"
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Tolerances</span>
              </button>

              <button
                type="button"
                onClick={() => setShowMarginControls(!showMarginControls)}
                className={`inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer border ${
                  showMarginControls
                    ? 'bg-indigo-600 text-white border-indigo-500'
                    : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700'
                }`}
              >
                <Sliders className="w-3.5 h-3.5" />
                <span>Margins</span>
              </button>

              <button
                type="button"
                onClick={handleSaveToJobCard}
                disabled={isSaving}
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition cursor-pointer shadow"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{isSaving ? 'Saving...' : 'Save Specs'}</span>
              </button>

              <button
                type="button"
                onClick={() => handleDownloadVectorPdf(printFormat === 'THERMAL' ? 'THERMAL' : 'A4_12L')}
                disabled={isDownloadingPdf || rows.length === 0}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-black transition cursor-pointer shadow-lg disabled:opacity-50"
                title="Download exact top-left aligned vector PDF"
              >
                <Download className="w-4 h-4" />
                <span>
                  {isDownloadingPdf
                    ? 'Generating PDF...'
                    : printFormat === 'THERMAL'
                    ? 'Download 4"×2" Thermal PDF'
                    : 'Download 12L Vector PDF'}
                </span>
              </button>

              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-black transition cursor-pointer shadow-lg"
              >
                <Printer className="w-4 h-4" />
                <span>{printFormat === 'THERMAL' ? 'Print 4"×2" Labels' : 'Print 12L Stickers'}</span>
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/50 text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Print Format Switcher & Options */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80 text-xs">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Print Output:</span>
              <div className="flex flex-wrap items-center bg-slate-900 border border-slate-800 rounded-lg p-0.5 font-bold">
                {[
                  { id: 'A4_12L', label: '12L Sticker Sheet (A4)' },
                  { id: 'THERMAL', label: 'Thermal Roll 4"×2"' },
                  { id: 'TEST_PAGE', label: 'Alignment Grid' },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPrintFormat(m.id as typeof printFormat)}
                    className={`px-3 py-1 rounded-md transition cursor-pointer ${
                      printFormat === m.id ? 'bg-red-600 text-white shadow' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>

              {printFormat === 'A4_12L' && (
                <div className="flex items-center bg-slate-900 border border-emerald-500/40 rounded-lg px-2.5 py-1 text-[11px] font-bold text-emerald-300">
                  <span>Standard 12L (99×44mm)</span>
                </div>
              )}
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs">
              <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={includeQrCode}
                  onChange={(e) => setIncludeQrCode(e.target.checked)}
                  className="rounded text-red-600 cursor-pointer"
                />
                <span>Include Tracking QR on Stickers</span>
              </label>

              <label className="flex items-center gap-1.5 cursor-pointer text-slate-300">
                <input
                  type="checkbox"
                  checked={useYellowPaper}
                  onChange={(e) => setUseYellowPaper(e.target.checked)}
                  className="rounded text-amber-500 cursor-pointer"
                />
                <span>Yellow Label Stock Tint</span>
              </label>
            </div>
          </div>

          {/* Collapsible Margin Calibration Controls */}
          {showMarginControls && (
            <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Top Margin ({topMarginMm}mm)</label>
                <input
                  type="range"
                  min={0}
                  max={25}
                  value={topMarginMm}
                  onChange={(e) => setTopMarginMm(Number(e.target.value))}
                  className="w-full accent-red-600 cursor-pointer"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Left Margin ({leftMarginMm}mm)</label>
                <input
                  type="range"
                  min={0}
                  max={25}
                  value={leftMarginMm}
                  onChange={(e) => setLeftMarginMm(Number(e.target.value))}
                  className="w-full accent-red-600 cursor-pointer"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Row Gap ({verticalGapMm}mm)</label>
                <input
                  type="range"
                  min={0}
                  max={15}
                  value={verticalGapMm}
                  onChange={(e) => setVerticalGapMm(Number(e.target.value))}
                  className="w-full accent-red-600 cursor-pointer"
                />
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Col Gap ({horizontalGapMm}mm)</label>
                <input
                  type="range"
                  min={0}
                  max={15}
                  value={horizontalGapMm}
                  onChange={(e) => setHorizontalGapMm(Number(e.target.value))}
                  className="w-full accent-red-600 cursor-pointer"
                />
              </div>
            </div>
          )}
        </div>

        {/* ===================================================================== */}
        {/* PART 1: REARRANGED 9-COLUMN FLOOR DOOR TABLE (HIDDEN IN PRINT)         */}
        {/* ===================================================================== */}
        <div className="bg-[#0B132B] rounded-xl border border-slate-800 overflow-x-auto shadow-inner print:hidden">
          <table className="w-full text-left text-xs border-collapse min-w-[1260px]">
              <thead>
                <tr className="bg-[#0F172A] text-slate-200 text-[10px] font-black uppercase tracking-wider border-b border-slate-800">
                  <th className="p-2.5 w-48">
                    <div className="flex items-center justify-between gap-1">
                      <span>MODEL NAME</span>
                      <button
                        type="button"
                        onClick={() => setIsAddModelOpen(true)}
                        className="px-1.5 py-0.5 rounded bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-[8.5px] font-black cursor-pointer"
                        title="Add New Model to Catalog"
                      >
                        + Model
                      </button>
                    </div>
                    <span className="block text-[9px] font-normal text-slate-400 normal-case">Pick Model &amp; Room / Tag</span>
                  </th>
                  <th className="p-2.5 w-44">
                    <div className="flex items-center justify-between gap-1">
                      <span>CHOWKHAT FRAME</span>
                      <button
                        type="button"
                        onClick={() => setIsFrameManagerOpen(true)}
                        className="px-1.5 py-0.5 rounded bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 text-[8.5px] font-black cursor-pointer"
                      >
                        + SYNC
                      </button>
                    </div>
                    <span className="block text-[9px] font-normal text-slate-400 normal-case">Section &amp; Synced Tolerance</span>
                  </th>
                  <th className="p-2.5 w-44 text-amber-300">
                    <span>RAW FRAME (INCH)</span>
                    <span className="block text-[9px] font-normal text-slate-400 normal-case">Tape Measurement (&quot;)</span>
                  </th>
                  <th className="p-2.5 w-44">
                    <span>RAW FRAME (CM)</span>
                    <span className="block text-[9px] font-normal text-slate-400 normal-case">Height &amp; Top/Btm Width</span>
                  </th>
                  <th className="p-2.5 w-44 text-emerald-400">
                    <span>12L STICKER FINISHED SIZE (CM)</span>
                    <span className="block text-[9px] font-normal text-slate-400 normal-case">Hinge Edge Label &amp; Cut</span>
                  </th>
                  <th className="p-2.5 w-36">
                    <span>LOCK TYPE</span>
                  </th>
                  <th className="p-2.5 text-center w-28">
                    <span>HINGES &amp; OPEN</span>
                    <span className="block text-[9px] font-normal text-slate-400 normal-case">L/R &amp; Swing</span>
                  </th>
                  <th className="p-2.5 w-36">
                    <span>COLOUR &amp; FINISH</span>
                  </th>
                  <th className="p-2.5 w-48">
                    <span>REMARK</span>
                    <span className="block text-[9px] font-normal text-slate-400 normal-case">Shows on Sticker Bottom</span>
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-slate-800/80 bg-slate-950/30">
                {rows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="p-10 text-center text-slate-400 text-xs">
                      No doors in this schedule. Click <strong>&quot;+ Add Door&quot;</strong> above to add measurements.
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => {
                    const frame = getFrameProfile(row.frameTypeId);
                    const calc = computeStickerSizes({
                      rawHeightCm: row.rawHeightCm,
                      rawWidthTopCm: row.rawWidthTopCm,
                      rawWidthBtmCm: row.rawWidthBtmCm,
                      widthLinked: row.widthLinked,
                      hDeductionCm: frame.hDeductionCm ?? 4.5,
                      wDeductionCm: frame.wDeductionCm ?? 7.6,
                      hingeSide: row.hingeSide,
                    });
                    const rawBtmInch = cmToTapeInch(row.widthLinked ? row.rawWidthTopCm : row.rawWidthBtmCm);

                    return (
                      <tr key={row.id} className="hover:bg-slate-900/60 transition align-middle">
                        {/* 1. MODEL NAME */}
                        <td className="p-2 space-y-1">
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              list="floor-sticker-door-models"
                              value={row.modelName}
                              onChange={(e) => updateRow(row.id, { modelName: e.target.value.toUpperCase() })}
                              className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded font-bold text-white uppercase text-xs"
                              placeholder="Select or enter model (e.g. EXM-A-101)..."
                            />
                            <span
                              title={detectCategoryFromModelCode(row.modelName).replace('CAT_', 'Category ')}
                              className="px-1.5 py-1 bg-indigo-950/80 border border-indigo-700/60 rounded text-[9px] font-black text-indigo-300 shrink-0 uppercase"
                            >
                              {detectCategoryFromModelCode(row.modelName).replace('CAT_', 'Cat ')}
                            </span>
                            <button
                              type="button"
                              onClick={() => applyModelToAll(row.modelName)}
                              className="px-1.5 py-1 bg-amber-950/80 hover:bg-amber-900 border border-amber-600/40 rounded text-[9px] font-black text-amber-300 shrink-0 uppercase cursor-pointer"
                              title="Apply this model to all doors in this job card"
                            >
                              All
                            </button>
                          </div>
                          <select
                            value={doorModels.some((m) => m.code === row.modelName) ? row.modelName : ''}
                            onChange={(e) => {
                              if (e.target.value) updateRow(row.id, { modelName: e.target.value });
                            }}
                            className="w-full px-1.5 py-0.5 bg-slate-950 border border-slate-800 rounded text-[10px] text-slate-300 cursor-pointer"
                          >
                            <option value="">-- Quick Pick from Models Catalog --</option>
                            {doorModels.map((m) => (
                              <option key={m.code} value={m.code}>
                                {m.code} ({m.categoryLabel || detectCategoryFromModelCode(m.code)}) - {m.name}
                              </option>
                            ))}
                          </select>
                          <datalist id="floor-sticker-door-models">
                            {doorModels.map((m) => (
                              <option key={m.code} value={m.code}>
                                {m.code} — {m.name} ({m.categoryLabel} ₹{m.defaultPrice.toLocaleString('en-IN')})
                              </option>
                            ))}
                          </datalist>
                          <input
                            type="text"
                            value={row.roomTag}
                            onChange={(e) => updateRow(row.id, { roomTag: e.target.value })}
                            placeholder="Door #1"
                            className="w-full px-2 py-0.5 bg-slate-950 border border-slate-800 rounded text-[10px] text-slate-300"
                          />
                        </td>

                        {/* 2. CHOWKHAT FRAME */}
                        <td className="p-2 space-y-1">
                          <select
                            value={frame.id}
                            onChange={(e) => updateRow(row.id, { frameTypeId: e.target.value })}
                            className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded font-bold text-white text-xs cursor-pointer"
                          >
                            {framesList.map((f) => (
                              <option key={f.id} value={f.id}>
                                {f.name}
                              </option>
                            ))}
                          </select>
                          <div className="text-[10px] text-slate-400 truncate" title={frame.description}>
                            {frame.wallThicknessMm > 0
                              ? `${frame.wallThicknessMm}×${frame.sectionWidthMm}mm Section`
                              : 'Shutter Only (No Frame)'}
                          </div>
                          <div className="text-[9.5px] font-mono text-rose-400 font-semibold">
                            Tol: H -{calc.hMinusCm}cm | W -{calc.wMinusCm}cm
                          </div>
                        </td>

                        {/* 3. RAW FRAME (INCH) */}
                        <td className="p-2">
                          <div className="bg-amber-950/25 border border-amber-500/30 rounded-lg p-1.5 space-y-1 text-[10.5px]">
                            <div className="flex justify-between items-center gap-1">
                              <span className="text-amber-400 font-bold">H:</span>
                              <span className="font-mono font-black text-amber-100">{cmToTapeInch(row.rawHeightCm)}</span>
                            </div>
                            <div className="flex justify-between items-center gap-1">
                              <span className="text-amber-400 font-bold">W:</span>
                              <span className="font-mono font-bold text-amber-200 text-[10px]">
                                T:{cmToTapeInch(row.rawWidthTopCm)} B:{rawBtmInch}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleOpenTapeModal(row)}
                              className="w-full py-0.5 bg-amber-500/25 hover:bg-amber-500/40 text-amber-200 rounded text-[10px] font-bold transition cursor-pointer"
                            >
                              📏 Tape (&quot;)
                            </button>
                          </div>
                        </td>

                        {/* 4. RAW FRAME (CM) */}
                        <td className="p-2 space-y-1.5">
                          <div className="flex items-center justify-between gap-1">
                            <span className="text-[10px] text-slate-400 font-semibold">Height:</span>
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                step="0.01"
                                value={row.rawHeightCm}
                                onChange={(e) => updateRow(row.id, { rawHeightCm: parseFloat(e.target.value) || 0 })}
                                className="w-16 px-1.5 py-0.5 bg-slate-900 border border-slate-700 rounded text-right font-mono font-bold text-white text-xs"
                              />
                              <button
                                type="button"
                                onClick={() => updateRow(row.id, { widthLinked: !row.widthLinked, rawWidthBtmCm: row.rawWidthTopCm })}
                                className={`p-1 rounded border cursor-pointer ${
                                  row.widthLinked
                                    ? 'bg-blue-900/50 border-blue-500 text-blue-300'
                                    : 'bg-slate-800 border-slate-700 text-slate-400'
                                }`}
                                title={row.widthLinked ? 'Top & Bottom Width Linked (Click to unlink)' : 'Unlinked Top & Bottom Width'}
                              >
                                {row.widthLinked ? <Link2 className="w-3 h-3" /> : <Link2Off className="w-3 h-3" />}
                              </button>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-1">
                            <div className="flex items-center gap-1">
                              <span className="text-[9.5px] text-slate-400">Top:</span>
                              <input
                                type="number"
                                step="0.01"
                                value={row.rawWidthTopCm}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 0;
                                  updateRow(row.id, {
                                    rawWidthTopCm: val,
                                    ...(row.widthLinked ? { rawWidthBtmCm: val } : {}),
                                  });
                                }}
                                className="w-full px-1 py-0.5 bg-slate-900 border border-slate-700 rounded text-right font-mono font-bold text-white text-[11px]"
                              />
                            </div>
                            <div className="flex items-center gap-1">
                              <span className="text-[9.5px] text-slate-400">Btm:</span>
                              <input
                                type="number"
                                step="0.01"
                                value={row.widthLinked ? row.rawWidthTopCm : row.rawWidthBtmCm}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 0;
                                  updateRow(row.id, {
                                    rawWidthBtmCm: val,
                                    widthLinked: false,
                                  });
                                }}
                                className="w-full px-1 py-0.5 bg-slate-900 border border-slate-700 rounded text-right font-mono font-bold text-amber-300 text-[11px]"
                              />
                            </div>
                          </div>
                        </td>

                        {/* 5. 12L STICKER FINISHED SIZE (CM) */}
                        <td className="p-2">
                          <div className="bg-emerald-950/35 border border-emerald-500/40 rounded-lg p-2 space-y-1">
                            <div className="flex justify-between items-center border-b border-emerald-500/30 pb-0.5">
                              <span className="text-[10px] font-black text-emerald-400 uppercase">{calc.hLabel}</span>
                              <span className="font-mono text-sm font-black text-white">{calc.finHText}</span>
                            </div>
                            <div className="flex justify-between text-[10px] font-mono font-bold text-slate-200">
                              <span>TOP: {calc.finTopWText}</span>
                              <span>BOTTOM: {calc.finBtmWText}</span>
                            </div>
                          </div>
                        </td>

                        {/* 6. LOCK TYPE */}
                        <td className="p-2 space-y-1">
                          <select
                            value={row.lockType}
                            onChange={(e) => updateRow(row.id, { lockType: e.target.value })}
                            className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs font-bold text-white cursor-pointer"
                          >
                            {!lockChoices.includes(row.lockType) && row.lockType && (
                              <option value={row.lockType}>{row.lockType}</option>
                            )}
                            {lockChoices.map((lk) => (
                              <option key={lk} value={lk}>
                                {lk}
                              </option>
                            ))}
                          </select>
                          <div className="text-[10px] text-slate-400 truncate">{row.lockType}</div>
                        </td>

                        {/* 7. HINGES & OPEN (L/R & SWING) */}
                        <td className="p-2 text-center space-y-1">
                          <div className="inline-flex p-0.5 rounded-full bg-slate-900 border border-slate-700">
                            <button
                              type="button"
                              onClick={() => updateRow(row.id, { hingeSide: 'L' })}
                              title="Hinges on Left Jamb (LH)"
                              className={`w-6 h-5 rounded-full text-[10px] font-black transition cursor-pointer ${
                                row.hingeSide === 'L' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
                              }`}
                            >
                              L
                            </button>
                            <button
                              type="button"
                              onClick={() => updateRow(row.id, { hingeSide: 'R' })}
                              title="Hinges on Right Jamb (RH)"
                              className={`w-6 h-5 rounded-full text-[10px] font-black transition cursor-pointer ${
                                row.hingeSide === 'R' ? 'bg-blue-600 text-white shadow' : 'text-slate-400 hover:text-white'
                              }`}
                            >
                              R
                            </button>
                          </div>
                          <div>
                            <button
                              type="button"
                              onClick={() =>
                                updateRow(row.id, {
                                  swing: row.swing === 'INWARD' ? 'OUTWARD' : 'INWARD',
                                })
                              }
                              className="px-2 py-0.5 rounded bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 text-[9px] font-black uppercase cursor-pointer hover:bg-emerald-900/50"
                            >
                              {row.swing}
                            </button>
                          </div>
                        </td>

                        {/* 8. COLOUR & FINISH */}
                        <td className="p-2 space-y-1">
                          <select
                            value={DEFAULT_COLOUR_OPTIONS.includes(row.finishColor) ? row.finishColor : row.finishColor}
                            onChange={(e) => updateRow(row.id, { finishColor: e.target.value })}
                            className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-xs font-bold text-white cursor-pointer"
                          >
                            {!DEFAULT_COLOUR_OPTIONS.includes(row.finishColor) && (
                              <option value={row.finishColor}>{row.finishColor}</option>
                            )}
                            {DEFAULT_COLOUR_OPTIONS.map((c) => (
                              <option key={c} value={c}>
                                {c}
                              </option>
                            ))}
                          </select>
                          <div className="text-[10px] text-slate-400 truncate">{row.finishColor}</div>
                        </td>

                        {/* 9. REMARK (REPLACES AUTO COST CALCULATOR) */}
                        <td className="p-2">
                          <div className="flex items-center gap-1">
                            <input
                              type="text"
                              value={row.remark}
                              onChange={(e) => updateRow(row.id, { remark: e.target.value })}
                              placeholder="Optional bottom remark..."
                              className="w-full px-2 py-1 bg-slate-900 border border-slate-700 rounded text-[11px] text-amber-200 placeholder:text-slate-500 focus:border-amber-400 focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => handleDuplicateRow(row.id)}
                              className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 cursor-pointer shrink-0"
                              title="Duplicate Door Row"
                            >
                              <Copy className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteRow(row.id)}
                              className="p-1 rounded bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 cursor-pointer shrink-0"
                              title="Delete Door Row"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          {row.remark.trim() ? (
                            <span className="text-[9px] text-amber-400 font-semibold mt-0.5 block">
                              ✓ Will print at sticker bottom
                            </span>
                          ) : (
                            <span className="text-[9px] text-slate-500 mt-0.5 block">
                              Blank = No bottom remark line
                            </span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
        </div>

        {/* ===================================================================== */}
        {/* PART 2: PRINT-ONLY 12L & 4"×2" STICKER CANVAS (TOP-LEFT ANCHORED)     */}
        {/* ===================================================================== */}
        <div
          id="stickerPrintCanvas"
          className="hidden print:block print:m-0 print:p-0"
        >
          {printFormat === 'TEST_PAGE' ? (
              <div
                style={{
                  width: '210mm',
                  paddingTop: `${topMarginMm}mm`,
                  paddingLeft: `${leftMarginMm}mm`,
                  paddingRight: `${leftMarginMm}mm`,
                  boxSizing: 'border-box',
                }}
                className="bg-white text-black"
              >
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 99mm)',
                    gridAutoRows: '44mm',
                    alignContent: 'start',
                    rowGap: `${verticalGapMm}mm`,
                    columnGap: `${horizontalGapMm}mm`,
                  }}
                >
                  {Array.from({ length: 12 }).map((_, idx) => (
                    <div
                      key={idx}
                      style={{ height: '44mm', width: '99mm' }}
                      className="border-2 border-black border-dashed rounded flex flex-col items-center justify-center p-2 box-border"
                    >
                      <span className="font-mono text-xs font-black">SLOT #{idx + 1}</span>
                      <span className="text-[10px] text-gray-600 font-mono">
                        12L (99×44mm) ({topMarginMm}mm Top / {leftMarginMm}mm Left)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ) : printFormat === 'THERMAL' ? (
              <div className="print:space-y-0">
                {rows.map((row, idx) => {
                  const frame = getFrameProfile(row.frameTypeId);
                  const calc = computeStickerSizes({
                    rawHeightCm: row.rawHeightCm,
                    rawWidthTopCm: row.rawWidthTopCm,
                    rawWidthBtmCm: row.rawWidthBtmCm,
                    widthLinked: row.widthLinked,
                    hDeductionCm: frame.hDeductionCm ?? 4.5,
                    wDeductionCm: frame.wDeductionCm ?? 7.6,
                    hingeSide: row.hingeSide,
                  });
                  const isOnlyDoor =
                    frame.material === 'NONE' || frame.name.toLowerCase().includes('only door');
                  const hasRemark = Boolean(row.remark && row.remark.trim().length > 0);

                  return (
                    <div
                      key={row.id}
                      style={{
                        width: '101.6mm',
                        height: '50.8mm',
                        maxHeight: '50.8mm',
                        padding: '2.2mm 2.8mm',
                        boxSizing: 'border-box',
                        pageBreakAfter: 'always',
                        breakAfter: 'page',
                        pageBreakInside: 'avoid',
                        breakInside: 'avoid',
                      }}
                      className={`text-slate-950 border border-slate-900 flex flex-col justify-between overflow-hidden ${
                        useYellowPaper ? 'bg-[#fef9c3]' : 'bg-white'
                      }`}
                    >
                      <div className="flex justify-between items-center border-b border-slate-900 pb-0.5 text-[9.5px]">
                        <strong className="font-black uppercase truncate max-w-[60mm]">{order.customerName}</strong>
                        <span className="font-mono text-[8.5px] font-black px-1 rounded bg-slate-100 border border-slate-500">
                          {order.jobCardNumber} #{idx + 1}/{rows.length}
                        </span>
                      </div>

                      <div className="flex justify-between items-center text-[9.5px]">
                        <strong className="uppercase truncate">{row.modelName}</strong>
                        <div className="flex items-center gap-1 shrink-0">
                          {isOnlyDoor && (
                            <span className="px-1 rounded bg-amber-300 border border-amber-700 text-[8px] font-black">
                              ONLY DOOR
                            </span>
                          )}
                          <span className="text-[8.5px] font-bold">
                            H:<strong className="px-1 rounded border border-slate-800">{row.hingeSide}</strong>
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2 text-[8.5px]">
                        <span className="truncate"><strong>LOCK:</strong> {row.lockType}</span>
                        <span className="truncate"><strong>CLR:</strong> {row.finishColor}</span>
                      </div>

                      <div className="border border-slate-900 rounded grid grid-cols-12 overflow-hidden">
                        <div className="col-span-6 border-r border-slate-900 px-2 py-1 flex items-center justify-between">
                          <span className="text-[9px] font-bold text-slate-700">{calc.hLabel}</span>
                          <span className="font-mono text-sm font-black">{calc.finHText}</span>
                        </div>
                        <div className="col-span-6 divide-y divide-slate-900">
                          <div className="px-1.5 py-0.5 flex items-center justify-between text-[9px]">
                            <span className="text-[8px] font-bold text-slate-600">TOP</span>
                            <span className="font-mono font-black">{calc.finTopWText}</span>
                          </div>
                          <div className="px-1.5 py-0.5 flex items-center justify-between text-[9px]">
                            <span className="text-[8px] font-bold text-slate-600">BTM</span>
                            <span className="font-mono font-black">{calc.finBtmWText}</span>
                          </div>
                        </div>
                      </div>

                      {hasRemark && (
                        <div className="pt-0.5 border-t border-slate-400 text-[8px] font-black uppercase truncate flex items-center gap-1">
                          <span className="text-amber-800 shrink-0 font-black">REMARK:</span>
                          <span className="truncate">{row.remark.trim()}</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              /* DEFAULT: A4 12-LABEL DIE-CUT SHEET (STRICTLY TOP-LEFT ANCHORED 2×6 OR 3×4 GRID) */
              <div className="print:space-y-0">
                {Array.from({ length: totalPages }).map((_, pageIdx) => {
                  const sheetRows = rows.slice(pageIdx * 12, (pageIdx + 1) * 12);
                  const cellHeightMm = '44mm';

                  return (
                    <div
                      key={pageIdx}
                      style={{
                        width: '210mm',
                        minHeight: '297mm',
                        paddingTop: `${topMarginMm}mm`,
                        paddingBottom: `${topMarginMm}mm`,
                        paddingLeft: `${leftMarginMm}mm`,
                        paddingRight: `${leftMarginMm}mm`,
                        boxSizing: 'border-box',
                        pageBreakAfter: pageIdx < totalPages - 1 ? 'always' : 'auto',
                        breakAfter: pageIdx < totalPages - 1 ? 'page' : 'auto',
                      }}
                      className="bg-white text-slate-950"
                    >
                      <div
                        style={{
                          display: 'grid',
                          gridTemplateColumns: 'repeat(2, 99mm)',
                          gridAutoRows: cellHeightMm,
                          alignContent: 'start',
                          justifyItems: 'stretch',
                          rowGap: `${verticalGapMm}mm`,
                          columnGap: `${horizontalGapMm}mm`,
                        }}
                      >
                        {sheetRows.map((row, localIdx) => {
                          const doorIndex = pageIdx * 12 + localIdx + 1;
                          const frame = getFrameProfile(row.frameTypeId);
                          const calc = computeStickerSizes({
                            rawHeightCm: row.rawHeightCm,
                            rawWidthTopCm: row.rawWidthTopCm,
                            rawWidthBtmCm: row.rawWidthBtmCm,
                            widthLinked: row.widthLinked,
                            hDeductionCm: frame.hDeductionCm ?? 4.5,
                            wDeductionCm: frame.wDeductionCm ?? 7.6,
                            hingeSide: row.hingeSide,
                          });
                          const isOnlyDoor =
                            frame.material === 'NONE' || frame.name.toLowerCase().includes('only door');
                          const hasRemark = row.remark && row.remark.trim().length > 0;

                          return (
                            <div
                              key={row.id}
                              style={{
                                height: cellHeightMm,
                                maxHeight: cellHeightMm,
                                boxSizing: 'border-box',
                                breakInside: 'avoid',
                                pageBreakInside: 'avoid',
                              }}
                              className={`${hasRemark ? 'p-1.5 space-y-0.5' : 'p-2 space-y-1'} rounded-lg border border-slate-800 flex flex-col justify-between overflow-hidden ${
                                useYellowPaper ? 'bg-[#fef9c3]' : 'bg-white'
                              }`}
                            >
                              {/* Row 1: PartyName (Clean Left, matching factory photo) */}
                              <div className="flex justify-between items-center gap-1.5">
                                <div className="flex items-baseline gap-1.5 min-w-0">
                                  <span className="text-[8px] text-slate-500 font-medium shrink-0">PartyName</span>
                                  <span className="font-black text-[10.5px] text-slate-950 uppercase tracking-tight truncate">
                                    {order.customerName}
                                  </span>
                                </div>
                              </div>

                              {/* Row 2: Model/Part + Only Door pill + Capsule Door Number */}
                              <div className="flex justify-between items-center gap-1.5">
                                <div className="flex items-baseline gap-1.5 min-w-0">
                                  <span className="text-[8px] text-slate-500 font-medium shrink-0">Model/Part</span>
                                  <span className="font-black text-[10px] text-slate-950 uppercase truncate">
                                    {row.modelName}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1 shrink-0">
                                  {isOnlyDoor && (
                                    <span className="px-1 rounded bg-amber-300 border border-amber-700 text-[7px] font-black text-slate-950 uppercase">
                                      ONLY DOOR
                                    </span>
                                  )}
                                  <span className="px-2.5 rounded-full border border-slate-800 font-black text-[9.5px] text-slate-950 leading-tight">
                                    {doorIndex}
                                  </span>
                                </div>
                              </div>

                              {/* Row 3: Hinge (R) • LOCK • COLOUR */}
                              <div className="flex items-center justify-between gap-1 text-[8px]">
                                <div className="flex items-center gap-1 shrink-0">
                                  <span className="text-slate-600 font-medium">Hinge:</span>
                                  <span className="px-1.5 rounded-full border border-slate-800 font-black text-[9px] text-slate-950">
                                    {row.hingeSide}
                                  </span>
                                </div>

                                <div className="flex items-center gap-0.5 min-w-0 border border-slate-300 rounded px-1.5 flex-1 bg-slate-50/70">
                                  <span className="text-slate-500 text-[7px] font-semibold shrink-0">LOCK:</span>
                                  <span className="font-black text-slate-950 uppercase truncate">{row.lockType}</span>
                                </div>

                                <div className="flex items-center gap-0.5 min-w-0 border border-slate-300 rounded px-1.5 flex-1 bg-slate-50/70">
                                  <span className="text-slate-500 text-[7px] font-semibold shrink-0">COLOUR:</span>
                                  <span className="font-black text-slate-950 uppercase truncate">{row.finishColor}</span>
                                </div>
                              </div>

                              {/* Row 4: Two-Column Boxed Cutting Size Grid (Full Width, matching factory reference photo) */}
                              <div className="border border-slate-800 rounded grid grid-cols-12 overflow-hidden bg-slate-50/50">
                                <div className={`col-span-6 border-r border-slate-800 px-2 ${hasRemark ? 'py-0.5' : 'py-1'} flex items-center justify-between`}>
                                  <span className="text-[9px] font-bold text-slate-700 uppercase">
                                    {calc.hLabel}
                                  </span>
                                  <span className="font-mono text-[11.5px] font-black text-slate-950">
                                    {calc.finHText}
                                  </span>
                                </div>
                                <div className="col-span-6 divide-y divide-slate-800">
                                  <div className={`px-1.5 ${hasRemark ? 'py-0.2' : 'py-0.5'} flex items-center justify-between`}>
                                    <span className="text-[7.5px] font-bold text-slate-600 uppercase">TOP</span>
                                    <span className="font-mono text-[10.5px] font-black text-slate-950">
                                      {calc.finTopWText}
                                    </span>
                                  </div>
                                  <div className={`px-1.5 ${hasRemark ? 'py-0.2' : 'py-0.5'} flex items-center justify-between`}>
                                    <span className="text-[7.5px] font-bold text-slate-600 uppercase">BOTTOM</span>
                                    <span className="font-mono text-[10.5px] font-black text-slate-950">
                                      {calc.finBtmWText}
                                    </span>
                                  </div>
                                </div>
                              </div>

                              {/* Row 5: STRICT CONDITIONAL BOTTOM REMARK */}
                              {hasRemark && (
                                <div className="px-1.5 py-0.5 rounded bg-amber-50 border border-amber-300 text-[8px] font-black text-slate-950 uppercase truncate leading-tight flex items-center gap-1">
                                  <span className="text-amber-800 shrink-0 font-black">REMARK:</span>
                                  <span className="truncate">{row.remark.trim()}</span>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
        </div>
      </div>

      {/* ===================================================================== */}
      {/* INLINE TAPE MEASUREMENT MODAL (FRACTIONAL INCHES TO 2-DECIMAL CM)     */}
      {/* ===================================================================== */}
      {tapeRowId && (
        <div className="fixed inset-0 z-[70] bg-black/80 flex items-center justify-center p-4 print:hidden">
          <div className="w-full max-w-md bg-[#0F172A] rounded-2xl border border-amber-500/60 shadow-2xl p-5 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h3 className="font-black text-amber-400 text-sm">
                📏 Enter Raw Frame Tape Measurement (Inches &quot;)
              </h3>
              <button
                type="button"
                onClick={() => setTapeRowId(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-300 mb-1">
                  Height in Inches (e.g. <code>88 13/16</code> or <code>80</code>)
                </label>
                <input
                  type="text"
                  value={tapeHText}
                  onChange={(e) => setTapeHText(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-amber-500/50 rounded-lg font-mono font-bold text-white text-sm"
                />
                <span className="text-[11px] text-cyan-400 font-mono mt-1 block">
                  = {parseTapeInchToCm(tapeHText)} cm
                </span>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-300 mb-1">
                    Width Top (&quot;) (e.g. <code>30 3/8</code>)
                  </label>
                  <input
                    type="text"
                    value={tapeWTopText}
                    onChange={(e) => setTapeWTopText(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-amber-500/50 rounded-lg font-mono font-bold text-white text-sm"
                  />
                  <span className="text-[11px] text-cyan-400 font-mono mt-1 block">
                    = {parseTapeInchToCm(tapeWTopText)} cm
                  </span>
                </div>

                <div>
                  <label className="block font-bold text-slate-300 mb-1">
                    Width Bottom (&quot;) (e.g. <code>30 3/4</code>)
                  </label>
                  <input
                    type="text"
                    value={tapeWBtmText}
                    onChange={(e) => setTapeWBtmText(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-900 border border-amber-500/50 rounded-lg font-mono font-bold text-amber-200 text-sm"
                  />
                  <span className="text-[11px] text-cyan-400 font-mono mt-1 block">
                    = {parseTapeInchToCm(tapeWBtmText)} cm
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap gap-1 pt-1">
                <span className="text-[10px] text-slate-400 w-full">Quick 1/16&quot; reference fractions:</span>
                {FRACTION_STEPS.slice(1).map((f) => (
                  <span key={f.label} className="px-1.5 py-0.5 rounded bg-slate-800 text-[10px] font-mono text-slate-300">
                    {f.label}
                  </span>
                ))}
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setTapeRowId(null)}
                className="px-3 py-1.5 bg-slate-800 text-slate-300 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyTape}
                className="px-4 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-black cursor-pointer"
              >
                ✓ Apply CM &amp; Recompute
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Frame Manager Modal (Add / Edit / Delete + CM Deductions) */}
      <CustomFrameManagerModal
        isOpen={isFrameManagerOpen}
        onClose={() => {
          setIsFrameManagerOpen(false);
          loadFrames();
        }}
        onSelectFrame={(frameName) => {
          const found = framesList.find((f) => f.name === frameName);
          if (found) {
            setRows((prev) => prev.map((r) => ({ ...r, frameTypeId: found.id })));
          }
          setIsFrameManagerOpen(false);
        }}
      />

      {/* Custom Tolerance Manager Modal */}
      <CustomToleranceManagerModal
        isOpen={isToleranceManagerOpen}
        onClose={() => setIsToleranceManagerOpen(false)}
      />

      {/* INLINE ADD MODEL MODAL */}
      {isAddModelOpen && (
        <div className="fixed inset-0 bg-black/80 z-[70] flex items-center justify-center p-4 backdrop-blur-xs print:hidden">
          <div className="bg-[#111827] border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                <span>Add New Door Model &amp; Sync to Studio</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsAddModelOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Model Code *</label>
                <input
                  type="text"
                  placeholder="e.g. EXM-A-125 or EXN-A-101"
                  value={newModelCode}
                  onChange={(e) => setNewModelCode(e.target.value.toUpperCase())}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono font-bold uppercase"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Category</label>
                <select
                  value={newModelCategory}
                  onChange={(e) => setNewModelCategory(e.target.value as any)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-bold cursor-pointer"
                >
                  <option value="A">Category A (Classic Molded)</option>
                  <option value="B">Category B (Designer 4-Panel)</option>
                  <option value="C">Category C (Deep Carved)</option>
                  <option value="D">Category D (Minimalist Oak)</option>
                  <option value="E">Category E (Ultra Luxury Villa)</option>
                  <option value="CUSTOM">Custom Category</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Model Title / Finish Description</label>
                <input
                  type="text"
                  placeholder="e.g. Natural Teak Premium Classic Molded"
                  value={newModelTitle}
                  onChange={(e) => setNewModelTitle(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-medium"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsAddModelOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-400 hover:text-white rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveNewModel}
                disabled={!newModelCode.trim()}
                className="px-4 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-bold text-xs shadow cursor-pointer disabled:opacity-50"
              >
                Save &amp; Apply to All Doors
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Scoped Print Isolation & Top-Left Sheet Alignment for 12L / 4"x2" Thermal */}
      <style jsx global>{`
        @media print {
          @page {
            size: ${printFormat === 'THERMAL' ? '4in 2in' : 'A4 portrait'};
            margin: 0mm;
          }
          body:has(#stickerPrintCanvas) .printable-modal-root {
            position: static !important;
            display: block !important;
            align-items: flex-start !important;
            justify-content: flex-start !important;
            padding: 0 !important;
            margin: 0 !important;
          }
          #stickerPrintCanvas,
          #stickerPrintCanvas * {
            visibility: visible !important;
          }
          #stickerPrintCanvas {
            position: static !important;
            width: 100% !important;
            margin: 0 !important;
            padding: 0 !important;
            background: white !important;
            display: block !important;
          }
        }
      `}</style>
    </div>
  );
}
