'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Target,
  Award,
  TrendingUp,
  MapPin,
  DollarSign,
  Calculator,
  BarChart2,
  Plus,
  RefreshCw,
  Printer,
  AlertCircle,
  Percent,
  ArrowUpRight,
  ShieldCheck,
  Building2,
  Megaphone,
  Briefcase,
  Layers,
  FileCheck,
  Check,
  X,
  CreditCard,
  Globe,
  Sliders,
  Users,
  Coins,
  FileText,
} from 'lucide-react';
import { apiFetch } from '@/lib/api/apiClient';
import { StaffOrderReportModal } from './StaffOrderReportModal';
import {
  StaffSalesTarget,
  CommissionPlan,
  SalesCommissionRecord,
  TerritoryExpansionPlan,
  MarketingCampaign,
  SalespersonPerformanceMetrics,
  ExpansionSimulationResult,
} from '@/types/salesTarget';

export function MarketingSalesExpansionHub() {
  const [activeTab, setActiveTab] = useState<'targets' | 'leaderboard' | 'expansion' | 'campaigns'>('targets');
  const [targetPeriod, setTargetPeriod] = useState<string>(() => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  });

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Data states
  const [targets, setTargets] = useState<StaffSalesTarget[]>([]);
  const [leaderboard, setLeaderboard] = useState<SalespersonPerformanceMetrics[]>([]);
  const [commissions, setCommissions] = useState<SalesCommissionRecord[]>([]);
  const [territories, setTerritories] = useState<TerritoryExpansionPlan[]>([]);
  const [campaigns, setCampaigns] = useState<MarketingCampaign[]>([]);

  // Target Editor Modal & Commission Model
  const [editingTarget, setEditingTarget] = useState<StaffSalesTarget | null>(null);
  const [editRevenue, setEditRevenue] = useState<number>(300000);
  const [editDoors, setEditDoors] = useState<number>(35);
  const [editTerritory, setEditTerritory] = useState<string>('Malappuram');
  const [editCommissionType, setEditCommissionType] = useState<'PERCENTAGE' | 'PER_PIECE'>('PERCENTAGE');
  const [editCommissionRate, setEditCommissionRate] = useState<number>(2.5);
  const [editExpansionDistricts, setEditExpansionDistricts] = useState<string[]>([]);
  const [editQuarterlyDoorTarget, setEditQuarterlyDoorTarget] = useState<number>(100);
  const [editQuarterlyRevenueTarget, setEditQuarterlyRevenueTarget] = useState<number>(1000000);
  const [editExpansionNotes, setEditExpansionNotes] = useState<string>('');

  // Staff Order Report Modal
  const [isStaffReportModalOpen, setIsStaffReportModalOpen] = useState<boolean>(false);
  const [staffReportInitialStaffId, setStaffReportInitialStaffId] = useState<string>('ALL');

  // Interactive Live Calculator
  const [calcStaffId, setCalcStaffId] = useState<string>('');
  const [calcOrderAmount, setCalcOrderAmount] = useState<number>(125000);
  const [calcDoors, setCalcDoors] = useState<number>(12);
  const [calcAdvancePercent, setCalcAdvancePercent] = useState<number>(50);
  const [calcBreakdown, setCalcBreakdown] = useState<any>(null);

  // Commission Payout Settlement
  const [selectedCommissionIds, setSelectedCommissionIds] = useState<string[]>([]);
  const [payoutMode, setPayoutMode] = useState<string>('BANK_TRANSFER');
  const [payoutRef, setPayoutRef] = useState<string>('');
  const [isPayoutModalOpen, setIsPayoutModalOpen] = useState<boolean>(false);
  const [payoutReceipt, setPayoutReceipt] = useState<any>(null);

  // Territory Expansion Simulator
  const [simReps, setSimReps] = useState<number>(3);
  const [simRacks, setSimRacks] = useState<number>(15);
  const [simPenetrationGrowth, setSimPenetrationGrowth] = useState<number>(15);
  const [simAvgPrice, setSimAvgPrice] = useState<number>(8200);
  const [simDoorsPerDealer, setSimDoorsPerDealer] = useState<number>(10);
  const [simRepSalary, setSimRepSalary] = useState<number>(30000);
  const [simRackCost, setSimRackCost] = useState<number>(15000);
  const [simResult, setSimResult] = useState<ExpansionSimulationResult | null>(null);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);

  // New Marketing Campaign Modal
  const [isNewCampaignOpen, setIsNewCampaignOpen] = useState<boolean>(false);
  const [newCampName, setNewCampName] = useState<string>('');
  const [newCampChannel, setNewCampChannel] = useState<MarketingCampaign['channel']>('DEALER_DISPLAY_RACKS');
  const [newCampTerritory, setNewCampTerritory] = useState<string>('All Kerala');
  const [newCampBudget, setNewCampBudget] = useState<number>(50000);
  const [newCampStartDate, setNewCampStartDate] = useState<string>(() => new Date().toISOString().slice(0, 10));
  const [newCampEndDate, setNewCampEndDate] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() + 30);
    return d.toISOString().slice(0, 10);
  });

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // ── Load All Data ─────────────────────────────────────────────────────────
  const loadData = async () => {
    setIsLoading(true);
    try {
      const [tRes, cRes, eRes, mRes] = await Promise.all([
        apiFetch(`/api/sales/targets?period=${targetPeriod}`),
        apiFetch('/api/sales/commissions'),
        apiFetch('/api/sales/expansion'),
        apiFetch('/api/sales/marketing-campaigns'),
      ]);

      if (tRes.ok) {
        const tJson = await tRes.json();
        if (tJson.success) {
          setTargets(tJson.data.targets || []);
          setLeaderboard(tJson.data.leaderboard || []);
        }
      }

      if (cRes.ok) {
        const cJson = await cRes.json();
        if (cJson.success) {
          setCommissions(cJson.data.commissions || []);
        }
      }

      if (eRes.ok) {
        const eJson = await eRes.json();
        if (eJson.success) {
          setTerritories(eJson.data.territories || []);
        }
      }

      if (mRes.ok) {
        const mJson = await mRes.json();
        if (mJson.success) {
          setCampaigns(mJson.data.campaigns || []);
        }
      }
    } catch {
      showToast('Error syncing sales data. Working offline.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [targetPeriod]);

  // ── Live Calculator Effect ────────────────────────────────────────────────
  useEffect(() => {
    const runLiveCalc = async () => {
      try {
        const res = await apiFetch('/api/sales/commissions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'CALCULATE_PREVIEW',
            orderAmount: Number(calcOrderAmount) || 0,
            advancePercent: Number(calcAdvancePercent) || 0,
            doorCount: Number(calcDoors) || 1,
            salespersonId: calcStaffId || undefined,
            targetPeriod,
          }),
        });
        if (res.ok) {
          const json = await res.json();
          if (json.success) {
            setCalcBreakdown(json.data);
          }
        }
      } catch {
        // Fallback calculation
        const base = 2.5;
        const advBonus = calcAdvancePercent >= 50 ? 0.5 : 0;
        const eff = base + advBonus;
        setCalcBreakdown({
          commissionPercent: eff,
          commissionAmount: Math.round(((Number(calcOrderAmount) || 0) * eff) / 100),
          tierLabel: 'Standard 2.5%',
          baseRate: 2.5,
          acceleratorPercent: 0,
          advanceBonusPercent: advBonus,
        });
      }
    };

    const timer = setTimeout(runLiveCalc, 200);
    return () => clearTimeout(timer);
  }, [calcStaffId, calcOrderAmount, calcDoors, calcAdvancePercent, targetPeriod]);

  // ── Run Territory Simulation ──────────────────────────────────────────────
  const handleRunSimulation = async () => {
    setIsSimulating(true);
    try {
      const res = await apiFetch('/api/sales/expansion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SIMULATE',
          simulationParams: {
            newSalesRepresentatives: simReps,
            newDealerRacks: simRacks,
            targetPenetrationGrowthPercent: simPenetrationGrowth,
            averageDoorSellingPrice: simAvgPrice,
            averageDoorsPerDealerMonth: simDoorsPerDealer,
            repMonthlySalaryCost: simRepSalary,
            rackInstallationCost: simRackCost,
          },
        }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setSimResult(json.data);
          showToast('Territory Expansion simulation updated!');
        }
      }
    } catch {
      showToast('Error running simulation');
    } finally {
      setIsSimulating(false);
    }
  };

  // Run initial simulation on tab click or load
  useEffect(() => {
    if (activeTab === 'expansion' && !simResult) {
      handleRunSimulation();
    }
  }, [activeTab]);

  // ── Update Staff Sales Target & Commission Model ─────────────────────────
  const handleSaveTarget = async () => {
    if (!editingTarget) return;
    try {
      const res = await apiFetch('/api/sales/targets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          employeeId: editingTarget.employeeId,
          employeeName: editingTarget.employeeName,
          employeeCode: editingTarget.employeeCode,
          targetPeriod,
          revenueTarget: Number(editRevenue) || 0,
          doorQuantityTarget: Number(editDoors) || 0,
          territoryDistrict: editTerritory,
          commissionType: editCommissionType,
          commissionRate: Number(editCommissionRate) || 0,
          perPieceRate: editCommissionType === 'PER_PIECE' ? Number(editCommissionRate) : undefined,
          expansionDistricts: editExpansionDistricts,
          quarterlyDoorTarget: Number(editQuarterlyDoorTarget) || 0,
          quarterlyRevenueTarget: Number(editQuarterlyRevenueTarget) || 0,
          expansionNotes: editExpansionNotes,
        }),
      });
      if (res.ok) {
        showToast(`Target & Commission updated for ${editingTarget.employeeName}!`);
        setEditingTarget(null);
        loadData();
      }
    } catch {
      showToast('Error updating sales target');
    }
  };

  // ── Settle Payouts ────────────────────────────────────────────────────────
  const handleSettlePayouts = async () => {
    if (selectedCommissionIds.length === 0) {
      showToast('Select at least one commission to settle payout');
      return;
    }
    try {
      const res = await apiFetch('/api/sales/commissions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SETTLE_PAYOUT',
          commissionIds: selectedCommissionIds,
          paymentMode: payoutMode,
          paymentReference: payoutRef || `PAY-${Date.now().toString().slice(-6)}`,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          showToast(`Successfully settled ${selectedCommissionIds.length} commission payouts!`);
          setPayoutReceipt({
            date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
            count: selectedCommissionIds.length,
            mode: payoutMode,
            ref: payoutRef || 'EXM-BANK-TXN',
            commissions: commissions.filter((c) => selectedCommissionIds.includes(c.id)),
          });
          setSelectedCommissionIds([]);
          setIsPayoutModalOpen(false);
          loadData();
        }
      }
    } catch {
      showToast('Error settling payouts');
    }
  };

  // ── Add New Campaign ──────────────────────────────────────────────────────
  const handleCreateCampaign = async () => {
    if (!newCampName.trim()) {
      showToast('Campaign Name is required');
      return;
    }
    try {
      const res = await apiFetch('/api/sales/marketing-campaigns', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newCampName,
          channel: newCampChannel,
          territory: newCampTerritory,
          budget: Number(newCampBudget) || 0,
          startDate: newCampStartDate,
          endDate: newCampEndDate,
        }),
      });
      if (res.ok) {
        showToast('Marketing campaign created successfully!');
        setIsNewCampaignOpen(false);
        setNewCampName('');
        loadData();
      }
    } catch {
      showToast('Error creating campaign');
    }
  };

  // Calculations for Summary
  const totalRevenueTarget = useMemo(() => targets.reduce((acc, t) => acc + (t.revenueTarget || 0), 0), [targets]);
  const totalAchievedRevenue = useMemo(() => targets.reduce((acc, t) => acc + (t.achievedRevenue || 0), 0), [targets]);
  const totalDoorsTarget = useMemo(() => targets.reduce((acc, t) => acc + (t.doorQuantityTarget || 0), 0), [targets]);
  const totalAchievedDoors = useMemo(() => targets.reduce((acc, t) => acc + (t.achievedDoors || 0), 0), [targets]);
  const totalCommissionsAccrued = useMemo(
    () => commissions.reduce((acc, c) => acc + (c.status !== 'VOID' ? c.totalCommissionAmount : 0), 0),
    [commissions]
  );
  const totalCommissionsPaid = useMemo(
    () => commissions.filter((c) => c.status === 'PAID').reduce((acc, c) => acc + c.totalCommissionAmount, 0),
    [commissions]
  );
  const pendingCommissions = totalCommissionsAccrued - totalCommissionsPaid;

  const overallPacing = totalRevenueTarget > 0 ? ((totalAchievedRevenue / totalRevenueTarget) * 100).toFixed(1) : '0';

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 border border-amber-500/50 text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-2 text-xs font-semibold animate-in fade-in slide-in-from-top-4">
          <AlertCircle className="w-4 h-4 text-amber-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* HEADER WITH PERIOD SELECTOR */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-900/90 p-5 rounded-2xl border border-slate-800 shadow-xl">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500/20 to-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Target className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-black text-white flex items-center gap-2">
              <span>Marketing, Sales Targets &amp; Expansion Command</span>
              <span className="text-[10px] font-mono uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded-full font-bold">
                Kerala 14 Districts
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Staff-wise monthly targets, live commission engine, territory expansion matrix &amp; CAC ROI analytics
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
            <span className="text-xs text-slate-400 font-medium">Month:</span>
            <input
              type="month"
              value={targetPeriod}
              onChange={(e) => setTargetPeriod(e.target.value)}
              className="bg-transparent text-xs font-mono font-bold text-slate-100 focus:outline-none cursor-pointer"
            />
          </div>

          <button
            type="button"
            onClick={() => {
              setStaffReportInitialStaffId('ALL');
              setIsStaffReportModalOpen(true);
            }}
            className="bg-indigo-600/90 hover:bg-indigo-500 text-white text-xs font-bold px-3 py-2 rounded-xl border border-indigo-500/50 flex items-center gap-1.5 transition cursor-pointer shadow-sm shadow-indigo-950/40"
            title="Open Staff Order Reports (Daily, Weekly, Monthly PDF & Performance Matrix)"
          >
            <FileText className="w-4 h-4 text-indigo-200" />
            <span className="hidden sm:inline">Order Reports (PDF)</span>
          </button>

          <button
            type="button"
            onClick={loadData}
            disabled={isLoading}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 transition cursor-pointer"
            title="Refresh All Sales Targets & Ledger"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-amber-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Target Pacing */}
        <div className="bg-[#10172a] p-4 rounded-xl border border-slate-800 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Revenue Target</span>
            <span className="p-1.5 bg-amber-500/10 text-amber-400 rounded-lg">
              <Target className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-white font-mono">
              ₹{(totalAchievedRevenue / 100000).toFixed(2)}L
            </span>
            <span className="text-xs font-mono text-slate-400">
              / ₹{(totalRevenueTarget / 100000).toFixed(2)}L
            </span>
          </div>
          <div className="mt-3 w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all duration-500 ${
                Number(overallPacing) >= 100 ? 'bg-emerald-500' : Number(overallPacing) >= 70 ? 'bg-amber-500' : 'bg-rose-500'
              }`}
              style={{ width: `${Math.min(100, Number(overallPacing))}%` }}
            />
          </div>
          <div className="mt-1.5 flex justify-between text-[11px]">
            <span className="text-slate-400">Pacing:</span>
            <span className="font-mono font-bold text-amber-400">{overallPacing}%</span>
          </div>
        </div>

        {/* Doors Sold vs Target */}
        <div className="bg-[#10172a] p-4 rounded-xl border border-slate-800 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Door Units Target</span>
            <span className="p-1.5 bg-emerald-500/10 text-emerald-400 rounded-lg">
              <Layers className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-emerald-400 font-mono">{totalAchievedDoors}</span>
            <span className="text-xs font-mono text-slate-400">/ {totalDoorsTarget} Doors</span>
          </div>
          <div className="mt-3 w-full bg-slate-800 h-2 rounded-full overflow-hidden">
            <div
              className="h-full bg-emerald-500 rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, totalDoorsTarget > 0 ? (totalAchievedDoors / totalDoorsTarget) * 100 : 0)}%` }}
            />
          </div>
          <div className="mt-1.5 flex justify-between text-[11px]">
            <span className="text-slate-400">Unit Fulfillment:</span>
            <span className="font-mono font-bold text-emerald-400">
              {totalDoorsTarget > 0 ? ((totalAchievedDoors / totalDoorsTarget) * 100).toFixed(1) : 0}%
            </span>
          </div>
        </div>

        {/* Total Accrued Commissions */}
        <div className="bg-[#10172a] p-4 rounded-xl border border-slate-800 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Accrued Commissions</span>
            <span className="p-1.5 bg-cyan-500/10 text-cyan-400 rounded-lg">
              <Award className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-cyan-300 font-mono">
              ₹{totalCommissionsAccrued.toLocaleString('en-IN')}
            </span>
          </div>
          <div className="mt-3 flex justify-between text-[11px] text-slate-400 border-t border-slate-800/80 pt-2">
            <span>Paid: ₹{totalCommissionsPaid.toLocaleString('en-IN')}</span>
            <span className="text-amber-400 font-bold">Due: ₹{pendingCommissions.toLocaleString('en-IN')}</span>
          </div>
        </div>

        {/* Territory Footprint */}
        <div className="bg-[#10172a] p-4 rounded-xl border border-slate-800 relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Territory Coverage</span>
            <span className="p-1.5 bg-rose-500/10 text-rose-400 rounded-lg">
              <MapPin className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-black text-rose-400 font-mono">
              {territories.filter((t) => t.status === 'ESTABLISHED' || t.status === 'EXPANDING').length} / 14
            </span>
            <span className="text-xs text-slate-400">Districts Active</span>
          </div>
          <div className="mt-3 flex justify-between text-[11px] text-slate-400 border-t border-slate-800/80 pt-2">
            <span>Established: {territories.filter((t) => t.status === 'ESTABLISHED').length}</span>
            <span className="text-cyan-400">Expanding: {territories.filter((t) => t.status === 'EXPANDING').length}</span>
            <span className="text-slate-500">Untapped: {territories.filter((t) => t.status === 'UNTAPPED').length}</span>
          </div>
        </div>
      </div>

      {/* NAVIGATION TABS */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab('targets')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'targets'
              ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Target className="w-4 h-4" />
          <span>Staff Targets &amp; Commission Calculator</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-900/60 font-mono">
            {targets.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('leaderboard')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'leaderboard'
              ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>Sales Leaderboard &amp; Rankings</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('expansion')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'expansion'
              ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <MapPin className="w-4 h-4" />
          <span>Territory Expansion &amp; Growth Simulator</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-900/60 font-mono">14 Districts</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('campaigns')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'campaigns'
              ? 'bg-amber-500 text-slate-950 shadow-lg shadow-amber-500/20'
              : 'text-slate-400 hover:text-white hover:bg-slate-800'
          }`}
        >
          <Megaphone className="w-4 h-4" />
          <span>Marketing Campaigns &amp; CAC</span>
          <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-slate-900/60 font-mono">
            {campaigns.length}
          </span>
        </button>
      </div>

      {/* ───────────────────────────────────────────────────────────────────────
          TAB 1: STAFF TARGETS & COMMISSION CALCULATOR
         ─────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'targets' && (
        <div className="space-y-6">
          {/* TOP: LIVE COMMISSION CALCULATOR & PAYOUT TOOLBAR */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Interactive Live Commission Simulator */}
            <div className="lg:col-span-7 bg-[#10172a] p-5 rounded-2xl border border-slate-800 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2">
                  <Calculator className="w-5 h-5 text-amber-400" />
                  <h3 className="text-sm font-bold text-white">
                    Live Deal Commission Simulator (ലൈവ് കമ്മീഷൻ കാൽക്കുലേറ്റർ)
                  </h3>
                </div>
                <span className="text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded">
                  Tier Engine 2.0
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Select Salesperson</label>
                  <select
                    value={calcStaffId}
                    onChange={(e) => setCalcStaffId(e.target.value)}
                    className="w-full bg-[#131b2e] border border-slate-700 rounded-lg p-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500 cursor-pointer font-medium"
                  >
                    <option value="">-- General Tier (Direct) --</option>
                    {targets.map((t) => (
                      <option key={t.employeeId} value={t.employeeId}>
                        {t.employeeName} ({t.employeeCode} - {t.territoryDistrict})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Quotation / Order Value (₹)</label>
                  <input
                    type="number"
                    value={calcOrderAmount}
                    onChange={(e) => setCalcOrderAmount(Number(e.target.value) || 0)}
                    className="w-full bg-[#131b2e] border border-slate-700 rounded-lg p-2 text-xs font-mono font-bold text-emerald-400 focus:outline-none focus:border-amber-500"
                    placeholder="150000"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Door Quantity</label>
                  <input
                    type="number"
                    value={calcDoors}
                    onChange={(e) => setCalcDoors(Number(e.target.value) || 1)}
                    className="w-full bg-[#131b2e] border border-slate-700 rounded-lg p-2 text-xs font-mono font-bold text-white focus:outline-none focus:border-amber-500"
                    placeholder="15"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Client Advance %</label>
                  <select
                    value={calcAdvancePercent}
                    onChange={(e) => setCalcAdvancePercent(Number(e.target.value) || 50)}
                    className="w-full bg-[#131b2e] border border-slate-700 rounded-lg p-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500 cursor-pointer font-medium"
                  >
                    <option value="50">50% Standard Advance (+0.5% Bonus)</option>
                    <option value="40">40% Minimum Advance</option>
                    <option value="30">30% Partial Advance</option>
                    <option value="100">100% Full Advance (+0.5% Bonus)</option>
                  </select>
                </div>
              </div>

              {/* Live Result Banner */}
              {calcBreakdown && (
                <div className="bg-gradient-to-r from-amber-950/40 via-slate-900 to-[#10172a] p-4 rounded-xl border border-amber-500/30 flex items-center justify-between gap-4">
                  <div>
                    <span className="text-[10px] text-amber-300 font-bold uppercase tracking-wider block">
                      Projected Staff Commission
                    </span>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-black text-amber-400 font-mono">
                        ₹{calcBreakdown.commissionAmount?.toLocaleString('en-IN')}
                      </span>
                      <span className="text-xs font-bold text-slate-300">
                        ({calcBreakdown.commissionPercent}% Effective)
                      </span>
                    </div>
                    <span className="text-[11px] text-slate-400 block mt-0.5">
                      Base: {calcBreakdown.baseRate}% &bull; Advance Bonus: +{calcBreakdown.advanceBonusPercent || 0}% &bull; Tier: {calcBreakdown.tierLabel}
                    </span>
                  </div>

                  <div className="text-right font-mono text-xs text-slate-400">
                    <div>Order: ₹{Number(calcOrderAmount).toLocaleString('en-IN')}</div>
                    <div className="text-emerald-400 font-bold">Adv: ₹{Math.round((calcOrderAmount * calcAdvancePercent) / 100).toLocaleString('en-IN')}</div>
                  </div>
                </div>
              )}
            </div>

            {/* Payout Settlement & Action Panel */}
            <div className="lg:col-span-5 bg-[#10172a] p-5 rounded-2xl border border-slate-800 space-y-4 shadow-xl flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-emerald-400" />
                    <h3 className="text-sm font-bold text-white">Commission Payout Hub</h3>
                  </div>
                  <span className="text-xs font-mono font-bold text-amber-400">
                    {commissions.filter((c) => c.status === 'ACCRUED').length} Accrued
                  </span>
                </div>

                <div className="mt-3 space-y-2 text-xs">
                  <div className="flex justify-between p-2 rounded-lg bg-slate-900">
                    <span className="text-slate-400">Total Accrued (Unpaid):</span>
                    <span className="font-mono font-bold text-amber-400">₹{pendingCommissions.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between p-2 rounded-lg bg-slate-900">
                    <span className="text-slate-400">Settled to Date:</span>
                    <span className="font-mono font-bold text-emerald-400">₹{totalCommissionsPaid.toLocaleString('en-IN')}</span>
                  </div>
                  <div className="flex justify-between p-2 rounded-lg bg-slate-900">
                    <span className="text-slate-400">Selected for Payout:</span>
                    <span className="font-mono font-bold text-cyan-300">
                      {selectedCommissionIds.length} items (₹
                      {commissions
                        .filter((c) => selectedCommissionIds.includes(c.id))
                        .reduce((acc, c) => acc + c.totalCommissionAmount, 0)
                        .toLocaleString('en-IN')}
                      )
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsPayoutModalOpen(true)}
                  disabled={selectedCommissionIds.length === 0}
                  className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-emerald-900/30 flex items-center justify-center gap-2 transition cursor-pointer"
                >
                  <CreditCard className="w-4 h-4" />
                  <span>Settle Selected Payouts ({selectedCommissionIds.length})</span>
                </button>

                {payoutReceipt && (
                  <button
                    type="button"
                    onClick={() => window.print()}
                    className="w-full py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs border border-slate-700 flex items-center justify-center gap-2 transition cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5 text-cyan-400" />
                    <span>Print Last Payout Voucher</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* STAFF SALES TARGETS TABLE */}
          <div className="bg-[#10172a] p-5 rounded-2xl border border-slate-800 space-y-4 shadow-xl">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <span>Sales Staff Targets &amp; Performance Ledger ({targetPeriod})</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Target setting, door quota pacing, accrued commissions &amp; payout status
                </p>
              </div>

              <span className="text-xs font-mono font-bold px-3 py-1 rounded-lg bg-slate-900 text-slate-300 border border-slate-800">
                Active Reps: {targets.length}
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[950px] text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-900 text-slate-300 border-b border-slate-800 text-[11px] font-bold">
                    <th className="p-3 min-w-[170px]">Salesperson</th>
                    <th className="p-3 min-w-[130px]">Territory</th>
                    <th className="p-3 min-w-[160px] text-right">Revenue Target</th>
                    <th className="p-3 min-w-[130px] text-right">Doors Target</th>
                    <th className="p-3 min-w-[180px]">Pacing &amp; Progress</th>
                    <th className="p-3 min-w-[150px] text-right">Accrued Comm</th>
                    <th className="p-3 min-w-[120px] text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {targets.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-500">
                        No sales targets initialized for {targetPeriod}. Use Quick Adjuster to set targets.
                      </td>
                    </tr>
                  ) : (
                    targets.map((t) => {
                      const pacing = t.revenueTarget > 0 ? (t.achievedRevenue / t.revenueTarget) * 100 : 0;
                      const staffCommissions = commissions.filter(
                        (c) => c.salespersonId === t.employeeId && c.status !== 'VOID'
                      );
                      const staffAccrued = staffCommissions.reduce((acc, c) => acc + c.totalCommissionAmount, 0);

                      return (
                        <tr key={t.employeeId} className="hover:bg-slate-900/60 transition">
                          <td className="p-3">
                            <div className="flex items-center gap-2">
                              <span className="w-7 h-7 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 flex items-center justify-center font-bold text-xs">
                                {t.employeeName.charAt(0)}
                              </span>
                              <div>
                                <span className="font-bold text-white block">{t.employeeName}</span>
                                <span className="text-[10px] text-slate-400 font-mono">{t.employeeCode}</span>
                              </div>
                            </div>
                          </td>

                          <td className="p-3">
                            <span className="text-slate-300 font-medium flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-rose-400" />
                              {t.territoryDistrict}
                            </span>
                            {Array.isArray(t.expansionDistricts) && t.expansionDistricts.length > 1 && (
                              <div className="mt-1 flex items-center gap-1 flex-wrap">
                                <span className="text-[9px] bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 px-1.5 py-0.2 rounded font-mono font-bold">
                                  +{t.expansionDistricts.length - 1} Expansion
                                </span>
                              </div>
                            )}
                          </td>

                          <td className="p-3 text-right font-mono">
                            <div className="font-bold text-emerald-400">
                              ₹{(t.achievedRevenue / 100000).toFixed(2)}L
                            </div>
                            <div className="text-[10px] text-slate-400">
                              Target: ₹{(t.revenueTarget / 100000).toFixed(2)}L
                            </div>
                          </td>

                          <td className="p-3 text-right font-mono">
                            <div className="font-bold text-white">{t.achievedDoors} Doors</div>
                            <div className="text-[10px] text-slate-400">Target: {t.doorQuantityTarget}</div>
                          </td>

                          <td className="p-3">
                            <div className="space-y-1">
                              <div className="flex justify-between text-[10px]">
                                <span className="text-slate-400">{pacing.toFixed(1)}% Achieved</span>
                                <span className="font-mono font-bold text-amber-400 flex items-center gap-1">
                                  <Coins className="w-2.5 h-2.5" />
                                  {t.commissionType === 'PER_PIECE'
                                    ? `₹${t.perPieceRate || t.commissionRate || 150}/door`
                                    : `${t.commissionRate || t.baseCommissionPercent || 2.5}%`}
                                </span>
                              </div>
                              <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                                <div
                                  className={`h-full rounded-full ${
                                    pacing >= 100 ? 'bg-emerald-500' : pacing >= 70 ? 'bg-amber-500' : 'bg-rose-500'
                                  }`}
                                  style={{ width: `${Math.min(100, pacing)}%` }}
                                />
                              </div>
                            </div>
                          </td>

                          <td className="p-3 text-right font-mono">
                            <div className="font-bold text-cyan-300">₹{staffAccrued.toLocaleString('en-IN')}</div>
                            <div className="text-[10px] text-slate-400">{staffCommissions.length} Orders</div>
                          </td>

                          <td className="p-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingTarget(t);
                                  setEditRevenue(t.revenueTarget);
                                  setEditDoors(t.doorQuantityTarget);
                                  setEditTerritory(t.territoryDistrict);
                                  setEditCommissionType(t.commissionType || 'PERCENTAGE');
                                  setEditCommissionRate(
                                    t.commissionRate !== undefined
                                      ? t.commissionRate
                                      : (t.commissionType === 'PER_PIECE' ? (t.perPieceRate || 150) : 2.5)
                                  );
                                  setEditExpansionDistricts(
                                    t.expansionDistricts && t.expansionDistricts.length > 0
                                      ? t.expansionDistricts
                                      : [t.territoryDistrict]
                                  );
                                  setEditQuarterlyDoorTarget(t.quarterlyDoorTarget || (t.doorQuantityTarget * 3));
                                  setEditQuarterlyRevenueTarget(t.quarterlyRevenueTarget || (t.revenueTarget * 3));
                                  setEditExpansionNotes(t.expansionNotes || '');
                                }}
                                className="px-2.5 py-1 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 text-xs font-semibold transition cursor-pointer"
                                title="Edit target, commission rates & expansion districts"
                              >
                                Edit Target
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setStaffReportInitialStaffId(t.employeeId);
                                  setIsStaffReportModalOpen(true);
                                }}
                                className="p-1 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs transition cursor-pointer"
                                title={`View ${t.employeeName}'s Daily/Weekly/Monthly Order Report PDF`}
                              >
                                <FileText className="w-3.5 h-3.5" />
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

          {/* COMMISSION TRANSACTIONS LEDGER (BATCH PAYOUT SELECTION) */}
          <div className="bg-[#10172a] p-5 rounded-2xl border border-slate-800 space-y-4 shadow-xl">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <span>Sales Commission Ledger &amp; Quotation Attribution</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Select accrued commissions to settle bank/UPI payment payouts
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const accruedIds = commissions
                      .filter((c) => c.status === 'ACCRUED')
                      .map((c) => c.id);
                    if (selectedCommissionIds.length === accruedIds.length) {
                      setSelectedCommissionIds([]);
                    } else {
                      setSelectedCommissionIds(accruedIds);
                    }
                  }}
                  className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium border border-slate-700 transition cursor-pointer"
                >
                  {selectedCommissionIds.length > 0 ? 'Deselect All' : 'Select All Accrued'}
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[950px] text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-900 text-slate-300 border-b border-slate-800 text-[11px] font-bold">
                    <th className="p-3 w-10 text-center">Select</th>
                    <th className="p-3 min-w-[130px]">Quote #</th>
                    <th className="p-3 min-w-[180px]">Salesperson</th>
                    <th className="p-3 min-w-[170px]">Customer</th>
                    <th className="p-3 min-w-[130px] text-right">Order Value</th>
                    <th className="p-3 min-w-[140px] text-right">Commission</th>
                    <th className="p-3 min-w-[130px] text-center">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {commissions.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-500">
                        No commissions recorded yet. When quotations are confirmed into orders, commissions accrue here automatically.
                      </td>
                    </tr>
                  ) : (
                    commissions.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-900/60 transition">
                        <td className="p-3 text-center">
                          <input
                            type="checkbox"
                            checked={selectedCommissionIds.includes(c.id)}
                            disabled={c.status === 'PAID'}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelectedCommissionIds([...selectedCommissionIds, c.id]);
                              } else {
                                setSelectedCommissionIds(selectedCommissionIds.filter((id) => id !== c.id));
                              }
                            }}
                            className="cursor-pointer accent-emerald-500 rounded"
                          />
                        </td>
                        <td className="p-3 font-mono font-bold text-rose-400">{c.quoteNumber}</td>
                        <td className="p-3">
                          <span className="font-bold text-white block">{c.salespersonName}</span>
                          <span className="text-[10px] text-slate-400 font-mono">{c.salespersonCode}</span>
                        </td>
                        <td className="p-3 text-slate-300">{c.customerName}</td>
                        <td className="p-3 text-right font-mono font-bold text-emerald-400">
                          ₹{c.orderAmount.toLocaleString('en-IN')}
                        </td>
                        <td className="p-3 text-right font-mono">
                          <div className="font-bold text-amber-400">₹{c.totalCommissionAmount.toLocaleString('en-IN')}</div>
                          <div className="text-[10px] text-slate-400">{c.effectiveCommissionPercent}% Slab</div>
                        </td>
                        <td className="p-3 text-center">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                              c.status === 'PAID'
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                : c.status === 'ACCRUED'
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                                : 'bg-slate-800 text-slate-400 border-slate-700'
                            }`}
                          >
                            {c.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────
          TAB 2: SALES LEADERBOARD & RANKINGS
         ─────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'leaderboard' && (
        <div className="space-y-6">
          {/* TOP 3 PODIUM */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5 pt-4">
            {/* Rank 2 - Silver */}
            <div className="bg-[#10172a] p-5 rounded-2xl border border-slate-800 flex flex-col items-center text-center relative order-2 md:order-1">
              <span className="text-3xl mb-1">🥈</span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                Rank #2 Silver
              </span>
              <h4 className="text-base font-bold text-white mt-2">
                {leaderboard[1]?.employeeName || 'Unassigned'}
              </h4>
              <span className="text-xs text-slate-400 font-mono">{leaderboard[1]?.employeeCode || '-'}</span>
              <div className="mt-3 text-emerald-400 font-black text-xl font-mono">
                ₹{((leaderboard[1]?.achievedRevenue || 0) / 100000).toFixed(2)}L
              </div>
              <span className="text-xs text-slate-400 font-medium mt-1">
                {leaderboard[1]?.achievedDoors || 0} Doors &bull; {leaderboard[1]?.revenuePacingPercent || 0}% Target
              </span>
            </div>

            {/* Rank 1 - Gold Champion */}
            <div className="bg-gradient-to-b from-amber-950/40 via-[#10172a] to-[#10172a] p-6 rounded-2xl border-2 border-amber-500/50 flex flex-col items-center text-center relative order-1 md:order-2 shadow-2xl shadow-amber-950/30">
              <span className="text-4xl mb-1">👑</span>
              <span className="px-3 py-0.5 rounded-full text-xs font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                Rank #1 Gold Champion
              </span>
              <h4 className="text-lg font-black text-white mt-2">
                {leaderboard[0]?.employeeName || 'Top Performer'}
              </h4>
              <span className="text-xs text-amber-300 font-mono font-bold">{leaderboard[0]?.employeeCode || '-'}</span>
              <div className="mt-3 text-amber-400 font-black text-2xl font-mono">
                ₹{((leaderboard[0]?.achievedRevenue || 0) / 100000).toFixed(2)}L
              </div>
              <span className="text-xs text-slate-300 font-semibold mt-1">
                {leaderboard[0]?.achievedDoors || 0} Doors &bull; {leaderboard[0]?.revenuePacingPercent || 0}% Target
              </span>
              <div className="mt-3 px-3 py-1 bg-amber-500/10 rounded-lg text-[11px] text-amber-200">
                Accrued Commission: ₹{(leaderboard[0]?.totalCommissionEarned || 0).toLocaleString('en-IN')}
              </div>
            </div>

            {/* Rank 3 - Bronze */}
            <div className="bg-[#10172a] p-5 rounded-2xl border border-slate-800 flex flex-col items-center text-center relative order-3">
              <span className="text-3xl mb-1">🥉</span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-900/30 text-amber-400 border border-amber-800/40">
                Rank #3 Bronze
              </span>
              <h4 className="text-base font-bold text-white mt-2">
                {leaderboard[2]?.employeeName || 'Unassigned'}
              </h4>
              <span className="text-xs text-slate-400 font-mono">{leaderboard[2]?.employeeCode || '-'}</span>
              <div className="mt-3 text-emerald-400 font-black text-xl font-mono">
                ₹{((leaderboard[2]?.achievedRevenue || 0) / 100000).toFixed(2)}L
              </div>
              <span className="text-xs text-slate-400 font-medium mt-1">
                {leaderboard[2]?.achievedDoors || 0} Doors &bull; {leaderboard[2]?.revenuePacingPercent || 0}% Target
              </span>
            </div>
          </div>

          {/* FULL LEADERBOARD TABLE */}
          <div className="bg-[#10172a] p-5 rounded-2xl border border-slate-800 space-y-4 shadow-xl">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider">
              Comprehensive Kerala Sales Staff Rankings ({targetPeriod})
            </h3>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[900px] text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-900 text-slate-300 border-b border-slate-800 text-[11px] font-bold">
                    <th className="p-3 w-16 text-center">Rank</th>
                    <th className="p-3 min-w-[180px]">Salesperson</th>
                    <th className="p-3 min-w-[140px] text-right">Orders Won</th>
                    <th className="p-3 min-w-[140px] text-right">Doors Sold</th>
                    <th className="p-3 min-w-[160px] text-right">Total Revenue</th>
                    <th className="p-3 min-w-[160px] text-right">Avg Deal Size</th>
                    <th className="p-3 min-w-[150px] text-right">Commission</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/70">
                  {leaderboard.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-slate-500">
                        No confirmed sales records available for this period.
                      </td>
                    </tr>
                  ) : (
                    leaderboard.map((m) => {
                      const avgDeal = m.closedOrdersCount > 0 ? Math.round(m.achievedRevenue / m.closedOrdersCount) : 0;
                      return (
                        <tr key={m.employeeId} className="hover:bg-slate-900/60 transition">
                          <td className="p-3 text-center font-bold">
                            {m.rank === 1 ? '🥇' : m.rank === 2 ? '🥈' : m.rank === 3 ? '🥉' : `#${m.rank}`}
                          </td>
                          <td className="p-3">
                            <span className="font-bold text-white block">{m.employeeName}</span>
                            <span className="text-[10px] text-slate-400 font-mono">{m.employeeCode}</span>
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-white">{m.closedOrdersCount}</td>
                          <td className="p-3 text-right font-mono text-slate-200">{m.achievedDoors}</td>
                          <td className="p-3 text-right font-mono font-bold text-emerald-400">
                            ₹{m.achievedRevenue.toLocaleString('en-IN')}
                          </td>
                          <td className="p-3 text-right font-mono text-slate-300">
                            ₹{avgDeal.toLocaleString('en-IN')}
                          </td>
                          <td className="p-3 text-right font-mono font-bold text-cyan-300">
                            ₹{m.totalCommissionEarned.toLocaleString('en-IN')}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────
          TAB 3: TERRITORY EXPANSION & GROWTH SIMULATOR
         ─────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'expansion' && (
        <div className="space-y-6">
          {/* SIMULATOR INTERACTIVE WORKBENCH */}
          <div className="bg-[#10172a] p-5 rounded-2xl border border-slate-800 space-y-5 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-bold text-white">
                  Kerala Territory Expansion Simulator (ടെറിട്ടറി എക്സ്പാൻഷൻ സിമുലേറ്റർ)
                </h3>
              </div>
              <button
                type="button"
                onClick={handleRunSimulation}
                disabled={isSimulating}
                className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md transition flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSimulating ? 'animate-spin' : ''}`} />
                <span>Simulate Projections</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">New Territory Reps</label>
                <input
                  type="number"
                  value={simReps}
                  onChange={(e) => setSimReps(Number(e.target.value) || 1)}
                  className="w-full bg-[#131b2e] border border-slate-700 rounded-lg p-2 text-xs font-mono font-bold text-white focus:outline-none focus:border-amber-500"
                  placeholder="3"
                />
                <span className="text-[10px] text-slate-400">e.g. Kannur, Palakkad, Thrissur</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">New Dealer Racks Added</label>
                <input
                  type="number"
                  value={simRacks}
                  onChange={(e) => setSimRacks(Number(e.target.value) || 1)}
                  className="w-full bg-[#131b2e] border border-slate-700 rounded-lg p-2 text-xs font-mono font-bold text-amber-400 focus:outline-none focus:border-amber-500"
                  placeholder="15"
                />
                <span className="text-[10px] text-slate-400">Hardware &amp; Glass outlets</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Target Penetration %</label>
                <input
                  type="number"
                  value={simPenetrationGrowth}
                  onChange={(e) => setSimPenetrationGrowth(Number(e.target.value) || 1)}
                  className="w-full bg-[#131b2e] border border-slate-700 rounded-lg p-2 text-xs font-mono font-bold text-white focus:outline-none focus:border-amber-500"
                  placeholder="15"
                />
                <span className="text-[10px] text-slate-400">Annual market growth %</span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Doors / Dealer / Month</label>
                <input
                  type="number"
                  value={simDoorsPerDealer}
                  onChange={(e) => setSimDoorsPerDealer(Number(e.target.value) || 1)}
                  className="w-full bg-[#131b2e] border border-slate-700 rounded-lg p-2 text-xs font-mono font-bold text-cyan-300 focus:outline-none focus:border-amber-500"
                  placeholder="10"
                />
                <span className="text-[10px] text-slate-400">Monthly dealer reorders</span>
              </div>
            </div>

            {/* SIMULATION RESULTS TILES */}
            {simResult && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-3 border-t border-slate-800">
                <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Annualized Revenue Addition</span>
                  <span className="text-xl font-black text-emerald-400 font-mono">
                    ₹{(simResult.annualizedRevenueDelta / 100000).toFixed(2)}L
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-1">From expansion dealers</span>
                </div>

                <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Breakeven Timeline</span>
                  <span className="text-xl font-black text-cyan-400 font-mono">
                    {simResult.paybackPeriodMonths} Months
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-1">Capital investment recovery</span>
                </div>

                <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Annual Profit Delta</span>
                  <span className="text-xl font-black text-amber-400 font-mono">
                    ₹{(simResult.annualizedProfitDelta / 100000).toFixed(2)}L
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-1">Net profit after rep salaries</span>
                </div>

                <div className="bg-slate-900/80 p-3.5 rounded-xl border border-slate-800">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Factory Capacity Impact</span>
                  <span className="text-xl font-black text-rose-400 font-mono">
                    {simResult.factoryCapacityUtilizationPercent}%
                  </span>
                  <span className="text-[10px] text-slate-400 block mt-1">FRP press utilization</span>
                </div>
              </div>
            )}
          </div>

          {/* KERALA 14-DISTRICT TERRITORY MATRIX */}
          <div className="bg-[#10172a] p-5 rounded-2xl border border-slate-800 space-y-4 shadow-xl">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <span>Kerala 14-District Territory Matrix</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
              {territories.map((t) => (
                <div
                  key={t.districtOrRegion}
                  className="bg-slate-900/80 p-4 rounded-xl border border-slate-800 hover:border-slate-700 transition space-y-2.5"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-white text-sm flex items-center gap-1.5">
                      <MapPin className="w-3.5 h-3.5 text-rose-400" />
                      {t.districtOrRegion}
                    </span>
                    <span
                      className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${
                        t.status === 'ESTABLISHED'
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                          : t.status === 'EXPANDING'
                          ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                          : 'bg-slate-800 text-slate-400 border-slate-700'
                      }`}
                    >
                      {t.status}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    <div className="bg-slate-950 p-2 rounded-lg">
                      <span className="text-[10px] text-slate-400 block">Monthly Target</span>
                      <span className="font-bold text-amber-400">₹{(t.monthlyPotentialRevenue / 100000).toFixed(1)}L</span>
                    </div>
                    <div className="bg-slate-950 p-2 rounded-lg">
                      <span className="text-[10px] text-slate-400 block">Active Dealers</span>
                      <span className="font-bold text-emerald-400">{t.activeDealers} Outlets</span>
                    </div>
                  </div>

                  <div className="text-[11px] text-slate-400 space-y-1">
                    <div className="flex justify-between">
                      <span>Assigned Rep:</span>
                      <span className="text-slate-200 font-semibold">{t.assignedRepName || 'Direct Factory'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Market Share:</span>
                      <span className="text-slate-200 font-mono font-semibold">{t.penetrationRatePercent || 5}%</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────
          TAB 4: MARKETING CAMPAIGNS & CAC ANALYTICS
         ─────────────────────────────────────────────────────────────────────── */}
      {activeTab === 'campaigns' && (
        <div className="space-y-6">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <span>Multi-Channel Campaigns &amp; Customer Acquisition Cost (CAC)</span>
              </h3>
              <p className="text-xs text-slate-400">
                Dealer Showroom Display Racks, Architect Connect, Meta Malayalam Ads &amp; Trade Expos
              </p>
            </div>

            <button
              type="button"
              onClick={() => setIsNewCampaignOpen(true)}
              className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-lg shadow-rose-900/30 flex items-center gap-1.5 transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ New Campaign</span>
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {campaigns.map((camp) => {
              const cac = camp.ordersWon > 0 ? Math.round(camp.actualSpend / camp.ordersWon) : 0;
              const roas = camp.actualSpend > 0 ? (camp.revenueWon / camp.actualSpend).toFixed(1) : '0';

              return (
                <div
                  key={camp.id}
                  className="bg-[#10172a] p-5 rounded-2xl border border-slate-800 hover:border-slate-700 transition space-y-3.5 shadow-xl flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="font-bold text-white text-sm">{camp.name}</h4>
                      <span
                        className={`text-[9px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${
                          camp.status === 'ACTIVE'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            : 'bg-slate-800 text-slate-400 border-slate-700'
                        }`}
                      >
                        {camp.status}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span className="bg-slate-900 px-2 py-0.5 rounded font-mono text-[10px] text-amber-300">
                        {camp.channel}
                      </span>
                      <span>&bull;</span>
                      <span className="text-[11px]">{camp.territory}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                    <div className="bg-slate-950 p-2 rounded-lg">
                      <span className="text-[10px] text-slate-400 block">Spend / Budget</span>
                      <span className="font-bold text-amber-400">
                        ₹{(camp.actualSpend / 1000).toFixed(0)}k / ₹{(camp.budget / 1000).toFixed(0)}k
                      </span>
                    </div>

                    <div className="bg-slate-950 p-2 rounded-lg">
                      <span className="text-[10px] text-slate-400 block">Leads / Deals</span>
                      <span className="font-bold text-emerald-400">
                        {camp.leadsGenerated} / {camp.ordersWon}
                      </span>
                    </div>

                    <div className="bg-slate-950 p-2 rounded-lg">
                      <span className="text-[10px] text-slate-400 block">CAC / Customer</span>
                      <span className="font-bold text-cyan-300">₹{cac.toLocaleString('en-IN')}</span>
                    </div>

                    <div className="bg-slate-950 p-2 rounded-lg">
                      <span className="text-[10px] text-slate-400 block">ROAS Return</span>
                      <span className="font-bold text-rose-400">{roas}x</span>
                    </div>
                  </div>

                  <div className="text-[10px] text-slate-400 flex justify-between pt-1 border-t border-slate-800">
                    <span>Revenue: ₹{(camp.revenueWon / 100000).toFixed(1)}L</span>
                    <span>{camp.startDate} to {camp.endDate}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────
          MODAL: EDIT STAFF SALES TARGET
         ─────────────────────────────────────────────────────────────────────── */}
      {editingTarget && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#10172a] border border-slate-700 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white">
                  Update Monthly Target: {editingTarget.employeeName}
                </h3>
                <span className="text-xs text-slate-400 font-mono">
                  {editingTarget.employeeCode} &bull; {targetPeriod}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setEditingTarget(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Monthly Revenue Target (₹)
                </label>
                <input
                  type="number"
                  value={editRevenue}
                  onChange={(e) => setEditRevenue(Number(e.target.value) || 0)}
                  className="w-full bg-[#131b2e] border border-slate-700 rounded-lg p-2.5 text-xs font-mono font-bold text-emerald-400 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Monthly Doors Quota
                </label>
                <input
                  type="number"
                  value={editDoors}
                  onChange={(e) => setEditDoors(Number(e.target.value) || 0)}
                  className="w-full bg-[#131b2e] border border-slate-700 rounded-lg p-2.5 text-xs font-mono font-bold text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Primary Assigned Territory / District
                </label>
                <select
                  value={editTerritory}
                  onChange={(e) => {
                    const val = e.target.value;
                    setEditTerritory(val);
                    if (!editExpansionDistricts.includes(val)) {
                      setEditExpansionDistricts((prev) => [...prev, val]);
                    }
                  }}
                  className="w-full bg-[#131b2e] border border-slate-700 rounded-lg p-2.5 text-xs text-slate-100 focus:outline-none focus:border-amber-500 cursor-pointer font-medium"
                >
                  {['Malappuram', 'Kozhikode', 'Wayanad', 'Palakkad', 'Thrissur', 'Ernakulam', 'Kannur', 'Kasargod', 'Kottayam', 'Alappuzha', 'Idukki', 'Pathanamthitta', 'Kollam', 'Thiruvananthapuram'].map((dist) => (
                    <option key={dist} value={dist}>{dist}</option>
                  ))}
                </select>
              </div>

              {/* Commission Scheme Setting */}
              <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                    <Coins className="w-3.5 h-3.5 text-amber-400" />
                    <span>Staff Commission Model</span>
                  </label>
                  <div className="inline-flex rounded-lg p-0.5 bg-slate-900 border border-slate-700 text-xs">
                    <button
                      type="button"
                      onClick={() => {
                        setEditCommissionType('PERCENTAGE');
                        if (editCommissionRate > 30) setEditCommissionRate(2.5);
                      }}
                      className={`px-2 py-0.5 rounded font-bold transition-all cursor-pointer ${
                        editCommissionType === 'PERCENTAGE'
                          ? 'bg-amber-500 text-slate-950 shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      % Order
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setEditCommissionType('PER_PIECE');
                        if (editCommissionRate <= 10) setEditCommissionRate(150);
                      }}
                      className={`px-2 py-0.5 rounded font-bold transition-all cursor-pointer ${
                        editCommissionType === 'PER_PIECE'
                          ? 'bg-amber-500 text-slate-950 shadow-sm'
                          : 'text-slate-400 hover:text-slate-200'
                      }`}
                    >
                      ₹/Piece
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-[10px] text-slate-400 block mb-1">
                      {editCommissionType === 'PERCENTAGE' ? 'Commission Rate (% of Total)' : 'Commission Rate (₹ per Door)'}
                    </span>
                    <div className="relative">
                      <input
                        type="number"
                        step={editCommissionType === 'PERCENTAGE' ? '0.1' : '10'}
                        min="0"
                        value={editCommissionRate}
                        onChange={(e) => setEditCommissionRate(Math.max(0, parseFloat(e.target.value) || 0))}
                        className="w-full bg-[#131b2e] border border-slate-700 rounded-lg p-2 pr-7 text-xs font-mono font-bold text-amber-300 focus:outline-none focus:border-amber-500 text-right"
                      />
                      <span className="absolute right-2 top-2 text-xs text-slate-400 font-mono pointer-events-none">
                        {editCommissionType === 'PERCENTAGE' ? '%' : '₹'}
                      </span>
                    </div>
                  </div>
                  <div className="text-[10px] text-slate-400 bg-slate-900/60 p-2 rounded-lg border border-slate-800 flex flex-col justify-center">
                    <span>Example 20 doors @ ₹1.5L:</span>
                    <span className="font-bold text-amber-300 font-mono">
                      ₹{Math.round(
                        editCommissionType === 'PER_PIECE'
                          ? 20 * editCommissionRate
                          : (150000 * editCommissionRate) / 100
                      ).toLocaleString('en-IN')} Commission
                    </span>
                  </div>
                </div>
              </div>

              {/* Territory Expansion Planning */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Territory Expansion Districts (Select all active & target areas)
                </label>
                <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-2 bg-[#131b2e] border border-slate-700 rounded-lg">
                  {['Malappuram', 'Kozhikode', 'Wayanad', 'Palakkad', 'Thrissur', 'Ernakulam', 'Kannur', 'Kasargod', 'Kottayam', 'Alappuzha', 'Idukki', 'Pathanamthitta', 'Kollam', 'Thiruvananthapuram'].map((d) => {
                    const isSelected = editExpansionDistricts.includes(d);
                    return (
                      <button
                        key={d}
                        type="button"
                        onClick={() => {
                          setEditExpansionDistricts((prev) =>
                            isSelected ? prev.filter((item) => item !== d) : [...prev, d]
                          );
                        }}
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold border transition cursor-pointer ${
                          isSelected
                            ? 'bg-indigo-600 text-white border-indigo-500'
                            : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-slate-200'
                        }`}
                      >
                        {isSelected ? '✓ ' : '+ '}
                        {d}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Quarterly Door Target & Notes */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-semibold text-slate-300 mb-1">
                    Quarterly Doors Quota
                  </label>
                  <input
                    type="number"
                    value={editQuarterlyDoorTarget}
                    onChange={(e) => setEditQuarterlyDoorTarget(Number(e.target.value) || 0)}
                    placeholder="100 doors"
                    className="w-full bg-[#131b2e] border border-slate-700 rounded-lg p-2 text-xs font-mono font-bold text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-slate-300 mb-1">
                    Expansion Notes
                  </label>
                  <input
                    type="text"
                    value={editExpansionNotes}
                    onChange={(e) => setEditExpansionNotes(e.target.value)}
                    placeholder="Focus on dealer counters & villas..."
                    className="w-full bg-[#131b2e] border border-slate-700 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setEditingTarget(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveTarget}
                className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs shadow-md cursor-pointer"
              >
                Save Target
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────
          MODAL: SETTLE COMMISSION PAYOUTS
         ─────────────────────────────────────────────────────────────────────── */}
      {isPayoutModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#10172a] border border-slate-700 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white">Settle Commission Payout</h3>
                <span className="text-xs text-slate-400">
                  {selectedCommissionIds.length} deals selected for settlement
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsPayoutModalOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="bg-slate-900 p-3 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block">Total Settlement Amount:</span>
                <span className="text-2xl font-black text-emerald-400 font-mono">
                  ₹
                  {commissions
                    .filter((c) => selectedCommissionIds.includes(c.id))
                    .reduce((acc, c) => acc + c.totalCommissionAmount, 0)
                    .toLocaleString('en-IN')}
                </span>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Payment Mode</label>
                <select
                  value={payoutMode}
                  onChange={(e) => setPayoutMode(e.target.value)}
                  className="w-full bg-[#131b2e] border border-slate-700 rounded-lg p-2.5 text-xs text-slate-100 focus:outline-none focus:border-emerald-500 cursor-pointer font-medium"
                >
                  <option value="BANK_TRANSFER">Bank NEFT / IMPS Transfer</option>
                  <option value="UPI">Company UPI Handle</option>
                  <option value="CHEQUE">Bank Cheque</option>
                  <option value="CASH">Petty Cash Voucher</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Payment Reference / UTR #
                </label>
                <input
                  type="text"
                  value={payoutRef}
                  onChange={(e) => setPayoutRef(e.target.value)}
                  placeholder="e.g. UTR-982138472 or CHQ-109823"
                  className="w-full bg-[#131b2e] border border-slate-700 rounded-lg p-2.5 text-xs font-mono text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsPayoutModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSettlePayouts}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-lg shadow-emerald-900/30 cursor-pointer"
              >
                Confirm Settlement
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ───────────────────────────────────────────────────────────────────────
          MODAL: CREATE NEW MARKETING CAMPAIGN
         ─────────────────────────────────────────────────────────────────────── */}
      {isNewCampaignOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#10172a] border border-slate-700 rounded-2xl p-6 max-w-md w-full space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white">Create New Marketing Campaign</h3>
              <button
                type="button"
                onClick={() => setIsNewCampaignOpen(false)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Campaign Title *</label>
                <input
                  type="text"
                  value={newCampName}
                  onChange={(e) => setNewCampName(e.target.value)}
                  placeholder="e.g. Kozhikode Showroom Display Rack Launch"
                  className="w-full bg-[#131b2e] border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Marketing Channel</label>
                <select
                  value={newCampChannel}
                  onChange={(e) => setNewCampChannel(e.target.value as MarketingCampaign['channel'])}
                  className="w-full bg-[#131b2e] border border-slate-700 rounded-lg p-2.5 text-xs text-slate-100 focus:outline-none focus:border-rose-500 cursor-pointer font-medium"
                >
                  <option value="DEALER_DISPLAY_RACKS">Dealer Showroom Display Racks</option>
                  <option value="ARCHITECT_OUTREACH">Architect &amp; Builder Outreach</option>
                  <option value="DIGITAL_CAMPAIGN">Digital Meta / Google Malayalam Ads</option>
                  <option value="EXPO_BOOTH">Trade Expos &amp; IIA Events</option>
                  <option value="SITE_VISIT">Site Visit Demonstration</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Target District / Area</label>
                <input
                  type="text"
                  value={newCampTerritory}
                  onChange={(e) => setNewCampTerritory(e.target.value)}
                  placeholder="e.g. Kozhikode & Malappuram"
                  className="w-full bg-[#131b2e] border border-slate-700 rounded-lg p-2.5 text-xs text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Allocated Budget (₹)</label>
                <input
                  type="number"
                  value={newCampBudget}
                  onChange={(e) => setNewCampBudget(Number(e.target.value) || 0)}
                  className="w-full bg-[#131b2e] border border-slate-700 rounded-lg p-2.5 text-xs font-mono font-bold text-amber-400 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={newCampStartDate}
                    onChange={(e) => setNewCampStartDate(e.target.value)}
                    className="w-full bg-[#131b2e] border border-slate-700 rounded-lg p-2 text-xs text-slate-100 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">End Date</label>
                  <input
                    type="date"
                    value={newCampEndDate}
                    onChange={(e) => setNewCampEndDate(e.target.value)}
                    className="w-full bg-[#131b2e] border border-slate-700 rounded-lg p-2 text-xs text-slate-100 font-mono"
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setIsNewCampaignOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCreateCampaign}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs shadow-md cursor-pointer"
              >
                Create Campaign
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Staff Order Report (Daily, Weekly, Monthly PDF & Comparative Matrix) */}
      <StaffOrderReportModal
        isOpen={isStaffReportModalOpen}
        onClose={() => setIsStaffReportModalOpen(false)}
        initialStaffId={staffReportInitialStaffId}
      />
    </div>
  );
}
