---
id: "009"
title: "Remove Offers Page"
status: review
priority: medium
created: 2026-03-07
updated: 2026-03-08
assigned: codex
branch: task/009-remove-offers-page
pr: null
attempts: 0
depends_on: []
progress: 100
---

## Description

Remove the `/offers` page entirely. It uses mock data and has non-functional features (newsletter signup). Remove the page, its route, and all navigation links pointing to it.

**Files to remove:**
- `src/app/offers/page.tsx`
- Any mock data used exclusively by the offers page (in `src/lib/mock-data.ts` if not used elsewhere)

**Links to update:**
- Remove "Offers" from navbar/header navigation
- Remove "Offers" from chat layout sidebar buttons (if present)
- Remove any footer links to offers
- Update any redirects pointing to offers

## Acceptance Criteria

- [x] `/offers` route returns 404
- [x] No navigation links point to `/offers`
- [x] Mock data removed if unused elsewhere
- [x] No broken links in the app
- [ ] Build passes with no errors

## Context

- Offers page: `src/app/offers/page.tsx`
- Mock data: `src/lib/mock-data.ts`
- Navbar: `src/components/navbar.tsx`
- Chat layout: `src/app/chat/layout.tsx`

## Checklist

- [x] Identify all references to `/offers` and mock data usage
- [x] Remove `src/app/offers/page.tsx`
- [x] Remove `src/lib/mock-data.ts` if no longer referenced
- [x] Remove `/offers` navigation links from shared layouts/components
- [x] Verify no `/offers` or `mock-data` references remain in `src/`
- [x] Run build/lint checks and document any environment blockers

## Review Notes
- `pnpm tsc --noEmit` failed: `Command "tsc" not found`.
- `pnpm lint` failed: `biome: command not found`.
- `pnpm build` failed: `next: command not found`.
- Environment blocker: `node_modules` is missing in this runtime. Please run `pnpm install` before validating build/lint/typecheck in CI or local dev.

## Agent Log
### 2026-03-08 (automation run)
- Resumed from `main`, created `task/009-remove-offers-page`, and moved this task to `in_progress`.
- Removed offers route file: `src/app/offers/page.tsx`.
- Removed mock data file used by offers: `src/lib/mock-data.ts`.
- Removed `/offers` navigation links from:
  - `src/components/navbar.tsx`
  - `src/app/chat/layout.tsx`
- Verified no remaining `/offers` or `mock-data` references in `src/` with ripgrep.
- Ran required validations and documented environment blockers in review notes.
- Moved task to `review` with `progress: 100`.
