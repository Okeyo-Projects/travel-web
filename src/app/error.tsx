"use client";

import { AlertCircle, Compass, Home, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import posthog from "posthog-js";
import { useSiteI18n } from "@/components/site/site-i18n";
import { Button } from "@/components/ui/button";
import { localizeHref } from "@/lib/routing/locale-path";

export default function GlobalError({
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
    });
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="max-w-xl rounded-3xl border bg-card p-8 text-center shadow-sm sm:p-10">
        <div className="mb-4 flex justify-center">
          <AlertCircle className="size-12 text-destructive" />
        </div>
        <h1 className="text-3xl font-semibold tracking-tight">
          {t("errors.global.title")}
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
          {t("errors.global.description")}
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button onClick={reset} className="gap-2" size="lg">
            <RefreshCw className="size-4" />
            {t("errors.global.retry")}
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href={localizeHref("/", locale)} className="gap-2">
              <Home className="size-4" />
              {t("errors.global.home")}
            </Link>
          </Button>
          <Button asChild variant="ghost" size="lg">
            <Link href={localizeHref("/explore", locale)} className="gap-2">
              <Compass className="size-4" />
              {t("errors.global.explore")}
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
