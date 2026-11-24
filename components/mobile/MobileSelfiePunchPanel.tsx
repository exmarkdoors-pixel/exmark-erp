'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  Camera,
  MapPin,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Navigation,
  ShieldCheck,
  Calendar,
  Plus,
  RefreshCw,
  LogIn,
  LogOut,
  FileText,
  Send,
  UserCheck,
} from 'lucide-react';
import { apiFetch } from '@/lib/api/apiClient';
import {
  calculateDistanceMeters,
  captureGeoWatermarkedSelfie,
  reverseGeocodeCoords,
} from '@/lib/utils/geoAttendanceUtils';
import type {
  DailyPunchEvent,
  EmployeeAttendancePolicy,
  FactoryGeofenceConfig,
  LeaveRequestRecord,
} from '@/types/payroll';
import type { CustomerVisitRecord } from '@/types/fieldVisits';

interface MobileSelfiePunchPanelProps {
  employeeId: string;
  employeeCode: string;
  employeeName: string;
  department?: string;
  onOpenCustomerVisitModal: () => void;
  onLiveTrackingToggle?: (active: boolean) => void;
  isLiveTrackingActive?: boolean;
  recentVisits?: CustomerVisitRecord[];
  onRefreshVisits?: () => void;
}

export function MobileSelfiePunchPanel({
  employeeId,
  employeeCode,
  employeeName,
  department = 'Operations',
  onOpenCustomerVisitModal,
  onLiveTrackingToggle,
  isLiveTrackingActive = false,
  recentVisits = [],
}: MobileSelfiePunchPanelProps) {
  const [loading, setLoading] = useState(true);
  const [punch, setPunch] = useState<DailyPunchEvent | null>(null);
  const [policy, setPolicy] = useState<EmployeeAttendancePolicy | null>(null);
  const [geofence, setGeofence] = useState<FactoryGeofenceConfig | null>(null);

  // Live GPS state
  const [coords, setCoords] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [address, setAddress] = useState<string>('Acquiring GPS...');
  const [distanceFromFactory, setDistanceFromFactory] = useState<number | null>(null);
  const [gpsError, setGpsError] = useState<string | null>(null);

  // Camera state
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraAction, setCameraAction] = useState<'IN' | 'OUT'>('IN');
  const [capturedSelfie, setCapturedSelfie] = useState<string | null>(null);
  const [submittingPunch, setSubmittingPunch] = useState(false);
  const [banner, setBanner] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Live shift elapsed ticker
  const [elapsedText, setElapsedText] = useState<string>('00h 00m 00s');

  // Leaves UI
  const [showLeaveForm, setShowLeaveForm] = useState(false);
  const [leaves, setLeaves] = useState<LeaveRequestRecord[]>([]);
  const [leaveFrom, setLeaveFrom] = useState(() =>
    new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
  );
  const [leaveTo, setLeaveTo] = useState(() =>
    new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
  );
  const [leaveType, setLeaveType] = useState<LeaveRequestRecord['leaveType']>('CASUAL');
  const [leaveReason, setLeaveReason] = useState('');
  const [submittingLeave, setSubmittingLeave] = useState(false);

  const notify = (type: 'ok' | 'err', text: string) => {
    setBanner({ type, text });
    setTimeout(() => setBanner(null), 5000);
  };

  const loadPunchAndPolicy = useCallback(async () => {
    setLoading(true);
    try {
      const [punchRes, leavesRes] = await Promise.all([
        apiFetch(`/api/payroll/punch?employeeId=${encodeURIComponent(employeeId)}`),
        apiFetch(`/api/payroll/leaves?employeeId=${encodeURIComponent(employeeId)}`),
      ]);
      const pJson = await punchRes.json();
      if (pJson.success) {
        setPunch(pJson.punch || null);
        setPolicy(pJson.policy || null);
        setGeofence(pJson.geofence || null);
      }
      const lJson = await leavesRes.json();
      if (lJson.success && Array.isArray(lJson.data)) {
        setLeaves(lJson.data);
      }
    } catch {
      notify('err', 'Could not sync attendance status.');
    } finally {
      setLoading(false);
    }
  }, [employeeId]);

  useEffect(() => {
    loadPunchAndPolicy();
  }, [loadPunchAndPolicy]);

  // Refresh live GPS location
  const acquireGps = useCallback(() => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGpsError('Geolocation is not supported on this device.');
      return;
    }
    setGpsError(null);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        const acc = pos.coords.accuracy || 10;
        setCoords({ lat, lng, accuracy: acc });

        if (geofence) {
          const dist = calculateDistanceMeters(lat, lng, geofence.latitude, geofence.longitude);
          setDistanceFromFactory(dist);
        }

        const rev = await reverseGeocodeCoords(lat, lng);
        setAddress(rev);
      },
      (err) => {
        setGpsError(err.message || 'Location permission denied. Enable GPS to punch in.');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );
  }, [geofence]);

  useEffect(() => {
    acquireGps();
  }, [acquireGps]);

  // Update distance if geofence loads after GPS
  useEffect(() => {
    if (coords && geofence) {
      setDistanceFromFactory(
        calculateDistanceMeters(coords.lat, coords.lng, geofence.latitude, geofence.longitude)
      );
    }
  }, [coords, geofence]);

  // Live worked duration timer
  useEffect(() => {
    if (!punch?.punchInTime || punch.punchOutTime) return;
    const updateTicker = () => {
      const start = new Date(punch.punchInTime!).getTime();
      const diff = Math.max(0, Date.now() - start);
      const hrs = Math.floor(diff / 3600000);
      const mins = Math.floor((diff % 3600000) / 60000);
      const secs = Math.floor((diff % 60000) / 1000);
      setElapsedText(
        `${String(hrs).padStart(2, '0')}h ${String(mins).padStart(2, '0')}m ${String(secs).padStart(2, '0')}s`
      );
    };
    updateTicker();
    const timer = setInterval(updateTicker, 1000);
    return () => clearInterval(timer);
  }, [punch?.punchInTime, punch?.punchOutTime]);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  useEffect(() => () => stopCamera(), []);

  const openSelfieCamera = async (action: 'IN' | 'OUT') => {
    setCameraAction(action);
    setCapturedSelfie(null);
    acquireGps();

    if (typeof navigator !== 'undefined' && navigator.mediaDevices?.getUserMedia) {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
          audio: false,
        });
        streamRef.current = stream;
        setCameraActive(true);
        setTimeout(() => {
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
            videoRef.current.play().catch(() => {});
          }
        }, 120);
      } catch {
        notify('err', 'Camera access unavailable. Use "Upload / Camera File" fallback below.');
        setCameraActive(true);
      }
    } else {
      setCameraActive(true);
    }
  };

  const snapSelfie = () => {
    if (!videoRef.current || !coords) {
      notify('err', 'Wait for GPS fix before snapping selfie.');
      return;
    }
    const imgUrl = captureGeoWatermarkedSelfie(videoRef.current, {
      staffName: employeeName,
      staffCode: employeeCode,
      eventLabel: `PUNCH-${cameraAction}`,
      latitude: coords.lat,
      longitude: coords.lng,
      accuracyMeters: coords.accuracy,
      address,
    });
    setCapturedSelfie(imgUrl);
    stopCamera();
  };

  const handleFallbackFileSelfie = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setCapturedSelfie(reader.result);
        stopCamera();
      }
    };
    reader.readAsDataURL(file);
  };

  const submitPunch = async () => {
    if (!coords) {
      notify('err', 'GPS coordinates required. Tap Refresh GPS.');
      return;
    }
    if (!capturedSelfie) {
      notify('err', 'Please snap your geo-tagged selfie first.');
      return;
    }

    setSubmittingPunch(true);
    try {
      const res = await apiFetch('/api/payroll/punch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId,
          action: cameraAction,
          latitude: coords.lat,
          longitude: coords.lng,
          accuracyMeters: coords.accuracy,
          address,
          selfieDataUrl: capturedSelfie,
          device: 'MOBILE_FIELD',
        }),
      });
      const json = await res.json();
      if (json.success) {
        setPunch(json.punch);
        setCapturedSelfie(null);
        notify('ok', `Punch-${cameraAction} recorded with verified GPS selfie!`);
        if (cameraAction === 'IN' && policy?.enableLiveLocationTracking && onLiveTrackingToggle) {
          onLiveTrackingToggle(true);
        } else if (cameraAction === 'OUT' && onLiveTrackingToggle) {
          onLiveTrackingToggle(false);
        }
      } else {
        notify('err', json.error || 'Punch rejected.');
      }
    } catch {
      notify('err', 'Network error while submitting punch.');
    } finally {
      setSubmittingPunch(false);
    }
  };

  const handleApplyLeave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveReason.trim()) return;
    setSubmittingLeave(true);
    try {
      const res = await apiFetch('/api/payroll/leaves', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId,
          employeeCode,
          employeeName,
          department,
          fromDate: leaveFrom,
          toDate: leaveTo,
          leaveType,
          reason: leaveReason,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setLeaves((prev) => [json.leave, ...prev]);
        setLeaveReason('');
        setShowLeaveForm(false);
        notify('ok', 'Leave application submitted for approval.');
      }
    } catch {
      notify('err', 'Failed to submit leave request.');
    } finally {
      setSubmittingLeave(false);
    }
  };

  const isGeofenced = policy?.punchMode !== 'ANY_LOCATION';
  const radius = geofence?.radiusMeters || 200;
  const insideGeofence = distanceFromFactory !== null && distanceFromFactory <= radius;
  const isPunchedIn = Boolean(punch?.punchInTime && !punch?.punchOutTime);
  const isShiftComplete = Boolean(punch?.punchInTime && punch?.punchOutTime);

  return (
    <div className="space-y-3 animate-in fade-in">
      {banner && (
        <div
          className={`p-3 rounded-xl text-xs font-bold flex items-center gap-2 border ${
            banner.type === 'ok'
              ? 'bg-emerald-950/80 border-emerald-500/50 text-emerald-300'
              : 'bg-rose-950/80 border-rose-500/50 text-rose-300'
          }`}
        >
          {banner.type === 'ok' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertTriangle className="w-4 h-4 shrink-0" />}
          <span>{banner.text}</span>
        </div>
      )}

      {/* TotalX Style Attendance Header Card */}
      <div className="bg-gradient-to-br from-[#0F1B35] to-[#0B132B] border border-cyan-500/30 rounded-2xl p-4 shadow-xl space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-cyan-400">
              <UserCheck className="w-3.5 h-3.5" />
              <span>TotalX Smart Attendance</span>
            </div>
            <h2 className="text-base font-black text-white mt-0.5">{employeeName}</h2>
            <p className="text-[11px] text-slate-400 font-mono">
              {employeeCode} • Shift: {policy?.shift.startTime || '08:30'} – {policy?.shift.endTime || '17:30'} ({policy?.shift.standardHours || 9}h)
            </p>
          </div>
          <span
            className={`px-2.5 py-1 rounded-full text-[10px] font-black border ${
              isPunchedIn
                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                : isShiftComplete
                  ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                  : 'bg-slate-800 text-slate-400 border-slate-700'
            }`}
          >
            {isPunchedIn ? 'ON DUTY' : isShiftComplete ? 'SHIFT DONE' : 'NOT PUNCHED'}
          </span>
        </div>

        {/* Policy & Geofence Telemetry Strip */}
        <div className="bg-[#070D1E]/90 rounded-xl p-2.5 border border-slate-800 space-y-1.5 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold uppercase text-slate-400">
              {isGeofenced ? '📍 Location-Based (Factory Geofence)' : '🌐 Any-Location Roaming Mode'}
            </span>
            <button
              type="button"
              onClick={acquireGps}
              className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-bold cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              <span>Refresh GPS</span>
            </button>
          </div>

          {gpsError ? (
            <div className="text-rose-400 text-[11px] font-medium">{gpsError}</div>
          ) : coords ? (
            <div className="space-y-1">
              <div className="text-[11px] text-slate-200 flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="truncate">{address}</span>
              </div>
              <div className="flex items-center justify-between text-[10px] font-mono">
                <span className="text-slate-400">
                  {coords.lat.toFixed(5)}°N, {coords.lng.toFixed(5)}°E (±{Math.round(coords.accuracy)}m)
                </span>
                {isGeofenced && distanceFromFactory !== null && (
                  <span className={insideGeofence ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                    {insideGeofence
                      ? `✓ ${distanceFromFactory}m inside gate`
                      : `✕ ${distanceFromFactory}m away (Max ${radius}m)`}
                  </span>
                )}
              </div>
            </div>
          ) : (
            <div className="text-amber-300 text-[11px] animate-pulse">Locating satellite GPS coordinates...</div>
          )}
        </div>

        {/* Live Shift Timer & Worked Metrics */}
        {punch?.punchInTime && (
          <div className="grid grid-cols-3 gap-2 text-center bg-slate-900/60 border border-slate-800 rounded-xl p-2.5">
            <div>
              <div className="text-[9.5px] text-slate-400 uppercase font-bold">Punch In</div>
              <div className="text-xs font-black text-emerald-400 font-mono">
                {new Date(punch.punchInTime).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', hour12: true })}
              </div>
            </div>
            <div>
              <div className="text-[9.5px] text-slate-400 uppercase font-bold">
                {punch.punchOutTime ? 'Worked' : 'Live Shift'}
              </div>
              <div className="text-xs font-black text-white font-mono">
                {punch.punchOutTime ? `${(punch.workedMinutes / 60).toFixed(1)}h` : elapsedText}
              </div>
            </div>
            <div>
              <div className="text-[9.5px] text-slate-400 uppercase font-bold">Hourly OT</div>
              <div className="text-xs font-black text-purple-400 font-mono">
                +{punch.overtimeHoursCalculated || 0} hrs
              </div>
            </div>
          </div>
        )}

        {/* Camera Modal / Inline Capture */}
        {(cameraActive || capturedSelfie) && (
          <div className="bg-slate-950 border border-cyan-500/40 rounded-xl p-3 space-y-2.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-cyan-300 flex items-center gap-1.5">
                <Camera className="w-4 h-4" />
                Live Geo-Selfie Verification ({cameraAction === 'IN' ? 'Punch In' : 'Punch Out'})
              </span>
              <button
                type="button"
                onClick={() => {
                  stopCamera();
                  setCapturedSelfie(null);
                }}
                className="text-slate-400 hover:text-white text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
            </div>

            {cameraActive && !capturedSelfie && (
              <div className="space-y-2">
                <div className="relative rounded-lg overflow-hidden bg-black aspect-[4/3] border border-slate-800">
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    className="w-full h-full object-cover scale-x-[-1]"
                  />
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={snapSelfie}
                    className="flex-1 py-2.5 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Capture Geo-Tagged Selfie</span>
                  </button>
                  <label className="px-3 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-[11px] font-bold cursor-pointer border border-slate-700">
                    Camera File
                    <input
                      type="file"
                      accept="image/*"
                      capture="user"
                      onChange={handleFallbackFileSelfie}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>
            )}

            {capturedSelfie && (
              <div className="space-y-2">
                <img
                  src={capturedSelfie}
                  alt="Geo-tagged Selfie Preview"
                  className="w-full rounded-lg border border-emerald-500/40"
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => openSelfieCamera(cameraAction)}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Retake
                  </button>
                  <button
                    type="button"
                    disabled={submittingPunch}
                    onClick={submitPunch}
                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>
                      {submittingPunch
                        ? 'Recording Verified Punch...'
                        : `Confirm & Submit Punch-${cameraAction}`}
                    </span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Primary Punch Buttons */}
        {!cameraActive && !capturedSelfie && (
          <div className="grid grid-cols-2 gap-2.5 pt-1">
            {!isPunchedIn && !isShiftComplete && (
              <button
                type="button"
                disabled={loading || (isGeofenced && !insideGeofence && distanceFromFactory !== null)}
                onClick={() => openSelfieCamera('IN')}
                className={`col-span-2 py-3 rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-lg transition cursor-pointer ${
                  isGeofenced && !insideGeofence && distanceFromFactory !== null
                    ? 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed'
                    : 'bg-emerald-600 hover:bg-emerald-500 text-white'
                }`}
              >
                <LogIn className="w-4 h-4" />
                <span>Selfie Punch In</span>
              </button>
            )}

            {isPunchedIn && (
              <button
                type="button"
                disabled={isGeofenced && !insideGeofence && distanceFromFactory !== null}
                onClick={() => openSelfieCamera('OUT')}
                className="col-span-2 py-3 bg-rose-600 hover:bg-rose-500 text-white rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-lg cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>Selfie Punch Out &amp; Compute OT</span>
              </button>
            )}

            {isShiftComplete && (
              <div className="col-span-2 p-2.5 rounded-xl bg-emerald-950/40 border border-emerald-500/30 text-center text-xs text-emerald-300 font-bold">
                ✓ Attendance completed today ({(punch!.workedMinutes / 60).toFixed(2)} hrs worked, {punch!.overtimeHoursCalculated} hrs OT)
              </div>
            )}
          </div>
        )}

        {/* Live GPS Route Tracking Toggle for Field Ops */}
        {onLiveTrackingToggle && (
          <div className="flex items-center justify-between pt-2 border-t border-slate-800 text-xs">
            <div className="flex items-center gap-2">
              <Navigation className={`w-4 h-4 ${isLiveTrackingActive ? 'text-emerald-400 animate-pulse' : 'text-slate-400'}`} />
              <div>
                <div className="font-bold text-white text-[11px]">Live Route History Tracking</div>
                <div className="text-[10px] text-slate-400">Auto-logs route km for Travel Bata</div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onLiveTrackingToggle(!isLiveTrackingActive)}
              className={`px-3 py-1.5 rounded-full text-[11px] font-black transition cursor-pointer ${
                isLiveTrackingActive
                  ? 'bg-emerald-600 text-white shadow'
                  : 'bg-slate-800 text-slate-300 border border-slate-700'
              }`}
            >
              {isLiveTrackingActive ? 'TRACKING ON' : 'OFF'}
            </button>
          </div>
        )}
      </div>

      {/* Field Customer Visit Hub Card */}
      <div className="bg-[#111c34] border border-amber-500/30 rounded-2xl p-4 space-y-3 shadow-lg">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-xs font-black text-amber-300 uppercase flex items-center gap-1.5">
              <MapPin className="w-4 h-4" />
              Field Customer Visit Log
            </h3>
            <p className="text-[10.5px] text-slate-400">
              Add customer details on-site with GPS selfie verification
            </p>
          </div>
          <button
            type="button"
            onClick={onOpenCustomerVisitModal}
            className="px-3 py-2 bg-amber-500 hover:bg-amber-400 text-black font-black text-xs rounded-xl flex items-center gap-1.5 shadow cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Visit</span>
          </button>
        </div>

        {recentVisits.length > 0 ? (
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {recentVisits.map((v) => (
              <div
                key={v.id}
                className="bg-[#070D1E] border border-slate-800 rounded-xl p-2.5 flex items-center gap-2.5 text-xs"
              >
                {v.selfieUrl && (
                  <img
                    src={v.selfieUrl}
                    alt={v.customerName}
                    className="w-12 h-12 rounded-lg object-cover border border-slate-700 shrink-0"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <div className="font-bold text-white truncate">{v.customerName}</div>
                  <div className="text-[10px] text-slate-400 truncate">
                    {v.formattedAddress || v.customerAddress}
                  </div>
                  <div className="text-[9.5px] text-emerald-400 font-mono">
                    {v.stage} • {new Date(v.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-[11px] text-slate-500 text-center py-2 border border-dashed border-slate-800 rounded-xl">
            No customer visits logged today. Tap &quot;Add Visit&quot; at a site.
          </div>
        )}
      </div>

      {/* Leave Application Card */}
      <div className="bg-[#111c34] border border-slate-800 rounded-2xl p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black text-slate-200 uppercase flex items-center gap-1.5">
            <Calendar className="w-4 h-4 text-cyan-400" />
            Leaves &amp; Permissions
          </h3>
          <button
            type="button"
            onClick={() => setShowLeaveForm(!showLeaveForm)}
            className="text-xs font-bold text-cyan-400 hover:text-cyan-300 cursor-pointer"
          >
            {showLeaveForm ? 'Close' : '+ Apply Leave'}
          </button>
        </div>

        {showLeaveForm && (
          <form onSubmit={handleApplyLeave} className="space-y-2.5 bg-[#070D1E] p-3 rounded-xl border border-slate-800 text-xs">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">From Date</label>
                <input
                  type="date"
                  value={leaveFrom}
                  onChange={(e) => setLeaveFrom(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-white"
                  required
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">To Date</label>
                <input
                  type="date"
                  value={leaveTo}
                  onChange={(e) => setLeaveTo(e.target.value)}
                  className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-white"
                  required
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Leave Type</label>
              <select
                value={leaveType}
                onChange={(e) => setLeaveType(e.target.value as LeaveRequestRecord['leaveType'])}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-white"
              >
                <option value="CASUAL">Casual Leave</option>
                <option value="SICK">Sick / Medical Leave</option>
                <option value="HALF_DAY">Half Day</option>
                <option value="PAID">Earned / Paid Leave</option>
              </select>
            </div>
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Reason</label>
              <textarea
                rows={2}
                value={leaveReason}
                onChange={(e) => setLeaveReason(e.target.value)}
                placeholder="Reason for leave..."
                className="w-full bg-slate-900 border border-slate-700 rounded-lg p-1.5 text-white"
                required
              />
            </div>
            <button
              type="submit"
              disabled={submittingLeave}
              className="w-full py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{submittingLeave ? 'Sending...' : 'Submit Leave Request'}</span>
            </button>
          </form>
        )}

        {leaves.length > 0 && (
          <div className="space-y-1.5">
            {leaves.slice(0, 3).map((lv) => (
              <div key={lv.id} className="flex items-center justify-between bg-[#070D1E] px-3 py-2 rounded-lg text-[11px] border border-slate-800">
                <div>
                  <span className="font-bold text-white">{lv.leaveType}</span>
                  <span className="text-slate-400 ml-2 font-mono">{lv.fromDate}</span>
                </div>
                <span
                  className={`px-2 py-0.5 rounded text-[9.5px] font-black ${
                    lv.status === 'APPROVED'
                      ? 'bg-emerald-500/20 text-emerald-300'
                      : lv.status === 'REJECTED'
                        ? 'bg-rose-500/20 text-rose-300'
                        : 'bg-amber-500/20 text-amber-300'
                  }`}
                >
                  {lv.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
