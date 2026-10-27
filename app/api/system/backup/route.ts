import { NextResponse } from 'next/server';
import {
  createBackupSnapshot,
  listBackupSnapshots,
  verifyBackupIntegrity,
} from '@/lib/services/backupService';

export async function GET() {
  try {
    const snapshots = await listBackupSnapshots();
    return NextResponse.json({ success: true, count: snapshots.length, data: snapshots });
  } catch (error) {
    console.error('Failed to list backups:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const action = body.action || 'CREATE';

    if (action === 'VERIFY') {
      if (!body.backupId) {
        return NextResponse.json(
          { success: false, error: 'backupId required for verification' },
          { status: 400 }
        );
      }
      const verification = await verifyBackupIntegrity(body.backupId);
      return NextResponse.json({ success: true, ...verification });
    }

    const snapshot = await createBackupSnapshot('MANUAL');
    return NextResponse.json({ success: true, data: snapshot }, { status: 201 });
  } catch (error) {
    console.error('Failed to process backup request:', error);
    return NextResponse.json(
      { success: false, error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
