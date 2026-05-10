#!/usr/bin/env node
/**
 * One-time backfill: sync all existing Supabase auth users to Brevo contacts.
 * Reads users from auth.users (via admin API) and maps profile data.
 *
 * Usage:
 *   node scripts/sync-users-to-brevo.mjs
 *   node scripts/sync-users-to-brevo.mjs --dry-run
 */

import { createClient } from "@supabase/supabase-js";
import { BrevoClient } from "@getbrevo/brevo";

// ─── Load env ────────────────────────────────────────────────────────────────
for (const file of [".env.local", ".env"]) {
  if (typeof process.loadEnvFile === "function") {
    try {
      process.loadEnvFile(file);
    } catch {}
  }
}

const DRY_RUN = process.argv.includes("--dry-run");

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BREVO_API_KEY = process.env.BREVO_API_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

if (!BREVO_API_KEY) {
  console.error("Missing BREVO_API_KEY");
  process.exit(1);
}

// ─── Clients ─────────────────────────────────────────────────────────────────
const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const brevo = new BrevoClient({ apiKey: BREVO_API_KEY });

// ─── Helpers ─────────────────────────────────────────────────────────────────
const LOCALIZED_FALLBACK = {
  fr: "Explorateur",
  en: "Explorer",
  ar: "مستكشف",
};

function normalizeLanguage(lang) {
  const normalized = lang?.toLowerCase().split("-")[0];
  if (normalized === "fr" || normalized === "en" || normalized === "ar") {
    return normalized;
  }
  return "fr";
}

function getFallbackName(language) {
  const lang = normalizeLanguage(language);
  return LOCALIZED_FALLBACK[lang] ?? LOCALIZED_FALLBACK.fr;
}

function extractPrenom(displayName, language, fallback) {
  if (!displayName || typeof displayName !== "string") {
    return fallback || getFallbackName(language);
  }
  const trimmed = displayName.trim();
  if (!trimmed) return fallback || getFallbackName(language);
  return trimmed.split(/\s+/)[0];
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Main ────────────────────────────────────────────────────────────────────
async function main() {
  console.log(
    DRY_RUN ? "[DRY RUN] No changes will be made." : "[LIVE] Syncing to Brevo...",
  );
  console.log("Fetching auth users from Supabase...\n");

  let page = 1;
  const perPage = 1000;
  let totalSynced = 0;
  let totalFailed = 0;
  let totalSkipped = 0;

  while (true) {
    const {
      data: { users },
      error,
    } = await supabase.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) {
      console.error("Failed to fetch users:", error.message);
      process.exit(1);
    }

    if (!users || users.length === 0) break;

    // Batch-fetch profiles for this page
    const userIds = users.map((u) => u.id);
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, display_name, preferred_language")
      .in("id", userIds);

    const profileById = new Map();
    for (const p of profiles ?? []) {
      profileById.set(p.id, p);
    }

    for (const user of users) {
      const email = user.email;
      if (!email) {
        totalSkipped++;
        continue;
      }

      const profile = profileById.get(user.id);
      const displayName =
        profile?.display_name ??
        user.user_metadata?.display_name ??
        user.user_metadata?.full_name ??
        user.user_metadata?.name ??
        email.split("@")[0];

      const language =
        profile?.preferred_language ??
        user.user_metadata?.preferred_language ??
        "fr";

      const prenom = extractPrenom(
        displayName,
        language,
        email.split("@")[0],
      );
      const lang = normalizeLanguage(language);

      if (DRY_RUN) {
        console.log(`[DRY] ${email} → PRENOM=${prenom}, LANG=${lang}`);
        totalSynced++;
        continue;
      }

      try {
        await brevo.contacts.createContact({
          email,
          attributes: { PRENOM: prenom, LANG: lang },
          updateEnabled: true,
        });
        totalSynced++;
        process.stdout.write(".");
      } catch (err) {
        // 204 means updated successfully
        if (err?.status === 204) {
          totalSynced++;
          process.stdout.write(".");
        } else {
          totalFailed++;
          process.stdout.write("x");
          console.error(`\n  Failed: ${email} — ${err?.message}`);
        }
      }

      // Rate-limit safety: ~10 req/sec max
      await sleep(100);
    }

    if (users.length < perPage) break;
    page++;
  }

  console.log(
    `\n\nDone. Synced: ${totalSynced}, Failed: ${totalFailed}, Skipped: ${totalSkipped}`,
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
