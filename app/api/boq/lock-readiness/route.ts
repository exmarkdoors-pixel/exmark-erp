import { NextRequest, NextResponse } from 'next/server';
import { authorizeRequest } from '@/lib/auth/authorization';
import {
  getAllLockReadiness,
  LockReadinessStatus,
  setLockReadiness,
} from '@/lib/services/boqLockReadinessService';

const VALID_STATUSES: LockReadinessStatus[] = [
  'PENDING_PURCHASE',
  'ORDERED',
  'IN_STOCK_RESERVED',
  'ISSUED_TO_FLOOR',
];

export async function GET(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req);
    if (auth.errorResponse) return auth.errorResponse;

    const data = await getAllLockReadiness();
    return NextResponse.json({ success: true, data });
  } catch (error) {
    console.error('Error fetching lock readiness:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to load lock readiness states' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req, undefined, [
      'Super Admin',
      'Management',
      'Production',
      'Plant Supervisor',
      'Inventory',
      'Purchase',
    ]);
    if (auth.errorResponse) return auth.errorResponse;

    const body = await req.json();
    const orderKey = String(body?.orderKey || '').trim();
    const lockBoxId = String(body?.lockBoxId || '').trim();
    const status = body?.status as LockReadinessStatus;

    if (!orderKey || !lockBoxId || !VALID_STATUSES.includes(status)) {
      return NextResponse.json(
        { success: false, error: 'orderKey, lockBoxId, and valid status are required' },
        { status: 400 }
      );
    }

    const updated = await setLockReadiness({
      orderKey,
      lockBoxId,
      status,
      note: body?.note,
    });
    return NextResponse.json({ success: true, data: updated });
  } catch (error) {
    console.error('Error saving lock readiness:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to update lock readiness' },
      { status: 500 }
    );
  }
}
