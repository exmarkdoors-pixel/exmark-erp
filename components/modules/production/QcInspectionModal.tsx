'use client';

import React, { useState } from 'react';
import { X, ShieldCheck, CheckCircle2, AlertTriangle, XCircle, Hammer } from 'lucide-react';
import {
  ProductionOrder,
  ProductionDoorItem,
  QcInspectionRecord,
  QcDecision,
  DefectType,
} from '@/lib/services/productionService';

interface QcInspectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  order: ProductionOrder;
  door: ProductionDoorItem;
  onSaved: (updatedOrder: ProductionOrder) => void;
}

export function QcInspectionModal({
  isOpen,
  onClose,
  order,
  door,
  onSaved,
}: QcInspectionModalProps) {
  const [inspectorName, setInspectorName] = useState<string>('Factory QA Lead');
  const [checklist, setChecklist] = useState({
    dimensionalAccuracy: true,
    squarenessTolerance: true,
    surfaceCoatingAdhesion: true,
    lockPocketAccuracy: true,
    hingeRebateEdgeSealing: true,
    waterImmersionDensity: true,
  });

  const [decision, setDecision] = useState<QcDecision>('PASSED');
  const [defectType, setDefectType] = useState<DefectType>('NONE');
  const [defectSeverity, setDefectSeverity] = useState<'MINOR' | 'MAJOR' | 'CRITICAL'>('MINOR');
  const [reworkNotes, setReworkNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleToggleCheck = (key: keyof typeof checklist) => {
    setChecklist((prev) => {
      const updated = { ...prev, [key]: !prev[key] };
      const allPassed = Object.values(updated).every(Boolean);
      if (!allPassed && decision === 'PASSED') {
        setDecision('REWORK_REQUIRED');
      } else if (allPassed && decision === 'REWORK_REQUIRED') {
        setDecision('PASSED');
      }
      return updated;
    });
  };

  const handleSubmit = async (submitDecision: QcDecision) => {
    setError(null);
    if (!inspectorName.trim()) {
      setError('Inspector name is required');
      return;
    }

    setIsSubmitting(true);
    const inspection: QcInspectionRecord = {
      inspectedAt: new Date().toISOString(),
      inspectorName: inspectorName.trim(),
      checklist,
      decision: submitDecision,
      defectType: submitDecision === 'PASSED' ? 'NONE' : defectType,
      defectSeverity: submitDecision === 'PASSED' ? undefined : defectSeverity,
      reworkNotes: reworkNotes.trim() || undefined,
      actionTaken:
        submitDecision === 'PASSED'
          ? 'Approved for packaging and dispatch.'
          : submitDecision === 'REWORK_REQUIRED'
          ? `Returned to floor for rework: ${reworkNotes}`
          : `Scrapped due to unrecoverable defect: ${defectType}`,
    };

    try {
      const res = await fetch(`/api/production/${order.id}/doors/${door.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ inspection }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        onSaved(json.data);
        onClose();
      } else {
        setError(json.error || 'Failed to record QC inspection');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Network error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs">
      <div className="relative w-full max-w-2xl bg-white dark:bg-[#0B132B] rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-800 p-6 space-y-5 max-h-[92vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-red-500" />
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">
                Final QC Technical Inspection & Defect Tracker
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Door ID: <span className="font-mono font-bold text-red-500">{door.doorId}</span> • Job Card:{' '}
                <span className="font-mono">{order.jobCardNumber}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Door Profile Summary */}
        <div className="p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          <div>
            <span className="text-[10px] text-slate-400 block">Location</span>
            <span className="font-bold text-slate-900 dark:text-white">{door.doorNumber}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block">Cut Size</span>
            <span className="font-mono font-bold text-red-500">
              {door.finishedHeightMm} x {door.finishedWidthMm} mm
            </span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block">Model</span>
            <span className="truncate block font-medium text-slate-700 dark:text-slate-300">{door.model}</span>
          </div>
          <div>
            <span className="text-[10px] text-slate-400 block">Handing / Finish</span>
            <span className="font-medium text-slate-700 dark:text-slate-300">
              {door.handing} • {door.finishColor}
            </span>
          </div>
        </div>

        {/* Inspector Name */}
        <div>
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
            Quality Assurance Inspector
          </label>
          <input
            type="text"
            value={inspectorName}
            onChange={(e) => setInspectorName(e.target.value)}
            className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs text-slate-900 dark:text-white"
            placeholder="Inspector Full Name"
          />
        </div>

        {/* 6-Point Checklist */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
            6-Point Technical Inspection Checklist
          </label>
          <div className="space-y-2">
            {[
              {
                key: 'dimensionalAccuracy' as const,
                title: 'Dimensional Accuracy (Height & Width within ±1.5mm tolerance)',
                desc: 'Verified using calibrated steel tape measure at top, middle, and bottom.',
              },
              {
                key: 'squarenessTolerance' as const,
                title: 'Squareness & Diagonal Tolerance (<2mm diagonal variance)',
                desc: 'Cross-corner measurement verified with right-angle framing square.',
              },
              {
                key: 'surfaceCoatingAdhesion' as const,
                title: 'Surface Finish, Uniformity & PU Coating Adhesion',
                desc: 'Zero surface pinholes, color variance, orange peel, or blistering.',
              },
              {
                key: 'lockPocketAccuracy' as const,
                title: 'Lock Pocket & Mortise Routing Depth Precision',
                desc: '60mm backset and faceplate mortise flush with door stile edge.',
              },
              {
                key: 'hingeRebateEdgeSealing' as const,
                title: 'Hinge Rebate Depth & Edge Sealing Waterproof Integrity',
                desc: '100% composite edge resin wrap, zero exposed core.',
              },
              {
                key: 'waterImmersionDensity' as const,
                title: 'Water Resistance & Core Density Verification',
                desc: 'Solid density verified, water repellent barrier sealed on all 4 sides.',
              },
            ].map((item) => (
              <label
                key={item.key}
                onClick={() => handleToggleCheck(item.key)}
                className={`flex items-start gap-3 p-2.5 rounded-xl border text-xs cursor-pointer transition-colors ${
                  checklist[item.key]
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-900 dark:text-emerald-200'
                    : 'bg-red-500/10 border-red-500/30 text-red-900 dark:text-red-200'
                }`}
              >
                <input
                  type="checkbox"
                  checked={checklist[item.key]}
                  onChange={() => {}} // handled by parent onClick
                  className="mt-0.5 rounded text-red-600 cursor-pointer"
                />
                <div className="flex-1">
                  <span className="font-bold block">{item.title}</span>
                  <span className="text-[11px] opacity-80 block">{item.desc}</span>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Defect & Rework Logging Section */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
          <div className="flex items-center gap-2">
            <Hammer className="w-4 h-4 text-amber-500" />
            <h3 className="text-xs font-bold text-slate-900 dark:text-white">Defect & Rework Logging</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">Defect Classification</label>
              <select
                value={defectType}
                onChange={(e) => setDefectType(e.target.value as DefectType)}
                className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
              >
                <option value="NONE">None (Pass Clean)</option>
                <option value="DIMENSIONAL_VARIATION">Dimensional Variation (&gt;1.5mm)</option>
                <option value="SURFACE_BLEMISH">Surface Scratch / Dent</option>
                <option value="PU_COATING_PEEL">PU Coating Flaw / Peel</option>
                <option value="LOCK_POCKET_MISALIGNMENT">Lock Pocket Misalignment</option>
                <option value="EDGE_DELAMINATION">Edge Delamination</option>
                <option value="CORE_VOID">Internal Core Void</option>
                <option value="WARPAGE">Door Slab Warpage</option>
              </select>
            </div>

            <div>
              <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">Defect Severity</label>
              <select
                value={defectSeverity}
                onChange={(e) => setDefectSeverity(e.target.value as 'MINOR' | 'MAJOR' | 'CRITICAL')}
                className="w-full px-2.5 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
              >
                <option value="MINOR">Minor (Touch-up on line)</option>
                <option value="MAJOR">Major (Re-route / Re-coat required)</option>
                <option value="CRITICAL">Critical (Total slab rejection)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-[11px] text-slate-500 dark:text-slate-400 mb-1">
              Rework Notes / Corrective Instructions
            </label>
            <textarea
              rows={2}
              value={reworkNotes}
              onChange={(e) => setReworkNotes(e.target.value)}
              placeholder="e.g. Rebate routing required by 1mm on latch side, re-buff PU coating..."
              className="w-full px-3 py-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-lg text-xs"
            />
          </div>
        </div>

        {/* Action Decision Buttons */}
        <div className="flex flex-col sm:flex-row justify-end items-center gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => handleSubmit('REJECTED')}
            className="w-full sm:w-auto px-4 py-2 bg-red-600/15 hover:bg-red-600 text-red-500 hover:text-white border border-red-500/30 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            <XCircle className="w-4 h-4" /> Reject & Scrap
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => handleSubmit('REWORK_REQUIRED')}
            className="w-full sm:w-auto px-4 py-2 bg-amber-600/15 hover:bg-amber-600 text-amber-500 hover:text-white border border-amber-500/30 rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            <Hammer className="w-4 h-4" /> Flag for Rework
          </button>
          <button
            type="button"
            disabled={isSubmitting}
            onClick={() => handleSubmit('PASSED')}
            className="w-full sm:w-auto px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            <CheckCircle2 className="w-4 h-4" /> Certify & Pass QC
          </button>
        </div>
      </div>
    </div>
  );
}
