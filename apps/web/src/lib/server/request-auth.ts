import { ApiError } from './api-error';
import { readBearerToken, verifyAccessToken, type AccessTokenPayload } from './jwt';

export async function requireAuthTokenUser(request: Request): Promise<AccessTokenPayload> {
  const token = readBearerToken(request);
  return verifyAccessToken(token);
}

export function ensureSelfAccess(authUser: AccessTokenPayload, userId: string, message: string) {
  if (authUser.sub !== userId) {
    throw new ApiError(403, message, 'Forbidden');
  }
}

export function requireActiveAccount(authUser: AccessTokenPayload) {
  if (authUser.status !== 'active') {
    throw new ApiError(403, 'Account pending activation', 'Forbidden');
  }
}

