import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";
import {
  LEGAL_LAST_UPDATED,
  privacySections,
} from "@/components/legal/legal-data";

export const metadata: Metadata = {
  title: "Politique de confidentialité | Okeyo Travel",
  description:
    "Consultez la politique de confidentialité d'Okeyo Travel et la manière dont vos données sont utilisées et protégées.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Politique de confidentialité"
      description="Cette page détaille les données collectées par okeyo travel, leur usage, les cas de partage, vos droits et les mesures de sécurité mises en place."
      lastUpdated={LEGAL_LAST_UPDATED}
      sections={privacySections}
    />
  );
}
