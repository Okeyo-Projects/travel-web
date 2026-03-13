---
id: "007"
title: "Support/Help Page with FAQ and Report Issue"
status: in_progress
priority: low
created: 2026-03-07
updated: 2026-03-13
assigned: codex
branch: task/007-support-help-page
pr: null
attempts: 0
depends_on: []
progress: 22
---

## Description

Create a support/help page (`/support`) with FAQ section and a "Report an Issue" form. The database already has a `support_tickets` table.

**FAQ Section:**
- Accordion-style FAQ items grouped by category
- Categories: General, Booking, Payments, Account, Host
- Common questions with markdown-formatted answers
- Search/filter functionality to find questions

**Report Issue Form:**
- Subject input
- Category selector (Bug, Feature Request, Payment Issue, Account Issue, Other)
- Description textarea
- Optional email (pre-filled if logged in)
- Submit creates a row in `support_tickets` table
- Success confirmation with ticket reference

**Page layout:**
- Clean, centered layout
- FAQ section at top
- "Can't find what you're looking for?" CTA leading to report form below
- Contact info section (email, response time expectations)

## Acceptance Criteria

- [ ] `/support` page accessible from settings and footer
- [ ] FAQ accordion with categories and search
- [ ] Report issue form with validation
- [ ] Form submission creates support_tickets record
- [ ] Success confirmation after submission
- [ ] Responsive layout
- [ ] Works for both authenticated and anonymous users

## Context

- Schema: `web/supabase/migrations/20251221000009_create_support_tickets.sql`
- Settings page (link): `src/app/settings/page.tsx`
- Mobile reference: `/Users/naimabdelkerim/Code/travel/apps/mobile/app/support.tsx`

## Checklist

- [x] Review support ticket schema, generated types, and current support link surfaces
- [x] Extend support ticket schema for subject/contact email and anonymous submissions
- [ ] Add support domain types and submission hook
- [ ] Build FAQ data model, search/filter state, and accordion UI
- [ ] Build report issue form with validation, auth-aware prefills, and success state
- [ ] Create `/support` page layout with contact options and responsive sections
- [ ] Wire support links from settings and footer
- [ ] Run available validation and capture blockers
- [ ] Update task log, progress, and completion state

## Review Notes

## Agent Log
- 2026-03-13: Started task on branch `task/007-support-help-page`. Reviewed `support_tickets` schema, mobile support screen, and current settings/footer link surfaces before implementation. Identified schema gaps for anonymous submissions plus subject/contact email capture, so implementation will start with a minimal Supabase migration and matching typed web support models.
