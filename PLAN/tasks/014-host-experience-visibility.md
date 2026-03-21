---
id: "014"
title: "Host Experience Visibility Management"
status: review
priority: high
created: 2026-03-07
updated: 2026-03-09
assigned: codex
branch: task/014-host-experience-visibility
pr: null
attempts: 0
depends_on: ["012"]
progress: 100
---

## Description

Build a page for hosts to manage their experiences' visibility (`/host/experiences`). Hosts should be able to see all their experiences and toggle publish/unpublish status. This is NOT full experience CRUD -- hosts create/edit experiences on mobile only. The web only manages visibility.

**Experience List:**
- Grid or list of all host's experiences
- Each card shows: thumbnail, title, type (trip/lodging/activity), status badge (published/draft/in_review), rating, booking count
- Filter tabs: All, Published, Drafts, In Review (with counts)
- Search by experience name

**Actions per experience:**
- Toggle Publish/Unpublish (changes `status` field)
- Confirmation dialog before unpublishing (warns about active bookings)
- View experience detail link (opens experience page in new tab)

**Status badges:**
- Published (green)
- Draft (gray)
- In Review (yellow)
- Archived (red)

## Acceptance Criteria

- [x] `/host/experiences` page lists all host's experiences
- [x] Cards show thumbnail, title, type, status, rating, booking count
- [x] Filter tabs with counts (All, Published, Drafts, In Review)
- [x] Search by name works
- [x] Publish/Unpublish toggle with confirmation
- [x] Status badges color-coded
- [x] View detail link opens experience page
- [x] Only shows experiences owned by the current host
- [x] Responsive grid layout

## Context

- Schema: `web/supabase/migrations/20251004002801_create_experience_tables.sql`
- Types: `web/src/types/experience.ts`
- Mobile reference: `/Users/naimabdelkerim/Code/travel/apps/mobile/app/(host)/experiences.tsx`

## Checklist

- [x] Read experience schema (status field, host relationship)
- [x] Read mobile host experiences screen for design reference
- [x] Create `use-host-experiences.ts` hook (fetch host's experiences, toggle visibility)
- [x] Build HostExperienceCard component
- [x] Build filter tabs with counts
- [x] Build search input
- [x] Implement publish/unpublish mutation with confirmation
- [x] Create `/host/experiences` page
- [x] Handle loading and empty states
- [x] Polish UI

## Review Notes
- `experience_status` does not include an `archived` enum value in schema (`draft|review|published|paused|rejected`), so card badges map `paused` and `rejected` to an "Archived" red badge for UI parity with requirements.
- Unpublish action sets listing `status` to `draft` and clears `published_at`; active bookings are preserved and called out in confirmation copy.
- Validation:
  - `pnpm exec biome check src/app/host/experiences/page.tsx src/hooks/use-host-experiences.ts src/components/host/HostExperienceCard.tsx src/types/host-experiences.ts` passed.
  - `pnpm tsc --noEmit` fails on unrelated pre-existing repository errors (e.g. stale `.next/dev/types/validator.ts` offers route reference and multiple non-Task-014 TS issues).
  - `pnpm lint` fails on unrelated pre-existing repository lint/format issues outside Task 014.

## Agent Log
- 2026-03-09: Implemented host experience visibility management on `/host/experiences` with host-scoped data query (`hosts.owner_id -> hosts.id -> experiences.host_id`), status filters with counts, search, responsive card grid, status badges, open-in-new-tab detail links, and publish/unpublish mutation with confirmation warning for active bookings.
