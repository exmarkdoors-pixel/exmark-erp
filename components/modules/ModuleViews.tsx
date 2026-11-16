'use client';

import React, { useState, useEffect } from 'react';
import {
  Users,
  Target,
  FileSpreadsheet,
  Ruler,
  ShoppingBag,
  Factory,
  Boxes,
  Truck,
  ReceiptIndianRupee,
  UserCheck,
  Megaphone,
  BarChart3,
  Settings,
  Layers,
  Search,
  Plus,
  Phone,
  MapPin,
  CheckCircle2,
  Clock,
  Sparkles,
  RefreshCw,
  AlertCircle,
  Filter,
  Edit2,
  Printer,
  TrendingUp,
  Share2,
  Award,
  ShieldCheck,
  Download,
  QrCode,
  Zap,
  X,
  Trash2,
  CheckSquare,
  Square,
  MessageSquare,
  KeyRound,
  UserPlus,
  ArrowUpCircle,
  Calendar,
} from 'lucide-react';
import { buildWhatsAppUrl } from '@/lib/services/whatsappService';
import { DoorMeasurementModal } from './DoorMeasurementModal';
import { AutoQuotationModal } from './measurements/AutoQuotationModal';
import { SiteMeasurementRecord } from '@/types/measurements';
import ProductCategoriesSettings from '@/components/settings/ProductCategoriesSettings';
import AdminCustomizationSettings from '@/components/settings/AdminCustomizationSettings';
import CompanyFactoryProfileSettings from '@/components/settings/CompanyFactoryProfileSettings';
import SystemBackupAndUpdateTab from '@/components/settings/SystemBackupAndUpdateTab';
import InbuiltUpdateTab from '@/components/settings/InbuiltUpdateTab';
import CloudSyncSettingsTab from '@/components/settings/CloudSyncSettingsTab';
import StaffAccessManagementTab from '@/components/settings/StaffAccessManagementTab';
import { DisplayAppearanceSettings } from '@/components/settings/DisplayAppearanceSettings';
import { ERP_ROLES, UserRole } from '@/lib/auth/roles';
import { CustomerFormModal } from './customers/CustomerFormModal';
import { apiFetch } from '@/lib/api/apiClient';
import { LeadFormModal } from './crm/LeadFormModal';
import LeadsPipeline from './crm/LeadsPipeline';
import { QuotationHub } from './quotations/QuotationHub';
import { QuotationBuilder } from './quotations/QuotationBuilder';
import SalesAndReturnHub from './sales/SalesAndReturnHub';
import BomAndRecipeHub from './engineering/BomAndRecipeHub';
import QualityControlHub from './quality/QualityControlHub';
import PlantMaintenanceHub from './maintenance/PlantMaintenanceHub';
import SubcontractingHub from './jobwork/SubcontractingHub';
import SiteInstallationHub from './fieldservice/SiteInstallationHub';
import GatePassHub from './logistics/GatePassHub';
import { ReportPrintDocumentHub, ReportPrintTheme } from './reports/ReportPrintDocumentHub';
import { generateExecutiveReportPdf } from '@/lib/utils/pdfReportEngine';
import { RecordAdvanceModal } from './sales/RecordAdvanceModal';
import BatchPrintHub from './production/BatchPrintHub';
import { JobCardModal } from './production/JobCardModal';
import { StickerPrintModal } from './production/StickerPrintModal';
import { ProductionBoardHub } from './production/ProductionBoardHub';
import { PurchaseOrderModal, PurchaseOrderPrintModal } from './purchases/PurchaseOrderModal';
import type { PurchaseOrderRecord } from '@/app/api/purchases/route';
import { PaymentReceiptModal } from './finance/PaymentReceiptModal';
import { FinancialStrategistModal } from './finance/FinancialStrategistModal';
import { AiFinancialStrategistPanel } from './finance/AiFinancialStrategistPanel';
import { ContractorPayablesPanel } from './finance/ContractorPayablesPanel';
import { OrderProfitPanel } from './finance/OrderProfitPanel';
import { BreakEvenPanel } from './finance/BreakEvenPanel';
import BusinessHealthForecastingPanel from './finance/BusinessHealthForecastingPanel';
import DailyEveningClosingModal from './finance/DailyEveningClosingModal';
import { StageBoqModal } from './production/StageBoqModal';
import { CustomFrameManagerModal } from './production/CustomFrameManagerModal';
import { DeliveryChallanModal } from './production/DeliveryChallanModal';
import { CustomFrameProfile, DEFAULT_FRAME_PROFILES } from '@/lib/utils/frameDefaults';
import {
  BoqMaterialRatesConfig,
  DEFAULT_BOQ_MATERIAL_RATES,
  FrameLengthMode,
  mergeBoqMaterialRates,
} from '@/lib/utils/boqFormulaEngine';
import { LogContractorWorkModal } from './production/LogContractorWorkModal';
import { WhatsAppSendModal } from './communication/WhatsAppSendModal';
import { CustomerConfirmationModal } from './communication/CustomerConfirmationModal';
import { DispatchScheduleModal } from './fulfillment/DispatchScheduleModal';
import { InstallationSignoffModal } from './fulfillment/InstallationSignoffModal';
import { WarrantyCertificateModal } from './fulfillment/WarrantyCertificateModal';
import { GeotaggedWarrantyHub } from './fulfillment/GeotaggedWarrantyHub';
import { DriversAndVehiclesMasterTab } from './fulfillment/DriversAndVehiclesMasterTab';
import { MarketingSalesExpansionHub } from './sales/MarketingSalesExpansionHub';
import { DispatchRecord, InstallationRecord, WarrantyCertificate } from '@/types/fulfillment';
import { Customer } from '@/lib/services/customerService';
import { Lead } from '@/lib/services/crmService';
import { Quotation } from '@/lib/services/quotationService';
import { ProductionOrder, ProductionStage, ProductionDoorItem } from '@/lib/services/productionService';
import { Invoice, Payment, FinancialTarget } from '@/types/finance';
import { ReportExecutionResult, WhatsAppDocumentType } from '@/types/communication';

/* -------------------------------------------------------------
 * 1. CUSTOMERS VIEW
 * ------------------------------------------------------------- */
export function CustomersView() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Multi-selection & batch deletion state
  const [selectedCustomerIds, setSelectedCustomerIds] = useState<string[]>([]);
  const [isConfirmDeleteOpen, setIsConfirmDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<'ALL' | 'SELECTED' | string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchCustomers = () => {
    setIsLoading(true);
    apiFetch('/api/customers')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) {
          setCustomers(json.data);
        }
      })
      .catch(() => {})
      .finally(() => {
        setIsLoading(false);
      });
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  const handleCustomerSaved = (saved: Customer) => {
    setCustomers((prev) => {
      const idx = prev.findIndex((c) => c.id === saved.id);
      if (idx >= 0) {
        const copy = [...prev];
        copy[idx] = saved;
        return copy;
      }
      return [saved, ...prev];
    });
    setToastMessage(`Customer "${saved.name}" (${saved.town}) successfully saved.`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Quick Lead creation from Customer state
  const [leadCustomerTarget, setLeadCustomerTarget] = useState<Customer | null>(null);
  const [leadProjectTitle, setLeadProjectTitle] = useState('');
  const [leadDoorsRequirement, setLeadDoorsRequirement] = useState('25 FRP Bath Doors');
  const [leadEstValue, setLeadEstValue] = useState('185000');
  const [isCreatingLead, setIsCreatingLead] = useState(false);

  const handleOpenLeadModalForCustomer = (cust: Customer) => {
    setLeadCustomerTarget(cust);
    setLeadProjectTitle(`${cust.name} - Project Inquiry`);
    setLeadDoorsRequirement('25 FRP Bath Doors');
    setLeadEstValue('185000');
  };

  const handleConfirmCreateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leadCustomerTarget) return;
    setIsCreatingLead(true);
    try {
      const res = await apiFetch('/api/crm/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customerId: leadCustomerTarget.id,
          title: leadProjectTitle.trim() || `${leadCustomerTarget.name} - Inquiry`,
          client: leadCustomerTarget.firmName || leadCustomerTarget.name,
          contactPerson: leadCustomerTarget.name,
          phone: leadCustomerTarget.phone,
          district: leadCustomerTarget.district,
          doors: leadDoorsRequirement.trim() || 'FRP Doors',
          doorCount: parseInt(leadDoorsRequirement) || 25,
          value: parseFloat(leadEstValue) || 185000,
          stage: 'NEW',
          notes: `Created from Customers section for ${leadCustomerTarget.name} (${leadCustomerTarget.town}, ${leadCustomerTarget.district}).`,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Failed to create lead');
      }
      setToastMessage(`🎉 Sales Lead "${data.data.title}" successfully created in CRM for ${leadCustomerTarget.name}!`);
      setTimeout(() => setToastMessage(null), 4000);
      setLeadCustomerTarget(null);
    } catch (err: any) {
      setToastMessage(`Error creating lead: ${err.message}`);
      setTimeout(() => setToastMessage(null), 4000);
    } finally {
      setIsCreatingLead(false);
    }
  };

  const filtered = customers.filter((c) => {
    const q = searchTerm.toLowerCase();
    const matchesSearch =
      c.name.toLowerCase().includes(q) ||
      c.district.toLowerCase().includes(q) ||
      c.town.toLowerCase().includes(q) ||
      (c.firmName && c.firmName.toLowerCase().includes(q));
    const matchesType = typeFilter === 'All' || c.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const isAllSelected = filtered.length > 0 && filtered.every((c) => selectedCustomerIds.includes(c.id));

  const handleSelectAll = () => {
    if (isAllSelected) {
      setSelectedCustomerIds([]);
    } else {
      setSelectedCustomerIds(filtered.map((c) => c.id));
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedCustomerIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const triggerDelete = (target: 'ALL' | 'SELECTED' | string) => {
    setDeleteTarget(target);
    setIsConfirmDeleteOpen(true);
  };

  const executeDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      let body: any = {};
      let queryParam = '';

      if (deleteTarget === 'ALL') {
        body = { all: true };
      } else if (deleteTarget === 'SELECTED') {
        body = { ids: selectedCustomerIds };
      } else {
        queryParam = `?id=${deleteTarget}`;
      }

      const res = await apiFetch(`/api/customers${queryParam}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: queryParam ? undefined : JSON.stringify(body),
      });
      const data = await res.json();

      if (data.success) {
        if (deleteTarget === 'ALL') {
          setCustomers([]);
          setSelectedCustomerIds([]);
          setToastMessage('All customer records successfully deleted. Clean fresh start ready.');
        } else if (deleteTarget === 'SELECTED') {
          const removedSet = new Set(selectedCustomerIds);
          setCustomers((prev) => prev.filter((c) => !removedSet.has(c.id)));
          setSelectedCustomerIds([]);
          setToastMessage(`Deleted ${data.deletedCount || selectedCustomerIds.length} customer records.`);
        } else {
          setCustomers((prev) => prev.filter((c) => c.id !== deleteTarget));
          setSelectedCustomerIds((prev) => prev.filter((i) => i !== deleteTarget));
          setToastMessage('Customer record deleted.');
        }
        setTimeout(() => setToastMessage(null), 4000);
      } else {
        alert(data.error || 'Failed to delete customer(s).');
      }
    } catch {
      alert('Error occurred while deleting customer record(s).');
    } finally {
      setIsDeleting(false);
      setIsConfirmDeleteOpen(false);
      setDeleteTarget(null);
    }
  };

  return (
    <div className="space-y-6">
      {toastMessage && (
        <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Header Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Users className="w-6 h-6 text-red-500" />
            Dealer & Builder Directory
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Kerala Authorized Dealers, Commercial Builders, Architects & Direct Contractors
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap self-start sm:self-auto">
          {selectedCustomerIds.length > 0 && (
            <button
              onClick={() => triggerDelete('SELECTED')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-600/20 text-rose-300 border border-rose-500/40 rounded-lg text-xs font-semibold hover:bg-rose-600 hover:text-white transition-all cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete Selected ({selectedCustomerIds.length})
            </button>
          )}

          {customers.length > 0 && (
            <button
              onClick={() => triggerDelete('ALL')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-950/40 text-red-400 border border-red-600/40 rounded-lg text-xs font-semibold hover:bg-red-600 hover:text-white transition-all cursor-pointer"
              title="Clear all customers to start with fresh clean data"
            >
              <Trash2 className="w-3.5 h-3.5" /> Clear All (Start Fresh)
            </button>
          )}

          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-500 transition-colors cursor-pointer shadow-sm"
          >
            <Plus className="w-4 h-4" /> Add New Customer
          </button>
        </div>
      </div>

      {/* Search, Filter & Select All Bar */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search dealer name, town or Kerala district..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-white dark:bg-[#0B132B] rounded-lg border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200"
          />
        </div>
        <select
          value={typeFilter}
          onChange={(e) => setTypeFilter(e.target.value)}
          className="px-3 py-2 bg-white dark:bg-[#0B132B] rounded-lg border border-slate-200 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200"
        >
          <option value="All">All Customer Types</option>
          <option value="DEALER">Authorized Dealers</option>
          <option value="BUILDER">Direct Builders</option>
          <option value="ARCHITECT">Architects & Designers</option>
          <option value="RETAIL">Retail Customers</option>
        </select>
      </div>

      {/* Selection Summary Toolbar */}
      {filtered.length > 0 && (
        <div className="flex items-center justify-between text-xs px-3 py-2 bg-slate-100 dark:bg-slate-900/60 rounded-lg border border-slate-200 dark:border-slate-800/80">
          <button
            onClick={handleSelectAll}
            className="flex items-center gap-1.5 text-slate-600 dark:text-slate-300 font-semibold hover:text-red-500 transition cursor-pointer"
          >
            {isAllSelected ? (
              <CheckSquare className="w-4 h-4 text-red-500" />
            ) : (
              <Square className="w-4 h-4 text-slate-400" />
            )}
            <span>{isAllSelected ? 'Deselect All' : 'Select All Customers (SELETE ALL)'}</span>
          </button>
          <span className="text-slate-400">
            {selectedCustomerIds.length > 0
              ? `${selectedCustomerIds.length} of ${filtered.length} customers selected`
              : `Total: ${filtered.length} customer records`}
          </span>
        </div>
      )}

      {isLoading ? (
        <div className="p-8 text-center text-xs text-slate-400">Loading customer directory...</div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center text-xs border border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-white dark:bg-[#0B132B]/40 space-y-3">
          <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-500 flex items-center justify-center mx-auto">
            <Users className="w-6 h-6" />
          </div>
          <h3 className="font-bold text-sm text-slate-900 dark:text-white">
            {customers.length === 0 ? 'Clean Slate — 0 Customer Records' : 'No matching customers found'}
          </h3>
          <p className="text-slate-400 max-w-sm mx-auto">
            {customers.length === 0
              ? 'Your customer directory is completely fresh with zero records. Click below to add your first client.'
              : 'Try adjusting your search keywords or customer type filter.'}
          </p>
          <button
            onClick={() => setIsModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 text-white rounded-lg text-xs font-semibold hover:bg-red-500 transition cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add First Customer
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((customer) => {
            const isSelected = selectedCustomerIds.includes(customer.id);
            return (
              <div
                key={customer.id}
                className={`bg-white dark:bg-[#0B132B] p-5 rounded-xl border transition-all space-y-3 relative ${
                  isSelected
                    ? 'border-red-500 ring-2 ring-red-500/20'
                    : 'border-slate-200 dark:border-slate-800 shadow-sm hover:border-slate-700'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2.5">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={() => handleToggleSelect(customer.id)}
                      className="mt-1 w-4 h-4 rounded text-red-600 bg-slate-900 border-slate-700 focus:ring-0 cursor-pointer"
                    />
                    <div>
                      <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {customer.type}
                      </span>
                      <h3 className="font-bold text-sm text-slate-900 dark:text-white mt-1">
                        {customer.name}
                      </h3>
                      {customer.firmName && (
                        <p className="text-xs text-slate-400">{customer.firmName}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-1.5 flex-wrap">
                    <button
                      type="button"
                      onClick={() => handleOpenLeadModalForCustomer(customer)}
                      className="px-2 py-0.5 rounded-lg bg-red-600/15 hover:bg-red-600/25 text-red-400 border border-red-500/30 text-[10px] font-bold inline-flex items-center gap-1 transition cursor-pointer"
                      title={`Create a CRM sales inquiry lead for ${customer.name}`}
                    >
                      <Target className="w-3 h-3 text-red-400" />
                      <span>+ Lead</span>
                    </button>
                    <a
                      href={buildWhatsAppUrl(
                        customer.phone,
                        `Hello ${customer.name}, greetings from EXMARK DOORS Kerala! How can we assist you with factory orders, site measurements or pricing today?`
                      )}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-2 py-0.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold inline-flex items-center gap-1 transition"
                      title={`Chat with ${customer.name} on WhatsApp`}
                    >
                      <MessageSquare className="w-3 h-3 text-emerald-400" />
                      <span>WhatsApp</span>
                    </a>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
                      {customer.status}
                    </span>
                    <button
                      onClick={() => triggerDelete(customer.id)}
                      className="p-1 text-slate-500 hover:text-rose-400 rounded hover:bg-rose-500/10 transition cursor-pointer"
                      title="Delete customer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="text-xs text-slate-500 dark:text-slate-400 space-y-1">
                  <div className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-red-500 shrink-0" />
                    <span>{customer.town}, {customer.district}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{customer.phone}</span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 dark:border-slate-800/80 grid grid-cols-2 gap-2 text-center text-xs">
                  <div className="p-2 rounded bg-slate-50 dark:bg-slate-900/60">
                    <span className="text-[10px] text-slate-400 block">Credit Limit</span>
                    <span className="font-bold text-slate-900 dark:text-white">₹{customer.creditLimit?.toLocaleString('en-IN') || 0}</span>
                  </div>
                  <div className="p-2 rounded bg-slate-50 dark:bg-slate-900/60">
                    <span className="text-[10px] text-slate-400 block">Outstanding</span>
                    <span className="font-bold text-red-500">₹{customer.outstandingBalance?.toLocaleString('en-IN') || 0}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* CONFIRMATION SAFETY MODAL */}
      {isConfirmDeleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-[#0B132B] border border-red-500/40 rounded-2xl max-w-md w-full p-6 space-y-4 shadow-2xl text-slate-200">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-red-500/20 text-red-400 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-base text-white">
                  {deleteTarget === 'ALL'
                    ? 'Clear All Customer Records?'
                    : deleteTarget === 'SELECTED'
                    ? `Delete ${selectedCustomerIds.length} Selected Customer(s)?`
                    : 'Delete Customer Record?'}
                </h3>
                <p className="text-xs text-slate-400">
                  {deleteTarget === 'ALL'
                    ? 'This will delete all customer data across the system to start with a completely fresh directory.'
                    : 'This action will permanently delete the selected customer(s).'}
                </p>
              </div>
            </div>

            <div className="p-3 bg-red-950/30 border border-red-500/30 rounded-xl text-xs text-red-300">
              ⚠️ <strong>Warning:</strong> A safety backup has been created in <code>data/backups/</code>.
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isDeleting}
                onClick={() => setIsConfirmDeleteOpen(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-slate-700 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={executeDelete}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-red-600 text-white hover:bg-red-500 transition cursor-pointer flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? 'Deleting...' : 'Yes, Delete Now'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      <CustomerFormModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSaved={handleCustomerSaved}
      />

      {/* QUICK MODAL: CREATE LEAD FOR CUSTOMER */}
      {leadCustomerTarget && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="relative w-full max-w-lg bg-[#070D1E] border border-slate-800 rounded-2xl shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-red-500" />
                <h3 className="font-black text-sm text-white">Create CRM Inquiry Lead for Customer</h3>
              </div>
              <button
                type="button"
                onClick={() => setLeadCustomerTarget(null)}
                className="p-1 rounded text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 text-xs space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-bold">Customer Name:</span>
                <span className="text-white font-bold">{leadCustomerTarget.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Phone &amp; District:</span>
                <span className="text-slate-300">{leadCustomerTarget.phone} &bull; {leadCustomerTarget.district}</span>
              </div>
              {leadCustomerTarget.firmName && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Firm / Business:</span>
                  <span className="text-slate-300">{leadCustomerTarget.firmName}</span>
                </div>
              )}
            </div>

            <form onSubmit={handleConfirmCreateLead} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-400 font-bold mb-1">Project / Inquiry Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Kozhikode Villa Project"
                  value={leadProjectTitle}
                  onChange={(e) => setLeadProjectTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-[#0B132B] text-white rounded-xl border border-slate-700 focus:outline-none focus:border-red-500 font-semibold"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Doors &amp; Material</label>
                  <input
                    type="text"
                    placeholder="e.g. 25 FRP Bath Doors"
                    value={leadDoorsRequirement}
                    onChange={(e) => setLeadDoorsRequirement(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0B132B] text-white rounded-xl border border-slate-700 focus:outline-none focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 font-bold mb-1">Est. Value (₹)</label>
                  <input
                    type="number"
                    placeholder="185000"
                    value={leadEstValue}
                    onChange={(e) => setLeadEstValue(e.target.value)}
                    className="w-full px-3 py-2 bg-[#0B132B] text-emerald-400 rounded-xl border border-slate-700 focus:outline-none focus:border-emerald-500 font-bold"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
                <button
                  type="button"
                  disabled={isCreatingLead}
                  onClick={() => setLeadCustomerTarget(null)}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingLead}
                  className="px-4 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black cursor-pointer shadow-md shadow-red-950/40 inline-flex items-center gap-1.5"
                >
                  <Target className="w-3.5 h-3.5" />
                  <span>{isCreatingLead ? 'Creating Lead...' : 'Create CRM Lead'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------
 * 2. CRM & LEADS VIEW
 * ------------------------------------------------------------- */
export function CrmLeadsView() {
  return <LeadsPipeline />;
}

/* -------------------------------------------------------------
 * 3. QUOTATIONS VIEW
 * ------------------------------------------------------------- */
export function QuotationsView({ userRole }: { userRole?: UserRole }) {
  return <QuotationHub userRole={userRole} />;
}

/* Module 4 (Door Measurements) removed by user specification */
export function DoorMeasurementsView() { return null; }

/* -------------------------------------------------------------
 * 5. SALES ORDERS VIEW
 * ------------------------------------------------------------- */
export function SalesOrdersView() {
  const [orders, setOrders] = useState<Array<{
    id: string;
    orderNumber: string;
    customerName: string;
    district: string;
    date: string;
    totalDoors: number;
    totalAmount: number;
    advanceAmount: number;
    advanceVerified: boolean;
    orderStatus: string;
  }>>([]);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [selectedAdvanceOrder, setSelectedAdvanceOrder] = useState<{
    id: string;
    orderNumber: string;
    customerName: string;
    totalAmount: number;
    advanceAmount: number;
    advanceVerified: boolean;
  } | null>(null);

  const fetchOrders = () => {
    fetch('/api/orders')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) {
          setOrders(json.data);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  const handleAction = async (orderId: string, action: 'VERIFY_ADVANCE' | 'RELEASE_TO_PRODUCTION') => {
    setIsProcessing(orderId);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ orderId, action }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        alert(data.error || 'Failed to process order action');
      } else {
        setToastMessage(data.message || 'Order updated successfully.');
        setTimeout(() => setToastMessage(null), 4000);
        fetchOrders();
      }
    } catch {
      alert('Error updating sales order.');
    } finally {
      setIsProcessing(null);
    }
  };

  const filteredOrders = filterStatus === 'ALL'
    ? orders
    : orders.filter((o) => o.orderStatus === filterStatus);

  const totalDoors = orders.reduce((sum, o) => sum + o.totalDoors, 0);
  const totalValue = orders.reduce((sum, o) => sum + o.totalAmount, 0);
  const inProd = orders.filter((o) => o.orderStatus === 'IN_PRODUCTION').length;
  const readyDispatch = orders.filter((o) => o.orderStatus === 'READY_TO_DISPATCH').length;

  return (
    <div className="space-y-6">
      {toastMessage && (
        <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ShoppingBag className="w-6 h-6 text-red-500" />
            Complete Sales Orders Registry
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Work orders, advance receipts, dispatch dates &amp; billing status across Kerala
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white dark:bg-[#0B132B] p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <span className="text-xs text-slate-400">Total Confirmed Orders</span>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">{orders.length} Orders</p>
          <span className="text-[11px] text-emerald-500 font-semibold">{totalDoors} Door Sets</span>
        </div>
        <div className="bg-white dark:bg-[#0B132B] p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <span className="text-xs text-slate-400">Total Work Order Value</span>
          <p className="text-2xl font-bold text-slate-900 dark:text-white">
            ₹{(totalValue / 100000).toFixed(2)} Lakhs
          </p>
          <span className="text-[11px] text-slate-400">Direct Net Value</span>
        </div>
        <div className="bg-white dark:bg-[#0B132B] p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <span className="text-xs text-slate-400">In Production Floor</span>
          <p className="text-2xl font-bold text-blue-500">{inProd} Orders</p>
          <span className="text-[11px] text-blue-400">FRP Press &amp; CNC</span>
        </div>
        <div className="bg-white dark:bg-[#0B132B] p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <span className="text-xs text-slate-400">Ready to Dispatch</span>
          <p className="text-2xl font-bold text-emerald-500">{readyDispatch} Orders</p>
          <span className="text-[11px] text-emerald-400">QC Passed</span>
        </div>
      </div>

      {/* Orders Table */}
      <div className="bg-white dark:bg-[#0B132B] rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex justify-between items-center flex-wrap gap-2">
          <div className="flex gap-2">
            {['ALL', 'CONFIRMED', 'IN_PRODUCTION', 'READY_TO_DISPATCH'].map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold ${
                  filterStatus === st
                    ? 'bg-red-600 text-white'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300'
                }`}
              >
                {st.replace(/_/g, ' ')}
              </button>
            ))}
          </div>
          <span className="text-xs text-slate-400">{filteredOrders.length} records found</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-400 uppercase text-[10px] font-semibold border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-3">Order Ref</th>
                <th className="p-3">Customer &amp; Site</th>
                <th className="p-3">District</th>
                <th className="p-3">Doors</th>
                <th className="p-3">Total Value</th>
                <th className="p-3">Advance Status</th>
                <th className="p-3">Production Status</th>
                <th className="p-3 text-right">Factory Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {filteredOrders.map((ord) => (
                <tr key={ord.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/40">
                  <td className="p-3 font-mono font-bold text-slate-900 dark:text-white">
                    {ord.orderNumber}
                  </td>
                  <td className="p-3 font-semibold text-slate-800 dark:text-slate-200">
                    {ord.customerName}
                  </td>
                  <td className="p-3 text-slate-500">{ord.district}</td>
                  <td className="p-3 font-bold text-red-500">{ord.totalDoors} Units</td>
                  <td className="p-3 font-semibold text-slate-900 dark:text-white">
                    ₹{ord.totalAmount.toLocaleString('en-IN')}
                  </td>
                  <td className="p-3">
                    {(() => {
                      const advPct = ord.totalAmount > 0 ? Math.round((ord.advanceAmount / ord.totalAmount) * 100) : 0;
                      const isSufficient = ord.advanceVerified && advPct >= 40;
                      return (
                        <div>
                          <span
                            className={`inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded ${
                              isSufficient
                                ? 'text-emerald-500 bg-emerald-500/10 border border-emerald-500/20'
                                : 'text-amber-400 bg-amber-500/10 border border-amber-500/20'
                            }`}
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            {isSufficient ? `Advance Verified (${advPct}%)` : `Advance Pending (${advPct}%)`}
                          </span>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            ₹{ord.advanceAmount.toLocaleString('en-IN')} / Min ₹{Math.round(ord.totalAmount * 0.4).toLocaleString('en-IN')} (40%)
                          </div>
                        </div>
                      );
                    })()}
                  </td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        ord.orderStatus === 'READY_TO_DISPATCH'
                          ? 'bg-emerald-500/15 text-emerald-500'
                          : ord.orderStatus === 'IN_PRODUCTION'
                          ? 'bg-blue-500/15 text-blue-500'
                          : 'bg-amber-500/15 text-amber-500'
                      }`}
                    >
                      {ord.orderStatus.replace(/_/g, ' ')}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    {ord.orderStatus === 'CONFIRMED' && (
                      <div className="flex items-center justify-end gap-1.5 flex-wrap">
                        <button
                          onClick={() => setSelectedAdvanceOrder(ord)}
                          className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-[11px] font-semibold transition cursor-pointer"
                        >
                          + Record Advance
                        </button>
                        <button
                          onClick={() => {
                            const advPct = ord.totalAmount > 0 ? Math.round((ord.advanceAmount / ord.totalAmount) * 100) : 0;
                            if (!ord.advanceVerified || advPct < 40) {
                              setToastMessage(
                                `Cannot release to production: Minimum 40% advance deposit is mandatory (Currently ${advPct}%). Opening Advance Deposit window...`
                              );
                              setSelectedAdvanceOrder(ord);
                              return;
                            }
                            handleAction(ord.id, 'RELEASE_TO_PRODUCTION');
                          }}
                          disabled={isProcessing === ord.id}
                          className="px-2.5 py-1 bg-red-600 hover:bg-red-500 text-white rounded text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer"
                        >
                          <Factory className="w-3 h-3" />
                          Release to Press 🚀
                        </button>
                      </div>
                    )}
                    {ord.orderStatus === 'IN_PRODUCTION' && (
                      <span className="text-[11px] font-semibold text-blue-400 inline-flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse" />
                        In Fabrication
                      </span>
                    )}
                    {ord.orderStatus === 'READY_TO_DISPATCH' && (
                      <div className="flex items-center justify-end gap-1.5">
                        <span className="text-[11px] font-semibold text-emerald-400 inline-flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" />
                          Ready to Ship
                        </span>
                        <button
                          onClick={() => {
                            setToastMessage(`Sales Bill generated for ${ord.orderNumber}. View in Quotations & Sales Hub.`);
                            setTimeout(() => setToastMessage(null), 4000);
                          }}
                          className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-bold transition flex items-center gap-1 cursor-pointer"
                          title="Convert to Sales (Sales Invoice / Bill)"
                        >
                          Convert to Sales 🧾
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record Advance Modal */}
      {selectedAdvanceOrder && (
        <RecordAdvanceModal
          isOpen={!!selectedAdvanceOrder}
          onClose={() => setSelectedAdvanceOrder(null)}
          order={selectedAdvanceOrder}
          onSuccess={() => {
            fetchOrders();
            setToastMessage('Advance payment successfully recorded & verified! Order is now eligible for Release to Press.');
            setTimeout(() => setToastMessage(null), 4000);
            setSelectedAdvanceOrder(null);
          }}
        />
      )}
    </div>
  );
}

/* -------------------------------------------------------------
 * 5B. SALES & SALES RETURN VIEW
 * ------------------------------------------------------------- */
export function SalesAndReturnView() {
  return <SalesAndReturnHub />;
}

/* -------------------------------------------------------------
 * 5C. BOM & RECIPE ENGINEERING VIEW (SAP PP-BD / Odoo PLM)
 * ------------------------------------------------------------- */
export function BomAndRecipeView() {
  return <BomAndRecipeHub />;
}

/* -------------------------------------------------------------
 * 5D. QUALITY CONTROL & ASSURANCE VIEW (SAP QM / ISO 9001)
 * ------------------------------------------------------------- */
export function QualityControlView() {
  return <QualityControlHub />;
}

/* -------------------------------------------------------------
 * 5E. PLANT MAINTENANCE & OEE VIEW (SAP PM / TPM)
 * ------------------------------------------------------------- */
export function PlantMaintenanceView() {
  return <PlantMaintenanceHub />;
}

/* -------------------------------------------------------------
 * 5F. SUBCONTRACTING & JOB WORK VIEW
 * ------------------------------------------------------------- */
export function SubcontractingView() {
  return <SubcontractingHub />;
}

/* -------------------------------------------------------------
 * 5F2. 12L STICKERS & BATCH PRINT HUB (Die-Cut Labels & Batch QC)
 * ------------------------------------------------------------- */
export function BatchPrintView() {
  return <BatchPrintHub />;
}

/* -------------------------------------------------------------
 * 5G. GATE PASS & LOGISTICS VIEW (SAP LE-TRA)
 * ------------------------------------------------------------- */
export function GatePassView() {
  return <GatePassHub />;
}

/* -------------------------------------------------------------
 * 5H. SITE INSTALLATION & PUNCH LIST VIEW (Dynamics 365 FSM)
 * ------------------------------------------------------------- */
export function SiteInstallationView() {
  return <SiteInstallationHub />;
}

/* -------------------------------------------------------------
 * 6. PRODUCTION VIEW
 * ------------------------------------------------------------- */
export function ProductionView() {
  return <ProductionBoardHub />;
}

/* -------------------------------------------------------------
 * 7. INVENTORY VIEW
 * ------------------------------------------------------------- */
export function InventoryView() {
  const [inventory, setInventory] = useState<Array<{
    id: string;
    itemCode: string;
    name: string;
    category: string;
    currentStock: number;
    unit: string;
    reorderLevel: number;
    warehouseLocation: string;
    status: string;
  }>>([]);

  const loadInventory = () => {
    fetch('/api/inventory')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) {
          setInventory(json.data);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadInventory();
  }, []);

  const handleAdjustStock = async (id: string, adjustment: number) => {
    try {
      const res = await fetch('/api/inventory', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'ADJUST_STOCK', id, adjustment }),
      });
      const json = await res.json();
      if (json.success) {
        setInventory((prev) => prev.map((item) => (item.id === id ? json.data : item)));
      }
    } catch (err) {
      console.error('Failed to adjust stock:', err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Boxes className="w-6 h-6 text-red-500" />
            Raw Material &amp; Hardware Inventory
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Resin chemicals, fiberglass roving, WPC virgin polymer granules &amp; SS hinges
          </p>
        </div>
      </div>

      <div className="bg-white dark:bg-[#0B132B] rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-900 text-slate-400 uppercase text-[10px]">
              <tr>
                <th className="p-3">SKU Code</th>
                <th className="p-3">Material Name</th>
                <th className="p-3">Category</th>
                <th className="p-3">Current Stock</th>
                <th className="p-3">Reorder Point</th>
                <th className="p-3">Warehouse Bay</th>
                <th className="p-3">Status</th>
                <th className="p-3 text-right">Quick Stock In / Out</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {inventory.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                  <td className="p-3 font-mono text-slate-400">{item.itemCode}</td>
                  <td className="p-3 font-bold text-slate-900 dark:text-white">{item.name}</td>
                  <td className="p-3">{item.category}</td>
                  <td className="p-3 font-bold text-slate-900 dark:text-white">
                    {item.currentStock} {item.unit}
                  </td>
                  <td className="p-3 text-slate-400">{item.reorderLevel} {item.unit}</td>
                  <td className="p-3 text-slate-400">{item.warehouseLocation}</td>
                  <td className="p-3">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        item.status === 'In Stock'
                          ? 'bg-emerald-500/15 text-emerald-500'
                          : 'bg-amber-500/15 text-amber-500'
                      }`}
                    >
                      {item.status}
                    </span>
                  </td>
                  <td className="p-3 text-right">
                    <div className="inline-flex gap-1.5">
                      <button
                        onClick={() => handleAdjustStock(item.id, 50)}
                        className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 font-bold hover:bg-emerald-500/20 text-[10px]"
                        title="Add 50 units"
                      >
                        +50 In
                      </button>
                      <button
                        onClick={() => handleAdjustStock(item.id, -25)}
                        className="px-2 py-0.5 rounded bg-red-500/10 text-red-600 font-bold hover:bg-red-500/20 text-[10px]"
                        title="Consume 25 units"
                      >
                        -25 Out
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

/* -------------------------------------------------------------
 * 8. PURCHASES VIEW
 * ------------------------------------------------------------- */
export function PurchasesView() {
  const [purchases, setPurchases] = useState<PurchaseOrderRecord[]>([]);
  const [isPoModalOpen, setIsPoModalOpen] = useState(false);
  const [printingPo, setPrintingPo] = useState<PurchaseOrderRecord | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const loadPurchases = () => {
    fetch('/api/purchases')
      .then((res) => res.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) {
          setPurchases(json.data);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadPurchases();
  }, []);

  const notify = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(null), 4000);
  };

  const handleUpdateStatus = async (poId: string, status: string) => {
    try {
      const res = await fetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'UPDATE_STATUS', id: poId, status }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setPurchases((prev) => prev.map((p) => (p.id === poId ? json.data : p)));
        notify(`PO status updated to ${status}.`);
      }
    } catch {
      notify('Failed to update PO status.');
    }
  };

  const handleReceiveAndSyncStock = async (po: PurchaseOrderRecord) => {
    try {
      const res = await fetch('/api/purchases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'RECEIVE_AND_SYNC_STOCK', id: po.id }),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setPurchases((prev) => prev.map((p) => (p.id === po.id ? json.data : p)));
        notify(
          `${po.poNumber} marked RECEIVED! Synced ${json.syncedInventoryItems ?? 0} item(s) into Inventory stock.`
        );
      } else {
        notify(json.error || 'Could not receive PO.');
      }
    } catch {
      notify('Failed to sync received stock.');
    }
  };

  const handleDeletePo = async (po: PurchaseOrderRecord) => {
    if (!confirm(`Delete Purchase Order ${po.poNumber}?`)) return;
    try {
      const res = await fetch(`/api/purchases?id=${encodeURIComponent(po.id)}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (json.success) {
        setPurchases((prev) => prev.filter((p) => p.id !== po.id));
        notify(`Deleted ${po.poNumber}.`);
      }
    } catch {
      notify('Delete failed.');
    }
  };

  const totalSpend = purchases.reduce((sum, p) => sum + Number(p.totalAmount || 0), 0);
  const pendingCount = purchases.filter((p) => p.status !== 'RECEIVED' && p.status !== 'DELIVERED').length;
  const visiblePurchases =
    statusFilter === 'ALL' ? purchases : purchases.filter((p) => p.status === statusFilter);

  return (
    <div className="space-y-6">
      {toastMsg && (
        <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{toastMsg}</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Layers className="w-6 h-6 text-red-500" />
            Purchase Orders (PO) &amp; Supplier Bills
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Create vendor POs for resin, consumables &amp; hardware — Receive Goods automatically syncs Inventory stock
          </p>
        </div>

        <button
          type="button"
          onClick={() => setIsPoModalOpen(true)}
          className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl text-xs font-bold shadow cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>+ Create Purchase Order</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-[#0B132B] p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <span className="text-xs text-slate-400">Total Procurement Value</span>
          <p className="text-2xl font-bold text-slate-900 dark:text-white mt-1">
            ₹{totalSpend.toLocaleString('en-IN')}
          </p>
          <span className="text-[11px] text-slate-400">Direct Non-GST Factory Bills</span>
        </div>
        <div className="bg-white dark:bg-[#0B132B] p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <span className="text-xs text-slate-400">Total POs Created</span>
          <p className="text-2xl font-bold text-blue-500 mt-1">{purchases.length} Orders</p>
          <span className="text-[11px] text-blue-400">Stored in Purchases Ledger</span>
        </div>
        <div className="bg-white dark:bg-[#0B132B] p-4 rounded-xl border border-slate-200 dark:border-slate-800">
          <span className="text-xs text-slate-400">Open / Pending Receipt</span>
          <p className="text-2xl font-bold text-amber-400 mt-1">{pendingCount} Pending</p>
          <span className="text-[11px] text-slate-400">Awaiting Store Receipt &amp; Stock Sync</span>
        </div>
      </div>

      {/* PO Table */}
      <div className="bg-white dark:bg-[#0B132B] rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap justify-between items-center gap-2">
          <h3 className="font-bold text-xs uppercase text-slate-500">Vendor Purchase Orders Registry</h3>
          <div className="flex items-center gap-2">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1 bg-slate-900 border border-slate-700 text-slate-200 rounded-lg text-xs font-semibold cursor-pointer"
            >
              <option value="ALL">All POs ({purchases.length})</option>
              <option value="APPROVED">Approved</option>
              <option value="ORDERED">Ordered</option>
              <option value="IN_TRANSIT">In Transit</option>
              <option value="RECEIVED">Received &amp; Stock Synced</option>
            </select>
          </div>
        </div>
        {visiblePurchases.length === 0 ? (
          <div className="p-10 text-center text-xs text-slate-400">
            No purchase orders found. Click <strong>+ Create Purchase Order</strong> to create a PO from manual entry, low-stock items, or evening consumables.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-400 uppercase text-[10px] font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="p-3">PO Number</th>
                  <th className="p-3">Vendor / Supplier</th>
                  <th className="p-3">Order / Expected</th>
                  <th className="p-3">Materials Description</th>
                  <th className="p-3">Total (Net)</th>
                  <th className="p-3">Status</th>
                  <th className="p-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {visiblePurchases.map((po) => {
                  const isReceived = po.status === 'RECEIVED' || po.status === 'DELIVERED';
                  return (
                    <tr key={po.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/40">
                      <td className="p-3 font-mono font-bold text-slate-900 dark:text-white">
                        {po.poNumber}
                        {po.sourceType && po.sourceType !== 'MANUAL' && (
                          <span className="block text-[9px] font-sans text-indigo-400">
                            {po.sourceType.replace('_', ' ')}
                          </span>
                        )}
                      </td>
                      <td className="p-3">
                        <div className="font-semibold text-slate-800 dark:text-slate-200">{po.supplierName}</div>
                        {po.supplierPhone && (
                          <div className="text-[10px] text-slate-400">{po.supplierPhone}</div>
                        )}
                      </td>
                      <td className="p-3 text-slate-500">
                        <div>{po.orderDate}</div>
                        <div className="text-[10px] text-slate-400">Exp: {po.expectedDate}</div>
                      </td>
                      <td className="p-3 text-slate-700 dark:text-slate-300 max-w-xs truncate" title={po.itemsSummary}>
                        {po.itemsSummary}
                      </td>
                      <td className="p-3 font-bold font-mono text-slate-900 dark:text-white">
                        ₹{Number(po.totalAmount || 0).toLocaleString('en-IN')}
                      </td>
                      <td className="p-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            isReceived
                              ? 'bg-emerald-500/15 text-emerald-500'
                              : po.status === 'IN_TRANSIT'
                              ? 'bg-blue-500/15 text-blue-500'
                              : 'bg-amber-500/15 text-amber-500'
                          }`}
                        >
                          {po.status}
                        </span>
                      </td>
                      <td className="p-3 text-right space-x-1.5 whitespace-nowrap">
                        {!isReceived && (
                          <>
                            {po.status === 'APPROVED' && (
                              <button
                                type="button"
                                onClick={() => handleUpdateStatus(po.id, 'ORDERED')}
                                className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[10px] font-bold cursor-pointer"
                              >
                                Mark Ordered
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => handleReceiveAndSyncStock(po)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded text-[10px] font-bold cursor-pointer shadow"
                              title="Receive goods into factory store & increment Inventory stock"
                            >
                              ✓ Receive &amp; Sync Stock
                            </button>
                          </>
                        )}
                        <button
                          type="button"
                          onClick={() => setPrintingPo(po)}
                          className="px-2 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded text-[10px] font-bold cursor-pointer inline-flex items-center gap-1"
                        >
                          <Printer className="w-3 h-3" />
                          <span>Print PO</span>
                        </button>
                        {!isReceived && (
                          <button
                            type="button"
                            onClick={() => handleDeletePo(po)}
                            className="p-1 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded cursor-pointer inline-flex items-center"
                            title="Delete PO"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <PurchaseOrderModal
        isOpen={isPoModalOpen}
        onClose={() => setIsPoModalOpen(false)}
        onCreated={(newPo) => {
          setPurchases((prev) => [newPo, ...prev]);
          notify(`Created Purchase Order ${newPo.poNumber} for ${newPo.supplierName}.`);
        }}
      />

      <PurchaseOrderPrintModal po={printingPo} onClose={() => setPrintingPo(null)} />
    </div>
  );
}

/* -------------------------------------------------------------
 * 9. ACCOUNTS & GST VIEW
 * ------------------------------------------------------------- */
export function AccountsGstView() {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [targets, setTargets] = useState<FinancialTarget[]>([]);
  const [activeFinanceTab, setActiveFinanceTab] = useState<'CLIENT_INVOICES' | 'DAILY_HEALTH_FORECAST' | 'CONTRACTOR_PAYABLES' | 'ORDER_PROFIT' | 'BREAK_EVEN' | 'FINANCIAL_FORECAST'>('CLIENT_INVOICES');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState<boolean>(false);
  const [isStrategistOpen, setIsStrategistOpen] = useState<boolean>(false);
  const [isEveningCloseModalOpen, setIsEveningCloseModalOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    Promise.all([
      fetch('/api/finance/invoices').then((r) => r.json()),
      fetch('/api/finance/payments').then((r) => r.json()),
      fetch('/api/finance/targets').then((r) => r.json()),
    ])
      .then(([invData, payData, tgtData]) => {
        if (active) {
          if (invData.success && Array.isArray(invData.data)) setInvoices(invData.data);
          if (payData.success && Array.isArray(payData.data)) setPayments(payData.data);
          if (tgtData.success && Array.isArray(tgtData.data)) setTargets(tgtData.data);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const handlePaymentSaved = (saved: Payment) => {
    setPayments((prev) => [saved, ...prev]);
    // Refresh invoices to reflect updated balances
    fetch('/api/finance/invoices')
      .then((r) => r.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) setInvoices(json.data);
      })
      .catch(() => {});
    setToastMessage(`Payment receipt "${saved.receiptNumber}" (₹${saved.amount.toLocaleString('en-IN')}) successfully generated.`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const handleTargetSaved = (saved: FinancialTarget) => {
    setTargets((prev) => [saved, ...prev]);
    setToastMessage(`Financial Target for ${saved.targetPeriod} locked and approved.`);
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Calculations
  const totalBilled = invoices.reduce((sum, i) => sum + i.totalAmount, 0);
  const totalCollected = payments.reduce((sum, p) => sum + p.amount, 0);
  const totalReceivables = invoices.reduce((sum, i) => sum + i.balanceAmount, 0);
  const collectionPct = totalBilled > 0 ? Math.round((totalCollected / totalBilled) * 100) : 0;

  return (
    <div className="space-y-6">
      {toastMessage && (
        <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <ReceiptIndianRupee className="w-6 h-6 text-red-500" />
            Accounts &amp; Financial Governance
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Client billing ledger, advance collections, bank receipts &amp; AI strategist
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsEveningCloseModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold rounded-lg text-xs shadow-xs transition-colors cursor-pointer"
          >
            <Calendar className="w-4 h-4" /> 🌆 Record Evening Close
          </button>
          {activeFinanceTab === 'CLIENT_INVOICES' && (
            <>
              <button
                onClick={() => setIsStrategistOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                <TrendingUp className="w-4 h-4 text-red-500" /> Financial Strategist
              </button>
              <button
                onClick={() => setIsPaymentModalOpen(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                <Plus className="w-4 h-4" /> Record Payment Receipt
              </button>
            </>
          )}
        </div>
      </div>

      {/* Accounts Navigation: Customer Invoices vs Live BEP vs AI Forecast vs Order Profit vs Contractor Payables */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-3 flex-wrap">
        <button
          type="button"
          onClick={() => setActiveFinanceTab('DAILY_HEALTH_FORECAST')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeFinanceTab === 'DAILY_HEALTH_FORECAST'
              ? 'bg-amber-500 text-slate-950 shadow-xs'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-white'
          }`}
        >
          <Zap className="w-4 h-4 text-amber-500" />
          <span>🌆 Daily Closing, BOQ &amp; Health Forecasting</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveFinanceTab('CLIENT_INVOICES')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeFinanceTab === 'CLIENT_INVOICES'
              ? 'bg-red-600 text-white shadow-xs'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-white'
          }`}
        >
          <ReceiptIndianRupee className="w-4 h-4" />
          <span>Client Billing &amp; Receivables</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveFinanceTab('BREAK_EVEN')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeFinanceTab === 'BREAK_EVEN'
              ? 'bg-red-600 text-white shadow-xs'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-white'
          }`}
        >
          <BarChart3 className="w-4 h-4 text-amber-400" />
          <span>⚡ Live Break-Even Point (BEP)</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveFinanceTab('FINANCIAL_FORECAST')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeFinanceTab === 'FINANCIAL_FORECAST'
              ? 'bg-red-600 text-white shadow-xs'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-white'
          }`}
        >
          <TrendingUp className="w-4 h-4 text-emerald-400" />
          <span>📊 AI Financial Analysis &amp; Forecasting</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveFinanceTab('ORDER_PROFIT')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeFinanceTab === 'ORDER_PROFIT'
              ? 'bg-red-600 text-white shadow-xs'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-white'
          }`}
        >
          <ReceiptIndianRupee className="w-4 h-4" />
          <span>Order Profit &amp; P&amp;L</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveFinanceTab('CONTRACTOR_PAYABLES')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
            activeFinanceTab === 'CONTRACTOR_PAYABLES'
              ? 'bg-red-600 text-white shadow-xs'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>Contractor Accounts &amp; Labor</span>
        </button>
      </div>

      {activeFinanceTab === 'DAILY_HEALTH_FORECAST' ? (
        <BusinessHealthForecastingPanel />
      ) : activeFinanceTab === 'BREAK_EVEN' ? (
        <BreakEvenPanel />
      ) : activeFinanceTab === 'FINANCIAL_FORECAST' ? (
        <AiFinancialStrategistPanel />
      ) : activeFinanceTab === 'ORDER_PROFIT' ? (
        <OrderProfitPanel />
      ) : activeFinanceTab === 'CONTRACTOR_PAYABLES' ? (
        <ContractorPayablesPanel />
      ) : (
        <>
          {/* Financial Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center">
        <div className="p-4 bg-white dark:bg-[#0B132B] rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Total Billed Sales</span>
          <p className="text-xl font-black text-slate-900 dark:text-white font-mono">
            ₹{totalBilled.toLocaleString('en-IN')}
          </p>
          <span className="text-[10px] text-slate-400">{invoices.length} Sales Bills</span>
        </div>

        <div className="p-4 bg-white dark:bg-[#0B132B] rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Collections Realized</span>
          <p className="text-xl font-black text-emerald-500 font-mono">
            ₹{totalCollected.toLocaleString('en-IN')}
          </p>
          <span className="text-[10px] text-emerald-600">{payments.length} Bank Receipts</span>
        </div>

        <div className="p-4 bg-white dark:bg-[#0B132B] rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Outstanding Receivables</span>
          <p className="text-xl font-black text-red-500 font-mono">
            ₹{totalReceivables.toLocaleString('en-IN')}
          </p>
          <span className="text-[10px] text-slate-400">Aging &gt; 30 Days</span>
        </div>

        <div className="p-4 bg-white dark:bg-[#0B132B] rounded-xl border border-slate-200 dark:border-slate-800 space-y-1">
          <span className="text-[10px] uppercase font-bold text-slate-400 block">Collection Realization</span>
          <p className="text-xl font-black text-blue-500 font-mono">
            {collectionPct}%
          </p>
          <span className="text-[10px] text-slate-400">Direct Net Recovery</span>
        </div>
      </div>

      {/* Active Financial Target Banner */}
      {targets.length > 0 && (
        <div className="p-3 bg-red-50/50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 text-xs">
          <div className="flex flex-wrap items-center gap-2">
            <TrendingUp className="w-4 h-4 text-red-500 shrink-0" />
            <span className="font-bold text-slate-900 dark:text-white">Active Target ({targets[0].targetPeriod}):</span>
            <span className="text-slate-600 dark:text-slate-300">Sales: ₹{targets[0].salesRevenueTarget.toLocaleString('en-IN')}</span>
            <span className="text-slate-400">•</span>
            <span className="text-slate-600 dark:text-slate-300">Collections: ₹{targets[0].collectionsTarget.toLocaleString('en-IN')}</span>
            <span className="text-slate-400">•</span>
            <span className="text-slate-600 dark:text-slate-300 font-bold text-red-600 dark:text-red-400">{targets[0].frpDoorQuantityTarget} FRP Doors</span>
          </div>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/15 text-emerald-500 shrink-0">
            {targets[0].status}
          </span>
        </div>
      )}

      {/* Sales Bills Section */}
      <div className="bg-white dark:bg-[#0B132B] rounded-xl border border-slate-200 dark:border-slate-800 p-5 space-y-3">
        <h3 className="font-bold text-sm text-slate-900 dark:text-white">Sales Bills &amp; Invoices Register</h3>
        {isLoading ? (
          <div className="p-8 text-center text-xs text-slate-400">Loading invoice ledger...</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-900 text-slate-400 uppercase text-[10px]">
                <tr>
                  <th className="p-3">Invoice #</th>
                  <th className="p-3">Customer</th>
                  <th className="p-3">Date</th>
                  <th className="p-3 font-mono">Bill Total</th>
                  <th className="p-3 font-mono">Balance Due</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {invoices.map((inv) => (
                  <tr key={inv.id}>
                    <td className="p-3 font-mono font-bold text-slate-900 dark:text-white">{inv.invoiceNumber}</td>
                    <td className="p-3">{inv.customerName}</td>
                    <td className="p-3 text-slate-400">{inv.invoiceDate}</td>
                    <td className="p-3 font-mono font-bold text-slate-900 dark:text-white">₹{inv.totalAmount.toLocaleString('en-IN')}</td>
                    <td className="p-3 font-mono font-bold text-red-500">₹{inv.balanceAmount.toLocaleString('en-IN')}</td>
                    <td className="p-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          inv.status === 'PAID'
                            ? 'bg-emerald-500/15 text-emerald-500'
                            : 'bg-blue-500/15 text-blue-500'
                        }`}
                      >
                        {inv.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payments Register */}
      <div className="bg-white dark:bg-[#0B132B] rounded-xl border border-slate-200 dark:border-slate-800 p-5 space-y-3">
        <h3 className="font-bold text-sm text-slate-900 dark:text-white">Customer Payment Receipts</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
            <thead className="bg-slate-50 dark:bg-slate-900 text-slate-400 uppercase text-[10px]">
              <tr>
                <th className="p-3">Receipt #</th>
                <th className="p-3">Customer</th>
                <th className="p-3">Date</th>
                <th className="p-3">Payment Mode</th>
                <th className="p-3 font-mono">Amount (INR)</th>
                <th className="p-3">UTR / Ref #</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {payments.map((p) => (
                <tr key={p.id}>
                  <td className="p-3 font-mono font-bold text-slate-900 dark:text-white">{p.receiptNumber}</td>
                  <td className="p-3">{p.customerName}</td>
                  <td className="p-3 text-slate-400">{p.paymentDate}</td>
                  <td className="p-3 font-semibold">{p.paymentMode}</td>
                  <td className="p-3 font-mono font-bold text-emerald-500">₹{p.amount.toLocaleString('en-IN')}</td>
                  <td className="p-3 font-mono text-slate-400">{p.referenceNumber || 'Counter Cash'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      </>
      )}

      <PaymentReceiptModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        onSaved={handlePaymentSaved}
        invoices={invoices}
      />

      <FinancialStrategistModal
        isOpen={isStrategistOpen}
        onClose={() => setIsStrategistOpen(false)}
        onTargetCreated={handleTargetSaved}
      />

      <DailyEveningClosingModal
        isOpen={isEveningCloseModalOpen}
        onClose={() => setIsEveningCloseModalOpen(false)}
      />
    </div>
  );
}

/* -------------------------------------------------------------
 * 10. EMPLOYEES VIEW
 * ------------------------------------------------------------- */
interface EmployeeListItem {
  id: string;
  employeeCode: string;
  name: string;
  role: string;
  department: string;
  phone: string;
  email: string;
  status: string;
  location: string;
  loginAccount?: {
    userId: string;
    role: UserRole;
    email: string;
    employeeCode?: string;
    hasQuickPin?: boolean;
    customAllowedModules?: string[] | null;
    isActive?: boolean;
    lastLoginAt?: string;
  } | null;
}

export function EmployeesView({
  userRole,
  onManageStaffLogins,
}: {
  userRole?: UserRole;
  onManageStaffLogins?: () => void;
}) {
  const isSuperAdmin = userRole === 'Super Admin';
  const [employees, setEmployees] = useState<EmployeeListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);

  // Add / Edit Employee Modal
  const [isEmpModalOpen, setIsEmpModalOpen] = useState(false);
  const [editingEmp, setEditingEmp] = useState<EmployeeListItem | null>(null);
  const [empName, setEmpName] = useState('');
  const [empCode, setEmpCode] = useState('');
  const [empRole, setEmpRole] = useState('Production Technician');
  const [empDept, setEmpDept] = useState('Cutting & Finishing');
  const [empPhone, setEmpPhone] = useState('');
  const [empEmail, setEmpEmail] = useState('');
  const [empLocation, setEmpLocation] = useState('Central Manufacturing Plant');
  const [createLoginWithEmp, setCreateLoginWithEmp] = useState(false);
  const [empErpRole, setEmpErpRole] = useState<UserRole>('Production');
  const [empErpPassword, setEmpErpPassword] = useState('');
  const [empErpPin, setEmpErpPin] = useState('');
  const [savingEmp, setSavingEmp] = useState(false);

  // Quick Create ERP Login Modal for an existing Employee (Super Admin)
  const [loginTargetEmp, setLoginTargetEmp] = useState<EmployeeListItem | null>(null);
  const [loginRole, setLoginRole] = useState<UserRole>('Production');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginPin, setLoginPin] = useState('');
  const [savingLogin, setSavingLogin] = useState(false);

  const loadEmployees = async () => {
    setLoading(true);
    try {
      const res = await apiFetch('/api/employees');
      const json = await res.json();
      if (res.ok && json.success && Array.isArray(json.data)) {
        setEmployees(json.data);
      }
    } catch {
      // Ignore transient error
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let cancelled = false;
    apiFetch('/api/employees')
      .then((res) => res.json().then((json) => ({ ok: res.ok, json })))
      .then(({ ok, json }) => {
        if (!cancelled && ok && json.success && Array.isArray(json.data)) {
          setEmployees(json.data);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const openAddEmployee = () => {
    setEditingEmp(null);
    setEmpName('');
    setEmpCode(`EXM-EMP-${String(employees.length + 1).padStart(3, '0')}`);
    setEmpRole('Production Technician');
    setEmpDept('Cutting & Finishing');
    setEmpPhone('');
    setEmpEmail('');
    setEmpLocation('Central Manufacturing Plant');
    setCreateLoginWithEmp(false);
    setEmpErpRole('Production');
    setEmpErpPassword('');
    setEmpErpPin('');
    setIsEmpModalOpen(true);
  };

  const openEditEmployee = (emp: EmployeeListItem) => {
    setEditingEmp(emp);
    setEmpName(emp.name);
    setEmpCode(emp.employeeCode);
    setEmpRole(emp.role);
    setEmpDept(emp.department);
    setEmpPhone(emp.phone);
    setEmpEmail(emp.email);
    setEmpLocation(emp.location || 'Central Manufacturing Plant');
    setCreateLoginWithEmp(false);
    setIsEmpModalOpen(true);
  };

  const handleSaveEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!empName.trim()) return;
    if (!editingEmp && createLoginWithEmp && !empErpPassword.trim() && !/^\d{4,6}$/.test(empErpPin.trim())) {
      setNotice({ type: 'err', text: 'Provide a 4–6 digit Quick PIN or 6+ char Password to create ERP login.' });
      return;
    }
    setSavingEmp(true);
    setNotice(null);
    try {
      const res = await apiFetch('/api/employees', {
        method: editingEmp ? 'PATCH' : 'POST',
        body: JSON.stringify({
          ...(editingEmp ? { id: editingEmp.id } : {}),
          name: empName.trim(),
          employeeCode: empCode.trim(),
          role: empRole.trim(),
          department: empDept.trim(),
          phone: empPhone.trim(),
          email: empEmail.trim().toLowerCase(),
          location: empLocation.trim(),
          ...(!editingEmp && createLoginWithEmp
            ? {
                createLogin: true,
                erpRole: empErpRole,
                ...(empErpPassword.trim() ? { password: empErpPassword.trim() } : {}),
                ...(empErpPin.trim() ? { quickPin: empErpPin.trim() } : {}),
              }
            : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setNotice({ type: 'err', text: data.error || 'Could not save employee record.' });
        return;
      }
      setIsEmpModalOpen(false);
      setNotice({ type: 'ok', text: `Saved staff profile for ${empName.trim()}.` });
      await loadEmployees();
    } catch {
      setNotice({ type: 'err', text: 'Network error saving employee.' });
    } finally {
      setSavingEmp(false);
    }
  };

  const handleDeleteEmployee = async (emp: EmployeeListItem) => {
    if (
      typeof window !== 'undefined' &&
      !window.confirm(`Remove "${emp.name}" (${emp.employeeCode}) from the employee roster?`)
    ) {
      return;
    }
    try {
      const res = await apiFetch(`/api/employees?id=${encodeURIComponent(emp.id)}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setNotice({ type: 'err', text: data.error || 'Could not remove employee.' });
        return;
      }
      setNotice({ type: 'ok', text: `${emp.name} removed from roster.` });
      await loadEmployees();
    } catch {
      setNotice({ type: 'err', text: 'Network error removing employee.' });
    }
  };

  const handleCreateErpLoginForEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loginTargetEmp) return;
    if (loginPassword.trim().length > 0 && loginPassword.trim().length < 6) {
      setNotice({ type: 'err', text: 'Initial login password must be at least 6 characters.' });
      return;
    }
    if (loginPassword.trim().length === 0 && !/^\d{4,6}$/.test(loginPin.trim())) {
      setNotice({ type: 'err', text: 'Provide either a 6+ char Password or a 4–6 digit Quick PIN.' });
      return;
    }
    if (loginPin.trim() && !/^\d{4,6}$/.test(loginPin.trim())) {
      setNotice({ type: 'err', text: 'Quick PIN must be 4 to 6 numeric digits.' });
      return;
    }
    setSavingLogin(true);
    try {
      const res = await apiFetch('/api/auth/users', {
        method: 'POST',
        body: JSON.stringify({
          action: 'UPSERT_USER',
          name: loginTargetEmp.name,
          email: loginTargetEmp.email || undefined,
          employeeCode: loginTargetEmp.employeeCode,
          department: loginTargetEmp.department,
          phone: loginTargetEmp.phone,
          plantLocation: loginTargetEmp.location,
          role: loginRole,
          ...(loginPassword.trim() ? { password: loginPassword.trim() } : {}),
          ...(loginPin.trim() ? { quickPin: loginPin.trim() } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        setNotice({ type: 'err', text: data.error || 'Failed to create ERP login.' });
        return;
      }
      setLoginTargetEmp(null);
      setLoginPassword('');
      setLoginPin('');
      setNotice({ type: 'ok', text: data.message || 'ERP staff login created and linked!' });
      await loadEmployees();
    } catch {
      setNotice({ type: 'err', text: 'Network error creating ERP login.' });
    } finally {
      setSavingLogin(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <UserCheck className="w-6 h-6 text-red-500" />
            Factory Staff &amp; Field Engineers Roster
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Factory technicians, CNC programmers, QC inspectors and site measurement supervisors across Kerala
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {isSuperAdmin && onManageStaffLogins && (
            <button
              type="button"
              onClick={onManageStaffLogins}
              className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 text-xs font-bold flex items-center gap-1.5 cursor-pointer"
            >
              <ShieldCheck className="w-4 h-4" />
              <span>Staff Logins &amp; Roles</span>
            </button>
          )}
          <button
            type="button"
            onClick={openAddEmployee}
            className="px-3.5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow"
          >
            <Plus className="w-4 h-4" />
            <span>Add Employee</span>
          </button>
        </div>
      </div>

      {notice && (
        <div
          className={`p-3 rounded-xl border text-xs font-semibold flex items-center justify-between gap-2 ${
            notice.type === 'ok'
              ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
              : 'bg-rose-950/60 border-rose-500/40 text-rose-300'
          }`}
        >
          <span>{notice.text}</span>
          <button type="button" onClick={() => setNotice(null)}>
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {loading ? (
        <div className="py-12 text-center text-xs text-slate-400">Loading staff roster...</div>
      ) : employees.length === 0 ? (
        <div className="p-8 rounded-2xl border border-dashed border-slate-700 text-center text-xs text-slate-400">
          No employees added to roster yet. Click <strong>Add Employee</strong> to register plant technicians, cutting/painting leads, or field engineers.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {employees.map((emp) => (
            <div key={emp.id} className="bg-white dark:bg-[#0B132B] p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2.5 shadow-sm flex flex-col justify-between">
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-full bg-red-500/10 dark:bg-slate-800 flex items-center justify-center font-bold text-red-500 shrink-0">
                      {emp.name.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="font-bold text-sm text-slate-900 dark:text-white truncate">{emp.name}</h4>
                        <span className="text-[10px] font-mono text-slate-400">{emp.employeeCode}</span>
                      </div>
                      <p className="text-xs text-red-500 font-medium truncate">{emp.role}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => openEditEmployee(emp)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
                      title="Edit employee"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDeleteEmployee(emp)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-950/30"
                      title="Remove employee"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-100 dark:border-slate-800 text-xs text-slate-500 flex justify-between items-center">
                  <span>{emp.department}</span>
                  <span className="font-mono text-slate-600 dark:text-slate-400">{emp.phone}</span>
                </div>
                <div className="text-[11px] text-slate-400 truncate">
                  Station: {emp.location} {emp.email ? `• ${emp.email}` : ''}
                </div>
              </div>

              {/* Linked ERP Login Status */}
              <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between gap-2 text-[10px]">
                {emp.loginAccount ? (
                  <>
                    <span
                      className={`px-2 py-0.5 rounded font-bold border ${
                        emp.loginAccount.isActive !== false
                          ? 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                          : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                      }`}
                    >
                      ERP Login: {emp.loginAccount.role}
                      {emp.loginAccount.isActive === false ? ' (Paused)' : ''}
                      {Array.isArray(emp.loginAccount.customAllowedModules)
                        ? ` • ${emp.loginAccount.customAllowedModules.length} mod`
                        : ''}
                    </span>
                    {emp.loginAccount.hasQuickPin && (
                      <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
                        PIN Ready
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    <span className="text-slate-500">No ERP Login linked</span>
                    {isSuperAdmin && (
                      <button
                        type="button"
                        onClick={() => {
                          setLoginTargetEmp(emp);
                          setLoginRole('Production');
                          setLoginPassword('');
                          setLoginPin('');
                        }}
                        className="px-2 py-1 rounded bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30 font-bold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <UserPlus className="w-3 h-3" /> Create ERP Login
                      </button>
                    )}
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Employee Modal */}
      {isEmpModalOpen && (
        <div className="fixed inset-0 bg-black/80 z-[80] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#111827] border border-slate-700 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-[#141d33]">
              <h3 className="font-bold text-white text-sm">
                {editingEmp ? `Edit Employee: ${editingEmp.name}` : 'Add New Factory / Field Employee'}
              </h3>
              <button type="button" onClick={() => setIsEmpModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveEmployee} className="p-5 space-y-3 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] text-slate-300 font-bold mb-1">Full Name *</label>
                  <input
                    type="text"
                    value={empName}
                    onChange={(e) => setEmpName(e.target.value)}
                    required
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-300 font-bold mb-1">Staff Code</label>
                  <input
                    type="text"
                    value={empCode}
                    onChange={(e) => setEmpCode(e.target.value.toUpperCase())}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 font-mono text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-300 font-bold mb-1">Designation / Role</label>
                  <input
                    type="text"
                    value={empRole}
                    onChange={(e) => setEmpRole(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-300 font-bold mb-1">Section / Department</label>
                  <input
                    type="text"
                    value={empDept}
                    onChange={(e) => setEmpDept(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-300 font-bold mb-1">Phone</label>
                  <input
                    type="tel"
                    value={empPhone}
                    onChange={(e) => setEmpPhone(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 font-mono text-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-300 font-bold mb-1">Email</label>
                  <input
                    type="email"
                    value={empEmail}
                    onChange={(e) => setEmpEmail(e.target.value)}
                    className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] text-slate-300 font-bold mb-1">Plant / Station Location</label>
                <input
                  type="text"
                  value={empLocation}
                  onChange={(e) => setEmpLocation(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                />
              </div>

              {!editingEmp && isSuperAdmin && (
                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 space-y-2.5">
                  <label className="inline-flex items-center gap-2 text-xs font-bold text-amber-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={createLoginWithEmp}
                      onChange={(e) => setCreateLoginWithEmp(e.target.checked)}
                      className="w-4 h-4 rounded accent-amber-500"
                    />
                    <span>Also Create ERP Staff Login Now</span>
                  </label>
                  {createLoginWithEmp && (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 mb-1">ERP Role</label>
                        <select
                          value={empErpRole}
                          onChange={(e) => setEmpErpRole(e.target.value as UserRole)}
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-white"
                        >
                          {(Object.keys(ERP_ROLES) as UserRole[]).map((r) => (
                            <option key={r} value={r}>{r}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 mb-1">Quick PIN (4–6 digits)</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          maxLength={6}
                          value={empErpPin}
                          onChange={(e) => setEmpErpPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          placeholder="e.g. 4829"
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 font-mono text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 mb-1">Password (optional)</label>
                        <input
                          type="password"
                          value={empErpPassword}
                          onChange={(e) => setEmpErpPassword(e.target.value)}
                          placeholder="Min 6 chars"
                          className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2 py-1.5 text-white"
                        />
                      </div>
                    </div>
                  )}
                </div>
              )}
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsEmpModalOpen(false)}
                  className="px-4 py-2 rounded-lg border border-slate-700 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingEmp}
                  className="px-4 py-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold"
                >
                  {savingEmp ? 'Saving...' : 'Save Employee'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick Create ERP Login Modal for Employee (Super Admin) */}
      {loginTargetEmp && isSuperAdmin && (
        <div className="fixed inset-0 bg-black/80 z-[85] flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-[#111827] border border-slate-700 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-[#141d33]">
              <h3 className="font-bold text-white text-sm flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-amber-400" />
                Create ERP Login: {loginTargetEmp.name}
              </h3>
              <button type="button" onClick={() => setLoginTargetEmp(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateErpLoginForEmployee} className="p-5 space-y-3 text-xs">
              <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-300">
                <div><strong>Login Alias / Email:</strong> {loginTargetEmp.email || 'Auto-generated from Staff Code'}</div>
                <div><strong>Staff Code:</strong> {loginTargetEmp.employeeCode}</div>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">ERP Role *</label>
                <select
                  value={loginRole}
                  onChange={(e) => setLoginRole(e.target.value as UserRole)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                >
                  {(Object.keys(ERP_ROLES) as UserRole[]).map((r) => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">Initial Password (min 6 chars, optional if PIN given)</label>
                <input
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">Quick PIN (4–6 numeric digits)</label>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={6}
                  value={loginPin}
                  onChange={(e) => setLoginPin(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 font-mono tracking-widest text-white"
                />
              </div>
              <div className="flex justify-end gap-2 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setLoginTargetEmp(null)}
                  className="px-4 py-2 rounded-lg border border-slate-700 text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={savingLogin}
                  className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold disabled:opacity-50"
                >
                  {savingLogin ? 'Creating...' : 'Create Login Account'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

/* -------------------------------------------------------------
 * 11. DISPATCH & INSTALLATION VIEW
 * ------------------------------------------------------------- */
export function DispatchInstallationView() {
  const [activeTab, setActiveTab] = useState<'dispatches' | 'fleet' | 'installations' | 'warranties'>('dispatches');
  const [dispatches, setDispatches] = useState<DispatchRecord[]>([]);
  const [installations, setInstallations] = useState<InstallationRecord[]>([]);
  const [warranties, setWarranties] = useState<WarrantyCertificate[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Modals state
  const [isDispatchModalOpen, setIsDispatchModalOpen] = useState(false);
  const [selectedInstallation, setSelectedInstallation] = useState<InstallationRecord | null>(null);
  const [isWarrantyModalOpen, setIsWarrantyModalOpen] = useState(false);
  const [selectedWarranty, setSelectedWarranty] = useState<WarrantyCertificate | null>(null);

  const loadData = () => {
    setIsLoading(true);
    Promise.all([
      fetch('/api/fulfillment/dispatch').then((r) => r.json()),
      fetch('/api/fulfillment/installation').then((r) => r.json()),
      fetch('/api/fulfillment/warranty').then((r) => r.json()),
    ])
      .then(([dRes, iRes, wRes]) => {
        if (dRes.success) setDispatches(dRes.data);
        if (iRes.success) setInstallations(iRes.data);
        if (wRes.success) setWarranties(wRes.data);
      })
      .catch((err) => console.error('Failed to load fulfillment data:', err))
      .finally(() => setIsLoading(false));
  };

  useEffect(() => {
    Promise.all([
      fetch('/api/fulfillment/dispatch').then((r) => r.json()),
      fetch('/api/fulfillment/installation').then((r) => r.json()),
      fetch('/api/fulfillment/warranty').then((r) => r.json()),
    ])
      .then(([dRes, iRes, wRes]) => {
        if (dRes.success) setDispatches(dRes.data);
        if (iRes.success) setInstallations(iRes.data);
        if (wRes.success) setWarranties(wRes.data);
      })
      .catch((err) => console.error('Failed to load fulfillment data:', err));
  }, []);

  return (
    <div className="space-y-6">
      {/* Header & Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Truck className="w-6 h-6 text-red-500" />
            Dispatch Logistics, Installation &amp; FRP Warranty
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Dedicated delivery fleet across all 14 Kerala districts • Site installation sign-offs • Official 10/15 year FRP material warranty
          </p>
        </div>

        <div className="flex items-center gap-2">
          {activeTab === 'dispatches' && (
            <button
              onClick={() => setIsDispatchModalOpen(true)}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-red-600 rounded-lg hover:bg-red-700 flex items-center gap-1.5 shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              Schedule Dispatch
            </button>
          )}
          {activeTab === 'warranties' && (
            <button
              onClick={() => {
                setSelectedWarranty(null);
                setIsWarrantyModalOpen(true);
              }}
              className="px-3 py-1.5 text-xs font-semibold text-white bg-amber-600 rounded-lg hover:bg-amber-700 flex items-center gap-1.5 shadow-sm"
            >
              <Award className="w-3.5 h-3.5" />
              Issue Warranty Certificate
            </button>
          )}
          <button
            onClick={loadData}
            title="Refresh records"
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-500 hover:text-slate-900 dark:hover:text-white"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800">
        <button
          onClick={() => setActiveTab('dispatches')}
          className={`pb-2.5 px-3 text-xs font-bold transition-colors border-b-2 ${
            activeTab === 'dispatches'
              ? 'border-red-500 text-red-500'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Fleet Logistics &amp; Dispatches ({dispatches.length})
        </button>
        <button
          onClick={() => setActiveTab('fleet')}
          className={`pb-2.5 px-3 text-xs font-bold transition-colors border-b-2 ${
            activeTab === 'fleet'
              ? 'border-red-500 text-red-500'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Drivers &amp; Vehicles Master
        </button>
        <button
          onClick={() => setActiveTab('installations')}
          className={`pb-2.5 px-3 text-xs font-bold transition-colors border-b-2 ${
            activeTab === 'installations'
              ? 'border-red-500 text-red-500'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          Site Installations &amp; Handover ({installations.length})
        </button>
        <button
          onClick={() => setActiveTab('warranties')}
          className={`pb-2.5 px-3 text-xs font-bold transition-colors border-b-2 ${
            activeTab === 'warranties'
              ? 'border-red-500 text-red-500'
              : 'border-transparent text-slate-500 hover:text-slate-900 dark:hover:text-white'
          }`}
        >
          FRP Warranty Certificates ({warranties.length})
        </button>
      </div>

      {/* TAB 1: DISPATCHES */}
      {activeTab === 'dispatches' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-white dark:bg-[#0B132B] p-4 rounded-xl border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] font-bold uppercase text-slate-400">Total Active Dispatches</span>
              <p className="text-xl font-bold text-slate-900 dark:text-white mt-1">{dispatches.length} Trips</p>
              <p className="text-[11px] text-slate-400">Central factory plant distribution</p>
            </div>
            <div className="bg-white dark:bg-[#0B132B] p-4 rounded-xl border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] font-bold uppercase text-blue-500">Doors In Transit</span>
              <p className="text-xl font-bold text-blue-500 mt-1">
                {dispatches.filter((d) => d.status === 'IN_TRANSIT').reduce((a, b) => a + b.doorCount, 0)} Units
              </p>
              <p className="text-[11px] text-slate-400">On road to North/South Kerala hubs</p>
            </div>
            <div className="bg-white dark:bg-[#0B132B] p-4 rounded-xl border border-slate-200 dark:border-slate-800">
              <span className="text-[10px] font-bold uppercase text-emerald-500">Delivered Successfully</span>
              <p className="text-xl font-bold text-emerald-500 mt-1">
                {dispatches.filter((d) => d.status === 'DELIVERED').length} Sites
              </p>
              <p className="text-[11px] text-slate-400">Received &amp; verified at site warehouse</p>
            </div>
          </div>

          <div className="bg-white dark:bg-[#0B132B] rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 uppercase text-[10px] font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Dispatch #</th>
                    <th className="px-4 py-3">Customer &amp; Destination</th>
                    <th className="px-4 py-3">District</th>
                    <th className="px-4 py-3">Vehicle &amp; Driver</th>
                    <th className="px-4 py-3">Doors</th>
                    <th className="px-4 py-3">Waybill / Ref</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {dispatches.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/30">
                      <td className="px-4 py-3 font-mono font-bold text-slate-900 dark:text-white">
                        {d.dispatchNumber}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900 dark:text-white">{d.customerName}</div>
                        <div className="text-[11px] text-slate-400 truncate max-w-xs">{d.destinationAddress}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {d.deliveryDistrict}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-mono text-slate-800 dark:text-slate-200">{d.vehicleNumber}</div>
                        <div className="text-[11px] text-slate-400">{d.driverName} {d.driverPhone ? `• ${d.driverPhone}` : ''}</div>
                      </td>
                      <td className="px-4 py-3 font-bold text-red-500">
                        {d.doorCount} Units
                      </td>
                      <td className="px-4 py-3 font-mono text-[11px] text-slate-500">
                        {d.eWayBillNo || '—'}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            d.status === 'DELIVERED'
                              ? 'bg-emerald-500/15 text-emerald-500'
                              : d.status === 'IN_TRANSIT'
                              ? 'bg-blue-500/15 text-blue-500'
                              : 'bg-amber-500/15 text-amber-500'
                          }`}
                        >
                          {d.status.replace('_', ' ')}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {dispatches.length === 0 && (
                    <tr>
                      <td colSpan={7} className="px-4 py-8 text-center text-slate-400 text-xs">
                        No dispatches found. Click &quot;Schedule Dispatch&quot; to register fleet transport.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DRIVERS & VEHICLES MASTER */}
      {activeTab === 'fleet' && (
        <DriversAndVehiclesMasterTab />
      )}

      {/* TAB 3: INSTALLATIONS */}
      {activeTab === 'installations' && (
        <div className="space-y-4">
          <div className="bg-white dark:bg-[#0B132B] rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-50 dark:bg-slate-900/50 text-slate-500 uppercase text-[10px] font-semibold border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="px-4 py-3">Installation #</th>
                    <th className="px-4 py-3">Site / Customer</th>
                    <th className="px-4 py-3">District</th>
                    <th className="px-4 py-3">Supervisor</th>
                    <th className="px-4 py-3">Doors</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Rating &amp; Sign-Off</th>
                    <th className="px-4 py-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                  {installations.map((inst) => (
                    <tr key={inst.id} className="hover:bg-slate-50 dark:hover:bg-slate-900/30">
                      <td className="px-4 py-3 font-mono font-bold text-slate-900 dark:text-white">
                        {inst.installationNumber}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-semibold text-slate-900 dark:text-white">{inst.customerName}</div>
                        <div className="text-[11px] text-slate-400 truncate max-w-xs">{inst.siteAddress}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        {inst.district}
                      </td>
                      <td className="px-4 py-3 text-slate-800 dark:text-slate-200">
                        {inst.supervisorName}
                      </td>
                      <td className="px-4 py-3 font-bold text-slate-900 dark:text-white">
                        {inst.doorCount}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            inst.status === 'QUALITY_APPROVED'
                              ? 'bg-emerald-500/15 text-emerald-500'
                              : inst.status === 'IN_PROGRESS'
                              ? 'bg-blue-500/15 text-blue-500'
                              : 'bg-amber-500/15 text-amber-500'
                          }`}
                        >
                          {inst.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {inst.clientSignoffName ? (
                          <div className="space-y-0.5">
                            <span className="font-semibold text-emerald-600 text-[11px]">
                              Signed by {inst.clientSignoffName}
                            </span>
                            <div className="text-[11px] text-amber-500">
                              {'★'.repeat(inst.clientFeedbackRating || 5)} ({inst.clientFeedbackRating}/5)
                            </div>
                          </div>
                        ) : (
                          <span className="text-[11px] text-slate-400">Pending Handover</span>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {inst.status !== 'QUALITY_APPROVED' ? (
                          <button
                            onClick={() => setSelectedInstallation(inst)}
                            className="px-2.5 py-1 text-[11px] font-semibold text-emerald-600 bg-emerald-500/10 hover:bg-emerald-500/20 rounded border border-emerald-500/30"
                          >
                            Sign-Off
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setSelectedWarranty({
                                certificateNumber: `EXM-WRN-${inst.installationNumber}`,
                                salesOrderId: inst.salesOrderId,
                                customerName: inst.customerName,
                                siteAddress: inst.siteAddress,
                                district: inst.district,
                                warrantyPeriodYears: 15,
                                validFrom: new Date().toISOString().split('T')[0],
                                validUntil: '2041-10-27',
                                coveredDoors: [
                                  {
                                    doorId: `EXM-DR-${inst.installationNumber}-01`,
                                    model: 'EXM-FRP-TL101',
                                    sizeMm: '2085 x 888 mm',
                                  },
                                ],
                                coverageScope: 'FRP DOOR MATERIAL ONLY (100% Water, Termite & Borer Proof Body)',
                                explicitExclusions: [
                                  'SS Hinges, Tower Bolts, Handles, and Lock Hardware sets',
                                  'Surface PU Paints, Foiling, and Cosmetic finish weathering',
                                  'Damage arising from civil structure settlement or accidental mechanical impact',
                                  'Unapproved modifications, thermal burns, or acidic chemical washing',
                                ],
                                bilingualCareInstructions: {
                                  english: [
                                    'Clean door surfaces with mild soapy water and a soft cotton cloth only.',
                                    'Never use acidic floor cleaners, wire brushes, or harsh solvents on FRP doors.',
                                  ],
                                  malayalam: [
                                    'ഡോർ വൃത്തിയാക്കാൻ വീര്യം കുറഞ്ഞ സോപ്പ് വെള്ളവും കോട്ടൺ തുണിയും മാത്രം ഉപയോഗിക്കുക.',
                                    'ആസിഡ്, ഫിനോയിൽ അല്ലെങ്കിൽ കഠിനമായ കെമിക്കലുകൾ ഡോറിൽ ഒഴിക്കരുത്.',
                                  ],
                                },
                                issuedAt: new Date().toISOString(),
                              });
                              setIsWarrantyModalOpen(true);
                            }}
                            className="px-2.5 py-1 text-[11px] font-semibold text-amber-600 bg-amber-500/10 hover:bg-amber-500/20 rounded border border-amber-500/30 flex items-center gap-1 ml-auto"
                          >
                            <Award className="w-3 h-3" />
                            View Warranty
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: WARRANTIES (LOCATION-BASED & GEOFENCED) */}
      {activeTab === 'warranties' && (
        <GeotaggedWarrantyHub
          onOpenIssueModal={() => {
            setSelectedWarranty(null);
            setIsWarrantyModalOpen(true);
          }}
        />
      )}

      {/* Modals */}
      <DispatchScheduleModal
        isOpen={isDispatchModalOpen}
        onClose={() => setIsDispatchModalOpen(false)}
        onSuccess={(rec) => {
          setDispatches((prev) => [rec, ...prev]);
        }}
      />

      <InstallationSignoffModal
        isOpen={Boolean(selectedInstallation)}
        installation={selectedInstallation}
        onClose={() => setSelectedInstallation(null)}
        onSuccess={(updated) => {
          setInstallations((prev) =>
            prev.map((i) => (i.id === updated.id ? updated : i))
          );
        }}
      />

      <WarrantyCertificateModal
        isOpen={isWarrantyModalOpen}
        initialCertificate={selectedWarranty}
        onClose={() => {
          setIsWarrantyModalOpen(false);
          setSelectedWarranty(null);
        }}
        onSuccess={(cert) => {
          setWarranties((prev) => [cert, ...prev]);
        }}
      />
    </div>
  );
}

/* -------------------------------------------------------------
 * 12. MARKETING VIEW
 * ------------------------------------------------------------- */
export function MarketingView() {
  return <MarketingSalesExpansionHub />;
}

/* -------------------------------------------------------------
 * 13. REPORTS VIEW
 * ------------------------------------------------------------- */
export function ReportsView() {
  const [selectedReportCode, setSelectedReportCode] = useState<string>('SALES_BY_DISTRICT');
  const [reportResult, setReportResult] = useState<ReportExecutionResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isWhatsAppOpen, setIsWhatsAppOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isPrintModalOpen, setIsPrintModalOpen] = useState<boolean>(false);
  const [printTheme, setPrintTheme] = useState<ReportPrintTheme>('tally-classic');

  // Load saved theme
  useEffect(() => {
    try {
      const saved = localStorage.getItem('exmark_report_print_theme') as ReportPrintTheme;
      if (saved) setPrintTheme(saved);
    } catch {}
  }, []);

  const handleSelectTheme = (t: ReportPrintTheme) => {
    setPrintTheme(t);
    try {
      localStorage.setItem('exmark_report_print_theme', t);
    } catch {}
  };

  useEffect(() => {
    let active = true;
    fetch(`/api/reports?code=${selectedReportCode}`)
      .then((res) => res.json())
      .then((json) => {
        if (active && json.success && json.data) {
          setReportResult(json.data);
        }
      })
      .catch(() => {})
      .finally(() => {
        if (active) setIsLoading(false);
      });
    return () => {
      active = false;
    };
  }, [selectedReportCode]);

  const handlePrint = () => {
    setIsPrintModalOpen(true);
  };

  const handleDownloadReportPdf = () => {
    if (!reportResult) return;
    try {
      const pdfDoc = generateExecutiveReportPdf(reportResult, {
        reportTitle: reportResult.title,
        reportCode: selectedReportCode,
      });
      pdfDoc.save(`EXMARK_${selectedReportCode}_${new Date().toISOString().split('T')[0]}.pdf`);
      setToastMessage(`Downloaded PDF report: EXMARK_${selectedReportCode}.pdf`);
      setTimeout(() => setToastMessage(null), 3500);
    } catch (err) {
      console.error('Report PDF download failed:', err);
      setToastMessage('PDF generation error — opening print preview instead.');
      setIsPrintModalOpen(true);
    }
  };

  const handleExportCsv = () => {
    if (!reportResult || !reportResult.rows.length) return;
    const colKeys = Object.keys(reportResult.rows[0]);
    const headers = colKeys.map((k) => `"${k.replace(/([A-Z])/g, ' $1').trim()}"`).join(',');
    const rows = reportResult.rows
      .map((row) =>
        colKeys
          .map((k) => {
            const val = row[k];
            if (val === undefined || val === null) return '""';
            return typeof val === 'string' ? `"${val.replace(/"/g, '""')}"` : val;
          })
          .join(',')
      )
      .join('\n');
    const blob = new Blob([`${headers}\n${rows}`], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `EXMARK_${selectedReportCode}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    setToastMessage(`Exported ${reportResult.title} to Excel/CSV`);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const REPORT_OPTIONS = [
    { code: 'SALES_BY_DISTRICT', title: 'District Sales & Dealer Turnover' },
    { code: 'SALES_BILLS_RETURNS', title: 'Sales Bills & Returns Reconciliation' },
    { code: 'PRODUCTION_EFFICIENCY', title: 'Plant Output & QC First-Pass Yield' },
    { code: 'INVENTORY_VALUATION', title: 'Raw Materials & Chemical Valuation' },
    { code: 'OUTSTANDING_RECEIVABLES_AGING', title: 'Receivables Aging (>30, >60, >90 Days)' },
    { code: 'PLANT_OEE_MAINTENANCE', title: 'Machinery Uptime & OEE Audit' },
    { code: 'FRP_MODEL_MARGINS', title: 'FRP Door Model Profitability' },
    { code: 'ORDER_WISE_PROFIT_PNL', title: 'Order-Wise Profit & Loss (P&L)' },
    { code: 'BREAK_EVEN_CVP_ANALYSIS', title: 'Break-Even & Unit Economics CVP Audit' },
  ];

  const REPORT_THEMES: { id: ReportPrintTheme; label: string; desc: string }[] = [
    { id: 'tally-classic', label: 'Tally Classic', desc: 'Accounting Grid' },
    { id: 'tally-modern', label: 'Tally Modern', desc: 'Corporate Clean' },
    { id: 'tally-formal', label: 'Tally Formal', desc: 'Audit Standard' },
    { id: 'vyapar-executive', label: 'Vyapar Executive', desc: 'Brand Red Accent' },
  ];

  return (
    <div className="space-y-6">
      {toastMessage && (
        <div className="p-3 bg-emerald-500/15 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs flex items-center gap-2 print:hidden">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 print:hidden">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <BarChart3 className="w-6 h-6 text-red-500" />
            Executive Business Reports &amp; Analytics
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            FRP door sales, production capacity, receivables aging &amp; dealer performance across Kerala
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsWhatsAppOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-xs"
          >
            <Share2 className="w-3.5 h-3.5" /> Share via WhatsApp
          </button>
          <button
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold transition-colors cursor-pointer border border-slate-700"
          >
            <Download className="w-3.5 h-3.5 text-emerald-500" /> Export Excel / CSV
          </button>
          <button
            onClick={handleDownloadReportPdf}
            disabled={!reportResult}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-md shadow-indigo-900/30"
          >
            <Download className="w-3.5 h-3.5" /> Download PDF (.pdf)
          </button>
          <button
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer shadow-md shadow-red-900/30"
          >
            <Printer className="w-3.5 h-3.5" /> Print Preview (A4)
          </button>
        </div>
      </div>

      {/* Report Selector Tabs */}
      <div className="flex flex-wrap gap-2 print:hidden">
        {REPORT_OPTIONS.map((opt) => (
          <button
            key={opt.code}
            onClick={() => {
              setIsLoading(true);
              setSelectedReportCode(opt.code);
            }}
            className={`px-3 py-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              selectedReportCode === opt.code
                ? 'bg-red-600 text-white shadow-xs font-bold'
                : 'bg-white dark:bg-[#0B132B] text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            {opt.title}
          </button>
        ))}
      </div>

      {/* Main Screen View (hidden during print when modal or clean sheet is active) */}
      <div className="bg-white dark:bg-[#0B132B] rounded-xl border border-slate-200 dark:border-slate-800 p-6 space-y-4 print:hidden">
        <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs uppercase font-mono font-bold text-red-500 tracking-wider block">
                EXMARK DOORS ERP • OFFICIAL AUDIT REPORT
              </span>
              <h3 className="text-lg font-bold text-slate-900 dark:text-white mt-1">
                {reportResult?.title || 'Business Intelligence Report'}
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-slate-400 font-mono">
                Generated: {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
              </span>
              <button
                onClick={() => setIsPrintModalOpen(true)}
                className="px-2.5 py-1 text-xs rounded bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1 cursor-pointer border border-slate-700"
              >
                <Printer className="w-3.5 h-3.5 text-red-400" />
                Format PDF
              </button>
            </div>
          </div>
        </div>

        {/* Summary Metrics Strip */}
        {reportResult && reportResult.summaryMetrics && (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 p-3.5 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-800">
            {Object.entries(reportResult.summaryMetrics).map(([key, val]) => (
              <div key={key}>
                <span className="text-[10px] uppercase font-bold text-slate-400 block truncate">
                  {key.replace(/([A-Z])/g, ' $1')}
                </span>
                <span className="text-sm font-black font-mono text-slate-900 dark:text-white">{val}</span>
              </div>
            ))}
          </div>
        )}

        {/* Dynamic Table on screen */}
        {isLoading ? (
          <div className="p-8 text-center text-xs text-slate-400">Compiling report data...</div>
        ) : !reportResult || reportResult.rows.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400">No data found for this report period.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
              <thead className="bg-slate-50 dark:bg-slate-900 text-slate-400 uppercase text-[10px]">
                <tr>
                  <th className="p-3 w-10 text-center">#</th>
                  {Object.keys(reportResult.rows[0]).map((colKey) => (
                    <th key={colKey} className="p-3">
                      {colKey.replace(/([A-Z])/g, ' $1')}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {reportResult.rows.map((row, idx) => (
                  <tr key={idx} className="hover:bg-slate-50 dark:hover:bg-slate-900/50">
                    <td className="p-3 text-center text-slate-500 font-mono text-[11px]">{idx + 1}</td>
                    {Object.values(row).map((cellVal, cIdx) => (
                      <td
                        key={cIdx}
                        className={`p-3 ${
                          typeof cellVal === 'number'
                            ? 'font-mono font-bold text-slate-900 dark:text-white'
                            : ''
                        }`}
                      >
                        {typeof cellVal === 'number' && cellVal > 1000
                          ? `₹${cellVal.toLocaleString('en-IN')}`
                          : cellVal}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* On-Page Fallback Print Target (Only visible when browser print is triggered directly without modal) */}
      {!isPrintModalOpen && reportResult && (
        <div className="hidden print:block printable-document-modal w-full bg-white text-slate-900">
          <ReportPrintDocumentHub
            theme={printTheme}
            reportResult={reportResult}
            reportTitle={reportResult.title}
            reportCode={selectedReportCode}
          />
        </div>
      )}

      {/* ============================================================
       * PRINT & PDF DOCUMENT HUB MODAL (Tally & Vyapar Multi-Theme)
       * ============================================================ */}
      {isPrintModalOpen && reportResult && (
        <div className="fixed inset-0 bg-black/85 z-50 flex items-center justify-center p-2 sm:p-4 backdrop-blur-sm overflow-y-auto printable-document-modal printable-modal-root">
          <div className="bg-[#0f172a] border border-slate-700 w-full max-w-5xl rounded-2xl shadow-2xl overflow-hidden my-auto flex flex-col max-h-[96vh]">
            {/* Top Modal Header Bar */}
            <div className="p-3.5 border-b border-slate-800 flex justify-between items-center bg-[#131d35] print:hidden">
              <div className="flex items-center gap-2.5">
                <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-red-500/20 text-red-400 border border-red-500/30">
                  {selectedReportCode}
                </span>
                <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                  <Printer className="w-4 h-4 text-red-400" />
                  <span>Executive Report Print &amp; PDF Hub (A4 Layout)</span>
                </h3>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDownloadReportPdf}
                  className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white rounded-lg flex items-center gap-1.5 shadow-md shadow-indigo-900/40 transition cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PDF (.pdf)</span>
                </button>
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-1.5 bg-red-600 hover:bg-red-500 text-xs font-bold text-white rounded-lg flex items-center gap-1.5 shadow-md shadow-red-900/40 transition cursor-pointer"
                >
                  <Printer className="w-3.5 h-3.5" />
                  <span>Print Document (A4)</span>
                </button>
                <button
                  type="button"
                  onClick={() => setIsPrintModalOpen(false)}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 cursor-pointer transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Print Theme Switcher Toolbar */}
            <div className="border-b border-slate-800 bg-[#090e1a] p-3 flex flex-wrap items-center justify-between gap-3 text-xs print:hidden">
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-semibold">Print Theme Layout:</span>
                <div className="flex flex-wrap gap-1.5">
                  {REPORT_THEMES.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => handleSelectTheme(t.id)}
                      className={`px-3 py-1 rounded-md text-[11px] font-bold transition cursor-pointer ${
                        printTheme === t.id
                          ? 'bg-red-600 text-white shadow-sm ring-1 ring-red-400'
                          : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center gap-2 text-slate-400 text-[11px]">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>Paper: <strong>A4 Portrait</strong> (Ready for print or PDF export)</span>
              </div>
            </div>

            {/* Printable Paper Canvas Preview */}
            <div id="printableReportArea" className="p-4 sm:p-6 overflow-y-auto bg-slate-950/90 flex justify-center print:p-0 print:bg-white">
              <div className="w-full max-w-4xl bg-white shadow-2xl rounded-lg overflow-hidden border border-slate-200 print:shadow-none print:border-none print:rounded-none">
                <ReportPrintDocumentHub
                  theme={printTheme}
                  reportResult={reportResult}
                  reportTitle={reportResult.title}
                  reportCode={selectedReportCode}
                />
              </div>
            </div>

            {/* Modal Bottom Status Bar */}
            <div className="p-3 bg-[#0a0f1d] border-t border-slate-800 flex justify-between items-center text-xs print:hidden">
              <div className="text-[11px] text-slate-400 flex items-center gap-2">
                <span>
                  Active Layout: <strong className="text-white uppercase">{printTheme.replace('-', ' ')}</strong> | Total Rows: <strong className="text-red-400">{reportResult.rows.length}</strong>
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleExportCsv}
                  className="px-3 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg cursor-pointer transition flex items-center gap-1"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-400" />
                  Excel / CSV
                </button>
                <button
                  type="button"
                  onClick={() => setIsPrintModalOpen(false)}
                  className="px-4 py-1.5 text-xs bg-slate-800 hover:bg-slate-700 text-white rounded-lg cursor-pointer transition"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <WhatsAppSendModal
        isOpen={isWhatsAppOpen}
        onClose={() => setIsWhatsAppOpen(false)}
        initialDocumentType={'QUOTATION' as WhatsAppDocumentType}
        onSent={() => {
          setToastMessage('Report summary transmitted via WhatsApp Cloud API.');
          setTimeout(() => setToastMessage(null), 3000);
        }}
      />
    </div>
  );
}

/* -------------------------------------------------------------
 * 14. SETTINGS VIEW
 * ------------------------------------------------------------- */
function FrameAndBoqWoodSettings() {
  const [frames, setFrames] = useState<CustomFrameProfile[]>(DEFAULT_FRAME_PROFILES);
  const [isFrameModalOpen, setIsFrameModalOpen] = useState(false);
  const [rates, setRates] = useState<BoqMaterialRatesConfig>(DEFAULT_BOQ_MATERIAL_RATES);
  const [savingFrameId, setSavingFrameId] = useState<string | null>(null);
  const [savingRates, setSavingRates] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const loadData = () => {
    fetch('/api/settings/frames')
      .then((r) => r.json())
      .then((json) => {
        if (json.success && Array.isArray(json.data)) setFrames(json.data);
      })
      .catch(() => {});

    fetch('/api/boq/material-rates')
      .then((r) => r.json())
      .then((json) => {
        if (json.success && json.data) {
          const merged = mergeBoqMaterialRates(json.data);
          if (json.data.pigmentRatesByColour) {
            merged.pigmentRatesByColour = json.data.pigmentRatesByColour;
          }
          setRates(merged);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleFrameFieldChange = (
    id: string,
    field: 'woodThicknessCm' | 'woodWidthCm' | 'woodLengthDeductionCm' | 'quotationExtraRate',
    value: number
  ) => {
    setFrames((prev) =>
      prev.map((f) => (f.id === id ? { ...f, [field]: Number.isFinite(value) ? value : 0 } : f))
    );
  };

  const handleSaveFrameWood = async (frame: CustomFrameProfile) => {
    setSavingFrameId(frame.id);
    setNotice(null);
    try {
      const res = await fetch(`/api/settings/frames/${encodeURIComponent(frame.id)}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          woodThicknessCm: frame.woodThicknessCm ?? 2,
          woodWidthCm: frame.woodWidthCm ?? 7,
          woodLengthDeductionCm: frame.woodLengthDeductionCm ?? 35,
          quotationExtraRate: frame.quotationExtraRate ?? 0,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setNotice(`Saved BOQ Wood dimensions for ${frame.name}`);
      }
    } finally {
      setSavingFrameId(null);
    }
  };

  const handleSaveBoqFormulaRates = async () => {
    setSavingRates(true);
    setNotice(null);
    try {
      const res = await fetch('/api/boq/material-rates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(rates),
      });
      const json = await res.json();
      if (json.success && json.data) {
        setRates(mergeBoqMaterialRates(json.data));
        setNotice('Saved Frame Wood Formula Mode & BOQ Material Rates');
      }
    } finally {
      setSavingRates(false);
    }
  };

  return (
    <div className="space-y-5 text-xs">
      {notice && (
        <div className="p-3 rounded-xl bg-emerald-950/50 border border-emerald-600/60 text-emerald-300 font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{notice}</span>
        </div>
      )}

      {/* Frame Wood Section Matrix */}
      <div className="bg-[#0B132B] border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h3 className="font-bold text-white text-sm flex items-center gap-2">
              <Layers className="w-4 h-4 text-amber-400" />
              Frame Profiles &amp; BOQ Timber Reeper Sections
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Update Regular, Medium, Heavy, School, Mini, or custom frame wood dimensions (Thickness cm, Width cm, Length Deduction cm) for automatic Cu.Ft BOQ calculation.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setIsFrameModalOpen(true)}
            className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold flex items-center gap-1.5 shadow cursor-pointer shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Add / Manage Custom Frames</span>
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-800 bg-[#070D1E] text-slate-400 uppercase text-[10px]">
                <th className="p-2.5">Frame Profile</th>
                <th className="p-2.5">Wall × Rebate</th>
                <th className="p-2.5 text-right">Wood Thick (cm)</th>
                <th className="p-2.5 text-right">Wood Width (cm)</th>
                <th className="p-2.5 text-right">Length Deduction (cm)</th>
                <th className="p-2.5 text-right">Quote Extra (₹)</th>
                <th className="p-2.5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {frames.map((frame) => (
                <tr key={frame.id} className="hover:bg-slate-800/30">
                  <td className="p-2.5">
                    <div className="font-bold text-white flex items-center gap-1.5">
                      <span>{frame.name}</span>
                      {frame.isDefault && (
                        <span className="px-1.5 py-0.5 text-[9px] rounded bg-emerald-950 text-emerald-300 border border-emerald-800">
                          DEFAULT
                        </span>
                      )}
                    </div>
                    <div className="text-[10px] text-slate-400">{frame.id}</div>
                  </td>
                  <td className="p-2.5 text-slate-300">
                    {frame.wallThicknessMm} × {frame.sectionWidthMm} mm
                  </td>
                  <td className="p-2.5 text-right">
                    <input
                      type="number"
                      step="0.5"
                      value={frame.woodThicknessCm ?? 2}
                      onChange={(e) =>
                        handleFrameFieldChange(frame.id, 'woodThicknessCm', Number(e.target.value))
                      }
                      className="w-20 bg-[#070D1E] border border-slate-700 rounded px-2 py-1 text-right text-amber-300 font-bold"
                    />
                  </td>
                  <td className="p-2.5 text-right">
                    <input
                      type="number"
                      step="0.5"
                      value={frame.woodWidthCm ?? 7}
                      onChange={(e) =>
                        handleFrameFieldChange(frame.id, 'woodWidthCm', Number(e.target.value))
                      }
                      className="w-20 bg-[#070D1E] border border-slate-700 rounded px-2 py-1 text-right text-amber-300 font-bold"
                    />
                  </td>
                  <td className="p-2.5 text-right">
                    <input
                      type="number"
                      step="1"
                      value={frame.woodLengthDeductionCm ?? 35}
                      onChange={(e) =>
                        handleFrameFieldChange(
                          frame.id,
                          'woodLengthDeductionCm',
                          Number(e.target.value)
                        )
                      }
                      className="w-20 bg-[#070D1E] border border-slate-700 rounded px-2 py-1 text-right text-white font-bold"
                    />
                  </td>
                  <td className="p-2.5 text-right">
                    <input
                      type="number"
                      value={frame.quotationExtraRate ?? 0}
                      onChange={(e) =>
                        handleFrameFieldChange(
                          frame.id,
                          'quotationExtraRate',
                          Number(e.target.value)
                        )
                      }
                      className="w-24 bg-[#070D1E] border border-slate-700 rounded px-2 py-1 text-right text-emerald-300 font-bold"
                    />
                  </td>
                  <td className="p-2.5 text-center">
                    <button
                      type="button"
                      disabled={savingFrameId === frame.id}
                      onClick={() => handleSaveFrameWood(frame)}
                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-bold cursor-pointer"
                    >
                      {savingFrameId === frame.id ? 'Saving...' : 'Save Wood'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Global Wood Formula Mode & Core BOQ Rates */}
      <div className="bg-[#0B132B] border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h3 className="font-bold text-white text-sm">
              Global BOQ Timber, Foam &amp; Sq.Ft Baseline Formula Settings
            </h3>
            <p className="text-[11px] text-slate-400">
              Defaults calibrated to 80×210 cm Normal Door (8 kg Resin, 1.5 kg GEL, 180g Catalyst, 100g Accelerator, 3.5 kg CSM 300 GSM, 250g Pigment, 12-door 50×100 cm Foam @ ₹250).
            </p>
          </div>
          <button
            type="button"
            disabled={savingRates}
            onClick={handleSaveBoqFormulaRates}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-bold cursor-pointer"
          >
            {savingRates ? 'Saving...' : 'Save BOQ Formula Settings'}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="text-[10px] text-slate-400 uppercase font-bold">
              Frame Running Length Mode
            </label>
            <select
              value={rates.frameLengthMode}
              onChange={(e) =>
                setRates({ ...rates, frameLengthMode: e.target.value as FrameLengthMode })
              }
              className="w-full mt-1 bg-[#070D1E] border border-slate-700 rounded-lg px-3 py-2 text-white font-semibold"
            >
              <option value="FRAME_3SIDE_MINUS_DED">3-Side Frame: (2×H + W) − Deduction</option>
              <option value="FRAME_2H_MINUS_DED">2-Side Frame: (2×H) − Deduction</option>
              <option value="SINGLE_H_MINUS_DED">Single Height: H − Deduction</option>
            </select>
          </div>

          <div>
            <label className="text-[10px] text-slate-400 uppercase font-bold">
              Timber Rate (₹ / Cu.Ft)
            </label>
            <input
              type="number"
              value={rates.woodRatePerCuFt}
              onChange={(e) => setRates({ ...rates, woodRatePerCuFt: Number(e.target.value) || 0 })}
              className="w-full mt-1 bg-[#070D1E] border border-slate-700 rounded-lg px-3 py-2 text-amber-300 font-bold"
            />
          </div>

          <div>
            <label className="text-[10px] text-slate-400 uppercase font-bold">
              Rigid Foam Sheet Rate (₹ / Sheet for {rates.foamSheet.doorsPerSheet} doors)
            </label>
            <input
              type="number"
              value={rates.foamSheet.costPerSheet}
              onChange={(e) =>
                setRates({
                  ...rates,
                  foamSheet: {
                    ...rates.foamSheet,
                    costPerSheet: Number(e.target.value) || 0,
                  },
                })
              }
              className="w-full mt-1 bg-[#070D1E] border border-slate-700 rounded-lg px-3 py-2 text-sky-300 font-bold"
            />
          </div>
        </div>
      </div>

      <CustomFrameManagerModal
        isOpen={isFrameModalOpen}
        onClose={() => setIsFrameModalOpen(false)}
        onFramesUpdated={loadData}
      />
    </div>
  );
}

export function SettingsView({
  userRole,
  currentUserId,
  initialTab,
}: {
  userRole?: UserRole;
  currentUserId?: string;
  initialTab?:
    | 'customization'
    | 'display_appearance'
    | 'frames_boq_wood'
    | 'categories'
    | 'profile'
    | 'system_updates'
    | 'backup_updates'
    | 'cloud_sync'
    | 'staff_access';
}) {
  const isSuperAdmin = userRole === 'Super Admin';
  const [activeTab, setActiveTab] = useState<
    | 'customization'
    | 'display_appearance'
    | 'frames_boq_wood'
    | 'categories'
    | 'profile'
    | 'system_updates'
    | 'backup_updates'
    | 'cloud_sync'
    | 'staff_access'
  >(initialTab && (initialTab !== 'staff_access' || isSuperAdmin) ? initialTab : 'customization');

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Settings className="w-6 h-6 text-red-500" />
            Admin Settings &amp; Plant Configuration
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Master ERP customization, dynamic fields, tolerances, staff logins, product categories &amp; backups
          </p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-2 text-xs overflow-x-auto">
        <button
          onClick={() => setActiveTab('customization')}
          className={`px-3.5 py-1.5 rounded-lg font-bold transition-colors cursor-pointer shrink-0 ${
            activeTab === 'customization'
              ? 'bg-red-600 text-white'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-white'
          }`}
        >
          Master Rules &amp; Customization Engine (17 Domains)
        </button>
        <button
          onClick={() => setActiveTab('display_appearance')}
          className={`px-3.5 py-1.5 rounded-lg font-bold transition-colors cursor-pointer shrink-0 ${
            activeTab === 'display_appearance'
              ? 'bg-blue-600 text-white'
              : 'bg-slate-100 dark:bg-slate-800 text-blue-400 hover:text-white'
          }`}
        >
          Display, Themes &amp; Screen Fit
        </button>
        {isSuperAdmin && (
          <button
            onClick={() => setActiveTab('staff_access')}
            className={`px-3.5 py-1.5 rounded-lg font-bold transition-colors cursor-pointer shrink-0 ${
              activeTab === 'staff_access'
                ? 'bg-amber-500 text-slate-950'
                : 'bg-slate-100 dark:bg-slate-800 text-amber-400 hover:text-white'
            }`}
          >
            Staff Logins &amp; Roles
          </button>
        )}
        <button
          onClick={() => setActiveTab('frames_boq_wood')}
          className={`px-3.5 py-1.5 rounded-lg font-bold transition-colors cursor-pointer shrink-0 ${
            activeTab === 'frames_boq_wood'
              ? 'bg-red-600 text-white'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-white'
          }`}
        >
          Frame &amp; BOQ Wood Settings
        </button>
        <button
          onClick={() => setActiveTab('categories')}
          className={`px-3.5 py-1.5 rounded-lg font-bold transition-colors cursor-pointer shrink-0 ${
            activeTab === 'categories'
              ? 'bg-red-600 text-white'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-white'
          }`}
        >
          Product Categories (FRP / WPC)
        </button>
        <button
          onClick={() => setActiveTab('profile')}
          className={`px-3.5 py-1.5 rounded-lg font-bold transition-colors cursor-pointer shrink-0 ${
            activeTab === 'profile'
              ? 'bg-red-600 text-white'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-white'
          }`}
        >
          Company &amp; Factory Profile
        </button>
        <button
          onClick={() => setActiveTab('system_updates')}
          className={`px-3.5 py-1.5 rounded-lg font-bold transition-colors cursor-pointer shrink-0 flex items-center gap-1.5 ${
            activeTab === 'system_updates'
              ? 'bg-red-600 text-white'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-white'
          }`}
        >
          <ArrowUpCircle className="w-3.5 h-3.5 text-amber-400" />
          Software Updates (EXE &amp; APK)
        </button>
        <button
          onClick={() => setActiveTab('backup_updates')}
          className={`px-3.5 py-1.5 rounded-lg font-bold transition-colors cursor-pointer shrink-0 ${
            activeTab === 'backup_updates'
              ? 'bg-red-600 text-white'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-white'
          }`}
        >
          Backup, Restore &amp; Vault
        </button>
        <button
          onClick={() => setActiveTab('cloud_sync')}
          className={`px-3.5 py-1.5 rounded-lg font-bold transition-colors cursor-pointer shrink-0 ${
            activeTab === 'cloud_sync'
              ? 'bg-red-600 text-white'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:text-white'
          }`}
        >
          Cloud Sync (Postgres &amp; Google Drive)
        </button>
      </div>

      {activeTab === 'customization' && <AdminCustomizationSettings />}

      {activeTab === 'display_appearance' && <DisplayAppearanceSettings />}

      {activeTab === 'staff_access' && isSuperAdmin && (
        <StaffAccessManagementTab currentUserId={currentUserId} />
      )}

      {activeTab === 'frames_boq_wood' && <FrameAndBoqWoodSettings />}

      {activeTab === 'categories' && <ProductCategoriesSettings />}

      {activeTab === 'profile' && <CompanyFactoryProfileSettings />}

      {activeTab === 'system_updates' && <InbuiltUpdateTab />}

      {activeTab === 'backup_updates' && <SystemBackupAndUpdateTab />}

      {activeTab === 'cloud_sync' && <CloudSyncSettingsTab />}
    </div>
  );
}
