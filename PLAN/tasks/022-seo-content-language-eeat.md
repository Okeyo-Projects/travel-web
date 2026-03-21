---
id: "022"
title: "SEO Content: French headings, placeholder replacement, E-E-A-T signals"
status: todo
priority: medium
created: 2026-03-21
updated: 2026-03-21
assigned: codex
branch: null
pr: null
attempts: 0
depends_on: []
progress: 0
---

## Description

The site declares `lang="fr"` but uses English H2/H3/H4 headings throughout the homepage, reducing relevance for French search queries. Several sections contain placeholder content (repeated testimonials, identical destination cards) that actively hurts trust and E-E-A-T signals. The heading hierarchy skips levels (H4 for content that should be H2/H3).

**Audit findings addressed:** C6, H6, L2, L3 from `seo-audit-by-issam/OKEYO-ACTION-PLAN.md`.

### Scope

**1. Translate English headings to French (homepage)**

| Current (English) | Replacement (French) |
|-------------------|---------------------|
| "Not Your Boring Travel Agent" | "Votre compagnon de voyage intelligent" (or similar brand-appropriate phrase) |
| "What Our Travelers Say" | "Ce que disent nos voyageurs" |
| "How It Works" | "Comment ça marche" |
| "Company" (footer H4) | "L'entreprise" |
| "Sign up to our newsletter" (footer H4) | "Rejoignez notre newsletter" |
| H1: "Mood, Envie, Desire" | Keep the multilingual concept but ensure French is dominant: "Mood · Envie · Désir" |

**2. Fix heading hierarchy**
- `How It Works` section currently uses H4 — promote to H2 or H3
- Footer section labels currently H4 — acceptable for footer, keep as-is
- Ensure no heading level is skipped (H1 → H2 → H3, no jumps to H4 without H3 parent)

**3. Replace placeholder content**

- **Testimonials**: "Savannah Nguyen" repeated 3× with Lorem Ipsum → Either:
  - Remove the testimonials section entirely until real reviews exist, OR
  - Replace with realistic placeholder names and French text that is not Lorem Ipsum
  - Do NOT use fake star ratings or fabricated quotes (GDPR/consumer protection concern)
  - Recommended: hide the section behind a feature flag or replace with a "coming soon" message

- **Destination cards**: All 3 showing "Bangli, East Bali" with identical content →
  - Replace with 3 distinct real destinations relevant to the platform (e.g., Marrakech, Lisbonne, Kyoto)
  - Use real Unsplash images with different URLs
  - Add distinct descriptions per card

- **Footer links**: "Traveling", "About Locate", "Success", "Information" all pointing to `/` →
  - Map to real routes where possible:
    - "À propos" → `/about` (or remove if page doesn't exist)
    - "Support" → `/support`
    - "Confidentialité" → `/privacy`
    - "Conditions" → `/terms`
  - Remove any links that have no real destination

**4. E-E-A-T improvements (content additions)**
- Add a brief "Comment ça marche" section to homepage (3 steps: describe mood → AI recommends → book) with real text
- Add a brief description of what Okeyo Travel is in the hero or subtitle (for AI/knowledge graph clarity)
- Ensure contact information (email) is visible in footer

## Acceptance Criteria

- [ ] No English headings on French-declared pages (H1–H4)
- [ ] Heading hierarchy is valid (no skipped levels in main content)
- [ ] Testimonials section removed or replaced with non-Lorem Ipsum French content
- [ ] Homepage destination cards show 3 distinct, real destinations
- [ ] Footer links point to valid routes (no broken `/` links)
- [ ] "Comment ça marche" section has real French text
- [ ] Contact email visible in footer
- [ ] `lang="fr"` matches the actual page language

## Context

- Homepage: `src/app/page.tsx`
- Homepage sections are likely componentized — check `src/components/` for `hero`, `testimonials`, `how-it-works`, `footer` components
- Footer: likely in `src/components/footer.tsx` or `src/app/layout.tsx`
- Terms/Privacy pages: task 008 (already planned)
- Audit reference: `seo-audit-by-issam/FULL-AUDIT-REPORT.md` (Sections 2.3, 2.4, 3.3)
- Action plan reference: `seo-audit-by-issam/OKEYO-ACTION-PLAN.md` (C6, H6, L2, L3)

## Checklist

- [ ] Step 1: Read `src/app/page.tsx` and relevant homepage components
- [ ] Step 2: Find and read footer component
- [ ] Step 3: Translate all English headings to French
- [ ] Step 4: Fix heading hierarchy (H4 → H2/H3 where appropriate)
- [ ] Step 5: Handle testimonials section (remove or replace placeholder)
- [ ] Step 6: Replace "Bangli, East Bali" cards with 3 distinct destinations
- [ ] Step 7: Fix footer links to point to real routes
- [ ] Step 8: Add/improve "Comment ça marche" section text
- [ ] Step 9: Ensure contact email in footer
- [ ] Step 10: Verify `lang="fr"` in root layout matches page content

## Review Notes

## Agent Log
