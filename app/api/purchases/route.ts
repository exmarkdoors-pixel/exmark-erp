import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const STORE_PATH = path.join(process.cwd(), 'data', 'purchases-store.json');

function readPurchases() {
  try {
    if (!fs.existsSync(STORE_PATH)) return [];
    return JSON.parse(fs.readFileSync(STORE_PATH, 'utf8'));
  } catch {
    return [];
  }
}

function writePurchases(data: unknown) {
  try {
    fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to write purchases:', err);
  }
}

export async function GET() {
  const list = readPurchases();
  return NextResponse.json({ success: true, count: list.length, data: list });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const list = readPurchases();

    if (body.action === 'UPDATE_STATUS') {
      const idx = list.findIndex((p: { id: string }) => p.id === body.id);
      if (idx === -1) {
        return NextResponse.json({ success: false, error: 'PO not found' }, { status: 404 });
      }
      list[idx].status = body.status;
      writePurchases(list);
      return NextResponse.json({ success: true, data: list[idx] });
    }

    const subtotal = Number(body.subtotal) || 0;
    const gstAmount = Math.round(subtotal * 0.18);
    const totalAmount = subtotal + gstAmount;

    const newPo = {
      id: `po-${Date.now()}`,
      poNumber: `PO-2026-${String(list.length + 101).padStart(3, '0')}`,
      supplierName: body.supplierName,
      supplierGst: body.supplierGst || '32AABCE9999K1Z4',
      orderDate: new Date().toISOString().split('T')[0],
      expectedDate: body.expectedDate || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      itemsSummary: body.itemsSummary || 'Raw materials',
      subtotal,
      gstAmount,
      totalAmount,
      status: 'APPROVED',
      paymentTerms: body.paymentTerms || '30 Days Net',
    };

    list.unshift(newPo);
    writePurchases(list);
    return NextResponse.json({ success: true, data: newPo }, { status: 201 });
  } catch (err) {
    console.error('Purchases error:', err);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
