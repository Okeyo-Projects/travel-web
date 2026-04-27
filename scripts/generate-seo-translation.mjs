#!/usr/bin/env node
/**
 * Test SEO & translation generation for a single experience.
 *
 * Usage:
 *   node scripts/generate-seo-translation.mjs <experience-uuid>
 *
 * Env vars (loaded from .env.local):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 *   OPENAI_API_KEY  (or NEXT_PUBLIC_OPENAI_API_KEY)
 */

import { createClient } from "@supabase/supabase-js";
import OpenAI from "openai";

for (const file of [".env.local", ".env"]) {
  if (typeof process.loadEnvFile === "function") {
    try { process.loadEnvFile(file); } catch {}
  }
}

function getRequiredEnv(name) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required env var: ${name}`);
  return value;
}

const supabase = createClient(
  getRequiredEnv("NEXT_PUBLIC_SUPABASE_URL"),
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    (() => { throw new Error("Set SUPABASE_SERVICE_ROLE_KEY"); })()
);

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || process.env.NEXT_PUBLIC_OPENAI_API_KEY,
});

// ── Language detection ────────────────────────────────────────────────────────

function detectLanguage(text) {
  if (/\b(le|la|les|de|du|qu|est|une|un|et)\b/i.test(text)) return "fr";
  if (/[؀-ۿ]/.test(text)) return "ar";
  return "en";
}

// ── OpenAI helpers ────────────────────────────────────────────────────────────

async function callOpenAI(prompt) {
  const res = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
  });
  const content = res.choices[0].message.content;
  if (!content) throw new Error("Empty OpenAI response");
  const match = content.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No JSON found in OpenAI response");
  return JSON.parse(match[0]);
}

// ── Translation ───────────────────────────────────────────────────────────────

async function generateTranslations(experience) {
  const lang = experience.original_language || detectLanguage(experience.long_description);

  const translations = await callOpenAI(`Translate the following experience descriptions into English, French, and Arabic.
Keep the experience name unchanged across all languages.
Preserve the meaning and tone. Output as valid JSON only.

Experience Name: ${experience.title}
Short Description: ${experience.short_description}
Long Description: ${experience.long_description}
Original Language: ${lang}

Respond with JSON in this exact format:
{
  "short_description_en": "...",
  "short_description_fr": "...",
  "short_description_ar": "...",
  "long_description_en": "...",
  "long_description_fr": "...",
  "long_description_ar": "..."
}`);

  // Keep original text unchanged for the source language
  if (lang === "en") {
    translations.short_description_en = experience.short_description;
    translations.long_description_en  = experience.long_description;
  } else if (lang === "fr") {
    translations.short_description_fr = experience.short_description;
    translations.long_description_fr  = experience.long_description;
  } else {
    translations.short_description_ar = experience.short_description;
    translations.long_description_ar  = experience.long_description;
  }

  return { ...translations, original_language: lang };
}

// ── SEO ───────────────────────────────────────────────────────────────────────

async function generateSeoContent(experience, translations) {
  return callOpenAI(`Generate SEO metadata for this experience across three languages (English, French, Arabic).

Experience Details:
- Name: ${experience.title}
- Location: ${experience.city}${experience.region ? `, ${experience.region}` : ""}
- English Short: ${translations.short_description_en}
- English Long: ${translations.long_description_en}
- French Short: ${translations.short_description_fr}
- French Long: ${translations.long_description_fr}
- Arabic Short: ${translations.short_description_ar}
- Arabic Long: ${translations.long_description_ar}

Rules:
- seo_title: "[Experience Name] — [descriptive phrase] | Okeyo Travel" (keep name, translate phrase)
- seo_description: 150-160 chars, compelling summary
- seo_keywords: 5-7 comma-separated keywords

Return valid JSON ONLY:
{
  "seo_title_en": "...",
  "seo_title_fr": "...",
  "seo_title_ar": "...",
  "seo_description_en": "...",
  "seo_description_fr": "...",
  "seo_description_ar": "...",
  "seo_keywords_en": "...",
  "seo_keywords_fr": "...",
  "seo_keywords_ar": "..."
}`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

const uuid = process.argv[2];
if (!uuid) {
  console.error("Usage: node scripts/generate-seo-translation.mjs <experience-uuid>");
  process.exit(1);
}

console.log(`\nFetching experience ${uuid}...`);

const { data: exp, error } = await supabase
  .from("experiences")
  .select("id, title, short_description, long_description, city, region, original_language")
  .eq("id", uuid)
  .single();

if (error || !exp) {
  console.error("Experience not found:", error?.message ?? "no data");
  process.exit(1);
}

console.log(`Found: "${exp.title}" (${exp.city})`);

// Step 1 — Translations
console.log("\n[1/3] Generating translations...");
const translations = await generateTranslations(exp);
console.log("  ✓ short_description_en:", translations.short_description_en?.slice(0, 80));
console.log("  ✓ short_description_fr:", translations.short_description_fr?.slice(0, 80));
console.log("  ✓ short_description_ar:", translations.short_description_ar?.slice(0, 80));

// Step 2 — SEO
console.log("\n[2/3] Generating SEO content...");
const seoContent = await generateSeoContent(exp, translations);
console.log("  ✓ seo_title_en:", seoContent.seo_title_en);
console.log("  ✓ seo_title_fr:", seoContent.seo_title_fr);
console.log("  ✓ seo_title_ar:", seoContent.seo_title_ar);
console.log("  ✓ seo_description_en:", seoContent.seo_description_en?.slice(0, 80));
console.log("  ✓ seo_keywords_en:", seoContent.seo_keywords_en);

// Step 3 — Save
console.log("\n[3/3] Saving to database...");
const { error: updateError } = await supabase
  .from("experiences")
  .update({
    ...translations,
    ...seoContent,
    is_translated: true,
    is_seo_generated: true,
  })
  .eq("id", uuid);

if (updateError) {
  console.error("Failed to save:", updateError.message);
  process.exit(1);
}

console.log("\n✓ Done! Experience fully processed.\n");
