"use client";

import { AlertCircle, RefreshCw } from "lucide-react";
import { useEffect } from "react";
import posthog from "posthog-js";
import { Button } from "@/components/ui/button";

export default function BookingsError({
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
      page: "bookings",
    });
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <div className="flex justify-center mb-4">
          <AlertCircle className="size-12 text-destructive" />
        </div>
        <h1 className="text-2xl font-semibold mb-2">
          Impossible de charger vos réservations
        </h1>
        <p className="text-muted-foreground mb-6">
          Une erreur est survenue. Veuillez réessayer.
        </p>
        <Button onClick={reset} className="gap-2">
          <RefreshCw className="size-4" />
          Réessayer
        </Button>
      </div>
    </div>
  );
}
