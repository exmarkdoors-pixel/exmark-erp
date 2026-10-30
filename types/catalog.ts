/**
 * EXMARK ERP — Dynamic Catalog Types & Default Presets
 * Safe for both Client and Server usage.
 */

export interface DoorModelCatalogItem {
  id: string;
  code: string;
  name: string;
  category: string;
  basePrice: number;        // Per Piece Rate (e.g. ₹7000)
  ratePerSqFt: number;      // Rate per Square Foot (e.g. ₹395/sqft)
  defaultThickness: string; // e.g. '32mm', '35mm'
  description?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ColourCatalogItem {
  id: string;
  code: string;
  name: string;
  finishType: string;       // 'Woodgrain PU' | 'High Gloss Waterproof' | 'Matte UV' | 'Classical Kerala'
  hexColor?: string;
  description?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface LockCatalogItem {
  id: string;
  name: string;
  lockType: string;         // 'Baby Latch' | 'Mortise Lock' | 'Cylindrical Knob' | 'Digital Smart Lock' | 'Deadbolt'
  price: number;            // Surcharge in ₹ (e.g. 200, 850)
  description?: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface CatalogMaster {
  models: DoorModelCatalogItem[];
  colours: ColourCatalogItem[];
  locks: LockCatalogItem[];
  version: number;
  lastUpdated: string;
}

export const DEFAULT_CATALOG: CatalogMaster = {
  version: 1,
  lastUpdated: '2026-10-30T00:00:00.000Z',
  models: [
    {
      id: 'EXM-A-100',
      code: 'EXM-A-100',
      name: 'EXM-A-100 (₹7000)',
      category: 'Bath FRP Door',
      basePrice: 7000,
      ratePerSqFt: 395,
      defaultThickness: '32mm',
      description: 'Standard 100% waterproof bathroom FRP door with monolithic panel.',
      isActive: true,
    },
    {
      id: 'EXM-A-101',
      code: 'EXM-A-101',
      name: 'EXM-A-101 Premium Molded (₹7500)',
      category: 'Bath FRP Door',
      basePrice: 7500,
      ratePerSqFt: 420,
      defaultThickness: '32mm',
      description: 'Architectural deep-molded texture bathroom door with high impact resistance.',
      isActive: true,
    },
    {
      id: 'EXM-B-200',
      code: 'EXM-B-200',
      name: 'EXM-B-200 Teak Woodgrain (₹8200)',
      category: 'Bed Room Door',
      basePrice: 8200,
      ratePerSqFt: 460,
      defaultThickness: '35mm',
      description: 'Solid heavy-duty bedroom door with realistic woodgrain PU finish.',
      isActive: true,
    },
    {
      id: 'EXM-D-300',
      code: 'EXM-D-300',
      name: 'EXM-D-300 Luxury CNC Main (₹9500)',
      category: 'Main Entry Door',
      basePrice: 9500,
      ratePerSqFt: 535,
      defaultThickness: '35mm',
      description: 'Prestige Kerala villa entrance door with CNC geometric pattern.',
      isActive: true,
    },
    {
      id: 'EXM-K-150',
      code: 'EXM-K-150',
      name: 'EXM-K-150 Kitchen Moisture-Shield (₹7200)',
      category: 'Kitchen Door',
      basePrice: 7200,
      ratePerSqFt: 405,
      defaultThickness: '32mm',
      description: 'High grease and heat-resistant resin formulation for kitchens.',
      isActive: true,
    },
    {
      id: 'EXM-W-400',
      code: 'EXM-W-400',
      name: 'EXM-W-400 Commercial Heavy-Duty (₹8800)',
      category: 'Commercial Door',
      basePrice: 8800,
      ratePerSqFt: 495,
      defaultThickness: '38mm',
      description: 'Acoustic core FRP door designed for hotels, hospitals, and clinics.',
      isActive: true,
    },
  ],
  colours: [
    {
      id: 'clr-01',
      code: 'EXGC-510',
      name: 'Natural Teak (EXGC-510)',
      finishType: 'Woodgrain PU',
      hexColor: '#B57434',
      isActive: true,
    },
    {
      id: 'clr-02',
      code: 'EXGC-520',
      name: 'Burma Teak (Woodgrain PU)',
      finishType: 'Woodgrain PU',
      hexColor: '#8E4C19',
      isActive: true,
    },
    {
      id: 'clr-03',
      code: 'EXGC-100',
      name: 'Frost White (High Gloss Waterproof)',
      finishType: 'High Gloss UV',
      hexColor: '#F8FAFC',
      isActive: true,
    },
    {
      id: 'clr-04',
      code: 'EXGC-530',
      name: 'Natural Teak Gold (Matte UV)',
      finishType: 'Matte UV',
      hexColor: '#CA8A04',
      isActive: true,
    },
    {
      id: 'clr-05',
      code: 'EXGC-600',
      name: 'Walnut Dark Brown',
      finishType: 'Woodgrain PU',
      hexColor: '#451A03',
      isActive: true,
    },
    {
      id: 'clr-06',
      code: 'EXGC-700',
      name: 'Rosewood Classical Kerala Finish',
      finishType: 'Classical Kerala',
      hexColor: '#581C1A',
      isActive: true,
    },
    {
      id: 'clr-07',
      code: 'EXGC-800',
      name: 'Mahogany Antique',
      finishType: 'Woodgrain PU',
      hexColor: '#4C0519',
      isActive: true,
    },
  ],
  locks: [
    {
      id: 'lck-01',
      name: 'Baby Latch (+₹200)',
      lockType: 'Baby Latch',
      price: 200,
      description: 'Standard coin-turn / thumb-turn latch for bathrooms.',
      isActive: true,
    },
    {
      id: 'lck-02',
      name: 'Mortise Lock 60mm (+₹850)',
      lockType: 'Mortise Lock',
      price: 850,
      description: 'Heavy brass mortise lock with dual keys and safety deadbolt.',
      isActive: true,
    },
    {
      id: 'lck-03',
      name: 'SS Cylindrical Knob (+₹450)',
      lockType: 'Cylindrical Knob',
      price: 450,
      description: 'Stainless Steel 304 cylindrical bedroom knob.',
      isActive: true,
    },
    {
      id: 'lck-04',
      name: 'Deadbolt & Tower Bolt (+₹300)',
      lockType: 'Deadbolt',
      price: 300,
      description: 'Solid brass surface tower bolt and deadbolt combo.',
      isActive: true,
    },
    {
      id: 'lck-05',
      name: 'Digital Smart Lock Prep (+₹600)',
      lockType: 'Digital Smart Lock',
      price: 600,
      description: 'Factory CNC internal mortise pocket routing for smart lock installation.',
      isActive: true,
    },
    {
      id: 'lck-06',
      name: 'No Lock / Handle Routing Prep (₹0)',
      lockType: 'None',
      price: 0,
      description: 'No factory hardware attached. Client fits custom handle.',
      isActive: true,
    },
  ],
};
