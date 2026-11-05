# EXMARK ERP — All Modules Reset to Zero (Fresh Start)

All business transaction data across every module in the EXMARK Doors ERP has been safely archived and reset to a **clean zero baseline** (0 records, ₹0.00 financial ledger).

---

## 1. Safety Backup Created
Before clearing any records, a complete snapshot of all 17 system JSON stores was archived to:
```
data/backups/full-system-backup-20261101143015/
```
All customer data, quotations, invoices, door measurements, job cards, and dispatch records are preserved and can be restored at any time.

---

## 2. Department-by-Department Zero State

| Module | Data Store | Previous Count | New State | Verification |
| :--- | :--- | :---: | :---: | :---: |
| **Customers** | `data/customers-store.json` | 55 records | **0 Active** | `[]` |
| **CRM Leads** | `data/leads-store.json` | 56 leads | **0 Leads** | `[]` |
| **Quotations** | `data/quotations-store.json` | 61 quotes | **0 Quotes (₹0.00)** | `[]` |
| **Door Measurements** | `data/measurements-store.json` | 58 sites / 108 openings | **0 Sites (0 Openings)** | `[]` |
| **Sales Orders** | Computed Pipeline | 58 orders | **0 Orders** | `[]` |
| **Production Floor** | `data/production-store.json` | 58 orders / 66 doors | **0 Orders (0 Doors)** | `[]` |
| **Finance & Invoices** | `data/finance-store.json` | 39 invoices (₹1.45 Cr) | **0 Invoices (₹0.00)** | `{"invoices":[], ...}` |
| **Collections / Payments** | `data/finance-store.json` | ₹79.93 Lakhs | **₹0.00 Collected** | `{"payments":[], ...}` |
| **Receivables** | Real Tax Ledger | ₹65.76 Lakhs | **₹0.00 Outstanding** | Calculated ₹0.00 |
| **BOQ & Requisitions** | `data/boq-store.json` | Active BOQs | **0 Requisitions** | `[]` |
| **Logistics & Dispatch** | `data/fulfillment-store.json` | 38 fleet dispatches | **0 Dispatches** | `{"dispatches":[], ...}` |
| **Site Installations** | `data/fulfillment-store.json` | Active installations | **0 Installations** | `{"installations":[], ...}` |
| **Warranties** | `data/fulfillment-store.json` | Active warranties | **0 Warranties** | `{"warranties":[], ...}` |
| **Purchases (POs)** | `data/purchases-store.json` | 3 POs (₹10.8L) | **0 POs** | `[]` |
| **WhatsApp Messages** | `data/whatsapp-store.json` | Message audit log | **0 Messages** | `[]` |
| **Inventory Stock** | `data/inventory-store.json` | 6 Raw Materials | **0 Units (Out of Stock)** | All currentStock: 0 |

---

## 3. Preserved Master Architecture & Configurations
The reset exclusively zeroed transactional and operational data. The following foundational master configurations were preserved:
- **Factory & Company Profiles:** [`customization-store.json`](file:///c:/Users/NAZER%20KARUMBAN/EXMARK-Projects/exmark-erp/data/customization-store.json) (GSTIN `32AABCE1234F1Z9`, Central Plant address in Ernakulam, bank accounts).
- **Product Categories:** [`product-categories.json`](file:///c:/Users/NAZER%20KARUMBAN/EXMARK-Projects/exmark-erp/data/product-categories.json) (FRP, WPC, Flush Door specifications & HSN codes).
- **Staff Profiles:** [`employees-store.json`](file:///c:/Users/NAZER%20KARUMBAN/EXMARK-Projects/exmark-erp/data/employees-store.json) (Nazer Karumban, Plant Supervisors, QC Inspector roles).
- **Door Spec Master:** [`catalog-store.json`](file:///c:/Users/NAZER%20KARUMBAN/EXMARK-Projects/exmark-erp/data/catalog-store.json) (Standard mold profiles and finishes).

---

## 4. Live Verification & Health Audit
- **Executive Metrics API (`/api/dashboard/metrics`):**
  - Total Invoiced Sales (MTD): **₹0.00 (0 Invoices)**
  - Active Quotations Pipeline: **0 Quotes (₹0.00)**
  - Plant Floor & Job Cards: **0 Orders (0 Doors)**
  - Outstanding Receivables: **₹0.00 (0% Due)**
- **Audit Suite Execution:**
  ```powershell
  npm.cmd run erp:full-audit
  # Output: 70 / 70 ASSERTIONS PASSED (100%) in 0.23s
  ```
- **TypeScript Health:**
  ```powershell
  npx.cmd tsc --noEmit
  # 0 errors
  ```
- **One-Command Fresh Reset Command:**
  To reset anytime in the future, you can simply run:
  ```powershell
  npm.cmd run erp:reset-zero
  ```
