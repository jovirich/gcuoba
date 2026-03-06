import { withAuth } from 'next-auth/middleware';
import { NextResponse } from 'next/server';

export default withAuth(
  function proxy(request) {
    const { pathname, searchParams } = request.nextUrl;

    if (pathname.startsWith('/admin') && !pathname.startsWith('/admin/select-scope')) {
      const scopeType = searchParams.get('scopeType');
      if (!scopeType) {
        const nextQuery = searchParams.toString();
        const nextPath = nextQuery ? `${pathname}?${nextQuery}` : pathname;
        const redirectUrl = request.nextUrl.clone();
        redirectUrl.pathname = '/admin/select-scope';
        redirectUrl.search = '';
        redirectUrl.searchParams.set('next', nextPath);
        return NextResponse.redirect(redirectUrl);
      }
    }

    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => Boolean(token),
    },
  },
);

export const config = {
  matcher: ['/dashboard/:path*', '/profile/:path*', '/notifications/:path*', '/documents/:path*', '/dues/:path*', '/announcements/:path*', '/events/:path*', '/admin/:path*'],
};

