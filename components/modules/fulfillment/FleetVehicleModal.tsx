'use client';

import React, { useState, useEffect } from 'react';
import { X, Truck, Calendar, ShieldAlert, Layers, User, AlertCircle, Wrench, FileText } from 'lucide-react';
import { VehicleRecord, DriverRecord, VehicleType, OwnershipType, VehicleStatus } from '@/types/fleet';

interface FleetVehicleModalProps {
  isOpen: boolean;
  vehicle?: VehicleRecord | null;
  drivers: DriverRecord[];
  onClose: () => void;
  onSuccess: (vehicle: VehicleRecord) => void;
}

export function FleetVehicleModal({
  isOpen,
  vehicle,
  drivers,
  onClose,
  onSuccess,
}: FleetVehicleModalProps) {
  const isEditing = Boolean(vehicle);

  const [registrationNumber, setRegistrationNumber] = useState('');
  const [model, setModel] = useState('');
  const [vehicleType, setVehicleType] = useState<VehicleType>('TRUCK');
  const [doorCapacity, setDoorCapacity] = useState(25);
  const [fuelType, setFuelType] = useState<'DIESEL' | 'ELECTRIC' | 'CNG'>('DIESEL');
  const [assignedDriverId, setAssignedDriverId] = useState('');
  const [fitnessExpiryDate, setFitnessExpiryDate] = useState('');
  const [insuranceExpiryDate, setInsuranceExpiryDate] = useState('');
  const [pollutionExpiryDate, setPollutionExpiryDate] = useState('');
  const [status, setStatus] = useState<VehicleStatus>('ACTIVE');
  const [ownershipType, setOwnershipType] = useState<OwnershipType>('COMPANY_OWNED');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (vehicle) {
      setRegistrationNumber(vehicle.registrationNumber || '');
      setModel(vehicle.model || '');
      setVehicleType(vehicle.vehicleType || 'TRUCK');
      setDoorCapacity(vehicle.doorCapacity || 25);
      setFuelType(vehicle.fuelType || 'DIESEL');
      setAssignedDriverId(vehicle.assignedDriverId || '');
      setFitnessExpiryDate(vehicle.fitnessExpiryDate || '');
      setInsuranceExpiryDate(vehicle.insuranceExpiryDate || '');
      setPollutionExpiryDate(vehicle.pollutionExpiryDate || '');
      setStatus(vehicle.status || 'ACTIVE');
      setOwnershipType(vehicle.ownershipType || 'COMPANY_OWNED');
      setNotes(vehicle.notes || '');
    } else {
      setRegistrationNumber('');
      setModel('');
      setVehicleType('TRUCK');
      setDoorCapacity(25);
      setFuelType('DIESEL');
      setAssignedDriverId('');
      setFitnessExpiryDate('');
      setInsuranceExpiryDate('');
      setPollutionExpiryDate('');
      setStatus('ACTIVE');
      setOwnershipType('COMPANY_OWNED');
      setNotes('');
    }
    setError(null);
  }, [vehicle, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!registrationNumber.trim()) {
      setError('Vehicle Registration Number is required.');
      return;
    }
    if (!model.trim()) {
      setError('Vehicle Model / Make is required.');
      return;
    }
    if (doorCapacity <= 0) {
      setError('FRP Door Capacity must be greater than 0.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const url = isEditing ? `/api/logistics/fleet/vehicles/${vehicle!.id}` : '/api/logistics/fleet/vehicles';
      const method = isEditing ? 'PUT' : 'POST';

      const payload = {
        registrationNumber: registrationNumber.trim(),
        model: model.trim(),
        vehicleType,
        doorCapacity: Number(doorCapacity),
        fuelType,
        assignedDriverId: assignedDriverId || null,
        fitnessExpiryDate: fitnessExpiryDate || undefined,
        insuranceExpiryDate: insuranceExpiryDate || undefined,
        pollutionExpiryDate: pollutionExpiryDate || undefined,
        status,
        ownershipType,
        notes: notes.trim() || undefined,
      };

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || `Failed to ${isEditing ? 'update' : 'create'} vehicle`);
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
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
              <Truck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                {isEditing ? `Edit Vehicle: ${vehicle?.registrationNumber}` : 'Register New Fleet Vehicle / Truck'}
              </h3>
              <p className="text-xs text-slate-500">
                {isEditing
                  ? 'Update vehicle capacity, driver assignment, and fitness/insurance dates'
                  : 'Add delivery truck or commercial pickup with door carrying capacity'}
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
                Registration Number *
              </label>
              <input
                type="text"
                value={registrationNumber}
                onChange={(e) => setRegistrationNumber(e.target.value.toUpperCase())}
                placeholder="e.g. KL-09-AW-8210"
                required
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-mono font-bold uppercase focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Vehicle Make &amp; Model *
              </label>
              <input
                type="text"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                placeholder="e.g. Tata 407 Heavy Flatbed"
                required
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Body / Vehicle Type *
              </label>
              <select
                value={vehicleType}
                onChange={(e) => setVehicleType(e.target.value as any)}
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="TRUCK">Heavy Truck (Flatbed / Tipper)</option>
                <option value="PICKUP">Pickup (Bolero Maxi / Dost)</option>
                <option value="CONTAINER">Closed Container / Van</option>
                <option value="LCV">LCV (Light Commercial)</option>
                <option value="OTHER">Other Transport Vehicle</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <Layers className="w-3.5 h-3.5 text-blue-500" />
                Door Capacity (Units) *
              </label>
              <input
                type="number"
                min={1}
                max={200}
                value={doorCapacity}
                onChange={(e) => setDoorCapacity(Number(e.target.value))}
                required
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white font-bold text-center focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Fuel Type *
              </label>
              <select
                value={fuelType}
                onChange={(e) => setFuelType(e.target.value as any)}
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="DIESEL">Diesel</option>
                <option value="ELECTRIC">Electric (EV)</option>
                <option value="CNG">CNG / Petrol</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-emerald-500" />
                Default Assigned Driver
              </label>
              <select
                value={assignedDriverId}
                onChange={(e) => setAssignedDriverId(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="">-- Unassigned (Available in Pool) --</option>
                {drivers.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.name} ({d.employeeCode}) • {d.phone}
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
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="ACTIVE">ACTIVE (On Road / Available)</option>
                <option value="IN_MAINTENANCE">IN MAINTENANCE (Workshop / Repair)</option>
                <option value="INACTIVE">INACTIVE (Decommissioned)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Fitness (FC) Expiry
              </label>
              <input
                type="date"
                value={fitnessExpiryDate}
                onChange={(e) => setFitnessExpiryDate(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Insurance Expiry
              </label>
              <input
                type="date"
                value={insuranceExpiryDate}
                onChange={(e) => setInsuranceExpiryDate(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                Pollution (PUC) Expiry
              </label>
              <input
                type="date"
                value={pollutionExpiryDate}
                onChange={(e) => setPollutionExpiryDate(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Ownership Type *
              </label>
              <select
                value={ownershipType}
                onChange={(e) => setOwnershipType(e.target.value as any)}
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              >
                <option value="COMPANY_OWNED">Company Owned (EXMARK Plant)</option>
                <option value="ATTACHED_CONTRACT">Attached Contractor Truck</option>
                <option value="RENTAL">Third-Party Rental / Ad-hoc</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
                Notes &amp; Racking Setup
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Equipped with 25-door rubberized vertical support rack"
                className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-blue-500"
              />
            </div>
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
              className="px-5 py-2 text-xs font-bold rounded-lg bg-blue-600 hover:bg-blue-500 text-white shadow-md disabled:opacity-50 flex items-center gap-1.5"
            >
              <Truck className="w-4 h-4" />
              <span>{isSubmitting ? 'Saving Vehicle...' : isEditing ? 'Update Vehicle' : 'Register Vehicle'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
