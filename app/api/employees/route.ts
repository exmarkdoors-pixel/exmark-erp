import { NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';

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

export async function GET() {
  const list = readEmployees();
  return NextResponse.json({ success: true, count: list.length, data: list });
}

export async function POST(req: Request) {
  try {
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
