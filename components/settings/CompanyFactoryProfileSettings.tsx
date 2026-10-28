'use client';

import React, { useState, useEffect } from 'react';
import {
  Building2,
  Factory,
  MapPin,
  FileText,
  Save,
  CheckCircle2,
  AlertTriangle,
  History,
  Eye,
  Plus,
  Trash2,
  ShieldCheck,
  Globe,
  Phone,
  Mail,
  Printer,
  Sparkles,
} from 'lucide-react';
import { CompanyProfile, FactoryProfile, AddressDetails, DEFAULT_COMPANY_PROFILE } from '@/types/companyProfile';

const KERALA_DISTRICTS = [
  'Alappuzha',
  'Ernakulam',
  'Idukki',
  'Kannur',
  'Kasaragod',
  'Kollam',
  'Kottayam',
  'Kozhikode',
  'Malappuram',
  'Palakkad',
  'Pathanamthitta',
  'Thiruvananthapuram',
  'Thrissur',
  'Wayanad',
];

interface RevisionItem {
  id: string;
  version: number;
  publishedAt: string;
  publishedBy: string;
  changelog: string;
  brandName?: string;
  defaultFactory?: string;
}

export default function CompanyFactoryProfileSettings({ onSettingsUpdated }: { onSettingsUpdated?: () => void }) {
  const [profile, setProfile] = useState<CompanyProfile>(DEFAULT_COMPANY_PROFILE);
  const [activeSubTab, setActiveSubTab] = useState<'company' | 'addresses' | 'factories' | 'preview' | 'history'>('company');
  const [selectedFactoryIdx, setSelectedFactoryIdx] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [isPublishing, setIsPublishing] = useState<boolean>(false);
  const [isPublishModalOpen, setIsPublishModalOpen] = useState<boolean>(false);
  const [publishChangelog, setPublishChangelog] = useState<string>('');
  const [revisions, setRevisions] = useState<RevisionItem[]>([]);
  const [toastMessage, setToastMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const showToast = (type: 'success' | 'error', text: string) => {
    setToastMessage({ type, text });
    setTimeout(() => setToastMessage(null), 4000);
  };

  const fetchProfile = async () => {
    setIsLoading(true);
    try {
      const [resProfile, resHistory] = await Promise.all([
        fetch('/api/settings/company-profile?view=active').then((r) => r.json()),
        fetch('/api/settings/company-profile?view=history').then((r) => r.json()),
      ]);

      if (resProfile.success && resProfile.data) {
        setProfile(resProfile.data);
      }
      if (resHistory.success && Array.isArray(resHistory.data)) {
        setRevisions(resHistory.data);
      }
    } catch {
      showToast('error', 'Failed to load Company & Factory profile.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleSaveDraft = async () => {
    setIsSaving(true);
    try {
      const res = await fetch('/api/settings/company-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'SAVE_DRAFT', profile }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to save draft');
      showToast('success', 'Profile draft saved successfully.');
      if (onSettingsUpdated) onSettingsUpdated();
    } catch (err: unknown) {
      showToast('error', err instanceof Error ? err.message : 'Error saving draft');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePublish = async () => {
    setIsPublishing(true);
    try {
      const res = await fetch('/api/settings/company-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'PUBLISH',
          profile,
          changelog: publishChangelog || `Updated Factory Profile: ${activeFactory.name}`,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || 'Failed to publish');

      showToast('success', `Company Profile Version ${data.version} published across all ERP modules.`);
      setIsPublishModalOpen(false);
      setPublishChangelog('');
      fetchProfile();
      if (onSettingsUpdated) onSettingsUpdated();
    } catch (err: unknown) {
      showToast('error', err instanceof Error ? err.message : 'Error publishing profile');
    } finally {
      setIsPublishing(false);
    }
  };

  const updateCompanyField = (field: keyof CompanyProfile, val: unknown) => {
    setProfile((prev) => ({ ...prev, [field]: val }));
  };

  const updateAddress = (type: 'registeredOffice' | 'corporateOffice' | 'billingAddress' | 'warehouseLocation', field: keyof AddressDetails, val: string) => {
    setProfile((prev) => ({
      ...prev,
      [type]: {
        ...(prev[type] || { addressLine1: '', district: '', state: 'Kerala', pinCode: '', country: 'India' }),
        [field]: val,
      },
    }));
  };

  const updateFactory = (idx: number, field: keyof FactoryProfile, val: unknown) => {
    setProfile((prev) => {
      const updated = [...prev.factories];
      updated[idx] = { ...updated[idx], [field]: val };
      return { ...prev, factories: updated };
    });
  };

  const updateFactoryAddress = (idx: number, field: keyof AddressDetails, val: string) => {
    setProfile((prev) => {
      const updated = [...prev.factories];
      updated[idx] = {
        ...updated[idx],
        address: {
          ...updated[idx].address,
          [field]: val,
        },
      };
      return { ...prev, factories: updated };
    });
  };

  const setDefaultFactory = (idx: number) => {
    setProfile((prev) => {
      const updated = prev.factories.map((f, i) => ({
        ...f,
        isDefault: i === idx,
      }));
      return {
        ...prev,
        factories: updated,
        defaultFactoryId: updated[idx].id,
      };
    });
  };

  const addFactory = () => {
    const newIdx = profile.factories.length + 1;
    const newFac: FactoryProfile = {
      id: `fac-${Date.now()}`,
      name: `Factory Unit #${newIdx}`,
      code: `FAC-0${newIdx}`,
      isDefault: false,
      status: 'Planned',
      address: {
        addressLine1: '',
        addressLine2: '',
        district: '',
        state: 'Kerala',
        pinCode: '',
        country: 'India',
      },
      manufacturingLocation: '',
      warehouseLocation: '',
      phone: '',
      email: '',
      plantManager: '',
      pressCapacityPerDay: 20,
      hydraulicPressLines: 4,
      notes: '',
    };
    setProfile((prev) => ({ ...prev, factories: [...prev.factories, newFac] }));
    setSelectedFactoryIdx(profile.factories.length);
  };

  const removeFactory = (idx: number) => {
    if (profile.factories.length <= 1) {
      showToast('error', 'At least one factory location must remain configured.');
      return;
    }
    const isRemovingDefault = profile.factories[idx].isDefault;
    const updated = profile.factories.filter((_, i) => i !== idx);
    if (isRemovingDefault && updated.length > 0) {
      updated[0].isDefault = true;
    }
    setProfile((prev) => ({
      ...prev,
      factories: updated,
      defaultFactoryId: updated.find((f) => f.isDefault)?.id || updated[0].id,
    }));
    setSelectedFactoryIdx(0);
  };

  const activeFactory = profile.factories[selectedFactoryIdx] || profile.factories[0] || DEFAULT_COMPANY_PROFILE.factories[0];

  if (isLoading) {
    return (
      <div className="p-8 text-center text-slate-400">
        <Sparkles className="w-6 h-6 animate-spin mx-auto mb-2 text-red-500" />
        Loading central company &amp; factory profile...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {toastMessage && (
        <div
          className={`p-4 rounded-xl border text-xs font-semibold flex items-center justify-between ${
            toastMessage.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
              : 'bg-red-500/10 border-red-500/30 text-red-400'
          }`}
        >
          <span>{toastMessage.text}</span>
          <button onClick={() => setToastMessage(null)} className="ml-2 font-bold cursor-pointer">
            &times;
          </button>
        </div>
      )}

      {/* Header and Action Ribbon */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <h2 className="text-xl font-black text-slate-900 dark:text-white flex items-center gap-2">
            <Building2 className="w-6 h-6 text-red-600" />
            Company &amp; Factory Profile Settings
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Central authoritative profile for registered entity, legal billing, corporate headquarters, and manufacturing plants.
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => setActiveSubTab('preview')}
            className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer ${
              activeSubTab === 'preview'
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:text-white'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            Preview Documents
          </button>
          <button
            onClick={handleSaveDraft}
            disabled={isSaving}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" />
            {isSaving ? 'Saving...' : 'Save Draft'}
          </button>
          <button
            onClick={() => setIsPublishModalOpen(true)}
            className="px-4 py-2 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white rounded-lg text-xs font-bold shadow-md shadow-red-950/40 transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Publish &amp; Confirm
          </button>
        </div>
      </div>

      {/* Sub-Navigation Tabs */}
      <div className="flex gap-2 border-b border-slate-200 dark:border-slate-800 overflow-x-auto pb-2 text-xs font-bold">
        <button
          onClick={() => setActiveSubTab('company')}
          className={`px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
            activeSubTab === 'company'
              ? 'bg-red-600 text-white'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          Entity &amp; Brand
        </button>
        <button
          onClick={() => setActiveSubTab('addresses')}
          className={`px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
            activeSubTab === 'addresses'
              ? 'bg-red-600 text-white'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <MapPin className="w-3.5 h-3.5" />
          Discrete Addresses
        </button>
        <button
          onClick={() => setActiveSubTab('factories')}
          className={`px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
            activeSubTab === 'factories'
              ? 'bg-red-600 text-white'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <Factory className="w-3.5 h-3.5" />
          Factory Locations ({profile.factories.length})
        </button>
        <button
          onClick={() => setActiveSubTab('preview')}
          className={`px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
            activeSubTab === 'preview'
              ? 'bg-red-600 text-white'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          Document Header Preview
        </button>
        <button
          onClick={() => setActiveSubTab('history')}
          className={`px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
            activeSubTab === 'history'
              ? 'bg-red-600 text-white'
              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
          }`}
        >
          <History className="w-3.5 h-3.5" />
          Change Ledger ({revisions.length})
        </button>
      </div>

      {/* TAB 1: Company Entity & Brand */}
      {activeSubTab === 'company' && (
        <div className="bg-white dark:bg-[#0B132B] p-6 rounded-xl border border-slate-200 dark:border-slate-800 space-y-5">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white">Registered Legal Entity &amp; Branding</h3>
            <p className="text-xs text-slate-500">Legal details applied to GST invoices, corporate filings and customer quotes.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-slate-500 font-semibold mb-1">Registered Company Name *</label>
              <input
                type="text"
                value={profile.registeredCompanyName}
                onChange={(e) => updateCompanyField('registeredCompanyName', e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white font-medium focus:ring-1 focus:ring-red-500"
                placeholder="e.g. EXMARK DOORS PRIVATE LIMITED"
              />
            </div>

            <div>
              <label className="block text-slate-500 font-semibold mb-1">Brand Name *</label>
              <input
                type="text"
                value={profile.brandName}
                onChange={(e) => updateCompanyField('brandName', e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white font-medium focus:ring-1 focus:ring-red-500"
                placeholder="e.g. EXMARK Doors"
              />
            </div>

            <div>
              <label className="block text-slate-500 font-semibold mb-1">Kerala GSTIN *</label>
              <input
                type="text"
                value={profile.gstin}
                onChange={(e) => updateCompanyField('gstin', e.target.value.toUpperCase())}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white font-mono uppercase focus:ring-1 focus:ring-red-500"
                placeholder="32AABCE9821K1ZN"
              />
              <span className="text-[10px] text-slate-400 mt-0.5 block">State code 32 (Kerala) followed by 10-char PAN and 3-char suffix</span>
            </div>

            <div>
              <label className="block text-slate-500 font-semibold mb-1">Permanent Account Number (PAN)</label>
              <input
                type="text"
                value={profile.panNumber || ''}
                onChange={(e) => updateCompanyField('panNumber', e.target.value.toUpperCase())}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white font-mono uppercase focus:ring-1 focus:ring-red-500"
                placeholder="AABCE9821K"
              />
            </div>

            <div>
              <label className="block text-slate-500 font-semibold mb-1">Corporate Identity Number (CIN)</label>
              <input
                type="text"
                value={profile.cinNumber || ''}
                onChange={(e) => updateCompanyField('cinNumber', e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white font-mono focus:ring-1 focus:ring-red-500"
                placeholder="U25209KL2022PTC076123"
              />
            </div>

            <div>
              <label className="block text-slate-500 font-semibold mb-1">Company Website</label>
              <input
                type="text"
                value={profile.website}
                onChange={(e) => updateCompanyField('website', e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white font-medium focus:ring-1 focus:ring-red-500"
                placeholder="https://www.exmarkdoors.com"
              />
            </div>

            <div>
              <label className="block text-slate-500 font-semibold mb-1">Official Company Email</label>
              <input
                type="email"
                value={profile.email}
                onChange={(e) => updateCompanyField('email', e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white font-medium focus:ring-1 focus:ring-red-500"
                placeholder="sales@exmarkdoors.com"
              />
            </div>

            <div>
              <label className="block text-slate-500 font-semibold mb-1">Official Contact Phone</label>
              <input
                type="text"
                value={profile.phone}
                onChange={(e) => updateCompanyField('phone', e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white font-medium focus:ring-1 focus:ring-red-500"
                placeholder="+91 484 290 8800"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-slate-500 font-semibold mb-1">Company Logo Path / URL</label>
              <input
                type="text"
                value={profile.logoUrl}
                onChange={(e) => updateCompanyField('logoUrl', e.target.value)}
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white font-medium focus:ring-1 focus:ring-red-500"
                placeholder="/images/exmark-logo.png"
              />
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Discrete Addresses (Registered, Corporate, Billing, Warehouse) */}
      {activeSubTab === 'addresses' && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-xs text-blue-300">
            <strong>Enterprise Architecture Notice:</strong> Registered office, legal billing address, executive office, and central warehouse are segregated to accommodate geographically independent operations across Kerala.
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* 1. Registered Office */}
            <div className="bg-white dark:bg-[#0B132B] p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-indigo-400" />
                1. Registered Office (RoC Legal)
              </h4>
              <div className="space-y-2 text-xs">
                <div>
                  <label className="block text-slate-500 font-medium mb-0.5">Address Line 1</label>
                  <input
                    type="text"
                    value={profile.registeredOffice?.addressLine1 || ''}
                    onChange={(e) => updateAddress('registeredOffice', 'addressLine1', e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 font-medium mb-0.5">Address Line 2</label>
                  <input
                    type="text"
                    value={profile.registeredOffice?.addressLine2 || ''}
                    onChange={(e) => updateAddress('registeredOffice', 'addressLine2', e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-500 font-medium mb-0.5">District</label>
                    <select
                      value={profile.registeredOffice?.district || ''}
                      onChange={(e) => updateAddress('registeredOffice', 'district', e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white"
                    >
                      <option value="">Select District</option>
                      {KERALA_DISTRICTS.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-500 font-medium mb-0.5">PIN Code</label>
                    <input
                      type="text"
                      value={profile.registeredOffice?.pinCode || ''}
                      onChange={(e) => updateAddress('registeredOffice', 'pinCode', e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white font-mono"
                      maxLength={6}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 2. Corporate Office */}
            <div className="bg-white dark:bg-[#0B132B] p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Globe className="w-4 h-4 text-emerald-400" />
                2. Corporate / Executive Headquarters
              </h4>
              <div className="space-y-2 text-xs">
                <div>
                  <label className="block text-slate-500 font-medium mb-0.5">Address Line 1</label>
                  <input
                    type="text"
                    value={profile.corporateOffice?.addressLine1 || ''}
                    onChange={(e) => updateAddress('corporateOffice', 'addressLine1', e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 font-medium mb-0.5">Address Line 2</label>
                  <input
                    type="text"
                    value={profile.corporateOffice?.addressLine2 || ''}
                    onChange={(e) => updateAddress('corporateOffice', 'addressLine2', e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-500 font-medium mb-0.5">District</label>
                    <select
                      value={profile.corporateOffice?.district || ''}
                      onChange={(e) => updateAddress('corporateOffice', 'district', e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white"
                    >
                      <option value="">Select District</option>
                      {KERALA_DISTRICTS.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-500 font-medium mb-0.5">PIN Code</label>
                    <input
                      type="text"
                      value={profile.corporateOffice?.pinCode || ''}
                      onChange={(e) => updateAddress('corporateOffice', 'pinCode', e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white font-mono"
                      maxLength={6}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 3. Legal Billing Address */}
            <div className="bg-white dark:bg-[#0B132B] p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-amber-400" />
                3. Legal Billing Address (GST Invoices)
              </h4>
              <div className="space-y-2 text-xs">
                <div>
                  <label className="block text-slate-500 font-medium mb-0.5">Address Line 1</label>
                  <input
                    type="text"
                    value={profile.billingAddress?.addressLine1 || ''}
                    onChange={(e) => updateAddress('billingAddress', 'addressLine1', e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 font-medium mb-0.5">Address Line 2</label>
                  <input
                    type="text"
                    value={profile.billingAddress?.addressLine2 || ''}
                    onChange={(e) => updateAddress('billingAddress', 'addressLine2', e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-500 font-medium mb-0.5">District</label>
                    <select
                      value={profile.billingAddress?.district || ''}
                      onChange={(e) => updateAddress('billingAddress', 'district', e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white"
                    >
                      <option value="">Select District</option>
                      {KERALA_DISTRICTS.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-500 font-medium mb-0.5">PIN Code</label>
                    <input
                      type="text"
                      value={profile.billingAddress?.pinCode || ''}
                      onChange={(e) => updateAddress('billingAddress', 'pinCode', e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white font-mono"
                      maxLength={6}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 4. Central Warehouse Location */}
            <div className="bg-white dark:bg-[#0B132B] p-5 rounded-xl border border-slate-200 dark:border-slate-800 space-y-3">
              <h4 className="font-bold text-xs uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <MapPin className="w-4 h-4 text-purple-400" />
                4. Central Warehouse / Dispatch Depot
              </h4>
              <div className="space-y-2 text-xs">
                <div>
                  <label className="block text-slate-500 font-medium mb-0.5">Address Line 1</label>
                  <input
                    type="text"
                    value={profile.warehouseLocation?.addressLine1 || ''}
                    onChange={(e) => updateAddress('warehouseLocation', 'addressLine1', e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 font-medium mb-0.5">Address Line 2</label>
                  <input
                    type="text"
                    value={profile.warehouseLocation?.addressLine2 || ''}
                    onChange={(e) => updateAddress('warehouseLocation', 'addressLine2', e.target.value)}
                    className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-slate-500 font-medium mb-0.5">District</label>
                    <select
                      value={profile.warehouseLocation?.district || ''}
                      onChange={(e) => updateAddress('warehouseLocation', 'district', e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white"
                    >
                      <option value="">Select District</option>
                      {KERALA_DISTRICTS.map((d) => (
                        <option key={d} value={d}>{d}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-slate-500 font-medium mb-0.5">PIN Code</label>
                    <input
                      type="text"
                      value={profile.warehouseLocation?.pinCode || ''}
                      onChange={(e) => updateAddress('warehouseLocation', 'pinCode', e.target.value)}
                      className="w-full px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white font-mono"
                      maxLength={6}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: Factory Locations (Multi-Factory Support) */}
      {activeSubTab === 'factories' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Factory Selector / List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-xs uppercase tracking-wider text-slate-400">Configured Plants</h3>
              <button
                onClick={addFactory}
                className="px-2.5 py-1 bg-red-600/10 hover:bg-red-600/20 text-red-400 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                Add Plant
              </button>
            </div>

            <div className="space-y-2">
              {profile.factories.map((fac, idx) => (
                <div
                  key={fac.id}
                  onClick={() => setSelectedFactoryIdx(idx)}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                    selectedFactoryIdx === idx
                      ? 'bg-red-600/10 border-red-500 text-white shadow-sm'
                      : 'bg-white dark:bg-[#0B132B] border-slate-200 dark:border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-xs text-slate-900 dark:text-white flex items-center gap-1.5">
                      <Factory className="w-4 h-4 text-red-500" />
                      {fac.name || 'Unnamed Factory'}
                    </span>
                    {fac.isDefault && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        Active Default
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {fac.address?.district ? `${fac.address.district}, Kerala` : 'Location pending configuration'}
                  </p>
                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-100 dark:border-slate-800/80 text-[10px] text-slate-500">
                    <span>{fac.hydraulicPressLines || 8} Press Lines</span>
                    <span className="capitalize">{fac.status}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Selected Factory Details Editor */}
          <div className="lg:col-span-2 bg-white dark:bg-[#0B132B] p-6 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <div>
                <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
                  <Factory className="w-4 h-4 text-red-500" />
                  Edit Factory: {activeFactory.name}
                </h3>
                <p className="text-xs text-slate-500">Configure manufacturing floor, hydraulic press bays, and physical address.</p>
              </div>

              <div className="flex items-center gap-2">
                {!activeFactory.isDefault && (
                  <button
                    onClick={() => setDefaultFactory(selectedFactoryIdx)}
                    className="px-3 py-1 bg-emerald-600/10 hover:bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 rounded-lg text-xs font-bold cursor-pointer transition-colors"
                  >
                    Set as Default
                  </button>
                )}
                {profile.factories.length > 1 && (
                  <button
                    onClick={() => removeFactory(selectedFactoryIdx)}
                    className="p-1.5 text-slate-400 hover:text-red-400 cursor-pointer transition-colors"
                    title="Remove factory"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-slate-500 font-semibold mb-1">Factory Name *</label>
                <input
                  type="text"
                  value={activeFactory.name}
                  onChange={(e) => updateFactory(selectedFactoryIdx, 'name', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white font-medium focus:ring-1 focus:ring-red-500"
                  placeholder="e.g. Central Manufacturing Unit"
                />
              </div>

              <div>
                <label className="block text-slate-500 font-semibold mb-1">Factory Code *</label>
                <input
                  type="text"
                  value={activeFactory.code}
                  onChange={(e) => updateFactory(selectedFactoryIdx, 'code', e.target.value.toUpperCase())}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white font-mono uppercase focus:ring-1 focus:ring-red-500"
                  placeholder="FAC-01"
                />
              </div>

              <div>
                <label className="block text-slate-500 font-semibold mb-1">Factory Address Line 1 *</label>
                <input
                  type="text"
                  value={activeFactory.address?.addressLine1 || ''}
                  onChange={(e) => updateFactoryAddress(selectedFactoryIdx, 'addressLine1', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white focus:ring-1 focus:ring-red-500"
                  placeholder="Enter verified factory address line 1"
                />
              </div>

              <div>
                <label className="block text-slate-500 font-semibold mb-1">Address Line 2 (Industrial Zone / Plot)</label>
                <input
                  type="text"
                  value={activeFactory.address?.addressLine2 || ''}
                  onChange={(e) => updateFactoryAddress(selectedFactoryIdx, 'addressLine2', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white focus:ring-1 focus:ring-red-500"
                  placeholder="Plot number, industrial estate or road"
                />
              </div>

              <div>
                <label className="block text-slate-500 font-semibold mb-1">Factory District *</label>
                <select
                  value={activeFactory.address?.district || ''}
                  onChange={(e) => updateFactoryAddress(selectedFactoryIdx, 'district', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white focus:ring-1 focus:ring-red-500"
                >
                  <option value="">-- Select Factory District --</option>
                  {KERALA_DISTRICTS.map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
                <span className="text-[10px] text-slate-400 mt-0.5 block">Select the real district for this plant</span>
              </div>

              <div>
                <label className="block text-slate-500 font-semibold mb-1">Factory PIN Code</label>
                <input
                  type="text"
                  value={activeFactory.address?.pinCode || ''}
                  onChange={(e) => updateFactoryAddress(selectedFactoryIdx, 'pinCode', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white font-mono focus:ring-1 focus:ring-red-500"
                  placeholder="6-digit PIN"
                  maxLength={6}
                />
              </div>

              <div>
                <label className="block text-slate-500 font-semibold mb-1">Manufacturing Location Description</label>
                <input
                  type="text"
                  value={activeFactory.manufacturingLocation || ''}
                  onChange={(e) => updateFactory(selectedFactoryIdx, 'manufacturingLocation', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white focus:ring-1 focus:ring-red-500"
                  placeholder="e.g. Main Hydraulic Press & Compression Line"
                />
              </div>

              <div>
                <label className="block text-slate-500 font-semibold mb-1">Factory Warehouse Bay</label>
                <input
                  type="text"
                  value={activeFactory.warehouseLocation || ''}
                  onChange={(e) => updateFactory(selectedFactoryIdx, 'warehouseLocation', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white focus:ring-1 focus:ring-red-500"
                  placeholder="e.g. Chemical Bay & Finished Door Staging"
                />
              </div>

              <div>
                <label className="block text-slate-500 font-semibold mb-1">Factory Phone</label>
                <input
                  type="text"
                  value={activeFactory.phone || ''}
                  onChange={(e) => updateFactory(selectedFactoryIdx, 'phone', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white focus:ring-1 focus:ring-red-500"
                  placeholder="Factory direct contact number"
                />
              </div>

              <div>
                <label className="block text-slate-500 font-semibold mb-1">Factory Email</label>
                <input
                  type="email"
                  value={activeFactory.email || ''}
                  onChange={(e) => updateFactory(selectedFactoryIdx, 'email', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white focus:ring-1 focus:ring-red-500"
                  placeholder="plant@exmarkdoors.com"
                />
              </div>

              <div>
                <label className="block text-slate-500 font-semibold mb-1">Hydraulic Press Lines</label>
                <input
                  type="number"
                  value={activeFactory.hydraulicPressLines || 8}
                  onChange={(e) => updateFactory(selectedFactoryIdx, 'hydraulicPressLines', parseInt(e.target.value, 10) || 0)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white focus:ring-1 focus:ring-red-500"
                />
              </div>

              <div>
                <label className="block text-slate-500 font-semibold mb-1">Operational Status</label>
                <select
                  value={activeFactory.status}
                  onChange={(e) => updateFactory(selectedFactoryIdx, 'status', e.target.value)}
                  className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-slate-900 dark:text-white focus:ring-1 focus:ring-red-500"
                >
                  <option value="Operational">Operational (Live)</option>
                  <option value="Maintenance">Maintenance / Calibration</option>
                  <option value="Planned">Planned / Future Expansion</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: Document Header Preview */}
      {activeSubTab === 'preview' && (
        <div className="space-y-6">
          <div className="p-4 rounded-xl bg-slate-100 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs">
            <span className="font-bold text-slate-900 dark:text-white flex items-center gap-1.5 mb-1">
              <Printer className="w-4 h-4 text-red-500" />
              Live Output Document Header Preview
            </span>
            <p className="text-slate-500 dark:text-slate-400">
              This preview shows exactly how invoices, quotations, cutting sheets, job cards, and warranties will print using these profile settings.
            </p>
          </div>

          {/* Sample Tax Invoice Header */}
          <div className="bg-white text-slate-900 p-6 rounded-xl border border-slate-300 shadow-md space-y-4">
            <div className="flex justify-between items-start border-b-2 border-red-600 pb-4">
              <div>
                <h1 className="text-xl font-black text-red-700 tracking-tight">{profile.brandName || 'EXMARK DOORS'}</h1>
                <p className="text-xs font-bold text-slate-800">{profile.registeredCompanyName}</p>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  Reg. Office: {[profile.registeredOffice?.addressLine1, profile.registeredOffice?.district, profile.registeredOffice?.state, profile.registeredOffice?.pinCode].filter(Boolean).join(', ')}
                </p>
                <p className="text-[11px] text-slate-600">
                  Manufacturing Unit: {activeFactory.name} • {[activeFactory.address?.addressLine1, activeFactory.address?.district, activeFactory.address?.state, activeFactory.address?.pinCode].filter(Boolean).join(', ') || 'Address Pending Configuration'}
                </p>
                <p className="text-[11px] text-slate-600">
                  GSTIN: <span className="font-mono font-bold text-slate-900">{profile.gstin}</span> | HSN: 3925.20.00 (FRP Doors)
                </p>
              </div>

              <div className="text-right">
                <span className="px-2 py-0.5 bg-red-100 text-red-800 font-bold text-xs rounded border border-red-200 uppercase">
                  TAX INVOICE / WORK ORDER
                </span>
                <p className="text-xs font-mono font-bold text-slate-700 mt-2">DOC: INV-2026-0042</p>
                <p className="text-[11px] text-slate-500">Date: {new Date().toLocaleDateString('en-IN')}</p>
                <p className="text-[11px] text-slate-500">Plant Status: {activeFactory.status}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 text-[11px] text-slate-700 pt-2">
              <div>
                <span className="font-bold block text-slate-900">Billed From (Legal Billing Address):</span>
                <p>{profile.billingAddress?.addressLine1 || profile.registeredOffice?.addressLine1}</p>
                <p>{profile.billingAddress?.district || profile.registeredOffice?.district}, Kerala - {profile.billingAddress?.pinCode || profile.registeredOffice?.pinCode}</p>
                <p>Phone: {profile.phone} | Email: {profile.email}</p>
              </div>
              <div className="text-right">
                <span className="font-bold block text-slate-900">Factory Dispatch Origin:</span>
                <p>{activeFactory.name}</p>
                <p>{activeFactory.warehouseLocation || 'Central Warehouse Bay'}</p>
                <p>Contact: {activeFactory.phone || profile.phone}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 5: Change Ledger / Revisions */}
      {activeSubTab === 'history' && (
        <div className="bg-white dark:bg-[#0B132B] p-6 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
          <div className="border-b border-slate-100 dark:border-slate-800 pb-3">
            <h3 className="font-bold text-sm text-slate-900 dark:text-white flex items-center gap-2">
              <History className="w-4 h-4 text-red-500" />
              Company Profile Audit Ledger &amp; Version History
            </h3>
            <p className="text-xs text-slate-500">
              Immutable version history ensuring historical finalized tax invoices, issued warranties and job cards remain unaltered.
            </p>
          </div>

          <div className="space-y-3">
            {revisions.map((rev) => (
              <div
                key={rev.id}
                className="p-4 rounded-lg bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="px-2 py-0.5 rounded font-mono font-bold bg-red-600/10 text-red-500 border border-red-500/20">
                      v{rev.version}
                    </span>
                    <span className="font-semibold text-slate-900 dark:text-white">{rev.changelog}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Published by <strong className="text-slate-300">{rev.publishedBy}</strong> on{' '}
                    {new Date(rev.publishedAt).toLocaleString('en-IN')}
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-slate-400 block font-mono">{rev.id}</span>
                  <span className="text-[10px] text-emerald-400 font-semibold">Snapshot Preserved</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Publish & Confirm Modal */}
      {isPublishModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-[#0B132B] border border-slate-200 dark:border-slate-800 rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-red-500">
              <ShieldCheck className="w-6 h-6" />
              <h3 className="font-bold text-base text-slate-900 dark:text-white">Publish Company Profile Update</h3>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Publishing will update the authoritative legal entity and active manufacturing plant across all new job cards, cutting sheets, tax invoices, and warranty certificates. Historical finalized documents will remain protected in their issued state.
            </p>

            <div className="p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 text-xs space-y-1">
              <div><strong>Registered Entity:</strong> {profile.registeredCompanyName}</div>
              <div><strong>Brand:</strong> {profile.brandName}</div>
              <div><strong>Active Plant:</strong> {activeFactory.name} ({activeFactory.address?.district || 'District Unset'})</div>
              <div><strong>Kerala GSTIN:</strong> {profile.gstin}</div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-400 mb-1">Publication Changelog Note *</label>
              <textarea
                value={publishChangelog}
                onChange={(e) => setPublishChangelog(e.target.value)}
                placeholder="e.g. Updated factory profile and designated Central Manufacturing Unit as default"
                className="w-full px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg text-xs text-slate-900 dark:text-white focus:ring-1 focus:ring-red-500 h-20"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setIsPublishModalOpen(false)}
                className="px-4 py-2 bg-slate-800 text-slate-300 hover:text-white rounded-lg text-xs font-bold cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handlePublish}
                disabled={isPublishing}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white rounded-lg text-xs font-bold cursor-pointer transition-all disabled:opacity-50"
              >
                {isPublishing ? 'Publishing...' : 'Confirm & Publish'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
