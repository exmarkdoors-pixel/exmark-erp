import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

export async function GET(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const filename = url.searchParams.get('file');
    if (!filename || filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
      return NextResponse.json({ error: 'Invalid or missing file parameter' }, { status: 400 });
    }

    const releaseDir = process.env.EXMARK_RELEASE_DIR?.trim() || 'C:\\EXMARK-Releases';
    const filePath = path.join(/*turbopackIgnore: true*/ releaseDir, filename);

    if (!fs.existsSync(/*turbopackIgnore: true*/ filePath)) {
      return NextResponse.json({ error: 'Requested release file not found' }, { status: 404 });
    }

    const stat = fs.statSync(/*turbopackIgnore: true*/ filePath);
    const fileStream = fs.createReadStream(/*turbopackIgnore: true*/ filePath);

    let contentType = 'application/octet-stream';
    if (filename.endsWith('.apk')) contentType = 'application/vnd.android.package-archive';
    else if (filename.endsWith('.exe')) contentType = 'application/x-msdownload';
    else if (filename.endsWith('.png')) contentType = 'image/png';
    else if (filename.endsWith('.txt')) contentType = 'text/plain; charset=utf-8';

    // Convert node readstream to web ReadableStream
    const webStream = new ReadableStream({
      start(controller) {
        fileStream.on('data', (chunk) => controller.enqueue(chunk));
        fileStream.on('end', () => controller.close());
        fileStream.on('error', (err) => controller.error(err));
      },
    });

    return new NextResponse(webStream, {
      headers: {
        'Content-Type': contentType,
        'Content-Length': stat.size.toString(),
        'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Download failed';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
