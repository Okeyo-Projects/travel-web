// Verify the FIXED planTripWithGuideItems assembly for Essaouira.
// Mirrors: minSimilarity 0.35, pools days*4+4 / days+4, RPC top-up via
// fallbackGuideItemSearch, and meal-leftover fill pass.
import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";
import { readFileSync } from "node:fs";

function loadEnvFile(path) {
  try {
    return Object.fromEntries(
      readFileSync(path, "utf8")
        .split("\n")
        .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
        .map((l) => {
          const i = l.indexOf("=");
          return [
            l.slice(0, i).trim().replace(/^export\s+/, ""),
            l.slice(i + 1).trim().replace(/^["']|["']$/g, ""),
          ];
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
const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});
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

const ACTIVITY_KINDS = ["activity","museum","shopping","wellness","nightlife","beach","nature","viewpoint","market","family","religious","coworking","other"];
const GENERIC = new Set(["activity","activities","experience","experiences","place","places","tour","tours","visit","visits","morocco","moroccan","marrakech","essaouira","agadir","casablanca","rabat","fes","fez","tangier","local","guide","guided","restaurant","restaurants","cafe","coffee","food","breakfast","lunch","dinner","near","best","top","the","and","for","with","dans","avec","pour","les","des","une"]);

const normTok = (v) => (v ?? "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
const topicTokens = (title) =>
  new Set(normTok(title).split(" ").filter((t) => t.length >= 4 && !GENERIC.has(t) && !/^\d+$/.test(t)));
const signature = (slug, kind, title) => `${kind}:${normTok(slug) || normTok(title)}`;

const flatten = (v) =>
  typeof v === "string" ? v : v && typeof v === "object" && !Array.isArray(v)
    ? Object.values(v).filter((x) => typeof x === "string").join(" ")
    : "";
const tokenize = (v) => normTok(v).split(" ").filter((t) => t.length > 1);

function scoreRow(row, textQuery) {
  const qTokens = tokenize(textQuery);
  if (!qTokens.length) return null;
  const haystack = [
    flatten(row.title_i18n), flatten(row.summary_i18n), flatten(row.description_i18n),
    flatten(row.payment_i18n), row.address_text ?? "", row.author_name ?? "",
    row.agence_name ?? "", row.subtype ?? "", (row.tags ?? []).join(" "),
    (row.source_platforms ?? []).join(" "),
  ].join(" ");
  const hTokens = new Set(tokenize(haystack));
  if (!hTokens.size) return 0;
  const matches = qTokens.filter((t) => hTokens.has(t)).length;
  const phraseBoost = normTok(haystack).includes(normTok(textQuery)) ? 0.35 : 0;
  return matches / qTokens.length + phraseBoost;
}

// searchGuideItemsWithFallback WITH top-up (fixed version)
async function bucketSearch({ city, bucket, kinds, limit, interests, minSim }) {
  const textQuery = [city, bucket, ...interests].filter(Boolean).join(" ");
  const emb = await embed(textQuery);
  const { data, error } = await supabase.rpc("search_guide_items", {
    p_query_embedding: JSON.stringify(emb),
    p_text_query: textQuery,
    p_city_slug: "essaouira",
    p_kinds: kinds,
    p_limit: limit,
    p_min_similarity: minSim,
    p_include_unpublished: false,
  });
  if (error) throw new Error(error.message);
  let results = (data ?? []).map((r) => ({
    id: r.id, slug: r.slug, kind: r.kind_slug,
    title: r.title_i18n?.en ?? r.title_i18n?.fr ?? r.slug,
    score: r.semantic_score,
  }));

  if (results.length < limit) {
    // fallbackGuideItemSearch top-up
    const fetchLimit = Math.min(Math.max(limit * 5, 20), 60);
    const { data: rows } = await supabase
      .from("guide_items")
      .select("id, slug, kind_slug, title_i18n, summary_i18n, description_i18n, payment_i18n, address_text, author_name, agence_name, subtype, tags, source_platforms, reviews_count, rating_avg, updated_at")
      .is("deleted_at", null)
      .eq("status", "published")
      .eq("city_slug", "essaouira")
      .in("kind_slug", kinds)
      .limit(fetchLimit);
    const scored = (rows ?? []).map((row) => ({ row, s: scoreRow(row, textQuery) }));
    const matched = scored.filter((c) => (c.s ?? 0) > 0);
    const pool = matched.length > 0 ? matched : scored;
    pool.sort((a, b) => (b.s ?? -1) - (a.s ?? -1) || b.row.reviews_count - a.row.reviews_count);
    const seen = new Set(results.map((r) => r.id));
    const topUp = pool
      .map((c) => ({
        id: c.row.id, slug: c.row.slug, kind: c.row.kind_slug,
        title: flatten(c.row.title_i18n) || c.row.slug, score: null,
      }))
      .filter((r) => !seen.has(r.id));
    results = [...results, ...topUp].slice(0, limit);
  }
  return results;
}

function takeNext(candidates, usedSigs, usedTopics, avoidTopic) {
  const c = candidates.find(
    (i) =>
      !usedSigs.has(signature(i.slug, i.kind, i.title)) &&
      (!avoidTopic || ![...topicTokens(i.title)].some((t) => usedTopics.has(t))),
  );
  if (!c) return null;
  usedSigs.add(signature(c.slug, c.kind, c.title));
  for (const t of topicTokens(c.title)) usedTopics.add(t);
  return c;
}

const unique = (groups) => {
  const seen = new Set(); const out = [];
  for (const g of groups) for (const c of g) {
    const s = signature(c.slug, c.kind, c.title);
    if (seen.has(s)) continue;
    seen.add(s); out.push(c);
  }
  return out;
};

async function simulate({ days, pace, interests, minSim, actKinds }) {
  const activityCount = { relaxed: 2, balanced: 3, full: 4 }[pace];
  const actLimit = Math.min(Math.max(days * 4 + 4, 10), 30);
  const mealLimit = Math.min(Math.max(days + 4, 8), 16);
  const kinds = actKinds ?? ACTIVITY_KINDS;

  const [morning, afternoon, breakfast, lunch, dinner] = await Promise.all([
    bucketSearch({ city: "Essaouira", bucket: "morning sightseeing activity museum culture", kinds, limit: actLimit, interests, minSim }),
    bucketSearch({ city: "Essaouira", bucket: "afternoon activity shopping wellness local experience", kinds, limit: actLimit, interests, minSim }),
    bucketSearch({ city: "Essaouira", bucket: "restaurant cafe breakfast brunch morning food", kinds: ["restaurant","coffee","bakery","rooftop"], limit: mealLimit, interests, minSim }),
    bucketSearch({ city: "Essaouira", bucket: "restaurant lunch casual local food midday", kinds: ["restaurant","coffee","bakery","rooftop"], limit: mealLimit, interests, minSim }),
    bucketSearch({ city: "Essaouira", bucket: "restaurant dinner rooftop romantic traditional food evening", kinds: ["restaurant","rooftop","pub"], limit: mealLimit, interests, minSim }),
  ]);

  const activities = unique([morning, afternoon]);
  const mealLeftovers = unique([breakfast, lunch, dinner]);

  console.log(
    `  pools: activities=${activities.length} (morning ${morning.length} + afternoon ${afternoon.length}), breakfast=${breakfast.length}, lunch=${lunch.length}, dinner=${dinner.length}`,
  );

  const usedSigs = new Set();
  let filled = 0, empty = 0;
  for (let d = 0; d < days; d++) {
    const usedTopics = new Set();
    const lunchIndex = activityCount > 2 ? 1 : 0;
    const template = ["breakfast"];
    for (let i = 0; i < activityCount; i++) {
      template.push("activity");
      if (i === lunchIndex) template.push("lunch");
    }
    template.push("dinner");
    const slots = [];
    for (const step of template) {
      const item =
        step === "activity"
          ? takeNext(activities, usedSigs, usedTopics, true)
          : (takeNext({ breakfast, lunch, dinner }[step], usedSigs, new Set(), false) ??
             takeNext(mealLeftovers, usedSigs, new Set(), false));
      slots.push({ step, item });
      if (item) filled++; else empty++;
    }
    console.log(
      `  day ${d + 1}: ` + slots.map((s) => (s.item ? `${s.step}=${s.item.slug}` : `${s.step}=EMPTY`)).join(" | "),
    );
  }
  console.log(`  => filled ${filled}, EMPTY ${empty}`);
}

for (const scenario of [
  { days: 2, pace: "balanced", interests: [], minSim: 0.35 },
  { days: 4, pace: "balanced", interests: [], minSim: 0.35 },
  { days: 4, pace: "balanced", interests: ["surf", "food"], minSim: 0.35 },
  { days: 5, pace: "balanced", interests: [], minSim: 0.35 },
  { days: 3, pace: "full", interests: ["beach", "seafood"], minSim: 0.35 },
  { days: 3, pace: "balanced", interests: [], minSim: 0.35, actKinds: ["activity"] },
  { days: 4, pace: "balanced", interests: [], minSim: 0.35, actKinds: ["activity", "museum"] },
]) {
  console.log(`\n=== days=${scenario.days} pace=${scenario.pace} interests=[${scenario.interests}] minSim=${scenario.minSim} kinds=${scenario.actKinds ? JSON.stringify(scenario.actKinds) : "all"} ===`);
  await simulate(scenario);
}
