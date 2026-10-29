# EXMARK ERP — Deployment Runbook

**Procedures for Cloud Staging, Production Cutover & Windows Desktop Setup**

---

## 1. Hosting Architecture & Endpoints

| Environment | Service Name | Host / Provider | Purpose | URL |
| :--- | :--- | :--- | :--- | :--- |
| **Local Dev** | `localhost:3000` | Local Node.js | Development & Testing | `http://localhost:3000` |
| **Staging Web** | `exmark-erp-staging` | Render Cloud | Staging & Verification | `https://exmark-erp-staging.onrender.com` |
| **Staging DB** | `zigoibsuwkvdnvrxuoet` | Supabase AWS Singapore | Central PostgreSQL Staging | `aws-0-ap-southeast-1.pooler.supabase.com` |
| **Production Web** | `exmark-erp-prod` | Render / Vercel | Live Enterprise ERP | `https://erp.exmarkdoors.com` (Target) |
| **Desktop Client**| Electron Windows App| Local Workstations | Office & Plant Terminals | Installed locally |

---

## 2. Environment Variables Specification

Configure the following variables in hosting platforms (Render / Staging / Production):

```env
# Runtime PostgreSQL Transaction Pooler (Port 6543)
DATABASE_URL="postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres?sslmode=require"

# Migration / DDL Session Pooler (Port 5432)
DIRECT_URL="postgresql://postgres.[PROJECT_REF]:[PASSWORD]@aws-0-ap-southeast-1.pooler.supabase.com:5432/postgres?sslmode=require"

# Environment & Consistency Modes
NODE_ENV="production"
STAGE="staging"
STRICT_POSTGRES="true"

# Authentication & Remote Administration Key
AUTH_SECRET="your_secure_random_64_character_hex_secret"
NEXTAUTH_URL="https://exmark-erp-staging.onrender.com"
NEXT_PUBLIC_APP_URL="https://exmark-erp-staging.onrender.com"
```

> [!WARNING]
> **Password Percent-Encoding:**
> If your database password contains characters such as `@`, `#`, `$`, `%`, `&`, `+`, or `:`, you must percent-encode them in the URL (e.g. `@` becomes `%40`, `#` becomes `%23`). Do not wrap the password in literal brackets `[]`.

---

## 3. Cloud Deployment Procedure (Render Staging)

1. **Verify Local Build Cleanliness:**
   ```powershell
   cmd /c npm run build
   ```
2. **Push to Main Branch:**
   ```powershell
   git push origin main
   ```
3. **Trigger Render Deployment:**
   - Log into [Render Dashboard](https://dashboard.render.com).
   - Select web service **`exmark-erp-staging`**.
   - Click **Manual Deploy &rarr; Clear build cache & deploy**.
4. **Automated Migration Execution:**
   - Render's build script runs `scripts/deploy-migrate.mjs`.
   - It reads `DIRECT_URL` and applies pending migrations (`npx prisma migrate deploy`).
   - If migration fails, it logs warning and continues Next.js build so the app launches.
5. **Post-Deployment Verification:**
   ```powershell
   cmd /c npx tsx scripts/verify-cloud-staging.ts
   ```
   Assert that `/api/health` returns `HTTP 200` with:
   - `liveness: "ALIVE"`
   - `readiness: "READY"`
   - `postgresReachable: true`
   - `connectionMode: "CENTRAL_CLOUD_POSTGRES"`

---

## 4. Rollback & Disaster Recovery Procedure

If a deployed build introduces unexpected regressions:
1. Revert to the prior verified Git commit:
   ```powershell
   git revert HEAD
   git push origin main
   ```
2. In Render, select the prior successful build from the **Deploys** tab and click **Rollback to this deploy**.
3. Re-run `npm run backup` locally to verify offline data snapshot safety.
