# EXMARK ERP — Kerala FRP Door Manufacturing & Business Platform
**Version:** 2.4.0-Production | **Branding:** Dark Navy (`#0B132B`), Accent Red (`#E63946`), Clean White  
**Target Enterprise:** EXMARK Doors — Palakkad Central Manufacturing Plant & Kerala Branch Offices

---

## 1. System Overview

**EXMARK ERP** is a full-stack, multi-platform enterprise resource planning and manufacturing operations platform built specifically for Kerala's premier FRP (Fiberglass Reinforced Polymer) door manufacturer.

The platform unifies all business workflows:
- **Field Engineering**: 4-point site masonry opening measurement book with mm/cm/inch conversion
- **Sales & CRM**: Kerala district leads, builder/dealer CRM, BOQ spreadsheet ingestion, 18% GST quotations (HSN 3925.20.00)
- **Manufacturing Plant**: Hydraulic press job cards, deterministic cutting tolerance engine, sequential door serial tracking (`EXM-DR-2026-XXXX`), A4 & thermal sticker barcodes
- **Accounts & Finance**: GST tax invoices, advance receipts, financial targets, break-even unit calculator
- **Communication & Customer Portal**: Official Meta WhatsApp Cloud API templates and expiring customer measurement confirmation links
- **Fulfillment & Warranty**: Dedicated Kerala delivery fleet tracking, 5-star site handover sign-offs, official 10/15-year FRP material warranty certificates
- **Intelligence & Governance**: AI Financial Strategist with cash runway modeling and strict read-only execution barriers
- **Multi-Platform Access**: Cloud Next.js Web, Windows Desktop EXE, and installable PWA for Android & iOS
- **Reliability & Office Backup Agent**: Automated point-in-time JSON snapshots with SHA-256 cryptographic verification

---

## 2. Core Business Directives

1. **FRP Doors Primary (Mandatory)**: FRP Architectural Doors (`cat-frp-01`) is permanently enabled and protected from accidental deactivation.
2. **WPC Doors Optional (Disabled by Default)**: WPC composite doors (`cat-wpc-02`) are optional and disabled by default. When disabled, WPC options are hidden from order creation and factory queues while historical records remain intact.
3. **No Invented Tolerances**: Finished door cutting size is calculated deterministically:
   $$\text{Finished Height} = \text{Raw Height} - \text{Floor \& Frame Clearance}$$
   $$\text{Finished Width} = \text{Raw Width} - \text{Rebate Clearance}$$
4. **Legal Warranty Limitation**: Warranty strictly guarantees **FRP DOOR MATERIAL ONLY** (100% Water, Termite & Borer Proof Body). Hinges, locks, handles, coatings, and civil settlement impact are explicitly excluded.
5. **AI Read-Only Governance**: The AI Financial Strategist operates exclusively as a read-only advisor and cannot execute payments or modify the financial ledger without director sign-off.

---

## 3. Technology Stack

- **Framework**: Next.js 16.4.3 (App Router with Turbopack)
- **Frontend**: React 19, Tailwind CSS v4, Lucide Icons
- **Database & Storage**: PostgreSQL via Prisma ORM + local persistent JSON data store dual-write pattern in `data/`
- **Desktop Runtime**: Electron with single-instance lock and secure IPC bridge
- **Mobile & Offline**: Progressive Web App (PWA) with Web App Manifest and Service Worker caching
- **Language**: TypeScript 5 (Strict Mode, 0 ESLint warnings policy)

---

## 4. Quick Start & Operational Commands

### Development Server
```powershell
npm run dev
# Accessible at http://localhost:3000
```

### Production Build & Launch
```powershell
npm run build
npm start
```

### Windows Desktop Application (Electron)
```powershell
# Run desktop app connected to local/cloud ERP
npm run desktop:dev

# Package Windows EXE installer and portable executable
npm run desktop:build
```

### Master Acceptance Test Suite (Phases 1–9)
Runs the complete 35-test integration suite verifying all modules end-to-end:
```powershell
npm run test:master
```

### Automated Windows Office Backup Agent
Creates a full point-in-time snapshot with SHA-256 cryptographic verification:
```powershell
npm run backup
```

### Code Quality & Linting
```powershell
npm run lint
```

---

## 5. Architectural Directory Layout

```
exmark-erp/
├── app/                              # Next.js App Router
│   ├── api/                          # 26 REST API Endpoints
│   │   ├── auth/                     # Authentication & sessions
│   │   ├── boq/                      # Bill of Quantities engine
│   │   ├── communication/whatsapp/   # Meta Cloud API
│   │   ├── crm/leads/                # Leads & follow-ups
│   │   ├── customers/                # Customer ledger
│   │   ├── finance/                  # Invoices, payments, strategist
│   │   ├── fulfillment/              # Dispatches, installations, warranty
│   │   ├── measurements/             # 4-point measurements & confirmation
│   │   ├── production/               # Production orders & stickers
│   │   ├── quotations/               # GST quotations
│   │   ├── reports/                  # Universal Kerala reports
│   │   ├── settings/                 # Product category toggles
│   │   └── system/                   # Backup, concurrency, update manager
│   ├── layout.tsx                    # Root layout with PWA meta & provider
│   └── page.tsx                      # Unified ERP dashboard view
├── components/                       # React UI Components
│   ├── layout/                       # Sidebar, Navbar, Mobile navigation
│   ├── modules/                      # 14 ERP Module views
│   │   ├── crm/                      # LeadFormModal
│   │   ├── customers/                # CustomerFormModal
│   │   ├── finance/                  # PaymentReceiptModal, FinancialStrategistModal
│   │   ├── fulfillment/              # DispatchScheduleModal, InstallationSignoffModal, WarrantyCertificateModal
│   │   ├── production/               # JobCardModal, StickerPrintModal
│   │   └── quotations/               # QuotationBuilder
│   ├── pwa/                          # PwaRegister & install banner
│   └── settings/                     # ProductCategoriesSettings
├── data/                             # Dual-write persistent JSON data stores
├── electron/                         # Desktop application wrapper
│   ├── main.js                       # Electron main process & menu
│   └── preload.js                    # Secure context bridge
├── lib/
│   ├── audit/                        # Audit logging engine
│   ├── auth/                         # RBAC roles & permissions
│   ├── context/                      # ProductCategoryContext
│   └── services/                     # 14 Enterprise service modules
├── public/                           # Manifest, service worker, SVG icons
├── scripts/                          # Automated test suites & backup agent
└── types/                            # Type definitions
```

---

## 6. Official Version & Release Information

- **Release Channel**: `production`
- **Current Version**: `2.4.0`
- **Build Status**: Verified (35/35 Master Acceptance Tests Passed)
- **Integrity Status**: 100% Cryptographic Verification Passed
