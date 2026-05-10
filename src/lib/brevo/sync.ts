import { brevo, isBrevoEnabled } from "./client";

export type BrevoUserSyncInput = {
  email: string;
  displayName: string;
  language: string;
};

const LOCALIZED_FALLBACK: Record<string, string> = {
  fr: "Explorateur",
  en: "Explorer",
  ar: "مستكشف",
};

function getFallbackName(language: string): string {
  const lang = normalizeLanguage(language);
  return LOCALIZED_FALLBACK[lang] ?? LOCALIZED_FALLBACK.fr;
}

function extractPrenom(
  displayName: string,
  language: string,
  fallback?: string,
): string {
  if (!displayName || typeof displayName !== "string") {
    return fallback || getFallbackName(language);
  }
  const trimmed = displayName.trim();
  if (!trimmed) return fallback || getFallbackName(language);
  return trimmed.split(/\s+/)[0];
}

function normalizeLanguage(lang: string): "fr" | "en" | "ar" {
  const normalized = lang?.toLowerCase().split("-")[0];
  if (normalized === "fr" || normalized === "en" || normalized === "ar") {
    return normalized;
  }
  return "fr";
}

/**
 * Upsert a user as a Brevo contact.
 * Safe to call on every login — idempotent.
 */
export async function syncUserToBrevo(user: BrevoUserSyncInput): Promise<void> {
  if (!isBrevoEnabled() || !brevo) return;

  const prenom = extractPrenom(
    user.displayName,
    user.language,
    user.email.split("@")[0],
  );
  const lang = normalizeLanguage(user.language);

  try {
    await brevo.contacts.createContact({
      email: user.email,
      attributes: {
        PRENOM: prenom,
        LANG: lang,
      },
      updateEnabled: true,
    });
  } catch (error) {
    // Brevo returns 204 when contact already exists and is updated.
    // The SDK may still surface this as an error in some versions.
    if ((error as { status?: number })?.status === 204) return;

    console.error(
      "[Brevo] Failed to sync user:",
      user.email,
      (error as Error)?.message,
    );
  }
}

/**
 * Update only contact attributes (e.g. after profile edit).
 */
export async function updateBrevoContactAttributes(
  email: string,
  updates: Partial<Pick<BrevoUserSyncInput, "displayName" | "language">>,
): Promise<void> {
  if (!isBrevoEnabled() || !brevo) return;

  const attributes: Record<string, string | number | boolean | string[]> = {};
  if (updates.displayName !== undefined) {
    attributes.PRENOM = extractPrenom(
      updates.displayName,
      updates.language ?? "fr",
    );
  }
  if (updates.language !== undefined) {
    attributes.LANG = normalizeLanguage(updates.language);
  }

  if (Object.keys(attributes).length === 0) return;

  try {
    await brevo.contacts.updateContact({
      identifier: email,
      attributes,
    });
  } catch (error) {
    console.error(
      "[Brevo] Failed to update contact:",
      email,
      (error as Error)?.message,
    );
  }
}
