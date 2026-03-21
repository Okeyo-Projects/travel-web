---
id: "029"
title: "Add Suspense boundaries and lazy loading for heavy components"
status: done
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

Heavy client-side libraries (Recharts, Embla Carousel, Framer Motion animations) are bundled eagerly even when not visible. Using `React.lazy` + `Suspense` or `next/dynamic` defers loading until needed, reducing initial JS bundle size.

### Scope

**1. Host analytics charts (Recharts)**
- Recharts is ~200KB gzipped — lazy load the entire chart section
- Use `next/dynamic` with `ssr: false` for chart components
- Show skeleton placeholder while loading

**2. Carousel components (Embla)**
- Lazy load carousel sections that are below the fold
- Keep above-fold carousels eager

**3. Chat/AI components**
- The chat interface and AI agent page can be lazily loaded
- Use `next/dynamic` for the chat message list and input

**4. Video player**
- Lazy load the custom video player component
- Use Intersection Observer to load only when near viewport

## Acceptance Criteria

- [ ] Recharts components are dynamically imported with `ssr: false`
- [ ] Below-fold carousels are lazy loaded
- [ ] Chat components are dynamically imported
- [ ] Video player loads lazily
- [ ] Each lazy component has an appropriate Suspense fallback
- [ ] Initial page JS bundle size reduced (measure with `next build`)
- [ ] No visible UX regression — components load before user scrolls to them

## Context

- Host analytics: `src/app/host/analytics/` or `src/components/analytics/`
- Carousel: `src/components/ui/carousel.tsx` or usage in homepage
- Chat: `src/app/chat/`, `src/components/chat/`
- Video player: `src/components/ui/video-player.tsx`
- Next.js dynamic: `import dynamic from 'next/dynamic'`

## Checklist

- [ ] Step 1: Identify all Recharts usage and wrap with `next/dynamic`
- [ ] Step 2: Identify below-fold carousel usage and lazy load
- [ ] Step 3: Lazy load chat components
- [ ] Step 4: Lazy load video player with Intersection Observer
- [ ] Step 5: Add Suspense fallbacks (skeletons) for each lazy component
- [ ] Step 6: Compare bundle size before/after with `next build`

## Review Notes

## Agent Log
