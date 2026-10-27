'use client';

import React, { useState } from 'react';
import { X, Award, ShieldAlert, CheckCircle2, Printer } from 'lucide-react';
import { WarrantyCertificate } from '@/types/fulfillment';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  initialCertificate?: WarrantyCertificate | null;
  onSuccess?: (cert: WarrantyCertificate) => void;
}

export function WarrantyCertificateModal({ isOpen, onClose, initialCertificate, onSuccess }: Props) {
  const [customerName, setCustomerName] = useState(initialCertificate?.customerName || '');
  const [siteAddress, setSiteAddress] = useState(initialCertificate?.siteAddress || '');
  const [district, setDistrict] = useState(initialCertificate?.district || 'Palakkad');
  const [warrantyPeriodYears, setWarrantyPeriodYears] = useState<10 | 15>(
    initialCertificate?.warrantyPeriodYears || 15
  );
  const [certificate, setCertificate] = useState<WarrantyCertificate | null>(initialCertificate || null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!customerName.trim() || !siteAddress.trim()) {
      setError('Please provide customer name and site address.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await fetch('/api/fulfillment/warranty', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerName,
          siteAddress,
          district,
          warrantyPeriodYears,
          coveredDoors: [
            {
              doorId: 'EXM-DR-2026-FRP-01',
              model: 'EXM-FRP-TL101 (Teakwood Embossed)',
              sizeMm: '2085 x 888 mm',
            },
            {
              doorId: 'EXM-DR-2026-FRP-02',
              model: 'EXM-FRP-TL101 (Teakwood Embossed)',
              sizeMm: '2085 x 888 mm',
            },
          ],
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Failed to issue warranty certificate');
      }

      setCertificate(json.data);
      if (onSuccess) onSuccess(json.data);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm print:p-0 print:bg-white">
      <div className="bg-white dark:bg-[#0B132B] rounded-2xl w-full max-w-2xl border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh] print:border-none print:shadow-none print:max-h-full print:w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-900/50 print:hidden">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-amber-500/10 text-amber-500">
              <Award className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-slate-900 dark:text-white">
                FRP Door Official Warranty Certificate
              </h3>
              <p className="text-xs text-slate-500">
                100% Water &amp; Termite Proof Material Guarantee (Excluding Accessories)
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

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {error && (
            <div className="p-3 text-xs bg-red-500/10 text-red-500 rounded-lg border border-red-500/20 print:hidden">
              {error}
            </div>
          )}

          {!certificate ? (
            <form onSubmit={handleGenerate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Customer / Owner Full Name *
                </label>
                <input
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="e.g. Jijo Abraham"
                  required
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Site District
                  </label>
                  <select
                    value={district}
                    onChange={(e) => setDistrict(e.target.value)}
                    className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                  >
                    {[
                      'Palakkad', 'Ernakulam', 'Kozhikode', 'Malappuram', 'Thrissur',
                      'Thiruvananthapuram', 'Kottayam', 'Kollam', 'Kannur', 'Alappuzha'
                    ].map((d) => (
                      <option key={d} value={d}>{d}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                    Warranty Term
                  </label>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setWarrantyPeriodYears(10)}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-lg border ${
                        warrantyPeriodYears === 10
                          ? 'bg-amber-500/10 border-amber-500 text-amber-500'
                          : 'border-slate-300 dark:border-slate-700 text-slate-500'
                      }`}
                    >
                      10 Years
                    </button>
                    <button
                      type="button"
                      onClick={() => setWarrantyPeriodYears(15)}
                      className={`flex-1 py-1.5 text-xs font-bold rounded-lg border ${
                        warrantyPeriodYears === 15
                          ? 'bg-amber-500/10 border-amber-500 text-amber-500'
                          : 'border-slate-300 dark:border-slate-700 text-slate-500'
                      }`}
                    >
                      15 Years (Premium)
                    </button>
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-700 dark:text-slate-300 mb-1">
                  Site / Building Address *
                </label>
                <textarea
                  rows={2}
                  value={siteAddress}
                  onChange={(e) => setSiteAddress(e.target.value)}
                  placeholder="e.g. Infopark Main Road, Kakkanad, Kochi"
                  required
                  className="w-full text-xs px-3 py-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:outline-none focus:ring-1 focus:ring-amber-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 dark:border-slate-800 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isSubmitting ? 'Generating...' : 'Issue Warranty Certificate'}
                </button>
              </div>
            </form>
          ) : (
            /* Certificate View */
            <div className="space-y-6">
              {/* Printed layout box */}
              <div className="p-6 rounded-xl border-2 border-amber-500/40 bg-gradient-to-b from-amber-50/20 via-white to-amber-50/10 dark:from-amber-950/20 dark:via-[#0B132B] dark:to-amber-950/10 space-y-4">
                {/* Brand header */}
                <div className="text-center border-b pb-4 border-amber-500/30">
                  <span className="text-[10px] tracking-widest font-black uppercase text-amber-600">
                    EXMARK DOORS • KERALA
                  </span>
                  <h1 className="text-xl font-black text-slate-900 dark:text-white mt-1">
                    CERTIFICATE OF LIMITED WARRANTY
                  </h1>
                  <p className="text-[11px] text-slate-500 font-mono mt-0.5">
                    Certificate No: {certificate.certificateNumber}
                  </p>
                </div>

                {/* Details */}
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-400 block text-[10px] uppercase">Issued To</span>
                    <strong className="text-slate-900 dark:text-white">{certificate.customerName}</strong>
                    <p className="text-slate-500 text-[11px]">{certificate.siteAddress}, {certificate.district}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-slate-400 block text-[10px] uppercase">Warranty Period</span>
                    <strong className="text-amber-600 text-sm">{certificate.warrantyPeriodYears} Years Replacement Warranty</strong>
                    <p className="text-slate-500 text-[11px]">Valid {certificate.validFrom} to {certificate.validUntil}</p>
                  </div>
                </div>

                {/* Coverage scope badge */}
                <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>
                    <strong>Scope:</strong> {certificate.coverageScope}
                  </span>
                </div>

                {/* Explicit Exclusions */}
                <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-xs space-y-1">
                  <div className="flex items-center gap-1.5 text-red-600 dark:text-red-400 font-bold text-[11px]">
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    <span>MANDATORY EXCLUSIONS (Warranty does NOT cover):</span>
                  </div>
                  <ul className="list-disc pl-5 text-[11px] text-red-700 dark:text-red-300 space-y-0.5">
                    {certificate.explicitExclusions.map((ex, i) => (
                      <li key={i}>{ex}</li>
                    ))}
                  </ul>
                </div>

                {/* Bilingual Care Instructions */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 text-[11px]">
                  <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 space-y-1">
                    <span className="font-bold text-slate-800 dark:text-slate-200">Door Care (English)</span>
                    <ul className="list-disc pl-4 text-slate-600 dark:text-slate-400 space-y-1">
                      {certificate.bilingualCareInstructions.english.map((inst, i) => (
                        <li key={i}>{inst}</li>
                      ))}
                    </ul>
                  </div>

                  <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 space-y-1 font-sans">
                    <span className="font-bold text-slate-800 dark:text-slate-200">സംരക്ഷണ നിർദ്ദേശങ്ങൾ (Malayalam)</span>
                    <ul className="list-disc pl-4 text-slate-600 dark:text-slate-400 space-y-1">
                      {certificate.bilingualCareInstructions.malayalam.map((inst, i) => (
                        <li key={i}>{inst}</li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Authorized Stamp */}
                <div className="pt-4 flex justify-between items-end text-[10px] text-slate-400 border-t border-slate-200 dark:border-slate-800">
                  <div>
                    <p>EXMARK Doors Kerala Quality Control Wing</p>
                    <p>Palakkad / Calicut Manufacturing Plants</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-slate-700 dark:text-slate-300">Authorized Technical Signatory</p>
                    <p>EXMARK Industries (P) Ltd</p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 print:hidden">
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 text-xs font-medium text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 rounded-lg"
                >
                  Close
                </button>
                <button
                  type="button"
                  onClick={handlePrint}
                  className="px-4 py-2 text-xs font-medium text-white bg-amber-600 rounded-lg hover:bg-amber-700 flex items-center gap-1.5 shadow-sm"
                >
                  <Printer className="w-3.5 h-3.5" />
                  Print Warranty Certificate
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
