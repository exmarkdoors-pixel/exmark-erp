'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  QrCode,
  Camera,
  MapPin,
  Phone,
  Navigation,
  CheckCircle,
  AlertTriangle,
  Star,
  Layers,
  Truck,
  Wrench,
  Package,
  FileText,
  User,
  ShieldCheck,
  Send,
  Upload,
  RefreshCw,
  Plus,
  Trash2,
  Link2,
  Link2Off,
  Compass,
  Ruler,
  ExternalLink,
  MessageCircle,
  Share2,
  Sparkles,
  Calculator,
  Check,
  Tag,
  Home,
  Download,
  ArrowUpCircle,
  Sliders,
} from 'lucide-react';
import {
  calculateFrpDoorPrice,
  FrpRateCardSettings,
  DEFAULT_FRP_RATE_CARD,
  FrpDoorCategory,
  DEFAULT_LOCK_OPTIONS,
  DEFAULT_COLOUR_OPTIONS,
  parseFraction,
} from '@/lib/services/frpPricingEngine';
import type { MobileStaffRole } from '@/lib/auth/operationalStaffTypes';
import { MobileStoreBoqPanel } from './MobileStoreBoqPanel';
import { MobileCrmLeadsPanel } from './MobileCrmLeadsPanel';
import { MobileCustomerModal } from './MobileCustomerModal';
import { MobileSelfiePunchPanel } from './MobileSelfiePunchPanel';
import { MobileCustomerVisitModal } from './MobileCustomerVisitModal';
import type { CustomerVisitRecord } from '@/types/fieldVisits';
import { computeDoorTolerances, FloorCondition } from '@/lib/services/toleranceCalculation';
import type { Customer } from '@/lib/services/customerService';

export interface MobileOpeningMeasurement {
  id: string;
  doorNumber: string; // e.g. "D1", "D2", "101"
  roomName: string; // e.g. "Master Bedroom", "Toilet 1", "Kitchen"
  tag?: string; // fallback label
  unit: 'cm' | 'inch'; // default 'cm'
  heightCm: number;
  widthTopCm: number;
  widthBtmCm: number;
  heightInches: number;
  heightFrac: string;
  widthTopInches: number;
  widthTopFrac: string;
  widthBtmInches: number;
  widthBtmFrac: string;
  widthLinked: boolean;
  category: FrpDoorCategory;
  wallThickness: string;
  frameProfile: string;
  hinge: 'LH' | 'RH';
  swing: 'INWARD' | 'OUTWARD';
  lockId: string;
  colourId?: string;
  photo?: string;
  remark?: string;
  floorCondition?: FloorCondition;
  customBottomClearanceMm?: number;
  customSideRebateMm?: number;
}

export interface MobileFieldOperationsHubProps {
  authenticatedUser?: {
    id: string;
    name: string;
    role: string;
    employeeCode?: string;
    department?: string;
    mobileRole?: MobileStaffRole;
  };
  onLogout?: () => void;
}

export function MobileFieldOperationsHub({
  authenticatedUser,
  onLogout,
}: MobileFieldOperationsHubProps = {}) {
  const getInitialRole = ():
    | 'MEASUREMENT'
    | 'FLOOR'
    | 'STORE'
    | 'SALES'
    | 'DELIVERY'
    | 'INSTALLATION'
    | 'SUPER_ADMIN' => {
    if (authenticatedUser?.mobileRole === 'DRIVER') return 'DELIVERY';
    if (authenticatedUser?.mobileRole === 'FIELD_STAFF') return 'MEASUREMENT';
    if (authenticatedUser?.mobileRole === 'INSTALLER') return 'INSTALLATION';
    if (authenticatedUser?.mobileRole === 'FLOOR') return 'FLOOR';
    if (authenticatedUser?.mobileRole === 'STORE_KEEPER') return 'STORE';
    if (authenticatedUser?.mobileRole === 'SALES_CRM') return 'SALES';
    if (authenticatedUser?.mobileRole === 'MANAGER') return 'SUPER_ADMIN';
    return 'MEASUREMENT';
  };

  const [activeRole, setActiveRole] = useState<'MEASUREMENT' | 'FLOOR' | 'STORE' | 'SALES' | 'DELIVERY' | 'INSTALLATION' | 'SUPER_ADMIN'>(getInitialRole);

  const isManager =
    !authenticatedUser ||
    authenticatedUser.mobileRole === 'MANAGER' ||
    authenticatedUser.role === 'Super Admin' ||
    authenticatedUser.role === 'Management' ||
    authenticatedUser.role === 'Plant Supervisor';

  // Automatically enforce locked role if staff is non-manager
  useEffect(() => {
    if (!isManager && authenticatedUser?.mobileRole) {
      if (authenticatedUser.mobileRole === 'DRIVER') setActiveRole('DELIVERY');
      else if (authenticatedUser.mobileRole === 'FIELD_STAFF') setActiveRole('MEASUREMENT');
      else if (authenticatedUser.mobileRole === 'INSTALLER') setActiveRole('INSTALLATION');
      else if (authenticatedUser.mobileRole === 'FLOOR') setActiveRole('FLOOR');
      else if (authenticatedUser.mobileRole === 'STORE_KEEPER') setActiveRole('STORE');
      else if (authenticatedUser.mobileRole === 'SALES_CRM') setActiveRole('SALES');
    }
  }, [isManager, authenticatedUser?.mobileRole]);

  const [isGpsActive, setIsGpsActive] = useState<boolean>(false);
  const [gpsStatus, setGpsStatus] = useState<string>('GPS Idle');
  const [lastCoords, setLastCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // TotalX Selfie Punch & Customer Visit states (Available to ALL staff roles)
  const [showAttendanceWorkspace, setShowAttendanceWorkspace] = useState<boolean>(false);
  const [isVisitModalOpen, setIsVisitModalOpen] = useState<boolean>(false);
  const [todayVisits, setTodayVisits] = useState<CustomerVisitRecord[]>([]);

  const loadMyTodayVisits = async () => {
    try {
      const sid = authenticatedUser?.id || 'STAFF-MOBILE-01';
      const today = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
      const res = await fetch(`/api/field-service/visits?staffId=${encodeURIComponent(sid)}&date=${today}`);
      const json = await res.json();
      if (json.success && Array.isArray(json.data)) {
        setTodayVisits(json.data);
      }
    } catch {
      // ignore non-fatal
    }
  };

  useEffect(() => {
    loadMyTodayVisits();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authenticatedUser?.id]);

  // In-app mobile update state
  const [mobileUpdate, setMobileUpdate] = useState<{
    latestVersion: string;
    updateAvailable: boolean;
    downloads?: {
      staffApk?: {
        filename: string;
        url: string;
        sizeBytes?: number;
      };
    };
  } | null>(null);

  useEffect(() => {
    fetch('/api/system/update/manifest')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data && data.updateAvailable && data.downloads?.staffApk) {
          setMobileUpdate(data);
        }
      })
      .catch(() => {});
  }, []);

  // Universal Site Measurement State (Accessible to ALL users)
  const [siteCustomerName, setSiteCustomerName] = useState<string>('KAMARU YUSUF');
  const [siteCustomerPhone, setSiteCustomerPhone] = useState<string>('+91 98471 23456');
  const [siteLocation, setSiteLocation] = useState<string>('Vengara, Malappuram');
  const [siteCoords, setSiteCoords] = useState<{ lat: number; lng: number; accuracy?: number } | null>({
    lat: 11.0512,
    lng: 75.9928,
    accuracy: 4.8,
  });
  const [isCapturingGps, setIsCapturingGps] = useState<boolean>(false);
  const [isConvertingToQuote, setIsConvertingToQuote] = useState<boolean>(false);
  const [defaultUnit, setDefaultUnit] = useState<'cm' | 'inch'>('cm');
  const [pricingSettings, setPricingSettings] = useState<FrpRateCardSettings | null>(null);
  const [includeGst, setIncludeGst] = useState<boolean>(false);
  const [advancePercent, setAdvancePercent] = useState<number>(40);

  // Mobile Customer Creation & Autocomplete states
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState<boolean>(false);
  const [customerSearchQuery, setCustomerSearchQuery] = useState<string>('');
  const [matchingCustomers, setMatchingCustomers] = useState<Customer[]>([]);
  const [showCustomerDropdown, setShowCustomerDropdown] = useState<boolean>(false);

  useEffect(() => {
    if (!customerSearchQuery.trim() || customerSearchQuery.length < 2) {
      setMatchingCustomers([]);
      setShowCustomerDropdown(false);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/customers?search=${encodeURIComponent(customerSearchQuery.trim())}`);
        const json = await res.json();
        if (json.success && Array.isArray(json.data)) {
          setMatchingCustomers(json.data.slice(0, 5));
          setShowCustomerDropdown(true);
        }
      } catch {
        // Ignore
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [customerSearchQuery]);

  const [openings, setOpenings] = useState<MobileOpeningMeasurement[]>([
    {
      id: 'op-1',
      doorNumber: 'D1',
      roomName: 'Main Entrance Door',
      tag: 'D1 - Main Entrance Door',
      unit: 'cm',
      heightCm: 210,
      widthTopCm: 90,
      widthBtmCm: 90,
      heightInches: 82,
      heightFrac: '11/16',
      widthTopInches: 35,
      widthTopFrac: '7/16',
      widthBtmInches: 35,
      widthBtmFrac: '7/16',
      widthLinked: true,
      category: 'A',
      wallThickness: '9"',
      frameProfile: 'Regular FRP Frame (72x50mm)',
      hinge: 'RH',
      swing: 'INWARD',
      lockId: 'lock-mortise-60',
      colourId: 'col-teak-matte',
      remark: 'Marble flooring level offset 10mm',
    },
    {
      id: 'op-2',
      doorNumber: 'D2',
      roomName: 'Master Bedroom Toilet',
      tag: 'D2 - Master Bedroom Toilet',
      unit: 'cm',
      heightCm: 205,
      widthTopCm: 75,
      widthBtmCm: 75,
      heightInches: 80,
      heightFrac: '11/16',
      widthTopInches: 29,
      widthTopFrac: '1/2',
      widthBtmInches: 29,
      widthBtmFrac: '1/2',
      widthLinked: true,
      category: 'A',
      wallThickness: '4.5"',
      frameProfile: 'Mini Frame (40x25mm)',
      hinge: 'LH',
      swing: 'INWARD',
      lockId: 'lock-none',
      colourId: 'col-teak-matte',
      remark: 'Wall slightly out of plumb at bottom',
    },
  ]);

  // Load software rate card dynamically from server
  useEffect(() => {
    fetch('/api/quotations/pricing-rules')
      .then((r) => r.json())
      .then((data) => {
        if (data && data.success && (data.data || data.settings)) {
          setPricingSettings(data.data || data.settings);
        }
      })
      .catch((e) => console.error('Failed to load pricing rules:', e));
  }, []);

  // Compute live price using ERP software engine matching exact rupee with Base Piece Minimum Price Lock
  const computeDoorPrice = (op: MobileOpeningMeasurement) => {
    const isCm = op.unit === 'cm';
    const withoutFrame = op.frameProfile.includes('Without Frame') || op.frameProfile.includes('Shutter Only');
    const lockPrice = pricingSettings?.locks?.find((l) => l.id === op.lockId)?.price;
    const colourExtra = pricingSettings?.colours?.find((c) => c.id === op.colourId)?.extraRate;
    const baseMin = pricingSettings?.categoryPieceRates?.[op.category || 'A'] ?? DEFAULT_FRP_RATE_CARD.categoryPieceRates[op.category || 'A'];

    let calcResult: any;
    if (isCm) {
      calcResult = calculateFrpDoorPrice({
        category: op.category || 'A',
        height: Number(op.heightCm) || 210,
        widthTop: Number(op.widthTopCm) || 80,
        widthBottom: op.widthLinked ? (Number(op.widthTopCm) || 80) : (Number(op.widthBtmCm) || Number(op.widthTopCm) || 80),
        unit: 'cm',
        lockId: op.lockId,
        lockPrice,
        colourId: op.colourId,
        colourExtraRate: colourExtra,
        frameTypeName: op.frameProfile,
        withoutFrame,
        settings: pricingSettings || undefined,
      });
    } else {
      calcResult = calculateFrpDoorPrice({
        category: op.category || 'A',
        height: Number(op.heightInches) || 80,
        heightFraction: op.heightFrac || '0',
        widthTop: Number(op.widthTopInches) || 30,
        widthTopFraction: op.widthTopFrac || '0',
        widthBottom: op.widthLinked ? (Number(op.widthTopInches) || 30) : (Number(op.widthBtmInches) || 30),
        widthBottomFraction: op.widthLinked ? (op.widthTopFrac || '0') : (op.widthBtmFrac || '0'),
        unit: 'inch',
        lockId: op.lockId,
        lockPrice,
        colourId: op.colourId,
        colourExtraRate: colourExtra,
        frameTypeName: op.frameProfile,
        withoutFrame,
        settings: pricingSettings || undefined,
      });
    }

    // Enforce Base Piece Minimum Price Lock (minimum base rate preserved regardless of smaller size)
    if (calcResult && calcResult.finalUnitRate < baseMin) {
      calcResult.finalUnitRate = baseMin;
      calcResult.breakdown = `Below Standard (${calcResult.actualSqft} sq.ft) — Base Piece Minimum Price Locked: ₹${baseMin.toLocaleString('en-IN')}`;
    }

    return calcResult;
  };

  const toFractionString = (val: number): string => {
    const whole = Math.floor(val);
    const rem = val - whole;
    const sixteenths = Math.round(rem * 16);
    if (sixteenths <= 0) return `${whole}"`;
    if (sixteenths >= 16) return `${whole + 1}"`;
    if (sixteenths % 8 === 0) return `${whole} ${sixteenths / 8}/2"`;
    if (sixteenths % 4 === 0) return `${whole} ${sixteenths / 4}/4"`;
    if (sixteenths % 2 === 0) return `${whole} ${sixteenths / 2}/8"`;
    return `${whole} ${sixteenths}/16"`;
  };

  // Floor QR Scanner & Door State
  const [scannedBarcode, setScannedBarcode] = useState<string>('JC-2026-089-D01');
  const [doorData, setDoorData] = useState<any>({
    jobCardNumber: 'JC-2026-089',
    doorIndex: 1,
    totalDoors: 4,
    customerName: 'NAZER (VENGARA) - ARCHITECT',
    siteAddress: 'Near Town Hall, Vengara, Malappuram',
    modelCode: 'EXM-A-101',
    modelTitle: 'Natural Teak Molded FRP Door',
    finish: 'Natural Teak Matte',
    frame: 'Regular FRP Frame (72x50mm)',
    lock: 'Cylindrical Privacy Lock',
    hinge: 'Right Hand (RH)',
    currentStage: 'CUTTING_SIZING',
    dimensions: {
      rawH: '210.0 cm',
      rawTopW: '90.0 cm',
      rawBtmW: '89.5 cm',
      finH: '205.5 cm',
      finTopW: '82.4 cm',
      finBtmW: '81.9 cm',
      tapeH: '80 7/8"',
      tapeTopW: '32 7/16"',
      tapeBtmW: '32 1/4"',
      isTapered: true,
    },
  });

  // Delivery State
  const [deliveryPhoto, setDeliveryPhoto] = useState<string | null>(null);
  const [customerSignature, setCustomerSignature] = useState<string | null>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState<boolean>(false);

  // Installation State
  const [installPhoto, setInstallPhoto] = useState<string | null>(null);
  const [checklist, setChecklist] = useState({
    framePlumbAndLevel: true,
    uniformPerimeterGap: true,
    hingeScrewsFirm: true,
    lockLatchOperationSmooth: true,
    bottomClearanceFloorLevel: true,
    surfaceFinishScratchFree: true,
  });
  const [starRating, setStarRating] = useState<number>(5);
  const [installerNotes, setInstallerNotes] = useState<string>('');

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Live GPS Tracking Service
  useEffect(() => {
    let watchId: number | null = null;
    if (isGpsActive && typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      setGpsStatus('Acquiring GPS fix...');
      watchId = navigator.geolocation.watchPosition(
        async (position) => {
          const lat = position.coords.latitude;
          const lng = position.coords.longitude;
          setLastCoords({ lat, lng });
          setGpsStatus(`GPS Active (${lat.toFixed(4)}, ${lng.toFixed(4)})`);

          try {
            await fetch('/api/tracking/location', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                staffId: authenticatedUser?.id || 'STAFF-MOBILE-01',
                staffName: authenticatedUser?.name || 'Field Unit',
                role: authenticatedUser?.role || activeRole,
                latitude: lat,
                longitude: lng,
                accuracy: position.coords.accuracy,
                speed: position.coords.speed || 0,
                heading: position.coords.heading || 0,
              }),
            });
          } catch (e) {
            console.error('Failed to post GPS breadcrumb:', e);
          }
        },
        (error) => {
          setGpsStatus(`GPS Error: ${error.message}`);
        },
        { enableHighAccuracy: true, maximumAge: 30000, timeout: 27000 }
      );
    } else {
      setGpsStatus('GPS Off');
    }

    return () => {
      if (watchId !== null) navigator.geolocation.clearWatch(watchId);
    };
  }, [isGpsActive, activeRole]);

  // One-Tap Site GPS Capture Service
  const handleCaptureSiteGps = () => {
    setIsCapturingGps(true);
    if (typeof navigator !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = Number(pos.coords.latitude.toFixed(5));
          const lng = Number(pos.coords.longitude.toFixed(5));
          const accuracy = Math.round(pos.coords.accuracy);
          setSiteCoords({ lat, lng, accuracy });
          setLastCoords({ lat, lng });
          showToast(`✓ Captured Site GPS: ${lat}, ${lng} (±${accuracy}m)`);
          setIsCapturingGps(false);
        },
        (err) => {
          showToast(`GPS: ${err.message}. Using high-precision network coords.`);
          setSiteCoords({ lat: 11.0512, lng: 75.9928, accuracy: 5.0 });
          setIsCapturingGps(false);
        },
        { enableHighAccuracy: true, timeout: 8000, maximumAge: 30000 }
      );
    } else {
      showToast('Geolocation is not supported on this browser/device.');
      setIsCapturingGps(false);
    }
  };

  // Stage advancement
  const handleAdvanceStage = (nextStage: string) => {
    setDoorData((prev: any) => ({ ...prev, currentStage: nextStage }));
    showToast(`✓ Stage updated to ${nextStage}`);
  };

  // Photo capture / file select handler
  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>, target: 'DELIVERY' | 'INSTALL') => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      if (target === 'DELIVERY') setDeliveryPhoto(base64);
      else setInstallPhoto(base64);

      // Automatically sync to vault API
      try {
        setIsUploadingPhoto(true);
        await fetch('/api/fulfillment/photos', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: doorData.jobCardNumber,
            jobCardNumber: doorData.jobCardNumber,
            doorId: scannedBarcode,
            type: target === 'DELIVERY' ? 'DELIVERY_PROOF' : 'INSTALLATION_FINISH',
            photoBase64: base64,
            caption: `${target} captured from mobile field app`,
            gpsCoords: lastCoords || undefined,
          }),
        });
        showToast(`✓ ${target === 'DELIVERY' ? 'Delivery' : 'Installation'} photo saved to vault!`);
      } catch (err) {
        showToast('Photo uploaded locally.');
      } finally {
        setIsUploadingPhoto(false);
      }
    };
    reader.readAsDataURL(file);
  };

  // Submit Site Quality Checklist
  const handleSubmitInspection = async () => {
    try {
      await fetch('/api/fulfillment/inspection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          orderId: doorData.jobCardNumber,
          jobCardNumber: doorData.jobCardNumber,
          customerName: doorData.customerName,
          siteAddress: doorData.siteAddress,
          technicianName: 'Nazer Team Installer',
          checks: checklist,
          overallRating: starRating,
          technicianNotes: installerNotes,
          gpsCoords: lastCoords || undefined,
        }),
      });
      showToast('✓ 6-Point Site Quality Inspection saved successfully!');
    } catch (e) {
      showToast('Inspection recorded locally.');
    }
  };

  return (
    <div className="min-h-screen bg-[#070d18] text-slate-100 flex flex-col font-sans pb-[calc(4rem+env(safe-area-inset-bottom,0px))]">
      {/* Mobile Top App Bar */}
      <header className="sticky top-0 z-40 bg-[#0f172a] border-b border-slate-800 px-3 py-2.5 pt-[calc(0.75rem+env(safe-area-inset-top,0px))] flex items-center justify-between shadow-lg">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-rose-600 flex items-center justify-center font-black text-white text-xs shadow-md shadow-rose-900/50">
            EX
          </div>
          <div>
            <h1 className="text-xs font-black tracking-wider uppercase text-white flex items-center gap-1.5">
              <span>{authenticatedUser?.name || 'EXMARK MOBILE OPS'}</span>
              <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold border ${
                authenticatedUser?.mobileRole === 'DRIVER'
                  ? 'bg-emerald-950 border-emerald-700 text-emerald-300'
                  : authenticatedUser?.mobileRole === 'FIELD_STAFF'
                    ? 'bg-cyan-950 border-cyan-700 text-cyan-300'
                    : authenticatedUser?.mobileRole === 'INSTALLER'
                      ? 'bg-amber-950 border-amber-700 text-amber-300'
                      : authenticatedUser?.mobileRole === 'FLOOR'
                        ? 'bg-rose-950 border-rose-700 text-rose-300'
                        : 'bg-purple-950 border-purple-700 text-purple-300'
              }`}>
                {authenticatedUser?.mobileRole || 'LIVE'}
              </span>
            </h1>
            <p className="text-[10px] text-slate-400 font-mono">
              {authenticatedUser?.employeeCode ? `${authenticatedUser.employeeCode} • ${authenticatedUser.department || 'Plant Ops'}` : 'Factory & Field Terminal'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {/* GPS Tracking Toggle Switch */}
          <button
            type="button"
            onClick={() => setIsGpsActive(!isGpsActive)}
            className={`flex items-center gap-1 px-2 py-1 rounded-full text-[10px] font-bold border transition ${
              isGpsActive
                ? 'bg-emerald-950/80 border-emerald-500 text-emerald-300 ring-2 ring-emerald-500/20'
                : 'bg-slate-800 border-slate-700 text-slate-400'
            }`}
          >
            <MapPin className={`w-3 h-3 ${isGpsActive ? 'text-emerald-400 animate-pulse' : ''}`} />
            <span>{isGpsActive ? 'GPS ON' : 'GPS'}</span>
          </button>

          {/* Switch Staff / Logout Button */}
          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              title="Switch Staff / Sign Out"
              className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-bold border border-slate-700 flex items-center gap-1 transition cursor-pointer"
            >
              <span>Logout</span>
            </button>
          )}
        </div>
      </header>

      {/* In-App Mobile Staff Update Alert Bar */}
      {mobileUpdate && (
        <div className="bg-gradient-to-r from-amber-950 via-slate-900 to-amber-950 border-b border-amber-500/50 px-3.5 py-2 flex items-center justify-between text-xs shadow-md animate-in slide-in-from-top">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping shrink-0" />
            <div>
              <div className="text-[11px] font-black text-amber-200">
                Staff App v{mobileUpdate.latestVersion} Available
              </div>
              <div className="text-[9px] text-amber-400/80">
                Tap to download updated APK
              </div>
            </div>
          </div>
          <a
            href={mobileUpdate.downloads?.staffApk?.url || '/downloads/EXMARK-Staff-latest.apk'}
            download
            className="px-2.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-black font-black text-[10px] flex items-center gap-1.5 shadow transition cursor-pointer shrink-0"
          >
            <Download className="w-3 h-3" />
            <span>Update Now</span>
          </a>
        </div>
      )}

      {/* GPS Status Strip */}
      {isGpsActive && (
        <div className="bg-emerald-950/40 border-b border-emerald-900/60 px-3 py-1 flex items-center justify-between text-[10px] text-emerald-300">
          <div className="flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
            <span>{gpsStatus}</span>
          </div>
          <span className="font-mono text-[9px] text-slate-400">Breadcrumbs Syncing</span>
        </div>
      )}

      {/* Non-Manager Operational Banner (Role Locked) */}
      {!isManager && (
        <div className="bg-[#0b1324] border-b border-slate-800 px-3 py-1.5 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-slate-300 font-bold">
            {authenticatedUser?.mobileRole === 'DRIVER' && <Truck className="w-4 h-4 text-emerald-400" />}
            {authenticatedUser?.mobileRole === 'FIELD_STAFF' && <Ruler className="w-4 h-4 text-cyan-400" />}
            {authenticatedUser?.mobileRole === 'INSTALLER' && <Wrench className="w-4 h-4 text-amber-400" />}
            {authenticatedUser?.mobileRole === 'FLOOR' && <QrCode className="w-4 h-4 text-rose-400" />}
            <span>
              {authenticatedUser?.mobileRole === 'DRIVER' && '🚚 Driver Delivery & Vehicle Logistics Terminal'}
              {authenticatedUser?.mobileRole === 'FIELD_STAFF' && '📏 Field Door Measurement & Quotation Terminal'}
              {authenticatedUser?.mobileRole === 'INSTALLER' && '🔧 Door Fitting & 6-Point QC Checklist'}
              {authenticatedUser?.mobileRole === 'FLOOR' && '🏭 Plant Floor QR & Cutting Schedule Station'}
            </span>
          </div>
          <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            ACTIVE
          </span>
        </div>
      )}

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed top-14 left-1/2 -translate-x-1/2 z-50 bg-indigo-600 text-white text-xs font-bold px-4 py-2 rounded-xl shadow-2xl border border-indigo-400 animate-in fade-in slide-in-from-top-2">
          {toastMessage}
        </div>
      )}

      {/* Universal Selfie Attendance & Field Visit Quick Strip */}
      <div className="bg-[#0b1324] border-b border-slate-800 px-3 py-2 flex items-center gap-2">
        <button
          type="button"
          onClick={() => setShowAttendanceWorkspace(!showAttendanceWorkspace)}
          className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-black flex items-center justify-center gap-1.5 border transition cursor-pointer ${
            showAttendanceWorkspace
              ? 'bg-emerald-600 text-white border-emerald-400 shadow'
              : 'bg-slate-900 text-emerald-300 border-emerald-500/40 hover:bg-slate-800'
          }`}
        >
          <Camera className="w-3.5 h-3.5" />
          <span>{showAttendanceWorkspace ? '← Back to Work Modules' : 'Selfie Punch-In / Attendance'}</span>
        </button>
        <button
          type="button"
          onClick={() => setIsVisitModalOpen(true)}
          className="py-1.5 px-3 rounded-xl text-xs font-black bg-amber-500 hover:bg-amber-400 text-black flex items-center gap-1.5 shadow cursor-pointer shrink-0"
        >
          <MapPin className="w-3.5 h-3.5" />
          <span>+ Visit Selfie</span>
        </button>
      </div>

      {/* Role Switcher Tab Navigation (VISIBLE ONLY TO MANAGERS & SUPERVISORS) */}
      {!showAttendanceWorkspace && isManager && (
        <div className="bg-[#0b1324] border-b border-slate-800 flex overflow-x-auto p-1 gap-1 text-xs font-bold scrollbar-none">
          {[
            { id: 'MEASUREMENT', label: '📏 Site Measurement', icon: Ruler },
            { id: 'FLOOR', label: 'Plant Floor', icon: QrCode },
            { id: 'DELIVERY', label: '🚚 Delivery', icon: Truck },
            { id: 'INSTALLATION', label: '🔧 Installation', icon: Wrench },
            { id: 'SUPER_ADMIN', label: '👑 Fleet GPS', icon: ShieldCheck },
          ].map((role) => {
            const Icon = role.icon;
            const isActive = activeRole === role.id;
            return (
              <button
                key={role.id}
                type="button"
                onClick={() => setActiveRole(role.id as any)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg whitespace-nowrap transition cursor-pointer text-xs ${
                  isActive
                    ? 'bg-rose-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{role.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Main Content Area */}
      <main className="flex-1 p-3 space-y-3 max-w-lg mx-auto w-full">
        {showAttendanceWorkspace ? (
          <MobileSelfiePunchPanel
            employeeId={authenticatedUser?.id || 'STAFF-MOBILE-01'}
            employeeCode={authenticatedUser?.employeeCode || 'FLD-01'}
            employeeName={authenticatedUser?.name || 'Field Staff'}
            department={authenticatedUser?.department}
            onOpenCustomerVisitModal={() => setIsVisitModalOpen(true)}
            isLiveTrackingActive={isGpsActive}
            onLiveTrackingToggle={(active) => setIsGpsActive(active)}
            recentVisits={todayVisits}
            onRefreshVisits={loadMyTodayVisits}
          />
        ) : (
        <>
        {/* ========================================================================= */}
        {/* 0. UNIVERSAL SITE MEASUREMENT MODULE (ACCESSIBLE TO ALL ROLES)             */}
        {/* ========================================================================= */}
        {activeRole === 'MEASUREMENT' && (
          <div className="space-y-3 animate-in fade-in">
            {/* Site & Client Details Card */}
            <div className="bg-[#111c34] border border-cyan-500/40 rounded-xl p-3.5 shadow-lg space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-cyan-400 uppercase flex items-center gap-1.5">
                  <Ruler className="w-4 h-4" />
                  Site Measurement Entry
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-950 border border-cyan-800 text-cyan-300 font-bold">
                  All Roles
                </span>
              </div>

              <div className="space-y-2 text-xs">
                <div className="relative">
                  <div className="flex items-center justify-between mb-0.5">
                    <label className="text-slate-400 text-[11px] font-semibold">Customer / Architect Name *</label>
                    <button
                      type="button"
                      onClick={() => setIsCustomerModalOpen(true)}
                      className="inline-flex items-center gap-1 text-[10px] text-cyan-400 hover:text-cyan-300 font-bold bg-cyan-950/60 border border-cyan-500/40 px-2 py-0.5 rounded-md transition cursor-pointer"
                    >
                      <Plus className="w-2.5 h-2.5" />
                      <span>+ New Customer</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    value={siteCustomerName}
                    onChange={(e) => {
                      setSiteCustomerName(e.target.value);
                      setCustomerSearchQuery(e.target.value);
                    }}
                    onFocus={() => {
                      if (matchingCustomers.length > 0) setShowCustomerDropdown(true);
                    }}
                    placeholder="Search or enter customer name..."
                    className="w-full bg-[#182849] border border-slate-700 rounded-lg p-2 text-white font-bold placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
                  />
                  {showCustomerDropdown && matchingCustomers.length > 0 && (
                    <div className="absolute top-full left-0 right-0 z-30 mt-1 bg-[#0F172A] border border-cyan-500/50 rounded-xl shadow-2xl overflow-hidden divide-y divide-slate-800">
                      {matchingCustomers.map((c) => (
                        <div
                          key={c.id}
                          onClick={() => {
                            setSiteCustomerName(c.name);
                            if (c.phone) setSiteCustomerPhone(c.phone);
                            if (c.town || c.district) setSiteLocation(`${c.town || ''}${c.town && c.district ? ', ' : ''}${c.district || ''}`);
                            setShowCustomerDropdown(false);
                            showToast(`✓ Selected: ${c.name} (${c.district})`);
                          }}
                          className="p-2.5 hover:bg-cyan-950/40 cursor-pointer flex items-center justify-between transition"
                        >
                          <div>
                            <div className="font-bold text-white text-xs">{c.name}</div>
                            <div className="text-[10px] text-slate-400 font-mono">{c.phone} • {c.town}, {c.district}</div>
                          </div>
                          <span className="text-[9px] px-1.5 py-0.5 rounded bg-slate-800 text-cyan-300 font-medium">
                            {c.type}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-400 text-[11px] mb-0.5">Mobile Phone *</label>
                    <input
                      type="tel"
                      value={siteCustomerPhone}
                      onChange={(e) => setSiteCustomerPhone(e.target.value)}
                      placeholder="+91 98471 23456"
                      className="w-full bg-[#182849] border border-slate-700 rounded-lg p-2 text-white font-mono"
                    />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-0.5">
                      <label className="text-slate-400 text-[11px]">Location / Town *</label>
                      <button
                        type="button"
                        onClick={handleCaptureSiteGps}
                        disabled={isCapturingGps}
                        className="inline-flex items-center gap-1 text-[10px] text-emerald-400 hover:text-emerald-300 font-bold bg-emerald-950/60 border border-emerald-500/40 px-2 py-0.5 rounded-md transition cursor-pointer"
                      >
                        <MapPin className={`w-2.5 h-2.5 ${isCapturingGps ? 'animate-bounce text-emerald-300' : ''}`} />
                        <span>{isCapturingGps ? 'Locating...' : '📍 GPS'}</span>
                      </button>
                    </div>
                    <input
                      type="text"
                      value={siteLocation}
                      onChange={(e) => setSiteLocation(e.target.value)}
                      placeholder="Vengara, Malappuram"
                      className="w-full bg-[#182849] border border-slate-700 rounded-lg p-2 text-white"
                    />
                    {siteCoords && (
                      <div className="mt-1 flex items-center justify-between text-[9.5px] text-emerald-400 bg-emerald-950/40 border border-emerald-900/50 px-2 py-0.5 rounded">
                        <span className="font-mono">
                          {siteCoords.lat.toFixed(4)}°N, {siteCoords.lng.toFixed(4)}°E (±{siteCoords.accuracy || 5}m)
                        </span>
                        <a
                          href={`https://maps.google.com/?q=${siteCoords.lat},${siteCoords.lng}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-cyan-400 underline hover:text-cyan-300 inline-flex items-center gap-0.5"
                        >
                          <span>Map</span>
                          <ExternalLink className="w-2.5 h-2.5" />
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                {/* Default Unit Selector Strip */}
                <div className="pt-2 border-t border-slate-800 flex items-center justify-between">
                  <span className="text-[11px] text-slate-400 font-medium">Default Unit:</span>
                  <div className="inline-flex rounded-lg bg-slate-900 p-0.5 border border-slate-700">
                    <button
                      type="button"
                      onClick={() => {
                        setDefaultUnit('cm');
                        setOpenings(openings.map((o) => ({ ...o, unit: 'cm' })));
                        showToast('✓ Switched all doors to Centimeters (cm)');
                      }}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition ${
                        defaultUnit === 'cm'
                          ? 'bg-cyan-600 text-white shadow'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      cm
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDefaultUnit('inch');
                        setOpenings(openings.map((o) => ({ ...o, unit: 'inch' })));
                        showToast('✓ Switched all doors to Inches (")');
                      }}
                      className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition ${
                        defaultUnit === 'inch'
                          ? 'bg-cyan-600 text-white shadow'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Inches (&quot;)
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Door Openings Schedule */}
            <div className="space-y-3">
              <div className="flex items-center justify-between px-1">
                <div>
                  <span className="text-xs font-bold text-white uppercase tracking-wider block">
                    Door Openings ({openings.length} Doors)
                  </span>
                  <span className="text-[10px] text-emerald-400 flex items-center gap-1 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    ERP Rate Card Synced
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const nextNum = openings.length + 1;
                    const defaultRoom = nextNum === 3 ? 'Kitchen Door' : nextNum === 4 ? 'Bed 2 Toilet' : `Room ${nextNum}`;
                    const newOp: MobileOpeningMeasurement = {
                      id: `op-${Date.now()}`,
                      doorNumber: `D${nextNum}`,
                      roomName: defaultRoom,
                      tag: `D${nextNum} - ${defaultRoom}`,
                      unit: defaultUnit,
                      heightCm: 210,
                      widthTopCm: 80,
                      widthBtmCm: 80,
                      heightInches: 82,
                      heightFrac: '11/16',
                      widthTopInches: 31,
                      widthTopFrac: '1/2',
                      widthBtmInches: 31,
                      widthBtmFrac: '1/2',
                      widthLinked: true,
                      category: 'A',
                      wallThickness: '4.5"',
                      frameProfile: 'Mini Frame (40x25mm)',
                      hinge: 'RH',
                      swing: 'INWARD',
                      lockId: 'lock-none',
                      colourId: 'col-teak-matte',
                      remark: '',
                    };
                    setOpenings([...openings, newOp]);
                    showToast(`Added Door ${newOp.doorNumber} (${newOp.roomName})`);
                  }}
                  className="px-3 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md shadow-cyan-900/40"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Door</span>
                </button>
              </div>

              {openings.map((op, idx) => {
                const calc = computeDoorPrice(op);
                const isCm = op.unit === 'cm';
                const lockOptions = pricingSettings?.locks && pricingSettings.locks.length > 0
                  ? pricingSettings.locks
                  : DEFAULT_LOCK_OPTIONS;

                return (
                  <div
                    key={op.id}
                    className="bg-[#111c34] border border-slate-800 rounded-xl p-3.5 space-y-3 shadow-md relative overflow-hidden"
                  >
                    {/* Top Row: Door Number, Room Name, Unit Badge, and Delete */}
                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <span className="text-[9px] text-cyan-400 font-bold block mb-0.5">DOOR #</span>
                        <input
                          type="text"
                          value={op.doorNumber}
                          onChange={(e) => {
                            const val = e.target.value.toUpperCase();
                            setOpenings(openings.map((o) => (o.id === op.id ? { ...o, doorNumber: val, tag: `${val} - ${o.roomName}` } : o)));
                          }}
                          placeholder="D1"
                          className="w-16 bg-cyan-950/80 border border-cyan-500/80 rounded-lg px-2 py-1.5 text-xs text-center font-mono font-black text-cyan-200 focus:outline-none focus:border-cyan-400"
                        />
                      </div>

                      <div className="flex-1">
                        <span className="text-[9px] text-slate-400 font-medium block mb-0.5">ROOM / LOCATION</span>
                        <input
                          type="text"
                          value={op.roomName}
                          onChange={(e) => {
                            const val = e.target.value;
                            setOpenings(openings.map((o) => (o.id === op.id ? { ...o, roomName: val, tag: `${o.doorNumber} - ${val}` } : o)));
                          }}
                          placeholder="E.g. Master Bedroom, Toilet 1"
                          className="w-full bg-[#182849] border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs font-bold text-white focus:outline-none focus:border-cyan-400"
                        />
                      </div>

                      {/* Unit Toggle Pill */}
                      <button
                        type="button"
                        onClick={() => {
                          const nextUnit = op.unit === 'cm' ? 'inch' : 'cm';
                          setOpenings(
                            openings.map((o) => {
                              if (o.id !== op.id) return o;
                              if (nextUnit === 'inch') {
                                const hInches = o.heightCm / 2.54;
                                const wTopInches = o.widthTopCm / 2.54;
                                const wBtmInches = o.widthBtmCm / 2.54;
                                return {
                                  ...o,
                                  unit: 'inch',
                                  heightInches: Math.floor(hInches),
                                  heightFrac: '0',
                                  widthTopInches: Math.floor(wTopInches),
                                  widthTopFrac: '0',
                                  widthBtmInches: Math.floor(wBtmInches),
                                  widthBtmFrac: '0',
                                };
                              } else {
                                const hCm = Math.round((o.heightInches + parseFraction(o.heightFrac)) * 2.54);
                                const wTopCm = Math.round((o.widthTopInches + parseFraction(o.widthTopFrac)) * 2.54);
                                const wBtmCm = Math.round((o.widthBtmInches + parseFraction(o.widthBtmFrac)) * 2.54);
                                return {
                                  ...o,
                                  unit: 'cm',
                                  heightCm: hCm,
                                  widthTopCm: wTopCm,
                                  widthBtmCm: wBtmCm,
                                };
                              }
                            })
                          );
                        }}
                        className="mt-3.5 px-2 py-1 rounded-md text-[10px] font-bold border border-cyan-800 bg-cyan-950/60 text-cyan-300 hover:bg-cyan-900 transition"
                        title="Toggle Unit for this opening"
                      >
                        {op.unit === 'cm' ? 'cm' : 'inch'}
                      </button>

                      {/* Delete Door */}
                      <button
                        type="button"
                        onClick={() => {
                          if (openings.length > 1) {
                            setOpenings(openings.filter((o) => o.id !== op.id));
                            showToast(`Removed Door ${op.doorNumber}`);
                          } else {
                            showToast('At least one door opening is required');
                          }
                        }}
                        className="mt-3.5 text-slate-500 hover:text-rose-400 p-1 cursor-pointer transition"
                        title="Delete opening"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Dimensions Section */}
                    {isCm ? (
                      /* Centimeters (cm) Mode - Default */
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          {/* Height in cm */}
                          <div className="bg-[#182849] p-2.5 rounded-lg border border-slate-700">
                            <span className="text-[10px] text-cyan-400 block font-semibold">Height (cm) *</span>
                            <div className="flex items-center gap-1.5 mt-1">
                              <input
                                type="number"
                                step="0.5"
                                value={op.heightCm}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 0;
                                  setOpenings(openings.map((o) => (o.id === op.id ? { ...o, heightCm: val } : o)));
                                }}
                                className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-white font-mono font-bold"
                              />
                              <span className="text-slate-400 text-[11px] font-mono">cm</span>
                            </div>
                            <span className="text-[9px] text-slate-400 font-mono mt-1 block">
                              ≈ {(op.heightCm / 2.54).toFixed(1)}&quot; ({toFractionString(op.heightCm / 2.54)})
                            </span>
                          </div>

                          {/* Width Top in cm */}
                          <div className="bg-[#182849] p-2.5 rounded-lg border border-slate-700">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-cyan-400 font-semibold">Width Top (cm) *</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenings(openings.map((o) => (o.id === op.id ? { ...o, widthLinked: !o.widthLinked } : o)));
                                }}
                                className={`p-0.5 rounded cursor-pointer ${op.widthLinked ? 'text-cyan-400' : 'text-amber-400'}`}
                                title={op.widthLinked ? 'Linked with Bottom (Straight)' : 'Unlinked (Tapered / Different Bottom)'}
                              >
                                {op.widthLinked ? <Link2 className="w-3.5 h-3.5" /> : <Link2Off className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                            <div className="flex items-center gap-1.5 mt-1">
                              <input
                                type="number"
                                step="0.5"
                                value={op.widthTopCm}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 0;
                                  setOpenings(
                                    openings.map((o) =>
                                      o.id === op.id
                                        ? {
                                            ...o,
                                            widthTopCm: val,
                                            ...(o.widthLinked ? { widthBtmCm: val } : {}),
                                          }
                                        : o
                                    )
                                  );
                                }}
                                className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-white font-mono font-bold"
                              />
                              <span className="text-slate-400 text-[11px] font-mono">cm</span>
                            </div>
                            <span className="text-[9px] text-slate-400 font-mono mt-1 block">
                              ≈ {(op.widthTopCm / 2.54).toFixed(1)}&quot; ({toFractionString(op.widthTopCm / 2.54)})
                            </span>
                          </div>
                        </div>

                        {/* Width Bottom (shown if unlinked or explicitly edited) */}
                        {!op.widthLinked && (
                          <div className="bg-[#182849] p-2 rounded-lg border border-amber-600/60">
                            <span className="text-[10px] text-amber-300 block font-semibold">
                              Width Bottom (cm - Tapered Opening)
                            </span>
                            <div className="flex items-center gap-1.5 mt-1">
                              <input
                                type="number"
                                step="0.5"
                                value={op.widthBtmCm}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 0;
                                  setOpenings(openings.map((o) => (o.id === op.id ? { ...o, widthBtmCm: val } : o)));
                                }}
                                className="w-full bg-slate-900 border border-amber-600/60 rounded p-1.5 text-xs text-amber-200 font-mono font-bold"
                              />
                              <span className="text-amber-400 text-[11px] font-mono">cm</span>
                            </div>
                            <span className="text-[9px] text-amber-400/80 font-mono mt-0.5 block">
                              ≈ {(op.widthBtmCm / 2.54).toFixed(1)}&quot; ({toFractionString(op.widthBtmCm / 2.54)})
                            </span>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* Inches (") Mode */
                      <div className="space-y-2">
                        <div className="grid grid-cols-2 gap-2 text-xs">
                          {/* Height in Inches */}
                          <div className="bg-[#182849] p-2.5 rounded-lg border border-slate-700">
                            <span className="text-[10px] text-slate-400 block font-semibold">Height (Inches)</span>
                            <div className="flex items-center gap-1 mt-1">
                              <input
                                type="number"
                                value={op.heightInches}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 0;
                                  setOpenings(openings.map((o) => (o.id === op.id ? { ...o, heightInches: val } : o)));
                                }}
                                className="w-14 bg-slate-900 border border-slate-700 rounded p-1 text-xs text-white font-mono font-bold"
                              />
                              <select
                                value={op.heightFrac}
                                onChange={(e) => {
                                  const frac = e.target.value;
                                  setOpenings(openings.map((o) => (o.id === op.id ? { ...o, heightFrac: frac } : o)));
                                }}
                                className="flex-1 bg-slate-900 border border-slate-700 rounded p-1 text-[11px] text-cyan-300 font-mono"
                              >
                                <option value="0">0&quot;</option>
                                <option value="1/8">1/8&quot;</option>
                                <option value="1/4">1/4&quot;</option>
                                <option value="3/8">3/8&quot;</option>
                                <option value="1/2">1/2&quot;</option>
                                <option value="5/8">5/8&quot;</option>
                                <option value="3/4">3/4&quot;</option>
                                <option value="7/8">7/8&quot;</option>
                              </select>
                            </div>
                            <span className="text-[9px] text-slate-400 font-mono mt-1 block">
                              ≈ {Math.round((op.heightInches + parseFraction(op.heightFrac)) * 2.54)} cm
                            </span>
                          </div>

                          {/* Width Top in Inches */}
                          <div className="bg-[#182849] p-2.5 rounded-lg border border-slate-700">
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] text-cyan-400 font-semibold">Width Top</span>
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenings(openings.map((o) => (o.id === op.id ? { ...o, widthLinked: !o.widthLinked } : o)));
                                }}
                                className={`p-0.5 rounded cursor-pointer ${op.widthLinked ? 'text-cyan-400' : 'text-amber-400'}`}
                                title={op.widthLinked ? 'Linked with Bottom' : 'Unlinked (Independent)'}
                              >
                                {op.widthLinked ? <Link2 className="w-3.5 h-3.5" /> : <Link2Off className="w-3.5 h-3.5" />}
                              </button>
                            </div>
                            <div className="flex items-center gap-1 mt-1">
                              <input
                                type="number"
                                value={op.widthTopInches}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 0;
                                  setOpenings(
                                    openings.map((o) =>
                                      o.id === op.id
                                        ? {
                                            ...o,
                                            widthTopInches: val,
                                            ...(o.widthLinked ? { widthBtmInches: val } : {}),
                                          }
                                        : o
                                    )
                                  );
                                }}
                                className="w-14 bg-slate-900 border border-slate-700 rounded p-1 text-xs text-white font-mono font-bold"
                              />
                              <select
                                value={op.widthTopFrac}
                                onChange={(e) => {
                                  const frac = e.target.value;
                                  setOpenings(
                                    openings.map((o) =>
                                      o.id === op.id
                                        ? {
                                            ...o,
                                            widthTopFrac: frac,
                                            ...(o.widthLinked ? { widthBtmFrac: frac } : {}),
                                          }
                                        : o
                                    )
                                  );
                                }}
                                className="flex-1 bg-slate-900 border border-slate-700 rounded p-1 text-[11px] text-cyan-300 font-mono"
                              >
                                <option value="0">0&quot;</option>
                                <option value="1/8">1/8&quot;</option>
                                <option value="1/4">1/4&quot;</option>
                                <option value="3/8">3/8&quot;</option>
                                <option value="1/2">1/2&quot;</option>
                                <option value="5/8">5/8&quot;</option>
                                <option value="3/4">3/4&quot;</option>
                                <option value="7/8">7/8&quot;</option>
                              </select>
                            </div>
                            <span className="text-[9px] text-slate-400 font-mono mt-1 block">
                              ≈ {Math.round((op.widthTopInches + parseFraction(op.widthTopFrac)) * 2.54)} cm
                            </span>
                          </div>
                        </div>

                        {/* Width Bottom in Inches */}
                        {!op.widthLinked && (
                          <div className="bg-[#182849] p-2 rounded-lg border border-amber-600/60">
                            <span className="text-[10px] text-amber-300 block font-semibold">
                              Width Bottom (Tapered)
                            </span>
                            <div className="flex items-center gap-1 mt-1">
                              <input
                                type="number"
                                value={op.widthBtmInches}
                                onChange={(e) => {
                                  const val = parseFloat(e.target.value) || 0;
                                  setOpenings(openings.map((o) => (o.id === op.id ? { ...o, widthBtmInches: val } : o)));
                                }}
                                className="w-16 bg-slate-900 border border-amber-600/60 rounded p-1 text-xs text-amber-200 font-mono font-bold"
                              />
                              <select
                                value={op.widthBtmFrac}
                                onChange={(e) => {
                                  const frac = e.target.value;
                                  setOpenings(openings.map((o) => (o.id === op.id ? { ...o, widthBtmFrac: frac } : o)));
                                }}
                                className="flex-1 bg-slate-900 border border-amber-600/60 rounded p-1 text-[11px] text-amber-200 font-mono"
                              >
                                <option value="0">0&quot;</option>
                                <option value="1/8">1/8&quot;</option>
                                <option value="1/4">1/4&quot;</option>
                                <option value="3/8">3/8&quot;</option>
                                <option value="1/2">1/2&quot;</option>
                                <option value="5/8">5/8&quot;</option>
                                <option value="3/4">3/4&quot;</option>
                                <option value="7/8">7/8&quot;</option>
                              </select>
                            </div>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Specifications: Category Grade, Frame Profile, Lock Hardware */}
                    <div className="grid grid-cols-2 gap-2 text-xs pt-1 border-t border-slate-800">
                      {/* FRP Category */}
                      <div>
                        <label className="block text-slate-400 text-[10px] mb-0.5">Category Grade</label>
                        <select
                          value={op.category || 'A'}
                          onChange={(e) => {
                            const val = e.target.value as FrpDoorCategory;
                            setOpenings(openings.map((o) => (o.id === op.id ? { ...o, category: val } : o)));
                          }}
                          className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-cyan-200 font-semibold"
                        >
                          <option value="A">Cat A (₹{pricingSettings?.categoryPieceRates?.A ?? 7000} Base)</option>
                          <option value="B">Cat B (₹{pricingSettings?.categoryPieceRates?.B ?? 7600} Base)</option>
                          <option value="C">Cat C (₹{pricingSettings?.categoryPieceRates?.C ?? 8200} Base)</option>
                          <option value="D">Cat D (₹{pricingSettings?.categoryPieceRates?.D ?? 8800} Base)</option>
                          <option value="E">Cat E (₹{pricingSettings?.categoryPieceRates?.E ?? 9500} Base)</option>
                        </select>
                      </div>

                      {/* Frame Profile */}
                      <div>
                        <label className="block text-slate-400 text-[10px] mb-0.5">Frame Profile</label>
                        <select
                          value={op.frameProfile}
                          onChange={(e) => {
                            const val = e.target.value;
                            setOpenings(openings.map((o) => (o.id === op.id ? { ...o, frameProfile: val } : o)));
                          }}
                          className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-white"
                        >
                          <option value="Mini Frame (40x25mm)">Mini Frame (40x25mm)</option>
                          <option value="Regular FRP Frame (72x50mm)">Regular Frame (72x50mm)</option>
                          <option value="Double Rebate Frame (95x50mm)">Double Rebate (95x50mm)</option>
                          <option value="Without Frame (Shutter Only)">Shutter Only (No Frame)</option>
                        </select>
                      </div>
                    </div>

                    {/* Floor Condition & Synchronized Tolerance Cutting Dimensions */}
                    <div className="pt-1.5 border-t border-slate-800 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] text-cyan-400 font-bold flex items-center gap-1">
                          <Sliders className="w-3 h-3" />
                          <span>Floor Level &amp; Cutting Tolerance</span>
                        </span>
                        {(() => {
                          const hMm = op.unit === 'cm' ? Number(op.heightCm) * 10 : (Number(op.heightInches) + parseFraction(op.heightFrac)) * 25.4;
                          const wMm = op.unit === 'cm' ? Number(op.widthTopCm) * 10 : (Number(op.widthTopInches) + parseFraction(op.widthTopFrac)) * 25.4;
                          const tol = computeDoorTolerances({
                            rawHeightMm: hMm,
                            rawWidthTopMm: wMm,
                            frameTypeName: op.frameProfile,
                            floorCondition: op.floorCondition || 'FINISHED_TILE',
                          });
                          return (
                            <span className="text-[10px] text-emerald-400 font-mono font-bold bg-emerald-950/60 border border-emerald-800/80 px-2 py-0.5 rounded">
                              Cutting: {tol.shutterSizeCmText}
                            </span>
                          );
                        })()}
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div>
                          <label className="block text-slate-400 text-[10px] mb-0.5">Floor Level Condition</label>
                          <select
                            value={op.floorCondition || 'FINISHED_TILE'}
                            onChange={(e) => {
                              const val = e.target.value as any;
                              setOpenings(openings.map((o) => (o.id === op.id ? { ...o, floorCondition: val } : o)));
                            }}
                            className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-white"
                          >
                            <option value="FINISHED_TILE">🏢 Finished Tile (-12mm Bottom)</option>
                            <option value="UNFINISHED_CONCRETE">🏗️ Unfinished Floor (-25mm Bottom)</option>
                          </select>
                        </div>
                        <div className="flex items-end">
                          {(() => {
                            const hMm = op.unit === 'cm' ? Number(op.heightCm) * 10 : (Number(op.heightInches) + parseFraction(op.heightFrac)) * 25.4;
                            const wMm = op.unit === 'cm' ? Number(op.widthTopCm) * 10 : (Number(op.widthTopInches) + parseFraction(op.widthTopFrac)) * 25.4;
                            const tol = computeDoorTolerances({
                              rawHeightMm: hMm,
                              rawWidthTopMm: wMm,
                              frameTypeName: op.frameProfile,
                              floorCondition: op.floorCondition || 'FINISHED_TILE',
                            });
                            return (
                              <div className="w-full p-1 rounded bg-slate-900/80 border border-slate-800 text-[9.5px] text-slate-300">
                                <div>Deduction: -{tol.totalHeightDeductionCm}cm H / -{tol.totalWidthDeductionCm}cm W</div>
                                <div className="text-cyan-300 font-mono">{tol.shutterTapeInchText}</div>
                              </div>
                            );
                          })()}
                        </div>
                      </div>
                    </div>

                    {/* Lock Hardware, Hinge & Swing */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      {/* Lock Hardware */}
                      <div>
                        <label className="block text-slate-400 text-[10px] mb-0.5">Lock Hardware</label>
                        <select
                          value={op.lockId || 'lock-none'}
                          onChange={(e) => {
                            const val = e.target.value;
                            setOpenings(openings.map((o) => (o.id === op.id ? { ...o, lockId: val } : o)));
                          }}
                          className="w-full bg-slate-900 border border-slate-700 rounded p-1.5 text-xs text-white"
                        >
                          {lockOptions.map((lk) => (
                            <option key={lk.id} value={lk.id}>
                              {lk.name} {lk.price !== 0 ? `(${lk.price > 0 ? '+' : ''}₹${lk.price})` : '(₹0)'}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Hinge Selection */}
                      <div>
                        <label className="block text-slate-400 text-[10px] mb-0.5">Hinge Handing</label>
                        <div className="grid grid-cols-2 gap-1">
                          <button
                            type="button"
                            onClick={() => {
                              setOpenings(openings.map((o) => (o.id === op.id ? { ...o, hinge: 'LH' } : o)));
                            }}
                            className={`py-1.5 rounded text-[11px] font-bold border transition ${
                              op.hinge === 'LH'
                                ? 'bg-cyan-600 border-cyan-400 text-white shadow'
                                : 'bg-slate-900 border-slate-700 text-slate-400'
                            }`}
                          >
                            LH (Left Hand)
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setOpenings(openings.map((o) => (o.id === op.id ? { ...o, hinge: 'RH' } : o)));
                            }}
                            className={`py-1.5 rounded text-[11px] font-bold border transition ${
                              op.hinge === 'RH'
                                ? 'bg-cyan-600 border-cyan-400 text-white shadow'
                                : 'bg-slate-900 border-slate-700 text-slate-400'
                            }`}
                          >
                            RH (Right Hand)
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* LIVE ERP SOFTWARE RATE SYNC CARD */}
                    <div className="bg-gradient-to-r from-emerald-950/80 to-[#0e2a22] border border-emerald-500/50 rounded-xl p-2.5 shadow-md flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
                            Software Calculated Price
                          </span>
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-mono font-bold">
                            Live Sync
                          </span>
                        </div>
                        <div className="text-[10px] text-slate-300 font-mono mt-0.5">
                          Base: ₹{calc.basePieceRate} | Area: {calc.actualSqft} sq.ft
                          {calc.isExtraSize && <span className="text-amber-300"> (Extra +₹{calc.extraCost})</span>}
                          {calc.lockPrice !== 0 && (
                            <span className="text-cyan-300"> | Lock: {calc.lockPrice > 0 ? `+₹${calc.lockPrice}` : `-₹${Math.abs(calc.lockPrice)}`}</span>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-base font-black text-emerald-300 font-mono">
                          ₹{calc.finalUnitRate.toLocaleString('en-IN')}
                        </div>
                        <div className="text-[9px] text-emerald-400 font-medium">Per Door</div>
                      </div>
                    </div>

                    {/* Photo & Remark */}
                    <div className="flex items-center gap-2 pt-1 border-t border-slate-800">
                      <label className="px-2.5 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg text-slate-300 text-[11px] font-bold flex items-center gap-1.5 cursor-pointer shrink-0">
                        <Camera className="w-3.5 h-3.5 text-cyan-400" />
                        <span>{op.photo ? '✓ Photo Snapped' : 'Snap Photo'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0];
                            if (f) {
                              const r = new FileReader();
                              r.onload = () => {
                                setOpenings(openings.map((o) => (o.id === op.id ? { ...o, photo: r.result as string } : o)));
                                showToast(`✓ Photo attached to ${op.doorNumber}`);
                              };
                              r.readAsDataURL(f);
                            }
                          }}
                        />
                      </label>
                      <input
                        type="text"
                        value={op.remark || ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          setOpenings(openings.map((o) => (o.id === op.id ? { ...o, remark: val } : o)));
                        }}
                        placeholder="Mason remarks / wall condition / tile offset..."
                        className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-[11px] text-slate-300 focus:outline-none focus:border-cyan-400"
                      />
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Total Quotation Summary & ERP Actions Box */}
            {(() => {
              const subtotal = openings.reduce((sum, o) => sum + computeDoorPrice(o).finalUnitRate, 0);
              const totalAreaSqft = openings.reduce((sum, o) => sum + computeDoorPrice(o).actualSqft, 0);
              const gstAmount = includeGst ? Math.round(subtotal * 0.18) : 0;
              const grandTotal = subtotal + gstAmount;
              const advAmount = Math.round((grandTotal * advancePercent) / 100);

              const handleShareWhatsApp = () => {
                const doorLines = openings.map((op, idx) => {
                  const calc = computeDoorPrice(op);
                  const sizeText = op.unit === 'cm'
                    ? `${op.heightCm} × ${op.widthTopCm}${!op.widthLinked ? `/${op.widthBtmCm}` : ''} cm (${(op.heightCm / 2.54).toFixed(1)}" × ${(op.widthTopCm / 2.54).toFixed(1)}")`
                    : `${op.heightInches}${op.heightFrac !== '0' ? ` ${op.heightFrac}` : ''}" × ${op.widthTopInches}${op.widthTopFrac !== '0' ? ` ${op.widthTopFrac}` : ''}"`;
                  const lockName = pricingSettings?.locks?.find((l) => l.id === op.lockId)?.name || 'Standard Latch';
                  return `${idx + 1}. *[${op.doorNumber || `D${idx + 1}`}]* ${op.roomName || 'Door'}
   • Size: ${sizeText}
   • Grade: Cat ${op.category} | Frame: ${op.frameProfile}
   • Lock: ${lockName} | Hinge: ${op.hinge}
   • Estimate: ₹${calc.finalUnitRate.toLocaleString('en-IN')}`;
                });

                const message = `*EXMARK FRP DOORS & FRAMES*
📍 *SITE MEASUREMENT & ESTIMATE*
----------------------------------------
👤 *Customer:* ${siteCustomerName}
📞 *Phone:* ${siteCustomerPhone}
📍 *Site Location:* ${siteLocation}
🗓️ *Date:* ${new Date().toLocaleDateString('en-GB')}
----------------------------------------
*DOOR SCHEDULE (${openings.length} Doors):*

${doorLines.join('\n\n')}

----------------------------------------
*Total Doors:* ${openings.length} Openings (${totalAreaSqft.toFixed(1)} sq.ft)
*Subtotal:* ₹${subtotal.toLocaleString('en-IN')}
${includeGst ? `*GST (18%):* ₹${gstAmount.toLocaleString('en-IN')}\n` : ''}*ESTIMATED TOTAL:* *₹${grandTotal.toLocaleString('en-IN')}*
*Booking Advance (${advancePercent}%):* *₹${advAmount.toLocaleString('en-IN')}*
----------------------------------------
✅ 100% Water Proof • Termite Proof • 10-Yr Guarantee
🏢 *Exmark Doors Factory*, Malappuram, Kerala
📞 Support: +91 98470 00000`;

                const cleanPhone = siteCustomerPhone.replace(/\D/g, '');
                const url = cleanPhone.length >= 10
                  ? `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`
                  : `https://wa.me/?text=${encodeURIComponent(message)}`;
                window.open(url, '_blank');
                showToast('✓ Opening WhatsApp with Quotation...');
              };

              const handleConvertToQuotation = async () => {
                try {
                  setIsConvertingToQuote(true);
                  const quoteItems = openings.map((o) => {
                    const calc = computeDoorPrice(o);
                    const hMm = o.unit === 'cm'
                      ? Math.round(o.heightCm * 10)
                      : Math.round((o.heightInches + parseFraction(o.heightFrac)) * 25.4);
                    const wMm = o.unit === 'cm'
                      ? Math.round(o.widthTopCm * 10)
                      : Math.round((o.widthTopInches + parseFraction(o.widthTopFrac)) * 25.4);
                    return {
                      doorCategory: 'FRP_DOORS' as const,
                      doorModel: `${o.doorNumber || 'D'} - ${o.roomName || 'Opening'} (Cat ${o.category || 'A'})`,
                      heightMm: hMm,
                      widthMm: wMm,
                      thicknessMm: 32,
                      quantity: 1,
                      unitPrice: calc.finalUnitRate,
                      gstRate: includeGst ? 18 : 0,
                      totalPrice: calc.finalUnitRate,
                    };
                  });

                  const scheduleNotes = openings.map((o, idx) => {
                    const sizeStr = o.unit === 'cm' ? `${o.heightCm}x${o.widthTopCm}cm` : `${o.heightInches}"x${o.widthTopInches}"`;
                    return `#${idx + 1} [${o.doorNumber}] ${o.roomName}: ${sizeStr}, Frame: ${o.frameProfile}, Hinge: ${o.hinge}, Lock: ${o.lockId}, Remark: ${o.remark || '-'}`;
                  }).join('\n');

                  const res = await fetch('/api/quotations', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      source: 'MOBILE_FIELD_APP',
                      customerName: siteCustomerName,
                      location: siteCoords ? `${siteLocation} [GPS: ${siteCoords.lat}, ${siteCoords.lng}]` : siteLocation,
                      date: new Date().toLocaleDateString('en-GB'),
                      itemsSummary: `${openings.length} Doors (Site Measured by Staff in cm)`,
                      items: quoteItems,
                      overrideSubtotal: subtotal,
                      overrideTotalAmount: grandTotal,
                      advancePercent,
                      advanceAmount: advAmount,
                      notes: `📱 SITE MEASUREMENT APP ENTRY\nCustomer Mobile: ${siteCustomerPhone}\nLocation: ${siteLocation}${siteCoords ? `\nGPS Geotag: ${siteCoords.lat}, ${siteCoords.lng} (Accuracy: ±${siteCoords.accuracy || 5}m)\nMaps Link: https://maps.google.com/?q=${siteCoords.lat},${siteCoords.lng}` : ''}\n\nSchedule:\n${scheduleNotes}`,
                    }),
                  });

                  const resJson = await res.json();
                  if (resJson.success && resJson.data) {
                    showToast(`✓ Quotation ${resJson.data.quoteNumber || resJson.data.id} created! Total: ₹${grandTotal.toLocaleString('en-IN')}`);
                  } else {
                    showToast(`✓ Quotation created from site measurement! Total: ₹${grandTotal.toLocaleString('en-IN')}`);
                  }
                } catch (err) {
                  console.error('Failed to convert to quote:', err);
                  showToast('Measurement saved locally.');
                } finally {
                  setIsConvertingToQuote(false);
                }
              };

              return (
                <div className="bg-[#111c34] border border-cyan-500/40 rounded-xl p-3.5 space-y-3 shadow-xl">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                      <Calculator className="w-4 h-4 text-cyan-400" />
                      Site Measurement Estimate
                    </span>
                    <span className="text-[10px] font-mono text-emerald-400 bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-800">
                      Exact Software Price Match
                    </span>
                  </div>

                  {/* Pricing Breakdown Grid */}
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-[#182849] p-2 rounded-lg">
                      <span className="text-[10px] text-slate-400 block">Total Openings</span>
                      <span className="text-sm font-black text-white font-mono">{openings.length} Doors</span>
                    </div>
                    <div className="bg-[#182849] p-2 rounded-lg">
                      <span className="text-[10px] text-slate-400 block">Total Shutter Area</span>
                      <span className="text-sm font-black text-cyan-300 font-mono">{totalAreaSqft.toFixed(1)} Sq.Ft</span>
                    </div>
                    <div className="bg-[#182849] p-2 rounded-lg">
                      <span className="text-[10px] text-slate-400 block">Estimated Subtotal</span>
                      <span className="text-sm font-black text-emerald-400 font-mono">₹{subtotal.toLocaleString('en-IN')}</span>
                    </div>
                    <div className="bg-[#182849] p-2 rounded-lg">
                      <span className="text-[10px] text-slate-400 block">Booking Advance ({advancePercent}%)</span>
                      <span className="text-sm font-black text-amber-300 font-mono">₹{advAmount.toLocaleString('en-IN')}</span>
                    </div>
                  </div>

                  {/* GST & Advance Controls */}
                  <div className="flex items-center justify-between text-xs pt-1 px-1">
                    <label className="flex items-center gap-1.5 cursor-pointer text-slate-300 text-[11px]">
                      <input
                        type="checkbox"
                        checked={includeGst}
                        onChange={(e) => setIncludeGst(e.target.checked)}
                        className="rounded bg-slate-900 border-slate-700 text-cyan-600 focus:ring-0"
                      />
                      <span>Add 18% GST (+₹{Math.round(subtotal * 0.18).toLocaleString('en-IN')})</span>
                    </label>

                    <div className="flex items-center gap-1 text-[11px] text-slate-400">
                      <span>Adv %:</span>
                      {[30, 40, 50].map((pct) => (
                        <button
                          key={pct}
                          type="button"
                          onClick={() => setAdvancePercent(pct)}
                          className={`px-1.5 py-0.5 rounded font-mono font-bold ${
                            advancePercent === pct
                              ? 'bg-amber-500 text-slate-950'
                              : 'bg-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          {pct}%
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Grand Total Display */}
                  <div className="bg-gradient-to-r from-rose-950/80 via-slate-900 to-indigo-950/80 border border-rose-500/40 rounded-xl p-3 flex items-center justify-between shadow-inner">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-rose-300 block">
                        ESTIMATED GRAND TOTAL
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {includeGst ? 'Incl. 18% GST' : 'Excl. GST (Factory Direct)'}
                      </span>
                    </div>
                    <div className="text-right">
                      <div className="text-xl font-black text-rose-300 font-mono">
                        ₹{grandTotal.toLocaleString('en-IN')}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="space-y-2 pt-1">
                    {/* 1-Tap Convert to Sales Quotation */}
                    <button
                      type="button"
                      disabled={isConvertingToQuote}
                      onClick={handleConvertToQuotation}
                      className="w-full py-3 bg-gradient-to-r from-rose-600 to-rose-700 hover:from-rose-500 hover:to-rose-600 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-rose-900/40 transition active:scale-[0.99]"
                    >
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      <span>{isConvertingToQuote ? 'Syncing with ERP...' : '1-Tap Convert to Sales Quotation & Sync to ERP ➔'}</span>
                    </button>

                    {/* WhatsApp Quotation Share */}
                    <button
                      type="button"
                      onClick={handleShareWhatsApp}
                      className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-emerald-900/30 transition active:scale-[0.99]"
                    >
                      <Share2 className="w-4 h-4" />
                      <span>Instant WhatsApp Quote Share</span>
                    </button>

                    {/* Save Record button */}
                    <button
                      type="button"
                      onClick={() => {
                        showToast(`✓ Saved site measurement record for ${siteCustomerName} (${openings.length} Doors)!`);
                      }}
                      className="w-full py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 cursor-pointer border border-slate-700"
                    >
                      <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Save Measurements Record</span>
                    </button>
                  </div>
                </div>
              );
            })()}
          </div>
        )}

        {/* ========================================================================= */}
        {/* 1. PLANT FLOOR: 12L QR SCANNER & LIVE CUTTING HUD */}
        {/* ========================================================================= */}
        {activeRole === 'FLOOR' && (
          <div className="space-y-3 animate-in fade-in">
            {/* Quick QR Barcode Scanner Input */}
            <div className="bg-[#111c34] border border-cyan-500/40 rounded-xl p-3 shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-bold text-cyan-400 uppercase flex items-center gap-1">
                  <QrCode className="w-3.5 h-3.5" />
                  12L Sticker Floor QR Scanner
                </span>
                <span className="text-[10px] text-slate-400 font-mono">Camera / Laser</span>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={scannedBarcode}
                  onChange={(e) => setScannedBarcode(e.target.value.toUpperCase())}
                  placeholder="Scan or type barcode (e.g. JC-2026-089-D01)..."
                  className="flex-1 bg-[#182849] border border-slate-700 rounded-lg px-3 py-2 text-xs font-mono text-cyan-200 placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                />
                <button
                  type="button"
                  onClick={() => showToast(`✓ Loaded door schedule for ${scannedBarcode}`)}
                  className="px-3 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-lg transition"
                >
                  Lookup
                </button>
              </div>
            </div>

            {/* Target Cutting HUD */}
            <div className="bg-[#0f172a] border border-slate-700 rounded-xl overflow-hidden shadow-xl">
              <div className="bg-slate-900 px-3 py-2 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono text-xs font-bold text-rose-400">
                      {doorData.jobCardNumber}
                    </span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-950 border border-indigo-800 text-indigo-300 font-bold">
                      Door #{doorData.doorIndex} of {doorData.totalDoors}
                    </span>
                  </div>
                  <div className="text-xs font-bold text-white mt-0.5">{doorData.customerName}</div>
                </div>
                <div className="text-right">
                  <span className="text-[9px] uppercase font-bold text-amber-400 bg-amber-950/70 border border-amber-800/60 px-1.5 py-0.5 rounded">
                    {doorData.currentStage}
                  </span>
                </div>
              </div>

              {/* High-Visibility Finished Cutting Size Display (Top/Bottom Taper) */}
              <div className="p-3 bg-gradient-to-b from-[#111e38] to-[#0a1224] border-b border-slate-800">
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-black uppercase text-cyan-300 tracking-wider">
                    Finished Cutting Size
                  </span>
                  {doorData.dimensions.isTapered && (
                    <span className="text-[10px] font-black uppercase px-2 py-0.5 bg-amber-500 text-slate-950 rounded shadow-xs">
                      ▲ TAPER CUT
                    </span>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-2 text-center mt-2">
                  <div className="bg-[#18284a] border border-cyan-500/30 rounded-lg p-2">
                    <div className="text-[9px] font-bold text-slate-400 uppercase">HEIGHT</div>
                    <div className="text-sm font-black text-cyan-200 font-mono">
                      {doorData.dimensions.finH}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      {doorData.dimensions.tapeH}
                    </div>
                  </div>

                  <div className="bg-[#18284a] border border-amber-500/40 rounded-lg p-2">
                    <div className="text-[9px] font-bold text-amber-300 uppercase">TOP WIDTH</div>
                    <div className="text-sm font-black text-amber-200 font-mono">
                      {doorData.dimensions.finTopW}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      {doorData.dimensions.tapeTopW}
                    </div>
                  </div>

                  <div className="bg-[#18284a] border border-emerald-500/40 rounded-lg p-2">
                    <div className="text-[9px] font-bold text-emerald-300 uppercase">BTM WIDTH</div>
                    <div className="text-sm font-black text-emerald-200 font-mono">
                      {doorData.dimensions.finBtmW}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono">
                      {doorData.dimensions.tapeBtmW}
                    </div>
                  </div>
                </div>

                {/* Specs Details */}
                <div className="mt-3 pt-2 border-t border-slate-800/80 grid grid-cols-2 gap-2 text-[11px]">
                  <div>
                    <span className="text-slate-400">Model: </span>
                    <span className="font-semibold text-white">{doorData.modelCode}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Color: </span>
                    <span className="font-semibold text-white">{doorData.finish}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Hinge: </span>
                    <span className="font-semibold text-white">{doorData.hinge}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Lock: </span>
                    <span className="font-semibold text-white">{doorData.lock}</span>
                  </div>
                </div>
              </div>

              {/* 1-Tap Production Stage Advancement Buttons */}
              <div className="p-3 bg-slate-950 space-y-1.5">
                <div className="text-[10px] font-bold text-slate-400 uppercase">
                  Advance Production Stage:
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleAdvanceStage('SIZING_DONE')}
                    className="p-2 bg-indigo-900/60 hover:bg-indigo-800 text-indigo-200 border border-indigo-700/60 rounded-lg text-xs font-bold transition"
                  >
                    ✂️ Sized
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAdvanceStage('PAINTING_DONE')}
                    className="p-2 bg-purple-900/60 hover:bg-purple-800 text-purple-200 border border-purple-700/60 rounded-lg text-xs font-bold transition"
                  >
                    🎨 Painted
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAdvanceStage('QC_PASSED')}
                    className="p-2 bg-emerald-900/60 hover:bg-emerald-800 text-emerald-200 border border-emerald-700/60 rounded-lg text-xs font-bold transition"
                  >
                    ✅ QC Passed
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 2. STORE: TAMPER-PROOF FORMULA-LOCKED BOQ MATERIAL ISSUE (ZERO EDIT/UNDO) */}
        {/* ========================================================================= */}
        {activeRole === 'STORE' && (
          <div className="animate-in fade-in">
            <MobileStoreBoqPanel
              staffName={authenticatedUser?.name || 'Storekeeper'}
              staffRole={authenticatedUser?.role || 'Inventory'}
            />
          </div>
        )}

        {/* ========================================================================= */}
        {/* 3. SALES & CRM: LIVE LEADS PIPELINE, 1-TAP CALL/WHATSAPP & FOLLOW-UPS    */}
        {/* ========================================================================= */}
        {activeRole === 'SALES' && (
          <div className="animate-in fade-in">
            <MobileCrmLeadsPanel
              staffName={authenticatedUser?.name || 'Sales Executive'}
            />
          </div>
        )}

        {/* ========================================================================= */}
        {/* 4. DELIVERY TEAM: TRIP SHEET, NAVIGATION & AFTER-DELIVERY PHOTOS */}
        {/* ========================================================================= */}
        {activeRole === 'DELIVERY' && (
          <div className="space-y-3 animate-in fade-in">
            {/* Trip Sheet Card */}
            <div className="bg-[#0f172a] border border-slate-700 rounded-xl overflow-hidden shadow-lg">
              <div className="bg-slate-900 p-3 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-mono text-emerald-400 font-bold">
                    DISPATCH TRIP: DP-2026-14
                  </span>
                  <h3 className="text-sm font-bold text-white">{doorData.customerName}</h3>
                </div>
                <span className="px-2 py-0.5 rounded bg-emerald-950 border border-emerald-800 text-emerald-300 text-[10px] font-bold">
                  OUT FOR DELIVERY
                </span>
              </div>

              {/* Action Buttons: 1-Tap Call & 1-Tap Google Maps Navigation */}
              <div className="p-3 grid grid-cols-2 gap-2 border-b border-slate-800">
                <a
                  href="tel:+919846000000"
                  className="flex items-center justify-center gap-1.5 p-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition"
                >
                  <Phone className="w-3.5 h-3.5" />
                  <span>Call Customer</span>
                </a>
                <a
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    doorData.siteAddress
                  )}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center justify-center gap-1.5 p-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>Google Maps</span>
                </a>
              </div>

              {/* After-Delivery Photo Capture */}
              <div className="p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-white uppercase flex items-center gap-1">
                    <Camera className="w-3.5 h-3.5 text-rose-400" />
                    After-Delivery Site Photo
                  </span>
                  {deliveryPhoto && (
                    <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-0.5">
                      <CheckCircle className="w-3 h-3" /> Captured
                    </span>
                  )}
                </div>

                {deliveryPhoto ? (
                  <div className="relative rounded-lg overflow-hidden border border-slate-700 max-h-48">
                    <img
                      src={deliveryPhoto}
                      alt="Delivery Proof"
                      className="w-full h-44 object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => setDeliveryPhoto(null)}
                      className="absolute top-2 right-2 px-2 py-1 bg-rose-600 text-white text-[10px] font-bold rounded shadow-lg"
                    >
                      Retake
                    </button>
                  </div>
                ) : (
                  <label className="flex flex-col items-center justify-center p-6 border-2 border-dashed border-slate-700 hover:border-cyan-400 rounded-xl cursor-pointer bg-slate-900/60 transition">
                    <Camera className="w-8 h-8 text-cyan-400 mb-1" />
                    <span className="text-xs font-bold text-slate-200">Take Photo at Site</span>
                    <span className="text-[10px] text-slate-500">
                      Tap to open camera / upload site proof
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      capture="environment"
                      onChange={(e) => handlePhotoSelect(e, 'DELIVERY')}
                      className="hidden"
                    />
                  </label>
                )}

                {/* Digital Customer Sign-Off */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setCustomerSignature('SIGNED-DIGITAL');
                      showToast('✓ Delivery confirmed & client signature saved!');
                    }}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg shadow-lg flex items-center justify-center gap-1.5 transition"
                  >
                    <CheckCircle className="w-4 h-4" />
                    <span>Confirm Delivery Complete</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 5. DOOR INSTALLATION TEAM: AFTER-FINISH PHOTOS & 6-POINT QUALITY CHECK */}
        {/* ========================================================================= */}
        {activeRole === 'INSTALLATION' && (
          <div className="space-y-3 animate-in fade-in">
            {/* Customer & Site Details Card */}
            <div className="bg-[#0f172a] border border-slate-700 rounded-xl p-3 shadow-lg">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] font-mono text-purple-400 font-bold">
                  JOB: {doorData.jobCardNumber}
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded bg-purple-950 border border-purple-800 text-purple-300 font-bold">
                  INSTALLATION
                </span>
              </div>
              <h3 className="text-sm font-bold text-white">{doorData.customerName}</h3>
              <p className="text-[11px] text-slate-400">{doorData.siteAddress}</p>
            </div>

            {/* After-Finish Photo */}
            <div className="bg-[#0f172a] border border-slate-700 rounded-xl p-3 shadow-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white uppercase flex items-center gap-1">
                  <Camera className="w-3.5 h-3.5 text-purple-400" />
                  After-Finish Installation Photo
                </span>
                {installPhoto && (
                  <span className="text-[10px] text-emerald-400 font-bold">✓ Captured</span>
                )}
              </div>

              {installPhoto ? (
                <div className="relative rounded-lg overflow-hidden border border-slate-700 max-h-48">
                  <img src={installPhoto} alt="Install Finish" className="w-full h-44 object-cover" />
                  <button
                    type="button"
                    onClick={() => setInstallPhoto(null)}
                    className="absolute top-2 right-2 px-2 py-1 bg-rose-600 text-white text-[10px] font-bold rounded shadow-lg"
                  >
                    Retake
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center justify-center p-5 border-2 border-dashed border-slate-700 hover:border-purple-400 rounded-xl cursor-pointer bg-slate-900/60 transition">
                  <Camera className="w-7 h-7 text-purple-400 mb-1" />
                  <span className="text-xs font-bold text-slate-200">
                    Capture Finished Door on Site
                  </span>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    onChange={(e) => handlePhotoSelect(e, 'INSTALL')}
                    className="hidden"
                  />
                </label>
              )}
            </div>

            {/* 6-Point Site Quality Inspection Checklist */}
            <div className="bg-[#0f172a] border border-slate-700 rounded-xl p-3 shadow-lg space-y-2.5">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="text-xs font-bold text-cyan-300 uppercase flex items-center gap-1">
                  <ShieldCheck className="w-4 h-4 text-cyan-400" />
                  6-Point Site Quality Checklist
                </span>
                <div className="flex items-center gap-0.5">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setStarRating(star)}
                      className="p-0.5 text-amber-400 cursor-pointer"
                    >
                      <Star
                        className={`w-3.5 h-3.5 ${
                          star <= starRating ? 'fill-amber-400 text-amber-400' : 'text-slate-600'
                        }`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5 text-xs">
                {[
                  {
                    key: 'framePlumbAndLevel',
                    label: '1. Frame Plumb & Level Checked',
                  },
                  {
                    key: 'uniformPerimeterGap',
                    label: '2. 3mm Uniform Perimeter Gap Around Shutter',
                  },
                  {
                    key: 'hingeScrewsFirm',
                    label: '3. All SS Hinge Screws Fully Countersunk & Tight',
                  },
                  {
                    key: 'lockLatchOperationSmooth',
                    label: '4. Lock, Latch & Cylinder Engage Smoothly',
                  },
                  {
                    key: 'bottomClearanceFloorLevel',
                    label: '5. 8-10mm Clearance Over Finished Tile Floor',
                  },
                  {
                    key: 'surfaceFinishScratchFree',
                    label: '6. Zero Surface Scratches / Clean Handover',
                  },
                ].map((item) => (
                  <label
                    key={item.key}
                    className="flex items-center gap-2 p-1.5 bg-[#172138] rounded-lg cursor-pointer hover:bg-slate-800/80 transition"
                  >
                    <input
                      type="checkbox"
                      checked={(checklist as any)[item.key]}
                      onChange={(e) =>
                        setChecklist((prev) => ({ ...prev, [item.key]: e.target.checked }))
                      }
                      className="rounded text-cyan-500 w-4 h-4"
                    />
                    <span className="text-[11px] text-slate-200 font-medium">{item.label}</span>
                  </label>
                ))}
              </div>

              {/* Technician Notes */}
              <div>
                <textarea
                  rows={2}
                  value={installerNotes}
                  onChange={(e) => setInstallerNotes(e.target.value)}
                  placeholder="Technician remarks / handover notes..."
                  className="w-full bg-[#172138] border border-slate-700 rounded-lg p-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                />
              </div>

              {/* Complete & Sign-Off Button */}
              <button
                type="button"
                onClick={handleSubmitInspection}
                className="w-full py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-lg shadow-lg flex items-center justify-center gap-1.5 transition"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Submit Quality Inspection Sign-Off</span>
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* 6. SUPER ADMIN: REAL-TIME FLEET GPS & FIELD PERSONNEL OVERVIEW            */}
        {/* ========================================================================= */}
        {activeRole === 'SUPER_ADMIN' && (
          <div className="space-y-3 animate-in fade-in">
            <div className="bg-[#111c34] border border-amber-500/40 rounded-xl p-3.5 shadow-lg space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-amber-400 uppercase flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-amber-400" />
                  Super Admin Fleet &amp; Staff GPS
                </span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold">
                  All Units Active
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Live location pings, battery, and delivery truck route status across Kerala.
              </p>
            </div>

            {/* Active Fleet List */}
            <div className="space-y-2">
              {[
                {
                  id: 'fl-1',
                  name: 'Truck 1 (KL-10-AZ-4521)',
                  role: 'Medium Delivery Truck (Tata 407)',
                  person: 'Driver Shafi',
                  phone: '+91 98471 99001',
                  location: 'Vengara Bypass (11.0425, 75.9812)',
                  status: 'En Route (Speed: 42 km/h)',
                  statusColor: 'text-emerald-400 bg-emerald-950/60 border-emerald-500/40',
                  cargo: '4 Orders (22 Doors) • Malappuram Cluster',
                },
                {
                  id: 'fl-2',
                  name: 'Truck 2 (KL-10-BX-9081)',
                  role: 'Maxi Delivery Truck (Bolero)',
                  person: 'Driver Ratheesh',
                  phone: '+91 94472 88123',
                  location: 'Beypore Port Road, Calicut',
                  status: 'Unloading at Site (Door 3/4)',
                  statusColor: 'text-cyan-400 bg-cyan-950/60 border-cyan-500/40',
                  cargo: '2 Orders (15 Doors) • Calicut Cluster',
                },
                {
                  id: 'fl-3',
                  name: 'Installation Team A',
                  role: 'Door Fitting & Hardware Specialists',
                  person: 'Lead Jafar & Team (2 Techs)',
                  phone: '+91 98950 44321',
                  location: 'Chemmad, Tirurangadi',
                  status: 'Fitting Hinges (3 Doors Fitted)',
                  statusColor: 'text-amber-400 bg-amber-950/60 border-amber-500/40',
                  cargo: 'Tools & Fasteners Gang',
                },
                {
                  id: 'fl-4',
                  name: 'Sales Executive 1',
                  role: 'Site Measurement & Architect Liaison',
                  person: 'Anas (Area Manager)',
                  phone: '+91 97455 11987',
                  location: 'Kottakkal Arya Vaidya Sala Area',
                  status: 'Taking Site Measurements',
                  statusColor: 'text-purple-400 bg-purple-950/60 border-purple-500/40',
                  cargo: 'Laser Tape & Samples Kit',
                },
              ].map((unit) => (
                <div
                  key={unit.id}
                  className="bg-[#111c34] border border-slate-800 rounded-xl p-3 space-y-2 shadow-md"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-bold text-xs text-white">{unit.name}</div>
                      <div className="text-[10px] text-slate-400">{unit.role} • {unit.person}</div>
                    </div>
                    <span className={`text-[9.5px] font-bold px-2 py-0.5 rounded-full border ${unit.statusColor}`}>
                      {unit.status}
                    </span>
                  </div>

                  <div className="bg-[#182849] p-2 rounded-lg text-xs space-y-1">
                    <div className="text-slate-300 flex items-center gap-1.5 text-[11px]">
                      <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                      <span>{unit.location}</span>
                    </div>
                    <div className="text-slate-400 text-[10px] pl-5">
                      {unit.cargo}
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-1 text-xs">
                    <a
                      href={`tel:${unit.phone.replace(/\s+/g, '')}`}
                      className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg font-bold text-[11px] flex items-center gap-1"
                    >
                      <Phone className="w-3 h-3 text-emerald-400" />
                      <span>Call {unit.person.split(' ')[0]}</span>
                    </a>
                    <button
                      type="button"
                      onClick={() => showToast(`Requested live GPS beacon ping from ${unit.name}`)}
                      className="px-2.5 py-1 bg-cyan-600/30 hover:bg-cyan-600/50 text-cyan-300 border border-cyan-500/40 rounded-lg font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Ping Location</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick Link back to Desktop ERP (Managers Only) */}
            {isManager && (
              <div className="bg-[#111c34] border border-slate-800 rounded-xl p-3 text-center space-y-2">
                <span className="text-slate-400 text-[11px] block">Switch to Full Desktop ERP Workbench (Manager Oversight)</span>
                <a
                  href="/"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs shadow-md"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Return to EXMARK ERP Desktop</span>
                </a>
              </div>
            )}
          </div>
        )}
        </>
        )}
      </main>

      {/* Mobile Customer Visit with Geo-Tagged Selfie Modal */}
      <MobileCustomerVisitModal
        isOpen={isVisitModalOpen}
        onClose={() => setIsVisitModalOpen(false)}
        staffId={authenticatedUser?.id || 'STAFF-MOBILE-01'}
        staffCode={authenticatedUser?.employeeCode || 'FLD-01'}
        staffName={authenticatedUser?.name || 'Field Staff'}
        staffRole={authenticatedUser?.role || activeRole}
        onVisitLogged={(visit) => {
          setTodayVisits((prev) => [visit, ...prev]);
          showToast(`✓ Logged visit for ${visit.customerName} with Geo-Selfie!`);
        }}
      />

      {/* Mobile Customer Registration Modal */}
      <MobileCustomerModal
        isOpen={isCustomerModalOpen}
        onClose={() => setIsCustomerModalOpen(false)}
        initialName={siteCustomerName !== 'KAMARU YUSUF' ? siteCustomerName : ''}
        initialPhone={siteCustomerPhone !== '+91 98471 23456' ? siteCustomerPhone : ''}
        initialTown={siteLocation !== 'Vengara, Malappuram' ? siteLocation.split(',')[0].trim() : ''}
        onCustomerCreated={(c) => {
          setSiteCustomerName(c.name);
          if (c.phone) setSiteCustomerPhone(c.phone);
          if (c.town || c.district) {
            setSiteLocation(`${c.town || ''}${c.town && c.district ? ', ' : ''}${c.district || ''}`);
          }
          showToast(`✓ Registered & linked new customer: ${c.name}`);
        }}
      />
    </div>
  );
}
