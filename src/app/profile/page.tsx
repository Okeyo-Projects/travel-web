"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Camera,
  Clock,
  DollarSign,
  Globe,
  Loader2,
  Mail,
  Pencil,
} from "lucide-react";
import { usePathname, useRouter } from "next/navigation";
import { type ChangeEvent, useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { MarketingHeader } from "@/components/site/MarketingHeader";
import { useSiteI18n } from "@/components/site/site-i18n";
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
import { updateBrevoContactAttributes } from "@/lib/brevo/sync";
import { getIntlLocale } from "@/lib/i18n";
import { localizeHref } from "@/lib/routing/locale-path";
import { createClient } from "@/lib/supabase/client";
import { getImageUrl } from "@/utils/functions";

const MAX_BIO_LENGTH = 280;
const MAX_AVATAR_BYTES = 5 * 1024 * 1024;
const ALLOWED_AVATAR_TYPES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);

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

export default function ProfilePage() {
  const { locale, t } = useSiteI18n();
  const pathname = usePathname();
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const avatarInputRef = useRef<HTMLInputElement | null>(null);
  const objectPreviewRef = useRef<string | null>(null);

  const [isEditOpen, setIsEditOpen] = useState(false);
  const [displayNameInput, setDisplayNameInput] = useState("");
  const [bioInput, setBioInput] = useState("");
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [selectedAvatarFile, setSelectedAvatarFile] = useState<File | null>(
    null,
  );
  const [uploadProgress, setUploadProgress] = useState(0);
  const [formErrors, setFormErrors] = useState<{
    displayName?: string;
    bio?: string;
    avatar?: string;
  }>({});

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
    router.replace(localizeHref("/", pathname));
    return null;
  }

  const resetDraftState = () => {
    setDisplayNameInput(
      profile?.display_name ?? user?.email?.split("@")[0] ?? "",
    );
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
      setFormErrors((prev) => ({
        ...prev,
        avatar: t("profile.page.errors.avatarType"),
      }));
      return;
    }

    if (file.size > MAX_AVATAR_BYTES) {
      setFormErrors((prev) => ({
        ...prev,
        avatar: t("profile.page.errors.avatarSize"),
      }));
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
        throw new Error(t("profile.page.errors.authRequired"));
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

      // Sync display name change to Brevo if it changed
      if (nextProfile.display_name !== profile?.display_name && user.email) {
        void updateBrevoContactAttributes(user.email, {
          displayName: nextProfile.display_name,
          language: nextProfile.preferred_language ?? "fr",
        });
      }

      toast.success(t("profile.page.toast.success"));
      handleDialogOpenChange(false);
    },
    onError: (error) => {
      const message =
        error instanceof Error
          ? error.message
          : t("profile.page.errors.saveFallback");
      toast.error(message);
    },
    onSettled: () => {
      setUploadProgress(0);
    },
  });

  const validateBeforeSave = () => {
    const nextErrors: { displayName?: string; bio?: string; avatar?: string } =
      {};

    if (!displayNameInput.trim()) {
      nextErrors.displayName = t("profile.page.errors.displayNameRequired");
    }

    if (bioInput.length > MAX_BIO_LENGTH) {
      nextErrors.bio = t("profile.page.errors.bioTooLong", {
        count: MAX_BIO_LENGTH,
      });
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

  const displayName =
    profile?.display_name ??
    user?.email?.split("@")[0] ??
    t("profile.page.userFallback");
  const intlLocale = getIntlLocale(locale);
  const memberSince = profile?.created_at
    ? new Date(profile.created_at).toLocaleDateString(intlLocale, {
        month: "long",
        year: "numeric",
      })
    : null;

  const languageLabels: Record<string, string> = {
    fr: t("language.options.fr"),
    en: t("language.options.en"),
    ar: t("language.options.ar"),
  };

  const infoRows = [
    {
      icon: Mail,
      label: t("profile.page.info.email"),
      value: user?.email ?? "—",
    },
    {
      icon: Globe,
      label: t("language.label"),
      value:
        languageLabels[profile?.preferred_language ?? ""] ??
        t("language.options.fr"),
    },
    {
      icon: DollarSign,
      label: t("profile.page.info.currency"),
      value: profile?.currency ?? "MAD",
    },
    {
      icon: Clock,
      label: t("profile.page.info.timezone"),
      value: profile?.timezone ?? "Africa/Casablanca",
    },
  ];

  const previewAvatarUrl = useMemo(() => {
    if (!avatarPreview) {
      return (
        getImageUrl(profile?.avatar_url ?? undefined, "profiles") ?? undefined
      );
    }

    if (
      avatarPreview.startsWith("blob:") ||
      avatarPreview.startsWith("data:")
    ) {
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
                    src={
                      getImageUrl(profile.avatar_url, "profiles") ?? undefined
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
                aria-label={t("profile.page.changeAvatar")}
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
                    {profile?.is_host
                      ? t("profile.page.roles.hostTraveler")
                      : t("profile.page.roles.traveler")}
                    {memberSince
                      ? ` · ${t("profile.page.memberSince", { date: memberSince })}`
                      : ""}
                  </p>
                </>
              )}
            </div>
            <Button
              variant="outline"
              size="sm"
              className="shrink-0"
              onClick={openEditDialog}
            >
              <Pencil className="mr-1.5 size-3.5" />
              {t("profile.page.edit")}
            </Button>
          </div>

          {profile?.bio && (
            <p className="text-sm text-muted-foreground leading-relaxed border-t pt-4">
              {profile.bio}
            </p>
          )}
        </div>

        <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-4">
          <h2 className="font-semibold text-base">
            {t("profile.page.account")}
          </h2>
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

        <div className="rounded-2xl border bg-card p-6 shadow-sm space-y-3">
          <h2 className="font-semibold text-base">
            {t("profile.page.quickLinks")}
          </h2>
          <div className="grid grid-cols-2 gap-3">
            <Button
              variant="outline"
              className="h-auto py-3 flex-col gap-1"
              onClick={() => router.push(localizeHref("/bookings", pathname))}
            >
              <span className="text-base">📅</span>
              <span className="text-xs font-medium">
                {t("header.bookings")}
              </span>
            </Button>
            <Button
              variant="outline"
              className="h-auto py-3 flex-col gap-1"
              onClick={() => router.push(localizeHref("/settings", pathname))}
            >
              <span className="text-base">⚙️</span>
              <span className="text-xs font-medium">
                {t("header.settings")}
              </span>
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={isEditOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent className="sm:max-w-md" showCloseButton={!isSaving}>
          <DialogHeader>
            <DialogTitle>{t("profile.page.dialog.title")}</DialogTitle>
            <DialogDescription>
              {t("profile.page.dialog.description")}
            </DialogDescription>
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
                aria-label={t("profile.page.dialog.chooseAvatar")}
              >
                <Avatar className="size-16 border">
                  <AvatarImage
                    src={previewAvatarUrl}
                    alt={displayNameInput || displayName}
                  />
                  <AvatarFallback>
                    {getInitials(displayNameInput || displayName)}
                  </AvatarFallback>
                </Avatar>
                <span className="absolute -bottom-1 -right-1 rounded-full bg-primary p-1 text-primary-foreground">
                  <Camera className="size-3" />
                </span>
              </button>
              <div className="space-y-1">
                <p className="text-sm font-medium">
                  {t("profile.page.dialog.avatar")}
                </p>
                <p className="text-xs text-muted-foreground">
                  {t("profile.page.dialog.avatarHint")}
                </p>
              </div>
            </div>

            {formErrors.avatar && (
              <p className="text-xs text-destructive">{formErrors.avatar}</p>
            )}

            {isSaving && uploadProgress > 0 && (
              <div className="space-y-1">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <span>{t("profile.page.dialog.uploadingAvatar")}</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="h-2" />
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="display-name">
                {t("profile.page.dialog.displayName")}
              </Label>
              <Input
                id="display-name"
                value={displayNameInput}
                onChange={(event) => {
                  setDisplayNameInput(event.target.value);
                  setFormErrors((prev) => ({
                    ...prev,
                    displayName: undefined,
                  }));
                }}
                disabled={isSaving}
              />
              {formErrors.displayName && (
                <p className="text-xs text-destructive">
                  {formErrors.displayName}
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="bio">{t("profile.page.dialog.bio")}</Label>
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
                placeholder={t("profile.page.dialog.bioPlaceholder")}
              />
              <div className="flex items-center justify-between text-xs">
                {formErrors.bio ? (
                  <p className="text-destructive">{formErrors.bio}</p>
                ) : (
                  <span className="text-muted-foreground">
                    {t("profile.page.dialog.bioMax", { count: MAX_BIO_LENGTH })}
                  </span>
                )}
                <span
                  className={
                    bioInput.length > MAX_BIO_LENGTH
                      ? "text-destructive"
                      : "text-muted-foreground"
                  }
                >
                  {bioInput.length}/{MAX_BIO_LENGTH}
                </span>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => handleDialogOpenChange(false)}
              disabled={isSaving}
            >
              {t("profile.page.dialog.cancel")}
            </Button>
            <Button onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  {t("profile.page.dialog.saving")}
                </>
              ) : (
                t("profile.page.dialog.save")
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
