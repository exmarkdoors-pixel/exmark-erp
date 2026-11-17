'use client';

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { PrintDocumentHub, PrintTheme, DocumentType } from './PrintDocumentHub';
import { apiFetch } from '@/lib/api/apiClient';
import {
  FileSpreadsheet,
  FileText,
  Plus,
  Trash2,
  Printer,
  X,
  CheckCircle2,
  AlertCircle,
  Volume2,
  VolumeX,
  Search,
  RotateCcw,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  ChevronRight,
  ChevronLeft,
  CreditCard,
  Building2,
  UserCheck,
  Target,
  TrendingUp,
  Award,
  Calendar,
  Layers,
  FileCheck,
  Percent,
  Edit2,
  Lock,
  Palette,
  QrCode,
  Eye,
  EyeOff,
  Link2,
  Link2Off,
  Truck,
  UploadCloud,
  FileUp,
  Ruler,
  LayoutList,
  LayoutGrid,
  MessageCircle,
  ShieldAlert,
  Coins,
  ChevronDown,
  ChevronUp,
  Landmark,
} from 'lucide-react';
import { ProjectRiskProfitModal } from './ProjectRiskProfitModal';
import { StaffCommissionEditModal } from './StaffCommissionEditModal';
import { StaffOrderReportModal } from '../sales/StaffOrderReportModal';
import { SiteMeasurementRecord } from '@/types/measurements';
import { SiteMeasurementsCategoryView } from './SiteMeasurementsCategoryView';
import { DoorMeasurementModal } from '../DoorMeasurementModal';
import { AutoQuotationModal } from '../measurements/AutoQuotationModal';
import { CuttingSchedulePrintHubModal } from '../measurements/CuttingSchedulePrintHubModal';
import { WhatsAppQuoteShareModal } from './WhatsAppQuoteShareModal';
import {
  FrpDoorCategory,
  FrpRateCardSettings,
  DEFAULT_FRP_RATE_CARD,
  DEFAULT_LOCK_OPTIONS,
  DEFAULT_COLOUR_OPTIONS,
  DEFAULT_THICKNESS_OPTIONS,
  getDefaultThicknessOption,
  getDefaultLockOption,
  LockOption,
  ColourOption,
  SupplyMode,
  calculateFrpDoorPrice,
} from '@/lib/services/frpPricingEngine';
import { FrpPricingSettingsModal } from './FrpPricingSettingsModal';
import { StickerPrintModal } from '../production/StickerPrintModal';
import { CustomFrameManagerModal } from '../production/CustomFrameManagerModal';
import { CustomerSearchCombobox } from '../customers/CustomerSearchCombobox';
import { DeliveryRouteOptimizerModal } from '../fulfillment/DeliveryRouteOptimizerModal';
import { ProductionOrder } from '@/lib/services/productionService';
import {
  CustomFrameProfile,
  DEFAULT_FRAME_PROFILES,
  getDefaultFrameProfile,
  formatFrameSectionLabel,
} from '@/lib/utils/frameDefaults';
import { UserRole } from '@/lib/auth/roles';
import { DoorModelCombobox } from './DoorModelCombobox';
import { QuickLockModal } from './QuickLockModal';
import { QuotationProfitPanel } from './QuotationProfitPanel';
import { calculateQuotationProfit } from '@/lib/utils/quotationProfit';

// Customer interface
export interface HubCustomer {
  id: string;
  name: string;
  phone: string;
  location: string;
  type: string;
  gstin?: string;
}

// Door Model interface
export interface HubDoorModel {
  id: string;
  code: string;
  title: string;
  material: 'FRP' | 'WPC' | 'Steel';
  rate: number;
  finish: string;
  category?: FrpDoorCategory;
}

export function detectCategoryFromModelCode(code: string): FrpDoorCategory | null {
  const match = (code || '').match(/EXM-([A-Fa-f])-(\d+)/i);
  if (match) {
    const letter = match[1].toUpperCase();
    if (['A', 'B', 'C', 'D', 'E'].includes(letter)) return letter as FrpDoorCategory;
    if (letter === 'F') return 'E'; // Category F maps to top-tier rate E
  }
  return null;
}

// 16th-inch fractions specification for door carpentry & manufacturing
export const INCH_FRACTION_OPTIONS = [
  { value: '0', label: '0" (Exact)', dec: 0 },
  { value: '1/16', label: '1/16"', dec: 1 / 16 },
  { value: '1/8', label: '1/8"', dec: 2 / 16 },
  { value: '3/16', label: '3/16"', dec: 3 / 16 },
  { value: '1/4', label: '1/4"', dec: 4 / 16 },
  { value: '5/16', label: '5/16"', dec: 5 / 16 },
  { value: '3/8', label: '3/8"', dec: 6 / 16 },
  { value: '7/16', label: '7/16"', dec: 7 / 16 },
  { value: '1/2', label: '1/2"', dec: 8 / 16 },
  { value: '9/16', label: '9/16"', dec: 9 / 16 },
  { value: '5/8', label: '5/8"', dec: 10 / 16 },
  { value: '11/16', label: '11/16"', dec: 11 / 16 },
  { value: '3/4', label: '3/4"', dec: 12 / 16 },
  { value: '13/16', label: '13/16"', dec: 13 / 16 },
  { value: '7/8', label: '7/8"', dec: 14 / 16 },
  { value: '15/16', label: '15/16"', dec: 15 / 16 },
];

export function parseInchFraction(fracStr?: string): number {
  if (!fracStr || fracStr === '0' || fracStr === '0/8' || fracStr === '0/16') return 0;
  const match = INCH_FRACTION_OPTIONS.find((f) => f.value === fracStr);
  if (match) return match.dec;
  const parts = fracStr.split('/');
  if (parts.length === 2) {
    const n = parseFloat(parts[0]);
    const d = parseFloat(parts[1]);
    return d > 0 ? n / d : 0;
  }
  return 0;
}

export function decimalToInchFraction(decimalInches: number): { whole: number; fraction: string } {
  const whole = Math.floor(decimalInches);
  const rem = decimalInches - whole;
  const sixteenths = Math.round(rem * 16);
  if (sixteenths <= 0) return { whole, fraction: '0' };
  if (sixteenths >= 16) return { whole: whole + 1, fraction: '0' };
  if (sixteenths % 8 === 0) return { whole, fraction: `${sixteenths / 8}/2` }; // 1/2
  if (sixteenths % 4 === 0) return { whole, fraction: `${sixteenths / 4}/4` }; // 1/4, 3/4
  if (sixteenths % 2 === 0) return { whole, fraction: `${sixteenths / 2}/8` }; // 1/8, 3/8, 5/8, 7/8
  return { whole, fraction: `${sixteenths}/16` };
}

export function formatDimensionDisplay(
  height: number,
  widthTop: number,
  widthBottomOrUnit?: number | 'cm' | 'mm' | 'inch',
  unitOrHFrac?: 'cm' | 'mm' | 'inch' | string,
  hFracOrWTopFrac?: string,
  wTopFracOrWBtmFrac?: string,
  wBottomFrac?: string
): string {
  // If called with legacy 5 args: (h, w, unit, hFrac, wFrac)
  if (typeof widthBottomOrUnit === 'string') {
    const unit = widthBottomOrUnit as 'cm' | 'mm' | 'inch';
    const hFrac = typeof unitOrHFrac === 'string' ? unitOrHFrac : '0';
    const wFrac = typeof hFracOrWTopFrac === 'string' ? hFracOrWTopFrac : '0';

    if (unit === 'inch') {
      const hText = hFrac && hFrac !== '0' ? `${height} ${hFrac}"` : `${height}"`;
      const wText = wFrac && wFrac !== '0' ? `${widthTop} ${wFrac}"` : `${widthTop}"`;
      return `${hText} × ${wText}`;
    }
    return `${height} × ${widthTop} ${unit}`;
  }

  // Called with 7 args: (h, wTop, wBtm, unit, hFrac, wTopFrac, wBtmFrac)
  const wBtm = typeof widthBottomOrUnit === 'number' && !isNaN(widthBottomOrUnit) ? widthBottomOrUnit : widthTop;
  const unit = (typeof unitOrHFrac === 'string' && ['cm', 'mm', 'inch'].includes(unitOrHFrac))
    ? (unitOrHFrac as 'cm' | 'mm' | 'inch')
    : 'inch';
  const hFrac = typeof hFracOrWTopFrac === 'string' ? hFracOrWTopFrac : '0';
  const wTopFrac = typeof wTopFracOrWBtmFrac === 'string' ? wTopFracOrWBtmFrac : '0';
  const wBtmFrac = typeof wBottomFrac === 'string' ? wBottomFrac : wTopFrac;

  if (unit === 'inch') {
    const hText = hFrac && hFrac !== '0' ? `${height} ${hFrac}"` : `${height}"`;
    const wTopText = wTopFrac && wTopFrac !== '0' ? `${widthTop} ${wTopFrac}"` : `${widthTop}"`;
    const wBtmText = wBtmFrac && wBtmFrac !== '0' ? `${wBtm} ${wBtmFrac}"` : `${wBtm}"`;

    if (wTopText === wBtmText) {
      return `${hText} × ${wTopText}`;
    }
    return `${hText} × [Top: ${wTopText} / Btm: ${wBtmText}]`;
  }

  if (widthTop === wBtm) {
    return `${height} × ${widthTop} ${unit}`;
  }
  return `${height} × [Top: ${widthTop} / Btm: ${wBtm}] ${unit}`;
}

export function calculateSqFt(
  h: number,
  wTop: number,
  wBottom?: number,
  unit: 'cm' | 'mm' | 'inch' = 'cm',
  hFrac?: string,
  wTopFrac?: string,
  wBottomFrac?: string
): string {
  const wBtm = wBottom !== undefined && !isNaN(wBottom) ? wBottom : wTop;
  let hInches = h;
  let wTopInches = wTop;
  let wBtmInches = wBtm;

  if (unit === 'inch') {
    hInches = h + parseInchFraction(hFrac);
    wTopInches = wTop + parseInchFraction(wTopFrac);
    wBtmInches = wBtm + parseInchFraction(wBottomFrac ?? wTopFrac);
  } else if (unit === 'cm') {
    hInches = h / 2.54;
    wTopInches = wTop / 2.54;
    wBtmInches = wBtm / 2.54;
  } else if (unit === 'mm') {
    hInches = h / 25.4;
    wTopInches = wTop / 25.4;
    wBtmInches = wBtm / 25.4;
  }

  const avgWidthInches = (wTopInches + wBtmInches) / 2;
  return ((hInches * avgWidthInches) / 144).toFixed(2);
}

// Quotation Item Row Draft
export interface QuoteItemRow {
  id: number;
  modelId: string;
  modelCode?: string;
  modelTitle?: string;
  unit: 'cm' | 'mm' | 'inch';
  height: number;
  heightFraction?: string;
  widthTop?: number;
  widthTopFraction?: string;
  widthBottom?: number;
  widthBottomFraction?: string;
  width: number;
  widthFraction?: string;
  widthLinked?: boolean;
  qty: number;
  rate: number;
  frpCategory?: FrpDoorCategory | 'CUSTOM';
  autoPriceBreakdown?: string;
  lockId?: string;
  lockName?: string;
  lockPrice?: number;
  withoutAccessories?: boolean;
  supplyMode?: SupplyMode;
  colourId?: string;
  colourName?: string;
  colourExtraRate?: number;
  frameTypeId?: string;
  frameTypeName?: string;
  framePrice?: number;
  thicknessId?: string;
  thicknessLabel?: string;
  thicknessExtraRate?: number;
  sectionName?: string;
  roomTag?: string;
  doorNumber?: string;
}

// Saved Quotation Record
export interface HubQuotation {
  id: string;
  serverId?: string;
  customerName: string;
  customerPhone?: string;
  location: string;
  itemsSummary: string;
  gstMode: 'without' | 'excluded' | 'included';
  gstRate: number;
  subtotal: number;
  gstAmount: number;
  grandTotal: number;
  advancePercent: number;
  advanceAmount: number;
  discount?: number;
  roundOff?: number;
  date: string;
  targetDeliveryDate?: string;
  deliveryDistrict?: string;
  itemRows?: QuoteItemRow[];
  items?: Array<{ doorModel?: string; quantity?: number; heightMm?: number; widthMm?: number; unitPrice?: number; [key: string]: any }>;
  includeInstallation?: boolean;
  installationMode?: 'PER_DOOR' | 'FIXED_LUMP_SUM';
  installationRate?: number;
  installationQty?: number;
  installationNotes?: string;
  installationAmount?: number;
  isConfirmed?: boolean;
  jobCardNumber?: string;
  advancePaid?: number;
  paymentMode?: string;
  paymentRef?: string;
  source?: string;
  quotationCategory?: 'SITE_MEASUREMENT' | 'SHOWROOM_DIRECT' | 'CONTRACTOR_BULK';
  siteMeasurementId?: string;
  siteMeasurementRef?: string;
  measuringStaffName?: string;
  salespersonId?: string;
  salespersonName?: string;
  salespersonCode?: string;
  commissionPercent?: number;
  commissionAmount?: number;
  commissionStatus?: 'PROJECTED' | 'ACCRUED' | 'PAID' | 'VOID';
  territoryDistrict?: string;
  notes?: string;
}

// Lead item
export interface HubLead {
  id: string;
  title: string;
  client: string;
  value: string;
  doors: string;
  stage: 'inquiries' | 'measurement' | 'quotation' | 'negotiation';
  notes?: string;
}

// Sales Order item
export interface HubSalesOrder {
  id: string;
  title: string;
  client: string;
  value: string;
  doors: string;
  stepIndex: number;
  advancePaid: string;
  totalNumericValue?: number;
  advanceAmount?: number;
  advanceVerified?: boolean;
  paymentMode?: string;
  paymentRef?: string;
  isConvertedToSales?: boolean;
  convertedInvoiceId?: string;
}

// Initial Customers (empty for clean factory start; populated live from /api/customers)
const INITIAL_CUSTOMERS: HubCustomer[] = [];

// Door Models Catalog Templates with Category Auto-Mapping
const INITIAL_MODELS: HubDoorModel[] = [
  // Category A Series (Base Piece Rate ₹7,000)
  { id: 'MOD-A-101', code: 'EXM-A-101', title: 'Natural Teak Classic Molded', material: 'FRP', rate: 7000, finish: 'Natural Teak Matte', category: 'A' },
  { id: 'MOD-A-102', code: 'EXM-A-102', title: 'Traditional Kerala 2-Panel Molded', material: 'FRP', rate: 7000, finish: 'Teak Woodgrain', category: 'A' },
  { id: 'MOD-A-113', code: 'EXM-A-113', title: 'Mahogany Waterproof Flush Molded', material: 'FRP', rate: 7000, finish: 'Mahogany Matte', category: 'A' },
  { id: 'MOD-A-121', code: 'EXM-A-121', title: 'Eeti Wood Bathroom Molded Door', material: 'FRP', rate: 7000, finish: 'Eeti Wood', category: 'A' },

  // Category B Series (Base Piece Rate ₹7,600)
  { id: 'MOD-B-201', code: 'EXM-B-201', title: 'Rose Wood Premier Architectural Molded', material: 'FRP', rate: 7600, finish: 'Rose Wood Glossy', category: 'B' },
  { id: 'MOD-B-202', code: 'EXM-B-202', title: 'Teak 4-Panel Elegant Molded', material: 'FRP', rate: 7600, finish: 'Teak Semi-Gloss', category: 'B' },
  { id: 'MOD-B-205', code: 'EXM-B-205', title: 'Walnut Deep Arch Designer Molded', material: 'FRP', rate: 7600, finish: 'Dark Walnut', category: 'B' },

  // Category C Series (Base Piece Rate ₹8,200)
  { id: 'MOD-C-301', code: 'EXM-C-301', title: 'Mahogany Deep Embossed Villa Molded', material: 'FRP', rate: 8200, finish: 'Mahogany Glossy', category: 'C' },
  { id: 'MOD-C-302', code: 'EXM-C-302', title: 'Rosewood Heritage Grooved Molded', material: 'FRP', rate: 8200, finish: 'Heritage Rosewood', category: 'C' },

  // Category D Series (Base Piece Rate ₹8,800)
  { id: 'MOD-D-401', code: 'EXM-D-401', title: 'Royal Walnut Fusion Designer Molded', material: 'FRP', rate: 8800, finish: 'Royal Walnut', category: 'D' },
  { id: 'MOD-D-402', code: 'EXM-D-402', title: 'Modern Geometric Line Molded', material: 'FRP', rate: 8800, finish: 'Slate Grey Dual Tone', category: 'D' },

  // Category E/F Luxury Series (Base Piece Rate ₹9,500)
  { id: 'MOD-F-501', code: 'EXM-F-501', title: 'Luxury Metallic Architectural Series', material: 'FRP', rate: 9500, finish: 'Metallic Bronze Luxury', category: 'E' },
  { id: 'MOD-F-502', code: 'EXM-F-502', title: 'Grand Royal Gold Finish Molded', material: 'FRP', rate: 9500, finish: 'Royal Gold Teak', category: 'E' },

  // Other materials
  { id: 'MOD-WPC-201', code: 'EXM-WPC-201', title: 'Denwood WPC Solid Core Bedroom Door', material: 'WPC', rate: 5400, finish: 'Oak Wood Laminated' },
  { id: 'MOD-MS-701', code: 'EXM-MS-701', title: 'Double Skin GI Steel Shaft Duct Door', material: 'Steel', rate: 6560, finish: 'Powder Coated Grey' },
];

// Clean Fresh Initial Collections
const INITIAL_QUOTATIONS: HubQuotation[] = [];
const INITIAL_LEADS: HubLead[] = [];
const INITIAL_ORDERS: HubSalesOrder[] = [];

const STAGE_ORDER: Array<HubLead['stage']> = ['inquiries', 'measurement', 'quotation', 'negotiation'];
const STAGE_LABELS: Record<HubLead['stage'], string> = {
  inquiries: 'New Inquiries',
  measurement: 'Measurement Scheduled',
  quotation: 'Quotation Submitted',
  negotiation: 'Final Negotiation',
};

const ORDER_STEPS = [
  'Order Confirmed & Specs Locked',
  '50% Advance Received',
  'In Production (FRP Press / Extrusion)',
  'QC Passed (IS 14856)',
  'Dispatched & Installed',
];

export function QuotationHub({ userRole }: { userRole?: UserRole } = {}) {
  // Navigation
  const [activeTab, setActiveTab] = useState<'quotations' | 'siteMeasurements' | 'pipeline' | 'salesOrders'>('quotations');
  const [audioEnabled, setAudioEnabled] = useState(true);

  // Site Measurements as dedicated Category by Staff Name
  const [siteMeasurements, setSiteMeasurements] = useState<SiteMeasurementRecord[]>([]);
  const [isDoorMeasurementModalOpen, setIsDoorMeasurementModalOpen] = useState(false);
  const [autoQuoteMeasurement, setAutoQuoteMeasurement] = useState<SiteMeasurementRecord | null>(null);
  const [cuttingScheduleMeasurement, setCuttingScheduleMeasurement] = useState<SiteMeasurementRecord | null>(null);
  const [quotationCategoryFilter, setQuotationCategoryFilter] = useState<'ALL' | 'SITE_MEASUREMENT' | 'SHOWROOM_DIRECT'>('ALL');
  const [savedQuotesViewMode, setSavedQuotesViewMode] = useState<'compact' | 'cards'>('compact');
  const [expandedQuoteRowId, setExpandedQuoteRowId] = useState<string | null>(null);
  const [whatsAppShareQuote, setWhatsAppShareQuote] = useState<HubQuotation | null>(null);
  const [isWhatsAppShareModalOpen, setIsWhatsAppShareModalOpen] = useState(false);
  const [isProjectRiskModalOpen, setIsProjectRiskModalOpen] = useState(false);
  const [selectedRiskQuote, setSelectedRiskQuote] = useState<any>(null);

  // Staff Commission & Order Reports State (Strictly PER_PIECE, Default 0)
  const [draftCommissionType, setDraftCommissionType] = useState<'PERCENTAGE' | 'PER_PIECE'>('PER_PIECE');
  const [draftCommissionRate, setDraftCommissionRate] = useState<number>(0);
  const [isCommissionEditModalOpen, setIsCommissionEditModalOpen] = useState(false);
  const [selectedCommissionQuote, setSelectedCommissionQuote] = useState<any>(null);
  const [isStaffReportModalOpen, setIsStaffReportModalOpen] = useState(false);
  const [staffReportInitialStaffId, setStaffReportInitialStaffId] = useState<string>('ALL');
  const [activeDraftSiteRef, setActiveDraftSiteRef] = useState<string | null>(null);
  const [activeDraftSiteId, setActiveDraftSiteId] = useState<string | null>(null);
  const [activeDraftMeasuringStaff, setActiveDraftMeasuringStaff] = useState<string | null>(null);

  // Quick Lock Creator Modal State
  const [isQuickLockOpen, setIsQuickLockOpen] = useState(false);
  const [quickLockRowIndex, setQuickLockRowIndex] = useState<number | null>(null);

  // Role-gated internal profit calculation
  const isProfitVisibleRole =
    !userRole ||
    userRole === 'Super Admin' ||
    userRole === 'Management' ||
    userRole === 'Accounts';

  const [profitConfig, setProfitConfig] = useState<{
    boqRates?: any;
    customFrames?: CustomFrameProfile[];
    contractorRates?: any;
  } | null>(null);

  useEffect(() => {
    if (!isProfitVisibleRole) return;
    apiFetch('/api/quotations/profit-config')
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.success && json.data) {
          setProfitConfig(json.data);
        }
      })
      .catch(() => {});
  }, [isProfitVisibleRole]);

  // Custom Frame Profiles State (synced with /api/settings/frames)
  const [framesList, setFramesList] = useState<CustomFrameProfile[]>(DEFAULT_FRAME_PROFILES);
  const [isFrameManagerOpen, setIsFrameManagerOpen] = useState(false);

  // Active Quotation Editing state (CRUD)
  const [editingQuoteId, setEditingQuoteId] = useState<string | null>(null);

  // Helper to create a clean zero-baseline draft row
  const createZeroRow = (id = 1, modelId = '', availableFrames: CustomFrameProfile[] = framesList): QuoteItemRow => {
    const defaultLock = getDefaultLockOption(frpSettings.locks);
    const defaultColour = (frpSettings.colours && frpSettings.colours[0]) || DEFAULT_COLOUR_OPTIONS[0];
    const defaultFrame = getDefaultFrameProfile(availableFrames);
    const defaultThickness = getDefaultThicknessOption(frpSettings.doorThicknesses);
    const resolvedModelId = modelId || INITIAL_MODELS[0]?.id || 'MOD-A-101';
    const foundModel = doorModels.find((m) => m.id === resolvedModelId) || INITIAL_MODELS[0];
    const detectedCat = foundModel?.category || (foundModel?.code ? detectCategoryFromModelCode(foundModel.code) : null) || 'A';
    return {
      id,
      modelId: resolvedModelId,
      unit: 'inch',
      height: 0,
      heightFraction: '0',
      widthTop: 0,
      widthTopFraction: '0',
      widthBottom: 0,
      widthBottomFraction: '0',
      width: 0,
      widthFraction: '0',
      qty: 0,
      rate: 0,
      frpCategory: detectedCat,
      lockId: defaultLock?.id || 'lock-none',
      lockName: defaultLock?.name || 'BABY LATCH',
      lockPrice: defaultLock?.price || 0,
      colourId: defaultColour?.id || 'col-teak-matte',
      colourName: defaultColour?.name || 'Natural Teak',
      colourExtraRate: defaultColour?.extraRate || 0,
      frameTypeId: defaultFrame.id,
      frameTypeName: formatFrameSectionLabel(defaultFrame),
      framePrice: defaultFrame.quotationExtraRate || 0,
      thicknessId: defaultThickness.id,
      thicknessLabel: defaultThickness.name,
      thicknessExtraRate: defaultThickness.extraRate || 0,
    };
  };

  // Entities
  const [customers, setCustomers] = useState<HubCustomer[]>(INITIAL_CUSTOMERS);
  const [doorModels, setDoorModels] = useState<HubDoorModel[]>(INITIAL_MODELS);
  const [quotations, setQuotations] = useState<HubQuotation[]>(INITIAL_QUOTATIONS);
  const [leads, setLeads] = useState<HubLead[]>(INITIAL_LEADS);
  const [salesOrders, setSalesOrders] = useState<HubSalesOrder[]>(INITIAL_ORDERS);

  // Sales Staff & Salesperson Assignment State
  const [salesStaff, setSalesStaff] = useState<
    Array<{
      id: string;
      name: string;
      employeeCode: string;
      department?: string;
      location?: string;
      defaultPieceRate?: number;
      commissionSlabs?: {
        slab1_upto40?: number;
        slab2_41to60?: number;
        slab3_61to100?: number;
        slab4_above100?: number;
      };
    }>
  >([]);
  const [selectedSalespersonId, setSelectedSalespersonId] = useState<string>('');
  const [salespersonFilter, setSalespersonFilter] = useState<string>('ALL');

  // FRP Auto-Pricing Settings & Modal State
  const [frpSettings, setFrpSettings] = useState<FrpRateCardSettings>(DEFAULT_FRP_RATE_CARD);
  const [isFrpSettingsOpen, setIsFrpSettingsOpen] = useState(false);
  const [frpSettingsInitialTab, setFrpSettingsInitialTab] = useState<'rates' | 'locks' | 'colours' | 'thicknesses'>('rates');

  // Active Quote Form State
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>('');
  const [targetDeliveryDate, setTargetDeliveryDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 7);
    return d.toISOString().slice(0, 10);
  });
  const [deliveryDistrict, setDeliveryDistrict] = useState<string>('Malappuram');
  const [isRouteOptimizerOpen, setIsRouteOptimizerOpen] = useState<boolean>(false);
  const [advancePercent, setAdvancePercent] = useState<number>(50);
  const [advanceInputMode, setAdvanceInputMode] = useState<'PRESET' | 'CUSTOM'>('PRESET');
  const [customAdvanceRupees, setCustomAdvanceRupees] = useState<number | ''>('');
  const [includeInstallation, setIncludeInstallation] = useState<boolean>(false);
  const [installationMode, setInstallationMode] = useState<'PER_DOOR' | 'FIXED_LUMP_SUM'>('PER_DOOR');
  const [installationRate, setInstallationRate] = useState<number>(500);
  const [installationCustomQty, setInstallationCustomQty] = useState<number | null>(null);
  const [installationNotes, setInstallationNotes] = useState<string>(
    'Site Door & Frame Installation (Hardware & Fitting)'
  );
  const [quoteItemRows, setQuoteItemRows] = useState<QuoteItemRow[]>([
    {
      id: 1,
      modelId: INITIAL_MODELS[0]?.id || 'MOD-101',
      unit: 'inch',
      height: 0,
      heightFraction: '0',
      widthTop: 0,
      widthTopFraction: '0',
      widthBottom: 0,
      widthBottomFraction: '0',
      width: 0,
      widthFraction: '0',
      widthLinked: true,
      qty: 0,
      rate: 0,
      frpCategory: 'A',
      lockId: 'lock-none',
      lockName: 'BABY LATCH',
      lockPrice: 0,
      withoutAccessories: false,
      supplyMode: 'FULL_SET',
      colourId: 'col-teak-matte',
      colourName: 'Natural Teak',
      colourExtraRate: 0,
      frameTypeId: DEFAULT_FRAME_PROFILES[0].id,
      frameTypeName: formatFrameSectionLabel(DEFAULT_FRAME_PROFILES[0]),
      framePrice: DEFAULT_FRAME_PROFILES[0].quotationExtraRate || 0,
      thicknessId: DEFAULT_THICKNESS_OPTIONS[0].id,
      thicknessLabel: DEFAULT_THICKNESS_OPTIONS[0].name,
      thicknessExtraRate: DEFAULT_THICKNESS_OPTIONS[0].extraRate || 0,
    },
  ]);

  // Modals & Print Options
  const [isAddCustomerOpen, setIsAddCustomerOpen] = useState(false);
  const [isAddDoorModelOpen, setIsAddDoorModelOpen] = useState(false);
  const [previewQuote, setPreviewQuote] = useState<HubQuotation | null>(null);
  const [printTheme, setPrintTheme] = useState<PrintTheme>('tally-classic');
  const [printDocType, setPrintDocType] = useState<DocumentType>('quotation');
  const [activeLeadModal, setActiveLeadModal] = useState<HubLead | null>(null);
  const [leadModalNotes, setLeadModalNotes] = useState<string>('');
  const [isZeroConfirmOpen, setIsZeroConfirmOpen] = useState(false);

  // Live Factory Cost Column, Discount & Round-Off States
  const [showCostColumn, setShowCostColumn] = useState<boolean>(false);
  const [additionalDiscount, setAdditionalDiscount] = useState<number>(0);
  const [roundOffAmount, setRoundOffAmount] = useState<number>(0);
  const [hideSqFtOnPrint, setHideSqFtOnPrint] = useState<boolean>(true);
  const [hideBankDetailsOnPrint, setHideBankDetailsOnPrint] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      try {
        return localStorage.getItem('exmark_hide_bank_details') === 'true';
      } catch {}
    }
    return false;
  });
  const [companyBankDetails, setCompanyBankDetails] = useState<any>(null);
  const [previewZoom, setPreviewZoom] = useState<'fit' | '100%' | '90%' | '75%'>('fit');
  const [showAddSectionMenu, setShowAddSectionMenu] = useState<boolean>(false);

  // 40% Advance Gatekeeper Modal state
  const [activeAdvanceOrder, setActiveAdvanceOrder] = useState<HubSalesOrder | null>(null);
  const [advanceDepositAmount, setAdvanceDepositAmount] = useState<number>(0);
  const [advanceDepositMode, setAdvanceDepositMode] = useState<string>('UPI');
  const [advanceDepositRef, setAdvanceDepositRef] = useState<string>('');
  const [advanceDepositNotes, setAdvanceDepositNotes] = useState<string>('');
  const [stickerOrder, setStickerOrder] = useState<ProductionOrder | null>(null);

  // ── Quotation Advance Gatekeeper & Production Lock Lifecycle ─────────────────
  const [confirmingQuote, setConfirmingQuote] = useState<HubQuotation | null>(null);
  const [quoteAdvanceAmount, setQuoteAdvanceAmount] = useState<number>(0);
  const [quotePaymentMode, setQuotePaymentMode] = useState<string>('UPI');
  const [quotePaymentRef, setQuotePaymentRef] = useState<string>('');
  const [quoteStation, setQuoteStation] = useState<string>('Hand Station 1: Hand-Layup & Manual Mold Benches');
  const [isSubmittingConfirm, setIsSubmittingConfirm] = useState<boolean>(false);

  const handleStartConfirmQuotation = (q: HubQuotation) => {
    const min30 = Math.round(q.grandTotal * 0.30);
    const suggested = q.advanceAmount && q.advanceAmount >= min30 ? q.advanceAmount : min30;
    setConfirmingQuote(q);
    setQuoteAdvanceAmount(suggested);
    setQuotePaymentMode('UPI');
    setQuotePaymentRef('');
    setQuoteStation('Hand Station 1: Hand-Layup & Manual Mold Benches');
  };

  const buildProductionPayloadFromQuotation = (q: HubQuotation, jcNumber: string, station: string) => {
    const numSuffix = q.id.replace(/[^0-9]/g, '').slice(-3) || '101';
    let doorSeq = 0;

    const doors = q.itemRows && q.itemRows.length > 0
      ? q.itemRows.flatMap((r, rIdx) => {
          const qty = r.qty || 1;
          const isLinked = r.widthLinked !== false;
          const hInch = r.unit === 'inch' ? (r.height || 0) + parseInchFraction(r.heightFraction) : 0;
          const wTopInch = r.unit === 'inch' ? (r.widthTop || r.width || 0) + parseInchFraction(r.widthTopFraction || r.widthFraction) : 0;
          const hasValidBtmInch = typeof r.widthBottom === 'number' && r.widthBottom > 0;
          const wBtmInch = (isLinked || !hasValidBtmInch)
            ? wTopInch
            : (r.widthBottom || 0) + parseInchFraction(r.widthBottomFraction || r.widthTopFraction || r.widthFraction);

          const rawHCm =
            r.unit === 'inch'
              ? Number((hInch * 2.54).toFixed(2)) || 203.2
              : r.unit === 'cm'
              ? Number((r.height || 203.2).toFixed(2))
              : Number((((r.height || 2032) / 10)).toFixed(2));
          const rawTopCm =
            r.unit === 'inch'
              ? Number((wTopInch * 2.54).toFixed(2)) || 78.11
              : r.unit === 'cm'
              ? Number(((r.widthTop || r.width || 78.11)).toFixed(2))
              : Number((((r.widthTop || r.width || 781) / 10)).toFixed(2));
          const btmVal = typeof r.widthBottom === 'number' && r.widthBottom > 0 ? r.widthBottom : null;
          const rawBtmCm = (isLinked || btmVal === null)
            ? rawTopCm
            : (r.unit === 'inch'
                ? Number((wBtmInch * 2.54).toFixed(2)) || rawTopCm
                : r.unit === 'cm'
                ? Number(btmVal.toFixed(2))
                : Number((btmVal / 10).toFixed(2)));

          const rawItem = q.items && q.items[rIdx];
          const modelObj = doorModels.find((m) => m.id === r.modelId || m.code === r.modelId);
          const modelCode =
            r.modelCode ||
            modelObj?.code ||
            r.modelTitle ||
            modelObj?.title ||
            rawItem?.doorModel ||
            r.modelId ||
            'EXM-A-101';
          const activeLocksPool =
            frpSettings.locks && frpSettings.locks.length > 0 ? frpSettings.locks : DEFAULT_LOCK_OPTIONS;
          const activeColoursPool =
            frpSettings.colours && frpSettings.colours.length > 0
              ? frpSettings.colours
              : DEFAULT_COLOUR_OPTIONS;
          const resolvedLockObj = activeLocksPool.find((l) => l.id === r.lockId);
          const lockLabel = resolvedLockObj?.name || 'BABY LATCH';
          const colourLabel =
            activeColoursPool.find((c) => c.id === r.colourId)?.name || 'Natural Teak';
          const defaultFrame = getDefaultFrameProfile(framesList);
          const rowFrame =
            framesList.find((f) => f.id === r.frameTypeId || f.name === r.frameTypeName) || defaultFrame;
          const resolvedFrameId = r.frameTypeId || rowFrame.id;
          const resolvedFrameName = r.frameTypeName || formatFrameSectionLabel(rowFrame);
          const defaultThk = getDefaultThicknessOption(frpSettings.doorThicknesses);
          const rowThk =
            (frpSettings.doorThicknesses || DEFAULT_THICKNESS_OPTIONS).find((t) => t.id === r.thicknessId) ||
            defaultThk;
          const hDedMm = Math.round((rowFrame.hDeductionCm ?? 4.5) * 10);
          const wDedMm = Math.round((rowFrame.wDeductionCm ?? 7.6) * 10);

          return Array.from({ length: qty }).map(() => {
            doorSeq++;
            const rawHMm = Math.round(rawHCm * 10);
            const rawWMm = Math.round(rawTopCm * 10);
            const rawWBtmMm = Math.round(rawBtmCm * 10);
            return {
              id: `door-${q.id}-${rIdx + 1}-${doorSeq}`,
              doorId: `EXM-DR-2026-${numSuffix}${String(doorSeq).padStart(2, '0')}`,
              doorNumber: `Door #${doorSeq}`,
              model: modelCode,
              rawHeightMm: rawHMm,
              rawWidthMm: rawWMm,
              rawWidthBottomMm: rawWBtmMm,
              rawHeightCm: rawHCm,
              rawWidthTopCm: rawTopCm,
              rawWidthBtmCm: rawBtmCm,
              widthLinked: rawTopCm === rawBtmCm,
              frameTypeId: resolvedFrameId,
              frameTypeName: resolvedFrameName,
              doorThicknessMm: rowThk.thicknessMm,
              doorThicknessLabel: r.thicknessLabel || rowThk.name,
              swing: 'INWARD' as const,
              remark: (r as any).remark || (r as any).roomTag || (rawItem as any)?.remark || (rawItem as any)?.notes || '',
              finishedHeightMm: Math.max(0, rawHMm - hDedMm),
              finishedWidthMm: Math.max(0, rawWMm - wDedMm),
              handing: 'RH' as 'LH' | 'RH',
              lockId: resolvedLockObj?.id,
              lockType: lockLabel,
              lockPrice: resolvedLockObj?.price ?? 0,
              finishColor: colourLabel,
              qcStatus: 'PENDING' as const,
              qrPayload: `EXM-DOOR-${q.id}-${doorSeq}`,
            };
          });
        })
      : Array.from({ length: 4 }).map((_, idx) => {
          const defaultFrame = getDefaultFrameProfile(framesList);
          const hDedMm = Math.round((defaultFrame.hDeductionCm ?? 4.5) * 10);
          const wDedMm = Math.round((defaultFrame.wDeductionCm ?? 7.6) * 10);
          return {
            id: `door-${q.id}-${idx + 1}`,
            doorId: `EXM-DR-2026-${numSuffix}${String(idx + 1).padStart(2, '0')}`,
            doorNumber: `Door #${idx + 1}`,
            model: q.items?.[idx]?.doorModel || q.items?.[0]?.doorModel || 'EXM-A-101',
            rawHeightMm: 2032,
            rawWidthMm: 781,
            rawWidthBottomMm: 781,
            rawHeightCm: 203.2,
            rawWidthTopCm: 78.11,
            rawWidthBtmCm: 78.11,
            widthLinked: true,
            frameTypeId: defaultFrame.id,
            frameTypeName: formatFrameSectionLabel(defaultFrame),
            swing: 'INWARD' as const,
            remark: (q.items?.[idx] as any)?.remark || (q.items?.[idx] as any)?.notes || '',
            finishedHeightMm: Math.max(0, 2032 - hDedMm),
            finishedWidthMm: Math.max(0, 781 - wDedMm),
            handing: 'RH' as 'LH' | 'RH',
            lockType: 'Baby Latch',
            finishColor: 'Natural Teak',
            qcStatus: 'PENDING' as const,
            qrPayload: `EXM-DOOR-${q.id}-${idx + 1}`,
          };
        });

    const fallbackOrder: ProductionOrder = {
      id: `PRD-${q.id}`,
      prodOrderNumber: `PRD-2026-${numSuffix}`,
      jobCardNumber: jcNumber,
      salesOrderId: q.id,
      customerName: q.customerName,
      siteName: `${q.customerName} - ${q.location}`,
      district: q.location || 'Ernakulam',
      doorCategory: 'FRP_DOORS',
      quantity: doors.length,
      lineAssigned: station,
      batchNumber: `BATCH-${q.id.replace(/[^0-9]/g, '').slice(-4) || '2026'}`,
      priority: 'HIGH',
      status: 'MOLDING',
      includeInstallation: Boolean(q.includeInstallation),
      installationNotes: q.installationNotes || undefined,
      orderDate: q.date || new Date().toISOString().split('T')[0],
      tolerancesApplied: {
        heightDeductionMm: 45,
        widthDeductionMm: 76,
      },
      doors,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    return { doors, fallbackOrder };
  };

  const handleConfirmQuotationOrder = async () => {
    if (!confirmingQuote) return;
    setIsSubmittingConfirm(true);
    try {
      const q = confirmingQuote;
      const defaultJc = `JC-2026-${q.id.replace(/[^0-9]/g, '').slice(-3) || '101'}`;
      const { doors, fallbackOrder } = buildProductionPayloadFromQuotation(q, defaultJc, quoteStation);
      let finalOrder = fallbackOrder;
      let jcNumber = defaultJc;

      try {
        const res = await fetch('/api/production', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            salesOrderId: q.id,
            customerName: q.customerName,
            siteName: `${q.customerName} - ${q.location}`,
            district: q.location || 'Ernakulam',
            doorCategory: 'FRP_DOORS',
            lineAssigned: quoteStation,
            priority: 'HIGH',
            includeInstallation: Boolean(q.includeInstallation),
            installationNotes: q.installationNotes || undefined,
            orderDate: q.date || new Date().toISOString().split('T')[0],
            tolerances: { heightDeductionMm: 45, widthDeductionMm: 76 },
            doors,
          }),
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success && json.data) {
            finalOrder = json.data as ProductionOrder;
            jcNumber = finalOrder.jobCardNumber || defaultJc;
          }
        }
      } catch (e) {
        console.warn('Production API POST notice:', e);
      }

      setQuotations((prev) =>
        prev.map((item) =>
          item.id === q.id
            ? {
                ...item,
                isConfirmed: true,
                jobCardNumber: jcNumber,
                advancePaid: quoteAdvanceAmount,
                paymentMode: quotePaymentMode,
                paymentRef: quotePaymentRef,
                commissionStatus: item.salespersonId ? 'ACCRUED' : item.commissionStatus,
              }
            : item
        )
      );

      apiFetch(`/api/quotations/${encodeURIComponent(q.serverId || q.id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          isConfirmed: true,
          jobCardNumber: jcNumber,
          status: 'CONVERTED',
        }),
      }).catch(() => {});

      playBeep(640, 0.15);
      showToast(
        'Quotation Confirmed & Order Locked!',
        `${q.id} converted into Job Card ${jcNumber}. Opening Floor Door QR & 12L Sticker Studio...`
      );

      setConfirmingQuote(null);
      setStickerOrder(finalOrder);
    } catch (err) {
      console.error('Confirmation error:', err);
      showToast('Error', 'Failed to confirm quotation order', 'info');
    } finally {
      setIsSubmittingConfirm(false);
    }
  };

  const handlePrint12LFromQuotation = async (q: HubQuotation) => {
    const jcNumber = q.jobCardNumber || `JC-2026-${q.id.replace(/[^0-9]/g, '').slice(-3) || '101'}`;
    try {
      const res = await fetch(`/api/production/${encodeURIComponent(jcNumber)}`);
      if (res.ok) {
        const json = await res.json();
        if (json.success && json.data) {
          setStickerOrder(json.data as ProductionOrder);
          return;
        }
      }
    } catch {
      // Fallback to reconstructed payload
    }

    const { fallbackOrder } = buildProductionPayloadFromQuotation(
      q,
      jcNumber,
      'Hand Station 1: Hand-Layup & Manual Mold Benches'
    );
    setStickerOrder(fallbackOrder);
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('exmark_print_theme') as PrintTheme;
      if (saved) setPrintTheme(saved);

      // Always fetch persistent custom frame presets (Regular 72x50 default, Medium, Heavy, School, etc.)
      fetch('/api/settings/frames')
        .then((res) => res.json())
        .then((json) => {
          if (json && json.success && Array.isArray(json.data) && json.data.length > 0) {
            const loadedFrames = json.data as CustomFrameProfile[];
            setFramesList(loadedFrames);
            const defFrame = getDefaultFrameProfile(loadedFrames);
            setQuoteItemRows((prev) =>
              prev.map((row) =>
                row.frameTypeId
                  ? row
                  : {
                      ...row,
                      frameTypeId: defFrame.id,
                      frameTypeName: formatFrameSectionLabel(defFrame),
                      framePrice: defFrame.quotationExtraRate || 0,
                    }
              )
            );
          }
        })
        .catch(() => {});

      // Always fetch FRP auto-pricing rate card rules (80x210, 90x230 @ 450, locks, colours, 28mm/30mm thicknesses)
      fetch('/api/quotations/pricing-rules')
        .then((res) => res.json())
        .then((json) => {
          if (json && json.settings) {
            const loadedSettings = json.settings as FrpRateCardSettings;
            setFrpSettings(loadedSettings);
            if (loadedSettings.defaultInstallationRatePerDoor !== undefined) {
              setInstallationRate(loadedSettings.defaultInstallationRatePerDoor);
            }
            if (loadedSettings.defaultInstallationLabel) {
              setInstallationNotes(loadedSettings.defaultInstallationLabel);
            }
            const defThk = getDefaultThicknessOption(loadedSettings.doorThicknesses);
            setQuoteItemRows((prev) =>
              prev.map((row) =>
                row.thicknessId
                  ? row
                  : {
                      ...row,
                      thicknessId: defThk.id,
                      thicknessLabel: defThk.name,
                      thicknessExtraRate: defThk.extraRate || 0,
                    }
              )
            );
          }
        })
        .catch(() => {});

      // Sync central door model catalog (standard + quotation custom models)
      fetch('/api/door-models')
        .then((res) => res.json())
        .then((json) => {
          if (json && json.success && Array.isArray(json.data) && json.data.length > 0) {
            setDoorModels((prev) => {
              const existingCodes = new Set(prev.map((m) => m.code.toUpperCase()));
              const toAdd: HubDoorModel[] = [];
              for (const apiM of json.data) {
                if (!existingCodes.has(apiM.code.toUpperCase())) {
                  existingCodes.add(apiM.code.toUpperCase());
                  toAdd.push({
                    id: `MOD-${apiM.code}`,
                    code: apiM.code,
                    title: apiM.name,
                    material: 'FRP',
                    rate: apiM.defaultPrice || 7000,
                    finish: 'Standard Factory Finish',
                    category: (apiM.category ? apiM.category.replace('CAT_', '') : 'A') as any,
                  });
                }
              }
              return toAdd.length > 0 ? [...prev, ...toAdd] : prev;
            });
          }
        })
        .catch(() => {});

      // Always load live customers, quotations, leads, production status, sales employees & site measurements from server
      Promise.all([
        apiFetch('/api/customers')
          .then((r) => r.json())
          .catch(() => null),
        apiFetch('/api/quotations')
          .then((r) => r.json())
          .catch(() => null),
        apiFetch('/api/production')
          .then((r) => r.json())
          .catch(() => null),
        apiFetch('/api/crm/leads')
          .then((r) => r.json())
          .catch(() => null),
        apiFetch('/api/employees')
          .then((r) => r.json())
          .catch(() => null),
        apiFetch('/api/measurements')
          .then((r) => r.json())
          .catch(() => null),
        apiFetch('/api/settings/company-profile?view=active')
          .then((r) => r.json())
          .catch(() => null),
      ])
        .then(([custJson, quotesJson, prodJson, leadsJson, empJson, measureJson, profileJson]) => {
          if (profileJson && profileJson.success && profileJson.data?.bankDetails) {
            setCompanyBankDetails(profileJson.data.bankDetails);
          }
          if (measureJson && Array.isArray(measureJson.data)) {
            setSiteMeasurements(measureJson.data);
          }
          if (empJson && Array.isArray(empJson.data)) {
            const staffList = empJson.data.map((e: any) => ({
              id: e.id,
              name: e.name,
              employeeCode: e.employeeCode,
              department: e.department,
              location: e.location,
              defaultPieceRate: e.defaultPieceRate,
              commissionSlabs: e.commissionSlabs,
            }));
            setSalesStaff(staffList);
            setSelectedSalespersonId((prev) => prev || (staffList[0]?.id ?? ''));
          }
          const loadedCustomers: HubCustomer[] =
            custJson && Array.isArray(custJson.data)
              ? custJson.data.map((c: { id: string; name: string; phone?: string; town?: string; district?: string; type?: string; gstin?: string }) => ({
                  id: c.id,
                  name: c.name,
                  phone: c.phone || '',
                  location: c.town || c.district || 'Kerala',
                  type: c.type || 'Direct',
                  gstin: c.gstin || '',
                }))
              : [];

          setCustomers(loadedCustomers);
          setSelectedCustomerId((prev) => prev || (loadedCustomers[0]?.id ?? ''));

          const custById = new Map(loadedCustomers.map((c) => [c.id, c]));
          const prodBySalesId = new Map<string, { jobCardNumber: string }>();
          if (prodJson && prodJson.success && Array.isArray(prodJson.data)) {
            for (const po of prodJson.data as Array<{ salesOrderId?: string | null; jobCardNumber: string }>) {
              if (po.salesOrderId && !prodBySalesId.has(po.salesOrderId)) {
                prodBySalesId.set(po.salesOrderId, { jobCardNumber: po.jobCardNumber });
              }
            }
          }

          if (quotesJson && Array.isArray(quotesJson.data)) {
            const mappedQuotes: HubQuotation[] = quotesJson.data.map((q: {
              id: string;
              quoteNumber?: string;
              customerId: string;
              customerName?: string;
              location?: string;
              itemsSummary?: string;
              subtotal?: number;
              totalAmount?: number;
              advancePercent?: number;
              advanceAmount?: number;
              date?: string;
              items?: Array<{ quantity?: number }>;
              itemRows?: QuoteItemRow[];
              includeInstallation?: boolean;
              installationMode?: 'PER_DOOR' | 'FIXED_LUMP_SUM';
              installationRate?: number;
              installationQty?: number;
              installationNotes?: string;
              installationAmount?: number;
              isConfirmed?: boolean;
              jobCardNumber?: string | null;
            }) => {
              const quoteDisplayId = q.quoteNumber || q.id;
              const matchedCust = custById.get(q.customerId);
              const matchedProd = prodBySalesId.get(quoteDisplayId) || prodBySalesId.get(q.id);
              const totalDoors = Array.isArray(q.items)
                ? q.items.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0)
                : 0;
              const gt = Number(q.totalAmount ?? q.subtotal ?? 0);

              return {
                id: quoteDisplayId,
                serverId: q.id,
                customerName:
                  q.customerName ||
                  matchedCust?.name ||
                  (q.customerId === 'DIRECT-CLIENT' ? 'Direct Client' : q.customerId),
                customerPhone: (q as any).customerPhone || matchedCust?.phone || (q as any).phone || '',
                location: q.location || matchedCust?.location || 'Kerala',
                itemsSummary: q.itemsSummary || `${totalDoors} Doors (${q.items?.length || 1} Items)`,
                gstMode: 'without',
                gstRate: 0,
                subtotal: Number(q.subtotal ?? gt),
                gstAmount: 0,
                grandTotal: gt,
                advancePercent: q.advancePercent ?? 50,
                advanceAmount: q.advanceAmount ?? Math.round(gt * 0.5),
                date: q.date || '',
                itemRows: Array.isArray(q.itemRows) ? q.itemRows : undefined,
                includeInstallation: q.includeInstallation,
                installationMode: q.installationMode,
                installationRate: q.installationRate,
                installationQty: q.installationQty,
                installationNotes: q.installationNotes,
                installationAmount: q.installationAmount,
                isConfirmed: Boolean(q.isConfirmed || matchedProd),
                jobCardNumber: q.jobCardNumber || matchedProd?.jobCardNumber || undefined,
                source: (q as any).source,
                quotationCategory: (q as any).quotationCategory,
                siteMeasurementId: (q as any).siteMeasurementId,
                siteMeasurementRef: (q as any).siteMeasurementRef,
                measuringStaffName: (q as any).measuringStaffName,
                salespersonId: (q as any).salespersonId,
                salespersonName: (q as any).salespersonName,
                salespersonCode: (q as any).salespersonCode,
                commissionPercent: (q as any).commissionPercent,
                commissionAmount: (q as any).commissionAmount,
                commissionStatus: (q as any).commissionStatus,
                territoryDistrict: (q as any).territoryDistrict,
                notes: (q as any).notes,
              };
            });
            setQuotations(mappedQuotes);
          }

          if (leadsJson && Array.isArray(leadsJson.data)) {
            const mappedLeads: HubLead[] = leadsJson.data.map((l: {
              id: string;
              leadCode?: string;
              title: string;
              client?: string;
              contactPerson?: string;
              district?: string;
              value?: number | null;
              estimatedValue?: number | null;
              doors?: string;
              doorCount?: number;
              stage?: string;
              notes?: string;
            }) => {
              let stage: HubLead['stage'] = 'inquiries';
              if (l.stage === 'MEASUREMENT_SCHEDULED' || l.stage === 'measurement') stage = 'measurement';
              else if (l.stage === 'QUOTE_SENT' || l.stage === 'quotation') stage = 'quotation';
              else if (l.stage === 'NEGOTIATION' || l.stage === 'negotiation') stage = 'negotiation';
              const numVal = Number(l.value ?? l.estimatedValue ?? 0);
              return {
                id: l.leadCode || l.id,
                title: l.title,
                client: `${l.client || l.contactPerson || 'Client'} - ${l.district || 'Kerala'}`,
                value: numVal > 0 ? `₹${(numVal / 100000).toFixed(2)}L` : '₹0.00',
                doors: l.doors || `${l.doorCount || 0} Doors`,
                stage,
                notes: l.notes,
              };
            });
            setLeads(mappedLeads);
          }
        })
        .catch(() => {});
    }
  }, []);

  const handleSelectTheme = (t: PrintTheme) => {
    setPrintTheme(t);
    if (typeof window !== 'undefined') {
      localStorage.setItem('exmark_print_theme', t);
    }
  };

  // Add Customer Form Fields
  const [newCustName, setNewCustName] = useState('');
  const [newCustPhone, setNewCustPhone] = useState('');
  const [newCustLocation, setNewCustLocation] = useState('');
  const [newCustType, setNewCustType] = useState('Architect');

  // Add Model Form Fields
  const [modelModalTab, setModelModalTab] = useState<'SINGLE' | 'BULK_PDF'>('SINGLE');
  const [bulkPdfFileName, setBulkPdfFileName] = useState<string>('');
  const [bulkParsedModels, setBulkParsedModels] = useState<HubDoorModel[]>([]);
  const [newModelCode, setNewModelCode] = useState('');
  const [newModelTitle, setNewModelTitle] = useState('');
  const [newModelMaterial, setNewModelMaterial] = useState<'FRP' | 'WPC' | 'Steel'>('FRP');
  const [newModelRate, setNewModelRate] = useState('4200');
  const [newModelFinish, setNewModelFinish] = useState('Matte Teak / Rosewood');

  // Search Filter
  const [searchQuery, setSearchQuery] = useState('');

  // Toast
  const [toastMessage, setToastMessage] = useState<{ title: string; desc: string; type?: 'success' | 'info' } | null>(null);

  const showToast = (title: string, desc: string, type: 'success' | 'info' = 'success') => {
    setToastMessage({ title, desc, type });
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Audio synthesis feedback
  const playBeep = (freq = 520, duration = 0.08) => {
    if (!audioEnabled || typeof window === 'undefined') return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, ctx.currentTime);
      gain.gain.setValueAtTime(0.05, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + duration);
    } catch {
      // ignore
    }
  };

  // Calculations for Active Form
  const totalQuoteDoorsQty = quoteItemRows.reduce((sum, r) => sum + (Number(r.qty) || 0), 0);
  const doorsSubtotal = quoteItemRows.reduce((sum, r) => sum + (Number(r.qty) || 0) * r.rate, 0);
  const resolvedInstallQty =
    installationMode === 'FIXED_LUMP_SUM'
      ? 1
      : installationCustomQty !== null
      ? Math.max(0, installationCustomQty)
      : totalQuoteDoorsQty;
  const installationAmount = includeInstallation
    ? Math.max(
        0,
        installationMode === 'FIXED_LUMP_SUM'
          ? Number(installationRate) || 0
          : resolvedInstallQty * (Number(installationRate) || 0)
      )
    : 0;
  const subtotal = doorsSubtotal + installationAmount;
  const itemsSubtotal = subtotal;
  const discountedTotal = Math.max(0, subtotal - (Number(additionalDiscount) || 0));
  const grandTotal = Math.max(0, discountedTotal + (Number(roundOffAmount) || 0));
  const gstAmount = 0;

  // 30% Minimum Advance Hard Lock & Dual-Mode Calculation
  const min30AdvanceAmount = Math.round(grandTotal * 0.30);
  const advanceAmount = advanceInputMode === 'CUSTOM' && customAdvanceRupees !== ''
    ? Math.round(Number(customAdvanceRupees))
    : Math.round(grandTotal * (advancePercent / 100));
  const resolvedAdvancePercent = grandTotal > 0
    ? Math.round((advanceAmount / grandTotal) * 100)
    : advancePercent;
  const isAdvanceValid = grandTotal <= 0 || (advanceAmount >= min30AdvanceAmount && resolvedAdvancePercent >= 30);
  const balanceAmount = Math.max(0, grandTotal - advanceAmount);

  const handleAutoRoundOff = () => {
    const raw = (doorsSubtotal + installationAmount) - (Number(additionalDiscount) || 0);
    if (raw <= 0) return;
    const rem100 = raw % 100;
    const rem10 = raw % 10;
    if (roundOffAmount === 0 && rem100 !== 0) {
      setRoundOffAmount(-rem100);
    } else if (roundOffAmount === -rem100 && rem10 !== 0 && rem10 !== rem100) {
      setRoundOffAmount(-rem10);
    } else {
      setRoundOffAmount(0);
    }
  };

  // Advance Quotation Profit & Margin Calculation
  const quotationProfitEstimate = useMemo(() => {
    return calculateQuotationProfit({
      rows: quoteItemRows.map((r, idx) => {
        const model = doorModels.find((m) => m.id === r.modelId);
        return {
          id: String(r.id || idx),
          modelId: r.modelId,
          modelTitle: model?.title || r.modelId,
          unit: r.unit,
          height: r.height,
          widthTop: r.widthTop ?? r.width ?? 0,
          width: r.width ?? 0,
          qty: r.qty,
          rate: r.rate,
          frameTypeId: r.frameTypeId,
          frameTypeName: r.frameTypeName,
          lockId: r.lockId,
          colourId: r.colourId,
          withoutAccessories: r.withoutAccessories,
          withoutFrame:
            r.frameTypeId === 'FRM-005' ||
            (r.frameTypeName || '').toLowerCase().includes('shutter only') ||
            (r.frameTypeName || '').toLowerCase().includes('without frame'),
        };
      }),
      includeInstallation,
      installationAmount,
      discount: (Number(additionalDiscount) || 0) - (Number(roundOffAmount) || 0),
      boqRates: profitConfig?.boqRates || null,
      customFrames: profitConfig?.customFrames || framesList,
      contractorRates: profitConfig?.contractorRates || null,
    });
  }, [quoteItemRows, includeInstallation, installationAmount, profitConfig, doorModels, framesList]);

  // Shared helper to recalculate FRP row rate with active settings & frame
  const computeAutoPriceForRow = (
    row: {
      frpCategory?: FrpDoorCategory | 'CUSTOM';
      height: number;
      widthTop?: number;
      widthBottom?: number;
      width?: number;
      unit: 'cm' | 'mm' | 'inch';
      heightFraction?: string;
      widthTopFraction?: string;
      widthFraction?: string;
      widthBottomFraction?: string;
      lockId?: string;
      lockPrice?: number;
      withoutAccessories?: boolean;
      supplyMode?: SupplyMode;
      colourId?: string;
      colourExtraRate?: number;
      frameTypeId?: string;
      frameTypeName?: string;
      framePrice?: number;
      thicknessId?: string;
      thicknessLabel?: string;
      thicknessExtraRate?: number;
    },
    settingsOverride?: FrpRateCardSettings
  ) => {
    const wT = row.widthTop ?? row.width ?? 0;
    const wB = row.widthBottom ?? wT;
    return calculateFrpDoorPrice({
      category: (row.frpCategory && row.frpCategory !== 'CUSTOM' ? row.frpCategory : 'A') as FrpDoorCategory,
      height: row.height,
      widthTop: wT,
      widthBottom: wB,
      unit: row.unit,
      heightFraction: row.heightFraction,
      widthTopFraction: row.widthTopFraction || row.widthFraction,
      widthBottomFraction: row.widthBottomFraction || row.widthTopFraction || row.widthFraction,
      lockId: row.lockId,
      lockPrice: row.lockPrice,
      withoutAccessories: row.withoutAccessories,
      supplyMode: row.supplyMode || (row.withoutAccessories ? 'NO_ACCESSORIES' : 'FULL_SET'),
      colourId: row.colourId,
      colourExtraRate: row.colourExtraRate,
      frameTypeId: row.frameTypeId,
      frameTypeName: row.frameTypeName,
      framePrice: row.framePrice,
      thicknessId: row.thicknessId,
      thicknessLabel: row.thicknessLabel,
      thicknessExtraRate: row.thicknessExtraRate,
      settings: settingsOverride || frpSettings,
    });
  };

  // Live handler when frames are Added / Edited / Deleted via Frame Manager Modal
  const handleFramesUpdated = (updatedFrames: CustomFrameProfile[]) => {
    const activeFrames = updatedFrames.length > 0 ? updatedFrames : DEFAULT_FRAME_PROFILES;
    setFramesList(activeFrames);
    const defaultFrame = getDefaultFrameProfile(activeFrames);

    setQuoteItemRows((prev) =>
      prev.map((row) => {
        const matched = activeFrames.find((f) => f.id === row.frameTypeId);
        const resolved = matched || defaultFrame;
        const nextRow: QuoteItemRow = {
          ...row,
          frameTypeId: resolved.id,
          frameTypeName: formatFrameSectionLabel(resolved),
          framePrice: resolved.quotationExtraRate || 0,
        };
        if (nextRow.frpCategory && nextRow.frpCategory !== 'CUSTOM') {
          const calc = computeAutoPriceForRow(nextRow);
          nextRow.rate = calc.finalUnitRate;
          nextRow.autoPriceBreakdown = calc.breakdown;
        }
        return nextRow;
      })
    );
  };

  // Row Manipulation
  const handleAddRow = () => {
    const nextId = quoteItemRows.length + 1;
    const firstModel = doorModels[0];
    const defaultCat: FrpDoorCategory = firstModel?.category || (firstModel?.code ? detectCategoryFromModelCode(firstModel.code) : null) || 'A';
    const defaultLock = getDefaultLockOption(frpSettings.locks);
    const defaultColour = (frpSettings.colours && frpSettings.colours[0]) || DEFAULT_COLOUR_OPTIONS[0];
    const defaultFrame = getDefaultFrameProfile(framesList);
    const frameTypeName = formatFrameSectionLabel(defaultFrame);
    const framePrice = defaultFrame.quotationExtraRate || 0;
    const defaultThickness = getDefaultThicknessOption(frpSettings.doorThicknesses);
    const thicknessLabel = defaultThickness.name;
    const thicknessExtraRate = defaultThickness.extraRate || 0;

    const autoCalc = calculateFrpDoorPrice({
      category: defaultCat,
      height: 210,
      widthTop: 80,
      widthBottom: 80,
      unit: 'cm',
      lockId: defaultLock?.id,
      lockPrice: defaultLock?.price,
      colourId: defaultColour?.id,
      colourExtraRate: defaultColour?.extraRate,
      frameTypeId: defaultFrame.id,
      frameTypeName,
      framePrice,
      thicknessId: defaultThickness.id,
      thicknessLabel,
      thicknessExtraRate,
      settings: frpSettings,
    });

    setQuoteItemRows([
      ...quoteItemRows,
      {
        id: nextId,
        modelId: firstModel.id,
        unit: 'cm',
        height: 210,
        heightFraction: '0',
        widthTop: 80,
        widthTopFraction: '0',
        widthBottom: 80,
        widthBottomFraction: '0',
        width: 80,
        widthFraction: '0',
        qty: 1,
        rate: autoCalc.finalUnitRate,
        frpCategory: defaultCat,
        autoPriceBreakdown: autoCalc.breakdown,
        lockId: defaultLock?.id || 'lock-none',
        lockName: defaultLock?.name || 'BABY LATCH',
        lockPrice: defaultLock?.price || 0,
        colourId: defaultColour?.id || 'col-teak-matte',
        colourName: defaultColour?.name || 'Natural Teak',
        colourExtraRate: defaultColour?.extraRate || 0,
        frameTypeId: defaultFrame.id,
        frameTypeName,
        framePrice,
        thicknessId: defaultThickness.id,
        thicknessLabel,
        thicknessExtraRate,
        sectionName: quoteItemRows.length > 0 ? quoteItemRows[quoteItemRows.length - 1].sectionName : undefined,
      },
    ]);
  };

  const handleAddSectionRow = (sectionName: string) => {
    const nextId = quoteItemRows.length + 1;
    const firstModel = doorModels[0];
    const defaultCat: FrpDoorCategory = firstModel?.category || (firstModel?.code ? detectCategoryFromModelCode(firstModel.code) : null) || 'A';
    const defaultLock = getDefaultLockOption(frpSettings.locks);
    const defaultColour = (frpSettings.colours && frpSettings.colours[0]) || DEFAULT_COLOUR_OPTIONS[0];
    const defaultFrame = getDefaultFrameProfile(framesList);
    const frameTypeName = formatFrameSectionLabel(defaultFrame);
    const framePrice = defaultFrame.quotationExtraRate || 0;
    const defaultThickness = getDefaultThicknessOption(frpSettings.doorThicknesses);
    const thicknessLabel = defaultThickness.name;
    const thicknessExtraRate = defaultThickness.extraRate || 0;

    const autoCalc = calculateFrpDoorPrice({
      category: defaultCat,
      height: 210,
      widthTop: 80,
      widthBottom: 80,
      unit: 'cm',
      lockId: defaultLock?.id,
      lockPrice: defaultLock?.price,
      framePrice,
      thicknessExtraRate,
      colourExtraRate: defaultColour?.extraRate,
      settings: frpSettings,
    });

    setQuoteItemRows([
      ...quoteItemRows,
      {
        id: nextId,
        modelId: firstModel.id,
        unit: 'cm',
        height: 210,
        heightFraction: '0',
        widthTop: 80,
        widthTopFraction: '0',
        widthBottom: 80,
        widthBottomFraction: '0',
        width: 80,
        widthFraction: '0',
        qty: 1,
        rate: autoCalc.finalUnitRate,
        frpCategory: defaultCat,
        autoPriceBreakdown: autoCalc.breakdown,
        lockId: defaultLock?.id || 'lock-none',
        lockName: defaultLock?.name || 'BABY LATCH',
        lockPrice: defaultLock?.price || 0,
        colourId: defaultColour?.id || 'col-teak-matte',
        colourName: defaultColour?.name || 'Natural Teak',
        colourExtraRate: defaultColour?.extraRate || 0,
        frameTypeId: defaultFrame.id,
        frameTypeName,
        framePrice,
        thicknessId: defaultThickness.id,
        thicknessLabel,
        thicknessExtraRate,
        sectionName,
      },
    ]);
    showToast('Section Added', `Added new item under "${sectionName}"`, 'success');
  };

  const handleUpdateRow = (index: number, updates: Partial<QuoteItemRow>) => {
    const updated = [...quoteItemRows];
    const currentRow = updated[index];

    // Handle unit conversion if unit changes
    if (updates.unit && updates.unit !== currentRow.unit) {
      let h = currentRow.height;
      let wT = currentRow.widthTop ?? currentRow.width ?? 0;
      let wB = currentRow.widthBottom ?? wT;
      const oldUnit = currentRow.unit;
      const newUnit = updates.unit;

      let hInches = h;
      let wTInches = wT;
      let wBInches = wB;

      if (oldUnit === 'inch') {
        hInches += parseInchFraction(currentRow.heightFraction);
        wTInches += parseInchFraction(currentRow.widthTopFraction || currentRow.widthFraction);
        wBInches += parseInchFraction(currentRow.widthBottomFraction || currentRow.widthTopFraction || currentRow.widthFraction);
      } else if (oldUnit === 'cm') {
        hInches = h / 2.54;
        wTInches = wT / 2.54;
        wBInches = wB / 2.54;
      } else if (oldUnit === 'mm') {
        hInches = h / 25.4;
        wTInches = wT / 25.4;
        wBInches = wB / 25.4;
      }

      if (newUnit === 'inch') {
        const hDecomp = decimalToInchFraction(hInches);
        const wtDecomp = decimalToInchFraction(wTInches);
        const wbDecomp = decimalToInchFraction(wBInches);
        updates.height = hDecomp.whole;
        updates.heightFraction = hDecomp.fraction;
        updates.widthTop = wtDecomp.whole;
        updates.widthTopFraction = wtDecomp.fraction;
        updates.widthBottom = wbDecomp.whole;
        updates.widthBottomFraction = wbDecomp.fraction;
        updates.width = wtDecomp.whole;
        updates.widthFraction = wtDecomp.fraction;
      } else if (newUnit === 'cm') {
        updates.height = Math.round(hInches * 2.54 * 10) / 10;
        updates.widthTop = Math.round(wTInches * 2.54 * 10) / 10;
        updates.widthBottom = Math.round(wBInches * 2.54 * 10) / 10;
        updates.width = updates.widthTop;
        updates.heightFraction = '0';
        updates.widthTopFraction = '0';
        updates.widthBottomFraction = '0';
        updates.widthFraction = '0';
      } else if (newUnit === 'mm') {
        updates.height = Math.round(hInches * 25.4);
        updates.widthTop = Math.round(wTInches * 25.4);
        updates.widthBottom = Math.round(wBInches * 25.4);
        updates.width = updates.widthTop;
        updates.heightFraction = '0';
        updates.widthTopFraction = '0';
        updates.widthBottomFraction = '0';
        updates.widthFraction = '0';
      }
    }

    // Auto-detect Category & price when model changes (e.g. EXM-A-101 -> Cat A, EXM-B-201 -> Cat B @ ₹7,600, C, D, F/E)
    if (updates.modelId && updates.modelId !== currentRow.modelId) {
      const found = doorModels.find((m) => m.id === updates.modelId || m.code === updates.modelId);
      if (found) {
        updates.modelCode = found.code;
        updates.modelTitle = found.title;
        const detectedCat = found.category || detectCategoryFromModelCode(found.code);
        if (detectedCat) {
          updates.frpCategory = detectedCat;
        } else if (!currentRow.frpCategory || currentRow.frpCategory === 'CUSTOM') {
          updates.rate = found.rate;
        }
      }
    }

    // Auto-sync hardware lock price & name
    if (updates.lockId !== undefined && updates.lockId !== currentRow.lockId) {
      const activeLocks = frpSettings.locks && frpSettings.locks.length > 0 ? frpSettings.locks : DEFAULT_LOCK_OPTIONS;
      const foundLock = activeLocks.find((l) => l.id === updates.lockId);
      updates.lockPrice = foundLock ? foundLock.price : 0;
      updates.lockName = foundLock ? foundLock.name : 'BABY LATCH';
    }

    // Auto-sync colour extra surcharge & name
    if (updates.colourId !== undefined && updates.colourId !== currentRow.colourId) {
      const activeColours = frpSettings.colours && frpSettings.colours.length > 0 ? frpSettings.colours : DEFAULT_COLOUR_OPTIONS;
      const foundCol = activeColours.find((c) => c.id === updates.colourId);
      updates.colourExtraRate = foundCol ? (foundCol.extraRate || 0) : 0;
      updates.colourName = foundCol ? foundCol.name : 'Natural Teak';
    }

    // Auto-sync frame profile name & extra surcharge
    if (updates.frameTypeId !== undefined && updates.frameTypeId !== currentRow.frameTypeId) {
      const foundFrame = framesList.find((f) => f.id === updates.frameTypeId);
      updates.frameTypeName = foundFrame ? formatFrameSectionLabel(foundFrame) : '';
      updates.framePrice = foundFrame ? (foundFrame.quotationExtraRate || 0) : 0;
    }

    // Auto-sync door thickness label & extra surcharge
    if (updates.thicknessId !== undefined && updates.thicknessId !== currentRow.thicknessId) {
      const activeThicknesses =
        frpSettings.doorThicknesses && frpSettings.doorThicknesses.length > 0
          ? frpSettings.doorThicknesses
          : DEFAULT_THICKNESS_OPTIONS;
      const foundThk = activeThicknesses.find((t) => t.id === updates.thicknessId);
      updates.thicknessLabel = foundThk ? foundThk.name : '';
      updates.thicknessExtraRate = foundThk ? (foundThk.extraRate || 0) : 0;
    }

    // Auto-pricing engine calculation for FRP doors (Category A-E)
    const activeCategory = updates.frpCategory !== undefined ? updates.frpCategory : currentRow.frpCategory;
    const isDimensionOrSpecChange =
      updates.modelId !== undefined ||
      updates.height !== undefined ||
      updates.widthTop !== undefined ||
      updates.widthBottom !== undefined ||
      updates.width !== undefined ||
      updates.unit !== undefined ||
      updates.heightFraction !== undefined ||
      updates.widthTopFraction !== undefined ||
      updates.widthBottomFraction !== undefined ||
      updates.frpCategory !== undefined ||
      updates.lockId !== undefined ||
      updates.lockPrice !== undefined ||
      updates.withoutAccessories !== undefined ||
      updates.supplyMode !== undefined ||
      updates.widthLinked !== undefined ||
      updates.colourId !== undefined ||
      updates.colourExtraRate !== undefined ||
      updates.frameTypeId !== undefined ||
      updates.framePrice !== undefined ||
      updates.thicknessId !== undefined ||
      updates.thicknessExtraRate !== undefined;

    if (activeCategory && activeCategory !== 'CUSTOM' && isDimensionOrSpecChange && updates.rate === undefined) {
      const mergedRow = { ...currentRow, ...updates };
      const priceResult = computeAutoPriceForRow(mergedRow);

      updates.rate = priceResult.finalUnitRate;
      updates.autoPriceBreakdown = priceResult.breakdown;
    }

    updated[index] = { ...currentRow, ...updates };
    setQuoteItemRows(updated);
  };

  const handleDeleteRow = (index: number) => {
    if (quoteItemRows.length <= 1) {
      showToast('Warning', 'Quotation must have at least one door item.', 'info');
      return;
    }
    setQuoteItemRows(quoteItemRows.filter((_, idx) => idx !== index));
  };

  const handleClearAllToZero = () => {
    setQuoteItemRows([createZeroRow(1, doorModels[0]?.id)]);
    setIncludeInstallation(false);
    setInstallationCustomQty(null);
    setAdditionalDiscount(0);
    setRoundOffAmount(0);
    setSelectedSalespersonId('');
    playBeep(480, 0.08);
    showToast('Workbench Cleared to Zero', 'All door quantities, dimensions, and rates set to 0 (₹0).', 'info');
  };

  // Edit Existing Quotation (CRUD - Edit)
  const handleEditQuotation = (q: HubQuotation) => {
    setEditingQuoteId(q.id);
    setActiveTab('quotations');
    setSelectedSalespersonId(q.salespersonId || '');

    const foundCust = customers.find((c) => c.name.toLowerCase() === q.customerName.toLowerCase());
    if (foundCust) {
      setSelectedCustomerId(foundCust.id);
    }

    const loadedAdvPct = q.advancePercent && q.advancePercent >= 30 ? q.advancePercent : 50;
    setAdvancePercent(loadedAdvPct);
    if (q.advanceAmount && Math.round(q.grandTotal * (loadedAdvPct / 100)) !== q.advanceAmount) {
      setAdvanceInputMode('CUSTOM');
      setCustomAdvanceRupees(q.advanceAmount);
    } else {
      setAdvanceInputMode('PRESET');
      setCustomAdvanceRupees('');
    }
    const qCommType = 'PER_PIECE';
    const qCommRate = (q as any).commissionRate !== undefined 
      ? Number((q as any).commissionRate) 
      : ((q as any).commissionAmount && (q as any).itemRows?.length
          ? Math.round(Number((q as any).commissionAmount) / Math.max(1, (q as any).itemRows.reduce((s: number, r: any) => s + (Number(r.qty) || 1), 0)))
          : ((q as any).commissionPercent ?? 0));
    setDraftCommissionType(qCommType);
    setDraftCommissionRate(qCommRate);
    setIncludeInstallation(Boolean(q.includeInstallation));
    setInstallationMode(q.installationMode || 'PER_DOOR');
    setInstallationRate(
      q.installationRate ?? (frpSettings.defaultInstallationRatePerDoor ?? 500)
    );
    setInstallationCustomQty(q.installationQty !== undefined ? q.installationQty : null);
    setInstallationNotes(
      q.installationNotes ||
        frpSettings.defaultInstallationLabel ||
        'Site Door & Frame Installation (Hardware & Fitting)'
    );
    setAdditionalDiscount(q.discount || 0);
    setRoundOffAmount(q.roundOff || 0);
    if (q.targetDeliveryDate) {
      setTargetDeliveryDate(q.targetDeliveryDate);
    }
    if (q.deliveryDistrict) {
      setDeliveryDistrict(q.deliveryDistrict);
    }

    const defaultFrame = getDefaultFrameProfile(framesList);
    const defaultThickness = getDefaultThicknessOption(frpSettings.doorThicknesses);
    if (q.itemRows && q.itemRows.length > 0) {
      setQuoteItemRows(
        q.itemRows.map((row) => ({
          ...row,
          widthLinked: row.widthLinked !== undefined ? row.widthLinked : (row.widthBottom === undefined || row.widthBottom === row.widthTop),
          supplyMode: row.supplyMode || (row.withoutAccessories ? 'NO_ACCESSORIES' : 'FULL_SET'),
          frameTypeId: row.frameTypeId || defaultFrame.id,
          frameTypeName: row.frameTypeName || formatFrameSectionLabel(defaultFrame),
          framePrice: row.framePrice ?? (defaultFrame.quotationExtraRate || 0),
          thicknessId: row.thicknessId || defaultThickness.id,
          thicknessLabel: row.thicknessLabel || defaultThickness.name,
          thicknessExtraRate: row.thicknessExtraRate ?? (defaultThickness.extraRate || 0),
        }))
      );
    } else {
      const defaultLock = (frpSettings.locks && frpSettings.locks[0]) || DEFAULT_LOCK_OPTIONS[0];
      const defaultColour = (frpSettings.colours && frpSettings.colours[0]) || DEFAULT_COLOUR_OPTIONS[0];
      setQuoteItemRows([
        {
          id: 1,
          modelId: INITIAL_MODELS[0]?.id || 'MOD-101',
          unit: 'cm',
          height: 210,
          heightFraction: '0',
          widthTop: 80,
          widthTopFraction: '0',
          widthBottom: 80,
          widthBottomFraction: '0',
          width: 80,
          widthFraction: '0',
          qty: 1,
          rate: q.subtotal > 0 ? q.subtotal : 7000,
          frpCategory: 'A',
          autoPriceBreakdown: `Imported from ${q.id}`,
          lockId: defaultLock?.id,
          lockPrice: defaultLock?.price || 0,
          colourId: defaultColour?.id,
          colourExtraRate: defaultColour?.extraRate || 0,
          frameTypeId: defaultFrame.id,
          frameTypeName: formatFrameSectionLabel(defaultFrame),
          framePrice: defaultFrame.quotationExtraRate || 0,
          thicknessId: defaultThickness.id,
          thicknessLabel: defaultThickness.name,
          thicknessExtraRate: defaultThickness.extraRate || 0,
        },
      ]);
    }

    playBeep(580, 0.1);
    showToast('Editing Quotation', `Loaded ${q.id} into workbench. Modify specifications and click "Update Quotation".`, 'info');
    if (typeof window !== 'undefined') {
      window.scrollTo({ top: 100, behavior: 'smooth' });
    }
  };

  const handleCancelEdit = () => {
    setEditingQuoteId(null);
    setIncludeInstallation(false);
    setInstallationCustomQty(null);
    setAdditionalDiscount(0);
    setRoundOffAmount(0);
    setSelectedSalespersonId('');
    setDraftCommissionType('PER_PIECE');
    setDraftCommissionRate(0);
    showToast('Edit Mode Cancelled', 'Quotation generator returned to standard new draft mode.', 'info');
  };

  // Delete Quotation (CRUD - Delete)
  const handleDeleteQuotation = async (id: string) => {
    if (!window.confirm(`Are you sure you want to delete quotation ${id}? This action cannot be undone.`)) {
      return;
    }
    const target = quotations.find((q) => q.id === id);
    try {
      await apiFetch(`/api/quotations/${encodeURIComponent(target?.serverId || id)}`, {
        method: 'DELETE',
      });
    } catch {
      // offline fallback
    }
    setQuotations((prev) => prev.filter((q) => q.id !== id));
    if (editingQuoteId === id) {
      setEditingQuoteId(null);
    }
    playBeep(420, 0.1);
    showToast('Quotation Deleted', `Quotation ${id} was permanently removed.`);
  };

  const refreshMeasurements = async () => {
    try {
      const res = await apiFetch('/api/measurements');
      const json = await res.json();
      if (json && Array.isArray(json.data)) {
        setSiteMeasurements(json.data);
      }
    } catch {}
  };

  const handleImportSiteMeasurementToWorkbench = (measurement: SiteMeasurementRecord) => {
    if (!measurement || !measurement.doors || measurement.doors.length === 0) {
      showToast('Empty Measurement', 'This site measurement record does not contain any door openings.', 'info');
      return;
    }

    // 1. Resolve or set customer
    if (measurement.customerId) {
      const matched = customers.find((c) => c.id === measurement.customerId);
      if (matched) {
        setSelectedCustomerId(matched.id);
      } else {
        setSelectedCustomerId(measurement.customerId);
      }
    }

    // 2. Resolve salesperson to the measuring staff
    const engName = (measurement.engineerName || '').trim();
    if (engName) {
      const matchedStaff = salesStaff.find(
        (s) =>
          (measurement.measuredById && s.id === measurement.measuredById) ||
          s.name.toLowerCase().includes(engName.toLowerCase().split(' ')[0])
      );
      if (matchedStaff) {
        setSelectedSalespersonId(matchedStaff.id);
      }
    }

    // 3. Set delivery district if present
    if (measurement.district) {
      setDeliveryDistrict(measurement.district);
    }

    // 4. Map door openings into QuoteItemRows
    const newRows: QuoteItemRow[] = measurement.doors.map((door, idx) => {
      const modelObj = doorModels.find(
        (m) =>
          m.code.toLowerCase() === (door.model || '').toLowerCase() ||
          door.model?.toLowerCase().includes(m.code.toLowerCase())
      );
      const modelId = modelObj?.id || doorModels[0]?.id || 'MOD-101';

      const u = door.measurementUnit || 'CM';
      let hVal = door.heightLeft || 210;
      let wTopVal = door.widthTop || 80;
      let wBtmVal = door.widthBottom || door.widthTop || 80;

      if (u === 'MM') {
        hVal = Math.round(hVal / 10);
        wTopVal = Math.round(wTopVal / 10);
        wBtmVal = Math.round(wBtmVal / 10);
      } else if (u === 'INCH') {
        hVal = Math.round(hVal * 2.54);
        wTopVal = Math.round(wTopVal * 2.54);
        wBtmVal = Math.round(wBtmVal * 2.54);
      }

      return {
        id: idx + 1,
        modelId,
        unit: 'cm',
        height: hVal,
        heightFraction: '0',
        widthTop: wTopVal,
        widthTopFraction: '0',
        widthBottom: wBtmVal,
        widthBottomFraction: '0',
        width: wTopVal,
        widthFraction: '0',
        widthLinked: wTopVal === wBtmVal,
        qty: door.quantity || 1,
        rate: door.unitPrice || 7500,
        sectionName: door.doorNumber || `D${idx + 1}`,
      };
    });

    setQuoteItemRows(newRows);
    setActiveDraftSiteRef(measurement.refNumber);
    setActiveDraftSiteId(measurement.id);
    setActiveDraftMeasuringStaff(measurement.engineerName || null);

    setActiveTab('quotations');
    playBeep(750, 0.15);
    showToast(
      'Site Measurement Loaded',
      `Imported ${measurement.doors.length} doors from ${measurement.refNumber} (${measurement.siteName}). Measuring staff set as Sales Rep.`
    );
  };

  // Save or Update Quotation (CRUD - Create & Update)
  const handleSaveQuotation = async () => {
    const totalDoors = quoteItemRows.reduce((acc, r) => acc + (Number(r.qty) || 0), 0);
    if (totalDoors <= 0) {
      playBeep(350, 0.15);
      showToast('Zero Quantity', 'Please enter a door quantity greater than 0 before generating a quotation.', 'info');
      return;
    }

    // 30% Minimum Advance Hard Lock Validation
    if (!isAdvanceValid || advanceAmount < min30AdvanceAmount || resolvedAdvancePercent < 30) {
      playBeep(380, 0.15);
      showToast(
        '30% Advance Locked',
        `Minimum 30% advance deposit (₹${min30AdvanceAmount.toLocaleString('en-IN')}) is mandatory. Advances below 30% cannot be forwarded.`,
        'info'
      );
      return;
    }

    const cust = customers.find((c) => c.id === selectedCustomerId) || { name: 'Direct Client', location: 'Kerala' };

    const installPayload = {
      includeInstallation,
      installationMode,
      installationRate: Number(installationRate) || 0,
      installationQty: resolvedInstallQty,
      installationNotes:
        installationNotes.trim() || 'Site Door & Frame Installation (Hardware & Fitting)',
      installationAmount: Math.round(installationAmount),
    };
    const itemsLabel = `${totalDoors} FRP Doors (${quoteItemRows.length} Sizes${
      includeInstallation ? ' + Installation' : ''
    })`;

    const selectedStaff = salesStaff.find((s) => s.id === selectedSalespersonId);
    const resolvedCommAmount = Math.round(totalDoors * draftCommissionRate);

    const salespersonPayload = selectedStaff
      ? {
          salespersonId: selectedStaff.id,
          salespersonName: selectedStaff.name,
          salespersonCode: selectedStaff.employeeCode,
          commissionType: 'PER_PIECE' as const,
          commissionRate: draftCommissionRate,
          commissionPercent: grandTotal > 0 ? Number(((resolvedCommAmount / grandTotal) * 100).toFixed(2)) : 0,
          commissionAmount: resolvedCommAmount,
          commissionStatus: 'PROJECTED' as const,
          territoryDistrict: deliveryDistrict,
        }
      : {};

    const apiItems = quoteItemRows
      .filter((r) => Number(r.qty) > 0)
      .map((r) => {
        const modelObj = doorModels.find((m) => m.id === r.modelId);
        const unitExtras =
          (Number(r.lockPrice) || 0) +
          (Number(r.colourExtraRate) || 0) +
          (Number(r.framePrice) || 0) +
          (Number(r.thicknessExtraRate) || 0);
        const effUnitRate = (Number(r.rate) || 0) + unitExtras;
        const qtyNum = Number(r.qty) || 1;
        const factor = r.unit === 'inch' ? 25.4 : r.unit === 'cm' ? 10 : 1;
        return {
          doorCategory: modelObj?.material === 'WPC' ? 'WPC_DOORS' : 'FRP_DOORS',
          doorModel: modelObj?.code || r.modelCode || r.modelTitle || modelObj?.title || r.modelId || 'EXM-A-101',
          heightMm: Math.round((Number(r.height) || 210) * factor),
          widthMm: Math.round((Number(r.widthTop ?? r.width) || 80) * factor),
          widthBottomMm: Math.round((Number(r.widthBottom ?? r.widthTop ?? r.width) || 80) * factor),
          thicknessMm: 32,
          finishColor: modelObj?.finish || undefined,
          quantity: qtyNum,
          unitPrice: effUnitRate,
          gstRate: 0,
          totalPrice: Math.round(effUnitRate * qtyNum),
        };
      });

    if (editingQuoteId) {
      // UPDATE EXISTING QUOTATION
      const existingQuote = quotations.find((q) => q.id === editingQuoteId);
      const quoteDate =
        existingQuote?.date ||
        new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      const updatedQuote: HubQuotation = {
        id: editingQuoteId,
        serverId: existingQuote?.serverId,
        customerName: cust.name,
        location: cust.location,
        itemsSummary: itemsLabel,
        gstMode: 'without',
        gstRate: 0,
        subtotal: Math.round(itemsSubtotal),
        discount: Math.round(additionalDiscount),
        roundOff: Math.round(roundOffAmount),
        gstAmount: 0,
        grandTotal: Math.round(grandTotal),
        advancePercent: resolvedAdvancePercent,
        advanceAmount: Math.round(advanceAmount),
        date: quoteDate,
        targetDeliveryDate,
        deliveryDistrict,
        itemRows: [...quoteItemRows],
        ...installPayload,
        ...salespersonPayload,
      };

      try {
        await apiFetch(`/api/quotations/${encodeURIComponent(existingQuote?.serverId || editingQuoteId)}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            customerId: selectedCustomerId || 'DIRECT-CLIENT',
            customerName: cust.name,
            location: cust.location,
            itemsSummary: itemsLabel,
            items: apiItems,
            itemRows: quoteItemRows,
            targetDeliveryDate,
            deliveryDistrict,
            overrideSubtotal: Math.round(itemsSubtotal),
            discount: Math.round(additionalDiscount),
            roundOff: Math.round(roundOffAmount),
            overrideTotalAmount: Math.round(grandTotal),
            advancePercent: resolvedAdvancePercent,
            advanceAmount: Math.round(advanceAmount),
            ...installPayload,
            ...salespersonPayload,
          }),
        });
      } catch {
        // Offline resilience
      }

      setQuotations(quotations.map((q) => (q.id === editingQuoteId ? updatedQuote : q)));
      setEditingQuoteId(null);
      playBeep(680, 0.12);
      showToast('Quotation Updated Successfully', `${editingQuoteId} for ${cust.name} has been saved.`);
      setPreviewQuote(updatedQuote);

      // Auto-clear workbench completely for next quotation entry
      setQuoteItemRows([createZeroRow(1, doorModels[0]?.id)]);
      setIncludeInstallation(false);
      setInstallationCustomQty(null);
      setAdditionalDiscount(0);
      setRoundOffAmount(0);
      setAdvanceInputMode('PRESET');
      setAdvancePercent(50);
      setCustomAdvanceRupees('');
      setSelectedCustomerId('');
      setSelectedSalespersonId('');
      return;
    }

    // CREATE NEW QUOTATION
    const quoteDate = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
    let resolvedId = `QT-2026-0${quotations.length + 101}`;
    let serverId: string | undefined;

    try {
      const res = await apiFetch('/api/quotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: selectedCustomerId || 'DIRECT-CLIENT',
          customerName: cust.name,
          location: cust.location,
          itemsSummary: itemsLabel,
          date: quoteDate,
          targetDeliveryDate,
          deliveryDistrict,
          items: apiItems,
          itemRows: quoteItemRows,
          overrideSubtotal: Math.round(itemsSubtotal),
          discount: Math.round(additionalDiscount),
          roundOff: Math.round(roundOffAmount),
          overrideTotalAmount: Math.round(grandTotal),
          advancePercent: resolvedAdvancePercent,
          advanceAmount: Math.round(advanceAmount),
          quotationCategory: activeDraftSiteRef ? 'SITE_MEASUREMENT' : 'SHOWROOM_DIRECT',
          siteMeasurementRef: activeDraftSiteRef || undefined,
          siteMeasurementId: activeDraftSiteId || undefined,
          measuringStaffName: activeDraftMeasuringStaff || undefined,
          ...installPayload,
          ...salespersonPayload,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json?.success && json.data) {
          serverId = json.data.id;
          resolvedId = json.data.quoteNumber || json.data.id;
        }
      }
    } catch {
      // Fallback ID if offline
    }

    const newQuote: HubQuotation = {
      id: resolvedId,
      serverId,
      customerName: cust.name,
      location: cust.location,
      itemsSummary: itemsLabel,
      gstMode: 'without',
      gstRate: 0,
      subtotal: Math.round(itemsSubtotal),
      discount: Math.round(additionalDiscount),
      roundOff: Math.round(roundOffAmount),
      gstAmount: 0,
      grandTotal: Math.round(grandTotal),
      advancePercent: resolvedAdvancePercent,
      advanceAmount: Math.round(advanceAmount),
      date: quoteDate,
      targetDeliveryDate,
      deliveryDistrict,
      itemRows: [...quoteItemRows],
      quotationCategory: activeDraftSiteRef ? 'SITE_MEASUREMENT' : 'SHOWROOM_DIRECT',
      siteMeasurementRef: activeDraftSiteRef || undefined,
      siteMeasurementId: activeDraftSiteId || undefined,
      measuringStaffName: activeDraftMeasuringStaff || undefined,
      ...installPayload,
      ...salespersonPayload,
    };

    setQuotations([newQuote, ...quotations]);
    playBeep(640, 0.12);
    showToast('Quotation Created Successfully', `${resolvedId} for ${cust.name} (Total: ₹${Math.round(grandTotal).toLocaleString('en-IN')})`);
    setPreviewQuote(newQuote);

    // Auto-clear workbench completely for next quotation entry
    setQuoteItemRows([createZeroRow(1, doorModels[0]?.id)]);
    setIncludeInstallation(false);
    setInstallationCustomQty(null);
    setAdditionalDiscount(0);
    setRoundOffAmount(0);
    setAdvanceInputMode('PRESET');
    setAdvancePercent(50);
    setCustomAdvanceRupees('');
    setSelectedCustomerId('');
    setSelectedSalespersonId('');
    setActiveDraftSiteRef(null);
    setActiveDraftSiteId(null);
    setActiveDraftMeasuringStaff(null);
  };

  // Add Customer Action
  const handleSaveCustomer = async () => {
    const trimmedName = newCustName.trim();
    const trimmedPhone = newCustPhone.trim();
    const trimmedLocation = newCustLocation.trim();

    if (!trimmedName || !trimmedPhone || !trimmedLocation) {
      showToast('Missing Details', 'Please fill Customer Name, Phone, and Location.', 'info');
      return;
    }

    // Single-time Customer & Mobile check (no duplicate phone or duplicate name)
    const normPhone = trimmedPhone.replace(/\D/g, '').slice(-10);
    const normName = trimmedName.toLowerCase();
    const existing = customers.find((c) => {
      const cPhone = (c.phone || '').replace(/\D/g, '').slice(-10);
      const cName = (c.name || '').trim().toLowerCase();
      return (normPhone && normPhone.length >= 7 && cPhone === normPhone) || cName === normName;
    });

    if (existing) {
      playBeep(480, 0.15);
      showToast(
        'Customer Already Exists',
        `"${existing.name}" is already registered with mobile ${existing.phone}. Existing customer selected.`,
        'info'
      );
      setSelectedCustomerId(existing.id);
      setIsAddCustomerOpen(false);
      setNewCustName('');
      setNewCustPhone('');
      setNewCustLocation('');
      return;
    }

    const upperType = newCustType.toUpperCase();
    const mappedType =
      upperType === 'DEALER' || upperType === 'BUILDER' || upperType === 'ARCHITECT' || upperType === 'RETAIL'
        ? upperType
        : 'BUILDER';
    let newId = `CUST-${Date.now().toString().slice(-4)}`;
    try {
      const res = await apiFetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: trimmedName,
          phone: trimmedPhone,
          town: trimmedLocation,
          district: trimmedLocation,
          type: mappedType,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json?.success && json.data?.id) {
          newId = json.data.id;
        }
      } else {
        const errJson = await res.json().catch(() => null);
        if (errJson?.error && errJson.error.includes('already exists')) {
          showToast('Duplicate Customer', errJson.error, 'info');
          return;
        }
      }
    } catch {
      // offline resilience
    }

    const newCustomer: HubCustomer = {
      id: newId,
      name: trimmedName,
      phone: trimmedPhone,
      location: trimmedLocation,
      type: newCustType,
      gstin: '',
    };

    setCustomers([newCustomer, ...customers]);
    setSelectedCustomerId(newId);
    setIsAddCustomerOpen(false);
    playBeep(600, 0.1);
    showToast('Customer Added', `${newCustomer.name} (${newCustomer.location}) added and saved for all devices!`);

    setNewCustName('');
    setNewCustPhone('');
    setNewCustLocation('');
  };

  // Add Door Model Action (Only Model Number and Price)
  const handleSaveDoorModel = () => {
    const code = newModelCode.trim().toUpperCase();
    if (!code) {
      showToast('Missing Details', 'Please provide Door Model Number.', 'info');
      return;
    }
    const rate = parseFloat(newModelRate) || 7000;
    const newModId = `MOD-${doorModels.length + 101}`;
    const newModel: HubDoorModel = {
      id: newModId,
      code,
      title: code,
      material: 'FRP',
      rate,
      finish: 'Standard Factory Finish',
    };

    setDoorModels([...doorModels, newModel]);
    setIsAddDoorModelOpen(false);
    playBeep(620, 0.1);
    showToast('Model Added to Catalog', `Model ${code} (₹${rate.toLocaleString('en-IN')}) is now available in door selectors!`);

    apiFetch('/api/door-models', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        code,
        name: code,
        category: detectCategoryFromModelCode(code),
        defaultPrice: rate,
        description: `Door Model ${code}`,
      }),
    }).catch(() => {});

    setNewModelCode('');
    setNewModelTitle('');
    setNewModelRate('7000');
  };

  // Pipeline Actions
  const handleAdvanceLead = (leadId: string) => {
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) return;
    const idx = STAGE_ORDER.indexOf(lead.stage);

    if (lead.stage === 'negotiation') {
      const numVal = parseFloat(lead.value.replace(/[^0-9.]/g, '')) * 100000 || 250000;
      const newSo: HubSalesOrder = {
        id: `SO-2026-0${salesOrders.length + 90}`,
        title: lead.title,
        client: lead.client,
        value: lead.value,
        doors: lead.doors,
        stepIndex: 0,
        advancePaid: 'Pending 40% Advance',
        totalNumericValue: numVal,
        advanceAmount: 0,
        advanceVerified: false,
      };
      setSalesOrders([newSo, ...salesOrders]);
      setLeads(leads.filter((l) => l.id !== leadId));
      playBeep(640, 0.12);
      showToast('Converted to Sales Order', `${newSo.id} created for ${lead.client}`);
      return;
    }

    if (idx !== -1 && idx < STAGE_ORDER.length - 1) {
      const nextStage = STAGE_ORDER[idx + 1];
      setLeads(leads.map((l) => (l.id === leadId ? { ...l, stage: nextStage } : l)));
      playBeep(520, 0.08);
      showToast('Stage Advanced', `${lead.title} moved to ${STAGE_LABELS[nextStage]}`);
    }
  };

  // Reverse Lead Stage (Bidirectional CRM)
  const handleReverseLead = (leadId: string) => {
    const lead = leads.find((l) => l.id === leadId);
    if (!lead) return;
    const idx = STAGE_ORDER.indexOf(lead.stage);
    if (idx > 0) {
      const prevStage = STAGE_ORDER[idx - 1];
      setLeads(leads.map((l) => (l.id === leadId ? { ...l, stage: prevStage } : l)));
      playBeep(480, 0.08);
      showToast('Stage Rolled Back', `${lead.title} moved back to ${STAGE_LABELS[prevStage]}`, 'info');
    }
  };

  // Sales Order Step Advancement
  const handleAdvanceSalesOrder = (orderId: string) => {
    setSalesOrders(
      salesOrders.map((o) => {
        if (o.id !== orderId) return o;
        if (o.stepIndex < ORDER_STEPS.length - 1) {
          const nextIndex = o.stepIndex + 1;
          const nextStepLabel = ORDER_STEPS[nextIndex];
          playBeep(580, 0.1);
          showToast('Order Step Advanced', `${o.id} is now: ${nextStepLabel}`);
          return {
            ...o,
            stepIndex: nextIndex,
            advancePaid: nextIndex >= 1 ? (o.advanceVerified ? o.advancePaid : '50% Advance Recd') : o.advancePaid,
          };
        }
        return o;
      })
    );
  };

  // Reverse Sales Order Step (Bidirectional Orders)
  const handleReverseSalesOrder = (orderId: string) => {
    setSalesOrders(
      salesOrders.map((o) => {
        if (o.id !== orderId) return o;
        if (o.stepIndex > 0) {
          const prevIndex = o.stepIndex - 1;
          const prevStepLabel = ORDER_STEPS[prevIndex];
          playBeep(480, 0.08);
          showToast('Order Step Rolled Back', `${o.id} reversed to: ${prevStepLabel}`, 'info');
          return {
            ...o,
            stepIndex: prevIndex,
            advancePaid: prevIndex === 0 && !o.advanceVerified ? 'Pending 30% Advance' : o.advancePaid,
          };
        }
        return o;
      })
    );
  };

  // Advance Click with 30% Gatekeeper check
  const handleAdvanceSalesOrderClick = (order: HubSalesOrder) => {
    const val = order.totalNumericValue || (parseFloat(order.value.replace(/[^0-9.]/g, '')) * 100000) || 200000;
    const min30 = Math.round(val * 0.30);
    const recd = order.advanceAmount || 0;
    const isAdvOk = order.advanceVerified && recd >= min30;

    if (order.stepIndex === 0 && !isAdvOk) {
      playBeep(420, 0.12);
      showToast('30% Advance Required', 'Minimum 30% advance deposit is mandatory before releasing to production.', 'info');
      setActiveAdvanceOrder(order);
      setAdvanceDepositAmount(recd >= min30 ? recd : min30);
      setAdvanceDepositMode(order.paymentMode || 'UPI');
      setAdvanceDepositRef(order.paymentRef || '');
      setAdvanceDepositNotes('');
      return;
    }

    handleAdvanceSalesOrder(order.id);
  };

  const confirmAdvanceDeposit = () => {
    if (!activeAdvanceOrder) return;
    const val = activeAdvanceOrder.totalNumericValue || (parseFloat(activeAdvanceOrder.value.replace(/[^0-9.]/g, '')) * 100000) || 200000;
    const min30 = Math.round(val * 0.30);
    const pct = val > 0 ? Math.round((advanceDepositAmount / val) * 100) : 0;
    const verified = pct >= 30 && advanceDepositAmount >= min30;

    setSalesOrders((prev) =>
      prev.map((o) => {
        if (o.id !== activeAdvanceOrder.id) return o;
        return {
          ...o,
          advanceAmount: advanceDepositAmount,
          advanceVerified: verified,
          paymentMode: advanceDepositMode,
          paymentRef: advanceDepositRef || 'ACCOUNTS-VERIFIED',
          advancePaid: verified ? `₹${(advanceDepositAmount / 100000).toFixed(2)}L (${pct}% Verified)` : `Partial (₹${advanceDepositAmount})`,
          stepIndex: verified && o.stepIndex === 0 ? 1 : o.stepIndex,
        };
      })
    );

    playBeep(640, 0.15);
    showToast('Advance Deposit Verified', `₹${advanceDepositAmount.toLocaleString('en-IN')} (${pct}%) recorded for ${activeAdvanceOrder.id}. Released for production!`);
    setActiveAdvanceOrder(null);
  };

  // Convert Sales Order to Sales Invoice / Bill
  const handleConvertToSales = (order: HubSalesOrder) => {
    const totalVal = order.totalNumericValue || (parseFloat(order.value.replace(/[^0-9.]/g, '')) * 100000) || 200000;
    const recd = order.advanceAmount || Math.round(totalVal * 0.5);
    const invoiceId = `INV-2026-${order.id.replace(/[^0-9]/g, '').slice(-3) || '101'}`;

    const invoiceQuote: HubQuotation = {
      id: invoiceId,
      customerName: order.client,
      location: 'Kerala Project Site',
      itemsSummary: `${order.doors} [Sales Order: ${order.id}]`,
      gstMode: 'without',
      gstRate: 0,
      subtotal: totalVal,
      gstAmount: 0,
      grandTotal: totalVal,
      advancePercent: Math.round((recd / totalVal) * 100),
      advanceAmount: recd,
      date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
    };

    // Mark Sales Order as converted to sales
    setSalesOrders((prev) =>
      prev.map((o) =>
        o.id === order.id
          ? {
              ...o,
              isConvertedToSales: true,
              convertedInvoiceId: invoiceId,
            }
          : o
      )
    );

    // Add to Active Quotations / Invoices registry if not already present
    setQuotations((prev) => {
      if (prev.some((q) => q.id === invoiceId)) return prev;
      return [invoiceQuote, ...prev];
    });

    setPrintDocType('salesInvoice');
    setPreviewQuote(invoiceQuote);
    playBeep(720, 0.15);
    showToast('Converted to Sales', `Sales Order ${order.id} converted to Sales Bill ${invoiceId}! Opening Print Hub...`);
  };

  const handleGenerateInvoiceFromOrder = handleConvertToSales;

  // Clear Current Draft Workbench to Zero
  const handleClearAllDataAsZero = () => {
    setQuoteItemRows([createZeroRow(1, doorModels[0]?.id)]);
    setEditingQuoteId(null);
    setIncludeInstallation(false);
    setInstallationCustomQty(null);
    if (typeof window !== 'undefined') {
      localStorage.removeItem('exmark_data_zeroed');
    }
    setIsZeroConfirmOpen(false);
    playBeep(440, 0.15);
    showToast('Draft Workbench Cleared to Zero', 'Draft door quantities and rates cleared to ₹0. Full system reset is in Settings.');
  };

  return (
    <div className="bg-[#090d16] text-slate-100 min-h-screen flex flex-col font-sans rounded-2xl overflow-hidden border border-slate-800 shadow-2xl">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 flex flex-col gap-2 pointer-events-auto">
          <div
            className={`p-3.5 rounded-xl border shadow-2xl flex items-start gap-2.5 text-xs transition-all duration-300 ${
              toastMessage.type === 'info'
                ? 'bg-[#261017] border-rose-500/50 text-rose-200'
                : 'bg-[#0f241d] border-emerald-500/50 text-emerald-200'
            }`}
          >
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            <div>
              <strong className="font-bold block text-white">{toastMessage.title}</strong>
              <span className="opacity-90">{toastMessage.desc}</span>
            </div>
          </div>
        </div>
      )}

      {/* TOP SYSTEM BAR */}
      <header className="h-14 border-b border-slate-800 bg-[#0d1424] px-5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 bg-rose-600 rounded-lg flex items-center justify-center font-black text-white text-base shadow-md shadow-rose-900/40">
            EX
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-400">EXMARK</span>
              <span className="text-slate-600">/</span>
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <span>
                  {activeTab === 'quotations'
                    ? 'Quotations Management Hub'
                    : activeTab === 'pipeline'
                    ? 'CRM & Leads Pipeline'
                    : 'Sales Orders Step-by-Step'}
                </span>
                <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-semibold">
                  Live Ops
                </span>
              </span>
            </div>
          </div>
        </div>

        {/* Search & Audio Toggle */}
        <div className="flex items-center gap-3">
          <div className="relative hidden md:block">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search orders, quotes, models, clients..."
              className="w-64 bg-slate-900 border border-slate-700/80 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-rose-500 transition"
            />
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          </div>

          <div className="text-xs text-slate-400 border border-slate-800 px-2.5 py-1.5 rounded-lg bg-slate-900/40 hidden sm:flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-slate-400" />
            <span>27 Oct 2026 - Kerala Plant</span>
          </div>

          <button
            type="button"
            onClick={() => setAudioEnabled(!audioEnabled)}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
            title="Toggle Sound Feedback"
          >
            {audioEnabled ? (
              <Volume2 className="w-4 h-4 text-emerald-400" />
            ) : (
              <VolumeX className="w-4 h-4 text-slate-500" />
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              const newId = `LEAD-2026-0${leads.length + 15}`;
              const newL: HubLead = {
                id: newId,
                title: 'New Calicut Commercial Project',
                client: 'Er. Hashim & Associates - Calicut',
                value: '₹5.5L',
                doors: '40 FRP Heavy Duty Doors',
                stage: 'inquiries',
                notes: 'Direct architect inquiry through WhatsApp.',
              };
              setLeads([newL, ...leads]);
              playBeep(560, 0.1);
              showToast('New Lead Created', `Added ${newId}: ${newL.title}`);
            }}
            className="bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold px-3 py-1.5 rounded-lg shadow-md shadow-rose-900/30 flex items-center gap-1 transition cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New CRM Lead</span>
          </button>
        </div>
      </header>

      {/* TOP VIEW SWITCHER TABS */}
      <div className="px-5 py-2.5 border-b border-slate-800/80 bg-[#0b101d] flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-bold text-white flex items-center gap-2">
            <span>Door Manufacturing &amp; Sales System</span>
            <span className="text-xs font-normal text-slate-400 hidden lg:inline">
              | Direct Factory Pricing, Custom Dimensions &amp; Door Catalog Sync
            </span>
          </h2>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-900/80 p-1 rounded-lg border border-slate-800">
          <button
            type="button"
            onClick={() => setActiveTab('quotations')}
            className={`px-3.5 py-1 text-xs font-semibold rounded-md transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'quotations'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>Quotations Section</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                activeTab === 'quotations' ? 'bg-rose-800 text-white' : 'bg-slate-800 text-slate-400'
              }`}
            >
              {quotations.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('siteMeasurements')}
            className={`px-3.5 py-1 text-xs font-semibold rounded-md transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'siteMeasurements'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Ruler className="w-3.5 h-3.5 text-cyan-400" />
            <span>Site Measurements (By Staff)</span>
            <span
              className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
                activeTab === 'siteMeasurements' ? 'bg-rose-800 text-white' : 'bg-slate-800 text-cyan-400'
              }`}
            >
              {siteMeasurements.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('pipeline')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'pipeline'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>Pipeline Board</span>
            <span className="text-[10px] bg-slate-800 text-slate-400 px-1.5 py-0.2 rounded-full">
              {leads.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('salesOrders')}
            className={`px-3 py-1 text-xs font-semibold rounded-md transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'salesOrders'
                ? 'bg-rose-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>Sales Orders Tracking</span>
            <span className="bg-slate-800 text-cyan-400 text-[10px] px-1.5 py-0.2 rounded-full font-mono">
              {salesOrders.length} Orders
            </span>
          </button>

          <button
            type="button"
            onClick={() => setIsZeroConfirmOpen(true)}
            className="px-2.5 py-1 text-xs text-rose-400 hover:text-white bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/50 rounded-md transition cursor-pointer flex items-center gap-1.5"
            title="Clear current draft rows to zero"
          >
            <Trash2 className="w-3 h-3 text-rose-400" />
            <span>Clear Draft to ₹0</span>
          </button>
        </div>
      </div>

      {/* VIEW 1: QUOTATIONS HUB & FORM VIEW */}
      {activeTab === 'quotations' && (
        <div className="p-5 overflow-y-auto space-y-5 flex-1">
          {/* SALES TARGET & COMMISSIONS SUMMARY STRIP */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 bg-gradient-to-r from-slate-900/90 via-[#131b2e] to-slate-900/90 p-3.5 rounded-xl border border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 shrink-0">
                <Target className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Monthly Target</span>
                <span className="text-base font-extrabold text-white font-mono">₹25,00,000</span>
                <span className="text-[10px] text-emerald-400 block font-medium truncate">Kerala 14 Districts Active</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 shrink-0">
                <TrendingUp className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Confirmed Pacing</span>
                <span className="text-base font-extrabold text-emerald-400 font-mono">
                  ₹{quotations.filter(q => q.isConfirmed).reduce((acc, q) => acc + q.grandTotal, 0).toLocaleString('en-IN')}
                </span>
                <span className="text-[10px] text-slate-400 block">
                  {((quotations.filter(q => q.isConfirmed).reduce((acc, q) => acc + q.grandTotal, 0) / 2500000) * 100).toFixed(1)}% Achieved
                </span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400 shrink-0">
                <Award className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Staff Commissions</span>
                <span className="text-base font-extrabold text-cyan-300 font-mono">
                  ₹{quotations.filter(q => q.isConfirmed && q.salespersonName).reduce((acc, q) => acc + (q.commissionAmount || Math.round(q.grandTotal * 0.025)), 0).toLocaleString('en-IN')}
                </span>
                <span className="text-[10px] text-cyan-400 block font-medium">Standard 2.5% Slab</span>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-500/10 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
                <UserCheck className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider block">Sales Representatives</span>
                <span className="text-base font-extrabold text-white font-mono">{salesStaff.length} Reps</span>
                <span className="text-[10px] text-rose-400 block font-medium">Monthly Commission Tracker</span>
              </div>
            </div>
          </div>

          {/* EDITING QUOTATION ACTIVE BANNER */}
          {editingQuoteId && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/60 via-[#191924] to-[#10172a] border-2 border-amber-500/50 shadow-xl flex items-center justify-between gap-3 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
                  <Edit2 className="w-5 h-5 text-amber-400" />
                </div>
                <div>
                  <h4 className="font-black text-sm text-amber-300 flex items-center gap-2">
                    <span>Editing Quotation:</span>
                    <span className="font-mono bg-amber-500/20 px-2 py-0.5 rounded text-white border border-amber-500/40">
                      {editingQuoteId}
                    </span>
                  </h4>
                  <p className="text-[11px] text-amber-200/80">
                    Modify client, door sizes, categories, lock hardware, finishes, or rates below, then click &ldquo;Update Quotation&rdquo;.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs border border-slate-700 transition cursor-pointer"
                >
                  Cancel Edit
                </button>
              </div>
            </div>
          )}

          {/* QUOTATION CREATOR WORKBENCH */}
          <div className="bg-[#10172a] border border-slate-800 rounded-xl p-5 shadow-xl space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-rose-600/20 text-rose-400 border border-rose-500/30 flex items-center justify-center font-bold text-sm">
                  {editingQuoteId ? '✏️' : '📝'}
                </span>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-white">
                      {editingQuoteId ? `Edit Quotation (${editingQuoteId})` : 'Create A New Quotation (ക്രിയേറ്റ് എ ന്യൂ കൊട്ടേഷൻ)'}
                    </h3>
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                      {editingQuoteId || `QT-2026-0${quotations.length + 109}`}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Configure customer, door schedule, dimensions (cm/mm/inch), lock hardware &amp; colours
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('siteMeasurements')}
                  className="px-3 py-1.5 text-xs text-cyan-300 hover:text-white bg-cyan-950/40 hover:bg-cyan-900/60 border border-cyan-800/50 rounded-lg transition cursor-pointer flex items-center gap-1.5"
                  title="Browse site door measurements by staff and import doors into workbench"
                >
                  <Ruler className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Import Site Measurement</span>
                </button>
                {editingQuoteId && (
                  <button
                    type="button"
                    onClick={handleCancelEdit}
                    className="px-3 py-1.5 text-xs text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition cursor-pointer"
                  >
                    Cancel Edit
                  </button>
                )}
                <button
                  type="button"
                  onClick={handleClearAllToZero}
                  className="px-3 py-1.5 text-xs text-slate-400 hover:text-rose-400 hover:bg-slate-800/80 rounded-lg transition cursor-pointer flex items-center gap-1.5"
                  title="Clear all rows to 0 (₹0 Subtotal)"
                >
                  <RotateCcw className="w-3 h-3 text-rose-400" />
                  <span>Clear to Zero (0 Data)</span>
                </button>
                {editingQuoteId && (
                  <button
                    type="button"
                    onClick={() => {
                      const q = quotations.find((x) => x.id === editingQuoteId);
                      if (q) {
                        setWhatsAppShareQuote(q);
                        setIsWhatsAppShareModalOpen(true);
                      }
                    }}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-3 py-2 rounded-lg shadow-lg shadow-emerald-900/30 flex items-center gap-1.5 transition cursor-pointer"
                    title="Send active quotation via WhatsApp"
                  >
                    <MessageCircle className="w-4 h-4" />
                    <span>WhatsApp</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    const cust = customers.find((c) => c.id === selectedCustomerId);
                    setSelectedRiskQuote({
                      id: editingQuoteId || 'DRAFT-QUOTE',
                      customerName: cust?.name || 'Direct Client',
                      customerPhone: cust?.phone || '',
                      deliveryDistrict: deliveryDistrict || cust?.location || 'Malappuram',
                      advancePercent: resolvedAdvancePercent,
                      grandTotal: grandTotal,
                      itemRows: quoteItemRows,
                      includeInstallation: includeInstallation,
                      installationRate: installationRate,
                      installationMode: installationMode,
                      discount: additionalDiscount,
                    });
                    setIsProjectRiskModalOpen(true);
                  }}
                  className="bg-amber-600/90 hover:bg-amber-500 text-white text-xs font-bold px-3 py-2 rounded-lg shadow-lg shadow-amber-900/30 flex items-center gap-1.5 transition cursor-pointer"
                  title="Project Risk Scoring, Cost & Profit Engine, Geotagged Warranty"
                >
                  <ShieldAlert className="w-4 h-4" />
                  <span>Risk &amp; Profit</span>
                </button>
                <button
                  type="button"
                  onClick={handleSaveQuotation}
                  className={`text-xs font-bold px-4 py-2 rounded-lg shadow-lg flex items-center gap-1.5 transition cursor-pointer ${
                    !isAdvanceValid
                      ? 'bg-slate-800 text-slate-300 border border-rose-500/60 hover:bg-slate-700'
                      : 'bg-rose-600 hover:bg-rose-500 text-white shadow-rose-900/30'
                  }`}
                  title={!isAdvanceValid ? `Minimum 30% advance (₹${min30AdvanceAmount.toLocaleString('en-IN')}) is required` : undefined}
                >
                  {!isAdvanceValid ? <Lock className="w-3.5 h-3.5 text-rose-400" /> : null}
                  <span>{editingQuoteId ? 'Update Quotation' : 'Save & Generate Quote'}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>

            {activeDraftSiteRef && (
              <div className="flex items-center justify-between gap-3 px-3.5 py-2 bg-cyan-950/40 border border-cyan-800/60 rounded-xl text-xs text-cyan-300">
                <div className="flex items-center gap-2">
                  <Ruler className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>
                    Linked Category: <strong>Site Measurement ({activeDraftSiteRef})</strong> &bull; Measuring Staff:{' '}
                    <strong>{activeDraftMeasuringStaff || 'Field Rep'}</strong>
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setActiveDraftSiteRef(null);
                    setActiveDraftSiteId(null);
                    setActiveDraftMeasuringStaff(null);
                  }}
                  className="text-xs text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                  title="Unlink site measurement"
                >
                  <X className="w-3.5 h-3.5" />
                  <span>Unlink</span>
                </button>
              </div>
            )}

            {/* 1. CUSTOMER SELECTION, ADVANCE & TARGET DELIVERY ROW */}
            <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 bg-slate-900/70 p-3.5 rounded-xl border border-slate-800/80">
              {/* Customer Search Combobox */}
              <div className="md:col-span-4">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-200">
                    Customer / Client Name (കസ്റ്റമർ പേര്) *
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsAddCustomerOpen(true)}
                    className="text-xs font-semibold text-rose-400 hover:text-rose-300 flex items-center gap-1 hover:underline cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Add Customer</span>
                  </button>
                </div>
                <CustomerSearchCombobox
                  customers={customers}
                  selectedCustomerId={selectedCustomerId}
                  onSelectCustomer={(id) => setSelectedCustomerId(id)}
                  onOpenAddCustomer={() => setIsAddCustomerOpen(true)}
                  placeholder="Type customer name, phone, or location to search..."
                />
              </div>

              {/* Sales Representative & Commission Model (Strictly Piece Rate ₹/door, Default 0) */}
              <div className="md:col-span-3">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-200 flex items-center gap-1">
                    <UserCheck className="w-3.5 h-3.5 text-amber-400" />
                    <span>Sales Rep (സെയിൽസ്മാൻ)</span>
                  </label>
                  <span className="text-[10px] text-amber-300 font-bold bg-amber-500/15 px-2 py-0.5 rounded border border-amber-500/30">
                    Piece Rate (₹/door)
                  </span>
                </div>
                <div className="grid grid-cols-12 gap-1.5">
                  <select
                    value={selectedSalespersonId}
                    onChange={(e) => {
                      const newId = e.target.value;
                      setSelectedSalespersonId(newId);
                      const staff = salesStaff.find((s) => s.id === newId);
                      if (staff) {
                        const count = Math.max(1, totalQuoteDoorsQty);
                        const slabs = staff.commissionSlabs;
                        let matchedRate = Number(staff.defaultPieceRate || 0);
                        if (slabs) {
                          if (count > 100 && slabs.slab4_above100 !== undefined && slabs.slab4_above100 > 0) {
                            matchedRate = Number(slabs.slab4_above100);
                          } else if (count >= 61 && slabs.slab3_61to100 !== undefined && slabs.slab3_61to100 > 0) {
                            matchedRate = Number(slabs.slab3_61to100);
                          } else if (count >= 41 && slabs.slab2_41to60 !== undefined && slabs.slab2_41to60 > 0) {
                            matchedRate = Number(slabs.slab2_41to60);
                          } else if (slabs.slab1_upto40 !== undefined && slabs.slab1_upto40 > 0) {
                            matchedRate = Number(slabs.slab1_upto40);
                          }
                        }
                        setDraftCommissionRate(matchedRate);
                      } else {
                        setDraftCommissionRate(0);
                      }
                    }}
                    className="col-span-8 bg-[#131b2e] border border-slate-700 rounded-lg p-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500 font-medium cursor-pointer"
                  >
                    <option value="">-- Direct / Unassigned --</option>
                    {salesStaff.map((staff) => (
                      <option key={staff.id} value={staff.id}>
                        {staff.name} ({staff.employeeCode})
                      </option>
                    ))}
                  </select>
                  <div className="col-span-4 relative">
                    <input
                      type="number"
                      step="5"
                      min="0"
                      value={draftCommissionRate}
                      onChange={(e) => setDraftCommissionRate(Math.max(0, parseFloat(e.target.value) || 0))}
                      placeholder="0"
                      className="w-full bg-[#131b2e] border border-slate-700 rounded-lg p-2 pr-7 text-xs text-amber-300 font-bold focus:outline-none focus:border-amber-500 font-mono text-right"
                      title="Commission rate in ₹ per door"
                    />
                    <span className="absolute right-1.5 top-2.5 text-[10px] text-slate-400 font-mono pointer-events-none">
                      ₹/pc
                    </span>
                  </div>
                </div>
                {selectedSalespersonId && (
                  <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400 px-1 gap-1">
                    {(() => {
                      const staff = salesStaff.find((s) => s.id === selectedSalespersonId);
                      const count = Math.max(1, totalQuoteDoorsQty);
                      const slabs = staff?.commissionSlabs;
                      let label = 'Flat Rate';
                      if (slabs) {
                        if (count > 100 && slabs.slab4_above100 !== undefined && slabs.slab4_above100 > 0) {
                          label = 'Slab 4 (>100 doors)';
                        } else if (count >= 61 && slabs.slab3_61to100 !== undefined && slabs.slab3_61to100 > 0) {
                          label = 'Slab 3 (61–100 doors)';
                        } else if (count >= 41 && slabs.slab2_41to60 !== undefined && slabs.slab2_41to60 > 0) {
                          label = 'Slab 2 (41–60 doors)';
                        } else if (slabs.slab1_upto40 !== undefined && slabs.slab1_upto40 > 0) {
                          label = 'Slab 1 (1–40 doors)';
                        }
                      }
                      return (
                        <>
                          <span className="truncate text-amber-300/90 font-medium">
                            {label}
                          </span>
                          <span className="text-amber-400 font-mono font-bold shrink-0">
                            ₹{Math.round(totalQuoteDoorsQty * draftCommissionRate).toLocaleString('en-IN')}{' '}
                            ({totalQuoteDoorsQty} drs)
                          </span>
                        </>
                      );
                    })()}
                  </div>
                )}
              </div>

              {/* Advance Payment Setting (30% Minimum Hard Lock + Custom Amount Column) */}
              <div className="md:col-span-3">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-200 flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5 text-amber-400" />
                    <span>Advance (Min 30% Lock) *</span>
                  </label>
                  <div className="inline-flex rounded-md p-0.5 bg-slate-900 border border-slate-700 text-[10px]">
                    <button
                      type="button"
                      onClick={() => setAdvanceInputMode('PRESET')}
                      className={`px-1.5 py-0.5 rounded font-bold transition-all cursor-pointer ${
                        advanceInputMode === 'PRESET'
                          ? 'bg-amber-500 text-slate-950 shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      % Preset
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAdvanceInputMode('CUSTOM');
                        if (customAdvanceRupees === '') {
                          setCustomAdvanceRupees(advanceAmount >= min30AdvanceAmount ? advanceAmount : min30AdvanceAmount);
                        }
                      }}
                      className={`px-1.5 py-0.5 rounded font-bold transition-all cursor-pointer ${
                        advanceInputMode === 'CUSTOM'
                          ? 'bg-amber-500 text-slate-950 shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      Custom ₹
                    </button>
                  </div>
                </div>

                {advanceInputMode === 'PRESET' ? (
                  <div className="flex items-center gap-1.5">
                    <select
                      value={advancePercent}
                      onChange={(e) => setAdvancePercent(Math.max(30, parseFloat(e.target.value) || 30))}
                      className="bg-[#131b2e] border border-slate-700 rounded-lg p-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500 font-bold cursor-pointer shrink-0"
                    >
                      <option value="30">30% (Min Lock)</option>
                      <option value="40">40%</option>
                      <option value="50">50% (Standard)</option>
                      <option value="100">100% (Full)</option>
                    </select>
                    <div className="flex-1 bg-slate-950 border border-slate-800 rounded-lg p-1.5 text-right">
                      <div className="text-[9px] text-slate-400 flex justify-between">
                        <span>Advance:</span>
                        <span className="text-emerald-400 font-bold font-mono">₹{advanceAmount.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="text-[9px] text-slate-500 flex justify-between mt-0.5">
                        <span>Bal:</span>
                        <span className="font-mono">₹{balanceAmount.toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <div className="relative">
                      <input
                        type="number"
                        min={min30AdvanceAmount}
                        value={customAdvanceRupees}
                        onChange={(e) => {
                          const val = e.target.value;
                          setCustomAdvanceRupees(val === '' ? '' : Math.max(0, parseFloat(val) || 0));
                        }}
                        placeholder={`Min ₹${min30AdvanceAmount.toLocaleString('en-IN')}`}
                        className={`w-full bg-[#131b2e] border rounded-lg p-2 pr-14 text-xs font-mono font-bold focus:outline-none ${
                          isAdvanceValid
                            ? 'border-emerald-600 text-emerald-300 focus:border-emerald-400'
                            : 'border-rose-600 text-rose-300 focus:border-rose-400'
                        }`}
                      />
                      <span className="absolute right-2 top-2 text-[10px] text-slate-400 font-mono font-bold pointer-events-none">
                        ({resolvedAdvancePercent}%)
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] px-0.5">
                      {isAdvanceValid ? (
                        <span className="text-emerald-400 font-semibold flex items-center gap-1">
                          ✓ Valid (Bal: ₹{balanceAmount.toLocaleString('en-IN')})
                        </span>
                      ) : (
                        <span className="text-rose-400 font-bold flex items-center gap-1">
                          🔒 Min 30% Lock (₹{min30AdvanceAmount.toLocaleString('en-IN')})
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => setCustomAdvanceRupees(min30AdvanceAmount)}
                        className="text-[9px] text-amber-400 hover:text-amber-300 underline font-bold cursor-pointer"
                      >
                        Set 30% Min
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Target Delivery Date & Route Optimization */}
              <div className="md:col-span-3">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-bold text-slate-200 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Target Delivery &amp; Cluster *</span>
                  </label>
                  <button
                    type="button"
                    onClick={() => setIsRouteOptimizerOpen(true)}
                    className="text-[10px] font-bold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 hover:underline cursor-pointer"
                  >
                    <Truck className="w-3 h-3" />
                    <span>🚚 Route</span>
                  </button>
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <input
                    type="date"
                    value={targetDeliveryDate}
                    onChange={(e) => setTargetDeliveryDate(e.target.value)}
                    className="bg-[#131b2e] border border-slate-700 rounded-lg p-2 text-xs text-slate-100 focus:border-cyan-500 font-mono font-bold"
                  />
                  <select
                    value={deliveryDistrict}
                    onChange={(e) => setDeliveryDistrict(e.target.value)}
                    className="bg-[#131b2e] border border-slate-700 rounded-lg p-2 text-xs text-slate-100 focus:border-cyan-500 font-semibold cursor-pointer"
                  >
                    <option value="Malappuram">Malappuram (Vengara/Kottakkal)</option>
                    <option value="Kozhikode">Kozhikode (City/Feroke)</option>
                    <option value="Wayanad">Wayanad (Kalpetta/Bathery)</option>
                    <option value="Palakkad">Palakkad (Ottapalam/City)</option>
                    <option value="Thrissur">Thrissur (Town/Chalakudy)</option>
                    <option value="Ernakulam">Ernakulam (Aluva/Kakkanad)</option>
                    <option value="Kannur">Kannur (Thalassery/City)</option>
                    <option value="Kasargod">Kasargod</option>
                  </select>
                </div>
              </div>
            </div>

            {/* 2. DOOR ITEMS BUILDER TABLE */}
            <div className="space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                    Door Models &amp; Dimensions Schedule
                  </h4>
                  <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded">
                    Default Unit: Centimeter (cm)
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setFrpSettingsInitialTab('rates');
                      setIsFrpSettingsOpen(true);
                    }}
                    className="text-xs font-semibold text-amber-300 hover:text-amber-200 bg-amber-950/60 border border-amber-600/50 hover:border-amber-500 px-3 py-1 rounded-lg flex items-center gap-1.5 transition cursor-pointer shadow-sm"
                    title="FRP Door Auto-Cost Rules (80×210 cm, >90×230 cm @ ₹450/sq.ft, Categories A-E, Thicknesses)"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                    <span>⚙️ FRP Auto-Cost (80×210 / 90×230 cm)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsFrameManagerOpen(true)}
                    className="text-xs font-semibold text-indigo-300 hover:text-indigo-200 bg-indigo-950/50 border border-indigo-600/50 hover:border-indigo-400 px-2.5 py-1 rounded-lg flex items-center gap-1.5 transition cursor-pointer"
                    title="Add New Frame, Edit, Delete, or Set Default Frame"
                  >
                    <Layers className="w-3.5 h-3.5 text-indigo-400" />
                    <span>Frames (Add / Edit / Del)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsAddDoorModelOpen(true)}
                    className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 bg-cyan-950/40 border border-cyan-800/40 px-2.5 py-1 rounded-lg flex items-center gap-1 transition cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Add New Door Model (പുതിയ മോഡൽ)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowCostColumn(!showCostColumn)}
                    className={`text-xs font-semibold px-3 py-1 rounded-lg border transition flex items-center gap-1.5 cursor-pointer shadow-xs ${
                      showCostColumn
                        ? 'bg-amber-500/25 text-amber-300 border-amber-500/60 ring-1 ring-amber-400'
                        : 'bg-slate-800 hover:bg-slate-700 text-slate-300 border-slate-700 hover:text-white'
                    }`}
                    title="Toggle live factory estimated manufacturing cost and profit margin per door (Confidential)"
                  >
                    {showCostColumn ? <EyeOff className="w-3.5 h-3.5 text-amber-400" /> : <Eye className="w-3.5 h-3.5 text-slate-400" />}
                    <span>{showCostColumn ? 'Hide Factory Cost' : '👁️ Show Cost & Margin'}</span>
                  </button>

                  {/* Section-Wise BOQ Preset Dropdown */}
                  <div className="relative inline-block">
                    <button
                      type="button"
                      onClick={() => setShowAddSectionMenu(!showAddSectionMenu)}
                      className="bg-indigo-950/80 hover:bg-indigo-900 text-indigo-200 text-xs font-semibold px-3 py-1 rounded-lg border border-indigo-700/60 flex items-center gap-1 transition cursor-pointer shadow-xs"
                      title="Add Section / Floor wise BOQ grouping (e.g. Ground Floor, First Floor)"
                    >
                      <Layers className="w-3.5 h-3.5 text-indigo-400" />
                      <span>+ Add Section (സെക്ഷൻ)</span>
                    </button>
                    {showAddSectionMenu && (
                      <div className="absolute right-0 top-full mt-1 w-56 bg-[#0c1324] border border-indigo-500/60 rounded-xl shadow-2xl z-50 p-1.5 space-y-1">
                        <div className="text-[10px] text-indigo-300 font-bold px-2 py-1 uppercase tracking-wider">
                          Choose Section:
                        </div>
                        {[
                          'Ground Floor (ഗ്രൗണ്ട് ഫ്ലോർ)',
                          'First Floor (ഫസ്റ്റ് ഫ്ലോർ)',
                          'Second Floor (രണ്ടാം നില)',
                          'Kitchen & Work Area (അടുക്കള)',
                          'Bathrooms (ബാത്ത്റൂം)',
                          'Exterior / Balcony',
                        ].map((sec) => (
                          <button
                            key={sec}
                            type="button"
                            onClick={() => {
                              handleAddSectionRow(sec);
                              setShowAddSectionMenu(false);
                            }}
                            className="w-full text-left px-2.5 py-1.5 text-xs text-slate-200 hover:bg-indigo-600/30 rounded-lg transition font-medium"
                          >
                            📁 {sec}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={handleAddRow}
                    className="bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold px-3 py-1 rounded-lg border border-slate-700 flex items-center gap-1 transition cursor-pointer"
                  >
                    <span>+ Add Item Row</span>
                  </button>
                </div>
              </div>

              {/* Items Table — Fully Responsive Fit In Screen (No Side Scroll Extension) */}
              <div className="border border-slate-800 rounded-xl overflow-x-auto bg-[#0c1222] shadow-inner">
                <table className="w-full text-left border-collapse table-auto text-xs">
                  <thead>
                    <tr className="bg-[#11182c] border-b border-slate-800 text-[11px] font-bold text-slate-300">
                      {/* 1. Door Model & Category */}
                      <th className="p-2 w-[24%] min-w-[180px]">
                        <span>Door Model &amp; Cat (മോഡൽ)</span>
                      </th>

                      {/* 2. Frame Profile & Thickness */}
                      <th className="p-2 w-[18%] min-w-[150px]">
                        <div className="flex items-center justify-between gap-1">
                          <span>Frame &amp; Thickness (ഫ്രെയിം / കനം)</span>
                          <div className="flex items-center gap-1">
                            <button
                              type="button"
                              onClick={() => setIsFrameManagerOpen(true)}
                              className="text-[9px] font-bold text-indigo-300 hover:text-white bg-indigo-950/70 hover:bg-indigo-700/60 border border-indigo-500/40 px-1 py-0.2 rounded transition cursor-pointer"
                              title="Add, Edit or Delete Frames"
                            >
                              + Frame
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setFrpSettingsInitialTab('thicknesses');
                                setIsFrpSettingsOpen(true);
                              }}
                              className="text-[9px] font-bold text-amber-300 hover:text-white bg-amber-950/70 hover:bg-amber-700/60 border border-amber-500/40 px-1 py-0.2 rounded transition cursor-pointer"
                              title="Add, Edit or Delete Thicknesses"
                            >
                              + Thk
                            </button>
                          </div>
                        </div>
                      </th>

                      {/* 3. Colour & Lock Hardware */}
                      <th className="p-2 w-[18%] min-w-[150px]">
                        <div className="flex items-center justify-between gap-1">
                          <span>Colour &amp; Lock (നിറം / പൂട്ട്)</span>
                          <button
                            type="button"
                            onClick={() => {
                              setQuickLockRowIndex(null);
                              setIsQuickLockOpen(true);
                            }}
                            className="text-[9px] font-bold text-cyan-300 hover:text-white bg-cyan-950/70 hover:bg-cyan-700/60 border border-cyan-500/40 px-1 py-0.2 rounded transition cursor-pointer"
                            title="Add New Lock Model to Rate Card"
                          >
                            + Lock
                          </button>
                        </div>
                      </th>

                      {/* 4. Dimensions & Unit */}
                      <th className="p-2 w-[18%] min-w-[150px]">
                        <div className="flex items-center justify-between gap-1">
                          <span>Dimensions (H × W)</span>
                          <span className="text-[10px] text-cyan-300 font-mono font-bold">Unit Toggle</span>
                        </div>
                      </th>

                      {/* 5. Qty & Rate */}
                      <th className="p-2 w-[11%] min-w-[100px] text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span>Qty</span>
                          <span>Rate (₹)</span>
                        </div>
                      </th>

                      {/* Optional: Cost & Margin */}
                      {showCostColumn && (
                        <th className="p-2 w-[11%] min-w-[95px] text-right bg-amber-950/25 border-x border-amber-900/40 text-amber-300">
                          <div className="flex items-center justify-end gap-1">
                            <Sparkles className="w-3 h-3 text-amber-400" />
                            <span>Cost &amp; Margin</span>
                          </div>
                          <span className="text-[9px] text-amber-400/80 font-normal block">Factory Est</span>
                        </th>
                      )}

                      {/* Line Total & Action */}
                      <th className="p-2 w-[11%] min-w-[85px] text-right">
                        <div className="flex items-center justify-end gap-2">
                          <span>Total</span>
                          <span>Act</span>
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {quoteItemRows.map((row, idx) => {
                      const prevRow = idx > 0 ? quoteItemRows[idx - 1] : null;
                      const isNewSection = row.sectionName && (!prevRow || prevRow.sectionName !== row.sectionName);

                      let sectionDoors = 0;
                      let sectionTotal = 0;
                      if (row.sectionName) {
                        const secRows = quoteItemRows.filter((r) => r.sectionName === row.sectionName);
                        sectionDoors = secRows.reduce((sum, r) => sum + (Number(r.qty) || 0), 0);
                        sectionTotal = secRows.reduce((sum, r) => sum + (Number(r.qty) || 0) * (r.rate || 0), 0);
                      }

                      const defaultFrame = getDefaultFrameProfile(framesList);
                      const activeFrame =
                        framesList.find((f) => f.id === row.frameTypeId) || defaultFrame;
                      const wTop = row.widthTop ?? row.width ?? 0;
                      const wBottom = row.widthBottom ?? wTop;
                      const wTopFrac = row.widthTopFraction || row.widthFraction || '0';
                      const wBtmFrac = row.widthBottomFraction || wTopFrac;

                      const sqft = calculateSqFt(
                        row.height,
                        wTop,
                        wBottom,
                        row.unit,
                        row.heightFraction,
                        wTopFrac,
                        wBtmFrac
                      );
                      const lineTotal = ((Number(row.qty) || 0) * row.rate).toLocaleString('en-IN');

                      return (
                        <React.Fragment key={row.id || idx}>
                          {/* Section-Wise BOQ Divider Header */}
                          {isNewSection && (
                            <tr className="bg-indigo-950/60 border-y border-indigo-700/60">
                              <td colSpan={showCostColumn ? 7 : 6} className="px-3 py-1.5">
                                <div className="flex items-center justify-between text-xs">
                                  <div className="flex items-center gap-2">
                                    <span className="px-2 py-0.5 rounded bg-indigo-600 text-white font-bold text-[10px] uppercase tracking-wider shadow-xs">
                                      📁 {row.sectionName}
                                    </span>
                                    <span className="text-[10px] text-indigo-300 font-semibold">
                                      ({sectionDoors} {sectionDoors === 1 ? 'Door' : 'Doors'} in this section)
                                    </span>
                                  </div>
                                  <div className="text-[11px] font-mono font-bold text-indigo-200">
                                    Section Subtotal: ₹{sectionTotal.toLocaleString('en-IN')}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                          <tr className="hover:bg-slate-900/60 transition">
                            {/* 1. Door Model with Search & Embedded Category */}
                            <td className="p-2 align-top">
                              <DoorModelCombobox
                                selectedModelId={row.modelId}
                                selectedCategory={row.frpCategory || 'A'}
                                doorModels={doorModels}
                                onSelectModel={(modelId) => handleUpdateRow(idx, { modelId })}
                                onSelectCategory={(cat) => handleUpdateRow(idx, { frpCategory: cat })}
                                categoryRates={frpSettings.categoryPieceRates}
                              />
                              <div className="flex items-center gap-1 mt-1">
                                <span className="text-[9px] text-indigo-400 font-bold uppercase">Sec:</span>
                                <input
                                  type="text"
                                  value={row.sectionName || ''}
                                  placeholder="e.g. Ground Floor"
                                  onChange={(e) => handleUpdateRow(idx, { sectionName: e.target.value })}
                                  className="bg-[#101728] border border-indigo-900/60 rounded px-1.5 py-0.5 text-[9px] text-indigo-200 placeholder-slate-600 focus:outline-none focus:border-indigo-400 font-medium w-full"
                                  title="Section / Floor Name (e.g. Ground Floor, Kitchen)"
                                />
                              </div>
                            </td>

                          {/* 2. Frame & Door Thickness Stacked */}
                          <td className="p-2 align-top space-y-1.5">
                            {/* Frame Selector */}
                            <div>
                              <div className="flex items-center justify-between mb-0.5 text-[9px] text-indigo-300 font-semibold uppercase">
                                <span>Frame:</span>
                                <span className="font-mono text-slate-400">
                                  {(row.framePrice ?? 0) < 0
                                    ? `-₹${Math.abs(row.framePrice ?? 0)}`
                                    : (row.framePrice ?? 0) > 0
                                      ? `+₹${row.framePrice}`
                                      : 'Std'}
                                </span>
                              </div>
                              <select
                                value={activeFrame.id}
                                onChange={(e) => handleUpdateRow(idx, { frameTypeId: e.target.value })}
                                className={`w-full bg-[#131b2e] border rounded p-1 text-xs font-semibold focus:border-indigo-400 cursor-pointer ${
                                  activeFrame.id === 'FRM-005'
                                    ? 'border-emerald-500/60 text-emerald-300 font-bold'
                                    : 'border-indigo-500/40 text-indigo-200'
                                }`}
                              >
                                {framesList.map((f) => (
                                  <option key={f.id} value={f.id}>
                                    {formatFrameSectionLabel(f)}
                                    {f.isDefault ? ' [Def]' : ''}
                                    {(f.quotationExtraRate ?? 0) < 0
                                      ? ` (-₹${Math.abs(f.quotationExtraRate!)})`
                                      : (f.quotationExtraRate ?? 0) > 0
                                        ? ` (+₹${f.quotationExtraRate})`
                                        : ''}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* Door Thickness Selector */}
                            <div>
                              <div className="flex items-center justify-between mb-0.5 text-[9px] text-amber-300 font-semibold uppercase">
                                <span>Thickness:</span>
                                <span className="font-mono text-slate-400">
                                  {(row.thicknessExtraRate ?? 0) > 0 ? `+₹${row.thicknessExtraRate}` : 'Std'}
                                </span>
                              </div>
                              <select
                                value={
                                  row.thicknessId ||
                                  getDefaultThicknessOption(frpSettings.doorThicknesses).id
                                }
                                onChange={(e) => handleUpdateRow(idx, { thicknessId: e.target.value })}
                                className="w-full bg-[#131b2e] border border-amber-500/40 rounded p-1 text-xs text-amber-200 font-semibold focus:border-amber-400 cursor-pointer"
                              >
                                {(frpSettings.doorThicknesses && frpSettings.doorThicknesses.length > 0
                                  ? frpSettings.doorThicknesses
                                  : DEFAULT_THICKNESS_OPTIONS
                                ).map((t) => (
                                  <option key={t.id} value={t.id}>
                                    {t.name}
                                    {t.extraRate > 0 ? ` (+₹${t.extraRate})` : ''}
                                  </option>
                                ))}
                              </select>
                            </div>
                          </td>

                          {/* 3. Colour & Lock Hardware Stacked */}
                          <td className="p-2 align-top space-y-1.5">
                            {/* Colour / Finish Selector */}
                            <div>
                              <div className="flex items-center justify-between mb-0.5 text-[9px] text-emerald-300 font-semibold uppercase">
                                <span>Colour / Finish:</span>
                                {row.colourExtraRate && row.colourExtraRate > 0 ? (
                                  <span className="font-mono text-emerald-400">+₹${row.colourExtraRate}</span>
                                ) : null}
                              </div>
                              <select
                                value={row.colourId || (frpSettings.colours?.[0]?.id || 'col-teak-matte')}
                                onChange={(e) => handleUpdateRow(idx, { colourId: e.target.value })}
                                className="w-full bg-[#131b2e] border border-emerald-500/30 rounded p-1 text-xs text-emerald-300 font-semibold focus:border-emerald-400 cursor-pointer"
                              >
                                {(frpSettings.colours && frpSettings.colours.length > 0 ? frpSettings.colours : DEFAULT_COLOUR_OPTIONS).map((c) => (
                                  <option key={c.id} value={c.id}>
                                    {c.name} {c.extraRate && c.extraRate > 0 ? `(+₹${c.extraRate})` : ''}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* Lock Hardware Selector & Discount Checkbox */}
                            <div>
                              <div className="flex items-center justify-between mb-0.5 text-[9px] text-cyan-300 font-semibold uppercase">
                                <span>Lock:</span>
                                {row.lockPrice !== undefined && row.lockPrice !== 0 && (
                                  <span className={`font-mono ${row.lockPrice < 0 ? 'text-emerald-400' : 'text-cyan-400'}`}>
                                    {row.lockPrice < 0 ? `-₹${Math.abs(row.lockPrice)}` : `+₹${row.lockPrice}`}
                                  </span>
                                )}
                              </div>
                              <select
                                value={row.lockId || (frpSettings.locks?.[0]?.id || 'lock-none')}
                                onChange={(e) => handleUpdateRow(idx, { lockId: e.target.value })}
                                className="w-full bg-[#131b2e] border border-cyan-500/40 rounded p-1 text-xs text-cyan-200 font-semibold focus:border-cyan-400 cursor-pointer"
                              >
                                {(frpSettings.locks && frpSettings.locks.length > 0 ? frpSettings.locks : DEFAULT_LOCK_OPTIONS).map((l) => (
                                  <option key={l.id} value={l.id}>
                                    {l.name} {l.price < 0 ? `(-₹${Math.abs(l.price)})` : l.price > 0 ? `(+₹${l.price})` : '(Incl)'}
                                  </option>
                                ))}
                              </select>

                              {/* Supply Selection Mode: Full Set / Without Accessories / Shutter Only */}
                              <div className="mt-1">
                                <select
                                  value={row.supplyMode || (row.withoutAccessories ? 'NO_ACCESSORIES' : 'FULL_SET')}
                                  onChange={(e) => {
                                    const mode = e.target.value as SupplyMode;
                                    handleUpdateRow(idx, {
                                      supplyMode: mode,
                                      withoutAccessories: mode === 'NO_ACCESSORIES',
                                    });
                                  }}
                                  className="w-full bg-[#101728] border border-emerald-500/40 rounded px-1.5 py-0.5 text-[9.5px] font-bold text-emerald-300 focus:outline-none focus:border-emerald-400 cursor-pointer"
                                  title="Supply Mode: Full Set (Standard), Without Accessories (-₹500), or Shutter Only (-₹1,500)"
                                >
                                  <option value="FULL_SET">Full Set (Frame + Lock)</option>
                                  <option value="NO_ACCESSORIES">Without Accessories (-₹500)</option>
                                  <option value="SHUTTER_ONLY">Shutter Only (-₹1,500)</option>
                                </select>
                              </div>
                            </div>
                          </td>

                          {/* 4. Dimensions & Unit with Explicit Top and Bottom Width */}
                          <td className="p-2 align-top space-y-1.5">
                            {/* Unit Selector Pills (1-Click Switcher) */}
                            <div className="flex items-center justify-between gap-1 bg-slate-950/80 p-0.5 rounded border border-slate-800">
                              {(['inch', 'cm', 'mm'] as const).map((u) => {
                                const isCurrentUnit = row.unit === u;
                                const label = u === 'inch' ? 'Inch (in)' : u;
                                return (
                                  <button
                                    key={u}
                                    type="button"
                                    onClick={() => handleUpdateRow(idx, { unit: u })}
                                    className={`flex-1 text-[10px] py-0.5 font-bold rounded transition cursor-pointer text-center ${
                                      isCurrentUnit
                                        ? 'bg-cyan-600 text-white shadow-xs font-black'
                                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                    }`}
                                  >
                                    {label}
                                  </button>
                                );
                              })}
                            </div>

                            {/* Dimension Inputs: Top & Bottom Width */}
                            {row.unit === 'inch' ? (
                              <div className="space-y-1 text-xs">
                                {/* Height */}
                                <div className="flex items-center gap-1">
                                  <span className="text-[10px] text-slate-400 font-bold w-4 shrink-0">H:</span>
                                  <input
                                    type="number"
                                    value={row.height === 0 ? '' : row.height}
                                    placeholder="0"
                                    onChange={(e) => handleUpdateRow(idx, { height: parseFloat(e.target.value) || 0 })}
                                    className="w-14 bg-[#131b2e] border border-slate-700 rounded p-1 text-xs text-right font-mono text-white"
                                    title="Height (inches)"
                                  />
                                  <select
                                    value={row.heightFraction || '0'}
                                    onChange={(e) => handleUpdateRow(idx, { heightFraction: e.target.value })}
                                    className="flex-1 bg-[#131b2e] border border-slate-700 rounded p-1 text-[10px] font-mono text-cyan-300 cursor-pointer"
                                    title="Height Fraction"
                                  >
                                    {INCH_FRACTION_OPTIONS.map((f) => (
                                      <option key={f.value} value={f.value}>
                                        {f.label}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                {/* Width Top */}
                                <div className="flex items-center gap-1">
                                  <span className="text-[10px] text-cyan-400 font-bold w-4 shrink-0" title="Top Width">W-T:</span>
                                  <input
                                    type="number"
                                    value={wTop === 0 ? '' : wTop}
                                    placeholder="0"
                                    onChange={(e) => {
                                      const val = parseFloat(e.target.value) || 0;
                                      const isLinked = row.widthLinked !== false;
                                      if (isLinked) {
                                        handleUpdateRow(idx, { widthTop: val, widthBottom: val, width: val });
                                      } else {
                                        handleUpdateRow(idx, { widthTop: val, width: val });
                                      }
                                    }}
                                    className="w-14 bg-[#131b2e] border border-slate-700 rounded p-1 text-xs text-right font-mono text-white"
                                    title="Top Width (inches)"
                                  />
                                  <select
                                    value={wTopFrac}
                                    onChange={(e) => {
                                      const frac = e.target.value;
                                      const isLinked = row.widthLinked !== false;
                                      if (isLinked) {
                                        handleUpdateRow(idx, { widthTopFraction: frac, widthBottomFraction: frac, widthFraction: frac });
                                      } else {
                                        handleUpdateRow(idx, { widthTopFraction: frac, widthFraction: frac });
                                      }
                                    }}
                                    className="flex-1 bg-[#131b2e] border border-slate-700 rounded p-1 text-[10px] font-mono text-cyan-300 cursor-pointer"
                                    title="Top Width Fraction"
                                  >
                                    {INCH_FRACTION_OPTIONS.map((f) => (
                                      <option key={f.value} value={f.value}>
                                        {f.label}
                                      </option>
                                    ))}
                                  </select>
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateRow(idx, { widthLinked: !(row.widthLinked !== false) })}
                                    className={`p-1 rounded cursor-pointer transition shrink-0 ${
                                      row.widthLinked !== false ? 'text-cyan-400 bg-cyan-950/60' : 'text-amber-400 bg-amber-950/60'
                                    }`}
                                    title={row.widthLinked !== false ? 'Width Top & Bottom are linked' : 'Width Top & Bottom unlinked (Independent)'}
                                  >
                                    {row.widthLinked !== false ? <Link2 className="w-3 h-3" /> : <Link2Off className="w-3 h-3" />}
                                  </button>
                                </div>

                                {/* Width Bottom */}
                                <div className="flex items-center gap-1">
                                  <span className={`text-[10px] font-bold w-4 shrink-0 ${row.widthLinked !== false ? 'text-slate-400' : 'text-amber-400'}`} title="Bottom Width">W-B:</span>
                                  <input
                                    type="number"
                                    value={wBottom === 0 ? '' : wBottom}
                                    placeholder="0"
                                    onChange={(e) => {
                                      const val = parseFloat(e.target.value) || 0;
                                      handleUpdateRow(idx, { widthBottom: val, widthLinked: false });
                                    }}
                                    className={`w-14 bg-[#131b2e] border rounded p-1 text-xs text-right font-mono ${
                                      row.widthLinked !== false ? 'border-slate-700 text-slate-300' : 'border-amber-500/60 text-amber-300 font-bold'
                                    }`}
                                    title="Bottom Width (inches)"
                                  />
                                  <select
                                    value={wBtmFrac}
                                    onChange={(e) => {
                                      const frac = e.target.value;
                                      handleUpdateRow(idx, { widthBottomFraction: frac, widthLinked: false });
                                    }}
                                    className={`flex-1 bg-[#131b2e] border rounded p-1 text-[10px] font-mono cursor-pointer ${
                                      row.widthLinked !== false ? 'border-slate-700 text-cyan-300' : 'border-amber-500/60 text-amber-300 font-bold'
                                    }`}
                                    title="Bottom Width Fraction"
                                  >
                                    {INCH_FRACTION_OPTIONS.map((f) => (
                                      <option key={f.value} value={f.value}>
                                        {f.label}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                <div className="flex items-center justify-between">
                                  <span className="text-[8.5px] text-slate-400">
                                    {wTop !== wBottom || wTopFrac !== wBtmFrac ? 'Tapered' : 'Square'}
                                  </span>
                                  <span className="text-[10px] text-emerald-400 font-mono font-bold bg-emerald-950/60 border border-emerald-800/40 px-1.5 py-0.2 rounded">
                                    {sqft} sqft
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-1 text-xs">
                                <div className="flex items-center gap-1">
                                  <span className="text-[10px] text-slate-400 font-bold w-4 shrink-0">H:</span>
                                  <input
                                    type="number"
                                    value={row.height === 0 ? '' : row.height}
                                    placeholder="0"
                                    onChange={(e) => handleUpdateRow(idx, { height: parseFloat(e.target.value) || 0 })}
                                    className="flex-1 bg-[#131b2e] border border-slate-700 rounded p-1 text-xs text-right font-mono text-white"
                                    title={`Height (${row.unit})`}
                                  />
                                  <span className="text-[10px] text-slate-400 font-mono shrink-0">{row.unit}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className="text-[10px] text-cyan-400 font-bold w-4 shrink-0">W-T:</span>
                                  <input
                                    type="number"
                                    value={wTop === 0 ? '' : wTop}
                                    placeholder="0"
                                    onChange={(e) => {
                                      const val = parseFloat(e.target.value) || 0;
                                      const isLinked = row.widthLinked !== false;
                                      if (isLinked) {
                                        handleUpdateRow(idx, { widthTop: val, widthBottom: val, width: val });
                                      } else {
                                        handleUpdateRow(idx, { widthTop: val, width: val });
                                      }
                                    }}
                                    className="flex-1 bg-[#131b2e] border border-slate-700 rounded p-1 text-xs text-right font-mono text-white"
                                    title={`Top Width (${row.unit})`}
                                  />
                                  <button
                                    type="button"
                                    onClick={() => handleUpdateRow(idx, { widthLinked: !(row.widthLinked !== false) })}
                                    className={`p-1 rounded cursor-pointer transition shrink-0 ${
                                      row.widthLinked !== false ? 'text-cyan-400 bg-cyan-950/60' : 'text-amber-400 bg-amber-950/60'
                                    }`}
                                    title={row.widthLinked !== false ? 'Width Top & Bottom are linked' : 'Width Top & Bottom unlinked'}
                                  >
                                    {row.widthLinked !== false ? <Link2 className="w-3 h-3" /> : <Link2Off className="w-3 h-3" />}
                                  </button>
                                  <span className="text-[10px] text-slate-400 font-mono shrink-0">{row.unit}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className={`text-[10px] font-bold w-4 shrink-0 ${row.widthLinked !== false ? 'text-slate-400' : 'text-amber-400'}`}>W-B:</span>
                                  <input
                                    type="number"
                                    value={wBottom === 0 ? '' : wBottom}
                                    placeholder="0"
                                    onChange={(e) => {
                                      const val = parseFloat(e.target.value) || 0;
                                      handleUpdateRow(idx, { widthBottom: val, widthLinked: false });
                                    }}
                                    className={`flex-1 bg-[#131b2e] border rounded p-1 text-xs text-right font-mono ${
                                      row.widthLinked !== false ? 'border-slate-700 text-slate-300' : 'border-amber-500/60 text-amber-300 font-bold'
                                    }`}
                                    title={`Bottom Width (${row.unit})`}
                                  />
                                  <span className="text-[10px] text-slate-400 font-mono shrink-0">{row.unit}</span>
                                </div>
                                <div className="flex items-center justify-between">
                                  <span className="text-[8.5px] text-slate-400">
                                    {wTop !== wBottom ? 'Tapered' : 'Square'}
                                  </span>
                                  <span className="text-[10px] text-emerald-400 font-mono font-bold bg-emerald-950/60 border border-emerald-800/40 px-1.5 py-0.2 rounded">
                                    {sqft} sqft
                                  </span>
                                </div>
                              </div>
                            )}
                          </td>

                          {/* 5. Qty & Price / Rate Stacked */}
                          <td className="p-2 align-top text-right space-y-1.5">
                            <div>
                              <div className="text-[9px] text-slate-400 font-semibold uppercase mb-0.5 text-center">Qty</div>
                              <input
                                type="number"
                                min="0"
                                value={row.qty === 0 ? '' : (row.qty ?? '')}
                                placeholder="0"
                                onChange={(e) => {
                                  const val = e.target.value;
                                  if (val === '') {
                                    handleUpdateRow(idx, { qty: 0 });
                                  } else {
                                    const parsed = parseInt(val, 10);
                                    handleUpdateRow(idx, { qty: isNaN(parsed) ? 0 : Math.max(0, parsed) });
                                  }
                                }}
                                className="w-full bg-[#131b2e] border border-slate-700 rounded p-1 text-xs text-center font-bold text-white focus:outline-none focus:border-rose-500 font-mono"
                              />
                            </div>
                            <div>
                              <div className="text-[9px] text-slate-400 font-semibold uppercase mb-0.5 text-right">Price (₹)</div>
                              <div className="flex items-center justify-end gap-1">
                                <span className="text-slate-400 text-xs">₹</span>
                                <input
                                  type="number"
                                  value={row.rate === 0 ? '' : row.rate}
                                  placeholder="0"
                                  onChange={(e) => handleUpdateRow(idx, { rate: parseFloat(e.target.value) || 0 })}
                                  className="w-full bg-[#131b2e] border border-slate-700 rounded p-1 text-xs text-right font-bold text-emerald-400 font-mono"
                                />
                              </div>
                            </div>
                            {row.autoPriceBreakdown && (
                              <div
                                className="text-[9px] text-amber-300/90 font-mono mt-0.5 text-right break-words whitespace-normal leading-tight bg-amber-950/40 px-1 py-0.2 rounded border border-amber-800/30"
                                title={row.autoPriceBreakdown}
                              >
                                ⚡ {row.autoPriceBreakdown}
                              </div>
                            )}
                          </td>

                          {/* 6. Optional: Cost & Margin */}
                          {showCostColumn && (
                            <td className="p-2 align-top text-right bg-amber-950/15 border-x border-amber-900/30 font-mono">
                              {(() => {
                                const rowEst = quotationProfitEstimate?.rowEstimates?.find(
                                  (re) => re.rowId === String(row.id || idx)
                                );
                                const qtyNum = Math.max(1, Number(row.qty) || 1);
                                if (!rowEst) {
                                  return <span className="text-slate-500 text-xs">—</span>;
                                }
                                const unitMat = Math.round(rowEst.materialCost / qtyNum);
                                const unitLab = Math.round(rowEst.laborCost / qtyNum);
                                const unitCost = unitMat + unitLab;
                                const unitProf = Math.round(rowEst.profit / qtyNum);
                                const isPos = unitProf >= 0;

                                return (
                                  <div className="space-y-1">
                                    <div className="text-[11px] font-bold text-amber-200">
                                      ₹{unitCost.toLocaleString('en-IN')}{' '}
                                      <span className="text-[9px] text-slate-400 font-normal">/pc</span>
                                    </div>
                                    <div className="text-[9px] text-slate-400 leading-tight">
                                      M:₹{unitMat} • L:₹{unitLab}
                                    </div>
                                    <div className={`text-[10px] font-bold ${isPos ? 'text-emerald-400' : 'text-rose-400'}`}>
                                      {isPos ? `+₹${unitProf}` : `-₹${Math.abs(unitProf)}`} ({rowEst.marginPct.toFixed(0)}%)
                                    </div>
                                  </div>
                                );
                              })()}
                            </td>
                          )}

                          {/* 7. Line Total & Delete Action */}
                          <td className="p-2 align-top text-right space-y-2">
                            <div>
                              <div className="text-[9px] text-slate-400 font-semibold uppercase mb-0.5">Line Total</div>
                              <div className="font-mono font-bold text-xs sm:text-sm text-cyan-300">
                                ₹{lineTotal}
                              </div>
                            </div>
                            <div className="pt-1 flex justify-end">
                              <button
                                type="button"
                                onClick={() => handleDeleteRow(idx)}
                                className="text-slate-400 hover:text-rose-400 p-1 rounded-md hover:bg-rose-500/10 cursor-pointer transition flex items-center gap-1 text-[10px]"
                                title="Remove Item Row"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Delete</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* 3. ADDITIONAL SERVICES & FINANCIAL BREAKDOWN */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5 pt-3 border-t border-slate-800">
              {/* Optional Services Column */}
              <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800 space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-200 mb-1">
                    Additional Site Services (ഓപ്ഷണൽ സേവനങ്ങൾ)
                  </label>
                  <p className="text-[11px] text-slate-400">
                    All quotations follow direct factory pricing (zero tax). Add optional installation below if required.
                  </p>
                </div>

                {/* ADDITIONAL OPTION: DOOR INSTALLATION SERVICE */}
                <div className="pt-2 border-t border-slate-800 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={includeInstallation}
                        onChange={(e) => setIncludeInstallation(e.target.checked)}
                        className="w-4 h-4 rounded accent-emerald-500 cursor-pointer"
                      />
                      <span className="text-xs font-bold text-emerald-300">
                        Include Door Installation Service (ഡോർ ഇൻസ്റ്റാളേഷൻ)
                      </span>
                    </label>
                    {includeInstallation && (
                      <span className="text-[11px] font-mono font-bold text-emerald-400">
                        +₹{Math.round(installationAmount).toLocaleString('en-IN')}
                      </span>
                    )}
                  </div>

                  {includeInstallation && (
                    <div className="p-3 rounded-xl bg-emerald-950/20 border border-emerald-700/40 space-y-2.5 text-xs">
                      <div className="flex flex-wrap items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setInstallationMode('PER_DOOR')}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer border ${
                            installationMode === 'PER_DOOR'
                              ? 'bg-emerald-600 text-white border-emerald-400'
                              : 'bg-slate-900 text-slate-300 border-slate-700'
                          }`}
                        >
                          Per Door (₹/Door)
                        </button>
                        <button
                          type="button"
                          onClick={() => setInstallationMode('FIXED_LUMP_SUM')}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-bold cursor-pointer border ${
                            installationMode === 'FIXED_LUMP_SUM'
                              ? 'bg-emerald-600 text-white border-emerald-400'
                              : 'bg-slate-900 text-slate-300 border-slate-700'
                          }`}
                        >
                          Fixed Lump-Sum (₹)
                        </button>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                        {installationMode === 'PER_DOOR' && (
                          <div>
                            <label className="block text-[10px] text-slate-400 mb-0.5">
                              Install Doors Qty
                            </label>
                            <input
                              type="number"
                              min="0"
                              value={resolvedInstallQty}
                              onChange={(e) => {
                                const v = Math.max(0, parseInt(e.target.value, 10) || 0);
                                setInstallationCustomQty(v === totalQuoteDoorsQty ? null : v);
                              }}
                              className="w-full bg-[#131b2e] border border-slate-700 rounded-lg p-1.5 text-xs font-mono text-white"
                            />
                          </div>
                        )}
                        <div className={installationMode === 'FIXED_LUMP_SUM' ? 'sm:col-span-2' : ''}>
                          <label className="block text-[10px] text-slate-400 mb-0.5">
                            {installationMode === 'PER_DOOR' ? 'Rate per Door (₹)' : 'Fixed Installation Charge (₹)'}
                          </label>
                          <input
                            type="number"
                            min="0"
                            value={installationRate}
                            onChange={(e) => setInstallationRate(parseFloat(e.target.value) || 0)}
                            className="w-full bg-[#131b2e] border border-slate-700 rounded-lg p-1.5 text-xs font-mono text-emerald-300 font-bold"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] text-slate-400 mb-0.5">Service Label</label>
                          <input
                            type="text"
                            value={installationNotes}
                            onChange={(e) => setInstallationNotes(e.target.value)}
                            className="w-full bg-[#131b2e] border border-slate-700 rounded-lg p-1.5 text-xs text-slate-200"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Total Calculation Card */}
              <div className="bg-gradient-to-br from-slate-900 to-[#121a2d] p-4 rounded-xl border border-slate-800 space-y-2 text-xs">
                <div className="flex justify-between text-slate-400">
                  <span>Doors Subtotal ({totalQuoteDoorsQty} Doors):</span>
                  <span className="font-mono text-slate-200 font-bold">
                    ₹{Math.round(doorsSubtotal).toLocaleString('en-IN')}
                  </span>
                </div>
                {includeInstallation && (
                  <div className="flex justify-between text-emerald-300">
                    <span>
                      Door Installation ({installationMode === 'FIXED_LUMP_SUM' ? 'Lump-Sum' : `${resolvedInstallQty} × ₹${installationRate}`}):
                    </span>
                    <span className="font-mono font-bold">
                      +₹{Math.round(installationAmount).toLocaleString('en-IN')}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-slate-300 border-t border-slate-800/80 pt-1">
                  <span>Items &amp; Services Subtotal:</span>
                  <span className="font-mono text-slate-100 font-bold">
                    ₹{Math.round(itemsSubtotal).toLocaleString('en-IN')}
                  </span>
                </div>

                {/* Special Discount & Round-Off Rows */}
                <div className="flex items-center justify-between text-slate-300 border-t border-slate-800/80 pt-1.5 gap-2">
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] text-rose-300 font-semibold">Special Discount (പ്രത്യേക ഡിസ്കൗണ്ട്):</span>
                  </div>
                  <div className="flex items-center gap-1 font-mono">
                    <span className="text-slate-400 text-xs">-₹</span>
                    <input
                      type="number"
                      min="0"
                      value={additionalDiscount || ''}
                      placeholder="0"
                      onChange={(e) => setAdditionalDiscount(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="w-24 bg-[#131b2e] border border-rose-500/40 rounded px-2 py-0.5 text-xs font-mono text-rose-300 font-bold text-right focus:outline-none focus:border-rose-400"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between text-slate-300 pt-1 gap-2">
                  <div className="flex items-center gap-1.5">
                    <span className="text-[11px] text-slate-300 font-semibold">Round-Off (റൗണ്ട് ഓഫ്):</span>
                    <button
                      type="button"
                      onClick={handleAutoRoundOff}
                      className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40 cursor-pointer transition flex items-center gap-1"
                      title="Auto round to nearest ₹100 or ₹10 (e.g. ₹7,536 -> -₹36 = ₹7,500)"
                    >
                      ⚡ Auto Round
                    </button>
                  </div>
                  <div className="flex items-center gap-1 font-mono">
                    <span className="text-slate-400 text-xs">{roundOffAmount >= 0 ? '+₹' : '-₹'}</span>
                    <input
                      type="number"
                      value={roundOffAmount === 0 ? '' : Math.abs(roundOffAmount)}
                      placeholder="0"
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        setRoundOffAmount(-Math.abs(val));
                      }}
                      className="w-24 bg-[#131b2e] border border-slate-700 rounded px-2 py-0.5 text-xs font-mono text-amber-300 font-bold text-right focus:outline-none focus:border-amber-400"
                    />
                  </div>
                </div>

                <div className="flex justify-between text-white font-extrabold text-base border-t border-slate-700 pt-2">
                  <span>Grand Total:</span>
                  <span className="font-mono text-emerald-400">
                    ₹{Math.round(grandTotal).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between text-rose-300 font-bold border-t border-slate-800 pt-1.5 text-xs">
                  <span>{advancePercent}% Advance Required:</span>
                  <span className="font-mono">
                    ₹{Math.round(advanceAmount).toLocaleString('en-IN')}
                  </span>
                </div>
                <div className="flex justify-between text-slate-400 text-[11px]">
                  <span>Balance at Delivery:</span>
                  <span className="font-mono">
                    ₹{Math.round(balanceAmount).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>
            </div>

            {/* Advance Quotation Profit Estimator (Role-Gated for Admin/Accounts/Management) */}
            {isProfitVisibleRole && totalQuoteDoorsQty > 0 && (
              <div className="pt-3">
                <QuotationProfitPanel estimate={quotationProfitEstimate} />
              </div>
            )}
          </div>

          {/* RECENT QUOTATIONS TABLE */}
          <div className="bg-[#10172a] border border-slate-800 rounded-xl p-5 shadow-lg space-y-3">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  All Active Quotations ({quotations.length} Quotes)
                </h3>
                <p className="text-[11px] text-slate-400">Saved Kerala dealer &amp; project quotations</p>
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                {/* Category Filter */}
                <div className="flex items-center gap-1.5 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
                  <Ruler className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="text-[11px] text-slate-400 font-medium">Category:</span>
                  <select
                    value={quotationCategoryFilter}
                    onChange={(e) => setQuotationCategoryFilter(e.target.value as any)}
                    className="bg-transparent text-xs text-slate-200 font-bold focus:outline-none cursor-pointer"
                  >
                    <option value="ALL" className="bg-slate-900 text-slate-200">All Categories</option>
                    <option value="SITE_MEASUREMENT" className="bg-slate-900 text-slate-200">📐 Site Measurements (by Staff)</option>
                    <option value="SHOWROOM_DIRECT" className="bg-slate-900 text-slate-200">🏢 Showroom / Direct</option>
                  </select>
                </div>

                {/* Salesman Filter */}
                <div className="flex items-center gap-1.5 bg-slate-900 px-2.5 py-1 rounded-lg border border-slate-800">
                  <UserCheck className="w-3.5 h-3.5 text-amber-400" />
                  <span className="text-[11px] text-slate-400 font-medium">Salesman:</span>
                  <select
                    value={salespersonFilter}
                    onChange={(e) => setSalespersonFilter(e.target.value)}
                    className="bg-transparent text-xs text-slate-200 font-bold focus:outline-none cursor-pointer"
                  >
                    <option value="ALL" className="bg-slate-900 text-slate-200">All Sales Staff</option>
                    {salesStaff.map((s) => (
                      <option key={s.id} value={s.id} className="bg-slate-900 text-slate-200">
                        {s.name} ({s.employeeCode})
                      </option>
                    ))}
                  </select>
                </div>

                {/* View Switcher: Fit Table vs Cards */}
                <div className="flex items-center bg-slate-900 p-0.5 rounded-lg border border-slate-800">
                  <button
                    type="button"
                    onClick={() => setSavedQuotesViewMode('compact')}
                    className={`px-2.5 py-1 rounded-md text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                      savedQuotesViewMode === 'compact'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                    title="Compact full-width table without horizontal scrolling"
                  >
                    <LayoutList className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Fit Table</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setSavedQuotesViewMode('cards')}
                    className={`px-2.5 py-1 rounded-md text-xs font-bold flex items-center gap-1.5 transition cursor-pointer ${
                      savedQuotesViewMode === 'cards'
                        ? 'bg-rose-600 text-white shadow-xs'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                    title="Responsive cards grid view without horizontal scrolling"
                  >
                    <LayoutGrid className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Cards</span>
                  </button>
                </div>

                {/* Staff Order Reports PDF Hub */}
                <button
                  type="button"
                  onClick={() => {
                    setStaffReportInitialStaffId(salespersonFilter !== 'ALL' ? salespersonFilter : 'ALL');
                    setIsStaffReportModalOpen(true);
                  }}
                  className="bg-indigo-600/90 hover:bg-indigo-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg border border-indigo-500/50 flex items-center gap-1.5 transition cursor-pointer shadow-sm shadow-indigo-950/40"
                  title="Daily, Weekly & Monthly Staff Order Register with A4 PDF Export"
                >
                  <FileText className="w-3.5 h-3.5 text-indigo-200" />
                  <span>Order Reports (PDF)</span>
                </button>

                <span className="text-xs text-emerald-400 font-mono font-bold bg-emerald-950/40 border border-emerald-800/40 px-2.5 py-1 rounded-lg">
                  Total Value: ₹{(quotations.reduce((acc, q) => acc + q.grandTotal, 0) / 100000).toFixed(1)}L
                </span>
              </div>
            </div>

            {/* QUOTATIONS CONTENT (NO SIDE-SCROLLING) */}
            {(() => {
              const filteredQuotes = quotations
                .filter((q) => salespersonFilter === 'ALL' || q.salespersonId === salespersonFilter)
                .filter((q) => {
                  const isSite =
                    q.quotationCategory === 'SITE_MEASUREMENT' ||
                    Boolean(q.siteMeasurementRef) ||
                    Boolean(q.measuringStaffName) ||
                    (q as any).source === 'MOBILE_FIELD_APP' ||
                    (q.notes && q.notes.toLowerCase().includes('site measurement'));
                  if (quotationCategoryFilter === 'SITE_MEASUREMENT') return isSite;
                  if (quotationCategoryFilter === 'SHOWROOM_DIRECT') return !isSite;
                  return true;
                })
                .sort((a, b) => {
                  const timeA = new Date((a as any).updatedAt || a.date).getTime() || 0;
                  const timeB = new Date((b as any).updatedAt || b.date).getTime() || 0;
                  return timeB - timeA;
                });

              if (filteredQuotes.length === 0) {
                return (
                  <div className="p-10 text-center bg-slate-900/30 rounded-xl border border-slate-800">
                    <div className="flex flex-col items-center justify-center gap-2 max-w-sm mx-auto text-slate-500">
                      <FileSpreadsheet className="w-8 h-8 text-slate-600" />
                      <p className="font-bold text-slate-300 text-sm">0 Quotation Records</p>
                      <p className="text-xs text-slate-400 leading-relaxed">
                        {quotations.length === 0
                          ? 'All data cleared to zero. Use the door workbench above to draft and save your first factory quotation.'
                          : 'No quotations match the selected category or salesman filter.'}
                      </p>
                    </div>
                  </div>
                );
              }

              if (savedQuotesViewMode === 'cards') {
                return (
                  <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                    {filteredQuotes.map((q, qIdx) => {
                      const isSiteQuote =
                        q.quotationCategory === 'SITE_MEASUREMENT' ||
                        Boolean(q.siteMeasurementRef) ||
                        Boolean(q.measuringStaffName) ||
                        (q as any).source === 'MOBILE_FIELD_APP' ||
                        (q.notes && q.notes.toLowerCase().includes('site measurement'));

                      return (
                        <div
                          key={`${q.id}-${qIdx}`}
                          className="bg-slate-900/70 border border-slate-800 hover:border-slate-700/80 rounded-xl p-4 flex flex-col justify-between space-y-3 transition shadow-sm hover:shadow-md"
                        >
                          {/* Card Top: Quote # & Category Badge */}
                          <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-2.5">
                            <div>
                              <div className="flex items-center gap-1.5">
                                <span className={`font-mono font-bold text-sm ${q.id.startsWith('INV-') ? 'text-emerald-400' : 'text-rose-400'}`}>
                                  {q.id}
                                </span>
                                {q.id.startsWith('INV-') && (
                                  <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                    INVOICE
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-slate-400 mt-0.5">{q.date || 'Active Quote'}</div>
                            </div>
                            <div>
                              {isSiteQuote ? (
                                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-950/80 text-cyan-300 border border-cyan-700/60 shadow-xs">
                                  📐 Site {q.measuringStaffName ? `• ${q.measuringStaffName.split(' ')[0]}` : ''}
                                </span>
                              ) : (
                                <span className="inline-block px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                                  🏢 Showroom
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Card Middle: Customer & Sales Rep */}
                          <div className="space-y-2 text-xs">
                            <div>
                              <div className="font-bold text-white text-sm">{q.customerName}</div>
                              <div className="text-slate-400 text-[11px] flex items-center gap-1.5">
                                <span>📍 {q.location}</span>
                                {q.customerPhone && (
                                  <>
                                    <span>•</span>
                                    <span className="font-mono text-slate-300">{q.customerPhone}</span>
                                  </>
                                )}
                              </div>
                            </div>

                            {/* Doors & Specs */}
                            <div className="bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80 text-[11px] text-slate-300 leading-snug">
                              <span className="text-slate-400 font-medium">Specs: </span>
                              {q.itemsSummary}
                            </div>

                            {/* Sales Rep & Commission */}
                            {q.salespersonName ? (
                              <div className="flex items-center justify-between text-[11px] bg-amber-950/20 border border-amber-800/30 px-2 py-1 rounded-md">
                                <span className="text-amber-200 font-medium flex items-center gap-1">
                                  <UserCheck className="w-3 h-3 text-amber-400" />
                                  {q.salespersonName}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSelectedCommissionQuote(q);
                                    setIsCommissionEditModalOpen(true);
                                  }}
                                  className="font-mono text-amber-300 font-bold text-[10px] hover:underline cursor-pointer flex items-center gap-1"
                                  title="Click to edit staff commission"
                                >
                                  <span>
                                    {(q as any).commissionType === 'PER_PIECE'
                                      ? `₹${(q as any).commissionRate ?? 150}/pc`
                                      : `${(q as any).commissionRate ?? (q.commissionPercent || 2.5)}%`}
                                    : ₹{(q.commissionAmount || Math.round(q.grandTotal * 0.025)).toLocaleString('en-IN')}
                                  </span>
                                  <Coins className="w-2.5 h-2.5 text-amber-400" />
                                </button>
                              </div>
                            ) : null}

                            {/* Financial Summary */}
                            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-slate-800/80">
                              <div>
                                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Quote Value</span>
                                <span className="font-mono font-bold text-sm text-emerald-400">
                                  ₹{q.grandTotal.toLocaleString('en-IN')}
                                </span>
                              </div>
                              <div className="text-right">
                                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Advance Status</span>
                                {q.isConfirmed ? (
                                  <span className="inline-block font-mono text-[11px] font-bold text-emerald-300">
                                    ✓ Paid: ₹{(q.advancePaid || q.advanceAmount).toLocaleString('en-IN')}
                                  </span>
                                ) : (
                                  <span className="inline-block font-mono text-[11px] text-amber-300">
                                    Req: ₹{q.advanceAmount.toLocaleString('en-IN')} ({q.advancePercent}%)
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Card Actions Toolbar */}
                          <div className="flex items-center justify-between gap-1.5 pt-2 border-t border-slate-800">
                            {/* WhatsApp Share Button */}
                            <button
                              type="button"
                              onClick={() => {
                                setWhatsAppShareQuote(q);
                                setIsWhatsAppShareModalOpen(true);
                              }}
                              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs rounded-lg transition cursor-pointer flex items-center gap-1.5 font-bold shadow-xs"
                              title="Share quotation via WhatsApp with live tracking"
                            >
                              <MessageCircle className="w-3.5 h-3.5" />
                              <span>WhatsApp</span>
                            </button>

                            <div className="flex items-center gap-1">
                              {q.isConfirmed ? (
                                <button
                                  type="button"
                                  onClick={() => handlePrint12LFromQuotation(q)}
                                  className="px-2 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs rounded-md border border-amber-500/40 transition cursor-pointer flex items-center gap-1 font-bold"
                                  title="Print 12L Yellow Door Stickers"
                                >
                                  <QrCode className="w-3.5 h-3.5 text-amber-400" />
                                  <span className="hidden sm:inline">12L</span>
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => handleStartConfirmQuotation(q)}
                                  className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs rounded-md shadow-xs transition cursor-pointer flex items-center gap-1 font-bold"
                                  title="Confirm & Lock Order"
                                >
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Confirm</span>
                                </button>
                              )}

                              <button
                                type="button"
                                onClick={() => {
                                  if (q.id.startsWith('INV-')) setPrintDocType('salesInvoice');
                                  else setPrintDocType('quotation');
                                  setPreviewQuote(q);
                                }}
                                className="px-2 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-md border border-slate-700 transition cursor-pointer font-medium"
                                title="View & Print Document"
                              >
                                Print
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedRiskQuote(q);
                                  setIsProjectRiskModalOpen(true);
                                }}
                                className="p-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 rounded-md border border-amber-500/30 transition cursor-pointer"
                                title="Project Risk, Cost & Location Warranty"
                              >
                                <ShieldAlert className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedCommissionQuote(q);
                                  setIsCommissionEditModalOpen(true);
                                }}
                                className="p-1.5 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-300 rounded-md border border-yellow-500/30 transition cursor-pointer"
                                title="Edit Staff Commission (% or ₹/door)"
                              >
                                <Coins className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleEditQuotation(q)}
                                className="p-1.5 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 rounded-md border border-amber-500/30 transition cursor-pointer"
                                title="Edit Quotation"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              <button
                                type="button"
                                onClick={() => handleDeleteQuotation(q.id)}
                                className="p-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-md border border-rose-500/30 transition cursor-pointer"
                                title="Delete Quotation"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                );
              }

              // Fit Table View - 100% Fluid Table with No Side-Scroll
              return (
                <div className="w-full overflow-hidden rounded-xl border border-slate-800">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="bg-slate-900 text-slate-300 border-b border-slate-800 text-[11px] font-bold">
                        <th className="p-3 w-[15%]">Quote # &amp; Origin</th>
                        <th className="p-3 w-[22%]">Customer &amp; Project</th>
                        <th className="p-3 w-[16%]">Sales Rep &amp; Target</th>
                        <th className="p-3 w-[20%]">Doors &amp; Spec</th>
                        <th className="p-3 w-[15%] text-right">Financials &amp; Advance</th>
                        <th className="p-3 w-[12%] text-center">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/70">
                      {filteredQuotes.map((q, qIdx) => {
                        const isSiteQuote =
                          q.quotationCategory === 'SITE_MEASUREMENT' ||
                          Boolean(q.siteMeasurementRef) ||
                          Boolean(q.measuringStaffName) ||
                          (q as any).source === 'MOBILE_FIELD_APP' ||
                          (q.notes && q.notes.toLowerCase().includes('site measurement'));
                        const isExpanded = expandedQuoteRowId === q.id;

                        return (
                          <React.Fragment key={`${q.id}-${qIdx}`}>
                            <tr className="hover:bg-slate-900/60 transition">
                              {/* 1. Quote # & Origin */}
                              <td className="p-3 font-mono">
                                <span className={`font-bold ${q.id.startsWith('INV-') ? 'text-emerald-400' : 'text-rose-400'}`}>
                                  {q.id}
                                </span>
                                {q.id.startsWith('INV-') && (
                                  <span className="block mt-0.5 w-fit px-1.5 py-0.2 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                                    SALES INVOICE
                                  </span>
                                )}
                                {isSiteQuote ? (
                                  <span className="block mt-0.5 w-fit px-1.5 py-0.2 rounded text-[9px] font-bold bg-cyan-950/80 text-cyan-300 border border-cyan-700/60 shadow-xs">
                                    📐 Site {q.measuringStaffName ? `• ${q.measuringStaffName.split(' ')[0]}` : ''}
                                  </span>
                                ) : (
                                  <span className="block mt-0.5 w-fit px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-800 text-slate-400 border border-slate-700">
                                    🏢 Showroom
                                  </span>
                                )}
                                <span className="text-[10px] text-slate-500 block mt-0.5">{q.date}</span>
                              </td>

                              {/* 2. Customer & Project */}
                              <td className="p-3">
                                <div className="font-bold text-white break-words">{q.customerName}</div>
                                <div className="text-[10px] text-slate-400 break-words flex items-center gap-1 flex-wrap">
                                  <span>📍 {q.location}</span>
                                  {q.customerPhone && (
                                    <>
                                      <span>•</span>
                                      <span className="font-mono text-slate-300">{q.customerPhone}</span>
                                    </>
                                  )}
                                </div>
                              </td>

                              {/* 3. Sales Rep & Comm */}
                              <td className="p-3">
                                {q.salespersonName ? (
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-1.5">
                                      <span className="w-5 h-5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center justify-center text-[10px] font-bold shrink-0">
                                        {q.salespersonName.charAt(0)}
                                      </span>
                                      <span className="font-bold text-white text-xs truncate">{q.salespersonName}</span>
                                    </div>
                                    <div className="flex items-center gap-1 text-[10px] flex-wrap">
                                      <span className="text-slate-400 font-mono">{q.salespersonCode || 'SALES'}</span>
                                      <span className="text-slate-600">•</span>
                                      <button
                                        type="button"
                                        onClick={() => {
                                          setSelectedCommissionQuote(q);
                                          setIsCommissionEditModalOpen(true);
                                        }}
                                        className={`px-1.5 py-0.2 rounded font-mono font-bold hover:brightness-110 cursor-pointer flex items-center gap-1 ${
                                          q.commissionStatus === 'PAID'
                                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                            : q.commissionStatus === 'ACCRUED'
                                            ? 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                        }`}
                                        title="Click to edit staff commission (% or ₹/door)"
                                      >
                                        <span>
                                          {(q as any).commissionType === 'PER_PIECE'
                                            ? `₹${(q as any).commissionRate ?? 150}/pc`
                                            : `${(q as any).commissionRate ?? (q.commissionPercent || 2.5)}%`}
                                          : ₹{(q.commissionAmount || Math.round((q.grandTotal * 0.025))).toLocaleString('en-IN')}
                                        </span>
                                        <Coins className="w-2.5 h-2.5 text-amber-400" />
                                      </button>
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-slate-500 text-[11px] italic">Direct / Plant</span>
                                )}
                              </td>

                              {/* 4. Doors & Spec with Expand Toggle */}
                              <td className="p-3">
                                <div className="text-slate-300 leading-snug break-words text-[11px]">
                                  {q.itemsSummary}
                                </div>
                                {Array.isArray(q.itemRows) && q.itemRows.length > 0 && (
                                  <button
                                    type="button"
                                    onClick={() => setExpandedQuoteRowId(isExpanded ? null : q.id)}
                                    className="mt-1.5 text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-semibold cursor-pointer"
                                  >
                                    {isExpanded ? (
                                      <>
                                        <ChevronUp className="w-3 h-3" />
                                        <span>Hide Door Schedule</span>
                                      </>
                                    ) : (
                                      <>
                                        <ChevronDown className="w-3 h-3" />
                                        <span>View {q.itemRows.length} Doors Breakdown</span>
                                      </>
                                    )}
                                  </button>
                                )}
                              </td>

                              {/* 5. Financials & Advance Combined */}
                              <td className="p-3 text-right">
                                <div className="font-mono font-bold text-emerald-400 text-sm">
                                  ₹{q.grandTotal.toLocaleString('en-IN')}
                                </div>
                                <div className="text-[10px] font-mono mt-0.5">
                                  {q.isConfirmed ? (
                                    <span className="inline-block px-1.5 py-0.2 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded font-bold">
                                      ✓ Adv ₹{(q.advancePaid || q.advanceAmount).toLocaleString('en-IN')}
                                    </span>
                                  ) : (
                                    <span className="inline-block px-1.5 py-0.2 bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded font-bold">
                                      Pending Adv: ₹{q.advanceAmount.toLocaleString('en-IN')}
                                    </span>
                                  )}
                                </div>
                                <div className="text-[9px] text-slate-500 font-mono mt-0.5">
                                  Bal: ₹{Math.max(0, q.grandTotal - (q.advancePaid || (q.isConfirmed ? q.advanceAmount : 0))).toLocaleString('en-IN')}
                                </div>
                              </td>

                              {/* 6. Actions */}
                              <td className="p-3 text-center">
                                <div className="flex items-center justify-center gap-1 flex-wrap">
                                  {/* WhatsApp Green Share Pill */}
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setWhatsAppShareQuote(q);
                                      setIsWhatsAppShareModalOpen(true);
                                    }}
                                    className="p-1.5 bg-emerald-600/90 hover:bg-emerald-500 text-white rounded transition cursor-pointer shadow-xs"
                                    title="Share Quotation via WhatsApp"
                                  >
                                    <MessageCircle className="w-3.5 h-3.5" />
                                  </button>

                                  {q.isConfirmed ? (
                                    <button
                                      type="button"
                                      onClick={() => handlePrint12LFromQuotation(q)}
                                      className="px-2 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs rounded border border-amber-500/40 transition cursor-pointer flex items-center gap-1 font-bold"
                                      title="Print 12L Yellow Door Stickers"
                                    >
                                      <QrCode className="w-3.5 h-3.5 text-amber-400" />
                                      <span>12L</span>
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleStartConfirmQuotation(q)}
                                      className="px-2 py-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs rounded transition cursor-pointer font-bold shadow-xs"
                                      title="Confirm & Lock Order"
                                    >
                                      <span>Confirm</span>
                                    </button>
                                  )}

                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (q.id.startsWith('INV-')) setPrintDocType('salesInvoice');
                                      else setPrintDocType('quotation');
                                      setPreviewQuote(q);
                                    }}
                                    className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded border border-slate-700 transition cursor-pointer"
                                    title="View & Print Document"
                                  >
                                    Print
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedRiskQuote(q);
                                      setIsProjectRiskModalOpen(true);
                                    }}
                                    className="p-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 rounded border border-amber-500/30 transition cursor-pointer"
                                    title="Project Risk, Cost & Location Warranty"
                                  >
                                    <ShieldAlert className="w-3 h-3" />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedCommissionQuote(q);
                                      setIsCommissionEditModalOpen(true);
                                    }}
                                    className="p-1 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-300 rounded border border-yellow-500/30 transition cursor-pointer"
                                    title="Edit Staff Commission (% or ₹/door)"
                                  >
                                    <Coins className="w-3 h-3" />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleEditQuotation(q)}
                                    className="p-1 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 rounded border border-amber-500/30 transition cursor-pointer"
                                    title="Edit Quotation"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleDeleteQuotation(q.id)}
                                    className="p-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded border border-rose-500/30 transition cursor-pointer"
                                    title="Delete Quotation"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </td>
                            </tr>

                            {/* Expandable Door Schedule Drawer */}
                            {isExpanded && Array.isArray(q.itemRows) && q.itemRows.length > 0 && (
                              <tr className="bg-slate-950/80 border-b border-slate-800">
                                <td colSpan={6} className="p-3">
                                  <div className="bg-slate-900/90 rounded-lg p-3 border border-slate-800 space-y-2">
                                    <div className="flex items-center justify-between text-xs border-b border-slate-800 pb-1.5">
                                      <span className="font-bold text-slate-200 flex items-center gap-1.5">
                                        <Ruler className="w-3.5 h-3.5 text-cyan-400" />
                                        Door Schedule Breakdown ({q.itemRows.length} Items)
                                      </span>
                                      <span className="text-[11px] text-slate-400 font-mono">
                                        Customer: {q.customerName}
                                      </span>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                                      {q.itemRows.map((row, rIdx) => {
                                        const rowTotal = Math.round((row.rate || 0) * (row.qty || 1));
                                        const unitLabel = row.unit === 'inch' ? '"' : (row.unit || 'cm');
                                        return (
                                          <div
                                            key={rIdx}
                                            className="bg-slate-950 p-2.5 rounded border border-slate-800/80 text-[11px] space-y-1.5"
                                          >
                                            <div className="flex items-center justify-between font-bold">
                                              <span className="text-white">
                                                {row.roomTag || row.doorNumber || `Door #${rIdx + 1}`}
                                                {row.modelCode ? ` • ${row.modelCode}` : ''}
                                              </span>
                                              <span className="font-mono text-emerald-400">
                                                ₹{rowTotal.toLocaleString('en-IN')}
                                              </span>
                                            </div>
                                            <div className="text-slate-300 font-mono text-[10px] flex items-center justify-between">
                                              <span>Size: {row.width}{unitLabel} × {row.height}{unitLabel}</span>
                                              <span className="font-bold">Qty: {row.qty || 1}</span>
                                            </div>
                                            <div className="text-[10px] text-slate-400 space-y-0.5 border-t border-slate-900 pt-1">
                                              <div><span className="text-slate-500">Lock:</span> {row.lockName || 'BABY LATCH'}</div>
                                              <div><span className="text-slate-500">Colour:</span> {row.colourName || 'Natural Teak'}</div>
                                              <div><span className="text-slate-500">Thickness:</span> {row.thicknessLabel || '30 mm'}</div>
                                              <div><span className="text-slate-500">Frame:</span> {row.frameTypeName || 'Regular 72×50mm'}</div>
                                            </div>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                </td>
                              </tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* VIEW: SITE MEASUREMENTS AS DEDICATED CATEGORY BY STAFF NAME */}
      {activeTab === 'siteMeasurements' && (
        <SiteMeasurementsCategoryView
          measurements={siteMeasurements}
          salesStaff={salesStaff}
          onLoadIntoWorkbench={handleImportSiteMeasurementToWorkbench}
          onConvertToQuotation={(m) => setAutoQuoteMeasurement(m)}
          onOpenNewMeasurement={() => setIsDoorMeasurementModalOpen(true)}
          onOpenCuttingSchedule={(m) => setCuttingScheduleMeasurement(m)}
          onRefresh={refreshMeasurements}
        />
      )}

      {/* VIEW 2: PIPELINE KANBAN BOARD */}
      {activeTab === 'pipeline' && (
        <div className="p-5 overflow-x-auto flex-1">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 h-full min-w-[1000px]">
            {STAGE_ORDER.map((stageKey) => {
              const stageLeads = leads.filter((l) => l.stage === stageKey);
              const isLastStage = stageKey === 'negotiation';

              return (
                <div
                  key={stageKey}
                  className="bg-[#0e1627] border border-slate-800/80 rounded-xl flex flex-col overflow-hidden"
                >
                  <div className="p-3 border-b border-slate-800 bg-[#111a30] flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`w-2.5 h-2.5 rounded-full ${
                          stageKey === 'inquiries'
                            ? 'bg-blue-500'
                            : stageKey === 'measurement'
                            ? 'bg-amber-500'
                            : stageKey === 'quotation'
                            ? 'bg-purple-500'
                            : 'bg-emerald-500'
                        }`}
                      />
                      <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                        {STAGE_LABELS[stageKey]}
                      </h3>
                    </div>
                    <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">
                      {stageLeads.length} Leads
                    </span>
                  </div>

                  <div className="flex-1 p-3 space-y-3 overflow-y-auto">
                    {stageLeads.map((lead) => (
                      <div
                        key={lead.id}
                        className="bg-[#131d33] hover:bg-[#16233f] border border-slate-700/60 rounded-lg p-3.5 shadow-sm transition flex flex-col justify-between space-y-2.5"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <h4 className="text-xs font-bold text-white leading-snug">{lead.title}</h4>
                            <span className="text-xs font-bold text-emerald-400 bg-emerald-950/40 border border-emerald-800/40 px-1.5 py-0.5 rounded shrink-0">
                              {lead.value}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-300 mt-1 font-medium">{lead.client}</p>
                          <div className="flex items-center gap-2 mt-2 text-[10px] text-slate-400">
                            <span className="font-mono bg-slate-800 px-1.5 py-0.5 rounded text-slate-300">
                              {lead.id}
                            </span>
                            <span className="truncate">{lead.doors}</span>
                          </div>
                        </div>

                        <div className="mt-3 pt-2 border-t border-slate-800 flex justify-between items-center gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setActiveLeadModal(lead);
                              setLeadModalNotes(lead.notes || '');
                            }}
                            className="text-[10px] text-slate-400 hover:text-white cursor-pointer"
                          >
                            View Log
                          </button>

                          <div className="flex items-center gap-1.5">
                            {stageKey !== 'inquiries' && (
                              <button
                                type="button"
                                onClick={() => handleReverseLead(lead.id)}
                                className="px-2 py-1 text-[10px] font-bold bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 rounded transition cursor-pointer"
                                title="Roll back lead to previous stage"
                              >
                                ↺ Reverse
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() => handleAdvanceLead(lead.id)}
                              className={`text-[11px] font-semibold px-2.5 py-1 rounded transition cursor-pointer ${
                                isLastStage
                                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white'
                                  : 'bg-rose-600 hover:bg-rose-500 text-white'
                              }`}
                            >
                              {isLastStage ? 'Create Sales Order 📦' : 'Follow up →'}
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}

                    {stageLeads.length === 0 && (
                      <div className="p-6 text-center text-xs text-slate-500 italic border border-dashed border-slate-800 rounded-xl">
                        No leads in this stage
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* VIEW 3: SALES ORDERS TRACKING VIEW */}
      {activeTab === 'salesOrders' && (
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          <div className="bg-[#0f172a] border border-slate-800 p-5 rounded-xl flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white">Sales Orders Workflow Engine</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                5-Stage Execution: Order Confirmed &rarr; 50% Advance Recd &rarr; In Production &rarr; QC Passed &rarr; Dispatched &amp; Installed
              </p>
            </div>
            <span className="text-xs bg-rose-500/20 text-rose-400 border border-rose-500/30 px-3 py-1 rounded-lg font-mono font-semibold">
              Active Work Orders: {salesOrders.length}
            </span>
          </div>

          <div className="space-y-4">
            {salesOrders.length === 0 ? (
              <div className="p-12 text-center bg-[#11192e] border border-slate-800 rounded-xl space-y-2">
                <Layers className="w-8 h-8 text-slate-600 mx-auto" />
                <p className="text-sm font-bold text-slate-300">0 Active Factory Work Orders</p>
                <p className="text-xs text-slate-500 max-w-sm mx-auto">
                  All production orders cleared to zero. Generate quotations and verify 30% advance to release jobs to the plant floor.
                </p>
              </div>
            ) : (
              salesOrders.map((order) => {
              const isFinished = order.stepIndex === ORDER_STEPS.length - 1;

              return (
                <div
                  key={order.id}
                  className="bg-[#11192e] border border-slate-800 rounded-xl p-5 shadow-lg space-y-4"
                >
                  <div className="flex justify-between items-center border-b border-slate-800 pb-3 flex-wrap gap-2">
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="px-2 py-0.5 text-xs font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 rounded">
                          {order.id}
                        </span>
                        <h4 className="text-sm font-bold text-white inline-block">{order.title}</h4>
                        {order.isConvertedToSales && (
                          <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded inline-flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                            <span>CONVERTED TO SALES: {order.convertedInvoiceId}</span>
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        {order.client} &bull; {order.doors}
                      </p>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap sm:flex-nowrap">
                      <div className="text-right">
                        <span className="text-emerald-400 font-bold">{order.value}</span>
                        <span className="block text-[10px] text-slate-400 font-mono">{order.advancePaid}</span>
                      </div>

                      {/* Advance Deposit Button */}
                      <button
                        type="button"
                        onClick={() => {
                          const val = order.totalNumericValue || (parseFloat(order.value.replace(/[^0-9.]/g, '')) * 100000) || 200000;
                          const min30 = Math.round(val * 0.30);
                          setActiveAdvanceOrder(order);
                          setAdvanceDepositAmount(order.advanceAmount && order.advanceAmount >= min30 ? order.advanceAmount : min30);
                          setAdvanceDepositMode(order.paymentMode || 'UPI');
                          setAdvanceDepositRef(order.paymentRef || '');
                          setAdvanceDepositNotes('');
                        }}
                        className={`px-2.5 py-1.5 rounded-lg text-xs font-bold inline-flex items-center gap-1 cursor-pointer transition ${
                          order.advanceVerified
                            ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                            : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 animate-pulse'
                        }`}
                        title="Record 30% advance deposit"
                      >
                        <CreditCard className="w-3.5 h-3.5" />
                        <span>{order.advanceVerified ? 'Deposit Paid' : 'Record 30% Advance'}</span>
                      </button>

                      {/* Reverse Step Button */}
                      {order.stepIndex > 0 && (
                        <button
                          type="button"
                          onClick={() => handleReverseSalesOrder(order.id)}
                          className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs font-bold border border-slate-700 cursor-pointer inline-flex items-center gap-1 transition"
                          title="Roll back order to previous stage"
                        >
                          <ChevronLeft className="w-3.5 h-3.5 text-amber-400" />
                          <span>↺ Reverse</span>
                        </button>
                      )}

                      {!isFinished ? (
                        <button
                          type="button"
                          onClick={() => handleAdvanceSalesOrderClick(order)}
                          className="bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg cursor-pointer transition flex items-center gap-1"
                        >
                          <span>Advance Step</span>
                          <ChevronRight className="w-4 h-4" />
                        </button>
                      ) : (
                        <span className="text-xs text-emerald-400 font-bold flex items-center gap-1">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>Delivered</span>
                        </span>
                      )}

                      {/* Convert to Sales Action */}
                      {order.isConvertedToSales ? (
                        <div className="flex items-center gap-1.5">
                          <span className="px-2.5 py-1 text-xs font-bold rounded-lg bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                            <span>Converted: {order.convertedInvoiceId}</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => handleConvertToSales(order)}
                            className="bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-bold px-2.5 py-1.5 rounded-lg cursor-pointer transition flex items-center gap-1 border border-slate-700 shadow-sm"
                            title="Open Converted Sales Invoice in Print Hub"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>View Invoice 📄</span>
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleConvertToSales(order)}
                          className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg cursor-pointer transition flex items-center gap-1.5 shadow-md shadow-emerald-950/40"
                          title="Convert this Sales Order into a confirmed Sales Invoice / Bill"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>Convert to Sales 🧾</span>
                        </button>
                      )}
                    </div>
                  </div>

                  {/* 5-Step Visual Progression */}
                  <div className="flex items-start justify-between pt-2 gap-2 flex-wrap sm:flex-nowrap">
                    {ORDER_STEPS.map((s, idx) => {
                      const isDone = idx <= order.stepIndex;
                      const isCur = idx === order.stepIndex;

                      return (
                        <div key={idx} className="flex-1 flex flex-col items-center text-center relative min-w-[70px]">
                          <div
                            className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold relative z-10 ${
                              isCur
                                ? 'bg-rose-600 text-white ring-4 ring-rose-500/20'
                                : isDone
                                ? 'bg-emerald-600 text-white'
                                : 'bg-slate-800 text-slate-400 border border-slate-700'
                            }`}
                          >
                            {isDone && !isCur ? '✓' : idx + 1}
                          </div>
                          <span
                            className={`text-[10px] sm:text-[11px] font-bold mt-2 leading-tight ${
                              isCur ? 'text-rose-400' : isDone ? 'text-slate-200' : 'text-slate-500'
                            }`}
                          >
                            {s}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            }))}
          </div>
        </div>
      )}

      {/* PRINT / VIEW MULTI-THEME DOCUMENT MODAL */}
      {previewQuote && (
        <div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-3 sm:p-4 backdrop-blur-sm overflow-y-auto printable-modal-root">
          <div className="bg-[#0f172a] border border-slate-700 w-full max-w-5xl rounded-xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[95vh]">
            {/* Top Modal Header */}
            <div className="p-3.5 border-b border-slate-800 flex justify-between items-center bg-[#131d35] print:hidden">
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">
                  {previewQuote.id}
                </span>
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <Printer className="w-4 h-4 text-cyan-400" />
                  <span>Print &amp; Document Hub (Tally &amp; Vyapar Formats)</span>
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-xs font-semibold text-white rounded-lg flex items-center gap-1.5 shadow-md shadow-rose-900/40 transition cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Document (A4)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewQuote(null)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Document Type & Theme Switcher Toolbars */}
            <div className="border-b border-slate-800 bg-[#090e1a] p-3 space-y-2.5 text-xs print:hidden">
              {/* Document Type Selector */}
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-1 text-[11px] font-bold text-slate-300">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-rose-400" />
                  <span>Document Mode:</span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {(
                    [
                      { id: 'quotation', label: 'Quotation (എസ്റ്റിമേറ്റ്)' },
                      { id: 'proforma', label: 'Proforma Invoice' },
                      { id: 'salesOrder', label: 'Sales Work Order' },
                      { id: 'salesInvoice', label: 'Sales Invoice / Bill' },
                      { id: 'statement', label: 'Party Statement (ലെഡ്ജർ)' },
                    ] as const
                  ).map((doc) => (
                    <button
                      key={doc.id}
                      type="button"
                      onClick={() => setPrintDocType(doc.id)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition cursor-pointer ${
                        printDocType === doc.id
                          ? 'bg-rose-600 text-white shadow-sm'
                          : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {doc.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quick Convert from Sales Order to Sales Bill */}
              {printDocType === 'salesOrder' && (
                <div className="flex items-center justify-between p-2.5 rounded-lg bg-emerald-950/50 border border-emerald-800/60 text-emerald-300 text-xs gap-2 flex-wrap sm:flex-nowrap animate-in fade-in">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>Currently viewing <strong>Sales Work Order</strong>. Ready to convert to Sales Invoice / Bill?</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setPrintDocType('salesInvoice');
                      playBeep(720, 0.12);
                      showToast('Converted to Sales', 'Document mode switched to Sales Invoice / Bill.');
                    }}
                    className="px-3 py-1.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-md text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow whitespace-nowrap ml-auto"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Convert to Sales Bill ➔</span>
                  </button>
                </div>
              )}

              {/* Theme Selector (3 Tally + 2 Vyapar) & Print View Options */}
              <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-slate-800/80">
                <div className="flex items-center gap-1 text-[11px] font-bold text-slate-300">
                  <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Print Theme:</span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {(
                    [
                      { id: 'tally-classic', label: '🏛️ Tally Classic (സിമ്പിൾ)' },
                      { id: 'tally-modern', label: '📊 Tally Modern (പ്രൈം)' },
                      { id: 'tally-formal', label: '📋 Tally Formal (ഫോർമൽ)' },
                      { id: 'vyapar-elegant', label: '🎨 Vyapar Elegant (കളർ)' },
                      { id: 'vyapar-modern', label: '🏷️ Vyapar Modern (ക്ലീൻ)' },
                    ] as const
                  ).map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => handleSelectTheme(t.id)}
                      className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition cursor-pointer ${
                        printTheme === t.id
                          ? 'bg-cyan-600 text-white shadow-sm ring-1 ring-cyan-400'
                          : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* View Customizations: Hide Sq.Ft, Hide Bank Details & Zoom Controls */}
              <div className="flex items-center justify-between flex-wrap gap-2 pt-2 border-t border-slate-800/80">
                <div className="flex items-center gap-2 flex-wrap">
                  <label className="flex items-center gap-2 text-[11px] font-semibold text-slate-300 bg-slate-900 border border-slate-700/80 px-2.5 py-1 rounded-md cursor-pointer hover:border-slate-600 select-none">
                    <input
                      type="checkbox"
                      checked={hideSqFtOnPrint}
                      onChange={(e) => setHideSqFtOnPrint(e.target.checked)}
                      className="rounded border-slate-700 text-rose-500 focus:ring-rose-500 w-3.5 h-3.5 cursor-pointer"
                    />
                    <span>Hide Sq.Ft in Print (കസ്റ്റമർക്ക് Sq.Ft ഒഴിവാക്കുക)</span>
                  </label>

                  <label className="flex items-center gap-2 text-[11px] font-semibold text-slate-300 bg-slate-900 border border-slate-700/80 px-2.5 py-1 rounded-md cursor-pointer hover:border-slate-600 select-none">
                    <input
                      type="checkbox"
                      checked={hideBankDetailsOnPrint}
                      onChange={(e) => {
                        const val = e.target.checked;
                        setHideBankDetailsOnPrint(val);
                        try {
                          localStorage.setItem('exmark_hide_bank_details', val ? 'true' : 'false');
                        } catch {}
                      }}
                      className="rounded border-slate-700 text-amber-500 focus:ring-amber-500 w-3.5 h-3.5 cursor-pointer"
                    />
                    <Landmark className="w-3.5 h-3.5 text-amber-400" />
                    <span>Hide Bank Details in Print (ബാങ്ക് വിവരങ്ങൾ ഒഴിവാക്കുക)</span>
                  </label>
                </div>

                <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700/80 px-2 py-1 rounded-md text-[11px]">
                  <span className="text-slate-400 font-semibold">Preview Zoom:</span>
                  {(
                    [
                      { id: 'fit', label: 'Fit Page (82%)' },
                      { id: '100%', label: '100%' },
                      { id: '90%', label: '90%' },
                      { id: '75%', label: '75%' },
                    ] as const
                  ).map((z) => (
                    <button
                      key={z.id}
                      type="button"
                      onClick={() => setPreviewZoom(z.id)}
                      className={`px-2 py-0.5 rounded text-[10px] font-bold transition cursor-pointer ${
                        previewZoom === z.id
                          ? 'bg-rose-600 text-white'
                          : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {z.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Printable Sheet Body */}
            {(() => {
              const zoomScaleMap: Record<'fit' | '100%' | '90%' | '75%', number> = {
                fit: 0.82,
                '100%': 1.0,
                '90%': 0.9,
                '75%': 0.75,
              };
              const activeScale = zoomScaleMap[previewZoom] ?? 0.82;

              return (
                <div id="printableQuoteArea" className="p-4 sm:p-6 overflow-y-auto bg-slate-950/90 text-slate-900 flex justify-center items-start max-h-[75vh]">
                  <div
                    className="w-full max-w-4xl bg-white shadow-2xl rounded-lg overflow-hidden border border-slate-200 transition-transform origin-top print:!transform-none print:!max-w-full"
                    style={{
                      transform: activeScale !== 1 ? `scale(${activeScale})` : undefined,
                      transformOrigin: 'top center',
                    }}
                  >
                    <PrintDocumentHub
                      theme={printTheme}
                      documentType={printDocType}
                      quotation={previewQuote}
                      doorModels={doorModels}
                      hideSqFt={hideSqFtOnPrint}
                      hideBankDetails={hideBankDetailsOnPrint}
                      bankDetails={companyBankDetails}
                      customer={
                        customers.find((c) => c.name === previewQuote.customerName) ||
                        customers.find((c) => c.id === selectedCustomerId)
                      }
                    />
                  </div>
                </div>
              );
            })()}

            {/* Modal Bottom Status Bar */}
            <div className="p-3 bg-[#0a0f1d] border-t border-slate-800 flex justify-between items-center text-xs print:hidden">
              <div className="text-[11px] text-slate-400 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>
                  Active Theme: <strong className="text-white uppercase">{printTheme.replace('-', ' ')}</strong> | Mode: <strong className="text-cyan-400 uppercase">{printDocType}</strong> (Saved)
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shadow cursor-pointer transition"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Direct Print (ഡയറക്റ്റ് പ്രിന്റ്)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewQuote(null)}
                  className="px-4 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-white rounded-lg cursor-pointer transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ADD CUSTOMER MODAL */}
      {isAddCustomerOpen && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#111827] border border-slate-700 w-full max-w-md rounded-xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-[#141d33]">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <h3 className="text-sm font-bold text-white">Add New Customer (പുതിയ കസ്റ്റമർ)</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddCustomerOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-3.5 text-xs">
              <div>
                <label className="block font-medium text-slate-300 mb-1">Customer / Firm Name *</label>
                <input
                  type="text"
                  placeholder="E.g. Ar. Faisal & Partners / Skyline Builders"
                  value={newCustName}
                  onChange={(e) => setNewCustName(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-rose-500 font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-300 mb-1">Contact Phone *</label>
                  <input
                    type="text"
                    placeholder="+91 98470 XXXXX"
                    value={newCustPhone}
                    onChange={(e) => setNewCustPhone(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-rose-500"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-300 mb-1">District / Location *</label>
                  <input
                    type="text"
                    placeholder="E.g. Ernakulam, Malappuram"
                    value={newCustLocation}
                    onChange={(e) => setNewCustLocation(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-300 mb-1">Customer Category</label>
                  <select
                    value={newCustType}
                    onChange={(e) => setNewCustType(e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-slate-200 focus:outline-none focus:border-rose-500 cursor-pointer"
                  >
                    <option value="Architect">Architect / Consultant</option>
                    <option value="Contractor">Building Contractor</option>
                    <option value="Dealer">Dealer / Retailer</option>
                    <option value="Direct Client">Direct Home Owner</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Live Duplicate Customer Warning Banner */}
            {(() => {
              const normPhone = newCustPhone.replace(/\D/g, '').slice(-10);
              const normName = newCustName.trim().toLowerCase();
              const matched = customers.find((c) => {
                const cPhone = (c.phone || '').replace(/\D/g, '').slice(-10);
                const cName = (c.name || '').trim().toLowerCase();
                if (normPhone && normPhone.length >= 7 && cPhone === normPhone) return true;
                if (normName && normName.length >= 2 && cName === normName) return true;
                return false;
              });

              if (!matched) return null;

              return (
                <div className="mx-5 mb-3 p-2.5 rounded-lg bg-amber-950/70 border border-amber-500/60 text-amber-200 text-xs flex items-center justify-between gap-2 animate-in fade-in">
                  <div>
                    <span className="font-bold text-amber-300">⚠️ Customer Already Exists:</span>{' '}
                    <span>{matched.name} ({matched.phone}) • {matched.location}</span>
                    <span className="block text-[10px] text-amber-400/80">Only 1 customer record allowed per mobile number.</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCustomerId(matched.id);
                      setIsAddCustomerOpen(false);
                      setNewCustName('');
                      setNewCustPhone('');
                      setNewCustLocation('');
                      showToast('Customer Selected', `Selected existing customer "${matched.name}".`);
                    }}
                    className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded text-[11px] shrink-0 cursor-pointer shadow"
                  >
                    Select Existing ➔
                  </button>
                </div>
              );
            })()}

            <div className="p-4 bg-slate-900/90 border-t border-slate-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAddCustomerOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveCustomer}
                className="px-4 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-lg shadow-md transition cursor-pointer"
              >
                Save &amp; Select Customer
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD DOOR MODEL MODAL WITH BULK PDF CATALOG IMPORT */}
      {isAddDoorModelOpen && (
        <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#111827] border border-slate-700 w-full max-w-2xl rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-[#141d33]">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-500" />
                <h3 className="text-sm font-bold text-white">Add New Door Model &amp; PDF Catalog</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsAddDoorModelOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Mode Switcher Tabs */}
            <div className="flex items-center border-b border-slate-800 bg-[#0B132B] px-4 pt-2 gap-2 text-xs">
              <button
                type="button"
                onClick={() => setModelModalTab('SINGLE')}
                className={`pb-2 px-3 font-bold border-b-2 transition cursor-pointer ${
                  modelModalTab === 'SINGLE'
                    ? 'border-cyan-500 text-cyan-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                Single Model Entry (ഒറ്റ മോഡൽ)
              </button>
              <button
                type="button"
                onClick={() => {
                  setModelModalTab('BULK_PDF');
                  if (bulkParsedModels.length === 0) {
                    setBulkParsedModels([
                      { id: `MOD-${Date.now()}-1`, code: 'EXM-A-101', title: 'Natural Teak Molded FRP Door', material: 'FRP', rate: 7000, finish: 'Natural Teak Matte' },
                      { id: `MOD-${Date.now()}-2`, code: 'EXM-A-102', title: 'Kerala Traditional 2-Panel Teak', material: 'FRP', rate: 7000, finish: 'Teak Woodgrain' },
                      { id: `MOD-${Date.now()}-3`, code: 'EXM-B-112', title: 'Burma Teak 4-Panel Molded', material: 'FRP', rate: 7600, finish: 'Burma Teak Gloss' },
                      { id: `MOD-${Date.now()}-4`, code: 'EXM-B-115', title: 'Royal Walnut Woodgrain', material: 'FRP', rate: 7600, finish: 'Walnut Dark' },
                      { id: `MOD-${Date.now()}-5`, code: 'EXM-C-121', title: 'Antique Rosewood Deep Carved', material: 'FRP', rate: 8200, finish: 'Rosewood Gloss' },
                      { id: `MOD-${Date.now()}-6`, code: 'EXM-D-128', title: 'Designer Minimalist Dark Oak', material: 'FRP', rate: 8800, finish: 'Dark Oak Matte' },
                      { id: `MOD-${Date.now()}-7`, code: 'EXM-E-135', title: 'Ultra-Luxury Hand-Carved Villa Door', material: 'FRP', rate: 9500, finish: 'Heritage Teak Antique' },
                    ]);
                  }
                }}
                className={`pb-2 px-3 font-bold border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
                  modelModalTab === 'BULK_PDF'
                    ? 'border-cyan-500 text-cyan-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileUp className="w-3.5 h-3.5" />
                <span>Bulk Upload Catalog PDF (ബൾക്ക് അപ്‌ലോഡ്)</span>
              </button>
            </div>

            {modelModalTab === 'SINGLE' ? (
              <div className="p-5 space-y-4 text-xs overflow-y-auto">
                <div className="bg-slate-900/60 p-3 rounded-lg border border-slate-800 text-slate-400 text-[11px] leading-relaxed">
                  Enter the Door Model Number and its Price. All extra material and title fields have been removed for rapid entry.
                </div>
                <div className="space-y-3">
                  <div>
                    <label className="block font-bold text-slate-200 mb-1">
                      Door Model Number (മോഡൽ നമ്പർ) *
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. EXM-A-128, EXM-201, MOD-305"
                      value={newModelCode}
                      onChange={(e) => setNewModelCode(e.target.value.toUpperCase())}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-slate-100 focus:outline-none focus:border-cyan-500 uppercase font-mono font-bold text-sm"
                      autoFocus
                    />
                  </div>
                  <div>
                    <label className="block font-bold text-slate-200 mb-1">
                      Model Price (പ്രൈസ് / Rate ₹) *
                    </label>
                    <input
                      type="number"
                      placeholder="7000"
                      value={newModelRate}
                      onChange={(e) => setNewModelRate(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-emerald-400 focus:outline-none focus:border-cyan-500 font-mono font-bold text-sm"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="p-5 space-y-4 text-xs overflow-y-auto">
                <div className="p-4 border-2 border-dashed border-cyan-500/40 rounded-xl bg-cyan-950/20 text-center space-y-2">
                  <UploadCloud className="w-8 h-8 text-cyan-400 mx-auto" />
                  <div>
                    <span className="font-bold text-white text-xs block">Upload Manufacturer Door Catalog PDF</span>
                    <span className="text-[11px] text-slate-400">Drag &amp; drop PDF catalog or fetch standard EXMARK 2026 FRP models list</span>
                  </div>
                  <div className="flex items-center justify-center gap-2 pt-1">
                    <label className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-600 rounded-lg text-slate-200 cursor-pointer font-semibold text-xs">
                      <span>Choose PDF File</span>
                      <input
                        type="file"
                        accept="application/pdf"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            setBulkPdfFileName(file.name);
                            showToast('Catalog PDF Loaded', `Extracted models from "${file.name}"`);
                          }
                        }}
                      />
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setBulkPdfFileName('EXMARK_Master_FRP_Catalog_2026.pdf');
                        showToast('Catalog Loaded', 'Loaded EXMARK 2026 Master FRP Catalog (7 Models)');
                      }}
                      className="px-3 py-1.5 bg-cyan-600/30 hover:bg-cyan-600/50 border border-cyan-500/50 text-cyan-300 rounded-lg font-bold text-xs cursor-pointer"
                    >
                      Fetch EXMARK 2026 Master Models
                    </button>
                  </div>
                  {bulkPdfFileName && (
                    <div className="text-[11px] font-mono text-emerald-400 font-bold">
                      ✓ Active File: {bulkPdfFileName}
                    </div>
                  )}
                </div>

                {/* Parsed Models Table */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-bold text-white uppercase text-[11px] tracking-wide">
                      Parsed Models Ready for Import ({bulkParsedModels.length})
                    </span>
                    <span className="text-slate-400 text-[10px]">Will be available in door model dropdowns</span>
                  </div>
                  <div className="border border-slate-800 rounded-lg overflow-hidden max-h-48 overflow-y-auto">
                    <table className="w-full text-left text-[11px]">
                      <thead className="bg-[#141d33] text-slate-300 border-b border-slate-800">
                        <tr>
                          <th className="p-2">Model Number / Code</th>
                          <th className="p-2 text-right">Standard Rate</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60 bg-slate-900/60">
                        {bulkParsedModels.map((m) => (
                          <tr key={m.id} className="hover:bg-slate-800/40">
                            <td className="p-2 font-mono font-bold text-cyan-400">{m.code}</td>
                            <td className="p-2 text-right font-mono font-bold text-emerald-400">₹{m.rate.toLocaleString('en-IN')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            <div className="p-4 bg-slate-900/90 border-t border-slate-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAddDoorModelOpen(false)}
                className="px-3 py-1.5 text-xs text-slate-300 hover:bg-slate-800 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              {modelModalTab === 'SINGLE' ? (
                <button
                  type="button"
                  onClick={handleSaveDoorModel}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 rounded-lg shadow-md transition cursor-pointer"
                >
                  Save &amp; Sync to Catalog
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    const existingCodes = new Set(doorModels.map((m) => m.code.toUpperCase()));
                    const newUnique = bulkParsedModels.filter((m) => !existingCodes.has(m.code.toUpperCase()));
                    setDoorModels([...doorModels, ...newUnique]);
                    setIsAddDoorModelOpen(false);
                    playBeep(640, 0.12);
                    showToast('Bulk Models Imported', `Successfully added ${newUnique.length} new models to catalog!`);
                  }}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-500 rounded-lg shadow-md transition cursor-pointer flex items-center gap-1.5"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Import All Models ({bulkParsedModels.length})</span>
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* DELIVERY ROUTE OPTIMIZER MODAL */}
      <DeliveryRouteOptimizerModal
        isOpen={isRouteOptimizerOpen}
        onClose={() => setIsRouteOptimizerOpen(false)}
      />

      {/* LEAD ACTION MODAL */}
      {activeLeadModal && (
        <div className="fixed inset-0 bg-black/75 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#111827] border border-slate-700 w-full max-w-lg rounded-xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-5 border-b border-slate-800 flex justify-between items-center bg-[#131c31]">
              <div>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 border border-rose-500/30">
                  {activeLeadModal.id}
                </span>
                <h3 className="text-lg font-bold text-white mt-1">{activeLeadModal.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveLeadModal(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-3 bg-slate-900/60 p-3 rounded-lg border border-slate-800/80">
                <div>
                  <p className="text-xs text-slate-400">Client / Architect</p>
                  <p className="font-medium text-slate-200">{activeLeadModal.client}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Deal Value</p>
                  <p className="font-bold text-emerald-400 text-base">{activeLeadModal.value}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Current Stage</p>
                  <p className="font-medium text-amber-300">{STAGE_LABELS[activeLeadModal.stage]}</p>
                </div>
                <div>
                  <p className="text-xs text-slate-400">Door Requirements</p>
                  <p className="font-medium text-slate-200">{activeLeadModal.doors}</p>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Follow-up Notes / Activity Log
                </label>
                <textarea
                  rows={3}
                  value={leadModalNotes}
                  onChange={(e) => setLeadModalNotes(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2.5 text-sm text-slate-200 focus:outline-none focus:border-rose-500"
                  placeholder="E.g., Site visit scheduled with contractor for measurements..."
                />
              </div>
            </div>

            <div className="p-4 bg-slate-900/80 border-t border-slate-800 flex justify-between items-center">
              <button
                type="button"
                onClick={() => {
                  setLeads(leads.filter((l) => l.id !== activeLeadModal.id));
                  setActiveLeadModal(null);
                  showToast('Lead Deleted', 'Lead removed from pipeline.');
                }}
                className="text-xs text-red-400 hover:text-red-300 px-3 py-1.5 rounded hover:bg-red-950/30 transition cursor-pointer"
              >
                Delete Lead
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setActiveLeadModal(null)}
                  className="px-3.5 py-1.5 text-xs text-slate-300 bg-slate-800 hover:bg-slate-700 rounded-lg transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    handleAdvanceLead(activeLeadModal.id);
                    setActiveLeadModal(null);
                  }}
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-rose-600 hover:bg-rose-500 rounded-lg shadow-lg shadow-rose-900/30 transition flex items-center gap-1.5 cursor-pointer"
                >
                  <span>Advance to Next Stage</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* 30% ADVANCE DEPOSIT GATEKEEPER MODAL */}
      {activeAdvanceOrder && (
        <div className="fixed inset-0 bg-black/80 z-[70] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#111827] border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-[#141d33]">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <h3 className="font-black text-white text-sm">Record Advance Deposit / പേയ്‌മെന്റ് വെരിഫിക്കേഷൻ</h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveAdvanceOrder(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              {(() => {
                const totalVal = activeAdvanceOrder.totalNumericValue || (parseFloat(activeAdvanceOrder.value.replace(/[^0-9.]/g, '')) * 100000) || 200000;
                const min30 = Math.round(totalVal * 0.30);
                const pct = totalVal > 0 ? Math.round((advanceDepositAmount / totalVal) * 100) : 0;
                const isOk = pct >= 30 && advanceDepositAmount >= min30;

                return (
                  <>
                    <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800 space-y-1.5">
                      <div className="flex justify-between text-slate-400">
                        <span>Order ID:</span>
                        <span className="font-mono font-bold text-white">{activeAdvanceOrder.id}</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Customer:</span>
                        <span className="font-semibold text-slate-200">{activeAdvanceOrder.client}</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Total Order Value:</span>
                        <span className="font-black text-emerald-400">₹{totalVal.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between text-amber-400 font-bold border-t border-slate-800 pt-1">
                        <span>Mandatory 30% Minimum Lock:</span>
                        <span>₹{min30.toLocaleString('en-IN')}</span>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-slate-300 font-bold">Deposit Amount Received (₹) *</label>
                        <div className="flex items-center gap-1 text-[10px]">
                          <button
                            type="button"
                            onClick={() => setAdvanceDepositAmount(min30)}
                            className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40 font-bold cursor-pointer"
                          >
                            30% Min
                          </button>
                          <button
                            type="button"
                            onClick={() => setAdvanceDepositAmount(Math.round(totalVal * 0.40))}
                            className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 font-medium cursor-pointer"
                          >
                            40%
                          </button>
                          <button
                            type="button"
                            onClick={() => setAdvanceDepositAmount(Math.round(totalVal * 0.50))}
                            className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 font-medium cursor-pointer"
                          >
                            50%
                          </button>
                          <button
                            type="button"
                            onClick={() => setAdvanceDepositAmount(totalVal)}
                            className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 font-medium cursor-pointer"
                          >
                            100%
                          </button>
                        </div>
                      </div>
                      <input
                        type="number"
                        min={min30}
                        value={advanceDepositAmount || ''}
                        onChange={(e) => setAdvanceDepositAmount(parseFloat(e.target.value) || 0)}
                        placeholder={`Min ₹${min30.toLocaleString('en-IN')}`}
                        className="w-full bg-[#131b2e] border border-slate-700 rounded-xl p-2.5 text-white font-black text-sm focus:border-rose-500 focus:outline-none"
                      />
                      <div className="mt-2 space-y-1.5">
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="text-slate-400">Percentage of Order:</span>
                          <span className={`font-black ${isOk ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {isNaN(pct) ? 0 : pct}% of total
                          </span>
                        </div>
                        <div
                          className={`p-2 rounded-lg text-[11px] flex items-center gap-2 ${
                            isOk
                              ? 'bg-emerald-950/40 border border-emerald-800/60 text-emerald-300'
                              : 'bg-rose-950/40 border border-rose-800/60 text-rose-300'
                          }`}
                        >
                          {isOk ? (
                            <>
                              <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-400" />
                              <span>Valid deposit ({pct}%). Next section (Production) unlocked.</span>
                            </>
                          ) : (
                            <>
                              <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-400" />
                              <span>🔒 Next Section Locked: Deposit is under 30% (₹{min30.toLocaleString('en-IN')}). Minimum 30% required.</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-300 mb-1 font-semibold">Payment Mode</label>
                        <select
                          value={advanceDepositMode}
                          onChange={(e) => setAdvanceDepositMode(e.target.value)}
                          className="w-full bg-[#131b2e] border border-slate-700 rounded-lg p-2 text-slate-200 focus:border-rose-500 focus:outline-none cursor-pointer"
                        >
                          <option value="UPI">UPI / GPay / PhonePe</option>
                          <option value="NEFT/RTGS">NEFT / RTGS (Bank Transfer)</option>
                          <option value="Cheque">Cheque Deposit</option>
                          <option value="Cash">Cash Receipt</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-slate-300 mb-1 font-semibold">Reference / UTR No.</label>
                        <input
                          type="text"
                          value={advanceDepositRef}
                          onChange={(e) => setAdvanceDepositRef(e.target.value)}
                          placeholder="UTR / Ref ID"
                          className="w-full bg-[#131b2e] border border-slate-700 rounded-lg p-2 text-slate-200 focus:border-rose-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-300 mb-1 font-semibold">Accounts Verification Note</label>
                      <input
                        type="text"
                        value={advanceDepositNotes}
                        onChange={(e) => setAdvanceDepositNotes(e.target.value)}
                        placeholder="Verified with HDFC Bank / Cash Counter"
                        className="w-full bg-[#131b2e] border border-slate-700 rounded-lg p-2 text-slate-200 focus:border-rose-500 focus:outline-none"
                      />
                    </div>
                  </>
                );
              })()}
            </div>

            <div className="p-4 border-t border-slate-800 bg-[#141d33] flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setActiveAdvanceOrder(null)}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmAdvanceDeposit}
                disabled={!activeAdvanceOrder || advanceDepositAmount < Math.round((activeAdvanceOrder.totalNumericValue || (parseFloat(activeAdvanceOrder.value.replace(/[^0-9.]/g, '')) * 100000) || 200000) * 0.30)}
                className={`px-4 py-2 rounded-xl text-xs font-black shadow-lg flex items-center gap-1.5 transition ${
                  activeAdvanceOrder && advanceDepositAmount >= Math.round((activeAdvanceOrder.totalNumericValue || (parseFloat(activeAdvanceOrder.value.replace(/[^0-9.]/g, '')) * 100000) || 200000) * 0.30)
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>
                  {activeAdvanceOrder && advanceDepositAmount >= Math.round((activeAdvanceOrder.totalNumericValue || (parseFloat(activeAdvanceOrder.value.replace(/[^0-9.]/g, '')) * 100000) || 200000) * 0.30)
                    ? 'Verify & Release to Production'
                    : '🔒 Next Section Locked (Min 30%)'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* QUOTATION ORDER CONFIRMATION & ADVANCE MODAL */}
      {confirmingQuote && (
        <div className="fixed inset-0 bg-black/80 z-[70] flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#111827] border border-slate-700 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-[#141d33]">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <h3 className="font-black text-white text-sm">
                  Confirm Quotation &amp; Lock Order for Hand Production
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setConfirmingQuote(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              {(() => {
                const totalVal = confirmingQuote.grandTotal;
                const min30 = Math.round(totalVal * 0.30);
                const pct = totalVal > 0 ? Math.round((quoteAdvanceAmount / totalVal) * 100) : 0;
                const isOk = pct >= 30 && quoteAdvanceAmount >= min30;

                return (
                  <>
                    <div className="bg-slate-900/90 p-3.5 rounded-xl border border-slate-800 space-y-2">
                      <div className="flex justify-between text-slate-400">
                        <span>Quotation Ref:</span>
                        <span className="font-mono font-bold text-rose-400">{confirmingQuote.id}</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Customer / Architect:</span>
                        <span className="font-bold text-white">{confirmingQuote.customerName}</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Site / Project Location:</span>
                        <span className="font-semibold text-slate-300">{confirmingQuote.location}</span>
                      </div>
                      <div className="flex justify-between text-slate-400">
                        <span>Items / Spec:</span>
                        <span className="font-medium text-slate-300 truncate max-w-[260px]">{confirmingQuote.itemsSummary}</span>
                      </div>
                      <div className="flex justify-between text-slate-400 border-t border-slate-800 pt-1.5">
                        <span className="font-bold text-slate-300">Total Order Value:</span>
                        <span className="font-black text-emerald-400 text-sm">₹{totalVal.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between text-amber-400 font-bold">
                        <span>Mandatory Advance (30% Min Lock):</span>
                        <span>₹{min30.toLocaleString('en-IN')}</span>
                      </div>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="block text-slate-300 font-bold">
                          Advance Deposit Received (₹) *
                        </label>
                        <div className="flex items-center gap-1 text-[10px]">
                          <button
                            type="button"
                            onClick={() => setQuoteAdvanceAmount(min30)}
                            className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 hover:bg-amber-500/30 border border-amber-500/40 font-bold cursor-pointer"
                          >
                            30% Min
                          </button>
                          <button
                            type="button"
                            onClick={() => setQuoteAdvanceAmount(Math.round(totalVal * 0.40))}
                            className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 font-medium cursor-pointer"
                          >
                            40%
                          </button>
                          <button
                            type="button"
                            onClick={() => setQuoteAdvanceAmount(Math.round(totalVal * 0.50))}
                            className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 font-medium cursor-pointer"
                          >
                            50%
                          </button>
                          <button
                            type="button"
                            onClick={() => setQuoteAdvanceAmount(totalVal)}
                            className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 hover:bg-slate-700 font-medium cursor-pointer"
                          >
                            100%
                          </button>
                        </div>
                      </div>
                      <input
                        type="number"
                        min={min30}
                        value={quoteAdvanceAmount || ''}
                        onChange={(e) => setQuoteAdvanceAmount(parseFloat(e.target.value) || 0)}
                        placeholder={`Min ₹${min30.toLocaleString('en-IN')}`}
                        className="w-full bg-[#131b2e] border border-slate-700 rounded-xl p-2.5 text-white font-black text-sm focus:border-rose-500 focus:outline-none"
                      />
                      <div className="mt-2 space-y-1.5">
                        <div className="flex justify-between items-center text-[11px]">
                          <span className="text-slate-400">Percentage of Order:</span>
                          <span className={`font-black ${isOk ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {isNaN(pct) ? 0 : pct}% of total
                          </span>
                        </div>
                        <div
                          className={`p-2 rounded-lg text-[11px] flex items-center gap-2 ${
                            isOk
                              ? 'bg-emerald-950/40 border border-emerald-800/60 text-emerald-300'
                              : 'bg-rose-950/40 border border-rose-800/60 text-rose-300'
                          }`}
                        >
                          {isOk ? (
                            <>
                              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                              <span>Advance verified ({pct}%). Order unlocked for release to hand production &amp; 12L stickers.</span>
                            </>
                          ) : (
                            <>
                              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                              <span>🔒 Next Section Locked: Deposit is below minimum 30% (₹{min30.toLocaleString('en-IN')}). Order cannot be forwarded to production or 12L Sticker Studio until minimum 30% advance is received.</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-slate-400 font-bold mb-1">Payment Mode</label>
                        <select
                          value={quotePaymentMode}
                          onChange={(e) => setQuotePaymentMode(e.target.value)}
                          className="w-full bg-[#131b2e] border border-slate-700 rounded-xl p-2 text-white font-semibold focus:outline-none cursor-pointer"
                        >
                          <option value="UPI">UPI / Google Pay</option>
                          <option value="NEFT">NEFT / RTGS</option>
                          <option value="Cheque">Bank Cheque</option>
                          <option value="Cash">Cash at Factory</option>
                          <option value="Direct Bank Transfer">Direct Bank Transfer</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-slate-400 font-bold mb-1">UTR / Ref Number</label>
                        <input
                          type="text"
                          value={quotePaymentRef}
                          onChange={(e) => setQuotePaymentRef(e.target.value)}
                          placeholder="e.g. UTR4928198273"
                          className="w-full bg-[#131b2e] border border-slate-700 rounded-xl p-2 text-white font-mono focus:outline-none"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-slate-400 font-bold mb-1">Hand Crafting Line / Station</label>
                      <select
                        value={quoteStation}
                        onChange={(e) => setQuoteStation(e.target.value)}
                        className="w-full bg-[#131b2e] border border-slate-700 rounded-xl p-2 text-white font-semibold focus:outline-none cursor-pointer"
                      >
                        <option value="Hand Station 1: Hand-Layup &amp; Manual Mold Benches">Hand Station 1: Hand-Layup &amp; Manual Mold Benches</option>
                        <option value="Hand Station 2: Hand Resin Infusion &amp; Reinforcement">Hand Station 2: Hand Resin Infusion &amp; Reinforcement</option>
                        <option value="Hand Station 3: Manual Trimming, Edge Sealing &amp; Caliper Sizing">Hand Station 3: Manual Trimming &amp; Edge Caliper</option>
                        <option value="Hand Station 4: Artisan Hand-Carving &amp; Embossing Bench">Hand Station 4: Artisan Hand-Carving Bench</option>
                        <option value="Hand Station 5: Manual Fitting, Polish &amp; Final Inspection Bench">Hand Station 5: Fitting, Polish &amp; Final Inspection</option>
                      </select>
                    </div>

                    <div className="p-2.5 rounded-lg bg-blue-950/40 border border-blue-800/50 text-[11px] text-blue-300">
                      ℹ️ <strong>Next Stage Automation:</strong> Confirming creates Job Card in Production, registers advance in accounts, and immediately opens the <strong>12L Yellow Sticker Print Studio</strong>.
                    </div>
                  </>
                );
              })()}
            </div>

            <div className="p-4 border-t border-slate-800 bg-[#141d33] flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirmingQuote(null)}
                className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmQuotationOrder}
                disabled={isSubmittingConfirm || quoteAdvanceAmount < Math.round(confirmingQuote.grandTotal * 0.30)}
                className={`px-4 py-2 rounded-xl text-xs font-black shadow-lg flex items-center gap-1.5 transition ${
                  quoteAdvanceAmount >= Math.round(confirmingQuote.grandTotal * 0.30)
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>
                  {isSubmittingConfirm
                    ? 'Confirming...'
                    : quoteAdvanceAmount >= Math.round(confirmingQuote.grandTotal * 0.30)
                    ? 'Confirm & Release to Hand Production'
                    : '🔒 Next Section Locked (Min 30% Required)'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM ZERO ALL DATA MODAL */}
      {isZeroConfirmOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-[#0f172a] border border-slate-700 max-w-md w-full rounded-2xl p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2.5 rounded-full bg-rose-950/60 border border-rose-800/60">
                <Trash2 className="w-6 h-6 text-rose-400" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Clear All Data to Zero?</h3>
                <p className="text-xs text-slate-400">Reset factory operations to zero baseline</p>
              </div>
            </div>
            <p className="text-xs text-slate-300 leading-relaxed">
              This will clear all <strong>quotations ({quotations.length})</strong>, <strong>CRM leads ({leads.length})</strong>, and <strong>active work orders ({salesOrders.length})</strong> to zero records. The quotation draft workbench will reset all quantities, dimensions, and rates to <strong>₹0</strong>.
            </p>
            <div className="pt-2 flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setIsZeroConfirmOpen(false)}
                className="px-4 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClearAllDataAsZero}
                className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition shadow-lg shadow-rose-900/40 cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Yes, Clear All to Zero</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FRP DOOR AUTO-PRICING SETTINGS MODAL */}
      <FrpPricingSettingsModal
        isOpen={isFrpSettingsOpen}
        onClose={() => setIsFrpSettingsOpen(false)}
        currentSettings={frpSettings}
        initialTab={frpSettingsInitialTab}
        onSettingsSaved={(newSettings: FrpRateCardSettings) => {
          setFrpSettings(newSettings);
          const nextThicknesses =
            newSettings.doorThicknesses && newSettings.doorThicknesses.length > 0
              ? newSettings.doorThicknesses
              : DEFAULT_THICKNESS_OPTIONS;
          const defThk = getDefaultThicknessOption(nextThicknesses);

          // Recalculate all quoteItemRows with updated rate card, Tier-2 Sq.Ft rules, & thicknesses
          setQuoteItemRows((prev) =>
            prev.map((r) => {
              const matchedThk = nextThicknesses.find((t) => t.id === r.thicknessId) || defThk;
              const updatedRow: QuoteItemRow = {
                ...r,
                thicknessId: matchedThk.id,
                thicknessLabel: matchedThk.name,
                thicknessExtraRate: matchedThk.extraRate || 0,
              };
              if (!updatedRow.frpCategory || updatedRow.frpCategory === 'CUSTOM') return updatedRow;
              const calc = computeAutoPriceForRow(updatedRow, newSettings);
              return {
                ...updatedRow,
                rate: calc.finalUnitRate,
                autoPriceBreakdown: calc.breakdown,
              };
            })
          );
          showToast('FRP Rate Card Updated', 'Updated rates, oversize threshold & door thicknesses applied.');
        }}
      />

      {/* Custom Frames Manager Modal (Add / Edit / Delete Frame Profiles) */}
      <CustomFrameManagerModal
        isOpen={isFrameManagerOpen}
        onClose={() => setIsFrameManagerOpen(false)}
        onFramesUpdated={handleFramesUpdated}
      />

      {/* Quick Lock Creator Modal */}
      <QuickLockModal
        isOpen={isQuickLockOpen}
        onClose={() => {
          setIsQuickLockOpen(false);
          setQuickLockRowIndex(null);
        }}
        frpSettings={frpSettings}
        onLockAdded={(newLock, updatedSettings) => {
          setFrpSettings(updatedSettings);
          if (quickLockRowIndex !== null && quickLockRowIndex >= 0 && quickLockRowIndex < quoteItemRows.length) {
            handleUpdateRow(quickLockRowIndex, { lockId: newLock.id, lockPrice: newLock.price });
          }
          showToast('Lock Added', `${newLock.name} (₹${newLock.price}) added to rate card.`);
        }}
      />

      {/* 12L Sticker Print Studio Modal */}
      <StickerPrintModal
        isOpen={Boolean(stickerOrder)}
        onClose={() => setStickerOrder(null)}
        order={stickerOrder}
        onOrderUpdated={(updated) => setStickerOrder(updated)}
      />

      {/* Site Measurement Entry Modal */}
      {isDoorMeasurementModalOpen && (
        <DoorMeasurementModal
          isOpen={isDoorMeasurementModalOpen}
          onClose={() => setIsDoorMeasurementModalOpen(false)}
          onSaved={(newRecord) => {
            setIsDoorMeasurementModalOpen(false);
            refreshMeasurements();
            showToast('Site Measurement Saved', `Saved ${newRecord.refNumber} (${newRecord.siteName}) by ${newRecord.engineerName}`);
          }}
          userRole={userRole}
        />
      )}

      {/* Auto Quotation Calculation Modal */}
      {autoQuoteMeasurement && (
        <AutoQuotationModal
          isOpen={Boolean(autoQuoteMeasurement)}
          onClose={() => setAutoQuoteMeasurement(null)}
          measurement={autoQuoteMeasurement}
          onQuotationGenerated={(quoteNumber) => {
            setAutoQuoteMeasurement(null);
            refreshMeasurements();
            showToast('Quotation Created', `Generated quotation ${quoteNumber} from site measurement.`);
            apiFetch('/api/quotations').then((r) => r.json()).then((json) => {
              if (json && Array.isArray(json.data)) {
                // reload quotes
              }
            }).catch(() => {});
          }}
        />
      )}

      {/* Cutting Schedule Print Hub Modal */}
      {cuttingScheduleMeasurement && (
        <CuttingSchedulePrintHubModal
          isOpen={Boolean(cuttingScheduleMeasurement)}
          onClose={() => setCuttingScheduleMeasurement(null)}
          initialPartyName={cuttingScheduleMeasurement.customerName || cuttingScheduleMeasurement.siteName}
          initialSiteLocation={`${cuttingScheduleMeasurement.siteName}, ${cuttingScheduleMeasurement.district}`}
          initialDoors={cuttingScheduleMeasurement.doors?.map((d, idx) => ({
            id: d.id || `door-${idx}`,
            date: cuttingScheduleMeasurement.date || new Date().toISOString().split('T')[0],
            modelName: d.model || 'FRP Molded',
            doorThickness: '32mm',
            roomTag: d.doorNumber || `D${idx + 1}`,
            frameTypeId: d.frameType || 'WPC',
            rawHeightCm: d.measurementUnit === 'INCH' ? (d.heightLeft * 2.54) : d.measurementUnit === 'MM' ? (d.heightLeft / 10) : d.heightLeft,
            rawWidthTopCm: d.measurementUnit === 'INCH' ? (d.widthTop * 2.54) : d.measurementUnit === 'MM' ? (d.widthTop / 10) : d.widthTop,
            rawWidthBtmCm: d.measurementUnit === 'INCH' ? ((d.widthBottom ?? d.widthTop) * 2.54) : d.measurementUnit === 'MM' ? ((d.widthBottom ?? d.widthTop) / 10) : (d.widthBottom ?? d.widthTop),
            widthLinked: Math.abs((d.widthTop || 0) - (d.widthBottom ?? d.widthTop ?? 0)) < 0.05,
            extraHAdjCm: 0,
            extraWAdjCm: 0,
            lockCategory: d.lockType || 'Standard',
            lockSubLabel: '',
            hingeSide: d.hingeSide?.includes('Left') ? 'L' : 'R',
            finishCategory: 'Natural Teak',
            finishShade: d.colour || 'Natural Teak',
            stickerRemark: d.remarks || '',
            siteRemark: cuttingScheduleMeasurement.notes || '',
          }))}
        />
      )}

      {/* WhatsApp Quotation Share Modal */}
      <WhatsAppQuoteShareModal
        isOpen={isWhatsAppShareModalOpen}
        onClose={() => {
          setIsWhatsAppShareModalOpen(false);
          setWhatsAppShareQuote(null);
        }}
        quotation={whatsAppShareQuote}
      />

      {/* Project Risk, Cost & Profit Engine + Location Warranty Modal */}
      <ProjectRiskProfitModal
        isOpen={isProjectRiskModalOpen}
        onClose={() => {
          setIsProjectRiskModalOpen(false);
          setSelectedRiskQuote(null);
        }}
        quotation={selectedRiskQuote}
        onApplyBuffer={(pct) => {
          setAdditionalDiscount((prev) => Math.max(0, prev - Math.round(grandTotal * (pct / 100))));
        }}
      />

      {/* Staff Commission Edit Modal (% or ₹/door) */}
      <StaffCommissionEditModal
        isOpen={isCommissionEditModalOpen}
        onClose={() => {
          setIsCommissionEditModalOpen(false);
          setSelectedCommissionQuote(null);
        }}
        quotation={selectedCommissionQuote}
        onUpdated={(updated: any) => {
          setQuotations((prev) =>
            prev.map((q) => (q.id === updated.id ? { ...q, ...updated } : q))
          );
        }}
      />

      {/* Staff Order Report (Daily, Weekly, Monthly PDF & All Staff Performance) */}
      <StaffOrderReportModal
        isOpen={isStaffReportModalOpen}
        onClose={() => setIsStaffReportModalOpen(false)}
        initialStaffId={staffReportInitialStaffId}
      />
    </div>
  );
}

export default QuotationHub;
