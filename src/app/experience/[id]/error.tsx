"use client";

import { AlertCircle, ArrowLeft, Compass, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import posthog from "posthog-js";
import { useSiteI18n } from "@/components/site/site-i18n";
import { Button } from "@/components/ui/button";
import { localizeHref } from "@/lib/routing/locale-path";

export default function ExperienceError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { locale, t } = useSiteI18n();

  useEffect(() => {
    posthog.capture("$exception", {
      $exception_message: error.message,
      $exception_type: error.name,
      $exception_stack: error.stack,
      digest: error.digest,
      page: "experience_detail",
    });
  }, [error]);

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-10">
      <div className="max-w-xl rounded-3xl border bg-card p-8 text-center shadow-sm sm:p-10">
        <div className="mb-4 flex justify-center">
          <AlertCircle className="size-12 text-destructive" />
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">
          {t("errors.experienceError.title")}
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
          {t("errors.experienceError.description")}
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button onClick={reset} className="gap-2" size="lg">
            <RefreshCw className="size-4" />
            {t("errors.experienceError.retry")}
          </Button>
          <Button variant="outline" asChild size="lg">
            <Link href={localizeHref("/explore", locale)} className="gap-2">
              <Compass className="size-4" />
              {t("errors.experienceError.explore")}
            </Link>
          </Button>
          <Button variant="ghost" asChild size="lg">
            <Link href={localizeHref("/", locale)} className="gap-2">
              <ArrowLeft className="size-4" />
              {t("errors.experienceError.home")}
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
