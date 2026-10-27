import { NextRequest, NextResponse } from 'next/server';
import {
  listFollowUps,
  addFollowUp,
  FollowUpType,
} from '@/lib/services/crmService';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const followUps = await listFollowUps(id);
    return NextResponse.json({ success: true, data: followUps });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to fetch follow-ups';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    if (!body.type) {
      return NextResponse.json({ success: false, error: 'Follow-up Type is required' }, { status: 400 });
    }
    if (!body.notes?.trim()) {
      return NextResponse.json({ success: false, error: 'Notes are required' }, { status: 400 });
    }

    const followUp = await addFollowUp(id, {
      followUpDate: body.followUpDate || new Date().toISOString(),
      type: body.type as FollowUpType,
      notes: body.notes.trim(),
      completedAt: body.completedAt || null,
    });

    return NextResponse.json({ success: true, data: followUp }, { status: 201 });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to add follow-up';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
