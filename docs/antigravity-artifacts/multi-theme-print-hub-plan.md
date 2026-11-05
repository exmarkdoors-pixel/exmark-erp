# Implementation Plan: Multi-Theme Print Hub (Tally & Vyapar Styles for 5 Document Types)

## 1. Goal Description
The user requested 4 to 5 print themes inspired by **Tally** (3 options) and **Vyapar** (2 options) supporting 5 document types:
1. **Quotation (Estimate)**
2. **Proforma Invoice**
3. **Sales Order (Work Order)**
4. **Sales Invoice (Tax Invoice)**
5. **Party Statement (Customer Account Ledger)**

This plan designs and integrates a multi-theme document generator with interactive switching, persistent theme preference, and pixel-perfect A4 printing.

---

## 2. Print Theme Architecture

```
┌────────────────────────────────────────────────────────────────────────┐
│                        PRINT DOCUMENT HUB MODAL                        │
├────────────────────────────────────────────────────────────────────────┤
│ Document Type: [ Quotation | Proforma | Sales Order | Sales | Statement]│
│ Print Theme:   [🏛️ Tally Classic | 📊 Tally Modern | 📋 Tally Formal    │
│                 🎨 Vyapar Elegant | 🏷️ Vyapar Modern ]      [🖨️ Print]│
├────────────────────────────────────────────────────────────────────────┤
│                                                                        │
│                       LIVE A4 DOCUMENT PREVIEW                         │
│       (Dynamically renders selected theme with company letterhead,     │
│        dimensions, HSN, 3-way GST, Bank RTGS details, or Party Ledger)  │
│                                                                        │
└────────────────────────────────────────────────────────────────────────┘
```

### The 5 Distinct Themes

| Theme ID | Style Name | Inspiration | Visual & Structural Characteristics |
|---|---|---|---|
| `tally-classic` | **Tally Classic** | Tally ERP 9 / Tally Prime Simple Format | Traditional double-line borders, clean monospaced layout, boxed header, HSN/SAC summary, formal declaration, and banker details. |
| `tally-modern` | **Tally Modern** | Tally Prime Modern Grid | Dark slate/navy highlighted table headers, distinct tax breakdown block (CGST / SGST / IGST split with % and Amount), terms of delivery. |
| `tally-formal` | **Tally Formal** | Comprehensive Tax Invoice | Dual side-by-side Buyer vs Consignee dispatch boxes, e-Way bill & vehicle number fields, dual signature blocks (Authorized Signatory & Receiver's Seal). |
| `vyapar-elegant` | **Vyapar Elegant** | Vyapar App Color Card Theme | Rose brand accent header banner, company logo badge, rounded party cards, alternating zebra rows, status badge stamp, and UPI QR code box for instant payment. |
| `vyapar-modern` | **Vyapar Modern** | Vyapar Clean Retail Theme | High-contrast minimalist layout, large highlighted Net Payable box, clear door specifications callouts (e.g. `Size: 80 1/8" × [Top: 32" / Btm: 32 3/16"]`), terms and conditions in numbered badges. |

---

## 3. The 5 Supported Document Types

1. **Quotation (Estimate / Rate Proposal):**
   - Title: `QUOTATION / ESTIMATE`
   - Shows valid door rates, dimensions with fractions, valid period (15 days), advance terms.
2. **Proforma Invoice (Advance Commercial Bill):**
   - Title: `PROFORMA INVOICE`
   - Highlights advance payment term (50% Advance Required) and bank RTGS/NEFT accounts.
3. **Sales Order (Factory Work Order):**
   - Title: `SALES WORK ORDER`
   - Displays confirmed specifications, stage tracker, production schedule, QC standard (IS 14856:2000).
4. **Sales Invoice (Tax Invoice):**
   - Title: `TAX INVOICE (GST BILL)`
   - Full statutory GST breakdown (CGST 9% + SGST 9% or IGST 18%), HSN Code `39252000` (Plastic/FRP/WPC Doors), Invoice Number, E-way bill details.
5. **Party Statement (Customer Account Ledger):**
   - Title: `PARTY ACCOUNT STATEMENT / LEDGER`
   - Displays Customer Name, GSTIN, Address, Date Range, Opening Balance, Table of transactions (Date, Particulars, Voucher Type, Debit, Credit, Running Balance), and Closing Outstanding Balance.

---

## 4. Proposed Changes

### 4.1 Component Creation: `components/modules/quotations/PrintDocumentHub.tsx`
Create a dedicated multi-theme print component that receives:
- `documentType`: `'quotation' | 'proforma' | 'salesOrder' | 'salesInvoice' | 'statement'`
- `theme`: `'tally-classic' | 'tally-modern' | 'tally-formal' | 'vyapar-elegant' | 'vyapar-modern'`
- `quotation`: Active quotation or customer data
- `customer`: Customer profile details
- `statementData`: Customer transaction ledger records

### 4.2 Integration into `QuotationHub.tsx`
- Replace single `#printableQuoteArea` with `<PrintDocumentHub />`.
- Add interactive controls in the modal header:
  - Document Mode selector pills (`Quotation`, `Proforma`, `Sales Order`, `Tax Invoice`, `Statement`).
  - Theme Selector pills with live instant switching.
  - Remembers default theme in `localStorage.getItem('exmark_print_theme')`.
- CSS `@media print` rules ensuring exact page boundaries and crisp monochrome or color print rendering.

---

## 5. Verification Plan

### 5.1 Automated Tests (`scripts/test-print-themes.ts`)
1. Verify all 5 themes render required metadata (Company details, GSTIN, Bank details).
2. Verify all 5 document modes render proper headings, status stamps, and statutory notices.
3. Verify Party Statement correctly calculates opening balance, transactions, and closing balance.
4. Verify dimensions formatting (fractions, Top/Bottom widths) displays properly in each theme.

### 5.2 Manual Verification
- Launch `http://localhost:3000` and open Quotations section.
- Click "View / Print" on any quotation.
- Switch between all 5 themes (`Tally Classic`, `Tally Modern`, `Tally Formal`, `Vyapar Elegant`, `Vyapar Modern`).
- Switch between all 5 document types (`Quotation`, `Proforma`, `Sales Order`, `Sales Invoice`, `Party Statement`).
- Trigger print preview (`Ctrl + P`) and verify clean A4 layout.
