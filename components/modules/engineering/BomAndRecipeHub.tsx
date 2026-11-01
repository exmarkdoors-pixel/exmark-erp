'use client';

import React, { useState } from 'react';
import {
  FlaskConical,
  Boxes,
  Layers,
  Calculator,
  Search,
  Plus,
  Edit2,
  CheckCircle2,
  AlertCircle,
  FileText,
  DollarSign,
  Filter,
  Sparkles,
  ArrowRight,
  TrendingUp,
  Cpu,
  ShieldCheck,
  PackageCheck
} from 'lucide-react';
import StoreRequisitionHub from './StoreRequisitionHub';

export interface BomComponentItem {
  id: string;
  materialCode: string;
  materialName: string;
  category: 'Resin & Chemicals' | 'Fiberglass & Reinforcement' | 'Core & Filler' | 'Frame Skeleton' | 'Hardware & Seal';
  quantity: number;
  uom: 'kg' | 'sqm' | 'cu.ft' | 'running ft' | 'pcs';
  wastageScrapPct: number;
  unitCost: number; // in INR
  totalStandardCost: number; // calculated: (quantity * (1 + wastagePct/100)) * unitCost
}

export interface DoorRecipe {
  id: string; // e.g. RCP-FRP-001
  modelCode: string; // e.g. EX-TEAK-PREMIUM
  modelTitle: string;
  doorCategory: 'FRP Molded Door' | 'WPC Solid Door' | 'Hybrid Composite' | 'WPC Frame Set';
  nominalSize: string; // e.g. 80" x 34" x 32mm
  pressCycleMinutes: number;
  pressTemperatureC: number;
  pressTonnage: number;
  components: BomComponentItem[];
  directLaborCost: number;
  machineOverheadCost: number;
  suggestedDealerPrice: number;
  isActive: boolean;
  notes: string;
}

const SEED_RECIPES: DoorRecipe[] = [
  {
    id: 'RCP-FRP-001',
    modelCode: 'EX-FRP-TEAK-8034',
    modelTitle: 'EXMARK Royal Teak Molded Door (80" × 34")',
    doorCategory: 'FRP Molded Door',
    nominalSize: '80" × 34" × 32mm (2032 × 864 × 32mm)',
    pressCycleMinutes: 18,
    pressTemperatureC: 135,
    pressTonnage: 180,
    directLaborCost: 450,
    machineOverheadCost: 380,
    suggestedDealerPrice: 8500,
    isActive: true,
    notes: 'Premium natural woodgrain compression molded FRP skin with high-density polyurethane core and kiln-dried polymer stiles.',
    components: [
      {
        id: 'BOM-01',
        materialCode: 'RM-RES-01',
        materialName: 'Isophthalic Unsaturated Polyester Resin (UV Grade)',
        category: 'Resin & Chemicals',
        quantity: 6.8,
        uom: 'kg',
        wastageScrapPct: 3.5,
        unitCost: 185,
        totalStandardCost: 1302,
      },
      {
        id: 'BOM-02',
        materialCode: 'RM-FIB-02',
        materialName: 'Chopped Strand Mat (CSM 450 GSM E-Glass)',
        category: 'Fiberglass & Reinforcement',
        quantity: 4.2,
        uom: 'sqm',
        wastageScrapPct: 5.0,
        unitCost: 140,
        totalStandardCost: 617,
      },
      {
        id: 'BOM-03',
        materialCode: 'RM-ROV-03',
        materialName: 'Woven Roving Fabric (600 GSM Structural Reinforcement)',
        category: 'Fiberglass & Reinforcement',
        quantity: 3.8,
        uom: 'sqm',
        wastageScrapPct: 4.0,
        unitCost: 165,
        totalStandardCost: 652,
      },
      {
        id: 'BOM-04',
        materialCode: 'RM-COR-04',
        materialName: 'High-Density Polyurethane Foam Core (PUF 45 kg/m³)',
        category: 'Core & Filler',
        quantity: 2.1,
        uom: 'cu.ft',
        wastageScrapPct: 2.0,
        unitCost: 480,
        totalStandardCost: 1028,
      },
      {
        id: 'BOM-05',
        materialCode: 'RM-SKL-05',
        materialName: 'Treated Hardwood / Polymer Lock Block Reinforcement',
        category: 'Frame Skeleton',
        quantity: 18.5,
        uom: 'running ft',
        wastageScrapPct: 3.0,
        unitCost: 38,
        totalStandardCost: 724,
      },
      {
        id: 'BOM-06',
        materialCode: 'RM-GEL-06',
        materialName: 'Teak Woodgrain Pigment Gelcoat (UV & Scratch Resistant)',
        category: 'Resin & Chemicals',
        quantity: 1.4,
        uom: 'kg',
        wastageScrapPct: 6.0,
        unitCost: 340,
        totalStandardCost: 505,
      },
    ],
  },
  {
    id: 'RCP-WPC-002',
    modelCode: 'EX-WPC-SOLID-8032',
    modelTitle: 'EXMARK Solid Extruded WPC Waterproof Door (80" × 32")',
    doorCategory: 'WPC Solid Door',
    nominalSize: '80" × 32" × 30mm (2032 × 812 × 30mm)',
    pressCycleMinutes: 12,
    pressTemperatureC: 110,
    pressTonnage: 120,
    directLaborCost: 350,
    machineOverheadCost: 310,
    suggestedDealerPrice: 6800,
    isActive: true,
    notes: '100% waterproof virgin polymer and wood fiber composite board with seamless CNC routed groove architecture.',
    components: [
      {
        id: 'BOM-11',
        materialCode: 'RM-WPC-01',
        materialName: 'Virgin PVC Polymer & Wood Composite Granules',
        category: 'Resin & Chemicals',
        quantity: 28.5,
        uom: 'kg',
        wastageScrapPct: 2.0,
        unitCost: 115,
        totalStandardCost: 3343,
      },
      {
        id: 'BOM-12',
        materialCode: 'RM-LMC-02',
        materialName: 'Hot Melt PUR Adhesive for Vacuum Foil Membrane',
        category: 'Resin & Chemicals',
        quantity: 0.8,
        uom: 'kg',
        wastageScrapPct: 5.0,
        unitCost: 420,
        totalStandardCost: 353,
      },
      {
        id: 'BOM-13',
        materialCode: 'RM-FOL-03',
        materialName: '0.35mm Heavy Embossed Walnut PVC Decorative Foil',
        category: 'Core & Filler',
        quantity: 4.8,
        uom: 'sqm',
        wastageScrapPct: 6.0,
        unitCost: 125,
        totalStandardCost: 636,
      },
      {
        id: 'BOM-14',
        materialCode: 'RM-EDG-04',
        materialName: 'Matching 2mm PVC Edge Bending Tape',
        category: 'Hardware & Seal',
        quantity: 19.0,
        uom: 'running ft',
        wastageScrapPct: 4.0,
        unitCost: 18,
        totalStandardCost: 356,
      },
    ],
  },
  {
    id: 'RCP-FRM-003',
    modelCode: 'EX-FRM-WPC-4X25',
    modelTitle: 'EXMARK WPC Door Frame Set (4" × 2.5" Section)',
    doorCategory: 'WPC Frame Set',
    nominalSize: '7ft × 3ft Opening (4" × 2.5" Section)',
    pressCycleMinutes: 8,
    pressTemperatureC: 95,
    pressTonnage: 80,
    directLaborCost: 220,
    machineOverheadCost: 180,
    suggestedDealerPrice: 3200,
    isActive: true,
    notes: 'High-density solid WPC door frame jamb with pre-molded rebate for gasket seal and heavy stainless hinges.',
    components: [
      {
        id: 'BOM-21',
        materialCode: 'RM-FRM-01',
        materialName: 'Extruded High-Density WPC Frame Profile (4" × 2.5")',
        category: 'Frame Skeleton',
        quantity: 17.5,
        uom: 'running ft',
        wastageScrapPct: 2.5,
        unitCost: 85,
        totalStandardCost: 1525,
      },
      {
        id: 'BOM-22',
        materialCode: 'RM-GST-02',
        materialName: 'EPDM Acoustic & Thermal Cushion Gasket Seal',
        category: 'Hardware & Seal',
        quantity: 17.0,
        uom: 'running ft',
        wastageScrapPct: 3.0,
        unitCost: 12,
        totalStandardCost: 210,
      },
      {
        id: 'BOM-23',
        materialCode: 'RM-BRK-03',
        materialName: 'Heavy SS Angle Corner Fastener Bracket Kit',
        category: 'Hardware & Seal',
        quantity: 4.0,
        uom: 'pcs',
        wastageScrapPct: 0.0,
        unitCost: 35,
        totalStandardCost: 140,
      },
    ],
  },
];

export default function BomAndRecipeHub() {
  const [recipes, setRecipes] = useState<DoorRecipe[]>(SEED_RECIPES);
  const [selectedRecipe, setSelectedRecipe] = useState<DoorRecipe>(SEED_RECIPES[0]);
  const [activeTab, setActiveTab] = useState<'RECIPES' | 'STORE_REQUISITION'>('RECIPES');
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [isNewRecipeModalOpen, setIsNewRecipeModalOpen] = useState(false);

  // New Recipe Form State
  const [newModelTitle, setNewModelTitle] = useState('');
  const [newModelCode, setNewModelCode] = useState('');
  const [newDoorCategory, setNewDoorCategory] = useState<DoorRecipe['doorCategory']>('FRP Molded Door');
  const [newNominalSize, setNewNominalSize] = useState('80" × 34" × 32mm');
  const [newPressTime, setNewPressTime] = useState(15);
  const [newPressTemp, setNewPressTemp] = useState(130);
  const [newPressTonnage, setNewPressTonnage] = useState(160);
  const [newLaborCost, setNewLaborCost] = useState(400);
  const [newOverheadCost, setNewOverheadCost] = useState(350);
  const [newSuggestedPrice, setNewSuggestedPrice] = useState(8200);

  // Filter recipes
  const filteredRecipes = recipes.filter((r) => {
    const matchSearch =
      r.modelTitle.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.modelCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.id.toLowerCase().includes(searchTerm.toLowerCase());
    const matchCat = categoryFilter === 'ALL' || r.doorCategory === categoryFilter;
    return matchSearch && matchCat;
  });

  // Calculate Rollup metrics for selected recipe
  const rawMaterialTotal = selectedRecipe.components.reduce((sum, c) => sum + c.totalStandardCost, 0);
  const totalManufacturingCost = rawMaterialTotal + selectedRecipe.directLaborCost + selectedRecipe.machineOverheadCost;
  const grossProfitAmount = selectedRecipe.suggestedDealerPrice - totalManufacturingCost;
  const grossMarginPct = selectedRecipe.suggestedDealerPrice > 0 ? (grossProfitAmount / selectedRecipe.suggestedDealerPrice) * 100 : 0;

  // Handle Add Recipe
  const handleCreateRecipe = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newModelTitle.trim()) return;

    const newRec: DoorRecipe = {
      id: `RCP-${Date.now().toString().slice(-4)}`,
      modelCode: newModelCode || `EX-${Date.now().toString().slice(-4)}`,
      modelTitle: newModelTitle,
      doorCategory: newDoorCategory,
      nominalSize: newNominalSize,
      pressCycleMinutes: Number(newPressTime),
      pressTemperatureC: Number(newPressTemp),
      pressTonnage: Number(newPressTonnage),
      directLaborCost: Number(newLaborCost),
      machineOverheadCost: Number(newOverheadCost),
      suggestedDealerPrice: Number(newSuggestedPrice),
      isActive: true,
      notes: 'New production recipe formulated for Kerala climate resilience.',
      components: [
        {
          id: `BOM-${Date.now()}-1`,
          materialCode: 'RM-RES-01',
          materialName: 'Isophthalic Resin',
          category: 'Resin & Chemicals',
          quantity: 6.0,
          uom: 'kg',
          wastageScrapPct: 3.0,
          unitCost: 185,
          totalStandardCost: 1143,
        },
        {
          id: `BOM-${Date.now()}-2`,
          materialCode: 'RM-FIB-02',
          materialName: 'Fiberglass CSM 450',
          category: 'Fiberglass & Reinforcement',
          quantity: 4.0,
          uom: 'sqm',
          wastageScrapPct: 5.0,
          unitCost: 140,
          totalStandardCost: 588,
        },
      ],
    };

    setRecipes([newRec, ...recipes]);
    setSelectedRecipe(newRec);
    setIsNewRecipeModalOpen(false);
    setNewModelTitle('');
  };

  return (
    <div className="space-y-6 text-slate-200">
      {/* Top Banner */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-6 rounded-2xl bg-gradient-to-r from-[#0B132B] via-[#0E1B3E] to-[#070D1E] border border-purple-500/30 shadow-xl">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 shadow-inner">
              <FlaskConical className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-black tracking-tight text-white">
                  Bill of Materials & Recipe Engineering
                </h1>
                <span className="px-2.5 py-0.5 text-xs font-bold rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                  SAP PP-BD / Odoo PLM Benchmark
                </span>
              </div>
              <p className="text-sm text-slate-400 mt-0.5">
                ബിൽ ഓഫ് മെറ്റീരിയൽസ് & ഡോർ ഫോർമുലേഷൻ • Multi-layer resin mix, core densities & standard unit costing
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsNewRecipeModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-sm shadow-lg shadow-purple-600/30 transition-all hover:scale-105"
          >
            <Plus className="w-4 h-4" />
            + New Door Recipe
          </button>
        </div>
      </div>

      {/* Sub-View Switcher Bar */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2 flex-wrap">
        <button
          onClick={() => setActiveTab('RECIPES')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'RECIPES'
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-900/40'
              : 'bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Door Recipes &amp; Formulation (ഡോർ ഫോർമുലേഷൻ)</span>
        </button>

        <button
          onClick={() => setActiveTab('STORE_REQUISITION')}
          className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === 'STORE_REQUISITION'
              ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-900/40'
              : 'bg-slate-800/80 text-slate-300 hover:text-white hover:bg-slate-700'
          }`}
        >
          <Boxes className="w-4 h-4" />
          <span>BOM &amp; Store Issue Slips (സ്റ്റോർ ഇഷ്യൂ വൗച്ചർ)</span>
        </button>
      </div>

      {activeTab === 'STORE_REQUISITION' ? (
        <StoreRequisitionHub />
      ) : (
        <>
          {/* KPI Overview Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-4 rounded-xl bg-[#0B132B]/80 border border-slate-800/80 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Active Recipes</span>
            <FlaskConical className="w-4 h-4 text-purple-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-white">{recipes.length} Presets</div>
          <p className="text-xs text-purple-400/90 mt-1">FRP, WPC & Hybrid Formulas</p>
        </div>

        <div className="p-4 rounded-xl bg-[#0B132B]/80 border border-slate-800/80 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Selected Standard Cost</span>
            <Calculator className="w-4 h-4 text-blue-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-white">₹{totalManufacturingCost.toLocaleString()}</div>
          <p className="text-xs text-slate-400 mt-1">RM + Labor + Plant Overhead</p>
        </div>

        <div className="p-4 rounded-xl bg-[#0B132B]/80 border border-slate-800/80 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Gross Profit per Door</span>
            <DollarSign className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-emerald-400">₹{grossProfitAmount.toLocaleString()}</div>
          <p className="text-xs text-emerald-400/80 mt-1">Margin: {grossMarginPct.toFixed(1)}%</p>
        </div>

        <div className="p-4 rounded-xl bg-[#0B132B]/80 border border-slate-800/80 shadow-md">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Hydraulic Hot Press Spec</span>
            <Cpu className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2 text-2xl font-black text-amber-300">
            {selectedRecipe.pressTonnage}T @ {selectedRecipe.pressTemperatureC}°C
          </div>
          <p className="text-xs text-slate-400 mt-1">Cycle: {selectedRecipe.pressCycleMinutes} mins</p>
        </div>
      </div>

      {/* Main Content Split: Left Recipe Selector, Right BOM Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Recipe List (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="p-4 rounded-xl bg-[#0B132B]/90 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-400" />
                Recipe Directory
              </h2>
              <span className="text-xs text-slate-400">{filteredRecipes.length} recipes</span>
            </div>

            {/* Search and Category Filter */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search recipe or model..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 rounded-lg bg-[#070D1E] border border-slate-700 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-500"
                />
              </div>

              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded-lg bg-[#070D1E] border border-slate-700 text-xs text-slate-300 focus:outline-none focus:border-purple-500"
              >
                <option value="ALL">All Door Categories</option>
                <option value="FRP Molded Door">FRP Molded Doors</option>
                <option value="WPC Solid Door">WPC Solid Doors</option>
                <option value="Hybrid Composite">Hybrid Composite</option>
                <option value="WPC Frame Set">WPC Frame Sets</option>
              </select>
            </div>

            {/* Recipe Cards List */}
            <div className="space-y-2 max-h-[520px] overflow-y-auto pr-1">
              {filteredRecipes.map((recipe) => {
                const isSelected = selectedRecipe.id === recipe.id;
                const recTotalCost =
                  recipe.components.reduce((sum, c) => sum + c.totalStandardCost, 0) +
                  recipe.directLaborCost +
                  recipe.machineOverheadCost;
                return (
                  <div
                    key={recipe.id}
                    onClick={() => setSelectedRecipe(recipe)}
                    className={`p-3 rounded-xl border cursor-pointer transition-all ${
                      isSelected
                        ? 'bg-purple-950/40 border-purple-500/60 shadow-lg shadow-purple-900/20'
                        : 'bg-[#070D1E]/60 border-slate-800/80 hover:border-slate-700 hover:bg-[#070D1E]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                          {recipe.modelCode}
                        </span>
                        <h4 className="text-xs font-bold text-white mt-1 line-clamp-1">{recipe.modelTitle}</h4>
                        <p className="text-[11px] text-slate-400 mt-0.5">{recipe.nominalSize}</p>
                      </div>
                      <span className="text-xs font-black text-emerald-400">₹{recipe.suggestedDealerPrice.toLocaleString()}</span>
                    </div>

                    <div className="flex items-center justify-between text-[10px] text-slate-400 mt-2 pt-2 border-t border-slate-800/60">
                      <span>BOM Items: {recipe.components.length}</span>
                      <span>Mfg Cost: ₹{recTotalCost.toLocaleString()}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Right Column: Active Recipe Details & BOM Breakdown (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="p-6 rounded-2xl bg-[#0B132B]/90 border border-slate-800/90 shadow-xl space-y-6">
            {/* Header of Selected Recipe */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-800">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30">
                    {selectedRecipe.modelCode}
                  </span>
                  <span className="text-xs font-medium px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                    {selectedRecipe.doorCategory}
                  </span>
                  <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Active Formula
                  </span>
                </div>
                <h2 className="text-xl font-bold text-white mt-1">{selectedRecipe.modelTitle}</h2>
                <p className="text-xs text-slate-400 mt-1">{selectedRecipe.notes}</p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => alert(`Recipe ${selectedRecipe.modelCode} exported to engineering print sheet.`)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium border border-slate-700 flex items-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5 text-purple-400" />
                  Print BOM Sheet
                </button>
              </div>
            </div>

            {/* Technical Press & Plant Parameters */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-[#070D1E]/80 border border-slate-800/80 text-xs">
              <div>
                <span className="text-[11px] text-slate-400">Nominal Dimensions</span>
                <p className="font-bold text-white mt-0.5">{selectedRecipe.nominalSize}</p>
              </div>
              <div>
                <span className="text-[11px] text-slate-400">Hot Press Temp</span>
                <p className="font-bold text-amber-400 mt-0.5">{selectedRecipe.pressTemperatureC}°C Constant</p>
              </div>
              <div>
                <span className="text-[11px] text-slate-400">Hydraulic Tonnage</span>
                <p className="font-bold text-cyan-400 mt-0.5">{selectedRecipe.pressTonnage} Metric Tons</p>
              </div>
              <div>
                <span className="text-[11px] text-slate-400">Curing Cycle Time</span>
                <p className="font-bold text-purple-400 mt-0.5">{selectedRecipe.pressCycleMinutes} Minutes</p>
              </div>
            </div>

            {/* BOM Ingredients Breakdown Table */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Boxes className="w-4 h-4 text-purple-400" />
                  Bill of Materials Components ({selectedRecipe.components.length} Items)
                </h3>
                <span className="text-xs text-slate-400">Values include shrinkage & cutting wastage</span>
              </div>

              <div className="overflow-x-auto rounded-xl border border-slate-800/80 bg-[#070D1E]/40">
                <table className="w-full text-left text-xs">
                  <thead className="bg-[#0B132B] text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">Item Code</th>
                      <th className="py-2.5 px-3">Raw Material Description</th>
                      <th className="py-2.5 px-3">Category</th>
                      <th className="py-2.5 px-3 text-right">Net Qty</th>
                      <th className="py-2.5 px-3 text-right">Scrap %</th>
                      <th className="py-2.5 px-3 text-right">Unit Rate (₹)</th>
                      <th className="py-2.5 px-3 text-right font-bold text-slate-300">Std Cost (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {selectedRecipe.components.map((comp) => (
                      <tr key={comp.id} className="hover:bg-purple-950/20 transition-colors">
                        <td className="py-2.5 px-3 font-mono text-[11px] text-purple-300">{comp.materialCode}</td>
                        <td className="py-2.5 px-3 font-semibold text-white">{comp.materialName}</td>
                        <td className="py-2.5 px-3">
                          <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 border border-slate-700">
                            {comp.category}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono">
                          {comp.quantity} {comp.uom}
                        </td>
                        <td className="py-2.5 px-3 text-right text-amber-400/90 font-mono">+{comp.wastageScrapPct}%</td>
                        <td className="py-2.5 px-3 text-right text-slate-300 font-mono">₹{comp.unitCost}</td>
                        <td className="py-2.5 px-3 text-right font-black text-white font-mono">
                          ₹{comp.totalStandardCost.toLocaleString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="bg-[#0B132B]/80 border-t border-slate-700 text-xs">
                    <tr>
                      <td colSpan={6} className="py-2.5 px-3 font-bold text-slate-300 text-right">
                        Direct Raw Materials Subtotal:
                      </td>
                      <td className="py-2.5 px-3 text-right font-black text-purple-300 font-mono">
                        ₹{rawMaterialTotal.toLocaleString()}
                      </td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            </div>

            {/* Cost Rollup Engine Cards */}
            <div className="p-4 rounded-xl bg-gradient-to-r from-purple-950/30 via-[#0B132B] to-[#070D1E] border border-purple-500/30 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-purple-300 flex items-center gap-1.5">
                  <Calculator className="w-4 h-4 text-purple-400" />
                  Product Costing & Margin Engine (ഓട്ടോമാറ്റിക് കോസ്റ്റിംഗ്)
                </h4>
                <span className="text-xs text-slate-400">Odoo / SAP Standard Cost Rollup</span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
                <div className="p-2.5 rounded-lg bg-[#070D1E] border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase">1. Raw Materials</span>
                  <div className="font-bold text-white text-sm mt-0.5">₹{rawMaterialTotal.toLocaleString()}</div>
                </div>
                <div className="p-2.5 rounded-lg bg-[#070D1E] border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase">2. Direct Labor</span>
                  <div className="font-bold text-white text-sm mt-0.5">₹{selectedRecipe.directLaborCost}</div>
                </div>
                <div className="p-2.5 rounded-lg bg-[#070D1E] border border-slate-800">
                  <span className="text-[10px] text-slate-400 uppercase">3. Press Overhead</span>
                  <div className="font-bold text-white text-sm mt-0.5">₹{selectedRecipe.machineOverheadCost}</div>
                </div>
                <div className="p-2.5 rounded-lg bg-purple-950/40 border border-purple-500/40">
                  <span className="text-[10px] text-purple-300 uppercase font-bold">Total Mfg Cost</span>
                  <div className="font-black text-purple-300 text-sm mt-0.5">₹{totalManufacturingCost.toLocaleString()}</div>
                </div>
                <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-500/40">
                  <span className="text-[10px] text-emerald-300 uppercase font-bold">Dealer Selling Price</span>
                  <div className="font-black text-emerald-400 text-sm mt-0.5">
                    ₹{selectedRecipe.suggestedDealerPrice.toLocaleString()}
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs pt-2 border-t border-purple-500/20 text-slate-300">
                <span>
                  Estimated Gross Profit: <strong className="text-emerald-400">₹{grossProfitAmount.toLocaleString()}</strong> per door
                </span>
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                  Target Profit Margin: {grossMarginPct.toFixed(1)}%
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
      </>
      )}

      {/* New Recipe Modal */}
      {isNewRecipeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-2xl rounded-2xl bg-[#0B132B] border border-purple-500/40 p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto text-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-purple-500/20 text-purple-300">
                  <FlaskConical className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white">Create New Door Recipe</h3>
                  <p className="text-xs text-slate-400">പുതിയ പ്രൊഡക്ഷൻ ഫോർമുലേഷൻ ഉണ്ടാക്കുക</p>
                </div>
              </div>
              <button
                onClick={() => setIsNewRecipeModalOpen(false)}
                className="text-slate-400 hover:text-white text-sm px-2 py-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateRecipe} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Model Name / Description</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. EXMARK Antique Rosewood WPC"
                    value={newModelTitle}
                    onChange={(e) => setNewModelTitle(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#070D1E] border border-slate-700 text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Recipe / Model Code</label>
                  <input
                    type="text"
                    placeholder="e.g. EX-WPC-ROSE-8034"
                    value={newModelCode}
                    onChange={(e) => setNewModelCode(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#070D1E] border border-slate-700 text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Door Category</label>
                  <select
                    value={newDoorCategory}
                    onChange={(e) => setNewDoorCategory(e.target.value as DoorRecipe['doorCategory'])}
                    className="w-full px-3 py-2 rounded-lg bg-[#070D1E] border border-slate-700 text-white focus:outline-none focus:border-purple-500"
                  >
                    <option value="FRP Molded Door">FRP Molded Door</option>
                    <option value="WPC Solid Door">WPC Solid Door</option>
                    <option value="Hybrid Composite">Hybrid Composite</option>
                    <option value="WPC Frame Set">WPC Frame Set</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Nominal Dimensions</label>
                  <input
                    type="text"
                    value={newNominalSize}
                    onChange={(e) => setNewNominalSize(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#070D1E] border border-slate-700 text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              {/* Plant parameters */}
              <div className="p-3 rounded-xl bg-[#070D1E] border border-slate-800 space-y-2">
                <span className="text-[11px] font-bold text-purple-300">Plant Press Parameters</span>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-0.5">Cycle (mins)</label>
                    <input
                      type="number"
                      value={newPressTime}
                      onChange={(e) => setNewPressTime(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 rounded bg-[#0B132B] border border-slate-700 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-0.5">Platen Temp (°C)</label>
                    <input
                      type="number"
                      value={newPressTemp}
                      onChange={(e) => setNewPressTemp(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 rounded bg-[#0B132B] border border-slate-700 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-0.5">Tonnage (T)</label>
                    <input
                      type="number"
                      value={newPressTonnage}
                      onChange={(e) => setNewPressTonnage(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 rounded bg-[#0B132B] border border-slate-700 text-white"
                    />
                  </div>
                </div>
              </div>

              {/* Financial Rollup */}
              <div className="p-3 rounded-xl bg-[#070D1E] border border-slate-800 space-y-2">
                <span className="text-[11px] font-bold text-emerald-400">Target Standard Cost & Pricing</span>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-400 mb-0.5">Direct Labor (₹)</label>
                    <input
                      type="number"
                      value={newLaborCost}
                      onChange={(e) => setNewLaborCost(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 rounded bg-[#0B132B] border border-slate-700 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-0.5">Overhead (₹)</label>
                    <input
                      type="number"
                      value={newOverheadCost}
                      onChange={(e) => setNewOverheadCost(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 rounded bg-[#0B132B] border border-slate-700 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-400 mb-0.5">Selling Price (₹)</label>
                    <input
                      type="number"
                      value={newSuggestedPrice}
                      onChange={(e) => setNewSuggestedPrice(Number(e.target.value))}
                      className="w-full px-2.5 py-1.5 rounded bg-[#0B132B] border border-slate-700 text-emerald-400 font-bold"
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsNewRecipeModalOpen(false)}
                  className="px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 text-white font-bold shadow-lg shadow-purple-600/30"
                >
                  Save Door Recipe
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
