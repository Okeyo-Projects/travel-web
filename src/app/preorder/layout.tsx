import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "Précommande — Okeyo Travel",
  description:
    "Soyez parmi les premiers à profiter d'Okeyo Travel. Réservez votre accès anticipé dès maintenant.",
  alternates: { canonical: "/preorder" },
  openGraph: {
    title: "Précommande — Okeyo Travel",
    description: "Soyez parmi les premiers à profiter d'Okeyo Travel.",
    url: "/preorder",
  },
};

export default function PreorderLayout({
  children,
}: {
  children: ReactNode;
}) {
  return <>{children}</>;
}
