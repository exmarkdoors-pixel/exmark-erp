import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getDataDir } from '@/lib/utils/dataPaths';

export interface FulfillmentPhotoRecord {
  id: string;
  orderId: string;
  jobCardNumber?: string;
  doorId?: string;
  type: 'DELIVERY_PROOF' | 'INSTALLATION_FINISH' | 'SITE_INSPECTION';
  filePath: string;
  photoUrl: string;
  caption?: string;
  takenBy: string;
  gpsCoords?: { latitude: number; longitude: number };
  timestamp: string;
}

function getPhotosDir(): string {
  const dir = path.join(getDataDir(), 'fulfillment-photos');
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function getMetadataFile(): string {
  return path.join(getDataDir(), 'fulfillment-photos-metadata.json');
}

function loadMetadata(): FulfillmentPhotoRecord[] {
  try {
    const file = getMetadataFile();
    if (fs.existsSync(file)) {
      return JSON.parse(fs.readFileSync(file, 'utf8'));
    }
  } catch (err) {
    console.error('Error reading photos metadata:', err);
  }
  return [];
}

function saveMetadata(records: FulfillmentPhotoRecord[]): void {
  try {
    const file = getMetadataFile();
    fs.writeFileSync(file, JSON.stringify(records, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving photos metadata:', err);
  }
}

// POST: Upload fulfillment photo (Base64 data URI)
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      orderId,
      jobCardNumber,
      doorId,
      type = 'DELIVERY_PROOF',
      photoBase64,
      caption = '',
      takenBy = 'Field Staff',
      gpsCoords,
    } = body;

    if (!orderId || !photoBase64) {
      return NextResponse.json({ error: 'orderId and photoBase64 are required' }, { status: 400 });
    }

    const photosDir = getPhotosDir();
    const photoId = `PHOTO-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const matches = photoBase64.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
    let buffer: Buffer;
    let ext = 'jpg';

    if (matches && matches.length === 3) {
      const mime = matches[1];
      if (mime.includes('png')) ext = 'png';
      else if (mime.includes('webp')) ext = 'webp';
      buffer = Buffer.from(matches[2], 'base64');
    } else {
      buffer = Buffer.from(photoBase64, 'base64');
    }

    const fileName = `${photoId}.${ext}`;
    const filePath = path.join(photosDir, fileName);
    fs.writeFileSync(filePath, buffer);

    const record: FulfillmentPhotoRecord = {
      id: photoId,
      orderId,
      jobCardNumber,
      doorId,
      type,
      filePath,
      photoUrl: `/api/fulfillment/photos?file=${encodeURIComponent(fileName)}`,
      caption,
      takenBy,
      gpsCoords,
      timestamp: new Date().toISOString(),
    };

    const allRecords = loadMetadata();
    allRecords.unshift(record);
    saveMetadata(allRecords);

    return NextResponse.json({ success: true, photo: record });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to upload photo', details: err?.message }, { status: 500 });
  }
}

// GET: Serve photo binary or list photos for an order
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const fileName = searchParams.get('file');

    if (fileName) {
      const safePath = path.join(getPhotosDir(), path.basename(fileName));
      if (!fs.existsSync(safePath)) {
        return NextResponse.json({ error: 'File not found' }, { status: 404 });
      }
      const data = fs.readFileSync(safePath);
      const ext = path.extname(fileName).toLowerCase();
      const mime = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
      return new NextResponse(data, {
        headers: { 'Content-Type': mime, 'Cache-Control': 'public, max-age=86400' },
      });
    }

    const orderId = searchParams.get('orderId');
    const type = searchParams.get('type');
    let records = loadMetadata();

    if (orderId) {
      records = records.filter((r) => r.orderId === orderId || r.jobCardNumber === orderId);
    }
    if (type) {
      records = records.filter((r) => r.type === type);
    }

    return NextResponse.json({ success: true, count: records.length, photos: records });
  } catch (err: any) {
    return NextResponse.json({ error: 'Failed to fetch photos', details: err?.message }, { status: 500 });
  }
}
