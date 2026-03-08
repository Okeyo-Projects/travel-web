import { ChevronDown } from "lucide-react";
import { MarketingHeader } from "@/components/site/MarketingHeader";

export function HeroSection() {
  return (
    <section className="relative min-h-[100svh] overflow-hidden bg-black text-white">
      <video
        className="absolute inset-0 h-full w-full object-cover"
        autoPlay
        muted
        loop
        playsInline
        preload="auto"
      >
        <source src="/hero-video.mp4" type="video/mp4" />
      </video>

      <div className="absolute inset-0 bg-black/35" />

      <div className="relative z-20 mx-auto flex min-h-[100svh] w-full max-w-[1280px] flex-col px-5 pb-8 pt-5 sm:px-8 sm:pb-10 sm:pt-8">
        <MarketingHeader />

        <div className="flex flex-1 items-center justify-center py-16 sm:py-20">
          <div className="mx-auto max-w-[1080px] text-center">
            <h1 className="text-4xl font-black uppercase leading-[1.03] tracking-tight text-white sm:text-5xl md:text-6xl lg:text-7xl">
              Laisser parler votre{" "}
              <span className="relative inline-flex h-[1em] w-[7ch] items-center justify-center align-baseline text-primary">
                <span className="word-swap word-1">Mood,</span>
                <span className="word-swap word-2">Envie,</span>
                <span className="word-swap word-3">Desire,</span>
              </span>
              <br />
              nous nous occupons du reste
            </h1>
            <p className="mt-5 text-lg text-white/95 sm:text-xl md:text-2xl">
              En 2 minutes, l&apos;IA Okeyo trouve l&apos;expérience qui vous
              ressemble.
            </p>
          </div>
        </div>

        <button
          type="button"
          className="mx-auto flex flex-col items-center gap-1 text-lg font-medium text-white/95 transition-opacity hover:opacity-80"
        >
          <span>Start your journey</span>
          <ChevronDown className="h-7 w-7 animate-bounce" />
        </button>
      </div>
    </section>
  );
}
