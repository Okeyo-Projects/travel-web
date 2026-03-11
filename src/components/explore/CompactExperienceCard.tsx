"use client";

import { MapPin, Star } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type MouseEvent, useEffect, useRef, useState } from "react";
import { ANALYTICS_EVENT } from "@/lib/analytics/events";
import { captureEvent } from "@/lib/analytics/posthog";
import { localizeHref } from "@/lib/routing/locale-path";
import { buildExperienceSlug } from "@/lib/routing/slugs";
import { cn } from "@/lib/utils";
import type { ExperienceListItem } from "@/types/experience";
import { getImageUrl } from "@/utils/functions";

interface CompactExperienceCardProps {
  experience: ExperienceListItem;
  className?: string;
  onOpenDetails?: () => void;
}

export function CompactExperienceCard({
  experience,
  className,
  onOpenDetails,
}: CompactExperienceCardProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const pathname = usePathname();
  const thumbnailUrl = experience.thumbnail_url
    ? getImageUrl(experience.thumbnail_url)
    : null;
  const price = experience.trip?.price_cents
    ? Math.round(experience.trip.price_cents / 100)
    : experience.lodging?.price_cents
      ? Math.round(experience.lodging.price_cents / 100)
      : null;
  const videoUrl = experience.video_url ?? experience.video_hls_url ?? null;
  const locationLabel = experience.region
    ? `${experience.city}, ${experience.region}`
    : experience.city;
  const experienceSlug = buildExperienceSlug({
    title: experience.title,
    id: experience.id,
  });
  const href = localizeHref(`/experience/${experienceSlug}`, pathname);
  const bookingHref = localizeHref(
    `/experience/${experienceSlug}?booking=1`,
    pathname,
  );
  const roomOptions = (experience.rooms ?? [])
    .filter((room) => room.price_cents !== null)
    .slice(0, 4);
  const modalTitleId = `experience-video-title-${experience.id}`;

  const handleVideoClick = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setIsPlaying((prev) => !prev);
  };

  const handleCardClick = () => {
    captureEvent(ANALYTICS_EVENT.EXPERIENCE_CARD_CLICKED, {
      experience_id: experience.id,
      source: "collection",
    });
    if (onOpenDetails) {
      onOpenDetails();
    }
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      void video.play().catch(() => {
        setIsPlaying(false);
      });
    } else {
      video.pause();
    }
  }, [isPlaying]);

  return (
    <>
      {onOpenDetails ? (
        <div
          role="button"
          tabIndex={0}
          onClick={handleCardClick}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              handleCardClick();
            }
          }}
          className={cn(
            "group/card relative flex-shrink-0 cursor-pointer",
            className,
          )}
        >
          {/* Image Container */}
          <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl">
            {videoUrl && (
              <video
                ref={videoRef}
                src={videoUrl}
                className={cn(
                  "w-full h-full object-cover",
                  isPlaying ? "block" : "hidden",
                )}
                playsInline
                loop
              />
            )}

            <div
              className={cn(
                "absolute inset-0 transition-opacity duration-300",
                isPlaying ? "opacity-0" : "opacity-100",
              )}
            >
              {thumbnailUrl ? (
                <Image
                  src={thumbnailUrl}
                  alt={experience.title}
                  fill
                  className="object-cover transition-transform duration-500 group-hover/card:scale-105"
                />
              ) : (
                <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                  <span className="text-gray-400">No image</span>
                </div>
              )}
            </div>

            {/* Gradient Overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

            {!isPlaying && videoUrl && (
              <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
                <button
                  type="button"
                  onClick={handleVideoClick}
                  className="pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full border border-white/40 bg-black/35 text-white backdrop-blur-md transition-transform duration-300 hover:scale-105 hover:bg-black/45"
                  aria-label={`Play video for ${experience.title}`}
                >
                  <svg
                    className="ml-0.5 h-7 w-7 fill-current"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path d="M8 5v14l11-7z" fill="currentColor" />
                  </svg>
                </button>
              </div>
            )}

            {/* Click area to toggle video playback when playing */}
            {isPlaying && (
              <div
                className="absolute inset-0 z-10 cursor-pointer"
                onClick={handleVideoClick}
              />
            )}

            {/* Location Badge - Top Right */}
            <div className="absolute top-3 right-3 z-20">
              <span className="px-3 py-1.5 bg-black/40 backdrop-blur-md text-white text-sm font-medium rounded-full">
                {experience.city}
              </span>
            </div>

            {/* Price Badge - Bottom Left (MAD only, no $ symbol) */}
            <div className="absolute bottom-3 left-3 z-20 flex items-center gap-2">
              {price !== null && (
                <span className="px-2.5 py-1 bg-black/60 backdrop-blur-md text-white text-sm font-medium rounded-full">
                  {price} MAD
                </span>
              )}
            </div>
          </div>

          {/* Title & Subtitle */}
          <div className="mt-3 px-1 flex flex-col items-start gap-2">
            <div>
              <h3 className="text-gray-900 font-semibold text-lg leading-tight line-clamp-1">
                {experience.title}
              </h3>
              <p className="text-gray-500 text-sm mt-1 line-clamp-1">
                {experience.short_description}
              </p>
            </div>
            <div className="flex justify-end w-full">
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleCardClick();
                }}
                className="mt-1 inline-flex items-center justify-center rounded-full bg-primary px-10 py-1.5 text-sm font-medium text-white transition-colors hover:bg-primary/80"
              >
                Details
              </button>
            </div>
          </div>
        </div>
      ) : (
        <Link
          href={href}
          onClick={() =>
            captureEvent(ANALYTICS_EVENT.EXPERIENCE_CARD_CLICKED, {
              experience_id: experience.id,
              source: "collection",
            })
          }
        >
          <div
            className={cn(
              "group/card relative flex-shrink-0 cursor-pointer",
              className,
            )}
          >
            {/* Image Container */}
            <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl">
              {videoUrl && (
                <video
                  ref={videoRef}
                  src={videoUrl}
                  className={cn(
                    "w-full h-full object-cover",
                    isPlaying ? "block" : "hidden",
                  )}
                  playsInline
                  loop
                />
              )}

              <div
                className={cn(
                  "absolute inset-0 transition-opacity duration-300",
                  isPlaying ? "opacity-0" : "opacity-100",
                )}
              >
                {thumbnailUrl ? (
                  <Image
                    src={thumbnailUrl}
                    alt={experience.title}
                    fill
                    className="object-cover transition-transform duration-500 group-hover/card:scale-105"
                  />
                ) : (
                  <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                    <span className="text-gray-400">No image</span>
                  </div>
                )}
              </div>

              {/* Gradient Overlay */}
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent pointer-events-none" />

              {!isPlaying && videoUrl && (
                <div className="absolute inset-0 z-10 flex items-center justify-center pointer-events-none">
                  <button
                    type="button"
                    onClick={handleVideoClick}
                    className="pointer-events-auto flex h-14 w-14 items-center justify-center rounded-full border border-white/40 bg-black/35 text-white backdrop-blur-md transition-transform duration-300 hover:scale-105 hover:bg-black/45"
                    aria-label={`Play video for ${experience.title}`}
                  >
                    <svg
                      className="ml-0.5 h-7 w-7 fill-current"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path d="M8 5v14l11-7z" fill="currentColor" />
                    </svg>
                  </button>
                </div>
              )}

              {/* Click area to toggle video playback when playing */}
              {isPlaying && (
                <div
                  className="absolute inset-0 z-10 cursor-pointer"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleVideoClick(e as any);
                  }}
                />
              )}

              {/* Location Badge - Top Right */}
              <div className="absolute top-3 right-3 z-20">
                <span className="px-3 py-1.5 bg-black/40 backdrop-blur-md text-white text-sm font-medium rounded-full">
                  {experience.city}
                </span>
              </div>

              {/* Price Badge - Bottom Left (MAD only, no $ symbol) */}
              <div className="absolute bottom-3 left-3 z-20 flex items-center gap-2">
                {price !== null && (
                  <span className="px-2.5 py-1 bg-black/60 backdrop-blur-md text-white text-sm font-medium rounded-full">
                    {price} MAD
                  </span>
                )}
              </div>
            </div>

            {/* Title & Subtitle */}
            <div className="mt-3 px-1 flex flex-col items-start gap-2">
              <div>
                <h3 className="text-gray-900 font-semibold text-lg leading-tight line-clamp-1">
                  {experience.title}
                </h3>
                <p className="text-gray-500 text-sm mt-1 line-clamp-1">
                  {experience.short_description}
                </p>
              </div>
              <div className="mt-1 inline-flex items-center justify-center rounded-full bg-gray-100 px-4 py-1.5 text-sm font-medium text-gray-900 transition-colors hover:bg-gray-200 pointer-events-none">
                Details
              </div>
            </div>
          </div>
        </Link>
      )}

    </>
  );
}
