"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { updateBrevoContactAttributes } from "@/lib/brevo/sync";
import { type AppLocale, LOCALES } from "@/lib/i18n";
import { localizeHref, stripLocalePrefix } from "@/lib/routing/locale-path";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";
import { useSiteI18n } from "./site-i18n";

interface LanguageSwitcherProps {
  variant?: "dark" | "light";
  className?: string;
}

const LABELS: Record<AppLocale, string> = {
  fr: "FR",
  en: "EN",
  ar: "AR",
};

export function LanguageSwitcher({
  variant = "dark",
  className,
}: LanguageSwitcherProps) {
  const { locale, t } = useSiteI18n();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { user } = useAuth();

  const switchLocale = async (nextLocale: AppLocale) => {
    if (nextLocale === locale) {
      return;
    }

    // If logged in, persist language to profile + Brevo before navigating
    if (user) {
      const supabase = createClient();
      void supabase
        .from("profiles")
        .update({ preferred_language: nextLocale })
        .eq("id", user.id);

      if (user.email) {
        void updateBrevoContactAttributes(user.email, {
          language: nextLocale,
        });
      }
    }

    const query = searchParams.toString();
    const hash = window.location.hash;
    const basePath = stripLocalePrefix(pathname);
    const href = localizeHref(
      `${basePath}${query ? `?${query}` : ""}${hash}`,
      nextLocale,
    );

    window.location.href = href;
  };

  const isDark = variant === "dark";

  return (
    <fieldset
      className={cn(
        "inline-flex items-center rounded-full border p-1 backdrop-blur-sm",
        isDark
          ? "border-white/20 bg-white/10 text-white"
          : "border-border bg-background/80 text-foreground shadow-sm",
        className,
      )}
    >
      <legend className="sr-only">{t("language.label")}</legend>
      {LOCALES.map((option) => {
        const active = option === locale;

        return (
          <Button
            key={option}
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => switchLocale(option)}
            aria-pressed={active}
            aria-label={t(`language.options.${option}`)}
            title={t(`language.options.${option}`)}
            className={cn(
              "h-7 min-w-0 rounded-full px-3 text-xs font-semibold tracking-[0.22em] transition-colors",
              active
                ? isDark
                  ? "bg-white text-slate-950 hover:bg-white hover:text-slate-950"
                  : "bg-foreground text-background hover:bg-foreground hover:text-background"
                : isDark
                  ? "text-white/80 hover:bg-white/10 hover:text-white"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {LABELS[option]}
          </Button>
        );
      })}
    </fieldset>
  );
}
