---
id: "007"
title: "Support/Help Page with FAQ and Report Issue"
status: done
priority: low
created: 2026-03-07
updated: 2026-03-13
assigned: codex
branch: task/007-support-help-page
pr: null
attempts: 0
depends_on: []
progress: 100
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

- [x] `/support` page accessible from settings and footer
- [x] FAQ accordion with categories and search
- [x] Report issue form with validation
- [x] Form submission creates support_tickets record
- [x] Success confirmation after submission
- [x] Responsive layout
- [x] Works for both authenticated and anonymous users

## Context

- Schema: `web/supabase/migrations/20251221000009_create_support_tickets.sql`
- Settings page (link): `src/app/settings/page.tsx`
- Mobile reference: `/Users/naimabdelkerim/Code/travel/apps/mobile/app/support.tsx`

## Checklist

- [x] Review support ticket schema, generated types, and current support link surfaces
- [x] Extend support ticket schema for subject/contact email and anonymous submissions
- [x] Add support domain types and submission hook
- [x] Build FAQ data model, search/filter state, and accordion UI
- [x] Build report issue form with validation, auth-aware prefills, and success state
- [x] Create `/support` page layout with contact options and responsive sections
- [x] Wire support links from settings and footer
- [x] Run available validation and capture blockers
- [x] Update task log, progress, and completion state

## Review Notes
- Validation:
  - `pnpm exec biome check src/app/support/page.tsx src/components/support/ReportIssueForm.tsx src/components/support/SupportFaq.tsx src/components/support/SupportMarkdown.tsx src/hooks/use-support.ts src/types/support.ts src/app/settings/page.tsx src/components/home/FooterSection.tsx` passed.
  - `pnpm tsc --noEmit` passed.
  - `pnpm lint` still fails on pre-existing repository-wide issues outside Task 007 scope (for example `supabase/functions/send-trip-reminders/index.ts`, `supabase/functions/validate-promo-code/index.ts`, and `src/app/bookings/page.tsx`).
- GitHub submission remains environment-blocked in this runtime because network access is unavailable for `git push` / `gh pr`.

## Agent Log
- 2026-03-13: Started task on branch `task/007-support-help-page`. Reviewed `support_tickets` schema, mobile support screen, and current settings/footer link surfaces before implementation. Identified schema gaps for anonymous submissions plus subject/contact email capture, so implementation will start with a minimal Supabase migration and matching typed web support models.
- 2026-03-13: Implemented the public support center at `/support` with searchable FAQ categories, direct contact cards, and a validated report issue form. Added a Supabase migration for anonymous ticket inserts plus `subject` / `contact_email`, created typed support models and mutation hook, wired settings/footer support links, and validated the touched files with Biome plus a clean repo typecheck.
