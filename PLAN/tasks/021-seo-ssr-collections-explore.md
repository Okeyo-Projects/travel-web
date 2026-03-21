---
id: "021"
title: "SEO SSR: Server-render collections and explore pages so crawlers see content"
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

`/collections` renders only a spinner server-side — Google crawlers see an empty page. `/explore` likely has a similar issue with filter/results loaded client-side only. Content-heavy pages that are pure client-side are invisible to SEO.

**Audit findings addressed:** H3 from `seo-audit-by-issam/OKEYO-ACTION-PLAN.md`.

### Scope

**`/collections` page:**
- Move initial data fetch to a Next.js Server Component (use `async` page component + Supabase server client)
- Fetch the first page/batch of collections from Supabase at request time
- Render collection cards in the initial HTML — no spinner on first paint
- Client-side filtering/pagination can remain interactive but must start from SSR'd data

**`/explore` page:**
- Move initial experiences/destinations fetch to Server Component
- Render the initial grid of results in HTML
- Client-side filtering (mood, dates, category) can remain interactive
- The filtered state can be empty on first SSR paint, but the default/unfiltered list must be server-rendered

**`/explore/category/[slug]` page:**
- Already dynamic — verify it server-renders the category's experiences
- If not, apply same SSR pattern

### Pattern to follow

```tsx
// BEFORE (client component, crawler sees spinner)
'use client'
export default function CollectionsPage() {
  const [collections, setCollections] = useState([])
  useEffect(() => { fetchCollections().then(setCollections) }, [])
  if (!collections.length) return <Spinner />
  return <CollectionGrid collections={collections} />
}

// AFTER (server component, crawler sees content)
// page.tsx — Server Component (no 'use client')
export default async function CollectionsPage() {
  const supabase = createServerClient()
  const { data: collections } = await supabase.from('collections').select('*').limit(20)
  return <CollectionGrid initialCollections={collections ?? []} />
}

// CollectionGrid.tsx — Client Component for interactivity
'use client'
export function CollectionGrid({ initialCollections }) {
  const [collections, setCollections] = useState(initialCollections)
  // client-side filtering etc.
}
```

### Important

- Use the Supabase server client (cookies-based, not client-side) for SSR fetches
- Do NOT fetch user-specific data SSR on public pages — only public content
- Add `export const revalidate = 3600` (1 hour ISR) or `dynamic = 'force-dynamic'` depending on data freshness needs
- Ensure graceful fallback if Supabase returns an error (render empty state, not crash)

## Acceptance Criteria

- [ ] `/collections` page renders collection cards in initial HTML (curl shows content, not spinner)
- [ ] `/explore` page renders initial experience grid in initial HTML
- [ ] `/explore/category/[slug]` renders category experiences in initial HTML
- [ ] Client-side interactivity (filtering, pagination) still works
- [ ] No authentication required for initial SSR fetch (public content only)
- [ ] Build passes without errors

## Context

- Collections page: `src/app/collections/page.tsx`
- Explore page: `src/app/explore/page.tsx`
- Category page: `src/app/explore/category/[slug]/page.tsx`
- Supabase server client: `src/lib/supabase/server.ts` (or similar)
- Audit reference: `seo-audit-by-issam/FULL-AUDIT-REPORT.md` (Section 1.4 — JS Rendering)
- Action plan reference: `seo-audit-by-issam/OKEYO-ACTION-PLAN.md` (H3)

## Checklist

- [ ] Step 1: Read `src/app/collections/page.tsx` — understand current fetch pattern
- [ ] Step 2: Read `src/app/explore/page.tsx` — understand current fetch pattern
- [ ] Step 3: Read `src/app/explore/category/[slug]/page.tsx`
- [ ] Step 4: Identify Supabase server client location/pattern in the codebase
- [ ] Step 5: Convert `/collections` page to async Server Component with SSR data fetch
- [ ] Step 6: Extract interactive parts of collections into a Client Component
- [ ] Step 7: Convert `/explore` page to async Server Component with SSR data fetch
- [ ] Step 8: Extract interactive parts of explore into a Client Component
- [ ] Step 9: Verify `/explore/category/[slug]` is SSR'd
- [ ] Step 10: Add ISR revalidation config to all three pages
- [ ] Step 11: Test that initial HTML contains actual content (not spinner)

## Review Notes

## Agent Log
