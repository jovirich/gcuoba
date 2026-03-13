import type { AuthResponse } from '@gcuoba/types';

const DEFAULT_API_BASE_URL = 'http://localhost:3001/api';

function normalizeBase(base: string) {
  return base.replace(/\/$/, '');
}

export function resolveApiBaseUrl() {
  const configured = process.env.EXPO_PUBLIC_API_BASE_URL?.trim();
  if (!configured) {
    return DEFAULT_API_BASE_URL;
  }
  return normalizeBase(configured);
}

export function buildApiUrl(path: string) {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${resolveApiBaseUrl()}${normalizedPath}`;
}

export class MobileApiError extends Error {
  statusCode: number;

  constructor(statusCode: number, message: string) {
    super(message);
    this.statusCode = statusCode;
  }
}

export type ClaimSearchBy = 'all' | 'name' | 'email' | 'phone';

export type ClaimMemberOption = {
  userId: string;
  name: string;
  phone: string | null;
  emailMasked: string;
  emailIsPlaceholder: boolean;
};

export type ClaimClassInfo = {
  classId: string;
  entryYear: number;
  label: string;
};

export type ClaimMembersResponse = {
  members: ClaimMemberOption[];
};

export type ClaimVerifyResponse = {
  token: string;
  member: ClaimMemberOption;
  classInfo: ClaimClassInfo;
};

export type ClaimRegistrationOptions = {
  classInfo: ClaimClassInfo;
  branches: Array<{ id: string; name: string }>;
  houses: Array<{ id: string; name: string }>;
};

export type ClaimCompleteInput = {
  token: string;
  firstName: string;
  lastName: string;
  middleName?: string;
  title?: string;
  phone: string;
  email: string;
  password: string;
  confirmPassword: string;
  dobDay: number;
  dobMonth: number;
  dobYear?: number | null;
  branchId?: string | null;
  houseId?: string | null;
  note?: string | null;
};

export type ClaimCompleteResponse = {
  success: true;
  userId: string;
};

type ForgotPasswordResponse = {
  message: string;
  resetUrl?: string;
};

type ResetPasswordInput = {
  token: string;
  email: string;
  password: string;
  passwordConfirmation: string;
};

type ResetPasswordResponse = {
  message: string;
};

type ApiFetchOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  token?: string;
  body?: unknown;
  headers?: Record<string, string>;
};

export async function apiFetch<T>(path: string, options: ApiFetchOptions = {}): Promise<T> {
  const headers = new Headers(options.headers ?? {});
  if (options.token) {
    headers.set('Authorization', `Bearer ${options.token}`);
  }

  let body: BodyInit | undefined;
  if (options.body !== undefined) {
    if (options.body instanceof FormData) {
      body = options.body;
    } else {
      headers.set('Content-Type', 'application/json');
      body = JSON.stringify(options.body);
    }
  }

  const response = await fetch(buildApiUrl(path), {
    method: options.method ?? 'GET',
    headers,
    body,
  });

  const text = await response.text();
  if (!response.ok) {
    let message = text || response.statusText;
    if (text) {
      try {
        const parsed = JSON.parse(text) as { message?: string };
        if (parsed?.message) {
          message = parsed.message;
        }
      } catch {
        // Keep raw text when payload is not JSON.
      }
    }
    throw new MobileApiError(response.status, message);
  }
  if (!text.trim()) {
    return null as T;
  }
  return JSON.parse(text) as T;
}

export async function signIn(identifier: string, password: string): Promise<AuthResponse> {
  return apiFetch<AuthResponse>('/auth/login', {
    method: 'POST',
    body: {
      identifier,
      password,
    },
  });
}

export async function forgotPassword(email: string): Promise<ForgotPasswordResponse> {
  return apiFetch<ForgotPasswordResponse>('/auth/forgot-password', {
    method: 'POST',
    body: { email },
  });
}

export async function resetPassword(input: ResetPasswordInput): Promise<ResetPasswordResponse> {
  return apiFetch<ResetPasswordResponse>('/auth/reset-password', {
    method: 'POST',
    body: input,
  });
}

export async function listClassClaimMembers(
  classYear: number,
  query?: string,
  searchBy: ClaimSearchBy = 'all',
): Promise<ClaimMembersResponse> {
  const params = new URLSearchParams();
  if (query?.trim()) {
    params.set('query', query.trim());
  }
  params.set('searchBy', searchBy);
  return apiFetch<ClaimMembersResponse>(`/claims/class/${classYear}/members?${params.toString()}`);
}

export async function verifyClassClaim(
  classYear: number,
  userId: string,
  password: string,
): Promise<ClaimVerifyResponse> {
  return apiFetch<ClaimVerifyResponse>(`/claims/class/${classYear}/verify`, {
    method: 'POST',
    body: { userId, password },
  });
}

export async function getClassClaimOptions(classYear: number): Promise<ClaimRegistrationOptions> {
  return apiFetch<ClaimRegistrationOptions>(`/claims/class/${classYear}/options`);
}

export async function completeClassClaim(
  classYear: number,
  input: ClaimCompleteInput,
): Promise<ClaimCompleteResponse> {
  return apiFetch<ClaimCompleteResponse>(`/claims/class/${classYear}/complete`, {
    method: 'POST',
    body: input,
  });
}
