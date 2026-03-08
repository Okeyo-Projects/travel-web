---
id: "013"
title: "Host Analytics Dashboard"
status: todo
priority: high
created: 2026-03-07
updated: 2026-03-07
assigned: codex
branch: null
pr: null
attempts: 0
depends_on: ["012"]
progress: 0
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

- [ ] Dashboard page accessible at `/host` for host users
- [ ] Statistics cards showing bookings, revenue, guests, rating
- [ ] At least 2 charts (bookings over time, bookings by status)
- [ ] Time period selector changes data range
- [ ] Recent bookings list with quick actions
- [ ] Data fetched from Supabase (host's own data only)
- [ ] Loading skeletons while data loads
- [ ] Empty state for new hosts with no data
- [ ] Responsive layout (cards stack on mobile)

## Context

- Schema: `web/supabase/migrations/20251219000000_create_get_host_reports_stats_function.sql`
- Schema: `web/supabase/migrations/20251220000000_update_host_stats_triggers.sql`
- Edge function: `web/supabase/functions/get-host-reports-stats/index.ts`
- Mobile reference: `/Users/naimabdelkerim/Code/travel/apps/mobile/app/(host)/index.tsx`
- Mobile reports: `/Users/naimabdelkerim/Code/travel/apps/mobile/app/(host)/reports.tsx`

## Checklist

- [ ] Read host reports stats function and schema
- [ ] Read mobile host dashboard for design reference
- [ ] Install charting library (Recharts or similar)
- [ ] Create `use-host-stats.ts` hook
- [ ] Build StatisticsCards component
- [ ] Build BookingsChart component (over time)
- [ ] Build StatusBreakdownChart component
- [ ] Build RecentBookingsList component
- [ ] Build TimePeriodSelector component
- [ ] Create `/host` dashboard page
- [ ] Handle loading, empty, and error states
- [ ] Polish UI and responsiveness

## Review Notes

## Agent Log
