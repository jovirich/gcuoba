# GCUOBA Member Mobile App PRD (MVP)

## 1) Product Goal
Build a mobile app for **member activities only** while executive/admin workflows remain on web.

Primary outcomes:
- Increase member engagement and self-service.
- Make welfare contribution, dues visibility, and event participation easier on mobile.
- Preserve governance controls by keeping executive approvals on web.

## 2) Scope
In scope (MVP):
- Authentication (email or phone + password).
- Account claim flow for pre-imported members.
- Member dashboard (dues summary, announcements, welfare, events).
- Dues view (`my dues`).
- Events list + RSVP + optional contribution intent.
- Welfare view + payment submission with evidence upload (pending approval).
- Notifications list + mark read.
- Profile update (member fields only).
- Documents (upload/list/delete own docs, view scope docs).

Out of scope (MVP):
- Executive/admin actions.
- Finance posting/approval workflows.
- Audit/setup modules.
- Offline write queues and advanced push campaigns.

## 3) Users and Permissions
Target users:
- Association members (active and pending claim).

Permission model:
- Mobile app uses member token and existing API authorization.
- If user has executive role, mobile still uses **member-mode** only in MVP.

## 4) Mobile UX Modules
1. Auth
- Sign in with email or phone.
- Forgot/reset password.
- Optional deep-link to claim account.

2. Claim Account
- Search within class-specific claim onboarding.
- Verify with default claim password.
- Complete profile update and set credentials.

3. Dashboard
- Welcome and profile summary.
- Outstanding/grouped dues.
- Active welfare cases and contribution status.
- Upcoming events.
- Recent announcements and notifications.

4. Dues
- My dues broadsheet (year filter).
- Status coloration and grouped invoices.

5. Welfare
- List active welfare cases.
- Submit contribution with amount/date/note and payment evidence upload.
- Show pending/approved/rejected status.
- Show attendance-required badge and event context when linked.

6. Events
- List published events within member scope.
- RSVP (`interested`, `attending`, `not_attending`).
- Optional contribution amount and note (as currently supported).

7. Notifications
- List notifications.
- Mark single as read.
- Mark all as read.

8. Profile
- View/edit member profile fields.
- Request branch membership.
- Respect class-lock/role-lock constraints already enforced by API.

9. Documents
- Upload own docs.
- List/delete own docs.
- View scope docs by selected scope.

## 5) API Mapping (Existing Endpoints)
Auth and claim:
- `POST /api/auth/login`
- `POST /api/auth/forgot-password`
- `POST /api/auth/reset-password`
- `GET /api/claims/class/{classYear}/options`
- `GET /api/claims/class/{classYear}/members`
- `POST /api/claims/class/{classYear}/verify`
- `POST /api/claims/class/{classYear}/complete`

Dashboard and member context:
- `GET /api/dashboard/{userId}`
- `GET /api/announcements?status=published`
- `GET /api/notifications/me?limit=100`
- `GET /api/notifications/me/unread-count`
- `POST /api/notifications/{notificationId}/read`
- `POST /api/notifications/me/read-all`

Dues and finance (member read):
- `GET /api/finance/dues/me?year={year}`

Events:
- `GET /api/events?status=published`
- `POST /api/events/{id}/participation`
- `GET /api/events/{id}/participation`

Welfare:
- `GET /api/welfare/cases`
- `GET /api/welfare/cases/{caseId}`
- `POST /api/welfare/cases/{caseId}/contributions` (multipart supported for evidence upload)

Profile and memberships:
- `GET /api/profiles/{userId}`
- `PATCH /api/profiles/{userId}`
- `GET /api/memberships/class/{userId}`
- `GET /api/memberships/branches/{userId}`
- `POST /api/memberships/branches/{userId}`
- `GET /api/branches`
- `GET /api/classes`
- `GET /api/houses`
- `GET /api/countries`

Documents:
- `GET /api/documents/mine`
- `POST /api/documents/upload`
- `DELETE /api/documents/{documentId}`
- `GET /api/documents/scope`
- `GET /api/documents/{documentId}/download`

## 6) Technical Architecture
Client:
- React Native + Expo + TypeScript.
- Navigation: Expo Router.
- Data: TanStack Query.
- Forms: React Hook Form + Zod.
- Storage: SecureStore for token + lightweight persisted cache.

Auth model:
- Use `POST /api/auth/login` and store returned bearer token.
- Send `Authorization: Bearer <token>` on all protected requests.
- Maintain refresh via re-login for MVP (no refresh-token API yet).

File upload:
- Welfare evidence and document upload via multipart/form-data.
- Use native picker and upload progress UI.

Environment:
- `MOBILE_API_BASE_URL=https://gcuoba.kraiga.com/api` (production).
- Staging can point to Vercel preview domain.

## 7) Non-Functional Requirements
- Startup-to-dashboard under 3 seconds on decent 4G.
- Graceful offline read fallback (cached last successful state).
- Clear API error messages mapped to user-friendly text.
- Crash-free rate target: >99.5%.

## 8) Delivery Plan and Timeline
Phase 1 (Week 1-2): Foundation
- App bootstrap, routing, design system, auth/session, API client.
- Login/forgot/reset + claim flow shell.

Phase 2 (Week 3-4): Core Read Modules
- Dashboard, dues, announcements, notifications, events read.
- Profile read and member context loading.

Phase 3 (Week 5-6): Core Actions
- Events RSVP.
- Welfare contribution submission + evidence upload.
- Profile update and branch request.
- Documents upload/list/delete/download link handling.

Phase 4 (Week 7): Hardening
- Error states, loading skeletons, analytics, QA fixes, security review.

Phase 5 (Week 8): Release
- Internal beta (TestFlight/Play Internal).
- Production rollout and post-launch monitoring.

## 9) Acceptance Criteria (MVP)
- Member can log in with email or phone.
- Member can view dashboard data identical in scope to web member dashboard.
- Member can submit welfare payment evidence and see pending status.
- Member can RSVP to events and update RSVP.
- Member can view and manage notifications.
- Member can update profile and request branch membership.
- Member can upload and manage own documents.
- No executive/admin write actions exposed in mobile app.

## 10) Risks and Mitigations
Risk: API behavior differences between local and production.
Mitigation: Mobile staging against production-like backend and regression checklist per module.

Risk: File upload failures on weak networks.
Mitigation: Retry UX, size limits, and clear failed-state recovery.

Risk: Scope leaks.
Mitigation: Rely on existing server authorization and add mobile-only security tests for member endpoints.

## 11) Next Step
After approval of this PRD:
- Create `apps/mobile` (Expo app) in this monorepo.
- Implement Phase 1 immediately with shared types from `packages/types`.
