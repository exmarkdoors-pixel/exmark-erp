import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { getDataFilePath } from '../utils/dataPaths';

const SECRET_FILE_NAME = '.exmark-auth-secret';
const TOKEN_PREFIX = 'v2.';

/**
 * Resolves the cryptographic HMAC secret from AUTH_SECRET env var or a persistent
 * factory-local key stored inside EXMARK_DATA_DIR/.exmark-auth-secret (dotfiles are
 * excluded from JSON data backups so key material never leaks into snapshots).
 */
export function getSessionSecret(): string {
  const envSecret = process.env.AUTH_SECRET?.trim();
  if (envSecret && envSecret.length >= 16) {
    return envSecret;
  }

  const secretPath = getDataFilePath(SECRET_FILE_NAME);
  try {
    if (fs.existsSync(secretPath)) {
      const existing = fs.readFileSync(secretPath, 'utf8').trim();
      if (existing.length >= 32) {
        return existing;
      }
    }
  } catch {
    // Re-create secret if existing key file is unreadable
  }

  const generated = crypto.randomBytes(32).toString('hex');
  try {
    const dir = path.dirname(secretPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(secretPath, `${generated}\n`, { encoding: 'utf8', mode: 0o600 });
  } catch {
    // Fall back to process-scoped secret if filesystem write fails
  }
  return generated;
}

/**
 * Encodes and signs a session payload with HMAC-SHA256 (`v2.<base64url>.<sig>`).
 */
export function signSessionPayload<T extends object>(payload: T): string {
  const payloadB64 = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const signature = crypto
    .createHmac('sha256', getSessionSecret())
    .update(payloadB64)
    .digest('base64url');
  return `${TOKEN_PREFIX}${payloadB64}.${signature}`;
}

function normalizeRawToken(rawToken: string): string {
  let clean = rawToken.trim();
  if (clean.toLowerCase().startsWith('bearer ')) {
    clean = clean.slice(7).trim();
  }
  try {
    clean = decodeURIComponent(clean);
  } catch {
    // Keep as-is when not URL-encoded
  }
  if (clean.startsWith('"') && clean.endsWith('"')) {
    clean = clean.slice(1, -1);
  }
  return clean;
}

/**
 * Verifies an HMAC-SHA256 signed session token (`v2.<base64url>.<sig>`) and checks expiry.
 * Unsigned or forged payloads strictly return null.
 */
export function verifySignedSessionToken<T extends { issuedAt?: number }>(
  rawToken: string,
  maxAgeSeconds: number
): T | null {
  try {
    const clean = normalizeRawToken(rawToken);
    if (!clean.startsWith(TOKEN_PREFIX)) {
      return null;
    }
    const rest = clean.slice(TOKEN_PREFIX.length);
    const dotIdx = rest.indexOf('.');
    if (dotIdx <= 0) return null;

    const payloadB64 = rest.slice(0, dotIdx);
    const sigB64 = rest.slice(dotIdx + 1);
    if (!payloadB64 || !sigB64) return null;

    const expectedSig = crypto
      .createHmac('sha256', getSessionSecret())
      .update(payloadB64)
      .digest();
    const providedSig = Buffer.from(sigB64, 'base64url');
    if (providedSig.length !== expectedSig.length) {
      return null;
    }
    if (!crypto.timingSafeEqual(providedSig, expectedSig)) {
      return null;
    }

    const decoded = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8')) as T;
    if (!decoded || typeof decoded !== 'object') {
      return null;
    }
    if (decoded.issuedAt && Date.now() - decoded.issuedAt > maxAgeSeconds * 1000) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}
