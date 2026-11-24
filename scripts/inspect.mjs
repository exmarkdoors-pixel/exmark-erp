import fs from 'fs';

const files = [
  'app/warranty/[id]/page.tsx',
  'components/modules/DoorMeasurementModal.tsx',
  'components/modules/fulfillment/WarrantyCertificateModal.tsx',
  'components/modules/ModuleViews.tsx',
  'components/modules/quotations/WhatsAppQuoteShareModal.tsx',
  'components/modules/sales/MarketingSalesExpansionHub.tsx',
  'components/settings/AdminCustomizationSettings.tsx',
  'lib/services/customizationService.ts',
  'lib/services/fulfillmentService.ts',
  'lib/services/locationWarrantyService.ts',
  'lib/services/reportService.ts',
  'lib/services/updateService.ts',
  'lib/services/vyaparPartyImportService.ts',
  'lib/types/projectRiskProfit.ts',
  'types/communication.ts',
  'types/fulfillment.ts'
];

for (const f of files) {
  if (!fs.existsSync(f)) continue;
  const content = fs.readFileSync(f, 'utf8');
  const lines = content.split('\n');
  lines.forEach((l, idx) => {
    if (/malayalam|gayathri|manjari|anek|chilanka/i.test(l)) {
      console.log(`${f}:${idx + 1}: ${l.trim()}`);
    }
  });
}
