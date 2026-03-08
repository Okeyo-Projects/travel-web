---
id: "002"
title: "Implement Reviews System on Experience Detail"
status: todo
priority: high
created: 2026-03-07
updated: 2026-03-07
assigned: codex
branch: null
pr: null
attempts: 0
depends_on: ["001"]
progress: 0
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

- [ ] Reviews tab shows average rating with star visualization
- [ ] Rating breakdown chart (5 to 1 stars with bar percentages)
- [ ] Review cards show avatar, name, date, rating, text
- [ ] Long reviews have "Read more" expand
- [ ] Sort by recent/highest/lowest works
- [ ] Empty state when no reviews
- [ ] Review submission form on booking detail page (for completed bookings)
- [ ] Submitted review appears in experience reviews
- [ ] Matches Airbnb/Booking.com review section quality

## Context

- Schema: `web/supabase/migrations/20251221000000_create_review_system.sql`
- Schema: `web/supabase/migrations/20251221000002_fix_review_requests_function.sql`
- Current placeholder: Reviews tab in `src/app/experience/[id]/page.tsx`
- Types: `web/src/types/supabase.ts` (reviews, review_requests tables)
- Booking detail: `src/app/bookings/[bookingId]/page.tsx`
- Mobile reference: `/Users/naimabdelkerim/Code/travel/apps/mobile/app/experience/[experienceId]/index.tsx` (Reviews tab)

## Checklist

- [ ] Read review system migrations and understand schema
- [ ] Read mobile app review display for design reference
- [ ] Create review types in `web/src/types/`
- [ ] Create `use-reviews.ts` hook (fetch reviews for experience, submit review)
- [ ] Build ReviewSummary component (avg rating, breakdown chart)
- [ ] Build ReviewCard component (avatar, name, date, rating, text, host response)
- [ ] Build ReviewList component with sort and pagination
- [ ] Integrate into experience detail Reviews tab
- [ ] Build ReviewForm component (star selector, text input, submit)
- [ ] Add review submission to booking detail page (completed bookings only)
- [ ] Handle empty states and loading states
- [ ] Polish UI

## Review Notes

## Agent Log
