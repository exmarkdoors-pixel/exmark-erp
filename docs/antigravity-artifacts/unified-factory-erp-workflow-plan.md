# Implementation Plan: Unified Factory ERP Workflow (Advance Gatekeeper, Bidirectional Stages, Tolerance Engine & Vouchers)

## 1. Goal Description
The user provided a comprehensive HTML blueprint for **EXMARK DOORS | Factory ERP, CRM & Production Floor**. This plan seamlessly brings the user's complete operational specification into the live Next.js ERP application:

1. **40% Mandatory Advance Gatekeeper Modal:**
   - In Sales Orders, orders with $< 40\%$ deposit show **Advance Pending**.
   - Clicking "Release to Press" opens the **Record Advance Deposit Modal** (with live percentage indicator, payment mode, UTR ref, and accounts verification).
   - Once verified ($\ge 40\%$), unlocks **Release to Press 🚀** into the factory floor.
2. **Bidirectional Stage Progression (Advance & Reverse Options):**
   - **CRM Leads Pipeline:** Advance $\to$ Next Stage (or Convert to Order 📦) | Reverse $\leftarrow$ Previous Stage | Follow-up action notes.
   - **Quotation & Sales Orders:** Advance $\to$ Next Step | Reverse $\leftarrow$ Previous Step (with rollback handling).
   - **Plant Floor Production:** Advance $\to$ Next Line (Press $\to$ CNC $\to$ Polish $\to$ QC $\to$ Dispatched) | Reverse $\leftarrow$ Previous Line (for rework/re-sizing) | 1-Click `Generate Tax Invoice 📄`.
3. **Door Measurement Book with Tolerance Deduction Engine:**
   - Sync directly from confirmed Sales Order / Quotation.
   - 4-point tape measurement: $H_{\text{Left}}$, $H_{\text{Right}}$, $W_{\text{Top}}$, $W_{\text{Bottom}}$ with 16th-inch fractions.
   - Rebate & Tolerance Deduction Engine: Side Frame Rebate (30–40mm), Bottom Floor Gap (10–20mm), Top & Hinge Gap (4–6mm).
   - Computes exact Master CM Shutter Cutting Size (e.g. `204.4 × 73.3 cm`) and Shutter Tape.
4. **Accounts, GST & Payment Vouchers (IN / OUT):**
   - Record Payment IN (വരവ് / Receipt) and Payment OUT (ചെലവ് / Payout) with linked invoice / order references.
   - Synchronized with Tax Invoices and Sales Orders.

---

## 2. Architecture & Workflow Integration

```
┌────────────────────────────────────────────────────────────────────────┐
│                        UNIFIED EXMARK ERP ENGINE                       │
├────────────────────┬────────────────────┬──────────────────────────────┤
│ 1. CRM PIPELINE    │ 2. QUOTATIONS & SO │ 3. PLANT FLOOR PRODUCTION    │
│  • New Inquiries   │  • Quote Builder   │  • Line 1: FRP Hyd. Press    │
│  • Measurement Sch.│  • 5 Print Themes  │  • Line 2: CNC Sizing        │
│  • Quote Submitted │  • 40% Advance Gate│  • Line 3: PU Polish / UV    │
│  • Final Negotiate │  • Release to Press│  • Line 4: Final QC & Pack   │
│  [⇄ Reverse/Adv]   │  [⇄ Reverse/Adv]   │  [⇄ Reverse/Adv & Rework]    │
├────────────────────┴────────────────────┴──────────────────────────────┤
│ 4. DOOR MEASUREMENT BOOK & TOLERANCE DEDUCTION ENGINE                  │
│  • 4-Point Inch Tape (HL, HR, WT, WB) → Master CM Shutter Cutting Size │
├────────────────────────────────────────────────────────────────────────┤
│ 5. ACCOUNTS & VOUCHERS: Payment IN (വരവ്) & Payment OUT (ചെലവ്)        │
└────────────────────────────────────────────────────────────────────────┘
```

---

## 3. Detailed Component Upgrades

### 3.1 Advance Deposit Gatekeeper Modal ([`QuotationHub.tsx`](file:///c:/Users/NAZER%20KARUMBAN/EXMARK-Projects/exmark-erp/components/modules/quotations/QuotationHub.tsx) & [`LeadsPipeline.tsx`](file:///c:/Users/NAZER%20KARUMBAN/EXMARK-Projects/exmark-erp/components/modules/crm/LeadsPipeline.tsx))
- **Modal Fields:**
  - Order ID, Customer Name, Total Order Value.
  - Mandatory 40% minimum calculation.
  - Deposit amount input with dynamic percentage progress.
  - Payment Mode (UPI, NEFT/RTGS, Cheque, Cash), Reference/UTR No, Verification note.
- **Action:**
  - When verified, updates order state: `advanceVerified: true`, `advancePaid: '40%+ Verified'`.
  - Records an automatic **Payment IN (വരവ്)** voucher into the financial log.
  - Unlocks the "Release to Press 🚀" action button!

---

### 3.2 Bidirectional Stage-by-Stage Controls
1. **CRM Pipeline (`LeadsPipeline.tsx`):**
   - Each lead card displays:
     `[ ↺ Reverse ] [ Follow-up Notes ] [ Advance → ]` (at Negotiation: `Convert to Order 📦`).
2. **Sales Order Tracker:**
   - Each order displays:
     `[ ↺ Rollback Step ] [ Advance Step → ]`
3. **Plant Floor Production (`ModuleViews.tsx`):**
   - Stages:
     `Line 1: FRP Press` $\rightleftarrows$ `Line 2: CNC Sizing` $\rightleftarrows$ `Line 3: PU Polish/UV` $\rightleftarrows$ `Line 4: QC Passed & Ready` $\rightarrow$ `Dispatched & Invoiced`.
   - Dual actions:
     `[ ↺ Reverse / Rework ]` and `[ Advance Stage → ]`
   - At Line 4: one-click `Generate Tax Invoice 📄` opens the 5-theme print hub!

---

### 3.3 Door Measurement Book & Tolerance Deduction Engine
Add the tolerance deduction panel:
- Inputs:
  - Masonry Outer Opening / Frame Opening (H-Left, H-Right, W-Top, W-Bottom with fractions).
  - Side Frame Rebate (30mm, 35mm, 40mm, 0mm).
  - Bottom Floor Clearance (10mm, 12mm, 15mm, 20mm).
  - Top & Hinge Gap (4mm, 5mm, 6mm).
- Formulas:
  $$\text{Shutter Height} = \frac{H_{\text{Left}} + H_{\text{Right}}}{2} - (\text{Bottom Clearance} + \text{Top Gap})$$
  $$\text{Shutter Width} = \frac{W_{\text{Top}} + W_{\text{Bottom}}}{2} - (\text{Side Rebate} \times 2 + \text{Hinge Clearance})$$
- Live Master CM display and tape inches display.

---

### 3.4 Accounts & Financial Vouchers Modal
- **Voucher IN (വരവ്):** Customer payments, order advances, balance settlements.
- **Voucher OUT (ചെലവ്):** Resin barrels, hardware, hinges, factory plant expenses.
- Summaries: Total Invoiced, Total Received, Balance Due, Total Paid Out.

---

## 4. Verification & Testing Plan

### 4.1 Automated Test Suite (`scripts/test-unified-workflow.ts`)
1. **Advance Deposit Verification:**
   - Under 40%: verifies release to press is blocked and deposit required.
   - At or above 40%: verifies release to press is unlocked.
2. **Bidirectional Stage Transitions:**
   - CRM forward and backward transitions.
   - Sales order forward and backward transitions.
   - Production lines forward and backward transitions.
3. **Tolerance Deduction Calculations:**
   - Outer frame $81\frac{1}{8}" \times 32"$ with 40mm rebate, 12mm floor gap, 5mm top gap produces exact shutter dimensions.
4. **Voucher Balancing:**
   - Total Invoiced, Received, Balance Due, and Paid Out reconcile accurately.

### 4.2 Manual Verification
- Verify in browser at `http://localhost:3000`:
  - Open Sales Orders and test the Advance modal.
  - Test reversing and advancing stages in CRM, Orders, and Production.
  - Test the Door Measurement Tolerance Engine.
  - Generate Tax Invoice and open the Multi-Theme Print Hub.
