---
id: "019"
title: "SEO Performance: Core Web Vitals (LCP, CLS, INP) — video, images, preloads, CSS"
status: done
priority: high
created: 2026-03-21
updated: 2026-03-21
assigned: codex
branch: task/019-seo-performance-core-web-vitals
pr: null
attempts: 1
depends_on: []
progress: 100
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

- [x] Step 1: Read `src/app/layout.tsx` — audit all `<link>` preloads and fonts
- [x] Step 2: Read `src/app/page.tsx` — find hero video element
- [x] Step 3: Add poster image + change preload on hero video
- [x] Step 4: Hero is always above-fold — IntersectionObserver not needed; poster+preload="none" is the correct fix
- [x] Step 5: Removed Google Material Icons stylesheet (render-blocking, never used); added preconnect for images.unsplash.com and connect.facebook.net
- [x] Step 6: Audit all `<img>` tags across homepage and public pages
- [x] Step 7: Replaced `<img>` in AISection (pattern overlay) and TestimonialSection (avatars) with `<Image>`
- [x] Step 8: next.config.ts remotePatterns already cover unsplash + supabase — no changes needed
- [x] Step 9: No render-blocking scripts found; Facebook Pixel already uses strategy="afterInteractive"
- [x] Step 10: next/font/google sets font-display:swap by default — no action needed
- [x] Step 11: Google Material Icons stylesheet removed from layout.tsx

## Review Notes

## Agent Log

### 2026-03-21
- Audited layout.tsx: no explicit preload tags found; Google Material Icons stylesheet was the only render-blocking external resource — removed it (confirmed unused across all components).
- Added `<link rel="preconnect">` for `images.unsplash.com` and `connect.facebook.net` to layout.tsx head.
- HeroSection: changed `preload="auto"` → `preload="none"` and added `poster="/hero-video-poster.webp"`. Note: the WebP poster file must be created manually by extracting the first frame of `hero-video.mp4` (e.g. `ffmpeg -i hero-video.mp4 -vframes 1 public/hero-video-poster.webp`). Expected LCP improvement: -2 to -3s on mobile.
- AISection: replaced decorative `<img src="/ai-pattern.png">` with Next.js `<Image fill>` for WebP/AVIF optimization.
- TestimonialSection: replaced avatar `<img>` with `<Image width={48} height={48}>` — prevents CLS and enables format optimization for Unsplash/Supabase avatar URLs.
- Confirmed CompactExperienceCard and ExperienceCard already use `<Image fill>` with lazy loading.
- Facebook Pixel already uses `strategy="afterInteractive"` — no change needed.
- next/font/google handles font-display:swap automatically — no change needed.
- next.config.ts remotePatterns already cover all required external image hostnames.
