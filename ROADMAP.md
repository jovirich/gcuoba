# Migration Backlog (Laravel -> Nest/Next)

Legend: ✅ = implemented in Node stack, ⏳ = partial, 🟥 = not started.

| Domain | Laravel scope | Node status | Notes / TODO |
| --- | --- | --- | --- |
| Auth & membership gating | Breeze auth, activation, email verification, middleware (`EnsureActive`) | ⏳ Register/login + JWT + active-user guard implemented, with auth audit trail, registration notifications, verification, and password-reset flows. | Add welcome verification listener parity and complete pending/activation lifecycle UX edge cases. |
| Profiles & class membership | Profile CRUD (`ProfileController`), ClassSet selection, photos | ✅ Profile form + class membership update shipped in Next.js `/member/profile`. Photo upload + houses not yet ported. | Need storage layer (S3/local) and Houses list. |
| Branch membership requests | Branch request flow, executive approvals, handover | ✅ Member request + branch executive approvals done. 🟥 Handover & role management still missing. | Add endpoints/UI for assigning roles, view history. |
| Branch/class management & Filament nav | Filament resources for Branch/Class/House CRUD | ⏳ Next admin reference workspace supports branches/classes/houses/countries/roles; parity gaps remain for full CRUD behavior and validation polish. | Close remaining edge-case CRUD parity and UAT hardening. |
| Finance: dues schemes/invoices/payments | Dues scheme resource, global/class/branch scopes, invoice generation, payment capture, ledgers, reports | ⏳ Global schemes + basic outstanding summaries implemented. Payments, ledgers, reporting, receipts, export missing. | Build modules for payments, approvals, PDF receipts, finance dashboards. |
| Welfare | Cases, categories, contributions, payouts, notifications | ⏳ Categories + cases seeded; list API exists. Contributions/payouts/workflows missing. | Need CRUD APIs, approval states, contributions UI. |
| Events & announcements | Scoped events/announcements, RSVP, notifications | ⏳ Scoped events/announcements CRUD APIs are live with publish/update/cancel notifications and audit logs. | Add RSVP/ticketing/order workflows and full admin/member UI parity. |
| Notifications & automation | Email + DB notifications (registration, approval, invoices, payments) | ⏳ In-app DB notifications + SMTP email queue delivered, including autonomous worker polling (`EMAIL_QUEUE_WORKER_ENABLED`) and admin controls (`/notifications/admin/email-queue*`). Finance, events, announcements, and auth registration workflows now publish notifications and email queue jobs with HTML templating. | Expand account lifecycle coverage (verification, reset, suspension alerts) and add delivery analytics. |
| Files/document management | File uploads, scopes, sharing | ⏳ Local document storage shipped (`/documents/upload`, `/documents/mine`, scope browse, download/delete) with scope-aware access checks. | Add S3 backend, signed URLs, virus scanning, and retention policies. |
| Expenses & projects | Filament finance for dual-approval expenses & project tracking | ⏳ API + admin panel now include project/expense edit/delete actions, dual-stage approvals, scoped finance admin summaries, workflow notifications, inline edit forms, and role-scoped branch/class picker options. | Add any remaining niche approval UX details from Filament (if needed after UAT). |
| UI template & shell | Legacy Blade/Filament page framing | ⏳ Node UI now has shared admin shell, member shell, and refreshed auth/landing template styling. | Continue component-level visual polish and responsive QA against PHP screens. |
| Auditing/logs | Audit log table | ⏳ Audit log module added (`/audit-logs`) with workflow/document/finance/event/announcement/auth events recorded and admin viewer in Next.js. | Add CSV/export tooling and retention/archive operations. |
| Health/jobs/queues | `/health`, queue workers, notifications | ✅ `/health` parity. Queues still manual. | Later integrate Bull or another queue runner. |

## Next Steps
1. Prioritize Finance (schemes/invoices/payments reports) to reach parity.
2. Build Welfare contributions/payouts.
3. Add class/branch admin CRUD + Houses.
4. Add RSVP/ticketing + admin/member UI parity for events and announcements.
5. Complete account lifecycle parity (verification, password reset, activation/suspension workflow).
