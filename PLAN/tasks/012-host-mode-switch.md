---
id: "012"
title: "User-to-Host Mode Switch for Host Profiles"
status: in_progress
priority: medium
created: 2026-03-07
updated: 2026-03-08
assigned: codex
branch: task/012-host-mode-switch
pr: null
attempts: 0
depends_on: []
progress: 0
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

- [ ] "Switch to Host" option visible only for users with `is_host = true`
- [ ] Mode toggle in user menu/navbar
- [ ] Host navigation shows Dashboard, Experiences, Availability menu items
- [ ] "Switch to Traveler" returns to normal user navigation
- [ ] Current mode persisted in session (localStorage or URL-based)
- [ ] Host pages use a host layout wrapper
- [ ] Non-host users cannot access host routes (redirect to user home)

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
- [ ] Create host mode context/state (ViewModeProvider)
- [ ] Add "Switch to Host" and mode indicator in user menu for hosts only
- [ ] Add host-mode-aware marketing/chat header navigation links
- [ ] Create host layout wrapper with host navigation shell
- [ ] Create `/host`, `/host/experiences`, `/host/availability` routes
- [ ] Add host route protection (redirect non-host users)
- [ ] Add "Switch to Traveler" in host layout navigation
- [ ] Persist and restore mode selection via localStorage
- [ ] Run lint/type/build checks and document environment blockers

## Review Notes

## Agent Log
