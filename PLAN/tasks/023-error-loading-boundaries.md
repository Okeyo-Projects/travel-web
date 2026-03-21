---
id: "023"
title: "Add error.tsx and loading.tsx boundaries to all key routes"
status: done
priority: high
created: 2026-03-21
updated: 2026-03-21
assigned: codex
pr: null
attempts: 0
depends_on: []
progress: 0
---

## Description

The app has no `error.tsx` or `loading.tsx` files in any route segment. If a page crashes or takes time to load server-side, users see a blank screen or the default Next.js error page. Adding proper error boundaries and loading skeletons across key routes improves UX and resilience.

### Scope

**1. Error boundaries (`error.tsx`)**
- Add `error.tsx` to every major route group:
  - `src/app/error.tsx` (root fallback)
  - `src/app/explore/error.tsx`
  - `src/app/experience/[id]/error.tsx`
  - `src/app/bookings/error.tsx`
  - `src/app/profile/error.tsx`
  - `src/app/host/error.tsx`
  - `src/app/chat/error.tsx`
  - `src/app/collections/error.tsx`
- Each error boundary should:
  - Be a client component (`'use client'`)
  - Display a user-friendly error message (in French where applicable)
  - Include a "Try again" button that calls `reset()`
  - Optionally report the error to PostHog via `posthog.capture('$exception', ...)`

**2. Loading states (`loading.tsx`)**
- Add `loading.tsx` with skeleton UI to:
  - `src/app/explore/loading.tsx` — grid of skeleton cards
  - `src/app/experience/[id]/loading.tsx` — hero image placeholder + text skeletons
  - `src/app/bookings/loading.tsx` — list skeleton
  - `src/app/profile/loading.tsx` — profile card skeleton
  - `src/app/host/loading.tsx` — dashboard skeleton
  - `src/app/collections/loading.tsx` — grid skeleton
- Use existing Tailwind `animate-pulse` for skeleton animations
- Match the layout structure of each page so there's no CLS when content loads

**3. Global not-found**
- Add `src/app/not-found.tsx` if missing — custom 404 page with navigation back to home

## Acceptance Criteria

- [ ] Root `error.tsx` catches unhandled errors across the app
- [ ] Each key route has its own `error.tsx` with reset functionality
- [ ] Each key route has a `loading.tsx` with skeleton matching page layout
- [ ] `not-found.tsx` exists at the root with a branded 404 page
- [ ] Error boundaries report exceptions to PostHog
- [ ] No layout shift when loading state transitions to real content
- [ ] All loading/error components are visually consistent with the app's design system

## Context

- Root layout: `src/app/layout.tsx`
- UI components: `src/components/ui/` (Skeleton component may already exist)
- PostHog provider: `src/providers/posthog-provider.tsx`
- Design: dark theme with amber/orange accent colors

## Checklist

- [x] Step 1: Check if Skeleton UI component exists in `src/components/ui/`
- [x] Step 2: Create root `error.tsx` with PostHog error reporting
- [x] Step 3: `not-found.tsx` already exists with redirect to preorder — no change needed
- [x] Step 4: Create `loading.tsx` for `/explore` with card grid skeleton
- [x] Step 5: Create `error.tsx` for `/explore`
- [x] Step 6: Create `loading.tsx` for `/experience/[id]` with hero + details skeleton
- [x] Step 7: Create `error.tsx` for `/experience/[id]`
- [x] Step 8: Create loading + error for `/bookings`
- [x] Step 9: Create loading + error for `/profile`
- [x] Step 10: Create loading + error for `/host`
- [x] Step 11: Create loading + error for `/chat`
- [x] Step 12: Create loading + error for `/collections`
- [x] Step 13: Skeletons match page layout structure — no CLS risk

## Review Notes

## Agent Log
