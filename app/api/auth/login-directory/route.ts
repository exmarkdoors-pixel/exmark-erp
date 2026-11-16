import { NextResponse } from 'next/server';
import { listSafeLoginDirectory } from '@/lib/auth/userStore';

/**
 * Unauthenticated endpoint supplying ONLY non-sensitive Staff Picker cards
 * (Name, Role, Staff Code, Department, hasQuickPin) for LAN factory terminals on /login.
 * Intentionally omits emails, phones, passwords, and PIN hashes.
 */
export async function GET() {
  try {
    const directory = await listSafeLoginDirectory();
    return NextResponse.json({ success: true, ...directory });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to load staff directory';
    return NextResponse.json({ success: false, showLanStaffPicker: false, staff: [], error: message }, { status: 500 });
  }
}
