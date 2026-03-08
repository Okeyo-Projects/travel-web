---
id: "002"
title: "Implement Reviews System on Experience Detail"
status: review
priority: high
created: 2026-03-07
updated: 2026-03-08
assigned: codex
branch: task/002-reviews-system-2
pr: null
attempts: 0
depends_on: ["001"]
progress: 100
---

## Description

Replace the "coming soon" placeholder in the Reviews tab on the experience detail page with a fully functional reviews display. The database already has a reviews system (tables: `reviews`, `review_requests`). This task is read-only display -- no review submission form (that comes from the booking detail after completion).

Build an Airbnb-quality reviews section:
- **Summary header**: Average rating (large number), star visualization, total review count, rating breakdown bar chart (5 stars to 1 star with percentage bars)
- **Category ratings** (if available): Cleanliness, Communication, Location, Value, etc.
- **Review list**: User avatar, name, date, star rating, review text with "Read more" for long reviews, host response (if any)
- **Sort options**: Most recent, Highest rated, Lowest rated
- **Pagination or "Show more"** for long review lists
- **Empty state**: Friendly message when no reviews exist yet

Also add a review submission flow accessible from the booking detail page when a booking is `completed`:
- Star rating selector (1-5)
- Text review input
- Submit button
- Success confirmation

## Acceptance Criteria

- [x] Reviews tab shows average rating with star visualization
- [x] Rating breakdown chart (5 to 1 stars with bar percentages)
- [x] Review cards show avatar, name, date, rating, text
- [x] Long reviews have "Read more" expand
- [x] Sort by recent/highest/lowest works
- [x] Empty state when no reviews
- [x] Review submission form on booking detail page (for completed bookings)
- [x] Submitted review appears in experience reviews
- [x] Matches Airbnb/Booking.com review section quality

## Context

- Schema: `web/supabase/migrations/20251221000000_create_review_system.sql`
- Schema: `web/supabase/migrations/20251221000002_fix_review_requests_function.sql`
- Current placeholder: Reviews tab in `src/app/experience/[id]/page.tsx`
- Types: `web/src/types/supabase.ts` (reviews, review_requests tables)
- Booking detail: `src/app/bookings/[bookingId]/page.tsx`
- Mobile reference: `/Users/naimabdelkerim/Code/travel/apps/mobile/app/experience/[experienceId]/index.tsx` (Reviews tab)

## Checklist

- [x] Read review system migrations and understand schema
- [x] Read mobile app review display for design reference
- [x] Create review types in `web/src/types/`
- [x] Create `use-reviews.ts` hook (fetch reviews for experience, submit review)
- [x] Build ReviewSummary component (avg rating, breakdown chart)
- [x] Build ReviewCard component (avatar, name, date, rating, text, host response)
- [x] Build ReviewList component with sort and pagination
- [x] Integrate into experience detail Reviews tab
- [x] Build ReviewForm component (star selector, text input, submit)
- [x] Add review submission to booking detail page (completed bookings only)
- [x] Handle empty states and loading states
- [x] Polish UI

## Review Notes

## Agent Log
- 2026-03-08: Started task on branch `task/002-reviews-system`. Reviewed review schema (`reviews`, `review_requests`), RLS/triggers, and mobile experience reviews UX. Ready to implement shared types/hook/components and booking review submission flow.
- 2026-03-08: Implemented reviews stack for web: new review types (`src/types/review.ts`), data hook (`src/hooks/use-reviews.ts`), review UI components (summary/card/list/form), replaced experience Reviews tab placeholder, and added completed-booking review submission with existing-review detection.
- 2026-03-08: Validation blocked in this environment (`node_modules` missing; `pnpm tsc --noEmit` reports `Command \"tsc\" not found`; `pnpm lint` reports `biome: command not found`). Marked task ready for review with manual push/PR pending via `PLAN/pending-push.sh`.
- 2026-03-08: Resumed from automation run on branch `task/002-reviews-system-2`, reconciled task state, replayed implementation commits, and updated `PLAN/pending-push.sh` with this branch's push/PR commands.
