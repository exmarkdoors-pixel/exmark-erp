import { NextRequest, NextResponse } from 'next/server';
import { authorizeRequest } from '@/lib/auth/authorization';
import {
  listCompanies,
  createCompany,
  switchActiveCompany,
  updateCompanyMeta,
  deleteCompany,
} from '@/lib/services/companyRegistryService';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const auth = await authorizeRequest(req);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const data = listCompanies();
    return NextResponse.json({ success: true, data });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Failed to load companies' },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  const auth = await authorizeRequest(req, 'settings', ['Super Admin', 'Management']);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const body = await req.json();
    const action = String(body?.action || 'CREATE').toUpperCase();

    if (action === 'SWITCH') {
      if (!body?.companyId) throw new Error('companyId is required to switch company.');
      const switched = switchActiveCompany(String(body.companyId));
      return NextResponse.json({
        success: true,
        data: switched,
        message: `Switched active workspace to ${switched.activeCompany.brandName}.`,
      });
    }

    const created = createCompany(body);
    return NextResponse.json({
      success: true,
      data: created,
      message: `Company "${created.company.brandName}" created successfully with its own isolated workspace.`,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Failed to process company request' },
      { status: 400 }
    );
  }
}

export async function PATCH(req: NextRequest) {
  const auth = await authorizeRequest(req, 'settings', ['Super Admin', 'Management']);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const body = await req.json();
    if (!body?.companyId) throw new Error('companyId is required.');
    const updated = updateCompanyMeta(String(body.companyId), body);
    return NextResponse.json({
      success: true,
      data: updated,
      message: `Updated company "${updated.brandName}".`,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Failed to update company' },
      { status: 400 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  const auth = await authorizeRequest(req, 'settings', ['Super Admin']);
  if (auth.errorResponse) return auth.errorResponse;

  try {
    const id = req.nextUrl.searchParams.get('id');
    if (!id) throw new Error('Company ID is required.');
    const deleted = deleteCompany(id);
    return NextResponse.json({
      success: true,
      data: deleted,
      message: `Company "${deleted.legalName}" and its isolated workspace were permanently deleted.`,
    });
  } catch (err: unknown) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : 'Failed to delete company' },
      { status: 400 }
    );
  }
}
