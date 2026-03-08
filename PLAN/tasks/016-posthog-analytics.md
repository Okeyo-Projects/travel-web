---
id: "016"
title: "Implement PostHog Analytics with Full Event Tracking"
status: review
priority: high
created: 2026-03-07
updated: 2026-03-08
assigned: codex
branch: task/016-posthog-analytics
pr: null
attempts: 0
depends_on: []
progress: 100
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

- [x] PostHog JS SDK initialization implemented (dynamic loader fallback due offline env)
- [x] PostHog provider in root layout
- [x] Environment variables documented in `.env.example`
- [x] Authenticated users identified with ID and properties
- [x] Automatic page view tracking on route changes
- [x] All listed custom events wired in corresponding current web flows
- [x] Events include relevant properties
- [x] User reset on logout
- [x] No tracking in development mode (or configurable)
- [x] Feature flag hook exported for future use
- [ ] Build passes with no errors (blocked: missing `node_modules` in environment)

## Context

- Root layout: `src/app/layout.tsx`
- Auth provider: `src/providers/auth-provider.tsx`
- Explore page: `src/app/explore/page.tsx`
- Booking modal: `src/components/booking/booking-modal.tsx`
- Chat: `src/components/chat/BookingChat.tsx`
- Auth modal: `src/components/auth/auth-modal.tsx`
- No existing PostHog setup in the codebase

## Checklist

- [x] Add PostHog dependency and environment variable entries (dependency install blocked: npm network unavailable in this environment)
- [x] Create analytics constants and typed event/property definitions
- [x] Implement `PostHogProvider` initialization with env + dev guard + consent gate
- [x] Implement route-change page view tracking component
- [x] Wire provider/page-view into app root layout
- [x] Add auth user identify/reset wiring in auth provider
- [x] Add reusable analytics hooks (`usePostHogEvent`, `useFeatureFlag`)
- [x] Add auth event tracking (modal open, login, signup, logout, failures)
- [x] Add experience discovery tracking (view, search, card click, category)
- [x] Add booking flow tracking (start, step completed, submit, cancel, payment)
- [x] Add AI chat tracking (start, message sent, booking created)
- [x] Add social tracking (like/unlike, comment, share)
- [x] Add host tracking hooks (mode entered, publish/unpublish, availability updated)
- [x] Run typecheck/lint/build validations and capture any environment blockers

## Review Notes
- `pnpm add posthog-js` failed due offline environment (`getaddrinfo ENOTFOUND registry.npmjs.org`), so a safe dynamic PostHog loader fallback was implemented in `src/lib/analytics/posthog.ts`.
- Validation commands are blocked by missing dependencies in this environment:
  - `pnpm tsc --noEmit` -> `Command "tsc" not found`
  - `pnpm lint` -> `biome: command not found`
  - `pnpm build` -> `next: command not found`
  - Root cause: `node_modules` is missing.
- Host-related analytics events are wired through exported helper functions for use in upcoming host tasks (`012`, `014`, `015`) where those web interactions will exist.

## Agent Log
- 2026-03-08: Started task on `task/016-posthog-analytics`, added typed analytics layer + PostHog provider/pageview integration, wired auth identify/reset and custom events across auth/explore/experience/booking/chat/social flows, added feature-flag and host-event hooks, documented env vars in `.env.example`, then moved task to `review` with install/validation blockers logged for manual follow-up.
