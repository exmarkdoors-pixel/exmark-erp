'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, Check, UserPlus, Phone, MapPin, Building2, X } from 'lucide-react';
import { HubCustomer } from '../quotations/QuotationHub';

interface CustomerSearchComboboxProps {
  customers: HubCustomer[];
  selectedCustomerId: string;
  onSelectCustomer: (customerId: string) => void;
  onOpenAddCustomer?: () => void;
  className?: string;
  placeholder?: string;
}

export function CustomerSearchCombobox({
  customers,
  selectedCustomerId,
  onSelectCustomer,
  onOpenAddCustomer,
  className = '',
  placeholder = 'Search customer by name, phone, or location...',
}: CustomerSearchComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedCustomer = useMemo(
    () => customers.find((c) => c.id === selectedCustomerId),
    [customers, selectedCustomerId]
  );

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
        setSearchQuery('');
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      setTimeout(() => {
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
      }, 50);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  const filteredCustomers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter((c) => {
      const matchName = c.name?.toLowerCase().includes(q);
      const matchPhone = c.phone?.toLowerCase().includes(q) || c.phone?.replace(/[^0-9]/g, '').includes(q);
      const matchLocation = c.location?.toLowerCase().includes(q);
      const matchType = c.type?.toLowerCase().includes(q);
      return matchName || matchPhone || matchLocation || matchType;
    });
  }, [customers, searchQuery]);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [searchQuery]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown') {
        setIsOpen(true);
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev + 1 < filteredCustomers.length ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : filteredCustomers.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCustomers[highlightedIndex]) {
        onSelectCustomer(filteredCustomers[highlightedIndex].id);
        setIsOpen(false);
        setSearchQuery('');
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`} onKeyDown={handleKeyDown}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => {
          setIsOpen(!isOpen);
          if (!isOpen) setSearchQuery('');
        }}
        className="w-full flex items-center justify-between gap-2 bg-[#131b2e] hover:bg-[#1a2540] border border-slate-700 hover:border-slate-500 rounded-lg p-2.5 text-left transition cursor-pointer group shadow-xs"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-7 h-7 rounded-md bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center shrink-0">
            <Building2 className="w-3.5 h-3.5 text-indigo-400" />
          </div>
          <div className="min-w-0">
            {selectedCustomer ? (
              <>
                <div className="font-bold text-xs text-white truncate flex items-center gap-1.5">
                  <span>{selectedCustomer.name}</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-normal">
                    {selectedCustomer.type || 'Direct'}
                  </span>
                </div>
                <div className="text-[10px] text-slate-400 truncate flex items-center gap-2">
                  {selectedCustomer.phone && (
                    <span className="flex items-center gap-0.5">
                      <Phone className="w-2.5 h-2.5" /> {selectedCustomer.phone}
                    </span>
                  )}
                  {selectedCustomer.location && (
                    <span className="flex items-center gap-0.5 text-slate-400">
                      <MapPin className="w-2.5 h-2.5" /> {selectedCustomer.location}
                    </span>
                  )}
                </div>
              </>
            ) : (
              <span className="text-xs text-slate-400 font-medium">{placeholder}</span>
            )}
          </div>
        </div>
        <ChevronDown
          className={`w-4 h-4 text-slate-400 group-hover:text-white transition-transform shrink-0 ${
            isOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Dropdown Popover */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1.5 w-full min-w-[340px] max-w-md bg-[#0F172A] border border-slate-700 rounded-xl shadow-2xl z-50 overflow-hidden flex flex-col">
          {/* Search Header */}
          <div className="p-2.5 border-b border-slate-800 bg-[#141E33] flex items-center gap-2">
            <Search className="w-4 h-4 text-indigo-400 shrink-0" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Type customer name, phone, or place..."
              className="w-full bg-transparent text-xs text-white placeholder-slate-400 focus:outline-none font-medium"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="p-1 text-slate-400 hover:text-white rounded cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Add Customer action */}
          {onOpenAddCustomer && (
            <div className="px-3 py-2 bg-indigo-950/40 border-b border-indigo-900/40 flex items-center justify-between">
              <span className="text-[11px] text-indigo-300">Can't find customer?</span>
              <button
                type="button"
                onClick={() => {
                  setIsOpen(false);
                  onOpenAddCustomer();
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded text-xs font-bold transition shadow-xs cursor-pointer"
              >
                <UserPlus className="w-3 h-3" />
                <span>+ Add New Customer</span>
              </button>
            </div>
          )}

          {/* Results List */}
          <div className="max-h-64 overflow-y-auto divide-y divide-slate-800/60">
            {filteredCustomers.length === 0 ? (
              <div className="p-4 text-center text-xs text-slate-400">
                <p>No customers matching &quot;{searchQuery}&quot;</p>
                {onOpenAddCustomer && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsOpen(false);
                      onOpenAddCustomer();
                    }}
                    className="mt-2 text-indigo-400 hover:text-indigo-300 font-bold underline cursor-pointer inline-flex items-center gap-1"
                  >
                    <UserPlus className="w-3.5 h-3.5" /> Add &quot;{searchQuery}&quot; as new customer
                  </button>
                )}
              </div>
            ) : (
              filteredCustomers.map((cust, idx) => {
                const isSelected = cust.id === selectedCustomerId;
                const isHighlighted = idx === highlightedIndex;

                return (
                  <div
                    key={cust.id}
                    onClick={() => {
                      onSelectCustomer(cust.id);
                      setIsOpen(false);
                      setSearchQuery('');
                    }}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={`p-2.5 flex items-center justify-between gap-2 cursor-pointer transition ${
                      isSelected
                        ? 'bg-indigo-950/70 border-l-4 border-indigo-500'
                        : isHighlighted
                        ? 'bg-slate-800/80'
                        : 'hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-white truncate">{cust.name}</span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-400 font-mono">
                          {cust.type || 'Client'}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-3 mt-0.5">
                        {cust.phone && (
                          <span className="flex items-center gap-0.5 font-mono">
                            <Phone className="w-2.5 h-2.5 text-slate-500" /> {cust.phone}
                          </span>
                        )}
                        {cust.location && (
                          <span className="flex items-center gap-0.5 text-slate-300">
                            <MapPin className="w-2.5 h-2.5 text-slate-500" /> {cust.location}
                          </span>
                        )}
                      </div>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-indigo-400 shrink-0" />}
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
}
