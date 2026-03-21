import type { Metadata } from "next";
import type { ReactNode } from "react";

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
  return <>{children}</>;
}
