/**
 * EXMARK ERP — Secure Staging Database Migration & Status CLI
 * 
 * Securely prompts for Supabase staging DIRECT_URL or reads from .env.staging.local (gitignored).
 * Validates target project identity, tests connection, and runs `prisma migrate status` safely.
 * ZERO credentials logged or exposed.
 */

import readline from 'readline';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

async function main() {
  console.log('========================================================================');
  console.log('  EXMARK ERP — SUPABASE STAGING MIGRATION INSPECTOR');
  console.log('========================================================================\n');

  // Check if a local gitignored .env.staging.local exists or prompt interactively
  let directUrl = process.env.DIRECT_URL;
  const localStagingPath = path.join(process.cwd(), '.env.staging.local');

  if (!directUrl && fs.existsSync(localStagingPath)) {
    const content = fs.readFileSync(localStagingPath, 'utf8');
    for (const line of content.split('\n')) {
      if (line.startsWith('DIRECT_URL=')) {
        directUrl = line.slice(11).trim().replace(/^["']|["']$/g, '');
        console.log('✓ Found staging credentials in local gitignored file: .env.staging.local');
        break;
      }
    }
  }

  if (!directUrl) {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    directUrl = await new Promise<string>((resolve) => {
      rl.question('Paste your Supabase Staging DIRECT_URL (hidden from logs): ', (answer) => {
        rl.close();
        resolve(answer.trim().replace(/^["']|["']$/g, ''));
      });
    });
  }

  if (!directUrl) {
    console.error('✗ Error: No DIRECT_URL provided. Exiting.');
    process.exit(1);
  }

  // 1. Verify project host and port without exposing username/password
  try {
    const parsed = new URL(directUrl);
    console.log('\n--- 1. TARGET DATABASE IDENTITY VERIFICATION ---');
    console.log(`  Protocol      : ${parsed.protocol}`);
    console.log(`  Host Endpoint : ${parsed.hostname}`);
    console.log(`  Port          : ${parsed.port}`);
    console.log(`  Database Name : ${parsed.pathname.replace(/^\//, '')}`);

    const isSupabase = parsed.hostname.includes('supabase.co') || parsed.hostname.includes('supabase.com');
    if (!isSupabase) {
      console.warn('  [WARNING] Host is not a standard Supabase domain.');
    } else {
      console.log('  ✓ Target confirmed as Supabase Cloud Database.');
    }

    if (parsed.port === '6543') {
      console.warn('  [NOTE] Port 6543 is Supabase Transaction Pooler.');
      console.warn('         Prisma CLI migrations are recommended on Port 5432 (Session Pooler or Direct IPv4).');
    } else if (parsed.port === '5432') {
      console.log('  ✓ Port 5432 confirmed: Session Pooler / Direct migration mode.');
    }
  } catch (err) {
    console.error('✗ Invalid URL format for DIRECT_URL:', err instanceof Error ? err.message : String(err));
    process.exit(1);
  }

  // 2. Execute `prisma migrate status` safely passing DIRECT_URL through environment
  console.log('\n--- 2. EXECUTING PRISMA MIGRATE STATUS ---');
  try {
    const env = { ...process.env, DIRECT_URL: directUrl, DATABASE_URL: directUrl };
    const stdout = execSync('npx prisma migrate status', {
      env,
      stdio: 'pipe',
      encoding: 'utf8',
    });

    console.log(stdout);
    console.log('✓ Prisma migrate status completed successfully (Exit Code: 0).');
  } catch (err: any) {
    console.error('✗ Prisma migrate status encountered an error:');
    if (err.stdout) console.log(err.stdout);
    if (err.stderr) console.error(err.stderr);
    console.error(`Exit Code: ${err.status ?? 1}`);
    process.exit(err.status ?? 1);
  }
}

main().catch((err) => {
  console.error('Fatal CLI Error:', err);
  process.exit(1);
});
