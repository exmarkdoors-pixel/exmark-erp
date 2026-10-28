import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

const STORE_PATH = path.join(process.cwd(), 'data', 'inventory-store.json');

function readInventory() {
  try {
    if (!fs.existsSync(STORE_PATH)) return [];
    return JSON.parse(fs.readFileSync(STORE_PATH, 'utf8'));
  } catch {
    return [];
  }
}

function writeInventory(data: unknown) {
  try {
    fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to write inventory:', err);
  }
}

export async function GET() {
  const items = readInventory();
  return NextResponse.json({ success: true, count: items.length, data: items });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const items = readInventory();

    if (body.action === 'ADJUST_STOCK') {
      const idx = items.findIndex((i: { id: string }) => i.id === body.id);
      if (idx === -1) {
        return NextResponse.json({ success: false, error: 'Item not found' }, { status: 404 });
      }
      const adjustment = Number(body.adjustment) || 0;
      items[idx].currentStock = Math.max(0, items[idx].currentStock + adjustment);
      items[idx].status = items[idx].currentStock <= items[idx].reorderLevel ? 'Low Stock' : 'In Stock';
      writeInventory(items);
      return NextResponse.json({ success: true, data: items[idx] });
    }

    const newItem = {
      id: `inv-${Date.now()}`,
      itemCode: body.itemCode || `RAW-${Date.now().toString().slice(-4)}`,
      name: body.name,
      category: body.category || 'General',
      currentStock: Number(body.currentStock) || 0,
      unit: body.unit || 'Units',
      reorderLevel: Number(body.reorderLevel) || 50,
      unitCost: Number(body.unitCost) || 100,
      warehouseLocation: body.warehouseLocation || 'General Rack',
      status: Number(body.currentStock) <= Number(body.reorderLevel) ? 'Low Stock' : 'In Stock',
    };

    items.push(newItem);
    writeInventory(items);
    return NextResponse.json({ success: true, data: newItem }, { status: 201 });
  } catch (err) {
    console.error('Inventory error:', err);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
