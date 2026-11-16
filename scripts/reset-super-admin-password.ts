import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { getDataFilePath } from '../lib/utils/dataPaths';

const SALT_ROUNDS = 10;

async function hashSecret(secret: string): Promise<string> {
  const salt = await bcrypt.genSalt(SALT_ROUNDS);
  return bcrypt.hash(secret, salt);
}

function writeJsonAtomic(filePath: string, data: unknown): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  const tmpPath = `${filePath}.tmp`;
  fs.writeFileSync(tmpPath, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmpPath, filePath);
}

async function main() {
  const newPassword = process.argv[2]?.trim() || 'Exmark@2026';
  const newPin = process.argv[3]?.trim() || '2026';

  if (newPassword.length < 6) {
    console.error('❌ Error: Password must be at least 6 characters long.');
    process.exit(1);
  }

  if (newPin && !/^\d{4,6}$/.test(newPin)) {
    console.error('❌ Error: Quick PIN must be exactly 4 to 6 numeric digits.');
    process.exit(1);
  }

  const candidatePaths = [
    getDataFilePath('users-store.json'),
    'C:\\EXMARK-ERP-DATA\\users-store.json',
    path.join(process.cwd(), 'data', 'users-store.json'),
  ];
  const targetPaths = Array.from(new Set(candidatePaths.filter((p) => fs.existsSync(p))));
  if (targetPaths.length === 0) {
    targetPaths.push(getDataFilePath('users-store.json'));
  }

  console.log(`\n======================================================`);
  console.log(`  EXMARK ERP • Super Admin Password Reset Tool`);
  console.log(`======================================================`);
  console.log(`Target Store Paths (${targetPaths.length}):\n${targetPaths.map((p) => `  - ${p}`).join('\n')}`);

  const now = new Date().toISOString();
  const passwordHash = await hashSecret(newPassword);
  const pinHash = newPin ? await hashSecret(newPin) : undefined;

  let updatedAdminRecord: any = null;

  for (const storePath of targetPaths) {
    let users: any[] = [];
    if (fs.existsSync(storePath)) {
      try {
        const raw = fs.readFileSync(storePath, 'utf8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) users = parsed;
      } catch {
        users = [];
      }
    }

    let adminIndex = users.findIndex(
      (u: any) => u.id === 'usr-admin-01' || u.role === 'Super Admin' || u.email === 'director@exmarkdoors.com'
    );

    if (adminIndex === -1) {
      console.log(`⚠️  Super Admin account missing in ${storePath}. Creating...`);
      const newAdmin = {
        id: 'usr-admin-01',
        name: 'Nazer Karumban',
        email: 'director@exmarkdoors.com',
        role: 'Super Admin',
        employeeCode: 'EXM-EMP-001',
        department: 'Executive & Strategy',
        plantLocation: 'Central Manufacturing Plant & Corporate HQ',
        passwordHash,
        pinHash,
        customPasswordSet: true,
        mustChangePassword: false,
        isActive: true,
        createdAt: now,
        updatedAt: now,
      };
      users.unshift(newAdmin);
      updatedAdminRecord = newAdmin;
    } else {
      users[adminIndex] = {
        ...users[adminIndex],
        id: 'usr-admin-01',
        name: users[adminIndex].name || 'Nazer Karumban',
        email: users[adminIndex].email || 'director@exmarkdoors.com',
        role: 'Super Admin',
        employeeCode: users[adminIndex].employeeCode || 'EXM-EMP-001',
        passwordHash,
        pinHash,
        customPasswordSet: true,
        mustChangePassword: false,
        isActive: true,
        updatedAt: now,
      };
      updatedAdminRecord = users[adminIndex];
    }

    writeJsonAtomic(storePath, users);
    console.log(`✓ Synchronized credentials into: ${storePath}`);
  }

  const admin = updatedAdminRecord || {
    name: 'Nazer Karumban',
    role: 'Super Admin',
    employeeCode: 'EXM-EMP-001',
    email: 'director@exmarkdoors.com',
  };
  console.log(`\n✅ SUPER ADMIN CREDENTIALS UPDATED SUCCESSFULLY!`);
  console.log(`------------------------------------------------------`);
  console.log(`  Account Name : ${admin.name}`);
  console.log(`  Role         : ${admin.role}`);
  console.log(`  Employee Code: ${admin.employeeCode}`);
  console.log(`  Email Login  : ${admin.email}`);
  console.log(`  New Password : ${newPassword}`);
  console.log(`  Quick PIN    : ${newPin || '(none)'}`);
  console.log(`  Active Status: ACTIVE (isActive: true)`);
  console.log(`------------------------------------------------------`);
  console.log(`\nYou can now log in at http://localhost:4000/login using either:`);
  console.log(`  1. Tap / Type Staff Code "${admin.employeeCode}" and enter Quick PIN "${newPin}"`);
  console.log(`  2. Type Email "${admin.email}" and enter Password "${newPassword}"\n`);
}

main().catch((err) => {
  console.error('Fatal error during reset:', err);
  process.exit(1);
});
