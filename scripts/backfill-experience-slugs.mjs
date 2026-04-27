#!/usr/bin/env node
/**
 * Backfill slugs for experiences that don't have one yet.
 * Mirrors the logic in the DB trigger: title → slug, with -2/-3 suffix if taken.
 *
 * Usage:
 *   node scripts/backfill-experience-slugs.mjs
 *
 * Flags:
 *   --dry-run   Print what would be updated without writing to DB
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

function slugify(title) {
  return title
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")   // strip combining accents
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function buildUniqueSlug(base, existingSlugs) {
  if (!existingSlugs.has(base)) return base;
  let counter = 2;
  while (existingSlugs.has(`${base}-${counter}`)) counter++;
  return `${base}-${counter}`;
}

// Fetch all experiences (we need the full slug set to avoid collisions)
console.log("Fetching all experiences...");
const { data: all, error } = await supabase
  .from("experiences")
  .select("id, title, slug")
  .is("deleted_at", null);

if (error) {
  console.error("Failed to fetch experiences:", error.message);
  process.exit(1);
}

// Build set of already-taken slugs
const takenSlugs = new Set(all.filter(e => e.slug).map(e => e.slug));
const toFix = all.filter(e => !e.slug && e.title);

console.log(`Total experiences: ${all.length}`);
console.log(`Already have a slug: ${takenSlugs.size}`);
console.log(`Need a slug: ${toFix.length}`);

if (toFix.length === 0) {
  console.log("\nNothing to do.");
  process.exit(0);
}

if (DRY_RUN) console.log("\n[dry-run] No changes will be written.\n");

let updated = 0;
let failed = 0;

for (const exp of toFix) {
  const base = slugify(exp.title);
  if (!base) {
    console.warn(`  ⚠ Skipping "${exp.title}" (${exp.id}) — title produces empty slug`);
    failed++;
    continue;
  }

  const slug = buildUniqueSlug(base, takenSlugs);
  takenSlugs.add(slug); // reserve it immediately for the next iteration

  if (DRY_RUN) {
    console.log(`  [dry-run] "${exp.title}" → ${slug}`);
    updated++;
    continue;
  }

  const { error: updateError } = await supabase
    .from("experiences")
    .update({ slug })
    .eq("id", exp.id);

  if (updateError) {
    console.error(`  ✗ Failed "${exp.title}" (${exp.id}): ${updateError.message}`);
    failed++;
  } else {
    console.log(`  ✓ "${exp.title}" → ${slug}`);
    updated++;
  }
}

console.log(`\nDone. Updated: ${updated}, Failed: ${failed}`);
