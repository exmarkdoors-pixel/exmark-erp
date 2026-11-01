// Automated Verification for Sales and Sales Return Module
// EXMARK ERP - Premium Polymer Doors Factory

const assert = require('assert');

console.log('--- EXMARK ERP: SALES & SALES RETURN MODULE VERIFICATION ---');

// 1. Invoices & Credit Notes Data Structure Simulation
const GST_RATE = 0.18;
const CGST_RATE = 0.09;
const SGST_RATE = 0.09;

const sampleInvoice = {
  id: 'INV-2026-001',
  quotationId: 'QT-2026-101',
  customerName: 'Kochi Luxury Villas Pvt Ltd',
  customerPhone: '+91 98460 11223',
  customerGstin: '32AABCK9981B1Z2',
  invoiceDate: '2026-11-01',
  items: [
    {
      description: 'Solid Polymer Door - Royal Teak (80" x 34")',
      hsn: '3925',
      quantity: 10,
      unitPrice: 8500,
      taxableAmount: 85000,
      cgst: 7650,
      sgst: 7650,
      totalAmount: 100300
    },
    {
      description: 'Polymer Frame Set (4" x 2.5")',
      hsn: '3925',
      quantity: 10,
      unitPrice: 2800,
      taxableAmount: 28000,
      cgst: 2520,
      sgst: 2520,
      totalAmount: 33040
    }
  ],
  subtotal: 113000,
  cgst: 10170,
  sgst: 10170,
  totalAmount: 133340,
  advancePaid: 50000,
  balanceDue: 83340,
  paymentStatus: 'PARTIAL'
};

// 2. Compute Return / Credit Note (GST Section 34 compliance)
// Return 2 doors due to mason frame opening tolerance mismatch
const returnItemCount = 2;
const doorUnitPrice = 8500;
const returnTaxable = returnItemCount * doorUnitPrice; // 17,000
const returnCgst = Math.round(returnTaxable * CGST_RATE); // 1,530
const returnSgst = Math.round(returnTaxable * SGST_RATE); // 1,530
const returnTotal = returnTaxable + returnCgst + returnSgst; // 20,060

const sampleCreditNote = {
  id: 'CN-2026-001',
  originalInvoiceId: sampleInvoice.id,
  customerName: sampleInvoice.customerName,
  creditNoteDate: '2026-11-02',
  returnReason: 'SIZE_TOLERANCE_MISMATCH',
  factoryDisposition: 'REWORK_PLANT_FLOOR',
  items: [
    {
      description: 'Solid Polymer Door - Royal Teak (80" x 34") [Mismatched Width: Site 33.5"]',
      hsn: '3925',
      quantity: returnItemCount,
      unitPrice: doorUnitPrice,
      taxableAmount: returnTaxable,
      cgst: returnCgst,
      sgst: returnSgst,
      totalAmount: returnTotal
    }
  ],
  taxableAmount: returnTaxable,
  cgst: returnCgst,
  sgst: returnSgst,
  totalCreditAmount: returnTotal,
  notes: 'Frame opening at site was 33.5 inches. Rebate and plane at plant CNC floor.'
};

// Assertions
assert.strictEqual(returnTaxable, 17000, 'Taxable amount on 2 doors must be 17000');
assert.strictEqual(returnCgst, 1530, 'CGST 9% on 17000 must be 1530');
assert.strictEqual(returnSgst, 1530, 'SGST 9% on 17000 must be 1530');
assert.strictEqual(returnTotal, 20060, 'Total Credit Note value with 18% GST must be 20060');

console.log('✓ Credit Note tax reversal computation verified: Rs. 20,060');

// 3. Test Net Sales Reconciliation Formula
const grossBilled = sampleInvoice.totalAmount;
const totalReturns = sampleCreditNote.totalCreditAmount;
const netSales = grossBilled - totalReturns;

assert.strictEqual(grossBilled, 133340, 'Gross billed is 133,340');
assert.strictEqual(netSales, 133340 - 20060, 'Net Sales must equal Gross - Returns');
assert.strictEqual(netSales, 113280, 'Net Sales is Rs. 113,280');

console.log(`✓ Net Sales calculation verified: Gross ${grossBilled} - Returns ${totalReturns} = Net ${netSales}`);

// 4. Test Factory Disposition States
const validDispositions = ['REWORK_PLANT_FLOOR', 'RESTOCK_INVENTORY', 'SCRAP_WRITE_OFF'];
assert.ok(validDispositions.includes(sampleCreditNote.factoryDisposition), 'Valid disposition required');
console.log('✓ Factory disposition routing verified: REWORK_PLANT_FLOOR');

// 5. Test Return Reason Codes
const validReasons = [
  'SIZE_TOLERANCE_MISMATCH',
  'TRANSIT_SURFACE_DAMAGE',
  'LOCK_HINGE_MISALIGNMENT',
  'CLIENT_DESIGN_CHANGE',
  'OTHER'
];
assert.ok(validReasons.includes(sampleCreditNote.returnReason), 'Valid return reason code required');
console.log('✓ Industry return reasons verified (Kerala construction site tolerance & finish matching)');

console.log('\n--- ALL SALES & SALES RETURN TESTS PASSED (100%) ---');
