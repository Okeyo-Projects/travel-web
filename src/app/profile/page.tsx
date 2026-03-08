"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Camera, Clock, DollarSign, Globe, Loader2, Mail, Pencil } from "lucide-react";
import { useRouter } from "next/navigation";
import { type ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { MarketingHeader } from "@/components/site/MarketingHeader";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { createClient } from "@/lib/supabase/client";
import { getImageUrl } from "@/utils/functions";

const MAX_BIO_LENGTH = 280;
const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);

type ProfileData = {
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

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getExtensionFromFile(file: File): string {
  const fromType = file.type.split("/").pop();
  if (fromType) {
    return fromType === "jpeg" ? "jpg" : fromType;
  }

  const fromName = file.name.split(".").pop()?.toLowerCase();
  return fromName || "jpg";
}

const LANGUAGE_LABELS: Record<string, string> = {
  fr: "Français",
  en: "English",
  ar: "العربية",
};

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const objectPreviewRef = useRef<string | null>(null);

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [displayNameInput, setDisplayNameInput] = useState("");
  const [bioInput, setBioInput] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [selectedAvatarFile, setSelectedAvatarFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [formErrors, setFormErrors] = useState<{ displayName?: string; bio?: string; avatar?: string }>({});

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
      return data as ProfileData;
    },
  });

  useEffect(() => {
    return () => {
      if (objectPreviewRef.current) {
        URL.revokeObjectURL(objectPreviewRef.current);
      }
    };
  }, []);

  if (!authLoading && !user) {
    router.replace("/");
    return null;
  }

  const resetDraftState = () => {
    setDisplayNameInput(profile?.display_name ?? user?.email?.split("@")[0] ?? "");
    setBioInput(profile?.bio ?? "");
    setAvatarPreview(profile?.avatar_url ?? null);
    setSelectedAvatarFile(null);
    setUploadProgress(0);
    setFormErrors({});

    if (objectPreviewRef.current) {
      URL.revokeObjectURL(objectPreviewRef.current);
      objectPreviewRef.current = null;
    }
  };

  const openEditDialog = () => {
    resetDraftState();
    setIsEditOpen(true);
  };

  const handleDialogOpenChange = (nextOpen: boolean) => {
    if (!nextOpen && saveProfileMutation.isPending) {
      return;
    }

    if (!nextOpen) {
      resetDraftState();
    }

    setIsEditOpen(nextOpen);
  };

  const handleAvatarPick = () => {
    avatarInputRef.current?.click();
  };

  const handleAvatarChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";

    if (!file) {
      return;
    }

    if (!ALLOWED_AVATAR_TYPES.has(file.type)) {
      setFormErrors((prev) => ({ ...prev, avatar: "Please select a JPG, PNG, or WebP image." }));
      return;
    }

    if (file.size > MAX_AVATAR_BYTES) {
      setFormErrors((prev) => ({ ...prev, avatar: "Image size must be 5MB or less." }));
      return;
    }

    if (objectPreviewRef.current) {
      URL.revokeObjectURL(objectPreviewRef.current);
      objectPreviewRef.current = null;
    }

    const objectUrl = URL.createObjectURL(file);
    objectPreviewRef.current = objectUrl;

    setSelectedAvatarFile(file);
    setAvatarPreview(objectUrl);
    setFormErrors((prev) => ({ ...prev, avatar: undefined }));
  };

  const saveProfileMutation = useMutation({
    mutationFn: async () => {
      if (!user) {
        throw new Error("You must be logged in to edit your profile.");
      }

      const supabase = createClient();
      let nextAvatarUrl = profile?.avatar_url ?? null;

      if (selectedAvatarFile) {
        setUploadProgress(15);
        const extension = getExtensionFromFile(selectedAvatarFile);
        const objectPath = `${user.id}/avatar.${extension}`;
        const arrayBuffer = await selectedAvatarFile.arrayBuffer();

        setUploadProgress(50);
        const { error: uploadError } = await supabase.storage
          .from("profiles")
          .upload(objectPath, arrayBuffer, {
            cacheControl: "3600",
            upsert: true,
            contentType: selectedAvatarFile.type,
          });

        if (uploadError) {
          throw uploadError;
        }

        nextAvatarUrl = objectPath;
        setUploadProgress(90);
      }

      const { data, error } = await supabase
        .from("profiles")
        .update({
          display_name: displayNameInput.trim(),
          bio: bioInput.trim() || null,
          avatar_url: nextAvatarUrl,
        })
        .eq("id", user.id)
        .select(
          "display_name, avatar_url, bio, email_verified, preferred_language, currency, timezone, is_host, status, created_at",
        )
        .single();

      if (error) {
        throw error;
      }

      return data as NonNullable<ProfileData>;
    },
    onSuccess: (nextProfile) => {
      if (!user) {
        return;
      }

      setUploadProgress(100);
      queryClient.setQueryData(["profile", user.id], nextProfile);
      queryClient.invalidateQueries({ queryKey: ["profile", user.id] });
      toast.success("Profile updated successfully.");
      handleDialogOpenChange(false);
    },
    onError: (error) => {
      const message = error instanceof Error ? error.message : "Unable to save profile.";
      toast.error(message);
    },
    onSettled: () => {
      setUploadProgress(0);
    },
  });

  const validateBeforeSave = () => {
    const nextErrors: { displayName?: string; bio?: string; avatar?: string } = {};

    if (!displayNameInput.trim()) {
      nextErrors.displayName = "Display name is required.";
    }

    if (bioInput.length > MAX_BIO_LENGTH) {
      nextErrors.bio = `Bio must be ${MAX_BIO_LENGTH} characters or less.`;
    }

    if (formErrors.avatar) {
      nextErrors.avatar = formErrors.avatar;
    }

    setFormErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSave = () => {
    if (!validateBeforeSave()) {
      return;
    }

    saveProfileMutation.mutate();
  };

  const displayName = profile?.display_name ?? user?.email?.split("@")[0] ?? "User";
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

  const previewAvatarUrl = useMemo(() => {
    if (!avatarPreview) {
      return getImageUrl(profile?.avatar_url ?? undefined, "profiles") ?? undefined;
    }

    if (avatarPreview.startsWith("blob:") || avatarPreview.startsWith("data:")) {
      return avatarPreview;
    }

    return getImageUrl(avatarPreview, "profiles") ?? avatarPreview;
  }, [avatarPreview, profile?.avatar_url]);

  const isSaving = saveProfileMutation.isPending;

  return (
    <div className="min-h-screen bg-background">
      <div className="bg-gradient-to-br from-[#08090d] to-[#1a1a2e] px-6 pb-10 pt-6">
        <MarketingHeader className="mx-auto max-w-5xl" />
      </div>

      <div className="mx-auto max-w-2xl px-4 py-10 space-y-6">
        <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-5">
          <div className="flex items-center gap-4">
            <div className="relative">
              <Avatar className="size-20">
                {profile?.avatar_url && (
                  <AvatarImage
                    src={getImageUrl(profile.avatar_url, "profiles") ?? undefined}
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
                onClick={openEditDialog}
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
            <Button variant="outline" size="sm" className="shrink-0" onClick={openEditDialog}>
              <Pencil className="mr-1.5 size-3.5" />
              Edit
            </Button>
          </div>

          {profile?.bio && (
            <p className="text-sm text-muted-foreground leading-relaxed border-t pt-4">{profile.bio}</p>
          )}
        </div>

        <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-4">
          <h2 className="font-semibold text-base">Account</h2>
          <div className="divide-y">
            {infoRows.map(({ icon: Icon, label, value }) => (
              <div key={label} className="flex items-center justify-between py-3">
                <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
                  <Icon className="size-4 shrink-0" />
                  {label}
                </div>
                <span className="text-sm font-medium">{isLoading ? "—" : value}</span>
              </div>
            ))}
          </div>
        </div>

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

      <Dialog open={isEditOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="sm:max-w-md" showCloseButton={!isSaving}>
          <DialogHeader>
            <DialogTitle>Edit profile</DialogTitle>
            <DialogDescription>Update your name, bio, and profile picture.</DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              className="hidden"
              onChange={handleAvatarChange}
            />

            <div className="flex items-center gap-3">
              <button
                type="button"
                className="relative rounded-full"
                onClick={handleAvatarPick}
                disabled={isSaving}
                aria-label="Choose avatar"
              >
                <Avatar className="size-16 border">
                  <AvatarImage src={previewAvatarUrl} alt={displayNameInput || displayName} />
                  <AvatarFallback>{getInitials(displayNameInput || displayName)}</AvatarFallback>
                </Avatar>
                <span className="absolute -bottom-1 -right-1 rounded-full bg-primary p-1 text-primary-foreground">
                  <Camera className="size-3" />
                </span>
              </button>
              <div className="space-y-1">
                <p className="text-sm font-medium">Avatar</p>
                <p className="text-xs text-muted-foreground">Click to upload JPG, PNG, or WebP (max 5MB).</p>
              </div>
            </div>

            {formErrors.avatar && <p className="text-xs text-destructive">{formErrors.avatar}</p>}

            {isSaving && uploadProgress > 0 && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>Uploading avatar…</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="h-2" />
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="display-name">Display name</Label>
              <Input
                id="display-name"
                value={displayNameInput}
                onChange={(event) => {
                  setDisplayNameInput(event.target.value);
                  setFormErrors((prev) => ({ ...prev, displayName: undefined }));
                }}
                disabled={isSaving}
              />
              {formErrors.displayName && <p className="text-xs text-destructive">{formErrors.displayName}</p>}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bio">Bio</Label>
              <Textarea
                id="bio"
                value={bioInput}
                onChange={(event) => {
                  setBioInput(event.target.value);
                  setFormErrors((prev) => ({ ...prev, bio: undefined }));
                }}
                disabled={isSaving}
                rows={4}
                maxLength={MAX_BIO_LENGTH}
                placeholder="Tell travelers about yourself"
              />
              <div className="flex items-center justify-between text-xs">
                {formErrors.bio ? (
                  <p className="text-destructive">{formErrors.bio}</p>
                ) : (
                  <span className="text-muted-foreground">Max {MAX_BIO_LENGTH} characters.</span>
                )}
                <span className={bioInput.length > MAX_BIO_LENGTH ? "text-destructive" : "text-muted-foreground"}>
                  {bioInput.length}/{MAX_BIO_LENGTH}
                </span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => handleDialogOpenChange(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Saving…
                </>
              ) : (
                "Save changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
