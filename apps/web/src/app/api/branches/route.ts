import type { BranchDTO } from '@gcuoba/types';
import { ApiError } from '@/lib/server/api-error';
import {
  hasBranchAccess,
  hasGlobalAccess,
  managedBranchIds,
  requireGlobalWriteAccess,
} from '@/lib/server/authorization';
import { toBranchDto } from '@/lib/server/dto-mappers';
import { connectMongo } from '@/lib/server/mongo';
import { withApiHandler } from '@/lib/server/route';
import { BranchModel } from '@/lib/server/models';
import { requireActiveAccount, requireAuthTokenUser } from '@/lib/server/request-auth';

export const runtime = 'nodejs';

type CreateBranchBody = {
  name?: string;
  country?: string;
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
    } else if (scopeType === 'branch') {
      if (!scopeId && !managedOnly) {
        throw new ApiError(400, 'scopeId is required for branch scope', 'BadRequest');
      }
      if (scopeId) {
        const allowed = await hasBranchAccess(authUser.sub, scopeId);
        if (!allowed) {
          throw new ApiError(403, 'Not authorized for this branch scope', 'Forbidden');
        }
        query._id = scopeId;
      } else {
        const global = await hasGlobalAccess(authUser.sub);
        if (!global) {
          const managedIds = await managedBranchIds(authUser.sub);
          query._id = { $in: managedIds };
        }
      }
    } else if (scopeType === 'class') {
      throw new ApiError(400, 'Class scope is not valid for branches endpoint', 'BadRequest');
    } else if (managedOnly) {
      const global = await hasGlobalAccess(authUser.sub);
      if (!global) {
        const managedIds = await managedBranchIds(authUser.sub);
        query._id = { $in: managedIds };
      }
    }

    const docs = await BranchModel.find(query).exec();
    const result: BranchDTO[] = docs.map((doc) => toBranchDto(doc));
    return Response.json(result);
  });

export const POST = (request: Request) =>
  withApiHandler(async () => {
    await connectMongo();
    const authUser = await requireAuthTokenUser(request);
    await requireGlobalWriteAccess(authUser);

    const body = (await request.json()) as CreateBranchBody;
    const name = body.name?.trim();
    if (!name) {
      throw new ApiError(400, 'name is required', 'BadRequest');
    }
    if (name.length > 190) {
      throw new ApiError(400, 'name must be at most 190 characters', 'BadRequest');
    }

    const country = body.country?.trim();
    if (country && country.length > 190) {
      throw new ApiError(400, 'country must be at most 190 characters', 'BadRequest');
    }

    const doc = await BranchModel.create({
      name,
      country: country || null,
    });

    return Response.json(toBranchDto(doc), { status: 201 });
  });

