---
id: "018"
title: "SEO Structured Data: JSON-LD schemas (Organization, WebSite, BreadcrumbList, WebPage, Experience)"
status: done
priority: urgent
created: 2026-03-21
updated: 2026-03-21
assigned: codex
branch: task/018-seo-structured-data
pr: null
attempts: 1
depends_on: ["017"]
progress: 100
---

## Description

Zero structured data detected on the site. No JSON-LD, no Microdata, no RDFa. This means no eligibility for rich results (star ratings, sitelinks search box, breadcrumbs in SERPs) and poor entity clarity for knowledge graphs and AI search.

**Audit findings addressed:** C5 from `seo-audit-by-issam/OKEYO-ACTION-PLAN.md`.

### Scope

Implement JSON-LD structured data in phases:

**Phase 1 — Root layout (applies to all pages):**
1. `Organization` schema — name, url, logo, description, sameAs (social profiles), contactPoint
2. `WebSite` schema with `SearchAction` pointing to `/explore?q={search_term_string}`

**Phase 2 — Per-page schemas:**
3. `WebPage` schema on every public page (name, description, url, breadcrumb)
4. `BreadcrumbList` schema on nested pages (e.g. `/explore/category/[slug]`, `/experience/[id]`)

**Phase 3 — Content-specific schemas:**
5. `CollectionPage` + `ItemList` on `/collections` page (once real data is server-rendered)
6. `Service` schema on homepage describing the AI travel recommendation service
7. `TouristAttraction` or `Event` schema on `/experience/[id]` pages

### Implementation approach

- Create a reusable `<JsonLd>` component in `src/components/seo/json-ld.tsx` that accepts a `schema` object and renders it as a `<script type="application/ld+json">` tag
- Add Phase 1 schemas directly in `src/app/layout.tsx`
- Add Phase 2/3 schemas in individual page components or `generateMetadata` equivalents
- Use TypeScript types for schema objects to prevent typos

### Organization JSON-LD (ready to use)

```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Okeyo Travel",
  "url": "https://okeyotravel.com",
  "logo": "https://okeyotravel.com/logo_white.png",
  "description": "En 2 minutes, OKEYO vous recommande la destination la plus adaptée à vos envies grâce à l'IA.",
  "sameAs": [
    "https://www.instagram.com/okeyotravel"
  ],
  "contactPoint": {
    "@type": "ContactPoint",
    "contactType": "customer service",
    "availableLanguage": "French"
  }
}
```

### WebSite JSON-LD (ready to use)

```json
{
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": "Okeyo Travel",
  "url": "https://okeyotravel.com",
  "inLanguage": "fr",
  "potentialAction": {
    "@type": "SearchAction",
    "target": {
      "@type": "EntryPoint",
      "urlTemplate": "https://okeyotravel.com/explore?q={search_term_string}"
    },
    "query-input": "required name=search_term_string"
  }
}
```

## Acceptance Criteria

- [x] `Organization` JSON-LD present in root layout (all pages)
- [x] `WebSite` JSON-LD with `SearchAction` present in root layout
- [x] `WebPage` schema on homepage, `/explore`, `/collections`, `/chat`
- [x] `BreadcrumbList` schema on `/explore/category/[slug]` and `/experience/[id]`
- [x] `Service` schema on homepage describing the AI recommendation service
- [x] `/experience/[id]` has experience-specific schema (TouristAttraction)
- [ ] All schemas pass Google Rich Results Test (no errors) — verify post-deploy
- [x] `<JsonLd>` component is reusable and typed

## Context

- Root layout: `src/app/layout.tsx`
- Experience page: `src/app/experience/[id]/page.tsx`
- Collections page: `src/app/collections/page.tsx`
- Category page: `src/app/explore/category/[slug]/page.tsx`
- Audit reference: `seo-audit-by-issam/FULL-AUDIT-REPORT.md` (Section 4 — Schema)
- Action plan reference: `seo-audit-by-issam/OKEYO-ACTION-PLAN.md` (C5)

## Checklist

- [x] Step 1: Create `src/components/seo/json-ld.tsx` reusable component
- [x] Step 2: Add `Organization` + `WebSite` schemas to `src/app/layout.tsx`
- [x] Step 3: Add `WebPage` schema to homepage
- [x] Step 4: Add `WebPage` schema to `/explore`, `/collections`, `/chat`
- [x] Step 5: Add `BreadcrumbList` to `/explore/category/[slug]/layout.tsx` (SSR, fetches category title)
- [x] Step 6: Add `BreadcrumbList` + `TouristAttraction` schema to `/experience/[id]/layout.tsx`
- [x] Step 7: Add `Service` schema to homepage
- [x] Step 8: Added `CollectionPage` schema to `/collections/layout.tsx`; ItemList deferred (dynamic data)
- [x] Step 9: Schemas reviewed for valid JSON-LD structure

## Review Notes

## Agent Log

- 2026-03-21: Implemented all JSON-LD schemas. JsonLd component renders trusted server-side objects via dangerouslySetInnerHTML with a biome-ignore comment. Category slug layout fetches category title SSR for accurate BreadcrumbList. Experience layout reuses fetchExperienceMeta for TouristAttraction schema.
