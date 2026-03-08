---
id: "007"
title: "Support/Help Page with FAQ and Report Issue"
status: todo
priority: low
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

- [ ] Read support_tickets schema
- [ ] Read mobile support screen for reference
- [ ] Create `/support` page
- [ ] Build FAQ accordion component with categories
- [ ] Add FAQ search/filter
- [ ] Build ReportIssueForm component
- [ ] Create `use-support.ts` hook (submit ticket)
- [ ] Add success confirmation
- [ ] Add links from settings and footer
- [ ] Polish UI and responsiveness

## Review Notes

## Agent Log
