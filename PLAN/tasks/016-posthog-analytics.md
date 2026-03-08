---
id: "016"
title: "Implement PostHog Analytics with Full Event Tracking"
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

Integrate PostHog analytics into the web app with comprehensive event tracking. Currently there is NO analytics on the web (confirmed by search -- no PostHog references exist).

**Setup:**
1. Install `posthog-js` package
2. Create PostHog provider component that initializes on app load
3. Add to root layout
4. Configure with environment variables (`NEXT_PUBLIC_POSTHOG_KEY`, `NEXT_PUBLIC_POSTHOG_HOST`)
5. Handle cookie consent (respect user preferences)

**User Identification:**
- Identify authenticated users with their user ID
- Set user properties: role (traveler/host), language, creation date
- Reset on logout

**Page View Tracking:**
- Automatic page view tracking via Next.js App Router integration
- Use `PostHogPageView` component that tracks on route changes

**Custom Events to Track:**

*Authentication:*
- `auth_modal_opened` (login/signup)
- `auth_login_success` / `auth_login_failed` (method: email/google/apple)
- `auth_signup_success`
- `auth_logout`

*Experience Discovery:*
- `experience_viewed` (experience_id, type, category)
- `experience_search` (query, filters applied, results count)
- `experience_card_clicked` (experience_id, source: explore/collection/search)
- `category_viewed` (category_slug)

*Booking Flow:*
- `booking_started` (experience_id)
- `booking_step_completed` (step: dates/guests/options/promo/review)
- `booking_submitted` (experience_id, total_price, guest_count)
- `booking_cancelled` (booking_id, reason)
- `payment_initiated` (booking_id, method)

*AI Chat:*
- `chat_started`
- `chat_message_sent` (message_length, has_tool_call)
- `chat_booking_created` (via AI flow)

*Social:*
- `experience_liked` / `experience_unliked`
- `comment_added`
- `experience_shared` (method: clipboard/native)

*Host (if applicable):*
- `host_mode_entered`
- `experience_published` / `experience_unpublished`
- `availability_updated`

**Feature Flags (optional but valuable):**
- Set up PostHog feature flags integration for future A/B testing
- Export `useFeatureFlag` hook

## Acceptance Criteria

- [ ] PostHog JS SDK installed and initialized
- [ ] PostHog provider in root layout
- [ ] Environment variables documented in `.env.example`
- [ ] Authenticated users identified with ID and properties
- [ ] Automatic page view tracking on route changes
- [ ] All listed custom events firing correctly
- [ ] Events include relevant properties
- [ ] User reset on logout
- [ ] No tracking in development mode (or configurable)
- [ ] Feature flag hook exported for future use
- [ ] Build passes with no errors

## Context

- Root layout: `src/app/layout.tsx`
- Auth provider: `src/providers/auth-provider.tsx`
- Explore page: `src/app/explore/page.tsx`
- Booking modal: `src/components/booking/booking-modal.tsx`
- Chat: `src/components/chat/BookingChat.tsx`
- Auth modal: `src/components/auth/auth-modal.tsx`
- No existing PostHog setup in the codebase

## Checklist

- [ ] Install `posthog-js` package
- [ ] Create PostHogProvider component
- [ ] Create PostHogPageView component for route tracking
- [ ] Add to root layout
- [ ] Add environment variables to `.env.example`
- [ ] Implement user identification on auth state change
- [ ] Add auth events (login, signup, logout)
- [ ] Add experience discovery events (view, search, card click)
- [ ] Add booking flow events (start, steps, submit, cancel)
- [ ] Add chat events (start, message, booking)
- [ ] Add social events (like, comment, share)
- [ ] Add host events (mode switch, publish, availability)
- [ ] Create `usePostHogEvent` utility hook for easy event firing
- [ ] Export `useFeatureFlag` hook
- [ ] Disable in development or make configurable
- [ ] Test events fire correctly
- [ ] Verify build passes

## Review Notes

## Agent Log
