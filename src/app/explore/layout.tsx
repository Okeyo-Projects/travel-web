import type { Metadata } from "next";
import type { ReactNode } from "react";
import { JsonLd } from "@/components/seo/json-ld";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://okeyotravel.com";

export const metadata: Metadata = {
  title: "Explorer les destinations — Okeyo Travel",
  description:
    "Filtrez par activité, thème et dates pour trouver votre prochain voyage. Recommandations personnalisées selon vos envies.",
  alternates: { canonical: "/explore" },
  openGraph: {
    title: "Explorer les destinations — Okeyo Travel",
    description:
      "Filtrez par activité, thème et dates pour trouver votre prochain voyage.",
    url: "/explore",
  },
};

export default function ExploreLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <JsonLd
        schema={{
          "@context": "https://schema.org",
          "@type": "WebPage",
          name: "Explorer les destinations — Okeyo Travel",
          description:
            "Filtrez par activité, thème et dates pour trouver votre prochain voyage.",
          url: `${SITE_URL}/explore`,
          inLanguage: "fr",
        }}
      />
      {children}
    </>
  );
}
