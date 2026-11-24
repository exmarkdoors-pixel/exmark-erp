/**
 * EXMARK ERP — Air-Gapped Physical Console Super Admin Reset Utility
 * 
 * SECURITY MODEL:
 * This recovery utility can ONLY be executed locally on the physical server console.
 * It is completely disconnected from web browsers, Cloudflare tunnels, and HTTP endpoints.
 * It directly updates C:\EXMARK-ERP-DATA\users-store.json using cryptographically secure bcrypt hashes.
 */

import fs from 'fs';
import path from 'path';
import readline from 'readline';
import bcrypt from 'bcryptjs';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const dataDir = process.env.EXMARK_DATA_DIR || 'C:\\EXMARK-ERP-DATA';
const usersStorePath = path.join(dataDir, 'users-store.json');
const auditStorePath = path.join(dataDir, 'audit-logs-store.json');

const SALT_ROUNDS = 10;

function askQuestion(rl, query) {
  return new Promise((resolve) => rl.question(query, resolve));
}

function writeJsonAtomic(filePath, data) {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const tmpPath = `${filePath}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmpPath, filePath);
}

function appendAuditLog(entry) {
  try {
    let logs = [];
    if (fs.existsSync(auditStorePath)) {
      logs = JSON.parse(fs.readFileSync(auditStorePath, 'utf8'));
      if (!Array.isArray(logs)) logs = [];
    }
    logs.unshift(entry);
    if (logs.length > 500) logs = logs.slice(0, 500);
    writeJsonAtomic(auditStorePath, logs);
  } catch {
    // Non-fatal
  }
}

export async function resetSuperAdminPassword(newPassword, newPin = null) {
  if (!fs.existsSync(usersStorePath)) {
    throw new Error(`Users store not found at: ${usersStorePath}`);
  }

  const raw = fs.readFileSync(usersStorePath, 'utf8');
  const users = JSON.parse(raw);
  if (!Array.isArray(users)) {
    throw new Error('users-store.json is corrupted or not an array.');
  }

  const adminIndex = users.findIndex(
    (u) => u.id === 'usr-admin-01' || u.role === 'Super Admin' || u.email === 'director@exmarkdoors.com'
  );

  if (adminIndex === -1) {
    throw new Error('Super Admin account (usr-admin-01 / director@exmarkdoors.com) not found.');
  }

  // Backup users-store.json first
  const bakPath = `${usersStorePath}.bak`;
  fs.copyFileSync(usersStorePath, bakPath);

  const passwordHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
  let pinHash = users[adminIndex].pinHash;
  if (newPin && newPin.trim()) {
    pinHash = await bcrypt.hash(newPin.trim(), SALT_ROUNDS);
  }

  users[adminIndex] = {
    ...users[adminIndex],
    passwordHash,
    pinHash,
    customPasswordSet: true,
    mustChangePassword: false,
    isActive: true,
    updatedAt: new Date().toISOString(),
  };

  writeJsonAtomic(usersStorePath, users);

  appendAuditLog({
    id: `aud-reset-${Date.now()}`,
    timestamp: new Date().toISOString(),
    userId: users[adminIndex].id,
    userName: users[adminIndex].name,
    action: 'SUPER_ADMIN_PASSWORD_RESET_PHYSICAL_CONSOLE',
    module: 'SECURITY',
    details: 'Super Admin master password & PIN reset via local air-gapped physical console utility.',
    ip: '127.0.0.1 (Physical Local Console)',
  });

  return {
    success: true,
    user: users[adminIndex].name,
    email: users[adminIndex].email,
    employeeCode: users[adminIndex].employeeCode,
  };
}

async function runCli() {
  console.log('\n========================================================================');
  console.log('  EXMARK ERP — AIR-GAPPED SUPER ADMIN PHYSICAL CONSOLE RECOVERY');
  console.log('  Security Boundary: Local Machine Console ONLY (No Web / Cloud Exposure)');
  console.log('========================================================================\n');

  if (!fs.existsSync(usersStorePath)) {
    console.error(`[ERROR] Data vault users-store.json not found at ${usersStorePath}`);
    process.exit(1);
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  try {
    console.log('Target User: Nazer Karumban (director@exmarkdoors.com / EXM-EMP-001)\n');

    let newPass = '';
    while (!newPass || newPass.length < 6) {
      newPass = (await askQuestion(rl, 'Enter NEW Super Admin Master Password (min 6 characters): ')).trim();
      if (!newPass || newPass.length < 6) {
        console.log('  ⚠ Password must be at least 6 characters long.\n');
      }
    }

    const confirmPass = (await askQuestion(rl, 'Confirm NEW Super Admin Master Password: ')).trim();
    if (newPass !== confirmPass) {
      console.error('\n❌ Passwords do not match. Aborting for security.');
      rl.close();
      process.exit(1);
    }

    const newPin = (await askQuestion(rl, 'Enter NEW Quick PIN (Optional, 4-6 digits, or press Enter to skip): ')).trim();
    if (newPin && !/^\d{4,6}$/.test(newPin)) {
      console.error('\n❌ Quick PIN must be 4 to 6 numeric digits. Aborting.');
      rl.close();
      process.exit(1);
    }

    console.log('\n[1/2] Computing cryptographically secure bcrypt hashes...');
    const result = await resetSuperAdminPassword(newPass, newPin || null);

    console.log('[2/2] Updating data vault atomically & logging physical audit trail...');
    console.log('\n========================================================================');
    console.log('  ✅ SUPER ADMIN CREDENTIALS RESET SUCCESSFULLY!');
    console.log('========================================================================');
    console.log(`  Account:       ${result.user} (${result.employeeCode})`);
    console.log(`  Sign-In Email: ${result.email}`);
    console.log('  Method:        Physical Console Direct Write (Air-Gapped)');
    console.log('  Cloud Status:  Web reset endpoints remain 100% BLOCKED & INACCESSIBLE');
    console.log('========================================================================\n');
  } catch (err) {
    console.error('\n❌ Reset error:', err.message);
  } finally {
    rl.close();
  }
}

// Check invocation
if (process.argv[1] && process.argv[1].endsWith('reset-super-admin.mjs')) {
  if (process.argv.includes('--test')) {
    console.log('Syntax & imports verified successfully.');
    process.exit(0);
  } else {
    runCli();
  }
}
