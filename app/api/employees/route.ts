import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { authorizeRequest } from '@/lib/auth/authorization';

const STORE_PATH = path.join(process.cwd(), 'data', 'employees-store.json');

function readEmployees() {
  try {
    if (!fs.existsSync(STORE_PATH)) return [];
    return JSON.parse(fs.readFileSync(STORE_PATH, 'utf8'));
  } catch {
    return [];
  }
}

function writeEmployees(data: unknown) {
  try {
    fs.writeFileSync(STORE_PATH, JSON.stringify(data, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to write employees:', err);
  }
}

export async function GET(req: NextRequest) {
  const auth = await authorizeRequest(req, 'employees');
  if (auth.errorResponse) return auth.errorResponse;

  const list = readEmployees();
  // Strip any accidental sensitive fields
  const safeList = list.map((emp: Record<string, unknown>) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash, password, ...safe } = emp;
    return safe;
  });

  return NextResponse.json({ success: true, count: safeList.length, data: safeList });
}

export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req, 'employees', ['Super Admin', 'Management', 'HR']);
    if (auth.errorResponse) return auth.errorResponse;

    const body = await req.json();
    const list = readEmployees();

    const newEmp = {
      id: `emp-${Date.now()}`,
      employeeCode: `EXM-EMP-${String(list.length + 1).padStart(3, '0')}`,
      name: body.name,
      role: body.role || 'Production Staff',
      department: body.department || 'Production Line 1',
      phone: body.phone || '+91 94470 00000',
      email: body.email || 'staff@exmarkdoors.com',
      status: 'ACTIVE',
      location: body.location || 'Palakkad Plant',
    };

    list.push(newEmp);
    writeEmployees(list);
    return NextResponse.json({ success: true, data: newEmp }, { status: 201 });
  } catch (err) {
    console.error('Employees error:', err);
    return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
  }
}
