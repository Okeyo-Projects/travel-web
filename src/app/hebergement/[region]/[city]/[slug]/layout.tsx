import { JsonLd } from "@/components/seo/json-ld";
import { getLowestPricedRoom } from "@/lib/experience-pricing";
import { createTranslator, resolveLocale } from "@/lib/i18n";
import { fetchExperienceData } from "@/lib/routing/experience-resolver";
import { buildExperienceAlternates, localizeExperiencePath, localizeHref } from "@/lib/routing/locale-path";
import { buildExperienceHref } from "@/lib/routing/slugs";
import type { Metadata } from "next";
import { headers } from "next/headers";
import type { ReactNode } from "react";

export const revalidate = 3600;

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://okeyotravel.com";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ region: string; city: string; slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const requestHeaders = await headers();
  const locale = resolveLocale(requestHeaders.get("x-locale"));
  const t = createTranslator(locale);
  const data = await fetchExperienceData(slug, locale);

  console.log("Fetched experience data for metadata:", { slug, locale, data });
  if (!data?.transformed) {
    return {
      title: t("seo.experience.fallbackTitle"),
      description: t("seo.experience.fallbackDescription"),
    };
  }

  const experience = data.transformed;
  const langCode = locale === "fr" ? "fr" : locale === "ar" ? "ar" : "en";
  const href = buildExperienceHref({
    title: experience.title,
    id: experience.id,
    region: experience.region,
    city: experience.city,
  });

  const title = (experience[`seo_title_${langCode}` as keyof typeof experience] as string | null) ?? undefined;
  const description = (experience[`seo_description_${langCode}` as keyof typeof experience] as string | null) ?? undefined;
  const keywords = (experience[`seo_keywords_${langCode}` as keyof typeof experience] as string | null) ?? undefined;

  return {
    title,
    description,
    keywords,
    alternates: buildExperienceAlternates(href, locale),
    openGraph: {
      title,
      description,
      url: localizeHref(localizeExperiencePath(href, locale), locale),
      images: experience.thumbnailUrl ? [{ url: experience.thumbnailUrl }] : [],
    },
  };
}

export default async function HebergementLayout({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ region: string; city: string; slug: string }>;
}) {
  const { slug } = await params;
  const requestHeaders = await headers();
  const locale = resolveLocale(requestHeaders.get("x-locale"));
  const t = createTranslator(locale);
  const data = await fetchExperienceData(slug, locale);
  const experience = data?.transformed;

  const langCode = locale === "fr" ? "fr" : locale === "ar" ? "ar" : "en";

  const description = experience
    ? (experience[`short_description_${langCode}` as keyof typeof experience] as string | null) ??
      (experience[`long_description_${langCode}` as keyof typeof experience] as string | null)
    : null;

  const lowestPricedRoom = experience
    ? getLowestPricedRoom(experience.lodging?.rooms)
    : null;

  const experiencePath = experience
    ? buildExperienceHref({ title: experience.title, id: experience.id, region: experience.region, city: experience.city })
    : "/explore";
  const experienceUrl = `${SITE_URL}${localizeHref(localizeExperiencePath(experiencePath, locale), locale)}`;

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
                  image: experience.thumbnailUrl ? [experience.thumbnailUrl] : [],
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
                  ...(lowestPricedRoom
                    ? {
                        priceRange: `${lowestPricedRoom.price_cents / 100} ${lowestPricedRoom.currency || "MAD"}`,
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
