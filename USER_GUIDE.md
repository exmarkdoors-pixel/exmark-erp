# EXMARK ERP — User Operations Guide

**Kerala FRP & WPC Door Manufacturing Business Management**

---

## 1. System Access & Roles

Access the platform at `http://localhost:3000` (Local) or `https://exmark-erp-staging.onrender.com` (Cloud).

### Standard Role Credentials & Modules:
- **Director / Super Admin (`director@exmarkdoors.com`):** Unrestricted access across all operational, financial, and administrative settings.
- **Management (`management@exmarkdoors.com`):** Executive overview, financial forecasting, and approval controls.
- **Sales Executive (`sales.calicut@exmarkdoors.com`):** Leads, Customers, Measurements, BOQ, and Quotation generation.
- **Accounts Officer (`accounts.kochi@exmarkdoors.com`):** Tax Invoicing, Payment Receipts, Advance Verification, and GST summaries.
- **Plant Manager (`plant@exmarkdoors.com`):** Job Cards, Door Production Queue, Cutting Optimization, and QC Signoff.
- **Inventory Officer (`inventory@exmarkdoors.com`):** Raw Material Master, Stock Adjustments, and Reorder alerts.
- **Site Installation (`site.installation@exmarkdoors.com`):** Site Measurements, QR Dispatch Scans, and 5-Star Customer Signoff.

---

## 2. Core Workflows

### 2.1 Recording Site Measurements (4-Point Masonry Precision)
1. Navigate to **Site Measurements** &rarr; click **"+ Record New Site Measurement"**.
2. Select Customer & Kerala District (e.g. Ernakulam, Kozhikode, Malappuram).
3. Enter Project/Site Name and Site Address.
4. For each door opening:
   - Enter Door Label (e.g. `D1 - Master Bath`).
   - Enter **Height Left** & **Height Right** (MM).
   - Enter **Width Top** & **Width Bottom** (MM).
   - Select Frame Type (e.g. `FRP Wrap-Around Monolithic Frame` or `WPC Solid Extruded`).
   - Select Handing (Left Inward / Right Inward) and Lock Type (Baby Latch / Mortise 60mm).
5. Click **"Save Measurement Book"** to commit to persistent database storage.

### 2.2 BOQ & GST Quotation Conversion
1. Open verified Site Measurement &rarr; click **"Generate BOQ"**.
2. Confirm square-footage calculations and door models.
3. Click **"Generate Quotation"** to calculate 18% GST (CGST 9% + SGST 9%) under HSN `3925.20.00`.
4. Export Quotation PDF or dispatch directly via WhatsApp Cloud API.

### 2.3 Accounts Advance Gate & Production Release
1. Customer accepts quotation.
2. Order moves to `Advance Pending`.
3. Accounts department records minimum 40% advance payment receipt.
4. Click **"Verify Advance Deposit"**.
5. Order unlocks for **"Release to Plant Production"**.

### 2.4 Manufacturing, Labels & QC
1. Production team opens Job Card (`JC-2026-XXX`).
2. Cutting deduction automatically calculated: `Finished Height = Raw Height - 10mm`.
3. Print A4 Yellow Sticker Cutting Labels (12 labels per sheet, 2x6 grid).
4. Conduct Final QC inspection and generate temporary tracking QR code.
5. Ship with Delivery Challan.

### 2.5 15-Year FRP Material Warranty
1. Installation technician completes 5-star signoff and captures site photograph.
2. Generate official 15-Year FRP Material Warranty Certificate.
3. Warranty clearly specifies coverage applies to **FRP DOOR MATERIAL ONLY** and excludes hardware, locks, hinges, and paint finishes.
4. Download or send bilingual Malayalam/English care instructions to customer.
