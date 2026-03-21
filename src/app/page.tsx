import type { Metadata } from "next";
import { AISection } from "@/components/home/AISection";
import { ExploreSection } from "@/components/home/ExploreSection";
import { FooterSection } from "@/components/home/FooterSection";
import { HeroSection } from "@/components/home/HeroSection";
import { TestimonialSection } from "@/components/home/TestimonialSection";
import { JsonLd } from "@/components/seo/json-ld";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://okeyotravel.com";

export const metadata: Metadata = {
  title: "Okeyo Travel — Trouvez votre destination selon votre humeur",
  description:
    "En 2 minutes, dites-nous votre mood et Okeyo vous recommande la destination idéale. Planification de voyage personnalisée par IA.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "Okeyo Travel — Trouvez votre destination selon votre humeur",
    description:
      "En 2 minutes, dites-nous votre mood et Okeyo vous recommande la destination idéale.",
    url: "/",
  },
};

export default function HomePage() {
  return (
    <div className="bg-[#08090d]">
      <JsonLd
        schema={[
          {
            "@context": "https://schema.org",
            "@type": "WebPage",
            name: "Okeyo Travel — Trouvez votre destination selon votre humeur",
            description:
              "En 2 minutes, dites-nous votre mood et Okeyo vous recommande la destination idéale. Planification de voyage personnalisée par IA.",
            url: SITE_URL,
            inLanguage: "fr",
          },
          {
            "@context": "https://schema.org",
            "@type": "Service",
            name: "Recommandation de voyage par IA — Okeyo Travel",
            description:
              "En 2 minutes, notre IA analyse vos envies et vous recommande la destination et l'expérience de voyage idéales.",
            provider: {
              "@type": "Organization",
              name: "Okeyo Travel",
              url: SITE_URL,
            },
            serviceType: "Travel Recommendation",
            areaServed: "FR",
            availableLanguage: "French",
            url: SITE_URL,
          },
        ]}
      />
      <HeroSection />
      <AISection />
      <ExploreSection />
      <TestimonialSection />
      <FooterSection />
    </div>
  );
}
