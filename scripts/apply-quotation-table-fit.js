const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '..', 'components', 'modules', 'quotations', 'QuotationHub.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const startMarker = '              {/* Items Table */}\n              <div className="border border-slate-800 rounded-xl overflow-x-auto bg-[#0c1222] shadow-inner">';
const endMarker = '            {/* 3. ADDITIONAL SERVICES & FINANCIAL BREAKDOWN */}';

const startIdx = content.indexOf(startMarker);
const endIdx = content.indexOf(endMarker);

if (startIdx === -1 || endIdx === -1) {
  console.error('Could not locate markers in QuotationHub.tsx', { startIdx, endIdx });
  process.exit(1);
}

const replacement = `              {/* Items Table — Fully Responsive Fit In Screen (No Side Scroll Extension) */}
              <div className="border border-slate-800 rounded-xl overflow-x-auto bg-[#0c1222] shadow-inner">
                <table className="w-full text-left border-collapse table-auto text-xs">
                  <thead>
                    <tr className="bg-[#11182c] border-b border-slate-800 text-[11px] font-bold text-slate-300">
                      <th className="p-2 min-w-[190px]">Door Model &amp; Cat (മോഡൽ)</th>
                      <th className="p-2 min-w-[125px]">
                        <div className="flex items-center justify-between gap-1">
                          <span>Frame (ഫ്രെയിം)</span>
                          <button
                            type="button"
                            onClick={() => setIsFrameManagerOpen(true)}
                            className="text-[10px] font-bold text-indigo-300 hover:text-white bg-indigo-950/70 hover:bg-indigo-700/60 border border-indigo-500/40 px-1.5 py-0.2 rounded transition cursor-pointer shrink-0"
                            title="Add, Edit or Delete Frames"
                          >
                            + Edit
                          </button>
                        </div>
                      </th>
                      <th className="p-2 min-w-[75px]">
                        <div className="flex items-center justify-between gap-1">
                          <span>Door (mm)</span>
                          <button
                            type="button"
                            onClick={() => {
                              setFrpSettingsInitialTab('thicknesses');
                              setIsFrpSettingsOpen(true);
                            }}
                            className="text-[10px] font-bold text-amber-300 hover:text-white bg-amber-950/70 hover:bg-amber-700/60 border border-amber-500/40 px-1 py-0.2 rounded transition cursor-pointer shrink-0"
                            title="Add, Edit or Delete Door Thicknesses"
                          >
                            +
                          </button>
                        </div>
                      </th>
                      <th className="p-2 min-w-[95px]">Colour / Finish</th>
                      <th className="p-2 min-w-[130px]">
                        <div className="flex items-center justify-between gap-1">
                          <span>Lock (പൂട്ട്)</span>
                          <button
                            type="button"
                            onClick={() => {
                              setQuickLockRowIndex(null);
                              setIsQuickLockOpen(true);
                            }}
                            className="text-[10px] font-bold text-cyan-300 hover:text-white bg-cyan-950/70 hover:bg-cyan-700/60 border border-cyan-500/40 px-1.5 py-0.2 rounded transition cursor-pointer shrink-0"
                            title="Add New Lock Model to Rate Card"
                          >
                            + New
                          </button>
                        </div>
                      </th>
                      <th className="p-2 min-w-[55px] text-center">Unit</th>
                      <th className="p-2 min-w-[145px]">Dimensions (H × W)</th>
                      <th className="p-2 min-w-[48px] text-center">Qty</th>
                      <th className="p-2 min-w-[85px] text-right">Price (₹)</th>
                      {showCostColumn && (
                        <th className="p-2 min-w-[95px] text-right bg-amber-950/25 border-x border-amber-900/40 text-amber-300">
                          <div className="flex items-center justify-end gap-1">
                            <Sparkles className="w-3 h-3 text-amber-400" />
                            <span>Cost &amp; Margin</span>
                          </div>
                          <span className="text-[9px] text-amber-400/80 font-normal block">Factory Unit</span>
                        </th>
                      )}
                      <th className="p-2 min-w-[75px] text-right">Line Total</th>
                      <th className="p-2 min-w-[32px] text-center">Act</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/80">
                    {quoteItemRows.map((row, idx) => {
                      const defaultFrame = getDefaultFrameProfile(framesList);
                      const activeFrame =
                        framesList.find((f) => f.id === row.frameTypeId) || defaultFrame;
                      const wTop = row.widthTop ?? row.width ?? 0;
                      const wBottom = row.widthBottom ?? wTop;
                      const wTopFrac = row.widthTopFraction || row.widthFraction || '0';
                      const wBtmFrac = row.widthBottomFraction || wTopFrac;

                      const sqft = calculateSqFt(
                        row.height,
                        wTop,
                        wBottom,
                        row.unit,
                        row.heightFraction,
                        wTopFrac,
                        wBtmFrac
                      );
                      const lineTotal = ((Number(row.qty) || 0) * row.rate).toLocaleString('en-IN');

                      return (
                        <tr key={row.id || idx} className="hover:bg-slate-900/60 transition">
                          {/* 1. Door Model with Search & Embedded Category */}
                          <td className="p-2">
                            <DoorModelCombobox
                              selectedModelId={row.modelId}
                              selectedCategory={row.frpCategory || 'A'}
                              doorModels={doorModels}
                              onSelectModel={(modelId) => handleUpdateRow(idx, { modelId })}
                              onSelectCategory={(cat) => handleUpdateRow(idx, { frpCategory: cat })}
                              categoryRates={frpSettings.categoryPieceRates}
                            />
                          </td>

                          {/* 2. Frame Type Selection with Without Frame (-₹800) support */}
                          <td className="p-2">
                            <select
                              value={activeFrame.id}
                              onChange={(e) => handleUpdateRow(idx, { frameTypeId: e.target.value })}
                              className={\`w-full bg-[#131b2e] border rounded p-1.5 text-xs font-semibold focus:border-indigo-400 cursor-pointer \${
                                activeFrame.id === 'FRM-005'
                                  ? 'border-emerald-500/60 text-emerald-300 font-bold'
                                  : 'border-indigo-500/40 text-indigo-200'
                              }\`}
                            >
                              {framesList.map((f) => (
                                <option key={f.id} value={f.id}>
                                  {formatFrameSectionLabel(f)}
                                  {f.isDefault ? ' [Def]' : ''}
                                  {(f.quotationExtraRate ?? 0) < 0
                                    ? \` (-₹\${Math.abs(f.quotationExtraRate!)})\`
                                    : (f.quotationExtraRate ?? 0) > 0
                                      ? \` (+₹\${f.quotationExtraRate})\`
                                      : ''}
                                </option>
                              ))}
                            </select>
                            <div className="flex items-center justify-between gap-1 mt-1 text-[10px]">
                              <span
                                className={\`font-mono leading-tight \${
                                  (row.framePrice ?? 0) < 0
                                    ? 'text-emerald-400 font-bold'
                                    : (row.framePrice ?? 0) > 0
                                      ? 'text-indigo-300/80 font-semibold'
                                      : 'text-slate-400'
                                }\`}
                              >
                                {(row.framePrice ?? 0) < 0
                                  ? \`-₹\${Math.abs(row.framePrice ?? 0).toLocaleString('en-IN')} Shutter Only\`
                                  : (row.framePrice ?? 0) > 0
                                    ? \`+₹\${(row.framePrice ?? 0).toLocaleString('en-IN')}\`
                                    : activeFrame.wallThicknessMm > 0
                                      ? \`\${activeFrame.wallThicknessMm}×\${activeFrame.sectionWidthMm}mm\`
                                      : 'Shutter Only'}
                              </span>
                              <button
                                type="button"
                                onClick={() => setIsFrameManagerOpen(true)}
                                className="text-[9px] text-slate-400 hover:text-indigo-300 underline cursor-pointer shrink-0 ml-0.5"
                                title="Add, Edit or Delete Frames"
                              >
                                Edit
                              </button>
                            </div>
                          </td>

                          {/* 3. Door Thickness */}
                          <td className="p-2">
                            <select
                              value={
                                row.thicknessId ||
                                getDefaultThicknessOption(frpSettings.doorThicknesses).id
                              }
                              onChange={(e) => handleUpdateRow(idx, { thicknessId: e.target.value })}
                              className="w-full bg-[#131b2e] border border-amber-500/40 rounded p-1.5 text-xs text-amber-200 font-semibold focus:border-amber-400 cursor-pointer"
                            >
                              {(frpSettings.doorThicknesses && frpSettings.doorThicknesses.length > 0
                                ? frpSettings.doorThicknesses
                                : DEFAULT_THICKNESS_OPTIONS
                              ).map((t) => (
                                <option key={t.id} value={t.id}>
                                  {t.name}
                                  {t.extraRate > 0 ? \` (+₹\${t.extraRate})\` : ''}
                                </option>
                              ))}
                            </select>
                            <span className="text-[10px] text-amber-300/80 block mt-0.5 font-mono leading-tight">
                              {(row.thicknessExtraRate ?? 0) > 0
                                ? \`+₹\${(row.thicknessExtraRate ?? 0).toLocaleString('en-IN')}\`
                                : \`\${(frpSettings.doorThicknesses || DEFAULT_THICKNESS_OPTIONS).find((t) => t.id === row.thicknessId)?.thicknessMm ?? 28}mm\`}
                            </span>
                          </td>

                          {/* 4. Colour / Finish */}
                          <td className="p-2">
                            <select
                              value={row.colourId || (frpSettings.colours?.[0]?.id || 'col-teak-matte')}
                              onChange={(e) => handleUpdateRow(idx, { colourId: e.target.value })}
                              className="w-full bg-[#131b2e] border border-emerald-500/30 rounded p-1.5 text-xs text-emerald-300 font-semibold focus:border-emerald-400 cursor-pointer"
                            >
                              {(frpSettings.colours && frpSettings.colours.length > 0 ? frpSettings.colours : DEFAULT_COLOUR_OPTIONS).map((c) => (
                                <option key={c.id} value={c.id}>
                                  {c.name} {c.extraRate && c.extraRate > 0 ? \`(+₹\${c.extraRate})\` : ''}
                                </option>
                              ))}
                            </select>
                            {row.colourExtraRate && row.colourExtraRate > 0 ? (
                              <span className="text-[10px] text-emerald-400 block mt-0.5 font-mono leading-tight">
                                +₹{row.colourExtraRate.toLocaleString('en-IN')}
                              </span>
                            ) : null}
                          </td>

                          {/* 5. Lock Hardware & Discounts */}
                          <td className="p-2">
                            <select
                              value={row.lockId || (frpSettings.locks?.[0]?.id || 'lock-none')}
                              onChange={(e) => handleUpdateRow(idx, { lockId: e.target.value })}
                              className="w-full bg-[#131b2e] border border-cyan-500/40 rounded p-1.5 text-xs text-cyan-200 font-semibold focus:border-cyan-400 cursor-pointer"
                            >
                              {(frpSettings.locks && frpSettings.locks.length > 0 ? frpSettings.locks : DEFAULT_LOCK_OPTIONS).map((l) => (
                                <option key={l.id} value={l.id}>
                                  {l.name} {l.price < 0 ? \`(-₹\${Math.abs(l.price)})\` : l.price > 0 ? \`(+₹\${l.price})\` : '(Incl)'}
                                </option>
                              ))}
                            </select>

                            <div className="flex flex-col gap-1 mt-1">
                              {/* Without Accessories Discount Checkbox */}
                              <label className="flex items-center gap-1 cursor-pointer select-none text-[10px] font-bold text-slate-300 hover:text-emerald-300 leading-tight">
                                <input
                                  type="checkbox"
                                  checked={!!row.withoutAccessories}
                                  onChange={(e) => handleUpdateRow(idx, { withoutAccessories: e.target.checked })}
                                  className="w-3 h-3 rounded accent-emerald-500 cursor-pointer shrink-0"
                                />
                                <span>No Acc (-₹500)</span>
                              </label>

                              <div className="flex items-center justify-between gap-1 text-[10px]">
                                {row.lockPrice !== undefined && row.lockPrice !== 0 && (
                                  <span className={\`font-mono font-semibold leading-tight \${row.lockPrice < 0 ? 'text-emerald-400' : 'text-cyan-400'}\`}>
                                    {row.lockPrice < 0 ? \`-₹\${Math.abs(row.lockPrice)} lock\` : \`+₹\${row.lockPrice}\`}
                                  </span>
                                )}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setQuickLockRowIndex(idx);
                                    setIsQuickLockOpen(true);
                                  }}
                                  className="text-cyan-400 hover:text-cyan-300 font-semibold underline ml-auto cursor-pointer shrink-0 text-[9px]"
                                  title="Add new lock to list"
                                >
                                  + Lock
                                </button>
                              </div>
                            </div>
                          </td>

                          {/* 6. Measurement Unit */}
                          <td className="p-2 text-center">
                            <select
                              value={row.unit}
                              onChange={(e) => handleUpdateRow(idx, { unit: e.target.value as 'cm' | 'mm' | 'inch' })}
                              className="w-full bg-[#131b2e] border border-slate-700 rounded p-1 text-xs text-cyan-300 font-bold focus:border-cyan-500 cursor-pointer text-center"
                            >
                              <option value="cm">cm</option>
                              <option value="mm">mm</option>
                              <option value="inch">in</option>
                            </select>
                          </td>

                          {/* 7. Dimensions */}
                          <td className="p-2">
                            {row.unit === 'inch' ? (
                              <div className="space-y-1 py-0.5 text-xs">
                                {/* Height */}
                                <div className="flex items-center gap-1">
                                  <span className="text-[10px] text-slate-400 font-bold w-3">H:</span>
                                  <input
                                    type="number"
                                    value={row.height === 0 ? '' : row.height}
                                    placeholder="0"
                                    onChange={(e) => handleUpdateRow(idx, { height: parseFloat(e.target.value) || 0 })}
                                    className="w-12 bg-[#131b2e] border border-slate-700 rounded p-1 text-xs text-right font-mono text-white"
                                    title="Height (inches)"
                                  />
                                  <select
                                    value={row.heightFraction || '0'}
                                    onChange={(e) => handleUpdateRow(idx, { heightFraction: e.target.value })}
                                    className="bg-[#131b2e] border border-slate-700 rounded p-0.5 text-[10px] font-mono text-cyan-300 cursor-pointer"
                                    title="Height Fraction"
                                  >
                                    {INCH_FRACTION_OPTIONS.map((f) => (
                                      <option key={f.value} value={f.value}>
                                        {f.label}
                                      </option>
                                    ))}
                                  </select>
                                </div>

                                {/* Width */}
                                <div className="flex items-center gap-1">
                                  <span className="text-[10px] text-cyan-400 font-bold w-3">W:</span>
                                  <input
                                    type="number"
                                    value={wTop === 0 ? '' : wTop}
                                    placeholder="0"
                                    onChange={(e) => {
                                      const val = parseFloat(e.target.value) || 0;
                                      if (wBottom === wTop) {
                                        handleUpdateRow(idx, { widthTop: val, widthBottom: val, width: val });
                                      } else {
                                        handleUpdateRow(idx, { widthTop: val, width: val });
                                      }
                                    }}
                                    className="w-12 bg-[#131b2e] border border-slate-700 rounded p-1 text-xs text-right font-mono text-white"
                                    title="Width (inches)"
                                  />
                                  <select
                                    value={wTopFrac}
                                    onChange={(e) => {
                                      const frac = e.target.value;
                                      if (wBtmFrac === wTopFrac) {
                                        handleUpdateRow(idx, { widthTopFraction: frac, widthBottomFraction: frac, widthFraction: frac });
                                      } else {
                                        handleUpdateRow(idx, { widthTopFraction: frac, widthFraction: frac });
                                      }
                                    }}
                                    className="bg-[#131b2e] border border-slate-700 rounded p-0.5 text-[10px] font-mono text-cyan-300 cursor-pointer"
                                    title="Width Fraction"
                                  >
                                    {INCH_FRACTION_OPTIONS.map((f) => (
                                      <option key={f.value} value={f.value}>
                                        {f.label}
                                      </option>
                                    ))}
                                  </select>
                                  <span className="text-[10px] text-emerald-400 font-mono ml-0.5 font-semibold">({sqft}s)</span>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-1 py-0.5 text-xs">
                                <div className="flex items-center gap-1">
                                  <span className="text-[10px] text-slate-400 font-bold w-3">H:</span>
                                  <input
                                    type="number"
                                    value={row.height === 0 ? '' : row.height}
                                    placeholder="0"
                                    onChange={(e) => handleUpdateRow(idx, { height: parseFloat(e.target.value) || 0 })}
                                    className="w-14 bg-[#131b2e] border border-slate-700 rounded p-1 text-xs text-right font-mono text-white"
                                    title={\`Height (\${row.unit})\`}
                                  />
                                  <span className="text-[10px] text-slate-400 font-mono">{row.unit}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className="text-[10px] text-cyan-400 font-bold w-3">W:</span>
                                  <input
                                    type="number"
                                    value={wTop === 0 ? '' : wTop}
                                    placeholder="0"
                                    onChange={(e) => {
                                      const val = parseFloat(e.target.value) || 0;
                                      if (wBottom === wTop) {
                                        handleUpdateRow(idx, { widthTop: val, widthBottom: val, width: val });
                                      } else {
                                        handleUpdateRow(idx, { widthTop: val, width: val });
                                      }
                                    }}
                                    className="w-14 bg-[#131b2e] border border-slate-700 rounded p-1 text-xs text-right font-mono text-white"
                                    title={\`Top Width (\${row.unit})\`}
                                  />
                                  <span className="text-[10px] text-slate-400 font-mono">{row.unit}</span>
                                  <span className="text-[10px] text-emerald-400 font-mono ml-0.5 font-semibold">({sqft}s)</span>
                                </div>
                                {wBottom !== wTop && (
                                  <div className="flex items-center gap-1">
                                    <span className="text-[10px] text-cyan-300 font-bold w-3">B:</span>
                                    <input
                                      type="number"
                                      value={wBottom === 0 ? '' : wBottom}
                                      placeholder="0"
                                      onChange={(e) => handleUpdateRow(idx, { widthBottom: parseFloat(e.target.value) || 0 })}
                                      className="w-14 bg-[#131b2e] border border-slate-700 rounded p-1 text-xs text-right font-mono text-white"
                                      title={\`Bottom Width (\${row.unit})\`}
                                    />
                                    <span className="text-[10px] text-slate-400 font-mono">{row.unit}</span>
                                  </div>
                                )}
                              </div>
                            )}
                          </td>

                          {/* 8. Quantity */}
                          <td className="p-2 text-center">
                            <input
                              type="number"
                              min="0"
                              value={row.qty === 0 ? '' : (row.qty ?? '')}
                              placeholder="0"
                              onChange={(e) => {
                                const val = e.target.value;
                                if (val === '') {
                                  handleUpdateRow(idx, { qty: 0 });
                                } else {
                                  const parsed = parseInt(val, 10);
                                  handleUpdateRow(idx, { qty: isNaN(parsed) ? 0 : Math.max(0, parsed) });
                                }
                              }}
                              className="w-12 bg-[#131b2e] border border-slate-700 rounded p-1 text-xs text-center font-bold text-white focus:outline-none focus:border-rose-500 font-mono"
                            />
                          </td>

                          {/* 9. Unit Price / Rate */}
                          <td className="p-2 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <span className="text-slate-400 text-xs">₹</span>
                              <input
                                type="number"
                                value={row.rate === 0 ? '' : row.rate}
                                placeholder="0"
                                onChange={(e) => handleUpdateRow(idx, { rate: parseFloat(e.target.value) || 0 })}
                                className="w-20 bg-[#131b2e] border border-slate-700 rounded p-1 text-xs text-right font-bold text-emerald-400 font-mono"
                              />
                            </div>
                            {row.autoPriceBreakdown && (
                              <div
                                className="text-[9px] text-amber-300/90 font-mono mt-0.5 text-right break-words whitespace-normal leading-tight bg-amber-950/40 px-1 py-0.2 rounded border border-amber-800/30"
                                title={row.autoPriceBreakdown}
                              >
                                ⚡ {row.autoPriceBreakdown}
                              </div>
                            )}
                          </td>

                          {/* 9b. Live Estimated Factory Cost & Margin (Show/Hide) */}
                          {showCostColumn && (
                            <td className="p-2 text-right bg-amber-950/15 border-x border-amber-900/30 font-mono">
                              {(() => {
                                const rowEst = quotationProfitEstimate?.rowEstimates?.find(
                                  (re) => re.rowId === String(row.id || idx)
                                );
                                const qtyNum = Math.max(1, Number(row.qty) || 1);
                                if (!rowEst) {
                                  return <span className="text-slate-500 text-xs">—</span>;
                                }
                                const unitMat = Math.round(rowEst.materialCost / qtyNum);
                                const unitLab = Math.round(rowEst.laborCost / qtyNum);
                                const unitCost = unitMat + unitLab;
                                const unitProf = Math.round(rowEst.profit / qtyNum);
                                const isPos = unitProf >= 0;

                                return (
                                  <div className="space-y-0.5">
                                    <div className="text-[11px] font-bold text-amber-200">
                                      ₹{unitCost.toLocaleString('en-IN')}{' '}
                                      <span className="text-[9px] text-slate-400 font-normal">/pc</span>
                                    </div>
                                    <div className="text-[9px] text-slate-400 leading-tight">
                                      M:₹{unitMat} • L:₹{unitLab}
                                    </div>
                                    <div className={\`text-[10px] font-bold \${isPos ? 'text-emerald-400' : 'text-rose-400'}\`}>
                                      {isPos ? \`+₹\${unitProf}\` : \`-₹\${Math.abs(unitProf)}\`} ({rowEst.marginPct.toFixed(0)}%)
                                    </div>
                                  </div>
                                );
                              })()}
                            </td>
                          )}

                          {/* 10. Line Total */}
                          <td className="p-2 text-right font-mono font-bold text-xs text-slate-100">
                            ₹{lineTotal}
                          </td>

                          {/* 11. Delete Row */}
                          <td className="p-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleDeleteRow(idx)}
                              className="text-slate-400 hover:text-red-400 p-1 rounded hover:bg-red-500/10 cursor-pointer transition"
                              title="Remove Item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>\n\n`;

content = content.slice(0, startIdx) + replacement + content.slice(endIdx);
fs.writeFileSync(filePath, content, 'utf8');
console.log('QuotationHub.tsx table successfully updated to screen-fit responsive layout!');
