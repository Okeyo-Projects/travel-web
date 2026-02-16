"use client";

import { useQuery } from "@tanstack/react-query";
import { Camera, Clock, DollarSign, Globe, Mail, Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import { MarketingHeader } from "@/components/site/MarketingHeader";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { createClient } from "@/lib/supabase/client";
import { getImageUrl } from "@/utils/functions";

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

const LANGUAGE_LABELS: Record<string, string> = {
  fr: "Français",
  en: "English",
  ar: "العربية",
};

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("profiles")
        .select(
          "display_name, avatar_url, bio, email_verified, preferred_language, currency, timezone, is_host, status, created_at",
        )
        .eq("id", user!.id)
        .single();
      return data as {
        display_name: string;
        avatar_url: string | null;
        bio: string | null;
        email_verified: boolean | null;
        preferred_language: string | null;
        currency: string | null;
        timezone: string | null;
        is_host: boolean | null;
        status: string | null;
        created_at: string;
      } | null;
    },
  });

  if (!authLoading && !user) {
    router.replace("/");
    return null;
  }

  const displayName =
    profile?.display_name ?? user?.email?.split("@")[0] ?? "User";
  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      })
    : null;

  const infoRows = [
    { icon: Mail, label: "Email", value: user?.email ?? "—" },
    {
      icon: Globe,
      label: "Language",
      value: LANGUAGE_LABELS[profile?.preferred_language ?? ""] ?? "Français",
    },
    { icon: DollarSign, label: "Currency", value: profile?.currency ?? "MAD" },
    {
      icon: Clock,
      label: "Timezone",
      value: profile?.timezone ?? "Africa/Casablanca",
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header with gradient background */}
      <div className="bg-gradient-to-br from-[#08090d] to-[#1a1a2e] px-6 pb-10 pt-6">
        <MarketingHeader className="mx-auto max-w-5xl" />
      </div>

      <div className="mx-auto max-w-2xl px-4 py-10 space-y-6">
        {/* Profile card */}
        <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-5">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar className="size-20">
                {profile?.avatar_url && (
                  <AvatarImage
                    src={
                      getImageUrl(profile?.avatar_url, "profiles") ?? undefined
                    }
                    alt={displayName}
                  />
                )}
                <AvatarFallback className="text-xl font-bold bg-muted">
                  {isLoading ? "" : getInitials(displayName)}
                </AvatarFallback>
              </Avatar>
              <button
                type="button"
                className="absolute -bottom-1 -right-1 rounded-full bg-primary p-1.5 text-primary-foreground shadow"
                aria-label="Change avatar"
              >
                <Camera className="size-3.5" />
              </button>
            </div>
            <div className="flex-1 min-w-0">
              {isLoading ? (
                <div className="space-y-2">
                  <div className="h-5 w-32 rounded bg-muted animate-pulse" />
                  <div className="h-4 w-20 rounded bg-muted animate-pulse" />
                </div>
              ) : (
                <>
                  <h1 className="text-2xl font-bold truncate">{displayName}</h1>
                  <p className="text-sm text-muted-foreground">
                    {profile?.is_host ? "Host & Traveller" : "Traveller"}
                    {memberSince && ` · Member since ${memberSince}`}
                  </p>
                </>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="shrink-0"
              onClick={() => router.push("/settings")}
            >
              <Pencil className="mr-1.5 size-3.5" />
              Edit
            </Button>
          </div>

          {profile?.bio && (
            <p className="text-sm text-muted-foreground leading-relaxed border-t pt-4">
              {profile.bio}
            </p>
          )}
        </div>

        {/* Account info */}
        <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-4">
          <h2 className="font-semibold text-base">Account</h2>
          <div className="divide-y">
            {infoRows.map(({ icon: Icon, label, value }) => (
              <div
                key={label}
                className="flex items-center justify-between py-3"
              >
                <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                  <Icon className="size-4 shrink-0" />
                  {label}
                </div>
                <span className="text-sm font-medium">
                  {isLoading ? "—" : value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick links */}
        <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-3">
          <h2 className="font-semibold text-base">Quick links</h2>
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              className="h-auto py-3 flex-col gap-1"
              onClick={() => router.push("/bookings")}
            >
              <span className="text-base">📅</span>
              <span className="text-xs font-medium">My Bookings</span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-3 flex-col gap-1"
              onClick={() => router.push("/settings")}
            >
              <span className="text-base">⚙️</span>
              <span className="text-xs font-medium">Settings</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
