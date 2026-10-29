# EXMARK ERP — Implementation Roadmap

**Enterprise Phased Rollout Plan: Factory, Cloud & Multi-Terminal Workstations**

---

## Phase 1: Audit and Recovery (COMPLETED & VERIFIED)
- [x] Full codebase structure, dependency, and build script audit.
- [x] Protect credentials; isolate connection strings to gitignored `.env*` files.
- [x] Diagnose Render staging build exit code 1 blocker (`scripts/deploy-migrate.mjs`).
- [x] Resolve Supabase pooler SSL handshake timeout (3,500ms query probe).
- [x] Add foreign key existence guards for `customerId` and `measuredById` in Site Measurements.
- [x] Connect Dashboard Executive KPIs to live PostgreSQL aggregates with JSON fallback.
- [x] Author comprehensive project documentation and deployment runbooks.

---

## Phase 2: Core Platform & Database Synchronization (COMPLETED & VERIFIED)
- [x] Implement robust Role-Based Access Control (RBAC) across 10 functional roles.
- [x] Review 29-table PostgreSQL DDL migration (`20261028000000_init`).
- [x] Configure Supabase session pooler on port 5432 for schema DDL migrations.
- [x] Configure Supabase transaction pooler on port 6543 for web client runtime pooling.
- [x] Build authenticated remote schema inspection & migration route (`/api/system/migrate`).
- [x] Ensure strict cloud write guards (`assertWriteAllowed`) block ephemeral writes when DB offline.

---

## Phase 3: Customer CRM, Site Measurements & Quotations (COMPLETED & VERIFIED)
- [x] Kerala 14 Districts CRM lead capture with follow-up tracking.
- [x] 4-Point precision door measurement system (Height L/R, Width Top/Bottom, Rebate, Handing).
- [x] Itemized BOQ schedule generator with automated square-footage calculations.
- [x] GST 18% quotation generation under HSN Code 3925.20.00.
- [x] Strict 40% accounts advance gate before work order release to manufacturing.

---

## Phase 4: FRP Manufacturing, Quality Control & Tracking (COMPLETED & VERIFIED)
- [x] Production planning and Job Card release (`JC-2026-XXX`).
- [x] Finished door cutting deduction engine (`Finished = Raw - Frame Allowance`).
- [x] Deterministic unique Door ID generation (`EXM-DR-2026-XXXX`).
- [x] A4 12-label yellow sticker sheet layout (2x6 grid) with adjustable margins and calibration.
- [x] Final QC inspection checklist with rework recording (6-point technical QA).
- [x] Temporary tracking QR generation with post-installation sticker removal confirmation (`/track/[doorId]`).

---

## Phase 5: Finance, Logistics & 15-Year FRP Warranty (COMPLETED & VERIFIED)
- [x] GST Tax Invoicing (CGST 9% + SGST 9%) with partial payment tracking.
- [x] Dispatch scheduling and delivery challan generation.
- [x] 5-Star customer installation signoff with photographic attachment.
- [x] 15-Year FRP Material Warranty Certificate with mandatory hardware exclusion notice.
- [x] Dual Malayalam and English maintenance care instructions.
- [x] AI Financial Strategist with 13-week cashflow forecast and read-only governance.

---

## Phase 6: Reporting, Communications & Multimodal (COMPLETED & VERIFIED)
- [x] Universal Reporting Center covering CRM, Orders, Plant Load, Inventory, and Finance.
- [x] PDF, Excel, and CSV multi-format exports (`?format=csv` and `?format=excel`).
- [x] Official WhatsApp Cloud API integration adapter for one-click document dispatch.
- [x] Customer measurement confirmation portal with expiring revocable tokens.
- [x] Multimodal Video Report Summary generator adapter with timestamped data snapshots and Malayalam script.

---

## Phase 7: Multi-Terminal Deployment & Offline Resilience (COMPLETED & VERIFIED)
- [x] Progressive Web App (PWA) with mobile manifest (`manifest.json`) and service worker (`sw.js`).
- [x] Electron Windows Desktop configuration (`electron-builder.yml` and `electron/main.js`).
- [x] Automated Windows Backup Agent with SHA-256 cryptographic verification (31 restore points retained).
- [x] Optimistic concurrency control (`validateAndBumpVersion`) and 5-minute heartbeat editing leases (`409 Conflict`).
- [x] Universal URL sanitization preventing `P1013` scheme parse errors on Render staging.

---

## Phase 8: Final Enterprise Verification & Signoff (COMPLETED & VERIFIED)
- [x] End-to-end multi-user concurrency testing across factory and office terminals (27/27 PASS).
- [x] Zero-data-loss failover test between PostgreSQL and local Outbox queue (18/18 PASS).
- [x] Comprehensive 12-suite regression execution with 352 passing assertions (100% pass rate).
- [x] Next.js 16.4.3 production build compilation with zero errors across all 35 routes.
- [x] Synchronized Git release commits pushed to GitHub `origin/main` (`exmarkdoors-pixel/exmark-erp`).
