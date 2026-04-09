"use client";

import { AlertCircle, Compass, Home, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo } from "react";
import posthog from "posthog-js";
import { Button } from "@/components/ui/button";
import { getLocaleFromPathname, localizeHref } from "@/lib/routing/locale-path";

export default function GlobalError({
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
      page: "global",
    });
  }, [error]);

  const locale = useMemo(() => {
    if (typeof window === "undefined") {
      return "fr";
    }

    return getLocaleFromPathname(window.location.pathname);
  }, []);

  const messages = {
    fr: {
      title: "Une erreur critique est survenue",
      description:
        "L’application n’a pas pu afficher cette page correctement. Réessayez ou revenez à l’accueil.",
      retry: "Réessayer",
      home: "Retour à l’accueil",
      explore: "Explorer les expériences",
    },
    en: {
      title: "A critical error occurred",
      description:
        "The app could not render this page correctly. Try again or go back to the home page.",
      retry: "Try again",
      home: "Back to home",
      explore: "Explore experiences",
    },
    ar: {
      title: "حدث خطأ حرج",
      description:
        "تعذر على التطبيق عرض هذه الصفحة بشكل صحيح. أعد المحاولة أو ارجع إلى الصفحة الرئيسية.",
      retry: "إعادة المحاولة",
      home: "العودة إلى الرئيسية",
      explore: "استكشاف التجارب",
    },
  } as const;

  const copy = messages[locale];

  return (
    <html lang={locale}>
      <body className="flex min-h-screen items-center justify-center bg-background px-4">
        <div className="max-w-xl rounded-3xl border bg-card p-8 text-center shadow-sm sm:p-10">
          <div className="mb-4 flex justify-center">
            <AlertCircle className="size-12 text-destructive" />
          </div>
          <h1 className="text-3xl font-semibold tracking-tight">
            {copy.title}
          </h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
            {copy.description}
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button onClick={reset} className="gap-2" size="lg">
              <RefreshCw className="size-4" />
              {copy.retry}
            </Button>
            <Button asChild variant="outline" size="lg">
              <Link href={localizeHref("/", locale)} className="gap-2">
                <Home className="size-4" />
                {copy.home}
              </Link>
            </Button>
            <Button asChild variant="ghost" size="lg">
              <Link href={localizeHref("/explore", locale)} className="gap-2">
                <Compass className="size-4" />
                {copy.explore}
              </Link>
            </Button>
          </div>
        </div>
      </body>
    </html>
  );
}
