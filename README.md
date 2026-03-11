# GCUOBA TypeScript Stack

Monorepo for the Node.js + React + MongoDB rewrite. Structure:

- `apps/api` - NestJS service (Mongo-ready, includes Users/Branches/Roles, finance endpoints, welfare endpoints, seed script)
- `apps/web` - Next.js App Router frontend for members/admins, now with NextAuth + middleware protecting `/member/*` and `/admin/*`
- `packages/types` - shared TypeScript contracts (DTOs, enums)
- `packages/ui` - shared React primitives (currently a Branch card demo)
- `packages/config` - placeholder for shared lint/build config

## Getting started

```bash
cd ts-stack
cp apps/api/.env.example apps/api/.env     # update MONGODB_URI / JWT_SECRET / PORT
cp apps/web/.env.local.example apps/web/.env.local  # set NEXT_PUBLIC_API_BASE_URL / NEXTAUTH_SECRET
npm install
npm run dev:api    # starts NestJS in watch mode (default http://localhost:4000)
npm run dev:web    # starts Next.js dev server on http://localhost:<web-port>
```

### Seeding demo data

```bash
cd ts-stack
npm run seed --workspace api   # requires MongoDB running at MONGODB_URI
```

The seed command now creates:

- Branches (Lagos, Abuja) and the base annual dues scheme
- Users + hashed passwords
  - `exec@example.com` / `password` &rarr; branch executive with access to Lagos
  - `member@example.com` / `password` &rarr; pending member with a Lagos join request + unpaid invoice
- Roles, role assignments, and branch membership records so the branch executive queue has data

After seeding, start both apps, sign in at `http://localhost:<web-port>/login`, and:

1. Use the member account to view the `/member/dashboard` experience.
2. Use the executive account to open `/admin/branch-executive` and approve/reject the pending request.

## API endpoints
- `GET /users`, `GET /branches`, `GET /roles`
- `POST /auth/register`, `POST /auth/login`
- `GET /finance/schemes`, `GET /finance/invoices/:userId`, `GET /finance/outstanding/:userId`, `POST /finance/invoices`, `POST /finance/payments`
- `GET /welfare/cases?scopeType=global|branch|class`
- `GET /branch-executive/:userId`, `POST /branch-executive/:userId/memberships/:membershipId/{approve|reject}`

## Frontend features
- Member dashboard fetches branches, outstanding dues, and welfare appeals
- `/member/*` routes require auth (NextAuth credentials provider hitting `/auth/login`)
- `/admin/*` routes require auth and currently expose the branch executive pending-memberships queue
- `/login` page allows demo sign-in and redirects to `/member/dashboard`

## Next steps
- Seed Mongo with full data set & admin CRUD
- Implement full executive UI (finance + welfare management)
- Build migration scripts from the Laravel/MySQL dataset into MongoDB


