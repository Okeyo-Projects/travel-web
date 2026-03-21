import type { Metadata } from "next";
import type { ReactNode } from "react";
import { JsonLd } from "@/components/seo/json-ld";

const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL ?? "https://okeyotravel.com";

export const metadata: Metadata = {
  title: "Nos Collections de voyages — Okeyo Travel",
  description:
    "Découvrez nos collections de destinations triées par thème : aventure, détente, culture et plus encore.",
  alternates: { canonical: "/collections" },
  openGraph: {
    title: "Nos Collections de voyages — Okeyo Travel",
    description:
      "Découvrez nos collections de destinations triées par thème : aventure, détente, culture et plus encore.",
    url: "/collections",
  },
};

export default function CollectionsLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <>
      <JsonLd
        schema={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: "Nos Collections de voyages — Okeyo Travel",
          description:
            "Découvrez nos collections de destinations triées par thème : aventure, détente, culture et plus encore.",
          url: `${SITE_URL}/collections`,
          inLanguage: "fr",
        }}
      />
      {children}
    </>
  );
}
