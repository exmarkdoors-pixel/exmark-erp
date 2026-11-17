'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldAlert,
  ShieldCheck,
  TrendingUp,
  AlertTriangle,
  MapPin,
  Truck,
  CheckCircle2,
  DollarSign,
  Layers,
  Award,
  Navigation,
  ExternalLink,
  ChevronRight,
  Info,
  Calendar,
  Sparkles,
  Percent,
} from 'lucide-react';
import {
  ProjectRiskResult,
  ProjectCostProfitResult,
  GeotaggedCoordinates,
} from '@/lib/types/projectRiskProfit';
import {
  calculateProjectRisk,
  calculateProjectCostProfit,
  KERALA_DISTRICT_LOGISTICS,
} from '@/lib/services/projectRiskProfitService';

interface ProjectRiskProfitModalProps {
  isOpen: boolean;
  onClose: () => void;
  quotation: any | null;
  onApplyBuffer?: (bufferPct: number) => void;
  onWarrantyIssued?: (certNumber: string) => void;
}

export function ProjectRiskProfitModal({
  isOpen,
  onClose,
  quotation,
  onApplyBuffer,
  onWarrantyIssued,
}: ProjectRiskProfitModalProps) {
  const [activeTab, setActiveTab] = useState<'RISK' | 'COST_PROFIT' | 'LOCATION_WARRANTY'>('RISK');

  // Risk Inputs
  const [district, setDistrict] = useState('Malappuram');
  const [advancePercent, setAdvancePercent] = useState(50);
  const [roadAccessibility, setRoadAccessibility] = useState<'CONTAINER_40FT' | 'STANDARD_LORRY' | 'PICKUP_NARROW' | 'HILL_HAIRPIN_TERRAIN'>('STANDARD_LORRY');
  const [siteReadiness, setSiteReadiness] = useState<'READY_CLEARED' | 'PARTIAL_PLASTERING' | 'UNFINISHED_CIVIL'>('READY_CLEARED');
  const [isMonsoonSeason, setIsMonsoonSeason] = useState(false);

  // Location & Geotag Inputs
  const [siteName, setSiteName] = useState('');
  const [siteAddress, setSiteAddress] = useState('');
  const [pinCode, setPinCode] = useState('');
  const [landmark, setLandmark] = useState('');
  const [latitude, setLatitude] = useState(11.0510);
  const [longitude, setLongitude] = useState(76.0711);
  const [geofenceRadius, setGeofenceRadius] = useState(500);
  const [isCapturingGps, setIsCapturingGps] = useState(false);
  const [gpsCapturedSuccess, setGpsCapturedSuccess] = useState(false);

  // Warranty Issuance State
  const [warrantyYears, setWarrantyYears] = useState<10 | 15>(15);
  const [isIssuingWarranty, setIsIssuingWarranty] = useState(false);
  const [issuedWarrantyCert, setIssuedWarrantyCert] = useState<string | null>(null);

  // Calculation Results
  const [riskResult, setRiskResult] = useState<ProjectRiskResult | null>(null);
  const [costResult, setCostResult] = useState<ProjectCostProfitResult | null>(null);

  // Initialize from quotation when opened
  useEffect(() => {
    if (quotation) {
      const qDist = quotation.deliveryDistrict || quotation.district || quotation.location || 'Malappuram';
      setDistrict(qDist);
      setAdvancePercent(Number(quotation.advancePercent || 50));
      setSiteName(quotation.customerName ? `${quotation.customerName} Site` : 'Site Project');
      setSiteAddress(quotation.location || 'Kerala');

      // Auto-set default coords if available
      if (quotation.latitude && quotation.longitude) {
        setLatitude(Number(quotation.latitude));
        setLongitude(Number(quotation.longitude));
      } else {
        // District default approximations in Kerala
        const matched = Object.keys(KERALA_DISTRICT_LOGISTICS).find(
          (d) => d.toLowerCase() === qDist.toLowerCase() || qDist.toLowerCase().includes(d.toLowerCase())
        );
        if (matched === 'Kozhikode') { setLatitude(11.2588); setLongitude(75.7804); }
        else if (matched === 'Ernakulam') { setLatitude(9.9816); setLongitude(76.2999); }
        else if (matched === 'Wayanad') { setLatitude(11.6854); setLongitude(76.1320); }
        else { setLatitude(11.0510); setLongitude(76.0711); }
      }
    }
  }, [quotation]);

  // Re-calculate live risk & cost
  useEffect(() => {
    if (!quotation) return;

    const risk = calculateProjectRisk({
      quotationId: quotation.id,
      customerName: quotation.customerName,
      district,
      advancePercent,
      quotedTotal: quotation.grandTotal,
      roadAccessibility,
      siteReadiness,
      isMonsoonSeason,
      itemRows: quotation.itemRows || [],
      totalDoorsCount: quotation.itemRows?.length || 1,
    });
    setRiskResult(risk);

    const cost = calculateProjectCostProfit({
      quotationId: quotation.id,
      customerName: quotation.customerName,
      district,
      totalDoors: quotation.itemRows?.length || 1,
      itemRows: quotation.itemRows || [],
      includeInstallation: quotation.includeInstallation,
      installationRate: quotation.installationRate,
      installationMode: quotation.installationMode,
      additionalDiscount: quotation.discount,
      riskScore: risk.overallScore,
    });
    setCostResult(cost);
  }, [quotation, district, advancePercent, roadAccessibility, siteReadiness, isMonsoonSeason]);

  if (!isOpen || !quotation) return null;

  // Capture GPS via navigator.geolocation
  const handleCaptureCurrentGps = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      alert('Geolocation is not supported by your browser.');
      return;
    }
    setIsCapturingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLatitude(Number(pos.coords.latitude.toFixed(6)));
        setLongitude(Number(pos.coords.longitude.toFixed(6)));
        setIsCapturingGps(false);
        setGpsCapturedSuccess(true);
        setTimeout(() => setGpsCapturedSuccess(false), 4000);
      },
      (err) => {
        setIsCapturingGps(false);
        alert(`Could not capture device location: ${err.message}. You can manually type the coordinates.`);
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  // Issue Geotagged Warranty
  const handleIssueWarranty = async () => {
    setIsIssuingWarranty(true);
    try {
      const doors = Array.isArray(quotation.itemRows) && quotation.itemRows.length > 0
        ? quotation.itemRows.map((r: any, idx: number) => ({
            doorId: `EXM-DR-${quotation.id}-${idx + 1}`,
            doorNumber: r.roomTag || r.doorNumber || `Door #${idx + 1}`,
            model: r.modelId || 'EXM-FRP Architectural Door',
            dimensionsMm: `${Math.round(r.height * (r.unit === 'inch' ? 25.4 : 10))} x ${Math.round(r.width * (r.unit === 'inch' ? 25.4 : 10))} mm`,
            finishColor: r.colourId || 'Natural Teak Matte',
            frameType: r.frameTypeName || 'WPC Extruded Heavy Frame',
            lockType: r.lockId || 'Standard Mortise Lock',
            qrSerial: `EXM-QR-${quotation.id}-D${idx + 1}`,
          }))
        : [
            {
              doorId: `EXM-DR-${quotation.id}-01`,
              doorNumber: 'D1',
              model: 'EXM-FRP Architectural Door',
              dimensionsMm: '2085 x 888 mm',
              finishColor: 'Natural Teak Matte',
              frameType: 'WPC Extruded Frame',
              lockType: 'Standard Lock',
              qrSerial: `EXM-QR-${quotation.id}-01`,
            },
          ];

      const res = await fetch('/api/warranty', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          quotationId: quotation.id,
          customerName: quotation.customerName,
          customerPhone: quotation.customerPhone || '',
          siteName: siteName || `${quotation.customerName} Site`,
          siteAddress: siteAddress || `${district}, Kerala`,
          district,
          pinCode,
          landmark,
          warrantyPeriodYears: warrantyYears,
          coordinates: {
            latitude,
            longitude,
            accuracyMeters: 10,
            capturedAt: new Date().toISOString(),
            source: gpsCapturedSuccess ? 'DEVICE_GPS' : 'MANUAL_MAP_PIN',
          },
          geofenceRadiusMeters: geofenceRadius,
          coveredDoors: doors,
        }),
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setIssuedWarrantyCert(data.data.certificateNumber);
        if (onWarrantyIssued) onWarrantyIssued(data.data.certificateNumber);
      } else {
        alert(data.error || 'Failed to issue warranty certificate.');
      }
    } catch (err: any) {
      alert(`Error issuing warranty: ${err.message}`);
    } finally {
      setIsIssuingWarranty(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-sm animate-fade-in overflow-y-auto">
      <div className="bg-[#0b1222] border border-slate-800 rounded-2xl w-full max-w-4xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden my-auto text-slate-200">
        
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-slate-800 bg-[#0f172a] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-extrabold text-white uppercase tracking-wider">
                  Project Risk &amp; Profit Engine
                </h3>
                <span className="font-mono text-xs text-rose-400 font-bold bg-rose-950/60 border border-rose-800/40 px-2 py-0.5 rounded">
                  {quotation.id}
                </span>
              </div>
              <p className="text-xs text-slate-400">
                {quotation.customerName} &bull; {district} &bull; {quotation.itemRows?.length || 1} Doors
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 3 Primary Navigation Tabs */}
        <div className="flex items-center border-b border-slate-800 bg-slate-900/80 px-5 pt-2 gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setActiveTab('RISK')}
            className={`px-4 py-2.5 rounded-t-lg text-xs font-bold transition flex items-center gap-2 cursor-pointer border-b-2 ${
              activeTab === 'RISK'
                ? 'border-amber-400 text-amber-300 bg-[#0b1222]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldAlert className="w-4 h-4 text-amber-400" />
            <span>1. Project Risk Index</span>
            {riskResult && (
              <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                riskResult.riskLevel === 'CRITICAL' ? 'bg-rose-900/80 text-rose-200' :
                riskResult.riskLevel === 'HIGH' ? 'bg-orange-900/80 text-orange-200' :
                riskResult.riskLevel === 'MEDIUM' ? 'bg-amber-900/80 text-amber-200' :
                'bg-emerald-900/80 text-emerald-200'
              }`}>
                {riskResult.overallScore}/100
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('COST_PROFIT')}
            className={`px-4 py-2.5 rounded-t-lg text-xs font-bold transition flex items-center gap-2 cursor-pointer border-b-2 ${
              activeTab === 'COST_PROFIT'
                ? 'border-emerald-400 text-emerald-300 bg-[#0b1222]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <TrendingUp className="w-4 h-4 text-emerald-400" />
            <span>2. Cost &amp; Profit Sheet</span>
            {costResult && (
              <span className="font-mono text-[10px] text-emerald-300 bg-emerald-950/60 border border-emerald-800/40 px-1.5 py-0.2 rounded font-bold">
                {costResult.netMarginPct}% Net
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('LOCATION_WARRANTY')}
            className={`px-4 py-2.5 rounded-t-lg text-xs font-bold transition flex items-center gap-2 cursor-pointer border-b-2 ${
              activeTab === 'LOCATION_WARRANTY'
                ? 'border-cyan-400 text-cyan-300 bg-[#0b1222]'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <MapPin className="w-4 h-4 text-cyan-400" />
            <span>3. Geotag &amp; Location Warranty</span>
            <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-cyan-950/80 text-cyan-300 border border-cyan-800/40">
              500m Geofence
            </span>
          </button>
        </div>

        {/* Tab Body Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5">

          {/* TAB 1: PROJECT RISK ENGINE */}
          {activeTab === 'RISK' && riskResult && (
            <div className="space-y-4">
              {/* Overall Risk Score Hero Banner */}
              <div className={`p-4 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${riskResult.riskColor}`}>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs uppercase font-extrabold tracking-wider">Project Risk Level:</span>
                    <span className="px-2 py-0.5 rounded text-xs font-black uppercase tracking-wider bg-black/40 border border-white/20">
                      {riskResult.riskLevel} RISK ({riskResult.overallScore} / 100)
                    </span>
                  </div>
                  <p className="text-xs opacity-90 leading-relaxed">
                    Evaluated against Kerala logistics terrain, advance liquidity risk, non-standard dimensional complexity, and site readiness.
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0 bg-black/30 p-2.5 rounded-lg border border-white/10">
                  <div className="text-center px-2">
                    <span className="text-[10px] opacity-80 block uppercase font-bold">Safety Buffer</span>
                    <span className="font-mono text-base font-extrabold text-amber-300">
                      +{riskResult.recommendedContingencyBufferPct}%
                    </span>
                  </div>
                  <div className="h-7 w-px bg-white/20" />
                  <div className="text-center px-2">
                    <span className="text-[10px] opacity-80 block uppercase font-bold">Req. Advance</span>
                    <span className="font-mono text-base font-extrabold text-emerald-300">
                      {riskResult.recommendedAdvancePercent}%
                    </span>
                  </div>
                </div>
              </div>

              {/* Dynamic Project Inputs Bar */}
              <div className="bg-slate-900/70 p-3.5 rounded-xl border border-slate-800 grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs">
                <div>
                  <label className="block text-[10px] text-slate-400 font-bold mb-1">Kerala District</label>
                  <select
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className="w-full bg-[#131b2e] border border-slate-700 rounded-lg p-1.5 text-xs text-white font-medium"
                  >
                    {Object.keys(KERALA_DISTRICT_LOGISTICS).map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 font-bold mb-1">Advance Deposit (%)</label>
                  <input
                    type="number"
                    min="30"
                    max="100"
                    value={advancePercent}
                    onChange={(e) => setAdvancePercent(Math.max(30, Math.min(100, Number(e.target.value))))}
                    className="w-full bg-[#131b2e] border border-slate-700 rounded-lg p-1.5 text-xs text-emerald-300 font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 font-bold mb-1">Site Road Accessibility</label>
                  <select
                    value={roadAccessibility}
                    onChange={(e) => setRoadAccessibility(e.target.value as any)}
                    className="w-full bg-[#131b2e] border border-slate-700 rounded-lg p-1.5 text-xs text-slate-200"
                  >
                    <option value="STANDARD_LORRY">Standard Kerala Lorry Road</option>
                    <option value="CONTAINER_40FT">Wide National Highway / 40ft</option>
                    <option value="PICKUP_NARROW">Narrow Rural Lane (Pickup Only)</option>
                    <option value="HILL_HAIRPIN_TERRAIN">Highland / Ghats Hairpin Bends</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[10px] text-slate-400 font-bold mb-1">Civil Site Readiness</label>
                  <select
                    value={siteReadiness}
                    onChange={(e) => setSiteReadiness(e.target.value as any)}
                    className="w-full bg-[#131b2e] border border-slate-700 rounded-lg p-1.5 text-xs text-slate-200"
                  >
                    <option value="READY_CLEARED">Plastered &amp; Floor Ready</option>
                    <option value="PARTIAL_PLASTERING">Partial Plastering in Progress</option>
                    <option value="UNFINISHED_CIVIL">Unfinished Civil / Wet Plaster</option>
                  </select>
                </div>
              </div>

              {/* 4 Risk Factor Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {riskResult.factors.map((factor) => (
                  <div
                    key={factor.key}
                    className="bg-slate-900/60 border border-slate-800 rounded-xl p-3.5 space-y-2"
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-white flex items-center gap-1.5">
                        {factor.category === 'CREDIT' && <DollarSign className="w-3.5 h-3.5 text-emerald-400" />}
                        {factor.category === 'LOGISTICS' && <Truck className="w-3.5 h-3.5 text-cyan-400" />}
                        {factor.category === 'CUSTOMIZATION' && <Layers className="w-3.5 h-3.5 text-purple-400" />}
                        {factor.category === 'SITE_WEATHER' && <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />}
                        {factor.title}
                      </span>
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        factor.level === 'CRITICAL' ? 'bg-rose-950 text-rose-300 border border-rose-800' :
                        factor.level === 'HIGH' ? 'bg-orange-950 text-orange-300 border border-orange-800' :
                        factor.level === 'MEDIUM' ? 'bg-amber-950 text-amber-300 border border-amber-800' :
                        'bg-emerald-950 text-emerald-300 border border-emerald-800'
                      }`}>
                        {factor.score}/{factor.maxScore} pts ({factor.level})
                      </span>
                    </div>

                    <p className="text-[11px] text-slate-300 leading-snug">
                      {factor.description}
                    </p>

                    <div className="bg-slate-950/80 p-2 rounded text-[10px] text-amber-300/90 border border-slate-800 flex items-start gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5" />
                      <span><strong>Mitigation:</strong> {factor.mitigation}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* Actionable Safeguards & Contingency Buffer Injection */}
              <div className="bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 p-4 rounded-xl border border-amber-800/40 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="space-y-1">
                  <span className="text-xs font-bold text-amber-300 uppercase tracking-wider block">
                    Recommended Factory Safeguards
                  </span>
                  <p className="text-[11px] text-slate-300">
                    Packaging: <strong>{riskResult.recommendedPackaging}</strong> &bull; Recommended Contingency: <strong>+{riskResult.recommendedContingencyBufferPct}%</strong>
                  </p>
                </div>
                {onApplyBuffer && (
                  <button
                    type="button"
                    onClick={() => {
                      onApplyBuffer(riskResult.recommendedContingencyBufferPct);
                      alert(`Applied +${riskResult.recommendedContingencyBufferPct}% contingency buffer to quotation costing.`);
                    }}
                    className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg shadow-md transition cursor-pointer flex items-center gap-1.5 shrink-0"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>Apply +{riskResult.recommendedContingencyBufferPct}% Buffer to Quote</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: DETAILED COST & PROFIT SHEET */}
          {activeTab === 'COST_PROFIT' && costResult && (
            <div className="space-y-4">
              {/* Financial Returns Hero Header */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
                <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Net Quoted Revenue</span>
                  <strong className="text-lg font-black text-white font-mono">
                    ₹{costResult.netQuotedRevenue.toLocaleString('en-IN')}
                  </strong>
                  <span className="text-[10px] text-slate-500 block">Total Contract Billing</span>
                </div>

                <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Project Cost</span>
                  <strong className="text-lg font-black text-amber-300 font-mono">
                    ₹{costResult.totalCost.toLocaleString('en-IN')}
                  </strong>
                  <span className="text-[10px] text-slate-500 block">COP with All Overheads</span>
                </div>

                <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Net Profit</span>
                  <strong className={`text-lg font-black font-mono ${costResult.netProjectProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    ₹{costResult.netProjectProfit.toLocaleString('en-IN')}
                  </strong>
                  <span className={`text-[10px] font-bold block ${costResult.netProjectProfit >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                    {costResult.netMarginPct}% Net Margin
                  </span>
                </div>

                <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Zero-Profit Breakeven</span>
                  <strong className="text-lg font-black text-cyan-300 font-mono">
                    ₹{costResult.breakEvenContractPrice.toLocaleString('en-IN')}
                  </strong>
                  <span className="text-[10px] text-cyan-500 block">Minimum Viable Price</span>
                </div>
              </div>

              {/* Comprehensive Itemized Cost Breakdown Stack */}
              <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 space-y-3 text-xs">
                <h4 className="font-extrabold text-white uppercase tracking-wider text-xs border-b border-slate-800 pb-2">
                  Itemized Cost Stack &amp; Factory Absorption
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* Left Column: Direct Materials & Labor */}
                  <div className="space-y-2">
                    <span className="text-[11px] font-bold text-amber-300 uppercase tracking-wide block">
                      A. Direct Materials (BOM) — ₹{costResult.costBreakdown.totalDirectMaterials.toLocaleString('en-IN')}
                    </span>
                    <div className="space-y-1 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80 font-mono text-[11px]">
                      <div className="flex justify-between text-slate-300">
                        <span>Isophthalic/GP Resin:</span>
                        <span>₹{costResult.costBreakdown.resinChemicalsCost.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between text-slate-300">
                        <span>Gelcoat &amp; Pigment:</span>
                        <span>₹{costResult.costBreakdown.gelcoatPigmentCost.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between text-slate-300">
                        <span>Fiberglass CSM &amp; Roving:</span>
                        <span>₹{costResult.costBreakdown.fiberglassMatCost.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between text-slate-300">
                        <span>Timber/Polymer Core:</span>
                        <span>₹{costResult.costBreakdown.internalCoreCost.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between text-slate-300">
                        <span>WPC/Hardwood Frames:</span>
                        <span>₹{costResult.costBreakdown.framesWpcWoodCost.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between text-slate-300">
                        <span>Locks, Hinges &amp; Fasteners:</span>
                        <span>₹{costResult.costBreakdown.hardwareLocksHingesCost.toLocaleString('en-IN')}</span>
                      </div>
                    </div>

                    <span className="text-[11px] font-bold text-emerald-300 uppercase tracking-wide block pt-1">
                      B. Direct Piece-Rate Labor — ₹{costResult.costBreakdown.totalDirectLabor.toLocaleString('en-IN')}
                    </span>
                    <div className="space-y-1 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80 font-mono text-[11px]">
                      <div className="flex justify-between text-slate-300">
                        <span>Moulding Gang (Hands-on):</span>
                        <span>₹{costResult.costBreakdown.moldingGangCost.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between text-slate-300">
                        <span>Trimming &amp; Edge Router:</span>
                        <span>₹{costResult.costBreakdown.trimmingGangCost.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between text-slate-300">
                        <span>Surface Finish &amp; PU Paint:</span>
                        <span>₹{costResult.costBreakdown.finishingPaintGangCost.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between text-slate-300">
                        <span>Assembly &amp; Lock Mortising:</span>
                        <span>₹{costResult.costBreakdown.assemblyFittingCost.toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Freight, Install, Fixed Overheads & Buffer */}
                  <div className="space-y-2">
                    <span className="text-[11px] font-bold text-cyan-300 uppercase tracking-wide block">
                      C. Logistics &amp; Installation — ₹{(costResult.costBreakdown.totalLogisticsFreight + costResult.costBreakdown.installationGangLabor).toLocaleString('en-IN')}
                    </span>
                    <div className="space-y-1 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80 font-mono text-[11px]">
                      <div className="flex justify-between text-slate-300">
                        <span>Kerala Base Freight ({district}):</span>
                        <span>₹{costResult.costBreakdown.baseFreightCost.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between text-slate-300">
                        <span>Mileage ({costResult.costBreakdown.distanceKm} km @ ₹{costResult.costBreakdown.mileageRatePerKm}/km):</span>
                        <span>₹{Math.round(costResult.costBreakdown.distanceKm * costResult.costBreakdown.mileageRatePerKm).toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between text-slate-300">
                        <span>Transit Protection &amp; Straps:</span>
                        <span>₹{costResult.costBreakdown.transitPackagingCost.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between text-slate-300">
                        <span>Site Installation Gang:</span>
                        <span>₹{costResult.costBreakdown.installationGangLabor.toLocaleString('en-IN')}</span>
                      </div>
                    </div>

                    <span className="text-[11px] font-bold text-purple-300 uppercase tracking-wide block pt-1">
                      D. Factory Overheads &amp; Contingency
                    </span>
                    <div className="space-y-1 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800/80 font-mono text-[11px]">
                      <div className="flex justify-between text-slate-300">
                        <span>Fixed Overhead Absorption (₹350/dr):</span>
                        <span>₹{costResult.costBreakdown.fixedOverheadAbsorption.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between text-amber-300 font-bold">
                        <span>Risk Contingency Buffer:</span>
                        <span>+₹{costResult.costBreakdown.contingencyRiskBuffer.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between text-white font-extrabold border-t border-slate-800 pt-1">
                        <span>Total Cost of Project (COP):</span>
                        <span>₹{costResult.totalCost.toLocaleString('en-IN')}</span>
                      </div>
                    </div>

                    {/* Target Price Guidance */}
                    <div className="bg-slate-950 p-2.5 rounded-lg border border-emerald-800/40 space-y-1 text-[11px]">
                      <span className="text-emerald-400 font-bold uppercase text-[10px] block">
                        Recommended Target Selling Prices
                      </span>
                      <div className="flex justify-between font-mono">
                        <span className="text-slate-400">For 25% Net Margin:</span>
                        <span className="text-white font-bold">₹{costResult.targetPrice25Pct.toLocaleString('en-IN')}</span>
                      </div>
                      <div className="flex justify-between font-mono">
                        <span className="text-slate-400">For 30% Net Margin:</span>
                        <span className="text-emerald-300 font-bold">₹{costResult.targetPrice30Pct.toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 3: LOCATION TAGGING & GEOTAGGED WARRANTY */}
          {activeTab === 'LOCATION_WARRANTY' && (
            <div className="space-y-4">
              <div className="p-3.5 bg-cyan-950/30 border border-cyan-800/40 rounded-xl text-xs space-y-1">
                <div className="flex items-center gap-2 text-cyan-300 font-bold">
                  <MapPin className="w-4 h-4 text-cyan-400" />
                  <span>Geofenced Site Warranty Registration</span>
                </div>
                <p className="text-[11px] text-slate-300 leading-relaxed">
                  Tag the exact building coordinates (\(Lat, Lng\)) for this project. Customers and field technicians can scan the QR code to verify site authenticity before submitting warranty claims or viewing certificates.
                </p>
              </div>

              {/* Coordinates & GPS Capture Controls */}
              <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 space-y-3">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <span className="text-xs font-bold text-white uppercase tracking-wider">
                    Site GPS Coordinates
                  </span>
                  <button
                    type="button"
                    onClick={handleCaptureCurrentGps}
                    disabled={isCapturingGps}
                    className="px-3 py-1.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow"
                  >
                    <Navigation className={`w-3.5 h-3.5 ${isCapturingGps ? 'animate-spin' : ''}`} />
                    <span>{isCapturingGps ? 'Capturing GPS...' : '📍 Capture Current Device Location'}</span>
                  </button>
                </div>

                {gpsCapturedSuccess && (
                  <div className="p-2 bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs rounded-lg flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>Coordinates successfully captured from device GPS!</span>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Latitude</label>
                    <input
                      type="number"
                      step="0.000001"
                      value={latitude}
                      onChange={(e) => setLatitude(parseFloat(e.target.value) || 0)}
                      className="w-full bg-[#131b2e] border border-slate-700 rounded-lg p-2 text-xs font-mono text-cyan-300 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Longitude</label>
                    <input
                      type="number"
                      step="0.000001"
                      value={longitude}
                      onChange={(e) => setLongitude(parseFloat(e.target.value) || 0)}
                      className="w-full bg-[#131b2e] border border-slate-700 rounded-lg p-2 text-xs font-mono text-cyan-300 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">
                      Geofence Radius: <strong className="text-white">{geofenceRadius} meters</strong>
                    </label>
                    <input
                      type="range"
                      min="200"
                      max="2000"
                      step="50"
                      value={geofenceRadius}
                      onChange={(e) => setGeofenceRadius(parseInt(e.target.value, 10))}
                      className="w-full accent-cyan-400 cursor-pointer mt-1"
                    />
                  </div>
                </div>

                {/* Google Maps Preview Link */}
                <div className="flex items-center justify-between text-[11px] pt-1">
                  <span className="text-slate-400 font-mono">
                    Target Site: {latitude.toFixed(4)}° N, {longitude.toFixed(4)}° E
                  </span>
                  <a
                    href={`https://maps.google.com/?q=${latitude},${longitude}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-semibold"
                  >
                    <span>View Pin on Google Maps</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>

              {/* Site Details & Warranty Parameters */}
              <div className="bg-slate-900/70 border border-slate-800 rounded-xl p-4 space-y-3 text-xs">
                <h4 className="font-bold text-white uppercase tracking-wider text-xs">
                  Site Information &amp; Certificate Tenure
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Site / Project Name</label>
                    <input
                      type="text"
                      value={siteName}
                      onChange={(e) => setSiteName(e.target.value)}
                      placeholder="e.g. Karumban Heritage Villa"
                      className="w-full bg-[#131b2e] border border-slate-700 rounded-lg p-2 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Site Address &amp; Panchayat</label>
                    <input
                      type="text"
                      value={siteAddress}
                      onChange={(e) => setSiteAddress(e.target.value)}
                      placeholder="e.g. Near Town Hall, Vengara"
                      className="w-full bg-[#131b2e] border border-slate-700 rounded-lg p-2 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">PIN Code</label>
                    <input
                      type="text"
                      value={pinCode}
                      onChange={(e) => setPinCode(e.target.value)}
                      placeholder="e.g. 676505"
                      className="w-full bg-[#131b2e] border border-slate-700 rounded-lg p-2 text-xs text-white"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Prominent Landmark</label>
                    <input
                      type="text"
                      value={landmark}
                      onChange={(e) => setLandmark(e.target.value)}
                      placeholder="e.g. Opposite Govt School"
                      className="w-full bg-[#131b2e] border border-slate-700 rounded-lg p-2 text-xs text-white"
                    />
                  </div>
                </div>

                <div className="pt-2 flex items-center justify-between border-t border-slate-800">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-300 font-semibold">Warranty Period:</span>
                    <button
                      type="button"
                      onClick={() => setWarrantyYears(10)}
                      className={`px-2.5 py-1 rounded text-xs font-bold cursor-pointer transition ${
                        warrantyYears === 10
                          ? 'bg-amber-500 text-slate-950 font-black'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      10 Years
                    </button>
                    <button
                      type="button"
                      onClick={() => setWarrantyYears(15)}
                      className={`px-2.5 py-1 rounded text-xs font-bold cursor-pointer transition ${
                        warrantyYears === 15
                          ? 'bg-amber-500 text-slate-950 font-black'
                          : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      15 Years (Premium FRP)
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleIssueWarranty}
                    disabled={isIssuingWarranty}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg shadow-md transition cursor-pointer flex items-center gap-1.5"
                  >
                    <Award className="w-4 h-4" />
                    <span>{isIssuingWarranty ? 'Issuing...' : 'Issue Geotagged Warranty'}</span>
                  </button>
                </div>

                {issuedWarrantyCert && (
                  <div className="mt-3 p-3 bg-emerald-950/80 border border-emerald-700/80 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2 text-emerald-300">
                      <Award className="w-5 h-5 text-emerald-400" />
                      <div>
                        <span className="font-extrabold block text-xs">Warranty Certificate Generated!</span>
                        <span className="font-mono text-[11px] text-emerald-200">{issuedWarrantyCert}</span>
                      </div>
                    </div>
                    <a
                      href={`/warranty/${issuedWarrantyCert}`}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition shadow"
                    >
                      <span>Open Verification Portal</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="px-5 py-3 border-t border-slate-800 bg-[#0f172a] flex items-center justify-between">
          <div className="text-[11px] text-slate-400">
            EXMARK Factory Cost &amp; Risk Intelligence &bull; Geofenced Security
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold rounded-lg transition cursor-pointer"
          >
            Close
          </button>
        </div>

      </div>
    </div>
  );
}
