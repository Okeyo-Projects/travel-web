"use client";

import { AlertCircle, RefreshCw } from "lucide-react";
import posthog from "posthog-js";
import { useEffect } from "react";
import { useSiteI18n } from "@/components/site/site-i18n";
import { Button } from "@/components/ui/button";

export default function ProfileError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { t } = useSiteI18n();

  useEffect(() => {
    posthog.capture("$exception", {
      $exception_message: error.message,
      $exception_type: error.name,
      $exception_stack: error.stack,
      digest: error.digest,
      page: "profile",
    });
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="flex justify-center mb-4">
          <AlertCircle className="size-12 text-destructive" />
        </div>
        <h1 className="text-2xl font-semibold mb-2">
          {t("profile.error.title")}
        </h1>
        <p className="text-muted-foreground mb-6">
          {t("profile.error.description")}
        </p>
        <Button onClick={reset} className="gap-2">
          <RefreshCw className="size-4" />
          {t("profile.error.retry")}
        </Button>
      </div>
    </div>
  );
}
