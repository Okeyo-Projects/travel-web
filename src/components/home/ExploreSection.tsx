"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { CompactExperienceCard } from "@/components/explore/CompactExperienceCard";
import { useExperiences } from "@/hooks/use-experiences";

export function ExploreSection() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);

  const { data: experiences, isLoading } = useExperiences({
    featured: true,
    limit: 6,
  });

  const checkScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    setCanPrev(el.scrollLeft > 2);
    setCanNext(el.scrollLeft + el.clientWidth < el.scrollWidth - 2);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    // Delay slightly so layout/images have settled before measuring
    const timer = setTimeout(checkScroll, 150);
    el.addEventListener("scroll", checkScroll, { passive: true });
    return () => {
      clearTimeout(timer);
      el.removeEventListener("scroll", checkScroll);
    };
  }, [checkScroll, experiences]);

  const handleScroll = (dir: "prev" | "next") => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.8;
    el.scrollBy({ left: dir === "next" ? amount : -amount, behavior: "smooth" });
  };

  return (
    <section className="relative overflow-hidden bg-[#FAFAFA] px-4 py-16 sm:px-6 sm:py-24">
      <img
        src="/testimonial-pattern.svg"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 w-full opacity-35"
      />

      <div className="relative z-10 mx-auto max-w-[1380px]">
        {/* Header: text left, nav buttons right */}
        <div className="flex items-end justify-between gap-6 mb-10">
          <div className="max-w-[480px]">
            <p className="text-2xl text-primary">Comment ça marche</p>
            <h2 className="mt-4 text-4xl font-black leading-[1.05] text-[#050505] sm:text-5xl lg:text-6xl">
              Votre compagnon de
              <br />
              voyage intelligent
            </h2>
            <p className="mt-5 text-xl leading-relaxed text-[#2b2b2f] sm:text-2xl">
              Nous sélectionnons des expériences uniques, soigneusement choisies pour vous.
            </p>
            <a
              href="/explore"
              className="mt-9 inline-flex rounded-full bg-primary px-9 py-3 text-xl font-bold text-white shadow-[0_10px_24px_rgba(255,37,102,0.4)] transition-transform hover:scale-105"
            >
              Réserver ma place
            </a>
          </div>

          {/* Nav buttons — in normal flow, no absolute positioning */}
          <div className="flex shrink-0 gap-2 pb-1">
            <button
              type="button"
              onClick={() => handleScroll("prev")}
              disabled={!canPrev}
              aria-label="Previous"
              className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-md transition-opacity disabled:opacity-30 hover:bg-gray-50"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => handleScroll("next")}
              disabled={!canNext}
              aria-label="Next"
              className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-md transition-opacity disabled:opacity-30 hover:bg-gray-50"
            >
              <svg
                viewBox="0 0 24 24"
                className="h-5 w-5"
                fill="none"
                stroke="currentColor"
                strokeWidth={2.5}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M9 18l6-6-6-6" />
              </svg>
            </button>
          </div>
        </div>

        {/* Full-width scroll rail */}
        <div
          ref={scrollRef}
          className="flex gap-5 overflow-x-auto pb-4 [scroll-snap-type:x_mandatory] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
        >
          {isLoading
            ? Array.from({ length: 4 }).map((_, i) => (
                <div
                  key={i}
                  className="min-w-[280px] sm:min-w-[320px] md:min-w-[360px] flex-shrink-0 [scroll-snap-align:start]"
                >
                  <div className="aspect-[4/5] w-full rounded-2xl bg-gray-200 animate-pulse" />
                  <div className="mt-3 h-5 w-3/4 rounded bg-gray-200 animate-pulse" />
                  <div className="mt-2 h-4 w-1/2 rounded bg-gray-200 animate-pulse" />
                </div>
              ))
            : (experiences ?? []).map((experience) => (
                <CompactExperienceCard
                  key={experience.id}
                  experience={experience}
                  className="min-w-[280px] sm:min-w-[320px] md:min-w-[360px] flex-shrink-0 [scroll-snap-align:start]"
                />
              ))}
        </div>
      </div>
    </section>
  );
}
