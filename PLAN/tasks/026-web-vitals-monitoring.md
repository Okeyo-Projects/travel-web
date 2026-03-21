---
id: "026"
title: "Add Core Web Vitals monitoring and reporting to PostHog"
status: todo
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

The app tracks product analytics with PostHog but does not monitor Core Web Vitals (LCP, CLS, INP, FCP, TTFB). Without this data, performance regressions go undetected. Next.js has built-in Web Vitals reporting that can be piped to PostHog.

### Scope

**1. Web Vitals reporting**
- Use the `web-vitals` library (or Next.js built-in `useReportWebVitals` hook)
- Create a client component that reports LCP, CLS, INP, FCP, TTFB
- Send each metric to PostHog as a custom event: `web_vitals` with properties `{ metric_name, value, rating, path }`

**2. Integration**
- Add the reporting component to the root layout (inside PostHog provider)
- Ensure metrics are tagged with the current route for per-page analysis

**3. PostHog dashboard (document only)**
- Document how to create a PostHog insight filtering on `web_vitals` events
- Include recommended thresholds (LCP < 2.5s, CLS < 0.1, INP < 200ms)

## Acceptance Criteria

- [ ] LCP, CLS, INP, FCP, TTFB are captured on every page load
- [ ] Metrics are sent to PostHog with metric name, value, rating, and page path
- [ ] Reporting component is loaded in root layout
- [ ] No impact on page performance (component is lightweight, deferred)
- [ ] Analytics events visible in PostHog dashboard

## Context

- PostHog provider: `src/providers/posthog-provider.tsx`
- Analytics events: `src/lib/analytics/events.ts`
- Root layout: `src/app/layout.tsx`
- Next.js docs: `useReportWebVitals` from `next/web-vitals`

## Checklist

- [ ] Step 1: Check if `web-vitals` is already a dependency
- [ ] Step 2: Create `src/components/analytics/web-vitals-reporter.tsx` client component
- [ ] Step 3: Implement `useReportWebVitals` hook with PostHog capture
- [ ] Step 4: Add Web Vitals event constant to `src/lib/analytics/events.ts`
- [ ] Step 5: Mount reporter in root layout
- [ ] Step 6: Verify events appear in PostHog (local dev test)

## Review Notes

## Agent Log
