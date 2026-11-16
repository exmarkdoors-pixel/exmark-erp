/**
 * EXMARK ERP — PostgreSQL Connection URL Diagnostics & Auto-Repair Tool
 *
 * Usage:
 *   node scripts/test-postgres-url.mjs [OPTIONAL_POSTGRES_URL]
 *   node scripts/test-postgres-url.mjs --repair-render
 */

import fs from 'fs';
import path from 'path';
import dns from 'dns/promises';
import net from 'net';
import pg from 'pg';
import { fileURLToPath } from 'url';

const { Client } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

function sanitizeDatabaseUrl(raw) {
  if (!raw) return '';
  let cleaned = raw.trim().replace(/^["'`]|["'`]$/g, '').trim();
  cleaned = cleaned.replace(/^(?:psql\s+|uri:\s*|url:\s*|code:\s*|file:\s*code\s*)/i, '').trim();
  cleaned = cleaned.replace(/^["'`]|["'`]$/g, '').trim();
  const authorityMatch = cleaned.match(/^([a-z0-9+.-]+:\/\/)([^/:?#]+):(.+)@([^/?#]+)(.*)$/i);
  if (authorityMatch) {
    const [, scheme, user, pass, hostPort, tail] = authorityMatch;
    const safePass = pass.replace(/#/g, '%23').replace(/@/g, '%40');
    cleaned = `${scheme}${user}:${safePass}@${hostPort}${tail}`;
  }
  return cleaned;
}

function maskUrl(raw) {
  try {
    const u = new URL(raw);
    const port = u.port ? `:${u.port}` : '';
    return `${u.protocol}//${u.username}:***@${u.hostname}${port}${u.pathname}`;
  } catch {
    return 'postgresql://***@***/***';
  }
}

async function getStoredUrl() {
  // Check argument
  const arg = process.argv.slice(2).find((a) => !a.startsWith('--'));
  if (arg) return sanitizeDatabaseUrl(arg);

  // Check .env.local / process.env
  if (process.env.DATABASE_URL) return sanitizeDatabaseUrl(process.env.DATABASE_URL);

  const envLocalPath = path.join(rootDir, '.env.local');
  if (fs.existsSync(envLocalPath)) {
    const content = fs.readFileSync(envLocalPath, 'utf8');
    const match = content.match(/^DATABASE_URL=["']?([^"'\r\n]+)["']?/m);
    if (match && match[1]) return sanitizeDatabaseUrl(match[1]);
  }

  // Check C:\EXMARK-ERP-DATA\.cloud-sync-secrets.enc via dynamic import of cloudSyncConfigService
  try {
    const { readCloudSyncSecrets } = await import('../lib/services/cloudSyncConfigService.ts');
    const secrets = readCloudSyncSecrets();
    if (secrets.cloudDatabaseUrl) return sanitizeDatabaseUrl(secrets.cloudDatabaseUrl);
  } catch {
    // ignore
  }

  return '';
}

async function testSingleUrl(rawUrl, label = 'Candidate URL') {
  console.log(`\n------------------------------------------------------------------------`);
  console.log(`Testing: ${label}`);
  console.log(`Masked:  ${maskUrl(rawUrl)}`);

  let parsed;
  try {
    parsed = new URL(rawUrl);
  } catch (err) {
    console.error(`✗ URL Syntax Error: ${err.message}`);
    return { success: false, error: `Invalid URL syntax: ${err.message}` };
  }

  const hostname = parsed.hostname;
  const port = parseInt(parsed.port || '5432', 10);
  console.log(`  [1/4] DNS Resolution (${hostname})...`);

  try {
    const lookup = await dns.lookup(hostname);
    console.log(`  ✓ DNS Resolved -> ${lookup.address}`);
  } catch (err) {
    console.error(`  ✗ DNS Failed: ${err.message}`);
    if (!hostname.includes('.')) {
      console.warn(`    NOTE: "${hostname}" appears to be an internal cluster hostname (e.g. Render internal).`);
      console.warn(`    External connections from Windows require the External Database URL (ending in .render.com).`);
    }
    return { success: false, error: `DNS lookup failed: ${err.message}`, isInternalHostname: !hostname.includes('.') };
  }

  console.log(`  [2/4] TCP Port Reachability (${hostname}:${port})...`);
  const tcpOk = await new Promise((resolve) => {
    const socket = new net.Socket();
    socket.setTimeout(4000);
    socket.on('connect', () => {
      socket.destroy();
      resolve(true);
    });
    socket.on('timeout', () => {
      socket.destroy();
      resolve(false);
    });
    socket.on('error', () => {
      socket.destroy();
      resolve(false);
    });
    socket.connect(port, hostname);
  });

  if (!tcpOk) {
    console.error(`  ✗ TCP Connection Timed Out or Refused on port ${port}.`);
    return { success: false, error: `TCP connection failed on ${hostname}:${port}` };
  }
  console.log(`  ✓ TCP Socket Open on port ${port}`);

  console.log(`  [3/4] PostgreSQL Authentication & SSL Handshake...`);
  const needsSsl = rawUrl.includes('render.com') || rawUrl.includes('supabase.co') || rawUrl.includes('neon.tech') || rawUrl.includes('sslmode=require');
  
  const client = new Client({
    connectionString: rawUrl,
    connectionTimeoutMillis: 7000,
    ssl: needsSsl ? { rejectUnauthorized: false } : false,
  });

  try {
    await client.connect();
    console.log(`  ✓ SSL Handshake & Password Authentication Succeeded!`);

    console.log(`  [4/4] Live Database Metadata Query...`);
    const verRes = await client.query('SELECT version();');
    const verText = verRes.rows[0]?.version || 'PostgreSQL';
    console.log(`  ✓ Engine: ${verText.split(',')[0]}`);

    const tableRes = await client.query(`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public'
    `);
    const tableNames = tableRes.rows.map((r) => r.tablename);
    console.log(`  ✓ Public Tables (${tableNames.length}): ${tableNames.slice(0, 8).join(', ')}${tableNames.length > 8 ? '...' : ''}`);

    await client.end();
    return { success: true, version: verText, tables: tableNames, workingUrl: rawUrl };
  } catch (err) {
    console.error(`  ✗ Database Auth/Query Error: ${err.message}`);
    try {
      await client.end();
    } catch {}
    return { success: false, error: err.message };
  }
}

async function main() {
  console.log('========================================================================');
  console.log('  EXMARK ERP — POSTGRESQL CONNECTION DIAGNOSTICS & TESTER');
  console.log('========================================================================');

  const configured = await getStoredUrl();
  if (!configured) {
    console.error('✗ No PostgreSQL URL found in arguments, .env.local, or .cloud-sync-secrets.enc.');
    console.log('Usage: node scripts/test-postgres-url.mjs "postgresql://user:pass@host:5432/db?sslmode=require"');
    process.exit(1);
  }

  // Test the primary configured URL
  const initialResult = await testSingleUrl(configured, 'Configured Database URL');

  if (initialResult.success) {
    console.log('\n========================================================================');
    console.log('  ✓ POSTGRESQL CONNECTION IS HEALTHY AND READY!');
    console.log('========================================================================\n');
    process.exit(0);
  }

  // If failed and is an internal Render hostname (e.g. dpg-dbtb1ue7bikc73djd6d0-a), test external candidates
  if (initialResult.isInternalHostname || configured.includes('dpg-')) {
    console.log('\n========================================================================');
    console.log('  DETECTED RENDER INTERNAL HOSTNAME — TESTING EXTERNAL REGIONS');
    console.log('========================================================================');

    const u = new URL(configured);
    const baseHost = u.hostname;
    const candidates = [
      'singapore-postgres.render.com',
      'oregon-postgres.render.com',
      'frankfurt-postgres.render.com',
      'ohio-postgres.render.com',
      'virginia-postgres.render.com',
    ];

    let foundWorking = null;
    for (const region of candidates) {
      const testHost = `${baseHost}.${region}`;
      const searchParams = new URLSearchParams(u.search);
      searchParams.set('sslmode', 'require');
      const candidateUrl = `${u.protocol}//${u.username}:${u.password}@${testHost}:5432${u.pathname}?${searchParams.toString()}`;

      const res = await testSingleUrl(candidateUrl, `Render External (${region})`);
      if (res.success) {
        foundWorking = candidateUrl;
        break;
      }
    }

    if (foundWorking) {
      console.log('\n========================================================================');
      console.log('  ✓ FOUND WORKING EXTERNAL RENDER POSTGRESQL URL!');
      console.log(`  Masked: ${maskUrl(foundWorking)}`);
      console.log('========================================================================\n');

      // Offer or auto-save into cloud secrets
      try {
        const { saveCloudSyncSecrets } = await import('../lib/services/cloudSyncConfigService.ts');
        saveCloudSyncSecrets({ cloudDatabaseUrl: foundWorking });
        console.log('  ✓ Updated C:\\EXMARK-ERP-DATA\\.cloud-sync-secrets.enc with working External URL.');
      } catch (err) {
        console.warn(`  ! Could not save to cloud secrets: ${err.message}`);
      }

      // Append to .env.local if not present
      try {
        const envLocalPath = path.join(rootDir, '.env.local');
        let envContent = fs.existsSync(envLocalPath) ? fs.readFileSync(envLocalPath, 'utf8') : '';
        if (/^DATABASE_URL=/m.test(envContent)) {
          envContent = envContent.replace(/^DATABASE_URL=.*$/m, `DATABASE_URL="${foundWorking}"`);
          envContent = envContent.replace(/^DIRECT_URL=.*$/m, `DIRECT_URL="${foundWorking}"`);
        } else {
          envContent += `\nDATABASE_URL="${foundWorking}"\nDIRECT_URL="${foundWorking}"\n`;
        }
        fs.writeFileSync(envLocalPath, envContent, 'utf8');
        console.log('  ✓ Updated .env.local with DATABASE_URL and DIRECT_URL.');
      } catch (err) {
        console.warn(`  ! Could not update .env.local: ${err.message}`);
      }

      process.exit(0);
    } else {
      console.error('\n✗ None of the external Render regions could authenticate with these credentials.');
      console.error('Please verify your database password or copy the "External Database URL" from your Render Dashboard.');
      process.exit(1);
    }
  }

  process.exit(1);
}

main().catch((err) => {
  console.error(`\n✗ DIAGNOSTIC SCRIPT CRASHED: ${err.message}\n`);
  process.exit(1);
});
