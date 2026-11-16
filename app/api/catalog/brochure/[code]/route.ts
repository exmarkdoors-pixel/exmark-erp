import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { PureVectorPdf } from '@/lib/utils/pdfStickerEngine';

// Master catalog specs lookup for brochure synthesis
const MODEL_SPECS_DATABASE: Record<
  string,
  {
    title: string;
    category: string;
    material: string;
    core: string;
    finish: string;
    recommendedAreas: string;
    features: string[];
  }
> = {
  'EXM-A-101': {
    title: 'Natural Teak Classic Molded Door',
    category: 'Category A',
    material: 'FRP (Fiber Reinforced Polymer) with UV Coating',
    core: 'High Density Rigid Polyurethane Foam (PUF)',
    finish: 'Natural Teak Wood Grain Matte Finish',
    recommendedAreas: 'Main Entry, Living Rooms, Master Bedrooms',
    features: [
      'Authentic deep woodgrain mold texture',
      '100% Waterproof - No swelling, warping, or rotting',
      'Termite, borer, and fungus resistant for life',
      'High thermal and acoustic insulation (Sound dampening)',
      '10-Year Factory Replacement Warranty',
    ],
  },
  'EXM-AB-103': {
    title: 'Rose Wood Fusion Contemporary Door',
    category: 'Category AB',
    material: 'FRP High-Gloss Molded Composite',
    core: 'Reinforced Solid Composite Subframe + Insulated Core',
    finish: 'Rose Wood Glossy Premium Finish',
    recommendedAreas: 'Interior Rooms, Bedrooms, Commercial Offices',
    features: [
      'Contemporary dual-tone gloss finish',
      'Pre-grooved for mortise and cylindrical locks',
      'UV resistant and scratch-resistant protective clear-coat',
      'Zero maintenance - Clean with damp cloth',
      '10-Year Factory Replacement Warranty',
    ],
  },
  'EXM-A-113': {
    title: 'Mahogany Waterproof Flush Door',
    category: 'Category A',
    material: 'Heavy-Duty Seamless FRP Flush Skin',
    core: 'Structural Honeycomb Composite with Hardwood Stile Inserts',
    finish: 'Mahogany Matte Texture',
    recommendedAreas: 'Bathrooms, Kitchens, Balconies, Utility Areas',
    features: [
      'Completely seamless edge-banded construction',
      'Submersible waterproof grade for wet areas',
      'Resistant to household detergents and mild acids',
      'Reinforced lock-block provision on both sides',
      '10-Year Factory Replacement Warranty',
    ],
  },
  'EXM-A-121': {
    title: 'Eeti Wood Heavy Bathroom & Exterior Door',
    category: 'Category A',
    material: 'High-Tensile FRP Architectural Grade',
    core: 'Closed-Cell Water-Repellent Foam Core',
    finish: 'Eeti Wood Deep Grain Rich Stain',
    recommendedAreas: 'Bathrooms, Exterior Entrances, Terrace Doors',
    features: [
      'Heavy-wall construction engineered for harsh coastal moisture',
      'Taper-ready for uneven masonry wall openings',
      'Pre-reinforced hinge blocks for 3 to 4 heavy-duty SS hinges',
      'Zero paint chipping or repainting required',
      '10-Year Factory Replacement Warranty',
    ],
  },
};

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  try {
    const { code: rawCode } = await params;
    const modelCode = decodeURIComponent(rawCode).trim().toUpperCase();

    // 1. Check if an official pre-uploaded static PDF brochure exists on disk
    const publicBrochurePath = path.join(process.cwd(), 'public', 'brochures', `${modelCode}.pdf`);
    if (fs.existsSync(publicBrochurePath)) {
      const fileBuffer = fs.readFileSync(publicBrochurePath);
      return new NextResponse(fileBuffer, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': `inline; filename="EXMARK_${modelCode}_Brochure.pdf"`,
          'Cache-Control': 'public, max-age=3600',
        },
      });
    }

    // 2. Synthesize High-Resolution Vector Technical Brochure PDF
    const spec = MODEL_SPECS_DATABASE[modelCode] || {
      title: `${modelCode} Premium Architectural Door`,
      category: 'Category A',
      material: 'Fiberglass Reinforced Polymer (FRP)',
      core: 'High-Density Polyurethane Insulated Core',
      finish: 'Weatherproof Woodgrain Architectural Coat',
      recommendedAreas: 'Residential & Commercial Interior / Exterior',
      features: [
        '100% Waterproof and Moisture-Resistant',
        'Termite and Borer Proof Guarantee',
        'Zero Expansion / Shrinkage in Monsoon Conditions',
        'Reinforced Subframe for Heavy-Duty Hardware',
        '10-Year EXMARK Factory Warranty',
      ],
    };

    // A4 Portrait Vector PDF (210mm x 297mm)
    const doc = new PureVectorPdf({ orientation: 'portrait' });

    // Top Header Banner (Navy Slate)
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, 210, 28, 'F');

    // Brand Title
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.text('EXMARK DOORS & ARCHITECTURAL FIBER', 14, 13);

    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text('FACTORY & SALES HEADQUARTERS: KERALA, INDIA | WATERPROOF & TERMITE-PROOF COMPOSITES', 14, 20);

    // Document Type Ribbon
    doc.setFillColor(225, 29, 72); // Rose-600
    doc.rect(145, 0, 65, 10, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('TECHNICAL BROCHURE', 177.5, 6.8, { align: 'center' });

    // Model Header Card
    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.4);
    doc.roundedRect(14, 34, 182, 28, 2, 2, 'FD');

    doc.setTextColor(225, 29, 72);
    doc.setFont('courier', 'bold');
    doc.setFontSize(16);
    doc.text(modelCode, 20, 44);

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.text(spec.title, 20, 52);

    doc.setTextColor(71, 85, 105);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.text(`Classification: ${spec.category} | Recommended: ${spec.recommendedAreas}`, 20, 58);

    // Right side QR code on Header linking to catalog
    const qrUrl = `http://192.168.8.101:4000/catalog?model=${encodeURIComponent(modelCode)}`;
    doc.drawQrCode(qrUrl, 166, 36, 24);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(5);
    doc.setTextColor(100, 116, 139);
    doc.text('SCAN TO VERIFY', 178, 62, { align: 'center' });

    // LEFT COLUMN: Technical Specifications Table (Width: 105mm)
    const tableX = 14;
    let currentY = 70;

    doc.setFillColor(30, 41, 59);
    doc.rect(tableX, currentY, 105, 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('ENGINEERING & MATERIAL SPECIFICATIONS', tableX + 3, currentY + 4.8);
    currentY += 7;

    const specsRows = [
      ['Skin Composite', spec.material],
      ['Core Infill', spec.core],
      ['Surface Finish', spec.finish],
      ['Available Thickness', '28 mm, 30 mm, 32 mm, 35 mm (Std / Heavy)'],
      ['Standard Widths', '70 cm to 105 cm (27" to 42") Custom Tapered'],
      ['Standard Heights', '180 cm to 240 cm (71" to 95") Cut-to-fit'],
      ['Water Resistance', '100% Submersible Waterproof (ASTM D543)'],
      ['Termite / Borer', '100% Proof (Zero timber-rot risk)'],
      ['Screw Holding Strength', 'Reinforced Wooden/Composite Internal Stile'],
      ['Lock Compatibility', 'Baby Latch, Cylindrical Privacy, Mortise 60mm'],
      ['Hinge Provision', '3x or 4x SS 304 4"x3"x2.5mm Bearing Hinges'],
      ['Warranty Coverage', '10-Year Factory Replacement Guarantee'],
    ];

    for (let i = 0; i < specsRows.length; i++) {
      const [param, val] = specsRows[i];
      const rowH = 7.2;
      doc.setFillColor(i % 2 === 0 ? 255 : 248, i % 2 === 0 ? 255 : 250, i % 2 === 0 ? 255 : 252);
      doc.setDrawColor(226, 232, 240);
      doc.setLineWidth(0.2);
      doc.rect(tableX, currentY, 105, rowH, 'FD');

      doc.setTextColor(30, 41, 59);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(7.2);
      doc.text(param, tableX + 2.5, currentY + 4.8);

      doc.setTextColor(71, 85, 105);
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(6.8);
      doc.text(val.slice(0, 48), tableX + 38, currentY + 4.8);

      currentY += rowH;
    }

    // RIGHT COLUMN: Vector Door Elevation Diagram & Dimensional Cutouts (Width: 70mm)
    const diagX = 126;
    const diagY = 70;

    doc.setFillColor(30, 41, 59);
    doc.rect(diagX, diagY, 70, 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.text('ELEVATION & TAPER SCHEMATIC', diagX + 3, diagY + 4.8);

    // Door Frame Outline (Scaled drawing: 34mm wide x 75mm tall)
    const doorX = diagX + 18;
    const doorY = diagY + 12;
    const doorW = 34;
    const doorH = 72;

    // Door Shutter Body
    doc.setFillColor(241, 245, 249);
    doc.setDrawColor(15, 23, 42);
    doc.setLineWidth(0.6);
    doc.rect(doorX, doorY, doorW, doorH, 'FD');

    // Molded Panel Lines (decorative inset rectangles)
    doc.setDrawColor(148, 163, 184);
    doc.setLineWidth(0.3);
    doc.rect(doorX + 3, doorY + 4, doorW - 6, 26, 'S');
    doc.rect(doorX + 3, doorY + 34, doorW - 6, 32, 'S');

    // Lock position circle
    doc.setFillColor(225, 29, 72);
    doc.rect(doorX + 2.5, doorY + 40, 2.5, 3.5, 'F');

    // Hinges on opposite side
    doc.setFillColor(79, 70, 229);
    doc.rect(doorX + doorW - 1.5, doorY + 8, 1.5, 5, 'F');
    doc.rect(doorX + doorW - 1.5, doorY + 32, 1.5, 5, 'F');
    doc.rect(doorX + doorW - 1.5, doorY + 58, 1.5, 5, 'F');

    // Dimension callouts:
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(6);
    doc.setTextColor(15, 23, 42);

    // Top Width Arrow
    doc.line(doorX, doorY - 2, doorX + doorW, doorY - 2);
    doc.text('TOP WIDTH (cm / inch)', doorX + doorW / 2, doorY - 3.5, { align: 'center' });

    // Bottom Width Arrow
    doc.line(doorX, doorY + doorH + 2, doorX + doorW, doorY + doorH + 2);
    doc.text('BTM WIDTH (cm / inch)', doorX + doorW / 2, doorY + doorH + 5.5, { align: 'center' });

    // Height Arrow (Left)
    doc.line(doorX - 2, doorY, doorX - 2, doorY + doorH);
    doc.text('HEIGHT (cm)', doorX - 3.5, doorY + doorH / 2, { align: 'right' });

    // Taper Annotation
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(5.5);
    doc.setTextColor(180, 83, 9);
    doc.text('* Supports uneven top/bottom masonry taper cuts', diagX + 35, doorY + doorH + 11, {
      align: 'center',
    });

    // Key Architectural Features & Advantages Box (Bottom)
    const featY = 175;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(203, 213, 225);
    doc.setLineWidth(0.4);
    doc.roundedRect(14, featY, 182, 50, 2, 2, 'FD');

    doc.setTextColor(15, 23, 42);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('KEY ARCHITECTURAL HIGHLIGHTS & ADVANTAGES', 20, featY + 8);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(51, 65, 85);
    for (let f = 0; f < spec.features.length; f++) {
      const fy = featY + 16 + f * 6.5;
      doc.text(`[OK]   ${spec.features[f]}`, 22, fy);
    }

    // Official Factory Guarantee & Quality Seal Banner
    const sealY = 232;
    doc.setFillColor(15, 23, 42);
    doc.rect(14, sealY, 182, 32, 'F');

    doc.setTextColor(251, 191, 36); // Amber
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.text('10-YEAR DIRECT FACTORY REPLACEMENT WARRANTY', 20, sealY + 10);

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(
      'EXMARK DOORS certifies that this door model has passed high-pressure hydrostatic testing, edge moisture barriers,',
      20,
      sealY + 17
    );
    doc.text(
      'and CNC sizing calibrations. Guaranteed against warping, water absorption, delamination, and pest infestation.',
      20,
      sealY + 23
    );

    // Footer Contact Bar
    doc.setFillColor(241, 245, 249);
    doc.rect(0, 280, 210, 17, 'F');
    doc.setTextColor(71, 85, 105);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('EXMARK INDUSTRIAL DOORS | KERALA PLANT | DIRECT FACTORY PRODUCTION LINE', 14, 288);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7);
    doc.text(
      `Quotation & Estimating Department | Model Code: ${modelCode} | Generated: ${new Date().toLocaleDateString('en-IN')}`,
      14,
      293
    );

    const pdfBytes = doc.buildPdf();

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="EXMARK_${modelCode}_Brochure.pdf"`,
        'Cache-Control': 'no-cache',
      },
    });
  } catch (err: any) {
    console.error('Failed to generate brochure PDF:', err);
    return NextResponse.json(
      { error: 'Failed to generate brochure', details: err?.message },
      { status: 500 }
    );
  }
}
