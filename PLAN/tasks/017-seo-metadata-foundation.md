---
id: "017"
title: "SEO Foundation: robots.txt, sitemap, per-page metadata, canonical, OG tags"
status: done
priority: urgent
created: 2026-03-21
updated: 2026-03-21
assigned: codex
branch: task/017-seo-metadata-foundation
pr: null
attempts: 1
depends_on: []
progress: 100
---

## Description

The site has no `robots.txt`, no `sitemap.xml`, duplicate/missing metadata on all pages, no canonical tags, and no Open Graph / Twitter Card tags. This blocks indexing entirely and is the single highest-impact SEO task.

**Audit findings addressed:** C1, C2, C3, C4, H5, M5 from `seo-audit-by-issam/OKEYO-ACTION-PLAN.md`.

### Scope

1. **robots.txt** — Create `src/app/robots.ts` (Next.js MetadataRoute.Robots):
   - Allow all public paths
   - Disallow: `/api/`, `/admin/`, `/agent/`, `/host/availability/`, `/host/experiences/`
   - Reference the sitemap URL
   - Include AI crawler directives: `GPTBot`, `ClaudeBot`, `CCBot`, `Google-Extended` — allow them (good for AI search readiness)
   - Add `X-Robots-Tag: noindex` override via env var `NEXT_PUBLIC_NOINDEX=true` for staging

2. **sitemap.xml** — Create `src/app/sitemap.ts` (Next.js MetadataRoute.Sitemap):
   - Static routes: `/`, `/explore`, `/collections`, `/chat`, `/preorder`, `/support`, `/terms`, `/privacy`
   - Dynamic routes: `/explore/category/[slug]` — fetch all categories from Supabase
   - Dynamic routes: `/experience/[id]` — fetch all public, active experiences from Supabase
   - Set `priority` and `changeFrequency` per route type (homepage = 1.0, experiences = 0.8, etc.)
   - Exclude authenticated-only routes: `/bookings`, `/profile`, `/notifications`, `/settings`, `/host/*`, `/admin/*`

3. **Per-page metadata** — Add `generateMetadata()` (or static `metadata`) to every public page:

   | Route | Title | Meta Description |
   |-------|-------|-----------------|
   | `/` | Okeyo Travel — Trouvez votre destination selon votre humeur | En 2 minutes, dites-nous votre mood et Okeyo vous recommande la destination idéale. Planification personnalisée par IA. |
   | `/explore` | Explorer les destinations — Okeyo Travel | Filtrez par activité, thème et dates pour trouver votre prochain voyage. Recommandations personnalisées selon vos envies. |
   | `/explore/category/[slug]` | `[Category Name]` — Okeyo Travel | Generated per category |
   | `/collections` | Nos Collections de voyages — Okeyo Travel | Découvrez nos collections de destinations triées par thème : aventure, détente, culture et plus encore. |
   | `/chat` | Assistant voyage IA — Okeyo Travel | Discutez avec notre assistant IA pour planifier votre voyage sur mesure en quelques minutes. |
   | `/experience/[id]` | `[Experience Title]` — Okeyo Travel | Generated per experience (description field) |
   | `/preorder` | Précommande — Okeyo Travel | Soyez parmi les premiers à profiter d'Okeyo Travel. |
   | `/support` | Aide & Support — Okeyo Travel | Retrouvez toutes nos réponses aux questions fréquentes et contactez notre équipe. |

4. **Canonical tags** — Add `alternates.canonical` to every public page metadata (absolute URL).

5. **Open Graph + Twitter Cards** — Add to every page:
   - `og:title`, `og:description`, `og:url`, `og:type`, `og:image` (use a default OG image for pages without one, per-experience image for experience pages)
   - `twitter:card: "summary_large_image"`, `twitter:title`, `twitter:description`, `twitter:image`
   - Create a default OG image at `public/og-default.png` (1200×630) or use Next.js `opengraph-image.tsx`

6. **Noindex on staging** — In root layout, conditionally add `<meta name="robots" content="noindex, nofollow">` when `NEXT_PUBLIC_NOINDEX=true`.

7. **hreflang** — Add `<link rel="alternate" hreflang="fr" href="...">` and `hreflang="x-default"` via metadata `alternates.languages` in root layout (French only for now, future-proof structure).

## Acceptance Criteria

- [ ] `GET /robots.txt` returns 200 with valid directives
- [ ] `GET /sitemap.xml` returns 200 with all public routes listed
- [ ] Every public page has a unique `<title>` and `<meta name="description">`
- [ ] Every public page has a `<link rel="canonical">` tag
- [ ] Every public page has `og:title`, `og:description`, `og:image`, `og:url`
- [ ] Every public page has `twitter:card` tags
- [ ] `NEXT_PUBLIC_NOINDEX=true` adds noindex meta to all pages
- [ ] No duplicate titles across pages

## Context

- Root layout: `src/app/layout.tsx`
- Homepage: `src/app/page.tsx`
- Explore: `src/app/explore/page.tsx`
- Category: `src/app/explore/category/[slug]/page.tsx`
- Collections: `src/app/collections/page.tsx`
- Chat: `src/app/chat/page.tsx`
- Experience: `src/app/experience/[id]/page.tsx`
- Preorder: `src/app/preorder/page.tsx`
- Support: `src/app/support/page.tsx`
- Supabase client: `src/lib/supabase/`
- Audit reference: `seo-audit-by-issam/OKEYO-ACTION-PLAN.md` (C1–C4, H5, M5)

## Checklist

- [x] Step 1: Read `src/app/layout.tsx` to understand current metadata setup
- [x] Step 2: Create `src/app/robots.ts`
- [x] Step 3: Create `src/app/sitemap.ts` with static routes
- [x] Step 4: Extend sitemap with dynamic experience and category routes from Supabase
- [x] Step 5: Add unique `metadata` / `generateMetadata()` to homepage
- [x] Step 6: Add metadata to `/explore` and `/explore/category/[slug]`
- [x] Step 7: Add metadata to `/collections`, `/chat`, `/preorder`, `/support`
- [x] Step 8: Add `generateMetadata()` to `/experience/[id]` using DB fields
- [x] Step 9: Add canonical tags to all pages via `alternates.canonical`
- [x] Step 10: Add OG + Twitter Card tags to all pages
- [x] Step 11: Created `src/app/opengraph-image.tsx` (edge-rendered default OG image 1200×630)
- [x] Step 12: Add noindex conditional to root layout via env var
- [x] Step 13: Add hreflang to root layout metadata
- [x] Step 14: Verify no duplicate titles remain

## Review Notes

## Agent Log

### 2026-03-21
- Created `src/app/robots.ts` — allows all public paths, disallows `/api/`, `/admin/`, `/agent/`, `/host/`, `/bookings/`, `/profile/`, `/notifications/`, `/settings/`; allows AI crawlers (GPTBot, ClaudeBot, CCBot, Google-Extended); references sitemap URL.
- Created `src/app/sitemap.ts` — 8 static routes with priority/changeFrequency; dynamic routes for all published experiences and active categories fetched from Supabase server client; graceful fallback if DB unavailable at build time.
- Added unique `metadata` exports to all public pages: homepage (`page.tsx`), chat (`chat/page.tsx`), support (`support/page.tsx`).
- Created layout files with metadata for client-component pages: `explore/layout.tsx`, `collections/layout.tsx`, `preorder/layout.tsx`, `explore/category/layout.tsx`.
- Created `experience/[id]/layout.tsx` with `generateMetadata` — resolves experience by UUID, slug, or composite slug prefix; returns dynamic title/description from DB; graceful fallback.
- Added canonical `alternates.canonical` and `openGraph` url/title/description to all public page metadata exports.
- Updated root `layout.tsx` metadata: added `metadataBase`, title template, `robots` env-var-driven noindex, default `openGraph` site config, `twitter` card defaults, and `alternates.languages` hreflang (fr + x-default).
- Created `src/app/opengraph-image.tsx` — edge-rendered 1200×630 default OG image in brand colours (dark background, purple accent, French headline).
- Fixed stale chat page title ("Chat AI | Morocco Experiences" → "Assistant voyage IA — Okeyo Travel").
- Verified no duplicate titles remain across all public pages.
