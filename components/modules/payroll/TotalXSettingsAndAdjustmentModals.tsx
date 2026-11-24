'use client';

import React, { useState, useEffect } from 'react';
import {
  X,
  Save,
  MapPin,
  Clock,
  Sliders,
  CheckCircle2,
  Navigation,
  DollarSign,
} from 'lucide-react';
import { apiFetch } from '@/lib/api/apiClient';
import type {
  EmployeeAttendancePolicy,
  FactoryGeofenceConfig,
  OvertimeCalculationType,
  SalarySlipRecord,
  ShiftConfiguration,
} from '@/types/payroll';

interface PolicySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export function TotalXPolicySettingsModal({ isOpen, onClose, onSaved }: PolicySettingsModalProps) {
  const [geofence, setGeofence] = useState<FactoryGeofenceConfig>({
    factoryName: 'EXMARK DOORS Central Factory',
    latitude: 11.0512,
    longitude: 75.9928,
    radiusMeters: 200,
    address: 'Vengara Industrial Area, Malappuram, Kerala',
    googleMapsApiKey: '',
  });
  const [defaultShift, setDefaultShift] = useState<ShiftConfiguration>({
    shiftName: 'Factory General Shift',
    startTime: '08:30',
    endTime: '17:30',
    standardHours: 9,
    graceMinutesLate: 15,
    halfDayThresholdHours: 4.5,
    overtimeCalculationType: 'HOURLY_FIXED',
    customOvertimeHourlyRate: 120,
    latePenaltyPerInstance: 0,
  });
  const [employeePolicies, setEmployeePolicies] = useState<EmployeeAttendancePolicy[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    apiFetch('/api/payroll/policies')
      .then((r) => r.json())
      .then((json) => {
        if (json.success) {
          if (json.geofence) setGeofence(json.geofence);
          if (json.defaultShift) setDefaultShift(json.defaultShift);
          if (Array.isArray(json.employeePolicies)) setEmployeePolicies(json.employeePolicies);
        }
      })
      .catch(() => {});
  }, [isOpen]);

  const useCurrentGpsForFactory = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      setGeofence((prev) => ({
        ...prev,
        latitude: Number(pos.coords.latitude.toFixed(6)),
        longitude: Number(pos.coords.longitude.toFixed(6)),
      }));
    });
  };

  const updateEmpPolicy = (employeeId: string, patch: Partial<EmployeeAttendancePolicy>) => {
    setEmployeePolicies((prev) =>
      prev.map((p) => (p.employeeId === employeeId ? { ...p, ...patch } : p))
    );
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const policyMap: Record<string, EmployeeAttendancePolicy> = {};
      employeePolicies.forEach((p) => {
        policyMap[p.employeeId] = {
          ...p,
          shift: defaultShift,
        };
      });

      const res = await apiFetch('/api/payroll/policies', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          geofence,
          defaultShift,
          employeePolicies: policyMap,
        }),
      });
      const json = await res.json();
      if (json.success) {
        onSaved();
        onClose();
      }
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm overflow-y-auto">
      <div className="bg-[#0B132B] border border-slate-700 rounded-2xl w-full max-w-4xl shadow-2xl overflow-hidden text-slate-100 my-auto">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900">
          <div className="flex items-center gap-2">
            <Sliders className="w-5 h-5 text-cyan-400" />
            <div>
              <h3 className="text-base font-black text-white">
                TotalX Workforce Rules: Geofence, Shifts &amp; Hourly OT
              </h3>
              <p className="text-[11px] text-slate-400">
                Configure location-based factory perimeter, any-location field permissions, and hourly OT rates
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1 text-slate-400 hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-5 max-h-[78vh] overflow-y-auto text-xs">
          {/* 1. Factory Geofence Setup */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-black text-emerald-400 uppercase flex items-center gap-1.5">
                <MapPin className="w-4 h-4" />
                Factory Geofence Perimeter (For Location-Based Staff)
              </h4>
              <button
                type="button"
                onClick={useCurrentGpsForFactory}
                className="px-2.5 py-1 bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 rounded-lg font-bold text-[11px] flex items-center gap-1 cursor-pointer"
              >
                <Navigation className="w-3 h-3" />
                <span>Capture This PC&apos;s Location</span>
              </button>
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Factory Name</label>
                <input
                  type="text"
                  value={geofence.factoryName}
                  onChange={(e) => setGeofence({ ...geofence, factoryName: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Latitude</label>
                <input
                  type="number"
                  step="0.000001"
                  value={geofence.latitude}
                  onChange={(e) => setGeofence({ ...geofence, latitude: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Longitude</label>
                <input
                  type="number"
                  step="0.000001"
                  value={geofence.longitude}
                  onChange={(e) => setGeofence({ ...geofence, longitude: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Allowed Radius (Meters)</label>
                <input
                  type="number"
                  value={geofence.radiusMeters}
                  onChange={(e) => setGeofence({ ...geofence, radiusMeters: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-mono"
                />
              </div>
            </div>
          </div>

          {/* 2. Shift & Hourly Overtime Engine */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3">
            <h4 className="font-black text-purple-400 uppercase flex items-center gap-1.5">
              <Clock className="w-4 h-4" />
              Shift Hours &amp; Hourly Overtime (OT) Rules
            </h4>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Shift Start Time</label>
                <input
                  type="time"
                  value={defaultShift.startTime}
                  onChange={(e) => setDefaultShift({ ...defaultShift, startTime: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Shift End Time</label>
                <input
                  type="time"
                  value={defaultShift.endTime}
                  onChange={(e) => setDefaultShift({ ...defaultShift, endTime: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Standard Shift (Hours)</label>
                <input
                  type="number"
                  step="0.5"
                  value={defaultShift.standardHours}
                  onChange={(e) => setDefaultShift({ ...defaultShift, standardHours: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Late Grace (Minutes)</label>
                <input
                  type="number"
                  value={defaultShift.graceMinutesLate}
                  onChange={(e) => setDefaultShift({ ...defaultShift, graceMinutesLate: Number(e.target.value) })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-mono"
                />
              </div>
              <div className="col-span-2">
                <label className="text-[10px] text-slate-400 block mb-1">Hourly OT Formula</label>
                <select
                  value={defaultShift.overtimeCalculationType}
                  onChange={(e) =>
                    setDefaultShift({
                      ...defaultShift,
                      overtimeCalculationType: e.target.value as OvertimeCalculationType,
                    })
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white"
                >
                  <option value="HOURLY_FIXED">Fixed Rate per OT Hour (₹/Hour)</option>
                  <option value="MULTIPLIER_1_5X">1.5x Regular Hourly Wage</option>
                  <option value="MULTIPLIER_2_0X">2.0x Double Hourly Wage</option>
                  <option value="MULTIPLIER_1_0X">1.0x Regular Hourly Wage</option>
                </select>
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Fixed OT Rate (₹/Hr)</label>
                <input
                  type="number"
                  value={defaultShift.customOvertimeHourlyRate || 120}
                  onChange={(e) =>
                    setDefaultShift({ ...defaultShift, customOvertimeHourlyRate: Number(e.target.value) })
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Late-In Penalty (₹/Late)</label>
                <input
                  type="number"
                  value={defaultShift.latePenaltyPerInstance || 0}
                  onChange={(e) =>
                    setDefaultShift({ ...defaultShift, latePenaltyPerInstance: Number(e.target.value) })
                  }
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-white font-mono"
                />
              </div>
            </div>
          </div>

          {/* 3. Per-Employee Location Policy & Travel Bata */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-3">
            <h4 className="font-black text-amber-400 uppercase">
              Staff Location Mode (Geofenced vs Any-Location) &amp; Travel Km Rate
            </h4>
            <div className="overflow-x-auto border border-slate-800 rounded-xl">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-950 text-slate-400 font-bold">
                  <tr>
                    <th className="p-2.5">Employee</th>
                    <th className="p-2.5">Punch Location Policy</th>
                    <th className="p-2.5 text-center">Live GPS Tracking</th>
                    <th className="p-2.5 text-right">Travel Bata (₹/Km)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {employeePolicies.map((pol) => (
                    <tr key={pol.employeeId}>
                      <td className="p-2.5">
                        <div className="font-bold text-white">{pol.employeeName}</div>
                        <div className="text-[10px] font-mono text-slate-400">{pol.employeeCode}</div>
                      </td>
                      <td className="p-2.5">
                        <select
                          value={pol.punchMode}
                          onChange={(e) =>
                            updateEmpPolicy(pol.employeeId, {
                              punchMode: e.target.value as EmployeeAttendancePolicy['punchMode'],
                            })
                          }
                          className="bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-white"
                        >
                          <option value="GEOFENCED_FACTORY">Location-Based (Factory Geofence)</option>
                          <option value="ANY_LOCATION">Any Location (Field / Roaming)</option>
                        </select>
                      </td>
                      <td className="p-2.5 text-center">
                        <input
                          type="checkbox"
                          checked={pol.enableLiveLocationTracking}
                          onChange={(e) =>
                            updateEmpPolicy(pol.employeeId, { enableLiveLocationTracking: e.target.checked })
                          }
                          className="w-4 h-4 rounded text-emerald-500 cursor-pointer"
                        />
                      </td>
                      <td className="p-2.5 text-right">
                        <input
                          type="number"
                          value={pol.travelRatePerKm}
                          onChange={(e) =>
                            updateEmpPolicy(pol.employeeId, { travelRatePerKm: Number(e.target.value) })
                          }
                          className="w-20 bg-slate-950 border border-slate-700 rounded-lg px-2 py-1 text-right text-white font-mono"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="px-5 py-3 border-t border-slate-800 flex justify-end gap-2 bg-slate-900">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold cursor-pointer">
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving Rules...' : 'Save Workforce Rules'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}

interface SalaryAdjustmentModalProps {
  slip: SalarySlipRecord | null;
  month: string;
  onClose: () => void;
  onUpdated: () => void;
}

export function SalarySlipAdjustmentModal({
  slip,
  month,
  onClose,
  onUpdated,
}: SalaryAdjustmentModalProps) {
  const [otHours, setOtHours] = useState(0);
  const [otRate, setOtRate] = useState(120);
  const [travelBata, setTravelBata] = useState(0);
  const [foodAllowance, setFoodAllowance] = useState(0);
  const [conveyance, setConveyance] = useState(0);
  const [bonus, setBonus] = useState(0);
  const [advanceDed, setAdvanceDed] = useState(0);
  const [lateDed, setLateDed] = useState(0);
  const [pfDed, setPfDed] = useState(0);
  const [esiDed, setEsiDed] = useState(0);
  const [otherDed, setOtherDed] = useState(0);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!slip) return;
    setOtHours(slip.overtimeHours || 0);
    setOtRate(slip.overtimeHourlyRate || 120);
    setTravelBata(slip.travelBataAllowance || 0);
    setFoodAllowance(slip.foodAllowance || 0);
    setConveyance(slip.conveyanceAllowance || 0);
    setBonus(slip.performanceBonus || 0);
    setAdvanceDed(slip.advanceDeduction || 0);
    setLateDed(slip.latePenaltyDeduction || 0);
    setPfDed(slip.pfDeduction || 0);
    setEsiDed(slip.esiDeduction || 0);
    setOtherDed(slip.otherDeductions || 0);
  }, [slip]);

  if (!slip) return null;

  const computedOtPay = Math.round(otHours * otRate);
  const grossPreview =
    slip.earnedBasicPay + computedOtPay + travelBata + foodAllowance + conveyance + bonus;
  const dedPreview = advanceDed + lateDed + (slip.canteenFoodDeduction || 0) + pfDed + esiDed + otherDed;
  const netPreview = Math.max(0, grossPreview - dedPreview);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await apiFetch('/api/payroll/salary', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month,
          employeeId: slip.employeeId,
          adjustments: {
            overtimeHours: otHours,
            overtimeHourlyRate: otRate,
            travelBataAllowance: travelBata,
            foodAllowance,
            conveyanceAllowance: conveyance,
            performanceBonus: bonus,
            advanceDeduction: advanceDed,
            latePenaltyDeduction: lateDed,
            pfDeduction: pfDed,
            esiDeduction: esiDed,
            otherDeductions: otherDed,
          },
        }),
      });
      const json = await res.json();
      if (json.success) {
        onUpdated();
        onClose();
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm overflow-y-auto">
      <div className="bg-[#0B132B] border border-slate-700 rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden text-slate-100 my-auto">
        <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between bg-slate-900">
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="text-base font-black text-white">
                Adjust Earnings &amp; Deductions — {slip.employeeName}
              </h3>
              <p className="text-[11px] text-slate-400 font-mono">
                {slip.employeeCode} • Base Earned: ₹{slip.earnedBasicPay.toLocaleString('en-IN')} ({slip.payableDays} Days)
              </p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="p-1 text-slate-400 hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          {/* Additions */}
          <div className="space-y-2.5 bg-emerald-950/20 border border-emerald-500/20 rounded-xl p-3.5">
            <h4 className="font-black text-emerald-400 uppercase">Earnings &amp; Hourly OT Additions</h4>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">OT Hours</label>
                <input
                  type="number"
                  step="0.25"
                  value={otHours}
                  onChange={(e) => setOtHours(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-1.5 text-white font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">OT Rate (₹/Hr)</label>
                <input
                  type="number"
                  value={otRate}
                  onChange={(e) => setOtRate(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-1.5 text-white font-mono"
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">
                Travel / Fuel Bata (GPS: {slip.distanceTraveledKm || 0} km)
              </label>
              <input
                type="number"
                value={travelBata}
                onChange={(e) => setTravelBata(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-1.5 text-white font-mono"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Food Allowance</label>
                <input
                  type="number"
                  value={foodAllowance}
                  onChange={(e) => setFoodAllowance(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-1.5 text-white font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Conveyance</label>
                <input
                  type="number"
                  value={conveyance}
                  onChange={(e) => setConveyance(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-1.5 text-white font-mono"
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Incentive / Performance Bonus</label>
              <input
                type="number"
                value={bonus}
                onChange={(e) => setBonus(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-1.5 text-white font-mono"
              />
            </div>
          </div>

          {/* Deductions */}
          <div className="space-y-2.5 bg-rose-950/20 border border-rose-500/20 rounded-xl p-3.5">
            <h4 className="font-black text-rose-400 uppercase">Deductions &amp; Recoveries</h4>
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Salary Advance / Loan EMI</label>
              <input
                type="number"
                value={advanceDed}
                onChange={(e) => setAdvanceDed(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-1.5 text-white font-mono"
              />
            </div>
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Late-In Penalty Deduction</label>
              <input
                type="number"
                value={lateDed}
                onChange={(e) => setLateDed(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-1.5 text-white font-mono"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">EPF Deduction</label>
                <input
                  type="number"
                  value={pfDed}
                  onChange={(e) => setPfDed(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-1.5 text-white font-mono"
                />
              </div>
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">ESI Deduction</label>
                <input
                  type="number"
                  value={esiDed}
                  onChange={(e) => setEsiDed(Number(e.target.value))}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-1.5 text-white font-mono"
                />
              </div>
            </div>
            <div>
              <label className="text-[10px] text-slate-400 block mb-1">Other Deductions</label>
              <input
                type="number"
                value={otherDed}
                onChange={(e) => setOtherDed(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-1.5 text-white font-mono"
              />
            </div>

            <div className="mt-3 pt-3 border-t border-slate-800 flex items-center justify-between">
              <span className="font-bold text-slate-400">Net Payable Preview:</span>
              <span className="text-lg font-black text-emerald-400 font-mono">
                ₹{netPreview.toLocaleString('en-IN')}
              </span>
            </div>
          </div>
        </div>

        <div className="px-5 py-3 border-t border-slate-800 flex justify-end gap-2 bg-slate-900">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold cursor-pointer">
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{saving ? 'Updating...' : 'Save Salary Adjustments'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
