import fs from 'fs';
import path from 'path';

const DATA_DIR = process.env.EXMARK_DATA_DIR || 'C:\\EXMARK-ERP-DATA';
const custPath = path.join(DATA_DIR, 'customers-store.json');
const quotePath = path.join(DATA_DIR, 'quotations-store.json');

export function runDeduplication() {
  if (!fs.existsSync(custPath)) {
    console.log(`[Deduplicate] No customer store found at ${custPath}`);
    return { mergedCount: 0, finalCount: 0 };
  }

  // Backup original files before modifying
  fs.copyFileSync(custPath, `${custPath}.bak-${Date.now()}`);
  if (fs.existsSync(quotePath)) {
    fs.copyFileSync(quotePath, `${quotePath}.bak-${Date.now()}`);
  }

  const customers: any[] = JSON.parse(fs.readFileSync(custPath, 'utf8'));
  console.log(`[Deduplicate] Initial customer count: ${customers.length}`);

  const phoneMap = new Map<string, any>();
  const nameMap = new Map<string, any>();
  const idRemap = new Map<string, { primaryId: string; primaryName: string }>();

  const uniqueCustomers: any[] = [];

  for (const c of customers) {
    const rawPhone = (c.phone || '').toString();
    const normPhone = rawPhone.replace(/\D/g, '').slice(-10);
    const normName = (c.name || '').toString().trim().toLowerCase();

    // Check if phone already seen
    if (normPhone && phoneMap.has(normPhone)) {
      const primary = phoneMap.get(normPhone);
      idRemap.set(c.id, { primaryId: primary.id, primaryName: primary.name });
      console.log(`[Deduplicate] Found duplicate phone ${normPhone}: merging "${c.name}" (${c.id}) -> "${primary.name}" (${primary.id})`);
      continue;
    }

    // Check if name already seen (if no phone match)
    if (normName && nameMap.has(normName)) {
      const primary = nameMap.get(normName);
      idRemap.set(c.id, { primaryId: primary.id, primaryName: primary.name });
      console.log(`[Deduplicate] Found duplicate name "${c.name}": merging (${c.id}) -> "${primary.name}" (${primary.id})`);
      continue;
    }

    // This is a primary unique record
    if (normPhone) phoneMap.set(normPhone, c);
    if (normName) nameMap.set(normName, c);
    uniqueCustomers.push(c);
  }

  console.log(`[Deduplicate] Clean unique customers: ${uniqueCustomers.length} (merged ${customers.length - uniqueCustomers.length} duplicates)`);
  fs.writeFileSync(custPath, JSON.stringify(uniqueCustomers, null, 2), 'utf8');

  // Remap quotation customer references
  if (fs.existsSync(quotePath) && idRemap.size > 0) {
    const quotes: any[] = JSON.parse(fs.readFileSync(quotePath, 'utf8'));
    let quotesUpdated = 0;
    for (const q of quotes) {
      if (q.customerId && idRemap.has(q.customerId)) {
        const remap = idRemap.get(q.customerId)!;
        console.log(`[Deduplicate] Remapping Quote ${q.quoteNumber || q.id} customer from ${q.customerId} (${q.customerName}) -> ${remap.primaryId} (${remap.primaryName})`);
        q.customerId = remap.primaryId;
        q.customerName = remap.primaryName;
        quotesUpdated++;
      }
    }
    fs.writeFileSync(quotePath, JSON.stringify(quotes, null, 2), 'utf8');
    console.log(`[Deduplicate] Updated ${quotesUpdated} quotations to reference primary customer IDs.`);
  }

  return { mergedCount: customers.length - uniqueCustomers.length, finalCount: uniqueCustomers.length };
}

if (require.main === module || process.argv[1]?.includes('deduplicate-customers')) {
  runDeduplication();
}
