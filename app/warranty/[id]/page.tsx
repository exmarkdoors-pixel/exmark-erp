'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import {
  Award,
  ShieldCheck,
  ShieldAlert,
  MapPin,
  Navigation,
  CheckCircle2,
  AlertTriangle,
  Calendar,
  Building2,
  Clock,
  Phone,
  Printer,
  Sparkles,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  FileText,
  Send,
  Camera,
  Check,
  X,
} from 'lucide-react';
import { GeotaggedWarranty, WarrantyClaimTicket } from '@/lib/types/projectRiskProfit';

export default function WarrantyPublicPortalPage() {
  const params = useParams();
  const certId = (params?.id as string) || '';

  const [warranty, setWarranty] = useState<GeotaggedWarranty | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Location Verification State
  const [isVerifyingLocation, setIsVerifyingLocation] = useState(false);
  const [verificationResult, setVerificationResult] = useState<{
    isVerified: boolean;
    distanceMeters: number;
    geofenceRadiusMeters: number;
    message: string;
  } | null>(null);

  // Claim Form State
  const [isClaimModalOpen, setIsClaimModalOpen] = useState(false);
  const [claimReportedBy, setClaimReportedBy] = useState('');
  const [claimPhone, setClaimPhone] = useState('');
  const [claimCategory, setClaimCategory] = useState<'SURFACE_BUBBLE' | 'EDGE_DELAMINATION' | 'FRAME_WARPING' | 'HARDWARE_LOOSENING' | 'OTHER'>('SURFACE_BUBBLE');
  const [claimDescription, setClaimDescription] = useState('');
  const [claimSubmittedTicket, setClaimSubmittedTicket] = useState<WarrantyClaimTicket | null>(null);
  const [isSubmittingClaim, setIsSubmittingClaim] = useState(false);

  // Fetch warranty on load
  useEffect(() => {
    if (!certId) return;
    let active = true;
    fetch(`/api/warranty/${encodeURIComponent(certId)}`)
      .then((r) => r.json())
      .then((data) => {
        if (active) {
          if (data.success && data.data) {
            setWarranty(data.data);
            setClaimReportedBy(data.data.customerName || '');
            setClaimPhone(data.data.customerPhone || '');
          } else {
            setError(data.error || 'Warranty certificate not found.');
          }
          setLoading(false);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err.message || 'Failed to connect to warranty server.');
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [certId]);

  // Handle GPS location verification
  const handleVerifyLocation = () => {
    if (typeof window === 'undefined' || !navigator.geolocation) {
      alert('Geolocation is not supported by your mobile browser. Please enable GPS permissions.');
      return;
    }

    setIsVerifyingLocation(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          const lat = pos.coords.latitude;
          const lng = pos.coords.longitude;

          const res = await fetch(`/api/warranty/${encodeURIComponent(certId)}/verify-location`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ latitude: lat, longitude: lng }),
          });
          const data = await res.json();
          setIsVerifyingLocation(false);
          if (res.ok && data.success) {
            setVerificationResult({
              isVerified: data.isVerified,
              distanceMeters: data.distanceMeters,
              geofenceRadiusMeters: data.geofenceRadiusMeters,
              message: data.message,
            });
          } else {
            alert(data.error || 'Verification check failed.');
          }
        } catch (err: any) {
          setIsVerifyingLocation(false);
          alert(`Error verifying location: ${err.message}`);
        }
      },
      (err) => {
        setIsVerifyingLocation(false);
        alert(`Could not acquire device GPS: ${err.message}. Please allow location access.`);
      },
      { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 }
    );
  };

  // Submit Claim
  const handleSubmitClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimReportedBy.trim() || !claimDescription.trim()) {
      alert('Please fill in your name and issue description.');
      return;
    }

    setIsSubmittingClaim(true);
    try {
      let coords: { deviceLat?: number; deviceLng?: number } = {};
      if (typeof window !== 'undefined' && navigator.geolocation) {
        try {
          const pos = await new Promise<GeolocationPosition>((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
          });
          coords = { deviceLat: pos.coords.latitude, deviceLng: pos.coords.longitude };
        } catch {
          // continue without coords if user denied
        }
      }

      const res = await fetch(`/api/warranty/${encodeURIComponent(certId)}/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          reportedBy: claimReportedBy,
          contactPhone: claimPhone,
          issueCategory: claimCategory,
          description: claimDescription,
          ...coords,
        }),
      });

      const data = await res.json();
      setIsSubmittingClaim(false);
      if (res.ok && data.success) {
        setClaimSubmittedTicket(data.ticket);
        setIsClaimModalOpen(false);
        // Refresh warranty
        fetch(`/api/warranty/${encodeURIComponent(certId)}`)
          .then((r) => r.json())
          .then((d) => d.success && setWarranty(d.data));
      } else {
        alert(data.error || 'Failed to submit warranty claim.');
      }
    } catch (err: any) {
      setIsSubmittingClaim(false);
      alert(`Error submitting claim: ${err.message}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#070d19] text-white flex flex-col items-center justify-center p-4">
        <Award className="w-12 h-12 text-amber-400 animate-bounce mb-3" />
        <h2 className="text-base font-bold">Verifying EXMARK Digital Warranty Certificate...</h2>
        <p className="text-xs text-slate-400 mt-1">Connecting to factory cryptographic ledger...</p>
      </div>
    );
  }

  if (error || !warranty) {
    return (
      <div className="min-h-screen bg-[#070d19] text-white flex flex-col items-center justify-center p-4">
        <ShieldAlert className="w-14 h-14 text-rose-500 mb-3" />
        <h2 className="text-lg font-bold text-rose-400">Warranty Certificate Not Found</h2>
        <p className="text-xs text-slate-400 mt-1 text-center max-w-sm">
          {error || `No registered warranty record found for certificate "${certId}".`}
        </p>
        <a
          href="/"
          className="mt-4 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition"
        >
          Return to EXMARK Home
        </a>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070d19] text-slate-100 flex flex-col items-center py-6 px-3 sm:px-6">
      {/* Container */}
      <div className="w-full max-w-3xl space-y-5">

        {/* Top Branding Card */}
        <div className="bg-[#0b1325] border border-amber-500/30 rounded-2xl p-5 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-amber-700 text-slate-950 flex items-center justify-center font-black text-xl shadow-lg shrink-0">
              <Award className="w-7 h-7 text-slate-950" />
            </div>
            <div>
              <div className="flex items-center justify-center sm:justify-start gap-2 flex-wrap">
                <h1 className="text-base font-black text-white uppercase tracking-wider">
                  EXMARK DOORS PRIVATE LIMITED
                </h1>
                <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {warranty.warrantyPeriodYears}-Year FRP Warranty
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Official Geotagged Architectural Door Warranty &bull; Malappuram Plant, Kerala
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => window.print()}
            className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs rounded-lg border border-slate-700 transition flex items-center gap-1.5 font-bold cursor-pointer print:hidden shrink-0"
          >
            <Printer className="w-4 h-4 text-amber-400" />
            <span>Print Certificate</span>
          </button>
        </div>

        {/* LOCATION VERIFICATION ACTION HERO BANNER */}
        <div className="bg-gradient-to-br from-slate-900 via-[#0d1629] to-[#0a1222] border border-cyan-800/40 rounded-2xl p-5 shadow-xl space-y-3.5 print:hidden">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <MapPin className="w-4 h-4 text-cyan-400" />
                <h2 className="text-xs font-black text-cyan-300 uppercase tracking-wider">
                  Location-Based Site Authentication
                </h2>
              </div>
              <p className="text-xs text-slate-300">
                Registered Site: <strong>{warranty.siteName}</strong> &bull; {warranty.district}, Kerala (Radius: {warranty.geofenceRadiusMeters || 500}m)
              </p>
            </div>

            <button
              type="button"
              onClick={handleVerifyLocation}
              disabled={isVerifyingLocation}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold rounded-xl shadow-lg transition flex items-center justify-center gap-2 cursor-pointer shrink-0"
            >
              <Navigation className={`w-4 h-4 ${isVerifyingLocation ? 'animate-spin' : ''}`} />
              <span>{isVerifyingLocation ? 'Acquiring GPS...' : '📍 Verify Site Location'}</span>
            </button>
          </div>

          {/* Verification Status Display */}
          {verificationResult ? (
            <div
              className={`p-3.5 rounded-xl border flex items-start gap-3 ${
                verificationResult.isVerified
                  ? 'bg-emerald-950/80 border-emerald-700/80 text-emerald-200'
                  : 'bg-amber-950/80 border-amber-700/80 text-amber-200'
              }`}
            >
              {verificationResult.isVerified ? (
                <ShieldCheck className="w-6 h-6 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0 mt-0.5" />
              )}
              <div className="space-y-1 text-xs">
                <span className="font-extrabold uppercase tracking-wide block">
                  {verificationResult.isVerified ? 'Site Location Authenticated' : 'Site Location Mismatch Warning'}
                </span>
                <p className="leading-relaxed opacity-95">{verificationResult.message}</p>
                <div className="flex items-center gap-2 font-mono text-[11px] opacity-80 pt-0.5">
                  <span>GPS Distance: {verificationResult.distanceMeters} meters</span>
                  <span>&bull;</span>
                  <span>Geofence Limit: {verificationResult.geofenceRadiusMeters} meters</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800/80 text-[11px] text-slate-400 flex items-center justify-between">
              <span>Tap &ldquo;Verify Site Location&rdquo; using your mobile GPS to authenticate site validity.</span>
              <span className="text-cyan-400 font-bold hidden sm:inline">GPS Geofence: 500m</span>
            </div>
          )}
        </div>

        {/* OFFICIAL DIGITAL WARRANTY CERTIFICATE */}
        <div className="bg-[#0b1325] border-2 border-amber-500/40 rounded-2xl p-6 sm:p-8 space-y-6 shadow-2xl relative overflow-hidden print:border-slate-400 print:text-black print:bg-white print:p-4">
          
          {/* Certificate Header Banner */}
          <div className="border-b-2 border-amber-500/30 pb-4 text-center space-y-1.5">
            <span className="text-xs uppercase font-extrabold tracking-widest text-amber-400 print:text-amber-700 block">
              Official Quality Assurance Seal
            </span>
            <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight uppercase print:text-black">
              CERTIFICATE OF QUALITY &amp; WARRANTY
            </h2>
            <div className="font-mono text-xs text-amber-300 font-bold">
              Certificate No: {warranty.certificateNumber}
            </div>
          </div>

          {/* Certificate Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div className="space-y-1 bg-slate-900/60 p-3.5 rounded-xl border border-slate-800 print:border-slate-300 print:bg-slate-50">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Beneficiary &amp; Project Site</span>
              <div className="font-extrabold text-white text-sm print:text-black">{warranty.customerName}</div>
              <div className="text-slate-300 text-xs">{warranty.siteName}</div>
              <div className="text-slate-400 text-[11px]">{warranty.siteAddress}</div>
              {warranty.pinCode && <div className="text-slate-400 text-[11px]">PIN: {warranty.pinCode}</div>}
              {warranty.customerPhone && (
                <div className="text-slate-300 text-[11px] font-mono flex items-center gap-1 pt-1">
                  <Phone className="w-3 h-3 text-emerald-400" />
                  <span>{warranty.customerPhone}</span>
                </div>
              )}
            </div>

            <div className="space-y-1 bg-slate-900/60 p-3.5 rounded-xl border border-slate-800 print:border-slate-300 print:bg-slate-50">
              <span className="text-[10px] uppercase font-bold text-slate-400 block">Tenure &amp; Geotag Coordinates</span>
              <div className="flex items-center justify-between font-mono text-xs pt-1">
                <span className="text-slate-400">Valid From:</span>
                <span className="font-bold text-white print:text-black">{warranty.validFrom}</span>
              </div>
              <div className="flex items-center justify-between font-mono text-xs">
                <span className="text-slate-400">Valid Until:</span>
                <span className="font-bold text-amber-400 print:text-amber-800">{warranty.validUntil}</span>
              </div>
              <div className="flex items-center justify-between font-mono text-xs">
                <span className="text-slate-400">Period:</span>
                <span className="font-bold text-white print:text-black">{warranty.warrantyPeriodYears} Years Full Guarantee</span>
              </div>
              <div className="flex items-center justify-between font-mono text-[11px] pt-1 border-t border-slate-800">
                <span className="text-slate-400">Geotag Pin:</span>
                <span className="text-cyan-300 font-bold">{warranty.coordinates.latitude.toFixed(4)}°N, {warranty.coordinates.longitude.toFixed(4)}°E</span>
              </div>
            </div>
          </div>

          {/* Coverage Scope */}
          <div className="bg-emerald-950/20 border border-emerald-800/40 p-4 rounded-xl space-y-1.5 text-xs">
            <span className="font-bold text-emerald-300 uppercase tracking-wider block">
              1. Scope of Warranty Coverage (ഗ്യാരണ്ടി പരിധി)
            </span>
            <p className="text-slate-200 leading-relaxed">
              {warranty.coverageScope}
            </p>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Exmark FRP doors are certified 100% waterproof, termite-proof, borer-proof, and will not warp, rot, swell, or delaminate under standard residential or commercial interior moisture conditions across Kerala.
            </p>
          </div>

          {/* Covered Doors Schedule */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-white uppercase tracking-wider block">
              2. Covered Doors Schedule ({warranty.coveredDoors.length} Doors)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              {warranty.coveredDoors.map((d, idx) => (
                <div
                  key={idx}
                  className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 flex items-start justify-between gap-2"
                >
                  <div>
                    <span className="font-bold text-white text-xs block">{d.doorNumber}</span>
                    <span className="text-slate-300 text-[11px] block">{d.model}</span>
                    <span className="text-slate-400 text-[10px] block">{d.dimensionsMm} &bull; {d.finishColor}</span>
                    <span className="text-slate-500 text-[10px] block">{d.frameType} &bull; {d.lockType}</span>
                  </div>
                  <span className="font-mono text-[10px] text-cyan-400 bg-cyan-950/60 border border-cyan-800/60 px-1.5 py-0.5 rounded shrink-0">
                    {d.qrSerial || d.doorId}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Exclusions */}
          <div className="space-y-1.5 text-xs border-t border-slate-800 pt-3">
            <span className="font-bold text-rose-300 uppercase tracking-wider block">
              3. Explicit Warranty Exclusions (ബാധകമല്ലാത്തവ)
            </span>
            <ul className="list-disc pl-5 space-y-0.5 text-[11px] text-slate-400">
              {warranty.explicitExclusions.map((ex, i) => (
                <li key={i}>{ex}</li>
              ))}
            </ul>
          </div>

          {/* Care Instructions (English & Malayalam) */}
          <div className="bg-slate-900/70 p-4 rounded-xl border border-slate-800 space-y-3 text-xs">
            <span className="font-bold text-amber-300 uppercase tracking-wider block">
              4. Door Care &amp; Maintenance Guidelines (പരിപാലന നിർദ്ദേശങ്ങൾ)
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-[11px]">
              <div className="space-y-1">
                <span className="font-bold text-slate-200 block">English Guidelines:</span>
                <ul className="list-disc pl-4 space-y-0.5 text-slate-300">
                  {warranty.bilingualCareInstructions.english.map((txt, i) => (
                    <li key={i}>{txt}</li>
                  ))}
                </ul>
              </div>
              <div className="space-y-1">
                <span className="font-bold text-slate-200 block">മലയാളം നിർദ്ദേശങ്ങൾ:</span>
                <ul className="list-disc pl-4 space-y-0.5 text-slate-300">
                  {warranty.bilingualCareInstructions.malayalam.map((txt, i) => (
                    <li key={i}>{txt}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Certificate Footer Seal */}
          <div className="pt-4 border-t-2 border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-400">
            <div>
              <span className="block font-bold text-slate-300">Issued by: {warranty.issuedBy || 'EXMARK Quality Assurance'}</span>
              <span className="text-[10px]">Central Factory, Malappuram, Kerala &bull; Issued on {warranty.issuedAt?.slice(0, 10)}</span>
            </div>
            <div className="text-right">
              <span className="font-mono text-emerald-400 font-bold block text-sm">GUARANTEED AUTHENTIC</span>
              <span className="text-[10px] text-slate-500">Cryptographically Recorded in EXMARK Vault</span>
            </div>
          </div>
        </div>

        {/* 1-CLICK CLAIM / SERVICE REQUEST TRIGGER */}
        <div className="bg-gradient-to-r from-amber-950/40 via-slate-900 to-slate-900 border border-amber-800/40 rounded-2xl p-5 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4 print:hidden">
          <div className="space-y-1 text-center sm:text-left">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Need Door Service or Warranty Claim?
            </h3>
            <p className="text-xs text-slate-300">
              Submit a service ticket directly to the central factory engineering team with geotagged site verification.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setIsClaimModalOpen(true)}
            className="px-5 py-2.5 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black uppercase tracking-wider rounded-xl shadow-lg transition cursor-pointer flex items-center gap-2 shrink-0"
          >
            <ShieldCheck className="w-4 h-4 text-slate-950" />
            <span>Submit Service Request / Claim</span>
          </button>
        </div>

        {/* Claim History List (if any exist) */}
        {warranty.claimsHistory && warranty.claimsHistory.length > 0 && (
          <div className="bg-[#0b1325] border border-slate-800 rounded-2xl p-5 space-y-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-400" />
              <span>Service &amp; Inspection History ({warranty.claimsHistory.length} Tickets)</span>
            </h3>

            <div className="space-y-2 text-xs">
              {warranty.claimsHistory.map((t) => (
                <div
                  key={t.ticketId}
                  className="bg-slate-900/60 p-3 rounded-xl border border-slate-800 flex items-start justify-between gap-3"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-amber-300">{t.ticketId}</span>
                      <span className="text-slate-400">&bull; {t.reportedDate}</span>
                      <span className={`px-2 py-0.2 rounded text-[9px] font-bold ${
                        t.status === 'RESOLVED' ? 'bg-emerald-950 text-emerald-300 border border-emerald-800' :
                        t.status === 'INSPECTION_SCHEDULED' ? 'bg-cyan-950 text-cyan-300 border border-cyan-800' :
                        'bg-amber-950 text-amber-300 border border-amber-800'
                      }`}>
                        {t.status}
                      </span>
                    </div>
                    <p className="text-slate-200 text-xs">{t.description}</p>
                    <p className="text-[10px] text-slate-400">
                      Reported by {t.reportedBy} ({t.contactPhone}) &bull; {t.technicianNotes}
                    </p>
                  </div>

                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold shrink-0 ${
                    t.isLocationVerified ? 'bg-emerald-950 text-emerald-300' : 'bg-rose-950 text-rose-300'
                  }`}>
                    {t.isLocationVerified ? '✓ Site Verified' : 'Location Mismatch'}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* SERVICE CLAIM MODAL */}
      {isClaimModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="bg-[#0b1222] border border-slate-800 rounded-2xl w-full max-w-lg shadow-2xl p-6 space-y-4 text-slate-200">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-amber-400 font-bold text-sm uppercase">
                <ShieldAlert className="w-5 h-5" />
                <span>Submit Warranty Service Ticket</span>
              </div>
              <button
                type="button"
                onClick={() => setIsClaimModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmitClaim} className="space-y-3.5 text-xs">
              <div>
                <label className="block text-[10px] text-slate-400 font-bold mb-1">Your Name</label>
                <input
                  type="text"
                  required
                  value={claimReportedBy}
                  onChange={(e) => setClaimReportedBy(e.target.value)}
                  className="w-full bg-[#131b2e] border border-slate-700 rounded-lg p-2 text-xs text-white"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 font-bold mb-1">Contact Phone Number</label>
                <input
                  type="tel"
                  required
                  value={claimPhone}
                  onChange={(e) => setClaimPhone(e.target.value)}
                  className="w-full bg-[#131b2e] border border-slate-700 rounded-lg p-2 text-xs text-white font-mono"
                />
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 font-bold mb-1">Issue Category</label>
                <select
                  value={claimCategory}
                  onChange={(e) => setClaimCategory(e.target.value as any)}
                  className="w-full bg-[#131b2e] border border-slate-700 rounded-lg p-2 text-xs text-white"
                >
                  <option value="SURFACE_BUBBLE">Surface Finish Bubble / Paint Peeling</option>
                  <option value="EDGE_DELAMINATION">Door Edge Trimming or Delamination</option>
                  <option value="FRAME_WARPING">WPC Frame Fitting or Rebate Alignment</option>
                  <option value="HARDWARE_LOOSENING">Lock Hardware / Hinge Operation</option>
                  <option value="OTHER">Other Manufacturing Inquiry</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] text-slate-400 font-bold mb-1">Description of Issue</label>
                <textarea
                  required
                  rows={3}
                  value={claimDescription}
                  onChange={(e) => setClaimDescription(e.target.value)}
                  placeholder="Describe the door issue, location on the door, and building floor..."
                  className="w-full bg-[#131b2e] border border-slate-700 rounded-lg p-2 text-xs text-white"
                />
              </div>

              <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 text-[11px] text-slate-400 flex items-center gap-2">
                <Navigation className="w-4 h-4 text-cyan-400 shrink-0" />
                <span>Your device GPS will be automatically recorded to verify site authenticity.</span>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsClaimModalOpen(false)}
                  className="px-3.5 py-1.5 text-xs text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingClaim}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg shadow transition flex items-center gap-1.5 cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>{isSubmittingClaim ? 'Submitting...' : 'Submit Claim'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Claim Submission Success Banner */}
      {claimSubmittedTicket && (
        <div className="fixed bottom-5 right-5 z-50 p-4 bg-emerald-950 border-2 border-emerald-500 text-emerald-200 rounded-2xl shadow-2xl flex items-center gap-3 animate-slide-up max-w-md">
          <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0" />
          <div className="text-xs space-y-0.5">
            <span className="font-bold block text-white">Service Request Registered!</span>
            <span className="font-mono text-emerald-300">Ticket: {claimSubmittedTicket.ticketId}</span>
            <p className="text-[11px] text-slate-300">The factory inspection team has been notified.</p>
          </div>
          <button
            type="button"
            onClick={() => setClaimSubmittedTicket(null)}
            className="p-1 hover:bg-emerald-900/60 rounded"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
