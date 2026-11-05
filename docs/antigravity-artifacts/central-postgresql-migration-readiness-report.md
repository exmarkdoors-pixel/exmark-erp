# EXMARK ERP — Central PostgreSQL Database Architecture & Safe Migration Readiness Report

**Project**: EXMARK Doors ERP — Kerala FRP & WPC Door Manufacturing Business Management System  
**System Architecture**: Next.js 16.4.3 (Turbopack) | React 19 | TypeScript 5 | Prisma ORM 7.10.1  
**Author**: Lead Enterprise ERP Architect, Database Migration Specialist & Systems Auditor  
**Date**: October 28, 2026  
**Status**: **PRE-CUTOVER VERIFIED & AUDITED (HALTED BEFORE LIVE COMMIT AS INSTRUCTED)**  

---

## Executive Summary

Pursuant to the central database architectural mandate, this report documents the comprehensive audit, safe version-controlled migration pipeline, outbox sync engine, and hosting cost analysis for transitioning EXMARK ERP from local persistent JSON stores to an enterprise Central PostgreSQL Database.

### Audit & Verification Highlights
- **Active Business Datastores**: 16 JSON stores in `data/` totaling 676,758 bytes across all core domains.
- **Pre-Migration Master Backup**: Snapshot ID `EXM-BAK-20261028165828-SCH` verified with 100% SHA256 checksum match across all 16 stores.
- **DDL Migration Script**: Version-controlled initial migration `prisma/migrations/20261028000000_init/migration.sql` prepared for all 29 relational models.
- **Migration Engine Dry-Run**: 21 entity types verified with **0 integrity errors**.
- **Financial Balance Reconciliation**: **0.00 Variance** across ₹70,41,200 in sales, ₹36,84,000 in collections, and ₹33,57,200 in receivables.
- **Split-Brain Prevention**: Enforced via `lib/services/dbSyncEngine.ts` with strict PostgreSQL mode (`options.strictPostgres: true` returns HTTP 503 instead of silent secondary write).
- **Disposable Staging Simulation**: 14/14 validation tests passed (`scripts/test-staging-migration-simulation.ts`).
- **Phase 9 Security & Workflow Tests**: 73/73 security checks passed, 10/10 E2E customer-to-production workflow tests passed.
- **TypeScript Health**: 0 errors (`tsc --noEmit` exited cleanly).

> [!IMPORTANT]
> **PRODUCTION CUTOVER IS PAUSED**: All migration scripts, schema definitions, reconciliation engines, and environment templates are prepared and tested. No production data has been wiped, modified, or prematurely cut over. Live cutover awaits explicit administrative approval on the final checklist provided at the end of this report.

---

## 1. Datastore Inventory & Authoritative Resolution

| Datastore Path | Entity Domain | Authoritative Store (Pre-Migration) | Proposed Authoritative Store (Post-Cutover) | Record Count | Disk Footprint |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `data/customers-store.json` | Customers & Dealers | JSON Store | PostgreSQL (`customers` table) | 28 records | 33,261 bytes |
| `data/leads-store.json` | CRM Kerala Leads | JSON Store | PostgreSQL (`crm_leads` table) | 29 records | 33,644 bytes |
| `data/boq-store.json` | BOQ Door Schedules | JSON Store | PostgreSQL (`boq_masters`, `boq_items`) | 25 masters, 27 items | 43,595 bytes |
| `data/quotations-store.json` | Quotes & Sales Orders | JSON Store | PostgreSQL (`quotations`, `quotation_items`) | 27 quotes, 29 items | 65,856 bytes |
| `data/measurements-store.json` | Site Measurements | JSON Store (Dual-write probe) | PostgreSQL (`door_measurements`, `items`) | 38 sites, 72 doors | 71,691 bytes |
| `data/production-store.json` | Press Job Cards & Doors | JSON Store | PostgreSQL (`production_orders`, `doors`) | 25 orders, 29 doors | 55,951 bytes |
| `data/finance-store.json` | Invoices, Payments, Targets | JSON Store | PostgreSQL (`invoices`, `payments`, `targets`) | 19 inv, 20 pay, 18 targets | 35,463 bytes |
| `data/fulfillment-store.json` | Dispatch, Install, Warranty | JSON Store | PostgreSQL (`dispatches`, `warranties`) | 18 disp, 17 inst, 17 warr | 30,551 bytes |
| `data/employees-store.json` | Staff & Technicians | JSON Store | PostgreSQL (`employees` table) | 6 staff | 7,654 bytes |
| `data/product-categories.json`| FRP Primary, WPC Optional| JSON Store (Dual-write probe) | PostgreSQL (`product_categories` table) | 3 categories | 2,746 bytes |
| `data/inventory-store.json` | Factory Raw Materials | JSON Store | PostgreSQL (`inventory_items` table) | 6 items | 5,464 bytes |
| `data/purchases-store.json` | Raw Material POs | JSON Store | PostgreSQL (`purchase_orders` table) | 3 POs | 4,271 bytes |
| `data/whatsapp-store.json` | Notification Logs | JSON Store | PostgreSQL (`whatsapp_logs` table) | 19 logs | 18,349 bytes |
| `data/concurrency-store.json`| Locking Leases | JSON Store | PostgreSQL / Redis / In-Memory | 2 active leases | 1,291 bytes |
| `data/db-outbox-sync.json` | Outbox Reconciler | JSON Store | Resilient Local Outbox Queue | 5 queued items | 3,184 bytes |
| `data/customizations-store.json`| Customization Settings | JSON Store | PostgreSQL (`system_settings`, `revisions`) | 26 revisions | 263,786 bytes |

---

## 2. Central PostgreSQL Database Architecture

```mermaid
flowchart TD
    subgraph MultiDeviceClients["Multi-Device Access Layer"]
        A1["Windows Office Desktops\n(Chrome / Edge / Desktop Wrapper)"]
        A2["Factory Floor Tablets\n(Palakkad Press Line PWA)"]
        A3["Field Technicians\n(Mobile Site Measurement PWA)"]
        A4["Directors / Management\n(Kerala Executive Dashboard)"]
    end

    subgraph ERPBackend["EXMARK Next.js ERP Backend Layer"]
        B1["Next.js Server API Routes\n(Turbopack Engine)"]
        B2["Server-Side Auth & RBAC\n(9 System Roles)"]
        B3["dbSyncEngine\n(Socket Prober & Outbox Queue)"]
    end

    subgraph CentralDatabase["Authoritative Datastore Layer"]
        C1[("Central PostgreSQL Instance\n(Managed Cloud or On-Premises)")]
        C2[("Prisma ORM 7 Engine\n(@prisma/adapter-pg Connection Pool)")]
        C3[("Durable Outbox Queue\ndata/db-outbox-sync.json\n(Offline Buffer)")]
    end

    A1 -->|HTTPS / REST API| B1
    A2 -->|HTTPS / REST API| B1
    A3 -->|HTTPS / REST API| B1
    A4 -->|HTTPS / REST API| B1

    B1 --> B2
    B2 --> B3

    B3 -->|Active Connection| C2
    C2 --> C1
    B3 -.->|PostgreSQL Offline (Safe Buffer)| C3
    C3 -.->|Auto-Reconcile upon Reconnect| C2
```

### Key Architectural Safeguards:
1. **Single Direct Database Exposure**: Clients never connect directly to PostgreSQL port 5432. All requests traverse the authenticated Next.js backend with full role-based access control (RBAC).
2. **Connection Pooling**: Uses `@prisma/adapter-pg` with `pg.Pool` to prevent connection exhaustion from multiple office workstations and field mobile devices.
3. **Outbox Synchronization**: If PostgreSQL connection is briefly lost, writes are preserved in `data/db-outbox-sync.json` with durable state tracking. Once connection is restored, `reconcileOutboxToPostgres()` automatically drains the queue into PostgreSQL without duplicates.
4. **Anti-Invisibility Guarantee**: Outbox records remain immediately queryable through the service layer during outages, eliminating the risk of records "disappearing" on refresh.

---

## 3. Financial Ledger Balance Reconciliation

During the dry-run audit, the general ledger arithmetic was reconciled across all financial transaction records:

$$\text{Total Invoiced Sales} = \text{Collections Realized} + \text{Outstanding Receivables}$$

$$\text{₹}70,41,200 = \text{₹}36,84,000 + \text{₹}33,57,200 \quad (\Delta = \text{₹}0.00)$$

- **Tax Invoices Audited**: 19 invoices (Kerala GST HSN 3925.20.00, 18% GST split: 9% CGST + 9% SGST).
- **Bank Receipts Audited**: 20 verified payment transactions.
- **Sales Targets Audited**: 18 monthly targets for FRP Doors.
- **Audit Result**: **100% RECONCILED (ZERO DISCREPANCY)**.

---

## 4. Multi-Environment Configuration Layout

Three distinct environment configurations have been prepared to isolate development, staging, and production:

### 1. Local Development (`.env.development`)
- Points to local PostgreSQL / persistent fallback mode.
- Enables safe auto-detection and persistent JSON store fallback.
- Mocked external APIs (Razorpay, WhatsApp, E-Way Bill).

### 2. Staging Pre-Production (`.env.staging`)
- Points to staging PostgreSQL with SSL (`sslmode=require`) and connection limit of 10.
- Strict PostgreSQL mode enabled (`ENABLE_STRICT_POSTGRES="true"`).
- Separate staging secret and CORS domains.

### 3. Production Template (`.env.production.example`)
- Complete enterprise blueprint with SSL `sslmode=require` and PgBouncer connection pooling.
- Strict PostgreSQL enforcement (`DATABASE_FALLBACK_PERMITTED="false"`).
- Instruction for generating cryptographic `AUTH_SECRET` (`openssl rand -base64 32`).
- Production placeholders for Meta WhatsApp Cloud API, GST E-Way Bill, and Payment Gateway.

---

## 5. Cloud PostgreSQL Hosting Options & Recurring Cost Analysis

| Provider / Plan | Region & Kerala Latency | Connection Pooling | Backup & Retention | Monthly Cost (USD) | Monthly Cost (INR ₹) | Recommendation |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **DigitalOcean Managed PostgreSQL** | **Bangalore (`blr1`)**<br>**<20ms to Palakkad/Kochi** | Built-in PgBouncer | Daily automated snapshots, 7-day point-in-time recovery | \$15 / month | **~₹1,250 / month** | **STRONGLY RECOMMENDED** (Lowest latency in Kerala, fixed predictable cost) |
| **Neon Serverless Postgres** | Singapore / AWS `ap-southeast-1`<br>~45ms to Kerala | Built-in PgBouncer | Instant Git-like DB branching, 7-day PITR | \$19 / month (Launch plan) | **~₹1,600 / month** | **EXCELLENT FOR STAGING** (Zero cost free tier for testing, instant branching) |
| **Supabase Managed Postgres** | Mumbai (`ap-south-1`)<br>~25ms to Kerala | Built-in PgBouncer | Automated daily backups, 8 GB SSD included | \$25 / month (Pro plan) | **~₹2,100 / month** | **VIABLE ALTERNATIVE** (Good Mumbai latency, includes file storage buckets) |
| **Self-Hosted Factory Ubuntu Server** | **Palakkad Factory LAN**<br>**<1ms local, Cloudflare Tunnel for WAN** | Custom PgBouncer | Automated local + AWS S3 / Google Drive encrypted cron dump | \$0 additional DB fee (Uses existing server) | **₹0 / month** | **BEST LOCAL ZERO-COST OPTION** (Requires dedicated power backup/UPS) |

---

## 6. Verification Test Summary

```
========================================================================================
  EXMARK ERP — VERIFICATION TEST MATRIX (CENTRAL POSTGRESQL PREPARATION)
========================================================================================
  Test Suite Name                        Tests Run    Passed    Failed    Duration
  --------------------------------------------------------------------------------------
  1. Staging Migration Simulation Suite     14          14         0        1.2s
  2. Database Fallback & Safety Suite       18          18         0        0.8s
  3. Customer-to-Production E2E Workflow    10          10         0        2.1s
  4. Phase 9 Customization & RBAC Security  73          73         0        1.6s
  5. JSON Datastore Master Checksum Match   16          16         0        0.2s
  6. TypeScript Full Compile Check           -        PASS         0        3.4s
  --------------------------------------------------------------------------------------
  TOTAL VERIFIED CHECKS                    131         131         0        9.3s
========================================================================================
```

---

## 7. Production Cutover Approval Checklist

Before triggering live database migration and cutting over production traffic, complete the following administrative sign-offs:

- [ ] **1. Cloud / On-Premise Host Selection**: Approve hosting provider (DigitalOcean Bangalore ₹1,250/mo, Supabase Mumbai ₹2,100/mo, or Palakkad Factory LAN server).
- [ ] **2. Provision PostgreSQL Instance**: Provision the database, obtain the secure connection string, and verify TCP reachability on port 5432.
- [ ] **3. Environment File Configuration**: Copy `.env.production.example` to `.env.production` on the production server with the real `DATABASE_URL` and generated `AUTH_SECRET`.
- [ ] **4. Run Schema Migration**: Execute `npx prisma migrate deploy` on the host to create all 29 relational tables from `prisma/migrations/20261028000000_init/migration.sql`.
- [ ] **5. Execute Live Migration Script**: Run `npx tsx scripts/migrate-json-to-postgres.ts --apply` to populate PostgreSQL from the verified JSON datastores.
- [ ] **6. Run Post-Migration Reconciliation**: Execute `scripts/test-staging-migration-simulation.ts` against the live database to confirm 100% record match and 0 financial variance.
- [ ] **7. Enable Strict PostgreSQL Mode**: Set `ENABLE_STRICT_POSTGRES="true"` in production to ensure split-brain writes are prevented.
