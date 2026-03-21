"use client";

import { AlertCircle, ArrowLeft, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";
import posthog from "posthog-js";
import { Button } from "@/components/ui/button";

export default function ExperienceError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
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
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="flex justify-center mb-4">
          <AlertCircle className="size-12 text-destructive" />
        </div>
        <h1 className="text-2xl font-semibold mb-2">
          Expérience introuvable
        </h1>
        <p className="text-muted-foreground mb-6">
          Impossible de charger cette expérience. Elle a peut-être été supprimée ou une erreur est survenue.
        </p>
        <div className="flex gap-3 justify-center">
          <Button variant="outline" asChild>
            <Link href="/explore" className="gap-2">
              <ArrowLeft className="size-4" />
              Explorer
            </Link>
          </Button>
          <Button onClick={reset} className="gap-2">
            <RefreshCw className="size-4" />
            Réessayer
          </Button>
        </div>
      </div>
    </div>
  );
}
