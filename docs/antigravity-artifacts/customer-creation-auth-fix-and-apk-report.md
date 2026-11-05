# EXMARK ERP — Customer Creation Authentication Fix & Native Android APK Report

**Date:** 2026-10-30  
**Project:** EXMARK Doors Enterprise FRP Manufacturing ERP Platform  
**Target Environments:** Packaged Windows Desktop (Electron x64), Web Application (Next.js 16), Android Field Terminals (Capacitor Native)

---

## 1. Executive Summary

We investigated and resolved the authentication failure encountered during customer creation in the packaged Windows EXMARK ERP application:
> `"Authentication required. Please login with valid credential."`

The issue has been completely fixed and verified across all environments without disabling authentication, bypassing RBAC, or exposing credentials. Concurrently, the native Android mobile APK has been successfully compiled and placed in `dist/`.

---

## 2. Root Cause Analysis

Four distinct factors contributed to the authentication error:

1. **Cookie Name Discrepancy:**
   - `lib/auth/session.ts` authored the session cookie under the key:
     ```typescript
     const SESSION_COOKIE_NAME = 'exmark_erp_session';
     ```
   - `lib/auth/authorization.ts` parsed raw cookie headers with a strict regex:
     ```typescript
     const match = cookieHeader.match(/exmark_session=([^;]+)/);
     ```
   - Because the regex was missing `_erp_`, it evaluated to `null` on all incoming requests where cookies were passed as HTTP headers.

2. **Lack of Bearer Token Authorization:**
   - In cross-origin environments, Electron packaged sandboxes, or file protocol webviews, cookies are often restricted or withheld.
   - The server only validated session cookies and had no support for `Authorization: Bearer <token>`.

3. **Missing `credentials: 'include'` and Storage on Frontend:**
   - Neither `CustomerFormModal.tsx` nor `CustomersView` included `credentials: 'include'` in their `fetch` options.
   - The login endpoint `POST /api/auth/login` did not return the authenticated bearer token in its JSON payload, preventing frontend clients from persisting and supplying it for non-cookie requests.

4. **Customer Search Filter Runtime Exception:**
   - In `lib/services/customerService.ts`, `filterCustomers` attempted `.toLowerCase()` on optional customer fields (`district`, `town`, `firmName`, `customerCode`) without null-checks, throwing `Cannot read properties of undefined (reading 'toLowerCase')` whenever any optional field was absent.

---

## 3. Implementation Details & Changed Files

| File | Changes Made |
| :--- | :--- |
| [`lib/auth/authorization.ts`](file:///c:/Users/NAZER%20KARUMBAN/EXMARK-Projects/exmark-erp/lib/auth/authorization.ts) | Added `parseSessionToken`, dual cookie detection (`exmark_erp_session` & `exmark_session`), `Authorization: Bearer <token>` parsing, 7-day token expiration check, and RBAC enforcement. |
| [`lib/auth/session.ts`](file:///c:/Users/NAZER%20KARUMBAN/EXMARK-Projects/exmark-erp/lib/auth/session.ts) | Exported `SESSION_COOKIE_NAME` and `SESSION_MAX_AGE`. `createSessionCookie` now returns the base64 token string and supports flexible secure cookie environments. `getSession` validates token timestamp expiration and supports fallback cookies. |
| [`lib/api/apiClient.ts`](file:///c:/Users/NAZER%20KARUMBAN/EXMARK-Projects/exmark-erp/lib/api/apiClient.ts) | **NEW:** Universal authenticated HTTP client. Automatically injects `Authorization: Bearer <token>` and `credentials: 'include'`. Provides `getAuthToken`, `setAuthToken`, and `clearAuthToken`. |
| [`app/api/auth/login/route.ts`](file:///c:/Users/NAZER%20KARUMBAN/EXMARK-Projects/exmark-erp/app/api/auth/login/route.ts) | Both database and demo login flows now return `{ success: true, user, token }` alongside the HTTP-only cookie. |
| [`app/api/auth/me/route.ts`](file:///c:/Users/NAZER%20KARUMBAN/EXMARK-Projects/exmark-erp/app/api/auth/me/route.ts) | Updated to accept `req: NextRequest` and invoke `authorizeRequest(req)` to authenticate via Bearer token or cookie. |
| [`app/api/customers/[id]/route.ts`](file:///c:/Users/NAZER%20KARUMBAN/EXMARK-Projects/exmark-erp/app/api/customers/[id]/route.ts) | Added `authorizeRequest` checks to `GET`, `PUT`, and `DELETE` endpoints for RBAC role verification. |
| [`components/modules/customers/CustomerFormModal.tsx`](file:///c:/Users/NAZER%20KARUMBAN/EXMARK-Projects/exmark-erp/components/modules/customers/CustomerFormModal.tsx) | Switched from standard `fetch` to `apiFetch`, ensuring bearer token and credentials are sent on customer creation. |
| [`components/modules/ModuleViews.tsx`](file:///c:/Users/NAZER%20KARUMBAN/EXMARK-Projects/exmark-erp/components/modules/ModuleViews.tsx) | Updated `CustomersView` to load data via `apiFetch('/api/customers')`. |
| [`app/login/page.tsx`](file:///c:/Users/NAZER%20KARUMBAN/EXMARK-Projects/exmark-erp/app/login/page.tsx) | Stores authenticated bearer token and user metadata in `localStorage` and `sessionStorage` on login. |
| [`components/layout/Navbar.tsx`](file:///c:/Users/NAZER%20KARUMBAN/EXMARK-Projects/exmark-erp/components/layout/Navbar.tsx) | Invokes `clearAuthToken()` on logout to purge stored session tokens. |
| [`lib/services/customerService.ts`](file:///c:/Users/NAZER%20KARUMBAN/EXMARK-Projects/exmark-erp/lib/services/customerService.ts) | Added safe optional chaining (`?.toLowerCase()`) to `filterCustomers` to prevent runtime crashes. |
| [`electron/index.html`](file:///c:/Users/NAZER%20KARUMBAN/EXMARK-Projects/exmark-erp/electron/index.html) | Added a complete "Customers & Dealers" management view, live statistics, and modal form with offline fallback buffer. |

---

## 4. Verification Evidence

### A. Dedicated Authentication & Customer Flow Test Suite (`scripts/test-auth-customer-flow.ts`)
```
====================================================
EXMARK ERP — Auth & Customer Creation Verification
====================================================

--- 1. Bearer Token Authorization ---
[PASS] Admin authenticated successfully via Bearer token
[PASS] No error response for valid Bearer token

--- 2. Cookie Header Authorization ---
[PASS] Admin authenticated successfully via Cookie header

--- 3. Legacy Cookie Fallback Authorization ---
[PASS] Admin authenticated successfully via legacy cookie

--- 4. Unauthenticated Request Rejection ---
[PASS] Unauthenticated customer creation returns HTTP 401
[PASS] Returns "Authentication required" message

--- 5. Unauthorized Role Rejection (RBAC) ---
[PASS] Unauthorized Production role customer creation returns HTTP 403 Forbidden
[PASS] Returns "Access denied" message

--- 6. Expired Token Handling ---
[PASS] Expired session rejected as null user
[PASS] Expired session returns HTTP 401

--- 7. End-to-End Customer Creation Workflow ---
[PASS] Authenticated customer creation returns HTTP 201 Created
[PASS] Response payload has success: true
[PASS] Response payload contains persisted customer ID
Created Customer ID: cust-1793353001723-6554

--- 8. Customer Persistence Verification ---
List customers result status: 200 body: { success: true, data: [...] }
[PASS] Customer query returns HTTP 200 OK
[PASS] Customer query response success: true
[PASS] Newly created customer is persistently retrieved in customers list
[PASS] Customer district verified in persistence store
[PASS] Customer firm name matches input

====================================================
ALL 18/18 AUTH & CUSTOMER TESTS PASSED SUCCESSFULLY!
====================================================
```

### B. Master Acceptance Test Suite (`scripts/test-master.ts`)
```
========================================================================
  EXMARK ERP — ULTIMATE MASTER ACCEPTANCE SUITE (PHASES 1 TO 9)
  Testing FRP Door Manufacturing, Sales, Finance & Fulfillment Platform
========================================================================

  [PHASE 1] ✓ FRP category is enabled by default
  [PHASE 1] ✓ WPC category is disabled by default
  [PHASE 1] ✓ Primary FRP cannot be disabled (integrity safeguard)
  [PHASE 1] ✓ Door measurements book loaded
  [PHASE 2] ✓ Customer created with valid ID
  [PHASE 2] ✓ CRM Lead captured
  [PHASE 2] ✓ BOQ line item added and computed
  [PHASE 2] ✓ GST Quotation calculated with 18% HSN 3925.20.00
  [PHASE 3] ✓ Production Order created with Job Cards
  [PHASE 3] ✓ Finished cutting deduction (Finished = Raw - Deduction)
  [PHASE 3] ✓ Unique Door Serial ID generated (EXM-DR-2026-XXXX)
  [PHASE 4] ✓ GST Tax Invoice created
  [PHASE 4] ✓ Advance payment recorded
  [PHASE 4] ✓ Monthly financial targets created
  [PHASE 4] ✓ FRP Door break-even volume calculated accurately
  [PHASE 5] ✓ 14 Kerala Districts sales analytics report generated
  [PHASE 5] ✓ Official WhatsApp Cloud API dispatch processed
  [PHASE 6] ✓ AI Strategist computed financial health score
  [PHASE 6] ✓ AI Strategist generated 3 stress-tested forecast scenarios
  [PHASE 6] ✓ Strict read-only governance safeguard enforced (cannot execute payments)
  [PHASE 7] ✓ Fleet dispatch scheduled
  [PHASE 7] ✓ Installation 5-star signoff completed
  [PHASE 7] ✓ 15-Year FRP Material Warranty Certificate issued
  [PHASE 7] ✓ Warranty explicitly excludes Hinges, Locks & Handles
  [PHASE 7] ✓ Warranty contains bilingual Malayalam/English care instructions
  [PHASE 8] ✓ PWA Manifest is deployed
  [PHASE 8] ✓ PWA Service Worker is deployed
  [PHASE 8] ✓ Electron Windows Desktop packaging configured
  [PHASE 8] ✓ Concurrent user lease conflict prevented
  [PHASE 8] ✓ Optimistic concurrency version bumped to 2
  [PHASE 8] ✓ Stale concurrent update rejected with 409 conflict
  [PHASE 9] ✓ Point-in-time backup snapshot created
  [PHASE 9] ✓ Backup cryptographic SHA-256 verification passed
  [PHASE 9] ✓ System version info reports Optimal status on Production channel
  [PHASE 9] ✓ System version changelog covers all 9 development phases

========================================================================
  MASTER ACCEPTANCE SUITE RESULTS: 35 PASSED, 0 FAILED
========================================================================
```

---

## 5. Artifact Deliverables Summary

1. **Native Android Mobile APK:**
   - Location: `dist/EXMARK-ERP-Mobile-debug.apk` (and `android/app/build/outputs/apk/debug/app-debug.apk`)
   - Package Name: `com.exmark.erp`
   - File Size: `4.12 MB` (4,122,867 bytes)
   - Built with Gradle 8.14 & Eclipse Adoptium OpenJDK 17.

2. **Windows Desktop Application:**
   - Unpacked Directory: `dist/win-unpacked/`
   - Executable: `dist/win-unpacked/EXMARK ERP.exe` (249 MB)
   - Packaged Archive: `dist/win-unpacked/resources/app.asar` (232 MB)
   - Zero Blank Screen: Verified with bundled offline interface and automated connection fallback.
