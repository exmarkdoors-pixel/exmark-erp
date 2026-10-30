import { NextRequest, NextResponse } from 'next/server';
import { getMeasurementById, updateMeasurement } from '@/lib/services/measurementService';
import { createQuotation } from '@/lib/services/quotationService';
import { getCatalogMaster } from '@/lib/services/catalogService';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));

    // Find measurement
    let measurement = await getMeasurementById(id);
    if (!measurement && body.measurement) {
      measurement = body.measurement;
    }

    if (!measurement) {
      return NextResponse.json({ success: false, error: 'Site measurement record not found' }, { status: 404 });
    }

    if (!measurement.doors || measurement.doors.length === 0) {
      return NextResponse.json(
        { success: false, error: 'Site measurement must have at least one door opening to generate a quotation' },
        { status: 400 }
      );
    }

    const pricingStrategy = (body.pricingStrategy || 'PER_PIECE') as 'PER_PIECE' | 'PER_SQFT';
    const discount = Number(body.discount) || 0;
    const catalog = await getCatalogMaster();

    // Build quotation items
    const quotationItems = measurement.doors.map((door) => {
      const qty = door.quantity || 1;
      const modelCatalog = catalog.models.find((m) => m.name === door.model || m.code === door.model);

      let unitPrice = door.unitPrice || 7500;
      let calculatedSqFt = door.calculatedSqFt;

      // Ensure mm dimensions for factory production
      let hMm = door.heightLeft || 2100;
      let wMm = door.widthTop || 900;
      const unit = door.measurementUnit || 'CM';

      if (unit === 'INCH') {
        hMm = hMm * 25.4;
        wMm = wMm * 25.4;
      } else if (unit === 'CM') {
        hMm = hMm * 10;
        wMm = wMm * 10;
      }

      if (!calculatedSqFt || calculatedSqFt <= 0) {
        calculatedSqFt = Number(((hMm * wMm) / 92903.04).toFixed(2));
      }

      if (pricingStrategy === 'PER_SQFT') {
        const sqftRate = body.customRatePerSqFt || modelCatalog?.ratePerSqFt || 395;
        const lockSurcharge = door.lockPrice || (door.lockType?.includes('+₹') ? parseFloat(door.lockType.split('+₹')[1]) : 200) || 0;
        const priceAdj = door.priceAdjustment || 0;
        // Formula: (Sq.Ft * Sq.Ft Rate) + Lock + Adjustment
        unitPrice = Math.round(calculatedSqFt * sqftRate + lockSurcharge + priceAdj);
      } else {
        // PER_PIECE strategy: uses door.unitPrice or basePrice + lock + adj
        unitPrice = door.unitPrice || (modelCatalog?.basePrice || 7000) + (door.lockPrice || 200) + (door.priceAdjustment || 300);
      }

      const totalPrice = unitPrice * qty;

      return {
        doorCategory: (door.categoryName?.toUpperCase().includes('WPC') ? 'WPC_DOORS' : 'FRP_DOORS') as 'FRP_DOORS' | 'WPC_DOORS',
        doorModel: `${door.doorNumber}: ${door.model} (${door.colour || 'Natural Teak'})`,
        heightMm: Math.round(hMm),
        widthMm: Math.round(wMm),
        thicknessMm: 32,
        finishColor: door.colour || 'Natural Teak (EXGC-510)',
        quantity: qty,
        unitPrice,
        gstRate: 18,
        totalPrice,
      };
    });

    // Create the formal Quotation
    const createdQuotation = await createQuotation({
      customerId: measurement.customerId || `cust-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      validUntil: new Date(Date.now() + 30 * 86400000).toISOString().split('T')[0],
      discount,
      notes: `Auto-generated from Site Measurement ${measurement.refNumber} (${measurement.siteName}, ${measurement.district}) using ${
        pricingStrategy === 'PER_SQFT' ? 'Square Feet Rate' : 'Per Piece Rate'
      } mode. Total ${measurement.doors.length} openings.`,
      items: quotationItems,
    });

    // Link quotation reference in site measurement
    try {
      if (measurement.id && !measurement.id.startsWith('new')) {
        await updateMeasurement(measurement.id, {
          orderRef: createdQuotation.quoteNumber,
          notes: `${measurement.notes || ''} [Quoted: ${createdQuotation.quoteNumber}]`.trim(),
        });
      }
    } catch {
      // Ignore if measurement record is ephemeral in memory
    }

    return NextResponse.json({
      success: true,
      message: `Quotation ${createdQuotation.quoteNumber} generated successfully via ${pricingStrategy} engine.`,
      data: {
        quotation: createdQuotation,
        pricingStrategy,
        measurementRef: measurement.refNumber,
        totalAmount: createdQuotation.totalAmount,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to generate quotation';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
