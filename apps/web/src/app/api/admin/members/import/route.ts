import { connectMongo } from '@/lib/server/mongo';
import { resolveAdminMemberAccessScope } from '@/lib/server/admin-members';
import { withApiHandler } from '@/lib/server/route';
import { requireActiveAccount, requireAuthTokenUser } from '@/lib/server/request-auth';
import {
  buildMemberImportTemplateCsv,
  executeBulkMemberImport,
  validateImportFileName,
} from '@/lib/server/member-import';
import { ApiError } from '@/lib/server/api-error';

export const runtime = 'nodejs';

function parseMode(raw: FormDataEntryValue | null): 'preview' | 'commit' {
  const value = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  return value === 'commit' ? 'commit' : 'preview';
}

function parseBoolean(raw: FormDataEntryValue | null): boolean {
  if (typeof raw !== 'string') {
    return false;
  }
  const value = raw.trim().toLowerCase();
  return value === '1' || value === 'true' || value === 'yes' || value === 'on';
}

function parseOptionalString(raw: FormDataEntryValue | null): string | null {
  if (typeof raw !== 'string') {
    return null;
  }
  const value = raw.trim();
  return value.length > 0 ? value : null;
}

export const GET = (request: Request) =>
  withApiHandler(async () => {
    await connectMongo();
    const authUser = await requireAuthTokenUser(request);
    requireActiveAccount(authUser);

    const url = new URL(request.url);
    const scope = await resolveAdminMemberAccessScope(
      authUser,
      url.searchParams.get('scopeType'),
      url.searchParams.get('scopeId'),
    );

    if (scope.kind === 'branch') {
      throw new ApiError(
        403,
        'Bulk member import template is not available in branch scope yet.',
        'Forbidden',
      );
    }

    const content = buildMemberImportTemplateCsv();
    return new Response(content, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="member-bulk-import-template.csv"',
      },
    });
  });

export const POST = (request: Request) =>
  withApiHandler(async () => {
    await connectMongo();
    const authUser = await requireAuthTokenUser(request);
    requireActiveAccount(authUser);

    const url = new URL(request.url);
    const scope = await resolveAdminMemberAccessScope(
      authUser,
      url.searchParams.get('scopeType'),
      url.searchParams.get('scopeId'),
    );

    const formData = await request.formData();
    const mode = parseMode(formData.get('mode'));
    const defaultPassword = parseOptionalString(formData.get('defaultPassword')) ?? 'Gcuoba2026';
    const sendWelcomeEmail = parseBoolean(formData.get('sendWelcomeEmail'));
    const targetClassId = parseOptionalString(formData.get('targetClassId'));
    const targetBranchId = parseOptionalString(formData.get('targetBranchId'));
    const filePart = formData.get('file');
    if (!(filePart instanceof File)) {
      throw new ApiError(400, 'CSV file is required.', 'BadRequest');
    }
    validateImportFileName(filePart.name);

    const csvText = await filePart.text();
    const result = await executeBulkMemberImport({
      actorUserId: authUser.sub,
      scope,
      csvText,
      mode,
      defaultPassword,
      sendWelcomeEmail,
      targetClassId,
      targetBranchId,
    });

    return Response.json(result);
  });

