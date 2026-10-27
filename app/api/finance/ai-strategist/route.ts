import { NextResponse } from 'next/server';
import { runAiStrategistAnalysis } from '@/lib/services/aiStrategistService';

export async function GET() {
  try {
    const analysis = await runAiStrategistAnalysis();
    return NextResponse.json({ success: true, data: analysis });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to run AI Strategist analysis';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
