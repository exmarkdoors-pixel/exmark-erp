import fs from 'fs';

const files = [
  'components/modules/production/ProductionBoardHub.tsx',
  'components/modules/payroll/PayrollAttendanceHub.tsx',
  'components/modules/accounting/AccountingMasterHub.tsx',
  'components/modules/accounting/AccountingLedgerSection.tsx',
  'components/modules/accounting/AccountingSalesSection.tsx',
  'components/modules/accounting/AccountingPurchasesExpensesSection.tsx',
  'components/modules/engineering/StoreRequisitionHub.tsx',
  'components/dashboard/CorporateControlCenter.tsx',
  'components/dashboard/KpiCards.tsx',
  'app/page.tsx',
  'app/globals.css'
];

for (const f of files) {
  if (!fs.existsSync(f)) continue;
  const content = fs.readFileSync(f, 'utf8');
  const lines = content.split('\n');
  const matches = [];
  lines.forEach((l, idx) => {
    if (/(?:min-w|w)-\[(\d+)px\]/i.test(l) || /overflow-x-(auto|scroll|hidden)/i.test(l) || /grid-cols-[5-9]/i.test(l) || /grid-cols-1[0-2]/i.test(l) || /max-w-\[/i.test(l)) {
      matches.push({ line: idx + 1, text: l.trim().slice(0, 120) });
    }
  });
  console.log(`=== ${f} (${matches.length} layout rules) ===`);
  matches.slice(0, 8).forEach(m => console.log(`  L${m.line}: ${m.text}`));
  if (matches.length > 8) console.log(`  ... and ${matches.length - 8} more`);
}
