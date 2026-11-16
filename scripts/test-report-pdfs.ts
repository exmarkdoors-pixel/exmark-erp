import fs from 'fs';
import path from 'path';
import { SYSTEM_REPORTS, generateReport } from '../lib/services/reportService';
import { generateExecutiveReportPdf } from '../lib/utils/pdfReportEngine';
import { generate12LStickerPdf } from '../lib/utils/pdfStickerEngine';

function verifyPdfBinaryStructure(bytes: Uint8Array, label: string, minPages = 1): number {
  const buf = Buffer.from(bytes);
  const text = buf.toString('latin1');

  if (!text.startsWith('%PDF-1.4\n')) {
    throw new Error(`[${label}] Missing %PDF-1.4 header`);
  }
  if (!text.endsWith('%%EOF')) {
    throw new Error(`[${label}] Missing %%EOF trailer`);
  }

  // Ensure pure ASCII printable + newlines so Type1 Helvetica and xref byte offsets never drift
  for (let i = 0; i < buf.length; i++) {
    const b = buf[i];
    const allowed = b === 0x0a || b === 0x0d || (b >= 0x20 && b <= 0x7e);
    if (!allowed) {
      throw new Error(`[${label}] Non-ASCII byte 0x${b.toString(16)} at offset ${i}`);
    }
  }

  const startXrefMatch = text.match(/startxref\n(\d+)\n%%EOF$/);
  if (!startXrefMatch) {
    throw new Error(`[${label}] Could not locate startxref pointer`);
  }
  const startXrefOffset = Number(startXrefMatch[1]);
  const xrefSlice = buf.subarray(startXrefOffset).toString('latin1');
  if (!xrefSlice.startsWith('xref\n0 ')) {
    throw new Error(`[${label}] startxref offset ${startXrefOffset} does not point to xref table`);
  }

  const countMatch = xrefSlice.match(/^xref\n0 (\d+)\n/);
  const totalObjs = Number(countMatch![1]);
  const lines = xrefSlice.split('\n');
  // lines[0] = "xref", lines[1] = "0 N", lines[2] = "0000000000 65535 f ", lines[3..] = object entries
  for (let objId = 1; objId < totalObjs; objId++) {
    const entry = lines[2 + objId];
    if (!entry) {
      throw new Error(`[${label}] Missing xref entry for obj ${objId}`);
    }
    const objOffset = Number(entry.slice(0, 10));
    const expectedPrefix = `${objId} 0 obj\n`;
    const actualPrefix = buf.subarray(objOffset, objOffset + expectedPrefix.length).toString('latin1');
    if (actualPrefix !== expectedPrefix) {
      throw new Error(
        `[${label}] Corrupt xref offset for obj ${objId}: offset ${objOffset} starts with "${actualPrefix.replace(/\n/g, '\\n')}"`
      );
    }
  }

  const pagesMatch = text.match(/\/Type \/Pages \/Kids \[[^\]]+\] \/Count (\d+)/);
  if (!pagesMatch) {
    throw new Error(`[${label}] Missing /Pages /Count entry`);
  }
  const pageCount = Number(pagesMatch[1]);
  if (pageCount < minPages) {
    throw new Error(`[${label}] Expected at least ${minPages} pages, got ${pageCount}`);
  }

  return pageCount;
}

async function runTests() {
  console.log('🧪 Testing All Report PDFs, 12L Vector PDF & Print CSS Integrity...\n');

  // 1. Verify globals.css no longer hides .backdrop-blur-* modal containers under @media print
  const globalsCss = fs.readFileSync(path.join(process.cwd(), 'app', 'globals.css'), 'utf8');
  if (/\.backdrop-blur-[^{]+\{\s*display:\s*none/i.test(globalsCss)) {
    throw new Error('app/globals.css still contains .backdrop-blur-* { display: none } under @media print');
  }
  if (!globalsCss.includes('.printable-modal-root')) {
    throw new Error('app/globals.css missing .printable-modal-root print isolation rules');
  }
  console.log('✓ Verified app/globals.css removes backdrop-blur hiding & isolates .printable-modal-root');

  // 2. Verify all 7 ERP Executive Reports generate valid PDF-1.4 binaries
  for (const rep of SYSTEM_REPORTS) {
    const reportData = await generateReport(rep.reportCode);
    const pdf = generateExecutiveReportPdf(reportData, {
      reportCode: rep.reportCode,
      reportTitle: rep.title,
    });
    const bytes = pdf.buildPdf();
    const pages = verifyPdfBinaryStructure(bytes, rep.reportCode, 1);
    console.log(
      `✓ ${rep.reportCode}: ${reportData.rows.length} rows -> valid %PDF-1.4 (${pages} page(s), ${bytes.length} bytes)`
    );
  }

  // 3. Multi-page pagination test (45 rows -> must span >= 2 pages cleanly)
  const manyRows = Array.from({ length: 45 }).map((_, i) => ({
    district: `District ${i + 1}`,
    dealerName: `Kerala Hardware & Doors Pvt Ltd #${i + 1}`,
    doorsSold: 12 + i,
    revenueAmount: (12 + i) * 7850,
    gstAmount: Math.round((12 + i) * 7850 * 0.18),
    outstandingDue: i % 3 === 0 ? 15000 : 0,
  }));
  const stressPdf = generateExecutiveReportPdf(
    {
      reportCode: 'STRESS_MULTI_PAGE',
      title: 'Multi-Page Stress Report (>40 Records ₹ Test)',
      generatedAt: new Date().toISOString(),
      filterApplied: {},
      summaryMetrics: { totalRevenue: '₹42,50,000', totalRecords: 45 },
      rows: manyRows,
    },
    { reportCode: 'STRESS_MULTI_PAGE' }
  );
  const stressPages = verifyPdfBinaryStructure(stressPdf.buildPdf(), 'STRESS_MULTI_PAGE', 2);
  console.log(`✓ Multi-page pagination stress test (45 rows): ${stressPages} valid pages generated`);

  // 4. Verify generate12LStickerPdf with Unicode glyphs (×, •, ₹, remarks)
  const stickerPdf = await generate12LStickerPdf([
    {
      id: 'stk-1',
      orderNumber: 'JC-2026-101',
      customerName: 'LIMBRA KUTTILANGADI (₹)',
      doorNumber: 1,
      totalDoorsInOrder: 1,
      shutterSize: '-221.1 × -69.5 / -70.5 cm',
      tape: '88 13/16" × 30 3/8"',
      profile: 'Regular Frame (72×50mm)',
      finish: 'Natural Teak • 30mm',
      hand: 'H-LEFT',
      lock: 'Baby Latch',
      remark: 'Urgent — handle with care',
      barcode: 'EXM-DR-2026-0101',
    },
  ]);
  const stickerPages = verifyPdfBinaryStructure(stickerPdf.buildPdf(), '12L_STICKER_PDF', 1);
  console.log(`✓ generate12LStickerPdf Unicode sanitization & xref check passed (${stickerPages} page)`);

  console.log('\n🎉 ALL REPORT & DOCUMENT PDF CHECKS PASSED!');
}

runTests().catch((err) => {
  console.error('❌ Report PDF test failed:', err);
  process.exit(1);
});
