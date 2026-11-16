import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import { authorizeRequest } from '@/lib/auth/authorization';
import { getDataFilePath } from '@/lib/utils/dataPaths';
import { updateBoqExtraItem } from '@/lib/services/boqExtraItemsService';

const getStorePath = () => getDataFilePath('purchases-store.json');
const getInventoryPath = () => getDataFilePath('inventory-store.json');

export interface PurchaseLineItem {
  inventoryId?: string;
  extraItemId?: string;
  itemName: string;
  category?: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  total: number;
}

export interface PurchaseOrderRecord {
  id: string;
  poNumber: string;
  supplierName: string;
  supplierPhone?: string;
  supplierGst: string;
  orderDate: string;
  expectedDate: string;
  itemsSummary: string;
  items?: PurchaseLineItem[];
  sourceType?: 'MANUAL' | 'LOW_STOCK' | 'FLOOR_CONSUMABLES';
  notes?: string;
  linkedExtraItemIds?: string[];
  subtotal: number;
  gstAmount: number;
  totalAmount: number;
  status: string;
  paymentTerms: string;
  receivedAt?: string;
  receivedBy?: string;
}

interface InventoryRecord {
  id: string;
  itemCode: string;
  name: string;
  category: string;
  currentStock: number;
  unit: string;
  reorderLevel: number;
  unitCost: number;
  warehouseLocation: string;
  status: string;
}

function readJsonArray<T>(filePath: string): T[] {
  try {
    if (!fs.existsSync(filePath)) return [];
    const parsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    return Array.isArray(parsed) ? (parsed as T[]) : [];
  } catch {
    return [];
  }
}

function writeJsonArray(filePath: string, data: unknown) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to write JSON store:', err);
  }
}

function nextPoNumber(list: PurchaseOrderRecord[]): string {
  let maxSeq = 100;
  for (const po of list) {
    const match = String(po.poNumber || '').match(/PO-\d{4}-(\d+)/);
    if (match) {
      const seq = parseInt(match[1], 10);
      if (!Number.isNaN(seq) && seq > maxSeq) maxSeq = seq;
    }
  }
  return `PO-2026-${String(maxSeq + 1).padStart(3, '0')}`;
}

export async function GET(req: NextRequest) {
  const auth = await authorizeRequest(req, 'purchases');
  if (auth.errorResponse) return auth.errorResponse;

  const list = readJsonArray<PurchaseOrderRecord>(getStorePath());
  return NextResponse.json({ success: true, count: list.length, data: list });
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req, 'purchases', ['Super Admin', 'Management', 'Purchase', 'Accounts', 'Inventory']);
    if (auth.errorResponse) return auth.errorResponse;

    const body = await req.json();
    const list = readJsonArray<PurchaseOrderRecord>(getStorePath());

    if (body.action === 'UPDATE_STATUS') {
      const idx = list.findIndex((p) => p.id === body.id);
      if (idx === -1) {
        return NextResponse.json({ success: false, error: 'PO not found' }, { status: 404 });
      }
      list[idx].status = body.status;
      writeJsonArray(getStorePath(), list);
      return NextResponse.json({ success: true, data: list[idx] });
    }

    if (body.action === 'RECEIVE_AND_SYNC_STOCK') {
      const idx = list.findIndex((p) => p.id === body.id);
      if (idx === -1) {
        return NextResponse.json({ success: false, error: 'PO not found' }, { status: 404 });
      }
      const po = list[idx];
      if (po.status === 'RECEIVED') {
        return NextResponse.json({ success: true, data: po, message: 'PO was already received & synced' });
      }

      const inventory = readJsonArray<InventoryRecord>(getInventoryPath());
      const poItems: PurchaseLineItem[] = Array.isArray(po.items) ? po.items : [];
      let syncedCount = 0;

      for (const line of poItems) {
        const qty = Math.max(0, Number(line.quantity) || 0);
        if (qty <= 0) continue;

        let invIdx = -1;
        if (line.inventoryId) {
          invIdx = inventory.findIndex((i) => i.id === line.inventoryId);
        }
        if (invIdx === -1 && line.itemName) {
          const targetName = line.itemName.trim().toLowerCase();
          invIdx = inventory.findIndex((i) => i.name.trim().toLowerCase() === targetName);
        }

        if (invIdx >= 0) {
          inventory[invIdx].currentStock = Number((Number(inventory[invIdx].currentStock || 0) + qty).toFixed(2));
          if (line.unitPrice > 0) inventory[invIdx].unitCost = line.unitPrice;
          inventory[invIdx].status =
            inventory[invIdx].currentStock <= inventory[invIdx].reorderLevel ? 'Low Stock' : 'In Stock';
          syncedCount++;
        } else if (line.itemName) {
          inventory.push({
            id: `inv-${Date.now()}-${syncedCount + 1}`,
            itemCode: `RAW-${String(inventory.length + 101).padStart(3, '0')}`,
            name: line.itemName.trim(),
            category: line.category || 'Consumable',
            currentStock: qty,
            unit: line.unit || 'Units',
            reorderLevel: 10,
            unitCost: Number(line.unitPrice) || 0,
            warehouseLocation: 'Main Store Rack',
            status: qty <= 10 ? 'Low Stock' : 'In Stock',
          });
          syncedCount++;
        }
      }

      writeJsonArray(getInventoryPath(), inventory);

      const extraIds = new Set<string>(Array.isArray(po.linkedExtraItemIds) ? po.linkedExtraItemIds : []);
      poItems.forEach((it) => {
        if (it.extraItemId) extraIds.add(it.extraItemId);
      });
      for (const extId of extraIds) {
        try {
          await updateBoqExtraItem(extId, { poNumber: po.poNumber });
        } catch (err) {
          console.warn('[purchases:receive] Could not stamp extra BOQ item:', extId, err);
        }
      }

      po.status = 'RECEIVED';
      po.receivedAt = new Date().toISOString();
      po.receivedBy = auth.user?.name || auth.user?.role || 'Store Keeper';
      list[idx] = po;
      writeJsonArray(getStorePath(), list);

      return NextResponse.json({
        success: true,
        data: po,
        syncedInventoryItems: syncedCount,
      });
    }

    if (!body.supplierName || !String(body.supplierName).trim()) {
      return NextResponse.json({ success: false, error: 'Supplier name is required' }, { status: 400 });
    }

    const rawItems = Array.isArray(body.items) ? body.items : [];
    const items: PurchaseLineItem[] = rawItems
      .filter((it: PurchaseLineItem) => it && String(it.itemName || '').trim())
      .map((it: PurchaseLineItem) => {
        const quantity = Math.max(0, Number(it.quantity) || 0);
        const unitPrice = Math.max(0, Number(it.unitPrice) || 0);
        return {
          inventoryId: it.inventoryId || undefined,
          extraItemId: it.extraItemId || undefined,
          itemName: String(it.itemName).trim(),
          category: it.category || 'Consumable',
          quantity,
          unit: String(it.unit || 'Nos').trim(),
          unitPrice,
          total: Number((quantity * unitPrice).toFixed(2)),
        };
      });

    const computedSubtotal =
      items.length > 0
        ? items.reduce((s, it) => s + it.total, 0)
        : Number(body.subtotal) || 0;
    const subtotal = Number(computedSubtotal.toFixed(2));
    const gstAmount = 0; // Non-GST factory bill preference
    const totalAmount = subtotal;

    const poNumber = nextPoNumber(list);
    const itemsSummary =
      String(body.itemsSummary || '').trim() ||
      (items.length > 0
        ? items.map((i) => `${i.itemName} (${i.quantity} ${i.unit})`).join(', ')
        : 'Raw materials & consumables');

    const linkedExtraItemIds: string[] = Array.from(
      new Set([
        ...(Array.isArray(body.linkedExtraItemIds) ? body.linkedExtraItemIds : []),
        ...items.map((i) => i.extraItemId).filter((x): x is string => Boolean(x)),
      ])
    );

    const newPo: PurchaseOrderRecord = {
      id: `po-${Date.now()}`,
      poNumber,
      supplierName: String(body.supplierName).trim(),
      supplierPhone: body.supplierPhone ? String(body.supplierPhone).trim() : '',
      supplierGst: '',
      orderDate: body.orderDate || new Date().toISOString().split('T')[0],
      expectedDate: body.expectedDate || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
      itemsSummary,
      items,
      sourceType: body.sourceType || 'MANUAL',
      notes: body.notes ? String(body.notes).trim() : '',
      linkedExtraItemIds,
      subtotal,
      gstAmount,
      totalAmount,
      status: body.status || 'APPROVED',
      paymentTerms: body.paymentTerms || 'Credit / Net 15 Days',
    };

    list.unshift(newPo);
    writeJsonArray(getStorePath(), list);

    for (const extId of linkedExtraItemIds) {
      try {
        await updateBoqExtraItem(extId, { poNumber });
      } catch (err) {
        console.warn('[purchases:create] Could not link extra BOQ item:', extId, err);
      }
    }

    return NextResponse.json({ success: true, data: newPo }, { status: 201 });
  } catch (err) {
    console.error('Purchases error:', err);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req, 'purchases', ['Super Admin', 'Management', 'Purchase']);
    if (auth.errorResponse) return auth.errorResponse;

    const id = req.nextUrl.searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: 'PO id query param required' }, { status: 400 });
    }

    const list = readJsonArray<PurchaseOrderRecord>(getStorePath());
    const filtered = list.filter((p) => p.id !== id);
    if (filtered.length === list.length) {
      return NextResponse.json({ success: false, error: 'PO not found' }, { status: 404 });
    }
    writeJsonArray(getStorePath(), filtered);
    return NextResponse.json({ success: true, message: 'Purchase Order removed' });
  } catch (err) {
    console.error('Purchases delete error:', err);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
