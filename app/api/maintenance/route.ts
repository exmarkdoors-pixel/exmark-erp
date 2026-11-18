import { NextRequest, NextResponse } from 'next/server';
import { authorizeRequest } from '@/lib/auth/authorization';
import {
  readMaintenanceStore,
  createPlantMachine,
  updatePlantMachine,
  createMaintenanceTicket,
  updateMaintenanceTicket,
  deleteMaintenanceTicket,
} from '@/lib/services/plantOpsFuturePhaseService';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await authorizeRequest(req, 'maintenance');
  if (auth.errorResponse) return auth.errorResponse;
  return NextResponse.json({ success: true, data: readMaintenanceStore() });
}

export async function POST(req: NextRequest) {
  const auth = await authorizeRequest(req, 'maintenance');
  if (auth.errorResponse) return auth.errorResponse;
  try {
    const body = await req.json();
    if (body?.kind === 'MACHINE') {
      const created = createPlantMachine(body);
      return NextResponse.json({ success: true, data: created, message: `Equipment ${created.name} added.` });
    }
    const created = createMaintenanceTicket(body);
    return NextResponse.json({ success: true, data: created, message: `Maintenance ticket ${created.id} logged.` });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Failed to create maintenance record' },
      { status: 400 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await authorizeRequest(req, 'maintenance');
  if (auth.errorResponse) return auth.errorResponse;
  try {
    const body = await req.json();
    if (!body?.id) throw new Error('Record ID is required.');
    if (body?.kind === 'MACHINE') {
      const updated = updatePlantMachine(String(body.id), body);
      return NextResponse.json({ success: true, data: updated, message: `Equipment ${updated.id} updated.` });
    }
    const updated = updateMaintenanceTicket(String(body.id), body);
    return NextResponse.json({ success: true, data: updated, message: `Ticket ${updated.id} updated.` });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Failed to update maintenance record' },
      { status: 400 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await authorizeRequest(req, 'maintenance');
  if (auth.errorResponse) return auth.errorResponse;
  try {
    const id = req.nextUrl.searchParams.get('id');
    if (!id) throw new Error('Ticket ID is required.');
    deleteMaintenanceTicket(id);
    return NextResponse.json({ success: true, message: `Maintenance ticket ${id} deleted.` });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Failed to delete ticket' },
      { status: 400 }
    );
  }
}
