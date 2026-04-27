"use client";

import { useSiteI18n } from "@/components/site/site-i18n";
import { ANALYTICS_EVENT } from "@/lib/analytics/events";
import { captureEvent } from "@/lib/analytics/posthog";
import { localizeHref } from "@/lib/routing/locale-path";
import { buildExperienceHref } from "@/lib/routing/slugs";
import { cn } from "@/lib/utils";
import type { ExperienceListItem } from "@/types/experience";
import { IMAGE_BLUR_DATA_URL, getImageUrl } from "@/utils/functions";
import { useHlsVideo } from "@/hooks/use-hls-video";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, type MouseEvent } from "react";

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
  const { t } = useSiteI18n();
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
  const videoUrl = experience.video_hls_url ?? experience.video_url ?? null;
  const href = localizeHref(
    buildExperienceHref({ title: experience.title, id: experience.id, slug: experience.slug, region: experience.region, city: experience.city }),
    pathname,
  );
  
  const handleVideoClick = (event: MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    if (onOpenDetails) {
      handleCardClick();
      return;
    }
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

  useHlsVideo(videoRef, !onOpenDetails ? videoUrl : null);

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

  const cardBody = (
    <>
      <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl">
        {videoUrl && !onOpenDetails && (
          <video
            ref={videoRef}
            className={cn(
              "w-full h-full object-cover",
              isPlaying ? "block" : "hidden",
            )}
            playsInline
            loop
            muted
            crossOrigin="anonymous"
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
              placeholder="blur"
              blurDataURL={IMAGE_BLUR_DATA_URL}
              className="object-cover transition-transform duration-500 group-hover/card:scale-105"
            />
          ) : (
            <div className="w-full h-full bg-gray-200 flex items-center justify-center">
              <span className="text-gray-400">
                {t("chat.experienceCard.noImage")}
              </span>
            </div>
          )}
        </div>

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
                aria-hidden="true"
              >
                <path d="M8 5v14l11-7z" fill="currentColor" />
              </svg>
            </button>
          </div>
        )}

        {isPlaying && !onOpenDetails && (
          <button
            type="button"
            className="absolute inset-0 z-10 cursor-pointer"
            onClick={handleVideoClick}
            aria-label={`Pause video for ${experience.title}`}
          />
        )}

        <div className="absolute top-3 right-3 z-20">
          <span className="px-3 py-1.5 bg-black/40 backdrop-blur-md text-white text-sm font-medium rounded-full">
            {experience.city}
          </span>
        </div>

        <div className="absolute bottom-3 left-3 z-20 flex items-center gap-2">
          {price !== null && (
            <span className="px-2.5 py-1 bg-black/60 backdrop-blur-md text-white text-sm font-medium rounded-full">
              {price} MAD
            </span>
          )}
        </div>
      </div>

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
          {onOpenDetails ? (
            <Link
              href={href}
              onClick={(event) => event.stopPropagation()}
              className="mt-1 inline-flex items-center justify-center rounded-full bg-primary px-10 py-1.5 text-sm font-medium text-white transition-colors hover:bg-primary/80"
            >
              Details
            </Link>
          ) : (
            <div className="mt-1 inline-flex items-center justify-center rounded-full bg-primary px-10 py-1.5 text-sm font-medium text-white transition-colors hover:bg-primary/80">
              Details
            </div>
          )}
        </div>
      </div>
    </>
  );

  return (
    <>
      {onOpenDetails ? (
        /* biome-ignore lint/a11y/useSemanticElements: The card contains nested controls, so a semantic button wrapper would be invalid HTML. */
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
          {cardBody}
        </div>
      ) : (
        <div
          className={cn(
            "group/card relative flex-shrink-0 cursor-pointer",
            className,
          )}
        >
          <Link
            href={href}
            onClick={() =>
              captureEvent(ANALYTICS_EVENT.EXPERIENCE_CARD_CLICKED, {
                experience_id: experience.id,
                source: "collection",
              })
            }
          >
            {cardBody}
          </Link>
        </div>
      )}
    </>
  );
}
