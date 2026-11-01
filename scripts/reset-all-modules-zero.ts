import fs from 'fs';
import path from 'path';

export function resetAllModulesToZero() {
  const dataDir = path.join(process.cwd(), 'data');
  const timestamp = new Date().toISOString().replace(/[-:T.]/g, '').slice(0, 14);
  const backupDir = path.join(dataDir, 'backups', `full-system-backup-${timestamp}`);

  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  // 1. Safe Backup of all JSON files in data/
  const files = fs.readdirSync(dataDir).filter((f) => f.endsWith('.json'));
  for (const file of files) {
    const src = path.join(dataDir, file);
    const dest = path.join(backupDir, file);
    fs.copyFileSync(src, dest);
  }
  console.log(`[Backup] All ${files.length} data files backed up to: data/backups/full-system-backup-${timestamp}/`);

  // 2. Reset Transaction Stores to Clean 0 Records
  const emptyArrayStores = [
    'customers-store.json',
    'leads-store.json',
    'quotations-store.json',
    'measurements-store.json',
    'production-store.json',
    'boq-store.json',
    'purchases-store.json',
    'whatsapp-store.json',
    'db-outbox-sync.json',
  ];

  for (const store of emptyArrayStores) {
    const fullPath = path.join(dataDir, store);
    fs.writeFileSync(fullPath, '[]\n', 'utf8');
    console.log(`  ✓ Cleared ${store} -> 0 records`);
  }

  // Finance Store
  const financePath = path.join(dataDir, 'finance-store.json');
  fs.writeFileSync(
    financePath,
    JSON.stringify({ invoices: [], payments: [], targets: [] }, null, 2) + '\n',
    'utf8'
  );
  console.log('  ✓ Cleared finance-store.json -> 0 invoices, 0 payments, 0 targets');

  // Fulfillment Store
  const fulfillmentPath = path.join(dataDir, 'fulfillment-store.json');
  fs.writeFileSync(
    fulfillmentPath,
    JSON.stringify({ dispatches: [], installations: [], warranties: [] }, null, 2) + '\n',
    'utf8'
  );
  console.log('  ✓ Cleared fulfillment-store.json -> 0 dispatches, 0 installations, 0 warranties');

  // Concurrency Store
  const concurrencyPath = path.join(dataDir, 'concurrency-store.json');
  fs.writeFileSync(concurrencyPath, JSON.stringify({ versions: [] }, null, 2) + '\n', 'utf8');
  console.log('  ✓ Cleared concurrency-store.json -> 0 locks/versions');

  // Inventory Store: Set all stock to 0
  const inventoryPath = path.join(dataDir, 'inventory-store.json');
  if (fs.existsSync(inventoryPath)) {
    try {
      const inventory = JSON.parse(fs.readFileSync(inventoryPath, 'utf8'));
      if (Array.isArray(inventory)) {
        const zeroedInventory = inventory.map((item: any) => ({
          ...item,
          currentStock: 0,
          status: 'Out of Stock',
        }));
        fs.writeFileSync(inventoryPath, JSON.stringify(zeroedInventory, null, 2) + '\n', 'utf8');
        console.log(`  ✓ Zeroed inventory-store.json -> ${inventory.length} items set to 0 stock`);
      }
    } catch (err) {
      console.warn('  ! Could not parse inventory-store.json, resetting to []');
      fs.writeFileSync(inventoryPath, '[]\n', 'utf8');
    }
  }

  console.log('\n======================================================');
  console.log(' ALL ERP MODULES ARE NOW RESET TO ZERO (FRESH START) ');
  console.log('======================================================\n');

  return {
    success: true,
    backupDir: `data/backups/full-system-backup-${timestamp}`,
    timestamp,
    modulesZeroed: [
      'Customers (0)',
      'CRM Leads (0)',
      'Quotations (0)',
      'Door Measurements (0)',
      'Sales Orders (0)',
      'Production Orders & Job Cards (0)',
      'Finance & GST Invoices (₹0.00)',
      'Payments & Collections (₹0.00)',
      'BOQ & Requisitions (0)',
      'Logistics & Dispatches (0)',
      'Installations (0)',
      'Warranties (0)',
      'Purchase Orders (0)',
      'WhatsApp Log (0)',
      'Inventory Stock (0 units across all SKUs)',
    ],
  };
}

// Run directly if invoked via CLI
if (require.main === module) {
  resetAllModulesToZero();
}
