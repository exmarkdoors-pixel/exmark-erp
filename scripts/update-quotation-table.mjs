import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const filePath = path.join(__dirname, '..', 'components', 'modules', 'quotations', 'QuotationHub.tsx');

let code = fs.readFileSync(filePath, 'utf8');

const startMarker = '{/* 1. Door Model with Search & Embedded Category */}';
const endMarker = 'title="Remove Item"\n                            >\n                              <Trash2 className="w-3.5 h-3.5" />\n                            </button>\n                          </td>';
const endMarkerCRLF = 'title="Remove Item"\r\n                            >\r\n                              <Trash2 className="w-3.5 h-3.5" />\r\n                            </button>\r\n                          </td>';

const startIdx = code.indexOf(startMarker);
if (startIdx === -1) {
  console.error('Could not find start marker');
  process.exit(1);
}

let endIdx = code.indexOf(endMarkerCRLF, startIdx);
let endMarkerLen = endMarkerCRLF.length;
if (endIdx === -1) {
  endIdx = code.indexOf(endMarker, startIdx);
  endMarkerLen = endMarker.length;
}

if (endIdx === -1) {
  console.error('Could not find end marker');
  process.exit(1);
}

const replacement = `{/* 1. Door Model with Search & Embedded Category */}
                          <td className="p-2 align-top">
                            <DoorModelCombobox
                              selectedModelId={row.modelId}
                              selectedCategory={row.frpCategory || 'A'}
                              doorModels={doorModels}
                              onSelectModel={(modelId) => handleUpdateRow(idx, { modelId })}
                              onSelectCategory={(cat) => handleUpdateRow(idx, { frpCategory: cat })}
                              categoryRates={frpSettings.categoryPieceRates}
                            />
                          </td>

                          {/* 2. Frame & Door Thickness Stacked */}
                          <td className="p-2 align-top space-y-1.5">
                            {/* Frame Selector */}
                            <div>
                              <div className="flex items-center justify-between mb-0.5 text-[9px] text-indigo-300 font-semibold uppercase">
                                <span>Frame:</span>
                                <span className="font-mono text-slate-400">
                                  {(row.framePrice ?? 0) < 0
                                    ? \`-₹\${Math.abs(row.framePrice ?? 0)}\`
                                    : (row.framePrice ?? 0) > 0
                                      ? \`+₹\${row.framePrice}\`
                                      : 'Std'}
                                </span>
                              </div>
                              <select
                                value={activeFrame.id}
                                onChange={(e) => handleUpdateRow(idx, { frameTypeId: e.target.value })}
                                className={\`w-full bg-[#131b2e] border rounded p-1 text-xs font-semibold focus:border-indigo-400 cursor-pointer \${
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
                            </div>

                            {/* Door Thickness Selector */}
                            <div>
                              <div className="flex items-center justify-between mb-0.5 text-[9px] text-amber-300 font-semibold uppercase">
                                <span>Thickness:</span>
                                <span className="font-mono text-slate-400">
                                  {(row.thicknessExtraRate ?? 0) > 0 ? \`+₹\${row.thicknessExtraRate}\` : 'Std'}
                                </span>
                              </div>
                              <select
                                value={
                                  row.thicknessId ||
                                  getDefaultThicknessOption(frpSettings.doorThicknesses).id
                                }
                                onChange={(e) => handleUpdateRow(idx, { thicknessId: e.target.value })}
                                className="w-full bg-[#131b2e] border border-amber-500/40 rounded p-1 text-xs text-amber-200 font-semibold focus:border-amber-400 cursor-pointer"
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
                            </div>
                          </td>

                          {/* 3. Colour & Lock Hardware Stacked */}
                          <td className="p-2 align-top space-y-1.5">
                            {/* Colour / Finish Selector */}
                            <div>
                              <div className="flex items-center justify-between mb-0.5 text-[9px] text-emerald-300 font-semibold uppercase">
                                <span>Colour / Finish:</span>
                                {row.colourExtraRate && row.colourExtraRate > 0 ? (
                                  <span className="font-mono text-emerald-400">+₹\${row.colourExtraRate}</span>
                                ) : null}
                              </div>
                              <select
                                value={row.colourId || (frpSettings.colours?.[0]?.id || 'col-teak-matte')}
                                onChange={(e) => handleUpdateRow(idx, { colourId: e.target.value })}
                                className="w-full bg-[#131b2e] border border-emerald-500/30 rounded p-1 text-xs text-emerald-300 font-semibold focus:border-emerald-400 cursor-pointer"
                              >
                                {(frpSettings.colours && frpSettings.colours.length > 0 ? frpSettings.colours : DEFAULT_COLOUR_OPTIONS).map((c) => (
                                  <option key={c.id} value={c.id}>
                                    {c.name} {c.extraRate && c.extraRate > 0 ? \`(+₹\${c.extraRate})\` : ''}
                                  </option>
                                ))}
                              </select>
                            </div>

                            {/* Lock Hardware Selector & Discount Checkbox */}
                            <div>
                              <div className="flex items-center justify-between mb-0.5 text-[9px] text-cyan-300 font-semibold uppercase">
                                <span>Lock:</span>
                                {row.lockPrice !== undefined && row.lockPrice !== 0 && (
                                  <span className={\`font-mono \${row.lockPrice < 0 ? 'text-emerald-400' : 'text-cyan-400'}\`}>
                                    {row.lockPrice < 0 ? \`-₹\${Math.abs(row.lockPrice)}\` : \`+₹\${row.lockPrice}\`}
                                  </span>
                                )}
                              </div>
                              <select
                                value={row.lockId || (frpSettings.locks?.[0]?.id || 'lock-none')}
                                onChange={(e) => handleUpdateRow(idx, { lockId: e.target.value })}
                                className="w-full bg-[#131b2e] border border-cyan-500/40 rounded p-1 text-xs text-cyan-200 font-semibold focus:border-cyan-400 cursor-pointer"
                              >
                                {(frpSettings.locks && frpSettings.locks.length > 0 ? frpSettings.locks : DEFAULT_LOCK_OPTIONS).map((l) => (
                                  <option key={l.id} value={l.id}>
                                    {l.name} {l.price < 0 ? \`(-₹\${Math.abs(l.price)})\` : l.price > 0 ? \`(+₹\${l.price})\` : '(Incl)'}
                                  </option>
                                ))}
                              </select>

                              {/* Without Accessories Discount Checkbox */}
                              <label className="flex items-center gap-1 mt-1 cursor-pointer select-none text-[10px] font-bold text-slate-300 hover:text-emerald-300 leading-tight">
                                <input
                                  type="checkbox"
                                  checked={!!row.withoutAccessories}
                                  onChange={(e) => handleUpdateRow(idx, { withoutAccessories: e.target.checked })}
                                  className="w-3 h-3 rounded accent-emerald-500 cursor-pointer shrink-0"
                                />
                                <span>No Acc (-₹500)</span>
                              </label>
                            </div>
                          </td>

                          {/* 4. Dimensions & Unit */}
                          <td className="p-2 align-top space-y-1.5">
                            {/* Unit Selector Pills (1-Click Switcher) */}
                            <div className="flex items-center justify-between gap-1 bg-slate-950/80 p-0.5 rounded border border-slate-800">
                              {(['inch', 'cm', 'mm']).map((u) => {
                                const isCurrentUnit = row.unit === u;
                                const label = u === 'inch' ? 'Inch (in)' : u;
                                return (
                                  <button
                                    key={u}
                                    type="button"
                                    onClick={() => handleUpdateRow(idx, { unit: u })}
                                    className={\`flex-1 text-[10px] py-0.5 font-bold rounded transition cursor-pointer text-center \${
                                      isCurrentUnit
                                        ? 'bg-cyan-600 text-white shadow-xs font-black'
                                        : 'text-slate-400 hover:text-white hover:bg-slate-800'
                                    }\`}
                                  >
                                    {label}
                                  </button>
                                );
                              })}
                            </div>

                            {/* Dimension Inputs */}
                            {row.unit === 'inch' ? (
                              <div className="space-y-1 text-xs">
                                {/* Height */}
                                <div className="flex items-center gap-1">
                                  <span className="text-[10px] text-slate-400 font-bold w-4 shrink-0">H:</span>
                                  <input
                                    type="number"
                                    value={row.height === 0 ? '' : row.height}
                                    placeholder="0"
                                    onChange={(e) => handleUpdateRow(idx, { height: parseFloat(e.target.value) || 0 })}
                                    className="w-14 bg-[#131b2e] border border-slate-700 rounded p-1 text-xs text-right font-mono text-white"
                                    title="Height (inches)"
                                  />
                                  <select
                                    value={row.heightFraction || '0'}
                                    onChange={(e) => handleUpdateRow(idx, { heightFraction: e.target.value })}
                                    className="flex-1 bg-[#131b2e] border border-slate-700 rounded p-1 text-[10px] font-mono text-cyan-300 cursor-pointer"
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
                                  <span className="text-[10px] text-cyan-400 font-bold w-4 shrink-0">W:</span>
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
                                    className="flex-1 bg-[#131b2e] border border-slate-700 rounded p-1 text-[10px] font-mono text-cyan-300 cursor-pointer"
                                    title="Width Fraction"
                                  >
                                    {INCH_FRACTION_OPTIONS.map((f) => (
                                      <option key={f.value} value={f.value}>
                                        {f.label}
                                      </option>
                                    ))}
                                  </select>
                                </div>
                                <div className="flex items-center justify-end">
                                  <span className="text-[10px] text-emerald-400 font-mono font-bold bg-emerald-950/60 border border-emerald-800/40 px-1.5 py-0.2 rounded">
                                    {sqft} sqft
                                  </span>
                                </div>
                              </div>
                            ) : (
                              <div className="space-y-1 text-xs">
                                <div className="flex items-center gap-1">
                                  <span className="text-[10px] text-slate-400 font-bold w-4 shrink-0">H:</span>
                                  <input
                                    type="number"
                                    value={row.height === 0 ? '' : row.height}
                                    placeholder="0"
                                    onChange={(e) => handleUpdateRow(idx, { height: parseFloat(e.target.value) || 0 })}
                                    className="flex-1 bg-[#131b2e] border border-slate-700 rounded p-1 text-xs text-right font-mono text-white"
                                    title={\`Height (\${row.unit})\`}
                                  />
                                  <span className="text-[10px] text-slate-400 font-mono shrink-0">{row.unit}</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <span className="text-[10px] text-cyan-400 font-bold w-4 shrink-0">W:</span>
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
                                    className="flex-1 bg-[#131b2e] border border-slate-700 rounded p-1 text-xs text-right font-mono text-white"
                                    title={\`Width (\${row.unit})\`}
                                  />
                                  <span className="text-[10px] text-slate-400 font-mono shrink-0">{row.unit}</span>
                                </div>
                                <div className="flex items-center justify-end">
                                  <span className="text-[10px] text-emerald-400 font-mono font-bold bg-emerald-950/60 border border-emerald-800/40 px-1.5 py-0.2 rounded">
                                    {sqft} sqft
                                  </span>
                                </div>
                              </div>
                            )}
                          </td>

                          {/* 5. Qty & Price / Rate Stacked */}
                          <td className="p-2 align-top text-right space-y-1.5">
                            <div>
                              <div className="text-[9px] text-slate-400 font-semibold uppercase mb-0.5 text-center">Qty</div>
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
                                className="w-full bg-[#131b2e] border border-slate-700 rounded p-1 text-xs text-center font-bold text-white focus:outline-none focus:border-rose-500 font-mono"
                              />
                            </div>
                            <div>
                              <div className="text-[9px] text-slate-400 font-semibold uppercase mb-0.5 text-right">Price (₹)</div>
                              <div className="flex items-center justify-end gap-1">
                                <span className="text-slate-400 text-xs">₹</span>
                                <input
                                  type="number"
                                  value={row.rate === 0 ? '' : row.rate}
                                  placeholder="0"
                                  onChange={(e) => handleUpdateRow(idx, { rate: parseFloat(e.target.value) || 0 })}
                                  className="w-full bg-[#131b2e] border border-slate-700 rounded p-1 text-xs text-right font-bold text-emerald-400 font-mono"
                                />
                              </div>
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

                          {/* 6. Optional: Cost & Margin */}
                          {showCostColumn && (
                            <td className="p-2 align-top text-right bg-amber-950/15 border-x border-amber-900/30 font-mono">
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
                                  <div className="space-y-1">
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

                          {/* 7. Line Total & Delete Action */}
                          <td className="p-2 align-top text-right space-y-2">
                            <div>
                              <div className="text-[9px] text-slate-400 font-semibold uppercase mb-0.5">Line Total</div>
                              <div className="font-mono font-bold text-xs sm:text-sm text-cyan-300">
                                ₹{lineTotal}
                              </div>
                            </div>
                            <div className="pt-1 flex justify-end">
                              <button
                                type="button"
                                onClick={() => handleDeleteRow(idx)}
                                className="text-slate-400 hover:text-rose-400 p-1 rounded-md hover:bg-rose-500/10 cursor-pointer transition flex items-center gap-1 text-[10px]"
                                title="Remove Item Row"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                <span>Delete</span>
                              </button>
                            </div>
                          </td>`;

const newCode = code.slice(0, startIdx) + replacement + code.slice(endIdx + endMarkerLen);
fs.writeFileSync(filePath, newCode, 'utf8');
console.log('Successfully updated QuotationHub.tsx table cells!');
