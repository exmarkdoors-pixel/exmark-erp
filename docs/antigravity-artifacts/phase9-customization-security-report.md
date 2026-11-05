# EXMARK ERP — Phase 9: Customization, Access Control & Security Hardening Report

## Executive Summary
This report documents the completion of **Phase 9: Customization, Access Control and Security Hardening** for EXMARK ERP (Palakkad Central Manufacturing Plant & Kerala Office Stations). 

All 17 administrative customization domains, the draft/preview/publish/rollback lifecycle engine, and authoritative server-side role-based authorization barriers have been built, integrated into the database-backed storage layer, and verified through automated test suites with 0 ESLint warnings and clean production builds.

---

## 1. Master Admin Customization Engine (All 17 Domains)

Implemented via [`lib/services/customizationService.ts`](file:///c:/Users/NAZER%20KARUMBAN/EXMARK-Projects/exmark-erp/lib/services/customizationService.ts) and persisted in [`data/customization-store.json`](file:///c:/Users/NAZER%20KARUMBAN/EXMARK-Projects/exmark-erp/data/customization-store.json):

1. **Product Category Enable/Disable**:
   - **FRP Doors**: Primary category, permanently enabled by default (`enabled: true, immutable: true`). Cannot be deactivated by any user or draft attempt.
   - **WPC Doors**: Optional secondary line, disabled by default (`enabled: false`). When disabled, WPC doors are completely hidden from new measurement bookings, quotations, sales targets, and plant production boards.
   - **Future Categories**: Extensible custom categories array.
2. **Dynamic Fields**:
   - Custom field registry per module (`measurements`, `customers`, `orders`, `production`, `finance`) with `fieldKey`, `fieldLabel`, `fieldType`, `isRequired`, and `isActive` flags.
3. **Dropdown Options Master**:
   - Global configurable lists for Door Models (FRP Molded Teak, CNC Carved Luxury, Fire-Retardant FRP, Weather-Shield Exterior), PU Woodgrain Colours (Burma Teak, Frost White, Rosewood Kerala Finish, Walnut, Mahogany), Frame Types (WPC 100x65, FRP Monolithic Wrap, Granite Subframe, Existing Wood Rebate), Hinge Sides (LH Inward, RH Inward, LHR, RHR), and Lock Models (Mortise 60mm, Baby Latch, Cylindrical SS 304, Digital Smart Lock prep).
4. **Document Numbering Sequences**:
   - Configurable prefixes, year formats, and zero-padded sequence digits for `MSR-YYYY-XXXX`, `QTN-YYYY-XXXX`, `ORD-YYYY-XXXX`, `INV-YYYY-XXXX`, `RCT-YYYY-XXXX`, `JOB-YYYY-XXXX`, `EXM-DR-YYYY-XXXX`, and `EXM-WRN-YYYY-XXXX`.
5. **Order Status Workflows**:
   - Configurable 8-stage lifecycle: `DRAFT` &rarr; `AWAITING_ADVANCE` &rarr; `PAYMENT_VERIFIED` &rarr; `CONFIRMED` &rarr; `IN_PRODUCTION` &rarr; `READY_TO_DISPATCH` &rarr; `DELIVERED` / `CANCELLED`.
6. **Workflow Business Rules**:
   - Enforced gate checks: Verified site measurement required before cutting release; minimum 40% advance required before production release; auto-locking of issued invoices.
7. **Approval Thresholds**:
   - Financial approval rules: Maximum sales executive discount (15%); high-value order signoff threshold (₹5,00,000); mandatory reason logging for manager overrides.
8. **Frame and Cutting Tolerances (Deterministic Formulas)**:
   - FRP Height Deduction: `-10mm`; FRP Width Deduction: `-8mm`; Granite subframe offset: `12mm`. Strict safeguard: `allowNegativeDimensions: false` prevents negative cutting values.
9. **Price Lists**:
   - Standard pricing masters: Base FRP Rate ₹265/sq.ft, Base WPC Rate ₹290/sq.ft, CNC Carving Surcharge +₹75/sq.ft, Digital Lock Prep +₹450/door, Installation +₹650/door.
10. **Kerala GST Configuration**:
    - Official compliance parameters: Kerala GSTIN `32AABCE1234F1Z5`, HSN `3925.20.00`, CGST 9% + SGST 9% (18% total), e-Way bill threshold ₹50,000.
11. **Financial Targets**:
    - Monthly operational targets: Sales Revenue ₹75,00,000, Collections ₹65,00,000, FRP Door volume 450 doors, minimum gross margin 35%.
12. **Report Templates**:
    - Configurable templates: 14 Kerala Districts Sales Ledger, Palakkad Plant Efficiency & Yield, Receivables Aging (30/60/90 days), and FRP Model Profitability.
13. **PDF Document Layouts**:
    - Branding headers, Palakkad central plant address, contact numbers, bilingual Malayalam/English care instructions, QR code integration, and authorized signatory blocks.
14. **15-Year FRP Material Warranty Policies**:
    - Official warranty policy: 15-Year coverage for FRP monolithic door slabs (termite, water absorption, rot proof). Explicit exclusions: hinges, locks, handles, coatings, and building settlement.
15. **Notification Templates**:
    - Pre-formatted SMS & Email triggers for quotation dispatch, advance payment receipt, fleet vehicle tracking, and installation sign-off.
16. **WhatsApp Cloud API Sending Rules**:
    - Automated dispatch triggers for 72-hour measurement confirmation links, live delivery driver contact sharing, and warranty certificate delivery in Malayalam & English.
17. **Employee Role Permissions Matrix**:
    - Granular permissions mapping across all 9 roles covering module access, production approval, financial authorization, user management, and settings publishing.

---

## 2. Customization Lifecycle: Draft, Publish, History & Rollback

- **Drafting**: Super Admin edits can be saved in working draft state (`action: 'SAVE_DRAFT'`) without immediately altering factory operations.
- **Preview**: Live toggle in [`AdminCustomizationSettings.tsx`](file:///c:/Users/NAZER%20KARUMBAN/EXMARK-Projects/exmark-erp/components/settings/AdminCustomizationSettings.tsx) to inspect calculated tolerances, pricing, and document numbers.
- **Publishing**: Atomic promotion of draft to active configuration (`action: 'PUBLISH'`), incrementing version number, generating an audit log entry, and storing a snapshot in the revision ledger.
- **Revision History**: Comprehensive log of all past versions with author, timestamp, and changelog notes.
- **1-Click Rollback**: Ability to revert the active system configuration to any previous revision version safely without data loss.

---

## 3. Server-Side Authorization & Security Hardening

Created universal authorization middleware in [`lib/auth/authorization.ts`](file:///c:/Users/NAZER%20KARUMBAN/EXMARK-Projects/exmark-erp/lib/auth/authorization.ts):

| Module / Operation | API Route | Allowed Roles | Denied Roles (403 Forbidden) |
| :--- | :--- | :--- | :--- |
| **Admin Settings & Customization** | `/api/settings/customizations` | Super Admin, Management | Sales, Accounts, Production, Inventory, Installation |
| **System Backups** | `/api/system/backup` | Super Admin | All non-admin roles |
| **Financial Invoicing** | `/api/finance/invoices` | Accounts, Super Admin | Sales, Production, Inventory, Installation |
| **Financial Payments** | `/api/finance/payments` | Accounts, Super Admin | Sales, Production, Inventory, Installation |
| **Inventory Stock Adjustments** | `/api/inventory` | Inventory, Super Admin | Sales, Accounts, Production, Installation |
| **Production Approvals & Job Cards** | `/api/production` | Production, Super Admin, Management | Accounts, Inventory, Installation, Sales |
| **Quotations** | `/api/quotations` | Sales, Super Admin, Management | Production, Inventory, Installation, Accounts |
| **Employee Roster & User Mgmt** | `/api/employees` | HR, Super Admin, Management | Sales, Production, Inventory, Installation |
| **WhatsApp Dispatch** | `/api/communication/whatsapp` | Sales, Installation, Super Admin | Inventory, Purchase, Production |

### Accounting Ledger & Issued Document Protection
- Invoices marked as `ISSUED` or `PAID` cannot be altered or voided by non-admin staff.
- Reconciled payment receipts are protected from tampering.
- Password hashes and sensitive authentication secrets are strictly scrubbed from all API responses.

---

## 4. Verification Test Results

### 1. Phase 9 Security Suite (`npm run test:phase9`)
Executed via [`scripts/test-phase9-security.ts`](file:///c:/Users/NAZER%20KARUMBAN/EXMARK-Projects/exmark-erp/scripts/test-phase9-security.ts):
- FRP enabled by default & immutable safeguard: **PASSED**
- WPC disabled by default and toggled in draft: **PASSED**
- All 17 Customization Domains verified: **PASSED**
- Publish, revision history, and 1-click rollback: **PASSED**
- Server-side RBAC enforcement (Super Admin, Sales, Accounts, Production, Inventory, Installation): **PASSED**
- Password hash salting & sensitive data non-exposure: **PASSED**
- **Result: 70 / 70 Passed (0 Failed)**

### 2. Master Acceptance Suite (`npm run test:master`)
All 35 master acceptance tests across Phases 1 through 9: **35 / 35 Passed (0 Failed)**

### 3. Code Quality & Production Build
- **ESLint (`npx eslint --max-warnings 0`)**: 0 errors, 0 warnings.
- **Next.js Production Build (`npm run build`)**: 33 / 33 routes compiled successfully.
