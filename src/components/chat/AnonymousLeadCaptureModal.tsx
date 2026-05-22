"use client";

import { Loader2 } from "lucide-react";
import { usePathname } from "next/navigation";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { useSiteI18n } from "@/components/site/site-i18n";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  normalizePhoneNumber,
  type PhoneCountry,
  PhoneInput,
} from "@/components/ui/phone-input";
import { ANALYTICS_EVENT } from "@/lib/analytics/events";
import { captureEvent } from "@/lib/analytics/posthog";

interface AnonymousLeadCaptureModalProps {
  open: boolean;
  clientId?: string | null;
  conversationId?: string | null;
  onDismiss: () => void;
  onSubmitted: () => void;
}

const SIMPLE_EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function AnonymousLeadCaptureModal({
  open,
  clientId,
  conversationId,
  onDismiss,
  onSubmitted,
}: AnonymousLeadCaptureModalProps) {
  const pathname = usePathname();
  const { locale, t } = useSiteI18n();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneCountry, setPhoneCountry] = useState<PhoneCountry>("MA");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const analyticsContext = useMemo(
    () => ({
      source: "chat_modal",
      pathname,
      locale,
      conversation_id: conversationId,
      has_client_id: !!clientId,
    }),
    [clientId, conversationId, locale, pathname],
  );

  useEffect(() => {
    if (open) return;

    setName("");
    setEmail("");
    setPhone("");
    setPhoneCountry("MA");
    setError(null);
    setIsSubmitting(false);
  }, [open]);

  useEffect(() => {
    if (!open) return;

    captureEvent(ANALYTICS_EVENT.CHAT_LEAD_CAPTURE_OPENED, analyticsContext);
  }, [analyticsContext, open]);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (isSubmitting) return;

    if (!phone.trim()) {
      setError(t("authModal.messages.phoneRequired"));
      return;
    }

    const normalizedPhone = normalizePhoneNumber(phone, phoneCountry);

    if (!normalizedPhone) {
      setError(t("authModal.messages.invalidPhone"));
      return;
    }

    const normalizedEmail = email.trim().toLowerCase();

    if (normalizedEmail && !SIMPLE_EMAIL_REGEX.test(normalizedEmail)) {
      setError(t("authModal.messages.invalidEmail"));
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch("/api/potential-users", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: name.trim(),
          email: normalizedEmail,
          phone: normalizedPhone,
          phoneCountry,
          locale,
          path: pathname,
          clientId,
          conversationId,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as {
          error?: string;
        } | null;

        throw new Error(
          payload?.error || t("chat.leadCapture.messages.submitError"),
        );
      }

      captureEvent(ANALYTICS_EVENT.CHAT_LEAD_CAPTURE_SUBMITTED, {
        ...analyticsContext,
        has_name: name.trim().length > 0,
        has_email: normalizedEmail.length > 0,
        phone_country: phoneCountry,
      });
      onSubmitted();
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : t("chat.leadCapture.messages.submitError"),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLaterClick = () => {
    captureEvent(ANALYTICS_EVENT.CHAT_LEAD_CAPTURE_LATER_CLICKED, {
      ...analyticsContext,
      has_name: name.trim().length > 0,
      has_email: email.trim().length > 0,
      has_phone: phone.trim().length > 0,
    });
    onDismiss();
  };

  const clearError = () => {
    if (error) {
      setError(null);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !isSubmitting) {
          onDismiss();
        }
      }}
    >
      <DialogContent
        className="w-[calc(100vw-1.5rem)] max-w-[560px] border-none bg-transparent p-0 shadow-none"
        overlayClassName="bg-black/28 backdrop-blur-xs"
        onInteractOutside={(event) => event.preventDefault()}
        onEscapeKeyDown={(event) => event.preventDefault()}
        showCloseButton={false}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>{t("chat.leadCapture.title")}</DialogTitle>
          <DialogDescription>
            {t("chat.leadCapture.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="rounded-[32px] border border-black/5 bg-white/96 p-6 shadow-[0_28px_90px_rgba(15,23,42,0.16)] backdrop-blur sm:p-8">
          <div className="space-y-6">
            <div className="space-y-4">
              <p className="text-lg leading-none">
                {t("chat.leadCapture.eyebrow")}
              </p>
              <div className="space-y-3">
                <h2 className="text-2xl font-semibold tracking-[-0.03em] text-slate-950 sm:text-[2rem]">
                  {t("chat.leadCapture.title")}
                </h2>
                <p className="text-base leading-7 text-slate-600">
                  {t("chat.leadCapture.description")}
                </p>
              </div>
            </div>

            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="space-y-3">
                <div className="space-y-2">
                  <Label className="sr-only" htmlFor="chat-lead-name">
                    {t("chat.leadCapture.fields.nameLabel")}
                  </Label>
                  <Input
                    id="chat-lead-name"
                    type="text"
                    value={name}
                    onChange={(event) => {
                      setName(event.target.value);
                      clearError();
                    }}
                    placeholder={t("chat.leadCapture.fields.namePlaceholder")}
                    autoComplete="name"
                    className="h-12 rounded-2xl border-black/10 bg-white px-4 text-base shadow-none placeholder:text-slate-400"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="sr-only" htmlFor="chat-lead-phone">
                    {t("chat.leadCapture.fields.phoneLabel")}
                  </Label>
                  <PhoneInput
                    id="chat-lead-phone"
                    value={phone}
                    country={phoneCountry}
                    onValueChange={(nextPhone) => {
                      setPhone(nextPhone);
                      clearError();
                    }}
                    onCountryChange={(nextCountry) => {
                      setPhoneCountry(nextCountry);
                      clearError();
                    }}
                    countryLabel={t(
                      "chat.leadCapture.fields.phoneCountryLabel",
                    )}
                    placeholder={t("chat.leadCapture.fields.phonePlaceholder")}
                    className="h-12 rounded-2xl border-black/10 bg-white shadow-none"
                    aria-invalid={error ? true : undefined}
                    required
                  />
                  <p className="px-1 text-xs text-slate-500">
                    {t("chat.leadCapture.fields.phoneRequiredCaption")}
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="sr-only" htmlFor="chat-lead-email">
                    {t("chat.leadCapture.fields.emailLabel")}
                  </Label>
                  <Input
                    id="chat-lead-email"
                    type="email"
                    value={email}
                    onChange={(event) => {
                      setEmail(event.target.value);
                      clearError();
                    }}
                    placeholder={t("chat.leadCapture.fields.emailPlaceholder")}
                    autoComplete="email"
                    className="h-12 rounded-2xl border-black/10 bg-white px-4 text-base shadow-none placeholder:text-slate-400"
                  />
                </div>
              </div>

              {error ? (
                <p className="text-sm text-destructive">{error}</p>
              ) : null}

              <div className="space-y-3 pt-2">
                <Button
                  type="submit"
                  className="h-12 w-full rounded-2xl bg-[#ff1f7a] text-base font-semibold text-white shadow-[0_18px_32px_rgba(255,31,122,0.28)] hover:bg-[#e1176d]"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : null}
                  {t("chat.leadCapture.submit")}
                </Button>

                <button
                  type="button"
                  className="mx-auto block text-sm font-medium text-slate-400 underline-offset-4 transition-colors hover:text-slate-600 hover:underline"
                  onClick={handleLaterClick}
                  disabled={isSubmitting}
                >
                  {t("chat.leadCapture.later")}
                </button>
              </div>
            </form>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
