"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  PhoneInput,
  normalizePhoneNumber,
  type PhoneCountry,
} from "@/components/ui/phone-input";
import type { AppLocale } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { CheckCircle2, Loader2 } from "lucide-react";
import type { FormEvent } from "react";
import { useState } from "react";
import type { PartnerPageCopy } from "./copy";

type PartnerLeadValues = {
  firstName: string;
  establishmentName: string;
  phone: string;
  phoneCountry: PhoneCountry;
};

type PartnerLeadErrors = Partial<
  Record<keyof PartnerLeadValues | "submit", string>
>;

const DEFAULT_COUNTRY: PhoneCountry = "MA";

const INITIAL_VALUES: PartnerLeadValues = {
  firstName: "",
  establishmentName: "",
  phone: "",
  phoneCountry: DEFAULT_COUNTRY,
};

type PartnerLeadFormProps = {
  locale: AppLocale;
  copy: PartnerPageCopy["form"];
};

export function PartnerLeadForm({ locale, copy }: PartnerLeadFormProps) {
  const [values, setValues] = useState<PartnerLeadValues>(INITIAL_VALUES);
  const [errors, setErrors] = useState<PartnerLeadErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const normalizedPhone = normalizePhoneNumber(
    values.phone,
    values.phoneCountry,
  );

  const handleFieldChange = <K extends keyof PartnerLeadValues>(
    field: K,
    value: PartnerLeadValues[K],
  ) => {
    setValues((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({
      ...current,
      [field]: undefined,
      submit: undefined,
    }));
  };

  const validate = () => {
    const nextErrors: PartnerLeadErrors = {};

    if (values.firstName.trim().length < 2) {
      nextErrors.firstName = copy.errors.firstName;
    }

    if (values.establishmentName.trim().length < 2) {
      nextErrors.establishmentName = copy.errors.establishmentName;
    }

    if (!normalizedPhone) {
      nextErrors.phone = copy.errors.phone;
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await fetch("/api/potential-partners", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          firstName: values.firstName,
          establishmentName: values.establishmentName,
          phone: values.phone,
          phoneCountry: values.phoneCountry,
          locale,
          path: window.location.pathname,
        }),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error || copy.errors.submit);
      }

      setIsSubmitted(true);
      setValues(INITIAL_VALUES);
      setErrors({});
    } catch (error) {
      setErrors((current) => ({
        ...current,
        submit:
          error instanceof Error && error.message
            ? error.message
            : copy.errors.submit,
      }));
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="rounded-[28px] border border-emerald-200 bg-emerald-50 p-6 shadow-[0_18px_50px_rgba(16,185,129,0.12)] sm:p-8">
        <div className="flex items-start gap-4">
          <div className="rounded-full bg-emerald-100 p-3 text-emerald-700">
            <CheckCircle2 className="size-6" />
          </div>
          <div className="space-y-3">
            <h3 className="text-2xl font-semibold tracking-tight text-emerald-950">
              {copy.successTitle}
            </h3>
            <p className="text-sm leading-6 text-emerald-900/80">
              {copy.successDescription}
            </p>
            <Button
              type="button"
              variant="outline"
              className="rounded-full border-emerald-300 bg-white text-emerald-900 hover:bg-emerald-100"
              onClick={() => setIsSubmitted(false)}
            >
              {copy.successCta}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form
      id="partner-lead-form"
      className="space-y-5 rounded-[32px] border border-white/60 bg-white p-6 shadow-[0_28px_90px_rgba(15,23,42,0.16)] sm:p-8"
      onSubmit={handleSubmit}
    >
      <div className="space-y-3">
        <span className="inline-flex rounded-full bg-[#fff0f5] px-3 py-1 text-xs font-semibold uppercase tracking-[0.24em] text-[#d12d61]">
          {copy.badge}
        </span>
        <div className="space-y-2">
          <h2 className="text-3xl font-semibold tracking-tight text-slate-950">
            {copy.title}
          </h2>
          <p className="text-sm leading-6 text-slate-600">{copy.description}</p>
        </div>
      </div>

      <div className="grid gap-5">
        <div className="space-y-2">
          <Label htmlFor="partner-first-name">{copy.firstNameLabel} *</Label>
          <Input
            id="partner-first-name"
            value={values.firstName}
            onChange={(event) =>
              handleFieldChange("firstName", event.target.value)
            }
            placeholder={copy.firstNamePlaceholder}
            className={cn(
              "h-12 rounded-2xl border-slate-200 bg-slate-50",
              errors.firstName &&
                "border-destructive focus-visible:ring-destructive/30",
            )}
          />
          {errors.firstName ? (
            <p className="text-sm text-destructive">{errors.firstName}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="partner-establishment">
            {copy.establishmentLabel}
          </Label>
          <Input
            id="partner-establishment"
            value={values.establishmentName}
            onChange={(event) =>
              handleFieldChange("establishmentName", event.target.value)
            }
            placeholder={copy.establishmentPlaceholder}
            className={cn(
              "h-12 rounded-2xl border-slate-200 bg-slate-50",
              errors.establishmentName &&
                "border-destructive focus-visible:ring-destructive/30",
            )}
          />
          {errors.establishmentName ? (
            <p className="text-sm text-destructive">
              {errors.establishmentName}
            </p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="partner-phone">{copy.phoneLabel}</Label>
          <PhoneInput
            id="partner-phone"
            value={values.phone}
            country={values.phoneCountry}
            onValueChange={(value) => handleFieldChange("phone", value)}
            onCountryChange={(country) =>
              handleFieldChange("phoneCountry", country)
            }
            countryLabel={copy.phoneCountryLabel}
            placeholder={copy.phonePlaceholder}
            aria-invalid={errors.phone ? "true" : "false"}
            className={cn(
              "h-12 rounded-2xl border-slate-200 bg-slate-50",
              errors.phone &&
                "border-destructive focus-within:ring-destructive/30",
            )}
          />
          {errors.phone ? (
            <p className="text-sm text-destructive">{errors.phone}</p>
          ) : (
            <p className="text-sm leading-6 text-slate-500">{copy.helper}</p>
          )}
        </div>
      </div>

      {errors.submit ? (
        <div className="rounded-2xl border border-destructive/20 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          {errors.submit}
        </div>
      ) : null}

      <div className="space-y-3">
        <Button
          type="submit"
          disabled={isSubmitting}
          className="h-12 w-full rounded-full bg-[#d12d61] text-white shadow-[0_18px_38px_rgba(209,45,97,0.34)] hover:bg-[#ba2555]"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="size-4 animate-spin" />
              {copy.submitting}
            </>
          ) : (
            copy.submit
          )}
        </Button>
        {/* <LegalNotice
          className="text-center"
          textClassName="text-xs leading-5 text-slate-500"
        /> */}
      </div>
    </form>
  );
}
