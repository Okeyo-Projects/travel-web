"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { MarketingHeader } from "@/components/site/MarketingHeader";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/use-auth";
import { createClient } from "@/lib/supabase/client";

type Language = "fr" | "en" | "ar";

const LANGUAGE_OPTIONS: { value: Language; label: string }[] = [
  { value: "fr", label: "Français" },
  { value: "en", label: "English" },
  { value: "ar", label: "العربية" },
];

export default function SettingsPage() {
  const router = useRouter();
  const { user, loading: authLoading, signOut } = useAuth();
  const queryClient = useQueryClient();

  const { data: profile, isLoading } = useQuery({
    queryKey: ["profile", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const supabase = createClient();
      const { data } = await supabase
        .from("profiles")
        .select("display_name, preferred_language, currency")
        .eq("id", user!.id)
        .single();
      return data as {
        display_name: string;
        preferred_language: string | null;
        currency: string | null;
      } | null;
    },
  });

  const [language, setLanguage] = useState<Language>("fr");

  useEffect(() => {
    if (profile) {
      setLanguage((profile.preferred_language as Language) ?? "fr");
    }
  }, [profile]);

  const updateMutation = useMutation({
    mutationFn: async (patch: { preferred_language?: Language }) => {
      const supabase = createClient();
      const { error } = await supabase
        .from("profiles")
        .update(patch)
        .eq("id", user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["profile", user?.id] });
    },
  });

  if (!authLoading && !user) {
    router.replace("/");
    return null;
  }

  const isSaving = updateMutation.isPending;

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-gradient-to-br from-[#08090d] to-[#1a1a2e] px-6 pb-10 pt-6">
        <MarketingHeader className="mx-auto max-w-5xl" />
      </div>

      <div className="mx-auto max-w-2xl px-4 py-10 space-y-6">
        <h1 className="text-2xl font-bold">Settings</h1>

        {/* Preferences */}
        <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-5">
          <h2 className="font-semibold">Preferences</h2>

          {isLoading ? (
            <div className="flex justify-center py-6">
              <Loader2 className="size-5 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label>Language</Label>
                <Select
                  value={language}
                  onValueChange={(v) => {
                    setLanguage(v as Language);
                    updateMutation.mutate({
                      preferred_language: v as Language,
                    });
                  }}
                >
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {LANGUAGE_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-muted-foreground">Currency</Label>
                <div className="flex h-9 w-full items-center rounded-md border bg-transparent px-3 py-2 text-sm opacity-50 cursor-not-allowed">
                  Moroccan Dirham (MAD)
                </div>
                <p className="text-xs text-muted-foreground">
                  Only MAD is supported at the moment.
                </p>
              </div>

              {isSaving && (
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <Loader2 className="size-3 animate-spin" />
                  Saving…
                </p>
              )}
            </div>
          )}
        </div>

        {/* Account */}
        <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-4">
          <h2 className="font-semibold">Account</h2>
          <p className="text-sm text-muted-foreground">{user?.email}</p>

          <Separator />

          <div className="space-y-3">
            <Button
              variant="outline"
              className="w-full justify-start"
              onClick={() => router.push("/profile")}
            >
              Edit profile
            </Button>
            <Button
              variant="ghost"
              className="w-full justify-start text-destructive hover:text-destructive"
              onClick={() => signOut()}
            >
              <LogOut className="mr-2 size-4" />
              Log out
            </Button>
          </div>
        </div>

        {/* Legal */}
        <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-3">
          <h2 className="font-semibold">Legal</h2>
          <div className="space-y-2">
            <a
              href="/privacy"
              className="block text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Privacy Policy
            </a>
            <a
              href="/terms"
              className="block text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Terms of Service
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
