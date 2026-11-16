import fs from 'fs';
import path from 'path';

const filePath = path.resolve('components/modules/quotations/QuotationHub.tsx');
let content = fs.readFileSync(filePath, 'utf8');

const targetLoop = `                  <tbody className="divide-y divide-slate-800/80">
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
                          <td className="p-2 align-top">
                            <DoorModelCombobox
                              selectedModelId={row.modelId}
                              selectedCategory={row.frpCategory || 'A'}
                              doorModels={doorModels}
                              onSelectModel={(modelId) => handleUpdateRow(idx, { modelId })}
                              onSelectCategory={(cat) => handleUpdateRow(idx, { frpCategory: cat })}
                              categoryRates={frpSettings.categoryPieceRates}
                            />
                          </td>`;

const replacementLoop = `                  <tbody className="divide-y divide-slate-800/80">
                    {quoteItemRows.map((row, idx) => {
                      const prevRow = idx > 0 ? quoteItemRows[idx - 1] : null;
                      const isNewSection = row.sectionName && (!prevRow || prevRow.sectionName !== row.sectionName);

                      let sectionDoors = 0;
                      let sectionTotal = 0;
                      if (row.sectionName) {
                        const secRows = quoteItemRows.filter((r) => r.sectionName === row.sectionName);
                        sectionDoors = secRows.reduce((sum, r) => sum + (Number(r.qty) || 0), 0);
                        sectionTotal = secRows.reduce((sum, r) => sum + (Number(r.qty) || 0) * (r.rate || 0), 0);
                      }

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
                        <React.Fragment key={row.id || idx}>
                          {/* Section-Wise BOQ Divider Header */}
                          {isNewSection && (
                            <tr className="bg-indigo-950/60 border-y border-indigo-700/60">
                              <td colSpan={showCostColumn ? 7 : 6} className="px-3 py-1.5">
                                <div className="flex items-center justify-between text-xs">
                                  <div className="flex items-center gap-2">
                                    <span className="px-2 py-0.5 rounded bg-indigo-600 text-white font-bold text-[10px] uppercase tracking-wider shadow-xs">
                                      📁 {row.sectionName}
                                    </span>
                                    <span className="text-[10px] text-indigo-300 font-semibold">
                                      ({sectionDoors} {sectionDoors === 1 ? 'Door' : 'Doors'} in this section)
                                    </span>
                                  </div>
                                  <div className="text-[11px] font-mono font-bold text-indigo-200">
                                    Section Subtotal: ₹{sectionTotal.toLocaleString('en-IN')}
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                          <tr className="hover:bg-slate-900/60 transition">
                            {/* 1. Door Model with Search & Embedded Category */}
                            <td className="p-2 align-top">
                              <DoorModelCombobox
                                selectedModelId={row.modelId}
                                selectedCategory={row.frpCategory || 'A'}
                                doorModels={doorModels}
                                onSelectModel={(modelId) => handleUpdateRow(idx, { modelId })}
                                onSelectCategory={(cat) => handleUpdateRow(idx, { frpCategory: cat })}
                                categoryRates={frpSettings.categoryPieceRates}
                              />
                              <div className="flex items-center gap-1 mt-1">
                                <span className="text-[9px] text-indigo-400 font-bold uppercase">Sec:</span>
                                <input
                                  type="text"
                                  value={row.sectionName || ''}
                                  placeholder="e.g. Ground Floor"
                                  onChange={(e) => handleUpdateRow(idx, { sectionName: e.target.value })}
                                  className="bg-[#101728] border border-indigo-900/60 rounded px-1.5 py-0.5 text-[9px] text-indigo-200 placeholder-slate-600 focus:outline-none focus:border-indigo-400 font-medium w-full"
                                  title="Section / Floor Name (e.g. Ground Floor, Kitchen)"
                                />
                              </div>
                            </td>`;

const targetTrEnd = `                            </div>
                          </td>
                        </tr>
                      );
                    })}`;

const replacementTrEnd = `                            </div>
                          </td>
                        </tr>
                      </React.Fragment>
                      );
                    })}`;

if (content.includes(targetLoop) && content.includes(targetTrEnd)) {
  content = content.replace(targetLoop, replacementLoop);
  content = content.replace(targetTrEnd, replacementTrEnd);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('✓ Successfully injected Section-Wise BOQ divider & tag to QuotationHub.tsx');
} else {
  console.error('Target loop or end pattern not matched in QuotationHub.tsx');
  process.exit(1);
}
