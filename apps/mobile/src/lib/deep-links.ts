import * as Linking from 'expo-linking';

export type ParsedAuthLink =
  | { view: 'reset'; email?: string; token?: string }
  | { view: 'claim'; classYear?: string }
  | null;

export function parseResetLink(raw: string) {
  try {
    const parsed = new URL(raw);
    const segments = parsed.pathname.split('/').filter(Boolean);
    const token = segments[segments.length - 1] || '';
    const email = parsed.searchParams.get('email') || '';
    return { token, email };
  } catch {
    return { token: '', email: '' };
  }
}

export function parseAuthLink(rawUrl: string): ParsedAuthLink {
  const parsed = Linking.parse(rawUrl);
  const rawPath = (parsed.path ?? '').replace(/^\/+|\/+$/g, '');
  const segments = rawPath.split('/').filter(Boolean);
  const first = segments[0]?.toLowerCase();
  const second = segments[1]?.toLowerCase();
  const third = segments[2]?.toLowerCase();
  const queryEmail =
    typeof parsed.queryParams?.email === 'string' ? parsed.queryParams.email.trim().toLowerCase() : '';
  const queryToken =
    typeof parsed.queryParams?.token === 'string' ? parsed.queryParams.token.trim() : '';

  if (first === 'reset-password') {
    const pathToken = segments[1] || queryToken;
    return { view: 'reset', email: queryEmail || undefined, token: pathToken || undefined };
  }

  if (first === 'claim' && second === 'class') {
    return { view: 'claim', classYear: segments[2] };
  }
  if (first === 'claim' && second === 'account') {
    return { view: 'claim', classYear: segments[2] };
  }
  if (first === 'claims' && second === 'class') {
    return { view: 'claim', classYear: segments[2] };
  }
  if (first === 'claims' && second === 'account' && third === 'class') {
    return { view: 'claim', classYear: segments[3] };
  }
  if (first === 'claim' || first === 'claim-account') {
    const year = segments[1];
    return { view: 'claim', classYear: year };
  }

  return null;
}
