#!/usr/bin/env node
/**
 * Audit and fix city/region data on experiences.
 *
 * Strategy:
 *  1. Experiences with city_slug → sync city name and region from the cities table.
 *  2. Experiences without city_slug → try to match by city text against cities.name,
 *     set city_slug and region if found.
 *  3. Report anything that couldn't be resolved.
 *
 * Usage:
 *   node scripts/fix-experience-city-region.mjs [--dry-run]
 */

import { createClient } from "@supabase/supabase-js";

for (const file of [".env.local", ".env"]) {
  if (typeof process.loadEnvFile === "function") {
    try { process.loadEnvFile(file); } catch {}
  }
}

const DRY_RUN = process.argv.includes("--dry-run");

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? (() => { throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL"); })(),
  process.env.SUPABASE_SERVICE_ROLE_KEY ?? (() => { throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY"); })(),
);

if (DRY_RUN) console.log("[dry-run] No changes will be written.\n");

// ── Fetch data ────────────────────────────────────────────────────────────────

const [{ data: experiences, error: expError }, { data: cities, error: cityError }] =
  await Promise.all([
    supabase
      .from("experiences")
      .select("id, title, city, region, city_slug")
      .is("deleted_at", null),
    supabase
      .from("cities")
      .select("slug, name, name_ar, region")
      .is("deleted_at", null),
  ]);

if (expError) { console.error("Failed to fetch experiences:", expError.message); process.exit(1); }
if (cityError) { console.error("Failed to fetch cities:", cityError.message); process.exit(1); }

console.log(`Experiences: ${experiences.length}`);
console.log(`Cities in DB: ${cities.length}\n`);

// Build lookup maps
const cityBySlug = new Map(cities.map(c => [c.slug, c]));
const cityByName = new Map(cities.map(c => [c.name.toLowerCase().trim(), c]));

// ── Analyse ───────────────────────────────────────────────────────────────────

const toUpdate   = [];
const unresolved = [];

for (const exp of experiences) {
  // Case 1: has city_slug — check if city/region match
  if (exp.city_slug) {
    const canonical = cityBySlug.get(exp.city_slug);
    if (!canonical) {
      unresolved.push({ exp, reason: `city_slug "${exp.city_slug}" not found in cities table` });
      continue;
    }
    const cityOk   = exp.city === canonical.name;
    const regionOk = exp.region === canonical.region;
    if (!cityOk || !regionOk) {
      toUpdate.push({
        id: exp.id,
        title: exp.title,
        city: canonical.name,
        region: canonical.region ?? null,
        city_slug: exp.city_slug,
        reason: [!cityOk && `city: "${exp.city}" → "${canonical.name}"`, !regionOk && `region: "${exp.region}" → "${canonical.region}"`].filter(Boolean).join(", "),
      });
    }
    continue;
  }

  // Case 2: no city_slug — try to match by city text
  const match = cityByName.get((exp.city ?? "").toLowerCase().trim());
  if (match) {
    const cityOk   = exp.city === match.name;
    const regionOk = exp.region === match.region;
    if (!cityOk || !regionOk || !exp.city_slug) {
      toUpdate.push({
        id: exp.id,
        title: exp.title,
        city: match.name,
        region: match.region ?? null,
        city_slug: match.slug,
        reason: `linked city_slug "${match.slug}"` + (!cityOk ? `, city: "${exp.city}" → "${match.name}"` : "") + (!regionOk ? `, region: "${exp.region}" → "${match.region}"` : ""),
      });
    }
  } else {
    unresolved.push({ exp, reason: `no city match for "${exp.city}"` });
  }
}

// ── Report ────────────────────────────────────────────────────────────────────

console.log(`✓ Already correct: ${experiences.length - toUpdate.length - unresolved.length}`);
console.log(`⚠ Need fix: ${toUpdate.length}`);
console.log(`✗ Unresolved: ${unresolved.length}\n`);

if (toUpdate.length) {
  console.log("── Fixes ──────────────────────────────────────────────");
  for (const u of toUpdate) {
    console.log(`  ${DRY_RUN ? "[dry-run] " : ""}${u.title} (${u.id.slice(0, 8)}…) — ${u.reason}`);
  }
  console.log();
}

if (unresolved.length) {
  console.log("── Unresolved (manual review needed) ─────────────────");
  for (const { exp, reason } of unresolved) {
    console.log(`  "${exp.title}" (${exp.id.slice(0, 8)}…) — ${reason}`);
  }
  console.log();
}

if (DRY_RUN || toUpdate.length === 0) {
  if (toUpdate.length === 0) console.log("Nothing to update.");
  process.exit(0);
}

// ── Apply ─────────────────────────────────────────────────────────────────────

console.log("── Applying fixes ─────────────────────────────────────");
let fixed = 0;
let failed = 0;

for (const u of toUpdate) {
  const { error } = await supabase
    .from("experiences")
    .update({ city: u.city, region: u.region, city_slug: u.city_slug })
    .eq("id", u.id);

  if (error) {
    console.error(`  ✗ "${u.title}": ${error.message}`);
    failed++;
  } else {
    console.log(`  ✓ "${u.title}"`);
    fixed++;
  }
}

console.log(`\nDone. Fixed: ${fixed}, Failed: ${failed}, Unresolved: ${unresolved.length}`);
