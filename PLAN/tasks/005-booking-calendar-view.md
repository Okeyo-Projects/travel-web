---
id: "005"
title: "Calendar View for User Bookings"
status: todo
priority: medium
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

Add a calendar view toggle to the bookings page (`/bookings`). Currently, bookings are displayed as a list with status filtering. Add an alternative calendar (month) view that shows bookings as colored dots on dates, with an agenda panel below showing the day's bookings.

**Calendar View:**
- Month grid with navigation (prev/next month buttons, month/year header)
- Booking dots on dates, color-coded by status:
  - Yellow: pending_host
  - Blue: approved / pending_payment
  - Green: confirmed
  - Gray: completed
  - Red: cancelled / declined
- Multi-day bookings show dots on all days in the range
- Click a day to see that day's bookings in an agenda panel below
- Color legend explaining dot meanings

**Agenda Panel (below calendar):**
- Shows bookings for the selected day
- Each booking card: experience thumbnail, title, date range, status badge, guest count
- Check-in/check-out/intermediate day indicator (like mobile: "Day 3 of 5")
- Click to navigate to booking detail

**View Toggle:** List/Calendar toggle buttons at top of page (keeping existing list view intact)

Reference the mobile bookings calendar at `/Users/naimabdelkerim/Code/travel/apps/mobile/app/(user)/bookings.tsx`.

## Acceptance Criteria

- [ ] Toggle between List and Calendar views
- [ ] Calendar shows month grid with prev/next navigation
- [ ] Booking dots appear on correct dates, color-coded by status
- [ ] Multi-day bookings show dots on all days
- [ ] Color legend displayed
- [ ] Clicking a day shows that day's bookings in agenda panel
- [ ] Agenda booking cards show experience info, dates, status, guests
- [ ] Day indicator (check-in, intermediate, check-out)
- [ ] Click booking card navigates to booking detail
- [ ] Calendar is responsive on mobile
- [ ] Existing list view remains unchanged

## Context

- Current bookings page: `src/app/bookings/page.tsx`
- Booking types: `web/src/types/booking.ts`
- Schema: `web/supabase/migrations/20251004002810_create_booking_tables.sql`
- Mobile reference: `/Users/naimabdelkerim/Code/travel/apps/mobile/app/(user)/bookings.tsx`

## Checklist

- [ ] Read current bookings page implementation
- [ ] Read mobile calendar view for design reference
- [ ] Read booking schema for date and status fields
- [ ] Add view toggle (List/Calendar) to bookings page
- [ ] Build CalendarGrid component (month view with navigation)
- [ ] Build BookingDot component (color-coded by status)
- [ ] Map bookings to calendar dates (expand date ranges to individual dots)
- [ ] Build ColorLegend component
- [ ] Build AgendaPanel component (day's bookings list)
- [ ] Build AgendaBookingCard component (thumbnail, title, dates, status)
- [ ] Add day indicator logic (check-in/intermediate/check-out)
- [ ] Handle empty days and months with no bookings
- [ ] Ensure responsiveness
- [ ] Polish UI

## Review Notes

## Agent Log
