'use client';

import React, { useState } from 'react';
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
} from 'lucide-react';
import { DoorItemInput, SiteMeasurementRecord } from '@/types/measurements';
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

const DOOR_MODELS = [
  'FRP Molded Teak (32mm) - 100% Waterproof',
  'WPC Solid Waterproof Bathroom Door (30mm)',
  'FRP CNC Carved Luxury Main Door (35mm with Inlay)',
  'WPC Heavy Frame & Shutter Combination (32mm)',
  'Commercial Fire-Retardant FRP Door (38mm)',
  'Solid Hybrid Weather-Shield Exterior Door (35mm)',
];

const FRAME_TYPES = [
  'WPC Solid Extruded 100x65mm Frame',
  'FRP Wrap-Around Monolithic Frame',
  'Granite Subframe (Tile / Marble Rebate)',
  'Existing Wooden Rebate Refit',
  'No Frame (Shutter Only - Pre-hung)',
];

const COLOURS = [
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

const LOCK_TYPES = [
  'Mortise Lock 60mm Backset with Brass Handles',
  'Bathroom Baby Latch / Coin-Turn Latch',
  'Cylindrical Knob Lock (SS 304)',
  'Digital Smart Lock Routing Prep',
  'Deadbolt & Tower Bolt Only',
];

const DEFAULT_DOOR: DoorItemInput = {
  doorNumber: 'D1 - Main Entry',
  model: 'FRP Molded Teak (32mm) - 100% Waterproof',
  frameType: 'WPC Solid Extruded 100x65mm Frame',
  colour: 'Burma Teak (Woodgrain PU)',
  hingeSide: 'Left Hand (LH) - Inward',
  lockType: 'Mortise Lock 60mm Backset with Brass Handles',
  measurementUnit: 'MM',
  heightLeft: 2100,
  heightRight: 2100,
  widthTop: 900,
  widthBottom: 900,
  wallThickness: '150mm',
  rebateDepth: '38mm',
  remarks: '',
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
  const [doors, setDoors] = useState<DoorItemInput[]>(
    initialRecord?.doors && initialRecord.doors.length > 0
      ? initialRecord.doors
      : [
          { ...DEFAULT_DOOR, doorNumber: 'D1 - Main Entrance' },
          {
            ...DEFAULT_DOOR,
            doorNumber: 'D2 - Master Bed',
            heightLeft: 2095,
            heightRight: 2095,
            widthTop: 850,
            widthBottom: 850,
          },
        ]
  );

  // UI state
  const [activeDoorTab, setActiveDoorTab] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [validationResult, setValidationResult] = useState<{
    valid: boolean;
    warnings: string[];
    errors: string[];
  } | null>(null);

  // Door row manipulation
  const handleAddDoor = () => {
    const nextNum = doors.length + 1;
    const newDoor: DoorItemInput = {
      ...DEFAULT_DOOR,
      doorNumber: `D${nextNum} - Room Opening`,
      heightLeft: 2100,
      heightRight: 2100,
      widthTop: 850,
      widthBottom: 850,
    };
    setDoors([...doors, newDoor]);
    setActiveDoorTab(doors.length);
  };

  const handleRemoveDoor = (index: number) => {
    if (doors.length <= 1) {
      alert('A site measurement must contain at least one door opening.');
      return;
    }
    const updated = doors.filter((_, i) => i !== index);
    setDoors(updated);
    setActiveDoorTab(Math.max(0, activeDoorTab - 1));
  };

  const handleDoorChange = <K extends keyof DoorItemInput>(field: K, value: DoorItemInput[K]) => {
    const updated = [...doors];
    updated[activeDoorTab] = {
      ...updated[activeDoorTab],
      [field]: value,
    };
    setDoors(updated);
  };

  // Run validation
  const validateForm = () => {
    const errors: string[] = [];
    const warnings: string[] = [];

    if (!siteName.trim()) errors.push('Site Name is required.');
    if (!district.trim()) errors.push('Kerala District must be selected.');
    if (!engineerName.trim()) errors.push('Site Engineer Name is required.');

    doors.forEach((d, idx) => {
      const label = d.doorNumber || `Door #${idx + 1}`;
      if (!d.heightLeft || d.heightLeft <= 0) errors.push(`${label}: Height Left must be a positive number.`);
      if (!d.heightRight || d.heightRight <= 0) errors.push(`${label}: Height Right must be a positive number.`);
      if (!d.widthTop || d.widthTop <= 0) errors.push(`${label}: Width Top must be a positive number.`);
      if (!d.widthBottom || d.widthBottom <= 0) errors.push(`${label}: Width Bottom must be a positive number.`);

      // Plausibility checks
      const hDiff = Math.abs(d.heightLeft - d.heightRight);
      if (hDiff > 15) {
        warnings.push(`${label}: Height Left (${d.heightLeft}) and Right (${d.heightRight}) differ by ${hDiff} ${d.measurementUnit}. Check out-of-square plumb.`);
      }

      const wDiff = Math.abs(d.widthTop - d.widthBottom);
      if (wDiff > 15) {
        warnings.push(`${label}: Width Top (${d.widthTop}) and Bottom (${d.widthBottom}) differ by ${wDiff} ${d.measurementUnit}. Tapered opening detected.`);
      }
    });

    const result = {
      valid: errors.length === 0,
      errors,
      warnings,
    };

    setValidationResult(result);
    return result;
  };

  const handleSave = async (targetStatus: 'DRAFT' | 'VERIFIED') => {
    setErrorMsg('');
    const validation = validateForm();

    if (targetStatus === 'VERIFIED' && !validation.valid) {
      setErrorMsg('Please correct the validation errors before submitting for approval.');
      return;
    }

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
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to save site measurement.');
      }

      onSaved(data.measurement);
      onClose();
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Error saving record';
      setErrorMsg(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const currentDoor = doors[activeDoorTab] || doors[0];
  const activeUnit = currentDoor.measurementUnit || 'MM';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/80 backdrop-blur-xs animate-in fade-in overflow-y-auto">
      <div className="bg-[#0B132B] text-slate-100 rounded-2xl border border-slate-700 w-full max-w-5xl shadow-2xl overflow-hidden my-4 flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-4 bg-[#070D1E] border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-red-600/20 text-red-500 flex items-center justify-center border border-red-500/40">
              <Ruler className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-base text-white">
                  {isEditing ? `Edit Site Measurement: ${refNumber}` : 'Record New Site Measurement'}
                </h3>
                <span
                  className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase ${
                    status === 'APPROVED' || status === 'SENT_TO_PRODUCTION'
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : status === 'VERIFIED'
                      ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                  }`}
                >
                  {status}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Kerala Site Opening Dimensions • Door-Wise Masonry Rebate Book
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="hidden sm:inline-block px-2.5 py-1 rounded-lg bg-slate-800/90 border border-slate-700 text-[11px] text-slate-300">
              Role: <strong className="text-red-400 font-semibold">{userRole}</strong>
            </span>
            <button
              onClick={onClose}
              aria-label="Close measurement form"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Form Body */}
        <div className="p-4 sm:p-6 space-y-5 overflow-y-auto flex-1 custom-scrollbar">
          {/* Requirement 11: Production Tolerance Notice */}
          <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-xs text-slate-300 flex items-start gap-2.5">
            <Info className="w-4 h-4 text-red-400 flex-shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong className="text-white font-semibold">Engineering Standard: </strong>
              Record the <em>raw masonry opening / existing frame rebate dimensions</em> below. Factory finished cutting sizes, perimeter clearance deductions (standard 5mm), and CNC router margins are computed exclusively by the Production module based on approved extrusion profiles.
            </div>
          </div>

          {/* Validation Banner if errors or warnings exist */}
          {validationResult && (
            <div className="space-y-2">
              {validationResult.errors.length > 0 && (
                <div className="p-3 rounded-lg bg-red-950/80 border border-red-800 text-red-200 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-red-300">
                    <ShieldAlert className="w-4 h-4" />
                    <span>Required Field Errors:</span>
                  </div>
                  <ul className="list-disc list-inside space-y-0.5 pl-1">
                    {validationResult.errors.map((err, i) => (
                      <li key={i}>{err}</li>
                    ))}
                  </ul>
                </div>
              )}

              {validationResult.warnings.length > 0 && (
                <div className="p-3 rounded-lg bg-amber-950/70 border border-amber-800 text-amber-200 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-amber-300">
                    <AlertTriangle className="w-4 h-4" />
                    <span>Plumb & Square Warnings (Review on Site):</span>
                  </div>
                  <ul className="list-disc list-inside space-y-0.5 pl-1">
                    {validationResult.warnings.map((warn, i) => (
                      <li key={i}>{warn}</li>
                    ))}
                  </ul>
                </div>
              )}

              {validationResult.valid && validationResult.warnings.length === 0 && (
                <div className="p-2.5 rounded-lg bg-emerald-950/70 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Dimensional validation passed! All openings are within architectural door tolerances.</span>
                </div>
              )}
            </div>
          )}

          {errorMsg && (
            <div className="p-3 rounded-lg bg-red-950/80 border border-red-800 text-red-200 text-xs flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-red-400 flex-shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* SECTION 1: Site & Party Information */}
          <div className="bg-slate-900/60 p-4 rounded-xl border border-slate-800/80 space-y-3">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
              <Building2 className="w-3.5 h-3.5 text-red-400" />
              1. Site &amp; Party Details
            </h4>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div>
                <label className="block text-slate-400 font-medium mb-1">
                  Customer / Party Name *
                </label>
                <input
                  type="text"
                  required
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Malabar Builders, Skyline Living..."
                  className="w-full px-3 py-1.5 bg-slate-900 text-white rounded-lg border border-slate-700 focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">
                  Order / Work Reference
                </label>
                <input
                  type="text"
                  value={orderRef}
                  onChange={(e) => setOrderRef(e.target.value)}
                  placeholder="e.g. EXM-2026-1082"
                  className="w-full px-3 py-1.5 bg-slate-900 text-white rounded-lg border border-slate-700 focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">
                  Site Name / Project *
                </label>
                <input
                  type="text"
                  required
                  value={siteName}
                  onChange={(e) => setSiteName(e.target.value)}
                  placeholder="e.g. Palm Springs Tower B, Flat 402"
                  className="w-full px-3 py-1.5 bg-slate-900 text-white rounded-lg border border-slate-700 focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">
                  Kerala District *
                </label>
                <select
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-900 text-white rounded-lg border border-slate-700 focus:outline-none focus:border-red-500"
                >
                  {KERALA_DISTRICTS.map((dist) => (
                    <option key={dist} value={dist}>
                      {dist}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-slate-400 font-medium mb-1">
                  Site Street Address / Location
                </label>
                <input
                  type="text"
                  value={siteAddress}
                  onChange={(e) => setSiteAddress(e.target.value)}
                  placeholder="e.g. Near Infopark Expressway, Kakkanad, Kochi"
                  className="w-full px-3 py-1.5 bg-slate-900 text-white rounded-lg border border-slate-700 focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">
                  Site Measurement Date
                </label>
                <input
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="w-full px-3 py-1.5 bg-slate-900 text-white rounded-lg border border-slate-700 focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">
                  Site Engineer / Technician *
                </label>
                <input
                  type="text"
                  required
                  value={engineerName}
                  onChange={(e) => setEngineerName(e.target.value)}
                  placeholder="e.g. Anoop Krishnan"
                  className="w-full px-3 py-1.5 bg-slate-900 text-white rounded-lg border border-slate-700 focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">
                  Default Wall Thickness
                </label>
                <input
                  type="text"
                  value={wallThicknessMm}
                  onChange={(e) => setWallThicknessMm(e.target.value)}
                  placeholder="e.g. 150mm"
                  className="w-full px-3 py-1.5 bg-slate-900 text-white rounded-lg border border-slate-700 focus:outline-none focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-medium mb-1">
                  Default Frame Rebate Depth
                </label>
                <input
                  type="text"
                  value={rebateDepthMm}
                  onChange={(e) => setRebateDepthMm(e.target.value)}
                  placeholder="e.g. 38mm"
                  className="w-full px-3 py-1.5 bg-slate-900 text-white rounded-lg border border-slate-700 focus:outline-none focus:border-red-500"
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: Multiple Door Openings Selector */}
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-2">
                <Ruler className="w-3.5 h-3.5 text-red-400" />
                2. Door Openings ({doors.length} {doors.length === 1 ? 'Door' : 'Doors'})
              </h4>

              <button
                type="button"
                onClick={handleAddDoor}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-red-600/20 text-red-300 hover:bg-red-600/30 border border-red-500/40 rounded-lg text-xs font-semibold transition-colors self-start sm:self-auto cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Another Door Opening
              </button>
            </div>

            {/* Door Tabs Rail */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 custom-scrollbar">
              {doors.map((door, idx) => {
                const isActive = activeDoorTab === idx;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveDoorTab(idx)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all border flex items-center gap-2 ${
                      isActive
                        ? 'bg-red-600 text-white border-red-500 shadow-sm'
                        : 'bg-slate-900/80 text-slate-400 border-slate-800 hover:text-white'
                    }`}
                  >
                    <span>{door.doorNumber || `Door #${idx + 1}`}</span>
                    {doors.length > 1 && (
                      <span
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveDoor(idx);
                        }}
                        className="p-0.5 hover:text-red-200 text-slate-400 transition-colors"
                        title="Remove opening"
                      >
                        <Trash2 className="w-3 h-3" />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Active Door Form Card */}
            <div className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-800">
                <div className="flex items-center gap-2 flex-1">
                  <span className="text-xs text-slate-400 font-semibold">Opening Label:</span>
                  <input
                    type="text"
                    value={currentDoor.doorNumber}
                    onChange={(e) => handleDoorChange('doorNumber', e.target.value)}
                    placeholder="e.g. D1 - Master Bed"
                    className="px-2.5 py-1 bg-slate-950 text-white text-xs font-bold rounded-md border border-slate-700 focus:outline-none focus:border-red-500 max-w-xs"
                  />
                </div>

                {/* Unit Switcher */}
                <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs">
                  <span className="text-[11px] text-slate-400 px-1 font-semibold">Unit:</span>
                  {(['MM', 'CM', 'INCH'] as const).map((unit) => (
                    <button
                      key={unit}
                      type="button"
                      onClick={() => handleDoorChange('measurementUnit', unit)}
                      className={`px-2 py-0.5 rounded font-bold text-xs transition-colors ${
                        activeUnit === unit
                          ? 'bg-red-600 text-white shadow-xs'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {unit}
                    </button>
                  ))}
                </div>
              </div>

              {/* Specifications: Model, Frame, Color, Hinge, Lock */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs">
                {(() => {
                  const availableDoorModels = isWpcEnabled
                    ? DOOR_MODELS
                    : DOOR_MODELS.filter((m) => !m.includes('WPC'));

                  const filteredModels = !isWpcEnabled && currentDoor.model.includes('WPC')
                    ? [currentDoor.model, ...availableDoorModels.filter((m) => m !== currentDoor.model)]
                    : availableDoorModels;

                  const availableFrameTypes = isWpcEnabled
                    ? FRAME_TYPES
                    : FRAME_TYPES.filter((f) => !f.includes('WPC'));

                  const filteredFrames = !isWpcEnabled && currentDoor.frameType.includes('WPC')
                    ? [currentDoor.frameType, ...availableFrameTypes.filter((f) => f !== currentDoor.frameType)]
                    : availableFrameTypes;

                  return (
                    <>
                      <div>
                        <div className="flex items-center justify-between mb-1">
                          <label className="block text-slate-400 font-medium">
                            Door Model Category *
                          </label>
                          {!isWpcEnabled && (
                            <span className="text-[10px] text-red-400 font-medium">FRP Line Active</span>
                          )}
                        </div>
                        <select
                          value={currentDoor.model}
                          onChange={(e) => handleDoorChange('model', e.target.value)}
                          className="w-full px-3 py-1.5 bg-slate-950 text-white rounded-lg border border-slate-700 focus:outline-none focus:border-red-500"
                        >
                          {filteredModels.map((m) => (
                            <option key={m} value={m}>
                              {m}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="block text-slate-400 font-medium mb-1">
                          Frame Type / Subframe *
                        </label>
                        <select
                          value={currentDoor.frameType}
                          onChange={(e) => handleDoorChange('frameType', e.target.value)}
                          className="w-full px-3 py-1.5 bg-slate-950 text-white rounded-lg border border-slate-700 focus:outline-none focus:border-red-500"
                        >
                          {filteredFrames.map((f) => (
                            <option key={f} value={f}>
                              {f}
                            </option>
                          ))}
                        </select>
                      </div>
                    </>
                  );
                })()}

                <div>
                  <label className="block text-slate-400 font-medium mb-1">
                    Colour / Woodgrain Finish *
                  </label>
                  <select
                    value={currentDoor.colour}
                    onChange={(e) => handleDoorChange('colour', e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-950 text-white rounded-lg border border-slate-700 focus:outline-none focus:border-red-500"
                  >
                    {COLOURS.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">
                    Hinge Handing (Swing Side) *
                  </label>
                  <select
                    value={currentDoor.hingeSide}
                    onChange={(e) => handleDoorChange('hingeSide', e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-950 text-white rounded-lg border border-slate-700 focus:outline-none focus:border-red-500"
                  >
                    {HINGE_SIDES.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">
                    Lock Hardware Routing *
                  </label>
                  <select
                    value={currentDoor.lockType}
                    onChange={(e) => handleDoorChange('lockType', e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-950 text-white rounded-lg border border-slate-700 focus:outline-none focus:border-red-500"
                  >
                    {LOCK_TYPES.map((l) => (
                      <option key={l} value={l}>
                        {l}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-slate-400 font-medium mb-1">
                    Wall Rebate Depth / Thickness
                  </label>
                  <input
                    type="text"
                    value={currentDoor.rebateDepth || rebateDepthMm}
                    onChange={(e) => handleDoorChange('rebateDepth', e.target.value)}
                    placeholder="e.g. 38mm rebate, 125mm wall"
                    className="w-full px-3 py-1.5 bg-slate-950 text-white rounded-lg border border-slate-700 focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              {/* Requirement 5: Dimensional 4-Point Measurements (Height Left, Height Right, Width Top, Width Bottom) */}
              <div className="pt-2">
                <span className="text-xs font-bold text-slate-300 block mb-2">
                  4-Point Opening Dimensions ({activeUnit})
                </span>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {/* Height Left */}
                  <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
                    <label className="block text-[11px] font-semibold text-slate-400">
                      Height Left ({activeUnit}) *
                    </label>
                    <input
                      type="number"
                      min="100"
                      max="3500"
                      required
                      value={currentDoor.heightLeft || ''}
                      onChange={(e) => handleDoorChange('heightLeft', parseFloat(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 bg-slate-900 text-white font-bold text-sm rounded border border-slate-700 focus:outline-none focus:border-red-500"
                    />
                    {currentDoor.heightLeft > 0 && (
                      <div className="text-[10px] text-slate-400 pt-0.5">
                        {activeUnit === 'MM' && (
                          <span>{(currentDoor.heightLeft / 10).toFixed(1)} cm • {(currentDoor.heightLeft / 25.4).toFixed(2)}″</span>
                        )}
                        {activeUnit === 'INCH' && (
                          <span>{(currentDoor.heightLeft * 25.4).toFixed(1)} mm • {(currentDoor.heightLeft * 2.54).toFixed(1)} cm</span>
                        )}
                        {activeUnit === 'CM' && (
                          <span>{(currentDoor.heightLeft * 10).toFixed(0)} mm • {(currentDoor.heightLeft / 2.54).toFixed(2)}″</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Height Right */}
                  <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
                    <label className="block text-[11px] font-semibold text-slate-400">
                      Height Right ({activeUnit}) *
                    </label>
                    <input
                      type="number"
                      min="100"
                      max="3500"
                      required
                      value={currentDoor.heightRight || ''}
                      onChange={(e) => handleDoorChange('heightRight', parseFloat(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 bg-slate-900 text-white font-bold text-sm rounded border border-slate-700 focus:outline-none focus:border-red-500"
                    />
                    {currentDoor.heightRight > 0 && (
                      <div className="text-[10px] text-slate-400 pt-0.5">
                        {activeUnit === 'MM' && (
                          <span>{(currentDoor.heightRight / 10).toFixed(1)} cm • {(currentDoor.heightRight / 25.4).toFixed(2)}″</span>
                        )}
                        {activeUnit === 'INCH' && (
                          <span>{(currentDoor.heightRight * 25.4).toFixed(1)} mm • {(currentDoor.heightRight * 2.54).toFixed(1)} cm</span>
                        )}
                        {activeUnit === 'CM' && (
                          <span>{(currentDoor.heightRight * 10).toFixed(0)} mm • {(currentDoor.heightRight / 2.54).toFixed(2)}″</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Width Top */}
                  <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
                    <label className="block text-[11px] font-semibold text-slate-400">
                      Width Top ({activeUnit}) *
                    </label>
                    <input
                      type="number"
                      min="100"
                      max="2500"
                      required
                      value={currentDoor.widthTop || ''}
                      onChange={(e) => handleDoorChange('widthTop', parseFloat(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 bg-slate-900 text-white font-bold text-sm rounded border border-slate-700 focus:outline-none focus:border-red-500"
                    />
                    {currentDoor.widthTop > 0 && (
                      <div className="text-[10px] text-slate-400 pt-0.5">
                        {activeUnit === 'MM' && (
                          <span>{(currentDoor.widthTop / 10).toFixed(1)} cm • {(currentDoor.widthTop / 25.4).toFixed(2)}″</span>
                        )}
                        {activeUnit === 'INCH' && (
                          <span>{(currentDoor.widthTop * 25.4).toFixed(1)} mm • {(currentDoor.widthTop * 2.54).toFixed(1)} cm</span>
                        )}
                        {activeUnit === 'CM' && (
                          <span>{(currentDoor.widthTop * 10).toFixed(0)} mm • {(currentDoor.widthTop / 2.54).toFixed(2)}″</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Width Bottom */}
                  <div className="p-3 bg-slate-950 rounded-lg border border-slate-800 space-y-1">
                    <label className="block text-[11px] font-semibold text-slate-400">
                      Width Bottom ({activeUnit}) *
                    </label>
                    <input
                      type="number"
                      min="100"
                      max="2500"
                      required
                      value={currentDoor.widthBottom || ''}
                      onChange={(e) => handleDoorChange('widthBottom', parseFloat(e.target.value) || 0)}
                      className="w-full px-2.5 py-1.5 bg-slate-900 text-white font-bold text-sm rounded border border-slate-700 focus:outline-none focus:border-red-500"
                    />
                    {currentDoor.widthBottom > 0 && (
                      <div className="text-[10px] text-slate-400 pt-0.5">
                        {activeUnit === 'MM' && (
                          <span>{(currentDoor.widthBottom / 10).toFixed(1)} cm • {(currentDoor.widthBottom / 25.4).toFixed(2)}″</span>
                        )}
                        {activeUnit === 'INCH' && (
                          <span>{(currentDoor.widthBottom * 25.4).toFixed(1)} mm • {(currentDoor.widthBottom * 2.54).toFixed(1)} cm</span>
                        )}
                        {activeUnit === 'CM' && (
                          <span>{(currentDoor.widthBottom * 10).toFixed(0)} mm • {(currentDoor.widthBottom / 2.54).toFixed(2)}″</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Door Remarks */}
                <div className="mt-3">
                  <label className="block text-slate-400 font-medium text-xs mb-1">
                    Door-Specific Remarks & Site Conditions
                  </label>
                  <input
                    type="text"
                    value={currentDoor.remarks || ''}
                    onChange={(e) => handleDoorChange('remarks', e.target.value)}
                    placeholder="e.g. Tile step 12mm on floor, architrave required on outer wall face, check hinge block clearance..."
                    className="w-full px-3 py-1.5 bg-slate-950 text-white text-xs rounded-lg border border-slate-700 focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* General Site Notes */}
          <div>
            <label className="block text-slate-400 font-medium text-xs mb-1">
              General Project / Site Delivery Notes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Unloading bay on North side, lift access available up to 4th floor, client request dispatch by Friday..."
              className="w-full px-3 py-2 bg-slate-900 text-white text-xs rounded-lg border border-slate-700 focus:outline-none focus:border-red-500"
            />
          </div>
        </div>

        {/* Modal Actions Footer */}
        <div className="p-4 bg-[#070D1E] border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={validateForm}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-semibold transition-colors cursor-pointer inline-flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5 text-blue-400" />
              <span>Validate Dimensions</span>
            </button>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Save Draft Action */}
            <button
              type="button"
              onClick={() => handleSave('DRAFT')}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-amber-500/30 text-xs font-bold transition-all cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-50"
            >
              <Save className="w-4 h-4 text-amber-400" />
              <span>Save Draft</span>
            </button>

            {/* Submit for Approval Action */}
            <button
              type="button"
              onClick={() => handleSave('VERIFIED')}
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs font-bold transition-all shadow-lg shadow-red-950/40 cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Persisting Measurement...</span>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Submit for Approval</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
