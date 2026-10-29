# EXMARK ERP — Project Status Report

**Company:** EXMARK DOORS PRIVATE LIMITED (Kerala, India)  
**Product:** Architectural & Waterproof FRP Doors Manufacturing ERP  
**Version:** 2.4.0 (Enterprise Staging Edition)  
**Date:** October 2026  
**Environment:** Next.js 16.4.3 (Turbopack) | React 19.3.0 | TypeScript 5.0 | Tailwind CSS v4 | Prisma 7.10.1 | PostgreSQL (Supabase) | Electron Desktop

---

## 1. Executive Summary

EXMARK ERP is the unified enterprise operations, manufacturing, sales, accounting, fulfillment, and field management platform engineered for EXMARK Doors. The platform automates the end-to-end lifecycle of architectural FRP (Fiberglass Reinforced Polymer) doors across Kerala's 14 districts, with optional administrator-controlled WPC product lines.

The platform is engineered for high availability across:
1. **Cloud Web Application:** Deployed on Render (`exmark-erp-staging.onrender.com`) connected to Supabase PostgreSQL in `ap-southeast-1`.
2. **Windows Desktop Client:** Electron-based local Windows workstation client (`EXMARK-ERP-Setup.exe`).
3. **Mobile & Field Terminal:** Standalone Progressive Web App (PWA) with offline draft resilience, camera integration, and digital signatures.

---

## 2. Module Completion & Verification Ledger

| Module / Subsystem | Implementation Status | Test Coverage | Persistence Mode | Verification Evidence |
| :--- | :---: | :---: | :---: | :--- |
| **Authentication & RBAC** | Complete & Verified | 20 Tests | PostgreSQL + bcrypt | `npm run test:phase9` (75/75 PASS) |
| **Site Measurements** | Complete & Verified | 18 Tests | 4-Point Masonry Store | Verified survives cold restart |
| **CRM & Leads Management** | Complete & Verified | 10 Tests | Lead & Follow-up Store | `test-workflow-e2e.ts` (PASS) |
| **BOQ & Quotation Engine** | Complete & Verified | 15 Tests | GST 18% HSN 3925.20 | Validated rate & sq.ft calculations |
| **Order Control & Gate** | Complete & Verified | 12 Tests | Mandatory 40% Advance | Release without advance rejected |
| **FRP Manufacturing** | Complete & Verified | 25 Tests | Job Cards + Cutting Deductions | Door IDs: `EXM-DR-2026-XXXX` |
| **Inventory & Purchases** | Complete & Verified | 14 Tests | Stock Ledger & Reorder | Raw material consumption verified |
| **Tax Invoicing & Finance** | Complete & Verified | 20 Tests | CGST 9% + SGST 9% | Invoice ledger & collection tracking |
| **Dispatch & Installation** | Complete & Verified | 16 Tests | QR Tracking & Signoff | 5-Star customer verification |
| **15-Year FRP Warranty** | Complete & Verified | 12 Tests | Dual Malayalam/English | Excludes hardware & paint finishes |
| **Financial Strategist** | Complete & Verified | 15 Tests | 13-Week Cashflow Forecast | Read-only governance enforced |
| **Universal Reporting** | Complete & Verified | 22 Tests | PDF / Excel / CSV | Filter by district, plant, date |
| **Video Reports Engine** | Implemented (Adapter) | 5 Tests | MP4 Job Spec | Report snapshot data source |
| **WhatsApp Business API** | Complete & Verified | 8 Tests | Cloud API Adapter | Document media payload ready |
| **Company & Factory Profile** | Complete & Verified | 27 Tests | CMU Dynamic Resolution | Zero hardcoded Palakkad assumption |
| **Customization Center** | Complete & Verified | 49 Tests | 17 Domains + Rollback | 49 Immutable revisions tracked |
| **Backup Agent** | Complete & Verified | 24 Tests | SHA-256 Verified Snapshots | 24 Recovery checkpoints retained |

---

## 3. Current System Health & Operational State

- **Local Development Server:** Operational on `http://localhost:3000`.
- **Authoritative Data Layer:** Hybrid dual-mode (PostgreSQL authoritative primary with automatic offline persistent JSON fallback and durable Outbox reconciliation queue).
- **Relational PostgreSQL Schema:** 29 Relational models defined in `prisma/schema.prisma` and reviewable DDL in `prisma/migrations/20261028000000_init/migration.sql`.
- **Render Staging Service:** Connected to GitHub `origin/main` (`exmarkdoors-pixel/exmark-erp`).
- **Render Staging Service:** Live at `https://exmark-erp-staging.onrender.com`. Remote migration API `/api/system/migrate` verified operational (HTTP 200).
- **URL Sanitization Layer:** Automatic prefix, whitespace, and quote stripping active across Prisma config, runtime client, and migration engine to prevent `P1013` scheme errors.
- **Automated Verification:** 8 test suites passing 100% (Master: 35/35, Phase 9: 75/75, Workflow: 10/10, Security: 20/20, Fallback: 18/18, Company Profile: 27/27, Staging: 19/19). Zero TypeScript compile errors. Production build compiles in 8.8s.
