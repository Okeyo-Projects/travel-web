import { ArrowLeft, Compass } from "lucide-react";
import { headers } from "next/headers";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { createTranslator, resolveLocale } from "@/lib/i18n";
import { localizeHref } from "@/lib/routing/locale-path";

export default async function ExperienceNotFound() {
  const requestHeaders = await headers();
  const locale = resolveLocale(requestHeaders.get("x-locale"));
  const t = createTranslator(locale);

  return (
    <div className="flex min-h-[70vh] items-center justify-center px-4 py-10">
      <div className="mx-auto max-w-xl rounded-3xl border bg-card p-8 text-center shadow-sm sm:p-10">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.24em] text-muted-foreground">
          404
        </p>
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          {t("errors.experienceNotFound.title")}
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">
          {t("errors.experienceNotFound.description")}
        </p>
        <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
          <Button asChild size="lg">
            <Link href={localizeHref("/explore", locale)} className="gap-2">
              <Compass className="size-4" />
              {t("errors.experienceNotFound.explore")}
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link href={localizeHref("/", locale)} className="gap-2">
              <ArrowLeft className="size-4" />
              {t("errors.experienceNotFound.home")}
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
}
