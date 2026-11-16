'use client';

import React, { useState, useEffect } from 'react';
import {
  Award,
  ShieldCheck,
  ShieldAlert,
  MapPin,
  Navigation,
  ExternalLink,
  Plus,
  Search,
  Filter,
  Printer,
  Calendar,
  Clock,
  Phone,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
} from 'lucide-react';
import { GeotaggedWarranty } from '@/lib/types/projectRiskProfit';

interface GeotaggedWarrantyHubProps {
  onOpenIssueModal?: () => void;
}

export function GeotaggedWarrantyHub({ onOpenIssueModal }: GeotaggedWarrantyHubProps) {
  const [warranties, setWarranties] = useState<GeotaggedWarranty[]>([]);
  const [loading, setLoading] = useState(true);
  const [districtFilter, setDistrictFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedWarranty, setSelectedWarranty] = useState<GeotaggedWarranty | null>(null);

  const fetchWarranties = () => {
    setLoading(true);
    fetch('/api/warranty')
      .then((r) => r.json())
      .then((data) => {
        if (data.success && Array.isArray(data.data)) {
          setWarranties(data.data);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load warranties:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchWarranties();
  }, []);

  const filtered = warranties.filter((w) => {
    if (districtFilter !== 'ALL' && w.district.toLowerCase() !== districtFilter.toLowerCase()) {
      return false;
    }
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = w.customerName.toLowerCase().includes(q);
      const matchCert = w.certificateNumber.toLowerCase().includes(q);
      const matchSite = w.siteName.toLowerCase().includes(q);
      const matchPhone = w.customerPhone.toLowerCase().includes(q);
      if (!matchName && !matchCert && !matchSite && !matchPhone) return false;
    }
    return true;
  });

  return (
    <div className="space-y-4">
      {/* Top Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-xl border border-slate-800">
        <div>
          <h3 className="text-sm font-extrabold text-white uppercase tracking-wider flex items-center gap-2">
            <Award className="w-5 h-5 text-amber-400" />
            <span>Geotagged Warranty &amp; Site Authentication Registry</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            10/15-Year FRP door guarantees bound to verified GPS site coordinates across Kerala
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={fetchWarranties}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-lg text-xs transition cursor-pointer"
            title="Refresh Registry"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {onOpenIssueModal && (
            <button
              type="button"
              onClick={onOpenIssueModal}
              className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold rounded-lg shadow transition flex items-center gap-1.5 cursor-pointer"
            >
              <Plus className="w-4 h-4 text-slate-950" />
              <span>Issue New Geotagged Warranty</span>
            </button>
          )}
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-900/40 p-3 rounded-xl border border-slate-800 text-xs">
        <div className="flex items-center gap-2 flex-1 min-w-[220px]">
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by customer, certificate #, site, or phone..."
            className="w-full bg-transparent text-slate-200 placeholder-slate-500 focus:outline-none text-xs"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-cyan-400" />
          <span className="text-slate-400">District:</span>
          <select
            value={districtFilter}
            onChange={(e) => setDistrictFilter(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-xs text-white rounded-lg px-2.5 py-1 font-semibold focus:outline-none cursor-pointer"
          >
            <option value="ALL">All Kerala Districts</option>
            <option value="Malappuram">Malappuram</option>
            <option value="Kozhikode">Kozhikode</option>
            <option value="Ernakulam">Ernakulam</option>
            <option value="Thrissur">Thrissur</option>
            <option value="Palakkad">Palakkad</option>
            <option value="Kannur">Kannur</option>
            <option value="Wayanad">Wayanad</option>
            <option value="Idukki">Idukki</option>
            <option value="Kottayam">Kottayam</option>
            <option value="Alappuzha">Alappuzha</option>
            <option value="Kollam">Kollam</option>
            <option value="Thiruvananthapuram">Thiruvananthapuram</option>
            <option value="Kasaragod">Kasaragod</option>
            <option value="Pathanamthitta">Pathanamthitta</option>
          </select>
        </div>
      </div>

      {/* Warranties Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-400 bg-slate-900/30 rounded-xl border border-slate-800 text-xs">
          Loading Geotagged Warranty Registry...
        </div>
      ) : filtered.length === 0 ? (
        <div className="p-12 text-center text-slate-500 bg-slate-900/30 rounded-xl border border-slate-800 text-xs">
          No geotagged warranties found matching the filter criteria.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filtered.map((w) => (
            <div
              key={w.certificateNumber}
              className="bg-[#0e1628] border border-slate-800 hover:border-slate-700 rounded-xl p-4 flex flex-col justify-between space-y-3.5 transition shadow-sm hover:shadow-md"
            >
              {/* Card Top */}
              <div className="flex items-start justify-between gap-2 border-b border-slate-800 pb-2.5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-amber-300 text-xs">
                      {w.certificateNumber}
                    </span>
                    <span className="px-1.5 py-0.2 rounded text-[9px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      {w.warrantyPeriodYears} Yrs
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 mt-0.5">
                    Valid: {w.validFrom} to {w.validUntil}
                  </div>
                </div>

                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-700/60 flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-400" />
                  <span>Active</span>
                </span>
              </div>

              {/* Card Details */}
              <div className="space-y-2 text-xs">
                <div>
                  <div className="font-bold text-white text-sm">{w.customerName}</div>
                  <div className="text-slate-300 text-xs font-medium">{w.siteName}</div>
                  <div className="text-slate-400 text-[11px]">{w.siteAddress}</div>
                </div>

                {/* Geotag Coordinates Badge */}
                <div className="bg-slate-950/80 p-2.5 rounded-lg border border-slate-800/80 flex items-center justify-between text-[11px]">
                  <div className="flex items-center gap-1.5 text-cyan-300 font-mono">
                    <MapPin className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                    <span>{w.coordinates.latitude.toFixed(4)}° N, {w.coordinates.longitude.toFixed(4)}° E</span>
                  </div>
                  <span className="text-slate-400 font-mono text-[10px]">
                    Geofence: {w.geofenceRadiusMeters || 500}m
                  </span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-1">
                  <span>Covered Doors: <strong className="text-white">{w.coveredDoors.length} units</strong></span>
                  <span>District: <strong className="text-slate-200">{w.district}</strong></span>
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-800">
                <a
                  href={`/warranty/${encodeURIComponent(w.certificateNumber)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="px-3 py-1.5 bg-cyan-600/90 hover:bg-cyan-500 text-white text-xs rounded-lg transition font-bold flex items-center gap-1.5 shadow"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>Open Verification Portal</span>
                  <ExternalLink className="w-3 h-3" />
                </a>

                <div className="flex items-center gap-1.5">
                  <a
                    href={`https://maps.google.com/?q=${w.coordinates.latitude},${w.coordinates.longitude}`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-md border border-slate-700 transition"
                    title="View Pin on Google Maps"
                  >
                    <MapPin className="w-3.5 h-3.5 text-cyan-400" />
                  </a>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
