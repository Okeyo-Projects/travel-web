"use client";

import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight, Star } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { IMAGE_BLUR_DATA_URL } from "@/utils/functions";

export type TestimonialItem = {
  id: string;
  quote: string;
  name: string;
  role: string;
  avatar: string;
  rate: number;
};

export function TestimonialCarousel({
  testimonials,
}: {
  testimonials: TestimonialItem[];
}) {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true, align: "start" });

  useEffect(() => {
    if (!emblaApi) return;
    const onSelect = () => setSelectedIndex(emblaApi.selectedScrollSnap());
    emblaApi.on("select", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
    };
  }, [emblaApi]);

  const scrollPrev = useCallback(() => emblaApi?.scrollPrev(), [emblaApi]);
  const scrollNext = useCallback(() => emblaApi?.scrollNext(), [emblaApi]);

  return (
    <div className="mt-14">
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="-ml-8 flex">
          {testimonials.map((item) => (
            <article
              key={item.id}
              className="min-w-0 w-full flex-shrink-0 pl-8 sm:w-1/2 xl:w-1/3"
            >
              <div className="space-y-6">
                <p className="text-lg leading-relaxed text-[#03233a]">
                  {item.quote}
                </p>

                <div className="flex items-center gap-3">
                  {Array.from({ length: 5 }).map((_, starIndex) => (
                    <Star
                      key={starIndex}
                      className="h-5 w-5 text-primary"
                      fill={starIndex < item.rate ? "currentColor" : "none"}
                    />
                  ))}
                </div>

                <div className="flex items-center gap-4">
                  <Image
                    src={item.avatar}
                    alt={`Portrait de ${item.name}`}
                    width={48}
                    height={48}
                    placeholder="blur"
                    blurDataURL={IMAGE_BLUR_DATA_URL}
                    className="h-12 w-12 rounded-full object-cover"
                  />
                  <div>
                    <p className="text-2xl font-bold text-black">{item.name}</p>
                    <p className="text-sm text-[#03233a]/80">{item.role}</p>
                  </div>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>

      <div className="mt-10 flex items-center justify-center gap-4">
        <button
          type="button"
          onClick={scrollPrev}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm transition hover:bg-gray-50"
          aria-label="Previous testimonial"
        >
          <ChevronLeft className="h-5 w-5 text-gray-600" />
        </button>

        <div className="flex gap-2">
          {testimonials.map((_, i) => (
            <button
              type="button"
              key={i}
              onClick={() => emblaApi?.scrollTo(i)}
              className={`h-2 rounded-full transition-all ${
                i === selectedIndex
                  ? "w-6 bg-primary"
                  : "w-2 bg-gray-300 hover:bg-gray-400"
              }`}
              aria-label={`Go to testimonial ${i + 1}`}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={scrollNext}
          className="flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white shadow-sm transition hover:bg-gray-50"
          aria-label="Next testimonial"
        >
          <ChevronRight className="h-5 w-5 text-gray-600" />
        </button>
      </div>
    </div>
  );
}
