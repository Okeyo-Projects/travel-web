import type { Metadata } from "next";
import { headers } from "next/headers";
import { AISection } from "@/components/home/AISection";
import { ExploreSection } from "@/components/home/ExploreSection";
import { FooterSection } from "@/components/home/FooterSection";
import { HeroSection } from "@/components/home/HeroSection";
import { HomeTestimonialSection } from "@/components/home/HomeTestimonialSection";
import { JsonLd } from "@/components/seo/json-ld";
import { fetchFeaturedExperiences } from "@/lib/explore/server";
import { createTranslator, resolveLocale } from "@/lib/i18n";
import { buildLocaleAlternates, localizeHref } from "@/lib/routing/locale-path";
import type { ExperienceListItem } from "@/types/experience";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://okeyotravel.com";

async function getRequestTranslator() {
  const requestHeaders = await headers();
  const locale = resolveLocale(requestHeaders.get("x-locale"));

  return {
    locale,
    t: createTranslator(locale),
  };
}

export const revalidate = 3600;

export async function generateMetadata(): Promise<Metadata> {
  const { locale, t } = await getRequestTranslator();

  return {
    title: t("seo.home.title"),
    description: t("seo.home.description"),
    alternates: buildLocaleAlternates("/", locale),
    openGraph: {
      title: t("seo.home.title"),
      description: t("seo.home.description"),
      url: localizeHref("/", locale),
    },
  };
}

export default async function HomePage() {
  const { locale, t } = await getRequestTranslator();
  let featuredExperiences: ExperienceListItem[] = [];

  try {
    featuredExperiences = await fetchFeaturedExperiences(6);
  } catch (error) {
    console.error("Failed to load featured experiences for home page:", error);
  }

  return (
    <div className="bg-[#08090d]">
      <JsonLd
        schema={[
          {
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: t("seo.home.title"),
            description: t("seo.home.description"),
            url: `${SITE_URL}${localizeHref("/", locale)}`,
            inLanguage: locale,
          },
          {
            "@context": "https://schema.org",
            "@type": "Service",
            name: t("seo.home.serviceName"),
            description: t("seo.home.serviceDescription"),
            provider: {
              "@type": "Organization",
              name: t("app.name"),
              url: SITE_URL,
            },
            serviceType: "Travel Recommendation",
            areaServed: "MA",
            availableLanguage: locale,
            url: `${SITE_URL}${localizeHref("/", locale)}`,
          },
        ]}
      />
      <HeroSection />
      <AISection />
      <ExploreSection experiences={featuredExperiences} />
      <HomeTestimonialSection />
      <FooterSection />
    </div>
  );
}
