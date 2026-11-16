import fs from 'fs';
import os from 'os';
import path from 'path';
import zlib from 'zlib';

function assert(condition: boolean, message: string) {
  if (!condition) {
    throw new Error(`ASSERTION FAILED: ${message}`);
  }
  console.log(`  ✓ ${message}`);
}

/**
 * Minimal uncompressed/deflated ZIP builder to create a genuine .xlsx test artifact
 * mimicking Vyapar Windows Excel exports cleanly with zero external test packages.
 */
function buildSyntheticXlsxBuffer(rows: string[][]): Buffer {
  const sharedStrings: string[] = [];
  const strMap = new Map<string, number>();
  const getStrIdx = (s: string) => {
    if (strMap.has(s)) return strMap.get(s)!;
    const idx = sharedStrings.length;
    sharedStrings.push(s);
    strMap.set(s, idx);
    return idx;
  };

  const escapeXml = (s: string) =>
    s
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');

  const colName = (idx: number) => String.fromCharCode(65 + idx);
  const sheetRowsXml = rows
    .map((row, rIdx) => {
      const cellsXml = row
        .map((cell, cIdx) => {
          if (cell === '') return '';
          const ref = `${colName(cIdx)}${rIdx + 1}`;
          if (/^\d+(\.\d+)?$/.test(cell.trim())) {
            return `<c r="${ref}"><v>${cell.trim()}</v></c>`;
          }
          const sIdx = getStrIdx(cell);
          return `<c r="${ref}" t="s"><v>${sIdx}</v></c>`;
        })
        .filter(Boolean)
        .join('');
      return `<row r="${rIdx + 1}">${cellsXml}</row>`;
    })
    .join('');

  const sharedStringsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><sst xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" count="${sharedStrings.length}" uniqueCount="${sharedStrings.length}">${sharedStrings
    .map((s) => `<si><t>${escapeXml(s)}</t></si>`)
    .join('')}</sst>`;

  const worksheetXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><sheetData>${sheetRowsXml}</sheetData></worksheet>`;

  const files: Array<{ name: string; data: Buffer }> = [
    { name: 'xl/sharedStrings.xml', data: Buffer.from(sharedStringsXml, 'utf8') },
    { name: 'xl/worksheets/sheet1.xml', data: Buffer.from(worksheetXml, 'utf8') },
  ];

  // CRC32 helper
  const crcTable = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    crcTable[i] = c >>> 0;
  }
  const crc32 = (buf: Buffer) => {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };

  const localParts: Buffer[] = [];
  const cdParts: Buffer[] = [];
  let offset = 0;

  for (const file of files) {
    const nameBuf = Buffer.from(file.name, 'utf8');
    const compressed = zlib.deflateRawSync(file.data);
    const crc = crc32(file.data);

    const localHdr = Buffer.alloc(30);
    localHdr.writeUInt32LE(0x04034b50, 0);
    localHdr.writeUInt16LE(20, 4);
    localHdr.writeUInt16LE(0, 6);
    localHdr.writeUInt16LE(8, 8); // deflate
    localHdr.writeUInt32LE(crc, 14);
    localHdr.writeUInt32LE(compressed.length, 18);
    localHdr.writeUInt32LE(file.data.length, 22);
    localHdr.writeUInt16LE(nameBuf.length, 26);

    localParts.push(localHdr, nameBuf, compressed);

    const cdHdr = Buffer.alloc(46);
    cdHdr.writeUInt32LE(0x02014b50, 0);
    cdHdr.writeUInt16LE(20, 4);
    cdHdr.writeUInt16LE(20, 6);
    cdHdr.writeUInt16LE(0, 8);
    cdHdr.writeUInt16LE(8, 10);
    cdHdr.writeUInt32LE(crc, 16);
    cdHdr.writeUInt32LE(compressed.length, 20);
    cdHdr.writeUInt32LE(file.data.length, 24);
    cdHdr.writeUInt16LE(nameBuf.length, 28);
    cdHdr.writeUInt32LE(offset, 42);

    cdParts.push(cdHdr, nameBuf);
    offset += localHdr.length + nameBuf.length + compressed.length;
  }

  const cdBuf = Buffer.concat(cdParts);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(files.length, 8);
  eocd.writeUInt16LE(files.length, 10);
  eocd.writeUInt32LE(cdBuf.length, 12);
  eocd.writeUInt32LE(offset, 16);

  return Buffer.concat([...localParts, cdBuf, eocd]);
}

async function runDayBookTests() {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'exmark-daybook-test-'));
  process.env.EXMARK_DATA_DIR = tempDir;

  try {
    console.log(`\nRunning Vyapar Expense Report & Day Book Import Tests (Isolated: ${tempDir})\n`);

    const [
      { createContractor },
      {
        previewDayBookUpload,
        commitDayBookImport,
        updateDayBookEntry,
        deleteDayBookBatch,
        saveMonthlyAccountingSheet,
        clonePreviousMonthlySheet,
        getMonthlyAccountingSummary,
      },
      { computeComprehensiveBreakEven },
    ] = await Promise.all([
      import('../lib/services/contractorService'),
      import('../lib/services/daybookImportService'),
      import('../lib/services/breakEvenService'),
    ]);

    createContractor({
      name: 'Ashik Molding Gang',
      phone: '9847000001',
      trade: 'MOLDING',
      isInHouseGang: true,
    });

    // 1. Test Genuine .xlsx Vyapar Expense Category Report (with banners & bottom Total row)
    const vyaparCategoryRows = [
      ['EXMARK FRP DOORS PRIVATE LIMITED'],
      ['Expense Category Report'],
      ['Duration: 01/11/2026 to 30/11/2026'],
      ['', ''],
      ['Category Name', 'Amount'],
      ['Factory Shed Rent', '60000'],
      ['Staff Salary', '110000'],
      ['KSEB 3-Phase Electricity', '30000'],
      ['Van Freight Outward', '15000'],
      ['Total', '215000'],
    ];
    const xlsxBuf = buildSyntheticXlsxBuffer(vyaparCategoryRows);
    const vyaparPreview = previewDayBookUpload({
      fileBase64: xlsxBuf.toString('base64'),
      fileName: 'Vyapar_Expense_Category_Nov2026.xlsx',
      defaultMonth: '2026-11',
    });

    assert(vyaparPreview.sourceType === 'XLSX', 'Detected binary .xlsx upload format');
    assert(vyaparPreview.detectedFormat === 'VYAPAR_EXPENSE_CATEGORY', 'Auto-detected Vyapar Expense Category Report');
    assert(vyaparPreview.rowsSkippedTotals >= 1 && vyaparPreview.rows.length === 4, `Stripped top banners & bottom Total row -> exactly 4 expense categories (got ${vyaparPreview.rows.length})`);
    assert(vyaparPreview.bucketTotals.FIXED_OVERHEAD === 90000, `Fixed Overheads (Rent + KSEB) = ₹90,000 (got ${vyaparPreview.bucketTotals.FIXED_OVERHEAD})`);
    assert(vyaparPreview.bucketTotals.FIXED_SALARY === 110000, `Fixed Staff Salary = ₹1,10,000 (got ${vyaparPreview.bucketTotals.FIXED_SALARY})`);
    assert(vyaparPreview.bucketTotals.VARIABLE_FREIGHT === 15000, `Freight separated cleanly into VARIABLE_FREIGHT ₹15,000 (not fixed!)`);

    const committed1 = commitDayBookImport({
      fileName: 'Vyapar_Expense_Category_Nov2026.xlsx',
      detectedFormat: vyaparPreview.detectedFormat,
      sourceType: vyaparPreview.sourceType,
      rowsSkippedBanner: vyaparPreview.rowsSkippedBanner,
      rowsSkippedTotals: vyaparPreview.rowsSkippedTotals,
      rows: vyaparPreview.rows,
    });
    assert(committed1.insertedCount === 4, 'Committed 4 Vyapar category entries cleanly');

    // Re-uploading the exact same Vyapar file should detect & skip all 4 duplicates!
    const dupePreview = previewDayBookUpload({
      fileBase64: xlsxBuf.toString('base64'),
      fileName: 'Vyapar_Expense_Category_Nov2026.xlsx',
      defaultMonth: '2026-11',
    });
    assert(dupePreview.duplicateCount === 4, 'Duplicate fingerprint guard detected all 4 re-uploaded entries');

    // 2. Test Vyapar Day Book TSV Paste (Mixed Sales, Purchases, Payment-Out Vendor, Contractor Gang, Contra)
    const dayBookPaste = [
      'Date\tRef No\tParty Name\tType\tMoney In\tMoney Out\tDescription',
      '05/11/2026\tINV-10\tMalabar Builders\tSale\t960000\t0\t120 Doors Sold',
      '06/11/2026\tPUR-04\tKochi Polymers Resin\tPurchase\t0\t240000\tPolyester Resin + CSM',
      '10/11/2026\tPAY-12\tKochi Polymers Resin\tPayment-Out\t0\t240000\tBill Settlement',
      '12/11/2026\tPAY-13\tAshik Molding Gang\tPayment-Out\t0\t45000\tDoor Molding Piece Rate',
      '15/11/2026\tCONTRA-1\tSBI Bank\tContra\t0\t100000\tATM Cash Transfer',
    ].join('\n');

    const dbPreview = previewDayBookUpload({
      rawText: dayBookPaste,
      fileName: 'Vyapar_DayBook_Nov.tsv',
      defaultMonth: '2026-11',
    });
    assert(dbPreview.detectedFormat === 'DAY_BOOK' && dbPreview.sourceType === 'TSV_PASTE', 'Detected TSV Excel Day Book paste');
    assert(dbPreview.bucketTotals.INFLOW_SALES_RECEIPT === 960000, 'Day Book Sales classified as INFLOW_SALES_RECEIPT (₹9,60,000)');
    assert(dbPreview.bucketTotals.VARIABLE_MATERIAL === 240000, 'Purchase voucher classified as VARIABLE_MATERIAL without double-counting Payment-Out');
    assert(dbPreview.bucketTotals.VARIABLE_PIECE_RATE === 45000, 'Matched contractor gang "Ashik Molding Gang" as VARIABLE_PIECE_RATE');

    const committedDb = commitDayBookImport({
      fileName: 'Vyapar_DayBook_Nov.tsv',
      detectedFormat: dbPreview.detectedFormat,
      sourceType: dbPreview.sourceType,
      rows: dbPreview.rows,
    });
    assert(committedDb.insertedCount === 5, 'Committed Day Book batch cleanly');

    // 3. Test 1-Month Quick Sheet (Doors Sold = 120) + Break-Even Modes (Hybrid vs Imported Month)
    saveMonthlyAccountingSheet({
      monthKey: '2026-11',
      salaries: [{ id: 's1', employeeName: 'Ravi Watchman', role: 'Security', monthlySalary: 15000, active: true }],
      expenses: [],
      manualDoorsSold: 120,
      manualSalesRevenue: 960000,
    });

    const summary = getMonthlyAccountingSummary('2026-11');
    assert(
      summary.combinedFixedSalaryTotal === 125000 && summary.combinedFixedOverheadTotal === 90000,
      `Combined Fixed = ₹1,25,000 Salaries + ₹90,000 Rent/EB = ₹2,15,000`
    );

    const beImported = await computeComprehensiveBreakEven({
      month: '2026-11',
      costDataSource: 'IMPORTED_MONTH_DAYBOOK',
      includeFloorConsumables: false,
    });

    // Avg Price = 960000 / 120 = 8000; Variable Cost = (240000 + 45000 + 15000) / 120 = 300000 / 120 = 2500
    // CM = 8000 - 2500 = 5500; Fixed = 215000 -> BEP Doors = ceil(215000 / 5500) = 40 Doors
    assert(
      beImported.activeUnitEconomics.avgSellingPricePerDoor === 8000,
      `Imported Month Avg Price = ₹8,000/door`
    );
    assert(
      beImported.activeUnitEconomics.totalVariableCostPerDoor === 2500,
      `Imported Month Var Cost = ₹2,500/door (zero Payment-Out / Contra leakage!)`
    );
    assert(
      beImported.activeBreakEven.breakEvenUnits === 40,
      `Imported Month BEP = ceil(215000 / 5500) = 40 Doors (got ${beImported.activeBreakEven.breakEvenUnits})`
    );

    // 4. Test Tally XML + Reclassification + Batch Rollback + Clone Next Month
    const tallyXml = `
      <ENVELOPE><BODY><DATA><COLLECTION>
        <VOUCHER>
          <DATE>20261202</DATE>
          <VOUCHERTYPENAME>Payment</VOUCHERTYPENAME>
          <VOUCHERNUMBER>88</VOUCHERNUMBER>
          <PARTYLEDGERNAME>Office Broadband Bill</PARTYLEDGERNAME>
          <ALLLEDGERENTRIES.LIST><LEDGERNAME>Office Broadband Bill</LEDGERNAME><ISDEEMEDPOSITIVE>Yes</ISDEEMEDPOSITIVE><AMOUNT>-2500</AMOUNT></ALLLEDGERENTRIES.LIST>
          <ALLLEDGERENTRIES.LIST><LEDGERNAME>Bank</LEDGERNAME><ISDEEMEDPOSITIVE>No</ISDEEMEDPOSITIVE><AMOUNT>2500</AMOUNT></ALLLEDGERENTRIES.LIST>
        </VOUCHER>
      </COLLECTION></DATA></BODY></ENVELOPE>`;
    const xmlPreview = previewDayBookUpload({
      rawText: tallyXml,
      fileName: 'TallyDayBook.xml',
      defaultMonth: '2026-12',
    });
    assert(xmlPreview.sourceType === 'TALLY_XML' && xmlPreview.rows.length === 1 && xmlPreview.rows[0].effectiveAmount === 2500, 'Parsed Tally XML <VOUCHER> ₹2,500 cleanly');

    // Reclassify & delete Day Book batch rollback
    const firstEntryId = getMonthlyAccountingSummary('2026-11').entries[0].id;
    const updatedEntry = updateDayBookEntry({
      entryId: firstEntryId,
      bucket: 'FIXED_OVERHEAD',
    });
    assert(updatedEntry.bucket === 'FIXED_OVERHEAD', 'Reclassified entry bucket cleanly');

    const rolledBack = deleteDayBookBatch(committedDb.batch.id);
    assert(rolledBack === true && getMonthlyAccountingSummary('2026-11').entries.length === 4, 'Deleted Day Book batch cleanly restoring remaining 4 entries');

    const clonedDec = clonePreviousMonthlySheet('2026-11', '2026-12');
    assert(clonedDec.salaries.length === 1 && clonedDec.salaries[0].monthlySalary === 15000, 'Cloned 2026-11 payroll sheet into 2026-12 cleanly');

    console.log('\n✅ ALL VYAPAR / DAY BOOK IMPORT TESTS PASSED!\n');
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
}

runDayBookTests().catch((err) => {
  console.error('\n❌ DAY BOOK IMPORT TEST FAILED:', err);
  process.exit(1);
});
