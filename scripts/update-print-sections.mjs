import fs from 'fs';
import path from 'path';

const filePath = path.resolve('components/modules/quotations/PrintDocumentHub.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// Table 1 (Tally / Standard theme)
const oldTallyRow = `        {rows.map((row, i) => {
          const model = doorModels.find((m) => m.id === row.modelId) || { code: 'EXM', title: 'FRP Door', finish: 'Std' };
          const wTop = row.widthTop ?? row.width ?? 0;
          const wBottom = row.widthBottom ?? wTop;
          const wTopFrac = row.widthTopFraction || row.widthFraction || '0';
          const wBtmFrac = row.widthBottomFraction || wTopFrac;
          const sqft = calculateSqFt(row.height, wTop, wBottom, row.unit, row.heightFraction, wTopFrac, wBtmFrac);
          const dim = formatDimensionDisplay(row.height, wTop, wBottom, row.unit, row.heightFraction, wTopFrac, wBtmFrac);
          const lineTotal = (Number(row.qty) || 0) * row.rate;

          return (
            <tr key={i} className="text-[11px]">`;

const newTallyRow = `        {rows.map((row, i) => {
          const prevRow = i > 0 ? rows[i - 1] : null;
          const isNewSection = row.sectionName && (!prevRow || prevRow.sectionName !== row.sectionName);
          const secRows = row.sectionName ? rows.filter((r) => r.sectionName === row.sectionName) : [];
          const secTotal = secRows.reduce((sum, r) => sum + (Number(r.qty) || 0) * (r.rate || 0), 0);

          const model = doorModels.find((m) => m.id === row.modelId) || { code: 'EXM', title: 'FRP Door', finish: 'Std' };
          const wTop = row.widthTop ?? row.width ?? 0;
          const wBottom = row.widthBottom ?? wTop;
          const wTopFrac = row.widthTopFraction || row.widthFraction || '0';
          const wBtmFrac = row.widthBottomFraction || wTopFrac;
          const sqft = calculateSqFt(row.height, wTop, wBottom, row.unit, row.heightFraction, wTopFrac, wBtmFrac);
          const dim = formatDimensionDisplay(row.height, wTop, wBottom, row.unit, row.heightFraction, wTopFrac, wBtmFrac);
          const lineTotal = (Number(row.qty) || 0) * row.rate;

          return (
            <React.Fragment key={i}>
              {isNewSection && (
                <tr className="bg-slate-100 font-bold text-[10px] text-slate-800 border-y border-slate-300">
                  <td colSpan={6} className="px-2 py-1">
                    <div className="flex items-center justify-between">
                      <span>📁 {row.sectionName}</span>
                      <span className="font-mono">Subtotal: ₹{secTotal.toLocaleString('en-IN')}</span>
                    </div>
                  </td>
                </tr>
              )}
              <tr className="text-[11px]">`;

const oldTallyEnd = `              <td className="p-1.5 text-right font-mono font-bold">₹{lineTotal.toLocaleString('en-IN')}</td>
            </tr>
          );
        })}`;

const newTallyEnd = `              <td className="p-1.5 text-right font-mono font-bold">₹{lineTotal.toLocaleString('en-IN')}</td>
            </tr>
          </React.Fragment>
          );
        })}`;

if (content.includes(oldTallyRow) && content.includes(oldTallyEnd)) {
  content = content.replace(oldTallyRow, newTallyRow);
  content = content.replace(oldTallyEnd, newTallyEnd);
  fs.writeFileSync(filePath, content, 'utf8');
  console.log('✓ Successfully injected section headers to PrintDocumentHub.tsx');
} else {
  console.log('Pattern not matched in PrintDocumentHub.tsx');
}
