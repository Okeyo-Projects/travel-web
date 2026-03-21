"use client";

import { CheckCircle2, Loader2, Send } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import { useSiteI18n } from "@/components/site/site-i18n";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/use-auth";
import { useCreateSupportTicket } from "@/hooks/use-support";
import { cn } from "@/lib/utils";
import {
  SUPPORT_EMAIL,
  SUPPORT_ISSUE_OPTIONS,
  type SupportIssueFormValues,
  type SupportSubmissionResult,
} from "@/types/support";

type FormErrors = Partial<Record<keyof SupportIssueFormValues, string>>;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function createInitialValues(email?: string | null): SupportIssueFormValues {
  return {
    subject: "",
    type: "bug",
    description: "",
    contactEmail: email ?? "",
  };
}

export function ReportIssueForm() {
  const { t } = useSiteI18n();
  const { user } = useAuth();
  const createTicketMutation = useCreateSupportTicket();
  const [values, setValues] = useState<SupportIssueFormValues>(() =>
    createInitialValues(user?.email),
  );
  const [errors, setErrors] = useState<FormErrors>({});
  const [submittedTicket, setSubmittedTicket] =
    useState<SupportSubmissionResult | null>(null);

  useEffect(() => {
    if (user?.email && !values.contactEmail) {
      setValues((current) => ({
        ...current,
        contactEmail: user.email ?? "",
      }));
    }
  }, [user?.email, values.contactEmail]);

  const helperCopy = useMemo(() => {
    return user
      ? t("support.form.linkedHelper")
      : t("support.form.guestHelper");
  }, [t, user]);

  const handleFieldChange = <K extends keyof SupportIssueFormValues>(
    field: K,
    value: SupportIssueFormValues[K],
  ) => {
    setValues((current) => ({
      ...current,
      [field]: value,
    }));
    setErrors((current) => ({
      ...current,
      [field]: undefined,
    }));
  };

  const validate = () => {
    const nextErrors: FormErrors = {};

    if (values.subject.trim().length < 6) {
      nextErrors.subject = t("support.form.fields.subject.error");
    }

    if (values.description.trim().length < 20) {
      nextErrors.description = t("support.form.fields.description.error");
    }

    if (
      values.contactEmail.trim().length > 0 &&
      !EMAIL_PATTERN.test(values.contactEmail.trim())
    ) {
      nextErrors.contactEmail = t("support.form.fields.email.error");
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!validate()) {
      return;
    }

    try {
      const result = await createTicketMutation.mutateAsync(values);
      setSubmittedTicket(result);
      setValues(createInitialValues(user?.email));
      setErrors({});
      toast.success(t("support.form.success.toast"));
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : t("support.form.error.submitFallback");
      toast.error(message);
    }
  };

  if (submittedTicket) {
    return (
      <div className="rounded-[28px] border border-emerald-200 bg-emerald-50 p-6 shadow-[0_18px_50px_rgba(16,185,129,0.12)] sm:p-8">
        <div className="flex items-start gap-4">
          <div className="rounded-full bg-emerald-100 p-3 text-emerald-700">
            <CheckCircle2 className="size-6" />
          </div>
          <div className="space-y-3">
            <h3 className="text-2xl font-semibold tracking-tight text-emerald-950">
              {t("support.form.success.title")}
            </h3>
            <p className="max-w-xl text-sm leading-6 text-emerald-900/80">
              {t("support.form.success.description")}
            </p>
            <div className="inline-flex rounded-full border border-emerald-200 bg-white px-4 py-2 text-sm font-medium text-emerald-900">
              {t("support.form.success.referenceLabel")}{" "}
              {submittedTicket.reference}
            </div>
            <div className="text-sm text-emerald-900/75">
              {t("support.form.success.emailPrefix")}{" "}
              <a
                href={`mailto:${SUPPORT_EMAIL}`}
                className="font-semibold underline underline-offset-4"
              >
                {SUPPORT_EMAIL}
              </a>
              .
            </div>
            <Button
              type="button"
              variant="outline"
              className="mt-2 rounded-full border-emerald-300 bg-white text-emerald-900 hover:bg-emerald-100"
              onClick={() => setSubmittedTicket(null)}
            >
              {t("support.form.success.reset")}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <form
      id="report-an-issue"
      className="space-y-5 rounded-[28px] border border-slate-200 bg-white p-6 shadow-[0_18px_50px_rgba(15,23,42,0.08)] sm:p-8"
      onSubmit={handleSubmit}
    >
      <div className="space-y-2">
        <h2 className="text-3xl font-semibold tracking-tight text-slate-950">
          {t("support.form.title")}
        </h2>
        <p className="text-sm leading-6 text-slate-600">{helperCopy}</p>
      </div>

      <div className="grid gap-5 md:grid-cols-2">
        <div className="space-y-2 md:col-span-2">
          <Label htmlFor="support-subject">
            {t("support.form.fields.subject.label")}
          </Label>
          <Input
            id="support-subject"
            value={values.subject}
            onChange={(event) =>
              handleFieldChange("subject", event.target.value)
            }
            placeholder={t("support.form.fields.subject.placeholder")}
            className={cn(
              "h-12 rounded-2xl border-slate-200 bg-slate-50",
              errors.subject &&
                "border-destructive focus-visible:ring-destructive/30",
            )}
          />
          {errors.subject ? (
            <p className="text-sm text-destructive">{errors.subject}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="support-type">
            {t("support.form.fields.type.label")}
          </Label>
          <Select
            value={values.type}
            onValueChange={(value) =>
              handleFieldChange("type", value as SupportIssueFormValues["type"])
            }
          >
            <SelectTrigger
              id="support-type"
              className="h-12 rounded-2xl border-slate-200 bg-slate-50"
            >
              <SelectValue
                placeholder={t("support.form.fields.type.placeholder")}
              />
            </SelectTrigger>
            <SelectContent>
              {SUPPORT_ISSUE_OPTIONS.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {t(`support.form.issueTypes.${option.value}.label`)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-sm leading-6 text-slate-500">
            {t(`support.form.issueTypes.${values.type}.description`)}
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="support-email">
            {t("support.form.fields.email.label")}
          </Label>
          <Input
            id="support-email"
            type="email"
            value={values.contactEmail}
            onChange={(event) =>
              handleFieldChange("contactEmail", event.target.value)
            }
            placeholder={t("support.form.fields.email.placeholder")}
            className={cn(
              "h-12 rounded-2xl border-slate-200 bg-slate-50",
              errors.contactEmail &&
                "border-destructive focus-visible:ring-destructive/30",
            )}
          />
          {errors.contactEmail ? (
            <p className="text-sm text-destructive">{errors.contactEmail}</p>
          ) : (
            <p className="text-sm leading-6 text-slate-500">
              {t("support.form.fields.email.hint")}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="support-description">
          {t("support.form.fields.description.label")}
        </Label>
        <Textarea
          id="support-description"
          value={values.description}
          onChange={(event) =>
            handleFieldChange("description", event.target.value)
          }
          placeholder={t("support.form.fields.description.placeholder")}
          className={cn(
            "min-h-36 rounded-[24px] border-slate-200 bg-slate-50 px-4 py-3",
            errors.description &&
              "border-destructive focus-visible:ring-destructive/30",
          )}
        />
        {errors.description ? (
          <p className="text-sm text-destructive">{errors.description}</p>
        ) : (
          <p className="text-sm leading-6 text-slate-500">
            {t("support.form.fields.description.hint")}
          </p>
        )}
      </div>

      <Button
        type="submit"
        disabled={createTicketMutation.isPending}
        className="h-12 rounded-full bg-[#d12d61] px-6 text-white hover:bg-[#b82755]"
      >
        {createTicketMutation.isPending ? (
          <>
            <Loader2 className="mr-2 size-4 animate-spin" />
            {t("support.form.submit.loading")}
          </>
        ) : (
          <>
            <Send className="mr-2 size-4" />
            {t("support.form.submit.idle")}
          </>
        )}
      </Button>
    </form>
  );
}
