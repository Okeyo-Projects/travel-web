import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Explorer par catégorie — Okeyo Travel",
  description:
    "Parcourez les expériences par catégorie et trouvez l'aventure qui correspond à votre envie.",
  openGraph: {
    title: "Explorer par catégorie — Okeyo Travel",
    description:
      "Parcourez les expériences par catégorie et trouvez l'aventure qui correspond à votre envie.",
  },
};

export default function CategoryLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
