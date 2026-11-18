import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { createProductionOrder } from '@/lib/services/productionService';
import { getActiveFactory } from '@/lib/services/companyProfileService';
import { authorizeRequest } from '@/lib/auth/authorization';
import { getDataFilePath } from '@/lib/utils/dataPaths';
import { autoBillCompletedDelivery } from '@/lib/services/autoDeliveryBillingService';

const getStorePath = () => getDataFilePath('quotations-store.json');
const getCustomersPath = () => getDataFilePath('customers-store.json');

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
    const storePath = getStorePath();
    const customersPath = getCustomersPath();
    if (!fs.existsSync(storePath)) return [];
    const quotes = JSON.parse(fs.readFileSync(storePath, 'utf8'));
    let customers: Array<{ id: string; name: string; district: string }> = [];
    if (fs.existsSync(customersPath)) {
      customers = JSON.parse(fs.readFileSync(customersPath, 'utf8'));
    }

    const validStatuses = ['CONVERTED', 'APPROVED', 'SENT', 'IN_PRODUCTION', 'READY_TO_DISPATCH', 'DELIVERED'];
    return quotes
      .filter((q: { status: string }) => validStatuses.includes(q.status))
      .map((q: {
        id: string;
        quoteNumber: string;
        customerId: string;
        date: string;
        items?: Array<{ quantity: number }>;
        totalAmount?: number;
        subtotal?: number;
        status: string;
        orderStatus?: SalesOrderViewItem['orderStatus'];
        advanceVerified?: boolean;
        advanceAmount?: number;
      }, index: number) => {
        const cust = customers.find((c) => c.id === q.customerId);
        const totalDoors = q.items?.reduce((s, i) => s + (i.quantity || 1), 0) || 12;
        const totalAmount = q.totalAmount || q.subtotal || 0;
        const advanceAmount = q.advanceAmount ?? Math.round(totalAmount * 0.4);

        let orderStatus: SalesOrderViewItem['orderStatus'] = 'CONFIRMED';
        if (q.orderStatus) {
          orderStatus = q.orderStatus;
        } else if (q.status === 'IN_PRODUCTION') {
          orderStatus = 'IN_PRODUCTION';
        } else if (q.status === 'READY_TO_DISPATCH') {
          orderStatus = 'READY_TO_DISPATCH';
        } else if (q.status === 'DELIVERED') {
          orderStatus = 'DELIVERED';
        } else if (q.status === 'CONVERTED') {
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

export async function GET(req: Request) {
  const auth = await authorizeRequest(req, 'sales-orders');
  if (auth.errorResponse) return auth.errorResponse;
  const orders = getOrders();
  return NextResponse.json({ success: true, count: orders.length, data: orders });
}

export async function POST(req: Request) {
  try {
    const auth = await authorizeRequest(req, 'sales-orders', ['Super Admin', 'Management', 'Sales', 'Accounts']);
    if (auth.errorResponse) return auth.errorResponse;

    const body = await req.json();
    const { orderId, action, newStatus } = body;

    if (!orderId) {
      return NextResponse.json({ success: false, error: 'orderId is required' }, { status: 400 });
    }

    const storePath = getStorePath();
    const customersPath = getCustomersPath();
    if (fs.existsSync(storePath)) {
      const quotes = JSON.parse(fs.readFileSync(storePath, 'utf8'));
      const idx = quotes.findIndex((q: { id: string }) => q.id === orderId);
      if (idx !== -1) {
        if (action === 'VERIFY_ADVANCE') {
          quotes[idx].advanceVerified = true;
          if (typeof body.advanceAmount === 'number') {
            quotes[idx].advanceAmount = body.advanceAmount;
          }
          if (body.paymentMode) {
            quotes[idx].paymentMode = body.paymentMode;
          }
          if (body.utrNumber) {
            quotes[idx].utrNumber = body.utrNumber;
          }
          quotes[idx].status = 'CONVERTED';
          fs.writeFileSync(storePath, JSON.stringify(quotes, null, 2), 'utf8');
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
          if (fs.existsSync(customersPath)) {
            const customers = JSON.parse(fs.readFileSync(customersPath, 'utf8'));
            const cust = customers.find((c: { id: string }) => c.id === quotes[idx].customerId);
            if (cust) {
              customerName = cust.name;
              district = cust.district || 'Ernakulam';
            }
          }

          // Build individual door items respecting quantity and carry quotation installation setting
          const rawItems = Array.isArray(quotes[idx].items) && quotes[idx].items.length > 0
            ? quotes[idx].items
            : [
                {
                  doorModel: '32mm Molded Teak FRP Door',
                  heightMm: 2100,
                  widthMm: 900,
                  quantity: 1,
                },
              ];

          const doors: Array<{
            doorNumber: string;
            model: string;
            rawHeightMm: number;
            rawWidthMm: number;
            handing: 'LH' | 'RH';
            lockType: string;
            finishColor: string;
          }> = [];
          let seq = 1;
          for (const item of rawItems) {
            const count = Math.max(1, Number(item.quantity) || 1);
            for (let k = 0; k < count; k++) {
              doors.push({
                doorNumber: `D${seq++} - Opening`,
                model: item.doorModel || '32mm Molded Teak FRP Door',
                rawHeightMm: Number(item.heightMm) || 2100,
                rawWidthMm: Number(item.widthMm) || 900,
                handing: 'RH',
                lockType: item.lockType || 'Baby Latch Black',
                finishColor: item.finishColor || 'Natural Teak',
              });
            }
          }

          const prodOrder = await createProductionOrder({
            salesOrderId: quotes[idx].id,
            measurementRef: quotes[idx].quoteNumber || null,
            customerName,
            siteName: quotes[idx].siteName || quotes[idx].location || `${customerName} Project Site`,
            district,
            doorCategory: 'FRP_DOORS',
            includeInstallation: Boolean(quotes[idx].includeInstallation),
            installationNotes: quotes[idx].installationNotes || undefined,
            orderDate: quotes[idx].date || new Date().toISOString().split('T')[0],
            doors,
          });

          quotes[idx].status = 'IN_PRODUCTION';
          quotes[idx].orderStatus = 'IN_PRODUCTION';
          quotes[idx].productionOrderId = prodOrder.id;
          fs.writeFileSync(storePath, JSON.stringify(quotes, null, 2), 'utf8');

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
          quotes[idx].orderStatus = newStatus;
          fs.writeFileSync(storePath, JSON.stringify(quotes, null, 2), 'utf8');

          let autoBilling = null;
          if (String(newStatus).toUpperCase() === 'DELIVERED') {
            try {
              autoBilling = autoBillCompletedDelivery({
                source: 'ORDER',
                sourceId: quotes[idx].id,
                salesOrderId: quotes[idx].id,
                orderRef: quotes[idx].quoteNumber?.replace(/^QTN-/, 'SO-') || quotes[idx].id,
                customerName: quotes[idx].customerName,
                deliveryDate: new Date().toISOString().slice(0, 10),
                createdBy: auth.user?.name || 'Order Delivery',
              });
            } catch (billErr) {
              console.warn('[orders:auto-bill] Non-fatal auto-billing warning:', billErr);
            }
          }

          return NextResponse.json({
            success: true,
            updated: quotes[idx],
            autoBilling,
            message: autoBilling?.billed
              ? `Order marked DELIVERED & auto-billed as ${autoBilling.invoiceNumber}.`
              : `Order status updated to ${newStatus}.`,
          });
        }
      }
    }

    return NextResponse.json({ success: false, error: 'Order not found' }, { status: 404 });
  } catch (err) {
    console.error('Order action error:', err);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
