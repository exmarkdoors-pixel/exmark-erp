# Walkthrough: Clear All Data as Zero

We have implemented a **"Clear All Data as Zero"** baseline across the EXMARK ERP, providing a factory-ready clean slate with ₹0 initial calculations, 1-click hub data zeroing, and zero empty-state handling.

---

## 1. Summary of Changes

### A. Quotation Workbench: "Clear to Zero (0 Data)"
- **Zero-Initialized Draft Row:** Created helper `createZeroRow()` setting `qty: 0`, `height: 0`, `widthTop: 0`, `widthBottom: 0`, `width: 0`, and `rate: 0`.
- **Instant ₹0 Financial Totals:** Resetting or clearing automatically updates `Subtotal: ₹0`, `GST (18%): ₹0`, `Grand Total: ₹0`, and `Advance: ₹0`.
- **Streamlined Zero Value Editing:** Dimensions (Height, Top Width, Bottom Width) and Price/Rate now feature clean `placeholder="0"` and empty string handling so operators can type new numbers immediately without having to backspace a zero.
- **Validation Guard:** Prevents generating an accidental quotation when total door quantity is 0, displaying an audio-visual warning: *"Please enter a door quantity greater than 0 before generating a quotation."*

### B. Hub-Wide 1-Click "Clear All Data as Zero"
- **Top Header Action:** Added a prominent **"Clear All Data as Zero"** button with a trash/eraser icon in [`QuotationHub.tsx`](file:///c:/Users/NAZER%20KARUMBAN/EXMARK-Projects/exmark-erp/components/modules/quotations/QuotationHub.tsx).
- **Confirmation Safety Modal:** Clicking opens a modal detailing that quotations, CRM leads, and active work orders will be cleared to 0 records.
- **State Wiped to Zero:**
  - `quotations = []` (0 quotes, ₹0 pipeline)
  - `leads = []` (0 CRM leads)
  - `salesOrders = []` (0 active factory floor jobs)
  - `quoteItemRows` $\to$ clean zero row (`qty: 0, height: 0, width: 0, rate: 0`)
- **Persistence:** Saved in `localStorage.setItem('exmark_data_zeroed', 'true')` so browser refreshes remain in the zero baseline.
- **Restore Option:** Retained a companion **"Restore Templates"** button to reload standard Kerala door presets whenever desired.

### C. Zero Empty States
- **Quotations List:** Displays a clean empty card (`0 Quotation Records - All data cleared to zero`) when the table has no quotes.
- **CRM Pipeline:** Displays `0 Leads - No inquiries in this stage` in empty Kanban columns.
- **Sales Orders:** Displays `0 Active Factory Work Orders - Release quotes with 40% advance to initiate plant floor lines`.

---

## 2. Verification & Testing

1. **TypeScript Compilation:**
   ```powershell
   node_modules\.bin\tsc.cmd --noEmit
   # Output: Exited with code 0 (0 errors)
   ```
2. **Server Health Check:**
   ```powershell
   node -e "const http = require('http'); http.get('http://localhost:3000', (res) => { console.log('STATUS:', res.statusCode); process.exit(0); });"
   # Output: STATUS: 200
   ```
3. **Automated Unified Workflow Suite:**
   ```powershell
   node scripts/test-unified-workflow.js
   # Output: 15/15 tests passed successfully
   ```
4. **Git Repository:**
   - Changes committed and pushed to `origin main` ([`84380a1`](https://github.com/exmarkdoors-pixel/exmark-erp/commit/84380a1)).
