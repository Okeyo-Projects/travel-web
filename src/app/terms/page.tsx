import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";
import {
  LEGAL_LAST_UPDATED,
  termsSections,
} from "@/components/legal/legal-data";

export const metadata: Metadata = {
  title: "Conditions d'utilisation | Okeyo Travel",
  description:
    "Consultez les conditions d'utilisation d'Okeyo Travel pour les utilisateurs et les prestataires.",
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Conditions d'utilisation"
      description="Ces conditions encadrent l'utilisation d'okeyo travel, la publication des offres, les réservations, les paiements et les responsabilités des utilisateurs comme des prestataires."
      lastUpdated={LEGAL_LAST_UPDATED}
      sections={termsSections}
    />
  );
}
