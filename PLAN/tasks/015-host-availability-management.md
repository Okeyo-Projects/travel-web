---
id: "015"
title: "Host Full Availability Management"
status: todo
priority: urgent
created: 2026-03-07
updated: 2026-03-07
assigned: codex
branch: null
pr: null
attempts: 0
depends_on: ["012", "014"]
progress: 0
---

## Description

Build the most complete availability management system for hosts (`/host/experiences/[id]/availability`). This is the core feature for hosts on web -- they need full control over when their experiences are bookable.

The system uses **lazy availability calculation**: availability is computed on-demand from bookings + room capacity, NOT from pre-created availability records. The key functions are `check_lodging_availability`, `get_booked_rooms_count`, and `get_lodging_blocked_dates`.

**Experience Selector:**
- Dropdown or sidebar to select which experience to manage
- Shows experience name, type, and current status

**For Lodging Experiences:**

1. **Room Types Overview Panel:**
   - List all room types for the experience
   - Each shows: name, type, total rooms count, capacity (beds, max persons), price per night
   - Edit total rooms count (updates `lodging_room_types.total_rooms`)

2. **Availability Calendar (month view):**
   - Full month calendar grid
   - For each date, show availability status per room type:
     - Green: all rooms available
     - Yellow: partially booked (X of Y rooms available)
     - Red: fully booked (0 available)
     - Gray: past dates
   - Click a date to see breakdown: which room types have how many rooms available vs booked
   - Hover tooltip showing: "3/5 Double rooms available, 1/2 Suites available"
   - Month navigation (prev/next)

3. **Date Range Actions:**
   - Select date range on calendar
   - "Block dates" action: Mark dates as unavailable (creates a system booking or sets a blocked flag)
   - "Unblock dates" action: Remove manual blocks
   - Useful for maintenance, personal use, seasonal closures

4. **Bookings Overlay:**
   - Toggle to show existing bookings on the calendar
   - Each booking shown as a colored bar spanning its date range
   - Click booking to see guest name, room type, guest count, status

**For Trip Experiences:**

1. **Departures List:**
   - All departures with date, seats total, seats available, seats booked
   - Add new departure (date picker + seats count)
   - Edit existing departure (change seats count)
   - Cancel departure (with booking check)

2. **Departures Calendar:**
   - Calendar showing departure dates with availability indicator
   - Click to manage specific departure

**For Activity Experiences:**

1. **Sessions List:**
   - All sessions with date/time, capacity total, capacity available
   - Add new session (date/time picker + capacity)
   - Edit session capacity
   - Cancel session (with booking check)

2. **Sessions Calendar:**
   - Calendar showing session dates with capacity indicators

**Common Features:**
- Real-time data refresh
- Confirmation dialogs for destructive actions
- Undo capability for recent actions
- Export availability data (nice to have)

## Acceptance Criteria

- [ ] Experience selector to choose which experience to manage
- [ ] Lodging: Room types panel showing all room types with capacity and pricing
- [ ] Lodging: Edit total rooms count per room type
- [ ] Lodging: Calendar showing per-date availability (green/yellow/red)
- [ ] Lodging: Click date shows room-by-room breakdown
- [ ] Lodging: Date range selection for blocking/unblocking
- [ ] Lodging: Bookings overlay showing existing reservations
- [ ] Trips: Departures list with add/edit/cancel
- [ ] Trips: Calendar with departure indicators
- [ ] Activities: Sessions list with add/edit/cancel
- [ ] Activities: Calendar with session indicators
- [ ] All changes persist to database correctly
- [ ] Confirmation dialogs for destructive actions
- [ ] Responsive layout
- [ ] Data reflects lazy availability calculation (computed from bookings)

## Context

- Schema (availability): `web/supabase/migrations/20251004041000_create_availability_tables.sql`
- Schema (availability management): `web/supabase/migrations/20251101020000_create_availability_management.sql`
- Schema (lazy refactor): `web/supabase/migrations/20251209160000_refactor_to_lazy_availability.sql`
- Schema (blocked dates): `web/supabase/migrations/20251209110000_add_get_blocked_dates_function.sql`
- Schema (room types): `web/supabase/migrations/20251004002801_create_experience_tables.sql`
- Schema (room items): `web/supabase/migrations/20251101001500_create_room_items.sql`
- Schema (booking items): `web/supabase/migrations/20260208120000_create_booking_items.sql`
- Mobile availability hooks: `/Users/naimabdelkerim/Code/travel/apps/mobile/hooks/use-availability.ts`
- Mobile availability calendar: `/Users/naimabdelkerim/Code/travel/apps/mobile/components/ui/availability-calendar.tsx`

Key DB functions:
- `check_lodging_availability(experience_id, from_date, to_date, rooms)` -> available, conflicts
- `get_booked_rooms_count(room_type_id, check_date)` -> count
- `get_lodging_blocked_dates(experience_id, from_date, to_date, rooms)` -> blocked dates
- `check_trip_availability(departure_id, party_size)` -> available, seats
- `check_activity_availability(session_id, party_size)` -> available, capacity

## Checklist

- [ ] Read ALL availability-related migrations thoroughly
- [ ] Read mobile availability hooks and calendar component
- [ ] Read room types and room items schemas
- [ ] Create `use-host-availability.ts` hook (fetch availability, block/unblock, manage departures/sessions)
- [ ] Build ExperienceSelector component
- [ ] Build RoomTypesPanel component (list, edit room count)
- [ ] Build AvailabilityCalendar component (month grid with color coding)
- [ ] Build DateBreakdownPanel component (per-room availability for selected date)
- [ ] Build DateRangeBlocker component (block/unblock date ranges)
- [ ] Build BookingsOverlay component (booking bars on calendar)
- [ ] Build DeparturesList component (trips)
- [ ] Build SessionsList component (activities)
- [ ] Create `/host/experiences/[id]/availability` page
- [ ] Implement data mutations (edit rooms, block dates, add departures/sessions)
- [ ] Add confirmation dialogs
- [ ] Handle loading and empty states
- [ ] Ensure responsiveness
- [ ] Thoroughly test with different experience types

## Review Notes

## Agent Log
