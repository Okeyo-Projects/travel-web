import type { Metadata } from "next";
import { Compass, Home } from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createTranslator, resolveLocale } from "@/lib/i18n";
import { localizeHref } from "@/lib/routing/locale-path";

export const metadata: Metadata = {
  robots: { index: false, follow: false },
  alternates: undefined,
};

export default async function NotFound() {
  const requestHeaders = await headers();
  const locale = resolveLocale(requestHeaders.get("x-locale"));
  const t = createTranslator(locale);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="mx-auto max-w-xl rounded-3xl border bg-card p-8 text-center shadow-sm sm:p-10">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.24em] text-muted-foreground">
          404
        </p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          {t("errors.notFound.title")}
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
          {t("errors.notFound.description")}
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link href={localizeHref("/", locale)} className="gap-2">
              <Home className="size-4" />
              {t("errors.notFound.home")}
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href={localizeHref("/explore", locale)} className="gap-2">
              <Compass className="size-4" />
              {t("errors.notFound.explore")}
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
