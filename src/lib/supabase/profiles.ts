import type { User } from "@supabase/supabase-js";
import { createServiceRoleClientOrThrow } from "@/lib/supabase/service-role";

const SUPPORTED_LANGUAGES = new Set(["fr", "ar", "en"]);

function getFallbackDisplayName(user: User) {
  const candidates = [
    user.user_metadata?.display_name,
    user.user_metadata?.full_name,
    user.user_metadata?.name,
    user.user_metadata?.user_name,
  ];

  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate.trim();
    }
  }

  const emailPrefix = user.email?.split("@")[0]?.trim();
  return emailPrefix && emailPrefix.length > 0 ? emailPrefix : "Explorer";
}

function getPreferredLanguage(user: User): "fr" | "ar" | "en" {
  const candidate = user.user_metadata?.preferred_language;

  if (typeof candidate === "string" && SUPPORTED_LANGUAGES.has(candidate)) {
    return candidate as "fr" | "ar" | "en";
  }

  return "fr";
}

function getFallbackPhone(user: User) {
  const candidate = user.user_metadata?.phone;
  return typeof candidate === "string" && candidate.trim().length > 0
    ? candidate.trim()
    : undefined;
}

export async function ensureProfileExistsForUser(user: User) {
  const serviceClient = createServiceRoleClientOrThrow();
  const phone = getFallbackPhone(user);
  const { error } = await serviceClient.from("profiles").upsert(
    {
      id: user.id,
      display_name: getFallbackDisplayName(user),
      ...(phone ? { phone, phone_verified: false } : {}),
      preferred_language: getPreferredLanguage(user),
      metadata: {
        onboarding_complete: false,
      },
    },
    {
      onConflict: "id",
      ignoreDuplicates: true,
    },
  );

  if (error) throw error;
}
