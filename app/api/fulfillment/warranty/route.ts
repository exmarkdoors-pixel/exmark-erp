import { NextResponse } from 'next/server';
import {
  listWarranties,
  generateWarrantyCertificate,
} from '@/lib/services/fulfillmentService';

export async function GET() {
  try {
    const warranties = await listWarranties();
    return NextResponse.json({ success: true, count: warranties.length, data: warranties });
  } catch (error) {
    console.error('Failed to list warranties:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    if (!body.customerName || !body.siteAddress) {
      return NextResponse.json(
        { success: false, error: 'Customer name and site address are required' },
        { status: 400 }
      );
    }

    const cert = await generateWarrantyCertificate({
      salesOrderId: body.salesOrderId || null,
      customerName: body.customerName,
      siteAddress: body.siteAddress,
      district: body.district || 'Palakkad',
      warrantyPeriodYears: Number(body.warrantyPeriodYears) === 15 ? 15 : 10,
      coveredDoors: Array.isArray(body.coveredDoors) ? body.coveredDoors : [
        {
          doorId: 'EXM-DR-2026-FRP-01',
          model: 'EXM-FRP-TL101 (Teakwood Finish)',
          sizeMm: '2085 x 888 mm',
        },
      ],
    });

    return NextResponse.json({ success: true, data: cert }, { status: 201 });
  } catch (error) {
    console.error('Failed to generate warranty certificate:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
