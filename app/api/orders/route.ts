import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { createProductionOrder } from '@/lib/services/productionService';
import { getActiveFactory } from '@/lib/services/companyProfileService';

const STORE_PATH = path.join(process.cwd(), 'data', 'quotations-store.json');
const CUSTOMERS_PATH = path.join(process.cwd(), 'data', 'customers-store.json');

export interface SalesOrderViewItem {
  id: string;
  orderNumber: string;
  customerId: string;
  customerName: string;
  district: string;
  date: string;
  totalDoors: number;
  totalAmount: number;
  advanceAmount: number;
  advanceVerified: boolean;
  orderStatus: 'CONFIRMED' | 'IN_PRODUCTION' | 'READY_TO_DISPATCH' | 'DELIVERED';
}

function getOrders(): SalesOrderViewItem[] {
  try {
    if (!fs.existsSync(STORE_PATH)) return [];
    const quotes = JSON.parse(fs.readFileSync(STORE_PATH, 'utf8'));
    let customers: Array<{ id: string; name: string; district: string }> = [];
    if (fs.existsSync(CUSTOMERS_PATH)) {
      customers = JSON.parse(fs.readFileSync(CUSTOMERS_PATH, 'utf8'));
    }

    return quotes
      .filter((q: { status: string }) => q.status === 'CONVERTED' || q.status === 'APPROVED' || q.status === 'SENT')
      .map((q: {
        id: string;
        quoteNumber: string;
        customerId: string;
        date: string;
        items?: Array<{ quantity: number }>;
        totalAmount?: number;
        subtotal?: number;
        status: string;
        advanceVerified?: boolean;
        advanceAmount?: number;
      }, index: number) => {
        const cust = customers.find((c) => c.id === q.customerId);
        const totalDoors = q.items?.reduce((s, i) => s + (i.quantity || 1), 0) || 12;
        const totalAmount = q.totalAmount || (q.subtotal ? Math.round(q.subtotal * 1.18) : 125000);
        const advanceAmount = q.advanceAmount ?? Math.round(totalAmount * 0.4);

        let orderStatus: SalesOrderViewItem['orderStatus'] = 'CONFIRMED';
        if (q.status === 'CONVERTED') {
          orderStatus = index % 2 === 0 ? 'IN_PRODUCTION' : 'READY_TO_DISPATCH';
        }

        return {
          id: q.id,
          orderNumber: q.quoteNumber.replace('QTN-', 'SO-'),
          customerId: q.customerId,
          customerName: cust?.name || 'Kerala Dealer / Builder',
          district: cust?.district || 'Ernakulam',
          date: q.date || '2026-10-27',
          totalDoors,
          totalAmount,
          advanceAmount,
          advanceVerified: q.advanceVerified ?? true,
          orderStatus,
        };
      });
  } catch {
    return [];
  }
}

export async function GET() {
  const orders = getOrders();
  return NextResponse.json({ success: true, count: orders.length, data: orders });
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { orderId, action, newStatus } = body;

    if (!orderId) {
      return NextResponse.json({ success: false, error: 'orderId is required' }, { status: 400 });
    }

    if (fs.existsSync(STORE_PATH)) {
      const quotes = JSON.parse(fs.readFileSync(STORE_PATH, 'utf8'));
      const idx = quotes.findIndex((q: { id: string }) => q.id === orderId);
      if (idx !== -1) {
        if (action === 'VERIFY_ADVANCE') {
          quotes[idx].advanceVerified = true;
          quotes[idx].status = 'CONVERTED';
          fs.writeFileSync(STORE_PATH, JSON.stringify(quotes, null, 2), 'utf8');
          return NextResponse.json({
            success: true,
            message: `Advance payment verified for ${quotes[idx].quoteNumber}. Ready for production release.`,
            updated: quotes[idx],
          });
        }

        if (action === 'RELEASE_TO_PRODUCTION') {
          // Rule 12 Check: Advance must be verified before releasing order to production floor
          if (!quotes[idx].advanceVerified) {
            return NextResponse.json(
              {
                success: false,
                error: 'Cannot release order to production: accounts advance deposit verification (minimum 40%) is mandatory.',
              },
              { status: 400 }
            );
          }

          let customerName = 'Kerala Client';
          let district = 'Ernakulam';
          if (fs.existsSync(CUSTOMERS_PATH)) {
            const customers = JSON.parse(fs.readFileSync(CUSTOMERS_PATH, 'utf8'));
            const cust = customers.find((c: { id: string }) => c.id === quotes[idx].customerId);
            if (cust) {
              customerName = cust.name;
              district = cust.district || 'Ernakulam';
            }
          }

          // Build doors array from quote items or fallback opening
          const doors = Array.isArray(quotes[idx].items) && quotes[idx].items.length > 0
            ? quotes[idx].items.map((item: { doorModel?: string; quantity?: number }, i: number) => ({
                doorNumber: `D${i + 1} - Opening`,
                model: item.doorModel || '32mm Molded Teak FRP Door',
                rawHeightMm: 2100,
                rawWidthMm: 900,
                handing: 'RH',
                lockType: 'Mortise Lock 60mm',
                finishColor: 'Burma Teak',
              }))
            : [
                {
                  doorNumber: 'D1 - Main Door Opening',
                  model: '32mm Molded Teak FRP Door',
                  rawHeightMm: 2100,
                  rawWidthMm: 900,
                  handing: 'RH',
                  lockType: 'Mortise Lock 60mm',
                  finishColor: 'Burma Teak',
                },
              ];

          const prodOrder = await createProductionOrder({
            salesOrderId: quotes[idx].id,
            measurementRef: 'MSR-2026-088',
            customerName,
            siteName: quotes[idx].siteName || `${customerName} Project Site`,
            district,
            doorCategory: 'FRP_DOORS',
            doors,
          });

          quotes[idx].status = 'IN_PRODUCTION';
          quotes[idx].productionOrderId = prodOrder.id;
          fs.writeFileSync(STORE_PATH, JSON.stringify(quotes, null, 2), 'utf8');

          const activeFactory = getActiveFactory();
          return NextResponse.json({
            success: true,
            message: `Work order released to ${activeFactory.name} press lines. Job card ${prodOrder.jobCardNumber} created.`,
            productionOrder: prodOrder,
            updated: quotes[idx],
          });
        }

        if (newStatus) {
          quotes[idx].status = newStatus;
          fs.writeFileSync(STORE_PATH, JSON.stringify(quotes, null, 2), 'utf8');
          return NextResponse.json({ success: true, updated: quotes[idx] });
        }
      }
    }

    return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
  } catch (err) {
    console.error('Order action error:', err);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
