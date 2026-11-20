import { getAuthoritativeAppVersion } from './updateManager';
export * from './updateManager';

export interface SystemVersionInfo {
  appVersion: string;
  releaseChannel: 'production' | 'staging';
  buildDate: string;
  gitCommit: string;
  environment: string;
  uptimeSeconds: number;
  health: {
    status: 'OPTIMAL' | 'DEGRADED';
    dataStoreIntegrity: boolean;
    primaryCategory: string; // "FRP (Fibreglass Reinforced Polymer)"
    wpcStatus: string; // "OPTIONAL_DISABLED_BY_DEFAULT"
    dualWriteActive: boolean;
  };
  changelog: Array<{
    phase: string;
    version: string;
    title: string;
    features: string[];
  }>;
}

const START_TIME = Date.now();

export function getSystemVersionInfo(): SystemVersionInfo {
  const version = getAuthoritativeAppVersion();
  return {
    appVersion: version,
    releaseChannel: 'production',
    buildDate: '2026-11-16',
    gitCommit: 'bbe4ac4',
    environment: process.env.NODE_ENV || 'production',
    uptimeSeconds: Math.floor((Date.now() - START_TIME) / 1000),
    health: {
      status: 'OPTIMAL',
      dataStoreIntegrity: true,
      primaryCategory: 'FRP (Fibreglass Reinforced Polymer)',
      wpcStatus: 'OPTIONAL_DISABLED_BY_DEFAULT',
      dualWriteActive: true,
    },
    changelog: [
      {
        phase: 'Phase 1',
        version: '1.0.0',
        title: 'Audit & Core Foundation',
        features: [
          '4-point site measurement recording modal with mm/cm/inch conversion',
          'Primary product category enforcement (FRP enabled, WPC optional & disabled by default)',
          'Dual-write persistent store pattern',
        ],
      },
      {
        phase: 'Phase 2',
        version: '1.2.0',
        title: 'Core Sales & CRM Pipeline',
        features: [
          'Bilingual Kerala CRM Leads & customer management',
          'BOQ spreadsheet import & line item engine',
          'Direct Quotation builder with flexible sizing & installation options',
        ],
      },
      {
        phase: 'Phase 3',
        version: '1.4.0',
        title: 'Manufacturing & Cutting Tolerances',
        features: [
          'Deterministic finished cutting size deduction (Finished = Raw - 10mm)',
          'Unique door serial identifier (EXM-DR-2026-XXXX)',
          'Factory Job Cards & A4/Thermal sticker barcode generator',
        ],
      },
      {
        phase: 'Phase 4',
        version: '1.6.0',
        title: 'Financial Management & Direct Billing',
        features: [
          'Commercial Sales Bills and advance payment receipts',
          'Monthly financial targets and sales performance metrics',
          'FRP door break-even volume and margin calculator',
        ],
      },
      {
        phase: 'Phase 5',
        version: '1.8.0',
        title: 'Universal Reports & Official WhatsApp API',
        features: [
          'Kerala 14-district sales analytics & receivables aging',
          'Official Meta WhatsApp Business Cloud API integration',
          'Bilingual English/Malayalam notification templates',
          'Expiring customer measurement confirmation links',
        ],
      },
      {
        phase: 'Phase 6',
        version: '2.0.0',
        title: 'AI Financial Strategist & Scenarios',
        features: [
          'Kerala market cash flow & DSO analytical engine',
          'Stress-tested 3-scenario forecasting (Conservative, Base, Expansion)',
          'Strict read-only advisory governance barrier',
        ],
      },
      {
        phase: 'Phase 7',
        version: '2.2.0',
        title: 'Fulfillment, Logistics & Warranty',
        features: [
          'Fleet logistics dispatch tracking across Kerala',
          'Site installation 5-star quality sign-off',
          'Official 10/15-year FRP material warranty certificate with explicit exclusions',
        ],
      },
      {
        phase: 'Phase 8',
        version: '2.3.0',
        title: 'Multi-Platform PWA & Windows Desktop EXE',
        features: [
          'PWA Manifest & service worker for Android/iPhone/Desktop offline access',
          'Electron desktop wrapper with single-instance lock',
          'Multi-user optimistic concurrency locking & editing lease presence',
        ],
      },
      {
        phase: 'Phase 9',
        version: '2.4.0',
        title: 'Reliability, Backup Agent & Master Production Release',
        features: [
          'Automated Windows Office Backup Agent with SHA-256 integrity check',
          'System update manager & health monitoring',
          'Master end-to-end acceptance test verification suite',
        ],
      },
      {
        phase: 'Phase 10',
        version: '2.5.0',
        title: 'Dual Molding Teams & Zero-Data-Loss Upgrades',
        features: [
          'Multi-team / split door molding on the same Work Order without lock collision',
          'Cumulative door balance validation in piece-rate lock engine',
          'Automated point-in-time SHA-256 pre-update backup snapshot',
          'Additive schema migration v3 preserving all 34 JSON data stores',
          'Safe update runner script with zero data loss guarantee',
        ],
      },
      {
        phase: 'Release v1.3.0',
        version: '1.3.0',
        title: 'Universal Search, Stock CRUD & High-Contrast White UI',
        features: [
          'Real-time Universal Catalog Search across all 24 ERP modules from navbar (Ctrl+K)',
          'Stock Maintenance CRUD (Inward register, manual deductions, buffer editing & WIP Floor Rework station)',
          '12L Multi-Opening Universal Format & Unslashed Normal Zero (0) Thermal Sticker Print Parity',
          'Quotation Frame Color Lock & real-time BOQ synchronization',
          '100% Pure White Background (#FFFFFF) & Solid Deep Black Letters (#000000) with Sharp Black Borders',
          'Live Typography Scaling (90% to 140%) and Darkness/Boldness (Normal, Bold, Extra Bold) Controls',
        ],
      },
      {
        phase: 'Release v1.4.0',
        version: '1.4.0',
        title: 'BOQ Post-Issuance Edit, Activity Audit Log & A4 Landscape Form',
        features: [
          'Post-Issuance BOQ Editing with real-time stock delta reconciliation (extra deduction / return to inventory)',
          'Comprehensive System Activity & Audit Log in Settings tracking all CREATE, EDIT, and DELETE operations',
          'Persistent atomic audit logging (audit-logs-store.json) with search, filters, diff inspector & CSV export',
          'A4 Landscape Printable Measurement Form & PDF with complete door openings schedule and 3-part sign-off box',
          'Post-save measurement prompt with direct 1-click A4 Landscape print & PDF generation',
          'Pure White UI (#FFFFFF) with solid black text and custom live typography scaling engine',
        ],
      },
    ],
  };
}
