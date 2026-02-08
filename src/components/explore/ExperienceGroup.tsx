"use client"

import { useRef } from "react"
import Image from "next/image"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { cn } from "@/lib/utils"
import { CompactExperienceCard } from "./CompactExperienceCard"
import type { ExperienceListItem } from "@/types/experience"
import { getImageUrl } from "@/utils/functions"

interface ExperienceGroupProps {
  title: string
  subtitle?: string
  imageUrl?: string | null
  experiences: ExperienceListItem[]
  className?: string
  onMoreClick?: () => void
}

export function ExperienceGroup({
  title,
  subtitle,
  imageUrl,
  experiences,
  className,
  onMoreClick,
}: ExperienceGroupProps) {
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  const scroll = (direction: "left" | "right") => {
    if (!scrollContainerRef.current) return
    const scrollAmount = 340 // card width + gap
    const newScrollLeft =
      direction === "left"
        ? scrollContainerRef.current.scrollLeft - scrollAmount
        : scrollContainerRef.current.scrollLeft + scrollAmount

    scrollContainerRef.current.scrollTo({
      left: newScrollLeft,
      behavior: "smooth",
    })
  }

  return (
    <div className={cn("py-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div className="flex items-center gap-3">
          {/* Group Image */}
          {imageUrl && (
            <div className="relative w-10 h-10 rounded-full overflow-hidden shrink-0 border-2 border-gray-100">
              <Image
                src={getImageUrl(imageUrl)!}
                alt={title}
                fill
                className="object-cover"
              />
            </div>
          )}
          <div>
            <h2 className="text-gray-900 font-semibold text-lg">{title}</h2>
            {subtitle && (
              <p className="text-gray-500 text-sm">{subtitle}</p>
            )}
          </div>
        </div>

        {/* More Button */}
        <button
          onClick={onMoreClick}
          className="text-[#ff2566] text-sm font-medium hover:text-[#e0205a] transition-colors"
        >
          more
        </button>
      </div>

      {/* Horizontal Scroll Container */}
      <div className="relative group">
        {/* Navigation Arrows */}
        <button
          onClick={() => scroll("left")}
          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-4 z-10 w-10 h-10 bg-white shadow-lg hover:bg-gray-50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 hidden md:flex border border-gray-100"
        >
          <ChevronLeft className="w-5 h-5 text-gray-700" />
        </button>

        <button
          onClick={() => scroll("right")}
          className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-4 z-10 w-10 h-10 bg-white shadow-lg hover:bg-gray-50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300 hidden md:flex border border-gray-100"
        >
          <ChevronRight className="w-5 h-5 text-gray-700" />
        </button>

        {/* Scrollable Cards */}
        <div
          ref={scrollContainerRef}
          className="flex gap-4 overflow-x-auto scrollbar-hide pb-4 -mx-4 px-4 md:-mx-0 md:px-0"
          style={{
            scrollbarWidth: "none",
            msOverflowStyle: "none",
          }}
        >
          {experiences.map((experience) => (
            <CompactExperienceCard
              key={experience.id}
              experience={experience}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
