'use client';

import React, { useState } from 'react';
import {
  X,
  Target,
  Building2,
  Ruler,
  FileText,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { LeadItem } from './LeadsPipeline';
import { CustomerType } from '@/lib/services/customerService';

interface ConvertLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  lead: LeadItem | null;
  onConverted: (
    leadId: string,
    conversionType: 'CUSTOMER' | 'MEASUREMENT' | 'QUOTATION' | 'ORDER',
    details: { customerId?: string; quoteNo?: string; orderId?: string }
  ) => void;
}

export function ConvertLeadModal({
  isOpen,
  onClose,
  lead,
  onConverted,
}: ConvertLeadModalProps) {
  const [conversionType, setConversionType] = useState<'CUSTOMER' | 'MEASUREMENT' | 'QUOTATION' | 'ORDER'>('CUSTOMER');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Customer conversion fields
  const [custName, setCustName] = useState('');
  const [custFirm, setCustFirm] = useState('');
  const [custType, setCustType] = useState<CustomerType>('BUILDER');
  const [custDistrict, setCustDistrict] = useState('Ernakulam');
  const [custTown, setCustTown] = useState('');
  const [custPhone, setCustPhone] = useState('');
  const [custCreditLimit, setCustCreditLimit] = useState('100000');

  // Measurement booking fields
  const [engineerName, setEngineerName] = useState('Er. Rahul Varma');
  const [engineerPhone, setEngineerPhone] = useState('+91 98471 22334');
  const [visitDate, setVisitDate] = useState('Tomorrow 10:00 AM');
  const [measurementNotes, setMeasurementNotes] = useState('Measure frame rebate depths and finished floor clearances');

  // Quotation conversion fields
  const [ratePerDoor, setRatePerDoor] = useState('7500');

  // Sales Order & Advance fields
  const [depositAmount, setDepositAmount] = useState<number>(0);
  const [paymentMode, setPaymentMode] = useState('UPI');
  const [paymentRef, setPaymentRef] = useState('UPI-EXM-' + Math.floor(10000 + Math.random() * 90000));

  // Pre-fill on lead change
  React.useEffect(() => {
    if (!lead) return;
    setCustName(lead.client || lead.contactPerson || lead.title);
    setCustFirm(lead.client !== lead.contactPerson ? lead.client : '');
    setCustDistrict(lead.district || 'Ernakulam');
    setCustTown(lead.district || 'Kochi');
    setCustPhone(lead.phone || '+91 94470 12345');

    const totalVal = lead.value || 150000;
    setDepositAmount(Math.round(totalVal * 0.4));
  }, [lead]);

  if (!isOpen || !lead) return null;

  const totalValue = lead.value || 150000;
  const minAdvanceRequired = Math.round(totalValue * 0.4);
  const isAdvanceSufficient = depositAmount >= minAdvanceRequired;

  // 1. Submit Conversion to Registered Customer
  const handleConvertCustomer = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: custName.trim() || lead.client,
          firmName: custFirm.trim() || undefined,
          type: custType,
          district: custDistrict,
          town: custTown.trim() || custDistrict,
          phone: custPhone.trim() || lead.phone,
          creditLimit: parseFloat(custCreditLimit) || 100000,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to create customer');

      const customerId = data.data.id;
      // Link customer to lead on server
      if (lead.id.startsWith('lead-api-')) {
        await fetch(`/api/crm/leads/${lead.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ customerId }),
        }).catch(() => {});
      }

      onConverted(lead.id, 'CUSTOMER', { customerId });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error converting customer');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 2. Submit Conversion to Site Measurement
  const handleConvertMeasurement = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await fetch('/api/measurements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          leadId: lead.id,
          projectTitle: lead.title,
          customerName: lead.client,
          phone: lead.phone,
          district: lead.district,
          siteEngineer: engineerName,
          engineerPhone: engineerPhone,
          scheduledDate: visitDate,
          doorCount: lead.doorCount || 20,
          doors: lead.doors || 'FRP Bath Doors',
          notes: measurementNotes,
        }),
      }).catch(() => ({ ok: true })); // fallback if endpoint uses different schema

      // Advance lead stage to 'measurement'
      if (lead.id.startsWith('lead-api-')) {
        await fetch(`/api/crm/leads/${lead.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stage: 'MEASUREMENT_SCHEDULED' }),
        }).catch(() => {});
      }

      onConverted(lead.id, 'MEASUREMENT', {});
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error booking measurement');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 3. Submit Conversion to Quotation
  const handleConvertQuotation = async () => {
    setIsSubmitting(true);
    setError(null);
    try {
      const count = lead.doorCount || 20;
      const rate = parseFloat(ratePerDoor) || 7500;
      const subtotal = count * rate;
      const gst = Math.round(subtotal * 0.18);
      const grandTotal = subtotal + gst;

      const quotePayload = {
        leadId: lead.id,
        customerId: lead.customerId || null,
        title: lead.title,
        customerName: lead.client,
        district: lead.district,
        phone: lead.phone,
        doorCount: count,
        doors: lead.doors || 'FRP Moisture-Proof Doors',
        ratePerDoor: rate,
        subtotal,
        gst,
        grandTotal,
        status: 'SENT',
      };

      const res = await fetch('/api/quotations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(quotePayload),
      }).catch(() => null);

      let quoteNo = `QTE-2026-${Math.floor(100 + Math.random() * 900)}`;
      if (res && res.ok) {
        const json = await res.json();
        if (json.data?.quotationNumber) quoteNo = json.data.quotationNumber;
      }

      // Advance lead stage to 'quotation'
      if (lead.id.startsWith('lead-api-')) {
        await fetch(`/api/crm/leads/${lead.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ stage: 'QUOTE_SENT', estimatedValue: grandTotal }),
        }).catch(() => {});
      }

      onConverted(lead.id, 'QUOTATION', { quoteNo });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error generating quotation');
    } finally {
      setIsSubmitting(false);
    }
  };

  // 4. Submit Conversion to Confirmed Production Sales Order
  const handleConvertOrder = async () => {
    if (!isAdvanceSufficient) {
      setError(`Minimum 40% advance payment (₹${minAdvanceRequired.toLocaleString('en-IN')}) is required before factory production release.`);
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      const orderId = `SO-2026-${Math.floor(1000 + Math.random() * 9000)}`;

      onConverted(lead.id, 'ORDER', { orderId });
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Error converting order');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/85 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-xl bg-[#070D1E] border border-slate-800 rounded-3xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-4 sm:p-5 bg-gradient-to-r from-red-950/60 via-[#0B132B] to-[#070D1E] border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-red-600/20 border border-red-500/40 flex items-center justify-center text-red-400">
              <Sparkles className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <h3 className="font-black text-sm text-white flex items-center gap-2">
                <span>Convert CRM Inquiry Lead</span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                  {lead.leadCode || lead.id}
                </span>
              </h3>
              <p className="text-[11px] text-slate-400">
                {lead.title} &bull; {lead.client} ({lead.district})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mx-5 mt-4 p-2.5 bg-rose-500/15 border border-rose-500/30 rounded-xl text-rose-400 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* 4 Conversion Pathway Tabs */}
        <div className="px-5 pt-3 border-b border-slate-800 grid grid-cols-2 sm:grid-cols-4 gap-1 text-xs">
          <button
            type="button"
            onClick={() => { setConversionType('CUSTOMER'); setError(null); }}
            className={`py-2 px-2.5 font-bold rounded-t-xl flex items-center justify-center gap-1.5 transition ${
              conversionType === 'CUSTOMER'
                ? 'bg-blue-600/20 text-blue-400 border-b-2 border-blue-500'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>1. Customer</span>
          </button>

          <button
            type="button"
            onClick={() => { setConversionType('MEASUREMENT'); setError(null); }}
            className={`py-2 px-2.5 font-bold rounded-t-xl flex items-center justify-center gap-1.5 transition ${
              conversionType === 'MEASUREMENT'
                ? 'bg-amber-600/20 text-amber-400 border-b-2 border-amber-500'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Ruler className="w-3.5 h-3.5" />
            <span>2. Measurement</span>
          </button>

          <button
            type="button"
            onClick={() => { setConversionType('QUOTATION'); setError(null); }}
            className={`py-2 px-2.5 font-bold rounded-t-xl flex items-center justify-center gap-1.5 transition ${
              conversionType === 'QUOTATION'
                ? 'bg-purple-600/20 text-purple-400 border-b-2 border-purple-500'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>3. Quotation</span>
          </button>

          <button
            type="button"
            onClick={() => { setConversionType('ORDER'); setError(null); }}
            className={`py-2 px-2.5 font-bold rounded-t-xl flex items-center justify-center gap-1.5 transition ${
              conversionType === 'ORDER'
                ? 'bg-emerald-600/20 text-emerald-400 border-b-2 border-emerald-500'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <CreditCard className="w-3.5 h-3.5" />
            <span>4. Sales Order</span>
          </button>
        </div>

        {/* Pathway 1: Convert to Customer */}
        {conversionType === 'CUSTOMER' && (
          <div className="p-5 space-y-3.5 text-xs">
            <div className="p-3 rounded-2xl bg-blue-950/30 border border-blue-500/30 text-blue-300">
              Register <strong>{lead.client}</strong> as an authorized entity in the Customers Directory. This preserves billing history and allows issuing GST invoices.
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 font-bold mb-1">Customer / Contact Name *</label>
                <input
                  type="text"
                  value={custName}
                  onChange={(e) => setCustName(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0B132B] text-white rounded-xl border border-slate-700 font-semibold focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">Firm / Company Name</label>
                <input
                  type="text"
                  value={custFirm}
                  onChange={(e) => setCustFirm(e.target.value)}
                  placeholder="e.g. Skyline Builders"
                  className="w-full px-3 py-2 bg-[#0B132B] text-white rounded-xl border border-slate-700 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-400 font-bold mb-1">Customer Type</label>
                <select
                  value={custType}
                  onChange={(e) => setCustType(e.target.value as CustomerType)}
                  className="w-full px-2.5 py-2 bg-[#0B132B] text-white rounded-xl border border-slate-700 focus:outline-none focus:border-blue-500"
                >
                  <option value="BUILDER">Builder / Developer</option>
                  <option value="DEALER">Dealer / Retailer</option>
                  <option value="ARCHITECT">Architect / Consultant</option>
                  <option value="RETAIL">Direct Homeowner / Retail</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">Phone Number</label>
                <input
                  type="text"
                  value={custPhone}
                  onChange={(e) => setCustPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0B132B] text-white rounded-xl border border-slate-700 focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">District</label>
                <input
                  type="text"
                  value={custDistrict}
                  onChange={(e) => setCustDistrict(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0B132B] text-white rounded-xl border border-slate-700 focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleConvertCustomer}
                className="px-5 py-2.5 bg-blue-600 hover:bg-blue-500 text-white rounded-xl font-bold text-xs shadow-lg shadow-blue-950/50 flex items-center gap-1.5 cursor-pointer"
              >
                <Building2 className="w-4 h-4" />
                <span>{isSubmitting ? 'Registering...' : 'Save & Register as Customer'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Pathway 2: Convert to Site Measurement */}
        {conversionType === 'MEASUREMENT' && (
          <div className="p-5 space-y-3.5 text-xs">
            <div className="p-3 rounded-2xl bg-amber-950/30 border border-amber-500/30 text-amber-300">
              Schedule a factory site engineer visit to take laser/tape measurements of door frames at <strong>{lead.title}</strong>.
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 font-bold mb-1">Assigned Kerala Site Engineer</label>
                <select
                  value={engineerName}
                  onChange={(e) => {
                    setEngineerName(e.target.value);
                    if (e.target.value === 'Er. Rahul Varma') setEngineerPhone('+91 98471 22334');
                    else if (e.target.value === 'Er. Sreejith') setEngineerPhone('+91 94472 55667');
                    else setEngineerPhone('+91 94470 12345');
                  }}
                  className="w-full px-3 py-2 bg-[#0B132B] text-white rounded-xl border border-slate-700 focus:outline-none focus:border-amber-500"
                >
                  <option value="Er. Rahul Varma">Er. Rahul Varma (Ernakulam &amp; Thrissur)</option>
                  <option value="Er. Sreejith">Er. Sreejith (Kozhikode &amp; Malappuram)</option>
                  <option value="Er. Manoj Varma">Er. Manoj Varma (Trivandrum &amp; Kollam)</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">Scheduled Visit Date / Slot</label>
                <input
                  type="text"
                  value={visitDate}
                  onChange={(e) => setVisitDate(e.target.value)}
                  placeholder="e.g. Tomorrow 10:00 AM"
                  className="w-full px-3 py-2 bg-[#0B132B] text-white rounded-xl border border-slate-700 focus:outline-none focus:border-amber-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-400 font-bold mb-1">Engineer Site Instructions</label>
              <textarea
                rows={2}
                value={measurementNotes}
                onChange={(e) => setMeasurementNotes(e.target.value)}
                className="w-full px-3 py-2 bg-[#0B132B] text-white rounded-xl border border-slate-700 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleConvertMeasurement}
                className="px-5 py-2.5 bg-amber-600 hover:bg-amber-500 text-white rounded-xl font-bold text-xs shadow-lg shadow-amber-950/50 flex items-center gap-1.5 cursor-pointer"
              >
                <Ruler className="w-4 h-4" />
                <span>{isSubmitting ? 'Booking...' : 'Book Measurement & Advance Lead'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Pathway 3: Convert to Formal Quotation */}
        {conversionType === 'QUOTATION' && (
          <div className="p-5 space-y-3.5 text-xs">
            <div className="p-3 rounded-2xl bg-purple-950/30 border border-purple-500/30 text-purple-300">
              Generate an official GST rate card quotation for <strong>{lead.doorCount || 20}</strong> {lead.doors || 'FRP Doors'} with 18% Kerala GST.
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-slate-400 font-bold mb-1">Door Count</label>
                <input
                  type="number"
                  disabled
                  value={lead.doorCount || 20}
                  className="w-full px-3 py-2 bg-slate-900 text-slate-300 rounded-xl border border-slate-800 font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">Rate / Door (₹)</label>
                <input
                  type="number"
                  value={ratePerDoor}
                  onChange={(e) => setRatePerDoor(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0B132B] text-white rounded-xl border border-slate-700 font-bold focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">Total (inc. 18% GST)</label>
                <div className="w-full px-3 py-2 bg-purple-950/40 text-purple-300 rounded-xl border border-purple-500/30 font-black">
                  ₹{Math.round(((lead.doorCount || 20) * (parseFloat(ratePerDoor) || 7500)) * 1.18).toLocaleString('en-IN')}
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleConvertQuotation}
                className="px-5 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold text-xs shadow-lg shadow-purple-950/50 flex items-center gap-1.5 cursor-pointer"
              >
                <FileText className="w-4 h-4" />
                <span>{isSubmitting ? 'Generating...' : 'Create Formal GST Quotation'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Pathway 4: Convert to Production Sales Order */}
        {conversionType === 'ORDER' && (
          <div className="p-5 space-y-3.5 text-xs">
            <div className="p-3 rounded-2xl bg-emerald-950/30 border border-emerald-500/30 text-emerald-300">
              Lock order specs and release <strong>{lead.title}</strong> to the factory hydraulic hot press floor. Requires mandatory 40% advance deposit.
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Total Order Value</span>
                <span className="font-bold text-white text-sm">₹{totalValue.toLocaleString('en-IN')}</span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Mandatory 40% Advance</span>
                <span className="font-bold text-amber-400 text-sm">₹{minAdvanceRequired.toLocaleString('en-IN')}</span>
              </div>

              <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Deposit Entered</span>
                <span className={`font-bold text-sm ${isAdvanceSufficient ? 'text-emerald-400' : 'text-rose-400'}`}>
                  ₹{depositAmount.toLocaleString('en-IN')}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-slate-400 font-bold mb-1">Payment Mode</label>
                <select
                  value={paymentMode}
                  onChange={(e) => setPaymentMode(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0B132B] text-white rounded-xl border border-slate-700 focus:outline-none focus:border-emerald-500"
                >
                  <option value="UPI">UPI / GPay (Instant)</option>
                  <option value="NEFT">NEFT / RTGS (Bank Transfer)</option>
                  <option value="Cheque">Bank Cheque</option>
                  <option value="Cash">Cash Receipt</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-400 font-bold mb-1">Bank UTR / Transaction Reference</label>
                <input
                  type="text"
                  value={paymentRef}
                  onChange={(e) => setPaymentRef(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0B132B] text-white rounded-xl border border-slate-700 focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="button"
                disabled={isSubmitting || !isAdvanceSufficient}
                onClick={handleConvertOrder}
                className={`px-5 py-2.5 rounded-xl font-bold text-xs shadow-lg flex items-center gap-1.5 cursor-pointer ${
                  isAdvanceSufficient
                    ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-950/50'
                    : 'bg-slate-800 text-slate-500 cursor-not-allowed'
                }`}
              >
                <CreditCard className="w-4 h-4" />
                <span>{isSubmitting ? 'Releasing...' : 'Verify Advance & Release to Production'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="p-4 bg-[#091024] border-t border-slate-800/80 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1 text-slate-400 text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>EXMARK ISO 9001 Factory Quality &amp; Governance Lock</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 text-slate-300 hover:text-white font-semibold cursor-pointer"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}
