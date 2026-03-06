import type { ClassSetDTO } from '@gcuoba/types';
import { ApiError } from '@/lib/server/api-error';
import {
  hasClassAccess,
  hasGlobalAccess,
  managedClassIds,
  requireGlobalWriteAccess,
} from '@/lib/server/authorization';
import { toClassDto } from '@/lib/server/dto-mappers';
import { connectMongo } from '@/lib/server/mongo';
import { withApiHandler } from '@/lib/server/route';
import { ClassModel } from '@/lib/server/models';
import { requireActiveAccount, requireAuthTokenUser } from '@/lib/server/request-auth';

export const runtime = 'nodejs';

type CreateClassBody = {
  label?: string;
  entryYear?: number;
  status?: 'active' | 'inactive';
};

function parseScopeType(raw: string | null): 'global' | 'branch' | 'class' | undefined {
  if (!raw) {
    return undefined;
  }
  if (raw === 'global' || raw === 'branch' || raw === 'class') {
    return raw;
  }
  throw new ApiError(400, 'Invalid scopeType', 'BadRequest');
}

function parseManagedOnly(raw: string | null): boolean {
  if (!raw) {
    return false;
  }
  const value = raw.trim().toLowerCase();
  return value === '1' || value === 'true' || value === 'yes';
}

export const GET = (request: Request) =>
  withApiHandler(async () => {
    await connectMongo();
    const authUser = await requireAuthTokenUser(request);
    requireActiveAccount(authUser);

    const url = new URL(request.url);
    const scopeType = parseScopeType(url.searchParams.get('scopeType'));
    const scopeId = url.searchParams.get('scopeId')?.trim() || undefined;
    const managedOnly = parseManagedOnly(url.searchParams.get('managedOnly'));

    const query: Record<string, unknown> = {};

    if (scopeType === 'global') {
      const allowed = await hasGlobalAccess(authUser.sub);
      if (!allowed) {
        throw new ApiError(403, 'Not authorized for global scope', 'Forbidden');
      }
    } else if (scopeType === 'class') {
      if (!scopeId && !managedOnly) {
        throw new ApiError(400, 'scopeId is required for class scope', 'BadRequest');
      }
      if (scopeId) {
        const allowed = await hasClassAccess(authUser.sub, scopeId);
        if (!allowed) {
          throw new ApiError(403, 'Not authorized for this class scope', 'Forbidden');
        }
        query._id = scopeId;
      } else {
        const global = await hasGlobalAccess(authUser.sub);
        if (!global) {
          const managedIds = await managedClassIds(authUser.sub);
          query._id = { $in: managedIds };
        }
      }
    } else if (scopeType === 'branch') {
      throw new ApiError(400, 'Branch scope is not valid for classes endpoint', 'BadRequest');
    } else if (managedOnly) {
      const global = await hasGlobalAccess(authUser.sub);
      if (!global) {
        const managedIds = await managedClassIds(authUser.sub);
        query._id = { $in: managedIds };
      }
    }

    const docs = await ClassModel.find(query).sort({ entryYear: -1 }).exec();
    const result: ClassSetDTO[] = docs.map((doc) => toClassDto(doc));
    return Response.json(result);
  });

export const POST = (request: Request) =>
  withApiHandler(async () => {
    await connectMongo();
    const authUser = await requireAuthTokenUser(request);
    await requireGlobalWriteAccess(authUser);

    const body = (await request.json()) as CreateClassBody;
    const label = body.label?.trim();
    if (!label) {
      throw new ApiError(400, 'label is required', 'BadRequest');
    }

    const entryYear = Number(body.entryYear);
    if (!Number.isFinite(entryYear) || entryYear < 1900 || entryYear > 2100) {
      throw new ApiError(400, 'entryYear must be between 1900 and 2100', 'BadRequest');
    }

    const status = body.status;
    if (status !== 'active' && status !== 'inactive') {
      throw new ApiError(400, 'status must be active or inactive', 'BadRequest');
    }

    const doc = await ClassModel.create({
      label,
      entryYear,
      status,
    });

    return Response.json(toClassDto(doc), { status: 201 });
  });

