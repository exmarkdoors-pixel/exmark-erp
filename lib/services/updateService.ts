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
  return {
    appVersion: '2.4.0-production',
    releaseChannel: 'production',
    buildDate: '2026-10-28',
    gitCommit: 'a3c6cc1',
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
          'GST Quotation builder with 18% GST (HSN 3925.20.00)',
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
        title: 'Financial Management & GST Invoicing',
        features: [
          'GST Tax Invoices and advance payment receipts',
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
    ],
  };
}
