import { withApiHandler } from '@/lib/server/route';
import { ApiError } from '@/lib/server/api-error';

export const runtime = 'nodejs';

type Context = {
  params: Promise<{ path: string[] }>;
};

const LEGACY_DEFAULT = 'http://localhost:4000';

function resolveLegacyApiBase() {
  return (
    process.env.LEGACY_API_BASE_URL ||
    process.env.INTERNAL_API_BASE_URL ||
    LEGACY_DEFAULT
  ).replace(/\/$/, '');
}

function shouldIncludeBody(method: string) {
  return !['GET', 'HEAD'].includes(method.toUpperCase());
}

async function proxyRequest(request: Request, path: string[]) {
  const incomingUrl = new URL(request.url);
  const joinedPath = path.join('/');
  const targetUrl = new URL(`${resolveLegacyApiBase()}/${joinedPath}`);
  targetUrl.search = incomingUrl.search;

  const headers = new Headers(request.headers);
  headers.delete('host');
  headers.delete('connection');
  headers.delete('content-length');

  const body = shouldIncludeBody(request.method) ? await request.arrayBuffer() : undefined;
  const upstream = await fetch(targetUrl.toString(), {
    method: request.method,
    headers,
    body,
    cache: 'no-store',
    redirect: 'manual',
  });

  const responseHeaders = new Headers(upstream.headers);
  responseHeaders.delete('content-length');
  responseHeaders.delete('transfer-encoding');

  return new Response(upstream.body, {
    status: upstream.status,
    statusText: upstream.statusText,
    headers: responseHeaders,
  });
}

async function handle(request: Request, context: Context) {
  const { path } = await context.params;
  if (!path || path.length === 0) {
    throw new ApiError(404, 'Not found', 'NotFound');
  }
  try {
    return await proxyRequest(request, path);
  } catch {
    throw new ApiError(502, 'Legacy API proxy request failed', 'BadGateway');
  }
}

export const GET = (request: Request, context: Context) => withApiHandler(() => handle(request, context));
export const POST = (request: Request, context: Context) => withApiHandler(() => handle(request, context));
export const PUT = (request: Request, context: Context) => withApiHandler(() => handle(request, context));
export const PATCH = (request: Request, context: Context) => withApiHandler(() => handle(request, context));
export const DELETE = (request: Request, context: Context) => withApiHandler(() => handle(request, context));
export const OPTIONS = (request: Request, context: Context) => withApiHandler(() => handle(request, context));
