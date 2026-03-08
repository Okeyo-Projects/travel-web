---
id: "004"
title: "Notifications Page with Unread Badge and Navigation"
status: todo
priority: high
created: 2026-03-07
updated: 2026-03-07
assigned: codex
branch: null
pr: null
attempts: 0
depends_on: []
progress: 0
---

## Description

Build a notifications page and integrate an unread notification badge into the site header/navbar. The database already has a `notifications` table with types and read status.

**Notification Bell in Navbar:**
- Bell icon in the site header (next to user menu)
- Red badge with unread count (hidden when 0)
- Clicking opens notifications page or dropdown panel

**Notifications Page (`/notifications`):**
- List of all notifications, most recent first
- Each notification shows: icon (by type), title, message, timestamp (relative: "2 hours ago"), read/unread state (bold for unread)
- Notification types with appropriate icons:
  - Booking updates (new booking, approved, declined, cancelled, completed)
  - Payment notifications (payment received, payment reminder)
  - Review requests
  - Follow notifications
  - System announcements
- Click notification to navigate to relevant page (booking detail, experience, etc.)
- "Mark all as read" button
- Mark individual as read on click
- Empty state when no notifications
- Real-time updates via Supabase subscription (notifications table has realtime enabled)

Reference the mobile notifications screen at `/Users/naimabdelkerim/Code/travel/apps/mobile/app/notifications.tsx`.

## Acceptance Criteria

- [ ] Bell icon with unread badge in site navbar
- [ ] Unread count updates in real-time (Supabase realtime)
- [ ] Notifications page lists all notifications, newest first
- [ ] Each notification shows icon, title, message, relative timestamp
- [ ] Unread notifications visually distinct (bold/highlighted)
- [ ] Clicking notification navigates to relevant page
- [ ] Clicking notification marks it as read
- [ ] "Mark all as read" button works
- [ ] Empty state when no notifications
- [ ] Page is responsive (mobile-friendly)
- [ ] Only visible to authenticated users

## Context

- Schema: `web/supabase/migrations/20251004002812_create_chat_tables.sql` (notifications may be here)
- Schema: `web/supabase/migrations/20251217000000_enable_notifications_realtime.sql`
- Schema: `web/supabase/migrations/20251222000002_add_notification_types.sql`
- Schema: `web/supabase/migrations/20251222000009_update_notification_types.sql`
- Types: `web/src/types/supabase.ts` (notifications table)
- Navbar: `src/components/navbar.tsx`
- Mobile reference: `/Users/naimabdelkerim/Code/travel/apps/mobile/app/notifications.tsx`

## Checklist

- [ ] Read notification schema and types
- [ ] Read mobile notifications screen for design reference
- [ ] Create notification types in `web/src/types/`
- [ ] Create `use-notifications.ts` hook (fetch, mark read, mark all read, unread count, realtime subscription)
- [ ] Build NotificationBell component (icon + badge)
- [ ] Integrate NotificationBell into navbar
- [ ] Build NotificationItem component (icon, title, message, timestamp, read state)
- [ ] Build NotificationList component
- [ ] Create `/notifications` page
- [ ] Add navigation mapping (notification type -> target URL)
- [ ] Add "Mark all as read" functionality
- [ ] Add Supabase realtime subscription for live updates
- [ ] Handle empty and loading states
- [ ] Polish UI and responsiveness

## Review Notes

## Agent Log
