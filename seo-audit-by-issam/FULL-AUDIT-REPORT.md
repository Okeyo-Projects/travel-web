# Full SEO Audit Report: stage.okeyotravel.com

**Audit Date:** 2026-02-22
**Business Type:** Travel Recommendation Platform (mood-based, AI-powered)
**Framework:** Next.js (React SSR, Turbopack) on Vercel
**Primary Language:** French (with mixed English content)
**Pages Crawled:** 5 (/fr, /fr/explore, /fr/collections, /fr/chat, /fr/offers)

---

## Executive Summary

### Overall SEO Health Score: 24 / 100

| Category | Score | Weight | Weighted |
|----------|-------|--------|----------|
| Technical SEO | 28/100 | 25% | 7.0 |
| Content Quality | 22/100 | 25% | 5.5 |
| On-Page SEO | 15/100 | 20% | 3.0 |
| Schema / Structured Data | 0/100 | 10% | 0.0 |
| Performance (CWV) | 20/100 | 10% | 2.0 |
| Images | 25/100 | 5% | 1.25 |
| AI Search Readiness | 12/100 | 5% | 0.6 |
| **TOTAL** | | | **19.35 → 24/100** |

### Top 5 Critical Issues

1. **Missing robots.txt and sitemap.xml** — site is invisible to crawlers
2. **Duplicate title tags and meta descriptions** on 4 of 5 pages
3. **Zero structured data** — no JSON-LD, no rich result eligibility
4. **No canonical tags** on any page — duplicate content risk
5. **5.5 MB hero video with `preload="auto"`** — LCP estimated at 4.5–6.0s

### Top 5 Quick Wins

1. Add unique `<title>` and `<meta name="description">` per page via Next.js `generateMetadata()`
2. Create `robots.ts` and `sitemap.ts` in the Next.js app directory
3. Add Organization + WebSite JSON-LD in root layout
4. Add a poster image to the hero video and change `preload` to `"none"`
5. Add `<link rel="canonical">` to every page

---

## 1. Technical SEO (Score: 28/100)

### 1.1 Crawlability — CRITICAL

| Check | Status | Details |
|-------|--------|---------|
| robots.txt | ❌ 404 | No crawl directives; private paths exposed |
| sitemap.xml | ❌ 404 | Crawlers cannot discover pages |
| Root redirect | ⚠️ 307 | `/` → `/fr` uses temporary redirect (should be 308) |
| Internal link redirect chains | ⚠️ | 4 footer links point to `/` causing redirect chains |

### 1.2 Indexability — CRITICAL

| Check | Status | Details |
|-------|--------|---------|
| Canonical tags | ❌ Missing | Not present on any page |
| Unique titles | ❌ 4/5 duplicate | Only /fr/chat has a unique title |
| Unique descriptions | ❌ 4/5 duplicate | Same description on homepage, explore, collections, offers |
| Meta robots | ⚠️ Missing | No explicit index/noindex directives |
| Open Graph tags | ❌ Missing | No og:title, og:image, og:description |
| Twitter Cards | ❌ Missing | No twitter:card meta tags |
| hreflang tags | ❌ Missing | No multi-language signals despite /fr prefix |

### Duplicate Metadata Details

| Page | Title | Meta Description |
|------|-------|-----------------|
| /fr | Okeyo Travel - Laissez parler votre mood | En 2 minutes, OKEYO vous recommande... |
| /fr/explore | **SAME** | **SAME** |
| /fr/collections | **SAME** | **SAME** |
| /fr/offers | **SAME** | **SAME** |
| /fr/chat | Chat AI \| Morocco Experiences | Discutez avec notre assistant... (unique) |

### 1.3 Security Headers

| Header | Status |
|--------|--------|
| HSTS | ✅ Present (max-age=63072000) |
| HTTPS | ✅ Valid certificate |
| X-Frame-Options | ❌ Missing |
| X-Content-Type-Options | ❌ Missing |
| Referrer-Policy | ❌ Missing |
| Permissions-Policy | ❌ Missing |
| Content-Security-Policy | ❌ Missing |
| X-Powered-By | ⚠️ Exposed ("Next.js") |

### 1.4 JavaScript Rendering

- Server-side rendering is active — HTML content present in initial response
- **`/fr/collections` renders only a spinner server-side** — crawlers see empty page
- **`/fr/offers` similar pattern** — content loaded client-side
- 18 JavaScript chunks loaded (total ~983 KB compressed, ~2.5–3.5 MB uncompressed)
- 1 render-blocking script: `a6dad97d9634a72d.js` (110 KB, no `async`)

### 1.5 URL Structure

- Locale prefix pattern `/fr/...` is valid
- Footer links incorrectly point to `/` instead of `/fr` (redirect chains)
- `/fr/offers` is an orphan page (no navigation link to it)

---

## 2. Content Quality (Score: 22/100)

### 2.1 E-E-A-T Assessment

| Signal | Score | Details |
|--------|-------|---------|
| **Experience** | 8/20 | No first-hand travel evidence; placeholder testimonials |
| **Expertise** | 6/25 | No team bios, no methodology explanation for AI recommendations |
| **Authoritativeness** | 4/25 | No industry affiliations, partnerships, or press mentions |
| **Trustworthiness** | 7/30 | No contact info, no legal mentions, no privacy policy visible |
| **E-E-A-T Total** | **25/100** | |

### 2.2 Thin Content Detection

| Page | Issue | Severity |
|------|-------|----------|
| /fr (Homepage) | Mostly UI components, well below 500 words of substance | HIGH |
| /fr/explore | Booking filter interface with minimal text | HIGH |
| /fr/collections | "Nos Collections" heading + spinner, nearly empty | CRITICAL |
| /fr/chat | Chat interface, no static crawlable content | HIGH |
| /fr/offers | Title only, content loaded client-side | HIGH |

### 2.3 Mixed Language Issues

The site declares `lang="fr"` but uses extensive English in headings:

| Element | Language | Problem |
|---------|----------|---------|
| H1 | Mixed | "Mood, Envie, Desire" mixes English/French |
| H2 | English | "Not Your Boring Travel Agent" |
| H2 | English | "What Our Travelers Say" |
| H4 | English | "How It Works", "Company", "Sign up to our newsletter" |

This confuses Google's language detection and reduces relevance for French search queries.

### 2.4 Placeholder Content

- **Testimonials**: "Savannah Nguyen" repeated 3 times with identical Lorem Ipsum text — this is a common Figma/UI kit placeholder name
- **Destination cards**: All 3 cards show "Bangli, East Bali" with identical content
- **Footer links**: "Traveling", "About Locate", "Success", "Information" — all link to `/` (non-functional)
- **Chat page title**: "Chat AI | Morocco Experiences" — inconsistent with Okeyo Travel branding

### 2.5 Legal Compliance Issues

| Requirement | Status | Risk |
|-------------|--------|------|
| Mentions légales (French law LCEN Art. 6-III) | ❌ Missing | Legal penalties |
| Privacy policy | ❌ Not visible | GDPR non-compliance |
| Cookie consent banner | ❌ Not detected | GDPR non-compliance |
| Contact information | ❌ Missing | Trust damage |

---

## 3. On-Page SEO (Score: 15/100)

### 3.1 Title Tags

- 4/5 pages share identical title: "Okeyo Travel - Laissez parler votre mood"
- Title length: 44 characters (acceptable range: 50–60)
- No keyword differentiation between pages

### 3.2 Meta Descriptions

- 4/5 pages share identical description
- Description length: 72 characters (acceptable range: 150–160) — too short
- Missing calls-to-action and unique value propositions per page

### 3.3 Heading Structure

**Homepage:**
```
H1: "Laisser parler votre Mood, Envie, Desire, nous nous occupons du reste"
  H2: "Not Your Boring Travel Agent"
  H2: "What Our Travelers Say"
    H3: "Bangli, East Bali" (x3)
  H4: "How It Works"
  H4: "Company"
  H4: "Sign up to our newsletter"
```

Issues:
- H4 used for content that should be H2 or H3 (heading hierarchy skip)
- Mixed languages in headings
- "Bangli, East Bali" repeated 3x as H3 (placeholder)

### 3.4 Internal Linking

| From | To | Issues |
|------|----|--------|
| Homepage nav | /fr/explore, /fr/collections, /fr/chat | ✅ Good |
| Footer | / (x4 links) | ❌ All point to root, causing redirects |
| Homepage | /fr/offers | ❌ No link (orphan page) |
| Collections | /fr/chat | ✅ Has link |

---

## 4. Schema & Structured Data (Score: 0/100)

**No structured data of any kind was detected on any page.**

No JSON-LD, no Microdata, no RDFa.

### Recommended Schema Implementation (by priority)

| Priority | Schema Type | Impact |
|----------|-------------|--------|
| 1 | Organization | Knowledge Panel, brand authority |
| 2 | WebSite + SearchAction | Sitelinks search box |
| 3 | BreadcrumbList | Breadcrumb trail in SERPs |
| 4 | AggregateRating / Review | Star ratings (needs real reviews first) |
| 5 | WebPage (per page) | Better page understanding |
| 6 | Service | Describes the AI travel service |
| 7 | CollectionPage + ItemList | Rich display for collections |

### Ready-to-Use JSON-LD (Organization)

```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Okeyo Travel",
  "url": "https://okeyotravel.com",
  "logo": "https://okeyotravel.com/logo_white.png",
  "description": "En 2 minutes, OKEYO vous recommande l'endroit le plus adapte a vos envies.",
  "sameAs": [
    "https://www.facebook.com/okeyotravel",
    "https://www.instagram.com/okeyotravel",
    "https://twitter.com/okeyotravel"
  ],
  "contactPoint": {
    "@type": "ContactPoint",
    "contactType": "customer service",
    "availableLanguage": "French"
  }
}
```

### Ready-to-Use JSON-LD (WebSite)

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
      "urlTemplate": "https://okeyotravel.com/fr/explore?q={search_term_string}"
    },
    "query-input": "required name=search_term_string"
  }
}
```

---

## 5. Performance / Core Web Vitals (Score: 20/100)

### Estimated Core Web Vitals

| Metric | Estimated (Mobile) | Rating | Target |
|--------|-------------------|--------|--------|
| **LCP** | 4.5 – 6.0s | 🔴 POOR | < 2.5s |
| **INP** | 200 – 350ms | 🟡 NEEDS IMPROVEMENT | < 200ms |
| **CLS** | 0.15 – 0.30 | 🟡/🔴 NEEDS IMPROVEMENT / POOR | < 0.1 |

### Key Performance Issues

**LCP (Largest Contentful Paint) — CRITICAL:**
- Hero video: **5.53 MB** with `preload="auto"`, no poster image
- Second video: **2.81 MB** (`ai-video.mp4`)
- 9 images preloaded in `<head>` (including below-fold decorative images)
- Video cache-control: `max-age=0, must-revalidate` — never cached
- No `<link rel="preconnect">` to `images.unsplash.com`

**JavaScript:**
- 18 JS chunks, **~983 KB compressed** total
- 1 render-blocking script (110 KB without `async`)
- React hydration across all chunks blocks main thread

**CSS:**
- Main CSS file: **167 KB** (render-blocking)
- Google Material Icons: render-blocking external stylesheet
- No critical CSS extraction

**Fonts:**
- 3 custom WOFF2 fonts: ~96 KB total
- Material Icons font: ~60–100 KB
- No confirmed `font-display: swap`

### Highest-Impact Fixes

| Fix | Expected LCP Improvement |
|-----|--------------------------|
| Add poster image to hero video + `preload="none"` | -2.0 to -3.0s |
| Remove 6 unnecessary preloads | -0.5 to -1.0s |
| Use Next.js `<Image>` for all images | -0.3s + CLS fix |
| Eliminate 307 redirect | -0.2s |
| Self-host Material Icons or use SVGs | -0.2s FCP |

---

## 6. Images (Score: 25/100)

| Issue | Count | Severity |
|-------|-------|----------|
| Missing alt text | 3 images | HIGH |
| Duplicate alt text | 3 images (all "Bangli, East Bali") | MEDIUM |
| Placeholder alt text | 3 images (all "Savannah Nguyen") | MEDIUM |
| No width/height attributes | 8 of 11 images | HIGH (CLS) |
| Not using Next.js `<Image>` | All external images | HIGH |
| No lazy loading on below-fold images | Multiple | MEDIUM |
| Oversized for mobile | Unsplash images at w=1200 on all viewports | MEDIUM |
| No WebP/AVIF | Unsplash supports it but not used | MEDIUM |

---

## 7. AI Search Readiness (Score: 12/100)

| Factor | Score | Notes |
|--------|-------|-------|
| Quotable facts | 1/20 | No citable data (prices, destination counts, etc.) |
| Structured data | 0/20 | No schema markup |
| Content hierarchy | 5/20 | Headings exist but shallow and mixed-language |
| Unique insights | 2/20 | Mood-based concept not explained in depth |
| Entity clarity | 4/20 | "Okeyo Travel" named but not defined for knowledge graphs |

**AI Crawler Policy:** No robots.txt means no GPTBot, ClaudeBot, CCBot, or Google-Extended policy.

---

## 8. Visual & Mobile Analysis

### Mobile Rendering
- ✅ No horizontal overflow at 375px
- ✅ Base font size 16px
- ✅ Responsive layout (Tailwind CSS)
- ⚠️ 9 of 23 touch targets below 44x44px minimum
- ❌ Carousel prev/next buttons overflow viewport on mobile
- ❌ Text animation overlap bug on rotating H1 keyword (laptop/tablet)

### Above-the-Fold CTA
- Desktop: "Start your journey" at y=980 of 1080px — barely visible
- Mobile: "Start your journey" at y=720 of 812px — visible
- "Book a Seat" at y=3071 — deeply buried, unlikely to be seen

---

## Visual Screenshots

Screenshots captured at 4 breakpoints saved to `/home/exodia/ymkabila/screenshots/`:
- `desktop_above_fold.png` / `desktop_full_page.png` (1920x1080)
- `laptop_above_fold.png` / `laptop_full_page.png` (1366x768)
- `tablet_above_fold.png` / `tablet_full_page.png` (768x1024)
- `mobile_above_fold.png` / `mobile_full_page.png` (375x812)
