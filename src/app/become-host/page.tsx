"use client";

import { Check, ChevronLeft, Loader2, Upload, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { MarketingHeader } from "@/components/site/MarketingHeader";
import { useSiteI18n } from "@/components/site/site-i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { resolveStorageUrl } from "@/utils/functions";

/* ─── Types ─────────────────────────────────────────────────────── */

type SpecialtyName = Record<string, string>;
type Specialty = { id: string; name: SpecialtyName };

type FormData = {
  avatarUrl: string | null;
  name: string;
  bio: string;
  contactEmail: string;
  contactPhone: string;
  country: string;
  city: string;
  languages: string[];
  specialtyIds: string[];
  coverUrl: string | null;
};

const LANGUAGE_OPTIONS = [
  { code: "fr", label: "Français" },
  { code: "en", label: "English" },
  { code: "ar", label: "العربية" },
  { code: "es", label: "Español" },
];

const TOTAL_STEPS = 4;

/* ─── Main page ─────────────────────────────────────────────────── */

export default function BecomeHostPage() {
  const { t, locale } = useSiteI18n();
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const queryClient = useQueryClient();

  const [step, setStep] = useState(1);
  const [saving, setSaving] = useState(false);
  const [existingHostId, setExistingHostId] = useState<string | null>(null);
  const [checkingHost, setCheckingHost] = useState(true);
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [errors, setErrors] = useState<Partial<Record<keyof FormData, string>>>({});

  const [form, setForm] = useState<FormData>({
    avatarUrl: null,
    name: "",
    bio: "",
    contactEmail: "",
    contactPhone: "",
    country: "",
    city: "",
    languages: [],
    specialtyIds: [],
    coverUrl: null,
  });

  /* prefill email from auth user */
  useEffect(() => {
    if (user?.email && !form.contactEmail) {
      setForm((prev) => ({ ...prev, contactEmail: user.email ?? "" }));
    }
  }, [user]);

  /* check if already a host, and prefill if editing */
  useEffect(() => {
    if (!user) return;
    const supabase = createClient();

    (async () => {
      setCheckingHost(true);
      const { data } = await supabase
        .from("hosts")
        .select("*")
        .eq("owner_id", user.id)
        .is("deleted_at", null)
        .maybeSingle();

      if (data) {
        setExistingHostId(data.id);
        setForm({
          avatarUrl: data.avatar_url ?? null,
          name: data.name ?? "",
          bio: data.bio ?? "",
          contactEmail: data.email ?? user.email ?? "",
          contactPhone: data.phone ?? "",
          country: data.country ?? "",
          city: data.city ?? "",
          languages: data.languages ?? [],
          specialtyIds: data.specialty_ids ?? [],
          coverUrl: data.cover_image_url ?? null,
        });
      }
      setCheckingHost(false);
    })();
  }, [user]);

  /* fetch specialties */
  useEffect(() => {
    const supabase = createClient();
    supabase
      .from("host_specialties")
      .select("id, name")
      .eq("is_active", true)
      .order("display_order")
      .then(({ data }) => {
        if (!data) return;
        setSpecialties(
          data.map((s) => ({
            id: s.id,
            name: (typeof s.name === "object" && s.name !== null
              ? s.name
              : {}) as SpecialtyName,
          })),
        );
      });
  }, []);

  /* redirect unauthenticated users */
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/");
    }
  }, [authLoading, user, router]);

  function patch(field: keyof FormData, value: FormData[keyof FormData]) {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  function validateStep(s: number): boolean {
    const next: Partial<Record<keyof FormData, string>> = {};

    if (s === 1) {
      if (!form.name.trim()) next.name = t("host.becomeHost.validation.nameRequired");
      if (!form.contactEmail.trim()) next.contactEmail = t("host.becomeHost.validation.emailRequired");
    }
    if (s === 2) {
      if (!form.country.trim()) next.country = t("host.becomeHost.validation.countryRequired");
    }
    if (s === 3) {
      if (form.languages.length === 0) next.languages = t("host.becomeHost.validation.languageRequired");
    }

    setErrors(next);
    return Object.keys(next).length === 0;
  }

  function handleNext() {
    if (!validateStep(step)) return;
    setStep((s) => Math.min(s + 1, TOTAL_STEPS));
  }

  function handleBack() {
    setStep((s) => Math.max(s - 1, 1));
  }

  async function handleSubmit() {
    if (!validateStep(step) || !user) return;
    setSaving(true);

    try {
      const supabase = createClient();
      const payload = {
        owner_id: user.id,
        name: form.name.trim(),
        bio: form.bio.trim() || null,
        avatar_url: form.avatarUrl,
        country: form.country.trim(),
        city: form.city.trim() || null,
        email: form.contactEmail.trim() || null,
        phone: form.contactPhone.trim() || null,
        languages: form.languages,
        cover_image_url: form.coverUrl,
        status: "active" as const,
        specialty_ids: form.specialtyIds,
      };

      if (existingHostId) {
        const { error } = await supabase
          .from("hosts")
          .update(payload)
          .eq("id", existingHostId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("hosts").insert(payload);
        if (error) throw error;
      }

      await queryClient.invalidateQueries({ queryKey: ["host", user.id] });
      // Refetch the profile-host-mode query and wait for it to finish so that
      // canHost becomes true before the host layout's redirect guard runs.
      await queryClient.refetchQueries({ queryKey: ["profile-host-mode", user.id] });
      router.replace("/host");
    } catch {
      setErrors({ name: t("host.becomeHost.errors.saveFailed") });
    } finally {
      setSaving(false);
    }
  }

  if (authLoading || checkingHost) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const isEdit = Boolean(existingHostId);
  const pageTitle = isEdit ? t("host.becomeHost.editTitle") : t("host.becomeHost.pageTitle");

  return (
    <div className="flex min-h-[100dvh] flex-col bg-slate-50">
      <div className="bg-[#08090d] px-4 py-4 shadow-sm sm:px-8">
        <div className="mx-auto max-w-7xl">
          <MarketingHeader />
        </div>
      </div>

      <main className="flex flex-1 items-start justify-center px-4 py-10 sm:px-6">
        <div className="w-full max-w-lg">
          {/* Header */}
          <div className="mb-6 text-center">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {pageTitle}
            </h1>
            <p className="mt-1 text-sm text-slate-500">
              {t("host.becomeHost.stepIndicator", {
                current: step,
                total: TOTAL_STEPS,
              })}
            </p>
          </div>

          {/* Step progress */}
          <StepProgress current={step} total={TOTAL_STEPS} t={t} />

          {/* Step content */}
          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            {step === 1 && (
              <StepIdentity form={form} patch={patch} errors={errors} t={t} userId={user!.id} />
            )}
            {step === 2 && (
              <StepLocation form={form} patch={patch} errors={errors} t={t} />
            )}
            {step === 3 && (
              <StepExpertise
                form={form}
                patch={patch}
                errors={errors}
                t={t}
                specialties={specialties}
                locale={locale}
              />
            )}
            {step === 4 && (
              <StepCover form={form} patch={patch} errors={errors} t={t} userId={user!.id} />
            )}
          </div>

          {/* Navigation */}
          <div className="mt-4 flex items-center justify-between gap-3">
            {step > 1 ? (
              <Button variant="ghost" onClick={handleBack} className="gap-1">
                <ChevronLeft className="h-4 w-4" />
                {t("host.becomeHost.buttons.back")}
              </Button>
            ) : (
              <div />
            )}

            {step < TOTAL_STEPS ? (
              <Button onClick={handleNext}>
                {t("host.becomeHost.buttons.continue")}
              </Button>
            ) : (
              <Button onClick={handleSubmit} disabled={saving} className="gap-2">
                {saving && <Loader2 className="h-4 w-4 animate-spin" />}
                {isEdit
                  ? t("host.becomeHost.buttons.saveChanges")
                  : t("host.becomeHost.buttons.publishProfile")}
              </Button>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}

/* ─── Step progress bar ─────────────────────────────────────────── */

function StepProgress({
  current,
  total,
  t,
}: {
  current: number;
  total: number;
  t: ReturnType<typeof useSiteI18n>["t"];
}) {
  const stepKeys = ["identity", "location", "expertise", "cover"] as const;

  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }, (_, i) => {
        const n = i + 1;
        const done = n < current;
        const active = n === current;
        return (
          <div key={n} className="flex flex-1 flex-col items-center gap-1">
            <div
              className={cn(
                "flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold transition-colors",
                done
                  ? "bg-primary text-white"
                  : active
                    ? "border-2 border-primary text-primary"
                    : "border-2 border-slate-200 text-slate-400",
              )}
            >
              {done ? <Check className="h-4 w-4" /> : n}
            </div>
            <span
              className={cn(
                "hidden text-xs sm:block",
                active ? "font-medium text-slate-900" : "text-slate-400",
              )}
            >
              {t(`host.becomeHost.steps.${stepKeys[i]}.title` as never)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ─── Image upload helper ───────────────────────────────────────── */

async function uploadImage(
  file: File,
  userId: string,
  folder: "logos" | "covers",
): Promise<string> {
  const ext = file.name.split(".").pop() ?? "jpg";
  const path = `${folder}/${userId}-${Date.now()}.${ext}`;
  const supabase = createClient();
  const { error } = await supabase.storage
    .from("hosts")
    .upload(path, file, { upsert: true });
  if (error) throw error;
  return path;
}

/* ─── Avatar upload widget ──────────────────────────────────────── */

function AvatarUpload({
  value,
  onChange,
  userId,
  t,
}: {
  value: string | null;
  onChange: (path: string | null) => void;
  userId: string;
  t: ReturnType<typeof useSiteI18n>["t"];
}) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const previewUrl = value ? resolveStorageUrl(value, "hosts") : null;

  async function handleFile(file: File) {
    setUploading(true);
    try {
      const path = await uploadImage(file, userId, "logos");
      onChange(path);
    } catch {
      /* upload failed silently — user can retry */
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col items-center gap-3">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className={cn(
          "relative flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border-2 border-dashed transition-colors",
          uploading ? "border-primary/40" : "border-slate-300 hover:border-primary",
        )}
      >
        {previewUrl ? (
          <Image src={previewUrl} alt="logo" fill className="object-cover" />
        ) : uploading ? (
          <Loader2 className="h-6 w-6 animate-spin text-slate-400" />
        ) : (
          <Upload className="h-6 w-6 text-slate-400" />
        )}
      </button>
      <span className="text-xs text-slate-500">
        {uploading
          ? t("host.becomeHost.upload.uploading", { progress: "" })
          : previewUrl
            ? t("host.becomeHost.upload.replaceImage")
            : t("host.becomeHost.upload.tapToUploadLogo")}
      </span>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
    </div>
  );
}

/* ─── Cover upload widget ───────────────────────────────────────── */

function CoverUpload({
  value,
  onChange,
  userId,
  t,
}: {
  value: string | null;
  onChange: (path: string | null) => void;
  userId: string;
  t: ReturnType<typeof useSiteI18n>["t"];
}) {
  const [uploading, setUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const previewUrl = value ? resolveStorageUrl(value, "hosts") : null;

  async function handleFile(file: File) {
    setUploading(true);
    try {
      const path = await uploadImage(file, userId, "covers");
      onChange(path);
    } catch {
      /* upload failed silently — user can retry */
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        className={cn(
          "relative flex h-44 w-full items-center justify-center overflow-hidden rounded-xl border-2 border-dashed transition-colors",
          uploading ? "border-primary/40" : "border-slate-300 hover:border-primary",
        )}
      >
        {previewUrl ? (
          <>
            <Image src={previewUrl} alt="cover" fill className="object-cover" />
            <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 hover:opacity-100 transition-opacity">
              <Upload className="h-8 w-8 text-white" />
            </div>
          </>
        ) : uploading ? (
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        ) : (
          <div className="flex flex-col items-center gap-2 text-slate-400">
            <Upload className="h-8 w-8" />
            <span className="text-sm">{t("host.becomeHost.upload.uploadImage")}</span>
          </div>
        )}
      </button>
      <p className="text-center text-xs text-slate-400">
        {t("host.becomeHost.helpers.coverRatio")} · {t("host.becomeHost.helpers.coverImpact")}
      </p>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
    </div>
  );
}

/* ─── Step 1: Identity ──────────────────────────────────────────── */

type StepProps = {
  form: FormData;
  patch: (field: keyof FormData, value: FormData[keyof FormData]) => void;
  errors: Partial<Record<keyof FormData, string>>;
  t: ReturnType<typeof useSiteI18n>["t"];
};

function StepIdentity({
  form,
  patch,
  errors,
  t,
  userId,
}: StepProps & { userId: string }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">{t("host.becomeHost.steps.identity.title")}</h2>
        <p className="text-sm text-slate-500">{t("host.becomeHost.steps.identity.subtitle")}</p>
      </div>

      <AvatarUpload
        value={form.avatarUrl}
        onChange={(v) => patch("avatarUrl", v)}
        userId={userId}
        t={t}
      />

      <Field label={t("host.becomeHost.fields.brandName")} error={errors.name}>
        <Input
          value={form.name}
          onChange={(e) => patch("name", e.target.value)}
          placeholder={t("host.becomeHost.fields.brandNamePlaceholder")}
        />
      </Field>

      <Field label={t("host.becomeHost.fields.bio")}>
        <Textarea
          value={form.bio}
          onChange={(e) => patch("bio", e.target.value)}
          placeholder={t("host.becomeHost.fields.bioPlaceholder")}
          rows={3}
        />
      </Field>

      <Field label={t("host.becomeHost.fields.contactEmail")} error={errors.contactEmail}>
        <Input
          type="email"
          value={form.contactEmail}
          onChange={(e) => patch("contactEmail", e.target.value)}
          placeholder={t("host.becomeHost.fields.contactEmailPlaceholder")}
        />
      </Field>

      <Field
        label={t("host.becomeHost.fields.contactPhone")}
        helper={t("host.becomeHost.fields.contactPhoneHelper")}
      >
        <Input
          type="tel"
          value={form.contactPhone}
          onChange={(e) => patch("contactPhone", e.target.value)}
        />
      </Field>
    </div>
  );
}

/* ─── Step 2: Location ──────────────────────────────────────────── */

function StepLocation({ form, patch, errors, t }: StepProps) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">{t("host.becomeHost.steps.location.title")}</h2>
        <p className="text-sm text-slate-500">{t("host.becomeHost.steps.location.subtitle")}</p>
      </div>

      <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
        {t("host.becomeHost.helpers.location")}
      </p>

      <Field label={t("host.becomeHost.fields.country")} error={errors.country}>
        <Input
          value={form.country}
          onChange={(e) => patch("country", e.target.value)}
          placeholder={t("host.becomeHost.fields.countryPlaceholder")}
        />
      </Field>

      <Field label={t("host.becomeHost.fields.city")}>
        <Input
          value={form.city}
          onChange={(e) => patch("city", e.target.value)}
          placeholder={t("host.becomeHost.fields.cityPlaceholder")}
        />
      </Field>
    </div>
  );
}

/* ─── Step 3: Expertise ─────────────────────────────────────────── */

function resolveSpecialtyName(name: SpecialtyName, locale: string): string {
  return name[locale] ?? name["fr"] ?? name["en"] ?? Object.values(name)[0] ?? "";
}

function StepExpertise({
  form,
  patch,
  errors,
  t,
  specialties,
  locale,
}: StepProps & { specialties: Specialty[]; locale: string }) {
  function toggleLanguage(code: string) {
    const next = form.languages.includes(code)
      ? form.languages.filter((l) => l !== code)
      : [...form.languages, code];
    patch("languages", next);
  }

  function toggleSpecialty(id: string) {
    const next = form.specialtyIds.includes(id)
      ? form.specialtyIds.filter((s) => s !== id)
      : [...form.specialtyIds, id];
    patch("specialtyIds", next);
  }

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">{t("host.becomeHost.steps.expertise.title")}</h2>
        <p className="text-sm text-slate-500">{t("host.becomeHost.steps.expertise.subtitle")}</p>
      </div>

      <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-500">
        {t("host.becomeHost.helpers.expertise")}
      </p>

      <div>
        <Label className={cn(errors.languages ? "text-destructive" : "")}>
          {t("host.becomeHost.fields.languages")}
        </Label>
        <div className="mt-2 flex flex-wrap gap-2">
          {LANGUAGE_OPTIONS.map((lang) => {
            const active = form.languages.includes(lang.code);
            return (
              <button
                key={lang.code}
                type="button"
                onClick={() => toggleLanguage(lang.code)}
                className={cn(
                  "rounded-full border px-3 py-1 text-sm transition-colors",
                  active
                    ? "border-primary bg-primary text-white"
                    : "border-slate-200 hover:border-slate-400",
                )}
              >
                {lang.label}
              </button>
            );
          })}
        </div>
        {errors.languages && (
          <p className="mt-1 text-xs text-destructive">{errors.languages}</p>
        )}
      </div>

      {specialties.length > 0 && (
        <div>
          <Label>{t("host.becomeHost.fields.specialties")}</Label>
          <div className="mt-2 flex flex-wrap gap-2">
            {specialties.map((spec) => {
              const active = form.specialtyIds.includes(spec.id);
              return (
                <button
                  key={spec.id}
                  type="button"
                  onClick={() => toggleSpecialty(spec.id)}
                  className={cn(
                    "rounded-full border px-3 py-1 text-sm transition-colors",
                    active
                      ? "border-primary bg-primary text-white"
                      : "border-slate-200 hover:border-slate-400",
                  )}
                >
                  {resolveSpecialtyName(spec.name, locale)}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Step 4: Cover ─────────────────────────────────────────────── */

function StepCover({
  form,
  patch,
  errors,
  t,
  userId,
}: StepProps & { userId: string }) {
  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold">{t("host.becomeHost.steps.cover.title")}</h2>
        <p className="text-sm text-slate-500">{t("host.becomeHost.steps.cover.subtitle")}</p>
      </div>

      <CoverUpload
        value={form.coverUrl}
        onChange={(v) => patch("coverUrl", v)}
        userId={userId}
        t={t}
      />
    </div>
  );
}

/* ─── Field wrapper ─────────────────────────────────────────────── */

function Field({
  label,
  helper,
  error,
  children,
}: {
  label: string;
  helper?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-1.5">
      <Label className={cn(error ? "text-destructive" : "")}>{label}</Label>
      {children}
      {helper && !error && <p className="text-xs text-slate-400">{helper}</p>}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
