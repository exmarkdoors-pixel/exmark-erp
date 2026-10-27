import { NextResponse } from 'next/server';
import {
  validateAndBumpVersion,
  acquireOrHeartbeatLease,
  releaseLease,
  getEntityVersion,
  ConcurrencyRecord,
} from '@/lib/services/concurrencyService';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const entityType = searchParams.get('entityType') as ConcurrencyRecord['entityType'] | null;
    const entityId = searchParams.get('entityId');

    if (!entityType || !entityId) {
      return NextResponse.json(
        { success: false, error: 'entityType and entityId are required' },
        { status: 400 }
      );
    }

    const version = await getEntityVersion(entityType, entityId);
    return NextResponse.json({ success: true, entityType, entityId, version });
  } catch (error) {
    console.error('Concurrency check error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { action } = body;

    if (action === 'LEASE') {
      const res = await acquireOrHeartbeatLease({
        entityType: body.entityType,
        entityId: body.entityId,
        userId: body.userId || 'usr-desktop-1',
        userName: body.userName || 'Office Staff',
        terminalIp: body.terminalIp || '192.168.1.50',
      });
      return NextResponse.json({ success: true, ...res });
    }

    if (action === 'RELEASE') {
      await releaseLease(body.entityType, body.entityId, body.userId || 'usr-desktop-1');
      return NextResponse.json({ success: true, released: true });
    }

    if (action === 'VALIDATE_AND_BUMP') {
      const res = await validateAndBumpVersion({
        entityType: body.entityType,
        entityId: body.entityId,
        expectedVersion: Number(body.expectedVersion),
        modifiedBy: body.modifiedBy || 'Sales Executive',
      });
      return NextResponse.json(res, { status: res.conflict ? 409 : 200 });
    }

    return NextResponse.json(
      { success: false, error: 'Unsupported action' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Concurrency action error:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
