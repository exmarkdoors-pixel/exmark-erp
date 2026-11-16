'use client';

import React, { useState, useEffect } from 'react';
import { X, Truck, Calendar, MapPin, Phone, Hash, Layers, User, ChevronDown } from 'lucide-react';
import { DispatchRecord } from '@/types/fulfillment';
import { VehicleRecord, DriverRecord } from '@/types/fleet';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (record: DispatchRecord) => void;
}

export function DispatchScheduleModal({ isOpen, onClose, onSuccess }: Props) {
  const [customerName, setCustomerName] = useState('');
  const [destinationAddress, setDestinationAddress] = useState('');
  const [deliveryDistrict, setDeliveryDistrict] = useState('Kozhikode');
  const [vehicleNumber, setVehicleNumber] = useState('KL-09-AW-8210');
  const [driverName, setDriverName] = useState('');
  const [driverPhone, setDriverPhone] = useState('');
  const [eWayBillNo, setEWayBillNo] = useState('');
  const [doorCount, setDoorCount] = useState(12);
  const [salesOrderId, setSalesOrderId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fleet data
  const [vehicles, setVehicles] = useState<VehicleRecord[]>([]);
  const [drivers, setDrivers] = useState<DriverRecord[]>([]);
  const [isCustomVehicle, setIsCustomVehicle] = useState(false);
  const [isCustomDriver, setIsCustomDriver] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const fetchFleet = async () => {
      try {
        const res = await fetch('/api/logistics/fleet');
        const json = await res.json();
        if (json.success && json.data) {
          const vList: VehicleRecord[] = json.data.vehicles || [];
          const dList: DriverRecord[] = json.data.drivers || [];
          setVehicles(vList);
          setDrivers(dList);

          // If no vehicle selected yet, select first active vehicle
          if (vList.length > 0 && !vehicleNumber) {
            const defaultV = vList.find((v) => v.status === 'ACTIVE') || vList[0];
            setVehicleNumber(defaultV.registrationNumber);
            if (defaultV.assignedDriverName) {
              setDriverName(defaultV.assignedDriverName);
              setDriverPhone(defaultV.assignedDriverPhone || '');
            }
          }
        }
      } catch {
        // Fallback
      }
    };
    fetchFleet();
  }, [isOpen]);

  if (!isOpen) return null;

  const handleVehicleSelect = (regNo: string) => {
    if (regNo === '__CUSTOM__') {
      setIsCustomVehicle(true);
      setVehicleNumber('');
      return;
    }

    setIsCustomVehicle(false);
    setVehicleNumber(regNo);

    // Auto-fill assigned driver
    const matchedV = vehicles.find((v) => v.registrationNumber === regNo);
    if (matchedV && matchedV.assignedDriverName) {
      setDriverName(matchedV.assignedDriverName);
      setDriverPhone(matchedV.assignedDriverPhone || '');
      setIsCustomDriver(false);
    }
  };

  const handleDriverSelect = (dName: string) => {
    if (dName === '__CUSTOM__') {
      setIsCustomDriver(true);
      setDriverName('');
      return;
    }

    setIsCustomDriver(false);
    setDriverName(dName);

    const matchedD = drivers.find((d) => d.name === dName);
    if (matchedD) {
      setDriverPhone(matchedD.phone || '');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !destinationAddress.trim() || !vehicleNumber.trim() || !driverName.trim()) {
      setError('Please fill in all required dispatch details.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/fulfillment/dispatch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          salesOrderId: salesOrderId.trim() || null,
          customerName,
          destinationAddress,
          deliveryDistrict,
          vehicleNumber,
          driverName,
          driverPhone,
          eWayBillNo: eWayBillNo.trim() || null,
          doorCount: Number(doorCount),
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to schedule dispatch');
      }

      onSuccess(json.data);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-[#0B132B] rounded-2xl w-full max-w-xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-red-500/10 text-red-500">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">Schedule Fleet Dispatch</h3>
              <p className="text-xs text-slate-500">Logistics dispatch from manufacturing plant across Kerala</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4">
          {error && (
            <div className="p-3 text-xs bg-red-500/10 text-red-500 rounded-lg border border-red-500/20">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Customer / Project Name *
              </label>
              <input
                type="text"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="e.g. Al-Hind Builders / Dr. Rashid"
                required
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-red-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                Sales Order Ref (Optional)
              </label>
              <input
                type="text"
                value={salesOrderId}
                onChange={(e) => setSalesOrderId(e.target.value)}
                placeholder="e.g. SO-2026-001"
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-red-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-red-500" />
                Delivery District *
              </label>
              <select
                value={deliveryDistrict}
                onChange={(e) => setDeliveryDistrict(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-red-500"
              >
                {[
                  'Kozhikode', 'Malappuram', 'Palakkad', 'Thrissur', 'Ernakulam',
                  'Kottayam', 'Alappuzha', 'Kollam', 'Thiruvananthapuram', 'Kannur',
                  'Kasaragod', 'Wayanad', 'Idukki', 'Pathanamthitta'
                ].map((d) => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-red-500" />
                Door Units Count *
              </label>
              <input
                type="number"
                min={1}
                value={doorCount}
                onChange={(e) => setDoorCount(Number(e.target.value))}
                required
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-red-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
              Destination Delivery Address *
            </label>
            <textarea
              rows={2}
              value={destinationAddress}
              onChange={(e) => setDestinationAddress(e.target.value)}
              placeholder="Full site or warehouse street address"
              required
              className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-red-500"
            />
          </div>

          {/* ── Vehicle Selector ─────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <Truck className="w-3.5 h-3.5 text-blue-500" />
                Select Fleet Vehicle *
              </label>
              {!isCustomVehicle && vehicles.length > 0 ? (
                <div className="space-y-1">
                  <select
                    value={vehicleNumber}
                    onChange={(e) => handleVehicleSelect(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold focus:outline-none focus:ring-1 focus:ring-red-500"
                  >
                    {vehicles.map((v) => (
                      <option key={v.id} value={v.registrationNumber}>
                        {v.registrationNumber} ({v.model} • {v.doorCapacity} Doors)
                      </option>
                    ))}
                    <option value="__CUSTOM__">+ Enter Other / Rental Vehicle</option>
                  </select>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={vehicleNumber}
                    onChange={(e) => setVehicleNumber(e.target.value.toUpperCase())}
                    placeholder="e.g. KL-09-AW-8210"
                    required
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono uppercase focus:outline-none focus:ring-1 focus:ring-red-500"
                  />
                  {vehicles.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomVehicle(false);
                        if (vehicles[0]) handleVehicleSelect(vehicles[0].registrationNumber);
                      }}
                      className="text-[10px] px-2 py-2 text-slate-500 hover:text-slate-900 dark:hover:text-white border border-slate-300 dark:border-slate-700 rounded-lg whitespace-nowrap"
                    >
                      List
                    </button>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <Hash className="w-3.5 h-3.5 text-slate-400" />
                Waybill / LR Ref No (Optional)
              </label>
              <input
                type="text"
                value={eWayBillNo}
                onChange={(e) => setEWayBillNo(e.target.value)}
                placeholder="Optional transport waybill / LR number"
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-red-500 font-mono"
              />
            </div>
          </div>

          {/* ── Driver Selector ──────────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-emerald-500" />
                Driver Name *
              </label>
              {!isCustomDriver && drivers.length > 0 ? (
                <div className="space-y-1">
                  <select
                    value={driverName}
                    onChange={(e) => handleDriverSelect(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-1 focus:ring-red-500"
                  >
                    <option value="">-- Select Registered Driver --</option>
                    {drivers.map((d) => (
                      <option key={d.id} value={d.name}>
                        {d.name} ({d.employeeCode})
                      </option>
                    ))}
                    <option value="__CUSTOM__">+ Enter Other / Rental Driver</option>
                  </select>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <input
                    type="text"
                    value={driverName}
                    onChange={(e) => setDriverName(e.target.value)}
                    placeholder="e.g. Suresh Babu"
                    required
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-red-500"
                  />
                  {drivers.length > 0 && (
                    <button
                      type="button"
                      onClick={() => {
                        setIsCustomDriver(false);
                        if (drivers[0]) handleDriverSelect(drivers[0].name);
                      }}
                      className="text-[10px] px-2 py-2 text-slate-500 hover:text-slate-900 dark:hover:text-white border border-slate-300 dark:border-slate-700 rounded-lg whitespace-nowrap"
                    >
                      List
                    </button>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-slate-400" />
                Driver Phone
              </label>
              <input
                type="tel"
                value={driverPhone}
                onChange={(e) => setDriverPhone(e.target.value)}
                placeholder="+91 94471 22334"
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-red-500"
              />
            </div>
          </div>

          <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-lg hover:bg-slate-200 dark:hover:bg-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 flex items-center gap-1.5 shadow-sm shadow-red-500/20 disabled:opacity-50"
            >
              {isSubmitting ? (
                <span>Scheduling...</span>
              ) : (
                <>
                  <Calendar className="w-3.5 h-3.5" />
                  Confirm Dispatch
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
