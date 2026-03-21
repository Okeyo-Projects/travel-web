---
id: "019"
title: "SEO Performance: Core Web Vitals (LCP, CLS, INP) — video, images, preloads, CSS"
status: todo
priority: high
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

Estimated Core Web Vitals are critically poor (LCP 4.5–6.0s, CLS 0.15–0.30). The primary causes are a 5.5 MB hero video with `preload="auto"`, 9 unnecessary image preloads, all external images bypassing Next.js optimization, and a 167 KB render-blocking CSS file.

**Audit findings addressed:** H1, H4, M3, M4 from `seo-audit-by-issam/OKEYO-ACTION-PLAN.md`.

### Scope

**1. Hero video optimization (LCP: -2.0 to -3.0s)**
- Locate the hero video element in the homepage component
- Add a `poster` attribute pointing to a WebP first-frame image (place in `public/` or use Supabase storage)
- Change `preload="auto"` to `preload="none"`
- Implement lazy loading via Intersection Observer: only start loading video when near viewport
- Update `Cache-Control` if served from a custom origin (set `public, max-age=31536000, immutable`)
- Note: video compression (target <1.5 MB with ffmpeg) is a non-code task — document it in the PR description

**2. Remove excessive preloads (-0.5 to -1.0s)**
- Audit `<head>` preloads in `src/app/layout.tsx` and homepage
- Remove preloads for below-fold decorative assets: `ai-pattern.png`, `testimonial-pattern.svg`, avatar images
- Keep only the LCP resource (above-fold hero poster image or first visible image)
- Add missing `<link rel="preconnect">` for:
  - `https://images.unsplash.com` (if used)
  - `https://fonts.gstatic.com`

**3. Use Next.js `<Image>` for all images (-0.3s + CLS fix)**
- Replace all `<img>` tags that load external URLs with Next.js `<Image>`
- Add `images.unsplash.com` to `remotePatterns` in `next.config.ts` (if not already)
- Add explicit `width` and `height` props to prevent CLS
- Use `loading="lazy"` on all below-fold images
- Use `priority` prop only on the above-fold LCP image
- Add meaningful `alt` text to all images (see task 022 for content)

**4. Render-blocking script fix**
- Find the render-blocking 110 KB script identified in the audit
- Add `async` or `defer` attribute, or convert to use `next/script` with `strategy="lazyOnload"`

**5. Material Icons (if used)**
- If Google Material Icons stylesheet is loaded, replace with self-hosted subset or inline SVGs
- Alternatively use `next/font` if available for icon fonts

**6. Font display**
- Ensure all custom fonts use `font-display: swap` (check `src/app/layout.tsx` or global CSS)

## Acceptance Criteria

- [ ] Hero video has `poster` attribute and `preload="none"`
- [ ] Hero video loads lazily (only after page paint or near viewport)
- [ ] Unnecessary `<link rel="preload">` tags removed from `<head>`
- [ ] `<link rel="preconnect">` added for external image/font origins
- [ ] All `<img>` tags using external URLs replaced with Next.js `<Image>`
- [ ] All images have explicit `width` and `height` to prevent CLS
- [ ] All below-fold images use `loading="lazy"`
- [ ] Only LCP image uses `priority` prop
- [ ] No render-blocking scripts in `<head>` without `async`/`defer`
- [ ] All custom fonts use `font-display: swap`
- [ ] Estimated LCP improvement of ≥2s on mobile

## Context

- Root layout: `src/app/layout.tsx`
- Homepage: `src/app/page.tsx`
- Next.js config: `next.config.ts`
- Global CSS: `src/app/globals.css`
- Audit reference: `seo-audit-by-issam/FULL-AUDIT-REPORT.md` (Section 5 — Performance)
- Action plan reference: `seo-audit-by-issam/OKEYO-ACTION-PLAN.md` (H1, H4, M3, M4)

## Checklist

- [ ] Step 1: Read `src/app/layout.tsx` — audit all `<link>` preloads and fonts
- [ ] Step 2: Read `src/app/page.tsx` — find hero video element
- [ ] Step 3: Add poster image + change preload on hero video
- [ ] Step 4: Implement Intersection Observer lazy load for hero video
- [ ] Step 5: Remove below-fold preloads; add preconnect for external origins
- [ ] Step 6: Audit all `<img>` tags across homepage and public pages
- [ ] Step 7: Replace `<img>` tags with `<Image>` — add width/height/alt
- [ ] Step 8: Update `next.config.ts` remotePatterns if needed
- [ ] Step 9: Find and fix render-blocking script (add async/defer or next/script)
- [ ] Step 10: Verify `font-display: swap` in CSS/font definitions
- [ ] Step 11: Remove or self-host Material Icons if present

## Review Notes

## Agent Log
