import type { AuthResponse, UserDTO } from '@gcuoba/types';
import Credentials from 'next-auth/providers/credentials';
import type { NextAuthOptions } from 'next-auth';
import { buildAppUrl } from './api';

type SessionUser = UserDTO & { token: string };

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET,
  providers: [
    Credentials({
      name: 'Credentials',
      credentials: {
        identifier: { label: 'Email or phone', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials) {
          return null;
        }

        const identifier = `${credentials.identifier ?? ''}`.trim();
        const password = `${credentials.password ?? ''}`;
        if (!identifier || !password) {
          return null;
        }

        const res = await fetch(buildAppUrl('/api/auth/login'), {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ identifier, password }),
        });

        if (!res.ok) {
          return null;
        }

        const data = (await res.json()) as AuthResponse;
        const user: SessionUser = { ...data.user, token: data.token };
        return user;
      },
    }),
  ],
  session: { strategy: 'jwt' },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        (token as typeof token & { user?: SessionUser }).user = user as SessionUser;
      }
      return token;
    },
    async session({ session, token }) {
      const sessionUser = (token as typeof token & { user?: SessionUser }).user;
      if (sessionUser) {
        session.user = sessionUser;
      }
      return session;
    },
  },
};

