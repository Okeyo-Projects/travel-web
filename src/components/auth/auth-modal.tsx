"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { type FormEvent, useEffect, useMemo, useState } from "react";
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
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/hooks/use-auth";
import { useIsMobile } from "@/hooks/use-mobile";
import { ANALYTICS_EVENT } from "@/lib/analytics/events";
import { captureEvent } from "@/lib/analytics/posthog";
import { localizeHref } from "@/lib/routing/locale-path";
import { cn } from "@/lib/utils";
import { useT } from "@/providers/translations-provider";

type MessageState = {
  type: "error" | "success";
  text: string;
};

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

  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [signupName, setSignupName] = useState("");
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<MessageState | null>(null);

  useEffect(() => {
    if (!authModalOpen) {
      setLoginEmail("");
      setLoginPassword("");
      setSignupName("");
      setSignupEmail("");
      setSignupPassword("");
      setMessage(null);
    }
  }, [authModalOpen]);

  const handleOpenChange = (open: boolean) => {
    if (!open) {
      closeAuthModal();
    }
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

    if (!signupName.trim()) {
      setMessage({ type: "error", text: t("authModal.messages.nameRequired") });
      setIsSubmitting(false);
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email: signupEmail.trim(),
      password: signupPassword,
      options: {
        data: {
          display_name: signupName.trim(),
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

  const handleOAuthSignIn = async (provider: "google" | "apple") => {
    setIsSubmitting(true);
    setMessage(null);

    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: window.location.href,
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
      } else {
        setMessage({ type: "error", text: error.message });
      }
      setIsSubmitting(false);
      return;
    }

    captureEvent(ANALYTICS_EVENT.AUTH_LOGIN_SUCCESS, { method: provider });
  };

  const headerCopy = useMemo(() => {
    return authMode === "login"
      ? {
          title: t("authModal.login.title"),
          description: t("authModal.login.description"),
        }
      : {
          title: t("authModal.signup.title"),
          description: t("authModal.signup.description"),
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
      ) : (
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
          <Button
            type="submit"
            className="h-11 rounded-full bg-[#ff2566] text-white hover:bg-[#e0205a]"
            disabled={isSubmitting}
          >
            {t("authModal.signup.submit")}
          </Button>
        </form>
      )}

      <p className="text-center text-sm text-muted-foreground">
        {authMode === "login"
          ? t("authModal.login.switchPrompt")
          : t("authModal.signup.switchPrompt")}{" "}
        <button
          type="button"
          onClick={() => setAuthMode(authMode === "login" ? "signup" : "login")}
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

      <Button
        type="button"
        variant="outline"
        onClick={() => handleOAuthSignIn("google")}
        className="h-11 rounded-full border border-input"
        disabled={isSubmitting}
      >
        {t("authModal.continueWithGoogle")}
      </Button>
      <Button
        type="button"
        onClick={() => handleOAuthSignIn("apple")}
        className="h-11 rounded-full bg-black text-white hover:bg-black/90"
        disabled={isSubmitting}
      >
        <AppleLogo className="mr-2 h-4 w-4" />
        {t("authModal.continueWithApple")}
      </Button>

      <p className="text-center text-xs leading-6 text-muted-foreground">
        {t("authModal.legalPrefix")}{" "}
        <Link
          href={localizeHref("/terms", pathname)}
          className="font-medium text-foreground hover:text-primary"
        >
          {t("authModal.legalTerms")}
        </Link>{" "}
        {t("authModal.legalAnd")}{" "}
        <Link
          href={localizeHref("/privacy", pathname)}
          className="font-medium text-foreground hover:text-primary"
        >
          {t("authModal.legalPrivacy")}
        </Link>
        .
      </p>
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
