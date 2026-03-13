# Mobile App Quickstart

## Location
- App workspace: `apps/mobile`

## Run locally
1. Copy `apps/mobile/.env.example` to `apps/mobile/.env`.
2. Set `EXPO_PUBLIC_API_BASE_URL` to your reachable API URL.
   - Example (same machine web API): `http://localhost:3001/api`
   - Example (physical phone on same Wi-Fi): `http://<YOUR_PC_LAN_IP>:3001/api`
3. From repo root:
   - `npm run dev:mobile`
4. Open in Expo Go (QR) or Android/iOS emulator.

## Deep-link testing
- Reset password link: `gcuoba://reset-password/<token>?email=<email>`
- Claim flow link: `gcuoba://claim/<classYear>`
- The app also parses hosted links with those path patterns.
- In forgot-password, if a dev reset link is returned, the app can copy/open/use it directly.

## Current mobile modules
- Sign in (email or phone)
- Forgot password (email request)
- Reset password (token + email + new password)
- Claim account (class year search, verify default password, complete profile)
- Dashboard summary
- My dues
- Events + RSVP
- Events + RSVP + contribution intent (amount/note)
- Welfare contributions (member posting + optional evidence upload + my submission status)
- Documents (upload, list mine, download, delete mine, load scope docs)
- Notifications
- Profile update (basic + profile photo upload)
- Branch membership request

## UX additions
- Bottom navigation shows unread badge on Alerts.
- Documents lists support search and paging for large record sets.

## Code structure
- Shared styles: `apps/mobile/src/styles.ts`
- Shared helpers: `apps/mobile/src/lib/*`
- Auth screens: `apps/mobile/src/screens/auth/*`
- Member screens: `apps/mobile/src/screens/member/*` (`dashboard`, `dues`, `events`, `welfare`, `notifications`, `documents`, `profile`)
- Member shell/navigation: `apps/mobile/src/navigation/member-shell.tsx`

## Notes
- Mobile is member-only for now. Executive/admin flows remain on web.
- API token is stored securely using `expo-secure-store`.
