# Walkthrough: Unified Factory ERP, CRM & Production Floor Prototype Integration

We have integrated all operational workflows and features from the latest single-page application prototype (`media_1793537193333_ca0c2450.html`) into the Next.js production codebase (`exmark-erp`).

---

## 🚀 Key Implementations

### 1. Dual Sticker Print Formats (A4 12L Compact vs. Single Continuous Thermal Roll 4"×2")
- **File:** [`components/modules/production/BatchPrintHub.tsx`](file:///c:/Users/NAZER%20KARUMBAN/EXMARK-Projects/exmark-erp/components/modules/production/BatchPrintHub.tsx)
- **Live Format Switcher:** In both the print toolbar and within the printable document modal, operators can seamlessly toggle between:
  1. **📄 A4 12-Up Sheet (12L Compact):**
     - Dimensions: $210\text{mm} \times 292\text{mm}$ (max $294\text{mm}$).
     - Exact Card Height: Strictly $67\text{mm}$ per sticker card with $2.5\text{mm}$ row gap and $5\text{mm}$ margins.
     - Zero Page Overflow: Strictly enforces 12 stickers per A4 page.
  2. **🏷️ Single Continuous Thermal Roll (4" × 2" / 100mm × 50mm):**
     - Formatted for TVS LP 46 Neo, TSC TE244, Zebra ZD220, and Citizen thermal barcode roll printers.
     - Solid black badge displaying **SHUTTER CUTTING SIZE** (Master CM) + Tape reading (inches & fractions).
     - Official Bureau of Indian Standards **`IS 14856:2000 QC PASS`** certification badge.
     - Auto page breaks after every sticker for continuous roll feeding.

---

### 2. Consolidated Multi-Party Batch BOQ & Material Requisition
- **File:** [`components/modules/engineering/StoreRequisitionHub.tsx`](file:///c:/Users/NAZER%20KARUMBAN/EXMARK-Projects/exmark-erp/components/modules/engineering/StoreRequisitionHub.tsx)
- **Consolidation Engine:**
  - Added button `⚡ Consolidated Multi-Party BOQ (പല പാർട്ടികളുടെ ആകെ BOQ)`.
  - Multi-order checkbox selection panel enabling supervisors to combine confirmed orders from different parties (e.g. Skyline Builders + Malabar Heritage + Dr. Jacob Abraham) into a single unified hydraulic press batch.
  - Dynamically calculates:
    - Total square footage ($18.0\text{ sq.ft}$ per door)
    - FRP Isophthalic Marine Grade Resin ($0.30\text{ kg/sq.ft}$)
    - Fiberglass CSM 450 Mat ($0.15\text{ kg/sq.ft}$)
    - Subframe hardwood rails & honeycomb core sets
    - PU woodgrain polish & UV anti-scratch lacquer ($0.20\text{ L/door}$)
    - SS 304 bearing hinges ($3\text{ pairs/door}$) and SS screws ($24\text{ screws/door}$)
  - Generates the official printable **Store Issue Slip (സ്റ്റോർ ഇഷ്യൂ വൗച്ചർ)** with combined batch requisition numbers and signatures.

---

### 3. Door Measurement Book Bulk 12L Sticker Selector
- **File:** [`components/modules/ModuleViews.tsx`](file:///c:/Users/NAZER%20KARUMBAN/EXMARK-Projects/exmark-erp/components/modules/ModuleViews.tsx)
- **Direct Bulk Printing:**
  - Added `Bulk 12L Sticker Print (മൾട്ടി-ഓർഡർ) 🏷️` button to the primary toolbar of `DoorMeasurementsView`.
  - Opens the **Bulk 12L Sticker Print from Measurement Book** modal.
  - Allows selecting multiple site measurement registers simultaneously.
  - Instantly launches the `BatchPrintHub` pre-loaded with the selected orders for rapid label printing.

---

### 4. Super Admin RBAC Permission Matrix & Role Switcher
- **Files:** [`components/layout/Navbar.tsx`](file:///c:/Users/NAZER%20KARUMBAN/EXMARK-Projects/exmark-erp/components/layout/Navbar.tsx) and [`lib/auth/roles.ts`](file:///c:/Users/NAZER%20KARUMBAN/EXMARK-Projects/exmark-erp/lib/auth/roles.ts)
- **Active Role Dropdown in Navbar:**
  - Immediate switcher between:
    - 👑 `Super Admin`
    - 🏭 `Plant Supervisor`
    - 📐 `Site Engineer`
    - 💰 `Accounts & Billing`
    - 🔍 `QC Inspector`
- **Interactive RBAC Permissions Matrix Modal:**
  - Accessible via the `Role Matrix` button in the top navbar.
  - Allows Super Admin to view and toggle module permissions across roles:
    - Modules: `CRM`, `Quotations`, `Measurement`, `Sales Orders`, `BOM`, `Production`, `Accounts`, `Batch Print`.
    - Live updates apply immediately upon role switching.

---

### 5. Mobile Responsive Bottom Navigation Bar
- **File:** [`app/page.tsx`](file:///c:/Users/NAZER%20KARUMBAN/EXMARK-Projects/exmark-erp/app/page.tsx)
- **Mobile Touch Bar:**
  - Fixed bottom bar on mobile screens (`md:hidden fixed bottom-0 left-0 right-0 h-14 bg-[#0B132B]`).
  - 6 instant touch targets:
    1. **CRM** (`crm`)
    2. **Measure** (`measurements`)
    3. **Orders** (`sales-orders`)
    4. **BOQ/BOM** (`bom`)
    5. **QC/Plant** (`production`)
    6. **12L Print** (`batch-print`)
  - Added safe bottom padding (`pb-20 md:pb-6`) so shop-floor operators can scroll through table content without touch obstruction.

---

### 6. Interactive QC Floor Checklist & Printable Physical Tick-Sheet
- **File:** [`components/modules/quality/QualityControlHub.tsx`](file:///c:/Users/NAZER%20KARUMBAN/EXMARK-Projects/exmark-erp/components/modules/quality/QualityControlHub.tsx)
- **Interactive Digital Inspection:**
  - Table of active production doors with 5 IS 14856:2000 live checkboxes:
    1. Dimensions ($\pm 1.5\text{mm}$)
    2. Diagonal Squareness ($\le 3\text{mm}$)
    3. Flatness / Warpage ($\le 3\text{mm}$)
    4. Polish & UV Finish
    5. Lock Mortising
  - Dynamic status indicator: `✓ CERTIFIED PASS` (all 5 passed) or `⚠ REWORK REQUIRED`.
- **Physical QC Clipboard Check-Sheet:**
  - Button `Print Floor QC Sheet (പ്രിന്റ് ടിക്ക് ഷീറ്റ്) 🖨️` opens a high-contrast printable document with physical `[ ]` tick-boxes for physical clipboards on the factory floor.

---

## 🧪 Verification Results

Automated test suite [`scripts/test-unified-bonding-workflow.js`](file:///c:/Users/NAZER%20KARUMBAN/EXMARK-Projects/exmark-erp/scripts/test-unified-bonding-workflow.js):
- **Tests Executed:** 44
- **Tests Passed:** 44 (100%)
- **TypeScript Compiler (`tsc --noEmit`):** 0 errors.
- **Next.js Dev Server:** Responding HTTP 200 on `http://localhost:3000`.
