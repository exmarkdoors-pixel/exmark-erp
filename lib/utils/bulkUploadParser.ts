import { DoorItemInput, MeasurementUnit } from '@/types/measurements';

/**
 * Basic robust CSV Parser supporting quoted fields and commas
 */
export function parseCsvRows(csvText: string): Array<Record<string, string>> {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) return [];

  // Parse header
  const headers = splitCsvLine(lines[0]).map((h) => h.trim());
  const rows: Array<Record<string, string>> = [];

  for (let i = 1; i < lines.length; i++) {
    const values = splitCsvLine(lines[i]);
    if (values.length === 0 || (values.length === 1 && !values[0])) continue;

    const rowObj: Record<string, string> = {};
    headers.forEach((header, index) => {
      rowObj[header] = (values[index] || '').trim();
    });
    rows.push(rowObj);
  }

  return rows;
}

function splitCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  result.push(current);
  return result.map((s) => s.replace(/^"|"$/g, '').trim());
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
    const calculatedFrameRft = Math.round(((2 * avgH) + avgW) / 304.8);

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
  const digits = raw.replace(/\D/g, '');
  if (digits.length >= 10) {
    return digits.slice(-10);
  }
  return digits;
}

/**
 * Validate and parse CSV rows into structured CRM Lead items with duplicate detection
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
    // Find case-insensitive keys
    const getVal = (...keys: string[]): string => {
      for (const k of keys) {
        for (const [rowKey, val] of Object.entries(r)) {
          if (rowKey.trim().toLowerCase() === k.toLowerCase()) {
            return (val || '').trim();
          }
        }
      }
      return '';
    };

    const rawTitle = getVal('title', 'project', 'projectName', 'leadTitle');
    const rawClient = getVal('client', 'firm', 'clientName', 'customer', 'customerName', 'name');
    const contactPerson = getVal('contactPerson', 'contact', 'person');
    const rawPhone = getVal('phone', 'mobile', 'whatsapp', 'phoneNumber', 'contactNumber');
    const rawDistrict = getVal('district', 'location', 'city', 'town');
    const doors = getVal('doors', 'doorSpecs', 'requirement', 'doorsRequirement') || 'FRP & WPC Doors';
    const rawDoorCount = getVal('doorCount', 'doorsCount', 'quantity', 'qty');
    const rawValue = getVal('value', 'estimatedValue', 'amount', 'budget');
    const rawStage = getVal('stage', 'leadStage', 'status').toLowerCase();
    const assignedToId = getVal('assignedToId', 'salesperson', 'assignedTo', 'executive') || undefined;
    const notes = getVal('notes', 'remarks', 'comments', 'followUpNotes');

    const client = rawClient || rawTitle || `Lead #${i + 1}`;
    const title = rawTitle || rawClient || `Lead #${i + 1}`;

    const normalizedPhone = normalizePhoneNumber(rawPhone);
    const isValidPhone = normalizedPhone.length >= 10;

    let district = 'Ernakulam';
    let warning: string | undefined;
    if (rawDistrict) {
      const match = KERALA_DISTRICTS.find(
        (d) => d.toLowerCase() === rawDistrict.toLowerCase()
      );
      if (match) {
        district = match === 'Calicut' ? 'Kozhikode' : match === 'Trivandrum' ? 'Thiruvananthapuram' : match;
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

    if (!rawPhone || !isValidPhone) {
      error = 'Valid 10-digit mobile or phone number is required';
      errorCount++;
    } else {
      if (existingPhoneMap.has(normalizedPhone)) {
        isDuplicate = true;
        duplicateReason = `Matches phone of existing lead: ${existingPhoneMap.get(normalizedPhone)}`;
        duplicateCount++;
      } else if (batchPhoneMap.has(normalizedPhone)) {
        isDuplicate = true;
        duplicateReason = `Duplicate phone number in CSV (Row #${(batchPhoneMap.get(normalizedPhone) || 0) + 1})`;
        duplicateCount++;
      } else {
        batchPhoneMap.set(normalizedPhone, i);
      }
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
      : rawPhone;

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
