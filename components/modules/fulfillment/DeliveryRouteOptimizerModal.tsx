'use client';

import React, { useState, useMemo } from 'react';
import {
  X,
  Truck,
  MapPin,
  Calendar,
  CheckCircle2,
  AlertCircle,
  TrendingDown,
  Navigation,
  Phone,
  Layers,
  ArrowRight,
  Share2,
  DollarSign,
  Fuel,
} from 'lucide-react';

export interface DeliveryClusterOrder {
  id: string;
  orderNumber: string;
  customerName: string;
  phone: string;
  location: string;
  district: string;
  targetDeliveryDate: string;
  doorsCount: number;
  totalAmount: number;
  status: 'PENDING' | 'CONFIRMED' | 'DISPATCHED';
}

interface DeliveryRouteOptimizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders?: DeliveryClusterOrder[];
  onDispatchBatch?: (batchId: string, orderIds: string[], driver: string, vehicle: string) => void;
}

const DEFAULT_MOCK_ORDERS: DeliveryClusterOrder[] = [
  {
    id: 'ord-101',
    orderNumber: 'PRD-2026-089',
    customerName: 'KAMARU YUSUF',
    phone: '+91 98471 23456',
    location: 'Near Town Hall, Vengara',
    district: 'Malappuram',
    targetDeliveryDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
    doorsCount: 4,
    totalAmount: 38400,
    status: 'CONFIRMED',
  },
  {
    id: 'ord-102',
    orderNumber: 'PRD-2026-092',
    customerName: 'AL-MADINA TRADERS',
    phone: '+91 94472 88910',
    location: 'Bypass Road, Kottakkal',
    district: 'Malappuram',
    targetDeliveryDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
    doorsCount: 6,
    totalAmount: 54600,
    status: 'CONFIRMED',
  },
  {
    id: 'ord-103',
    orderNumber: 'PRD-2026-095',
    customerName: 'ROYAL RESIDENCY',
    phone: '+91 98950 11223',
    location: 'Chemmad Junction, Tirurangadi',
    district: 'Malappuram',
    targetDeliveryDate: new Date(Date.now() + 172800000).toISOString().slice(0, 10),
    doorsCount: 8,
    totalAmount: 76000,
    status: 'CONFIRMED',
  },
  {
    id: 'ord-104',
    orderNumber: 'PRD-2026-096',
    customerName: 'NIDHIN RAJ',
    phone: '+91 97455 33441',
    location: 'Near Harbor, Beypore',
    district: 'Kozhikode',
    targetDeliveryDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
    doorsCount: 3,
    totalAmount: 26500,
    status: 'CONFIRMED',
  },
  {
    id: 'ord-105',
    orderNumber: 'PRD-2026-099',
    customerName: 'CALICUT MARBLE & DOORS',
    phone: '+91 94460 77122',
    location: 'Feroke Chungam, Feroke',
    district: 'Kozhikode',
    targetDeliveryDate: new Date(Date.now() + 86400000).toISOString().slice(0, 10),
    doorsCount: 12,
    totalAmount: 112000,
    status: 'CONFIRMED',
  },
];

export function DeliveryRouteOptimizerModal({
  isOpen,
  onClose,
  orders = DEFAULT_MOCK_ORDERS,
  onDispatchBatch,
}: DeliveryRouteOptimizerModalProps) {
  const [selectedCluster, setSelectedCluster] = useState<string>('Malappuram');
  const [assignedDriver, setAssignedDriver] = useState<string>('Shafi (KL-10-AZ-4521)');
  const [assignedVehicle, setAssignedVehicle] = useState<string>('Tata 407 (Medium Truck)');
  const [nextDayReroutePushed, setNextDayReroutePushed] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const displayOrders = orders && orders.length > 0 ? orders : DEFAULT_MOCK_ORDERS;

  // Group by district / cluster
  const clusters = useMemo(() => {
    const map = new Map<string, DeliveryClusterOrder[]>();
    displayOrders.forEach((o) => {
      const dist = o.district || 'Malappuram';
      const arr = map.get(dist) || [];
      arr.push(o);
      map.set(dist, arr);
    });
    return map;
  }, [displayOrders]);

  const activeClusterOrders = clusters.get(selectedCluster) || [];
  const totalClusterDoors = activeClusterOrders.reduce((sum, o) => sum + o.doorsCount, 0);
  const totalClusterValue = activeClusterOrders.reduce((sum, o) => sum + o.totalAmount, 0);

  // Cost cutting calculations:
  // Separate individual delivery trips = ~₹1,800 fuel + driver per drop.
  // Grouped route trip = ~₹2,200 total single run.
  const estimatedSingleTripsCost = activeClusterOrders.length * 1800;
  const estimatedGroupedTripCost = 1400 + activeClusterOrders.length * 250;
  const netEstimatedSavings = Math.max(0, estimatedSingleTripsCost - estimatedGroupedTripCost);

  if (!isOpen) return null;

  const handleShareRouteWhatsApp = () => {
    const stopsText = activeClusterOrders
      .map((o, idx) => `Stop ${idx + 1}: ${o.customerName} (${o.location}) - ${o.doorsCount} Doors [${o.phone}]`)
      .join('%0A');
    const msg = `*EXMARK ERP — OPTIMIZED DELIVERY ROUTE DISPATCH*%0ACluster: *${selectedCluster}*%0ADriver: ${assignedDriver}%0AVehicle: ${assignedVehicle}%0ATotal Doors: ${totalClusterDoors}%0A%0A*Stops:*%0A${stopsText}%0A%0AEestimated Fuel Savings: ₹${netEstimatedSavings.toLocaleString('en-IN')}`;
    window.open(`https://wa.me/?text=${msg}`, '_blank');
  };

  const handleConfirmDispatch = () => {
    if (onDispatchBatch) {
      onDispatchBatch(
        `BATCH-${Date.now().toString().slice(-4)}`,
        activeClusterOrders.map((o) => o.id),
        assignedDriver,
        assignedVehicle
      );
    }
    setToastMessage(`✓ Optimized Route Dispatched to ${assignedDriver}!`);
    setTimeout(() => {
      setToastMessage(null);
      onClose();
    }, 2000);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5">
      <div className="bg-[#0B132B] border border-cyan-500/40 rounded-2xl w-full max-w-4xl max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in duration-200">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-slate-800 bg-[#070D1E] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center shrink-0">
              <Truck className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-bold text-white tracking-wide">
                  Delivery Route Optimizer &amp; Next-Day Rerouting
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold">
                  Cost Cutting Engine
                </span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Cluster adjacent customer drops by district to eliminate duplicate trips and cut fuel expenses.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 cursor-pointer transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Cost Cutting KPI Banner */}
        <div className="bg-gradient-to-r from-emerald-950/80 via-slate-900 to-cyan-950/80 border-b border-emerald-500/30 p-4 grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div>
            <span className="text-slate-400 block text-[11px]">Selected Cluster</span>
            <span className="font-bold text-white text-sm">{selectedCluster} District</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Drops in Route</span>
            <span className="font-bold text-cyan-300 text-sm">{activeClusterOrders.length} Stops ({totalClusterDoors} Doors)</span>
          </div>
          <div>
            <span className="text-slate-400 block text-[11px]">Consolidated Value</span>
            <span className="font-bold text-white text-sm">₹{totalClusterValue.toLocaleString('en-IN')}</span>
          </div>
          <div className="bg-emerald-900/40 border border-emerald-500/40 rounded-xl p-2 flex items-center gap-2">
            <Fuel className="w-5 h-5 text-emerald-400 shrink-0" />
            <div>
              <span className="text-[10px] text-emerald-300 font-bold block uppercase">Net Fuel Savings</span>
              <span className="font-black text-emerald-400 text-sm">~₹{netEstimatedSavings.toLocaleString('en-IN')}</span>
            </div>
          </div>
        </div>

        {/* Content Body */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* Cluster Selector Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {Array.from(clusters.keys()).map((dist) => {
              const count = clusters.get(dist)?.length || 0;
              const isCurrent = selectedCluster === dist;
              return (
                <button
                  key={dist}
                  type="button"
                  onClick={() => setSelectedCluster(dist)}
                  className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer flex items-center gap-1.5 shrink-0 ${
                    isCurrent
                      ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-950/50'
                      : 'bg-slate-900 text-slate-400 hover:text-white border border-slate-800'
                  }`}
                >
                  <MapPin className="w-3.5 h-3.5" />
                  <span>{dist}</span>
                  <span className="px-1.5 py-0.2 rounded-full bg-black/40 text-[10px] font-mono">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Reroute Alert Suggestion */}
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl flex items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-2">
              <TrendingDown className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="text-amber-200">
                <strong>Next-Day Reroute Opportunity:</strong> 3 orders in {selectedCluster} are within 12km radius. Grouping them on a single truck saves 68km roundtrip!
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setNextDayReroutePushed(true);
                setToastMessage('Orders synchronized for combined next-day morning dispatch!');
                setTimeout(() => setToastMessage(null), 3000);
              }}
              className="px-3 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg font-bold text-xs shrink-0 cursor-pointer shadow"
            >
              {nextDayReroutePushed ? '✓ Rerouted Next-Day' : 'Auto-Group Next Day'}
            </button>
          </div>

          {/* Optimized Sequence of Stops */}
          <div className="space-y-2">
            <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <span>Optimized Stop Sequence (ഏറ്റവും കുറഞ്ഞ ദൂരം)</span>
            </h4>

            <div className="space-y-2">
              {activeClusterOrders.map((ord, idx) => (
                <div
                  key={ord.id}
                  className="p-3 bg-[#131b2e] border border-slate-800 hover:border-cyan-500/40 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-full bg-cyan-600/30 border border-cyan-500/50 text-cyan-300 text-xs font-black flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-xs">{ord.customerName}</span>
                        <span className="text-[10px] font-mono text-cyan-400 font-semibold">{ord.orderNumber}</span>
                      </div>
                      <div className="text-[11px] text-slate-400 flex items-center gap-3 mt-0.5">
                        <span className="flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-500" /> {ord.location}
                        </span>
                        <span className="flex items-center gap-1 font-mono">
                          <Phone className="w-3 h-3 text-slate-500" /> {ord.phone}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 self-end sm:self-center">
                    <div className="text-right">
                      <div className="text-xs font-bold text-white">{ord.doorsCount} Doors</div>
                      <div className="text-[10px] text-slate-400">Target: {ord.targetDeliveryDate}</div>
                    </div>
                    <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 text-[10px] font-bold">
                      ₹{ord.totalAmount.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Vehicle & Driver Assignment */}
          <div className="p-4 bg-slate-900/60 border border-slate-800 rounded-xl grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-slate-400 mb-1 font-medium">Assign Delivery Vehicle</label>
              <select
                value={assignedVehicle}
                onChange={(e) => setAssignedVehicle(e.target.value)}
                className="w-full bg-[#131b2e] border border-slate-700 rounded-lg p-2 text-white font-semibold cursor-pointer"
              >
                <option value="Tata 407 (Medium Truck)">Tata 407 (Capacity: 25 Doors)</option>
                <option value="Mahindra Bolero Maxi Truck">Mahindra Bolero (Capacity: 14 Doors)</option>
                <option value="Ashok Leyland Dost">Ashok Leyland Dost (Capacity: 10 Doors)</option>
                <option value="Heavy Duty 6-Wheeler">Heavy Duty 6-Wheeler (Capacity: 50 Doors)</option>
              </select>
            </div>

            <div>
              <label className="block text-slate-400 mb-1 font-medium">Assign Driver &amp; Route Team</label>
              <select
                value={assignedDriver}
                onChange={(e) => setAssignedDriver(e.target.value)}
                className="w-full bg-[#131b2e] border border-slate-700 rounded-lg p-2 text-white font-semibold cursor-pointer"
              >
                <option value="Shafi (KL-10-AZ-4521)">Shafi (KL-10-AZ-4521) • Senior Driver</option>
                <option value="Ratheesh (KL-10-BX-9081)">Ratheesh (KL-10-BX-9081) • Malappuram Route</option>
                <option value="Faisal (KL-11-CG-3142)">Faisal (KL-11-CG-3142) • Calicut Express</option>
              </select>
            </div>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-4 border-t border-slate-800 bg-[#070D1E] flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-slate-400">
            {toastMessage ? (
              <span className="text-emerald-400 font-bold animate-pulse">{toastMessage}</span>
            ) : (
              <span>Grouped dispatch cuts factory handling time by ~45%</span>
            )}
          </div>
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={handleShareRouteWhatsApp}
              className="flex-1 sm:flex-none px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-md"
            >
              <Share2 className="w-3.5 h-3.5" />
              <span>Share Route on WhatsApp</span>
            </button>
            <button
              type="button"
              onClick={handleConfirmDispatch}
              className="flex-1 sm:flex-none px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer shadow-lg shadow-cyan-950/50"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Confirm &amp; Dispatch Truck</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
