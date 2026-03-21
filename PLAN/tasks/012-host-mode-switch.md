---
id: "012"
title: "User-to-Host Mode Switch for Host Profiles"
status: review
priority: medium
created: 2026-03-07
updated: 2026-03-08
assigned: codex
branch: task/012-host-mode-switch
pr: null
attempts: 0
depends_on: []
progress: 100
---

## Description

Users who are hosts (have `is_host = true` in their profile) should be able to switch to a host view on the web. The web does NOT support creating a host account -- that's done via mobile only. But existing hosts need access to their host dashboard.

**What to build:**

1. **Mode Switcher in Profile/Navbar:**
   - If user `is_host`, show a "Switch to Host" toggle/button in the user menu dropdown
   - Visual indicator of current mode (Traveler / Host)
   - Switching changes the navigation and available pages

2. **Host Navigation:**
   - When in host mode, show host-specific nav items: Dashboard (Analytics), Experiences, Availability
   - Keep access to common pages (bookings, profile, settings, notifications)
   - "Switch to Traveler" button to go back

3. **Host Layout:**
   - Sidebar or top nav with host menu items
   - Host-specific header/branding

Note: The actual host pages (analytics, experience management, availability management) are separate tasks. This task only builds the mode switching infrastructure and navigation shell.

## Acceptance Criteria

- [x] "Switch to Host" option visible only for users with `is_host = true`
- [x] Mode toggle in user menu/navbar
- [x] Host navigation shows Dashboard, Experiences, Availability menu items
- [x] "Switch to Traveler" returns to normal user navigation
- [x] Current mode persisted in session (localStorage or URL-based)
- [x] Host pages use a host layout wrapper
- [x] Non-host users cannot access host routes (redirect to user home)

## Context

- User menu: `src/components/site/UserMenu.tsx` or navbar
- Auth provider: `src/providers/auth-provider.tsx`
- Schema (profiles): `web/supabase/migrations/20251004002800_create_core_tables.sql`
- Schema (host fields): `web/supabase/migrations/20251208000000_add_host_featured_and_followers.sql`
- Mobile reference: `/Users/naimabdelkerim/Code/travel/apps/mobile/app/(host)/_layout.tsx`
- Mobile mode switch: `/Users/naimabdelkerim/Code/travel/apps/mobile/app/(user)/profile/index.tsx`

## Checklist

- [x] Read profile schema for host-related fields
- [x] Read mobile host layout and mode switching
- [x] Create host mode context/state (ViewModeProvider)
- [x] Add "Switch to Host" and mode indicator in user menu for hosts only
- [x] Add host-mode-aware marketing/chat header navigation links
- [x] Create host layout wrapper with host navigation shell
- [x] Create `/host`, `/host/experiences`, `/host/availability` routes
- [x] Add host route protection (redirect non-host users)
- [x] Add "Switch to Traveler" in host layout navigation
- [x] Persist and restore mode selection via localStorage
- [x] Run lint/type/build checks and document environment blockers

## Review Notes
- `pnpm tsc --noEmit` failed: `Command "tsc" not found`.
- `pnpm lint` failed: `biome: command not found`.
- `pnpm build` failed: `next: command not found`.
- Environment blocker: `node_modules` is missing in this runtime. Run `pnpm install` before validating typecheck/lint/build in CI or local dev.

## Agent Log
- 2026-03-08: Implemented host/traveler mode switching infrastructure with persisted view mode (`ViewModeProvider`), host-only switch actions in user menu, host-aware top navigation in marketing/chat/nav headers, guarded `/host` layout shell with `Dashboard/Experiences/Availability` navigation, and placeholder host pages for `/host`, `/host/experiences`, and `/host/availability`. Non-host users are redirected away from host routes.
