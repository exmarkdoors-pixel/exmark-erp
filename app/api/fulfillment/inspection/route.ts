import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getDataDir } from '@/lib/utils/dataPaths';

export interface SiteQualityInspectionRecord {
  id: string;
  orderId: string;
  jobCardNumber?: string;
  customerName: string;
  siteAddress: string;
  technicianName: string;
  // 6-Point Quality Checklist
  checks: {
    framePlumbAndLevel: boolean; // Frame plumbed with spirit level
    uniformPerimeterGap: boolean; // 3mm uniform perimeter gap
    hingeScrewsFirm: boolean; // All SS hinge screws fully seated
    lockLatchOperationSmooth: boolean; // Lock, latch & cylinder engage effortlessly
    bottomClearanceFloorLevel: boolean; // 8-10mm floor clearance
    surfaceFinishScratchFree: boolean; // Zero transit scratches or blemishing
  };
  overallRating: number; // 1 to 5 stars
  customerSignature?: string; // Base64 signature image
  customerFeedback?: string;
  technicianNotes?: string;
  gpsCoords?: { latitude: number; longitude: number };
  completedAt: string;
}

function getInspectionFilePath(): string {
  return path.join(getDataDir(), 'installation-inspections.json');
}

function loadInspections(): SiteQualityInspectionRecord[] {
  try {
    const file = getInspectionFilePath();
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, 'utf8'));
    }
  } catch (err) {
    console.error('Error reading inspections file:', err);
  }
  return [];
}

function saveInspections(records: SiteQualityInspectionRecord[]): void {
  try {
    const file = getInspectionFilePath();
    fs.writeFileSync(file, JSON.stringify(records, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving inspections file:', err);
  }
}

// POST: Record Site Quality Inspection
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      orderId,
      jobCardNumber,
      customerName = 'Customer',
      siteAddress = '',
      technicianName = 'Lead Installer',
      checks,
      overallRating = 5,
      customerSignature,
      customerFeedback = '',
      technicianNotes = '',
      gpsCoords,
    } = body;

    if (!orderId || !checks) {
      return NextResponse.json({ error: 'orderId and checks object are required' }, { status: 400 });
    }

    const inspectionId = `INSP-${Date.now()}`;
    const record: SiteQualityInspectionRecord = {
      id: inspectionId,
      orderId,
      jobCardNumber,
      customerName,
      siteAddress,
      technicianName,
      checks: {
        framePlumbAndLevel: Boolean(checks.framePlumbAndLevel),
        uniformPerimeterGap: Boolean(checks.uniformPerimeterGap),
        hingeScrewsFirm: Boolean(checks.hingeScrewsFirm),
        lockLatchOperationSmooth: Boolean(checks.lockLatchOperationSmooth),
        bottomClearanceFloorLevel: Boolean(checks.bottomClearanceFloorLevel),
        surfaceFinishScratchFree: Boolean(checks.surfaceFinishScratchFree),
      },
      overallRating: Math.min(5, Math.max(1, Number(overallRating) || 5)),
      customerSignature,
      customerFeedback,
      technicianNotes,
      gpsCoords,
      completedAt: new Date().toISOString(),
    };

    const records = loadInspections();
    records.unshift(record);
    saveInspections(records);

    return NextResponse.json({ success: true, inspection: record });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to record inspection', details: err?.message }, { status: 500 });
  }
}

// GET: List or fetch inspections
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orderId = searchParams.get('orderId');
    let records = loadInspections();

    if (orderId) {
      records = records.filter((r) => r.orderId === orderId || r.jobCardNumber === orderId);
    }

    return NextResponse.json({ success: true, count: records.length, inspections: records });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to fetch inspections', details: err?.message }, { status: 500 });
  }
}
