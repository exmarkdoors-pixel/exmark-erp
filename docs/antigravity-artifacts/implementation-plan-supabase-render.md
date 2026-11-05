# Implementation Plan: EXMARK ERP Supabase Staging Migration & Render Activation

Centralize EXMARK ERP onto a cloud PostgreSQL database hosted on **Supabase** (`aws-0-ap-southeast-1.pooler.supabase.com:5432`, project ref `zigoibsuwkvdnvrxuoet`) and activate the live **Render staging web service** (`exmark-erp-staging.onrender.com`), enabling secure multi-terminal access across office desktops, factory PCs, and mobile devices without risking data loss.

---

## User Review Required

> [!IMPORTANT]
> **Credential Input Workflow:**
> You have provided the Supabase connection parameters (`host: aws-0-ap-southeast-1.pooler.supabase.com`, `user: postgres.zigoibsuwkvdnvrxuoet`, `database: postgres`).
> To execute the DDL migration safely without posting passwords in chat, you will create a temporary local file `.env.staging.local` (which is already gitignored) containing your `DIRECT_URL` with password, or execute the interactive prompt.

> [!WARNING]
> **No Data Deletion / No Overwrite:**
> The migration script [`prisma/migrations/20261028000000_init/migration.sql`](file:///c:/Users/NAZER%20KARUMBAN/EXMARK-Projects/exmark-erp/prisma/migrations/20261028000000_init/migration.sql) contains **only non-destructive DDL** (`CREATE TABLE IF NOT EXISTS`, `ADD CONSTRAINT`). It contains zero `DROP TABLE` or data reset statements. All 16 local JSON stores in `data/` remain untouched as the offline backup fallback.

---

## Architecture & Data Flow

```mermaid
flowchart TD
    subgraph Local_Workstation["Local Windows Workstation"]
        LocalEnv[".env.staging.local (Temporary & Gitignored)"]
        MigrationCLI["Prisma CLI 7.10.1 (prisma migrate deploy)"]
        LocalStores["data/*.json (16 Persistent Local Stores)"]
    end

    subgraph Supabase_Cloud["Supabase Cloud (ap-southeast-1)"]
        SessionPooler["Session Pooler (:5432)"]
        TxPooler["Transaction Pooler (:6543)"]
        PostgresDB[("PostgreSQL 16 Engine (29 Tables)")]
    end

    subgraph Render_Cloud["Render Cloud Staging Service"]
        RenderApp["Next.js 16 Production Container"]
        HealthEndpoint["/api/health (Liveness & Readiness)"]
        WriteGuards["dbSyncEngine (assertWriteAllowed)"]
    end

    LocalEnv -->|DIRECT_URL| MigrationCLI
    MigrationCLI -->|Port 5432 DDL| SessionPooler
    SessionPooler --> PostgresDB

    RenderApp -->|DATABASE_URL Port 6543| TxPooler
    TxPooler --> PostgresDB
    WriteGuards -.->|Blocked if DB offline| RenderApp
    HealthEndpoint -->|Reports HTTP 200 READY| RenderApp
```

---

## Proposed Changes & Phased Execution

### Phase 1: Local Migration Environment & Status Probe

#### [NEW] [`.env.staging.local`](file:///c:/Users/NAZER%20KARUMBAN/EXMARK-Projects/exmark-erp/.env.staging.local)
Temporary local configuration containing the staging Supabase session pooler connection string:
```env
DIRECT_URL="postgresql://postgres.zigoibsuwkvdnvrxuoet:[YOUR-PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres?sslmode=require"
```
*(Confirmatory rule: `.env*` pattern in [`.gitignore`](file:///c:/Users/NAZER%20KARUMBAN/EXMARK-Projects/exmark-erp/.gitignore) prevents any accidental commit).*

#### Verification Check:
Run the migration status probe:
```powershell
cmd /c npx prisma migrate status
```
- **Expected Outcome:** Connects to `aws-0-ap-southeast-1.pooler.supabase.com:5432`, identifies database `postgres`, and reports `1 migration found in prisma/migrations: 20261028000000_init`.

---

### Phase 2: Schema Migration Deployment (29 Relational Models)

#### Action:
Execute reviewed migration DDL:
```powershell
cmd /c npx prisma migrate deploy
```
- **Tables Deployed:** `Role`, `Permission`, `RolePermission`, `User`, `Employee`, `Session`, `AuditLog`, `Customer`, `Lead`, `LeadFollowUp`, `DoorMeasurement`, `DoorMeasurementItem`, `ProductCategory`, `BOQSchedule`, `BOQDoorItem`, `Quotation`, `QuotationItem`, `ProductionOrder`, `ProductionDoor`, `InventoryItem`, `StockMovement`, `PurchaseOrder`, `PurchaseOrderItem`, `Dispatch`, `Installation`, `WarrantyCertificate`, `TaxInvoice`, `PaymentReceipt`, `SalesTarget`.
- **Result:** Prisma applies `20261028000000_init` and records the migration in `_prisma_migrations`.

#### Verification Check:
Re-run status:
```powershell
cmd /c npx prisma migrate status
```
- **Expected Outcome:** `Database schema is up to date!`.
- Delete `.env.staging.local` immediately after deployment.

---

### Phase 3: Render Staging Environment Verification & Container Redeploy

#### Render Environment Settings Verification:
Confirm variables in Render Dashboard for `exmark-erp-staging`:
- `DATABASE_URL`: `postgresql://postgres.zigoibsuwkvdnvrxuoet:[YOUR-PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?sslmode=require`
- `DIRECT_URL`: `postgresql://postgres.zigoibsuwkvdnvrxuoet:[YOUR-PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres?sslmode=require`
- `STRICT_POSTGRES`: `true`
- `NODE_ENV`: `production`
- `STAGE`: `staging`

#### Action:
In Render Dashboard, click **Manual Deploy &rarr; Clear build cache & deploy**.

---

### Phase 4: Live Staging Health & Write-Guard Verification

#### [NEW] [`scripts/verify-cloud-staging.ts`](file:///c:/Users/NAZER%20KARUMBAN/EXMARK-Projects/exmark-erp/scripts/verify-cloud-staging.ts)
Automated verification script that:
1. Calls `https://exmark-erp-staging.onrender.com/api/health` and asserts:
   - `HTTP Status: 200`
   - `liveness: "ALIVE"`
   - `readiness: "READY"`
   - `database.postgresReachable: true`
   - `database.connectionMode: "CENTRAL_CLOUD_POSTGRES"`
   - `storage.durable: true`
2. Creates a labeled test site measurement: `EXM-TEST-RENDER-PERSISTENCE`.
3. Verifies that reading `GET /api/measurements` returns the record from PostgreSQL.
4. Confirms that restarting or redeploying the container preserves the test record.

---

## Verification Plan

### Automated Verification
```powershell
# 1. Verify TypeScript compiles cleanly
cmd /c npx tsc --noEmit

# 2. Check staging database status
cmd /c npx prisma migrate status

# 3. Apply schema migration
cmd /c npx prisma migrate deploy

# 4. Run automated cloud staging health and persistence test
cmd /c npx tsx scripts/verify-cloud-staging.ts
```

### Manual Verification
1. Open `https://exmark-erp-staging.onrender.com/` in an Android/iPhone browser and desktop browser.
2. Verify dashboard KPI cards and navigation render with responsive styling.
3. Access **Settings &rarr; Company & Factory Profile** and confirm dynamic factory display (`Central Manufacturing Unit`, no hardcoded Palakkad).
