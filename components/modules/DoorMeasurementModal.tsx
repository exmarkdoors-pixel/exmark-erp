'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Ruler,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Info,
  Save,
  Send,
  Building2,
  ShieldAlert,
  Check,
  Copy,
  Mic,
  Camera,
  Sliders,
  Sparkles,
  Cloud,
  FileText,
  Share2,
  Download,
  Smartphone,
  Monitor,
  Eye,
  FolderOpen,
  Zap,
  Upload,
  FileSpreadsheet,
} from 'lucide-react';
import { DoorItemInput, SiteMeasurementRecord, MeasurementUnit } from '@/types/measurements';
import { CatalogMaster, DoorModelCatalogItem, ColourCatalogItem, LockCatalogItem, DEFAULT_CATALOG } from '@/types/catalog';
import { parseCsvRows, parseOpeningsCsv, getSampleCsvTemplate } from '@/lib/utils/bulkUploadParser';
import { CatalogManagerModal } from './catalog/CatalogManagerModal';
import { AutoQuotationModal } from './measurements/AutoQuotationModal';
import { useProductCategories } from '@/lib/context/ProductCategoryContext';

interface DoorMeasurementModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (record: SiteMeasurementRecord) => void;
  initialRecord?: SiteMeasurementRecord | null;
  userRole?: string;
}

const KERALA_DISTRICTS = [
  'Kozhikode',
  'Ernakulam',
  'Thrissur',
  'Kannur',
  'Malappuram',
  'Palakkad',
  'Kottayam',
  'Trivandrum',
  'Wayanad',
  'Kollam',
  'Alappuzha',
  'Kasaragod',
  'Pathanamthitta',
  'Idukki',
];

interface ModelPreset {
  id: string;
  name: string;
  category: string;
  basePrice: number;
}

const DOOR_MODELS_CATALOG: ModelPreset[] = [
  { id: 'EXM-A-100', name: 'EXM-A-100 (₹7000)', category: 'Bath FRP Door', basePrice: 7000 },
  { id: 'EXM-A-101', name: 'EXM-A-101 Premium Molded (₹7500)', category: 'Bath FRP Door', basePrice: 7500 },
  { id: 'EXM-B-200', name: 'EXM-B-200 Teak Woodgrain (₹8200)', category: 'Bed Room Door', basePrice: 8200 },
  { id: 'EXM-D-300', name: 'EXM-D-300 Luxury CNC Main (₹9500)', category: 'Main Entry Door', basePrice: 9500 },
  { id: 'EXM-K-150', name: 'EXM-K-150 Kitchen Moisture-Shield (₹7200)', category: 'Kitchen Door', basePrice: 7200 },
  { id: 'EXM-W-400', name: 'EXM-W-400 Commercial Heavy-Duty (₹8800)', category: 'Commercial Door', basePrice: 8800 },
];

const SIZE_PRESETS = [
  { id: 'mini', name: 'Mini Size (72×50)', heightInch: 72, widthInch: 50, heightCm: 182.9, widthCm: 127.0, heightMm: 1829, widthMm: 1270 },
  { id: 'standard_bath', name: 'Standard Bath (80×30)', heightInch: 80, widthInch: 30, heightCm: 203.2, widthCm: 76.2, heightMm: 2032, widthMm: 762 },
  { id: 'standard_bed', name: 'Standard Bed (80×32)', heightInch: 80, widthInch: 32, heightCm: 203.2, widthCm: 81.3, heightMm: 2032, widthMm: 813 },
  { id: 'main_single', name: 'Main Single (84×38)', heightInch: 84, widthInch: 38, heightCm: 213.4, widthCm: 96.5, heightMm: 2134, widthMm: 965 },
  { id: 'custom', name: 'Custom Masonry Opening', heightInch: 0, widthInch: 0, heightCm: 0, widthCm: 0, heightMm: 0, widthMm: 0 },
];

const FRAME_TYPES = [
  'WPC Solid Extruded 100x65mm Frame',
  'FRP Wrap-Around Monolithic Frame',
  'Granite Subframe (Tile / Marble Rebate)',
  'Existing Wooden Rebate Refit',
  'No Frame (Shutter Only - Pre-hung)',
];

const COLOURS = [
  'Natural Teak (EXGC-510)',
  'Burma Teak (Woodgrain PU)',
  'Frost White (High Gloss Waterproof)',
  'Natural Teak Gold (Matte UV)',
  'Walnut Dark Brown',
  'Rosewood Classical Kerala Finish',
  'Mahogany Antique',
];

const HINGE_SIDES = [
  'Left Hand (LH) - Inward',
  'Right Hand (RH) - Inward',
  'Left Hand Reverse (LHR)',
  'Right Hand Reverse (RHR)',
];

const LOCK_OPTIONS = [
  { id: 'baby_latch', name: 'Baby Latch (+₹200)', price: 200 },
  { id: 'mortise_brass', name: 'Mortise Lock 60mm (+₹850)', price: 850 },
  { id: 'cylindrical_knob', name: 'SS Cylindrical Knob (+₹450)', price: 450 },
  { id: 'deadbolt', name: 'Deadbolt & Tower Bolt (+₹300)', price: 300 },
  { id: 'digital_prep', name: 'Digital Smart Lock Prep (+₹600)', price: 600 },
  { id: 'none', name: 'No Lock / Handle Routing Prep (₹0)', price: 0 },
];

const FRACTIONS = [
  { label: '+ 0/8 (No Frac)', value: 0, str: '0/8' },
  { label: '+ 1/8"', value: 0.125, str: '1/8' },
  { label: '+ 2/8" (1/4")', value: 0.25, str: '2/8' },
  { label: '+ 3/8"', value: 0.375, str: '3/8' },
  { label: '+ 4/8" (1/2")', value: 0.5, str: '4/8' },
  { label: '+ 5/8"', value: 0.625, str: '5/8' },
  { label: '+ 6/8" (3/4")', value: 0.75, str: '6/8' },
  { label: '+ 7/8"', value: 0.875, str: '7/8' },
];

function parseFraction(fracStr?: string): number {
  if (!fracStr || fracStr.includes('0/8') || fracStr === '0') return 0;
  if (fracStr.includes('1/8')) return 1 / 8;
  if (fracStr.includes('2/8') || fracStr.includes('1/4')) return 2 / 8;
  if (fracStr.includes('3/8')) return 3 / 8;
  if (fracStr.includes('4/8') || fracStr.includes('1/2')) return 4 / 8;
  if (fracStr.includes('5/8')) return 5 / 8;
  if (fracStr.includes('6/8') || fracStr.includes('3/4')) return 6 / 8;
  if (fracStr.includes('7/8')) return 7 / 8;
  return 0;
}

function decimalToInchWithFraction(decimalInches: number): { whole: number; fraction: string } {
  const whole = Math.floor(decimalInches);
  const remainder = decimalInches - whole;
  const eighths = Math.round(remainder * 8);
  if (eighths === 0) return { whole, fraction: '0/8' };
  if (eighths === 8) return { whole: whole + 1, fraction: '0/8' };
  return { whole, fraction: `${eighths}/8` };
}

// Convert door dimensions smoothly when unit changes
function convertDoorUnit(door: DoorItemInput, targetUnit: MeasurementUnit): DoorItemInput {
  const currentUnit = door.measurementUnit || 'CM';
  if (currentUnit === targetUnit) return door;

  // 1. Convert current dimensions to millimeters
  const toMm = (val: number, fracStr?: string): number => {
    if (currentUnit === 'INCH') {
      return (val + parseFraction(fracStr)) * 25.4;
    }
    if (currentUnit === 'CM') {
      return val * 10;
    }
    return val; // MM
  };

  const hLMm = toMm(door.heightLeft, door.fractionHeightLeft);
  const hRMm = toMm(door.heightRight, door.fractionHeightRight);
  const wTMm = toMm(door.widthTop, door.fractionWidthTop);
  const wBMm = toMm(door.widthBottom, door.fractionWidthBottom);

  // 2. Convert millimeters to target unit
  if (targetUnit === 'INCH') {
    const hl = decimalToInchWithFraction(hLMm / 25.4);
    const hr = decimalToInchWithFraction(hRMm / 25.4);
    const wt = decimalToInchWithFraction(wTMm / 25.4);
    const wb = decimalToInchWithFraction(wBMm / 25.4);

    return {
      ...door,
      measurementUnit: 'INCH',
      heightLeft: hl.whole,
      fractionHeightLeft: hl.fraction,
      heightRight: hr.whole,
      fractionHeightRight: hr.fraction,
      widthTop: wt.whole,
      fractionWidthTop: wt.fraction,
      widthBottom: wb.whole,
      fractionWidthBottom: wb.fraction,
    };
  }

  if (targetUnit === 'CM') {
    return {
      ...door,
      measurementUnit: 'CM',
      heightLeft: Number((hLMm / 10).toFixed(1)),
      fractionHeightLeft: '0/8',
      heightRight: Number((hRMm / 10).toFixed(1)),
      fractionHeightRight: '0/8',
      widthTop: Number((wTMm / 10).toFixed(1)),
      fractionWidthTop: '0/8',
      widthBottom: Number((wBMm / 10).toFixed(1)),
      fractionWidthBottom: '0/8',
    };
  }

  // Target MM
  return {
    ...door,
    measurementUnit: 'MM',
    heightLeft: Math.round(hLMm),
    fractionHeightLeft: '0/8',
    heightRight: Math.round(hRMm),
    fractionHeightRight: '0/8',
    widthTop: Math.round(wTMm),
    fractionWidthTop: '0/8',
    widthBottom: Math.round(wBMm),
    fractionWidthBottom: '0/8',
  };
}

// Compute live Sq.Ft, Frame R.Ft, and dynamic price
function calculateDoorMetrics(door: DoorItemInput) {
  const unit = door.measurementUnit || 'CM';
  let hL = door.heightLeft || 0;
  let hR = door.heightRight || 0;
  let wT = door.widthTop || 0;
  let wB = door.widthBottom || 0;

  if (unit === 'INCH') {
    hL = (hL + parseFraction(door.fractionHeightLeft)) * 25.4;
    hR = (hR + parseFraction(door.fractionHeightRight)) * 25.4;
    wT = (wT + parseFraction(door.fractionWidthTop)) * 25.4;
    wB = (wB + parseFraction(door.fractionWidthBottom)) * 25.4;
  } else if (unit === 'CM') {
    hL = hL * 10;
    hR = hR * 10;
    wT = wT * 10;
    wB = wB * 10;
  }

  const avgH = (hL + hR) / 2;
  const avgW = (wT + wB) / 2;

  // Sq.Ft = (avgH * avgW) / 92903.04 mm²
  const sqFt = avgH > 0 && avgW > 0 ? Number(((avgH * avgW) / 92903.04).toFixed(2)) : 0;

  // Frame Running Feet = (2 * avgH + avgW) / 304.8 mm
  const frameRft = avgH > 0 ? Math.round(((2 * avgH) + avgW) / 304.8) : 0;

  // Pricing
  const basePrice = door.basePrice ?? 7000;
  const lockPrice = door.lockPrice ?? 200;
  const priceAdj = door.priceAdjustment ?? 300;
  const unitPrice = Math.max(0, basePrice + lockPrice + priceAdj);
  const qty = door.quantity || 1;
  const lineTotal = unitPrice * qty;

  return { sqFt, frameRft, unitPrice, lineTotal };
}

// DEFAULT OPENING WITH CM AS DEFAULT (as specified in request)
const DEFAULT_DOOR: DoorItemInput = {
  doorNumber: '#D1',
  categoryName: 'Bath FRP Door',
  model: 'EXM-A-100 (₹7000)',
  sizePreset: 'Standard Bed (80×32)',
  frameType: 'WPC Solid Extruded 100x65mm Frame',
  colour: 'Natural Teak (EXGC-510)',
  insideColour: 'Natural Teak (EXGC-510)',
  hingeSide: 'Left Hand (LH) - Inward',
  lockType: 'Baby Latch (+₹200)',
  lockPrice: 200,
  measurementUnit: 'CM', // DEFAULT IS CM!
  heightLeft: 203.2,
  heightRight: 203.2,
  widthTop: 81.3,
  widthBottom: 81.3,
  fractionHeightLeft: '0/8',
  fractionHeightRight: '0/8',
  fractionWidthTop: '0/8',
  fractionWidthBottom: '0/8',
  quantity: 1,
  wallThickness: '150mm',
  rebateDepth: '38mm',
  basePrice: 7000,
  priceAdjustment: 300,
  unitPrice: 7500,
  pricingMode: 'PIECE',
  calculatedSqFt: 17.78,
  calculatedFrameRft: 16,
  remarks: '',
  photoCount: 0,
};

export function DoorMeasurementModal({
  isOpen,
  onClose,
  onSaved,
  initialRecord,
  userRole = 'Super Admin',
}: DoorMeasurementModalProps) {
  if (!isOpen) return null;

  return (
    <DoorMeasurementModalContent
      key={initialRecord ? initialRecord.id : 'new-site-entry'}
      onClose={onClose}
      onSaved={onSaved}
      initialRecord={initialRecord}
      userRole={userRole}
    />
  );
}

export default DoorMeasurementModal;

function DoorMeasurementModalContent({
  onClose,
  onSaved,
  initialRecord,
  userRole = 'Super Admin',
}: Omit<DoorMeasurementModalProps, 'isOpen'>) {
  const { isWpcEnabled } = useProductCategories();
  const isEditing = Boolean(initialRecord?.id);

  // Global Unit for site (default: 'CM')
  const [globalUnit, setGlobalUnit] = useState<MeasurementUnit>(() => {
    if (initialRecord?.doors && initialRecord.doors[0]?.measurementUnit) {
      return initialRecord.doors[0].measurementUnit;
    }
    return 'CM'; // Default is CM as requested
  });

  // Header state
  const [refNumber] = useState(
    () => initialRecord?.refNumber || `MSR-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`
  );
  const [customerName, setCustomerName] = useState(
    initialRecord?.customerName ?? 'Malabar Luxury Builders, Kozhikode'
  );
  const [orderRef, setOrderRef] = useState(initialRecord?.orderRef ?? 'EXM-2026-1082');
  const [siteName, setSiteName] = useState(initialRecord?.siteName ?? 'Skyline Villa Project, Kakkanad');
  const [siteAddress, setSiteAddress] = useState(initialRecord?.siteAddress ?? 'Near Infopark Expressway, Kochi');
  const [district, setDistrict] = useState(initialRecord?.district ?? 'Ernakulam');
  const [engineerName, setEngineerName] = useState(
    initialRecord?.engineerName ?? 'Anoop Krishnan (Sr. Site Engineer)'
  );
  const [date, setDate] = useState(initialRecord?.date || new Date().toISOString().split('T')[0]);
  const [rebateDepthMm, setRebateDepthMm] = useState(initialRecord?.rebateDepthMm || '38mm');
  const [wallThicknessMm, setWallThicknessMm] = useState(initialRecord?.wallThicknessMm || '150mm');
  const [notes, setNotes] = useState(initialRecord?.notes || '');
  const [status] = useState<'DRAFT' | 'VERIFIED' | 'APPROVED' | 'SENT_TO_PRODUCTION'>(
    initialRecord?.status || 'DRAFT'
  );

  // Doors list
  const [doors, setDoors] = useState<DoorItemInput[]>(() => {
    if (initialRecord?.doors && initialRecord.doors.length > 0) {
      return initialRecord.doors.map((d, idx) => ({
        ...DEFAULT_DOOR,
        ...d,
        doorNumber: d.doorNumber || `#D${idx + 1}`,
      }));
    }
    return [{ ...DEFAULT_DOOR }];
  });

  // Active door tab index
  const [activeDoorTab, setActiveDoorTab] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const currentDoor = doors[activeDoorTab] || doors[0] || DEFAULT_DOOR;
  const metrics = calculateDoorMetrics(currentDoor);

  // Dynamic Catalog State
  const [catalog, setCatalog] = useState<CatalogMaster>(DEFAULT_CATALOG);
  const [isCatalogModalOpen, setIsCatalogModalOpen] = useState(false);
  const [isAutoQuotationOpen, setIsAutoQuotationOpen] = useState(false);
  const [isBulkOpeningsOpen, setIsBulkOpeningsOpen] = useState(false);
  const [bulkOpeningsText, setBulkOpeningsText] = useState('');
  const [bulkPreviewDoors, setBulkPreviewDoors] = useState<DoorItemInput[]>([]);
  const [bulkErrors, setBulkErrors] = useState<string[]>([]);

  // Load latest catalog from database/store
  useEffect(() => {
    fetch('/api/catalog')
      .then((r) => r.json())
      .then((data) => {
        if (data.success && data.data) {
          setCatalog(data.data);
        }
      })
      .catch((err) => {
        console.warn('Could not fetch dynamic catalog, using defaults:', err);
      });
  }, []);

  // Switch Unit for entire site sheet & active door
  const handleUnitSwitch = (newUnit: MeasurementUnit) => {
    if (newUnit === globalUnit) return;
    setGlobalUnit(newUnit);

    const converted = doors.map((d) => convertDoorUnit(d, newUnit));
    setDoors(converted);
    setSuccessToast(`Switched unit to ${newUnit}. Dimensions converted.`);
    setTimeout(() => setSuccessToast(null), 3000);
  };

  // Door field change
  const handleDoorChange = <K extends keyof DoorItemInput>(field: K, value: DoorItemInput[K]) => {
    const updated = [...doors];
    const target = { ...updated[activeDoorTab], [field]: value };

    // Auto-update price when basePrice, lockPrice, or priceAdjustment changes
    if (field === 'model') {
      const found = catalog.models.find((m) => m.name === value || m.code === value || m.id === value);
      if (found) {
        target.basePrice = found.basePrice;
        if (found.category) target.categoryName = found.category;
      }
    } else if (field === 'lockType') {
      const found = catalog.locks.find((l) => l.name === value || l.id === value);
      if (found) target.lockPrice = found.price;
    }

    const newMetrics = calculateDoorMetrics(target);
    target.calculatedSqFt = newMetrics.sqFt;
    target.calculatedFrameRft = newMetrics.frameRft;
    target.unitPrice = newMetrics.unitPrice;

    updated[activeDoorTab] = target;
    setDoors(updated);
  };

  // Bulk Openings Upload Handlers
  const handleParseOpeningsCsv = (csvText: string) => {
    setBulkOpeningsText(csvText);
    const rows = parseCsvRows(csvText);
    const { doors: parsedDoors, errors } = parseOpeningsCsv(rows);
    setBulkPreviewDoors(parsedDoors);
    setBulkErrors(errors);
  };

  const handleOpeningsFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) handleParseOpeningsCsv(content);
    };
    reader.readAsText(file);
  };

  const handleDownloadOpeningsTemplate = () => {
    const template = getSampleCsvTemplate('OPENINGS');
    const blob = new Blob([template], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'door-openings-template.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleImportOpenings = () => {
    if (bulkPreviewDoors.length === 0) return;
    const updated = [...doors];
    bulkPreviewDoors.forEach((newD) => {
      const existingIdx = updated.findIndex((d) => d.doorNumber === newD.doorNumber);
      if (existingIdx >= 0) {
        updated[existingIdx] = newD;
      } else {
        updated.push(newD);
      }
    });
    setDoors(updated);
    setSuccessToast(`Imported ${bulkPreviewDoors.length} door openings from spreadsheet.`);
    setIsBulkOpeningsOpen(false);
    setBulkOpeningsText('');
    setBulkPreviewDoors([]);
    setBulkErrors([]);
  };

  // Quick Price Stepper ([-100], [+100])
  const handleAdjustPrice = (delta: number) => {
    const currentAdj = currentDoor.priceAdjustment || 0;
    const newAdj = currentAdj + delta;
    handleDoorChange('priceAdjustment', newAdj);
  };

  // Direct Unit Price Edit
  const handleDirectPriceChange = (val: number) => {
    const base = currentDoor.basePrice || 7000;
    const lock = currentDoor.lockPrice || 200;
    const newAdj = val - (base + lock);
    handleDoorChange('priceAdjustment', newAdj);
  };

  // Size Preset selection
  const handleSizePresetSelect = (presetId: string) => {
    const preset = SIZE_PRESETS.find((p) => p.id === presetId);
    if (!preset || preset.id === 'custom') return;

    const unit = currentDoor.measurementUnit || 'CM';
    if (unit === 'INCH') {
      handleDoorChange('heightLeft', preset.heightInch);
      handleDoorChange('heightRight', preset.heightInch);
      handleDoorChange('widthTop', preset.widthInch);
      handleDoorChange('widthBottom', preset.widthInch);
      handleDoorChange('fractionHeightLeft', '0/8');
      handleDoorChange('fractionHeightRight', '0/8');
      handleDoorChange('fractionWidthTop', '0/8');
      handleDoorChange('fractionWidthBottom', '0/8');
    } else if (unit === 'CM') {
      handleDoorChange('heightLeft', preset.heightCm);
      handleDoorChange('heightRight', preset.heightCm);
      handleDoorChange('widthTop', preset.widthCm);
      handleDoorChange('widthBottom', preset.widthCm);
    } else {
      handleDoorChange('heightLeft', preset.heightMm);
      handleDoorChange('heightRight', preset.heightMm);
      handleDoorChange('widthTop', preset.widthMm);
      handleDoorChange('widthBottom', preset.widthMm);
    }
    handleDoorChange('sizePreset', preset.name);
  };

  // Add opening
  const handleAddDoor = () => {
    const nextIdx = doors.length + 1;
    const newDoor: DoorItemInput = {
      ...DEFAULT_DOOR,
      doorNumber: `#D${nextIdx}`,
      measurementUnit: globalUnit,
    };
    const converted = convertDoorUnit(newDoor, globalUnit);
    setDoors([...doors, converted]);
    setActiveDoorTab(doors.length);
  };

  // Duplicate active door
  const handleDuplicateDoor = () => {
    const nextIdx = doors.length + 1;
    const duplicate: DoorItemInput = {
      ...currentDoor,
      id: undefined,
      doorNumber: `#D${nextIdx}`,
    };
    setDoors([...doors, duplicate]);
    setActiveDoorTab(doors.length);
    setSuccessToast(`Duplicated ${currentDoor.doorNumber} as #D${nextIdx}`);
    setTimeout(() => setSuccessToast(null), 3000);
  };

  // Remove opening
  const handleRemoveDoor = (index: number) => {
    if (doors.length <= 1) {
      alert('A site measurement must contain at least one door opening.');
      return;
    }
    const updated = doors.filter((_, i) => i !== index);
    setDoors(updated);
    setActiveDoorTab(Math.max(0, activeDoorTab - 1));
  };

  // Save to backend
  const handleSave = async (targetStatus: 'DRAFT' | 'VERIFIED') => {
    setErrorMsg('');
    setIsSubmitting(true);

    try {
      const payload = {
        refNumber,
        customerName,
        orderRef,
        siteName,
        siteAddress,
        district,
        engineerName,
        date,
        rebateDepthMm,
        wallThicknessMm,
        notes,
        status: targetStatus,
        doors,
      };

      const url = isEditing
        ? `/api/measurements/${initialRecord?.id}`
        : '/api/measurements';
      const method = isEditing ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save site measurement.');
      }

      onSaved(data.data || { ...payload, id: initialRecord?.id || `dm-${Date.now()}` });
      onClose();
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : 'Error saving record.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-5xl bg-[#070D1E] border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[96vh]">
        {/* TOP STATUS & NAVIGATION BAR (matching screenshot reference) */}
        <div className="bg-[#0B132B] border-b border-slate-800 p-2 sm:p-3 space-y-2">
          {/* Row 1: System action pills */}
          <div className="flex flex-wrap items-center justify-between gap-1.5 sm:gap-2">
            <div className="flex items-center gap-1.5 flex-wrap">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center font-black text-white text-xs shadow-md">
                eM
              </div>
              <span className="text-[10px] font-bold text-slate-400 hidden xs:inline">
                e... T...
              </span>

              {/* Saved Parties */}
              <button
                type="button"
                onClick={() => alert(`Saved Customer: ${customerName}\nDistrict: ${district}\nSite: ${siteName}`)}
                className="px-2 py-1 rounded-md bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
              >
                <FolderOpen className="w-3 h-3 text-amber-400" />
                <span>Saved Parties</span>
              </button>

              {/* Cloud Status */}
              <div className="flex items-center gap-0.5">
                <span className="px-2 py-1 rounded-l-md bg-emerald-500/20 text-emerald-300 border-y border-l border-emerald-500/40 text-[11px] font-bold inline-flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  ON
                </span>
                <span className="px-2 py-1 rounded-r-md bg-blue-600/30 text-blue-300 border-y border-r border-blue-500/40 text-[11px] font-bold inline-flex items-center gap-1">
                  <Cloud className="w-3 h-3 text-blue-400" />
                  Cloud
                </span>
              </div>

              {/* Download APK */}
              <a
                href="/dist/EXMARK-ERP-Mobile-debug.apk"
                download="EXMARK-ERP-Mobile-debug.apk"
                className="px-2 py-1 rounded-md bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] inline-flex items-center gap-1 cursor-pointer transition-colors"
                title="Download Native Mobile Android APK (4.12MB)"
              >
                <Download className="w-3 h-3" />
                <span>Download APK</span>
              </a>

              {/* APK Studio */}
              <button
                type="button"
                onClick={() => alert('APK Studio Terminal: Adoptium JDK 17 & Android SDK 34 Ready')}
                className="px-2 py-1 rounded-md bg-slate-800/80 hover:bg-slate-700 text-amber-300 border border-amber-500/30 text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer hidden md:inline-flex"
              >
                <Smartphone className="w-3 h-3 text-amber-400" />
                <span>APK Studio</span>
              </button>

              {/* WA PDF */}
              <button
                type="button"
                onClick={() => alert(`Generating WhatsApp PDF for ${customerName} (${refNumber})...`)}
                className="px-2 py-1 rounded-md bg-emerald-600/30 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/40 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
              >
                <Share2 className="w-3 h-3 text-emerald-400" />
                <span>WA PDF</span>
              </button>

              {/* Auto Quotation */}
              <button
                type="button"
                onClick={() => setIsAutoQuotationOpen(true)}
                className="px-2 py-1 rounded-md bg-gradient-to-r from-emerald-600/30 to-teal-600/30 hover:from-emerald-600/50 hover:to-teal-600/50 text-emerald-300 border border-emerald-500/40 text-[11px] font-black inline-flex items-center gap-1 cursor-pointer"
                title="Auto-Generate Formal GST Quotation (Per Piece or Per Sq.Ft)"
              >
                <Zap className="w-3 h-3 text-emerald-400" />
                <span>Auto Quote</span>
              </button>

              {/* Catalog Master */}
              <button
                type="button"
                onClick={() => setIsCatalogModalOpen(true)}
                className="px-2 py-1 rounded-md bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/40 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
                title="Manage Models, Colours & Locks (Add, Edit, Delete, Bulk CSV)"
              >
                <Sliders className="w-3 h-3 text-amber-400" />
                <span>Catalog Master</span>
              </button>

              {/* Save */}
              <button
                type="button"
                onClick={() => handleSave('VERIFIED')}
                disabled={isSubmitting}
                className="px-2 py-1 rounded-md bg-teal-600/30 hover:bg-teal-600/40 text-teal-300 border border-teal-500/40 text-[11px] font-bold inline-flex items-center gap-1 cursor-pointer"
              >
                <Save className="w-3 h-3 text-teal-400" />
                <span>Save</span>
              </button>

              {/* Desktop UI */}
              <button
                type="button"
                onClick={() => alert('Desktop Electron UI Active & Synced with Cloud Workspace')}
                className="px-2 py-1 rounded-md bg-cyan-600/20 hover:bg-cyan-600/30 text-cyan-300 border border-cyan-500/30 text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer hidden sm:inline-flex"
              >
                <Monitor className="w-3 h-3 text-cyan-400" />
                <span>Desktop UI</span>
              </button>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors ml-auto"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Row 2: Segmented Unit Selector [ cm ] [ Inch ] [ mm ] + Party & Profit Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-slate-800/80">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Segmented Unit Buttons: [ cm ] [ Inch ] [ mm ] (cm is default) */}
              <div className="inline-flex p-0.5 rounded-lg bg-[#070D1E] border border-slate-700/80 shadow-inner">
                {(['CM', 'INCH', 'MM'] as const).map((unit) => {
                  const isSelected = globalUnit === unit;
                  return (
                    <button
                      key={unit}
                      type="button"
                      onClick={() => handleUnitSwitch(unit)}
                      className={`px-3 py-1 rounded-md text-xs font-black transition-all cursor-pointer ${
                        isSelected
                          ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                          : 'text-slate-300 hover:text-white hover:bg-slate-800/80'
                      }`}
                    >
                      {unit === 'INCH' ? 'Inch' : unit.toLowerCase()}
                    </button>
                  );
                })}
              </div>

              {/* + New Party (All 0) */}
              <button
                type="button"
                onClick={handleAddDoor}
                className="px-2.5 py-1 rounded-lg bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/30 border border-emerald-500/40 text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>+ New Party (All {doors.length})</span>
              </button>

              {/* Profit +0% */}
              <button
                type="button"
                onClick={() => alert('Gross margin profit target: +0% (Cost markup: Standard Dealer Rate)')}
                className="px-2 py-0.5 rounded bg-blue-500/10 text-blue-400 border border-blue-500/20 text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer"
              >
                <Eye className="w-3 h-3" />
                <span>Profit +0%</span>
              </button>

              {/* Offline AI + WPC Sheet */}
              <button
                type="button"
                onClick={() => alert('Offline AI Assistant + WPC Cutting Deduction Sheet active.')}
                className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[11px] font-semibold inline-flex items-center gap-1 cursor-pointer hidden sm:inline-flex"
              >
                <Sliders className="w-3 h-3 text-amber-400" />
                <span>Offline AI + WPC Sheet</span>
              </button>
            </div>

            {/* Right: Quantity & Grand Total */}
            <div className="px-3 py-1 bg-emerald-500/15 border border-emerald-500/30 rounded-lg text-xs font-bold text-emerald-400">
              {doors.reduce((acc, d) => acc + (d.quantity || 1), 0)} pcs &bull; ₹{doors.reduce((acc, d) => acc + (d.unitPrice || 7500) * (d.quantity || 1), 0).toLocaleString('en-IN')}
            </div>
          </div>
        </div>

        {/* TOAST MESSAGE */}
        {successToast && (
          <div className="px-4 py-2 bg-emerald-500/20 border-b border-emerald-500/30 text-emerald-300 text-xs font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>{successToast}</span>
          </div>
        )}

        {/* ERROR MESSAGE */}
        {errorMsg && (
          <div className="px-4 py-2 bg-red-500/20 border-b border-red-500/30 text-red-300 text-xs font-medium flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-red-400" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* BODY CONTAINER (SCROLLABLE) */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1 custom-scrollbar">
          {/* DOOR OPENING TABS RAIL */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-800/80">
            {doors.map((door, idx) => {
              const isActive = activeDoorTab === idx;
              return (
                <button
                  key={idx}
                  type="button"
                  onClick={() => setActiveDoorTab(idx)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-black transition-all flex items-center gap-2 cursor-pointer ${
                    isActive
                      ? 'bg-amber-500 text-slate-950 shadow-md font-black'
                      : 'bg-[#0B132B] text-slate-300 border border-slate-800 hover:text-white'
                  }`}
                >
                  <span>{door.doorNumber || `#D${idx + 1}`}</span>
                  {doors.length > 1 && (
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRemoveDoor(idx);
                      }}
                      className="hover:text-red-600 transition-colors"
                      title="Remove Opening"
                    >
                      <Trash2 className="w-3 h-3" />
                    </span>
                  )}
                </button>
              );
            })}

            <button
              type="button"
              onClick={handleAddDoor}
              className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 cursor-pointer"
              title="Add Door Opening"
            >
              <Plus className="w-4 h-4" />
            </button>

            {/* Bulk Upload Door Openings (CSV / Excel) */}
            <button
              type="button"
              onClick={() => setIsBulkOpeningsOpen(true)}
              className="px-2.5 py-1.5 rounded-xl bg-cyan-950/40 text-cyan-300 hover:bg-cyan-900/40 border border-cyan-500/40 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer ml-auto"
              title="Bulk Upload Door Openings via CSV / Excel"
            >
              <Upload className="w-3.5 h-3.5 text-cyan-400" />
              <span>Bulk Upload Openings</span>
            </button>
          </div>

          {/* MAIN FIELD TERMINAL CARD (MATCHING SCREENSHOT) */}
          <div className="bg-[#0B132B] border border-slate-800/90 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xl">
            {/* Header: 3D preview badge + #D1 · Sq.Ft · Frame R.Ft + Price */}
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-12 h-14 bg-gradient-to-b from-amber-600 to-orange-700 rounded-lg border border-amber-400/40 flex flex-col items-center justify-center text-[10px] font-black text-white shadow-md">
                  <span>FRP</span>
                  <span className="text-[8px] opacity-80">3D/AI</span>
                </div>
                <div>
                  <div className="text-sm sm:text-base font-black text-amber-400 flex items-center gap-2">
                    <span>{currentDoor.doorNumber || '#D1'}</span>
                    <span className="text-slate-400">&bull;</span>
                    <span>{metrics.sqFt} Sq.Ft</span>
                    <span className="text-slate-400">&bull;</span>
                    <span>Frame {metrics.frameRft} R.Ft</span>
                  </div>
                  <div className="text-xs text-slate-400">
                    Standard 4-Point Masonry Opening &bull; 100% FRP Hydraulic Molding Press
                  </div>
                </div>
              </div>

              <div className="text-right">
                <div className="text-xl sm:text-2xl font-black text-emerald-400 tracking-tight">
                  ₹{metrics.unitPrice.toLocaleString('en-IN')}
                </div>
                <div className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                  Unit Net Price ({currentDoor.pricingMode || 'Piece Mode'})
                </div>
              </div>
            </div>

            {/* Row 1: Door Description / Category */}
            <div>
              <input
                type="text"
                value={currentDoor.categoryName || 'Bath FRP Door'}
                onChange={(e) => handleDoorChange('categoryName', e.target.value)}
                placeholder="e.g. Bath FRP Door / Master Bed / Main Entry"
                className="w-full px-3 py-2 bg-[#070D1E] text-white font-bold text-sm rounded-xl border border-slate-700 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Row 2: Model & Base Price + Size Preset Dropdown */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Model Code & Base Rate
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsCatalogModalOpen(true)}
                    className="text-[10px] text-amber-400 hover:underline font-bold inline-flex items-center gap-0.5 cursor-pointer"
                  >
                    <Sliders className="w-2.5 h-2.5" />
                    <span>Manage Models</span>
                  </button>
                </div>
                <select
                  value={currentDoor.model}
                  onChange={(e) => handleDoorChange('model', e.target.value)}
                  className="w-full px-3 py-2 bg-[#070D1E] text-white font-bold text-xs rounded-xl border border-slate-700 focus:outline-none focus:border-amber-500"
                >
                  {catalog.models.map((m) => (
                    <option key={m.id} value={m.name}>
                      {m.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Standard Size Preset
                </label>
                <select
                  value={currentDoor.sizePreset || 'Standard Bed (80×32)'}
                  onChange={(e) => handleSizePresetSelect(e.target.value)}
                  className="w-full px-3 py-2 bg-[#070D1E] text-white font-bold text-xs rounded-xl border border-slate-700 focus:outline-none focus:border-amber-500"
                >
                  {SIZE_PRESETS.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 4-POINT MEASUREMENT CARDS (H-LEFT, H-RIGHT, W-TOP, W-BOT, QTY) */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-black text-slate-300 uppercase tracking-wider">
                  Masonry Opening 4-Point Measurements ({globalUnit})
                </span>
                <span className="text-[11px] text-amber-400 font-semibold">
                  Active Mode: {globalUnit === 'CM' ? 'Centimeters (cm)' : globalUnit === 'INCH' ? 'Inches with 1/8" Fractions' : 'Millimeters (mm)'}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                {/* 1. H-LEFT */}
                <div className="bg-[#070D1E] p-2.5 rounded-xl border border-slate-700/80 space-y-1">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">
                    H-LEFT ({globalUnit})
                  </div>
                  <input
                    type="number"
                    step={globalUnit === 'CM' ? '0.1' : '1'}
                    required
                    value={currentDoor.heightLeft || ''}
                    onChange={(e) => handleDoorChange('heightLeft', parseFloat(e.target.value) || 0)}
                    className="w-full text-center py-1 bg-transparent text-white font-black text-lg focus:outline-none"
                  />
                  {globalUnit === 'INCH' && (
                    <select
                      value={currentDoor.fractionHeightLeft || '0/8'}
                      onChange={(e) => handleDoorChange('fractionHeightLeft', e.target.value)}
                      className="w-full text-center py-1 bg-[#0B132B] text-rose-300 text-[11px] font-bold rounded border border-rose-500/30 focus:outline-none"
                    >
                      {FRACTIONS.map((f) => (
                        <option key={f.str} value={f.str}>
                          {f.label}
                        </option>
                      ))}
                    </select>
                  )}
                  {globalUnit !== 'INCH' && (
                    <div className="text-[10px] text-slate-500 text-center">
                      {globalUnit === 'CM' ? `${(currentDoor.heightLeft * 10).toFixed(0)} mm` : `${(currentDoor.heightLeft / 10).toFixed(1)} cm`}
                    </div>
                  )}
                </div>

                {/* 2. H-RIGHT */}
                <div className="bg-[#070D1E] p-2.5 rounded-xl border border-slate-700/80 space-y-1">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">
                    H-RIGHT ({globalUnit})
                  </div>
                  <input
                    type="number"
                    step={globalUnit === 'CM' ? '0.1' : '1'}
                    required
                    value={currentDoor.heightRight || ''}
                    onChange={(e) => handleDoorChange('heightRight', parseFloat(e.target.value) || 0)}
                    className="w-full text-center py-1 bg-transparent text-white font-black text-lg focus:outline-none"
                  />
                  {globalUnit === 'INCH' && (
                    <select
                      value={currentDoor.fractionHeightRight || '0/8'}
                      onChange={(e) => handleDoorChange('fractionHeightRight', e.target.value)}
                      className="w-full text-center py-1 bg-[#0B132B] text-rose-300 text-[11px] font-bold rounded border border-rose-500/30 focus:outline-none"
                    >
                      {FRACTIONS.map((f) => (
                        <option key={f.str} value={f.str}>
                          {f.label}
                        </option>
                      ))}
                    </select>
                  )}
                  {globalUnit !== 'INCH' && (
                    <div className="text-[10px] text-slate-500 text-center">
                      {globalUnit === 'CM' ? `${(currentDoor.heightRight * 10).toFixed(0)} mm` : `${(currentDoor.heightRight / 10).toFixed(1)} cm`}
                    </div>
                  )}
                </div>

                {/* 3. W-TOP */}
                <div className="bg-[#070D1E] p-2.5 rounded-xl border border-slate-700/80 space-y-1">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">
                    W-TOP ({globalUnit})
                  </div>
                  <input
                    type="number"
                    step={globalUnit === 'CM' ? '0.1' : '1'}
                    required
                    value={currentDoor.widthTop || ''}
                    onChange={(e) => handleDoorChange('widthTop', parseFloat(e.target.value) || 0)}
                    className="w-full text-center py-1 bg-transparent text-white font-black text-lg focus:outline-none"
                  />
                  {globalUnit === 'INCH' && (
                    <select
                      value={currentDoor.fractionWidthTop || '0/8'}
                      onChange={(e) => handleDoorChange('fractionWidthTop', e.target.value)}
                      className="w-full text-center py-1 bg-[#0B132B] text-rose-300 text-[11px] font-bold rounded border border-rose-500/30 focus:outline-none"
                    >
                      {FRACTIONS.map((f) => (
                        <option key={f.str} value={f.str}>
                          {f.label}
                        </option>
                      ))}
                    </select>
                  )}
                  {globalUnit !== 'INCH' && (
                    <div className="text-[10px] text-slate-500 text-center">
                      {globalUnit === 'CM' ? `${(currentDoor.widthTop * 10).toFixed(0)} mm` : `${(currentDoor.widthTop / 10).toFixed(1)} cm`}
                    </div>
                  )}
                </div>

                {/* 4. W-BOT */}
                <div className="bg-[#070D1E] p-2.5 rounded-xl border border-slate-700/80 space-y-1">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">
                    W-BOT ({globalUnit})
                  </div>
                  <input
                    type="number"
                    step={globalUnit === 'CM' ? '0.1' : '1'}
                    required
                    value={currentDoor.widthBottom || ''}
                    onChange={(e) => handleDoorChange('widthBottom', parseFloat(e.target.value) || 0)}
                    className="w-full text-center py-1 bg-transparent text-white font-black text-lg focus:outline-none"
                  />
                  {globalUnit === 'INCH' && (
                    <select
                      value={currentDoor.fractionWidthBottom || '0/8'}
                      onChange={(e) => handleDoorChange('fractionWidthBottom', e.target.value)}
                      className="w-full text-center py-1 bg-[#0B132B] text-rose-300 text-[11px] font-bold rounded border border-rose-500/30 focus:outline-none"
                    >
                      {FRACTIONS.map((f) => (
                        <option key={f.str} value={f.str}>
                          {f.label}
                        </option>
                      ))}
                    </select>
                  )}
                  {globalUnit !== 'INCH' && (
                    <div className="text-[10px] text-slate-500 text-center">
                      {globalUnit === 'CM' ? `${(currentDoor.widthBottom * 10).toFixed(0)} mm` : `${(currentDoor.widthBottom / 10).toFixed(1)} cm`}
                    </div>
                  )}
                </div>

                {/* 5. QTY */}
                <div className="bg-[#070D1E] p-2.5 rounded-xl border border-slate-700/80 space-y-1 col-span-2 sm:col-span-1">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider text-center">
                    QTY
                  </div>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={currentDoor.quantity || 1}
                    onChange={(e) => handleDoorChange('quantity', parseInt(e.target.value) || 1)}
                    className="w-full text-center py-1 bg-transparent text-emerald-400 font-black text-lg focus:outline-none"
                  />
                  <div className="text-[10px] text-slate-500 text-center font-medium">
                    Piece Mode
                  </div>
                </div>
              </div>
            </div>

            {/* COLOUR / FINISH (PRESET + CUSTOM) & LOCK OPTION */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Colour and Dual-Tone */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Colour / Finish (Preset + Custom)
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsCatalogModalOpen(true)}
                    className="text-[10px] text-amber-400 hover:underline font-bold inline-flex items-center gap-0.5 cursor-pointer"
                  >
                    <span>Manage Colours</span>
                  </button>
                </div>
                <select
                  value={currentDoor.colour}
                  onChange={(e) => handleDoorChange('colour', e.target.value)}
                  className="w-full px-3 py-2 bg-[#070D1E] text-white font-bold text-xs rounded-xl border border-slate-700 focus:outline-none focus:border-amber-500"
                >
                  {catalog.colours.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                </select>

                <input
                  type="text"
                  value={currentDoor.insideColour || ''}
                  onChange={(e) => handleDoorChange('insideColour', e.target.value)}
                  placeholder="Inside Colour (ഇൻസൈഡ് കളർ)..."
                  className="w-full px-3 py-1.5 bg-[#070D1E] text-slate-300 text-xs rounded-lg border border-slate-700 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Lock Options */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Lock Option (All Locks + Custom)
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsCatalogModalOpen(true)}
                    className="text-[10px] text-amber-400 hover:underline font-bold inline-flex items-center gap-0.5 cursor-pointer"
                  >
                    <span>Manage Locks</span>
                  </button>
                </div>
                <select
                  value={currentDoor.lockType}
                  onChange={(e) => handleDoorChange('lockType', e.target.value)}
                  className="w-full px-3 py-2 bg-[#070D1E] text-white font-bold text-xs rounded-xl border border-slate-700 focus:outline-none focus:border-amber-500"
                >
                  {catalog.locks.map((l) => (
                    <option key={l.id} value={l.name}>
                      {l.name}
                    </option>
                  ))}
                </select>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400 font-semibold">Frame:</span>
                  <select
                    value={currentDoor.frameType}
                    onChange={(e) => handleDoorChange('frameType', e.target.value)}
                    className="w-full px-2.5 py-1 bg-[#070D1E] text-slate-300 text-xs rounded-lg border border-slate-700 focus:outline-none"
                  >
                    {FRAME_TYPES.map((f) => (
                      <option key={f} value={f}>
                        {f}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* DOOR PRICE ADJUSTMENT (₹) & REMARK / SITE NOTE */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-slate-800">
              {/* Stepper Price Adjustment */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Door Price Adjustment (₹)
                  </label>
                  <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                    Piece Mode
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleAdjustPrice(-100)}
                    className="px-3 py-1.5 bg-[#070D1E] hover:bg-slate-800 text-rose-400 font-bold text-xs rounded-lg border border-rose-500/30 cursor-pointer"
                  >
                    -100
                  </button>
                  <input
                    type="number"
                    value={metrics.unitPrice}
                    onChange={(e) => handleDirectPriceChange(parseFloat(e.target.value) || 0)}
                    className="w-full text-center py-1.5 bg-[#070D1E] text-emerald-400 font-black text-sm rounded-lg border border-slate-700 focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={() => handleAdjustPrice(100)}
                    className="px-3 py-1.5 bg-[#070D1E] hover:bg-slate-800 text-emerald-400 font-bold text-xs rounded-lg border border-emerald-500/30 cursor-pointer"
                  >
                    +100
                  </button>
                </div>
              </div>

              {/* Remark / Site Note */}
              <div>
                <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Remark / Site Note
                </label>
                <input
                  type="text"
                  value={currentDoor.remarks || ''}
                  onChange={(e) => handleDoorChange('remarks', e.target.value)}
                  placeholder="Enter door remark / site note..."
                  className="w-full px-3 py-1.5 bg-[#070D1E] text-white text-xs rounded-lg border border-slate-700 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            {/* BOTTOM CARD CONTROLS (MATCHING SCREENSHOT) */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-800/80">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => alert(`Handing: ${currentDoor.hingeSide} | Gross margin: +28%`)}
                  className="px-3 py-1.5 rounded-lg bg-[#070D1E] hover:bg-slate-800 text-amber-400 border border-slate-700 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Sliders className="w-3.5 h-3.5 text-amber-400" />
                  <span>Handing / Profit</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleDoorChange('photoCount', (currentDoor.photoCount || 0) + 1)}
                  className="px-3 py-1.5 rounded-lg bg-[#070D1E] hover:bg-slate-800 text-cyan-400 border border-slate-700 text-xs font-bold inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5 text-cyan-400" />
                  <span>{currentDoor.photoCount || 0}</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => alert('Speech recording initialized. Speak clearly into microphone.')}
                  className="p-2 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 cursor-pointer"
                  title="Voice Note (Malayalam/English)"
                >
                  <Mic className="w-4 h-4" />
                </button>

                <button
                  type="button"
                  onClick={handleDuplicateDoor}
                  className="p-2 rounded-lg bg-[#070D1E] hover:bg-slate-800 text-slate-300 border border-slate-700 cursor-pointer"
                  title="Duplicate Door Opening"
                >
                  <Copy className="w-4 h-4" />
                </button>

                {doors.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveDoor(activeDoorTab)}
                    className="p-2 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-500/40 cursor-pointer"
                    title="Delete Opening"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* SITE & PROJECT METADATA ACCORDION */}
          <details className="bg-[#0B132B] p-4 rounded-xl border border-slate-800 space-y-3">
            <summary className="text-xs font-bold text-slate-300 uppercase tracking-wider cursor-pointer flex items-center justify-between">
              <span>Site Location & Engineer Details ({district})</span>
              <span className="text-[11px] text-amber-400 font-normal">Click to expand / edit</span>
            </summary>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-3 text-xs">
              <div>
                <label className="block text-slate-400 font-semibold mb-1">Customer / Party Name</label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-[#070D1E] text-white rounded border border-slate-700"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Site / Project Name *</label>
                <input
                  type="text"
                  required
                  value={siteName}
                  onChange={(e) => setSiteName(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-[#070D1E] text-white rounded border border-slate-700"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Kerala District *</label>
                <select
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-[#070D1E] text-white rounded border border-slate-700"
                >
                  {KERALA_DISTRICTS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Site Engineer</label>
                <input
                  type="text"
                  value={engineerName}
                  onChange={(e) => setEngineerName(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-[#070D1E] text-white rounded border border-slate-700"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Measurement Date</label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-[#070D1E] text-white rounded border border-slate-700"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-semibold mb-1">Street Address</label>
                <input
                  type="text"
                  value={siteAddress}
                  onChange={(e) => setSiteAddress(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-[#070D1E] text-white rounded border border-slate-700"
                />
              </div>
            </div>
          </details>
        </div>

        {/* MODAL FOOTER ACTIONS */}
        <div className="p-3 bg-[#0B132B] border-t border-slate-800 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
            >
              Cancel
            </button>

            <button
              type="button"
              onClick={() => setIsCatalogModalOpen(true)}
              className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5"
            >
              <Sliders className="w-3.5 h-3.5 text-amber-400" />
              <span>Catalog Master</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            {/* ⚡ Auto Quotation Button */}
            <button
              type="button"
              onClick={() => setIsAutoQuotationOpen(true)}
              disabled={doors.length === 0}
              className="px-4 py-2 rounded-xl bg-emerald-600/30 hover:bg-emerald-600/40 text-emerald-300 border border-emerald-500/40 text-xs font-black transition-all cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-50"
              title="Generate Formal GST Quotation (Per Piece Rate or Square Feet Rate)"
            >
              <Zap className="w-4 h-4 text-emerald-400" />
              <span>⚡ Auto Quotation</span>
            </button>

            <button
              type="button"
              onClick={() => handleSave('DRAFT')}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-50"
            >
              <Save className="w-4 h-4 text-amber-400" />
              <span>Save Draft</span>
            </button>

            <button
              type="button"
              onClick={() => handleSave('VERIFIED')}
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white text-xs font-black shadow-lg shadow-red-950/50 transition-all cursor-pointer inline-flex items-center gap-2 disabled:opacity-50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Verify & Save Openings</span>
            </button>
          </div>
        </div>
      </div>

      {/* CATALOG MANAGER MODAL */}
      <CatalogManagerModal
        isOpen={isCatalogModalOpen}
        onClose={() => setIsCatalogModalOpen(false)}
        catalog={catalog}
        onCatalogUpdated={(updated) => setCatalog(updated)}
      />

      {/* AUTO QUOTATION MODAL */}
      <AutoQuotationModal
        isOpen={isAutoQuotationOpen}
        onClose={() => setIsAutoQuotationOpen(false)}
        measurement={{
          id: initialRecord?.id || 'new-session',
          refNumber,
          customerName,
          orderRef,
          siteName,
          siteAddress,
          district,
          engineerName,
          date,
          rebateDepthMm,
          wallThicknessMm,
          notes,
          status,
          totalOpenings: doors.length,
          doors,
          createdAt: initialRecord?.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        }}
        catalog={catalog}
        onQuotationGenerated={(quoteNumber) => {
          setSuccessToast(`Quotation ${quoteNumber} generated successfully!`);
          setTimeout(() => setSuccessToast(null), 4000);
        }}
      />

      {/* BULK OPENINGS UPLOAD MODAL */}
      {isBulkOpeningsOpen && (
        <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="relative w-full max-w-3xl bg-[#070D1E] border border-cyan-500/40 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]">
            <div className="p-4 bg-[#0B132B] border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-cyan-400" />
                <div>
                  <h3 className="text-sm font-black text-white">Bulk Upload Site Door Openings</h3>
                  <p className="text-xs text-slate-400">
                    Import multiple openings from CSV or Excel schedule into {refNumber}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsBulkOpeningsOpen(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 space-y-3 overflow-y-auto flex-1">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-300 font-bold">1. Upload CSV or paste sheet lines:</span>
                <button
                  type="button"
                  onClick={handleDownloadOpeningsTemplate}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 text-amber-300 hover:bg-slate-700 border border-amber-500/30 text-xs font-semibold inline-flex items-center gap-1 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-amber-400" />
                  <span>Download Sample CSV</span>
                </button>
              </div>

              <div className="border border-dashed border-slate-700 rounded-xl p-3 bg-[#0B132B] text-center">
                <input
                  type="file"
                  accept=".csv,.txt"
                  onChange={handleOpeningsFileUpload}
                  className="text-xs text-slate-400 file:mr-2 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-cyan-500 file:text-slate-950 hover:file:bg-cyan-400 cursor-pointer"
                />
              </div>

              <div>
                <textarea
                  rows={4}
                  value={bulkOpeningsText}
                  onChange={(e) => handleParseOpeningsCsv(e.target.value)}
                  placeholder="doorNumber,category,model,heightLeft,heightRight,widthTop,widthBottom,unit..."
                  className="w-full px-3 py-2 bg-[#070D1E] text-white font-mono text-xs rounded-xl border border-slate-700 focus:outline-none focus:border-cyan-500"
                />
              </div>

              {/* Errors */}
              {bulkErrors.length > 0 && (
                <div className="p-3 bg-red-500/15 border border-red-500/30 rounded-xl space-y-1">
                  <div className="text-xs font-bold text-red-400 flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    <span>CSV Validation Warnings ({bulkErrors.length}):</span>
                  </div>
                  <ul className="text-[11px] text-red-300 list-disc list-inside">
                    {bulkErrors.map((err, idx) => (
                      <li key={idx}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Preview */}
              {bulkPreviewDoors.length > 0 && (
                <div className="space-y-2">
                  <div className="text-xs font-bold text-emerald-400">
                    Ready to import {bulkPreviewDoors.length} valid door openings:
                  </div>
                  <div className="border border-slate-800 rounded-xl overflow-x-auto bg-[#0B132B] max-h-40">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[#070D1E] text-slate-400 uppercase text-[10px]">
                        <tr>
                          <th className="p-2">Door #</th>
                          <th className="p-2">Model</th>
                          <th className="p-2">Dimensions</th>
                          <th className="p-2">Sq.Ft</th>
                          <th className="p-2">Rate</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800 font-mono text-[11px]">
                        {bulkPreviewDoors.slice(0, 5).map((d, idx) => (
                          <tr key={idx}>
                            <td className="p-2 text-amber-400 font-bold">{d.doorNumber}</td>
                            <td className="p-2 text-white">{d.model}</td>
                            <td className="p-2 text-slate-300">
                              {d.heightLeft}×{d.widthTop} {d.measurementUnit}
                            </td>
                            <td className="p-2 text-cyan-400">{d.calculatedSqFt}</td>
                            <td className="p-2 text-emerald-400 font-bold">₹{d.unitPrice}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="p-3 bg-[#0B132B] border-t border-slate-800 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsBulkOpeningsOpen(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleImportOpenings}
                disabled={bulkPreviewDoors.length === 0}
                className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-black text-xs inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Append {bulkPreviewDoors.length} Openings to Sheet</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
