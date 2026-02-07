import { AISection } from "@/components/home/AISection"
import { ExploreSection } from "@/components/home/ExploreSection"
import { FooterSection } from "@/components/home/FooterSection"
import { HeroSection } from "@/components/home/HeroSection"
import { TestimonialSection } from "@/components/home/TestimonialSection"

export default function HomePage() {
  return (
    <div className="bg-[#08090d]">
      <HeroSection />
      <AISection />
      <ExploreSection />
      <TestimonialSection />
      <FooterSection />
    </div>
  )
}
