'use client';

import React, { useState, useEffect } from 'react';
import {
  Truck,
  User,
  Plus,
  Search,
  Edit2,
  Trash2,
  Phone,
  KeyRound,
  ShieldAlert,
  ShieldCheck,
  Calendar,
  Layers,
  RefreshCw,
  AlertCircle,
  MessageCircle,
  CheckCircle2,
  Clock,
  Wrench,
  Fuel,
  ExternalLink,
} from 'lucide-react';
import { DriverRecord, VehicleRecord, FleetSummary } from '@/types/fleet';
import { FleetDriverModal } from './FleetDriverModal';
import { FleetVehicleModal } from './FleetVehicleModal';

export function DriversAndVehiclesMasterTab() {
  const [activeSection, setActiveSection] = useState<'DRIVERS' | 'VEHICLES'>('DRIVERS');
  const [drivers, setDrivers] = useState<DriverRecord[]>([]);
  const [vehicles, setVehicles] = useState<VehicleRecord[]>([]);
  const [summary, setSummary] = useState<FleetSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Search & filter state
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Modals state
  const [isDriverModalOpen, setIsDriverModalOpen] = useState(false);
  const [selectedDriver, setSelectedDriver] = useState<DriverRecord | null>(null);

  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [selectedVehicle, setSelectedVehicle] = useState<VehicleRecord | null>(null);

  // Delete confirm state
  const [deletingEntity, setDeletingEntity] = useState<{
    type: 'DRIVER' | 'VEHICLE';
    id: string;
    label: string;
  } | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/logistics/fleet');
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to load fleet data');
      }
      setDrivers(json.data.drivers || []);
      setVehicles(json.data.vehicles || []);
      setSummary(json.data.summary || null);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error loading fleet master');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Filtered drivers
  const filteredDrivers = drivers.filter((d) => {
    const q = searchQuery.toLowerCase();
    const matchSearch =
      !q ||
      d.name.toLowerCase().includes(q) ||
      d.employeeCode.toLowerCase().includes(q) ||
      d.phone.includes(q) ||
      (d.assignedVehicleNumber && d.assignedVehicleNumber.toLowerCase().includes(q)) ||
      (d.drivingLicenseNo && d.drivingLicenseNo.toLowerCase().includes(q));

    const matchStatus = statusFilter === 'ALL' || d.status === statusFilter;
    return matchSearch && matchStatus;
  });

  // Filtered vehicles
  const filteredVehicles = vehicles.filter((v) => {
    const q = searchQuery.toLowerCase();
    const matchSearch =
      !q ||
      v.registrationNumber.toLowerCase().includes(q) ||
      v.model.toLowerCase().includes(q) ||
      (v.assignedDriverName && v.assignedDriverName.toLowerCase().includes(q));

    const matchStatus = statusFilter === 'ALL' || v.status === statusFilter;
    return matchSearch && matchStatus;
  });

  // Execute deletion
  const handleConfirmDelete = async () => {
    if (!deletingEntity) return;
    setIsDeleting(true);
    setDeleteError(null);

    try {
      const url =
        deletingEntity.type === 'DRIVER'
          ? `/api/logistics/fleet/drivers/${deletingEntity.id}`
          : `/api/logistics/fleet/vehicles/${deletingEntity.id}`;

      const res = await fetch(url, { method: 'DELETE' });
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error || `Failed to delete ${deletingEntity.type.toLowerCase()}`);
      }

      setDeletingEntity(null);
      await loadData();
    } catch (err: unknown) {
      setDeleteError(err instanceof Error ? err.message : 'Error deleting item');
    } finally {
      setIsDeleting(false);
    }
  };

  const getDaysUntilExpiry = (dateStr?: string) => {
    if (!dateStr) return null;
    const now = new Date();
    const exp = new Date(dateStr);
    const diff = Math.ceil((exp.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff;
  };

  return (
    <div className="space-y-4">
      {/* ── Top Summary Metrics Banner ─────────────────────────────────── */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white dark:bg-[#0B132B] p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-emerald-500/10 text-emerald-500">
            <User className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase text-slate-400">Active Drivers</div>
            <div className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
              {summary ? `${summary.activeDrivers} / ${summary.totalDrivers}` : '--'}
            </div>
            <div className="text-[11px] text-slate-400">Dedicated factory &amp; delivery staff</div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#0B132B] p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-blue-500/10 text-blue-500">
            <Truck className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase text-slate-400">Fleet Vehicles</div>
            <div className="text-xl font-bold text-slate-900 dark:text-white mt-0.5">
              {summary ? `${summary.activeVehicles} / ${summary.totalVehicles}` : '--'}
            </div>
            <div className="text-[11px] text-slate-400">Trucks &amp; delivery pickups on road</div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#0B132B] p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-purple-500/10 text-purple-500">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase text-slate-400">Total Door Capacity</div>
            <div className="text-xl font-bold text-purple-500 mt-0.5">
              {summary ? `${summary.totalDoorCapacity} Doors` : '--'}
            </div>
            <div className="text-[11px] text-slate-400">Simultaneous dispatch volume</div>
          </div>
        </div>

        <div className="bg-white dark:bg-[#0B132B] p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex items-center gap-3">
          <div className="p-2.5 rounded-lg bg-amber-500/10 text-amber-500">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <div className="text-[10px] font-bold uppercase text-slate-400">Certificate Status</div>
            <div className="text-xl font-bold text-amber-500 mt-0.5">
              {summary ? `${summary.expiringCertificatesCount} Expiring` : '--'}
            </div>
            <div className="text-[11px] text-slate-400">FC / Insurance renewal alert</div>
          </div>
        </div>
      </div>

      {/* ── Sub-Navigation & Control Bar ───────────────────────────────── */}
      <div className="bg-white dark:bg-[#0B132B] p-4 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          {/* Section Selector */}
          <div className="flex items-center gap-1.5 p-1 bg-slate-100 dark:bg-slate-900 rounded-lg">
            <button
              onClick={() => {
                setActiveSection('DRIVERS');
                setStatusFilter('ALL');
                setSearchQuery('');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                activeSection === 'DRIVERS'
                  ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <User className="w-4 h-4" />
              <span>Fleet Drivers ({drivers.length})</span>
            </button>
            <button
              onClick={() => {
                setActiveSection('VEHICLES');
                setStatusFilter('ALL');
                setSearchQuery('');
              }}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-bold transition-all ${
                activeSection === 'VEHICLES'
                  ? 'bg-white dark:bg-slate-800 text-blue-600 dark:text-blue-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Truck className="w-4 h-4" />
              <span>Delivery Trucks &amp; Pickups ({vehicles.length})</span>
            </button>
          </div>

          {/* Action Button & Refresh */}
          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              title="Refresh"
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>

            {activeSection === 'DRIVERS' ? (
              <button
                onClick={() => {
                  setSelectedDriver(null);
                  setIsDriverModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-sm transition"
              >
                <Plus className="w-4 h-4" />
                <span>+ Add Driver</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  setSelectedVehicle(null);
                  setIsVehicleModalOpen(true);
                }}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold shadow-sm transition"
              >
                <Plus className="w-4 h-4" />
                <span>+ Add Vehicle</span>
              </button>
            )}
          </div>
        </div>

        {/* Search & Filter Bar */}
        <div className="flex flex-col sm:flex-row gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/60">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={
                activeSection === 'DRIVERS'
                  ? 'Search driver name, employee code, phone, license, or vehicle...'
                  : 'Search registration number (e.g. KL-09), model, or assigned driver...'
              }
              className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-1.5 text-xs rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active Only</option>
              {activeSection === 'DRIVERS' ? (
                <>
                  <option value="ON_LEAVE">On Leave</option>
                  <option value="INACTIVE">Inactive</option>
                </>
              ) : (
                <>
                  <option value="IN_MAINTENANCE">In Maintenance</option>
                  <option value="INACTIVE">Decommissioned</option>
                </>
              )}
            </select>
          </div>
        </div>
      </div>

      {/* ── Table View: DRIVERS ────────────────────────────────────────── */}
      {activeSection === 'DRIVERS' && (
        <div className="bg-white dark:bg-[#0B132B] rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 uppercase text-[10px] font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3">Driver Profile</th>
                  <th className="px-4 py-3">Phone &amp; WhatsApp</th>
                  <th className="px-4 py-3">Driving License</th>
                  <th className="px-4 py-3">Assigned Truck</th>
                  <th className="px-4 py-3 text-center">Mobile PIN</th>
                  <th className="px-4 py-3 text-center">Trips</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filteredDrivers.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400">
                      No fleet drivers found matching your criteria. Click "+ Add Driver" to register one.
                    </td>
                  </tr>
                ) : (
                  filteredDrivers.map((driver) => (
                    <tr key={driver.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition">
                      {/* Driver Profile */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold flex items-center justify-center text-xs shrink-0">
                            {driver.name.slice(0, 2).toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5">
                              <span>{driver.name}</span>
                              {driver.bloodGroup && (
                                <span className="px-1.5 py-0.2 rounded text-[9px] bg-rose-500/10 text-rose-500 font-bold border border-rose-500/20">
                                  {driver.bloodGroup}
                                </span>
                              )}
                            </div>
                            <div className="text-[10px] font-mono text-slate-400">
                              {driver.employeeCode}
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Phone & WhatsApp */}
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <a
                            href={`tel:${driver.phone}`}
                            className="font-medium text-slate-800 dark:text-slate-200 hover:text-emerald-500"
                          >
                            {driver.phone}
                          </a>
                          <a
                            href={`https://wa.me/${driver.phone.replace(/\D/g, '')}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-emerald-500 hover:text-emerald-400 p-0.5"
                            title="Chat on WhatsApp"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                          </a>
                        </div>
                        {driver.emergencyContact && (
                          <div className="text-[10px] text-slate-400">
                            SOS: {driver.emergencyContact}
                          </div>
                        )}
                      </td>

                      {/* Driving License */}
                      <td className="px-4 py-3">
                        <div className="font-mono text-slate-900 dark:text-white font-medium">
                          {driver.drivingLicenseNo}
                        </div>
                        {driver.licenseExpiryDate && (
                          <div className="text-[10px] text-slate-400">
                            Exp: {driver.licenseExpiryDate}
                          </div>
                        )}
                      </td>

                      {/* Assigned Truck */}
                      <td className="px-4 py-3">
                        {driver.assignedVehicleNumber ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                            <Truck className="w-3 h-3" />
                            {driver.assignedVehicleNumber}
                          </span>
                        ) : (
                          <span className="text-[11px] text-slate-400 italic">Pool / Unassigned</span>
                        )}
                      </td>

                      {/* Mobile PIN */}
                      <td className="px-4 py-3 text-center">
                        <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {driver.defaultPin || '••••'}
                        </span>
                      </td>

                      {/* Completed Trips */}
                      <td className="px-4 py-3 text-center font-bold text-slate-900 dark:text-white">
                        {driver.totalTripsCompleted || 0}
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            driver.status === 'ACTIVE'
                              ? 'bg-emerald-500/15 text-emerald-500'
                              : driver.status === 'ON_LEAVE'
                              ? 'bg-amber-500/15 text-amber-500'
                              : 'bg-slate-500/15 text-slate-500'
                          }`}
                        >
                          {driver.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => {
                              setSelectedDriver(driver);
                              setIsDriverModalOpen(true);
                            }}
                            title="Edit Driver"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-emerald-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => {
                              setDeleteError(null);
                              setDeletingEntity({
                                type: 'DRIVER',
                                id: driver.id,
                                label: `${driver.name} (${driver.employeeCode})`,
                              });
                            }}
                            title="Delete Driver"
                            className="p-1.5 rounded-lg text-slate-500 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Table View: VEHICLES ───────────────────────────────────────── */}
      {activeSection === 'VEHICLES' && (
        <div className="bg-white dark:bg-[#0B132B] rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 uppercase text-[10px] font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3">Registration &amp; Model</th>
                  <th className="px-4 py-3">Body Type</th>
                  <th className="px-4 py-3 text-center">Door Capacity</th>
                  <th className="px-4 py-3">Fuel</th>
                  <th className="px-4 py-3">Assigned Driver</th>
                  <th className="px-4 py-3">FC &amp; Insurance Expiry</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                {filteredVehicles.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-slate-400">
                      No vehicles found matching your criteria. Click "+ Add Vehicle" to register one.
                    </td>
                  </tr>
                ) : (
                  filteredVehicles.map((vehicle) => {
                    const fcDays = getDaysUntilExpiry(vehicle.fitnessExpiryDate);
                    const insDays = getDaysUntilExpiry(vehicle.insuranceExpiryDate);

                    return (
                      <tr key={vehicle.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/30 transition">
                        {/* Registration & Model */}
                        <td className="px-4 py-3">
                          <div className="font-mono font-bold text-slate-900 dark:text-white text-sm">
                            {vehicle.registrationNumber}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">
                            {vehicle.model}
                          </div>
                        </td>

                        {/* Body Type */}
                        <td className="px-4 py-3">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                            {vehicle.vehicleType}
                          </span>
                        </td>

                        {/* Door Capacity */}
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-purple-500/10 text-purple-600 dark:text-purple-400 border border-purple-500/20">
                            <Layers className="w-3 h-3" />
                            {vehicle.doorCapacity} Doors
                          </span>
                        </td>

                        {/* Fuel */}
                        <td className="px-4 py-3">
                          <span className="text-[11px] font-medium text-slate-700 dark:text-slate-300 flex items-center gap-1">
                            <Fuel className="w-3 h-3 text-slate-400" />
                            {vehicle.fuelType}
                          </span>
                        </td>

                        {/* Assigned Driver */}
                        <td className="px-4 py-3">
                          {vehicle.assignedDriverName ? (
                            <div>
                              <div className="font-bold text-slate-900 dark:text-white flex items-center gap-1">
                                <User className="w-3 h-3 text-emerald-500" />
                                {vehicle.assignedDriverName}
                              </div>
                              {vehicle.assignedDriverPhone && (
                                <a
                                  href={`tel:${vehicle.assignedDriverPhone}`}
                                  className="text-[10px] text-slate-400 hover:text-emerald-500"
                                >
                                  {vehicle.assignedDriverPhone}
                                </a>
                              )}
                            </div>
                          ) : (
                            <span className="text-[11px] text-slate-400 italic">Unassigned</span>
                          )}
                        </td>

                        {/* Certificate Expiries */}
                        <td className="px-4 py-3 space-y-1">
                          {vehicle.fitnessExpiryDate && (
                            <div className="flex items-center gap-1.5 text-[10px]">
                              <span className="text-slate-400 font-semibold">FC:</span>
                              <span
                                className={`font-mono font-medium ${
                                  fcDays !== null && fcDays < 0
                                    ? 'text-rose-500 font-bold'
                                    : fcDays !== null && fcDays < 30
                                    ? 'text-amber-500 font-bold'
                                    : 'text-slate-600 dark:text-slate-400'
                                }`}
                              >
                                {vehicle.fitnessExpiryDate}
                                {fcDays !== null && fcDays < 30 && ` (${fcDays < 0 ? 'EXPIRED' : `${fcDays}d`})`}
                              </span>
                            </div>
                          )}

                          {vehicle.insuranceExpiryDate && (
                            <div className="flex items-center gap-1.5 text-[10px]">
                              <span className="text-slate-400 font-semibold">Ins:</span>
                              <span
                                className={`font-mono font-medium ${
                                  insDays !== null && insDays < 0
                                    ? 'text-rose-500 font-bold'
                                    : insDays !== null && insDays < 30
                                    ? 'text-amber-500 font-bold'
                                    : 'text-slate-600 dark:text-slate-400'
                                }`}
                              >
                                {vehicle.insuranceExpiryDate}
                                {insDays !== null && insDays < 30 && ` (${insDays < 0 ? 'EXPIRED' : `${insDays}d`})`}
                              </span>
                            </div>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              vehicle.status === 'ACTIVE'
                                ? 'bg-blue-500/15 text-blue-500'
                                : vehicle.status === 'IN_MAINTENANCE'
                                ? 'bg-amber-500/15 text-amber-500'
                                : 'bg-slate-500/15 text-slate-500'
                            }`}
                          >
                            {vehicle.status}
                          </span>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => {
                                setSelectedVehicle(vehicle);
                                setIsVehicleModalOpen(true);
                              }}
                              title="Edit Vehicle"
                              className="p-1.5 rounded-lg text-slate-500 hover:text-blue-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => {
                                setDeleteError(null);
                                setDeletingEntity({
                                  type: 'VEHICLE',
                                  id: vehicle.id,
                                  label: `${vehicle.registrationNumber} (${vehicle.model})`,
                                });
                              }}
                              title="Delete Vehicle"
                              className="p-1.5 rounded-lg text-slate-500 hover:text-rose-500 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Driver Modal ──────────────────────────────────────────────── */}
      <FleetDriverModal
        isOpen={isDriverModalOpen}
        driver={selectedDriver}
        vehicles={vehicles}
        onClose={() => {
          setIsDriverModalOpen(false);
          setSelectedDriver(null);
        }}
        onSuccess={() => {
          loadData();
        }}
      />

      {/* ── Vehicle Modal ─────────────────────────────────────────────── */}
      <FleetVehicleModal
        isOpen={isVehicleModalOpen}
        vehicle={selectedVehicle}
        drivers={drivers}
        onClose={() => {
          setIsVehicleModalOpen(false);
          setSelectedVehicle(null);
        }}
        onSuccess={() => {
          loadData();
        }}
      />

      {/* ── Delete Confirmation Dialog ─────────────────────────────────── */}
      {deletingEntity && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div className="bg-white dark:bg-[#0B132B] rounded-2xl w-full max-w-md border border-slate-200 dark:border-slate-800 p-5 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-lg bg-rose-500/10 text-rose-500">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                  Confirm Deletion of {deletingEntity.type === 'DRIVER' ? 'Driver' : 'Vehicle'}
                </h4>
                <p className="text-xs text-slate-400">This action cannot be undone.</p>
              </div>
            </div>

            <div className="p-3 rounded-lg bg-slate-50 dark:bg-slate-900/60 border border-slate-200 dark:border-slate-800 text-xs text-slate-700 dark:text-slate-300">
              Are you sure you want to delete <strong className="text-slate-900 dark:text-white">{deletingEntity.label}</strong>?
            </div>

            {deleteError && (
              <div className="p-3 text-xs bg-rose-500/10 text-rose-500 rounded-lg border border-rose-500/20 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{deleteError}</span>
              </div>
            )}

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingEntity(null)}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-bold rounded-lg bg-rose-600 hover:bg-rose-500 text-white shadow-md disabled:opacity-50"
              >
                {isDeleting ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
