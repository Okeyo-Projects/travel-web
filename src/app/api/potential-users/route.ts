import {
  type CountryCode,
  parsePhoneNumberFromString,
} from "libphonenumber-js/min";
import { type NextRequest, NextResponse } from "next/server";
import type { AppLocale } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";
import { createServiceRoleClientOrThrow } from "@/lib/supabase/service-role";
import type { Database } from "@/types/supabase";

const SUPPORTED_LOCALES = new Set<AppLocale>(["fr", "en", "ar"]);
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function normalizeOptionalString(value: unknown) {
  if (typeof value !== "string") return null;

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function normalizePhoneCountry(value: string | null) {
  if (!value || !/^[A-Za-z]{2}$/.test(value)) {
    return "MA" as CountryCode;
  }

  return value.toUpperCase() as CountryCode;
}

function normalizePhoneNumber(value: string, country: CountryCode) {
  const parsed = parsePhoneNumberFromString(value, country);

  if (!parsed?.isValid()) return null;
  if (parsed.country && parsed.country !== country) return null;

  return parsed.number;
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      return NextResponse.json({ success: true, skipped: true });
    }

    const payload = (await request.json()) as Record<string, unknown>;
    const name = normalizeOptionalString(payload.name);
    const emailValue = normalizeOptionalString(payload.email);
    const phoneValue = normalizeOptionalString(payload.phone);
    const phoneCountry = normalizePhoneCountry(
      normalizeOptionalString(payload.phoneCountry),
    );
    const localeValue = normalizeOptionalString(payload.locale);
    const clientId = normalizeOptionalString(payload.clientId);
    const conversationId = normalizeOptionalString(payload.conversationId);
    const path = normalizeOptionalString(payload.path);

    if (!phoneValue) {
      return NextResponse.json(
        { error: "Phone number is required." },
        { status: 400 },
      );
    }

    const normalizedEmail = emailValue?.toLowerCase() ?? null;
    if (normalizedEmail && !EMAIL_REGEX.test(normalizedEmail)) {
      return NextResponse.json(
        { error: "Please provide a valid email address." },
        { status: 400 },
      );
    }

    const normalizedPhone = normalizePhoneNumber(phoneValue, phoneCountry);
    if (!normalizedPhone) {
      return NextResponse.json(
        { error: "Please provide a valid phone number." },
        { status: 400 },
      );
    }

    const locale =
      localeValue && SUPPORTED_LOCALES.has(localeValue as AppLocale)
        ? (localeValue as AppLocale)
        : null;

    const metadata = {
      ...(clientId ? { client_id: clientId } : {}),
      ...(conversationId ? { conversation_id: conversationId } : {}),
      ...(path ? { path } : {}),
      ...(request.headers.get("user-agent")
        ? { user_agent: request.headers.get("user-agent") }
        : {}),
    };

    const insertPayload: Database["public"]["Tables"]["potential_users"]["Insert"] =
      {
        name,
        email: normalizedEmail,
        phone: normalizedPhone,
        phone_country: phoneCountry,
        locale,
        source: "chat_modal",
        metadata,
      };

    const serviceClient = createServiceRoleClientOrThrow();
    const { error } = await serviceClient
      .from("potential_users")
      .insert(insertPayload);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error("Failed to store potential user:", error);

    return NextResponse.json(
      { error: "Failed to save potential user." },
      { status: 500 },
    );
  }
}
