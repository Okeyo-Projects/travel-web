import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Explorer les destinations — Okeyo Travel",
  description:
    "Filtrez par activité, thème et dates pour trouver votre prochain voyage. Recommandations personnalisées selon vos envies.",
};

export default function ExploreLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
