# Walkthrough: Standalone Sales & Sales Return Module

A dedicated, production-grade **Sales and Sales Return Module** has been implemented and integrated into the **EXMARK ERP** platform. It provides end-to-end commercial accounting, GST Section 34 compliant Credit Notes for door returns, factory rework disposition routing, live net sales reconciliation, and 5-theme printable documents.

---

## 1. Primary Navigation & Access Control

- **Sidebar Navigation Tab:** Added **Sales & Returns** (`'sales'`) with `ReceiptText` icon and **GST Billed** status badge.
- **Corporate Modules Hub:** Registered under the **Core Operations** folder with quick-launch action card.
- **Role Permissions:** Accessible to `super_admin`, `management`, `sales`, and `accounts` roles in [`lib/auth/roles.ts`](file:///c:/Users/NAZER%20KARUMBAN/EXMARK-Projects/exmark-erp/lib/auth/roles.ts).

---

## 2. Core Functional Sub-Tabs

### Sub-Tab 1: Commercial Tax Invoices Registry (ടാക്സ് ഇൻവോയ്സ്)
- Full visibility of billed invoices (`INV-2026-xxx`) linked directly to approved Sales Orders (`SO-2026-xxx`).
- Displays customer name, phone, site district (Ernakulam, Kozhikode, Malappuram, Thrissur, etc.), door counts, and delivery dates.
- Financial metrics breakdown:
  - **Taxable Subtotal (HSN 3925)**
  - **18% GST (CGST 9% + SGST 9%)**
  - **Grand Total**
  - **Advance Credited & Remaining Balance Due**
  - **Payment Status Badge:** `PAID`, `PARTIAL`, `UNPAID`
- 1-Click Multi-Theme Print modal directly from the invoice row.
- Instant "+ New Sales Invoice" generator modal with live tax and balance computation.

### Sub-Tab 2: Sales Return & Credit Notes (GST Section 34 - ക്രെഡിറ്റ് നോട്ട്)
Addresses the reality of Kerala construction sites (masonry tolerance discrepancies, transit scratches, and design revisions):
- **Return Reasons Supported:**
  1. `SIZE_TOLERANCE_MISMATCH`: Site Opening Tolerance Mismatch (സൈറ്റ് അളവ് വ്യത്യാസം)
  2. `TRANSIT_SURFACE_DAMAGE`: Transit Surface Scratch / Coating Chip (വാഹന ചരക്കുനീക്കത്തിലെ സ്ക്രാച്ച്)
  3. `LOCK_HINGE_MISALIGNMENT`: Lock Hole / Hinge Routing Variation (ലോക്ക് ഹോൾ / ഹിഞ്ച് റൂട്ടിംഗ് വ്യത്യാസം)
  4. `CLIENT_DESIGN_CHANGE`: Client Shade / Finish Design Modification (ഉപഭോക്താവിന്റെ ഡിസൈൻ / ഷേഡ് മാറ്റം)
  5. `FACTORY_QC_REJECT`: Factory Floor QA Tolerance Rejection (ഫാക്ടറി ക്വാളിറ്റി ചെക്ക് റിജക്ഷൻ)
- **Factory Disposition Workflow:**
  - `REWORK_PLANT_FLOOR`: Routed back to factory floor for CNC trimming, rebating, or rebuffing.
  - `RESTOCK_INVENTORY`: Restocked into the finished goods warehouse for immediate redeployment.
  - `SCRAP_WRITE_OFF`: Material recovery and scrap write-off.
- **GST Section 34 Reversal Calculation:**
  - Auto-reverses taxable value, CGST (9%), SGST (9%), and total refund amount against the parent invoice.

### Sub-Tab 3: Customer Net Sales Ledger Summary (നെറ്റ് സെയിൽസ് സമറി)
Provides real-time commercial reconciliation:
$$\text{Net Billed Turnover} = \text{Gross Billed Invoices} - \text{Total Sales Returns (Credit Notes)}$$

- **KPI Metric Banners:**
  - **Gross Billed Invoices:** Total commercial volume billed.
  - **Total Returns (Credit Notes):** Total value reversed under Section 34.
  - **Net Billed Turnover:** Actual collectible revenue.
  - **Active Return Doors:** Number of door panels currently returned for rework or restock.
- **Party-Wise Commercial Statement:**
  - Table itemizing each dealer / client account with Gross Billed, Sales Returns, Net Sales, and Outstanding Balance Due.

---

## 3. Multi-Theme Print Document Hub Integration

Both Tax Invoices and Credit Notes can be previewed, themed, and printed or exported to PDF across 5 industry-standard layouts:
1. **Tally Classic:** Traditional tabular layout with double borders and standard HSN/GST summary.
2. **Tally Modern:** Clean corporate styling with distinct section shading.
3. **Tally Formal:** High-density institutional audit format.
4. **Vyapar Elegant:** Modern retail/dealer presentation with brand color accents.
5. **Vyapar Clean Compact:** Optimized single-page layout for rapid delivery billing.

---

## 4. Verification & Testing

- **Automated Workflow Test:** [`scripts/test-sales-return-workflow.js`](file:///c:/Users/NAZER%20KARUMBAN/EXMARK-Projects/exmark-erp/scripts/test-sales-return-workflow.js) executed with 100% pass rate:
  - Verified 18% GST reversal computation (Rs. 20,060 on Rs. 17,000 taxable).
  - Verified Net Sales reconciliation ($\text{Rs. 133,340} - \text{Rs. 20,060} = \text{Rs. 113,280}$).
  - Verified factory floor rework routing and return reason mapping.
- **Dev Server HTTP Health:** Responding `STATUS: 200` OK on `http://localhost:3000`.
