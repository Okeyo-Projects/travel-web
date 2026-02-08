"use client"

import Image from "next/image"
import Link from "next/link"
import { cn } from "@/lib/utils"
import type { ExperienceListItem } from "@/types/experience"
import { getImageUrl } from "@/utils/functions"

interface CompactExperienceCardProps {
  experience: ExperienceListItem
  className?: string
}

export function CompactExperienceCard({
  experience,
  className,
}: CompactExperienceCardProps) {
  const price = experience.trip?.price_cents
    ? Math.round(experience.trip.price_cents / 100)
    : experience.lodging?.price_cents
    ? Math.round(experience.lodging.price_cents / 100)
    : null

  return (
    <Link href={`/experience/${experience.id}`}>
      <div
        className={cn(
          "group relative flex-shrink-0 w-[280px] sm:w-[320px] cursor-pointer",
          className
        )}
      >
        {/* Image Container */}
        <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl">
          {experience.thumbnail_url ? (
            <Image
              src={getImageUrl(experience.thumbnail_url)!}
              alt={experience.title}
              fill
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full bg-gray-200 flex items-center justify-center">
              <span className="text-gray-400">No image</span>
            </div>
          )}

          {/* Gradient Overlay */}
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

          {/* Location Badge - Top Right */}
          <div className="absolute top-3 right-3">
            <span className="px-3 py-1.5 bg-black/40 backdrop-blur-md text-white text-sm font-medium rounded-full">
              {experience.city}
            </span>
          </div>

          {/* Price Badge - Bottom Left (MAD only, no $ symbol) */}
          <div className="absolute bottom-3 left-3 flex items-center gap-2">
            {price && (
              <span className="px-2.5 py-1 bg-black/60 backdrop-blur-md text-white text-sm font-medium rounded-full">
                {price} MAD
              </span>
            )}
          </div>
        </div>

        {/* Title & Subtitle */}
        <div className="mt-3 px-1">
          <h3 className="text-gray-900 font-semibold text-lg leading-tight line-clamp-1">
            {experience.title}
          </h3>
          <p className="text-gray-500 text-sm mt-1 line-clamp-1">
            {experience.short_description}
          </p>
        </div>
      </div>
    </Link>
  )
}
