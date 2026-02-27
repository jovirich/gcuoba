const DEFAULT_API_PREFIX = '/api';
const DEFAULT_APP_URL = 'http://localhost:3000';

type ApiRequestInit = RequestInit & { token?: string | null };

function normalizeBase(base: string) {
  if (base === '/') {
    return '';
  }
  return base.replace(/\/$/, '');
}

function normalizePath(path: string) {
  if (path.startsWith('/')) {
    return path;
  }
  return `/${path}`;
}

export function resolveApiBaseUrl() {
  const configuredBase =
    typeof window === 'undefined'
      ? process.env.NEXT_PUBLIC_API_BASE_URL
      : process.env.NEXT_PUBLIC_API_BASE_URL;

  if (configuredBase) {
    const normalized = normalizeBase(configuredBase);
    if (typeof window === 'undefined' && normalized.startsWith('/')) {
      return `${resolveAppBaseUrl()}${normalized}`;
    }
    return normalized;
  }

  if (typeof window === 'undefined') {
    return `${resolveAppBaseUrl()}${DEFAULT_API_PREFIX}`;
  }
  return DEFAULT_API_PREFIX;
}

export const API_BASE_URL = resolveApiBaseUrl();

export function buildApiUrl(path: string) {
  return `${resolveApiBaseUrl()}${normalizePath(path)}`;
}

export function resolveAppBaseUrl() {
  if (typeof window === 'undefined') {
    const nextAuthUrl = process.env.NEXTAUTH_URL;
    if (nextAuthUrl) {
      return normalizeBase(nextAuthUrl);
    }

    const publicAppUrl = process.env.NEXT_PUBLIC_APP_URL;
    if (publicAppUrl) {
      return normalizeBase(publicAppUrl);
    }

    const vercelUrl = process.env.VERCEL_URL;
    if (vercelUrl) {
      const withProtocol = vercelUrl.startsWith('http://') || vercelUrl.startsWith('https://')
        ? vercelUrl
        : `https://${vercelUrl}`;
      return normalizeBase(withProtocol);
    }

    return DEFAULT_APP_URL;
  }
  return '';
}

export function buildAppUrl(path: string) {
  const base = resolveAppBaseUrl();
  return base ? `${base}${normalizePath(path)}` : normalizePath(path);
}

export async function fetchJson<T>(path: string, init: ApiRequestInit = {}): Promise<T> {
  const { token, ...rest } = init;
  const headers = new Headers(rest.headers ?? {});
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(buildApiUrl(path), {
    ...rest,
    headers,
    cache: 'no-store',
  });

  const bodyText = await response.text();

  if (!response.ok) {
    throw new Error(`API ${response.status}: ${bodyText || response.statusText}`);
  }

  if (bodyText.trim().length === 0) {
    return null as T;
  }

  return JSON.parse(bodyText) as T;
}

export async function fetchAppJson<T>(path: string, init: ApiRequestInit = {}): Promise<T> {
  const { token, ...rest } = init;
  const headers = new Headers(rest.headers ?? {});
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(buildAppUrl(path), {
    ...rest,
    headers,
    cache: 'no-store',
  });

  const bodyText = await response.text();
  if (!response.ok) {
    throw new Error(`API ${response.status}: ${bodyText || response.statusText}`);
  }
  if (bodyText.trim().length === 0) {
    return null as T;
  }
  return JSON.parse(bodyText) as T;
}

