---
id: "014"
title: "Host Experience Visibility Management"
status: todo
priority: high
created: 2026-03-07
updated: 2026-03-07
assigned: codex
branch: null
pr: null
attempts: 0
depends_on: ["012"]
progress: 0
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

- [ ] `/host/experiences` page lists all host's experiences
- [ ] Cards show thumbnail, title, type, status, rating, booking count
- [ ] Filter tabs with counts (All, Published, Drafts, In Review)
- [ ] Search by name works
- [ ] Publish/Unpublish toggle with confirmation
- [ ] Status badges color-coded
- [ ] View detail link opens experience page
- [ ] Only shows experiences owned by the current host
- [ ] Responsive grid layout

## Context

- Schema: `web/supabase/migrations/20251004002801_create_experience_tables.sql`
- Types: `web/src/types/experience.ts`
- Mobile reference: `/Users/naimabdelkerim/Code/travel/apps/mobile/app/(host)/experiences.tsx`

## Checklist

- [ ] Read experience schema (status field, host relationship)
- [ ] Read mobile host experiences screen for design reference
- [ ] Create `use-host-experiences.ts` hook (fetch host's experiences, toggle visibility)
- [ ] Build HostExperienceCard component
- [ ] Build filter tabs with counts
- [ ] Build search input
- [ ] Implement publish/unpublish mutation with confirmation
- [ ] Create `/host/experiences` page
- [ ] Handle loading and empty states
- [ ] Polish UI

## Review Notes

## Agent Log
