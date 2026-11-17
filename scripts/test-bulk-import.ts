import * as XLSX from 'xlsx';
import { parseCsvRows, parseLeadsCsv, generateExcelTemplate } from '../lib/utils/bulkUploadParser';
import { createLeadsBulk } from '../lib/services/crmService';

async function runTests() {
  console.log('--- TEST 1: BOM removal ---');
  const bomCsv = '\uFEFFtitle,client,phone\n"Project A",Builder 1,9846011111\n"Project B",Builder 2,9846022222';
  const rows1 = parseCsvRows(bomCsv);
  console.log('✅ BOM test rows:', rows1.length, rows1[0]);

  console.log('\n--- TEST 2: TSV Clipboard Paste ---');
  const tsvPaste = 'Project\tParty\tMobile\tDoors\nVilla Site\tAnoop Builders\t9846012345\t12 FRP\nCity Flat\tMetro Interiors\t9447067890\t8 Premium';
  const rows2 = parseCsvRows(tsvPaste);
  console.log('✅ TSV test rows:', rows2.length, rows2[0]);

  console.log('\n--- TEST 3: Semicolon CSV ---');
  const semiCsv = 'Project;Client;Phone;District\nPalace;Nazer;9846099999;Malappuram';
  const rows3 = parseCsvRows(semiCsv);
  console.log('✅ Semicolon test rows:', rows3.length, rows3[0]);

  console.log('\n--- TEST 4: Non-blocking phone numbers ---');
  const noPhoneTsv = 'Project\tParty\tDistrict\nResort Project\tGreen Leaf\tWayanad';
  const rows4 = parseCsvRows(noPhoneTsv);
  const parsed4 = parseLeadsCsv(rows4);
  console.log('✅ Non-blocking phone test:', {
    validCount: parsed4.validCount,
    errorCount: parsed4.errorCount,
    item0Valid: parsed4.items[0]?.isValid,
    warning: parsed4.items[0]?.warning,
  });

  console.log('\n--- TEST 5: Excel (.xlsx) Template & Parsing ---');
  const xlsxBytes = generateExcelTemplate('LEADS');
  console.log('✅ Generated XLSX template bytes:', xlsxBytes.length);

  // Parse back the generated xlsx workbook
  const wb = XLSX.read(xlsxBytes, { type: 'array' });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const sheetJson = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: '', raw: false });
  console.log('✅ Parsed back XLSX rows:', sheetJson.length, 'Row 0:', sheetJson[0]);

  const parsedFromExcel = parseLeadsCsv(sheetJson);
  console.log('✅ parseLeadsCsv on Excel rows:', {
    validCount: parsedFromExcel.validCount,
    totalCount: parsedFromExcel.items.length,
    firstTitle: parsedFromExcel.items[0]?.title,
    firstClient: parsedFromExcel.items[0]?.client,
    firstPhone: parsedFromExcel.items[0]?.phone,
  });

  console.log('\n--- TEST 6: Consecutive Lead Codes in crmService ---');
  const testLeads = [
    { title: 'Bulk Test 1', client: 'Client A', contactPerson: 'Contact A', phone: '9846011111', district: 'Ernakulam', stage: 'NEW' as const, doorCount: 5, value: 50000, doors: '5 FRP' },
    { title: 'Bulk Test 2', client: 'Client B', contactPerson: 'Contact B', phone: '9846022222', district: 'Calicut', stage: 'NEW' as const, doorCount: 8, value: 75000, doors: '8 FRP' },
    { title: 'Bulk Test 3', client: 'Client C', contactPerson: 'Contact C', phone: '', district: 'Malappuram', stage: 'NEW' as const, doorCount: 12, value: 110000, doors: '12 FRP' },
  ];
  const created = await createLeadsBulk(testLeads);
  console.log('✅ Consecutive Lead Codes:');
  created.forEach((l) => console.log(`   ${l.leadCode} -> ${l.title} (${l.phone || 'No Phone'})`));
}

runTests().catch(console.error);
