This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.

## Guide-Item Semantic Search

The `/guide` page exposes semantic search over the `guide_items` catalog (restaurants, transport, wellness, shopping, museums, activities, etc.).

### How it works

1. The user enters a query and optional filters (city, kind/category).
2. `POST /api/guide-items/search` receives the request.
3. The server generates a 1536-dimensional embedding with OpenAI `text-embedding-3-large` using `OPENAI_API_KEY`.
4. The server calls the Supabase RPC `search_guide_items(p_query_embedding, p_text_query, ...)` with the service-role key.
5. The RPC combines vector similarity and full-text ranking, filters by city/kind, and orders results by `relevance_score`.
6. The typed results are returned to the client and rendered by `GuideItemCard`.

The OpenAI API key is only used server-side in `/api/guide-items/search` (and the existing `/src/lib/embeddings` helpers). It is never exposed to the browser.

### Manual re-trigger of embeddings

Guide-item embeddings are generated automatically by the `generate-guide-item-embeddings` Supabase Edge Function, scheduled daily at 3 AM UTC via `cron.schedule('generate-guide-item-embeddings-daily', ...)`. To trigger a run manually from SQL:

```sql
SELECT manually_trigger_guide_item_embeddings();
```

You can also call the edge function directly with a service-role authorization header.

### Environment variables

- `OPENAI_API_KEY` — used by `/src/lib/embeddings/index.ts` to generate query and experience/guide-item embeddings.
- `NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — public Supabase client config.
- `SUPABASE_SERVICE_ROLE_KEY` — used by `/src/lib/supabase/service-role.ts` to execute `search_guide_items` for anonymous and authenticated visitors.

### Regenerating Supabase types

Because the backend migrations live in the main `okeyo-travel` monorepo, `src/types/supabase.ts` was patched manually to include `guide_items`, `guide_item_embedding_sync`, and the `search_guide_items` RPC. When schema changes are deployed, regenerate types with:

```bash
pnpm supabase:types
```

(Requires sufficient Supabase project privileges; if that fails, patch the types by hand to match the deployed schema.)
