import { withAuth } from 'next-auth/middleware';

export default withAuth(
  function proxy() {
    return;
  },
  {
    callbacks: {
      authorized: ({ token }) => Boolean(token),
    },
  },
);

export const config = {
  matcher: ['/dashboard/:path*', '/profile/:path*', '/notifications/:path*', '/documents/:path*', '/announcements/:path*', '/events/:path*', '/admin/:path*'],
};

