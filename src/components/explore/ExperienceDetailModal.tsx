"use client";

import { formatDistanceToNow } from "date-fns";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Heart,
  MapPin,
  MessageCircle,
  Play,
  Send,
  Share2,
  Star,
  X,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { type TouchEvent, useEffect, useMemo, useRef, useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { useBooking } from "@/hooks/use-booking";
import { useExperienceDetail } from "@/hooks/use-experience-detail";
import { useHlsVideo } from "@/hooks/use-hls-video";
import { useRequiredAuth } from "@/hooks/use-required-auth";
import { useShare } from "@/hooks/use-share";
import { useExperienceSocial } from "@/hooks/use-social";
import { useSiteI18n } from "@/components/site/site-i18n";
import { getLocalizedDescription } from "@/lib/i18n";
import { ANALYTICS_EVENT } from "@/lib/analytics/events";
import { captureEvent } from "@/lib/analytics/posthog";
import { localizeHref } from "@/lib/routing/locale-path";
import { buildExperienceHref } from "@/lib/routing/slugs";
import { cn } from "@/lib/utils";
import type { ExperienceListItem } from "@/types/experience";
import { getImageUrl } from "@/utils/functions";

type ExperienceDetailModalProps = {
  open: boolean;
  experiences: ExperienceListItem[];
  startIndex: number;
  onClose: () => void;
};

type ModalMediaItem =
  | { type: "video"; src: string; poster?: string | null }
  | { type: "image"; src: string };

function formatPrice(experience: ExperienceListItem) {
  const cents =
    experience.trip?.price_cents ??
    experience.lodging?.price_cents ??
    experience.rooms?.find((room) => room.price_cents)?.price_cents;

  return cents != null ? `${Math.round(cents / 100)} MAD` : "Sur demande";
}

export function ExperienceDetailModal({
  open,
  experiences,
  startIndex,
  onClose,
}: ExperienceDetailModalProps) {
  const { t, locale } = useSiteI18n();
  const [activeIndex, setActiveIndex] = useState(startIndex);
  const [comment, setComment] = useState("");
  const [isMediaVisible, setIsMediaVisible] = useState(true);
  const [isExperienceVisible, setIsExperienceVisible] = useState(true);
  const [isPlaying, setIsPlaying] = useState(true);
  const videoRef = useRef<HTMLVideoElement>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const pathname = usePathname();
  const { requireAuth } = useRequiredAuth();
  const { openBooking, BookingModal } = useBooking();

  // Prefetch full experience detail in the background so booking is instant
  const { data: fullExperienceData } = useExperienceDetail(
    open ? (experiences[activeIndex]?.id ?? null) : null,
  );

  useEffect(() => {
    if (open) {
      setActiveIndex(startIndex);
    }
  }, [open, startIndex]);

  useEffect(() => {
    if (!open) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    const onKeydown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowRight") {
        setActiveIndex((value) => Math.min(experiences.length - 1, value + 1));
      }
      if (event.key === "ArrowLeft") {
        setActiveIndex((value) => Math.max(0, value - 1));
      }
    };

    window.addEventListener("keydown", onKeydown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeydown);
    };
  }, [open, onClose, experiences.length]);

  const currentExperience = experiences[activeIndex];

  const mediaItems = useMemo<ModalMediaItem[]>(() => {
    if (!currentExperience) return [];
    const items: ModalMediaItem[] = [];

    const thumbnail = currentExperience.thumbnail_url
      ? getImageUrl(currentExperience.thumbnail_url)
      : null;

    if (currentExperience.video_url || currentExperience.video_hls_url) {
      items.push({
        type: "video",
        src:
          currentExperience.video_hls_url ?? currentExperience.video_url ?? "",
        poster: thumbnail,
      });
    }
    if (thumbnail) {
      items.push({ type: "image", src: thumbnail });
    }

    for (const room of currentExperience.rooms ?? []) {
      for (const image of room.photo_urls ?? []) {
        const imageUrl = getImageUrl(image);
        if (imageUrl && !items.some((item) => item.src === imageUrl)) {
          items.push({ type: "image", src: imageUrl });
        }
      }
    }

    return items;
  }, [currentExperience]);

  const [activeMediaIndex, setActiveMediaIndex] = useState(0);
  /* biome-ignore lint/correctness/useExhaustiveDependencies: Reset the media carousel when the selected experience changes. */
  useEffect(() => {
    setActiveMediaIndex(0);
  }, [currentExperience?.id]);

  const currentMedia = mediaItems[activeMediaIndex];

  /* biome-ignore lint/correctness/useExhaustiveDependencies: Re-run the entrance animation when the active experience changes. */
  useEffect(() => {
    if (!open) return;
    setIsExperienceVisible(false);
    const frame = window.requestAnimationFrame(() => {
      setIsExperienceVisible(true);
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [open, activeIndex]);

  /* biome-ignore lint/correctness/useExhaustiveDependencies: Re-run the media transition when the displayed asset changes. */
  useEffect(() => {
    if (!open) return;
    setIsMediaVisible(false);
    const frame = window.requestAnimationFrame(() => {
      setIsMediaVisible(true);
    });

    return () => {
      window.cancelAnimationFrame(frame);
    };
  }, [open, currentMedia?.src]);

  // Attach HLS or set src directly whenever the active video changes
  const videoSrc = currentMedia?.type === "video" ? currentMedia.src : null;
  useHlsVideo(videoRef, videoSrc);

  const social = useExperienceSocial(currentExperience?.id ?? null);
  const locationLabel = currentExperience
    ? currentExperience.region
      ? `${currentExperience.city}, ${currentExperience.region}`
      : currentExperience.city
    : null;
  const detailsHref = currentExperience
    ? localizeHref(
        buildExperienceHref({ title: currentExperience.title, id: currentExperience.id, slug: currentExperience.slug, region: currentExperience.region, city: currentExperience.city }),
        pathname,
      )
    : "";
  const sharePreviewImageUrl = currentExperience?.thumbnail_url
    ? getImageUrl(currentExperience.thumbnail_url)
    : null;
  const modalShortDesc = currentExperience
    ? getLocalizedDescription(currentExperience as unknown as Record<string, unknown>, locale, "short")
    : "";

  const share = useShare({
    title: currentExperience?.title ?? "",
    url: detailsHref,
    description: modalShortDesc,
    locationLabel,
    previewImageUrl: sharePreviewImageUrl,
    experienceId: currentExperience?.id ?? null,
    source: "experience_detail_modal",
  });

  useEffect(() => {
    if (!open || !currentExperience) return;

    captureEvent(ANALYTICS_EVENT.EXPERIENCE_VIEWED, {
      experience_id: currentExperience.id,
      type: currentExperience.type,
    });
  }, [currentExperience, open]);

  if (!open || !currentExperience) {
    return null;
  }
  const likesCount = social.likesCount;
  const reviewText =
    currentExperience.avg_rating != null
      ? `${currentExperience.avg_rating.toFixed(1)}${currentExperience.reviews_count ? ` (${currentExperience.reviews_count})` : ""}`
      : t("explore.modal.new");

  const handleNextExperience = () => {
    setActiveIndex((value) => Math.min(experiences.length - 1, value + 1));
  };

  const handlePreviousExperience = () => {
    setActiveIndex((value) => Math.max(0, value - 1));
  };

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    setTouchStartY(event.touches[0]?.clientY ?? null);
  };

  const handleTouchEnd = (event: TouchEvent<HTMLDivElement>) => {
    if (touchStartY === null) return;
    const endY = event.changedTouches[0]?.clientY ?? touchStartY;
    const delta = endY - touchStartY;
    const swipeThreshold = 60;

    if (Math.abs(delta) >= swipeThreshold) {
      if (delta < 0) {
        handleNextExperience();
      } else {
        handlePreviousExperience();
      }
    }

    setTouchStartY(null);
  };

  return (
    <div
      className="fixed inset-0 z-[130] bg-black/70 backdrop-blur-sm transition-opacity duration-300"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      <button
        type="button"
        className="absolute inset-0"
        onClick={onClose}
        aria-label="Close detail modal"
      />

      <div className="absolute inset-0 flex items-center justify-center p-0 md:p-4">
        <div
          className={cn(
            "relative h-full w-full overflow-hidden bg-white transition-all duration-300 ease-out md:h-[92vh] md:max-w-6xl md:rounded-3xl",
            isExperienceVisible
              ? "translate-y-0 opacity-100"
              : "translate-y-1.5 opacity-0",
          )}
        >
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 z-40 flex h-10 w-10 items-center justify-center rounded-full bg-black/60 text-white"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>

          <div className="grid h-full grid-cols-1 md:grid-cols-[minmax(0,1.2fr)_minmax(360px,1fr)]">
            <div className="relative flex h-[42vh] items-center justify-center overflow-hidden bg-black md:h-full">
              {currentMedia?.type === "video" ? (
                <>
                  {/* Blurred poster backdrop (avoids decoding the stream twice) */}
                  {currentMedia.poster ? (
                    <img
                      src={currentMedia.poster}
                      alt=""
                      aria-hidden="true"
                      className="absolute inset-0 h-full w-full scale-110 object-cover opacity-60 blur-2xl pointer-events-none"
                    />
                  ) : (
                    <div
                      aria-hidden="true"
                      className="absolute inset-0 bg-black pointer-events-none"
                    />
                  )}
                  {/* Main video */}
                  {/* biome-ignore lint/a11y/useMediaCaption: Experience videos are ambient previews and do not ship caption tracks. */}
                  <video
                    ref={videoRef}
                    key={currentMedia.src}
                    autoPlay
                    muted
                    loop
                    playsInline
                    crossOrigin="anonymous"
                    preload="metadata"
                    poster={currentMedia.type === "video" ? (currentMedia.poster ?? undefined) : undefined}
                    className={cn(
                      "relative h-full w-full object-contain transition-opacity duration-300 cursor-pointer",
                      isMediaVisible ? "opacity-100" : "opacity-0",
                    )}
                    onClick={() => {
                      if (videoRef.current) {
                        if (isPlaying) {
                          videoRef.current.pause();
                        } else {
                          void videoRef.current.play();
                        }
                        setIsPlaying((prev) => !prev);
                      }
                    }}
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => setIsPlaying(false)}
                    onError={() => {
                      captureEvent(ANALYTICS_EVENT.VIDEO_ERROR, {
                        src: currentMedia.src,
                        context: "experience_detail_modal",
                      });
                    }}
                  />
                  {!isPlaying && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="flex h-16 w-16 items-center justify-center rounded-full border border-white/40 bg-black/45 text-white backdrop-blur-md">
                        <Play className="ml-1 h-8 w-8 fill-current" />
                      </div>
                    </div>
                  )}
                </>
              ) : currentMedia?.src ? (
                <Image
                  src={currentMedia.src}
                  alt={currentExperience.title}
                  fill
                  className={cn(
                    "object-contain transition-opacity duration-300 md:object-contain",
                    isMediaVisible ? "opacity-100" : "opacity-0",
                  )}
                />
              ) : (
                <div className="text-sm text-white/70">
                  {t("experienceDetails.mediaUnavailable")}
                </div>
              )}

              {mediaItems.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      setActiveMediaIndex((value) => Math.max(0, value - 1))
                    }
                    disabled={activeMediaIndex === 0}
                    className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-black/55 p-2 text-white disabled:opacity-40"
                    aria-label={t("explore.modal.previousMedia")}
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setActiveMediaIndex((value) =>
                        Math.min(mediaItems.length - 1, value + 1),
                      )
                    }
                    disabled={activeMediaIndex === mediaItems.length - 1}
                    className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-black/55 p-2 text-white disabled:opacity-40"
                    aria-label={t("explore.modal.nextMedia")}
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </>
              )}
            </div>

            <div className="flex h-[58vh] flex-col md:h-full">
              <div className="flex flex-1 flex-col overflow-y-auto p-5 md:p-6">
                <div className="space-y-3">
                  <h2 className="text-2xl font-semibold text-gray-900">
                    {currentExperience.title}
                  </h2>
                  <div className="flex flex-wrap items-center gap-3 text-sm text-gray-600">
                    <span className="inline-flex items-center gap-1">
                      <MapPin className="h-4 w-4" />
                      {locationLabel}
                    </span>
                    <span className="inline-flex items-center gap-1">
                      <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                      {reviewText}
                    </span>
                  </div>
                  <p className="text-sm leading-relaxed text-gray-600">
                    {modalShortDesc}
                  </p>
                </div>

                <div className="mt-5 grid grid-cols-3 gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="gap-2"
                    onClick={() =>
                      requireAuth(
                        async () =>
                          social.toggleLike.mutateAsync(social.likedByUser),
                        { mode: "login" },
                      )
                    }
                  >
                    <Heart
                      className={cn(
                        "h-4 w-4 transition-transform duration-200",
                        social.likedByUser &&
                          "fill-rose-500 text-rose-500 scale-110",
                      )}
                    />
                    <span>{likesCount}</span>
                  </Button>
                  <Button type="button" variant="outline" className="gap-2">
                    <MessageCircle className="h-4 w-4" />
                    <span>{social.comments.length}</span>
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="gap-2"
                    onClick={share.openShare}
                  >
                    <Share2 className="h-4 w-4" />
                    <span>{t("explore.modal.share")}</span>
                  </Button>
                </div>

                <div className="mt-5 rounded-xl border bg-gray-50 p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-gray-600">{t("explore.modal.startingFrom")}</span>
                    <span className="text-xl font-semibold text-gray-900">
                      {formatPrice(currentExperience)}
                    </span>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <Button
                      className="flex-1"
                      onClick={() => {
                        if (fullExperienceData?.transformed) {
                          openBooking(fullExperienceData.transformed);
                        }
                      }}
                      disabled={!fullExperienceData?.transformed}
                    >
                      {t("explore.modal.bookNow")}
                    </Button>
                    <Button asChild variant="outline" className="flex-1">
                      <Link href={detailsHref}>{t("explore.modal.viewDetails")}</Link>
                    </Button>
                  </div>
                </div>

                <div className="mt-5">
                  <h3 className="text-sm font-semibold text-gray-900">
                    {t("explore.modal.comments")}
                  </h3>
                  <div className="mt-3 space-y-3">
                    {social.commentsLoading ? (
                      <p className="text-sm text-gray-500">
                        {t("explore.modal.loadingComments")}
                      </p>
                    ) : social.comments.length === 0 ? (
                      <p className="text-sm text-gray-500">
                        {t("explore.modal.noComments")}
                      </p>
                    ) : (
                      social.comments.map((item) => (
                        <div
                          key={item.id}
                          className="rounded-lg border border-gray-200 p-3"
                        >
                          <div className="mb-2 flex items-center gap-2">
                            <Avatar className="h-7 w-7">
                              <AvatarImage
                                src={item.author?.avatar_url ?? undefined}
                                alt={item.author?.display_name ?? t("explore.modal.user")}
                              />
                              <AvatarFallback>
                                {(item.author?.display_name ?? t("explore.modal.user")).slice(0, 1)}
                              </AvatarFallback>
                            </Avatar>
                            <p className="text-xs font-medium text-gray-800">
                              {item.author?.display_name ?? t("explore.modal.user")}
                            </p>
                            <p className="text-xs text-gray-500">
                              {formatDistanceToNow(new Date(item.created_at), {
                                addSuffix: true,
                              })}
                            </p>
                          </div>
                          <p className="text-sm text-gray-700">{item.text}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>

              <div className="border-t p-4">
                <div className="flex items-center gap-2">
                  <input
                    value={comment}
                    onChange={(event) => setComment(event.target.value)}
                    placeholder={t("explore.modal.addComment")}
                    className="h-10 flex-1 rounded-full border border-gray-200 px-4 text-sm outline-none focus:border-[#ff2566]"
                  />
                  <Button
                    type="button"
                    size="icon"
                    onClick={() =>
                      requireAuth(
                        async () => {
                          await social.addComment.mutateAsync(comment);
                          setComment("");
                        },
                        { mode: "login" },
                      )
                    }
                    disabled={!comment.trim() || social.addComment.isPending}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handlePreviousExperience}
            disabled={activeIndex === 0}
            className="absolute left-1/2 top-4 hidden -translate-x-1/2 rounded-full bg-black/55 p-2 text-white disabled:opacity-40 md:block"
            aria-label={t("explore.modal.previousExperience")}
          >
            <ChevronUp className="h-6 w-6" />
          </button>
          <button
            type="button"
            onClick={handleNextExperience}
            disabled={activeIndex === experiences.length - 1}
            className="absolute bottom-4 left-1/2 hidden -translate-x-1/2 rounded-full bg-black/55 p-2 text-white disabled:opacity-40 md:block"
            aria-label={t("explore.modal.nextExperience")}
          >
            <ChevronDown className="h-6 w-6" />
          </button>
        </div>
      </div>
      <BookingModal />
      {share.shareDialog}
    </div>
  );
}
