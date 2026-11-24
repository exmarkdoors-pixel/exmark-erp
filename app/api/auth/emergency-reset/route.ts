import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

/**
 * EXMARK ERP — Security Hardened Emergency Reset Endpoint
 * 
 * Web-based credential resets are permanently disabled to protect the system
 * when exposed over Cloudflare tunnels or external networks.
 * Super Admin resets must be conducted locally on the physical server console
 * using `reset-super-admin-password.bat`.
 */
export async function POST(_req: NextRequest) {
  return NextResponse.json(
    {
      success: false,
      error:
        'Web-based emergency reset is permanently disabled for security. To reset Super Admin credentials, run reset-super-admin-password.bat directly on the physical factory server PC.',
    },
    { status: 403 }
  );
}

export async function GET(_req: NextRequest) {
  return NextResponse.json(
    {
      success: false,
      error:
        'Web-based emergency reset is permanently disabled for security. To reset Super Admin credentials, run reset-super-admin-password.bat directly on the physical factory server PC.',
    },
    { status: 403 }
  );
}
