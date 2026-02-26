import type { UserDTO } from '@gcuoba/types';
import jwt from 'jsonwebtoken';
import { ApiError } from './api-error';

type TokenStatus = 'pending' | 'active' | 'suspended';

export type AccessTokenPayload = {
  sub: string;
  email: string;
  status: TokenStatus;
  iat?: number;
  exp?: number;
};

function getJwtSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new ApiError(500, 'JWT_SECRET is not configured', 'ConfigError');
  }
  return secret;
}

export function signAccessToken(user: UserDTO): string {
  return jwt.sign(
    {
      sub: user.id,
      email: user.email,
      status: user.status,
    },
    getJwtSecret(),
    { expiresIn: '7d' },
  );
}

export function verifyAccessToken(token: string): AccessTokenPayload {
  try {
    return jwt.verify(token, getJwtSecret()) as AccessTokenPayload;
  } catch {
    throw new ApiError(401, 'Invalid or expired token', 'Unauthorized');
  }
}

export function readBearerToken(request: Request): string {
  const header = request.headers.get('authorization');
  if (!header || !header.startsWith('Bearer ')) {
    throw new ApiError(401, 'Authentication required', 'Unauthorized');
  }
  return header.slice('Bearer '.length).trim();
}

