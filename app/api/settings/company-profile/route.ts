import { NextRequest, NextResponse } from 'next/server';
import {
  getCompanyProfile,
  getDraftCompanyProfile,
  saveCompanyProfile,
  getCompanyLegalHeader,
  getActiveFactory,
} from '@/lib/services/companyProfileService';
import { authorizeRequest } from '@/lib/auth/authorization';
import { getRevisionHistory } from '@/lib/services/customizationService';

/**
 * GET /api/settings/company-profile
 * Retrieve company profile (active, draft, preview, or legal header)
 */
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const view = searchParams.get('view') || 'active';

    if (view === 'header' || view === 'preview') {
      const header = await getCompanyLegalHeader();
      return NextResponse.json({ success: true, data: header });
    }

    if (view === 'draft') {
      const draft = await getDraftCompanyProfile();
      return NextResponse.json({ success: true, data: draft });
    }

    if (view === 'history') {
      const revisions = await getRevisionHistory();
      const profileRevisions = revisions.map((r) => ({
        id: r.id,
        version: r.version,
        publishedAt: r.publishedAt,
        publishedBy: r.publishedBy,
        changelog: r.changelog,
        brandName: r.configSnapshot?.companyProfile?.brandName,
        defaultFactory: r.configSnapshot?.companyProfile?.factories?.find((f) => f.isDefault)?.name,
      }));
      return NextResponse.json({ success: true, data: profileRevisions });
    }

    const active = await getCompanyProfile();
    const activeFactory = getActiveFactory();

    return NextResponse.json({
      success: true,
      data: active,
      activeFactory,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to retrieve company profile';
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

/**
 * POST /api/settings/company-profile
 * Super Admin & Management authorized updates
 */
export async function POST(req: NextRequest) {
  try {
    const auth = await authorizeRequest(req, 'settings', ['Super Admin', 'Management']);
    if (auth.errorResponse) return auth.errorResponse;

    const body = await req.json();
    const action = (body.action as 'SAVE_DRAFT' | 'PUBLISH') || 'SAVE_DRAFT';
    const profile = body.profile;
    const changelog = body.changelog;

    if (!profile) {
      return NextResponse.json(
        { success: false, error: 'Company and factory profile data payload is required.' },
        { status: 400 }
      );
    }

    const user = {
      name: auth.user?.name || 'Super Admin',
      role: auth.user?.role || 'Super Admin',
    };

    const result = await saveCompanyProfile(profile, user, action, changelog);

    return NextResponse.json({
      success: true,
      message:
        action === 'PUBLISH'
          ? `Company & Factory Profile published successfully under version ${result.config.version}.`
          : 'Company & Factory Profile draft saved successfully.',
      data: result.config.companyProfile,
      version: result.config.version,
      revisionId: result.revisionId,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Failed to update company profile';
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
