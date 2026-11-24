import { NextRequest, NextResponse } from 'next/server';
import { generateVyaparPartyTemplateBuffer } from '@/lib/services/vyaparPartyImportService';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const format = searchParams.get('format') || 'xlsx';

    const buffer = generateVyaparPartyTemplateBuffer();

    return new NextResponse(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="EXMARK_Party_Import_Template.xlsx"',
      },
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to generate template';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
