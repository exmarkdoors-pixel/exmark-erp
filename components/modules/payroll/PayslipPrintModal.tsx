'use client';

import React from 'react';
import { X, Printer, CheckCircle2, Building2, User, CreditCard, Calendar } from 'lucide-react';
import type { SalarySlipRecord } from '@/types/payroll';

interface PayslipPrintModalProps {
  slip: SalarySlipRecord | null;
  isOpen: boolean;
  onClose: () => void;
}

export function PayslipPrintModal({ slip, isOpen, onClose }: PayslipPrintModalProps) {
  if (!isOpen || !slip) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/70 backdrop-blur-xs overflow-y-auto print:p-0 print:bg-white">
      <div className="relative w-full max-w-2xl bg-white text-slate-900 rounded-2xl shadow-2xl border border-slate-200 overflow-hidden print:border-none print:shadow-none print:rounded-none">
        {/* Top Control Bar (Hidden when printing) */}
        <div className="flex items-center justify-between px-5 py-3.5 bg-slate-900 text-white print:hidden">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-red-500" />
            <span className="text-xs font-bold uppercase tracking-wider">
              Payslip Preview • {slip.salarySlipNumber}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print A4 Payslip</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ── Printable A4 Payslip Content ─────────────────────────────────── */}
        <div className="p-6 sm:p-8 space-y-6 text-slate-900">
          {/* Header */}
          <div className="flex justify-between items-start border-b-2 border-slate-900 pb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-black tracking-tight text-red-600">EXMARK</span>
                <span className="text-lg font-black tracking-wider text-slate-800">DOORS &amp; FRAMES</span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                Industrial Area, KINFRA Park, Palakkad - Kerala • Tel: +91 94470 00000
              </p>
              <p className="text-[10px] text-slate-400">
                GSTIN: 32AABCU9603R1ZX • Factory Payroll Division
              </p>
            </div>

            <div className="text-right">
              <span className="inline-block px-2.5 py-1 bg-slate-100 rounded text-xs font-black uppercase tracking-wider text-slate-800 border border-slate-300">
                Salary Pay Slip
              </span>
              <p className="text-xs font-bold text-slate-900 mt-1 font-mono">
                {slip.month}
              </p>
              <p className="text-[10px] text-slate-500 font-mono">
                Ref: {slip.salarySlipNumber}
              </p>
            </div>
          </div>

          {/* Employee & Bank Details Grid */}
          <div className="grid grid-cols-2 gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-slate-500">
                <User className="w-3.5 h-3.5" />
                <span className="font-semibold text-[11px]">Employee Information:</span>
              </div>
              <p className="font-bold text-slate-900 text-sm">{slip.employeeName}</p>
              <p className="text-slate-600">
                Emp Code: <span className="font-mono font-bold text-slate-900">{slip.employeeCode}</span>
              </p>
              <p className="text-slate-600">
                Dept / Role: <span className="font-semibold text-slate-800">{slip.department} ({slip.role})</span>
              </p>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center gap-1.5 text-slate-500">
                <CreditCard className="w-3.5 h-3.5" />
                <span className="font-semibold text-[11px]">Payment &amp; Bank Details:</span>
              </div>
              <p className="text-slate-600">
                Bank: <span className="font-semibold text-slate-800">{slip.bankName || 'Factory Bank Transfer'}</span>
              </p>
              <p className="text-slate-600">
                A/C No: <span className="font-mono font-bold text-slate-900">{slip.bankAccountNumber || '—'}</span>
              </p>
              <p className="text-slate-600">
                IFSC: <span className="font-mono font-semibold text-slate-800">{slip.ifscCode || '—'}</span>
              </p>
              <p className="text-slate-600">
                Mode: <span className="font-bold text-emerald-700">{slip.paymentMode}</span>
              </p>
            </div>
          </div>

          {/* Attendance Summary */}
          <div className="grid grid-cols-3 gap-2 text-center text-xs">
            <div className="p-2.5 rounded-lg bg-slate-100 border border-slate-200">
              <span className="text-[10px] text-slate-500 font-bold uppercase block">Calendar Days</span>
              <span className="text-sm font-black font-mono text-slate-900">{slip.totalDaysInMonth}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-100 border border-slate-200">
              <span className="text-[10px] text-slate-500 font-bold uppercase block">Payable Days</span>
              <span className="text-sm font-black font-mono text-slate-900">{slip.payableDays}</span>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-100 border border-slate-200">
              <span className="text-[10px] text-slate-500 font-bold uppercase block">Overtime Hours</span>
              <span className="text-sm font-black font-mono text-amber-700">{slip.overtimeHours} hrs</span>
            </div>
          </div>

          {/* Earnings vs Deductions Table */}
          <div className="border border-slate-300 rounded-xl overflow-hidden text-xs">
            <div className="grid grid-cols-2 bg-slate-200 font-bold text-slate-800 border-b border-slate-300">
              <div className="p-2.5 border-r border-slate-300">Earnings</div>
              <div className="p-2.5">Deductions</div>
            </div>

            <div className="grid grid-cols-2 divide-x divide-slate-200">
              {/* Earnings Column */}
              <div className="p-3 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-600">Basic Pay Earned</span>
                  <span className="font-mono font-bold text-slate-900">₹{slip.earnedBasicPay.toLocaleString('en-IN')}</span>
                </div>
                {slip.earnedOvertimePay > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Overtime Pay ({slip.overtimeHours}h)</span>
                    <span className="font-mono font-bold text-slate-900">₹{slip.earnedOvertimePay.toLocaleString('en-IN')}</span>
                  </div>
                )}
                {slip.foodAllowance > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Food / Meal Allowance</span>
                    <span className="font-mono font-bold text-slate-900">₹{slip.foodAllowance.toLocaleString('en-IN')}</span>
                  </div>
                )}
                {slip.conveyanceAllowance > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Conveyance Allowance</span>
                    <span className="font-mono font-bold text-slate-900">₹{slip.conveyanceAllowance.toLocaleString('en-IN')}</span>
                  </div>
                )}
                {slip.performanceBonus > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Production / KPI Bonus</span>
                    <span className="font-mono font-bold text-slate-900">₹{slip.performanceBonus.toLocaleString('en-IN')}</span>
                  </div>
                )}
              </div>

              {/* Deductions Column */}
              <div className="p-3 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-600">Salary Advance Repaid</span>
                  <span className="font-mono font-bold text-rose-700">₹{slip.advanceDeduction.toLocaleString('en-IN')}</span>
                </div>
                {slip.canteenFoodDeduction > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Canteen Meal Deduction</span>
                    <span className="font-mono font-bold text-rose-700">₹{slip.canteenFoodDeduction.toLocaleString('en-IN')}</span>
                  </div>
                )}
                {slip.pfDeduction > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Provident Fund (PF)</span>
                    <span className="font-mono font-bold text-rose-700">₹{slip.pfDeduction.toLocaleString('en-IN')}</span>
                  </div>
                )}
                {slip.esiDeduction > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">ESI Insurance</span>
                    <span className="font-mono font-bold text-rose-700">₹{slip.esiDeduction.toLocaleString('en-IN')}</span>
                  </div>
                )}
                {slip.otherDeductions > 0 && (
                  <div className="flex justify-between">
                    <span className="text-slate-600">Other Deductions</span>
                    <span className="font-mono font-bold text-rose-700">₹{slip.otherDeductions.toLocaleString('en-IN')}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Totals Row */}
            <div className="grid grid-cols-2 bg-slate-100 font-bold border-t border-slate-300">
              <div className="p-2.5 flex justify-between border-r border-slate-300">
                <span>Gross Earnings:</span>
                <span className="font-mono text-slate-900">₹{slip.grossSalary.toLocaleString('en-IN')}</span>
              </div>
              <div className="p-2.5 flex justify-between">
                <span>Total Deductions:</span>
                <span className="font-mono text-rose-700">₹{slip.totalDeductions.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          {/* Net Salary Highlight */}
          <div className="p-4 bg-emerald-50 border-2 border-emerald-500 rounded-xl flex flex-col sm:flex-row items-center justify-between gap-3">
            <div>
              <span className="text-[10px] font-black uppercase tracking-wider text-emerald-800">
                Net Take Home Salary
              </span>
              <p className="text-xs text-slate-600 italic mt-0.5 font-medium">
                Amount in Words: <span className="font-bold text-slate-900">{slip.netPayableInWords}</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-black text-emerald-800 font-mono">
                ₹{slip.netPayableRupees.toLocaleString('en-IN')}
              </p>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-200 text-emerald-900">
                {slip.paymentStatus}
              </span>
            </div>
          </div>

          {/* Signatures */}
          <div className="pt-8 grid grid-cols-2 gap-8 text-center text-xs">
            <div className="space-y-12">
              <div className="border-t border-slate-400 pt-1">
                <p className="font-bold text-slate-800">Employee Signature</p>
                <p className="text-[10px] text-slate-500">I acknowledge receipt of full salary.</p>
              </div>
            </div>

            <div className="space-y-12">
              <div className="border-t border-slate-400 pt-1">
                <p className="font-bold text-slate-800">For EXMARK DOORS &amp; FRAMES</p>
                <p className="text-[10px] text-slate-500">Authorized Plant HR / Finance Signatory</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
export default PayslipPrintModal;
