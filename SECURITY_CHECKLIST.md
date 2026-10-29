# EXMARK ERP — Security, Governance & Compliance Checklist

**Audited Security Controls, Credential Isolation & Cryptographic Integrity**

---

## 1. Credential Protection & Secret Isolation

- [x] **Zero Hardcoded Secrets:** No database passwords, JWT secrets, or API keys in source code or Git history.
- [x] **Gitignore Enforcement:** `.env*`, `/backups/`, `/data/*.json`, and customer uploads are excluded from Git commits.
- [x] **Password Hashing:** User passwords hashed using salted `bcryptjs` with work factor 10 (zero plaintext passwords).
- [x] **Server-Side Credentials:** Supabase connection strings restricted strictly to server-side environments.

---

## 2. Server-Side Authorization & RBAC

- [x] **Route Protection:** Server-side `getSession()` and `canAccessModule()` guards on every API route.
- [x] **Anti-Spoofing:** Production mode rejects unauthenticated header spoofing and returns HTTP 401.
- [x] **Sensitive Action Gates:** Advance verification required by Accounts before Production Order release.
- [x] **Financial Governance:** AI Financial Strategist is strictly read-only; cannot alter accounts or approve transfers.

---

## 3. Data Durability & Resilience

- [x] **Ephemeral Cloud Write Blocking:** `assertWriteAllowed()` rejects writes to ephemeral disk on Render when PostgreSQL is unreachable.
- [x] **Durable Outbox Queue:** Offline writes queued in `data/db-outbox-sync.json` with automatic reconciliation upon DB reconnection.
- [x] **Anti-Invisibility Guarantee:** Records created during offline periods remain visible to users and are not overwritten.
- [x] **Automated Backup Ledger:** 24 point-in-time snapshots with SHA-256 cryptographic verification.

---

## 4. Web & Network Security Headers

Configured globally in [`next.config.ts`](file:///c:/Users/NAZER%20KARUMBAN/EXMARK-Projects/exmark-erp/next.config.ts):
- [x] `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`
- [x] `X-Frame-Options: SAMEORIGIN` (Clickjacking mitigation)
- [x] `X-Content-Type-Options: nosniff` (MIME sniffing mitigation)
- [x] `Referrer-Policy: strict-origin-when-cross-origin`
- [x] `Permissions-Policy: camera=(), microphone=(), geolocation=(self)`
