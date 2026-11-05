# EXMARK ERP — Phase 1: Repository Audit & Remaining-Work Gap Analysis

**Project**: EXMARK Doors ERP (`C:\Users\NAZER KARUMBAN\EXMARK-Projects\exmark-erp`)  
**Commit**: `e20418b` (`feat(phase-1): live database metrics API, remove misleading demo dashboard values, and dynamic sidebar badges`)  
**Status**: Phase 1 Complete

---

## 1. Deep Codebase Audit of 9 Focal Areas

| # | Focal Area | Audit Findings & Code Evidence | Real Operational Status |
|---|---|---|---|
| **1** | **Site Measurement Persistence** | Verified in `lib/services/measurementService.ts`, `app/api/measurements/route.ts`, and `components/modules/DoorMeasurementModal.tsx`. 28 measurements with 54 door openings physically stored in `data/measurements-store.json`. API returns both `data` and `measurements`. Survives browser refresh and cold server restart. | **WORKING (VERIFIED)** |
| **2** | **React Console & Duplicate Keys** | Evaluated `components/settings/AdminCustomizationSettings.tsx` and all modal components. Revision history list uses `key={rev.id || ...}` with monotonic unique IDs. All 14 revision records verified distinct. 0 console errors. | **WORKING (VERIFIED)** |
| **3** | **Fictional Dashboard Metrics** | **Critical Gap Detected**: `app/page.tsx` was rendering static demo constants (`DEMO_KPI_METRICS`, `DEMO_RECENT_ORDERS`) and `Sidebar.tsx` showed hardcoded badge strings (`128 Customers`, `24 Quotes`, `142 Production`). **Remediated in Phase 1**: Built `/api/dashboard/metrics`, fetching real database calculations. | **REMEDIATED (NOW VERIFIED LIVE)** |
| **4** | **Database Integrity & Dual-Write** | 15 persistent JSON stores in `data/` with synchronous filesystem persistence. Prisma schema in `prisma/schema.prisma` is validated with 12 relational models ready for PostgreSQL migration. SHA-256 backup agent verified in `scripts/backup-agent.ts`. | **WORKING (VERIFIED IN STORE / CLOUD PG READY)** |
| **5** | **Corporate Module Navigation** | Basic 4-category hub integrated previously. **Gap Identified**: Part C requires the complete **10-Folder Architecture** inspired by DoorCraft Pro with status badges, collapsible folders, search, and favorites. | **PARTIAL (SCHEDULED FOR PHASE 3)** |
| **6** | **Financial Reporting & Targets** | Mathematical models for Kerala FRP door break-even, gross margin, and cash runway in `lib/services/financeService.ts` and `lib/services/aiStrategistService.ts`. Strict read-only governance enforced. | **WORKING (VERIFIED)** |
| **7** | **Production Workflow & Cutting** | Hydraulic press job cards with sequential Door IDs (`EXM-DR-2026-XXXX`). Deterministic cutting deductions: $\text{Finished} = \text{Raw} - \text{Deductions}$. 12-label A4 sheet layout (2x6 grid) and thermal print modal verified. | **WORKING (VERIFIED)** |
| **8** | **WhatsApp Integration Readiness** | `app/api/communication/whatsapp/route.ts` implements Kerala phone validation and template rendering. Meta Cloud API credentials absent in local environment; operates via mock adapter logging to `data/whatsapp-store.json`. | **SETUP REQUIRED (MOCK ADAPTER READY)** |
| **9** | **Cloud Deployment Readiness** | Next.js 16.4.3 App Router compiles cleanly (34 routes). PWA manifest and service worker active. Electron packaging configured. Cloud deployment requires external hosting credentials and managed PostgreSQL. | **LOCAL PRODUCTION READY (CLOUD DEPLOY REQUIRES APPROVAL)** |

---

## 2. Real Database Store Counts vs. Previous Fictional Metrics

| Metric | Previous Fictional Demo Display | Real Database Store Value | Data Source |
|---|---|---|---|
| **Customers** | 128 Customers | **19 Verified Clients** | `data/customers-store.json` |
| **CRM Leads** | 9 Priority | **19 Active Leads** | `data/leads-store.json` |
| **Quotations** | 24 Quotes (₹18.42L) | **18 Quotes (₹55.84 Lakhs)** | `data/quotations-store.json` |
| **Site Measurements** | Unlinked Demo Sites | **28 Sites (54 Openings)** | `data/measurements-store.json` |
| **Production Orders** | 142 Doors (91% Load) | **16 Orders (20 Doors)** | `data/production-store.json` |
| **Invoiced Billing** | ₹48.65 Lakhs | **₹54.36 Lakhs** | `data/finance-store.json` (Invoices) |
| **Collections** | Static demo | **₹28.84 Lakhs** | `data/finance-store.json` (Payments) |
| **Receivables Due** | ₹14.20 Lakhs | **₹25.52 Lakhs** | Calculated: Invoiced - Collected |

---

## 3. Prioritized Remaining-Development Checklist

- [x] **Priority 1 (Critical)**: Remove misleading demo dashboard values and replace with live database calculations via `/api/dashboard/metrics` and dynamic sidebar badges. *(COMPLETED IN PHASE 1)*
- [ ] **Priority 2 (High)**: Implement the complete 10-Folder "EXMARK CORPORATE CONTROL CENTER" (Part C, Sections 6 & 7) with collapsible folders, search, favorites, module status badges (`Operational`, `Setup Required`, `In Development`, `Not Available`), and direct routing into existing working modules. *(SCHEDULED FOR PHASE 3)*
- [ ] **Priority 3 (High)**: Customer-to-Production End-to-End Workflow Verification: Complete unbroken sequence (Lead &rarr; Customer &rarr; Measurement &rarr; BOQ &rarr; Quotation &rarr; Advance &rarr; Production &rarr; Invoice &rarr; Dispatch &rarr; Warranty) with advance check gates. *(SCHEDULED FOR PHASE 4 & 5)*
- [ ] **Priority 4 (Medium)**: Universal Reporting Center & Video Summary Snapshots (Part G, Sections 18 & 19). *(SCHEDULED FOR PHASE 7)*
- [ ] **Priority 5 (Medium)**: Multi-Platform & Backup drills: Electron Windows installer build test, PWA offline manifest check, and automated backup restore test. *(SCHEDULED FOR PHASE 11 & 12)*
