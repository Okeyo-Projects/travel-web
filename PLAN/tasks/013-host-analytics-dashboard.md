---
id: "013"
title: "Host Analytics Dashboard"
status: review
priority: high
created: 2026-03-07
updated: 2026-03-09
assigned: codex
branch: task/013-host-analytics-dashboard
pr: null
attempts: 0
depends_on: ["012"]
progress: 100
---

## Description

Build the host analytics dashboard page (`/host` or `/host/dashboard`). This is the main landing page when a host switches to host mode. Display key business metrics and recent activity.

**Statistics Cards (top row):**
- Total bookings (all time)
- Revenue (total earnings)
- Total guests hosted
- Average rating

**Charts/Visualizations:**
- Bookings over time (line or bar chart, last 6 months)
- Revenue over time (line chart, last 6 months)
- Bookings by status breakdown (pie/donut chart)
- Bookings by experience (horizontal bar chart)

**Recent Activity:**
- Latest 5 bookings with status, guest name, experience, dates
- Quick action links (view booking, manage experience)

**Time Period Selector:**
- Last 7 days, 30 days, 3 months, 6 months, 1 year, All time

Use the existing `get_host_reports_stats` Supabase function for aggregated data.

Consider using a charting library like Recharts (already common in Next.js projects) or lightweight alternatives.

## Acceptance Criteria

- [x] Dashboard page accessible at `/host` for host users
- [x] Statistics cards showing bookings, revenue, guests, rating
- [x] At least 2 charts (bookings over time, bookings by status)
- [x] Time period selector changes data range
- [x] Recent bookings list with quick actions
- [x] Data fetched from Supabase (host's own data only)
- [x] Loading skeletons while data loads
- [x] Empty state for new hosts with no data
- [x] Responsive layout (cards stack on mobile)

## Context

- Schema: `web/supabase/migrations/20251219000000_create_get_host_reports_stats_function.sql`
- Schema: `web/supabase/migrations/20251220000000_update_host_stats_triggers.sql`
- Edge function: `web/supabase/functions/get-host-reports-stats/index.ts`
- Mobile reference: `/Users/naimabdelkerim/Code/travel/apps/mobile/app/(host)/index.tsx`
- Mobile reports: `/Users/naimabdelkerim/Code/travel/apps/mobile/app/(host)/reports.tsx`

## Checklist

- [x] Read host reports stats function and schema
- [x] Read mobile host dashboard for design reference
- [x] Confirm charting library availability (Recharts already installed)
- [x] Create typed host analytics models and `use-host-stats.ts` hook
- [x] Implement time period filtering and aggregate metric calculators
- [x] Build `TimePeriodSelector` component
- [x] Build `StatisticsCards` component
- [x] Build `BookingsChart` component (bookings + revenue trends)
- [x] Build `StatusBreakdownChart` component (status mix donut)
- [x] Build `ExperienceBreakdownChart` component (top experiences)
- [x] Build `RecentBookingsList` component with quick actions
- [x] Create `/host` dashboard page and compose all sections
- [x] Add loading skeletons, empty states, and error state
- [x] Polish responsive layout and spacing

## Review Notes

- The referenced `get_host_reports_stats` implementation in current migrations/functions points to moderation reports (`get_host_reports_and_stats`) and does not expose booking analytics fields.
- Dashboard analytics are therefore computed from host-owned `bookings` joined with `profiles`/`experiences`, scoped by authenticated host ownership (`hosts.owner_id = auth user` and `bookings.host_id = host.id`).
- Validation in this environment:
  - `pnpm exec biome check` on all new host dashboard files: pass.
  - `pnpm build`: fails on pre-existing unrelated type errors in `src/app/experience/[id]/page.tsx`.
  - Global `pnpm tsc --noEmit` / `pnpm lint`: fail with extensive pre-existing repo issues outside Task 013 scope.
  - Current automation run: `pnpm tsc --noEmit` and `pnpm lint` still fail on pre-existing repository-wide issues; targeted Biome check for Task 013 files passes; `pnpm build` is blocked by an existing `.next/lock` from another running build process in this environment.

## Agent Log

### 2026-03-09
- Started Task 013 on branch `task/013-host-analytics-dashboard`.
- Read schema/migrations and mobile host references.
- Confirmed there is no existing `/host` route on `main`; dashboard will be implemented as a new route.

### 2026-03-09 (implementation)
- Implemented host analytics dashboard at `/host` with:
  - Time-period selector (`7d`, `30d`, `3m`, `6m`, `1y`, `all`).
  - Metrics cards (bookings, revenue, guests hosted, average rating).
  - Charts for bookings/revenue trend, status breakdown, and top experiences.
  - Recent bookings list with quick links to booking and experience pages.
  - Loading skeletons, host/non-host empty states, and error alert.
- Added new host analytics domain types and query/aggregation hook:
  - `src/types/host-analytics.ts`
  - `src/hooks/use-host-stats.ts`
- Added reusable host dashboard components under `src/components/host/`.

### 2026-03-09 (automation sync)
- Re-applied Task 013 commit chain onto top of Task 012 branch so host-mode dependency state is present.
- Resolved merge conflicts:
  - `src/app/host/page.tsx`: kept Task 013 analytics implementation and aligned it with existing `src/app/host/layout.tsx` wrapper from Task 012.
  - `PLAN/pending-push.sh`: preserved existing queued tasks and appended Task 013 push/PR commands.
- Ran validations:
  - `pnpm exec biome check src/app/host/page.tsx src/hooks/use-host-stats.ts src/components/host/*.tsx src/types/host-analytics.ts` passed.
  - `pnpm tsc --noEmit` and `pnpm lint` failed due pre-existing repository issues not introduced by Task 013.
  - `pnpm build` blocked by `.next/lock` held by another running build process in this environment.
