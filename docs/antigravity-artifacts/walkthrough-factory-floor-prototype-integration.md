# Walkthrough: EXMARK Doors Factory Floor ERP & Desktop Integration

## 1. Overview of Deployed Assets

The complete standalone single-file suite for **EXMARK DOORS | Factory ERP, CRM & Production Floor** has been deployed and integrated into the project across two key runtimes:

1. **Standalone Public Web Access:**
   * **Location:** [`public/factory-floor-prototype.html`](file:///c:/Users/NAZER%20KARUMBAN/EXMARK-Projects/exmark-erp/public/factory-floor-prototype.html)
   * **Live Localhost URL:** `http://localhost:3000/factory-floor-prototype.html`
   * **Features:** Zero-dependency standalone application with live Tailwind styling, modal controllers, and print CSS engines.

2. **Electron Desktop Workstation UI:**
   * **Location:** [`electron/index.html`](file:///c:/Users/NAZER%20KARUMBAN/EXMARK-Projects/exmark-erp/electron/index.html)
   * **Features:** Upgraded with the complete prototype interface, enhanced with the Electron context bridge (`window.electronAPI`), platform system information logging, native window printing integration, and persistent offline storage fallback.

---

## 2. Integrated Feature Highlights

### 1. End-to-End Workflow Bonding Pipeline
A top pipeline indicator tracks orders through 6 manufacturing milestones:
$$\text{Quotation} \longrightarrow \text{Measurement} \longrightarrow \text{Sales Order} \longrightarrow \text{BOM \& Store} \longrightarrow \text{Plant Floor Press} \longrightarrow \text{Sales Bill (Tax INV)}$$

* **Quotation to Measurement:** Clicking **"Send to Measurement Book ➡️"** transfers client details, door tags, models, and sizes directly into the Door Measurement Book.
* **Measurement to Sales Order:** Clicking **"Lock Measurements & Convert to Sales Order ➡️"** computes factory CM cutting sizes with rebate deductions and creates a confirmed Sales Order.
* **Advance Deposit Gatekeeper:** Orders strictly enforce a mandatory **40% minimum deposit** before unlocking the **"Release to Press 🚀"** button.
* **Automated BOM Generation:** Releasing to press automatically calculates resin, fiberglass mat (CSM 450), core sets, and PU polish requirements, and generates **Store Issue Slips**.
* **Stage Progression to Tax Invoice:** Progressing through the 5 plant stages (Press $\to$ CNC Sizing $\to$ PU Polish/UV $\to$ QC Passed) enables instant **18% GST Tax Invoice** generation.

---

### 2. Dual Sticker Print Engines
The print hub supports two dedicated printing options:
* **Option 1: A4 12-Up Die-Cut Sheets (12L Compact):**
  - Grid: 3 columns $\times$ 4 rows (exact 12 labels per page).
  - Enforced 67mm card height to ensure **zero overflow or trailing blank pages**.
* **Option 2: Single Thermal Roll (4" $\times$ 2" / 100mm $\times$ 50mm):**
  - Formatted for continuous roll thermal barcode printers (TVS, TSC, Zebra, Citizen).
  - Includes barcode, cutting size, profile, finish, hardware, and the **IS 14856:2000 QC PASS** badge.

---

### 3. Consolidated Multi-Party Batch BOQ
* Supervisors can select multiple orders via checkboxes across different parties.
* Computes the grand total batch resin, fiber, core, polish, and hardware requirements for consolidated hydraulic press runs (പല പാർട്ടികളുടെ ആകെ BOQ).

---

### 4. Quality Control (QC) & Inspection Checklists
* **Digital Floor Inspection:** Interactive checkboxes for dimensional tolerances ($\pm 1.5\text{ mm}$), diagonal squareness ($\le 3\text{ mm}$), flatness/warpage, polish/UV finish, and lock mortising.
* **Physical Clipboard Sheet:** Print button formats a physical inspection sheet with `[ ]` tick-boxes for floor inspectors with clipboards.

---

### 5. Super Admin RBAC Permissions Matrix
* Access via the **"Role Permissions"** modal.
* Interactive 5-role $\times$ 8-module matrix allowing real-time toggling of module access for Super Admin, Production Supervisor, Site Engineer, Accounts, and QC Inspector.

---

## 3. Verification & Test Results

| Test Item | Verification Command / Target | Result | Status |
| :--- | :--- | :--- | :--- |
| **HTTP 200 on Public Prototype** | `curl -I http://127.0.0.1:3000/factory-floor-prototype.html` | HTTP/1.1 200 OK (221,336 bytes) | **PASSED** |
| **Electron UI Loading & DOM Stats** | `npx electron scripts/test-desktop-new.js` | Loaded with 224,252 bytes, all modals present, 0 DOM errors | **PASSED** |
| **Full Suite Audit (15 Modules)** | `npm run erp:full-audit` | 70 / 70 assertions passed (100%) in 0.04s | **PASSED** |
| **TypeScript Compilation** | `npx tsc --noEmit` | 0 errors across entire repository | **PASSED** |
| **Git Synchronization** | `git push origin main` | Pushed commit `6857ad7` | **PASSED** |
