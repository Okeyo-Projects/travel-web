import type { Metadata } from "next";
import { headers } from "next/headers";
import type { ReactNode } from "react";
import { JsonLd } from "@/components/seo/json-ld";
import { createTranslator, resolveLocale } from "@/lib/i18n";
import { fetchExperienceData } from "@/lib/routing/experience-resolver";
import { buildLocaleAlternates, localizeHref } from "@/lib/routing/locale-path";
import { buildKeywords, buildPageTitle } from "@/lib/seo/page-metadata";

export const dynamic = "force-dynamic";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://okeyotravel.com";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const requestHeaders = await headers();
  const locale = resolveLocale(requestHeaders.get("x-locale"));
  const t = createTranslator(locale);
  const data = await fetchExperienceData(id);
  const href = `/experience/${id}`;

  if (!data?.transformed) {
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

  const experience = data.transformed;
  const title = buildPageTitle(experience.title);
  const description = experience.shortDescription || experience.longDescription;
  const keywords = buildKeywords(
    experience.title,
    experience.shortDescription,
    experience.longDescription,
    experience.city,
    experience.region,
    experience.country,
    experience.type,
  );

  return {
    title,
    description,
    keywords,
    alternates: buildLocaleAlternates(href, locale),
    openGraph: {
      title,
      description,
      url: localizeHref(href, locale),
      images: experience.thumbnailUrl ? [{ url: experience.thumbnailUrl }] : [],
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
  const data = await fetchExperienceData(id);
  const experience = data?.transformed;

  const description =
    experience?.shortDescription ??
    experience?.longDescription ??
    t("seo.experience.fallbackDescription");

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
                name: experience?.title ?? t("seo.experience.label"),
                item: experienceUrl,
              },
            ],
          },
          ...(experience
            ? [
                {
                  "@context": "https://schema.org",
                  "@type": "TouristAttraction",
                  name: experience.title,
                  description,
                  url: experienceUrl,
                  touristType: "leisure",
                  availableLanguage: locale,
                },
                {
                  "@context": "https://schema.org",
                  "@type": "LodgingBusiness",
                  name: experience.title,
                  description,
                  url: experienceUrl,
                  image: experience.thumbnailUrl
                    ? [experience.thumbnailUrl]
                    : [],
                  address: {
                    "@type": "PostalAddress",
                    addressLocality: experience.city,
                    addressRegion: experience.region,
                    addressCountry: experience.country,
                  },
                  ...(experience.metrics?.rating
                    ? {
                        aggregateRating: {
                          "@type": "AggregateRating",
                          ratingValue: experience.metrics.rating,
                          reviewCount: experience.metrics.reviews || 1,
                        },
                      }
                    : {}),
                  ...(experience.lodging?.rooms?.[0]?.price_cents
                    ? {
                        priceRange: `${experience.lodging.rooms[0].price_cents / 100} ${experience.lodging.rooms[0].currency || "MAD"}`,
                      }
                    : {}),
                },
              ]
            : []),
        ]}
      />
      {children}
    </>
  );
}
