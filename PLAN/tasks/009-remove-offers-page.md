---
id: "009"
title: "Remove Offers Page"
status: in_progress
priority: medium
created: 2026-03-07
updated: 2026-03-08
assigned: codex
branch: task/009-remove-offers-page
pr: null
attempts: 0
depends_on: []
progress: 10
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

- [ ] `/offers` route returns 404
- [ ] No navigation links point to `/offers`
- [ ] Mock data removed if unused elsewhere
- [ ] No broken links in the app
- [ ] Build passes with no errors

## Context

- Offers page: `src/app/offers/page.tsx`
- Mock data: `src/lib/mock-data.ts`
- Navbar: `src/components/navbar.tsx`
- Chat layout: `src/app/chat/layout.tsx`

## Checklist

- [ ] Identify all references to `/offers` and mock data usage
- [ ] Remove `src/app/offers/page.tsx`
- [ ] Remove `src/lib/mock-data.ts` if no longer referenced
- [ ] Remove `/offers` navigation links from shared layouts/components
- [ ] Verify no `/offers` or `mock-data` references remain in `src/`
- [ ] Run build/lint checks and document any environment blockers

## Review Notes

## Agent Log
