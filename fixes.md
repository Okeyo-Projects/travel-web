# SEO Fixes — Design Doc

Source audit: [FULL-AUDIT-REPORT-2026-04-27.html](FULL-AUDIT-REPORT-2026-04-27.html)
Target score lift: **65 → ~80** after PRs 1–3 ship.

Bundling:
- **PR 1** — Critical fixes (this week, ~3h)
- **PR 2** — URL refactor cleanup (urgent, ~3h)
- **PR 3** — Perf + GEO batch (~2h)
- **PR 4** — E-E-A-T + content (~9h)
- **PR 5** — Medium polish (1 month)

---

## PR 1 — Critical fixes

### C1. Blog canonical points to `/fr/` from EN+AR (40 URLs)

**Root cause.** [src/lib/routing/locale-path.ts:101](src/lib/routing/locale-path.ts#L101) — `buildLocaleAlternates(href, canonicalLocale = DEFAULT_LOCALE)` always emits `canonical = /fr/...` regardless of which locale is rendering the page. Blog pages call it without overriding, so EN and AR pages declare a FR canonical. Cascade effect: per Google's hreflang spec, hreflang tags on a page whose canonical points elsewhere are silently ignored — so the entire blog i18n graph is broken on the same 40 URLs.

**Design.** Two options; pick **Option B** (lower blast radius).

- **Option A (semantic shift):** flip the default so `canonical` follows the rendering locale. Risk: experience and home pages currently rely on the FR-canonical behavior; would need a sweep.
- **Option B (caller-explicit, recommended):** keep the function signature but pass the current `locale` from the three blog pages. No change to other callers.

**Files to change:**
- [src/app/blog/[slug]/page.tsx:47](src/app/blog/%5Bslug%5D/page.tsx#L47) — `buildLocaleAlternates(\`/blog/${slug}\`, locale)`
- [src/app/blog/page.tsx](src/app/blog/page.tsx) — same pattern in `generateMetadata`
- [src/app/blog/category/[slug]/page.tsx](src/app/blog/category/%5Bslug%5D/page.tsx) — same

**Follow-up audit of `buildLocaleAlternates` callers.** Grep for it; for any page where canonical *should* be self-referential (i.e. every page except the explicit FR-priority routes), pass `locale` explicitly. Add a JSDoc note that the second arg should normally be the current locale.

**Verify.**
```sh
for L in fr en ar; do
  curl -s "https://okeyotravel.com/$L/blog/voyage-maroc-prix-budget" \
    | grep -oE '<link rel="canonical"[^>]+>'
done
# Expect each canonical to match its own locale.
```

---

### C2. Add 15 missing translation keys (i18n leak — 60 visible defects on /privacy, 24 on /home + /explore)

**Root cause.** Privacy page renders raw keys (`legal.privacy.title`, `legal.page.section`, `legal.page.lastUpdated`, `legal.page.home`, `legal.page.explore`, `legal.page.onThisPage`, etc.). Testimonial avatars render `alt="home.testimonials.carousel.avatarAlt"` — same string used as a literal alt for 8 avatars × 3 locales.

**Design.**
1. **Add keys** to [src/locales/](src/locales/) JSON files (`fr.json`, `en.json`, `ar.json`). Per-key FR/EN/AR translations are spelled out in the audit's "Dev Spec" section — copy verbatim.
2. **Parameterize the avatar alt.** Where the testimonial component currently does `alt={t('home.testimonials.carousel.avatarAlt')}`, change to `alt={t('home.testimonials.carousel.avatarAlt', { name: testimonial.author })}` so each avatar gets a unique, descriptive alt (`"Photo of Sarah L."` etc.). The translation value should use ICU param syntax: `"Photo of {name}"`.
3. **Durable guardrail (CI):** add a snapshot/regex test that fails the build if rendered HTML for `/fr`, `/en`, `/ar`, `/privacy`, `/blog` contains the i18n-key shape `>foo.bar.baz<` or `="foo.bar.baz"`. Cheap one-shot Playwright or even a `bun run` script hitting the dev server.

**Verify.**
```sh
curl -s https://okeyotravel.com/fr/privacy | grep -E 'legal\.|home\.testimonials' | wc -l   # → 0
curl -s https://okeyotravel.com/en | grep -c 'home.testimonials.carousel.avatarAlt'         # → 0
```

---

### C3. 404 page: robots conflict + strip canonical/hreflang (5 min, flagged 4 audits in a row)

**Root cause.** [src/app/not-found.tsx](src/app/not-found.tsx) is a Server Component with no `metadata` export. Next.js falls back to the parent layout's metadata, which ships `robots: "index, follow"` plus `canonical` + 4 hreflangs. The page also responds with a Next.js-injected `<meta name="robots" content="noindex">`, producing two conflicting robots tags. 404 responses MUST omit canonical and hreflang per Google guidelines.

**Design.** Add an explicit metadata export at the top of [src/app/not-found.tsx](src/app/not-found.tsx):

```ts
import type { Metadata } from "next";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  alternates: {},      // overrides parent canonical/hreflang
  // title/description left to parent or set per-locale via the resolved t()
};
```

`alternates: {}` (empty object) is the cleanest way in Next.js App Router to *omit* canonical + languages without inheriting. Verify behavior in Next 15+: if it still inherits, use a route-level layout wrapper instead.

**Sanity also check:** `not-found.tsx` does not wire `<h1>` issues — current code already has `<h1>` (line 19), so the audit's "0 H1 on 404" claim should be re-verified post-deploy. If still 0, it's because Next.js renders `not-found.tsx` inside the root layout that wraps content differently — investigate.

**Verify.**
```sh
curl -s https://okeyotravel.com/fr/experience/does-not-exist-99 | grep -c '<meta[^>]*robots'   # → 1
curl -s https://okeyotravel.com/fr/experience/does-not-exist-99 | grep -c 'rel="canonical"'   # → 0
curl -s https://okeyotravel.com/fr/experience/does-not-exist-99 | grep -c 'hreflang'          # → 0
```

---

### C5. EN+AR blog body is 100% French (30 URLs)

**Root cause.** [src/app/blog/[slug]/page.tsx:33](src/app/blog/%5Bslug%5D/page.tsx#L33) calls `fetchPostBySlug(slug)` against the WordPress backend with no locale parameter. Backend has no Polylang/WPML, so all locales receive the same FR post.

**Design.** Two-track:

- **Track A (proper, recommended): WordPress translations.** Activate Polylang or WPML on the backend (`travel-wordpress.7xzjgo.easypanel.host`). Translate all 10 articles + 4 categories to EN+AR. Update [src/lib/wordpress.ts](src/lib/wordpress.ts) `fetchPostBySlug` to accept a `locale` parameter and pass it to the WP REST endpoint (`?lang=en` for Polylang, custom param for WPML). Update all 3 blog page files to pass `locale`.
- **Track B (stopgop, deploy in PR 1 if A slips):** add `noindex` to `/en/blog/*` and `/ar/blog/*` and remove from sitemap until translations land. Mismatched-language indexing is worse than no indexing.

```ts
// In each blog page's generateMetadata, when track B:
return {
  ...,
  robots: locale === "fr" ? undefined : { index: false, follow: false },
};
```

```ts
// In src/app/sitemap.ts blog block:
blogPostRoutes = wpPosts.value.flatMap(({ slug, modified }) =>
  // Only emit FR until EN/AR translations exist
  [{ url: `${SITE_URL}${localizeHref(`/blog/${slug}`, "fr")}`, ... }]
);
```

**Decision required from product** before code lands: A or B.

---

## PR 2 — URL refactor cleanup (urgent)

### C6. Strip 8-char hash from canonical helper

**Root cause.** [src/lib/routing/slugs.ts:61](src/lib/routing/slugs.ts#L61) — `buildExperienceSlug` always appends `-${getExperienceIdSegment(id)}` (the 8-char prefix of the UUID) when `input.slug` is *not* set. Sitemap and canonical both use this helper, so they should match. But the audit found the sitemap publishes the no-hash form while canonical publishes the with-hash form — meaning **a separate canonical helper exists somewhere** (likely inline in `src/app/hebergement/[region]/[city]/[slug]/page.tsx`) that re-derives the slug differently.

**Design.**
1. Locate the experience-page canonical builder; consolidate it to use `buildExperienceHref` from [src/lib/routing/slugs.ts](src/lib/routing/slugs.ts) (single source of truth).
2. **Pick one form: no-hash (recommended).** Rationale: cleaner, matches sitemap publication, properties have human-readable slugs already; the hash is only a uniqueness fallback for collision. Add a uniqueness check at slug-generation time instead.
3. Update `buildExperienceSlug` so that when `input.slug` exists, no hash is appended (already true) and when slug is generated from title, append hash *only* if a collision is detected at write time. For now, keep current behavior but ensure canonical equals sitemap URL.
4. **Migration:** with-hash URLs continue to return 200 (no redirect needed). Google will consolidate via canonical. Optionally add a 301 from with-hash → no-hash for cleanliness.

**Verify.**
```sh
SITEMAP_URL=$(curl -s https://okeyotravel.com/sitemap.xml | grep -oE 'https://[^<]*mouflon-ouirgane[^<]*' | head -1)
CANONICAL=$(curl -s "$SITEMAP_URL" | grep -oE 'rel="canonical" href="[^"]+"' | head -1)
echo "$SITEMAP_URL"; echo "$CANONICAL"
# Two URLs should match exactly.
```

---

### C7. Kill the `/en/hebergement/` dual path

**Root cause.** Both `/en/accommodation/...` and `/en/hebergement/...` return 200 — the `[region]/[city]/[slug]` route in [src/app/hebergement/](src/app/hebergement/) accepts requests under any locale prefix, so the EN word `accommodation` (added by `localizeExperiencePath` in [src/lib/routing/locale-path.ts:19](src/lib/routing/locale-path.ts#L19)) routes via a rewrite to the `hebergement` filesystem path AND the literal `hebergement` segment also resolves. Worse: the audit confirms `/en/explore` internal links emit `href="/en/hebergement/..."` — the FR-word form — meaning users are landing on the non-canonical URL.

**Design.**
1. **Middleware rewrite or 301.** In [src/middleware.ts](src/middleware.ts), if `pathname` matches `^/en/hebergement/...`, return `NextResponse.redirect(pathname.replace('/en/hebergement/', '/en/accommodation/'), 308)`. Permanent — preserves crawl signals.
2. **Fix the link generator on `/en/explore`.** Find the experience-card href emission (likely `src/components/explore/ExperienceCard.tsx` or similar). It must call `localizeHref(localizeExperiencePath(internalPath, locale), locale)` — the same combo the sitemap uses ([src/app/sitemap.ts:155](src/app/sitemap.ts#L155)). Currently only one of those two transforms is applied.
3. Audit other internal nav: footer, breadcrumbs, related-experience rails. Same fix.

**Verify.**
```sh
curl -sI https://okeyotravel.com/en/hebergement/marrakech-safi/marrakech/mouflon-ouirgane | head -1
# Expect: HTTP/2 308
curl -s https://okeyotravel.com/en/explore | grep -oE 'href="/en/(hebergement|accommodation)/[^"]+"' | sort -u
# Expect: only /en/accommodation/...
```

---

### C8. Filter unpublished/test properties from sitemap (3 URLs return 404)

**Root cause.** [src/app/sitemap.ts:107](src/app/sitemap.ts#L107) already filters `status === "published"`, yet 3 URLs containing `test-version-d717b4c1` are in the sitemap. Two possibilities:
1. A test row exists with `status: "published"` (data hygiene problem).
2. Some properties have null/missing `region` or `city`, which get slugified to empty strings, producing malformed URLs that 404 in routing.

**Design.**
1. **Tighten the Supabase select** to also exclude rows missing essential fields:
   ```ts
   .eq("status", "published")
   .not("city", "is", null)
   .not("title", "is", null)
   ```
2. **In-code filter** after fetch: drop any experience where the resolved region or city slug is empty:
   ```ts
   experienceRoutes = experiences
     .filter((exp) => exp.city && exp.title && !exp.title.toLowerCase().includes("test"))
     .flatMap(...)
   ```
3. **Investigate the `test-version` row** in DB — should be `status: 'draft'`. Fix the row, not just the sitemap.
4. **Add a CI smoke test:** after sitemap generation, HEAD every URL and fail if any returns non-200.

**Verify.**
```sh
curl -s https://okeyotravel.com/sitemap.xml | grep -c 'test-version'   # → 0
curl -s https://okeyotravel.com/sitemap.xml \
  | grep -oE 'https://[^<]+' \
  | xargs -P 8 -I{} sh -c 'echo "$(curl -sI -o /dev/null -w "%{http_code}" "{}") {}"' \
  | grep -v '^200'   # → empty
```

---

### C9. URL typos at the data layer (`marrekch`, `lala-takerkousst`)

**Root cause.** Property rows in Supabase have typo'd `region` or `city` text values; [src/lib/routing/slugs.ts:79](src/lib/routing/slugs.ts#L79) faithfully slugifies the typo, baking it into the URL. Once Google indexes these, every fix needs a 301.

**Design.**
1. **Data fix.** `UPDATE experiences SET city = 'lalla-takerkoust' WHERE city ILIKE 'lala-takerkousst';` (verify list with the team, do not run blindly).
2. **CI guardrail.** Add `src/lib/routing/known-places.ts` exporting `KNOWN_REGIONS` and `KNOWN_CITIES` arrays (Marrakech-Safi, Casablanca-Settat, … + Marrakech, Essaouira, Chefchaouen, Ouirgane, Imlil, Asni, Setti-Fatma, Ourika, Merzouga, …). On sitemap build, log a warning (or fail in CI) for any experience whose slugified region/city isn't in the known list.
3. **Redirect pre-existing URLs.** In [src/middleware.ts](src/middleware.ts), maintain a small `LEGACY_REDIRECTS` map of typo → correct slug; emit 301.

**Verify.**
```sh
curl -sI https://okeyotravel.com/fr/hebergement/marrakech-safi/marrekch/<slug> | head -1   # → 301
```

---

### C10. Reassign Atlas properties to correct city slugs

**Root cause.** Mouflon Ouirgane (actually in Ouirgane), Auberge Riad Jnan Imlil (Imlil), Riad Saida Atlas, Auberge Atlas Mazik Lodge are all stored with `city = 'marrakech'`. Local-SEO loss: searches for "auberge à Ouirgane", "riad Imlil", "Atlas mountain lodge" don't match.

**Design.**
1. **Data update** (per-property, with the team confirming each):
   - Mouflon Ouirgane → `city = 'ouirgane'`, `region = 'marrakech-safi'`
   - Auberge Riad Jnan Imlil → `city = 'imlil'`
   - Riad Saida Atlas → confirm exact town
   - Auberge Atlas Mazik Lodge → confirm exact town
2. **Add Atlas towns to `KNOWN_CITIES`** (from C9): `ouirgane`, `imlil`, `setti-fatma`, `ourika`, `asni`, `merzouga`.
3. **Migration redirects.** Old URL `…/marrakech/mouflon-ouirgane` → 301 → `…/ouirgane/mouflon-ouirgane`. Implement in middleware via a generated map (build-time read of "old → new" produced from the data migration).
4. Update `LodgingBusiness` JSON-LD (PR 4 H3) with corrected `addressLocality`.

---

## PR 3 — Perf + GEO batch

### H4. og:locale + Supabase preconnect + Next/Image priority

**Files.** [src/app/layout.tsx](src/app/layout.tsx) (or per-locale layout if one exists), Logo component.

**Design.**
1. **og:locale** — emit per-render-locale value:
   ```tsx
   // in generateMetadata of the root/layout that knows the current locale
   const ogLocaleMap = { fr: "fr_FR", en: "en_US", ar: "ar_MA" } as const;
   openGraph: {
     locale: ogLocaleMap[locale],
     alternateLocale: Object.entries(ogLocaleMap)
       .filter(([k]) => k !== locale)
       .map(([, v]) => v),
   }
   ```
2. **Supabase preconnect** — hard-coded host in `<head>`:
   ```tsx
   <link rel="preconnect" href="https://nfqamqrxgpyuhjhedllg.supabase.co" crossOrigin="" />
   <link rel="dns-prefetch" href="https://nfqamqrxgpyuhjhedllg.supabase.co" />
   ```
   Move host to env var (`NEXT_PUBLIC_SUPABASE_URL`) read at build.
3. **Logo `priority`** — find the Logo component, add `priority` to its `<Image>`. Next.js auto-emits `fetchpriority="high"` + `<link rel="preload">`. Same on the first hero/featured-experience image (above-fold).

**Verify.**
```sh
curl -s https://okeyotravel.com/en | grep -oE '(og:locale|preconnect|fetchpriority)[^>]*'
```

---

### H6. `/llms.txt` (15 min)

**Files.** [public/llms.txt](public/llms.txt) (new).

**Design.** Static file with the exact content from the audit (PR 3 / H6 block of the audit HTML). Optionally also `public/llms-full.txt` with the full content tree dumped from sitemap. Re-generate weekly with a script in [scripts/](scripts/) — but defer that automation; ship the static file first.

**Verify.** `curl -sI https://okeyotravel.com/llms.txt | head -1` → 200, `Content-Type: text/plain`.

---

### H5. Cron warmer for `/ar`, `/en/explore`, `/ar/explore`, `/ar/blog`

**Design.** Vercel Cron (or external uptime check) every 30 min, fetching the 4 cold URLs from a European region. If using Vercel Cron, add to [next.config.ts](next.config.ts) crons section + an [src/app/api/cron/warm/route.ts](src/app/api/cron/warm/route.ts) that fetches each URL server-side and returns 200.

```ts
// src/app/api/cron/warm/route.ts
export async function GET() {
  const urls = ["/ar", "/en/explore", "/ar/explore", "/ar/blog"];
  await Promise.all(urls.map((u) =>
    fetch(`https://okeyotravel.com${u}`, { cache: "no-store" })
  ));
  return Response.json({ ok: true });
}
```

Protect with `CRON_SECRET` header check.

**Verify.** TTFB on cold load drops below 800 ms within 1 day (check Vercel analytics).

---

### H1. Re-verify experience description not double-rendered

Post-URL-refactor sanity check.

```sh
curl -s https://okeyotravel.com/fr/hebergement/marrakech-safi/marrakech/mouflon-ouirgane \
  | grep -c "auberge authentique"   # → 1 (was 2)
```

If still 2, check the experience detail component for a mobile/desktop dual-render pattern (e.g., two `<div>`s with `hidden md:block` / `md:hidden` rendering the same description). Replace with a single `<div>` styled responsively via CSS.

---

## PR 4 — E-E-A-T + content

### H2. Author bylines + Person/Org schema + dateModified on BlogPosting

**Files.** [src/app/blog/[slug]/page.tsx](src/app/blog/%5Bslug%5D/page.tsx) (JsonLd block already exists at line 115; needs enrichment).

**Design.**
1. **Visible byline + dates** in the article HTML (already partially present at lines 171–184 — verify it actually renders given WordPress data; if `post.author.name` is missing, fall back to `"Équipe Okeyo Travel"`).
2. **JSON-LD enrichment.** Update the `BlogPosting` block:
   ```ts
   {
     "@type": "BlogPosting",
     headline: plainTitle,
     author: post.author.name
       ? { "@type": "Person", name: post.author.name, url: `${SITE_URL}/${locale}/about` }
       : { "@type": "Organization", name: "Okeyo Travel", url: `${SITE_URL}/${locale}/about` },
     datePublished: post.date,
     dateModified: post.modified ?? post.date,
     publisher: { "@type": "Organization", name: "Okeyo Travel", logo: { "@type": "ImageObject", url: `${SITE_URL}/logo.png` } },
     mainEntityOfPage: postUrl,
     inLanguage: locale,
   }
   ```
3. **Long-term:** create `/[locale]/author/[slug]` pages with bios + social profiles for each contributing author (Person schema with `sameAs`).

---

### H3. Enrich LodgingBusiness schema

**File.** Wherever the experience-page JSON-LD is built (likely `src/components/seo/lodging-jsonld.tsx` or inline in the experience page).

**Design.** Extend with:
```ts
{
  "@type": "LodgingBusiness",
  name, description, image, url,
  address: { "@type": "PostalAddress", addressLocality: city, addressRegion: region, addressCountry: "MA" },
  geo: { "@type": "GeoCoordinates", latitude: exp.lat, longitude: exp.lng },
  amenityFeature: exp.amenities.map((a) => ({ "@type": "LocationFeatureSpecification", name: a, value: true })),
  checkinTime: "15:00",
  checkoutTime: "11:00",
  priceRange: exp.priceRange ?? "€€",
  offers: {
    "@type": "Offer",
    price: exp.priceFromMad,
    priceCurrency: "MAD",
    availability: "https://schema.org/InStock",
    url,
  },
  // aggregateRating: defer until reviews come online
}
```

Requires schema additions to the `experiences` table: `lat`, `lng`, `price_from_mad`, `price_range`, `amenities` (jsonb).

---

### H7. "Réponse rapide" block on each blog post (134–167 words)

**Design.** WordPress-side change: add a custom field `quick_answer` (Gutenberg block or ACF field) on each post. Frontend renders it as the first element of the article body in [src/app/blog/[slug]/page.tsx](src/app/blog/%5Bslug%5D/page.tsx) — between the title block (line 186) and `dangerouslySetInnerHTML` content (line 205).

```tsx
{post.quickAnswer && (
  <aside className="quick-answer rounded-xl border bg-amber-50 p-4 sm:p-6">
    <div dangerouslySetInnerHTML={{ __html: sanitizeHtml(post.quickAnswer) }} />
  </aside>
)}
```

Editorial work: write a 134–167 word answer for each of 10 articles (see audit for `voyage-maroc-prix-budget` template).

---

## PR 5 — Medium polish

| ID | Task | Files / Notes |
|---|---|---|
| **M1** | `<image:image>` namespace in [src/app/sitemap.ts](src/app/sitemap.ts). Next.js' built-in sitemap doesn't support image namespace — switch to a custom `route.ts` returning XML, or generate a separate `/image-sitemap.xml`. Include 26 experience hero photos + 10 blog covers. |
| **M2** | Thin blog category pages (139 words on `/fr/blog/category/marrakech`). Either add 200–300 word intro per category in WordPress, or `noindex` + drop from sitemap. 4 categories × 3 locales = 12 URLs. |
| **M3** | SSR-render first 3 gallery photos on experience pages. Currently JS-hydrated → invisible to AI crawlers. Render at least 3 with descriptive alts (`"Mouflon Ouirgane — piscine extérieure"`). |
| **M4** | Visible `<nav aria-label="breadcrumb">` on experience + blog post pages. JSON-LD already present. |
| **M5** | Width/height on `ExperienceCard` images. Investigate why Next.js `<Image>` isn't setting these — likely `fill` mode without explicit aspect ratio. Fix CLS. |
| **M6** | Cross-link blog posts within categories. "Articles liés" rail at bottom of each post (3 related from same category). Likely already partially done via `SimilarBlogs` at [src/app/blog/[slug]/page.tsx:210](src/app/blog/%5Bslug%5D/page.tsx#L210) — verify it's emitting + restrict to same category. |
| **M7** | GSC sitemap resubmit after C1–C5 ship. 5-min manual step. |
| **M8** | Reconsider `x-default` → `/en/`. Current helpers point `x-default` to `/fr/`; the audit recommends `/en/` for a broader international fallback. If product agrees, update `buildLocaleAlternates` and `buildExperienceAlternates` in [src/lib/routing/locale-path.ts](src/lib/routing/locale-path.ts), then verify every page still emits valid FR/EN/AR alternates. |
| **L1** | Strip `<priority>` + `<changefreq>` from [src/app/sitemap.ts](src/app/sitemap.ts). Both ignored by Google since 2017. Maintenance noise only. |
| **L2** | Add `ImageObject` schema on blog and experience hero photos. Blog posts should expose featured image metadata in `BlogPosting.image`; experience pages should enrich `LodgingBusiness.image` or add `primaryImageOfPage` where appropriate. Include URL, caption/name, and width/height when available. |
| **L3** | Add `ReserveAction` / booking action schema on experience pages once the booking flow is stable. Wire the schema to the canonical experience URL and booking CTA, but defer until booking availability and pricing data are reliable enough for structured data. |
| **L4** | CI guard for i18n key leaks. Add a smoke test or script that renders representative pages (`/fr`, `/en`, `/ar`, `/privacy`, `/blog`) and fails when visible HTML contains raw key patterns such as `>foo.bar.baz<` or `="foo.bar.baz"`. This is also mentioned as the durable guardrail in C2. |
| **L5** | Audit JS bundle on `/explore`. Run the Next.js bundle analyzer, identify code-split candidates around search, modal, video/gallery, chat-adjacent utilities, and any heavy client-only dependencies. Track the outcome against INP and initial JS size. |

---

## Audit notes with no immediate code change

- **Support FAQ schema:** keep the existing `FAQPage` JSON-LD on `/support`. Google no longer gives broad FAQ rich results, but the audit recommends keeping it because LLMs and AI search surfaces still parse FAQ schema for citations.
- **Organization `sameAs`:** current Organization schema has limited external identity signals. Add LinkedIn, Facebook, YouTube, and Instagram URLs to `sameAs` once those profiles are live and credible. This depends on the marketing/GEO work below rather than a standalone dev-only fix.

---

## Out of scope (marketing / GEO)

The audit's **G1–G5** items (Reddit/Wikipedia/YouTube presence for AI-citation visibility) are non-engineering. Surface to the marketing team; track separately.

---

## Verification matrix (post-deploy)

```sh
# C1
for L in fr en ar; do
  curl -s "https://okeyotravel.com/$L/blog/voyage-maroc-prix-budget" \
    | grep -oE '<link rel="canonical"[^>]+>' | head -1
done

# C2
curl -s https://okeyotravel.com/fr/privacy | grep -E 'legal\.|home\.' | wc -l   # 0
curl -s https://okeyotravel.com/en | grep -c 'avatarAlt'                       # 0

# C3
curl -s https://okeyotravel.com/fr/experience/does-not-exist-99 \
  | grep -cE '<meta[^>]*robots|rel="canonical"|hreflang'                       # 1 (just noindex)

# C6
diff <(curl -s https://okeyotravel.com/sitemap.xml | grep mouflon-ouirgane | head -1) \
     <(curl -s "$(curl -s https://okeyotravel.com/sitemap.xml | grep -oE 'https://[^<]*mouflon[^<]*' | head -1)" \
        | grep -oE 'rel="canonical" href="[^"]+"')

# C7
curl -sI https://okeyotravel.com/en/hebergement/marrakech-safi/marrakech/mouflon-ouirgane | head -1   # 308

# C8
curl -s https://okeyotravel.com/sitemap.xml | grep -c 'test-version'           # 0

# H4
curl -s https://okeyotravel.com/en | grep -oE 'og:locale|preconnect|fetchpriority' | sort -u

# H6
curl -sI https://okeyotravel.com/llms.txt | head -1   # 200
```

---

## Decisions needed before coding

1. **C5:** Polylang/WPML setup (track A) or temporary `noindex` (track B)?
2. **C6:** confirm no-hash form is preferred (recommended) — otherwise pick with-hash and update sitemap to match.
3. **C9, C10:** team review of the typo + miscoding fixes per property before running data updates.
