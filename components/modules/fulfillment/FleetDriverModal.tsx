'use client';

import React, { useState, useEffect } from 'react';
import { X, User, Phone, ShieldCheck, KeyRound, Truck, AlertCircle, HeartPulse, FileText } from 'lucide-react';
import { DriverRecord, VehicleRecord } from '@/types/fleet';

interface FleetDriverModalProps {
  isOpen: boolean;
  driver?: DriverRecord | null;
  vehicles: VehicleRecord[];
  onClose: () => void;
  onSuccess: (driver: DriverRecord) => void;
}

export function FleetDriverModal({
  isOpen,
  driver,
  vehicles,
  onClose,
  onSuccess,
}: FleetDriverModalProps) {
  const isEditing = Boolean(driver);

  const [name, setName] = useState('');
  const [employeeCode, setEmployeeCode] = useState('');
  const [phone, setPhone] = useState('');
  const [drivingLicenseNo, setDrivingLicenseNo] = useState('');
  const [licenseExpiryDate, setLicenseExpiryDate] = useState('');
  const [defaultPin, setDefaultPin] = useState('1111');
  const [assignedVehicleNumber, setAssignedVehicleNumber] = useState('');
  const [status, setStatus] = useState<'ACTIVE' | 'ON_LEAVE' | 'INACTIVE'>('ACTIVE');
  const [bloodGroup, setBloodGroup] = useState('O+');
  const [emergencyContact, setEmergencyContact] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (driver) {
      setName(driver.name || '');
      setEmployeeCode(driver.employeeCode || '');
      setPhone(driver.phone || '');
      setDrivingLicenseNo(driver.drivingLicenseNo || '');
      setLicenseExpiryDate(driver.licenseExpiryDate || '');
      setDefaultPin(driver.defaultPin || '1111');
      setAssignedVehicleNumber(driver.assignedVehicleNumber || '');
      setStatus(driver.status || 'ACTIVE');
      setBloodGroup(driver.bloodGroup || 'O+');
      setEmergencyContact(driver.emergencyContact || '');
      setNotes(driver.notes || '');
    } else {
      setName('');
      setEmployeeCode('');
      setPhone('');
      setDrivingLicenseNo('');
      setLicenseExpiryDate('');
      setDefaultPin('1111');
      setAssignedVehicleNumber('');
      setStatus('ACTIVE');
      setBloodGroup('O+');
      setEmergencyContact('');
      setNotes('');
    }
    setError(null);
  }, [driver, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Driver Full Name is required.');
      return;
    }
    if (!phone.trim()) {
      setError('Driver Phone Number is required.');
      return;
    }
    if (!/^\d{4}$/.test(defaultPin.trim())) {
      setError('Mobile Terminal PIN must be exactly 4 numeric digits (e.g. 1111).');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const url = isEditing ? `/api/logistics/fleet/drivers/${driver!.id}` : '/api/logistics/fleet/drivers';
      const method = isEditing ? 'PUT' : 'POST';

      const payload = {
        name: name.trim(),
        employeeCode: employeeCode.trim() || undefined,
        phone: phone.trim(),
        drivingLicenseNo: drivingLicenseNo.trim(),
        licenseExpiryDate: licenseExpiryDate || undefined,
        defaultPin: defaultPin.trim(),
        assignedVehicleNumber: assignedVehicleNumber || undefined,
        status,
        bloodGroup: bloodGroup || undefined,
        emergencyContact: emergencyContact.trim() || undefined,
        notes: notes.trim() || undefined,
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || `Failed to ${isEditing ? 'update' : 'create'} driver`);
      }

      onSuccess(json.data);
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
      <div className="bg-white dark:bg-[#0B132B] rounded-2xl w-full max-w-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-500">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                {isEditing ? `Edit Driver: ${driver?.name}` : 'Register New Fleet Driver'}
              </h3>
              <p className="text-xs text-slate-500">
                {isEditing
                  ? 'Update driver credentials, assigned truck, and mobile terminal PIN'
                  : 'Add driver with automatic mobile app terminal PIN and delivery access'}
              </p>
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
            <div className="p-3 text-xs bg-red-500/10 text-red-500 rounded-lg border border-red-500/20 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Driver Full Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Ratheesh Driver / Suresh Babu"
                required
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Staff / Employee Code
              </label>
              <input
                type="text"
                value={employeeCode}
                onChange={(e) => setEmployeeCode(e.target.value)}
                placeholder="Auto e.g. DRV-04"
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono uppercase focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <Phone className="w-3.5 h-3.5 text-emerald-500" />
                Phone Number (WhatsApp) *
              </label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +91 94472 88123"
                required
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <KeyRound className="w-3.5 h-3.5 text-amber-500" />
                Mobile Touch PIN (4 Digits) *
              </label>
              <input
                type="text"
                maxLength={4}
                value={defaultPin}
                onChange={(e) => setDefaultPin(e.target.value.replace(/\D/g, ''))}
                placeholder="1111"
                required
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold tracking-widest text-center focus:outline-none focus:ring-1 focus:ring-amber-500"
              />
              <span className="text-[10px] text-slate-400">Used for fast touch-login on /mobile</span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <Truck className="w-3.5 h-3.5 text-blue-500" />
                Assigned Vehicle (Primary Truck)
              </label>
              <select
                value={assignedVehicleNumber}
                onChange={(e) => setAssignedVehicleNumber(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="">-- No Assigned Vehicle (Pool Driver) --</option>
                {vehicles.map((v) => (
                  <option key={v.id} value={v.registrationNumber}>
                    {v.registrationNumber} ({v.model} • {v.doorCapacity} Doors)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Operational Status *
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                <option value="ACTIVE">ACTIVE (On Duty / Available)</option>
                <option value="ON_LEAVE">ON LEAVE (Temporarily Away)</option>
                <option value="INACTIVE">INACTIVE (Barred from Dispatches)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Driving License Number
              </label>
              <input
                type="text"
                value={drivingLicenseNo}
                onChange={(e) => setDrivingLicenseNo(e.target.value)}
                placeholder="e.g. KL-09-2018-0044521"
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono uppercase focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                License Expiry Date
              </label>
              <input
                type="date"
                value={licenseExpiryDate}
                onChange={(e) => setLicenseExpiryDate(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <HeartPulse className="w-3.5 h-3.5 text-rose-500" />
                Blood Group
              </label>
              <select
                value={bloodGroup}
                onChange={(e) => setBloodGroup(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              >
                {['O+', 'O-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-'].map((bg) => (
                  <option key={bg} value={bg}>{bg}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Emergency Contact Phone
              </label>
              <input
                type="text"
                value={emergencyContact}
                onChange={(e) => setEmergencyContact(e.target.value)}
                placeholder="e.g. +91 94470 11223 (Family)"
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Remarks &amp; Preferred Kerala Routes
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Hill highway specialist, handles Kozhikode to Palakkad high-capacity deliveries."
              className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white shadow-md disabled:opacity-50 flex items-center gap-1.5"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>{isSubmitting ? 'Saving Driver...' : isEditing ? 'Update Driver' : 'Register Driver'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
