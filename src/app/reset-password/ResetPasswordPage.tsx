"use client";

import { CheckCircle2, Circle, Loader2, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type FormEvent, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import { localizeHref } from "@/lib/routing/locale-path";
import { cn } from "@/lib/utils";
import { useT } from "@/providers/translations-provider";

type MessageState = {
  type: "error" | "success";
  text: string;
};

function validatePassword(password: string) {
  const minLength = password.length >= 8;
  const hasUpperCase = /[A-Z]/.test(password);
  const hasLowerCase = /[a-z]/.test(password);
  const hasNumber = /[0-9]/.test(password);

  return minLength && hasUpperCase && hasLowerCase && hasNumber;
}

export function ResetPasswordPage() {
  const pathname = usePathname();
  const t = useT();
  const { supabase, user, loading } = useAuth();

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<MessageState | null>(null);

  const passwordStrength = useMemo(() => {
    if (newPassword.length === 0) {
      return "";
    }

    if (newPassword.length < 8) {
      return t("resetPasswordPage.strength.weak");
    }

    if (!validatePassword(newPassword)) {
      return t("resetPasswordPage.strength.medium");
    }

    return t("resetPasswordPage.strength.strong");
  }, [newPassword, t]);

  const passwordStrengthColor = useMemo(() => {
    if (passwordStrength === t("resetPasswordPage.strength.weak")) {
      return "text-red-500";
    }

    if (passwordStrength === t("resetPasswordPage.strength.medium")) {
      return "text-amber-500";
    }

    if (passwordStrength === t("resetPasswordPage.strength.strong")) {
      return "text-emerald-600";
    }

    return "text-muted-foreground";
  }, [passwordStrength, t]);

  const requirements = [
    {
      met: newPassword.length >= 8,
      label: t("resetPasswordPage.requirements.minLength"),
    },
    {
      met: /[A-Z]/.test(newPassword),
      label: t("resetPasswordPage.requirements.uppercase"),
    },
    {
      met: /[a-z]/.test(newPassword),
      label: t("resetPasswordPage.requirements.lowercase"),
    },
    {
      met: /[0-9]/.test(newPassword),
      label: t("resetPasswordPage.requirements.number"),
    },
  ];

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);

    if (!newPassword || !confirmPassword) {
      setMessage({
        type: "error",
        text: t("resetPasswordPage.messages.missingFields"),
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage({
        type: "error",
        text: t("resetPasswordPage.messages.passwordMismatch"),
      });
      return;
    }

    if (!validatePassword(newPassword)) {
      setMessage({
        type: "error",
        text: t("resetPasswordPage.messages.weakPassword"),
      });
      return;
    }

    setIsSubmitting(true);

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (error) {
      setMessage({ type: "error", text: error.message });
      setIsSubmitting(false);
      return;
    }

    setMessage({
      type: "success",
      text: t("resetPasswordPage.messages.success"),
    });
    setNewPassword("");
    setConfirmPassword("");
    setIsSubmitting(false);
  };

  const homeHref = localizeHref("/", pathname);

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_rgba(255,37,102,0.14),_transparent_32%),linear-gradient(180deg,_#fdf7f9_0%,_#ffffff_55%,_#f5f7fb_100%)] px-4 py-8">
      <div className="mx-auto flex min-h-[calc(100dvh-4rem)] max-w-md items-center">
        <div className="w-full rounded-[32px] border border-black/5 bg-white/95 p-6 shadow-[0_24px_80px_rgba(15,23,42,0.12)] backdrop-blur">
          <div className="mb-8 space-y-3">
            <div className="inline-flex items-center gap-2 rounded-full bg-black px-3 py-1 text-xs font-medium text-white">
              <ShieldCheck className="size-3.5" />
              Okeyo Travel
            </div>
            <h1 className="text-3xl font-semibold tracking-tight text-foreground">
              {t("resetPasswordPage.title")}
            </h1>
            <p className="text-sm leading-6 text-muted-foreground">
              {loading
                ? t("resetPasswordPage.messages.loading")
                : t("resetPasswordPage.description")}
            </p>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="size-5 animate-spin" />
            </div>
          ) : !user ? (
            <div className="space-y-4 rounded-3xl border border-dashed border-border bg-muted/40 p-5">
              <p className="text-sm leading-6 text-muted-foreground">
                {t("resetPasswordPage.messages.invalidRecoveryLink")}
              </p>
              <Button asChild className="h-11 rounded-full">
                <Link href={homeHref}>{t("resetPasswordPage.backToHome")}</Link>
              </Button>
            </div>
          ) : (
            <form className="space-y-5" onSubmit={handleSubmit}>
              <div className="space-y-2">
                <Label htmlFor="new-password">
                  {t("resetPasswordPage.newPasswordLabel")}
                </Label>
                <Input
                  id="new-password"
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  autoComplete="new-password"
                  placeholder={t("resetPasswordPage.newPasswordPlaceholder")}
                  className="h-11 rounded-full bg-muted/60"
                  required
                />
              </div>

              {newPassword.length > 0 ? (
                <div className="rounded-3xl bg-muted/40 p-4">
                  <p className="text-sm text-muted-foreground">
                    {t("resetPasswordPage.passwordStrength")}{" "}
                    <span className={cn("font-medium", passwordStrengthColor)}>
                      {passwordStrength}
                    </span>
                  </p>
                </div>
              ) : null}

              <div className="space-y-2">
                <Label htmlFor="confirm-password">
                  {t("resetPasswordPage.confirmPasswordLabel")}
                </Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  autoComplete="new-password"
                  placeholder={t(
                    "resetPasswordPage.confirmPasswordPlaceholder",
                  )}
                  className="h-11 rounded-full bg-muted/60"
                  required
                />
              </div>

              <div className="rounded-3xl border border-border bg-muted/20 p-4">
                <p className="mb-3 text-sm font-medium text-foreground">
                  {t("resetPasswordPage.requirements.title")}
                </p>
                <div className="space-y-2">
                  {requirements.map((requirement) => (
                    <div
                      key={requirement.label}
                      className="flex items-center gap-2 text-sm text-muted-foreground"
                    >
                      {requirement.met ? (
                        <CheckCircle2 className="size-4 text-emerald-600" />
                      ) : (
                        <Circle className="size-4" />
                      )}
                      <span>{requirement.label}</span>
                    </div>
                  ))}
                </div>
              </div>

              {message ? (
                <div
                  className={cn(
                    "rounded-2xl px-4 py-3 text-sm",
                    message.type === "error"
                      ? "bg-destructive/10 text-destructive"
                      : "bg-emerald-50 text-emerald-700",
                  )}
                >
                  {message.text}
                </div>
              ) : null}

              <Button
                type="submit"
                className="h-11 w-full rounded-full bg-[#ff2566] text-white hover:bg-[#e0205a]"
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="size-4 animate-spin" />
                    {t("common.loading")}
                  </>
                ) : (
                  t("resetPasswordPage.submit")
                )}
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
