"use client";

import { Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useSiteI18n } from "@/components/site/site-i18n";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  normalizePhoneNumber,
  type PhoneCountry,
  PhoneInput,
} from "@/components/ui/phone-input";
import { useAuth } from "@/hooks/use-auth";
import { saveProfilePhone } from "@/lib/profile-phone";
import { createClient } from "@/lib/supabase/client";

interface PhoneRequirementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => Promise<void> | void;
}

export function PhoneRequirementDialog({
  open,
  onOpenChange,
  onSuccess,
}: PhoneRequirementDialogProps) {
  const { t } = useSiteI18n();
  const { user } = useAuth();
  const [phone, setPhone] = useState("");
  const [country, setCountry] = useState<PhoneCountry>("MA");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (open) return;

    setPhone("");
    setCountry("MA");
    setError(null);
    setIsSubmitting(false);
  }, [open]);

  const handleSave = async () => {
    if (!user || isSubmitting) return;

    if (!phone.trim()) {
      setError(t("authModal.messages.phoneRequired"));
      return;
    }

    const normalizedPhone = normalizePhoneNumber(phone, country);

    if (!normalizedPhone) {
      setError(t("authModal.messages.invalidPhone"));
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const supabase = createClient();
      await saveProfilePhone(supabase, user, normalizedPhone, country);
      onOpenChange(false);
      await onSuccess();
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : t("booking.phoneRequirement.errorSave"),
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!isSubmitting) {
          onOpenChange(nextOpen);
        }
      }}
    >
      <DialogContent className="max-w-md w-[calc(100vw-1.5rem)] sm:w-full">
        <DialogHeader>
          <DialogTitle>{t("booking.phoneRequirement.title")}</DialogTitle>
          <DialogDescription>
            {t("booking.phoneRequirement.description")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label htmlFor="booking-phone">
            {t("booking.phoneRequirement.label")}
          </Label>
          <PhoneInput
            id="booking-phone"
            value={phone}
            country={country}
            countryLabel={t("booking.phoneRequirement.countryLabel")}
            placeholder={t("booking.phoneRequirement.placeholder")}
            onValueChange={(nextPhone) => {
              setPhone(nextPhone);
              if (error) {
                setError(null);
              }
            }}
            onCountryChange={(nextCountry) => {
              setCountry(nextCountry);
              if (error) {
                setError(null);
              }
            }}
            aria-invalid={error ? true : undefined}
            required
          />
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>

        <div className="flex flex-col-reverse gap-2 sm:flex-row">
          <Button
            type="button"
            variant="outline"
            className="flex-1"
            onClick={() => onOpenChange(false)}
            disabled={isSubmitting}
          >
            {t("common.cancel")}
          </Button>
          <Button
            type="button"
            className="flex-1"
            onClick={() => void handleSave()}
            disabled={isSubmitting}
          >
            {isSubmitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            {isSubmitting
              ? t("booking.phoneRequirement.saving")
              : t("booking.phoneRequirement.save")}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
