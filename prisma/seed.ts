import { PrismaClient } from '@prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import bcrypt from 'bcryptjs';

const connectionString =
  process.env.DATABASE_URL ||
  'postgresql://postgres:postgres@localhost:5432/exmark_erp?schema=public';

const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

const SALT_ROUNDS = 12;

async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(SALT_ROUNDS);
  return bcrypt.hash(password, salt);
}

async function main() {
  console.log('🌱 Starting EXMARK ERP PostgreSQL Seed (Stage 4)...');

  // 1. ROLES
  const rolesData = [
    { name: 'Super Admin', description: 'Full system enterprise control, users, settings, and audit logs.' },
    { name: 'Management', description: 'Executive oversight, sales and production analytics, financial metrics.' },
    { name: 'Sales', description: 'Dealer relationships, builder leads, door quotations, and sales orders.' },
    { name: 'Accounts', description: 'Invoicing, GST (HSN 3925) reconciliation, e-Way bills, and payment ledgers.' },
    { name: 'Production', description: 'FRP press lines, WPC extrusion calibration, CNC routing, and QA audits.' },
    { name: 'Inventory', description: 'Resin silos, fiberglass roving, WPC polymer granules, and warehouse bays.' },
    { name: 'Purchase', description: 'Chemical vendor POs, raw materials procurement, and delivery receipts.' },
    { name: 'HR', description: 'Factory technician shift rosters, designations, and employee records.' },
    { name: 'Installation', description: 'Site door opening measurements, delivery logistics, and client fitting sign-off.' },
  ];

  const roleMap: Record<string, string> = {};

  for (const r of rolesData) {
    const role = await prisma.role.upsert({
      where: { name: r.name },
      update: { description: r.description },
      create: { name: r.name, description: r.description, isSystem: true },
    });
    roleMap[r.name] = role.id;
  }
  console.log(`✅ Seeded ${rolesData.length} ERP Roles.`);

  // 2. PERMISSIONS
  const modules = [
    'DASHBOARD',
    'CUSTOMERS',
    'CRM',
    'QUOTATIONS',
    'MEASUREMENTS',
    'SALES_ORDERS',
    'PRODUCTION',
    'INVENTORY',
    'PURCHASES',
    'ACCOUNTS',
    'EMPLOYEES',
    'DISPATCH',
    'REPORTS',
    'SETTINGS',
  ];
  const actions = ['CREATE', 'READ', 'UPDATE', 'DELETE', 'APPROVE'];

  for (const mod of modules) {
    for (const act of actions) {
      await prisma.permission.upsert({
        where: { module_action: { module: mod, action: act } },
        update: {},
        create: {
          module: mod,
          action: act,
          description: `Allow ${act} on ${mod}`,
        },
      });
    }
  }
  console.log('✅ Seeded granular ERP Permissions matrix.');

  // 3. EMPLOYEES & USERS
  const defaultPassword = await hashPassword('Exmark@2026');

  const seedUsers = [
    {
      code: 'EXM-EMP-001',
      firstName: 'Nazer',
      lastName: 'Karumban',
      email: 'director@exmarkdoors.com',
      phone: '+91 94470 12000',
      department: 'Executive & Strategy',
      designation: 'Plant & Operations Director',
      role: 'Super Admin',
    },
    {
      code: 'EXM-EMP-002',
      firstName: 'Amina',
      lastName: 'Rahman',
      email: 'management@exmarkdoors.com',
      phone: '+91 94471 22334',
      department: 'Operations Oversight',
      designation: 'Executive Operations Manager',
      role: 'Management',
    },
    {
      code: 'EXM-EMP-003',
      firstName: 'Shabeer',
      lastName: 'Ali',
      email: 'sales.calicut@exmarkdoors.com',
      phone: '+91 98471 23411',
      department: 'Dealer Sales',
      designation: 'Regional Sales Head - Malabar',
      role: 'Sales',
    },
    {
      code: 'EXM-EMP-004',
      firstName: 'Varghese',
      lastName: 'Mathew',
      email: 'accounts.kochi@exmarkdoors.com',
      phone: '+91 94470 56782',
      department: 'Finance & GST',
      designation: 'Senior Accounts Officer',
      role: 'Accounts',
    },
    {
      code: 'EXM-EMP-005',
      firstName: 'Rajesh',
      lastName: 'P.',
      email: 'plant.palakkad@exmarkdoors.com',
      phone: '+91 98471 44551',
      department: 'Production Line 1',
      designation: 'FRP Plant Floor Lead',
      role: 'Production',
    },
    {
      code: 'EXM-EMP-006',
      firstName: 'Deepa',
      lastName: 'V.',
      email: 'inventory@exmarkdoors.com',
      phone: '+91 94002 33441',
      department: 'Warehouse & Stores',
      designation: 'Quality & Inventory Manager',
      role: 'Inventory',
    },
    {
      code: 'EXM-EMP-007',
      firstName: 'Suresh',
      lastName: 'Kumar',
      email: 'purchase@exmarkdoors.com',
      phone: '+91 97450 66772',
      department: 'Procurement',
      designation: 'Raw Materials Purchase Lead',
      role: 'Purchase',
    },
    {
      code: 'EXM-EMP-008',
      firstName: 'Priya',
      lastName: 'Nair',
      email: 'hr@exmarkdoors.com',
      phone: '+91 98950 11223',
      department: 'Human Resources',
      designation: 'HR & Technician Supervisor',
      role: 'HR',
    },
    {
      code: 'EXM-EMP-009',
      firstName: 'Anoop',
      lastName: 'Krishnan',
      email: 'site.installation@exmarkdoors.com',
      phone: '+91 94463 55667',
      department: 'Field Operations',
      designation: 'Senior Site Measurement Engineer',
      role: 'Installation',
    },
  ];

  for (const u of seedUsers) {
    const employee = await prisma.employee.upsert({
      where: { employeeCode: u.code },
      update: {
        firstName: u.firstName,
        lastName: u.lastName,
        department: u.department,
        designation: u.designation,
      },
      create: {
        employeeCode: u.code,
        firstName: u.firstName,
        lastName: u.lastName,
        email: u.email,
        phone: u.phone,
        department: u.department,
        designation: u.designation,
        dateOfJoining: new Date('2024-01-15'),
        status: 'ACTIVE',
      },
    });

    await prisma.user.upsert({
      where: { email: u.email },
      update: {
        roleId: roleMap[u.role],
        employeeId: employee.id,
      },
      create: {
        email: u.email,
        name: `${u.firstName} ${u.lastName}`,
        passwordHash: defaultPassword,
        roleId: roleMap[u.role],
        employeeId: employee.id,
        isActive: true,
      },
    });
  }
  console.log(`✅ Seeded ${seedUsers.length} Employees and Users with bcrypt password hashes.`);

  // 4. AUDIT LOG INITIALIZATION
  await prisma.auditLog.create({
    data: {
      action: 'APPROVAL',
      entityType: 'USER',
      details: JSON.stringify({ message: 'EXMARK ERP Database seeded successfully with Stage 4 foundation.' }),
      ipAddress: '127.0.0.1',
    },
  });

  console.log('🎉 EXMARK ERP PostgreSQL Seed Completed Successfully.');
}

main()
  .catch((e) => {
    console.error('Seed error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
