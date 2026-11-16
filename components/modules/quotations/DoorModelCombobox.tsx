'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { Search, ChevronDown, Check, Tag, FileText, Download, Share2, X, ExternalLink } from 'lucide-react';
import { HubDoorModel } from './QuotationHub';
import { FrpDoorCategory } from '@/lib/services/frpPricingEngine';

interface DoorModelComboboxProps {
  selectedModelId: string;
  selectedCategory: FrpDoorCategory | 'CUSTOM';
  doorModels: HubDoorModel[];
  onSelectModel: (modelId: string) => void;
  onSelectCategory: (category: FrpDoorCategory | 'CUSTOM') => void;
  categoryRates?: Record<FrpDoorCategory, number>;
}

const CATEGORIES: (FrpDoorCategory | 'CUSTOM')[] = ['A', 'B', 'C', 'D', 'E', 'CUSTOM'];

export function DoorModelCombobox({
  selectedModelId,
  selectedCategory,
  doorModels,
  onSelectModel,
  onSelectCategory,
  categoryRates,
}: DoorModelComboboxProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showBrochureModal, setShowBrochureModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  const selectedModel = useMemo(
    () => doorModels.find((m) => m.id === selectedModelId) || doorModels[0],
    [doorModels, selectedModelId]
  );

  // Close on outside click
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

  const filteredModels = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return doorModels;

    // Check for explicit category search like "cat a", "category b", "cat:c", "series a"
    const catMatch = q.match(/^(?:cat|category|series)[:\s]*([abcde])$/i);
    const targetCat = catMatch ? catMatch[1].toUpperCase() : null;

    return doorModels.filter((m) => {
      if (targetCat) {
        return m.code?.toUpperCase().includes(`-${targetCat}-`) || m.title?.toUpperCase().includes(`CAT ${targetCat}`);
      }
      const matchCode = m.code?.toLowerCase().includes(q);
      const matchTitle = m.title?.toLowerCase().includes(q);
      const matchMaterial = m.material?.toLowerCase().includes(q);
      const matchFinish = m.finish?.toLowerCase().includes(q);
      return matchCode || matchTitle || matchMaterial || matchFinish;
    });
  }, [doorModels, searchQuery]);

  useEffect(() => {
    setHighlightedIndex(0);
  }, [searchQuery]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen) {
      if (e.key === 'Enter' || e.key === ' ' || e.key === 'ArrowDown' || e.key.length === 1) {
        setIsOpen(true);
        if (e.key.length === 1 && e.key !== ' ') {
          setSearchQuery(e.key);
        }
      }
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev + 1 < filteredModels.length ? prev + 1 : 0));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : filteredModels.length - 1));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredModels[highlightedIndex]) {
        onSelectModel(filteredModels[highlightedIndex].id);
        setIsOpen(false);
        setSearchQuery('');
      }
    } else if (e.key === 'Escape') {
      setIsOpen(false);
    }
  };

  return (
    <div ref={containerRef} className="relative w-full" onKeyDown={handleKeyDown}>
      {/* Trigger Button */}
      <div className="flex flex-col gap-1">
        <button
          type="button"
          onClick={() => {
            setIsOpen(!isOpen);
            if (!isOpen) setSearchQuery('');
          }}
          className="w-full flex items-center justify-between gap-1.5 bg-[#131b2e] hover:bg-[#1a2540] border border-slate-700 hover:border-slate-500 rounded-lg p-1.5 text-left transition cursor-pointer group shadow-xs"
          title="Click to search and choose full door model"
        >
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1 flex-wrap">
              <span className="font-mono font-bold text-[10px] text-rose-400 whitespace-nowrap bg-rose-950/60 border border-rose-800/50 px-1 py-0.2 rounded">
                {selectedModel?.code || 'SELECT MODEL'}
              </span>
              <span className="text-[9px] px-1 py-0.2 rounded bg-amber-950/70 text-amber-300 border border-amber-800/40 font-bold">
                Cat {selectedCategory}
              </span>
            </div>
            <div className="text-xs font-semibold text-slate-100 break-words whitespace-normal leading-tight mt-0.5 line-clamp-2">
              {selectedModel?.title || 'Choose Door Model...'}
            </div>
          </div>
          <div className="flex flex-col items-center gap-0.5 text-slate-400 group-hover:text-cyan-300 shrink-0">
            <Search className="w-3.5 h-3.5 text-cyan-400" />
            <ChevronDown className={`w-3 h-3 transition-transform ${isOpen ? 'rotate-180 text-cyan-400' : ''}`} />
          </div>
        </button>

        {/* Embedded Category Pill Selector & Brochure Button */}
        <div className="flex items-center justify-between gap-1 flex-wrap">
          <div className="flex items-center gap-1">
            <span className="text-[9px] text-amber-400 font-bold uppercase flex items-center gap-0.5">
              <Tag className="w-2.5 h-2.5" />
              Cat:
            </span>
            <div className="flex items-center gap-0.5 flex-wrap">
              {CATEGORIES.map((cat) => {
                const isCatSelected = selectedCategory === cat;
                const rate =
                  cat !== 'CUSTOM' && categoryRates && categoryRates[cat]
                    ? categoryRates[cat]
                    : undefined;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => onSelectCategory(cat)}
                    title={
                      cat === 'CUSTOM'
                        ? 'Custom / Manual Pricing'
                        : `Category ${cat}${rate ? ` (₹${rate.toLocaleString('en-IN')})` : ''}`
                    }
                    className={`px-1 py-0.2 text-[9px] font-bold rounded transition-all cursor-pointer ${
                      isCatSelected
                        ? 'bg-amber-500 text-slate-950 font-black shadow-xs ring-1 ring-amber-400'
                        : 'bg-slate-800/80 hover:bg-slate-700 text-slate-300 border border-slate-700/60'
                    }`}
                  >
                    {cat === 'CUSTOM' ? 'Cust' : cat}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Brochure Fetch / Preview Button */}
          {selectedModel && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setShowBrochureModal(true);
              }}
              className="inline-flex items-center gap-1 text-[9px] font-bold text-rose-300 hover:text-white bg-rose-950/70 hover:bg-rose-900 border border-rose-800/70 rounded px-1.5 py-0.5 transition cursor-pointer shadow-xs"
              title="Fetch / View Door Model PDF Brochure & Specifications"
            >
              <FileText className="w-2.5 h-2.5 text-rose-400" />
              <span>📄 Brochure</span>
            </button>
          )}
        </div>
      </div>

      {/* Popover Dropdown with Instant Search */}
      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-[420px] min-w-[340px] max-w-[95vw] bg-[#0c1222] border border-cyan-500/50 rounded-xl shadow-2xl z-50 overflow-hidden ring-1 ring-cyan-500/30 animate-in fade-in zoom-in-95 duration-100">
          {/* Instant Search Box */}
          <div className="p-2.5 border-b border-slate-800 bg-[#11182c]">
            <div className="relative">
              <Search className="w-4 h-4 text-cyan-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Type model code (e.g. 101, A), title (Teak), finish..."
                className="w-full bg-[#172138] border border-slate-700 rounded-lg pl-9 pr-3 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-cyan-400 font-medium"
              />
            </div>
            <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1 px-1">
              <span>{filteredModels.length} models available</span>
              <span>↑↓ to navigate, Enter to select</span>
            </div>
          </div>

          {/* Model Items List */}
          <div className="max-h-72 overflow-y-auto divide-y divide-slate-800/60 custom-scrollbar">
            {filteredModels.length === 0 ? (
              <div className="p-5 text-center text-xs text-slate-400">
                No door models matching <strong className="text-rose-400">&quot;{searchQuery}&quot;</strong>.
              </div>
            ) : (
              filteredModels.map((m, idx) => {
                const isSelected = m.id === selectedModelId;
                const isHighlighted = idx === highlightedIndex;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      onSelectModel(m.id);
                      setIsOpen(false);
                      setSearchQuery('');
                    }}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={`w-full text-left p-3 flex items-start justify-between gap-2 transition cursor-pointer ${
                      isSelected
                        ? 'bg-cyan-600/20 border-l-4 border-cyan-400'
                        : isHighlighted
                          ? 'bg-slate-800/90'
                          : 'hover:bg-slate-800/60'
                    }`}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono font-bold text-xs text-rose-400 bg-rose-950/50 border border-rose-800/40 px-1.5 py-0.2 rounded">
                          {m.code}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded bg-slate-800 text-slate-300 font-semibold">
                          {m.material}
                        </span>
                        {m.finish && (
                          <span className="text-[10px] text-slate-400 font-medium">
                            • {m.finish}
                          </span>
                        )}
                      </div>
                      <div className="text-xs font-bold text-slate-100 break-words whitespace-normal leading-snug mt-1">
                        {m.title}
                      </div>
                    </div>
                    {isSelected && (
                      <Check className="w-4 h-4 text-cyan-400 shrink-0 mt-1" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Brochure Preview & Download Modal */}
      {showBrochureModal && selectedModel && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="relative w-full max-w-4xl bg-[#0f172a] border border-slate-700 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-[#1e293b]">
              <div className="flex items-center gap-2">
                <div className="w-9 h-9 rounded-lg bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 font-bold">
                  <FileText className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm text-rose-400 bg-rose-950/80 border border-rose-800/60 px-1.5 py-0.5 rounded">
                      {selectedModel.code}
                    </span>
                    <h3 className="text-sm font-bold text-white">
                      {selectedModel.title}
                    </h3>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Technical Specification Sheet • 10-Year Waterproof Factory Guarantee
                  </p>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2">
                <a
                  href={`/api/catalog/brochure/${encodeURIComponent(selectedModel.code)}`}
                  download={`EXMARK_${selectedModel.code}_Brochure.pdf`}
                  className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-lg transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Download PDF</span>
                </a>

                <button
                  type="button"
                  onClick={() => {
                    const origin = typeof window !== 'undefined' ? window.location.origin : 'http://192.168.8.101:4000';
                    const text = `*EXMARK DOORS Technical Brochure*\nModel: ${selectedModel.code} - ${selectedModel.title}\nDownload PDF: ${origin}/api/catalog/brochure/${encodeURIComponent(selectedModel.code)}`;
                    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`, '_blank');
                  }}
                  className="flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-lg transition"
                >
                  <Share2 className="w-3.5 h-3.5" />
                  <span>WhatsApp</span>
                </button>

                <button
                  type="button"
                  onClick={() => setShowBrochureModal(false)}
                  className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* PDF View Frame */}
            <div className="flex-1 bg-slate-950 p-2 overflow-hidden flex flex-col min-h-[500px]">
              <iframe
                src={`/api/catalog/brochure/${encodeURIComponent(selectedModel.code)}`}
                className="w-full h-full rounded border border-slate-800 bg-white"
                title={`EXMARK Brochure - ${selectedModel.code}`}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
