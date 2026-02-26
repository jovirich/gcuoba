import { getServerSession } from 'next-auth';
import type { UserDTO } from '@gcuoba/types';
import { authOptions } from '@/lib/auth-options';
import { ApiError } from './api-error';

export type AuthenticatedSessionUser = UserDTO & { token: string };

export async function requireSessionUser() {
  const session = await getServerSession(authOptions);
  const user = session?.user as AuthenticatedSessionUser | undefined;
  if (!user?.id || !user.token) {
    throw new ApiError(401, 'Authentication required', 'Unauthorized');
  }
  if (user.status !== 'active') {
    throw new ApiError(403, 'Account pending activation', 'Forbidden');
  }
  return user;
}
