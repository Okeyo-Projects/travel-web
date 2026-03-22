import type { Metadata } from "next";
import { headers } from "next/headers";
import type { ReactNode } from "react";
import { JsonLd } from "@/components/seo/json-ld";
import { createTranslator, resolveLocale } from "@/lib/i18n";
import { buildLocaleAlternates, localizeHref } from "@/lib/routing/locale-path";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://okeyotravel.com";

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function fetchExperienceMeta(
  identifier: string,
): Promise<{ title: string; description: string; image?: string } | null> {
  try {
    const supabase = await createClient();
    const normalized = decodeURIComponent(identifier).trim().toLowerCase();

    // 1. Direct UUID
    if (UUID_REGEX.test(normalized)) {
      const { data } = await supabase
        .from("experiences" as never)
        .select("title, short_description")
        .eq("id" as never, normalized)
        .eq("status" as never, "published")
        .is("deleted_at" as never, null)
        .maybeSingle<{ title: string; short_description: string | null }>();
      if (data)
        return { title: data.title, description: data.short_description ?? "" };
    }

    // 2. Slug column match
    const { data: bySlug } = await supabase
      .from("experiences" as never)
      .select("title, short_description")
      .eq("slug" as never, normalized)
      .eq("status" as never, "published")
      .is("deleted_at" as never, null)
      .maybeSingle<{ title: string; short_description: string | null }>();
    if (bySlug)
      return {
        title: bySlug.title,
        description: bySlug.short_description ?? "",
      };

    // 3. Composite slug — last segment is a short ID prefix (first 8 chars of UUID)
    const lastSegment = normalized.split("-").pop() ?? "";
    if (lastSegment.length >= 6) {
      const { data: candidates } = await supabase
        .from("experiences" as never)
        .select("id, title, short_description")
        .like("id" as never, `${lastSegment}%`)
        .eq("status" as never, "published")
        .is("deleted_at" as never, null)
        .limit(5);
      const hit = (
        candidates as Array<{
          id: string;
          title: string;
          short_description: string | null;
        }> | null
      )?.[0];
      if (hit)
        return { title: hit.title, description: hit.short_description ?? "" };
    }

    return null;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const requestHeaders = await headers();
  const locale = resolveLocale(requestHeaders.get("x-locale"));
  const t = createTranslator(locale);
  const meta = await fetchExperienceMeta(id);
  const href = `/experience/${id}`;

  if (!meta) {
    return {
      title: t("seo.experience.fallbackTitle"),
      description: t("seo.experience.fallbackDescription"),
      alternates: buildLocaleAlternates(href, locale),
      openGraph: {
        title: t("seo.experience.fallbackTitle"),
        description: t("seo.experience.fallbackDescription"),
        url: localizeHref(href, locale),
      },
    };
  }

  const description =
    locale === "fr" && meta.description
      ? meta.description
      : t("seo.experience.descriptionPattern", { title: meta.title });

  return {
    title: `${meta.title} — Okeyo Travel`,
    description,
    alternates: buildLocaleAlternates(href, locale),
    openGraph: {
      title: `${meta.title} — Okeyo Travel`,
      description,
      url: localizeHref(href, locale),
    },
  };
}

export default async function ExperienceLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const requestHeaders = await headers();
  const locale = resolveLocale(requestHeaders.get("x-locale"));
  const t = createTranslator(locale);
  const meta = await fetchExperienceMeta(id);
  const description =
    locale === "fr" && meta?.description
      ? meta.description
      : meta
        ? t("seo.experience.descriptionPattern", { title: meta.title })
        : t("seo.experience.fallbackDescription");
  const experiencePath = `/experience/${id}`;
  const experienceUrl = `${SITE_URL}${localizeHref(experiencePath, locale)}`;

  return (
    <>
      <JsonLd
        schema={[
          {
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: [
              {
                "@type": "ListItem",
                position: 1,
                name: t("header.home"),
                item: `${SITE_URL}${localizeHref("/", locale)}`,
              },
              {
                "@type": "ListItem",
                position: 2,
                name: t("header.explore"),
                item: `${SITE_URL}${localizeHref("/explore", locale)}`,
              },
              {
                "@type": "ListItem",
                position: 3,
                name: meta?.title ?? t("seo.experience.label"),
                item: experienceUrl,
              },
            ],
          },
          ...(meta
            ? [
                {
                  "@context": "https://schema.org",
                  "@type": "TouristAttraction",
                  name: meta.title,
                  description,
                  url: experienceUrl,
                  touristType: "leisure",
                  availableLanguage: locale,
                },
              ]
            : []),
        ]}
      />
      {children}
    </>
  );
}
