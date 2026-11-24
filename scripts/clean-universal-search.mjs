import fs from 'fs';
import path from 'path';

const filePath = path.resolve('lib/utils/universalSearchIndex.ts');
let content = fs.readFileSync(filePath, 'utf8');

const SUBTITLE_REPLACEMENTS = {
  'റോ മെറ്റീരിയൽ സ്റ്റോർ, ഫ്ലോർ സ്റ്റേജ് ഇൻവെന്ററി, ബഫർ പ്ലാനിംഗ്': 'Raw material store, floor stage inventory, buffer planning',
  'ഡെയിലി BOQ ഇഷ്യൂ, സ്റ്റോർ സ്ലിപ്പ്, മെറ്റീരിയൽ ഡിഡക്ഷൻ': 'Daily BOQ issuance, store issue slip, material deduction',
  'ടോവൽ സ്റ്റിക്കർ സ്റ്റുഡിയോ, 12L മൾട്ടി-പാർട്ടി ബാച്ച് പ്രിന്റിംഗ്': 'Towel sticker studio, 12L multi-party batch printing',
  'കൺഫേംഡ് ഓർഡർ ബുക്കിംഗ്, അഡ്വാൻസ് വെരിഫിക്കേഷൻ': 'Confirmed order booking, advance verification',
  'ഫീൽഡ് സർവേ, 4-പോയിന്റ് അളവുകൾ, ഡോർ ഷെഡ്യൂൾ': 'Field survey, 4-point measurements, door schedule',
  'ടാക്സ് ഇൻവോയ്സ്, ഇ-വേ ബില്ലിംഗ്, സെയിൽസ് റിട്ടേൺസ്': 'Tax invoice, e-way billing, sales returns',
  'കമ്പനി പ്രൊഫൈൽ, സ്റ്റാഫ് ലോഗിൻ RBAC, ടോളറൻസുകൾ': 'Company profile, staff login RBAC, tolerances',
  'കെമിക്കൽ പർച്ചേസ്, സപ്ലയർമാർ, നോൺ-GST PO': 'Chemical purchases, suppliers, non-GST PO',
  'സൈറ്റ് ഇൻസ്റ്റാളേഷൻ, ഫിറ്റിംഗ്, കീ ഹാൻഡ്ഓവർ സർട്ടിഫിക്കറ്റ്': 'Site installation, fitting, key handover certificate',
  'ക്യാഷ് ബുക്ക്, ഡേ ബുക്ക്, ലെഡ്ജർ, BEP ബ്രേക്ക്-ഈവൻ': 'Cash book, day book, ledger, BEP break-even analysis',
  'എക്‌സിക്യൂട്ടീവ് അനലിറ്റിക്സ്, പ്രോഫിറ്റ് & ലോസ്, BOQ റിപ്പോർട്ട്': 'Executive analytics, profit & loss, BOQ report',
  'ഫാക്ടറി ജീവനക്കാരുടെ ഹാജർ, ഷിഫ്റ്റ് റോസ്റ്റർ, പേറോൾ': 'Factory employee attendance, shift roster, payroll',
  'ഡോർ കൊട്ടേഷൻ തയ്യാറാക്കൽ, പ്രൈസിംഗ്, BOQ കോസ്റ്റ് സിങ്ക്': 'Door quotation creation, pricing, BOQ cost sync',
  'ജോബ് കാർഡുകൾ, മോൾഡിംഗ്, കട്ടിംഗ്, പെയിന്റിംഗ്, പാക്കിംഗ്': 'Job cards, molding, cutting, painting, packing',
  '6-പോയിന്റ് ടെക്നിക്കൽ ഇൻസ്പെക്ഷൻ, ഡിഫക്റ്റ് ട്രാക്കിംഗ്': '6-point technical inspection, defect tracking',
  'കസ്റ്റമർ ലീഡ്സ്, ഫോളോ-അപ്പുകൾ, സെയിൽസ് പൈപ്പ്‌ലൈൻ': 'Customer leads, follow-ups, sales pipeline',
  'ബിൽഡർമാർ, ആർക്കിടെക്റ്റുകൾ, ഹോൾസെയിൽ ഡീലർമാർ': 'Builders, architects, wholesale dealers directory',
  'പീസ്-റേറ്റ് ലെഡ്ജർ, ഫ്ലോർ ഗ്യാങ് അസൈൻമെന്റ്, കൂലി കണക്കുകൾ': 'Piece-rate ledger, floor gang assignment, wage records',
  'വെഹിക്കിൾ ഔട്ട്‌വേർഡ്, മെറ്റീരിയൽ ഗേറ്റ് പാസ്സ് (റിട്ടേണബിൾ / നോൺ-റിട്ടേണബിൾ)': 'Vehicle outward, material gate pass (returnable / non-returnable)',
  'ഡെലിവറി ചെല്ലാൻ, ക്രേറ്റിംഗ്, കെഎൽ-09 ട്രക്ക് ഡിസ്പാച്ച്': 'Delivery challan, crating, KL-09 truck dispatch',
  'ഹൈഡ്രോളിക് പ്രസ്സ്, കംപ്രസ്സർ, മെഷീൻ ലോഗ് ബുക്ക്': 'Hydraulic press, compressor, machine log book',
  'മൊബൈൽ ഫീൽഡ് മെഷർമെന്റ്, ഫ്ലോർ ക്യുആർ സ്കാനർ, ഫ്ലീറ്റ് GPS': 'Mobile field measurement, floor QR scanner, fleet GPS',
  'ബ്രോഷർ ബ്രോഡ്കാസ്റ്റ്, കാറ്റലോഗ്, കസ്റ്റമർ മെസ്സേജിംഗ്': 'Brochure broadcast, catalog, customer messaging',
  'ഫാക്ടറി ലൈവ് സ്റ്റാറ്റസ്, ഓപ്പറേഷണൽ കെപിഐ, ബിസിനസ്സ് അവലോകനം': 'Factory live status, operational KPIs, business overview',
};

for (const [malayalam, english] of Object.entries(SUBTITLE_REPLACEMENTS)) {
  content = content.replace(malayalam, english);
}

// Now handle keywords lines and individual array elements
const lines = content.split('\n');
const cleanedLines = [];

for (const line of lines) {
  if (line.includes('keywords: [')) {
    // Single line keyword array
    const parts = line.split(/keywords:\s*\[(.*)\]/s);
    if (parts.length >= 3) {
      const items = parts[1].split(',').map(s => s.trim()).filter(Boolean);
      const filtered = items.filter(it => !/[\u0D00-\u0D7F]/.test(it));
      cleanedLines.push(line.replace(/keywords:\s*\[(.*)\]/, `keywords: [${filtered.join(', ')}]`));
      continue;
    }
  }

  // If a standalone line inside a multiline keywords array has Malayalam
  if (/[\u0D00-\u0D7F]/.test(line)) {
    // If it's a quoted keyword item e.g. "      'സ്റ്റോക്ക്',"
    if (/^\s*['"][^\n]+['"],?\s*$/.test(line)) {
      // omit line
      continue;
    }
  }

  cleanedLines.push(line);
}

const finalContent = cleanedLines.join('\n');
fs.writeFileSync(filePath, finalContent, 'utf8');

const remainingMatches = finalContent.match(/[\u0D00-\u0D7F]/g);
console.log('Universal Search Index cleaned. Remaining Malayalam chars:', remainingMatches ? remainingMatches.length : 0);
