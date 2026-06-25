"use client";

import { LegalNotice } from "@/components/legal/LegalNotice";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  PhoneInput,
  normalizePhoneNumber,
  type PhoneCountry,
} from "@/components/ui/phone-input";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/use-auth";
import { useIsMobile } from "@/hooks/use-mobile";
import { ANALYTICS_EVENT } from "@/lib/analytics/events";
import { captureEvent } from "@/lib/analytics/posthog";
import { trackBrevoEvent } from "@/lib/brevo/events";
import { syncUserToBrevo } from "@/lib/brevo/sync";
import { localizeHref } from "@/lib/routing/locale-path";
import { cn } from "@/lib/utils";
import { useT } from "@/providers/translations-provider";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";

type MessageState = {
  type: "error" | "success";
  text: string;
};

const SUPPORTED_SIGNUP_LANGUAGES = new Set(["fr", "ar", "en"]);

function getPreferredLanguageFromPathname(pathname: string) {
  const candidate = pathname.split("/")[1];
  return SUPPORTED_SIGNUP_LANGUAGES.has(candidate) ? candidate : "fr";
}

function AppleLogo({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      className={className}
      viewBox="0 0 24 24"
      fill="currentColor"
    >
      <path d="M16.365 12.59c.01 2.704 2.376 3.604 2.402 3.616-.02.063-.378 1.306-1.245 2.587-.748 1.106-1.525 2.209-2.747 2.232-1.2.022-1.586-.71-2.96-.71-1.375 0-1.803.687-2.938.732-1.178.045-2.078-1.186-2.832-2.287-1.54-2.237-2.718-6.323-1.137-9.071.785-1.366 2.189-2.23 3.714-2.252 1.156-.022 2.247.777 2.96.777.711 0 2.048-.961 3.45-.819.587.024 2.238.237 3.298 1.79-.085.053-1.968 1.15-1.965 3.405Zm-2.29-6.091c.63-.762 1.056-1.823.94-2.88-.908.036-2.006.606-2.658 1.367-.585.676-1.097 1.756-.959 2.793 1.012.079 2.046-.516 2.677-1.28Z" />
    </svg>
  );
}

export function AuthModal() {
  const isMobile = useIsMobile();
  const pathname = usePathname();
  const t = useT();
  const { authModalOpen, authMode, closeAuthModal, setAuthMode, supabase } =
    useAuth();
  const appleAuthEnabled =
    process.env.NEXT_PUBLIC_APPLE_AUTH_ENABLED === "true";

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState("");
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPhone, setSignupPhone] = useState("");
  const [signupPhoneCountry, setSignupPhoneCountry] =
    useState<PhoneCountry>("MA");
  const [signupPassword, setSignupPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<MessageState | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsError, setTermsError] = useState<string | null>(null);

  useEffect(() => {
    if (!authModalOpen) {
      setLoginEmail("");
      setLoginPassword("");
      setForgotPasswordEmail("");
      setSignupName("");
      setSignupEmail("");
      setSignupPhone("");
      setSignupPhoneCountry("MA");
      setSignupPassword("");
      setMessage(null);
      setTermsAccepted(false);
      setTermsError(null);
    }
  }, [authModalOpen]);

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      closeAuthModal();
    }
  };

  const handleModeChange = (mode: "login" | "signup" | "forgot-password") => {
    setMessage(null);
    setIsSubmitting(false);
    setAuthMode(mode);
  };

  const handleLogin = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail.trim(),
      password: loginPassword,
    });

    if (error) {
      captureEvent(ANALYTICS_EVENT.AUTH_LOGIN_FAILED, {
        method: "email",
        error_message: error.message,
      });
      setMessage({ type: "error", text: error.message });
      setIsSubmitting(false);
      return;
    }

    captureEvent(ANALYTICS_EVENT.AUTH_LOGIN_SUCCESS, { method: "email" });
    setIsSubmitting(false);
  };

  const handleSignup = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);
    setTermsError(null);

    if (!termsAccepted) {
      setTermsError(t("authModal.legalCheckboxRequired"));
      setIsSubmitting(false);
      return;
    }

    if (!signupName.trim()) {
      setMessage({ type: "error", text: t("authModal.messages.nameRequired") });
      setIsSubmitting(false);
      return;
    }

    if (!signupPhone.trim()) {
      setMessage({
        type: "error",
        text: t("authModal.messages.phoneRequired"),
      });
      setIsSubmitting(false);
      return;
    }

    const normalizedPhone = normalizePhoneNumber(
      signupPhone,
      signupPhoneCountry,
    );
    const preferredLanguage = getPreferredLanguageFromPathname(pathname);

    if (!normalizedPhone) {
      setMessage({
        type: "error",
        text: t("authModal.messages.invalidPhone"),
      });
      setIsSubmitting(false);
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email: signupEmail.trim(),
      password: signupPassword,
      options: {
        data: {
          display_name: signupName.trim(),
          phone: normalizedPhone,
          phone_country: signupPhoneCountry,
          preferred_language: preferredLanguage,
        },
      },
    });

    if (error) {
      captureEvent(ANALYTICS_EVENT.AUTH_LOGIN_FAILED, {
        method: "email_signup",
        error_message: error.message,
      });
      setMessage({ type: "error", text: error.message });
      setIsSubmitting(false);
      return;
    }

    if (data.session && data.user) {
      const { error: profileError } = await supabase.from("profiles").upsert(
        {
          id: data.user.id,
          display_name: signupName.trim(),
          phone: normalizedPhone,
          phone_verified: false,
          preferred_language: preferredLanguage,
          currency: "MAD",
          metadata: {
            onboarding_complete: false,
          },
        },
        { onConflict: "id" },
      );

      if (profileError) {
        setMessage({ type: "error", text: profileError.message });
        setIsSubmitting(false);
        return;
      }

      // Sync to Brevo + trigger welcome flow (fire-and-forget)
      void syncUserToBrevo({
        email: signupEmail.trim(),
        displayName: signupName.trim(),
        language: preferredLanguage,
      }).then(() => {
        void trackBrevoEvent(signupEmail.trim(), "user_signed_up");
      });
    }

    if (!data.session) {
      setMessage({
        type: "success",
        text: t("authModal.messages.emailConfirmation"),
      });
      captureEvent(ANALYTICS_EVENT.AUTH_SIGNUP_SUCCESS, {
        method: "email",
        email_confirmation_required: true,
      });
      setIsSubmitting(false);
      return;
    }

    captureEvent(ANALYTICS_EVENT.AUTH_SIGNUP_SUCCESS, {
      method: "email",
      email_confirmation_required: false,
    });
    setIsSubmitting(false);
  };

  const handleForgotPassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    setMessage(null);

    const email = forgotPasswordEmail.trim();

    if (!email || !email.includes("@")) {
      setMessage({
        type: "error",
        text: t("authModal.messages.invalidEmail"),
      });
      setIsSubmitting(false);
      return;
    }

    const redirectTo = new URL(
      localizeHref("/reset-password", pathname),
      window.location.origin,
    ).toString();

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo,
    });

    if (error) {
      setMessage({ type: "error", text: error.message });
      setIsSubmitting(false);
      return;
    }

    setMessage({
      type: "success",
      text: t("authModal.messages.resetPasswordSent", { email }),
    });
    setIsSubmitting(false);
  };

  const handleOAuthSignIn = async (provider: "google" | "apple") => {
    if (provider === "apple" && !appleAuthEnabled) {
      captureEvent(ANALYTICS_EVENT.AUTH_LOGIN_FAILED, {
        method: provider,
        error_message: "apple_oauth_not_configured",
      });
      setMessage({
        type: "error",
        text: t("authModal.messages.appleNotConfigured"),
      });
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: window.location.origin + window.location.pathname,
      },
    });

    if (error) {
      captureEvent(ANALYTICS_EVENT.AUTH_LOGIN_FAILED, {
        method: provider,
        error_message: error.message,
      });
      const normalizedError = error.message.toLowerCase();
      if (
        normalizedError.includes("cancel") ||
        normalizedError.includes("denied")
      ) {
        setMessage({
          type: "error",
          text: t("authModal.messages.oauthCancelled"),
        });
      } else if (normalizedError.includes("missing oauth secret")) {
        setMessage({
          type: "error",
          text: t("authModal.messages.appleNotConfigured"),
        });
      } else {
        setMessage({ type: "error", text: error.message });
      }
      setIsSubmitting(false);
      return;
    }

    captureEvent(ANALYTICS_EVENT.AUTH_LOGIN_SUCCESS, { method: provider });
  };

  const headerCopy = useMemo(() => {
    if (authMode === "login") {
      return {
        title: t("authModal.login.title"),
        description: t("authModal.login.description"),
      };
    }

    if (authMode === "signup") {
      return {
        title: t("authModal.signup.title"),
        description: t("authModal.signup.description"),
      };
    }

    return {
      title: t("authModal.forgotPassword.title"),
      description: t("authModal.forgotPassword.description"),
    };
  }, [authMode, t]);

  const content = (
    <div
      className={cn(
        "flex flex-col gap-6 bg-white px-6 pb-8 pt-6 text-foreground",
        isMobile ? "rounded-t-[32px]" : "rounded-[32px]",
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight">
            {headerCopy.title}
          </h2>
          <p className="text-sm text-muted-foreground">
            {headerCopy.description}
          </p>
        </div>
        {isMobile ? (
          <DrawerClose asChild>
            <button
              type="button"
              className="text-muted-foreground text-sm hover:text-foreground"
            >
              {t("authModal.close")}
            </button>
          </DrawerClose>
        ) : null}
      </div>

      {authMode === "login" ? (
        <form className="flex flex-col gap-4" onSubmit={handleLogin}>
          <div className="space-y-2">
            <Label htmlFor="login-email">
              {t("authModal.login.emailLabel")}
            </Label>
            <Input
              id="login-email"
              type="email"
              value={loginEmail}
              onChange={(event) => setLoginEmail(event.target.value)}
              autoComplete="email"
              placeholder={t("authModal.login.emailPlaceholder")}
              className="h-11 rounded-full bg-muted/60"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="login-password">
              {t("authModal.login.passwordLabel")}
            </Label>
            <Input
              id="login-password"
              type="password"
              value={loginPassword}
              onChange={(event) => setLoginPassword(event.target.value)}
              autoComplete="current-password"
              placeholder={t("authModal.login.passwordPlaceholder")}
              className="h-11 rounded-full bg-muted/60"
              required
            />
          </div>
          <button
            type="button"
            className="self-end text-sm font-medium text-[#ff2566] hover:text-[#e0205a]"
            onClick={() => {
              setForgotPasswordEmail(loginEmail.trim());
              handleModeChange("forgot-password");
            }}
          >
            {t("authModal.login.forgotPassword")}
          </button>
          {message ? (
            <div
              className={cn(
                "rounded-lg px-3 py-2 text-sm",
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
            className="h-11 rounded-full bg-[#ff2566] text-white hover:bg-[#e0205a]"
            disabled={isSubmitting}
          >
            {t("authModal.login.submit")}
          </Button>
        </form>
      ) : authMode === "signup" ? (
        <form className="flex flex-col gap-4" onSubmit={handleSignup}>
          <div className="space-y-2">
            <Label htmlFor="signup-name">
              {t("authModal.signup.nameLabel")}
            </Label>
            <Input
              id="signup-name"
              type="text"
              value={signupName}
              onChange={(event) => setSignupName(event.target.value)}
              placeholder={t("authModal.signup.namePlaceholder")}
              className="h-11 rounded-full bg-muted/60"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="signup-email">
              {t("authModal.signup.emailLabel")}
            </Label>
            <Input
              id="signup-email"
              type="email"
              value={signupEmail}
              onChange={(event) => setSignupEmail(event.target.value)}
              autoComplete="email"
              placeholder={t("authModal.signup.emailPlaceholder")}
              className="h-11 rounded-full bg-muted/60"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="signup-phone">
              {t("authModal.signup.phoneLabel")}
            </Label>
            <PhoneInput
              id="signup-phone"
              value={signupPhone}
              country={signupPhoneCountry}
              onValueChange={setSignupPhone}
              onCountryChange={setSignupPhoneCountry}
              countryLabel={t("authModal.signup.phoneCountryLabel")}
              placeholder={t("authModal.signup.phonePlaceholder")}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="signup-password">
              {t("authModal.signup.passwordLabel")}
            </Label>
            <Input
              id="signup-password"
              type="password"
              value={signupPassword}
              onChange={(event) => setSignupPassword(event.target.value)}
              autoComplete="new-password"
              placeholder={t("authModal.signup.passwordPlaceholder")}
              className="h-11 rounded-full bg-muted/60"
              required
            />
          </div>
          {message ? (
            <div
              className={cn(
                "rounded-lg px-3 py-2 text-sm",
                message.type === "error"
                  ? "bg-destructive/10 text-destructive"
                  : "bg-emerald-50 text-emerald-700",
              )}
            >
              {message.text}
            </div>
          ) : null}
          <LegalNotice
            requireCheckbox
            checkboxChecked={termsAccepted}
            onCheckboxChange={(checked) => {
              setTermsAccepted(checked);
              if (checked) setTermsError(null);
            }}
            checkboxError={termsError ?? undefined}
            textClassName="text-sm text-muted-foreground"
            onLinkClick={closeAuthModal}
          />
          <LegalNotice
            variant="dataProcessing"
            textClassName="text-xs text-muted-foreground"
          />
          <Button
            type="submit"
            className="h-11 rounded-full bg-[#ff2566] text-white hover:bg-[#e0205a]"
            disabled={isSubmitting}
          >
            {t("authModal.signup.submit")}
          </Button>
        </form>
      ) : (
        <form className="flex flex-col gap-4" onSubmit={handleForgotPassword}>
          <div className="space-y-2">
            <Label htmlFor="forgot-password-email">
              {t("authModal.forgotPassword.emailLabel")}
            </Label>
            <Input
              id="forgot-password-email"
              type="email"
              value={forgotPasswordEmail}
              onChange={(event) => setForgotPasswordEmail(event.target.value)}
              autoComplete="email"
              placeholder={t("authModal.forgotPassword.emailPlaceholder")}
              className="h-11 rounded-full bg-muted/60"
              required
            />
          </div>
          {message ? (
            <div
              className={cn(
                "rounded-lg px-3 py-2 text-sm",
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
            className="h-11 rounded-full bg-[#ff2566] text-white hover:bg-[#e0205a]"
            disabled={isSubmitting}
          >
            {t("authModal.forgotPassword.submit")}
          </Button>
          <button
            type="button"
            className="text-sm font-medium text-muted-foreground hover:text-foreground"
            onClick={() => handleModeChange("login")}
          >
            {t("authModal.forgotPassword.backToLogin")}
          </button>
        </form>
      )}

      {authMode !== "forgot-password" ? (
        <>
          <p className="text-center text-sm text-muted-foreground">
            {authMode === "login"
              ? t("authModal.login.switchPrompt")
              : t("authModal.signup.switchPrompt")}{" "}
            <button
              type="button"
              onClick={() =>
                handleModeChange(authMode === "login" ? "signup" : "login")
              }
              className="font-semibold text-foreground hover:text-[#ff2566]"
            >
              {authMode === "login"
                ? t("authModal.login.switchAction")
                : t("authModal.signup.switchAction")}
            </button>
          </p>

          <div className="flex items-center gap-3">
            <Separator className="flex-1" />
            <span className="text-xs text-muted-foreground">
              {t("authModal.orContinueWith")}
            </span>
            <Separator className="flex-1" />
          </div>

          {/* <Button
            type="button"
            variant="outline"
            onClick={() => handleOAuthSignIn("google")}
            className="h-11 rounded-full border border-input"
            disabled={isSubmitting}
          >
            {t("authModal.continueWithGoogle")}
          </Button> */}
          {/* <Button
            type="button"
            onClick={() => handleOAuthSignIn("apple")}
            className="h-11 rounded-full bg-black text-white hover:bg-black/90"
            disabled={isSubmitting}
          >
            <AppleLogo className="mr-2 h-4 w-4" />
            {t("authModal.continueWithApple")}
          </Button> */}
        </>
      ) : null}

      {authMode !== "signup" && (
        <LegalNotice
          className="text-center"
          textClassName="text-xs leading-6 text-muted-foreground"
          onLinkClick={closeAuthModal}
        />
      )}
    </div>
  );

  if (isMobile) {
    return (
      <Drawer open={authModalOpen} onOpenChange={handleOpenChange}>
        <DrawerContent className="border-none bg-transparent px-0 pb-0">
          <DrawerHeader className="hidden">
            <DrawerTitle>{headerCopy.title}</DrawerTitle>
            <DrawerDescription>{headerCopy.description}</DrawerDescription>
          </DrawerHeader>
          {content}
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={authModalOpen} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[540px] border-none bg-transparent p-0 shadow-none">
        <DialogHeader className="sr-only">
          <DialogTitle>{headerCopy.title}</DialogTitle>
          <DialogDescription>{headerCopy.description}</DialogDescription>
        </DialogHeader>
        {content}
      </DialogContent>
    </Dialog>
  );
}
