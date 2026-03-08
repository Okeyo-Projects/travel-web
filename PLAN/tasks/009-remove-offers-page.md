---
id: "009"
title: "Remove Offers Page"
status: todo
priority: medium
created: 2026-03-07
updated: 2026-03-07
assigned: codex
branch: null
pr: null
attempts: 0
depends_on: []
progress: 0
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

- [ ] Identify all references to offers page
- [ ] Remove offers page file
- [ ] Remove or clean up mock data
- [ ] Remove navigation links
- [ ] Verify no broken links remain
- [ ] Verify build passes

## Review Notes

## Agent Log
