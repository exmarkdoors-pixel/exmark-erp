import { getAllMeasurements } from '../lib/services/measurementService';

async function main() {
  console.log('Testing getAllMeasurements...');
  const start = Date.now();
  const records = await getAllMeasurements();
  console.log(`getAllMeasurements returned ${records.length} records in ${Date.now() - start}ms`);
  console.log('Sample record IDs:', records.map(r => r.id));
}

main().catch(console.error);
