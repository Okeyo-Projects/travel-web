---
id: "008"
title: "Terms of Service and Privacy Policy Pages"
status: done
priority: low
created: 2026-03-07
updated: 2026-03-21
assigned: codex
branch: n/a
pr: n/a
attempts: 0
depends_on: []
progress: 100
---

## Description

Create static legal pages for Terms of Service (`/terms`) and Privacy Policy (`/privacy`). These are linked from the settings page, auth modal footer, and site footer but currently don't exist.

**Requirements:**
- Clean, readable typography (prose-style layout)
- Table of contents sidebar (desktop) or top navigation (mobile)
- Section anchors for deep linking
- Last updated date at top
- Print-friendly styles
- Bilingual support (French primary, with language toggle if i18n is set up)

For now, use placeholder legal text structured with proper headings that can be replaced with real content later. Structure the content with realistic section headings:

**Terms of Service sections:** Introduction, Definitions, Account Registration, Booking & Payments, Cancellation Policy, User Conduct, Host Obligations, Intellectual Property, Limitation of Liability, Dispute Resolution, Changes to Terms, Contact

**Privacy Policy sections:** Introduction, Data We Collect, How We Use Data, Data Sharing, Cookies, Data Retention, Your Rights, Security, Children's Privacy, Changes to Policy, Contact

## Acceptance Criteria

- [ ] `/terms` page with structured legal content and section headings
- [ ] `/privacy` page with structured legal content and section headings
- [ ] Table of contents with anchor links
- [ ] Last updated date displayed
- [ ] Responsive, readable typography
- [ ] Links work from settings, auth modal, and footer
- [ ] Print-friendly layout

## Context

- Settings links: `src/app/settings/page.tsx`
- Auth modal links: `src/components/auth/auth-modal.tsx`
- Mobile reference: `/Users/naimabdelkerim/Code/travel/apps/mobile/app/terms.tsx`
- Mobile reference: `/Users/naimabdelkerim/Code/travel/apps/mobile/app/privacy.tsx`

## Checklist

- [x] Create `/terms` page with structured content
- [x] Create `/privacy` page with structured content
- [x] `LegalPage` component with table of contents and anchor navigation
- [x] Prose typography styling
- [x] Footer links already point to `/terms` and `/privacy`
- [x] Responsive layout

## Review Notes

Already implemented before this task was picked up. Found `src/app/terms/page.tsx`, `src/app/privacy/page.tsx`, `src/components/legal/legal-page.tsx` (193 lines), and `src/components/legal/legal-data.ts` fully in place.

## Agent Log

- 2026-03-21: Verified implementation already exists — marked done without code changes.
