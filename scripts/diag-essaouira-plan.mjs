// Diagnostic: why does planTripWithGuideItems leave empty slots for Essaouira?
// Reproduces the exact search path used by src/lib/ai/tools/plan-trip-with-guide-items.ts
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import { readFileSync } from "node:fs";

// --- load .env.local without printing secrets ---
function loadEnvFile(path) {
  try {
    return Object.fromEntries(
      readFileSync(path, "utf8")
        .split("\n")
        .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
        .map((l) => {
          const i = l.indexOf("=");
          const key = l.slice(0, i).trim().replace(/^export\s+/, "");
          const val = l
            .slice(i + 1)
            .trim()
            .replace(/^["']|["']$/g, "");
          return [key, val];
        }),
    );
  } catch {
    return {};
  }
}
const env = {
  ...loadEnvFile(new URL("../.env", import.meta.url)),
  ...loadEnvFile(new URL("../.env.local", import.meta.url)),
};

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);
const openai = new OpenAI({ apiKey: env.OPENAI_API_KEY });

async function embed(text) {
  const r = await openai.embeddings.create({
    model: "text-embedding-3-large",
    input: text,
    dimensions: 1536,
    encoding_format: "float",
  });
  return r.data[0].embedding;
}

const CITY = "essaouira";

// 1) city_slug variants + status counts
{
  const { data, error } = await supabase
    .from("guide_items")
    .select("city_slug, status")
    .is("deleted_at", null)
    .ilike("city_slug", "%souira%");
  if (error) console.error("city variants error:", error.message);
  const counts = {};
  for (const r of data ?? []) {
    const k = `${r.city_slug} | ${r.status}`;
    counts[k] = (counts[k] ?? 0) + 1;
  }
  console.log("\n== city_slug/status counts (deleted_at is null) ==");
  console.table(counts);
}

// 2) kind distribution for published essaouira
{
  const { data, error } = await supabase
    .from("guide_items")
    .select("kind_slug")
    .is("deleted_at", null)
    .eq("status", "published")
    .eq("city_slug", CITY);
  if (error) console.error("kind error:", error.message);
  const counts = {};
  for (const r of data ?? []) counts[r.kind_slug] = (counts[r.kind_slug] ?? 0) + 1;
  console.log("\n== published essaouira items by kind ==");
  console.table(counts);
  console.log("total:", (data ?? []).length);
}

// 3) embedding presence
{
  const { data, error } = await supabase
    .from("guide_items")
    .select("id, embedding")
    .is("deleted_at", null)
    .eq("status", "published")
    .eq("city_slug", CITY);
  if (error) console.error("embedding error:", error.message);
  const withEmb = (data ?? []).filter((r) => r.embedding !== null).length;
  console.log(`\n== published essaouira items: ${(data ?? []).length}, with embedding: ${withEmb}, without: ${(data ?? []).length - withEmb} ==`);
}

// 3b) embedding sync table status
{
  const { data: items } = await supabase
    .from("guide_items")
    .select("id")
    .is("deleted_at", null)
    .eq("status", "published")
    .eq("city_slug", CITY);
  const ids = (items ?? []).map((r) => r.id);
  if (ids.length) {
    const { data, error } = await supabase
      .from("guide_item_embedding_sync")
      .select("embedding_status")
      .in("guide_item_id", ids);
    if (error) console.error("sync error:", error.message);
    const counts = {};
    for (const r of data ?? []) counts[r.embedding_status] = (counts[r.embedding_status] ?? 0) + 1;
    console.log("\n== guide_item_embedding_sync status (essaouira published) ==");
    console.table(counts);
    console.log("sync rows:", (data ?? []).length, "of", ids.length);
  }
}

// 4) reproduce each bucket search exactly like the tool
const buckets = [
  {
    name: "morning activities",
    bucket: "morning sightseeing activity museum culture",
    kinds: ["activity","museum","shopping","wellness","nightlife","beach","nature","viewpoint","market","family","religious","coworking","other"],
    limit: 8,
  },
  {
    name: "afternoon activities",
    bucket: "afternoon activity shopping wellness local experience",
    kinds: ["activity","museum","shopping","wellness","nightlife","beach","nature","viewpoint","market","family","religious","coworking","other"],
    limit: 8,
  },
  {
    name: "breakfast",
    bucket: "restaurant cafe breakfast brunch morning food",
    kinds: ["restaurant","coffee","bakery","rooftop"],
    limit: 4,
  },
  {
    name: "lunch",
    bucket: "restaurant lunch casual local food midday",
    kinds: ["restaurant","coffee","bakery","rooftop"],
    limit: 4,
  },
  {
    name: "dinner",
    bucket: "restaurant dinner rooftop romantic traditional food evening",
    kinds: ["restaurant","rooftop","pub"],
    limit: 4,
  },
];

for (const b of buckets) {
  const textQuery = `${CITY} ${b.bucket}`;
  const emb = await embed(textQuery);
  for (const minSim of [0.55, 0.4, 0.3, 0.0]) {
    const { data, error } = await supabase.rpc("search_guide_items", {
      p_query_embedding: JSON.stringify(emb),
      p_text_query: textQuery,
      p_city_slug: CITY,
      p_kinds: b.kinds,
      p_limit: b.limit,
      p_min_similarity: minSim,
      p_include_unpublished: false,
    });
    if (error) {
      console.log(`\n[${b.name}] minSim=${minSim} RPC ERROR: ${error.message}`);
      continue;
    }
    const scores = (data ?? []).map((r) =>
      (r.semantic_score ?? r.relevance_score ?? 0).toFixed?.(3),
    );
    console.log(
      `[${b.name}] minSim=${minSim} -> ${(data ?? []).length} results (limit ${b.limit}); scores: ${scores.join(", ")}`,
    );
  }
  // show what got returned at 0.55 with titles
  const { data } = await supabase.rpc("search_guide_items", {
    p_query_embedding: JSON.stringify(emb),
    p_text_query: textQuery,
    p_city_slug: CITY,
    p_kinds: b.kinds,
    p_limit: b.limit,
    p_min_similarity: 0.55,
    p_include_unpublished: false,
  });
  console.log(
    `   titles@0.55:`,
    (data ?? []).map((r) => `${r.slug} (${r.semantic_score?.toFixed?.(3)})`),
  );
}

// 5) also: no city filter, just to compare global catalog behavior at 0.55
{
  const textQuery = `${CITY} morning sightseeing activity museum culture`;
  const emb = await embed(textQuery);
  const { data, error } = await supabase.rpc("search_guide_items", {
    p_query_embedding: JSON.stringify(emb),
    p_text_query: textQuery,
    p_city_slug: null,
    p_kinds: null,
    p_limit: 20,
    p_min_similarity: 0.55,
    p_include_unpublished: false,
  });
  if (error) console.log("global RPC error:", error.message);
  else
    console.log(
      "\n== global (no city/kind filter) 20 results: cities ==",
      (data ?? []).map((r) => r.city_slug),
    );
}
