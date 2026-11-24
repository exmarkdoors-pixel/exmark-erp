import { NextRequest, NextResponse } from 'next/server';
import { authorizeRequest } from '@/lib/auth/authorization';
import { executeBulkPartyImport, normalizeVyaparRow, detectVyaparHeaderMapping } from '@/lib/services/vyaparPartyImportService';
import { PartyImportExecutionOptions } from '@/types/vyaparSync';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req, 'customers');
    if (auth.errorResponse) return auth.errorResponse;

    const body = await req.json();
    const rows = body.rows;
    const options: PartyImportExecutionOptions = {
      duplicateStrategy: body.duplicateStrategy || 'SKIP',
      defaultCustomerType: body.defaultCustomerType || 'DEALER',
      postOpeningBalancesToLedger: Boolean(body.postOpeningBalancesToLedger),
      defaultDistrict: body.defaultDistrict || 'Malappuram',
      importAsSuppliers: Boolean(body.importAsSuppliers),
    };

    if (!Array.isArray(rows) || rows.length === 0) {
      return NextResponse.json({ success: false, error: 'No rows provided for import.' }, { status: 400 });
    }

    const headers = Object.keys(rows[0] || {});
    const mapping = body.mapping || detectVyaparHeaderMapping(headers);

    const normalizedRecords = rows.map((row, idx) =>
      normalizeVyaparRow(row, mapping, options.defaultCustomerType, options.defaultDistrict, idx + 1)
    );

    const summary = await executeBulkPartyImport(normalizedRecords, options);

    return NextResponse.json({
      success: true,
      message: `Successfully processed ${summary.totalRowsProcessed} parties. Created: ${summary.importedCustomers + summary.importedSuppliers}, Updated: ${summary.updatedExistingCount}, Skipped: ${summary.skippedDuplicatesCount}.`,
      data: summary,
    });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Failed to execute party bulk import';
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}
