'use client';

import React, { useState, useEffect } from 'react';
import { X, Factory, Plus, Trash2, CheckCircle2, AlertCircle } from 'lucide-react';
import { ProductionOrder, ProductionPriority } from '@/lib/services/productionService';
import { SiteMeasurementRecord } from '@/types/measurements';

interface JobCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaved: (order: ProductionOrder) => void;
}

interface DoorInputRow {
  doorNumber: string;
  model: string;
  rawHeightMm: number;
  rawWidthMm: number;
  handing: 'LH' | 'RH';
  lockType: string;
  finishColor: string;
}

const DEFAULT_FRP_MODELS = [
  '32mm Molded Teak FRP Door',
  '30mm Waterproof Solid Bathroom FRP Door',
  '35mm Heavy Duty Rosewood FRP Door',
  '32mm CNC Routed Frost White FRP Door',
  '32mm Antibacterial Hospital FRP Door',
];

const FACTORY_LINES = [
  'Line 1: FRP Hydraulic Press (300 Ton)',
  'Line 2: Heavy-Duty CNC Routing & Mortising',
  'Line 3: Polyurethane (PU) Coating & Foiling',
  'Line 4: Quality Inspection & Submersion Testing',
];

export function JobCardModal({ isOpen, onClose, onSaved }: JobCardModalProps) {
  const [measurements, setMeasurements] = useState<SiteMeasurementRecord[]>([]);
  const [selectedMeasurementId, setSelectedMeasurementId] = useState<string>('');
  const [customerName, setCustomerName] = useState<string>('');
  const [siteName, setSiteName] = useState<string>('');
  const [district, setDistrict] = useState<string>('Kozhikode');
  const [lineAssigned, setLineAssigned] = useState<string>(FACTORY_LINES[0]);
  const [priority, setPriority] = useState<ProductionPriority>('NORMAL');
  const [heightTolerance, setHeightTolerance] = useState<number>(10);
  const [widthTolerance, setWidthTolerance] = useState<number>(10);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const [doors, setDoors] = useState<DoorInputRow[]>([
    {
      doorNumber: 'D1 - Master Bed',
      model: '32mm Molded Teak FRP Door',
      rawHeightMm: 2100,
      rawWidthMm: 900,
      handing: 'RH',
      lockType: 'Mortise Lock 60mm',
      finishColor: 'Burma Teak',
    },
  ]);

  useEffect(() => {
    let active = true;
    fetch('/api/measurements')
      .then((res) => res.json())
      .then((json) => {
        if (active && json) {
          const list = Array.isArray(json.data)
            ? json.data
            : Array.isArray(json.measurements)
            ? json.measurements
            : [];
          setMeasurements(list);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  if (!isOpen) return null;

  const handleSelectMeasurement = (msrId: string) => {
    setSelectedMeasurementId(msrId);
    const msr = measurements.find((m) => m.id === msrId);
    if (!msr) return;

    setCustomerName(msr.customerName || 'Direct Client');
    setSiteName(msr.siteName || '');
    setDistrict(msr.district || 'Kozhikode');

    if (msr.doors && msr.doors.length > 0) {
      setDoors(
        msr.doors.map((d) => {
          const rawH = Math.max(Number(d.heightLeft) || 2100, Number(d.heightRight) || 2100);
          const rawW = Math.max(Number(d.widthTop) || 900, Number(d.widthBottom) || 900);
          return {
            doorNumber: d.doorNumber || 'Door',
            model: d.model || '32mm Molded Teak FRP Door',
            rawHeightMm: rawH,
            rawWidthMm: rawW,
            handing: d.hingeSide?.includes('Left') ? 'LH' : 'RH',
            lockType: d.lockType || 'Mortise Lock 60mm',
            finishColor: d.colour || 'Burma Teak',
          };
        })
      );
    }
  };

  const handleAddDoor = () => {
    setDoors((prev) => [
      ...prev,
      {
        doorNumber: `D${prev.length + 1}`,
        model: '30mm Waterproof Solid Bathroom FRP Door',
        rawHeightMm: 2080,
        rawWidthMm: 750,
        handing: 'RH',
        lockType: 'Baby Latch',
        finishColor: 'Frost White',
      },
    ]);
  };

  const handleRemoveDoor = (index: number) => {
    if (doors.length <= 1) return;
    setDoors((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleDoorChange = (index: number, field: keyof DoorInputRow, value: string | number) => {
    setDoors((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!customerName.trim()) {
      setError('Customer name is required.');
      return;
    }
    if (!siteName.trim()) {
      setError('Site / Project name is required.');
      return;
    }
    if (doors.length === 0) {
      setError('At least one door opening is required.');
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch('/api/production', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          measurementRef: selectedMeasurementId || null,
          customerName: customerName.trim(),
          siteName: siteName.trim(),
          district,
          lineAssigned,
          priority,
          tolerances: {
            heightDeductionMm: heightTolerance,
            widthDeductionMm: widthTolerance,
          },
          doors,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to create job card');
      }

      onSaved(json.data);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error creating job card');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
      <div className="relative w-full max-w-4xl max-h-[92vh] overflow-y-auto bg-white dark:bg-[#0B132B] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <Factory className="w-5 h-5 text-red-500" />
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Release Production Job Card & CNC Cutting Order
              </h2>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                FRP Compression Press • Finished cutting size calculated from raw masonry measurements
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-500 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Link Measurement selection */}
          <div className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800">
            <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
              Import from Approved Site Measurement Book (Optional)
            </label>
            <select
              value={selectedMeasurementId}
              onChange={(e) => handleSelectMeasurement(e.target.value)}
              className="w-full px-3 py-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white"
            >
              <option value="">-- Manual entry / Custom Job Card --</option>
              {measurements.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.refNumber} - {m.siteName} ({m.customerName || 'Client'} - {m.district}) [{m.doors?.length || 0} doors]
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div>
              <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Customer / Dealer Name *
              </label>
              <input
                type="text"
                required
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
                placeholder="e.g. Malabar Builders"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Site / Project Name *
              </label>
              <input
                type="text"
                required
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
                placeholder="e.g. Kakkanad Villa 14"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Plant Line Assigned
              </label>
              <select
                value={lineAssigned}
                onChange={(e) => setLineAssigned(e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white"
              >
                {FACTORY_LINES.map((l) => (
                  <option key={l} value={l}>
                    {l}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Production Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as ProductionPriority)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white font-bold"
              >
                <option value="NORMAL">Normal</option>
                <option value="HIGH">High Priority</option>
                <option value="URGENT">Urgent Express</option>
              </select>
            </div>
          </div>

          {/* Tolerance Controls */}
          <div className="p-3 bg-red-50/50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-xl grid grid-cols-1 sm:grid-cols-3 gap-3 items-center">
            <div>
              <span className="text-xs font-bold text-red-600 dark:text-red-400 block">
                Manufacturing Tolerances (FRP)
              </span>
              <span className="text-[10px] text-slate-500">Deducted from raw masonry opening</span>
            </div>
            <div>
              <label className="text-[10px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Height Deduction (mm)
              </label>
              <input
                type="number"
                value={heightTolerance}
                onChange={(e) => setHeightTolerance(Number(e.target.value) || 0)}
                className="w-24 px-2 py-1 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs"
              />
            </div>
            <div>
              <label className="text-[10px] font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Width Deduction (mm)
              </label>
              <input
                type="number"
                value={widthTolerance}
                onChange={(e) => setWidthTolerance(Number(e.target.value) || 0)}
                className="w-24 px-2 py-1 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs"
              />
            </div>
          </div>

          {/* Door rows table */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 dark:text-white">
                Door Openings & Finished Cutting Dimensions ({doors.length} Doors)
              </span>
              <button
                type="button"
                onClick={handleAddDoor}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 rounded-lg hover:bg-red-100"
              >
                <Plus className="w-3 h-3" /> Add Door
              </button>
            </div>

            <div className="overflow-x-auto border border-slate-200 dark:border-slate-800 rounded-xl">
              <table className="w-full text-left text-xs text-slate-700 dark:text-slate-200">
                <thead className="bg-slate-50 dark:bg-slate-900 text-[10px] uppercase text-slate-400">
                  <tr>
                    <th className="p-2.5">Location</th>
                    <th className="p-2.5">Model</th>
                    <th className="p-2.5 text-center">Raw H (mm)</th>
                    <th className="p-2.5 text-center">Raw W (mm)</th>
                    <th className="p-2.5 text-center font-bold text-red-500">Finished Cut H</th>
                    <th className="p-2.5 text-center font-bold text-red-500">Finished Cut W</th>
                    <th className="p-2.5 text-center">Handing</th>
                    <th className="p-2.5">Finish Color</th>
                    <th className="p-2.5 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {doors.map((door, idx) => {
                    const finH = Math.max(0, door.rawHeightMm - heightTolerance);
                    const finW = Math.max(0, door.rawWidthMm - widthTolerance);
                    return (
                      <tr key={idx} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50">
                        <td className="p-2.5">
                          <input
                            type="text"
                            value={door.doorNumber}
                            onChange={(e) => handleDoorChange(idx, 'doorNumber', e.target.value)}
                            placeholder="e.g. D1"
                            className="w-24 px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs"
                          />
                        </td>
                        <td className="p-2.5">
                          <select
                            value={door.model}
                            onChange={(e) => handleDoorChange(idx, 'model', e.target.value)}
                            className="w-44 px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs"
                          >
                            {DEFAULT_FRP_MODELS.map((m) => (
                              <option key={m} value={m}>
                                {m}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="p-2.5 text-center">
                          <input
                            type="number"
                            value={door.rawHeightMm}
                            onChange={(e) => handleDoorChange(idx, 'rawHeightMm', parseInt(e.target.value, 10) || 0)}
                            className="w-16 px-1.5 py-1 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs"
                          />
                        </td>
                        <td className="p-2.5 text-center">
                          <input
                            type="number"
                            value={door.rawWidthMm}
                            onChange={(e) => handleDoorChange(idx, 'rawWidthMm', parseInt(e.target.value, 10) || 0)}
                            className="w-16 px-1.5 py-1 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs"
                          />
                        </td>
                        <td className="p-2.5 text-center font-bold text-red-600 dark:text-red-400 font-mono">
                          {finH} mm
                        </td>
                        <td className="p-2.5 text-center font-bold text-red-600 dark:text-red-400 font-mono">
                          {finW} mm
                        </td>
                        <td className="p-2.5 text-center">
                          <select
                            value={door.handing}
                            onChange={(e) => handleDoorChange(idx, 'handing', e.target.value as 'LH' | 'RH')}
                            className="w-16 px-1 py-1 text-center bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs font-bold"
                          >
                            <option value="RH">RH</option>
                            <option value="LH">LH</option>
                          </select>
                        </td>
                        <td className="p-2.5">
                          <input
                            type="text"
                            value={door.finishColor}
                            onChange={(e) => handleDoorChange(idx, 'finishColor', e.target.value)}
                            className="w-28 px-2 py-1 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded text-xs"
                          />
                        </td>
                        <td className="p-2.5 text-center">
                          <button
                            type="button"
                            onClick={() => handleRemoveDoor(idx)}
                            disabled={doors.length <= 1}
                            className="p-1 text-slate-400 hover:text-red-500 disabled:opacity-20"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-500 text-white text-xs font-semibold rounded-lg shadow-sm transition-colors disabled:opacity-50"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {isSubmitting ? 'Creating Job Card...' : 'Issue Job Card to Plant'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
