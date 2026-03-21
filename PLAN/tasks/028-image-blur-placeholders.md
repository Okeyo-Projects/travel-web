---
id: "028"
title: "Add blur placeholders to images to prevent CLS"
status: done
priority: medium
created: 2026-03-21
updated: 2026-03-21
assigned: codex
pr: null
attempts: 0
depends_on: []
progress: 0
---

## Description

Images across the app pop in without placeholders, causing layout shift (CLS) and a jarring visual experience. Adding `placeholder="blur"` with `blurDataURL` to Next.js `<Image>` components provides a smooth loading experience.

### Scope

**1. Static images (local assets)**
- For images imported from `public/` or as modules, Next.js auto-generates blur placeholders
- Ensure static images use the import pattern: `import heroImg from '@/public/hero.webp'`

**2. Remote images (Supabase, Unsplash)**
- Remote images need a `blurDataURL` provided manually
- Options:
  - Generate tiny (10px) base64 placeholders at build time or on upload
  - Use a solid color placeholder matching the dominant color
  - Use a generic low-res data URI as a universal fallback
- Recommended: create a utility function `getBlurPlaceholder(url)` that returns a generic placeholder data URI
- Apply to experience cards, gallery images, and avatar images

**3. Key components to update**
- `ExperienceCard` / `CompactExperienceCard`
- Experience detail gallery
- Homepage hero and sections
- Avatar images in reviews/testimonials

## Acceptance Criteria

- [ ] All local images use `placeholder="blur"` with auto-generated blur
- [ ] All remote `<Image>` components use `placeholder="blur"` with `blurDataURL`
- [ ] Experience cards show blur placeholder while loading
- [ ] No additional CLS introduced by placeholder transition
- [ ] Blur placeholder utility function is reusable across components

## Context

- Experience card: `src/components/experience/experience-card.tsx`
- Compact card: `src/components/experience/compact-experience-card.tsx`
- Image utility: `src/lib/utils/image.ts`
- Homepage sections: `src/components/home/`

## Checklist

- [ ] Step 1: Create `getBlurPlaceholder` utility in `src/lib/utils/image.ts`
- [ ] Step 2: Update `ExperienceCard` with blur placeholder
- [ ] Step 3: Update `CompactExperienceCard` with blur placeholder
- [ ] Step 4: Update experience detail gallery images
- [ ] Step 5: Update homepage hero/section images
- [ ] Step 6: Update avatar images in testimonials/reviews
- [ ] Step 7: Verify no CLS regression with Lighthouse

## Review Notes

## Agent Log
