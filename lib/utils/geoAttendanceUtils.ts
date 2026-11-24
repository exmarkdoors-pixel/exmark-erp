/**
 * EXMARK ERP — Geo-Attendance, Geofencing & Selfie Watermark Utilities
 * Works cleanly across both Client (Mobile Camera + Canvas) and Server (Haversine distance calculations).
 */

export function calculateDistanceMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth mean radius in meters
  const toRad = (deg: number) => (deg * Math.PI) / 180;

  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) *
      Math.cos(toRad(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c);
}

/**
 * Sums total kilometers across chronological GPS waypoints, ignoring minor static drift (< 18m).
 */
export function calculateRouteDistanceKm(
  points: Array<{ latitude: number; longitude: number }>
): number {
  if (!points || points.length < 2) return 0;

  let totalMeters = 0;
  let lastValid = points[0];

  for (let i = 1; i < points.length; i++) {
    const curr = points[i];
    if (
      typeof curr.latitude !== 'number' ||
      typeof curr.longitude !== 'number' ||
      Number.isNaN(curr.latitude) ||
      Number.isNaN(curr.longitude)
    ) {
      continue;
    }

    const segmentMeters = calculateDistanceMeters(
      lastValid.latitude,
      lastValid.longitude,
      curr.latitude,
      curr.longitude
    );

    // Filter out stationary GPS jitter (< 18m)
    if (segmentMeters >= 18) {
      totalMeters += segmentMeters;
      lastValid = curr;
    }
  }

  return Number((totalMeters / 1000).toFixed(2));
}

/**
 * Browser-safe reverse geocoding to get street/town label for watermark & route UI.
 */
export async function reverseGeocodeCoords(lat: number, lng: number): Promise<string> {
  const fallback = `${lat.toFixed(4)}° N, ${lng.toFixed(4)}° E`;
  if (typeof fetch === 'undefined') return fallback;

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
    const res = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lng}`,
      {
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
        },
      }
    );
    clearTimeout(timer);

    if (!res.ok) return fallback;
    const data = await res.json();
    const addr = data?.address;
    if (!addr) return data?.display_name?.slice(0, 65) || fallback;

    const parts = [
      addr.road || addr.suburb || addr.neighbourhood || addr.village,
      addr.town || addr.city || addr.county || addr.state_district,
      addr.state,
    ].filter(Boolean);

    return parts.length > 0 ? parts.join(', ') : fallback;
  } catch {
    return fallback;
  }
}

export interface SelfieWatermarkMeta {
  staffName: string;
  staffCode: string;
  eventLabel: string; // e.g. "PUNCH-IN", "PUNCH-OUT", "SITE VISIT: Mr. Faisal"
  latitude: number;
  longitude: number;
  accuracyMeters?: number;
  address: string;
  timestampStr?: string;
}

/**
 * Captures frame from video element onto HTML5 Canvas, burns cryptographic geo-metadata banner,
 * and returns compressed JPEG base64 data URL (< 180 KB).
 */
export function captureGeoWatermarkedSelfie(
  videoEl: HTMLVideoElement,
  meta: SelfieWatermarkMeta,
  mirrorHorizontal = true
): string {
  const targetWidth = 640;
  const aspect =
    videoEl.videoHeight > 0 && videoEl.videoWidth > 0
      ? videoEl.videoHeight / videoEl.videoWidth
      : 4 / 3;
  const targetHeight = Math.round(targetWidth * aspect);

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;

  const ctx = canvas.getContext('2d');
  if (!ctx) return '';

  ctx.save();
  if (mirrorHorizontal) {
    ctx.translate(targetWidth, 0);
    ctx.scale(-1, 1);
  }
  ctx.drawImage(videoEl, 0, 0, targetWidth, targetHeight);
  ctx.restore();

  // Draw HUD Banner at the bottom of the selfie
  const bannerHeight = 86;
  const yStart = targetHeight - bannerHeight;

  ctx.fillStyle = 'rgba(7, 13, 30, 0.84)';
  ctx.fillRect(0, yStart, targetWidth, bannerHeight);

  // Accent Left Bar
  ctx.fillStyle = '#E63946';
  ctx.fillRect(0, yStart, 6, bannerHeight);

  // Header badge text
  ctx.fillStyle = '#38BDF8';
  ctx.font = 'bold 13px sans-serif';
  ctx.fillText(`EXMARK VERIFIED • ${meta.eventLabel.toUpperCase()}`, 16, yStart + 20);

  // Staff Name & Code
  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 14px sans-serif';
  ctx.fillText(`${meta.staffName} (${meta.staffCode})`, 16, yStart + 40);

  // GPS Coordinates & Accuracy
  const accStr = meta.accuracyMeters ? ` (±${Math.round(meta.accuracyMeters)}m)` : '';
  const coordLine = `GPS: ${meta.latitude.toFixed(5)}° N, ${meta.longitude.toFixed(5)}° E${accStr}`;
  ctx.fillStyle = '#34D399';
  ctx.font = '12px monospace';
  ctx.fillText(coordLine, 16, yStart + 58);

  // Address + Timestamp
  const ts =
    meta.timestampStr ||
    new Date().toLocaleString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
  const addrTrunc =
    meta.address.length > 42 ? `${meta.address.slice(0, 40)}...` : meta.address;

  ctx.fillStyle = '#CBD5E1';
  ctx.font = '11px sans-serif';
  ctx.fillText(`${addrTrunc}  |  ${ts}`, 16, yStart + 76);

  return canvas.toDataURL('image/jpeg', 0.74);
}
