---
id: "024"
title: "Migrate key pages from client to server components for smaller bundles"
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

71 files under `src/app/` use `'use client'`, including pages that could fetch data server-side. Converting high-traffic pages to React Server Components reduces the client JS bundle, improves TTFB, and enables streaming.

### Scope

**1. Experience detail page (`/experience/[id]`)**
- Currently a full client component with React Query for data fetching
- Convert to a server component that fetches experience data via Supabase server client
- Extract interactive sections (booking widget, reviews, gallery lightbox) into small client components
- Pass server-fetched data as props to client islands

**2. Explore page (`/explore`)**
- Already has SSR for category pages — extend pattern to the main explore page
- Fetch initial experience list server-side
- Keep search/filter UI as client components
- Use `searchParams` for server-side filtering

**3. Collections page (`/collections`)**
- Fetch collection data server-side
- Keep interactive elements (save/unsave) as client components

**4. Homepage (`/`)**
- Audit which homepage sections need `'use client'`
- Move static sections (hero, features, testimonials) to server components
- Keep interactive elements (video player, carousel) as client islands

### Guidelines
- Use the "islands" pattern: server component page with `'use client'` only on interactive leaf components
- Use `@supabase/ssr` `createServerClient` for server-side data fetching
- Ensure metadata exports work (they require server components)
- Preserve existing functionality — no regressions

## Acceptance Criteria

- [ ] `/experience/[id]` page component is a server component
- [ ] `/explore` page fetches initial data server-side
- [ ] `/collections` page fetches data server-side
- [ ] Homepage static sections are server components
- [ ] Client JS bundle size reduced (measure with `next build` analyzer)
- [ ] All existing functionality preserved — no regressions
- [ ] Metadata exports work correctly on converted pages

## Context

- Experience page: `src/app/experience/[id]/page.tsx`, `src/app/experience/[id]/layout.tsx`
- Explore page: `src/app/explore/page.tsx`
- Collections: `src/app/collections/page.tsx`
- Homepage: `src/app/page.tsx`
- Supabase server utils: `src/lib/supabase/server.ts`
- Category SSR reference: `src/app/explore/category/[slug]/page.tsx`

## Checklist

- [ ] Step 1: Audit `/experience/[id]/page.tsx` — identify server vs client needs
- [ ] Step 2: Create server component wrapper, extract client islands
- [ ] Step 3: Audit `/explore/page.tsx` — identify what can be server-rendered
- [ ] Step 4: Convert explore page with server-side initial data fetch
- [ ] Step 5: Convert `/collections/page.tsx` to server component
- [ ] Step 6: Audit homepage sections for unnecessary `'use client'`
- [ ] Step 7: Convert static homepage sections to server components
- [ ] Step 8: Run `next build` and compare bundle sizes before/after
- [ ] Step 9: Manual smoke test all converted pages

## Review Notes

## Agent Log
