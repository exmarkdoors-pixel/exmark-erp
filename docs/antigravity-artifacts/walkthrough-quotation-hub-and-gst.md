# EXMARK ERP — Quotations Hub & Dual-GST Workflow Walkthrough

The **EXMARK DOORS Quotation Hub** (from your HTML specification) has been implemented and integrated into the EXMARK ERP application.

---

## 1. Key Features Implemented

### 1. Quotation Creator Workbench
- **Quote Identification:** Dynamic quote numbering (`QT-2026-0...`).
- **Customer Selection & Creation:**
  - Fast selection dropdown populated with Kerala clients and builders.
  - **`+ Add Customer (പുതിയ കസ്റ്റമർ)`** modal with Firm Name, Phone, District/Location, Category (Architect, Contractor, Dealer, Direct Client), and GSTIN.
  - Newly added customers are selected automatically.
- **Door Schedule Builder:**
  - Model dropdown synced with door models catalog (`EXM-A-101`, `EXM-AB-103`, `EXM-WPC-201`, etc.).
  - **`+ Add New Door Model (പുതിയ മോഡൽ)`** modal with Model Code, Material (`FRP`, `WPC`, `Steel`), Title/Finish description, and Default Base Rate.
  - **Multi-Unit Dimensions:** Supports `cm (Default)`, `mm`, and `inch` with real-time automatic dimension conversion and live calculated square footage (`.. sqft`).
  - Steppers for quantity, unit price (₹), and line totals.
  - Add and delete line item rows.
- **3-Way GST Tax Regime:**
  1. **Without GST (0% Tax / സീറോ GST):** Subtotal = Grand Total, GST = ₹0.
  2. **GST Excluded (+18% Added to Base):** Grand Total = Subtotal + 18% GST.
  3. **GST Included (MRP Inclusive Rate):** Base = Grand Total / 1.18, GST = Grand Total - Base.
  - Custom GST Percentage input (default 18%).
- **Advance Terms & Live Breakdown:**
  - Selector for 50%, 40%, 30%, or 100% advance.
  - Live display of Subtotal, GST Amount, Grand Total, Required Advance (₹ in Lakhs), and Balance at Delivery.

### 2. Proforma Quotation Document Preview & Print Modal
- Accessible via **`View & Print`** on any saved quotation.
- **Official Letterhead:**
  - EX-MARK DOORS
  - Cherur, Vengara, Malappuram, Kerala - 676304
  - Ph: +91 9447928866 | Email: exmarkdoors@gmail.com | GSTIN: 32AAHFE4489L1Z2
- Bill To & Commercial details.
- Itemized door specifications table (model, finish, dimensions in cm/mm/inch, sq.ft, qty, rate, line total).
- Financial summary and terms & conditions according to **IS 14856:2000** standard specifications.
- Instant print trigger (`window.print()`).

### 3. Integrated Pipeline Board & Sales Orders Tracking
- **Quotations Section:** Main workbench & recent quotations table.
- **Pipeline Board:** 4 Kanban columns (`New Inquiries`, `Measurement Scheduled`, `Quotation Submitted`, `Final Negotiation`) with `View Log` and `Follow up →` / `Create Sales Order 📦`.
- **Sales Orders Tracking:** 5-step milestone stepper (`Order Confirmed`, `50% Advance Recd`, `In Production`, `QC Passed`, `Dispatched & Installed`).
- Audio feedback toggle using Web Audio API synthesis.
- Demo data reset button (`🔄 Reset`).

---

## 2. Files Created & Modified

1. **[`components/modules/quotations/QuotationHub.tsx`](file:///c:/Users/NAZER%20KARUMBAN/EXMARK-Projects/exmark-erp/components/modules/quotations/QuotationHub.tsx)**: Full React component implementing the HTML specification.
2. **[`components/modules/ModuleViews.tsx`](file:///c:/Users/NAZER%20KARUMBAN/EXMARK-Projects/exmark-erp/components/modules/ModuleViews.tsx)**: Linked `QuotationHub` to `QuotationsView`.
3. **[`scripts/test-quotation-hub.ts`](file:///c:/Users/NAZER%20KARUMBAN/EXMARK-Projects/exmark-erp/scripts/test-quotation-hub.ts)**: Automated test suite for GST calculations, unit conversions, and advance payments.

---

## 3. Test Verification Results

```
===============================================================
🚀 EXMARK ERP: QUOTATION HUB & DUAL-GST VERIFICATION TEST SUITE
===============================================================

[TEST 1] Testing 3-Way GST Calculation Strategies...
  ✅ Without GST: Base ₹40000 + GST ₹0 = ₹40000
  ✅ GST Excluded (+18%): Base ₹40000 + GST ₹7200 = ₹47200
  ✅ GST Included (18%): Base ₹33898.31 + GST ₹6101.69 = ₹40000

[TEST 2] Testing Unit Conversion and Area (Sq.Ft) Calculation...
  205cm x 75cm   -> 16.55 sqft
  2050mm x 750mm -> 16.55 sqft
  80.7" x 29.5"  -> 16.55 sqft
  ✅ PASSED: Multi-unit dimension and area calculation verified.

[TEST 3] Testing 50%, 40%, 30% Advance Payment calculations...
  Total: ₹19,80,000
  50% Advance: ₹9,90,000
  40% Advance: ₹7,92,000
  30% Advance: ₹5,94,000
  ✅ PASSED: Advance terms verified.

===============================================================
🎉 ALL QUOTATION HUB & DUAL-GST TESTS PASSED SUCCESSFULLY!
===============================================================

TypeScript Compilation: 0 errors (tsc --noEmit passed clean).
Git Deployment: Pushed to origin/main (commit 3a6206b).
```
