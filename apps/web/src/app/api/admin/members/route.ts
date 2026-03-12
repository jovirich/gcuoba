import { connectMongo } from '@/lib/server/mongo';
import {
  findAdminMember,
  listAdminMembers,
  resolveAdminMemberAccessScope,
} from '@/lib/server/admin-members';
import { executeBulkMemberImport } from '@/lib/server/member-import';
import { ApiError } from '@/lib/server/api-error';
import { withApiHandler } from '@/lib/server/route';
import { requireActiveAccount, requireAuthTokenUser } from '@/lib/server/request-auth';

export const runtime = 'nodejs';

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

    const members = await listAdminMembers(scope, { excludeSystemAccounts: true });
    return Response.json(members);
  });

type CreateMemberBody = {
  firstName?: string;
  lastName?: string;
  middleName?: string;
  title?: string;
  phone?: string;
  email?: string;
  classId?: string;
  branchId?: string;
  houseId?: string;
  dobDay?: number | string | null;
  dobMonth?: number | string | null;
  dobYear?: number | string | null;
  note?: string;
  defaultPassword?: string;
  sendWelcomeEmail?: boolean;
};

function requiredString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function optionalNumberString(value: unknown) {
  if (value === null || value === undefined) {
    return '';
  }
  const raw = `${value}`.trim();
  if (!raw) {
    return '';
  }
  const parsed = Number(raw);
  if (!Number.isFinite(parsed)) {
    return '';
  }
  return String(parsed);
}

function csvCell(value: string) {
  const escaped = value.replace(/"/g, '""');
  return `"${escaped}"`;
}

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

    if (scope.kind === 'branch') {
      throw new ApiError(
        403,
        'Single member onboarding is not available in branch scope. Use class or global scope.',
        'Forbidden',
      );
    }

    const body = (await request.json().catch(() => ({}))) as CreateMemberBody;
    const firstName = requiredString(body.firstName);
    const lastName = requiredString(body.lastName);
    if (!firstName || !lastName) {
      throw new ApiError(400, 'First name and last name are required.', 'BadRequest');
    }

    const email = requiredString(body.email).toLowerCase();
    const phone = requiredString(body.phone);
    if (!email && !phone) {
      throw new ApiError(400, 'Provide at least email or phone.', 'BadRequest');
    }

    const classIdFromBody = requiredString(body.classId);
    const classId = scope.kind === 'class' ? scope.classId : classIdFromBody;
    if (!classId) {
      throw new ApiError(400, 'Class is required.', 'BadRequest');
    }

    const csvHeader = [
      'First Name',
      'Last Name',
      'Middle Name',
      'Title',
      'Phone',
      'Email',
      'Class Id',
      'Branch Id',
      'House Id',
      'DOB Day',
      'DOB Month',
      'DOB Year',
      'Status',
      'Note',
    ].join(',');
    const csvRow = [
      firstName,
      lastName,
      requiredString(body.middleName),
      requiredString(body.title),
      phone,
      email,
      classId,
      scope.kind === 'class' ? '' : requiredString(body.branchId),
      requiredString(body.houseId),
      optionalNumberString(body.dobDay),
      optionalNumberString(body.dobMonth),
      optionalNumberString(body.dobYear),
      'active',
      requiredString(body.note),
    ]
      .map(csvCell)
      .join(',');
    const csvText = `${csvHeader}\n${csvRow}`;

    const preview = await executeBulkMemberImport({
      actorUserId: authUser.sub,
      scope,
      csvText,
      mode: 'preview',
      defaultPassword: requiredString(body.defaultPassword) || 'Gcuoba2026',
      sendWelcomeEmail: false,
      targetClassId: scope.kind === 'class' ? scope.classId : classId,
      targetBranchId: scope.kind === 'class' ? null : requiredString(body.branchId) || null,
    });
    const previewRow = preview.rows[0];
    if (!previewRow || previewRow.status === 'error') {
      throw new ApiError(
        400,
        previewRow?.errors?.join(' | ') || 'Unable to validate member details.',
        'BadRequest',
      );
    }
    if (previewRow.action !== 'create') {
      throw new ApiError(
        400,
        'This member appears to already exist. Use member edit instead of add.',
        'BadRequest',
      );
    }

    const commit = await executeBulkMemberImport({
      actorUserId: authUser.sub,
      scope,
      csvText,
      mode: 'commit',
      defaultPassword: requiredString(body.defaultPassword) || 'Gcuoba2026',
      sendWelcomeEmail: Boolean(body.sendWelcomeEmail),
      targetClassId: scope.kind === 'class' ? scope.classId : classId,
      targetBranchId: scope.kind === 'class' ? null : requiredString(body.branchId) || null,
      rowNumbers: [previewRow.rowNumber],
    });
    const committedRow = commit.rows.find((row) => row.status === 'valid' && row.action === 'create');
    if (!committedRow?.userId) {
      throw new ApiError(500, 'Unable to create member.', 'InternalServerError');
    }

    const member = await findAdminMember(committedRow.userId, scope, { excludeSystemAccounts: true });
    return Response.json(member, { status: 201 });
  });

