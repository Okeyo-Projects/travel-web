---
id: "027"
title: "Add generateStaticParams + ISR for experience detail pages"
status: todo
priority: high
created: 2026-03-21
updated: 2026-03-21
assigned: codex
pr: null
attempts: 0
depends_on: ["024"]
progress: 0
---

## Description

Experience detail pages (`/experience/[id]`) are fully dynamic. Popular experiences could be pre-rendered at build time using `generateStaticParams` with ISR revalidation, matching the pattern already used for category pages (`revalidate = 1800`).

### Scope

**1. Implement `generateStaticParams`**
- Query Supabase for published/active experience IDs at build time
- Return the top N most popular experiences (by view count or booking count)
- Gracefully handle Supabase unavailability at build time (return empty array)

**2. Add ISR revalidation**
- Set `revalidate = 1800` (30 minutes) to match category pages
- Ensure on-demand revalidation works for experience updates

**3. Ensure compatibility**
- This depends on task 024 (server component migration) since `generateStaticParams` requires a server component page
- If task 024 is not done, this task should convert the experience page to server component as a prerequisite

## Acceptance Criteria

- [ ] `generateStaticParams` exports from `/experience/[id]/page.tsx`
- [ ] Top published experiences are pre-rendered at build time
- [ ] ISR revalidates every 30 minutes
- [ ] Build succeeds even if Supabase is unavailable
- [ ] Non-pre-rendered experience pages still work (dynamic fallback)

## Context

- Experience page: `src/app/experience/[id]/page.tsx`
- Category ISR reference: `src/app/explore/category/[slug]/page.tsx`
- Supabase server client: `src/lib/supabase/server.ts`
- Sitemap (similar query): `src/app/sitemap.ts`

## Checklist

- [ ] Step 1: Read category page ISR implementation as reference
- [ ] Step 2: Ensure experience page is a server component (or convert it)
- [ ] Step 3: Add `generateStaticParams` with Supabase query
- [ ] Step 4: Add `revalidate = 1800` export
- [ ] Step 5: Test build with and without Supabase connection
- [ ] Step 6: Verify dynamic fallback for non-pre-rendered pages

## Review Notes

## Agent Log
