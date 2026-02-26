import type { DocumentRecordDTO } from '@gcuoba/types';
import { ApiError } from '@/lib/server/api-error';
import { connectMongo } from '@/lib/server/mongo';
import { uploadDocument } from '@/lib/server/documents';
import { withApiHandler } from '@/lib/server/route';
import { requireActiveAccount, requireAuthTokenUser } from '@/lib/server/request-auth';

export const runtime = 'nodejs';

type ScopeType = 'private' | 'global' | 'branch' | 'class';
type Visibility = 'private' | 'scope' | 'public';

function parseScopeType(raw: string | null): ScopeType {
  if (raw === 'private' || raw === 'global' || raw === 'branch' || raw === 'class') {
    return raw;
  }
  throw new ApiError(400, 'Invalid scopeType', 'BadRequest');
}

function parseVisibility(raw: string | null): Visibility | undefined {
  if (!raw) {
    return undefined;
  }
  if (raw === 'private' || raw === 'scope' || raw === 'public') {
    return raw;
  }
  throw new ApiError(400, 'Invalid visibility', 'BadRequest');
}

export const POST = (request: Request) =>
  withApiHandler(async () => {
    await connectMongo();
    const authUser = await requireAuthTokenUser(request);
    requireActiveAccount(authUser);

    const url = new URL(request.url);
    const scopeType = parseScopeType(url.searchParams.get('scopeType'));
    const scopeId = url.searchParams.get('scopeId')?.trim() || undefined;
    const visibility = parseVisibility(url.searchParams.get('visibility'));

    const formData = await request.formData();
    const filePart = formData.get('file');
    if (!(filePart instanceof File)) {
      throw new ApiError(400, 'File is required', 'BadRequest');
    }

    const buffer = Buffer.from(await filePart.arrayBuffer());
    const created: DocumentRecordDTO = await uploadDocument(
      authUser.sub,
      {
        originalName: filePart.name,
        mimeType: filePart.type || undefined,
        sizeBytes: filePart.size,
        buffer,
      },
      {
        scopeType,
        scopeId,
        visibility,
      },
    );

    return Response.json(created, { status: 201 });
  });

