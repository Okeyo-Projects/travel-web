import type { SupabaseClient, User } from "@supabase/supabase-js";

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

export async function getProfilePhone(
  supabase: SupabaseClient,
  userId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("profiles")
    .select("phone")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  const phone = (data as { phone?: string | null } | null)?.phone;
  return typeof phone === "string" && phone.trim().length > 0
    ? phone.trim()
    : null;
}

export async function saveProfilePhone(
  supabase: SupabaseClient,
  user: User,
  phone: string,
  phoneCountry?: string,
) {
  const { data: updatedProfile, error: updateError } = await supabase
    .from("profiles")
    .update({
      phone,
      phone_verified: false,
    })
    .eq("id", user.id)
    .select("id")
    .maybeSingle();

  if (updateError) {
    throw updateError;
  }

  if (!updatedProfile) {
    const { error: insertError } = await supabase.from("profiles").insert({
      id: user.id,
      display_name: getFallbackDisplayName(user),
      phone,
      phone_verified: false,
    });

    if (insertError) {
      throw insertError;
    }
  }

  const metadata =
    user.user_metadata && typeof user.user_metadata === "object"
      ? user.user_metadata
      : {};

  const { error: authError } = await supabase.auth.updateUser({
    data: {
      ...metadata,
      phone,
      ...(phoneCountry ? { phone_country: phoneCountry } : {}),
    },
  });

  if (authError) {
    console.error("Failed to sync phone to auth metadata:", authError);
  }
}
