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

    const payload = (await request.json()) as Record<string, unknown>;
    const firstName = normalizeOptionalString(payload.firstName);
    const establishmentName = normalizeOptionalString(
      payload.establishmentName,
    );
    const phoneValue = normalizeOptionalString(payload.phone);
    const phoneCountry = normalizePhoneCountry(
      normalizeOptionalString(payload.phoneCountry),
    );
    const localeValue = normalizeOptionalString(payload.locale);
    const path = normalizeOptionalString(payload.path);

    if (!firstName) {
      return NextResponse.json(
        { error: "First name is required." },
        { status: 400 },
      );
    }

    if (!establishmentName) {
      return NextResponse.json(
        { error: "Property name is required." },
        { status: 400 },
      );
    }

    if (!phoneValue) {
      return NextResponse.json(
        { error: "Phone number is required." },
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
      ...(path ? { path } : {}),
      ...(user?.id ? { auth_user_id: user.id } : {}),
      ...(request.headers.get("user-agent")
        ? { user_agent: request.headers.get("user-agent") }
        : {}),
    };

    const insertPayload: Database["public"]["Tables"]["potential_partners"]["Insert"] =
      {
        first_name: firstName,
        establishment_name: establishmentName,
        phone: normalizedPhone,
        phone_country: phoneCountry,
        locale,
        source: "partner_page",
        metadata,
      };

    const serviceClient = createServiceRoleClientOrThrow();
    const { error } = await serviceClient
      .from("potential_partners")
      .insert(insertPayload);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error("Failed to store potential partner:", error);

    return NextResponse.json(
      { error: "Failed to save partnership request." },
      { status: 500 },
    );
  }
}
