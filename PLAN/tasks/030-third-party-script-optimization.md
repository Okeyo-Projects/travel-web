---
id: "030"
title: "Optimize third-party script loading (Facebook Pixel, analytics)"
status: todo
priority: medium
created: 2026-03-21
updated: 2026-03-21
assigned: codex
pr: null
attempts: 0
depends_on: []
progress: 0
---

## Description

Third-party scripts (Facebook Pixel, PostHog) add overhead to page load. Optimizing their loading strategy ensures they don't block the critical rendering path or compete with essential resources.

### Scope

**1. Facebook Pixel**
- Verify it uses `next/script` with `strategy="lazyOnload"` (currently `afterInteractive`)
- Downgrade to `lazyOnload` since pixel tracking doesn't need to fire immediately
- This defers loading until after the page is fully interactive

**2. PostHog**
- Review PostHog initialization — ensure it doesn't block rendering
- Consider deferring PostHog init to after first paint using `requestIdleCallback`
- Verify the `/ingest` proxy rewrite is working efficiently

**3. Preconnect hints**
- Ensure `<link rel="preconnect">` exists for all third-party origins
- Verify: PostHog, Facebook, Supabase, Unsplash

## Acceptance Criteria

- [ ] Facebook Pixel uses `strategy="lazyOnload"`
- [ ] PostHog initialization doesn't block first paint
- [ ] All third-party origins have preconnect hints
- [ ] No regression in analytics data collection
- [ ] Measurable improvement in TTI (Time to Interactive)

## Context

- Facebook Pixel: search for `fbq` or `facebook` in `src/`
- PostHog provider: `src/providers/posthog-provider.tsx`
- Root layout: `src/app/layout.tsx`
- Next.js config rewrites: `next.config.ts`

## Checklist

- [ ] Step 1: Find Facebook Pixel implementation
- [ ] Step 2: Change Pixel to `strategy="lazyOnload"`
- [ ] Step 3: Review PostHog initialization timing
- [ ] Step 4: Add `requestIdleCallback` wrapper if PostHog blocks render
- [ ] Step 5: Audit all preconnect hints in layout.tsx
- [ ] Step 6: Verify analytics still captures events correctly

## Review Notes

## Agent Log
