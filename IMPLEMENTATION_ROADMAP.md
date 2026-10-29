# EXMARK ERP — Implementation Roadmap

**Enterprise Phased Rollout Plan: Factory, Cloud & Multi-Terminal Workstations**

---

## Phase 1: Audit and Recovery (Current Phase)
- [x] Full codebase structure, dependency, and build script audit.
- [x] Protect credentials; isolate connection strings to gitignored `.env*` files.
- [x] Diagnose Render staging build exit code 1 blocker (`scripts/deploy-migrate.mjs`).
- [x] Resolve Supabase pooler SSL handshake timeout (3,500ms query probe).
- [x] Add foreign key existence guards for `customerId` and `measuredById` in Site Measurements.
- [x] Connect Dashboard Executive KPIs to live PostgreSQL aggregates with JSON fallback.
- [x] Author comprehensive project documentation and deployment runbooks.

---

## Phase 2: Core Platform & Database Synchronization
- [x] Implement robust Role-Based Access Control (RBAC) across 10 functional roles.
- [x] Review 29-table PostgreSQL DDL migration (`20261028000000_init`).
- [x] Configure Supabase session pooler on port 5432 for schema DDL migrations.
- [x] Configure Supabase transaction pooler on port 6543 for web client runtime pooling.
- [x] Build authenticated remote schema inspection & migration route (`/api/system/migrate`).
- [x] Ensure strict cloud write guards (`assertWriteAllowed`) block ephemeral writes when DB offline.

---

## Phase 3: Customer CRM, Site Measurements & Quotations
- [x] Kerala 14 Districts CRM lead capture with follow-up tracking.
- [x] 4-Point precision door measurement system (Height L/R, Width Top/Bottom, Rebate, Handing).
- [x] Itemized BOQ schedule generator with automated square-footage calculations.
- [x] GST 18% quotation generation under HSN Code 3925.20.00.
- [x] Strict 40% accounts advance gate before work order release to manufacturing.

---

## Phase 4: FRP Manufacturing, Quality Control & Tracking
- [x] Production planning and Job Card release (`JC-2026-XXX`).
- [x] Finished door cutting deduction engine (`Finished = Raw - Frame Allowance`).
- [x] Deterministic unique Door ID generation (`EXM-DR-2026-XXXX`).
- [x] A4 12-label yellow sticker sheet layout (2x6 grid) with adjustable margins and calibration.
- [x] Final QC inspection checklist with rework recording.
- [x] Temporary tracking QR generation with removal confirmation post-installation.

---

## Phase 5: Finance, Logistics & 15-Year FRP Warranty
- [x] GST Tax Invoicing (CGST 9% + SGST 9%) with partial payment tracking.
- [x] Dispatch scheduling and delivery challan generation.
- [x] 5-Star customer installation signoff with photographic attachment.
- [x] 15-Year FRP Material Warranty Certificate with mandatory hardware exclusion notice.
- [x] Dual Malayalam and English maintenance care instructions.
- [x] AI Financial Strategist with 13-week cashflow forecast and read-only governance.

---

## Phase 6: Reporting, Communications & Multimodal
- [x] Universal Reporting Center covering CRM, Orders, Plant Load, Inventory, and Finance.
- [x] PDF, Excel, and CSV multi-format exports.
- [x] Official WhatsApp Cloud API integration adapter for one-click document dispatch.
- [x] Customer measurement confirmation portal with expiring revocable tokens.
- [x] Video Report Summary generator adapter with timestamped data snapshots.

---

## Phase 7: Multi-Terminal Deployment & Offline Resilience
- [x] Progressive Web App (PWA) with mobile manifest and service worker.
- [x] Electron Windows Desktop configuration (`electron-builder.yml`).
- [x] Windows Backup Agent with SHA-256 cryptographic verification.
- [ ] Windows Desktop Installer package build (`EXMARK-ERP-Setup.exe`).
- [ ] Staging database schema activation on live Supabase instance.
- [ ] Production cutover and domain mapping (`erp.exmarkdoors.com`).

---

## Phase 8: Final Enterprise Verification & Signoff
- [ ] End-to-end multi-user concurrency testing across factory and office terminals.
- [ ] Zero-data-loss failover test between PostgreSQL and local Outbox queue.
- [ ] Executive walkthrough and administrator handover.
