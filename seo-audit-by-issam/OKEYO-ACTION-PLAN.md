# Okeyo Travel SEO — Action Plan

**Site:** https://stage.okeyotravel.com/
**Generated:** 2026-02-22
**Overall SEO Health Score:** 24/100

---

## CRITICAL — Fix Immediately (Blocks Indexing)

### C1. Create robots.txt
- Currently returns 404
- Create `app/robots.ts` in Next.js:
  - Allow all public paths
  - Disallow `/api/`, `/dashboard/`, `/admin/`
  - Reference sitemap URL
  - Add AI crawler rules (GPTBot, ClaudeBot, CCBot, Google-Extended)

### C2. Create sitemap.xml
- Currently returns 404
- Create `app/sitemap.ts` covering all locale-prefixed routes
- Include `<xhtml:link rel="alternate" hreflang>` annotations
- Submit to Google Search Console once live

### C3. Add unique title tags and meta descriptions per page
- 4 of 5 pages share identical metadata
- Use Next.js `generateMetadata()` per route:

| Page | Suggested Title | Suggested Meta Description |
|------|----------------|---------------------------|
| /fr | Okeyo Travel — Trouvez votre destination selon votre humeur | En 2 minutes, dites-nous votre mood et Okeyo vous recommande la destination idéale. Planification personnalisée par IA. |
| /fr/explore | Explorer les destinations — Okeyo Travel | Filtrez par lieu, activité et dates pour trouver votre prochain voyage. Recommandations personnalisées selon vos envies. |
| /fr/collections | Nos Collections de voyages — Okeyo Travel | Découvrez nos collections de destinations triées par thème : aventure, détente, culture et plus encore. |
| /fr/chat | Assistant voyage IA — Okeyo Travel | Discutez avec notre assistant IA pour planifier votre voyage sur mesure en quelques minutes. |
| /fr/offers | Offres de voyage — Okeyo Travel | Découvrez nos meilleures offres et expériences de voyage sélectionnées pour vous. |

### C4. Add canonical tags to every page
- No `<link rel="canonical">` on any page
- Add via Next.js `metadata.alternates.canonical` per route
- Example: `https://okeyotravel.com/fr/explore`

### C5. Implement structured data (JSON-LD)
- Zero structured data currently detected
- **Minimum viable:** Organization + WebSite schemas in root layout
- **Phase 2:** BreadcrumbList per page, WebPage per page
- **Phase 3:** Service, Review/AggregateRating (needs real reviews first)
- See `FULL-AUDIT-REPORT.md` for ready-to-use JSON-LD code

### C6. Replace placeholder content
- **Testimonials:** "Savannah Nguyen" repeated 3x with Lorem Ipsum — replace with real reviews or remove section
- **Destination cards:** All 3 show "Bangli, East Bali" — replace with real destinations
- **Footer links:** "Traveling", "About Locate", "Success", "Information" all point to `/` — fix or remove
- **Chat page title:** "Morocco Experiences" — align with Okeyo Travel branding

---

## HIGH — Significant Ranking Impact

### H1. Fix hero video performance (LCP: 4.5–6.0s → target <2.5s)
- Hero video is **5.53 MB** with `preload="auto"` and no poster
- Actions:
  - Extract first frame as WebP poster image (~30–50 KB)
  - Change `preload="auto"` to `preload="none"`
  - Lazy-load video via Intersection Observer
  - Compress video with ffmpeg (target <1.5 MB)
  - Set `Cache-Control: public, max-age=31536000, immutable` on video

### H2. Add security headers
- 5 of 6 critical security headers missing
- Add to `next.config.ts` or Vercel config:
  ```
  X-Frame-Options: SAMEORIGIN
  X-Content-Type-Options: nosniff
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  ```
- Set `poweredByHeader: false` in next.config.ts

### H3. Server-render collection and offer data
- `/fr/collections` renders only a spinner SSR — crawlers see empty page
- `/fr/offers` same issue
- Move data fetching to Server Components so content is in initial HTML

### H4. Fix preload strategy (too many preloads)
- 9 images preloaded including below-fold decorative images
- Remove preloads for: `ai-pattern.png`, `testimonial-pattern.svg`, 3x avatar images
- Keep only above-fold hero/LCP resource preload
- Add missing `<link rel="preconnect">`:
  - `https://images.unsplash.com`
  - `https://fonts.gstatic.com`
  - `https://connect.facebook.net`

### H5. Add Open Graph and Twitter Card meta tags
- No social sharing markup on any page
- Add per-page: `og:title`, `og:description`, `og:image`, `og:url`, `twitter:card`

### H6. Standardize language to French on /fr routes
- Multiple English headings on a French-declared page
- Translate all H2/H3/H4 headings to French
- "Not Your Boring Travel Agent" → French equivalent
- "What Our Travelers Say" → "Ce que disent nos voyageurs"
- "How It Works" → "Comment ça marche"

---

## MEDIUM — Optimization Opportunities

### M1. Fix URL structure issues
- Change root redirect from 307 to 308 (permanent)
- Fix 4 footer links from `/` to `/fr`
- Add `/fr/offers` to main navigation (currently orphaned)

### M2. Add hreflang tags
- Site uses `/fr` prefix implying multi-language intent
- Implement `<link rel="alternate" hreflang="fr" href="...">` on all pages
- Add `hreflang="x-default"` pointing to `/fr` (or future language selector)

### M3. Use Next.js `<Image>` for all images
- External Unsplash images bypass optimization (no WebP/AVIF, no srcset)
- Add `images.unsplash.com` to `next.config.js` `remotePatterns`
- Add explicit `width`/`height` to prevent CLS
- Add `loading="lazy"` to below-fold images

### M4. Optimize CSS delivery
- Main CSS file: 167 KB render-blocking
- Extract critical CSS for above-the-fold (~15–20 KB)
- Self-host Material Icons or replace with inline SVGs

### M5. Add noindex to staging environment
- Staging site should not be indexed
- Add `<meta name="robots" content="noindex, nofollow">` via environment variable
- Remove before production launch

### M6. Fix mobile touch targets
- 9 of 23 interactive elements below 44x44px minimum
- Hamburger menu icon: 40x36px → increase to 48x48px
- Footer social buttons: 40x40px → increase to 48x48px

### M7. Fix carousel on mobile
- Prev/Next buttons overflow 375px viewport
- Cards partially cut off
- Implement proper responsive carousel behavior

### M8. Fix text animation overlap bug
- H1 rotating keyword (MOOD/ENVIE/DESIRE) shows overlapping text on laptop/tablet
- Ensure exit animation completes before enter animation starts

---

## LOW — Nice to Have (Backlog)

### L1. Legal compliance (French law)
- Add "mentions légales" page (required by LCEN Art. 6-III)
- Add privacy policy page
- Implement GDPR cookie consent banner
- Add contact information (address, email, phone)

### L2. Build E-E-A-T signals
- Create "About Us" page with team bios and travel credentials
- Explain AI recommendation methodology
- Add real partnerships and industry affiliations
- List ASTA/IATA/ATOUT France memberships if applicable

### L3. Content depth
- Homepage needs 500+ words of substantive content
- Add destination guides, travel tips, FAQ section
- Add pricing/plan transparency
- Create blog/editorial content for organic traffic

### L4. AI search readiness
- Add quotable facts (destination counts, success rates, etc.)
- Implement FAQ schema (if eligible)
- Create `llms.txt` file
- Configure AI crawler rules in robots.txt

### L5. Optimize JavaScript bundles
- 18 chunks totaling ~983 KB compressed
- Make render-blocking script async
- Use `next/dynamic` for below-fold components
- Defer Facebook Pixel until after page load

### L6. Font loading optimization
- Ensure `font-display: swap` on all fonts
- Self-host Material Icons (only used glyphs)

### L7. Improve CTA placement
- "Start your journey" barely visible on desktop (y=980 of 1080px)
- "Book a Seat" buried at y=3071 — consider repeating higher
- Move primary CTA higher on desktop layout

---

## Estimated Score Impact

| Priority | Items | Expected Impact | Projected Score |
|----------|-------|-----------------|-----------------|
| Current | — | — | 24/100 |
| After Critical (C1–C6) | 6 items | +30 | ~54/100 |
| After High (H1–H6) | 6 items | +20 | ~74/100 |
| After Medium (M1–M8) | 8 items | +14 | ~88/100 |
| After Low (L1–L7) | 7 items | +8 | ~96/100 |

---

## Implementation Order (Recommended)

**Phase 1 — Foundation (before any SEO campaign):**
C1, C2, C3, C4, C5, C6, H2, H5, M5

**Phase 2 — Performance & Rendering:**
H1, H3, H4, M3, M4

**Phase 3 — Content & Language:**
H6, M1, M2, M6, M7, M8

**Phase 4 — Growth:**
L1, L2, L3, L4, L5, L6, L7
