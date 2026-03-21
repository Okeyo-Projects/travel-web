"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { CompactExperienceCard } from "@/components/explore/CompactExperienceCard";
import { useExperiences } from "@/hooks/use-experiences";
import { localizeHref } from "@/lib/routing/locale-path";
import { useT } from "@/providers/translations-provider";

export function ExploreSection() {
  const pathname = usePathname();
  const t = useT();
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
    el.addEventListener("scroll", checkScroll, { passive: true });
    return () => {
      el.removeEventListener("scroll", checkScroll);
    };
  }, [checkScroll]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const observer = new ResizeObserver(() => {
      checkScroll();
    });

    observer.observe(el);

    return () => {
      observer.disconnect();
    };
  }, [checkScroll]);

  const experienceCount = experiences?.length ?? 0;

  useEffect(() => {
    void experienceCount;
    const timer = setTimeout(checkScroll, 150);
    return () => clearTimeout(timer);
  }, [checkScroll, experienceCount]);

  const handleScroll = (dir: "prev" | "next") => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.8;
    el.scrollBy({
      left: dir === "next" ? amount : -amount,
      behavior: "smooth",
    });
  };

  return (
    <section className="relative overflow-hidden bg-[#FAFAFA] px-4 py-16 sm:px-6 sm:py-24">
      {/* biome-ignore lint/performance/noImgElement: Decorative background pattern spans the section width. */}
      <img
        src="/testimonial-pattern.svg"
        alt=""
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 w-full opacity-35"
      />

      <div className="relative z-10 mx-auto max-w-[1380px]">
        <div className="grid gap-10 lg:grid-cols-[minmax(320px,440px)_minmax(0,1fr)] lg:items-start xl:gap-14">
          <div className="max-w-[480px]">
            <p className="text-2xl text-primary">{t("home.explore.eyebrow")}</p>
            <h2 className="mt-4 text-4xl font-black leading-[1.05] text-[#050505] sm:text-5xl lg:text-6xl">
              {t("home.explore.title.lineOne")}
              <br />
              {t("home.explore.title.lineTwo")}
            </h2>
            <p className="mt-5 text-xl leading-relaxed text-[#2b2b2f] sm:text-2xl">
              {t("home.explore.description")}
            </p>
            <Link
              href={localizeHref("/explore", pathname)}
              className="mt-9 inline-flex rounded-full bg-primary px-9 py-3 text-xl font-bold text-white shadow-[0_10px_24px_rgba(255,37,102,0.4)] transition-transform hover:scale-105"
            >
              {t("home.explore.cta")}
            </Link>
          </div>

          <div className="min-w-0">
            <div
              ref={scrollRef}
              className="flex gap-5 overflow-x-auto pb-4 [scroll-snap-type:x_mandatory] [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
            >
              {isLoading
                ? ["skeleton-1", "skeleton-2", "skeleton-3", "skeleton-4"].map(
                    (key) => (
                      <div
                        key={key}
                        className="w-[280px] sm:w-[320px] md:w-[360px] flex-shrink-0 [scroll-snap-align:start]"
                      >
                        <div className="aspect-[4/5] w-full rounded-2xl bg-gray-200 animate-pulse" />
                        <div className="mt-3 h-5 w-3/4 rounded bg-gray-200 animate-pulse" />
                        <div className="mt-2 h-4 w-1/2 rounded bg-gray-200 animate-pulse" />
                      </div>
                    ),
                  )
                : (experiences ?? []).map((experience) => (
                    <CompactExperienceCard
                      key={experience.id}
                      experience={experience}
                      className="w-[280px] sm:w-[320px] md:w-[360px] flex-shrink-0 [scroll-snap-align:start]"
                    />
                  ))}
            </div>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => handleScroll("prev")}
                disabled={!canPrev}
                aria-label={t("common.previous")}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-md transition-opacity hover:bg-gray-50 disabled:opacity-30"
              >
                <svg
                  aria-hidden="true"
                  focusable="false"
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
                aria-label={t("common.next")}
                className="flex h-11 w-11 items-center justify-center rounded-full bg-white shadow-md transition-opacity hover:bg-gray-50 disabled:opacity-30"
              >
                <svg
                  aria-hidden="true"
                  focusable="false"
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
        </div>
      </div>
    </section>
  );
}
