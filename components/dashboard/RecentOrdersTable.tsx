'use client';

import React, { useState } from 'react';
import {
  ShoppingBag,
  Search,
  Eye,
  X,
  FileCheck,
} from 'lucide-react';
import { OrderItem, OrderStatus } from '@/types/erp';

interface RecentOrdersTableProps {
  orders: OrderItem[];
  onViewAllOrders?: () => void;
}

export default function RecentOrdersTable({
  orders,
  onViewAllOrders,
}: RecentOrdersTableProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [selectedOrder, setSelectedOrder] = useState<OrderItem | null>(null);

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customerName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.district.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.doorSpecifications.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesCategory =
      categoryFilter === 'All' || order.doorCategory === categoryFilter;

    const matchesStatus =
      statusFilter === 'All' || order.status === statusFilter;

    return matchesSearch && matchesCategory && matchesStatus;
  });

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case 'In Production':
        return (
          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/15 text-blue-600 dark:text-blue-400 border border-blue-500/30">
            In Production
          </span>
        );
      case 'CNC Routing':
        return (
          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-purple-500/15 text-purple-600 dark:text-purple-400 border border-purple-500/30">
            CNC Routing
          </span>
        );
      case 'Quality Check':
        return (
          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
            Quality Check
          </span>
        );
      case 'Ready to Dispatch':
        return (
          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30">
            Ready to Dispatch
          </span>
        );
      case 'Dispatched':
        return (
          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 border border-cyan-500/30">
            Dispatched
          </span>
        );
      case 'Delivered':
        return (
          <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold bg-slate-500/15 text-slate-600 dark:text-slate-400 border border-slate-500/30">
            Delivered
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-white dark:bg-[#0B132B] rounded-xl border border-slate-200 dark:border-slate-800 p-5 shadow-sm">
      {/* Title & Controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 mb-5">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-red-600/10 text-red-500">
            <ShoppingBag className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-white flex items-center gap-2">
              Recent Sales & Manufacturing Orders
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold">
                {filteredOrders.length} Orders
              </span>
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Live orders from Kerala authorized dealers, builders and architects
            </p>
          </div>
        </div>

        {onViewAllOrders && (
          <button
            onClick={onViewAllOrders}
            className="text-xs font-semibold text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 flex items-center gap-1 self-start md:self-auto"
          >
            All Sales Orders ({orders.length}) &rarr;
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 mb-4">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search order ID, builder, district, or door specs..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 placeholder-slate-400 rounded-lg border border-slate-200 dark:border-slate-800 focus:outline-none focus:border-red-500"
          />
        </div>

        {/* Category Filter */}
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-3 py-1.5 bg-slate-50 dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 rounded-lg border border-slate-200 dark:border-slate-800 focus:outline-none focus:border-red-500"
        >
          <option value="All">All Door Types</option>
          <option value="FRP Doors">FRP Doors</option>
          <option value="WPC Doors">WPC Doors</option>
          <option value="WPC Door Frames">WPC Frames</option>
          <option value="Solid Hybrid">Solid Hybrid</option>
        </select>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-3 py-1.5 bg-slate-50 dark:bg-slate-900 text-xs text-slate-800 dark:text-slate-200 rounded-lg border border-slate-200 dark:border-slate-800 focus:outline-none focus:border-red-500"
        >
          <option value="All">All Statuses</option>
          <option value="In Production">In Production</option>
          <option value="CNC Routing">CNC Routing</option>
          <option value="Quality Check">Quality Check</option>
          <option value="Ready to Dispatch">Ready to Dispatch</option>
          <option value="Dispatched">Dispatched</option>
          <option value="Delivered">Delivered</option>
        </select>
      </div>

      {/* Table Container */}
      <div className="overflow-x-auto rounded-lg border border-slate-200 dark:border-slate-800">
        <table className="w-full text-left text-xs text-slate-600 dark:text-slate-300">
          <thead className="bg-slate-50 dark:bg-[#070D1E] text-slate-500 dark:text-slate-400 uppercase text-[10px] font-bold tracking-wider border-b border-slate-200 dark:border-slate-800">
            <tr>
              <th className="py-3 px-4">Order Details</th>
              <th className="py-3 px-4">Client & Kerala Location</th>
              <th className="py-3 px-4">Door Category & Specs</th>
              <th className="py-3 px-4 text-center">Qty</th>
              <th className="py-3 px-4">Amount & GST</th>
              <th className="py-3 px-4">Status</th>
              <th className="py-3 px-4">Target Due</th>
              <th className="py-3 px-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60 font-medium">
            {filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-400">
                  No orders match the specified filters.
                </td>
              </tr>
            ) : (
              filteredOrders.map((order) => (
                <tr
                  key={order.id}
                  className="hover:bg-slate-50/80 dark:hover:bg-slate-800/40 transition-colors"
                >
                  <td className="py-3 px-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-900 dark:text-white">
                        {order.orderNumber}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {order.orderDate}
                      </span>
                    </div>
                  </td>

                  <td className="py-3 px-4">
                    <div className="flex flex-col">
                      <span className="font-semibold text-slate-900 dark:text-slate-100 truncate max-w-[180px]">
                        {order.customerName}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {order.location} ({order.district})
                      </span>
                    </div>
                  </td>

                  <td className="py-3 px-4">
                    <div className="flex flex-col max-w-[220px]">
                      <span className="font-semibold text-red-600 dark:text-red-400">
                        {order.doorCategory}
                      </span>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 truncate" title={order.doorSpecifications}>
                        {order.doorSpecifications}
                      </span>
                    </div>
                  </td>

                  <td className="py-3 px-4 text-center font-bold text-slate-900 dark:text-white">
                    {order.units}
                  </td>

                  <td className="py-3 px-4">
                    <div className="flex flex-col">
                      <span className="font-bold text-slate-900 dark:text-white">
                        ₹{order.totalAmount.toLocaleString('en-IN')}
                      </span>
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400">
                        {order.paymentStatus}
                      </span>
                    </div>
                  </td>

                  <td className="py-3 px-4">
                    {getStatusBadge(order.status)}
                  </td>

                  <td className="py-3 px-4 text-slate-500 dark:text-slate-400">
                    {order.deliveryDate}
                  </td>

                  <td className="py-3 px-4 text-right">
                    <button
                      onClick={() => setSelectedOrder(order)}
                      className="px-2.5 py-1 rounded bg-slate-100 dark:bg-slate-800 hover:bg-red-600 hover:text-white text-slate-700 dark:text-slate-300 text-xs font-semibold transition-colors inline-flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      View
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Order Details Modal */}
      {selectedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-[#0B132B] rounded-xl border border-slate-700 w-full max-w-lg shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 bg-slate-100 dark:bg-[#070D1E] border-b border-slate-200 dark:border-slate-800">
              <div className="flex items-center gap-2">
                <FileCheck className="w-5 h-5 text-red-500" />
                <h3 className="font-bold text-base text-slate-900 dark:text-white">
                  Order Details: {selectedOrder.orderNumber}
                </h3>
              </div>
              <button
                onClick={() => setSelectedOrder(null)}
                aria-label="Close modal"
                className="p-1 rounded-md text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs text-slate-700 dark:text-slate-300">
              <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 dark:bg-slate-900/60 rounded-lg border border-slate-200 dark:border-slate-800">
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Client / Firm</span>
                  <span className="font-semibold text-slate-900 dark:text-white">{selectedOrder.customerName}</span>
                  <span className="text-slate-400 block">{selectedOrder.location}, {selectedOrder.district}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px] uppercase font-bold">Category & Qty</span>
                  <span className="font-semibold text-red-500">{selectedOrder.doorCategory}</span>
                  <span className="text-slate-900 dark:text-white block font-bold">{selectedOrder.units} Door Units</span>
                </div>
              </div>

              <div>
                <span className="text-slate-400 block text-[10px] uppercase font-bold mb-1">Specifications</span>
                <p className="p-2.5 rounded bg-slate-50 dark:bg-slate-900/40 border border-slate-200 dark:border-slate-800 text-slate-800 dark:text-slate-200 leading-relaxed">
                  {selectedOrder.doorSpecifications}
                </p>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="p-2 rounded bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Total Amount</span>
                  <span className="font-bold text-slate-900 dark:text-white">₹{selectedOrder.totalAmount.toLocaleString('en-IN')}</span>
                </div>
                <div className="p-2 rounded bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block">GST HSN</span>
                  <span className="font-bold text-slate-900 dark:text-white">{selectedOrder.hsnCode}</span>
                </div>
                <div className="p-2 rounded bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                  <span className="text-[10px] text-slate-400 block">Target Dispatch</span>
                  <span className="font-bold text-red-400">{selectedOrder.deliveryDate}</span>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <button
                  onClick={() => setSelectedOrder(null)}
                  className="px-4 py-2 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-800 dark:text-slate-200 font-semibold hover:bg-slate-300 dark:hover:bg-slate-700 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
