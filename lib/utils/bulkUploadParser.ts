import { DoorItemInput, MeasurementUnit } from '@/types/measurements';
import * as XLSX from 'xlsx';

/**
 * Detect delimiter by scanning first line outside quotes
 */
function detectDelimiter(firstLine: string): string {
  let inQuotes = false;
  let commas = 0;
  let tabs = 0;
  let semicolons = 0;

  for (let i = 0; i < firstLine.length; i++) {
    const ch = firstLine[i];
    if (ch === '"') inQuotes = !inQuotes;
    else if (!inQuotes) {
      if (ch === '\t') tabs++;
      else if (ch === ',') commas++;
      else if (ch === ';') semicolons++;
    }
  }

  if (tabs > commas && tabs > semicolons) return '\t';
  if (semicolons > commas && semicolons > tabs) return ';';
  return ',';
}

/**
 * Robust CSV/TSV parser supporting quoted fields, escaped quotes, multiline values,
 * and automatic delimiter detection (comma, tab, semicolon).
 */
export function parseCsvRows(csvText: string): Array<Record<string, string>> {
  if (!csvText || typeof csvText !== 'string') return [];

  // 1. Strip UTF-8 BOM if present
  const cleanText = csvText.replace(/^\uFEFF/, '').trim();
  if (cleanText.length === 0) return [];

  // 2. Identify delimiter from first line
  const firstNewlineIdx = cleanText.search(/\r?\n/);
  const firstLine = firstNewlineIdx !== -1 ? cleanText.slice(0, firstNewlineIdx) : cleanText;
  const delimiter = detectDelimiter(firstLine);

  // 3. Tokenize grid handling multiline quoted fields & escaped quotes ("")
  const rowsRaw: string[][] = [];
  let currentRow: string[] = [];
  let currentField = '';
  let inQuotes = false;

  for (let i = 0; i < cleanText.length; i++) {
    const char = cleanText[i];
    const nextChar = cleanText[i + 1];

    if (char === '"') {
      if (inQuotes && nextChar === '"') {
        currentField += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === delimiter && !inQuotes) {
      currentRow.push(currentField.trim());
      currentField = '';
    } else if ((char === '\r' || char === '\n') && !inQuotes) {
      if (char === '\r' && nextChar === '\n') {
        i++; // skip \n
      }
      currentRow.push(currentField.trim());
      currentField = '';
      if (currentRow.some((val) => val.length > 0)) {
        rowsRaw.push(currentRow);
      }
      currentRow = [];
    } else {
      currentField += char;
    }
  }

  // Push final field/row
  currentRow.push(currentField.trim());
  if (currentRow.some((val) => val.length > 0)) {
    rowsRaw.push(currentRow);
  }

  if (rowsRaw.length < 2) return [];

  // Clean headers (remove BOM residues or outer quotes)
  const headers = rowsRaw[0].map((h) => h.replace(/^\uFEFF/, '').replace(/^"|"$/g, '').trim());
  const rows: Array<Record<string, string>> = [];

  for (let i = 1; i < rowsRaw.length; i++) {
    const values = rowsRaw[i];
    if (values.length === 0 || (values.length === 1 && !values[0])) continue;

    const rowObj: Record<string, string> = {};
    headers.forEach((header, index) => {
      if (header) {
        rowObj[header] = (values[index] || '').replace(/^"|"$/g, '').trim();
      }
    });
    rows.push(rowObj);
  }

  return rows;
}

/**
 * Parses binary Excel files (.xlsx, .xls) directly in browser using SheetJS
 */
export async function parseExcelFile(file: File): Promise<Array<Record<string, string>>> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array' });
  if (!workbook.SheetNames || workbook.SheetNames.length === 0) return [];

  const firstSheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[firstSheetName];
  if (!worksheet) return [];

  const rawJson = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet, {
    defval: '',
    raw: false,
  });

  return rawJson.map((row) => {
    const normalizedRow: Record<string, string> = {};
    for (const [key, val] of Object.entries(row)) {
      const cleanKey = String(key || '').replace(/^\uFEFF/, '').trim();
      if (cleanKey) {
        normalizedRow[cleanKey] = val !== undefined && val !== null ? String(val).trim() : '';
      }
    }
    return normalizedRow;
  });
}

/**
 * Generate native formatted Excel workbook (.xlsx) as Uint8Array
 */
export function generateExcelTemplate(
  type: 'LEADS' | 'MODELS' | 'COLOURS' | 'LOCKS' | 'OPENINGS'
): Uint8Array {
  const wb = XLSX.utils.book_new();

  if (type === 'LEADS') {
    const data = [
      ['Project Name', 'Client / Party', 'Contact Person', 'Mobile Number', 'District', 'Doors Requirement', 'Door Count', 'Est Value (₹)', 'Lead Stage', 'Sales Executive', 'Remarks / Notes'],
      ['Villa Project Perinthalmanna', 'Skyline Builders', 'Shaji P', '+91 98460 12345', 'Malappuram', '14 FRP Bath + 8 Teak Bed', 22, 185000, 'Inquiries', 'Riyas Sales', 'Site ready for tape measurements next week'],
      ['Marine Drive Flat Renovation', 'Coastal Living Interiors', 'Deepa Nair', '+91 94470 67890', 'Ernakulam', '8 FRP Premium Doors', 8, 72000, 'Measurement', 'Anas Site Measurer', 'Tape survey booked for Monday'],
      ['Commercial Plaza Calicut', 'Malabar Infra Ltd', 'Hameed K', '+91 97450 11223', 'Kozhikode', '30 Commercial FRP Doors', 30, 240000, 'Quotation', 'Riyas Sales', 'Awaiting client rate sign-off'],
      ['Edappally Luxury Residence', 'Dr. George Varghese', 'Dr. George', '+91 98471 99887', 'Ernakulam', '10 Luxury CNC Main & Bed', 10, 145000, 'Negotiation', 'Riyas Sales', 'Final price discount negotiation'],
      ['Wayanad Resort Cottages', 'Green Valley Resorts', 'Pradeep V', '+91 96560 33445', 'Wayanad', '16 Waterproof Heavy FRP', 16, 128000, 'Inquiries', 'Central Sales', 'High moisture area specifications'],
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [
      { wch: 28 }, // Project Name
      { wch: 24 }, // Client
      { wch: 18 }, // Contact
      { wch: 18 }, // Mobile
      { wch: 15 }, // District
      { wch: 26 }, // Doors
      { wch: 12 }, // Count
      { wch: 14 }, // Value
      { wch: 14 }, // Stage
      { wch: 18 }, // Executive
      { wch: 38 }, // Notes
    ];
    XLSX.utils.book_append_sheet(wb, ws, 'CRM Leads');
  } else if (type === 'MODELS') {
    const data = [
      ['code', 'name', 'category', 'basePrice', 'ratePerSqFt', 'defaultThickness', 'description'],
      ['EXM-A-102', 'EXM-A-102 Heavy Waterproof', 'Bath FRP Door', 7800, 430, '32mm', 'Solid high density core bathroom door'],
      ['EXM-B-205', 'EXM-B-205 Classical Rosewood', 'Bed Room Door', 8600, 475, '35mm', 'Deep PU molded woodgrain finish'],
      ['EXM-D-320', 'EXM-D-320 Villa CNC Main Door', 'Main Entry Door', 9900, 560, '35mm', 'Prestige Kerala geometric carving'],
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Door Models');
  } else if (type === 'COLOURS') {
    const data = [
      ['code', 'name', 'finishType', 'hexColor', 'description'],
      ['EXGC-550', 'Royal Teak Matte', 'Matte UV', '#A26229', 'UV-protected non-glare teak finish'],
      ['EXGC-900', 'Jet Black High Gloss', 'High Gloss UV', '#111827', 'Modern ultra-deep black gloss finish'],
      ['EXGC-750', 'Antique Walnut Bronze', 'Classical Kerala', '#3F2015', 'Hand-rubbed architectural vintage tone'],
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Colours');
  } else if (type === 'LOCKS') {
    const data = [
      ['name', 'lockType', 'price', 'description'],
      ['Godrej Smart Digital Bio Lock (+₹1400)', 'Digital Smart Lock', 1400, 'Fingerprint and RFID smart mortise lock'],
      ['Heavy Brass Tower Bolt 8 Inch (+₹350)', 'Deadbolt', 350, 'Solid Kerala brass antique finish surface bolt'],
      ['Magnetic Silent Bathroom Latch (+₹500)', 'Baby Latch', 500, 'Zero-noise magnetic latch mechanism'],
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Locks & Hardware');
  } else {
    // OPENINGS
    const data = [
      ['doorNumber', 'category', 'model', 'heightLeft', 'heightRight', 'widthTop', 'widthBottom', 'unit', 'fraction', 'colour', 'insideColour', 'lock', 'quantity', 'adjustment', 'remarks'],
      ['#D1', 'Bath FRP Door', 'EXM-A-100 (₹7000)', 203.2, 203.2, 81.3, 81.3, 'CM', '0/8', 'Natural Teak (EXGC-510)', 'Natural Teak (EXGC-510)', 'Baby Latch (+₹200)', 1, 300, 'Master ensuite opening'],
      ['#D2', 'Bath FRP Door', 'EXM-A-100 (₹7000)', 203.2, 203.2, 76.2, 76.2, 'CM', '0/8', 'Frost White (High Gloss Waterproof)', 'Frost White', 'Baby Latch (+₹200)', 1, 0, 'Guest bath opening'],
      ['#D3', 'Bed Room Door', 'EXM-B-200 Teak Woodgrain (₹8200)', 80, 80, 32, 32, 'INCH', '0/8', 'Natural Teak (EXGC-510)', 'Natural Teak', 'Mortise Lock 60mm (+₹850)', 2, 0, 'Bedroom 1 & 2'],
      ['#D4', 'Main Entry Door', 'EXM-D-300 Luxury CNC Main (₹9500)', 2134, 2134, 965, 965, 'MM', '0/8', 'Rosewood Classical Kerala Finish', 'Rosewood', 'Digital Smart Lock Prep (+₹600)', 1, 500, 'Foyer entrance'],
    ];
    const ws = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(wb, ws, 'Door Openings');
  }

  const binary = XLSX.write(wb, { type: 'array', bookType: 'xlsx' });
  return new Uint8Array(binary);
}

/**
 * Generate CSV template strings for downloads
 */
export function getSampleCsvTemplate(type: 'MODELS' | 'COLOURS' | 'LOCKS' | 'OPENINGS' | 'LEADS'): string {
  if (type === 'LEADS') {
    return [
      'title,client,contactPerson,phone,district,doors,doorCount,value,stage,assignedToId,notes',
      'Villa Project Perinthalmanna,Skyline Builders,Shaji P,+91 98460 12345,Malappuram,14 FRP Bath + 8 Teak Bed,22,185000,inquiries,Riyas Sales,Site ready for tape measurements next week',
      'Marine Drive Flat Renovation,Coastal Living Interiors,Deepa Nair,+91 94470 67890,Ernakulam,8 FRP Premium Doors,8,72000,measurement,Anas Site Measurer,Tape survey booked for Monday',
      'Commercial Plaza Calicut,Malabar Infra Ltd,Hameed K,+91 97450 11223,Calicut,30 Commercial FRP Doors,30,240000,quotation,Riyas Sales,Awaiting client rate sign-off',
      'Edappally Luxury Residence,Dr. George Varghese,Dr. George,+91 98471 99887,Ernakulam,10 Luxury CNC Main & Bed,10,145000,negotiation,Riyas Sales,Final price discount negotiation',
      'Wayanad Resort Cottages,Green Valley Resorts,Pradeep V,+91 96560 33445,Wayanad,16 Waterproof Heavy FRP,16,128000,inquiries,Central Sales,High moisture area specifications',
    ].join('\n');
  }

  if (type === 'MODELS') {
    return [
      'code,name,category,basePrice,ratePerSqFt,defaultThickness,description',
      'EXM-A-102,EXM-A-102 Heavy Waterproof,Bath FRP Door,7800,430,32mm,Solid high density core bathroom door',
      'EXM-B-205,EXM-B-205 Classical Rosewood,Bed Room Door,8600,475,35mm,Deep PU molded woodgrain finish',
      'EXM-D-320,EXM-D-320 Villa CNC Main Door,Main Entry Door,9900,560,35mm,Prestige Kerala geometric carving',
    ].join('\n');
  }

  if (type === 'COLOURS') {
    return [
      'code,name,finishType,hexColor,description',
      'EXGC-550,Royal Teak Matte,Matte UV,#A26229,UV-protected non-glare teak finish',
      'EXGC-900,Jet Black High Gloss,High Gloss UV,#111827,Modern ultra-deep black gloss finish',
      'EXGC-750,Antique Walnut Bronze,Classical Kerala,#3F2015,Hand-rubbed architectural vintage tone',
    ].join('\n');
  }

  if (type === 'LOCKS') {
    return [
      'name,lockType,price,description',
      'Godrej Smart Digital Bio Lock (+₹1400),Digital Smart Lock,1400,Fingerprint and RFID smart mortise lock',
      'Heavy Brass Tower Bolt 8 Inch (+₹350),Deadbolt,350,Solid Kerala brass antique finish surface bolt',
      'Magnetic Silent Bathroom Latch (+₹500),Baby Latch,500,Zero-noise magnetic latch mechanism',
    ].join('\n');
  }

  // OPENINGS
  return [
    'doorNumber,category,model,heightLeft,heightRight,widthTop,widthBottom,unit,fraction,colour,insideColour,lock,quantity,adjustment,remarks',
    '#D1,Bath FRP Door,EXM-A-100 (₹7000),203.2,203.2,81.3,81.3,CM,0/8,Natural Teak (EXGC-510),Natural Teak (EXGC-510),Baby Latch (+₹200),1,300,Master ensuite opening',
    '#D2,Bath FRP Door,EXM-A-100 (₹7000),203.2,203.2,76.2,76.2,CM,0/8,Frost White (High Gloss Waterproof),Frost White,Baby Latch (+₹200),1,0,Guest bath opening',
    '#D3,Bed Room Door,EXM-B-200 Teak Woodgrain (₹8200),80,80,32,32,INCH,0/8,Natural Teak (EXGC-510),Natural Teak,Mortise Lock 60mm (+₹850),2,0,Bedroom 1 & 2',
    '#D4,Main Entry Door,EXM-D-300 Luxury CNC Main (₹9500),2134,2134,965,965,MM,0/8,Rosewood Classical Kerala Finish,Rosewood,Digital Smart Lock Prep (+₹600),1,500,Foyer entrance',
  ].join('\n');
}

/**
 * Validate and convert parsed CSV rows into DoorItemInput array
 */
export function parseOpeningsCsv(rows: Array<Record<string, string>>): {
  doors: DoorItemInput[];
  errors: string[];
} {
  const doors: DoorItemInput[] = [];
  const errors: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const doorNumber = r.doorNumber || r.door || `#D${i + 1}`;
    const model = r.model || 'EXM-A-100 (₹7000)';
    const category = r.category || 'Bath FRP Door';
    const unit = (r.unit || 'CM').toUpperCase() as MeasurementUnit;

    const hl = parseFloat(r.heightLeft || r.height || '203.2');
    const hr = parseFloat(r.heightRight || r.heightLeft || '203.2');
    const wt = parseFloat(r.widthTop || r.width || '81.3');
    const wb = parseFloat(r.widthBottom || r.widthTop || '81.3');

    if (isNaN(hl) || hl <= 0 || isNaN(wt) || wt <= 0) {
      errors.push(`Row #${i + 1} (${doorNumber}): Invalid positive height or width values.`);
      continue;
    }

    const qty = parseInt(r.quantity || r.qty || '1') || 1;
    const basePrice = parseFloat(r.basePrice || '7000') || 7000;
    const lock = r.lock || 'Baby Latch (+₹200)';
    const lockPrice = lock.includes('+₹') ? parseFloat(lock.split('+₹')[1]) || 200 : 200;
    const priceAdjustment = parseFloat(r.adjustment || r.priceAdjustment || '0') || 0;
    const unitPrice = Math.max(0, basePrice + lockPrice + priceAdjustment);

    // Calculate Sq.Ft
    let hlMm = hl;
    let hrMm = hr;
    let wtMm = wt;
    let wbMm = wb;

    if (unit === 'INCH') {
      hlMm = hl * 25.4;
      hrMm = hr * 25.4;
      wtMm = wt * 25.4;
      wbMm = wb * 25.4;
    } else if (unit === 'CM') {
      hlMm = hl * 10;
      hrMm = hr * 10;
      wtMm = wt * 10;
      wbMm = wb * 10;
    }

    const avgH = (hlMm + hrMm) / 2;
    const avgW = (wtMm + wbMm) / 2;
    const calculatedSqFt = Number(((avgH * avgW) / 92903.04).toFixed(2));
    const calculatedFrameRft = Math.round((2 * avgH + avgW) / 304.8);

    doors.push({
      doorNumber,
      categoryName: category,
      model,
      sizePreset: 'Custom Masonry Opening',
      frameType: r.frameType || 'WPC Solid Extruded 100x65mm Frame',
      colour: r.colour || 'Natural Teak (EXGC-510)',
      insideColour: r.insideColour || r.colour || 'Natural Teak (EXGC-510)',
      hingeSide: r.hingeSide || 'Left Hand (LH) - Inward',
      lockType: lock,
      lockPrice,
      measurementUnit: ['CM', 'INCH', 'MM'].includes(unit) ? unit : 'CM',
      heightLeft: hl,
      heightRight: hr,
      widthTop: wt,
      widthBottom: wb,
      fractionHeightLeft: r.fraction || '0/8',
      fractionHeightRight: r.fraction || '0/8',
      fractionWidthTop: '0/8',
      fractionWidthBottom: '0/8',
      quantity: qty,
      wallThickness: r.wallThickness || '150mm',
      rebateDepth: r.rebateDepth || '38mm',
      basePrice,
      priceAdjustment,
      unitPrice,
      pricingMode: 'PIECE',
      calculatedSqFt,
      calculatedFrameRft,
      remarks: r.remarks || '',
      photoCount: 0,
    });
  }

  return { doors, errors };
}

export interface ParsedLeadItem {
  id?: string;
  title: string;
  client: string;
  contactPerson: string;
  phone: string;
  normalizedPhone: string;
  district: string;
  doors: string;
  doorCount: number;
  value: number;
  stage: 'inquiries' | 'measurement' | 'quotation' | 'negotiation';
  assignedToId?: string;
  notes: string;
  isDuplicate: boolean;
  duplicateReason?: string;
  warning?: string;
  error?: string;
  isValid: boolean;
}

const KERALA_DISTRICTS = [
  'Alappuzha',
  'Ernakulam',
  'Idukki',
  'Kannur',
  'Kasaragod',
  'Kollam',
  'Kottayam',
  'Kozhikode',
  'Calicut',
  'Malappuram',
  'Palakkad',
  'Pathanamthitta',
  'Thiruvananthapuram',
  'Trivandrum',
  'Thrissur',
  'Wayanad',
];

function normalizePhoneNumber(raw: string): string {
  if (!raw) return '';
  const digits = raw.replace(/\D/g, '');
  if (digits.length >= 10) {
    return digits.slice(-10);
  }
  return digits;
}

/**
 * Normalizes an arbitrary header string for fuzzy matching (strips punctuation, spaces, BOM)
 */
function normalizeHeaderKey(key: string): string {
  return key
    .replace(/^\uFEFF/, '')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

/**
 * Validate and parse CSV or Excel rows into structured CRM Lead items with duplicate detection
 */
export function parseLeadsCsv(
  rows: Array<Record<string, string>>,
  existingLeads: Array<{ phone?: string; leadCode?: string; client?: string; title?: string }> = []
): {
  items: ParsedLeadItem[];
  validCount: number;
  duplicateCount: number;
  errorCount: number;
} {
  const existingPhoneMap = new Map<string, string>();
  existingLeads.forEach((l) => {
    if (l.phone) {
      const norm = normalizePhoneNumber(l.phone);
      if (norm.length >= 10) {
        existingPhoneMap.set(norm, l.leadCode || l.client || l.title || 'Existing Lead');
      }
    }
  });

  const batchPhoneMap = new Map<string, number>();
  const items: ParsedLeadItem[] = [];
  let validCount = 0;
  let duplicateCount = 0;
  let errorCount = 0;

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];

    // Find value by checking normalized key against alias candidates
    const getVal = (...aliases: string[]): string => {
      const normalizedAliases = aliases.map(normalizeHeaderKey);
      for (const [rowKey, val] of Object.entries(r)) {
        const normRowKey = normalizeHeaderKey(rowKey);
        if (normalizedAliases.includes(normRowKey)) {
          return (val || '').trim();
        }
      }
      return '';
    };

    const rawTitle = getVal(
      'title',
      'project',
      'projectName',
      'leadTitle',
      'site',
      'siteName',
      'building',
      'work',
      'workName',
      'projectTitle',
      'titleProject',
      'siteProject'
    );
    const rawClient = getVal(
      'client',
      'party',
      'partyName',
      'firm',
      'clientName',
      'customer',
      'customerName',
      'name',
      'builder',
      'architect',
      'contractor',
      'clientParty',
      'partyClient',
      'customerParty',
      'partyCustomer',
      'builderArchitect'
    );
    const contactPerson = getVal(
      'contactPerson',
      'contact',
      'person',
      'contactName',
      'manager',
      'engineer',
      'rep',
      'contactPersonName'
    );
    const rawPhone = getVal(
      'phone',
      'mobile',
      'mobileNumber',
      'mobileNo',
      'whatsapp',
      'whatsappNo',
      'phoneNumber',
      'phoneNo',
      'contactNumber',
      'contactNo',
      'cell',
      'tel',
      'mobilePhone',
      'phoneMobile',
      'whatsappMobile'
    );
    const rawDistrict = getVal(
      'district',
      'location',
      'city',
      'town',
      'place',
      'siteLocation',
      'address',
      'area',
      'siteDistrict'
    );
    const doors =
      getVal(
        'doors',
        'doorSpecs',
        'requirement',
        'doorsRequirement',
        'doorRequirement',
        'doorDetails',
        'model',
        'items',
        'details',
        'doorSpecifications'
      ) || 'FRP & WPC Doors';
    const rawDoorCount = getVal(
      'doorCount',
      'doorsCount',
      'quantity',
      'qty',
      'nos',
      'noOfDoors',
      'totalDoors',
      'count',
      'quantityNos'
    );
    const rawValue = getVal(
      'value',
      'estimatedValue',
      'amount',
      'budget',
      'totalAmount',
      'estValue',
      'price',
      'projectValue',
      'orderAmount'
    );
    const rawStage = getVal('stage', 'leadStage', 'status', 'pipelineStage', 'currentStage', 'projectStatus').toLowerCase();
    const assignedToId =
      getVal(
        'assignedToId',
        'salesperson',
        'assignedTo',
        'executive',
        'staff',
        'rep',
        'salesman',
        'salesRep',
        'salesExecutive',
        'assignedStaff'
      ) || undefined;
    const notes = getVal('notes', 'remarks', 'comments', 'followUpNotes', 'note', 'remarksNotes', 'notesRemarks');

    // Title / Client fallbacks
    const title = rawTitle || rawClient || (contactPerson ? `${contactPerson} Project` : `Lead #${i + 1}`);
    const client = rawClient || rawTitle || contactPerson || `Lead #${i + 1}`;

    const normalizedPhone = normalizePhoneNumber(rawPhone);
    const isValidPhone = normalizedPhone.length >= 10;

    let district = 'Ernakulam';
    let warning: string | undefined;

    if (rawDistrict) {
      const match = KERALA_DISTRICTS.find(
        (d) => d.toLowerCase() === rawDistrict.toLowerCase()
      );
      if (match) {
        district =
          match === 'Calicut'
            ? 'Kozhikode'
            : match === 'Trivandrum'
            ? 'Thiruvananthapuram'
            : match;
      } else {
        district = rawDistrict;
        warning = `District "${rawDistrict}" not recognized as standard Kerala district.`;
      }
    }

    let stage: 'inquiries' | 'measurement' | 'quotation' | 'negotiation' = 'inquiries';
    if (rawStage.includes('measure')) stage = 'measurement';
    else if (rawStage.includes('quote') || rawStage.includes('quotation')) stage = 'quotation';
    else if (rawStage.includes('negotiat')) stage = 'negotiation';

    const doorCount = Math.max(1, parseInt(rawDoorCount || '1', 10) || 1);
    const value = Math.max(0, parseFloat(rawValue.replace(/[^0-9.]/g, '') || '0') || 0);

    let isDuplicate = false;
    let duplicateReason: string | undefined;
    let error: string | undefined;

    // Non-blocking phone handling:
    // If phone is missing or less than 10 digits, we still import the lead with a helpful warning!
    if (!rawPhone || !isValidPhone) {
      if (!warning) {
        warning = rawPhone
          ? `Phone "${rawPhone}" is under 10 digits (non-standard)`
          : 'No phone number provided';
      }
    } else {
      // Duplicate checks only apply to valid 10-digit mobile numbers
      if (existingPhoneMap.has(normalizedPhone)) {
        isDuplicate = true;
        duplicateReason = `Matches phone of existing lead: ${existingPhoneMap.get(normalizedPhone)}`;
        duplicateCount++;
      } else if (batchPhoneMap.has(normalizedPhone)) {
        isDuplicate = true;
        duplicateReason = `Duplicate phone number in file (Row #${(batchPhoneMap.get(normalizedPhone) || 0) + 1})`;
        duplicateCount++;
      } else {
        batchPhoneMap.set(normalizedPhone, i);
      }
    }

    // A row is only invalid if BOTH project title and client name are completely blank
    if (!rawTitle && !rawClient && !contactPerson) {
      error = 'Row is empty: Project Title, Client Name, or Contact Person is required';
      errorCount++;
    }

    const isValid = !error;
    if (isValid && !isDuplicate) {
      validCount++;
    }

    // Format phone nicely: +91 XXXXX XXXXX if 10 digits
    const formattedPhone = isValidPhone
      ? normalizedPhone.length === 10
        ? `+91 ${normalizedPhone.slice(0, 5)} ${normalizedPhone.slice(5)}`
        : rawPhone
      : rawPhone || '';

    items.push({
      title,
      client,
      contactPerson: contactPerson || client,
      phone: formattedPhone,
      normalizedPhone,
      district,
      doors,
      doorCount,
      value,
      stage,
      assignedToId,
      notes,
      isDuplicate,
      duplicateReason,
      warning,
      error,
      isValid,
    });
  }

  return {
    items,
    validCount,
    duplicateCount,
    errorCount,
  };
}
