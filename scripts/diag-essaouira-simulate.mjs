// Simulate the full planTripWithGuideItems assembly for Essaouira,
// with realistic model-generated inputs (interests appended to the bucket query).
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
  return (data ?? []).map((r) => ({
    slug: r.slug,
    kind: r.kind_slug,
    title: r.title_i18n?.en ?? r.title_i18n?.fr ?? r.slug,
    score: r.semantic_score,
  }));
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

async function simulate({ days, pace, interests, minSim, actKinds }) {
  const activityCount = { relaxed: 2, balanced: 3, full: 4 }[pace];
  const actLimit = Math.min(Math.max(days * 3, 8), 20);
  const mealLimit = Math.min(Math.max(days, 4), 12);
  const kinds = actKinds ?? ACTIVITY_KINDS;

  const [morning, afternoon, breakfast, lunch, dinner] = await Promise.all([
    bucketSearch({ city: "Essaouira", bucket: "morning sightseeing activity museum culture", kinds, limit: actLimit, interests, minSim }),
    bucketSearch({ city: "Essaouira", bucket: "afternoon activity shopping wellness local experience", kinds, limit: actLimit, interests, minSim }),
    bucketSearch({ city: "Essaouira", bucket: "restaurant cafe breakfast brunch morning food", kinds: ["restaurant","coffee","bakery","rooftop"], limit: mealLimit, interests, minSim }),
    bucketSearch({ city: "Essaouira", bucket: "restaurant lunch casual local food midday", kinds: ["restaurant","coffee","bakery","rooftop"], limit: mealLimit, interests, minSim }),
    bucketSearch({ city: "Essaouira", bucket: "restaurant dinner rooftop romantic traditional food evening", kinds: ["restaurant","rooftop","pub"], limit: mealLimit, interests, minSim }),
  ]);

  // interleave morning/afternoon with dedup
  const seen = new Set();
  const activities = [];
  const maxLen = Math.max(morning.length, afternoon.length);
  for (let i = 0; i < maxLen; i++) {
    for (const g of [morning, afternoon]) {
      const c = g[i];
      if (!c) continue;
      const s = signature(c.slug, c.kind, c.title);
      if (seen.has(s)) continue;
      seen.add(s);
      activities.push(c);
    }
  }

  console.log(
    `  pools: activities=${activities.length} (morning ${morning.length} + afternoon ${afternoon.length}), breakfast=${breakfast.length}, lunch=${lunch.length}, dinner=${dinner.length}`,
  );

  const usedSigs = new Set();
  let filled = 0, empty = 0;
  for (let d = 0; d < days; d++) {
    const usedTopics = new Set();
    // real buildDailyTemplate: breakfast, activities with lunch after index lunchIndex, dinner
    const lunchIndex = activityCount > 2 ? 1 : 0;
    const template = ["breakfast"];
    for (let i = 0; i < activityCount; i++) {
      template.push("activity");
      if (i === lunchIndex) template.push("lunch");
    }
    template.push("dinner");
    const slots = [];
    for (const step of template) {
      let item;
      if (step === "activity") item = takeNext(activities, usedSigs, usedTopics, true);
      else if (step === "lunch") item = takeNext(lunch, usedSigs, new Set(), false);
      else if (step === "breakfast") item = takeNext(breakfast, usedSigs, new Set(), false);
      else item = takeNext(dinner, usedSigs, new Set(), false);
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
  { days: 4, pace: "balanced", interests: [], minSim: 0.55 },
  { days: 4, pace: "balanced", interests: ["surf", "food"], minSim: 0.55 },
  { days: 5, pace: "balanced", interests: [], minSim: 0.55 },
  { days: 3, pace: "full", interests: ["beach", "seafood"], minSim: 0.55 },
  { days: 3, pace: "balanced", interests: [], minSim: 0.55, actKinds: ["activity"] },
  { days: 4, pace: "balanced", interests: [], minSim: 0.55, actKinds: ["activity", "museum"] },
]) {
  console.log(`\n=== days=${scenario.days} pace=${scenario.pace} interests=[${scenario.interests}] minSim=${scenario.minSim} kinds=${scenario.actKinds ? JSON.stringify(scenario.actKinds) : "all"} ===`);
  await simulate(scenario);
}
