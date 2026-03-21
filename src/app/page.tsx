import type { Metadata } from "next";
import { AISection } from "@/components/home/AISection";
import { ExploreSection } from "@/components/home/ExploreSection";
import { FooterSection } from "@/components/home/FooterSection";
import { HeroSection } from "@/components/home/HeroSection";
import { TestimonialSection } from "@/components/home/TestimonialSection";

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
      <HeroSection />
      <AISection />
      <ExploreSection />
      <TestimonialSection />
      <FooterSection />
    </div>
  );
}
