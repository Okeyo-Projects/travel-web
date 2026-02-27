"use client";

import { MapPin, Pause, Play, Star, Volume2, VolumeX, X } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type MouseEvent, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { localizeHref } from "@/lib/routing/locale-path";
import { buildExperienceSlug } from "@/lib/routing/slugs";
import { cn } from "@/lib/utils";
import type { ExperienceListItem } from "@/types/experience";
import { getImageUrl } from "@/utils/functions";

interface CompactExperienceCardProps {
  experience: ExperienceListItem;
  className?: string;
}

export function CompactExperienceCard({
  experience,
  className,
}: CompactExperienceCardProps) {
  const [isVideoOpen, setIsVideoOpen] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isMounted, setIsMounted] = useState(false);
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

  const handleVideoClick = (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    setIsVideoOpen(true);
  };

  const togglePlayback = () => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused) {
      void video.play().catch(() => {});
      return;
    }

    video.pause();
  };

  const toggleMute = () => {
    setIsMuted((value) => !value);
  };

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = isMuted;
  }, [isMuted]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (!isVideoOpen) {
      video.pause();
      video.currentTime = 0;
      setIsPlaying(false);
      return;
    }

    setIsPlaying(true);
    video.currentTime = 0;
    void video.play().catch(() => {
      setIsPlaying(false);
    });
  }, [isVideoOpen]);

  useEffect(() => {
    if (!isVideoOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsVideoOpen(false);
      }
    };

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", handleEscape);
    };
  }, [isVideoOpen]);

  return (
    <>
      <Link href={href}>
        <div
          className={cn(
            "group relative flex-shrink-0 w-[280px] sm:w-[320px] cursor-pointer",
            className,
          )}
        >
          {/* Image Container */}
          <div className="relative aspect-[4/5] w-full overflow-hidden rounded-2xl">
            {thumbnailUrl ? (
              <Image
                src={thumbnailUrl}
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

            {videoUrl && (
              <div className="absolute inset-0 z-10 flex items-center justify-center">
                <button
                  type="button"
                  onClick={handleVideoClick}
                  className="flex h-14 w-14 items-center justify-center rounded-full border border-white/40 bg-black/35 text-white backdrop-blur-md transition-transform duration-300 hover:scale-105 hover:bg-black/45"
                  aria-label={`Play video for ${experience.title}`}
                >
                  <Play className="ml-0.5 h-7 w-7 fill-current" />
                </button>
              </div>
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

      {isMounted &&
        isVideoOpen &&
        createPortal(
          <div className="fixed inset-0 z-[120] flex items-center justify-center p-2 sm:p-4">
            <button
              type="button"
              className="absolute inset-0 bg-black/70 backdrop-blur-sm"
              onClick={() => setIsVideoOpen(false)}
              aria-label="Close video modal"
            />
            <div
              role="dialog"
              aria-modal="true"
              aria-labelledby={modalTitleId}
              className="relative z-10 w-[98vw] max-w-[1500px] overflow-hidden rounded-2xl bg-white shadow-2xl"
            >
              <button
                type="button"
                onClick={() => setIsVideoOpen(false)}
                className="absolute top-3 right-3 z-40 flex h-10 w-10 items-center justify-center rounded-full border border-white/30 bg-black/45 text-white backdrop-blur-md transition-colors hover:bg-black/60"
                aria-label="Close video modal"
              >
                <X className="h-4 w-4" />
              </button>

              <div className="grid w-full max-h-[92vh] grid-cols-1 bg-white xl:grid-cols-[minmax(0,560px)_1fr]">
                <div className="flex items-center justify-center bg-black p-4 sm:p-6">
                  <div className="relative w-full max-w-[520px] aspect-[9/16] overflow-hidden rounded-2xl bg-black">
                    {videoUrl ? (
                      <>
                        <video
                          ref={videoRef}
                          src={videoUrl}
                          poster={thumbnailUrl ?? undefined}
                          autoPlay
                          loop
                          playsInline
                          muted={isMuted}
                          preload="metadata"
                          className="h-full w-full object-contain"
                          onClick={togglePlayback}
                          onPlay={() => setIsPlaying(true)}
                          onPause={() => setIsPlaying(false)}
                        />

                        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-28 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

                        {!isPlaying && (
                          <button
                            type="button"
                            onClick={togglePlayback}
                            className="absolute inset-0 z-20 flex items-center justify-center"
                            aria-label="Play video"
                          >
                            <span className="flex h-14 w-14 items-center justify-center rounded-full border border-white/40 bg-black/45 text-white backdrop-blur-md">
                              <Play className="ml-0.5 h-7 w-7 fill-current" />
                            </span>
                          </button>
                        )}

                        <div className="absolute right-3 bottom-3 z-30 flex flex-col gap-2">
                          <button
                            type="button"
                            onClick={togglePlayback}
                            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/35 bg-black/45 text-white backdrop-blur-md transition-colors hover:bg-black/60"
                            aria-label={
                              isPlaying ? "Pause video" : "Play video"
                            }
                          >
                            {isPlaying ? (
                              <Pause className="h-4 w-4 fill-current" />
                            ) : (
                              <Play className="ml-0.5 h-4 w-4 fill-current" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={toggleMute}
                            className="flex h-10 w-10 items-center justify-center rounded-full border border-white/35 bg-black/45 text-white backdrop-blur-md transition-colors hover:bg-black/60"
                            aria-label={isMuted ? "Unmute video" : "Mute video"}
                          >
                            {isMuted ? (
                              <VolumeX className="h-4 w-4" />
                            ) : (
                              <Volume2 className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="flex h-full items-center justify-center text-sm text-white/70">
                        Video unavailable
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex max-h-[92vh] min-h-0 flex-col bg-white">
                  <div className="flex-1 overflow-y-auto p-5 sm:p-6 md:p-8">
                    <h2
                      id={modalTitleId}
                      className="text-xl font-semibold text-gray-900"
                    >
                      {experience.title}
                    </h2>
                    <p className="mt-2 text-sm text-gray-600">
                      {experience.short_description}
                    </p>

                    {thumbnailUrl && (
                      <div className="mt-5">
                        <p className="text-sm font-semibold text-gray-900">
                          Experience image
                        </p>
                        <div className="relative mt-2 h-40 w-full overflow-hidden rounded-xl bg-gray-100">
                          <Image
                            src={thumbnailUrl}
                            alt={experience.title}
                            fill
                            className="object-cover"
                          />
                        </div>
                      </div>
                    )}

                    <div className="mt-6 space-y-3">
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <MapPin className="h-4 w-4 text-gray-500" />
                        <span>{locationLabel}</span>
                      </div>

                      {experience.avg_rating && (
                        <div className="flex items-center gap-2 text-sm text-gray-700">
                          <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                          <span>
                            {experience.avg_rating.toFixed(1)}
                            {experience.reviews_count
                              ? ` (${experience.reviews_count} avis)`
                              : ""}
                          </span>
                        </div>
                      )}

                      {price !== null && (
                        <p className="text-lg font-semibold text-gray-900">
                          {price} MAD
                        </p>
                      )}
                    </div>

                    {roomOptions.length > 0 && (
                      <div className="mt-6 rounded-xl border border-gray-200 p-3">
                        <p className="text-sm font-semibold text-gray-900">
                          Rooms & prices
                        </p>
                        <div className="mt-3 space-y-3">
                          {roomOptions.map((room, index) => {
                            const roomPrice = room.price_cents
                              ? Math.round(room.price_cents / 100)
                              : null;
                            const roomImageUrl =
                              room.photo_urls[0] || thumbnailUrl;

                            return (
                              <div
                                key={
                                  room.id || `${room.name ?? "room"}-${index}`
                                }
                                className="flex items-center justify-between gap-3 text-sm"
                              >
                                <div className="flex min-w-0 items-center gap-3">
                                  <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg bg-gray-100">
                                    {roomImageUrl ? (
                                      <Image
                                        src={roomImageUrl}
                                        alt={room.name || `Room ${index + 1}`}
                                        fill
                                        className="object-cover"
                                      />
                                    ) : null}
                                  </div>
                                  <div className="min-w-0">
                                    <p className="truncate text-gray-800">
                                      {room.name || `Room ${index + 1}`}
                                    </p>
                                    {room.max_persons && (
                                      <p className="text-xs text-gray-500">
                                        {room.max_persons} guests
                                      </p>
                                    )}
                                  </div>
                                </div>
                                <span className="shrink-0 font-medium text-gray-900">
                                  {roomPrice !== null
                                    ? `${roomPrice} MAD`
                                    : "N/A"}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 gap-3 border-t border-gray-200 bg-white px-5 py-4 sm:grid-cols-2 sm:px-6 md:px-8">
                    <Link
                      href={href}
                      onClick={() => setIsVideoOpen(false)}
                      className="inline-flex items-center justify-center rounded-full border border-gray-300 bg-white px-5 py-2.5 text-sm font-medium text-gray-900 transition-colors hover:bg-gray-50"
                    >
                      More details
                    </Link>
                    <Link
                      href={bookingHref}
                      onClick={() => setIsVideoOpen(false)}
                      className="inline-flex items-center justify-center rounded-full bg-[#ff2566] px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-[#e0205a]"
                    >
                      Book now
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
