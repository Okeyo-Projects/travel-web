---
id: "011"
title: "Complete Booking Cancellation Flow"
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

The booking detail page has a "Cancel booking" button but the flow may be incomplete. Ensure the full cancellation flow works correctly:

**Cancellation Flow:**
1. User clicks "Cancel booking" button (visible for `pending_host`, `approved`, `pending_payment` statuses)
2. Confirmation dialog appears with:
   - Warning message explaining the action is irreversible
   - Cancellation policy summary (if applicable)
   - Optional reason selector (Changed plans, Found alternative, Price too high, Personal reasons, Other)
   - Optional text field for additional details
   - "Keep booking" and "Cancel booking" buttons
3. On confirm:
   - Update booking status to `cancelled` in database
   - Show success toast
   - Redirect to bookings list
4. Error handling for failed cancellation

**Also display:**
- Cancellation policy on the booking detail page (before user cancels)
- Refund information if applicable (based on cancellation timing)

## Acceptance Criteria

- [ ] Cancel button visible only for cancellable statuses
- [ ] Confirmation dialog with warning and reason selector
- [ ] Cancellation updates booking status in database
- [ ] Success toast and redirect to bookings list
- [ ] Error handling for failed cancellation
- [ ] Cancellation policy displayed on booking detail
- [ ] Cancelled booking shows cancelled status correctly

## Context

- Booking detail: `src/app/bookings/[bookingId]/page.tsx`
- Booking mutations: `src/hooks/use-booking-mutations.ts`
- Schema: `web/supabase/migrations/20251004002810_create_booking_tables.sql`
- Schema: `web/supabase/migrations/20251101030000_create_booking_business_logic.sql`
- Mobile reference: `/Users/naimabdelkerim/Code/travel/apps/mobile/app/user/bookings/[bookingId].tsx`

## Checklist

- [ ] Read booking detail page and mutations hook
- [ ] Read booking schema for cancellation logic and triggers
- [ ] Read mobile booking detail for cancellation UX reference
- [ ] Build CancellationDialog component
- [ ] Add reason selector and optional details
- [ ] Implement cancellation mutation
- [ ] Add success/error handling
- [ ] Display cancellation policy on booking detail
- [ ] Verify cancelled booking renders correctly
- [ ] Polish UI

## Review Notes

## Agent Log
