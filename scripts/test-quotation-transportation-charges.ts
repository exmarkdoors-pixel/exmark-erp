import { createQuotation, updateQuotation, deleteQuotation } from '../lib/services/quotationService';

async function testTransportationCharges() {
  console.log('--- STARTING TRANSPORTATION CHARGES TEST ---');

  // Test 1: Fixed Lump Sum
  console.log('\n[Test 1] Fixed Lump Sum Transportation (₹1,500)');
  const quote1 = await createQuotation({
    customerId: 'cust-test-1',
    customerName: 'Test Transportation Client A',
    location: 'Calicut City',
    date: new Date().toISOString().slice(0, 10),
    validUntil: new Date(Date.now() + 86400000 * 15).toISOString().slice(0, 10),
    items: [
      {
        doorCategory: 'WPC_DOORS',
        doorModel: 'Premium WPC Door 32mm',
        heightMm: 2100,
        widthMm: 900,
        thicknessMm: 32,
        quantity: 2,
        unitPrice: 5000,
        gstRate: 0,
        totalPrice: 10000
      }
    ],
    installationCharge: 1000,
    includeTransportation: true,
    transportationMode: 'FIXED_LUMP_SUM',
    transportationRate: 1500,
    transportationDistanceKm: 0,
    transportationVehicleType: 'Pickup / Tata Ace',
    transportationNotes: 'Direct factory to site drop',
    transportationAmount: 1500,
    subtotal: 12500, // 10000 + 1000 + 1500
    totalAmount: 12500,
    advanceAmount: Math.round(12500 * 0.3) // 3750
  });

  console.log(`Created Quote 1: ID=${quote1.id}, QuoteNo=${quote1.quoteNumber}`);
  console.log(`Transportation: Mode=${quote1.transportationMode}, Amount=₹${quote1.transportationAmount}, Vehicle=${quote1.transportationVehicleType}`);
  if (quote1.transportationAmount !== 1500 || quote1.transportationMode !== 'FIXED_LUMP_SUM') {
    throw new Error('Test 1 failed: Fixed lump sum not persisted correctly');
  }

  // Test 2: Per KM Mode (25 km @ ₹40/km = ₹1,000)
  console.log('\n[Test 2] Per KM Transportation (25 km @ ₹40/km)');
  const quote2 = await createQuotation({
    customerId: 'cust-test-2',
    customerName: 'Test Transportation Client B',
    location: 'Kochi Suburban',
    date: new Date().toISOString().slice(0, 10),
    validUntil: new Date(Date.now() + 86400000 * 15).toISOString().slice(0, 10),
    items: [
      {
        doorCategory: 'FRP_DOORS',
        doorModel: 'Standard PVC Door',
        heightMm: 2000,
        widthMm: 800,
        thicknessMm: 30,
        quantity: 5,
        unitPrice: 3000,
        gstRate: 0,
        totalPrice: 15000
      }
    ],
    includeTransportation: true,
    transportationMode: 'PER_KM',
    transportationRate: 40,
    transportationDistanceKm: 25,
    transportationVehicleType: 'Heavy Truck',
    transportationNotes: 'Inter-district delivery',
    transportationAmount: 1000, // 25 * 40
    subtotal: 16000,
    totalAmount: 16000,
    advanceAmount: Math.round(16000 * 0.3)
  });

  console.log(`Created Quote 2: ID=${quote2.id}, QuoteNo=${quote2.quoteNumber}`);
  console.log(`Transportation: Mode=${quote2.transportationMode}, Rate=₹${quote2.transportationRate}/km, Distance=${quote2.transportationDistanceKm}km, Amount=₹${quote2.transportationAmount}`);
  if (quote2.transportationAmount !== 1000 || quote2.transportationDistanceKm !== 25) {
    throw new Error('Test 2 failed: Per KM calculation/persistence failed');
  }

  // Test 3: Per Door Mode (4 doors @ ₹250/door = ₹1,000)
  console.log('\n[Test 3] Per Door Transportation (4 doors @ ₹250/door)');
  const quote3 = await createQuotation({
    customerId: 'cust-test-3',
    customerName: 'Test Transportation Client C',
    location: 'Thrissur Town',
    date: new Date().toISOString().slice(0, 10),
    validUntil: new Date(Date.now() + 86400000 * 15).toISOString().slice(0, 10),
    items: [
      {
        doorCategory: 'FRP_DOORS',
        doorModel: 'Fiber Door Model EX-101',
        heightMm: 2050,
        widthMm: 850,
        thicknessMm: 32,
        quantity: 4,
        unitPrice: 4000,
        gstRate: 0,
        totalPrice: 16000
      }
    ],
    includeTransportation: true,
    transportationMode: 'PER_DOOR',
    transportationRate: 250,
    transportationDistanceKm: 0,
    transportationVehicleType: 'Standard Van',
    transportationNotes: 'Careful handling for glass inserts',
    transportationAmount: 1000, // 4 * 250
    subtotal: 17000,
    totalAmount: 17000,
    advanceAmount: Math.round(17000 * 0.3)
  });

  console.log(`Created Quote 3: ID=${quote3.id}, QuoteNo=${quote3.quoteNumber}`);
  console.log(`Transportation: Mode=${quote3.transportationMode}, Rate=₹${quote3.transportationRate}/door, Amount=₹${quote3.transportationAmount}`);
  if (quote3.transportationAmount !== 1000 || quote3.transportationMode !== 'PER_DOOR') {
    throw new Error('Test 3 failed: Per Door calculation/persistence failed');
  }

  // Test 4: Update Existing Quote Transportation
  console.log('\n[Test 4] Update Quote 1 Transportation to Per KM');
  const updatedQuote1 = await updateQuotation(quote1.id, {
    customerName: quote1.customerName,
    location: quote1.location,
    items: quote1.items,
    includeTransportation: true,
    transportationMode: 'PER_KM',
    transportationRate: 50,
    transportationDistanceKm: 40,
    transportationVehicleType: 'Eicher 14ft',
    transportationNotes: 'Updated route via bypass',
    transportationAmount: 2000, // 40 * 50
    subtotal: 13000,
    totalAmount: 13000,
    advanceAmount: Math.round(13000 * 0.3)
  });

  console.log(`Updated Quote 1: Mode=${updatedQuote1.transportationMode}, Rate=₹${updatedQuote1.transportationRate}/km, Distance=${updatedQuote1.transportationDistanceKm}km, Amount=₹${updatedQuote1.transportationAmount}, Vehicle=${updatedQuote1.transportationVehicleType}`);
  if (updatedQuote1.transportationAmount !== 2000 || updatedQuote1.transportationMode !== 'PER_KM') {
    throw new Error('Test 4 failed: Update failed');
  }

  // Clean up test quotes
  await deleteQuotation(quote1.id);
  await deleteQuotation(quote2.id);
  await deleteQuotation(quote3.id);
  console.log('Cleaned up temporary test quotations.');

  console.log('\n>>> ALL TRANSPORTATION CHARGES TESTS PASSED SUCCESSFULLY! <<<');
}

testTransportationCharges().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
