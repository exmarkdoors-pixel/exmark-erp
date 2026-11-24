'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  MapPin,
  Navigation,
  ExternalLink,
  Calendar,
  RefreshCw,
  Clock,
  Phone,
  Camera,
  CheckCircle2,
  Route,
  User,
} from 'lucide-react';
import { apiFetch } from '@/lib/api/apiClient';
import type { StaffDailyRouteLog, CustomerVisitRecord } from '@/types/fieldVisits';
import type { FactoryGeofenceConfig } from '@/types/payroll';

interface StaffOption {
  id: string;
  employeeCode: string;
  name: string;
  role: string;
}

interface StaffGMapRouteVisualizerProps {
  employees: StaffOption[];
  geofence?: FactoryGeofenceConfig | null;
  onApplyTravelBata?: (employeeId: string, bataAmount: number) => void;
}

export function StaffGMapRouteVisualizer({
  employees,
  geofence,
  onApplyTravelBata,
}: StaffGMapRouteVisualizerProps) {
  const [selectedStaffId, setSelectedStaffId] = useState<string>(employees[0]?.id || '');
  const [selectedDate, setSelectedDate] = useState<string>(() =>
    new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' })
  );
  const [routeLog, setRouteLog] = useState<StaffDailyRouteLog | null>(null);
  const [allVisitsToday, setAllVisitsToday] = useState<CustomerVisitRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedPhotoPreview, setSelectedPhotoPreview] = useState<string | null>(null);

  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapInstanceRef = useRef<unknown>(null);

  useEffect(() => {
    if (!selectedStaffId && employees.length > 0) {
      setSelectedStaffId(employees[0].id);
    }
  }, [employees, selectedStaffId]);

  const loadRouteAndVisits = useCallback(async () => {
    if (!selectedStaffId) return;
    setLoading(true);
    try {
      const [trackRes, visitsRes] = await Promise.all([
        apiFetch(`/api/tracking/location?staffId=${encodeURIComponent(selectedStaffId)}&date=${selectedDate}`),
        apiFetch(`/api/field-service/visits?date=${selectedDate}`),
      ]);
      const tJson = await trackRes.json();
      if (tJson.success && tJson.routeLog) {
        setRouteLog(tJson.routeLog);
      }
      const vJson = await visitsRes.json();
      if (vJson.success && Array.isArray(vJson.data)) {
        setAllVisitsToday(vJson.data);
      }
    } catch (err) {
      console.warn('Route fetch failed:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedStaffId, selectedDate]);

  useEffect(() => {
    loadRouteAndVisits();
  }, [loadRouteAndVisits]);

  // Dynamically load Leaflet interactive map so route polyline & geo-selfie pins render zero-key
  useEffect(() => {
    if (typeof window === 'undefined' || !mapContainerRef.current) return;

    const initMap = () => {
      const L = (window as unknown as { L?: any }).L;
      if (!L || !mapContainerRef.current) return;

      if (mapInstanceRef.current) {
        try {
          (mapInstanceRef.current as any).remove();
        } catch {
          // ignore
        }
        mapInstanceRef.current = null;
      }

      const centerLat =
        routeLog?.punchInLocation?.lat ||
        routeLog?.waypoints?.[0]?.latitude ||
        routeLog?.visits?.[0]?.location.latitude ||
        geofence?.latitude ||
        11.0512;
      const centerLng =
        routeLog?.punchInLocation?.lng ||
        routeLog?.waypoints?.[0]?.longitude ||
        routeLog?.visits?.[0]?.location.longitude ||
        geofence?.longitude ||
        75.9928;

      const map = L.map(mapContainerRef.current).setView([centerLat, centerLng], 13);
      mapInstanceRef.current = map;

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors',
        maxZoom: 19,
      }).addTo(map);

      // Draw Factory Geofence Perimeter
      if (geofence) {
        L.circle([geofence.latitude, geofence.longitude], {
          color: '#10B981',
          fillColor: '#10B981',
          fillOpacity: 0.12,
          radius: geofence.radiusMeters || 200,
        })
          .addTo(map)
          .bindPopup(`<b>${geofence.factoryName}</b><br/>Geofence Radius: ${geofence.radiusMeters}m`);
      }

      const boundsPoints: [number, number][] = [];

      // Punch-In Marker
      if (routeLog?.punchInLocation) {
        const pt: [number, number] = [routeLog.punchInLocation.lat, routeLog.punchInLocation.lng];
        boundsPoints.push(pt);
        L.circleMarker(pt, {
          radius: 9,
          color: '#065F46',
          fillColor: '#10B981',
          fillOpacity: 1,
          weight: 3,
        })
          .addTo(map)
          .bindPopup(
            `<b>START: Morning Punch-In</b><br/>${routeLog.punchInLocation.address}<br/>${
              routeLog.punchInTime ? new Date(routeLog.punchInTime).toLocaleTimeString('en-IN') : ''
            }`
          );
      }

      // Blue Polyline Route Trail
      if (routeLog && routeLog.waypoints.length > 0) {
        const pathCoords: [number, number][] = [];
        if (routeLog.punchInLocation) {
          pathCoords.push([routeLog.punchInLocation.lat, routeLog.punchInLocation.lng]);
        }
        routeLog.waypoints.forEach((w) => {
          const p: [number, number] = [w.latitude, w.longitude];
          pathCoords.push(p);
          boundsPoints.push(p);
        });
        if (routeLog.punchOutLocation) {
          pathCoords.push([routeLog.punchOutLocation.lat, routeLog.punchOutLocation.lng]);
        }
        if (pathCoords.length >= 2) {
          L.polyline(pathCoords, {
            color: '#2563EB',
            weight: 4,
            opacity: 0.85,
          }).addTo(map);
        }
      }

      // Customer Visit Pins
      (routeLog?.visits || []).forEach((v, idx) => {
        const pt: [number, number] = [v.location.latitude, v.location.longitude];
        boundsPoints.push(pt);
        L.circleMarker(pt, {
          radius: 10,
          color: '#991B1B',
          fillColor: '#F59E0B',
          fillOpacity: 1,
          weight: 2,
        })
          .addTo(map)
          .bindPopup(
            `<div style="min-width:170px">
              <b>#${idx + 1}: ${v.customerName}</b><br/>
              <small>${v.customerPhone || ''}</small><br/>
              <small>${v.formattedAddress}</small><br/>
              <small>Time: ${new Date(v.createdAt).toLocaleTimeString('en-IN')}</small>
            </div>`
          );
      });

      // Punch-Out Marker
      if (routeLog?.punchOutLocation) {
        const pt: [number, number] = [routeLog.punchOutLocation.lat, routeLog.punchOutLocation.lng];
        boundsPoints.push(pt);
        L.circleMarker(pt, {
          radius: 9,
          color: '#7F1D1D',
          fillColor: '#EF4444',
          fillOpacity: 1,
          weight: 3,
        })
          .addTo(map)
          .bindPopup(
            `<b>END: Punch-Out</b><br/>${routeLog.punchOutLocation.address}<br/>${
              routeLog.punchOutTime ? new Date(routeLog.punchOutTime).toLocaleTimeString('en-IN') : ''
            }`
          );
      }

      if (boundsPoints.length >= 2) {
        map.fitBounds(boundsPoints, { padding: [35, 35] });
      }
    };

    const existingLeaflet = (window as unknown as { L?: unknown }).L;
    if (existingLeaflet) {
      initMap();
    } else {
      if (!document.getElementById('leaflet-css-cdn')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css-cdn';
        link.rel = 'stylesheet';
        link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
      }
      if (!document.getElementById('leaflet-js-cdn')) {
        const script = document.createElement('script');
        script.id = 'leaflet-js-cdn';
        script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
        script.async = true;
        script.onload = initMap;
        document.body.appendChild(script);
      } else {
        const timer = setTimeout(initMap, 500);
        return () => clearTimeout(timer);
      }
    }

    return () => {
      if (mapInstanceRef.current) {
        try {
          (mapInstanceRef.current as any).remove();
        } catch {
          // ignore
        }
        mapInstanceRef.current = null;
      }
    };
  }, [routeLog, geofence]);

  // Build Google Maps multi-stop deep link
  const buildGoogleMapsRouteUrl = (): string => {
    const pts: string[] = [];
    if (routeLog?.punchInLocation) {
      pts.push(`${routeLog.punchInLocation.lat},${routeLog.punchInLocation.lng}`);
    }
    (routeLog?.visits || []).forEach((v) => {
      pts.push(`${v.location.latitude},${v.location.longitude}`);
    });
    if (routeLog?.punchOutLocation) {
      pts.push(`${routeLog.punchOutLocation.lat},${routeLog.punchOutLocation.lng}`);
    }
    if (pts.length === 0 && routeLog?.waypoints && routeLog.waypoints.length > 0) {
      const first = routeLog.waypoints[0];
      const last = routeLog.waypoints[routeLog.waypoints.length - 1];
      pts.push(`${first.latitude},${first.longitude}`);
      pts.push(`${last.latitude},${last.longitude}`);
    }
    if (pts.length === 0) {
      const lat = geofence?.latitude || 11.0512;
      const lng = geofence?.longitude || 75.9928;
      return `https://www.google.com/maps?q=${lat},${lng}`;
    }
    if (pts.length === 1) {
      return `https://www.google.com/maps?q=${pts[0]}`;
    }
    return `https://www.google.com/maps/dir/${pts.slice(0, 10).join('/')}`;
  };

  return (
    <div className="space-y-4">
      {/* Control Strip */}
      <div className="bg-white dark:bg-[#0B132B] p-4 rounded-2xl border border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Field / Factory Staff</label>
            <select
              value={selectedStaffId}
              onChange={(e) => setSelectedStaffId(e.target.value)}
              className="bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5 text-xs font-bold text-slate-900 dark:text-white"
            >
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name} ({e.employeeCode})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-bold uppercase text-slate-400 mb-1">Date</label>
            <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-1.5">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-900 dark:text-white focus:outline-hidden"
              />
            </div>
          </div>

          <button
            type="button"
            onClick={loadRouteAndVisits}
            className="mt-4 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Trail</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="px-3 py-1.5 rounded-xl bg-blue-500/15 border border-blue-500/30 text-xs">
            <span className="text-slate-400 mr-1.5">Distance:</span>
            <span className="font-black text-blue-400 font-mono">
              {routeLog?.totalDistanceKm || 0} km
            </span>
          </div>
          <div className="px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-xs">
            <span className="text-slate-400 mr-1.5">Est. Travel Bata:</span>
            <span className="font-black text-emerald-400 font-mono">
              ₹{routeLog?.estimatedTravelBata || 0}
            </span>
          </div>
          {onApplyTravelBata && routeLog && routeLog.estimatedTravelBata > 0 && (
            <button
              type="button"
              onClick={() => onApplyTravelBata(routeLog.staffId, routeLog.estimatedTravelBata)}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold cursor-pointer"
            >
              Approve Travel Bata
            </button>
          )}
          <a
            href={buildGoogleMapsRouteUrl()}
            target="_blank"
            rel="noopener noreferrer"
            className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-black rounded-xl text-xs font-black flex items-center gap-1.5 shadow cursor-pointer"
          >
            <Navigation className="w-3.5 h-3.5" />
            <span>Open Route in Google Maps</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Interactive Route Map + Chronological Timeline Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white dark:bg-[#0B132B] rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-lg flex flex-col">
          <div className="px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between text-xs bg-slate-50 dark:bg-slate-900/60">
            <span className="font-bold text-slate-800 dark:text-white flex items-center gap-1.5">
              <Route className="w-4 h-4 text-blue-500" />
              Live GPS Breadcrumb Trail &amp; Customer Visit Pins
            </span>
            <span className="text-[11px] font-mono text-slate-400">
              {routeLog?.waypoints.length || 0} GPS Pings • {routeLog?.visits.length || 0} Site Visits
            </span>
          </div>
          <div ref={mapContainerRef} className="w-full h-[380px] bg-slate-900 z-10" />
        </div>

        {/* Chronological Stop Timeline */}
        <div className="bg-white dark:bg-[#0B132B] rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-3 overflow-y-auto max-h-[430px]">
          <h4 className="text-xs font-black uppercase text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            Chronological Timeline ({selectedDate})
          </h4>

          {routeLog?.punchInTime && (
            <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-start gap-2.5 text-xs">
              {routeLog.punchInSelfie && (
                <img
                  src={routeLog.punchInSelfie}
                  alt="Punch In Selfie"
                  onClick={() => setSelectedPhotoPreview(routeLog.punchInSelfie || null)}
                  className="w-12 h-12 rounded-lg object-cover border border-emerald-500/40 cursor-pointer shrink-0"
                />
              )}
              <div className="min-w-0 flex-1">
                <div className="font-black text-emerald-400">🟢 Morning Punch-In</div>
                <div className="text-[10.5px] text-slate-300 font-mono">
                  {new Date(routeLog.punchInTime).toLocaleTimeString('en-IN')}
                </div>
                <div className="text-[10px] text-slate-400 truncate">
                  {routeLog.punchInLocation?.address}
                </div>
              </div>
            </div>
          )}

          {(routeLog?.visits || []).map((v, idx) => (
            <div
              key={v.id}
              className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5 text-xs"
            >
              {v.selfieUrl && (
                <img
                  src={v.selfieUrl}
                  alt={v.customerName}
                  onClick={() => setSelectedPhotoPreview(v.selfieUrl)}
                  className="w-12 h-12 rounded-lg object-cover border border-amber-500/40 cursor-pointer shrink-0"
                />
              )}
              <div className="min-w-0 flex-1">
                <div className="font-black text-amber-300">
                  📍 Visit #{idx + 1}: {v.customerName}
                </div>
                <div className="text-[10px] text-slate-300 font-mono">
                  {new Date(v.createdAt).toLocaleTimeString('en-IN')} • {v.customerPhone || 'No Phone'}
                </div>
                <div className="text-[10px] text-slate-400 truncate">{v.formattedAddress}</div>
                {v.requirementsNotes && (
                  <div className="text-[10px] text-cyan-300 mt-1 italic">&quot;{v.requirementsNotes}&quot;</div>
                )}
              </div>
            </div>
          ))}

          {routeLog?.punchOutTime && (
            <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-xs">
              {routeLog.punchOutSelfie && (
                <img
                  src={routeLog.punchOutSelfie}
                  alt="Punch Out Selfie"
                  onClick={() => setSelectedPhotoPreview(routeLog.punchOutSelfie || null)}
                  className="w-12 h-12 rounded-lg object-cover border border-rose-500/40 cursor-pointer shrink-0"
                />
              )}
              <div className="min-w-0 flex-1">
                <div className="font-black text-rose-400">🔴 Evening Punch-Out</div>
                <div className="text-[10.5px] text-slate-300 font-mono">
                  {new Date(routeLog.punchOutTime).toLocaleTimeString('en-IN')}
                </div>
                <div className="text-[10px] text-slate-400 truncate">
                  {routeLog.punchOutLocation?.address}
                </div>
              </div>
            </div>
          )}

          {!routeLog?.punchInTime && (routeLog?.visits || []).length === 0 && (
            <div className="text-center py-8 text-xs text-slate-500">
              No route pings or customer visits recorded for this staff member on {selectedDate}.
            </div>
          )}
        </div>
      </div>

      {/* All Field Visits Table Across Team Today */}
      <div className="bg-white dark:bg-[#0B132B] rounded-2xl border border-slate-200 dark:border-slate-800 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-black uppercase text-slate-600 dark:text-slate-300 flex items-center gap-1.5">
            <Camera className="w-4 h-4 text-amber-400" />
            All Geo-Tagged Customer Visits ({selectedDate})
          </h4>
          <span className="text-[11px] font-mono text-slate-400">{allVisitsToday.length} Total Visits</span>
        </div>

        <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-100 dark:bg-slate-900 text-slate-500 font-bold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-2.5">Selfie</th>
                <th className="p-2.5">Field Staff</th>
                <th className="p-2.5">Customer &amp; Phone</th>
                <th className="p-2.5">Verified GPS Address</th>
                <th className="p-2.5">Stage &amp; Notes</th>
                <th className="p-2.5 text-center">Map</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {allVisitsToday.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center text-slate-400">
                    No customer visits logged for {selectedDate}.
                  </td>
                </tr>
              ) : (
                allVisitsToday.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30">
                    <td className="p-2.5">
                      {v.selfieUrl ? (
                        <img
                          src={v.selfieUrl}
                          alt={v.customerName}
                          onClick={() => setSelectedPhotoPreview(v.selfieUrl)}
                          className="w-12 h-12 rounded-lg object-cover border border-slate-700 cursor-pointer hover:scale-105 transition"
                        />
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="p-2.5">
                      <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1">
                        <User className="w-3 h-3 text-cyan-400" />
                        {v.staffName}
                      </div>
                      <div className="text-[10px] font-mono text-slate-400">
                        {new Date(v.createdAt).toLocaleTimeString('en-IN')}
                      </div>
                    </td>
                    <td className="p-2.5">
                      <div className="font-bold text-slate-900 dark:text-white">{v.customerName}</div>
                      <div className="text-[10px] text-slate-400 font-mono flex items-center gap-1">
                        <Phone className="w-2.5 h-2.5" />
                        {v.customerPhone || 'N/A'}
                      </div>
                    </td>
                    <td className="p-2.5 max-w-[220px]">
                      <div className="text-[11px] text-slate-300 truncate">{v.formattedAddress}</div>
                      <div className="text-[9.5px] font-mono text-emerald-400">
                        {v.location.latitude.toFixed(4)}°N, {v.location.longitude.toFixed(4)}°E
                      </div>
                    </td>
                    <td className="p-2.5">
                      <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                        {v.stage}
                      </span>
                      {v.requirementsNotes && (
                        <div className="text-[10px] text-slate-400 mt-1 truncate max-w-[180px]">
                          {v.requirementsNotes}
                        </div>
                      )}
                    </td>
                    <td className="p-2.5 text-center">
                      <a
                        href={`https://www.google.com/maps?q=${v.location.latitude},${v.location.longitude}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-cyan-300 rounded-lg text-[11px] font-bold"
                      >
                        <MapPin className="w-3 h-3" />
                        <span>GMap</span>
                      </a>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Selfie Zoom Modal */}
      {selectedPhotoPreview && (
        <div
          onClick={() => setSelectedPhotoPreview(null)}
          className="fixed inset-0 z-50 bg-black/85 flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="max-w-lg w-full bg-slate-900 rounded-2xl p-3 border border-slate-700 space-y-2">
            <img src={selectedPhotoPreview} alt="Verified Geo-Selfie" className="w-full rounded-xl" />
            <div className="text-center text-xs text-slate-400 flex items-center justify-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Geo-Watermarked Verification Photo (Click anywhere to close)</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
