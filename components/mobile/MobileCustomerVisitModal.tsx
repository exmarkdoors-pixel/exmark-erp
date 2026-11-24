'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Camera,
  MapPin,
  UserPlus,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { apiFetch } from '@/lib/api/apiClient';
import {
  captureGeoWatermarkedSelfie,
  reverseGeocodeCoords,
} from '@/lib/utils/geoAttendanceUtils';
import type { CustomerVisitRecord, CustomerVisitStage } from '@/types/fieldVisits';

interface MobileCustomerVisitModalProps {
  isOpen: boolean;
  onClose: () => void;
  staffId: string;
  staffCode: string;
  staffName: string;
  staffRole: string;
  onVisitLogged: (visit: CustomerVisitRecord) => void;
}

export function MobileCustomerVisitModal({
  isOpen,
  onClose,
  staffId,
  staffCode,
  staffName,
  staffRole,
  onVisitLogged,
}: MobileCustomerVisitModalProps) {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [siteType, setSiteType] = useState<CustomerVisitRecord['siteType']>('VILLA');
  const [stage, setStage] = useState<CustomerVisitStage>('SITE_SURVEY');
  const [doorCount, setDoorCount] = useState('');
  const [followUpDate, setFollowUpDate] = useState('');
  const [notes, setNotes] = useState('');
  const [autoCreateCrm, setAutoCreateCrm] = useState(true);

  const [coords, setCoords] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [formattedAddress, setFormattedAddress] = useState('Detecting GPS address...');
  const [gpsLoading, setGpsLoading] = useState(false);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [selfieUrl, setSelfieUrl] = useState<string | null>(null);

  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const fetchGps = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) return;
    setGpsLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        setCoords({ lat, lng, accuracy: pos.coords.accuracy || 10 });
        const rev = await reverseGeocodeCoords(lat, lng);
        setFormattedAddress(rev);
        if (!customerAddress.trim()) setCustomerAddress(rev);
        setGpsLoading(false);
      },
      () => {
        setFormattedAddress('Location permission denied');
        setGpsLoading(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  useEffect(() => {
    if (isOpen) {
      fetchGps();
    } else {
      stopCamera();
    }
    return () => stopCamera();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraOpen(false);
  };

  const startCamera = async () => {
    setErrorMsg(null);
    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });
        streamRef.current = stream;
        setCameraOpen(true);
        setTimeout(() => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(() => {});
          }
        }, 120);
      } catch {
        setCameraOpen(true);
      }
    } else {
      setCameraOpen(true);
    }
  };

  const captureSelfie = () => {
    if (!videoRef.current || !coords) {
      setErrorMsg('Wait for GPS fix before snapping geo-selfie.');
      return;
    }
    const img = captureGeoWatermarkedSelfie(videoRef.current, {
      staffName,
      staffCode,
      eventLabel: `VISIT: ${customerName || 'Client Site'}`,
      latitude: coords.lat,
      longitude: coords.lng,
      accuracyMeters: coords.accuracy,
      address: formattedAddress,
    });
    setSelfieUrl(img);
    stopCamera();
  };

  const handleFallbackFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setSelfieUrl(reader.result);
        stopCamera();
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!customerName.trim()) {
      setErrorMsg('Please enter customer name.');
      return;
    }
    if (!selfieUrl) {
      setErrorMsg('Please capture a geo-tagged site selfie before saving.');
      return;
    }

    setSaving(true);
    try {
      const res = await apiFetch('/api/field-service/visits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          staffId,
          staffCode,
          staffName,
          staffRole,
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          customerAddress: customerAddress.trim() || formattedAddress,
          latitude: coords?.lat || 11.0512,
          longitude: coords?.lng || 75.9928,
          accuracyMeters: coords?.accuracy,
          formattedAddress,
          selfieUrl,
          siteType,
          stage,
          doorCountEstimate: doorCount ? Number(doorCount) : undefined,
          followUpDate: followUpDate || undefined,
          requirementsNotes: notes.trim() || undefined,
          autoCreateCustomerInCrm: autoCreateCrm,
        }),
      });
      const json = await res.json();
      if (json.success && json.visit) {
        onVisitLogged(json.visit);
        setCustomerName('');
        setCustomerPhone('');
        setCustomerAddress('');
        setDoorCount('');
        setNotes('');
        setSelfieUrl(null);
        onClose();
      } else {
        setErrorMsg(json.error || 'Failed to save site visit.');
      }
    } catch {
      setErrorMsg('Network error submitting visit.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-slate-950/90 backdrop-blur-sm overflow-y-auto">
      <div className="bg-[#0B132B] border border-amber-500/40 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden text-slate-100 my-auto">
        <div className="px-4 py-3 border-b border-slate-800 flex items-center justify-between bg-slate-900">
          <div className="flex items-center gap-2">
            <UserPlus className="w-4 h-4 text-amber-400" />
            <h3 className="text-sm font-black text-white">Log Customer Visit &amp; Geo-Selfie</h3>
          </div>
          <button type="button" onClick={onClose} className="p-1 text-slate-400 hover:text-white cursor-pointer">
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3 text-xs max-h-[82vh] overflow-y-auto">
          {errorMsg && (
            <div className="p-2.5 rounded-xl bg-rose-950/80 border border-rose-500/40 text-rose-300 flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* GPS Location Strip */}
          <div className="bg-[#070D1E] border border-slate-800 rounded-xl p-2.5 space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-emerald-400 uppercase flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                Live Site Coordinates
              </span>
              <button
                type="button"
                onClick={fetchGps}
                className="text-[10px] text-cyan-400 flex items-center gap-1 font-bold cursor-pointer"
              >
                <RefreshCw className={`w-3 h-3 ${gpsLoading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
            </div>
            <div className="text-[11px] text-slate-200 truncate">{formattedAddress}</div>
            {coords && (
              <div className="text-[10px] font-mono text-slate-400">
                {coords.lat.toFixed(5)}°N, {coords.lng.toFixed(5)}°E (±{Math.round(coords.accuracy)}m)
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[10.5px] text-slate-400 mb-1">Customer / Owner Name *</label>
              <input
                type="text"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="e.g. Mr. Shareef Villa"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
              />
            </div>
            <div>
              <label className="block text-[10.5px] text-slate-400 mb-1">Phone / WhatsApp</label>
              <input
                type="tel"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
                placeholder="+91 9847..."
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white font-mono"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10.5px] text-slate-400 mb-1">Site Address / Landmark</label>
            <input
              type="text"
              value={customerAddress}
              onChange={(e) => setCustomerAddress(e.target.value)}
              placeholder="Location address"
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[10.5px] text-slate-400 mb-1">Site Type</label>
              <select
                value={siteType}
                onChange={(e) => setSiteType(e.target.value as CustomerVisitRecord['siteType'])}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
              >
                <option value="VILLA">Residential Villa</option>
                <option value="APARTMENT">Apartment / Flat</option>
                <option value="BUILDER_PROJECT">Builder Project</option>
                <option value="COMMERCIAL">Commercial Complex</option>
                <option value="RENOVATION">Renovation</option>
              </select>
            </div>
            <div>
              <label className="block text-[10.5px] text-slate-400 mb-1">Visit Stage</label>
              <select
                value={stage}
                onChange={(e) => setStage(e.target.value as CustomerVisitStage)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
              >
                <option value="NEW_LEAD">New Lead Inquiry</option>
                <option value="SITE_SURVEY">Site Survey</option>
                <option value="MEASUREMENT_TAKEN">Measurement Taken</option>
                <option value="QUOTATION_SHARED">Quotation Discussed</option>
                <option value="PAYMENT_FOLLOWUP">Payment Follow-up</option>
                <option value="DISPATCH_DELIVERED">Order Delivered</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-[10.5px] text-slate-400 mb-1">Est. Door Count</label>
              <input
                type="number"
                min="1"
                value={doorCount}
                onChange={(e) => setDoorCount(e.target.value)}
                placeholder="e.g. 12"
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
              />
            </div>
            <div>
              <label className="block text-[10.5px] text-slate-400 mb-1">Next Follow-Up Date</label>
              <input
                type="date"
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10.5px] text-slate-400 mb-1">Requirements / Discussion Notes</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Door models discussed, customer preference..."
              className="w-full bg-slate-900 border border-slate-700 rounded-lg p-2 text-white"
            />
          </div>

          {/* Geo-Tagged Selfie Capture Section */}
          <div className="bg-slate-950 border border-slate-800 rounded-xl p-3 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-amber-300 flex items-center gap-1.5">
                <Camera className="w-4 h-4" />
                Site Verification Geo-Selfie *
              </span>
              {!cameraOpen && (
                <button
                  type="button"
                  onClick={startCamera}
                  className="px-2.5 py-1 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-bold text-[11px] cursor-pointer"
                >
                  {selfieUrl ? 'Retake Selfie' : 'Open Camera'}
                </button>
              )}
            </div>

            {cameraOpen && (
              <div className="space-y-2">
                <div className="rounded-lg overflow-hidden bg-black aspect-[4/3] border border-slate-800">
                  <video ref={videoRef} playsInline muted className="w-full h-full object-cover scale-x-[-1]" />
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={captureSelfie}
                    className="flex-1 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg cursor-pointer"
                  >
                    Snap Watermarked Selfie
                  </button>
                  <label className="px-3 py-2 bg-slate-800 text-slate-300 rounded-lg cursor-pointer text-[11px]">
                    Upload File
                    <input type="file" accept="image/*" capture="user" onChange={handleFallbackFile} className="hidden" />
                  </label>
                </div>
              </div>
            )}

            {selfieUrl && !cameraOpen && (
              <img src={selfieUrl} alt="Site Visit Selfie" className="w-full rounded-lg border border-emerald-500/40" />
            )}
          </div>

          <label className="flex items-center gap-2 text-[11px] text-slate-300 cursor-pointer">
            <input
              type="checkbox"
              checked={autoCreateCrm}
              onChange={(e) => setAutoCreateCrm(e.target.checked)}
              className="rounded text-amber-500"
            />
            <span>Automatically save/link customer to ERP Master Ledger</span>
          </label>

          <button
            type="submit"
            disabled={saving}
            className="w-full py-3 bg-amber-500 hover:bg-amber-400 text-black font-black text-xs rounded-xl flex items-center justify-center gap-1.5 shadow-lg cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{saving ? 'Uploading Visit & Geo-Selfie...' : 'Save Customer Site Visit'}</span>
          </button>
        </form>
      </div>
    </div>
  );
}
